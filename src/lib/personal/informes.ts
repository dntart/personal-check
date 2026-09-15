import "server-only";
import { createClient } from "@/lib/supabase/server";
import { calcularEfecto } from "./reglas";

const FILTROS_AGREGADOS = ["general", "a_favor", "a_descontar"] as const;
export type FiltroInformeAgregado = (typeof FILTROS_AGREGADOS)[number];

/**
 * O uno de los 3 filtros agregados de siempre, o el `codigo` exacto de un
 * tipo de personalcheck.tipos_movimiento (ej: "falta_injustificada") — el
 * usuario pidió poder filtrar el informe por cada tipo de novedad, igual a
 * las opciones que ya existen al cargar una.
 */
export type FiltroInforme = FiltroInformeAgregado | string;

function esFiltroAgregado(
  filtro: FiltroInforme,
): filtro is FiltroInformeAgregado {
  return (FILTROS_AGREGADOS as readonly string[]).includes(filtro);
}

export type MovimientoInforme = {
  id: string;
  fecha: string;
  operarioNombre: string;
  tipoNombre: string;
  tipoUnidad: "dias" | "minutos";
  cantidad: number;
  observaciones: string | null;
};

export type ResumenPersona = {
  operarioId: string;
  nombre: string;
  total: number; // histórico, no acotado al mes — spec sección 5
  unidad: "dias" | "minutos";
};

export type DatosInforme = {
  mes: number;
  anio: number;
  filtro: FiltroInforme;
  filtroLabel: string;
  movimientos: MovimientoInforme[];
  resumen: ResumenPersona[];
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
};

/**
 * Informes (spec sección 5, ampliado a pedido del usuario): filtrables por
 * mes y por tipo — general / solo a favor / solo a descontar, o un tipo de
 * novedad específico (Día compensado tomado, Día/hora extra trabajado,
 * Falta injustificada, Falta justificada, Tardanza injustificada, Tardanza
 * justificada).
 *
 * El detalle es del mes elegido; el resumen por persona es histórico
 * acumulado, no acotado al mes (spec sección 5). Con un filtro agregado
 * (a_favor/a_descontar) el resumen es el neto en días; con un tipo
 * específico, es la suma cruda de ese tipo en su propia unidad (días o
 * minutos) — no tiene sentido "el signo" cuando ya se filtró a un solo tipo.
 */
export async function obtenerInforme(
  mes: number,
  anio: number,
  filtro: FiltroInforme,
): Promise<DatosInforme> {
  const supabase = await createClient();

  const desde = `${anio}-${String(mes).padStart(2, "0")}-01`;
  const hastaFecha = new Date(anio, mes, 1); // día 1 del mes siguiente
  const hasta = hastaFecha.toISOString().slice(0, 10);

  const [delMesRes, todosRes, tiposRes] = await Promise.all([
    supabase
      .from("movimientos")
      .select(
        "id, operario_id, fecha, cantidad, observaciones, operarios(nombre), tipos_movimiento(codigo, nombre, impacto, unidad)",
      )
      .is("deleted_at", null)
      .gte("fecha", desde)
      .lt("fecha", hasta)
      .order("fecha"),
    supabase
      .from("movimientos")
      .select(
        "operario_id, cantidad, tipos_movimiento(codigo, impacto, unidad), operarios(nombre)",
      )
      .is("deleted_at", null),
    supabase.from("tipos_movimiento").select("codigo, nombre"),
  ]);

  const delMes = (delMesRes.data ?? []) as unknown as MovimientoCrudo[];

  const cumpleFiltro = (tipoMov: TipoMov | null) => {
    if (!tipoMov) return false;
    if (esFiltroAgregado(filtro)) {
      if (filtro === "general") return true;
      if (tipoMov.unidad !== "dias") return false; // nunca en los agregados
      const efecto = calcularEfecto(tipoMov.impacto, 1); // solo el signo
      return filtro === "a_favor" ? efecto > 0 : efecto < 0;
    }
    return tipoMov.codigo === filtro;
  };

  const movimientos: MovimientoInforme[] = delMes
    .filter((m) => cumpleFiltro(m.tipos_movimiento))
    .map((m) => ({
      id: m.id,
      fecha: m.fecha,
      operarioNombre: m.operarios?.nombre ?? "—",
      tipoNombre: m.tipos_movimiento?.nombre ?? "—",
      tipoUnidad: m.tipos_movimiento?.unidad ?? "dias",
      cantidad: m.cantidad,
      observaciones: m.observaciones,
    }));

  const operariosDelInforme = new Set(
    delMes
      .filter((m) => cumpleFiltro(m.tipos_movimiento))
      .map((m) => m.operario_id),
  );

  type MovTodo = {
    operario_id: string;
    cantidad: number;
    tipos_movimiento: TipoMov | null;
    operarios: { nombre: string } | null;
  };
  const todos = (todosRes.data ?? []) as unknown as MovTodo[];

  const acumuladoPorOperario = new Map<string, number>();
  const nombrePorOperario = new Map<string, string>();
  let unidadResumen: "dias" | "minutos" = "dias";

  for (const m of todos) {
    if (!operariosDelInforme.has(m.operario_id)) continue;
    const t = m.tipos_movimiento;
    if (!t) continue;
    nombrePorOperario.set(m.operario_id, m.operarios?.nombre ?? "—");

    if (esFiltroAgregado(filtro)) {
      if (t.unidad !== "dias") continue;
      const efecto = calcularEfecto(t.impacto, m.cantidad);
      const suma =
        filtro === "general" ||
        (filtro === "a_favor" && efecto > 0) ||
        (filtro === "a_descontar" && efecto < 0);
      if (suma) {
        acumuladoPorOperario.set(
          m.operario_id,
          (acumuladoPorOperario.get(m.operario_id) ?? 0) + efecto,
        );
      }
    } else if (t.codigo === filtro) {
      unidadResumen = t.unidad;
      acumuladoPorOperario.set(
        m.operario_id,
        (acumuladoPorOperario.get(m.operario_id) ?? 0) + m.cantidad,
      );
    }
  }

  const resumen: ResumenPersona[] = [...operariosDelInforme].map((id) => ({
    operarioId: id,
    nombre: nombrePorOperario.get(id) ?? "—",
    total: acumuladoPorOperario.get(id) ?? 0,
    unidad: unidadResumen,
  }));
  resumen.sort((a, b) => a.nombre.localeCompare(b.nombre));

  const LABEL_AGREGADO: Record<FiltroInformeAgregado, string> = {
    general: "General",
    a_favor: "Solo días a favor",
    a_descontar: "Solo días a descontar",
  };
  const filtroLabel = esFiltroAgregado(filtro)
    ? LABEL_AGREGADO[filtro]
    : ((tiposRes.data ?? []).find((t) => t.codigo === filtro)?.nombre ??
      filtro);

  return { mes, anio, filtro, filtroLabel, movimientos, resumen };
}
