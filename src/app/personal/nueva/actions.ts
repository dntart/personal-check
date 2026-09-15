"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/supabase/sesion";
import { registrarAuditoria } from "@/lib/personal/auditoria";
import { altaPersonalSchema } from "@/lib/validations/personal";

export type EstadoAltaPersonal = { error: string } | null;

/**
 * Alta de personal (spec sección 6.9): nombre + área existente o nueva.
 * No pide turno — se calcula solo cuando se le carga el horario.
 */
export async function crearOperario(
  _estadoPrevio: EstadoAltaPersonal,
  formData: FormData,
): Promise<EstadoAltaPersonal> {
  const sesion = await obtenerSesion();
  if (!sesion || sesion.tipo !== "admin") {
    return { error: "No tenés permiso para hacer esto." };
  }

  const parsed = altaPersonalSchema.safeParse({
    nombre: formData.get("nombre"),
    areaId: formData.get("areaId") || undefined,
    areaNueva: formData.get("areaNueva") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  if (parsed.data.areaNueva && sesion.rol !== "admin") {
    return {
      error: "Solo un Admin de organización puede crear áreas nuevas.",
    };
  }

  const supabase = await createClient();
  let areaId = parsed.data.areaId;

  if (!areaId && parsed.data.areaNueva) {
    const { data: areaCreada, error: errorArea } = await supabase
      .from("areas")
      .insert({
        organizacion_id: sesion.organizacionId,
        nombre: parsed.data.areaNueva,
      })
      .select("id")
      .single();

    if (errorArea || !areaCreada) {
      return {
        error: "No se pudo crear el área (¿ya existe una con ese nombre?).",
      };
    }
    areaId = areaCreada.id;
    await registrarAuditoria(supabase, {
      organizacionId: sesion.organizacionId,
      adminId: sesion.id,
      accion: "crear",
      entidad: "area",
      entidadId: areaId,
      datosNuevos: { nombre: parsed.data.areaNueva },
    });
  }

  if (!areaId) return { error: "Elegí un área." };

  const { data: operario, error } = await supabase
    .from("operarios")
    .insert({
      organizacion_id: sesion.organizacionId,
      area_id: areaId,
      nombre: parsed.data.nombre,
    })
    .select("id")
    .single();

  if (error || !operario) {
    return { error: "No se pudo crear la persona." };
  }

  await registrarAuditoria(supabase, {
    organizacionId: sesion.organizacionId,
    adminId: sesion.id,
    accion: "crear",
    entidad: "operario",
    entidadId: operario.id,
    datosNuevos: { nombre: parsed.data.nombre, area_id: areaId },
  });

  redirect(`/personal/${operario.id}`);
}
