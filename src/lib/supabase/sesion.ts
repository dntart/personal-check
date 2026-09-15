import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { SesionPersonalCheck } from "@/types/auth";

const ROLES_VALIDOS = ["admin", "supervisor"] as const;

// El generador de tipos de Supabase no lee check constraints de Postgres,
// así que `admins.rol` llega tipado como `string` genérico aunque la DB
// garantice solo estos dos valores. Angostamos acá, en el borde, en vez de
// confiar ciegamente en el dato.
function esRolValido(valor: string): valor is "admin" | "supervisor" {
  return (ROLES_VALIDOS as readonly string[]).includes(valor);
}

/**
 * Resuelve quién es el usuario autenticado dentro de PersonalCheck.
 *
 * auth.users es compartido por todo el portfolio (mismo proyecto Supabase
 * que alma y el resto): que Supabase Auth valide la sesión NO significa que
 * esta persona tenga una fila en `personalcheck.admins` ni en
 * `personalcheck.super_admins`. Devuelve null en ese caso — incluye tanto
 * "no es admin de PersonalCheck" como "es admin, pero su organización está
 * suspendida" (org_actual() ya filtra por `activo`, así que el select no
 * devuelve filas en ningún caso — ver 20260915_..._respeta_suspension.sql).
 * No distinguimos ambos casos en el mensaje para no filtrar información.
 */
export async function obtenerSesion(): Promise<SesionPersonalCheck | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: admin } = await supabase
    .from("admins")
    .select("id, nombre, email, rol, organizacion_id")
    .eq("id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (admin) {
    if (!esRolValido(admin.rol)) {
      console.error(
        `admins.rol con valor inesperado "${admin.rol}" para admin ${admin.id} — tratando como sin sesión.`,
      );
      return null;
    }
    return {
      tipo: "admin",
      id: admin.id,
      nombre: admin.nombre,
      email: admin.email,
      rol: admin.rol,
      organizacionId: admin.organizacion_id,
    };
  }

  const { data: superAdmin } = await supabase
    .from("super_admins")
    .select("id, nombre, email")
    .eq("id", user.id)
    .maybeSingle();

  if (superAdmin) {
    return { tipo: "super_admin", ...superAdmin };
  }

  return null;
}
