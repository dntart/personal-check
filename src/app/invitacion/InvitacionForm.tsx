"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Completa la invitación: el link del mail (GoTrue) trae la sesión en el
 * fragmento de la URL (#access_token=...) — el navegador no se lo manda al
 * servidor, así que esto tiene que resolverse acá, en el cliente. El
 * cliente de @supabase/ssr detecta ese fragmento solo (detectSessionInUrl)
 * y persiste la sesión en cookies.
 */
export function InvitacionForm() {
  const router = useRouter();
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data, error: err }) => {
      if (err || !data.session) {
        setError(
          "El link de invitación no es válido o ya expiró. Pedile a tu Admin que te invite de nuevo.",
        );
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
        <input
          id="password"
          type="password"
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
