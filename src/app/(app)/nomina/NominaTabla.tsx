"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DIAS_SEMANA, formatearHora } from "@/lib/personal/reglas";
import {
  filtrarPorNombre,
  type AreaNomina,
  type PersonaNomina,
} from "@/lib/personal/nomina";
import type { Turno } from "@/lib/personal/reglas";

function ChipTurno({ turno }: { turno: Turno }) {
  return (
    <span className="ml-2 rounded-sm border border-borde px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide opacity-70">
      {turno === "manana" ? "Mañana" : "Tarde"}
    </span>
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

function FilaPersona({
  persona,
  turnoDelBloque,
}: {
  persona: PersonaNomina;
  turnoDelBloque: Turno | null;
}) {
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

export function NominaTabla({
  areas,
  filtroActivo,
}: {
  areas: AreaNomina[];
  filtroActivo: boolean;
}) {
  const [busqueda, setBusqueda] = useState("");
  const areasFiltradas = useMemo(
    () => filtrarPorNombre(areas, busqueda),
    [areas, busqueda],
  );

  return (
    <div className="flex flex-col gap-6">
      <input
        type="search"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar por nombre…"
        className="w-full max-w-xs rounded-sm border border-borde bg-superficie px-3 py-2 text-sm outline-none focus:border-acento"
      />

      {areasFiltradas.length === 0 && (
        <p className="text-sm opacity-70">
          {busqueda
            ? "Nadie coincide con esa búsqueda."
            : filtroActivo
              ? "Nadie cumple este filtro."
              : "Todavía no hay personal cargado. Empezá agregando a alguien."}
        </p>
      )}

      <div className="flex flex-col gap-8">
        {areasFiltradas.map((area) => (
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
