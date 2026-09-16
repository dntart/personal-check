import {
  calcularTurno,
  esAdministracion,
  UMBRAL_SALDO_ALTO,
  type Turno,
} from "./reglas";

export type DiaCelda = {
  diaSemana: number;
  estado: "horario" | "otro" | "franco";
  horaInicio?: string;
  horaFin?: string;
};

export type PersonaNomina = {
  id: string;
  nombre: string;
  saldo: number;
  minutosTardanza: number;
  dias: DiaCelda[];
};

export type BloqueTurno = {
  turno: Turno | null; // null = bloque único de Administración
  personas: PersonaNomina[];
};

export type AreaNomina = {
  areaId: string;
  areaNombre: string;
  esAdministracion: boolean;
  bloques: BloqueTurno[];
  sinHorario: PersonaNomina[];
};

type OperarioBase = { id: string; nombre: string; area_id: string };
type HorarioBase = {
  operario_id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
};
type AreaBase = { id: string; nombre: string };

/**
 * Agrupa la nómina por área y turno (spec sección 6.3). El turno de una
 * persona se calcula por día — puede aparecer en el bloque Mañana y en el
 * de Tarde a la vez si tiene horario mixto, siempre con la misma ficha y
 * saldo (nunca se duplica en la base). Administración queda como bloque
 * único, sin partir por turno.
 */
export function agruparParaNomina(
  areas: AreaBase[],
  operarios: OperarioBase[],
  horariosPorOperario: Map<string, HorarioBase[]>,
  saldoPorOperario: Map<string, number>,
  minutosTardanzaPorOperario: Map<string, number>,
): AreaNomina[] {
  // `operarios` ya viene filtrado por RLS a lo que la sesión actual puede
  // ver — un área sin nadie ahí (porque no hay personal, o porque un
  // Supervisor no tiene esa área asignada) no debe mostrar ni su
  // encabezado, para no ensuciar la vista con secciones vacías.
  return areas
    .filter((area) => operarios.some((o) => o.area_id === area.id))
    .map((area) => {
      const personasDelArea = operarios.filter((o) => o.area_id === area.id);
      const esAdmin = esAdministracion(area.nombre);

      const bloqueManana: PersonaNomina[] = [];
      const bloqueTarde: PersonaNomina[] = [];
      const bloqueUnico: PersonaNomina[] = [];
      const sinHorario: PersonaNomina[] = [];

      for (const operario of personasDelArea) {
        const horarios = horariosPorOperario.get(operario.id) ?? [];
        const saldo = saldoPorOperario.get(operario.id) ?? 0;
        const minutosTardanza =
          minutosTardanzaPorOperario.get(operario.id) ?? 0;

        if (horarios.length === 0) {
          sinHorario.push({
            id: operario.id,
            nombre: operario.nombre,
            saldo,
            minutosTardanza,
            dias: [],
          });
          continue;
        }

        const turnoPorDia = new Map<number, Turno>();
        for (const h of horarios) {
          turnoPorDia.set(h.dia_semana, calcularTurno(h.hora_inicio));
        }
        const turnosPresentes = new Set(turnoPorDia.values());

        const armarDias = (turnoDelBloque: Turno | null): DiaCelda[] =>
          [1, 2, 3, 4, 5, 6, 7].map((dia) => {
            const h = horarios.find((x) => x.dia_semana === dia);
            if (!h) return { diaSemana: dia, estado: "franco" };
            const turnoDelDia = calcularTurno(h.hora_inicio);
            if (turnoDelBloque === null || turnoDelDia === turnoDelBloque) {
              return {
                diaSemana: dia,
                estado: "horario",
                horaInicio: h.hora_inicio,
                horaFin: h.hora_fin,
              };
            }
            return { diaSemana: dia, estado: "otro" };
          });

        if (esAdmin) {
          bloqueUnico.push({
            id: operario.id,
            nombre: operario.nombre,
            saldo,
            minutosTardanza,
            dias: armarDias(null),
          });
          continue;
        }

        if (turnosPresentes.has("manana")) {
          bloqueManana.push({
            id: operario.id,
            nombre: operario.nombre,
            saldo,
            minutosTardanza,
            dias: armarDias("manana"),
          });
        }
        if (turnosPresentes.has("tarde")) {
          bloqueTarde.push({
            id: operario.id,
            nombre: operario.nombre,
            saldo,
            minutosTardanza,
            dias: armarDias("tarde"),
          });
        }
      }

      const bloques: BloqueTurno[] = esAdmin
        ? [{ turno: null, personas: bloqueUnico }]
        : [
            { turno: "manana", personas: bloqueManana },
            { turno: "tarde", personas: bloqueTarde },
          ];

      return {
        areaId: area.id,
        areaNombre: area.nombre,
        esAdministracion: esAdmin,
        bloques,
        sinHorario,
      };
    });
}

export type FiltroNomina = "negativo" | "positivo" | "alertas" | undefined;

/**
 * Filtra la nómina ya agrupada para las tarjetas del dashboard que "navegan
 * ya filtradas" (spec sección 6.2). Filtra las hojas (personas), conserva
 * la estructura de área/turno y descarta bloques que queden vacíos.
 */
export function filtrarNomina(
  areas: AreaNomina[],
  filtro: FiltroNomina,
): AreaNomina[] {
  if (!filtro) return areas;

  const cumple = (p: PersonaNomina) => {
    if (filtro === "negativo") return p.saldo < 0;
    if (filtro === "positivo") return p.saldo > 0;
    return p.saldo < 0 || p.saldo >= UMBRAL_SALDO_ALTO;
  };

  return areas
    .map((area) => ({
      ...area,
      bloques: area.bloques.map((b) => ({
        ...b,
        personas: b.personas.filter(cumple),
      })),
      sinHorario: area.sinHorario.filter(cumple),
    }))
    .filter(
      (area) =>
        area.bloques.some((b) => b.personas.length > 0) ||
        area.sinHorario.length > 0,
    );
}

function normalizar(texto: string): string {
  // Sin tildes ni mayúsculas, así "jose" encuentra a "José".
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Buscador por nombre en la Nómina (pedido explícito del usuario — no
 * documentado en el spec original, pero necesario con 39+ personas). Client
 * side, sobre la nómina ya cargada — no pega contra la base por cada
 * letra tipeada.
 */
export function filtrarPorNombre(
  areas: AreaNomina[],
  busqueda: string,
): AreaNomina[] {
  const termino = normalizar(busqueda.trim());
  if (!termino) return areas;

  const cumple = (p: PersonaNomina) => normalizar(p.nombre).includes(termino);

  return areas
    .map((area) => ({
      ...area,
      bloques: area.bloques.map((b) => ({
        ...b,
        personas: b.personas.filter(cumple),
      })),
      sinHorario: area.sinHorario.filter(cumple),
    }))
    .filter(
      (area) =>
        area.bloques.some((b) => b.personas.length > 0) ||
        area.sinHorario.length > 0,
    );
}
