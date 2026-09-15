"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/supabase/sesion";
import { registrarAuditoria } from "@/lib/personal/auditoria";
import { z } from "zod";

const editarPersonalSchema = z.object({
  nombre: z.string().trim().min(1, "Ingresá un nombre"),
  areaId: z.string().uuid("Elegí un área"),
});

export type EstadoEditarPersonal = { error: string } | null;

/**
 * Editar datos básicos de una persona (nombre / área) — spec sección 8,
 * roadmap Fase 1: "nómina con alta/edición/baja". Distinto de "Editar
 * horario", que versiona el horario semanal.
 */
export async function editarOperario(
  operarioId: string,
  _estadoPrevio: EstadoEditarPersonal,
  formData: FormData,
): Promise<EstadoEditarPersonal> {
  const sesion = await obtenerSesion();
  if (!sesion || sesion.tipo !== "admin") {
    return { error: "No tenés permiso para hacer esto." };
  }

  const parsed = editarPersonalSchema.safeParse({
    nombre: formData.get("nombre"),
    areaId: formData.get("areaId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();

  const { data: anterior } = await supabase
    .from("operarios")
    .select("nombre, area_id")
    .eq("id", operarioId)
    .maybeSingle();
  if (!anterior) return { error: "No se encontró a esa persona." };

  const { error } = await supabase
    .from("operarios")
    .update({ nombre: parsed.data.nombre, area_id: parsed.data.areaId })
    .eq("id", operarioId);

  if (error) {
    return {
      error:
        "No se pudo guardar (¿el área elegida está fuera de lo que podés gestionar?).",
    };
  }

  await registrarAuditoria(supabase, {
    organizacionId: sesion.organizacionId,
    adminId: sesion.id,
    accion: "editar",
    entidad: "operario",
    entidadId: operarioId,
    datosAnteriores: anterior,
    datosNuevos: parsed.data,
  });

  redirect(`/personal/${operarioId}`);
}
