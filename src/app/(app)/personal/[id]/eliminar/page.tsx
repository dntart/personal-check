import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { obtenerSesion } from "@/lib/supabase/sesion";
import { createClient } from "@/lib/supabase/server";
import { EliminarForm } from "./EliminarForm";

export default async function EliminarPersonalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");
  if (sesion.tipo !== "admin") redirect("/");

  const supabase = await createClient();
  const { data: operario } = await supabase
    .from("operarios")
    .select("id, nombre")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!operario) notFound();

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col p-6">
      <Link href={`/personal/${id}`} className="mb-4 text-sm text-acento">
        ← Volver a la ficha
      </Link>
      <h1 className="mb-6 text-lg font-semibold">Eliminar personal</h1>
      <EliminarForm operarioId={id} nombre={operario.nombre} />
    </div>
  );
}
