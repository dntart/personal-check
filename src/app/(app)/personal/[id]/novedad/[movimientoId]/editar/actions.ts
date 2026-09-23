"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/supabase/sesion";
import { registrarAuditoria } from "@/lib/personal/auditoria";
import { editarNovedadSchema } from "@/lib/validations/personal";
import { esBloque30 } from "@/lib/personal/reglas";
import { avisarSiSaldoFueraDeRango } from "../../actions";

export type EstadoEditarNovedad = { error: string } | null;

/**
 * Editar una novedad ya cargada (a pedido explícito de Dante, 2026-09-18):
 * antes solo se podía cargar, no corregir un error de carga sin eliminar el
 * personal entero o dejar el dato mal para siempre. Mismo nivel de permiso
 * que cargar novedad (admin de organización o supervisor, no está
 * restringido como "Eliminar personal") — el supervisor es quien más carga
 * novedades día a día, tiene sentido que también pueda corregir sus propios
 * errores de tipeo.
 *
 * Pide un motivo (no se guarda en el movimiento en sí, solo en la
 * auditoría) para dejar rastro de qué se corrigió y por qué — mismo
 * criterio que "Eliminar personal".
 */
export async function editarNovedad(
  operarioId: string,
  movimientoId: string,
  _estadoPrevio: EstadoEditarNovedad,
  formData: FormData,
): Promise<EstadoEditarNovedad> {
  const sesion = await obtenerSesion();
  if (!sesion || sesion.tipo !== "admin") {
    return { error: "No tenés permiso para hacer esto." };
  }

  const parsed = editarNovedadSchema.safeParse({
    movimientoId,
    tipoMovimientoId: formData.get("tipoMovimientoId"),
    fecha: formData.get("fecha"),
    cantidad: formData.get("cantidad"),
    observaciones: formData.get("observaciones") || undefined,
    motivo: formData.get("motivo"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();

  const { data: anterior } = await supabase
    .from("movimientos")
    .select(
      "id, operario_id, tipo_movimiento_id, fecha, cantidad, observaciones, adjunto_url",
    )
    .eq("id", movimientoId)
    .eq("operario_id", operarioId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!anterior) return { error: "No se encontró esa novedad." };

  const { data: tipo } = await supabase
    .from("tipos_movimiento")
    .select("codigo, nombre")
    .eq("id", parsed.data.tipoMovimientoId)
    .maybeSingle();

  if (!tipo) return { error: "Tipo de novedad inválido." };

  // Mismo chequeo que al cargar: el desplegable del formulario ya lo
  // fuerza, esto es el respaldo del lado del servidor.
  if (
    esBloque30(tipo.codigo) &&
    (parsed.data.cantidad <= 0 || parsed.data.cantidad % 30 !== 0)
  ) {
    return { error: `"${tipo.nombre}" se carga en bloques de 30 minutos.` };
  }

  const adjuntoUrl = String(formData.get("adjuntoUrl") ?? "").trim() || null;

  const { error } = await supabase
    .from("movimientos")
    .update({
      tipo_movimiento_id: parsed.data.tipoMovimientoId,
      fecha: parsed.data.fecha,
      cantidad: parsed.data.cantidad,
      observaciones: parsed.data.observaciones ?? null,
      adjunto_url: adjuntoUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", movimientoId);

  if (error) return { error: "No se pudo guardar la corrección." };

  await registrarAuditoria(supabase, {
    organizacionId: sesion.organizacionId,
    adminId: sesion.id,
    accion: "editar",
    entidad: "movimiento",
    entidadId: movimientoId,
    datosAnteriores: {
      tipoMovimientoId: anterior.tipo_movimiento_id,
      fecha: anterior.fecha,
      cantidad: anterior.cantidad,
      observaciones: anterior.observaciones,
      adjuntoUrl: anterior.adjunto_url,
    },
    datosNuevos: {
      tipoMovimientoId: parsed.data.tipoMovimientoId,
      fecha: parsed.data.fecha,
      cantidad: parsed.data.cantidad,
      observaciones: parsed.data.observaciones ?? null,
      adjuntoUrl,
      motivo: parsed.data.motivo,
    },
  });

  await avisarSiSaldoFueraDeRango(operarioId, sesion.organizacionNombre);

  redirect(`/personal/${operarioId}`);
}
