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
  if (sesion.tipo !== "admin") redirect("/");

  const supabase = await createClient();
  const [{ data: operario }, { data: movimiento }] = await Promise.all([
    supabase.from("operarios").select("id, nombre").eq("id", id).maybeSingle(),
    supabase
      .from("movimientos")
      .select("id, admin_id, fecha, tipos_movimiento(nombre)")
      .eq("id", movimientoId)
      .eq("operario_id", id)
      .is("deleted_at", null)
      .maybeSingle(),
  ]);

  if (!operario || !movimiento) notFound();

  // CORREGIDO 2026-10-01: un Supervisor solo puede eliminar sus propias
  // novedades, no las de un compañero — "el único con la potestad de [tocar
  // la de otro] debe ser el administrador" (ver actions.ts de esta ruta).
  if (sesion.rol !== "admin" && movimiento.admin_id !== sesion.id) {
    redirect(`/personal/${id}`);
  }

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
