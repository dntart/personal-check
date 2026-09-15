import "server-only";
import { createClient } from "@/lib/supabase/server";

export type Supervisor = {
  id: string;
  nombre: string;
  email: string;
  areas: { id: string; nombre: string }[];
};

export async function obtenerSupervisores(): Promise<Supervisor[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("admins")
    .select("id, nombre, email, admin_areas(areas(id, nombre))")
    .eq("rol", "supervisor")
    .is("deleted_at", null)
    .order("nombre");

  return (data ?? []).map((s) => {
    const areas = (
      s.admin_areas as unknown as {
        areas: { id: string; nombre: string } | null;
      }[]
    )
      .map((aa) => aa.areas)
      .filter((a): a is { id: string; nombre: string } => a !== null);
    return { id: s.id, nombre: s.nombre, email: s.email, areas };
  });
}
