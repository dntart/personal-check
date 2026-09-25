import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  calcularEfecto,
  UMBRAL_SALDO_ALTO,
  UMBRAL_HORAS_EXTRA_ALTO,
  CODIGO_TARDANZA_INJUSTIFICADA,
  CODIGO_HORA_EXTRA_TRABAJADA,
} from "./reglas";
import { agruparParaNomina, type AreaNomina } from "./nomina";

/**
 * Alertas (spec sección 5, campanita del dashboard): saldo negativo, saldo
 * ≥ umbral configurable (default 15 días, evita que un crédito gigante pase
 * desapercibido), o acumulado de horas extra ≥ 4hs (AGREGADO 2026-09-24 —
 * podría cambiarse por un día completo a favor). Cuenta personas, no
 * eventos — alguien con los dos problemas a la vez suma una sola alerta.
 * Query liviana — la usa el nav en cada página, no solo el dashboard.
 */
export async function obtenerAlertas(): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("movimientos")
    .select("operario_id, cantidad, tipos_movimiento(impacto, unidad, codigo)")
    .is("deleted_at", null);

  const saldoPorOperario = new Map<string, number>();
  const minutosExtraPorOperario = new Map<string, number>();
  for (const m of data ?? []) {
    const tipo = m.tipos_movimiento as unknown as {
      impacto: "suma" | "resta" | "neutro";
      unidad: "dias" | "minutos";
      codigo: string;
    } | null;
    if (!tipo) continue;
    if (tipo.unidad === "minutos") {
      if (tipo.codigo === CODIGO_HORA_EXTRA_TRABAJADA) {
        minutosExtraPorOperario.set(
          m.operario_id,
          (minutosExtraPorOperario.get(m.operario_id) ?? 0) + m.cantidad,
        );
      }
      continue;
    }
    saldoPorOperario.set(
      m.operario_id,
      (saldoPorOperario.get(m.operario_id) ?? 0) +
        calcularEfecto(tipo.impacto, m.cantidad),
    );
  }

  const operariosConAlerta = new Set<string>();
  for (const [operarioId, saldo] of saldoPorOperario) {
    if (saldo < 0 || saldo >= UMBRAL_SALDO_ALTO) {
      operariosConAlerta.add(operarioId);
    }
  }
  for (const [operarioId, minutos] of minutosExtraPorOperario) {
    if (minutos >= UMBRAL_HORAS_EXTRA_ALTO) operariosConAlerta.add(operarioId);
  }
  return operariosConAlerta.size;
}

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
  const minutosExtraPorOperario = new Map<string, number>();
  for (const m of movimientos) {
    const tipo = m.tipos_movimiento as unknown as {
      impacto: "suma" | "resta" | "neutro";
      unidad: "dias" | "minutos";
      codigo: string;
    } | null;
    if (!tipo) continue;
    if (tipo.unidad === "minutos") {
      // Solo la tardanza injustificada cuenta para el contador informativo
      // — la justificada queda registrada (aparece en el timeline y en el
      // informe General) pero no suma acá, mismo criterio que
      // falta_justificada con el saldo en días.
      if (tipo.codigo === CODIGO_TARDANZA_INJUSTIFICADA) {
        minutosTardanzaPorOperario.set(
          m.operario_id,
          (minutosTardanzaPorOperario.get(m.operario_id) ?? 0) + m.cantidad,
        );
      } else if (tipo.codigo === CODIGO_HORA_EXTRA_TRABAJADA) {
        minutosExtraPorOperario.set(
          m.operario_id,
          (minutosExtraPorOperario.get(m.operario_id) ?? 0) + m.cantidad,
        );
      }
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
    minutosExtraPorOperario,
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

export async function obtenerUltimasNovedades(limite = 8) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("movimientos")
    .select(
      "id, fecha, observaciones, operarios(nombre), tipos_movimiento(nombre), admins(nombre)",
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limite);

  return (data ?? []).map((m) => {
    const operario = m.operarios as unknown as { nombre: string } | null;
    const tipo = m.tipos_movimiento as unknown as { nombre: string } | null;
    const admin = m.admins as unknown as { nombre: string } | null;
    return {
      id: m.id,
      fecha: m.fecha,
      observaciones: m.observaciones,
      operarioNombre: operario?.nombre ?? "—",
      tipoNombre: tipo?.nombre ?? "—",
      cargadoPor: admin?.nombre ?? "—",
    };
  });
}

/** Saldo actual de una persona (solo movimientos en días, no minutos). */
export async function obtenerSaldoOperario(
  operarioId: string,
): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("movimientos")
    .select("cantidad, tipos_movimiento(impacto, unidad)")
    .eq("operario_id", operarioId)
    .is("deleted_at", null);

  let saldo = 0;
  for (const m of data ?? []) {
    const tipo = m.tipos_movimiento as unknown as {
      impacto: "suma" | "resta" | "neutro";
      unidad: "dias" | "minutos";
    } | null;
    if (!tipo || tipo.unidad !== "dias") continue;
    saldo += calcularEfecto(tipo.impacto, m.cantidad);
  }
  return saldo;
}

