import "server-only";
import { createClient } from "@/lib/supabase/server";
import { calcularEfecto } from "./reglas";
import { agruparParaNomina, type AreaNomina } from "./nomina";

/**
 * Trae todo lo necesario para armar la Nómina y lo agrupa. RLS ya filtra
 * por organización/área (org_actual() + puede_ver_area()) — no hace falta
 * filtrar organizacion_id a mano acá.
 */
export async function obtenerNomina(): Promise<AreaNomina[]> {
  const supabase = await createClient();
  const hoy = new Date().toISOString().slice(0, 10);

  const [areasRes, operariosRes, horariosRes, movimientosRes] =
    await Promise.all([
      supabase
        .from("areas")
        .select("id, nombre")
        .is("deleted_at", null)
        .order("nombre"),
      supabase
        .from("operarios")
        .select("id, nombre, area_id")
        .is("deleted_at", null)
        .eq("activo", true)
        .order("nombre"),
      supabase
        .from("horarios_semanales")
        .select("operario_id, dia_semana, hora_inicio, hora_fin")
        .is("deleted_at", null)
        .lte("vigente_desde", hoy)
        .or(`vigente_hasta.is.null,vigente_hasta.gte.${hoy}`),
      supabase
        .from("movimientos")
        .select(
          "operario_id, cantidad, tipos_movimiento(impacto, unidad, codigo)",
        )
        .is("deleted_at", null),
    ]);

  const areas = areasRes.data ?? [];
  const operarios = operariosRes.data ?? [];
  const horarios = horariosRes.data ?? [];
  const movimientos = movimientosRes.data ?? [];

  const horariosPorOperario = new Map<
    string,
    {
      operario_id: string;
      dia_semana: number;
      hora_inicio: string;
      hora_fin: string;
    }[]
  >();
  for (const h of horarios) {
    const lista = horariosPorOperario.get(h.operario_id) ?? [];
    lista.push(h);
    horariosPorOperario.set(h.operario_id, lista);
  }

  const saldoPorOperario = new Map<string, number>();
  const minutosTardanzaPorOperario = new Map<string, number>();
  for (const m of movimientos) {
    const tipo = m.tipos_movimiento as unknown as {
      impacto: "suma" | "resta" | "neutro";
      unidad: "dias" | "minutos";
      codigo: string;
    } | null;
    if (!tipo) continue;
    if (tipo.unidad === "minutos") {
      minutosTardanzaPorOperario.set(
        m.operario_id,
        (minutosTardanzaPorOperario.get(m.operario_id) ?? 0) + m.cantidad,
      );
      continue;
    }
    const efecto = calcularEfecto(tipo.impacto, m.cantidad);
    saldoPorOperario.set(
      m.operario_id,
      (saldoPorOperario.get(m.operario_id) ?? 0) + efecto,
    );
  }

  return agruparParaNomina(
    areas,
    operarios,
    horariosPorOperario,
    saldoPorOperario,
    minutosTardanzaPorOperario,
  );
}

export async function obtenerEstadisticasDashboard() {
  const supabase = await createClient();
  const inicioDeMes = new Date();
  inicioDeMes.setDate(1);
  const inicioDeMesISO = inicioDeMes.toISOString().slice(0, 10);

  const [operariosRes, movimientosRes, movimientosMesRes] = await Promise.all([
    supabase
      .from("operarios")
      .select("id")
      .is("deleted_at", null)
      .eq("activo", true),
    supabase
      .from("movimientos")
      .select("operario_id, cantidad, tipos_movimiento(impacto, unidad)")
      .is("deleted_at", null),
    supabase
      .from("movimientos")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .gte("fecha", inicioDeMesISO),
  ]);

  const personalActivo = operariosRes.data?.length ?? 0;

  const saldoPorOperario = new Map<string, number>();
  for (const m of movimientosRes.data ?? []) {
    const tipo = m.tipos_movimiento as unknown as {
      impacto: "suma" | "resta" | "neutro";
      unidad: "dias" | "minutos";
    } | null;
    if (!tipo || tipo.unidad !== "dias") continue;
    saldoPorOperario.set(
      m.operario_id,
      (saldoPorOperario.get(m.operario_id) ?? 0) +
        calcularEfecto(tipo.impacto, m.cantidad),
    );
  }

  let saldoNegativo = 0;
  let saldoPositivo = 0;
  for (const saldo of saldoPorOperario.values()) {
    if (saldo < 0) saldoNegativo++;
    else if (saldo > 0) saldoPositivo++;
  }

  return {
    personalActivo,
    saldoNegativo,
    saldoPositivo,
    novedadesDelMes: movimientosMesRes.count ?? 0,
  };
}

export async function obtenerAreas() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("areas")
    .select("id, nombre")
    .is("deleted_at", null)
    .order("nombre");
  return data ?? [];
}

export async function obtenerFichaPersonal(operarioId: string) {
  const supabase = await createClient();
  const hoy = new Date().toISOString().slice(0, 10);

  const [operarioRes, horariosRes, movimientosRes] = await Promise.all([
    supabase
      .from("operarios")
      .select("id, nombre, area_id, areas(id, nombre)")
      .eq("id", operarioId)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .from("horarios_semanales")
      .select("id, dia_semana, hora_inicio, hora_fin")
      .eq("operario_id", operarioId)
      .is("deleted_at", null)
      .lte("vigente_desde", hoy)
      .or(`vigente_hasta.is.null,vigente_hasta.gte.${hoy}`)
      .order("dia_semana"),
    supabase
      .from("movimientos")
      .select(
        "id, fecha, cantidad, observaciones, adjunto_url, tipos_movimiento(codigo, nombre, impacto, unidad)",
      )
      .eq("operario_id", operarioId)
      .is("deleted_at", null)
      .order("fecha", { ascending: false }),
  ]);

  if (!operarioRes.data) return null;

  let saldo = 0;
  let minutosTardanza = 0;
  const movimientos = movimientosRes.data ?? [];
  for (const m of movimientos) {
    const tipo = m.tipos_movimiento as unknown as {
      impacto: "suma" | "resta" | "neutro";
      unidad: "dias" | "minutos";
      codigo: string;
      nombre: string;
    } | null;
    if (!tipo) continue;
    if (tipo.unidad === "minutos") {
      minutosTardanza += m.cantidad;
    } else {
      saldo += calcularEfecto(tipo.impacto, m.cantidad);
    }
  }

  return {
    operario: operarioRes.data,
    horarios: horariosRes.data ?? [],
    movimientos,
    saldo,
    minutosTardanza,
  };
}

export async function obtenerTiposMovimiento() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tipos_movimiento")
    .select("id, codigo, nombre, impacto, requiere_adjunto, unidad")
    .order("nombre");
  return data ?? [];
}
