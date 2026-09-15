"use client";

import { useActionState } from "react";
import { eliminarOperario, type EstadoEliminar } from "./actions";

export function EliminarForm({
  operarioId,
  nombre,
}: {
  operarioId: string;
  nombre: string;
}) {
  const accionConId = eliminarOperario.bind(null, operarioId);
  const [estado, formAction, enviando] = useActionState<
    EstadoEliminar,
    FormData
  >(accionConId, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <p className="text-sm">
        Vas a eliminar a <strong>{nombre}</strong>. No es un borrado silencioso:
        queda registrado en Auditoría con tu usuario y el motivo.
      </p>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="motivo" className="text-sm font-medium">
          Motivo (obligatorio)
        </label>
        <textarea
          id="motivo"
          name="motivo"
          rows={3}
          required
          placeholder="Ej: cargado por error, es duplicado de otra persona"
          className="rounded-sm border border-borde bg-superficie px-3 py-2 text-sm outline-none focus:border-negativo"
        />
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
        className="mt-2 rounded-sm bg-negativo px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {enviando ? "Eliminando…" : "Confirmar eliminación"}
      </button>
    </form>
  );
}
