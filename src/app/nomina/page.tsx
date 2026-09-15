import { redirect } from "next/navigation";
import Link from "next/link";
import { obtenerSesion } from "@/lib/supabase/sesion";
import { obtenerNomina } from "@/lib/personal/data";
import { DIAS_SEMANA, formatearHora } from "@/lib/personal/reglas";
import type { PersonaNomina } from "@/lib/personal/nomina";

function FilaPersona({ persona }: { persona: PersonaNomina }) {
  return (
    <tr className="border-b border-borde/50 hover:bg-black/[.02]">
      <td className="sticky left-0 z-10 min-w-[140px] bg-inherit px-3 py-2 font-medium">
        <Link href={`/personal/${persona.id}`} className="hover:underline">
          {persona.nombre}
        </Link>
      </td>
      <td
        className={`sticky left-[140px] z-10 min-w-[80px] bg-inherit px-3 py-2 text-right font-mono ${
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
          className="min-w-[90px] px-3 py-2 text-center font-mono text-xs"
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

function TablaPersonas({ personas }: { personas: PersonaNomina[] }) {
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
            <FilaPersona key={p.id} persona={p} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function NominaPage() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");

  const areas = await obtenerNomina();

  return (
    <div className="flex flex-1 flex-col p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/" className="text-sm text-acento">
            ← Dashboard
          </Link>
          <h1 className="mt-1 text-lg font-semibold">Nómina de personal</h1>
        </div>
        {sesion.tipo === "admin" && (
          <Link
            href="/personal/nueva"
            className="rounded-sm bg-acento px-4 py-2 text-sm font-medium text-white"
          >
            + Agregar personal
          </Link>
        )}
      </div>

      {areas.every(
        (a) =>
          a.bloques.every((b) => b.personas.length === 0) &&
          a.sinHorario.length === 0,
      ) && (
        <p className="text-sm opacity-70">
          Todavía no hay personal cargado. Empezá agregando a alguien.
        </p>
      )}

      <div className="flex flex-col gap-8">
        {areas.map((area) => {
          const vacia =
            area.bloques.every((b) => b.personas.length === 0) &&
            area.sinHorario.length === 0;
          if (vacia) return null;

          return (
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
                      <TablaPersonas personas={bloque.personas} />
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
                              className="border-b border-borde/50 last:border-0 hover:bg-black/[.02]"
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
          );
        })}
      </div>
    </div>
  );
}
