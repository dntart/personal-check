import "server-only";
import { createClient } from "@/lib/supabase/server";
import { calcularEfecto, formatearFecha, NOMBRE_MES } from "./reglas";

export type FiltroAgregado = "general" | "a_favor" | "a_descontar";

/**
 * Un mes puntual, o el año completo hasta hoy (AGREGADO 2026-09-29, a
 * pedido del usuario: "generar reporte de todo el año hasta la fecha
 * actual") — `mes` ausente/undefined es la señal de "año completo".
 */
export type Periodo = { anio: number; mes?: number };

/**
 * Dos modos, no mezclables (evita la ambigüedad de qué significa "el
 * acumulado" si se combinan tipos de distinta unidad):
 * - agregado: los 3 de siempre (General/Solo a favor/Solo a descontar),
 *   selección única — el resumen es el neto en días, con signo.
 * - especifico: uno o más tipos de novedad puntuales elegidos a mano (ej.
 *   "Falta justificada" + "Tardanza justificada" juntos) — el resumen es
 *   la suma cruda de cantidad por unidad (días y minutos por separado, no
 *   tiene sentido un signo neto cuando el tipo es neutro).
 */
export type ParametrosInforme =
  | { modo: "agregado"; agregado: FiltroAgregado }
  | { modo: "especifico"; codigos: string[] };

export type MovimientoInforme = {
  id: string;
  fecha: string;
  operarioNombre: string;
  tipoNombre: string;
  tipoUnidad: "dias" | "minutos";
  cantidad: number;
  observaciones: string | null;
  cargadoPor: string;
};

export type ResumenPersona = {
  operarioId: string;
  nombre: string;
  totalDias: number;
  totalMinutos: number;
};

export type DatosInforme = {
  anio: number;
  mes?: number; // undefined = informe de año completo
  periodoLabel: string; // "Septiembre 2026" | "2026 completo — hasta el 29/09/2026"
  filtroLabel: string;
  movimientos: MovimientoInforme[];
  resumen: ResumenPersona[] | null; // null = no se pidió incluirlo
};

type TipoMov = {
  codigo: string;
  nombre: string;
  impacto: "suma" | "resta" | "neutro";
  unidad: "dias" | "minutos";
};

type MovimientoCrudo = {
  id: string;
  operario_id: string;
  fecha: string;
  cantidad: number;
  observaciones: string | null;
  operarios: { nombre: string } | null;
  tipos_movimiento: TipoMov | null;
  admins: { nombre: string } | null;
};

const LABEL_AGREGADO: Record<FiltroAgregado, string> = {
  general: "General (todas las novedades)",
  a_favor: "Solo días a favor",
  a_descontar: "Solo días a descontar",
};

function cumpleFiltro(tipoMov: TipoMov | null, params: ParametrosInforme) {
  if (!tipoMov) return false;
  if (params.modo === "especifico") {
    return params.codigos.includes(tipoMov.codigo);
  }
  if (params.agregado === "general") return true;
  if (tipoMov.unidad !== "dias") return false; // nunca en los agregados de signo
  const efecto = calcularEfecto(tipoMov.impacto, 1); // solo el signo
  return params.agregado === "a_favor" ? efecto > 0 : efecto < 0;
}

/**
 * Informes (spec sección 5, ampliado a pedido del usuario): filtrables por
 * período y por tipo — agregado (general/a favor/a descontar) o una
 * selección de tipos de novedad específicos. El resumen histórico es
 * opcional (`incluirResumen`) — antes se imprimía siempre, ahora es una
 * elección. AGREGADO 2026-09-25: filtro opcional por persona puntual (ej.
 * "cuántos permisos se tomó Ada en particular") — se combina con el filtro
 * de tipo, no lo reemplaza.
 *
 * El detalle es del período elegido — un mes puntual, o el año completo
 * hasta hoy (AGREGADO 2026-09-29, `periodo.mes` ausente); el resumen
 * (cuando se pide) siempre es histórico acumulado total, sin acotar al
 * período (spec sección 5) — eso no cambió.
 */
