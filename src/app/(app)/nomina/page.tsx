import Link from "next/link";
import { obtenerSesion } from "@/lib/supabase/sesion";
import { obtenerNomina } from "@/lib/personal/data";
import { filtrarNomina, type FiltroNomina } from "@/lib/personal/nomina";
import { NominaTabla } from "./NominaTabla";

const TITULOS_FILTRO: Record<NonNullable<FiltroNomina>, string> = {
  negativo: "Con saldo negativo",
  positivo: "Con saldo positivo",
  alertas: "Con alertas de saldo",
};

export default async function NominaPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string }>;
}) {
  const sesion = await obtenerSesion();
  const { filtro: filtroRaw } = await searchParams;
  const filtro: FiltroNomina =
    filtroRaw === "negativo" ||
    filtroRaw === "positivo" ||
    filtroRaw === "alertas"
      ? filtroRaw
      : undefined;

  const areasCompletas = await obtenerNomina();
  const areas = filtrarNomina(areasCompletas, filtro);

  return (
    <div className="flex flex-1 flex-col p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Nómina de personal</h1>
          {filtro && (
            <p className="mt-1 text-sm opacity-70">
              Filtrado: {TITULOS_FILTRO[filtro]} —{" "}
              <Link href="/nomina" className="text-acento underline">
                ver todos
              </Link>
            </p>
          )}
        </div>
        {sesion?.tipo === "admin" && (
          <Link
            href="/personal/nueva"
            className="rounded-sm bg-acento px-4 py-2 text-sm font-medium text-white"
          >
            + Agregar personal
          </Link>
        )}
      </div>

      <NominaTabla areas={areas} filtroActivo={filtro !== undefined} />
    </div>
  );
}
