import Link from "next/link";
import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/supabase/sesion";
import {
  obtenerEstadisticasDashboard,
  obtenerUltimasNovedades,
  obtenerOperariosActivos,
} from "@/lib/personal/data";
import { PanelInformesYNovedades } from "@/components/PanelInformesYNovedades";

const FORMATO_FECHA = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "long",
});

export default async function DashboardPage() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");
  if (sesion.tipo === "super_admin") redirect("/super-admin");

  const [stats, novedades, operarios] =
    sesion.tipo === "admin"
      ? await Promise.all([
          obtenerEstadisticasDashboard(),
          obtenerUltimasNovedades(),
          obtenerOperariosActivos(),
        ])
      : [null, [], []];

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
            href={
              sesion.rol === "admin"
                ? "/auditoria?entidad=movimiento"
                : "/nomina"
            }
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
        <PanelInformesYNovedades
          organizacionNombre={sesion.organizacionNombre}
          operarios={operarios}
          novedades={novedades}
        />
      )}
    </div>
  );
}
