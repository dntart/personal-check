import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/**
 * Cliente de Supabase para uso en el navegador (Client Components).
 * Mismo proyecto Supabase compartido por todo el portfolio — PersonalCheck
 * vive aislado en el schema `personalcheck` vía RLS, no por proyecto separado.
 *
 * `cookieOptions.name` propio (regla de la skill compartida,
 * `references/auth-y-dominios.md`): sin esto, todos los SaaS del portfolio
 * usan el mismo nombre de cookie de sesión por defecto, y en `localhost` la
 * cookie no se aísla por puerto — la sesión de un SaaS pisa la de otro.
 */
export function createClient() {
  return createBrowserClient<Database, "personalcheck">(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: "personalcheck" },
      cookieOptions: { name: "sb-personalcheck-auth" },
    },
  );
}
