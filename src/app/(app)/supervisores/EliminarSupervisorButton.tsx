"use client";

import { useActionState } from "react";
import { eliminarSupervisor, type EstadoSupervisor } from "./actions";

export function EliminarSupervisorButton({
  supervisorId,
  nombre,
}: {
  supervisorId: string;
  nombre: string;
}) {
  const accionConId = eliminarSupervisor.bind(null, supervisorId);
  const [estado, formAction, enviando] = useActionState<
    EstadoSupervisor,
    FormData
  >(accionConId, null);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(`¿Quitarle el acceso a ${nombre}?`)) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        disabled={enviando}
        className="text-xs text-negativo underline transition-opacity hover:opacity-70 disabled:opacity-60"
      >
        {enviando ? "Quitando…" : "Quitar acceso"}
      </button>
      {estado?.error && (
        <p className="mt-1 text-xs text-negativo">{estado.error}</p>
      )}
    </form>
  );
}
