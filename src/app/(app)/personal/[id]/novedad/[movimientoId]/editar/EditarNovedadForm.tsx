"use client";

import { useActionState, useState } from "react";
import { editarNovedad, type EstadoEditarNovedad } from "./actions";
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

type MovimientoActual = {
  tipoMovimientoId: string;
  fecha: string;
  cantidad: number;
  observaciones: string | null;
  adjuntoUrl: string | null;
};

function defaultDeCantidad(esMinutos: boolean) {
  return esMinutos ? 30 : 1;
}

/** Por si ya había una cantidad cargada que no es múltiplo de 30 (dato
 * viejo, de antes de este fix) — la redondea a la opción más cercana para
 * que el <select> siempre tenga un valor válido preseleccionado. */
function opcionMasCercana(cantidad: number) {
  return OPCIONES_BLOQUE_30.reduce((mejor, actual) =>
    Math.abs(actual - cantidad) < Math.abs(mejor - cantidad) ? actual : mejor,
  );
}

export function EditarNovedadForm({
  operarioId,
  movimientoId,
  tipos,
  actual,
}: {
  operarioId: string;
  movimientoId: string;
  tipos: Tipo[];
  actual: MovimientoActual;
}) {
  const accionConId = editarNovedad.bind(null, operarioId, movimientoId);
  const [estado, formAction, enviando] = useActionState<
    EstadoEditarNovedad,
    FormData
  >(accionConId, null);

  const [tipoId, setTipoId] = useState(actual.tipoMovimientoId);
  const tipoSeleccionado = tipos.find((t) => t.id === tipoId);
  // Todo tipo en minutos, sin excepción, se carga en horas por desplegable
  // (2026-09-30, a pedido de Dante) — no hay ningún tipo del catálogo en
  // minutos que se cargue distinto, así que alcanza con mirar la unidad.
  const esMinutos = tipoSeleccionado?.unidad === "minutos";

  // Si todavía es el mismo tipo que ya tenía cargado, mantenemos la
  // cantidad tal cual estaba — si cambió a otro tipo, un valor por defecto
  // razonable para ese tipo (mismo criterio que al cargar una nueva).
  const cantidadPorDefecto =
    tipoId === actual.tipoMovimientoId
      ? actual.cantidad
      : defaultDeCantidad(esMinutos);

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
          defaultValue={actual.fecha}
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
            defaultValue={opcionMasCercana(cantidadPorDefecto)}
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
            defaultValue={cantidadPorDefecto}
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
          defaultValue={actual.observaciones ?? ""}
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
          defaultValue={actual.adjuntoUrl ?? ""}
          className="rounded-sm border border-borde bg-superficie px-3 py-2 text-sm outline-none focus:border-acento"
        />
      </div>

      <div className="flex flex-col gap-1.5 border-t border-borde pt-4">
        <label htmlFor="motivo" className="text-sm font-medium">
          Motivo de la corrección (obligatorio)
        </label>
        <textarea
          id="motivo"
          name="motivo"
          rows={2}
          required
          placeholder="Ej: se cargó el tipo equivocado, era falta justificada no injustificada"
          className="rounded-sm border border-borde bg-superficie px-3 py-2 text-sm outline-none focus:border-acento"
        />
        <p className="text-xs opacity-60">
          No se guarda en la novedad en sí — queda en Auditoría, junto con el
          valor anterior y el nuevo.
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
        {enviando ? "Guardando…" : "Guardar corrección"}
      </button>
    </form>
  );
}
