import { redirect } from "next/navigation";
import Link from "next/link";
import { obtenerSesion } from "@/lib/supabase/sesion";
import { obtenerAreas } from "@/lib/personal/data";
import { obtenerSupervisores } from "@/lib/personal/supervisores";
import { InvitarSupervisorForm } from "./InvitarSupervisorForm";
import { EliminarSupervisorButton } from "./EliminarSupervisorButton";

export default async function SupervisoresPage() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");
  if (sesion.tipo !== "admin" || sesion.rol !== "admin") redirect("/");

  const [areas, supervisores] = await Promise.all([
    obtenerAreas(),
    obtenerSupervisores(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col p-6">
      <Link href="/" className="mb-4 text-sm text-acento">
        ← Dashboard
      </Link>
      <h1 className="mb-1 text-lg font-semibold">Supervisores</h1>
      <p className="mb-6 text-sm opacity-70">
        Un supervisor solo ve las áreas que le asignes acá — nunca toda la
        organización, ni puede invitar a otros.
      </p>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide opacity-60">
          Actuales
        </h2>
        {supervisores.length === 0 ? (
          <p className="text-sm opacity-70">Todavía no invitaste a nadie.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {supervisores.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-borde p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{s.nombre}</p>
                  <p className="opacity-60">{s.email}</p>
                  <p className="mt-1 text-xs opacity-70">
                    {s.areas.length > 0
                      ? s.areas.map((a) => a.nombre).join(", ")
                      : "Sin áreas asignadas"}
                  </p>
                </div>
                <EliminarSupervisorButton
                  supervisorId={s.id}
                  nombre={s.nombre}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide opacity-60">
          Invitar nuevo
        </h2>
        <InvitarSupervisorForm areas={areas} />
      </section>
    </div>
  );
}
