"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/supabase/sesion";
import { registrarAuditoria } from "@/lib/personal/auditoria";
import { cargarNovedadSchema } from "@/lib/validations/personal";

export type EstadoNovedad = { error: string } | null;

/**
 * Cargar novedad (spec sección 6.5 y 5). El adjunto de imagen todavía no
 * está implementado (falta el bucket de Storage + políticas) — por ahora
 * queda como link opcional en vez de upload real.
 */
export async function cargarNovedad(
  operarioId: string,
  _estadoPrevio: EstadoNovedad,
  formData: FormData,
): Promise<EstadoNovedad> {
  const sesion = await obtenerSesion();
  if (!sesion || sesion.tipo !== "admin") {
    return { error: "No tenés permiso para hacer esto." };
  }

  const parsed = cargarNovedadSchema.safeParse({
    operarioId,
    tipoMovimientoId: formData.get("tipoMovimientoId"),
    fecha: formData.get("fecha"),
    cantidad: formData.get("cantidad"),
    observaciones: formData.get("observaciones") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();

  const { data: tipo } = await supabase
    .from("tipos_movimiento")
    .select("id, nombre, requiere_adjunto")
    .eq("id", parsed.data.tipoMovimientoId)
    .maybeSingle();

  if (!tipo) return { error: "Tipo de novedad inválido." };

  const adjuntoUrl = String(formData.get("adjuntoUrl") ?? "").trim() || null;
  if (tipo.requiere_adjunto && !adjuntoUrl) {
    return {
      error: `"${tipo.nombre}" requiere adjuntar el justificativo (por ahora, pegá el link de la foto ya subida — el upload directo todavía no está implementado).`,
    };
  }

  const { data: movimiento, error } = await supabase
    .from("movimientos")
    .insert({
      organizacion_id: sesion.organizacionId,
      operario_id: operarioId,
      admin_id: sesion.id,
      tipo_movimiento_id: parsed.data.tipoMovimientoId,
      fecha: parsed.data.fecha,
      cantidad: parsed.data.cantidad,
      observaciones: parsed.data.observaciones ?? null,
      adjunto_url: adjuntoUrl,
    })
    .select("id")
    .single();

  if (error || !movimiento) {
    return { error: "No se pudo guardar la novedad." };
  }

  await registrarAuditoria(supabase, {
    organizacionId: sesion.organizacionId,
    adminId: sesion.id,
    accion: "crear",
    entidad: "movimiento",
    entidadId: movimiento.id,
    datosNuevos: parsed.data,
  });

  redirect(`/personal/${operarioId}`);
}
