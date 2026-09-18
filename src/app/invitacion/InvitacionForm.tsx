"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CampoContrasena } from "@/components/CampoContrasena";

const ERROR_LINK =
  "El link de invitación no es válido o ya expiró. Pedile a tu Admin que te invite de nuevo.";

/**
 * Completa la invitación: el link de GoTrue trae la sesión en el fragmento
 * de la URL (#access_token=...&refresh_token=...) — el navegador nunca
 * manda eso al servidor, así que se resuelve acá, en el cliente.
 *
 * OJO: NO alcanza con supabase.auth.getSession() y esperar a que el cliente
 * la detecte solo. @supabase/ssr fuerza flowType "pkce" en createBrowserClient
 * (no se puede pisar por opciones — ver node_modules/@supabase/ssr/dist/main/
 * createBrowserClient.js), y en modo pkce el cliente busca un `?code=` en la
 * URL, no un `#access_token=` — el formato que en realidad devuelven los
 * links de invite/recovery generados por la Admin API. Con getSession() a
 * secas, la sesión quedaba creada del lado del servidor pero el cliente
 * nunca la enteraba, y esta pantalla mostraba "inválido" siempre — pasó con
 * cada supervisor invitado (ver historial). El fix es leer el hash a mano y
 * pisar la sesión con setSession(), que no depende del flujo configurado.
 */
export function InvitacionForm() {
  const router = useRouter();
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    Promise.resolve().then(async () => {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");

      if (!accessToken || !refreshToken) {
        setError(ERROR_LINK);
        setCargando(false);
        return;
      }

      const supabase = createClient();
      const { error: err } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      // Limpiamos el hash de la URL: son tokens sensibles, no tienen que
      // quedar visibles en la barra de direcciones ni en el historial.
      window.history.replaceState(null, "", window.location.pathname);

      if (err) {
        setError(ERROR_LINK);
      }
      setCargando(false);
    });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);

    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password });

    if (err) {
      setError("No se pudo guardar la contraseña: " + err.message);
      setGuardando(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  if (cargando) {
    return <p className="text-sm opacity-70">Verificando invitación…</p>;
  }

  if (error) {
    return (
      <p
        role="alert"
        className="rounded-sm border border-negativo bg-negativo/10 px-3 py-2 text-sm text-negativo"
      >
        {error}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          Elegí una contraseña
        </label>
        <CampoContrasena
          id="password"
          required
          minLength={6}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-sm border border-borde bg-superficie px-3 py-2 text-sm outline-none focus:border-acento"
        />
      </div>

      <button
        type="submit"
        disabled={guardando}
        className="mt-2 rounded-sm bg-acento px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {guardando ? "Guardando…" : "Crear contraseña e ingresar"}
      </button>
    </form>
  );
}
