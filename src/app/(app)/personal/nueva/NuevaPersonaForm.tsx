"use client";

import { useActionState, useState } from "react";
import { crearOperario } from "./actions";

type Area = { id: string; nombre: string };

export function NuevaPersonaForm({
  areas,
  puedeCrearArea,
}: {
  areas: Area[];
  puedeCrearArea: boolean;
}) {
  const [estado, formAction, enviando] = useActionState(crearOperario, null);
  const [areaNueva, setAreaNueva] = useState(false);

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
          className="rounded-sm border border-borde bg-superficie px-3 py-2 text-sm outline-none focus:border-acento"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="areaId" className="text-sm font-medium">
            Área
          </label>
          {puedeCrearArea && (
            <button
              type="button"
              onClick={() => setAreaNueva((v) => !v)}
              className="text-xs text-acento underline transition-opacity hover:opacity-70"
            >
              {areaNueva ? "Elegir área existente" : "Crear área nueva"}
            </button>
          )}
        </div>

        {areaNueva ? (
          <input
            name="areaNueva"
            type="text"
            placeholder="Nombre de la nueva área"
            required
            className="rounded-sm border border-borde bg-superficie px-3 py-2 text-sm outline-none focus:border-acento"
          />
        ) : (
          <select
            id="areaId"
            name="areaId"
            required
            defaultValue=""
            className="rounded-sm border border-borde bg-superficie px-3 py-2 text-sm outline-none focus:border-acento"
          >
            <option value="" disabled>
              Elegí un área
            </option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>
        )}
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
        {enviando ? "Guardando…" : "Agregar personal"}
      </button>
    </form>
  );
}
