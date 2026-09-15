import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

/**
 * Cliente de Supabase para uso en Server Components, Server Actions y Route
 * Handlers. Usa la anon key + cookies de sesión (RLS se aplica igual que en
 * el cliente). Para operaciones que requieren bypass de RLS (ej. invitar el
 * primer admin de una organización nueva), usar la service role key en un
 * cliente aparte, solo desde contextos server-side de confianza.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database, "personalcheck">(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: "personalcheck" },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Se llama desde un Server Component sin permiso de escritura;
            // el middleware se encarga de refrescar la sesión en ese caso.
          }
        },
      },
    },
  );
}
