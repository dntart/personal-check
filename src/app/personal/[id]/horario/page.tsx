import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { obtenerSesion } from "@/lib/supabase/sesion";
import { createClient } from "@/lib/supabase/server";
import { HorarioForm } from "./HorarioForm";

export default async function EditarHorarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");
  if (sesion.tipo !== "admin") redirect("/");

  const supabase = await createClient();
  const hoy = new Date().toISOString().slice(0, 10);

  const [{ data: operario }, { data: horarios }] = await Promise.all([
    supabase.from("operarios").select("id, nombre").eq("id", id).maybeSingle(),
    supabase
      .from("horarios_semanales")
      .select("dia_semana, hora_inicio, hora_fin")
      .eq("operario_id", id)
      .is("deleted_at", null)
      .lte("vigente_desde", hoy)
      .or(`vigente_hasta.is.null,vigente_hasta.gte.${hoy}`),
  ]);

  if (!operario) notFound();

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col p-6">
      <Link href={`/personal/${id}`} className="mb-4 text-sm text-acento">
        ← Volver a la ficha
      </Link>
      <h1 className="mb-1 text-lg font-semibold">
        Editar horario — {operario.nombre}
      </h1>
      <p className="mb-6 text-sm opacity-70">
        Guardar genera una nueva versión vigente desde hoy y cierra la anterior
        — el historial no se pierde.
      </p>
      <HorarioForm operarioId={id} horariosActuales={horarios ?? []} />
    </div>
  );
}
