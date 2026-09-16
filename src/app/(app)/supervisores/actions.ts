"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/supabase/sesion";
import { registrarAuditoria } from "@/lib/personal/auditoria";
import {
  invitarOEncontrarUsuario,
  generarLinkInvitacion,
} from "@/lib/supabase/admin-api";
import {
  invitarSupervisorSchema,
  actualizarAreasSupervisorSchema,
} from "@/lib/validations/supervisores";

export type EstadoSupervisor = { error: string } | null;

/**
 * Invitar Supervisor (spec sección 3): solo un Admin de Organización puede
 * hacerlo, y de paso asigna qué área(s) puede ver (admin_areas). Alta
 * exclusivamente por invitación — nunca hay registro público.
 */
export async function invitarSupervisor(
  _estadoPrevio: EstadoSupervisor,
  formData: FormData,
): Promise<EstadoSupervisor> {
  const sesion = await obtenerSesion();
  if (!sesion || sesion.tipo !== "admin" || sesion.rol !== "admin") {
    return {
      error: "Solo un Admin de organización puede invitar supervisores.",
    };
  }

  const parsed = invitarSupervisorSchema.safeParse({
    nombre: formData.get("nombre"),
    email: formData.get("email"),
    areaIds: formData.getAll("areaIds"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const resultado = await invitarOEncontrarUsuario(parsed.data.email);
  if ("error" in resultado) return { error: resultado.error };

  const supabase = await createClient();

  const { error: errorAdmin } = await supabase.from("admins").insert({
    id: resultado.id,
    organizacion_id: sesion.organizacionId,
    nombre: parsed.data.nombre,
    email: parsed.data.email,
    rol: "supervisor",
  });

  if (errorAdmin) {
    return {
      error: errorAdmin.message.toLowerCase().includes("duplicate")
        ? "Ese email ya es admin o supervisor de esta organización."
        : "No se pudo crear el supervisor.",
    };
  }

  const { error: errorAreas } = await supabase.from("admin_areas").insert(
    parsed.data.areaIds.map((areaId) => ({
      admin_id: resultado.id,
      area_id: areaId,
    })),
  );
  if (errorAreas) {
    return { error: "El supervisor se creó, pero falló asignar las áreas." };
  }

  await registrarAuditoria(supabase, {
    organizacionId: sesion.organizacionId,
    adminId: sesion.id,
    accion: "crear",
    entidad: "admin",
    entidadId: resultado.id,
    datosNuevos: {
      nombre: parsed.data.nombre,
      email: parsed.data.email,
      rol: "supervisor",
      areaIds: parsed.data.areaIds,
      yaExistiaEnElPortfolio: resultado.yaExistia,
    },
  });

  redirect("/supervisores");
}

/**
 * Copiar link de invitación (sin depender del mailer de Supabase — ver
 * historial: dos supervisores se quedaron con la invitación vencida
 * porque el reenvío por email pisaba el rate limit compartido del
 * proyecto). El admin lo manda él mismo por el canal que quiera.
 */
export async function obtenerLinkInvitacion(
  email: string,
): Promise<{ link: string } | { error: string }> {
  const sesion = await obtenerSesion();
  if (!sesion || sesion.tipo !== "admin" || sesion.rol !== "admin") {
    return { error: "Solo un Admin de organización puede hacer esto." };
  }
  return generarLinkInvitacion(email);
}

/**
 * Editar qué áreas ve un supervisor ya existente (spec sección 3). Sin esto,
 * la única forma de sumarle un área nueva a alguien era sacarlo y volver a
 * invitarlo — perdía el link de invitación ya usado y tenía que crear
 * contraseña de nuevo por las dudas. Reemplaza directamente el set de
 * admin_areas (borra y vuelve a insertar) en vez de diffear altas/bajas: es
 * una tabla chica, y así no hay que resolver casos raros de qué cambió.
 */
export async function actualizarAreasSupervisor(
  supervisorId: string,
  _estadoPrevio: EstadoSupervisor,
  formData: FormData,
): Promise<EstadoSupervisor> {
  const sesion = await obtenerSesion();
  if (!sesion || sesion.tipo !== "admin" || sesion.rol !== "admin") {
    return {
      error: "Solo un Admin de organización puede editar supervisores.",
    };
  }

  const parsed = actualizarAreasSupervisorSchema.safeParse({
    areaIds: formData.getAll("areaIds"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();

  const { data: supervisor } = await supabase
    .from("admins")
    .select("id, nombre, admin_areas(area_id)")
    .eq("id", supervisorId)
    .eq("rol", "supervisor")
    .maybeSingle();

  if (!supervisor) return { error: "No se encontró ese supervisor." };

  const areasAnteriores = (
    supervisor.admin_areas as unknown as { area_id: string }[]
  ).map((a) => a.area_id);

  const { error: errorBorrar } = await supabase
    .from("admin_areas")
    .delete()
    .eq("admin_id", supervisorId);
  if (errorBorrar) return { error: "No se pudieron actualizar las áreas." };

  const { error: errorInsertar } = await supabase.from("admin_areas").insert(
    parsed.data.areaIds.map((areaId) => ({
      admin_id: supervisorId,
      area_id: areaId,
    })),
  );
  if (errorInsertar) return { error: "No se pudieron actualizar las áreas." };

  await registrarAuditoria(supabase, {
    organizacionId: sesion.organizacionId,
    adminId: sesion.id,
    accion: "editar",
    entidad: "admin",
    entidadId: supervisorId,
    datosAnteriores: { areaIds: areasAnteriores },
    datosNuevos: { areaIds: parsed.data.areaIds },
  });

  redirect("/supervisores");
}

/**
 * Quitar acceso a un supervisor (soft delete, spec sección 3 y consistente
 * con "Eliminar personal"). No borra su identidad de Auth (es compartida
 * con el resto del portfolio) — solo su fila en personalcheck.admins, así
 * que org_actual()/rol_actual() dejan de resolverlo (ver migración
 * 20260915_..._admins_eliminados_pierden_acceso.sql).
 */
export async function eliminarSupervisor(
  supervisorId: string,
  _estadoPrevio: EstadoSupervisor,
  _formData: FormData,
): Promise<EstadoSupervisor> {
  const sesion = await obtenerSesion();
  if (!sesion || sesion.tipo !== "admin" || sesion.rol !== "admin") {
    return {
      error: "Solo un Admin de organización puede quitar supervisores.",
    };
  }

  const supabase = await createClient();

  const { data: supervisor } = await supabase
    .from("admins")
    .select("id, nombre, email")
    .eq("id", supervisorId)
    .eq("rol", "supervisor")
    .maybeSingle();

  if (!supervisor) return { error: "No se encontró ese supervisor." };

  const { error } = await supabase
    .from("admins")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", supervisorId);

  if (error) return { error: "No se pudo quitar el acceso." };

  await registrarAuditoria(supabase, {
    organizacionId: sesion.organizacionId,
    adminId: sesion.id,
    accion: "eliminar",
    entidad: "admin",
    entidadId: supervisorId,
    datosAnteriores: { nombre: supervisor.nombre, email: supervisor.email },
  });

  redirect("/supervisores");
}
