"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/supabase/sesion";
import { registrarAuditoria } from "@/lib/personal/auditoria";
import { eliminarPersonalSchema } from "@/lib/validations/personal";

export type EstadoEliminar = { error: string } | null;

/**
 * Eliminar personal (spec sección 6.7): soft delete, motivo obligatorio,
 * queda en Auditoría con quién lo hizo y por qué. Distinto de una baja real
 * por fin de relación laboral (que en el modelo real conservaría historial
 * — no está modelado en el MVP, ver spec sección 4).
 */
export async function eliminarOperario(
  operarioId: string,
  _estadoPrevio: EstadoEliminar,
  formData: FormData,
): Promise<EstadoEliminar> {
  const sesion = await obtenerSesion();
  if (!sesion || sesion.tipo !== "admin") {
    return { error: "No tenés permiso para hacer esto." };
  }

  const parsed = eliminarPersonalSchema.safeParse({
    operarioId,
    motivo: formData.get("motivo"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Falta el motivo." };
  }

  const supabase = await createClient();

  const { data: operario } = await supabase
    .from("operarios")
    .select("id, nombre")
    .eq("id", operarioId)
    .maybeSingle();
  if (!operario) return { error: "No se encontró a esa persona." };

  const { error } = await supabase
    .from("operarios")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", operarioId);

  if (error) return { error: "No se pudo eliminar." };

  await registrarAuditoria(supabase, {
    organizacionId: sesion.organizacionId,
    adminId: sesion.id,
    accion: "eliminar",
    entidad: "operario",
    entidadId: operarioId,
    datosAnteriores: { nombre: operario.nombre },
    datosNuevos: { motivo: parsed.data.motivo },
  });

  redirect("/nomina");
}
