"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/supabase/sesion";
import { registrarAuditoria } from "@/lib/personal/auditoria";
import {
  obtenerSaldoOperario,
  obtenerMinutosExtraOperario,
  obtenerEmailsAdmins,
} from "@/lib/personal/data";
import {
  UMBRAL_SALDO_ALTO,
  UMBRAL_HORAS_EXTRA_ALTO,
  esBloque30,
  formatearMinutosComoHoras,
} from "@/lib/personal/reglas";
import { enviarEmail } from "@/lib/resend";
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
    .select("id, codigo, nombre, requiere_adjunto")
    .eq("id", parsed.data.tipoMovimientoId)
    .maybeSingle();

  if (!tipo) return { error: "Tipo de novedad inválido." };

  // El formulario ya lo fuerza con un desplegable (un <input type=number>
  // con step no impide tipear cualquier valor a mano, sobre todo en
  // mobile), pero esto viene de un FormData crudo — puede llegar cualquier
  // cosa sin pasar por el select. Doble chequeo del lado del servidor.
  if (
    esBloque30(tipo.codigo) &&
    (parsed.data.cantidad <= 0 || parsed.data.cantidad % 30 !== 0)
  ) {
    return { error: `"${tipo.nombre}" se carga en bloques de 30 minutos.` };
  }

  const adjuntoUrl = String(formData.get("adjuntoUrl") ?? "").trim() || null;
  // TEMPORAL (2026-09-17, a pedido explícito de Dante): el bucket de
  // Supabase Storage para las fotos de justificativo todavía no existe, así
  // que exigir el adjunto acá bloqueaba cargar faltas/tardanzas justificadas
  // sin ninguna forma de cumplir el requisito. Se vuelve a exigir
  // (descomentando esto) en cuanto el upload de fotos esté implementado —
  // ver docs/PERSONALCHECK-SPEC.md sección 5, nota "TEMPORAL".
  //
  // if (tipo.requiere_adjunto && !adjuntoUrl) {
  //   return {
  //     error: `"${tipo.nombre}" requiere adjuntar el justificativo (por ahora, pegá el link de la foto ya subida — el upload directo todavía no está implementado).`,
  //   };
  // }

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

  await Promise.all([
    avisarSiSaldoFueraDeRango(operarioId, sesion.organizacionNombre),
    avisarSiHorasExtraAltas(operarioId, sesion.organizacionNombre),
  ]);

  redirect(`/personal/${operarioId}`);
}

/**
 * Alertas (spec sección 5 y roadmap Fase 2): si esta novedad dejó a la
 * persona con saldo negativo o ≥ umbral, avisa por email a los Admin de la
 * organización. No bloquea la carga de la novedad si el email falla.
 */
export async function avisarSiSaldoFueraDeRango(
  operarioId: string,
  organizacionNombre: string,
) {
  try {
    const supabase = await createClient();
    const [saldo, emails, { data: operario }] = await Promise.all([
      obtenerSaldoOperario(operarioId),
      obtenerEmailsAdmins(),
      supabase
        .from("operarios")
        .select("nombre")
        .eq("id", operarioId)
        .maybeSingle(),
    ]);

    if (saldo >= 0 && saldo < UMBRAL_SALDO_ALTO) return;

    const motivo =
      saldo < 0 ? "saldo negativo" : `saldo alto (≥ ${UMBRAL_SALDO_ALTO} días)`;

    await enviarEmail({
      to: emails,
      subject: `PersonalCheck — Alerta de ${motivo}: ${operario?.nombre ?? "una persona"}`,
      text: `${operario?.nombre ?? "Una persona"} tiene ${motivo} en ${organizacionNombre}.\n\nSaldo actual: ${saldo} días.\n\nRevisalo en la Nómina de PersonalCheck.`,
    });
  } catch (err) {
    console.error("No se pudo evaluar/enviar la alerta de saldo:", err);
  }
}

/**
 * A pedido de Dante (2026-09-24): "cuando un personal acumule más de 4
 * horas... podría cambiarse por un día completo a favor". Mismo mecanismo
 * que avisarSiSaldoFueraDeRango — no bloquea la carga si el email falla.
 */
export async function avisarSiHorasExtraAltas(
  operarioId: string,
  organizacionNombre: string,
) {
  try {
    const supabase = await createClient();
    const [minutos, emails, { data: operario }] = await Promise.all([
      obtenerMinutosExtraOperario(operarioId),
      obtenerEmailsAdmins(),
      supabase
        .from("operarios")
        .select("nombre")
        .eq("id", operarioId)
        .maybeSingle(),
    ]);

    if (minutos < UMBRAL_HORAS_EXTRA_ALTO) return;

    const acumulado = formatearMinutosComoHoras(minutos);

    await enviarEmail({
      to: emails,
      subject: `PersonalCheck — Horas extra acumuladas: ${operario?.nombre ?? "una persona"}`,
      text: `${operario?.nombre ?? "Una persona"} tiene ${acumulado} de horas extra acumuladas en ${organizacionNombre} — podrían cambiarse por un día completo a favor.\n\nRevisalo en la ficha de la persona en PersonalCheck.`,
    });
  } catch (err) {
    console.error("No se pudo evaluar/enviar la alerta de horas extra:", err);
  }
}
