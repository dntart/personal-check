"use client";

import { useActionState } from "react";
import { invitarOrganizacion, type EstadoSuperAdmin } from "./actions";

export function InvitarOrganizacionForm() {
  const [estado, formAction, enviando] = useActionState<
    EstadoSuperAdmin,
    FormData
  >(invitarOrganizacion, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="nombreOrganizacion" className="text-sm font-medium">
          Nombre de la organización (el cliente)
        </label>
        <input
          id="nombreOrganizacion"
          name="nombreOrganizacion"
          type="text"
          required
          className="rounded-sm border border-borde bg-superficie px-3 py-2 text-sm outline-none focus:border-acento"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="nombreAdmin" className="text-sm font-medium">
          Nombre del primer admin
        </label>
        <input
          id="nombreAdmin"
          name="nombreAdmin"
          type="text"
          required
          className="rounded-sm border border-borde bg-superficie px-3 py-2 text-sm outline-none focus:border-acento"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="emailAdmin" className="text-sm font-medium">
          Email del primer admin
        </label>
        <input
          id="emailAdmin"
          name="emailAdmin"
          type="email"
          required
          className="rounded-sm border border-borde bg-superficie px-3 py-2 text-sm outline-none focus:border-acento"
        />
        <p className="text-xs opacity-60">
          Le llega una invitación por correo para crear su contraseña — no hace
          falta que vos crees nada más a mano.
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
        className="mt-2 rounded-sm bg-acento px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {enviando ? "Creando…" : "Crear organización e invitar admin"}
      </button>
    </form>
  );
}
