"use client";

import { useActionState } from "react";
import { invitarSupervisor, type EstadoSupervisor } from "./actions";

type Area = { id: string; nombre: string };

export function InvitarSupervisorForm({ areas }: { areas: Area[] }) {
  const [estado, formAction, enviando] = useActionState<
    EstadoSupervisor,
    FormData
  >(invitarSupervisor, null);

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
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="rounded-sm border border-borde bg-superficie px-3 py-2 text-sm outline-none focus:border-acento"
        />
        <p className="text-xs opacity-60">
          Le va a llegar una invitación por correo para crear su contraseña. Si
          ese email ya tiene cuenta en otro SaaS tuyo, se reusa la misma
          identidad — no le llega un mail nuevo, simplemente queda con acceso
          acá también.
        </p>
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-sm font-medium">Áreas que puede ver</legend>
        {areas.length === 0 ? (
          <p className="text-sm opacity-70">
            Todavía no hay áreas creadas — agregá personal primero.
          </p>
        ) : (
          <div className="flex flex-col gap-1.5 rounded-sm border border-borde p-3">
            {areas.map((a) => (
              <label key={a.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="areaIds" value={a.id} />
                {a.nombre}
              </label>
            ))}
          </div>
        )}
      </fieldset>

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
        disabled={enviando || areas.length === 0}
        className="mt-2 rounded-sm bg-acento px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {enviando ? "Invitando…" : "Invitar supervisor"}
      </button>
    </form>
  );
}
