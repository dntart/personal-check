import "server-only";
import { createClient } from "@/lib/supabase/server";
import { calcularEfecto } from "./reglas";

export type TipoInforme = "general" | "a_favor" | "a_descontar";

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
};

export type DatosInforme = {
  mes: number;
  anio: number;
  tipo: TipoInforme;
  movimientos: MovimientoInforme[];
  resumen: ResumenPersona[];
};

type MovimientoCrudo = {
  id: string;
  operario_id: string;
  fecha: string;
  cantidad: number;
  observaciones: string | null;
  operarios: { nombre: string } | null;
  tipos_movimiento: {
    codigo: string;
    nombre: string;
    impacto: "suma" | "resta" | "neutro";
    unidad: "dias" | "minutos";
  } | null;
};

/**
 * Informes (spec sección 5): filtrables por mes y tipo.
 * - general: todos los movimientos del mes + saldo histórico por persona
 * - a_favor: solo movimientos con efecto positivo + total histórico a favor
 * - a_descontar: solo movimientos con efecto negativo + total histórico a descontar
 * Las faltas justificadas y tardanzas (efecto neutro) nunca aparecen en los
 * informes filtrados, solo en el general.
 */
export async function obtenerInforme(
  mes: number,
  anio: number,
  tipo: TipoInforme,
): Promise<DatosInforme> {
  const supabase = await createClient();

  const desde = `${anio}-${String(mes).padStart(2, "0")}-01`;
  const hastaFecha = new Date(anio, mes, 1); // día 1 del mes siguiente
  const hasta = hastaFecha.toISOString().slice(0, 10);

  const [delMesRes, todosRes] = await Promise.all([
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
        "operario_id, cantidad, tipos_movimiento(impacto, unidad), operarios(nombre)",
      )
      .is("deleted_at", null),
  ]);

  const delMes = (delMesRes.data ?? []) as unknown as MovimientoCrudo[];

  const cumpleFiltro = (tipoMov: MovimientoCrudo["tipos_movimiento"]) => {
    if (!tipoMov || tipoMov.unidad !== "dias") return tipo === "general";
    if (tipo === "general") return true;
    const efecto = calcularEfecto(tipoMov.impacto, 1); // solo el signo importa acá
    if (tipo === "a_favor") return efecto > 0;
    return efecto < 0;
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
    tipos_movimiento: {
      impacto: "suma" | "resta" | "neutro";
      unidad: "dias" | "minutos";
    } | null;
    operarios: { nombre: string } | null;
  };
  const todos = (todosRes.data ?? []) as unknown as MovTodo[];

  const acumuladoPorOperario = new Map<string, number>();
  const nombrePorOperario = new Map<string, string>();
  for (const m of todos) {
    if (!operariosDelInforme.has(m.operario_id)) continue;
    const t = m.tipos_movimiento;
    if (!t || t.unidad !== "dias") continue;
    nombrePorOperario.set(m.operario_id, m.operarios?.nombre ?? "—");
    const efecto = calcularEfecto(t.impacto, m.cantidad);
    if (tipo === "general") {
      acumuladoPorOperario.set(
        m.operario_id,
        (acumuladoPorOperario.get(m.operario_id) ?? 0) + efecto,
      );
    } else if (tipo === "a_favor" && efecto > 0) {
      acumuladoPorOperario.set(
        m.operario_id,
        (acumuladoPorOperario.get(m.operario_id) ?? 0) + efecto,
      );
    } else if (tipo === "a_descontar" && efecto < 0) {
      acumuladoPorOperario.set(
        m.operario_id,
        (acumuladoPorOperario.get(m.operario_id) ?? 0) + efecto,
      );
    }
  }

  const resumen: ResumenPersona[] = [...operariosDelInforme].map((id) => ({
    operarioId: id,
    nombre: nombrePorOperario.get(id) ?? "—",
    total: acumuladoPorOperario.get(id) ?? 0,
  }));
  resumen.sort((a, b) => a.nombre.localeCompare(b.nombre));

  return { mes, anio, tipo, movimientos, resumen };
}
