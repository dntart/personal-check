"use client";

import { useState } from "react";
import { obtenerDatosInformeAction } from "@/app/(app)/informes/actions";
import {
  generarPdf,
  generarExcel,
  NOMBRE_MES,
} from "@/lib/personal/generar-informe";
import type { TipoInforme } from "@/lib/personal/informes";

function ultimos12Meses() {
  const opciones: { mes: number; anio: number; label: string }[] = [];
  const hoy = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    opciones.push({
      mes: d.getMonth() + 1,
      anio: d.getFullYear(),
      label: `${NOMBRE_MES[d.getMonth()]} ${d.getFullYear()}`,
    });
  }
  return opciones;
}

export function InformeDescarga({
  organizacionNombre,
}: {
  organizacionNombre: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [mesElegido, setMesElegido] = useState(0);
  const [tipo, setTipo] = useState<TipoInforme>("general");
  const [generando, setGenerando] = useState<"pdf" | "excel" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const meses = ultimos12Meses();
  const { mes, anio } = meses[mesElegido];

  async function descargar(formato: "pdf" | "excel") {
    setGenerando(formato);
    setError(null);
    try {
      const datos = await obtenerDatosInformeAction(mes, anio, tipo);
      if ("error" in datos) {
        setError(datos.error);
        return;
      }
      if (formato === "pdf") {
        await generarPdf(datos, organizacionNombre);
      } else {
        await generarExcel(datos, organizacionNombre);
      }
    } catch {
      setError("No se pudo generar el archivo.");
    } finally {
      setGenerando(null);
    }
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="rounded-sm border border-borde px-3 py-1.5 text-sm hover:bg-papel"
      >
        Descargar resumen
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-sm border border-borde p-2">
      <select
        value={mesElegido}
        onChange={(e) => setMesElegido(Number(e.target.value))}
        className="rounded-sm border border-borde bg-superficie px-2 py-1 text-sm"
      >
        {meses.map((m, i) => (
          <option key={i} value={i}>
            {m.label}
          </option>
        ))}
      </select>
      <select
        value={tipo}
        onChange={(e) => setTipo(e.target.value as TipoInforme)}
        className="rounded-sm border border-borde bg-superficie px-2 py-1 text-sm"
      >
        <option value="general">General</option>
        <option value="a_favor">Solo días a favor</option>
        <option value="a_descontar">Solo días a descontar</option>
      </select>
      <button
        type="button"
        onClick={() => descargar("pdf")}
        disabled={generando !== null}
        className="rounded-sm bg-acento px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
      >
        {generando === "pdf" ? "Generando…" : "PDF"}
      </button>
      <button
        type="button"
        onClick={() => descargar("excel")}
        disabled={generando !== null}
        className="rounded-sm border border-borde px-3 py-1.5 text-sm disabled:opacity-60"
      >
        {generando === "excel" ? "Generando…" : "Excel"}
      </button>
      <button
        type="button"
        onClick={() => setAbierto(false)}
        className="text-sm opacity-60 hover:opacity-100"
      >
        Cerrar
      </button>
      {error && <p className="w-full text-xs text-negativo">{error}</p>}
    </div>
  );
}
