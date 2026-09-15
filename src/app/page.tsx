import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/supabase/sesion";
import { logout } from "./actions";

export default async function DashboardPage() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");

  return (
    <div className="flex flex-1 flex-col p-6">
      <header className="flex items-center justify-between border-b border-borde pb-4">
        <div>
          <p className="text-sm opacity-70">Hola,</p>
          <h1 className="text-lg font-semibold">{sesion.nombre}</h1>
          <p className="mt-0.5 text-xs opacity-60">
            {sesion.tipo === "super_admin"
              ? "Super Admin — acceso de soporte"
              : sesion.rol === "admin"
                ? "Admin de organización"
                : "Supervisor"}
          </p>
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

      <p className="mt-6 text-sm opacity-70">
        Dashboard todavía no implementado (siguiente paso del roadmap: tarjetas
        de Personal activo / Saldo negativo / Saldo positivo / Novedades del
        mes).
      </p>
    </div>
  );
}