/**
 * Minutos acumulados de "Hora extra trabajada" de una persona (histórico,
 * igual que obtenerSaldoOperario pero para este tipo puntual) — la usa el
 * aviso por mail de horas extra altas (2026-09-24).
 */
export async function obtenerMinutosExtraOperario(
  operarioId: string,
): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("movimientos")
    .select("cantidad, tipos_movimiento(codigo)")
    .eq("operario_id", operarioId)
    .is("deleted_at", null);

  let minutos = 0;
  for (const m of data ?? []) {
    const tipo = m.tipos_movimiento as unknown as { codigo: string } | null;
    if (tipo?.codigo === CODIGO_HORA_EXTRA_TRABAJADA) {
      minutos += m.cantidad;
    }
  }
  return minutos;
}

/** Emails de los Admin de organización (no Supervisores) para alertas. */
export async function obtenerEmailsAdmins(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("admins")
    .select("email")
    .eq("rol", "admin")
    .is("deleted_at", null);
  return (data ?? []).map((a) => a.email);
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

/**
 * Lista chica de personas para el filtro por persona de los informes
 * (AGREGADO 2026-09-25) — RLS ya limita esto a lo que la sesión puede ver
 * (un Supervisor solo su(s) área(s) asignada(s)), igual que el resto.
 */
export async function obtenerOperariosActivos() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("operarios")
    .select("id, nombre")
    .is("deleted_at", null)
    .eq("activo", true)
    .order("nombre");
  return data ?? [];
}

/**
 * Áreas que la sesión actual puede usar para asignar personal. Un Admin de
 * organización ve todas; un Supervisor solo las que le asignaron
 * (admin_areas) — la tabla `areas` en sí no está particionada por RLS
 * (cualquier admin de la org puede listarlas), así que este recorte es de
 * la app, no de la base. RLS igual bloquea el INSERT/UPDATE si se intenta
 * usar un área fuera de alcance — esto es solo para no ofrecerla en la UI.
 */
export async function obtenerAreasPermitidas(sesion: {
  tipo: string;
  rol?: "admin" | "supervisor";
  id: string;
}) {
  if (sesion.tipo !== "admin" || sesion.rol === "admin") {
    return obtenerAreas();
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("admin_areas")
    .select("areas(id, nombre)")
    .eq("admin_id", sesion.id);

  return (data ?? [])
    .map((r) => r.areas as unknown as { id: string; nombre: string } | null)
    .filter((a): a is { id: string; nombre: string } => a !== null)
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
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
        "id, fecha, cantidad, observaciones, adjunto_url, tipo_movimiento_id, tipos_movimiento(codigo, nombre, impacto, unidad), admins(nombre)",
      )
      .eq("operario_id", operarioId)
      .is("deleted_at", null)
      .order("fecha", { ascending: false }),
  ]);

  if (!operarioRes.data) return null;

  let saldo = 0;
  let minutosTardanza = 0;
  let minutosExtra = 0;
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
      if (tipo.codigo === CODIGO_TARDANZA_INJUSTIFICADA) {
        minutosTardanza += m.cantidad;
      } else if (tipo.codigo === CODIGO_HORA_EXTRA_TRABAJADA) {
        minutosExtra += m.cantidad;
      }
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
    minutosExtra,
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
