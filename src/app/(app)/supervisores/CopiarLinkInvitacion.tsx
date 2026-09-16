"use client";

import { useState } from "react";
import { obtenerLinkInvitacion } from "./actions";

export function CopiarLinkInvitacion({ email }: { email: string }) {
  const [estado, setEstado] = useState<
    "idle" | "generando" | "copiado" | "error"
  >("idle");
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  async function copiar() {
    setEstado("generando");
    setMensajeError(null);
    const resultado = await obtenerLinkInvitacion(email);
    if ("error" in resultado) {
      setEstado("error");
      setMensajeError(resultado.error);
      return;
    }
    try {
      await navigator.clipboard.writeText(resultado.link);
      setEstado("copiado");
      setTimeout(() => setEstado("idle"), 3000);
    } catch {
      // Sin permiso de portapapeles (poco común) — mostramos el link igual.
      setEstado("error");
      setMensajeError(resultado.link);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={copiar}
        disabled={estado === "generando"}
        className="text-xs text-acento underline disabled:opacity-60"
      >
        {estado === "generando"
          ? "Generando…"
          : estado === "copiado"
            ? "¡Copiado!"
            : "Copiar link de invitación"}
      </button>
      {estado === "error" && mensajeError && (
        <p className="max-w-[220px] text-right text-xs break-all text-negativo">
          {mensajeError}
        </p>
      )}
    </div>
  );
}
