import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/supabase/sesion";
import { obtenerOrganizaciones } from "@/lib/personal/super-admin";
import { alternarOrganizacionActiva } from "./actions";
import { InvitarOrganizacionForm } from "./InvitarOrganizacionForm";

const FORMATO_FECHA = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export default async function SuperAdminPage() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");
  if (sesion.tipo !== "super_admin") redirect("/");

  const organizaciones = await obtenerOrganizaciones();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col p-6">
      <h1 className="mb-1 text-lg font-semibold">Organizaciones</h1>
      <p className="mb-6 text-sm opacity-70">
        Alta de clientes nuevos, y suspender/reactivar acceso — nunca borra
        datos.
      </p>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide opacity-60">
          Clientes
        </h2>
        {organizaciones.length === 0 ? (
          <p className="text-sm opacity-70">Todavía no hay organizaciones.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {organizaciones.map((org) => (
              <li
                key={org.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-borde p-3 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {org.nombre}{" "}
                    {!org.activo && (
                      <span className="rounded-sm bg-negativo/10 px-1.5 py-0.5 text-xs text-negativo">
                        Suspendida
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs opacity-60">
                    {org.admins.length > 0
                      ? org.admins
                          .map((a) => `${a.nombre} (${a.rol})`)
                          .join(", ")
                      : "Sin admins todavía"}
                  </p>
                  <p className="mt-0.5 text-xs opacity-50">
                    Creada el {FORMATO_FECHA.format(new Date(org.createdAt))}
                  </p>
                </div>
                <form
                  action={alternarOrganizacionActiva.bind(
                    null,
                    org.id,
                    !org.activo,
                  )}
                >
                  <button
                    type="submit"
                    className={`rounded-sm border px-3 py-1.5 text-xs ${
                      org.activo
                        ? "border-negativo text-negativo hover:bg-negativo/10"
                        : "border-positivo text-positivo hover:bg-positivo/10"
                    }`}
                  >
                    {org.activo ? "Suspender" : "Reactivar"}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide opacity-60">
          Nueva organización
        </h2>
        <InvitarOrganizacionForm />
      </section>
    </div>
  );
}
