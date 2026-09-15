"use client";

import { useState } from "react";
import { obtenerDatosInformeAction } from "@/app/(app)/informes/actions";
import {
  generarPdf,
  generarExcel,
  NOMBRE_MES,
} from "@/lib/personal/generar-informe";
import type { TipoInforme } from "@/lib/personal/informes";

const TITULO_TIPO: Record<TipoInforme, string> = {
  general: "General",
  a_favor: "Solo días a favor",
  a_descontar: "Solo días a descontar",
};

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
  // Antes de generar de verdad, pide un click de confirmación aparte —
  // así "PDF"/"Excel" no dispara la descarga en el primer click.
  const [pendiente, setPendiente] = useState<"pdf" | "excel" | null>(null);
  const [generando, setGenerando] = useState<"pdf" | "excel" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const meses = ultimos12Meses();
  const { mes, anio, label: labelMes } = meses[mesElegido];

  function elegirFormato(formato: "pdf" | "excel") {
    setError(null);
    setPendiente(formato);
  }

  async function confirmarDescarga() {
    const formato = pendiente;
    if (!formato) return;
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
      setPendiente(null);
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
    <div className="flex flex-col gap-2 rounded-sm border border-borde p-2">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={mesElegido}
          onChange={(e) => {
            setMesElegido(Number(e.target.value));
            setPendiente(null);
          }}
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
          onChange={(e) => {
            setTipo(e.target.value as TipoInforme);
            setPendiente(null);
          }}
          className="rounded-sm border border-borde bg-superficie px-2 py-1 text-sm"
        >
          <option value="general">General</option>
          <option value="a_favor">Solo días a favor</option>
          <option value="a_descontar">Solo días a descontar</option>
        </select>
        <button
          type="button"
          onClick={() => elegirFormato("pdf")}
          disabled={generando !== null}
          className="rounded-sm bg-acento px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
        >
          PDF
        </button>
        <button
          type="button"
          onClick={() => elegirFormato("excel")}
          disabled={generando !== null}
          className="rounded-sm border border-borde px-3 py-1.5 text-sm disabled:opacity-60"
        >
          Excel
        </button>
        <button
          type="button"
          onClick={() => {
            setAbierto(false);
            setPendiente(null);
          }}
          className="text-sm opacity-60 hover:opacity-100"
        >
          Cerrar
        </button>
      </div>

      {pendiente && (
        <div className="flex flex-wrap items-center gap-2 rounded-sm border border-acento bg-turno-manana p-2 text-sm">
          <span>
            Vas a descargar: <strong>{TITULO_TIPO[tipo]}</strong> —{" "}
            <strong>{labelMes}</strong> en{" "}
            <strong>{pendiente === "pdf" ? "PDF" : "Excel"}</strong>
          </span>
          <button
            type="button"
            onClick={confirmarDescarga}
            disabled={generando !== null}
            className="rounded-sm bg-acento px-3 py-1 text-sm font-medium text-white disabled:opacity-60"
          >
            {generando ? "Generando…" : "Confirmar descarga"}
          </button>
          <button
            type="button"
            onClick={() => setPendiente(null)}
            disabled={generando !== null}
            className="rounded-sm border border-borde px-3 py-1 text-sm disabled:opacity-60"
          >
            Cancelar
          </button>
        </div>
      )}

      {error && <p className="text-xs text-negativo">{error}</p>}
    </div>
  );
}
