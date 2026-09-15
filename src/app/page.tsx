import Link from "next/link";
import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/supabase/sesion";
import { obtenerEstadisticasDashboard } from "@/lib/personal/data";
import { LogoIcon } from "@/components/Logo";
import { logout } from "./actions";

export default async function DashboardPage() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");

  const stats =
    sesion.tipo === "admin" ? await obtenerEstadisticasDashboard() : null;

  return (
    <div className="flex flex-1 flex-col p-4 sm:p-6">
      <header className="flex items-center justify-between border-b border-borde pb-4">
        <div className="flex items-center gap-3">
          <LogoIcon className="h-9 w-9 shrink-0" />
          <div>
            <p className="text-sm opacity-70">Hola,</p>
            <h1 className="text-lg font-semibold">{sesion.nombre}</h1>
            <p className="mt-0.5 text-xs opacity-60">
              {sesion.tipo === "super_admin"
                ? "Super Admin — acceso de soporte"
                : `${sesion.rol === "admin" ? "Admin de organización" : "Supervisor"} · ${sesion.organizacionNombre}`}
            </p>
          </div>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-sm border border-borde px-3 py-1.5 text-sm hover:bg-papel"
          >
            Cerrar sesión
          </button>
        </form>
      </header>

      {stats && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Link
            href="/nomina"
            className="rounded-sm border border-borde p-4 hover:bg-papel"
          >
            <p className="text-2xl font-semibold font-mono">
              {stats.personalActivo}
            </p>
            <p className="text-xs opacity-70">Personal activo</p>
          </Link>
          <Link
            href="/nomina"
            className="rounded-sm border border-borde p-4 hover:bg-papel"
          >
            <p className="text-2xl font-semibold font-mono text-negativo">
              {stats.saldoNegativo}
            </p>
            <p className="text-xs opacity-70">Saldo negativo</p>
          </Link>
          <Link
            href="/nomina"
            className="rounded-sm border border-borde p-4 hover:bg-papel"
          >
            <p className="text-2xl font-semibold font-mono text-positivo">
              {stats.saldoPositivo}
            </p>
            <p className="text-xs opacity-70">Saldo positivo</p>
          </Link>
          <Link
            href="/nomina"
            className="rounded-sm border border-borde p-4 hover:bg-papel"
          >
            <p className="text-2xl font-semibold font-mono">
              {stats.novedadesDelMes}
            </p>
            <p className="text-xs opacity-70">Novedades del mes</p>
          </Link>
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-2">
        <Link
          href="/nomina"
          className="rounded-sm bg-acento px-4 py-2 text-sm font-medium text-white"
        >
          Ver nómina de personal →
        </Link>
        {sesion.tipo === "admin" && sesion.rol === "admin" && (
          <Link
            href="/supervisores"
            className="rounded-sm border border-borde px-4 py-2 text-sm hover:bg-papel"
          >
            Supervisores
          </Link>
        )}
      </div>
    </div>
  );
}
