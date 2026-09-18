"use client";

import { useState } from "react";
import { obtenerDatosInformeAction } from "@/app/(app)/informes/actions";
import {
  generarPdf,
  generarExcel,
  formatearCantidad,
  celdaResumen,
  NOMBRE_MES,
} from "@/lib/personal/generar-informe";
import { formatearFecha } from "@/lib/personal/reglas";
import type {
  DatosInforme,
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
  // La vista previa ES la confirmación: no se descarga nada hasta que el
  // admin vea exactamente qué va a bajar y toque un botón de descarga
  // aparte. Cualquier cambio de filtro invalida la preview (queda null) —
  // así nunca se puede descargar algo que no coincide con lo que se vio.
  const [preview, setPreview] = useState<DatosInforme | null>(null);
  const [cargandoPreview, setCargandoPreview] = useState(false);
  const [generando, setGenerando] = useState<"pdf" | "excel" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const meses = ultimos12Meses();
  const { mes, anio, label: labelMes } = meses[mesElegido];

  function invalidarPreview() {
    setPreview(null);
    setError(null);
  }

  function toggleCodigo(codigo: string) {
    invalidarPreview();
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

  async function verPreview() {
    const params = armarParametros();
    if (!params) {
      setError("Elegí al menos un tipo de novedad.");
      return;
    }
    setError(null);
    setCargandoPreview(true);
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
      setPreview(datos);
    } catch {
      setError("No se pudo generar la vista previa.");
    } finally {
      setCargandoPreview(false);
    }
  }

  async function descargar(formato: "pdf" | "excel") {
    if (!preview) return;
    setGenerando(formato);
    setError(null);
    try {
      if (formato === "pdf") {
        await generarPdf(preview, organizacionNombre);
      } else {
        await generarExcel(preview, organizacionNombre);
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
    <div className="flex flex-col gap-3 rounded-sm border border-borde p-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={mesElegido}
          onChange={(e) => {
            setMesElegido(Number(e.target.value));
            invalidarPreview();
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
              invalidarPreview();
            }}
            className={`px-3 py-1 ${modo === "agregado" ? "bg-acento text-white" : "hover:bg-papel"}`}
          >
            Agregado
          </button>
          <button
            type="button"
            onClick={() => {
              setModo("especifico");
              invalidarPreview();
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
            invalidarPreview();
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
                  invalidarPreview();
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
            invalidarPreview();
          }}
        />
        Incluir resumen acumulado histórico al final
      </label>

      <button
        type="button"
        onClick={verPreview}
        disabled={cargandoPreview}
        className="self-start rounded-sm bg-acento px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {cargandoPreview ? "Generando vista previa…" : "Ver vista previa"}
      </button>

      {error && <p className="text-xs text-negativo">{error}</p>}

      {preview && (
        <div className="flex flex-col gap-3 border-t border-borde pt-3">
          <p className="text-sm">
            <strong>{labelMes}</strong> — {preview.filtroLabel} —{" "}
            {preview.movimientos.length}{" "}
            {preview.movimientos.length === 1 ? "novedad" : "novedades"}
          </p>

          {preview.movimientos.length === 0 ? (
            <p className="text-sm opacity-70">
              No hay novedades que coincidan con este filtro.
            </p>
          ) : (
            <div className="max-h-80 overflow-auto rounded-sm border border-borde">
              <table className="w-full min-w-[520px] border-collapse text-sm">
                <thead className="sticky top-0 bg-papel">
                  <tr className="border-b border-borde">
                    <th className="px-2 py-1.5 text-left font-medium">Fecha</th>
                    <th className="px-2 py-1.5 text-left font-medium">
                      Persona
                    </th>
                    <th className="px-2 py-1.5 text-left font-medium">Tipo</th>
                    <th className="px-2 py-1.5 text-right font-medium">
                      Cantidad
                    </th>
                    <th className="px-2 py-1.5 text-left font-medium">
                      Observaciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {preview.movimientos.map((m) => (
                    <tr
                      key={m.id}
                      className="border-b border-borde/50 last:border-0"
                    >
                      <td className="px-2 py-1.5 font-mono whitespace-nowrap">
                        {formatearFecha(m.fecha)}
                      </td>
                      <td className="px-2 py-1.5">{m.operarioNombre}</td>
                      <td className="px-2 py-1.5">{m.tipoNombre}</td>
                      <td className="px-2 py-1.5 text-right font-mono whitespace-nowrap">
                        {formatearCantidad(m.cantidad, m.tipoUnidad)}
                      </td>
                      <td className="px-2 py-1.5 opacity-80">
                        {m.observaciones ?? ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {preview.resumen && (
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-60">
                Resumen (histórico acumulado)
              </h3>
              <div className="max-h-60 overflow-auto rounded-sm border border-borde">
                <table className="w-full min-w-[360px] border-collapse text-sm">
                  <thead className="sticky top-0 bg-papel">
                    <tr className="border-b border-borde">
                      <th className="px-2 py-1.5 text-left font-medium">
                        Persona
                      </th>
                      <th className="px-2 py-1.5 text-right font-medium">
                        Total días
                      </th>
                      <th className="px-2 py-1.5 text-right font-medium">
                        Total minutos
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.resumen.map((r) => (
                      <tr
                        key={r.operarioId}
                        className="border-b border-borde/50 last:border-0"
                      >
                        <td className="px-2 py-1.5">{r.nombre}</td>
                        <td className="px-2 py-1.5 text-right font-mono">
                          {celdaResumen(r.totalDias, "dias")}
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono">
                          {celdaResumen(r.totalMinutos, "minutos")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => descargar("pdf")}
              disabled={generando !== null}
              className="rounded-sm bg-acento px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {generando === "pdf" ? "Generando…" : "Descargar PDF"}
            </button>
            <button
              type="button"
              onClick={() => descargar("excel")}
              disabled={generando !== null}
              className="rounded-sm border border-borde px-3 py-1.5 text-sm hover:bg-papel disabled:opacity-60"
            >
              {generando === "excel" ? "Generando…" : "Descargar Excel"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
