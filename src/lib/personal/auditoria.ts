import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";

type Cliente = SupabaseClient<Database, "personalcheck">;

type ActorParams =
  | { adminId: string; superAdminId?: never }
  | { adminId?: never; superAdminId: string };

/**
 * Registra una fila inmutable en personalcheck.auditoria (spec sección 4 y
 * 6.8). El actor es exactamente uno de los dos (constraint
 * auditoria_actor_unico): un admin de organización, o el Super Admin
 * actuando en modo soporte sobre cualquier organización.
 */
export async function registrarAuditoria(
  supabase: Cliente,
  params: ActorParams & {
    organizacionId: string;
    accion: "crear" | "editar" | "eliminar";
    entidad: string;
    entidadId: string;
    datosAnteriores?: unknown;
    datosNuevos?: unknown;
  },
) {
  const { error } = await supabase.from("auditoria").insert({
    organizacion_id: params.organizacionId,
    admin_id: params.adminId ?? null,
    super_admin_id: params.superAdminId ?? null,
    accion: params.accion,
    entidad: params.entidad,
    entidad_id: params.entidadId,
    datos_anteriores: (params.datosAnteriores ?? null) as Json,
    datos_nuevos: (params.datosNuevos ?? null) as Json,
  });

  // No revisar este error dejó pasar en silencio un bug real: una policy de
  // RLS mal armada bloqueaba el INSERT de un Supervisor sin que nadie se
  // enterara — la acción se guardaba bien, pero nunca quedaba en Auditoría
  // (ver migración 20260918_personalcheck_auditoria_escritura_supervisor.sql).
  // No relanzamos el error para no romper la acción principal (cargar la
  // novedad, etc.) por un problema del log — pero al menos queda en los
  // logs del servidor para poder notarlo.
  if (error) {
    console.error("No se pudo registrar en auditoría:", error);
  }
}
