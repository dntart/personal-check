/**
 * Única fuente de verdad para la URL base del sitio (spec de la skill
 * compartida, `references/auth-y-dominios.md`, Regla 1: ningún dominio se
 * hardcodea en el código). Hoy el fallback de desarrollo es el puerto fijo
 * de PersonalCheck en la tabla de puertos del portfolio (3003) — no 3000,
 * que es el de Alma.
 */
export function getSiteUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : "http://localhost:3003");
  return url.replace(/\/$/, "");
}
