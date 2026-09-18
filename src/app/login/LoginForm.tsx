"use client";

import { useActionState } from "react";
import { login } from "./actions";
import { CampoContrasena } from "@/components/CampoContrasena";

export function LoginForm() {
  const [estado, formAction, enviando] = useActionState(login, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="rounded-sm border border-borde bg-superficie px-3 py-2 text-sm outline-none focus:border-acento"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          Contraseña
        </label>
        <CampoContrasena
          id="password"
          name="password"
          autoComplete="current-password"
          required
          className="rounded-sm border border-borde bg-superficie px-3 py-2 text-sm outline-none focus:border-acento"
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
        className="mt-2 rounded-sm bg-acento px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {enviando ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}
