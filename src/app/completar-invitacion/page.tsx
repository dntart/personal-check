"use client";

import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";

/**
 * Página "puente" para el link de invitación/recuperación.
 *
 * El token viaja en el FRAGMENTO de la URL (#token=...&type=...), no en la
 * query string — un fragmento nunca se manda al servidor, así que ningún
 * rastreador de vista previa (WhatsApp armando la tarjetita del chat), ni un
 * antivirus/scanner de links corporativo, puede llegar a verlo con un GET
 * automático: solo JavaScript corriendo acá, en un navegador real, después
 * de que la persona ya abrió la página. Por eso este componente lee el hash
 * con useEffect en vez de leer searchParams en el servidor — es justamente
 * el patrón que la documentación de Supabase/GoTrue recomienda para este
 * problema (ver historial: con el token en la query string, alcanzaba con
 * que algo hiciera un GET a esta misma página para gastarlo en silencio).
 *
 * El token en sí recién se consume cuando la persona toca "Continuar" — acá
 * no se hace ningún fetch, es una navegación real del navegador.
 */
export default function CompletarInvitacionPage() {
  const [href, setHref] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    // El hash solo existe una vez que React ya montó en el navegador — no
    // hay ningún dato "real" antes de esto, así que no hace falta leerlo de
    // forma síncrona acá adentro (evita el cascading-render que marca el
    // linter): se resuelve en el próximo microtask, igual de imperceptible.
    Promise.resolve().then(() => {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const token = hash.get("token");
      const type = hash.get("type");
      if (!token || !type) {
        setHref(null);
        return;
      }
      const sitio = window.location.origin;
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      setHref(
        `${supabaseUrl}/auth/v1/verify?token=${encodeURIComponent(token)}` +
          `&type=${encodeURIComponent(type)}` +
          `&redirect_to=${encodeURIComponent(`${sitio}/invitacion`)}`,
      );
    });
  }, []);

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-sm border border-borde bg-superficie p-8">
        <Logo className="mx-auto mb-6 h-20 w-auto" />
        {href === undefined && (
          <p className="text-center text-sm opacity-70">Cargando…</p>
        )}
        {href && (
          <>
            <p className="mb-6 text-center text-sm opacity-70">
              Te invitaron a PersonalCheck. Tocá el botón para crear tu
              contraseña y entrar.
            </p>
            <a
              href={href}
              className="block rounded-sm bg-acento px-4 py-2 text-center text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Continuar
            </a>
            <p className="mt-3 text-center text-xs opacity-60">
              Es de un solo uso — tocalo solo cuando estés list@ para crear tu
              contraseña.
            </p>
          </>
        )}
        {href === null && (
          <p
            role="alert"
            className="rounded-sm border border-negativo bg-negativo/10 px-3 py-2 text-center text-sm text-negativo"
          >
            Este link no es válido. Pedile a tu Admin que te invite de nuevo.
          </p>
        )}
      </div>
    </div>
  );
}
