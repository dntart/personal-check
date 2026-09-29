"use client";

import { useActionState } from "react";
import { eliminarNovedad, type EstadoEliminarNovedad } from "./actions";

export function EliminarNovedadForm({
  operarioId,
  movimientoId,
  tipoNombre,
  fecha,
}: {
  operarioId: string;
  movimientoId: string;
  tipoNombre: string;
  fecha: string;
}) {
  const accionConId = eliminarNovedad.bind(null, operarioId);
  const [estado, formAction, enviando] = useActionState<
    EstadoEliminarNovedad,
    FormData
  >(accionConId, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="movimientoId" value={movimientoId} />

      <p className="text-sm">
        Vas a eliminar <strong>{tipoNombre}</strong> del {fecha}. No es un
        borrado silencioso: queda registrado en Auditoría con tu usuario y el
        motivo.
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
          placeholder="Ej: se cargó para la persona equivocada"
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
        className="mt-2 rounded-sm bg-negativo px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {enviando ? "Eliminando…" : "Confirmar eliminación"}
      </button>
    </form>
  );
}