export async function obtenerInforme(
  periodo: Periodo,
  params: ParametrosInforme,
  incluirResumen: boolean,
  operario?: { id: string; nombre: string },
): Promise<DatosInforme> {
  const supabase = await createClient();

  const { anio, mes } = periodo;
  let desde: string;
  let hasta: string; // exclusivo
  let periodoLabel: string;

  if (mes) {
    desde = `${anio}-${String(mes).padStart(2, "0")}-01`;
    hasta = new Date(anio, mes, 1).toISOString().slice(0, 10); // día 1 del mes siguiente
    periodoLabel = `${NOMBRE_MES[mes - 1]} ${anio}`;
  } else {
    // Año completo — si es el año en curso, hasta hoy inclusive (no tiene
    // sentido "hasta el 31/12" de un año que todavía no terminó); si es un
    // año anterior, el año completo sí.
    desde = `${anio}-01-01`;
    const hoyISO = new Date().toISOString().slice(0, 10);
    if (anio === Number(hoyISO.slice(0, 4))) {
      const mananaISO = new Date(hoyISO);
      mananaISO.setUTCDate(mananaISO.getUTCDate() + 1);
      hasta = mananaISO.toISOString().slice(0, 10);
      periodoLabel = `${anio} completo — hasta el ${formatearFecha(hoyISO)}`;
    } else {
      hasta = `${anio + 1}-01-01`;
      periodoLabel = `${anio} completo`;
    }
  }

  let queryDelMes = supabase
    .from("movimientos")
    .select(
      "id, operario_id, fecha, cantidad, observaciones, operarios(nombre), tipos_movimiento(codigo, nombre, impacto, unidad), admins(nombre)",
    )
    .is("deleted_at", null)
    .gte("fecha", desde)
    .lt("fecha", hasta)
    .order("fecha");
  if (operario) queryDelMes = queryDelMes.eq("operario_id", operario.id);

  let queryTodos = supabase
    .from("movimientos")
    .select(
      "operario_id, cantidad, tipos_movimiento(codigo, impacto, unidad), operarios(nombre)",
    )
    .is("deleted_at", null);
  if (operario) queryTodos = queryTodos.eq("operario_id", operario.id);

  const [delMesRes, todosRes] = await Promise.all([
    queryDelMes,
    incluirResumen ? queryTodos : Promise.resolve({ data: [] }),
  ]);

  const delMes = (delMesRes.data ?? []) as unknown as MovimientoCrudo[];

  const movimientos: MovimientoInforme[] = delMes
    .filter((m) => cumpleFiltro(m.tipos_movimiento, params))
    .map((m) => ({
      id: m.id,
      fecha: m.fecha,
      operarioNombre: m.operarios?.nombre ?? "—",
      tipoNombre: m.tipos_movimiento?.nombre ?? "—",
      tipoUnidad: m.tipos_movimiento?.unidad ?? "dias",
      cantidad: m.cantidad,
      observaciones: m.observaciones,
      cargadoPor: m.admins?.nombre ?? "—",
    }));

  let resumen: ResumenPersona[] | null = null;

  if (incluirResumen) {
    const operariosDelInforme = new Set(
      delMes
        .filter((m) => cumpleFiltro(m.tipos_movimiento, params))
        .map((m) => m.operario_id),
    );

    type MovTodo = {
      operario_id: string;
      cantidad: number;
      tipos_movimiento: TipoMov | null;
      operarios: { nombre: string } | null;
    };
    const todos = (todosRes.data ?? []) as unknown as MovTodo[];

    const diasPorOperario = new Map<string, number>();
    const minutosPorOperario = new Map<string, number>();
    const nombrePorOperario = new Map<string, string>();

    for (const m of todos) {
      if (!operariosDelInforme.has(m.operario_id)) continue;
      const t = m.tipos_movimiento;
      if (!t || !cumpleFiltro(t, params)) continue;
      nombrePorOperario.set(m.operario_id, m.operarios?.nombre ?? "—");

      if (params.modo === "agregado") {
        // Agregado: neto con signo (el resumen "de siempre").
        const efecto = calcularEfecto(t.impacto, m.cantidad);
        diasPorOperario.set(
          m.operario_id,
          (diasPorOperario.get(m.operario_id) ?? 0) + efecto,
        );
      } else if (t.unidad === "dias") {
        // Específico: suma cruda, no tiene sentido un signo cuando el
        // tipo es neutro (falta/tardanza justificada siempre darían 0).
        diasPorOperario.set(
          m.operario_id,
          (diasPorOperario.get(m.operario_id) ?? 0) + m.cantidad,
        );
      } else {
        minutosPorOperario.set(
          m.operario_id,
          (minutosPorOperario.get(m.operario_id) ?? 0) + m.cantidad,
        );
      }
    }

    resumen = [...operariosDelInforme]
      .map((id) => ({
        operarioId: id,
        nombre: nombrePorOperario.get(id) ?? "—",
        totalDias: diasPorOperario.get(id) ?? 0,
        totalMinutos: minutosPorOperario.get(id) ?? 0,
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  const filtroTipo =
    params.modo === "agregado"
      ? LABEL_AGREGADO[params.agregado]
      : params.codigos.map((c) => LABELS_POR_CODIGO[c] ?? c).join(" + ") ||
        "Sin tipos elegidos";
  const filtroLabel = operario
    ? `${filtroTipo} — ${operario.nombre}`
    : filtroTipo;

  return { anio, mes, periodoLabel, filtroLabel, movimientos, resumen };
}

// Catálogo fijo de novedades (spec sección 5) — evita una query extra solo
// para armar la etiqueta del informe.
const LABELS_POR_CODIGO: Record<string, string> = {
  compensado_tomado: "Día compensado tomado",
  dia_extra_trabajado: "Día extra trabajado",
  hora_extra_trabajada: "Hora extra trabajada",
  licencia_extraordinaria: "Licencia Extraordinaria",
  falta_injustificada: "Falta injustificada",
  falta_justificada: "Falta justificada",
  tardanza_injustificada: "Tardanza injustificada",
  tardanza_justificada: "Tardanza justificada",
  salida_anticipada_injustificada: "Salida anticipada injustificada",
  salida_anticipada_justificada: "Salida anticipada justificada",
  licencia_anual_ordinaria: "Licencia Anual Ordinaria",
  cambio_dia: "Cambio de día",
  cambio_horario: "Cambio de horario",
  ajuste_manual: "Ajuste manual",
};
