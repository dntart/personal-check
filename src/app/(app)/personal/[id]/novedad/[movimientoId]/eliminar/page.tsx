import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { obtenerSesion } from "@/lib/supabase/sesion";
import { createClient } from "@/lib/supabase/server";
import { formatearFecha } from "@/lib/personal/reglas";
import { EliminarNovedadForm } from "./EliminarNovedadForm";

export default async function EliminarNovedadPage({
  params,
}: {
  params: Promise<{ id: string; movimientoId: string }>;
}) {
  const { id, movimientoId } = await params;
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");
  // Solo el Admin de Organización puede eliminar una novedad, no un
  // Supervisor — mismo criterio que "Eliminar personal" (2026-09-18).
  if (sesion.tipo !== "admin" || sesion.rol !== "admin") redirect("/");

  const supabase = await createClient();
  const [{ data: operario }, { data: movimiento }] = await Promise.all([
    supabase.from("operarios").select("id, nombre").eq("id", id).maybeSingle(),
    supabase
      .from("movimientos")
      .select("id, fecha, tipos_movimiento(nombre)")
      .eq("id", movimientoId)
      .eq("operario_id", id)
      .is("deleted_at", null)
      .maybeSingle(),
  ]);

  if (!operario || !movimiento) notFound();

  const tipo = movimiento.tipos_movimiento as unknown as {
    nombre: string;
  } | null;

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col p-6">
      <Link href={`/personal/${id}`} className="mb-4 text-sm text-acento">
        ← Volver a la ficha
      </Link>
      <h1 className="mb-6 text-lg font-semibold">
        Eliminar novedad — {operario.nombre}
      </h1>
      <EliminarNovedadForm
        operarioId={id}
        movimientoId={movimientoId}
        tipoNombre={tipo?.nombre ?? "esta novedad"}
        fecha={formatearFecha(movimiento.fecha)}
      />
    </div>
  );
}
