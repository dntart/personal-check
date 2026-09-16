"use client";

import { useActionState, useState } from "react";
import { actualizarAreasSupervisor, type EstadoSupervisor } from "./actions";

type Area = { id: string; nombre: string };

export function EditarAreasSupervisor({
  supervisorId,
  areas,
  areaIdsActuales,
}: {
  supervisorId: string;
  areas: Area[];
  areaIdsActuales: string[];
}) {
  const [abierto, setAbierto] = useState(false);
  const accionConId = actualizarAreasSupervisor.bind(null, supervisorId);
  const [estado, formAction, enviando] = useActionState<
    EstadoSupervisor,
    FormData
  >(accionConId, null);

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="text-xs text-acento underline transition-opacity hover:opacity-70"
      >
        Editar áreas
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="flex w-full flex-col gap-2 rounded-sm border border-borde p-3"
    >
      <div className="flex flex-col gap-1.5">
        {areas.map((a) => (
          <label key={a.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="areaIds"
              value={a.id}
              defaultChecked={areaIdsActuales.includes(a.id)}
            />
            {a.nombre}
          </label>
        ))}
      </div>

      {estado?.error && <p className="text-xs text-negativo">{estado.error}</p>}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-sm bg-acento px-3 py-1 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {enviando ? "Guardando…" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          disabled={enviando}
          className="rounded-sm border border-borde px-3 py-1 text-xs hover:bg-papel disabled:opacity-60"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
