"use client";

import { useState } from "react";
import { obtenerLinkInvitacion } from "./actions";

/**
 * Cada persona solo puede tener UN link de invitación/recuperación "vivo"
 * a la vez en Supabase: pedir uno nuevo invalida en silencio el anterior,
 * aunque nunca se haya usado (ver historial: así se murieron los links de
 * Yamila, Ada y Diego sin que nadie los "gastara" — alguien tocó el botón
 * dos veces y mandó la copia vieja). Por eso acá cacheamos el link ya
 * generado: tocar el botón de nuevo vuelve a copiar el MISMO link en vez
 * de pedir uno nuevo. Solo "Generar uno nuevo" pide otro, y avisa antes.
 */
export function CopiarLinkInvitacion({ email }: { email: string }) {
  const [estado, setEstado] = useState<
    "idle" | "generando" | "copiado" | "error"
  >("idle");
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);

  async function copiarTexto(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setEstado("copiado");
      setTimeout(() => setEstado((e) => (e === "copiado" ? "idle" : e)), 3000);
    } catch {
      // Sin permiso de portapapeles (poco común) — mostramos el link igual.
      setEstado("error");
      setMensajeError(texto);
    }
  }

  async function generar() {
    setEstado("generando");
    setMensajeError(null);
    const resultado = await obtenerLinkInvitacion(email);
    if ("error" in resultado) {
      setEstado("error");
      setMensajeError(resultado.error);
      return;
    }
    setLink(resultado.link);
    await copiarTexto(resultado.link);
  }

  function alHacerClicPrincipal() {
    if (link) {
      // Ya hay uno generado: volvemos a copiar ESE, no pedimos uno nuevo.
      copiarTexto(link);
      return;
    }
    generar();
  }

  function regenerar() {
    if (
      !confirm(
        "Ya hay un link generado para esta persona. Si generás uno nuevo, el anterior deja de funcionar aunque nunca se haya abierto. ¿Generar uno nuevo igual?",
      )
    ) {
      return;
    }
    generar();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={alHacerClicPrincipal}
        disabled={estado === "generando"}
        className="text-xs text-acento underline transition-opacity hover:opacity-70 disabled:opacity-60"
      >
        {estado === "generando"
          ? "Generando…"
          : estado === "copiado"
            ? "¡Copiado!"
            : link
              ? "Copiar de nuevo"
              : "Copiar link de invitación"}
      </button>
      {link && estado !== "generando" && (
        <button
          type="button"
          onClick={regenerar}
          className="text-[11px] text-negativo underline transition-opacity hover:opacity-70"
        >
          Generar uno nuevo (invalida el anterior)
        </button>
      )}
      {estado === "error" && mensajeError && (
        <p className="max-w-[220px] text-right text-xs break-all text-negativo">
          {mensajeError}
        </p>
      )}
    </div>
  );
}
