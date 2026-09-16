"use client";

import { useActionState } from "react";
import { editarOperario, type EstadoEditarPersonal } from "./actions";

type Area = { id: string; nombre: string };

export function EditarForm({
  operarioId,
  nombreActual,
  areaIdActual,
  areas,
}: {
  operarioId: string;
  nombreActual: string;
  areaIdActual: string;
  areas: Area[];
}) {
  const accionConId = editarOperario.bind(null, operarioId);
  const [estado, formAction, enviando] = useActionState<
    EstadoEditarPersonal,
    FormData
  >(accionConId, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="nombre" className="text-sm font-medium">
          Nombre
        </label>
        <input
          id="nombre"
          name="nombre"
          type="text"
          required
          defaultValue={nombreActual}
          className="rounded-sm border border-borde bg-superficie px-3 py-2 text-sm outline-none focus:border-acento"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="areaId" className="text-sm font-medium">
          Área
        </label>
        <select
          id="areaId"
          name="areaId"
          required
          defaultValue={areaIdActual}
          className="rounded-sm border border-borde bg-superficie px-3 py-2 text-sm outline-none focus:border-acento"
        >
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nombre}
            </option>
          ))}
        </select>
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
        {enviando ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}
