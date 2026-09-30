"use client";

import { useActionState, useState } from "react";
import { cargarNovedad, type EstadoNovedad } from "./actions";
import {
  OPCIONES_BLOQUE_30,
  formatearMinutosComoHoras,
} from "@/lib/personal/reglas";

type Tipo = {
  id: string;
  codigo: string;
  nombre: string;
  unidad: string;
  requiere_adjunto: boolean;
};

export function NovedadForm({
  operarioId,
  tipos,
}: {
  operarioId: string;
  tipos: Tipo[];
}) {
  const accionConId = cargarNovedad.bind(null, operarioId);
  const [estado, formAction, enviando] = useActionState<
    EstadoNovedad,
    FormData
  >(accionConId, null);

  const [tipoId, setTipoId] = useState(tipos[0]?.id ?? "");
  const tipoSeleccionado = tipos.find((t) => t.id === tipoId);
  // Todo tipo en minutos, sin excepción, se carga en horas por desplegable
  // (2026-09-30, a pedido de Dante) — no hay ningún tipo del catálogo en
  // minutos que se cargue distinto, así que alcanza con mirar la unidad.
  const esMinutos = tipoSeleccionado?.unidad === "minutos";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="tipoMovimientoId" className="text-sm font-medium">
          Tipo de novedad
        </label>
        <select
          id="tipoMovimientoId"
          name="tipoMovimientoId"
          value={tipoId}
          onChange={(e) => setTipoId(e.target.value)}
          className="rounded-sm border border-borde bg-superficie px-3 py-2 text-sm outline-none focus:border-acento"
        >
          {tipos.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="fecha" className="text-sm font-medium">
          Fecha
        </label>
        <input
          id="fecha"
          name="fecha"
          type="date"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
          className="rounded-sm border border-borde bg-superficie px-3 py-2 text-sm font-mono outline-none focus:border-acento"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="cantidad" className="text-sm font-medium">
          {esMinutos
            ? `Horas de ${tipoSeleccionado?.nombre.toLowerCase()}`
            : "Cantidad (± días)"}
        </label>
        {esMinutos ? (
          <select
            key={tipoId}
            id="cantidad"
            name="cantidad"
            required
            defaultValue={30}
            className="rounded-sm border border-borde bg-superficie px-3 py-2 text-sm font-mono outline-none focus:border-acento"
          >
            {OPCIONES_BLOQUE_30.map((min) => (
              <option key={min} value={min}>
                {formatearMinutosComoHoras(min)}
              </option>
            ))}
          </select>
        ) : (
          <input
            key={tipoId}
            id="cantidad"
            name="cantidad"
            type="number"
            step={0.5}
            required
            defaultValue={1}
            className="rounded-sm border border-borde bg-superficie px-3 py-2 text-sm font-mono outline-none focus:border-acento"
          />
        )}
        {!esMinutos && tipoSeleccionado?.nombre === "Ajuste manual" && (
          <p className="text-xs opacity-60">
            Podés cargar un número negativo para que reste del saldo.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="observaciones" className="text-sm font-medium">
          Observaciones
        </label>
        <textarea
          id="observaciones"
          name="observaciones"
          rows={4}
          className="rounded-sm border border-borde bg-superficie px-3 py-2 text-sm outline-none focus:border-acento"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="adjuntoUrl" className="text-sm font-medium">
          Adjunto (link a la foto)
        </label>
        <input
          id="adjuntoUrl"
          name="adjuntoUrl"
          type="url"
          placeholder="https://..."
          className="rounded-sm border border-borde bg-superficie px-3 py-2 text-sm outline-none focus:border-acento"
        />
        <p className="text-xs opacity-60">
          {tipoSeleccionado?.requiere_adjunto
            ? "Por ahora es opcional (todavía no hay dónde guardar fotos) — se va a pedir de vuelta cuando esté disponible."
            : "El upload directo de la foto todavía no está implementado — por ahora,"}{" "}
          {!tipoSeleccionado?.requiere_adjunto &&
            "subila a otro lado (Drive, WhatsApp Web, etc.) y pegá el link acá."}
        </p>
      </div>

      {estado?.error && (
        <p
          role="alert"
          className="rounded-sm border border-negativo bg-negativo/10 px-3 py-2 text-sm text-negativo"
        >
          {estado.error}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="mt-2 rounded-sm bg-acento px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {enviando ? "Guardando…" : "Cargar novedad"}
      </button>
    </form>
  );
}
