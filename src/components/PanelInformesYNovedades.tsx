"use client";

import { useState } from "react";
import Link from "next/link";
import { InformeDescarga } from "./InformeDescarga";
import { formatearFecha } from "@/lib/personal/reglas";
import type { obtenerUltimasNovedades } from "@/lib/personal/data";

type Novedad = Awaited<ReturnType<typeof obtenerUltimasNovedades>>[number];
type Operario = { id: string; nombre: string };

/**
 * Envuelve el informe descargable + "Últimas novedades cargadas" (a pedido
 * del usuario): con pocos resultados, la vista previa del informe quedaba
 * visualmente "perdida" contra la tabla grande de últimas novedades de más
 * abajo — se confundían. Mientras hay una vista previa mostrándose, esta
 * tabla pasa a segundo plano (atenuada, sin poder tocarla) para que quede
 * clara la jerarquía: el informe es lo que está en foco.
 */
export function PanelInformesYNovedades({
  organizacionNombre,
  operarios,
  novedades,
}: {
  organizacionNombre: string;
  operarios: Operario[];
  novedades: Novedad[];
}) {
  const [previewActivo, setPreviewActivo] = useState(false);

  return (
    <section className="mt-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide opacity-70">
          Últimas novedades cargadas
        </h2>
        <div className="flex flex-wrap gap-2">
          <InformeDescarga
            organizacionNombre={organizacionNombre}
            operarios={operarios}
            onPreviewActivoChange={setPreviewActivo}
          />
          <Link
            href="/nomina"
            className="rounded-sm border border-borde px-3 py-1.5 text-sm hover:bg-papel"
          >
            Ver nómina
          </Link>
        </div>
      </div>

      <div
        className={
          previewActivo
            ? "pointer-events-none opacity-30 transition-opacity"
            : "transition-opacity"
        }
        aria-hidden={previewActivo}
      >
        {previewActivo && (
          <p className="mb-2 text-xs opacity-70">
            En segundo plano mientras hay un informe en pantalla ↑
          </p>
        )}
        {novedades.length === 0 ? (
          <p className="text-sm opacity-70">
            Todavía no hay novedades cargadas.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-sm border border-borde">
            <table className="w-full border-collapse text-sm">
              <tbody>
                {novedades.map((n) => (
                  <tr
                    key={n.id}
                    className="border-b border-borde/50 last:border-0"
                  >
                    <td className="whitespace-nowrap px-3 py-2 font-medium">
                      {n.operarioNombre}
                    </td>
                    <td className="px-3 py-2 opacity-80">
                      {n.tipoNombre}
                      {n.observaciones ? ` — ${n.observaciones}` : ""}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 opacity-60">
                      {n.cargadoPor}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right font-mono opacity-60">
                      {formatearFecha(n.fecha)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
