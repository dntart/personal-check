import "server-only";
import { createClient } from "@/lib/supabase/server";

export type FilaAuditoria = {
  id: string;
  accion: "crear" | "editar" | "eliminar";
  entidad: string;
  entidadId: string;
  actor: string;
  datosAnteriores: unknown;
  datosNuevos: unknown;
  createdAt: string;
};

/**
 * Listado de auditoría (spec sección 6.8): quién hizo qué y cuándo, sobre
 * cualquier entidad. RLS (auditoria_acceso) ya limita a la propia
 * organización — acá solo se lee tal cual llega.
 */
export async function obtenerAuditoria(params?: {
  entidad?: string;
  limite?: number;
}): Promise<FilaAuditoria[]> {
  const supabase = await createClient();
  let query = supabase
    .from("auditoria")
    .select(
      "id, accion, entidad, entidad_id, datos_anteriores, datos_nuevos, created_at, admins(nombre), super_admins(nombre)",
    )
    .order("created_at", { ascending: false })
    .limit(params?.limite ?? 100);

  if (params?.entidad) {
    query = query.eq("entidad", params.entidad);
  }

  const { data } = await query;

  return (data ?? []).map((fila) => {
    const admin = fila.admins as unknown as { nombre: string } | null;
    const superAdmin = fila.super_admins as unknown as {
      nombre: string;
    } | null;
    return {
      id: fila.id,
      accion: fila.accion as "crear" | "editar" | "eliminar",
      entidad: fila.entidad,
      entidadId: fila.entidad_id,
      actor: admin?.nombre ?? superAdmin?.nombre ?? "—",
      datosAnteriores: fila.datos_anteriores,
      datosNuevos: fila.datos_nuevos,
      createdAt: fila.created_at,
    };
  });
}
