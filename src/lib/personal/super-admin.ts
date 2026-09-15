import "server-only";
import { createClient } from "@/lib/supabase/server";

export type OrganizacionConAdmins = {
  id: string;
  nombre: string;
  activo: boolean;
  createdAt: string;
  admins: { nombre: string; email: string; rol: "admin" | "supervisor" }[];
};

/**
 * Listado de organizaciones para el Super Admin (spec sección 3). RLS ya le
 * da bypass total vía es_super_admin() — no hace falta filtrar acá.
 */
export async function obtenerOrganizaciones(): Promise<
  OrganizacionConAdmins[]
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("organizaciones")
    .select(
      "id, nombre, activo, created_at, admins(nombre, email, rol, deleted_at)",
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  return (data ?? []).map((o) => {
    const admins = (
      o.admins as unknown as (OrganizacionConAdmins["admins"][number] & {
        deleted_at: string | null;
      })[]
    ).filter((a) => !a.deleted_at);
    return {
      id: o.id,
      nombre: o.nombre,
      activo: o.activo,
      createdAt: o.created_at,
      admins,
    };
  });
}
