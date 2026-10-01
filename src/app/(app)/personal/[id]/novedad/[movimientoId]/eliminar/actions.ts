"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/supabase/sesion";
import { registrarAuditoria } from "@/lib/personal/auditoria";
import { eliminarNovedadSchema } from "@/lib/validations/personal";

export type EstadoEliminarNovedad = { error: string } | null;

/**
 * Eliminar una novedad ya cargada (a pedido explícito de Dante, 2026-09-29:
 * "hay un movimiento que se cargó mal... un supervisor se equivocó").
 * Distinto de "Corregir" (que ajusta tipo/fecha/cantidad manteniendo la
 * novedad viva) — esto es para cuando la novedad no debería existir en
 * absoluto (se cargó para la persona equivocada, está duplicada, etc.).
 *
 * Soft delete, motivo obligatorio, queda en Auditoría — mismo criterio que
 * "Eliminar personal".
 *
 * CORREGIDO 2026-10-01 (a pedido explícito de Dante): un Supervisor puede
 * eliminar sus PROPIAS novedades, pero no las de un compañero supervisor —
 * "el único con la potestad de hacer eso debe ser el administrador". El
 * Admin de organización puede eliminar cualquiera.
 */
export async function eliminarNovedad(
  operarioId: string,
  _estadoPrevio: EstadoEliminarNovedad,
  formData: FormData,
): Promise<EstadoEliminarNovedad> {
  const sesion = await obtenerSesion();
  if (!sesion || sesion.tipo !== "admin") {
    return { error: "No tenés permiso para hacer esto." };
  }

  const parsed = eliminarNovedadSchema.safeParse({
    movimientoId: formData.get("movimientoId"),
    motivo: formData.get("motivo"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Falta el motivo." };
  }

  const supabase = await createClient();

  const { data: movimiento } = await supabase
    .from("movimientos")
    .select(
      "id, fecha, cantidad, observaciones, tipo_movimiento_id, operario_id, admin_id, tipos_movimiento(nombre)",
    )
    .eq("id", parsed.data.movimientoId)
    .eq("operario_id", operarioId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!movimiento) return { error: "No se encontró esa novedad." };

  if (sesion.rol !== "admin" && movimiento.admin_id !== sesion.id) {
    return {
      error: "No podés eliminar una novedad cargada por otro supervisor.",
    };
  }

  const { error } = await supabase
    .from("movimientos")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", parsed.data.movimientoId);

  if (error) return { error: "No se pudo eliminar la novedad." };

  const tipo = movimiento.tipos_movimiento as unknown as {
    nombre: string;
  } | null;

  await registrarAuditoria(supabase, {
    organizacionId: sesion.organizacionId,
    adminId: sesion.id,
    accion: "eliminar",
    entidad: "movimiento",
    entidadId: parsed.data.movimientoId,
    datosAnteriores: {
      tipoNombre: tipo?.nombre ?? "—",
      fecha: movimiento.fecha,
      cantidad: movimiento.cantidad,
      observaciones: movimiento.observaciones,
    },
    datosNuevos: { motivo: parsed.data.motivo },
  });

  redirect(`/personal/${operarioId}`);
}
