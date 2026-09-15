import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";

type Cliente = SupabaseClient<Database, "personalcheck">;

/**
 * Registra una fila inmutable en personalcheck.auditoria (spec sección 4 y
 * 6.8). Se llama desde cada Server Action que crea/edita/elimina algo — el
 * actor es siempre el admin autenticado (el flujo de soporte del Super
 * Admin se resuelve aparte, no lo cubre este helper).
 */
export async function registrarAuditoria(
  supabase: Cliente,
  params: {
    organizacionId: string;
    adminId: string;
    accion: "crear" | "editar" | "eliminar";
    entidad: string;
    entidadId: string;
    datosAnteriores?: unknown;
    datosNuevos?: unknown;
  },
) {
  await supabase.from("auditoria").insert({
    organizacion_id: params.organizacionId,
    admin_id: params.adminId,
    accion: params.accion,
    entidad: params.entidad,
    entidad_id: params.entidadId,
    datos_anteriores: (params.datosAnteriores ?? null) as Json,
    datos_nuevos: (params.datosNuevos ?? null) as Json,
  });
}
