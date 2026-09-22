import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { obtenerSesion } from "@/lib/supabase/sesion";
import { obtenerFichaPersonal } from "@/lib/personal/data";
import {
  DIAS_SEMANA,
  formatearHora,
  formatearFecha,
} from "@/lib/personal/reglas";

export default async function FichaPersonalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");

  const ficha = await obtenerFichaPersonal(id);
  if (!ficha) notFound();

  const { operario, horarios, movimientos, saldo, minutosTardanza } = ficha;
  const area = (operario as unknown as { areas: { nombre: string } | null })
    .areas;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col p-6">
      <Link href="/nomina" className="mb-4 text-sm text-acento">
        ← Volver a la nómina
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-borde pb-4">
        <div>
          <h1 className="text-lg font-semibold">{operario.nombre}</h1>
          <p className="text-sm opacity-70">{area?.nombre ?? "Sin área"}</p>
        </div>
        <div className="text-right">
          <p className="text-xs opacity-60">Saldo</p>
          <p
            className={`font-mono text-2xl font-semibold ${
              saldo < 0 ? "text-negativo" : "text-positivo"
            }`}
          >
            {saldo > 0 ? "+" : ""}
            {saldo} días
          </p>
          {minutosTardanza > 0 && (
            <p className="text-xs opacity-60">
              {minutosTardanza} min de tardanza acumulados
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href={`/personal/${id}/novedad`}
          className="rounded-sm bg-acento px-4 py-2 text-sm font-medium text-white"
        >
          Cargar novedad
        </Link>
        <Link
          href={`/personal/${id}/editar`}
          className="rounded-sm border border-borde px-4 py-2 text-sm hover:bg-papel"
        >
          Editar datos
        </Link>
        <Link
          href={`/personal/${id}/horario`}
          className="rounded-sm border border-borde px-4 py-2 text-sm hover:bg-papel"
        >
          Editar horario
        </Link>
        {sesion.tipo === "admin" && sesion.rol === "admin" && (
          <Link
            href={`/personal/${id}/eliminar`}
            className="rounded-sm border border-negativo px-4 py-2 text-sm text-negativo hover:bg-negativo/10"
          >
            Eliminar personal
          </Link>
        )}
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide opacity-60">
          Horario semanal
        </h2>
        {horarios.length === 0 ? (
          <p className="text-sm opacity-70">Sin horario asignado todavía.</p>
        ) : (
          <div className="flex flex-col gap-1 font-mono text-sm">
            {DIAS_SEMANA.map((dia) => {
              const h = horarios.find((x) => x.dia_semana === dia.valor);
              return (
                <div
                  key={dia.valor}
                  className="flex justify-between border-b border-borde/50 py-1"
                >
                  <span className="font-sans">{dia.nombre}</span>
                  <span className={h ? "" : "opacity-50"}>
                    {h
                      ? `${formatearHora(h.hora_inicio)} a ${formatearHora(h.hora_fin)}`
                      : "Franco"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide opacity-60">
          Novedades
        </h2>
        {movimientos.length === 0 ? (
          <p className="text-sm opacity-70">
            Todavía no hay novedades cargadas.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {movimientos.map((m) => {
              const tipo = m.tipos_movimiento as unknown as {
                nombre: string;
                unidad: "dias" | "minutos";
                impacto: "suma" | "resta" | "neutro";
              } | null;
              const admin = m.admins as unknown as { nombre: string } | null;
              return (
                <li
                  key={m.id}
                  className="rounded-sm border border-borde p-3 text-sm"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium">{tipo?.nombre}</span>
                    <span className="font-mono opacity-70">
                      {formatearFecha(m.fecha)}
                    </span>
                  </div>
                  <p className="mt-1 font-mono">
                    {m.cantidad} {tipo?.unidad === "minutos" ? "min" : "días"}
                  </p>
                  <p className="mt-1 text-xs opacity-60">
                    Cargado por {admin?.nombre ?? "—"}
                  </p>
                  {m.observaciones && (
                    <p className="mt-1 whitespace-pre-wrap opacity-80">
                      {m.observaciones}
                    </p>
                  )}
                  {m.adjunto_url && (
                    <a
                      href={m.adjunto_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 mr-3 inline-block text-xs text-acento underline"
                    >
                      Ver adjunto
                    </a>
                  )}
                  <Link
                    href={`/personal/${id}/novedad/${m.id}/editar`}
                    className="mt-1 inline-block text-xs text-acento underline transition-opacity hover:opacity-70"
                  >
                    Corregir
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
