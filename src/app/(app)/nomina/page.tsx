import Link from "next/link";
import { obtenerSesion } from "@/lib/supabase/sesion";
import { obtenerNomina } from "@/lib/personal/data";
import { DIAS_SEMANA, formatearHora } from "@/lib/personal/reglas";
import { filtrarNomina, type FiltroNomina } from "@/lib/personal/nomina";
import type { PersonaNomina } from "@/lib/personal/nomina";
import type { Turno } from "@/lib/personal/reglas";

function ChipTurno({ turno }: { turno: Turno }) {
  return (
    <span className="ml-2 rounded-sm border border-borde px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide opacity-70">
      {turno === "manana" ? "Mañana" : "Tarde"}
    </span>
  );
}

function FilaPersona({
  persona,
  turnoDelBloque,
}: {
  persona: PersonaNomina;
  turnoDelBloque: Turno | null;
}) {
  // Para Administración (turnoDelBloque null) mostramos el turno calculado
  // de la persona como etiqueta chica en vez de heredar un encabezado de
  // turno (spec sección 6.3) — se infiere del primer día con horario.
  const turnoDeLaFila =
    turnoDelBloque === null ? calcularTurnoDeLaFila(persona) : null;

  return (
    <tr className="group border-b border-borde/50">
      <td className="sticky left-0 z-10 min-w-[140px] bg-inherit px-3 py-2 font-medium group-hover:brightness-95">
        <Link href={`/personal/${persona.id}`} className="hover:underline">
          {persona.nombre}
        </Link>
        {turnoDeLaFila && <ChipTurno turno={turnoDeLaFila} />}
      </td>
      <td
        className={`sticky left-[140px] z-10 min-w-[80px] bg-inherit px-3 py-2 text-right font-mono group-hover:brightness-95 ${
          persona.saldo < 0
            ? "text-negativo"
            : persona.saldo > 0
              ? "text-positivo"
              : ""
        }`}
      >
        {persona.saldo > 0 ? "+" : ""}
        {persona.saldo}
      </td>
      {persona.dias.map((d) => (
        <td
          key={d.diaSemana}
          className="min-w-[90px] px-3 py-2 text-center font-mono text-xs group-hover:brightness-95 sm:text-sm"
          title={
            d.estado === "otro" ? "Ese día trabaja en el otro turno" : undefined
          }
        >
          {d.estado === "horario" && d.horaInicio && d.horaFin ? (
            `${formatearHora(d.horaInicio)}-${formatearHora(d.horaFin)}`
          ) : d.estado === "otro" ? (
            <span className="opacity-50">Otro</span>
          ) : (
            <span className="opacity-40">Franco</span>
          )}
        </td>
      ))}
    </tr>
  );
}

// El bloque único de Administración no separa por turno, pero cada fila
// igual necesita mostrar su turno calculado (spec 6.3). Lo inferimos del
// primer día con horario cargado.
function calcularTurnoDeLaFila(persona: PersonaNomina): Turno | null {
  const diaConHorario = persona.dias.find((d) => d.estado === "horario");
  if (!diaConHorario?.horaInicio) return null;
  return diaConHorario.horaInicio < "13:00:00" ? "manana" : "tarde";
}

function TablaPersonas({
  personas,
  turnoDelBloque,
}: {
  personas: PersonaNomina[];
  turnoDelBloque: Turno | null;
}) {
  if (personas.length === 0) return null;
  return (
    <div className="overflow-x-auto rounded-sm border border-borde">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-borde bg-black/[.03] text-left text-xs uppercase tracking-wide opacity-70">
            <th className="sticky left-0 z-10 min-w-[140px] bg-papel px-3 py-2">
              Nombre
            </th>
            <th className="sticky left-[140px] z-10 min-w-[80px] bg-papel px-3 py-2 text-right">
              Saldo
            </th>
            {DIAS_SEMANA.map((d) => (
              <th key={d.valor} className="min-w-[90px] px-3 py-2 text-center">
                {d.corto}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {personas.map((p) => (
            <FilaPersona
              key={p.id}
              persona={p}
              turnoDelBloque={turnoDelBloque}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

const TITULOS_FILTRO: Record<NonNullable<FiltroNomina>, string> = {
  negativo: "Con saldo negativo",
  positivo: "Con saldo positivo",
  alertas: "Con alertas de saldo",
};

export default async function NominaPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string }>;
}) {
  const sesion = await obtenerSesion();
  const { filtro: filtroRaw } = await searchParams;
  const filtro: FiltroNomina =
    filtroRaw === "negativo" ||
    filtroRaw === "positivo" ||
    filtroRaw === "alertas"
      ? filtroRaw
      : undefined;

  const areasCompletas = await obtenerNomina();
  const areas = filtrarNomina(areasCompletas, filtro);

  return (
    <div className="flex flex-1 flex-col p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Nómina de personal</h1>
          {filtro && (
            <p className="mt-1 text-sm opacity-70">
              Filtrado: {TITULOS_FILTRO[filtro]} —{" "}
              <Link href="/nomina" className="text-acento underline">
                ver todos
              </Link>
            </p>
          )}
        </div>
        {sesion?.tipo === "admin" && (
          <Link
            href="/personal/nueva"
            className="rounded-sm bg-acento px-4 py-2 text-sm font-medium text-white"
          >
            + Agregar personal
          </Link>
        )}
      </div>

      {areas.length === 0 && (
        <p className="text-sm opacity-70">
          {filtro
            ? "Nadie cumple este filtro."
            : "Todavía no hay personal cargado. Empezá agregando a alguien."}
        </p>
      )}

      <div className="flex flex-col gap-8">
        {areas.map((area) => (
          <section key={area.areaId}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide opacity-70">
              {area.areaNombre}
            </h2>

            <div className="flex flex-col gap-4">
              {area.bloques.map((bloque) => {
                if (bloque.personas.length === 0) return null;
                const tinte =
                  bloque.turno === "manana"
                    ? "bg-turno-manana"
                    : bloque.turno === "tarde"
                      ? "bg-turno-tarde"
                      : "";
                return (
                  <div key={bloque.turno ?? "unico"} className={tinte}>
                    {bloque.turno && (
                      <p className="mb-1 px-1 text-xs font-medium opacity-70">
                        {bloque.turno === "manana" ? "Mañana" : "Tarde"}
                      </p>
                    )}
                    <TablaPersonas
                      personas={bloque.personas}
                      turnoDelBloque={bloque.turno}
                    />
                  </div>
                );
              })}

              {area.sinHorario.length > 0 && (
                <div>
                  <p className="mb-1 px-1 text-xs font-medium opacity-70">
                    Sin horario asignado todavía
                  </p>
                  <div className="overflow-x-auto rounded-sm border border-borde">
                    <table className="w-full border-collapse text-sm">
                      <tbody>
                        {area.sinHorario.map((p) => (
                          <tr
                            key={p.id}
                            className="border-b border-borde/50 last:border-0 hover:bg-black/[.03]"
                          >
                            <td className="px-3 py-2 font-medium">
                              <Link
                                href={`/personal/${p.id}`}
                                className="hover:underline"
                              >
                                {p.nombre}
                              </Link>
                            </td>
                            <td
                              className={`px-3 py-2 text-right font-mono ${
                                p.saldo < 0
                                  ? "text-negativo"
                                  : p.saldo > 0
                                    ? "text-positivo"
                                    : ""
                              }`}
                            >
                              {p.saldo > 0 ? "+" : ""}
                              {p.saldo}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
