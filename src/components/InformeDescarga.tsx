"use client";

import { useState } from "react";
import { obtenerDatosInformeAction } from "@/app/(app)/informes/actions";
import {
  generarPdf,
  generarExcel,
  NOMBRE_MES,
} from "@/lib/personal/generar-informe";
import type {
  FiltroAgregado,
  ParametrosInforme,
} from "@/lib/personal/informes";

const AGREGADOS: { valor: FiltroAgregado; label: string }[] = [
  { valor: "general", label: "General (todas las novedades)" },
  { valor: "a_favor", label: "Solo días a favor" },
  { valor: "a_descontar", label: "Solo días a descontar" },
];

// Catálogo fijo de novedades (spec sección 5) — todo menos "Ajuste manual",
// que no es una novedad de personal sino una corrección administrativa.
const TIPOS_ESPECIFICOS: { codigo: string; label: string }[] = [
  { codigo: "compensado_tomado", label: "Día compensado tomado" },
  { codigo: "extra_trabajado", label: "Día/hora extra trabajado" },
  { codigo: "falta_injustificada", label: "Falta injustificada" },
  { codigo: "falta_justificada", label: "Falta justificada" },
  { codigo: "tardanza_injustificada", label: "Tardanza injustificada" },
  { codigo: "tardanza_justificada", label: "Tardanza justificada" },
  {
    codigo: "salida_anticipada_injustificada",
    label: "Salida anticipada injustificada",
  },
  {
    codigo: "salida_anticipada_justificada",
    label: "Salida anticipada justificada",
  },
  { codigo: "licencia_anual_ordinaria", label: "Licencia Anual Ordinaria" },
];

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
  const [modo, setModo] = useState<"agregado" | "especifico">("agregado");
  const [agregado, setAgregado] = useState<FiltroAgregado>("general");
  const [codigosElegidos, setCodigosElegidos] = useState<Set<string>>(
    new Set(),
  );
  const [incluirResumen, setIncluirResumen] = useState(false);
  const [pendiente, setPendiente] = useState<"pdf" | "excel" | null>(null);
  const [generando, setGenerando] = useState<"pdf" | "excel" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const meses = ultimos12Meses();
  const { mes, anio, label: labelMes } = meses[mesElegido];

  function toggleCodigo(codigo: string) {
    setPendiente(null);
    setCodigosElegidos((prev) => {
      const next = new Set(prev);
      if (next.has(codigo)) next.delete(codigo);
      else next.add(codigo);
      return next;
    });
  }

  function armarParametros(): ParametrosInforme | null {
    if (modo === "agregado") return { modo: "agregado", agregado };
    if (codigosElegidos.size === 0) return null;
    return { modo: "especifico", codigos: [...codigosElegidos] };
  }

  function elegirFormato(formato: "pdf" | "excel") {
    if (!armarParametros()) {
      setError("Elegí al menos un tipo de novedad.");
      return;
    }
    setError(null);
    setPendiente(formato);
  }

  async function confirmarDescarga() {
    const formato = pendiente;
    const params = armarParametros();
    if (!formato || !params) return;
    setGenerando(formato);
    setError(null);
    try {
      const datos = await obtenerDatosInformeAction(
        mes,
        anio,
        params,
        incluirResumen,
      );
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
    <div className="flex flex-col gap-3 rounded-sm border border-borde p-3">
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

        <div className="flex overflow-hidden rounded-sm border border-borde text-sm">
          <button
            type="button"
            onClick={() => {
              setModo("agregado");
              setPendiente(null);
            }}
            className={`px-3 py-1 ${modo === "agregado" ? "bg-acento text-white" : "hover:bg-papel"}`}
          >
            Agregado
          </button>
          <button
            type="button"
            onClick={() => {
              setModo("especifico");
              setPendiente(null);
            }}
            className={`px-3 py-1 ${modo === "especifico" ? "bg-acento text-white" : "hover:bg-papel"}`}
          >
            Tipos específicos
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            setAbierto(false);
            setPendiente(null);
          }}
          className="ml-auto text-sm opacity-60 hover:opacity-100"
        >
          Cerrar
        </button>
      </div>

      {modo === "agregado" ? (
        <div className="flex flex-wrap gap-3 text-sm">
          {AGREGADOS.map((o) => (
            <label key={o.valor} className="flex items-center gap-1.5">
              <input
                type="radio"
                name="agregado"
                checked={agregado === o.valor}
                onChange={() => {
                  setAgregado(o.valor);
                  setPendiente(null);
                }}
              />
              {o.label}
            </label>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-2">
          {TIPOS_ESPECIFICOS.map((o) => (
            <label key={o.codigo} className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={codigosElegidos.has(o.codigo)}
                onChange={() => toggleCodigo(o.codigo)}
              />
              {o.label}
            </label>
          ))}
        </div>
      )}

      <label className="flex items-center gap-1.5 border-t border-borde pt-2 text-sm">
        <input
          type="checkbox"
          checked={incluirResumen}
          onChange={(e) => {
            setIncluirResumen(e.target.checked);
            setPendiente(null);
          }}
        />
        Incluir resumen acumulado histórico al final
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => elegirFormato("pdf")}
          disabled={generando !== null}
          className="rounded-sm bg-acento px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          PDF
        </button>
        <button
          type="button"
          onClick={() => elegirFormato("excel")}
          disabled={generando !== null}
          className="rounded-sm border border-borde px-3 py-1.5 text-sm hover:bg-papel disabled:opacity-60"
        >
          Excel
        </button>
      </div>

      {pendiente && (
        <div className="flex flex-wrap items-center gap-2 rounded-sm border border-acento bg-turno-manana p-2 text-sm">
          <span>
            Vas a descargar: <strong>{labelMes}</strong>
            {incluirResumen ? " (con resumen)" : ""} en{" "}
            <strong>{pendiente === "pdf" ? "PDF" : "Excel"}</strong>
          </span>
          <button
            type="button"
            onClick={confirmarDescarga}
            disabled={generando !== null}
            className="rounded-sm bg-acento px-3 py-1 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {generando ? "Generando…" : "Confirmar descarga"}
          </button>
          <button
            type="button"
            onClick={() => setPendiente(null)}
            disabled={generando !== null}
            className="rounded-sm border border-borde px-3 py-1 text-sm hover:bg-papel disabled:opacity-60"
          >
            Cancelar
          </button>
        </div>
      )}

      {error && <p className="text-xs text-negativo">{error}</p>}
    </div>
  );
}
