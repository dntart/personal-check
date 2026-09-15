import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente de Supabase para uso en el navegador (Client Components).
 * Mismo proyecto Supabase compartido por todo el portfolio — PersonalCheck
 * vive aislado en el schema `personalcheck` vía RLS, no por proyecto separado.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: "personalcheck" } },
  );
}
