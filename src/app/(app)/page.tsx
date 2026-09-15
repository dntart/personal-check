import Link from "next/link";
import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/supabase/sesion";
import {
  obtenerEstadisticasDashboard,
  obtenerUltimasNovedades,
} from "@/lib/personal/data";
import { InformeDescarga } from "@/components/InformeDescarga";

const FORMATO_FECHA = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "long",
});

export default async function DashboardPage() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");

  const [stats, novedades] =
    sesion.tipo === "admin"
      ? await Promise.all([
          obtenerEstadisticasDashboard(),
          obtenerUltimasNovedades(),
        ])
      : [null, []];

  return (
    <div className="flex flex-1 flex-col p-4 sm:p-6">
      <h1 className="text-lg font-semibold">Hola, {sesion.nombre}</h1>
      <p className="mt-1 text-sm opacity-70">
        Resumen de hoy, {FORMATO_FECHA.format(new Date())}
      </p>

      {stats && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Link
            href="/nomina"
            className="rounded-sm border border-borde p-4 hover:bg-papel"
          >
            <p className="font-mono text-2xl font-semibold">
              {stats.personalActivo}
            </p>
            <p className="text-xs opacity-70">Personal activo</p>
          </Link>
          <Link
            href="/nomina?filtro=negativo"
            className="rounded-sm border border-borde p-4 hover:bg-papel"
          >
            <p className="font-mono text-2xl font-semibold text-negativo">
              {stats.saldoNegativo}
            </p>
            <p className="text-xs opacity-70">Con saldo negativo</p>
          </Link>
          <Link
            href="/nomina?filtro=positivo"
            className="rounded-sm border border-borde p-4 hover:bg-papel"
          >
            <p className="font-mono text-2xl font-semibold text-positivo">
              {stats.saldoPositivo}
            </p>
            <p className="text-xs opacity-70">Con saldo positivo</p>
          </Link>
          <Link
            href="/auditoria?entidad=movimiento"
            className="rounded-sm border border-borde p-4 hover:bg-papel"
          >
            <p className="font-mono text-2xl font-semibold">
              {stats.novedadesDelMes}
            </p>
            <p className="text-xs opacity-70">Novedades este mes</p>
          </Link>
        </div>
      )}

      {sesion.tipo === "admin" && (
        <section className="mt-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide opacity-70">
              Últimas novedades cargadas
            </h2>
            <div className="flex flex-wrap gap-2">
              <InformeDescarga organizacionNombre={sesion.organizacionNombre} />
              <Link
                href="/nomina"
                className="rounded-sm border border-borde px-3 py-1.5 text-sm hover:bg-papel"
              >
                Ver nómina
              </Link>
            </div>
          </div>

          {novedades.length === 0 ? (
            <p className="text-sm opacity-70">
              Todavía no hay novedades cargadas.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-sm border border-borde">
              <table className="w-full border-collapse text-sm">
                <tbody>
                  {novedades.map((n) => (
                    <tr
                      key={n.id}
                      className="border-b border-borde/50 last:border-0"
                    >
                      <td className="whitespace-nowrap px-3 py-2 font-medium">
                        {n.operarioNombre}
                      </td>
                      <td className="px-3 py-2 opacity-80">
                        {n.tipoNombre}
                        {n.observaciones ? ` — ${n.observaciones}` : ""}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right font-mono opacity-60">
                        {n.fecha}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
