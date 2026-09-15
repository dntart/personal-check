"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/supabase/sesion";
import { registrarAuditoria } from "@/lib/personal/auditoria";

export type EstadoHorario = { error: string } | null;

function ayer(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Editar horario (spec sección 6.6): por día de la semana, genera una nueva
 * versión vigente y cierra la anterior. Versionado por fecha — nunca se
 * pisa un horario histórico, se cierra con vigente_hasta.
 */
export async function guardarHorario(
  operarioId: string,
  _estadoPrevio: EstadoHorario,
  formData: FormData,
): Promise<EstadoHorario> {
  const sesion = await obtenerSesion();
  if (!sesion || sesion.tipo !== "admin") {
    return { error: "No tenés permiso para hacer esto." };
  }

  const dias = [1, 2, 3, 4, 5, 6, 7].map((diaSemana) => ({
    diaSemana,
    activo: formData.get(`activo_${diaSemana}`) === "on",
    horaInicio: String(formData.get(`inicio_${diaSemana}`) ?? ""),
    horaFin: String(formData.get(`fin_${diaSemana}`) ?? ""),
  }));

  const supabase = await createClient();
  const fechaHoy = hoy();

  const { data: vigentesActuales } = await supabase
    .from("horarios_semanales")
    .select("id, dia_semana, hora_inicio, hora_fin")
    .eq("operario_id", operarioId)
    .is("deleted_at", null)
    .lte("vigente_desde", fechaHoy)
    .or(`vigente_hasta.is.null,vigente_hasta.gte.${fechaHoy}`);

  const vigentePorDia = new Map(
    (vigentesActuales ?? []).map((v) => [v.dia_semana, v]),
  );

  for (const dia of dias) {
    const actual = vigentePorDia.get(dia.diaSemana);
    const nuevaHoraInicio = dia.activo ? `${dia.horaInicio}:00` : null;
    const nuevaHoraFin = dia.activo ? `${dia.horaFin}:00` : null;

    const sinCambios =
      (!actual && !dia.activo) ||
      (actual &&
        dia.activo &&
        actual.hora_inicio === nuevaHoraInicio &&
        actual.hora_fin === nuevaHoraFin);
    if (sinCambios) continue;

    if (actual) {
      await supabase
        .from("horarios_semanales")
        .update({ vigente_hasta: ayer() })
        .eq("id", actual.id);
    }

    if (dia.activo && nuevaHoraInicio && nuevaHoraFin) {
      if (nuevaHoraFin <= nuevaHoraInicio) {
        return {
          error: `El horario del día ${dia.diaSemana} tiene la hora de fin antes (o igual) que la de inicio.`,
        };
      }
      await supabase.from("horarios_semanales").insert({
        organizacion_id: sesion.organizacionId,
        operario_id: operarioId,
        dia_semana: dia.diaSemana,
        hora_inicio: nuevaHoraInicio,
        hora_fin: nuevaHoraFin,
        vigente_desde: fechaHoy,
      });
    }
  }

  await registrarAuditoria(supabase, {
    organizacionId: sesion.organizacionId,
    adminId: sesion.id,
    accion: "editar",
    entidad: "horario_semanal",
    entidadId: operarioId,
    datosNuevos: { dias },
  });

  redirect(`/personal/${operarioId}`);
}
