import { redirect } from "next/navigation";
import Link from "next/link";
import { obtenerSesion } from "@/lib/supabase/sesion";
import { obtenerAreasPermitidas } from "@/lib/personal/data";
import { NuevaPersonaForm } from "./NuevaPersonaForm";

export default async function NuevaPersonaPage() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");
  if (sesion.tipo !== "admin") redirect("/");

  const areas = await obtenerAreasPermitidas(sesion);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col p-6">
      <Link href="/nomina" className="mb-4 text-sm text-acento">
        ← Volver a la nómina
      </Link>
      <h1 className="mb-1 text-lg font-semibold">Agregar personal</h1>
      <p className="mb-6 text-sm opacity-70">
        No hace falta el turno todavía — se calcula solo cuando le cargues el
        horario.
      </p>
      <NuevaPersonaForm areas={areas} puedeCrearArea={sesion.rol === "admin"} />
    </div>
  );
}
