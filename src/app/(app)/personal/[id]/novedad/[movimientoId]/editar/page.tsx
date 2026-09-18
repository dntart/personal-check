import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { obtenerSesion } from "@/lib/supabase/sesion";
import { createClient } from "@/lib/supabase/server";
import { obtenerTiposMovimiento } from "@/lib/personal/data";
import { EditarNovedadForm } from "./EditarNovedadForm";

export default async function EditarNovedadPage({
  params,
}: {
  params: Promise<{ id: string; movimientoId: string }>;
}) {
  const { id, movimientoId } = await params;
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");
  if (sesion.tipo !== "admin") redirect("/");

  const supabase = await createClient();
  const [{ data: operario }, { data: movimiento }, tipos] = await Promise.all([
    supabase.from("operarios").select("id, nombre").eq("id", id).maybeSingle(),
    supabase
      .from("movimientos")
      .select(
        "id, tipo_movimiento_id, fecha, cantidad, observaciones, adjunto_url",
      )
      .eq("id", movimientoId)
      .eq("operario_id", id)
      .is("deleted_at", null)
      .maybeSingle(),
    obtenerTiposMovimiento(),
  ]);

  if (!operario || !movimiento) notFound();

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col p-6">
      <Link href={`/personal/${id}`} className="mb-4 text-sm text-acento">
        ← Volver a la ficha
      </Link>
      <h1 className="mb-6 text-lg font-semibold">
        Corregir novedad — {operario.nombre}
      </h1>
      <EditarNovedadForm
        operarioId={id}
        movimientoId={movimientoId}
        tipos={tipos}
        actual={{
          tipoMovimientoId: movimiento.tipo_movimiento_id,
          fecha: movimiento.fecha,
          cantidad: movimiento.cantidad,
          observaciones: movimiento.observaciones,
          adjuntoUrl: movimiento.adjunto_url,
        }}
      />
    </div>
  );
}
