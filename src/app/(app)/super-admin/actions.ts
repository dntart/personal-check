"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/supabase/sesion";
import { registrarAuditoria } from "@/lib/personal/auditoria";
import { invitarOEncontrarUsuario } from "@/lib/supabase/admin-api";
import { invitarOrganizacionSchema } from "@/lib/validations/super-admin";

export type EstadoSuperAdmin = { error: string } | null;

/**
 * Alta de organización "self-service, pero por invitación" (spec sección 3
 * y 9: nunca hay un formulario público de registro — esto lo dispara
 * únicamente el Super Admin). El cliente nuevo recibe el mismo mail de
 * invitación que un supervisor, y termina de entrar solo por
 * /invitacion — Dante no toca SQL a mano para cada alta.
 *
 * RLS ya le da bypass total al Super Admin (es_super_admin() en cada
 * policy) — no hace falta service role key para esto, alcanza con la
 * sesión normal del Super Admin.
 */
export async function invitarOrganizacion(
  _estadoPrevio: EstadoSuperAdmin,
  formData: FormData,
): Promise<EstadoSuperAdmin> {
  const sesion = await obtenerSesion();
  if (!sesion || sesion.tipo !== "super_admin") {
    return { error: "Solo el Super Admin puede hacer esto." };
  }

  const parsed = invitarOrganizacionSchema.safeParse({
    nombreOrganizacion: formData.get("nombreOrganizacion"),
    nombreAdmin: formData.get("nombreAdmin"),
    emailAdmin: formData.get("emailAdmin"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();

  const { data: organizacion, error: errorOrg } = await supabase
    .from("organizaciones")
    .insert({ nombre: parsed.data.nombreOrganizacion })
    .select("id")
    .single();
  if (errorOrg || !organizacion) {
    return { error: "No se pudo crear la organización." };
  }

  const resultado = await invitarOEncontrarUsuario(parsed.data.emailAdmin);
  if ("error" in resultado) return { error: resultado.error };

  const { error: errorAdmin } = await supabase.from("admins").insert({
    id: resultado.id,
    organizacion_id: organizacion.id,
    nombre: parsed.data.nombreAdmin,
    email: parsed.data.emailAdmin,
    rol: "admin",
  });
  if (errorAdmin) {
    return {
      error: errorAdmin.message.toLowerCase().includes("duplicate")
        ? "Ese email ya es admin de otra organización en PersonalCheck."
        : "La organización se creó, pero falló asignar el admin.",
    };
  }

  await registrarAuditoria(supabase, {
    organizacionId: organizacion.id,
    superAdminId: sesion.id,
    accion: "crear",
    entidad: "organizacion",
    entidadId: organizacion.id,
    datosNuevos: {
      nombre: parsed.data.nombreOrganizacion,
      adminInvitado: parsed.data.emailAdmin,
      yaExistiaEnElPortfolio: resultado.yaExistia,
    },
  });

  redirect("/super-admin");
}

/** Suspender/reactivar una organización (spec sección 3: bloquea RLS, no borra nada). */
export async function alternarOrganizacionActiva(
  organizacionId: string,
  activo: boolean,
) {
  const sesion = await obtenerSesion();
  if (!sesion || sesion.tipo !== "super_admin") return;

  const supabase = await createClient();
  const { data: anterior } = await supabase
    .from("organizaciones")
    .select("nombre, activo")
    .eq("id", organizacionId)
    .maybeSingle();

  await supabase
    .from("organizaciones")
    .update({ activo })
    .eq("id", organizacionId);

  await registrarAuditoria(supabase, {
    organizacionId,
    superAdminId: sesion.id,
    accion: "editar",
    entidad: "organizacion",
    entidadId: organizacionId,
    datosAnteriores: anterior,
    datosNuevos: { activo },
  });

  redirect("/super-admin");
}
