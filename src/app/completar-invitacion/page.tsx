import { Logo } from "@/components/Logo";

/**
 * Página "puente" para el link de invitación/recuperación.
 *
 * WhatsApp (y varias apps de chat) visitan automáticamente cualquier URL
 * que se pega en un chat para armar la tarjeta de vista previa — ANTES de
 * que la persona lo abra. Si el link que se comparte apunta directo al
 * endpoint de Supabase que verifica el token (de un solo uso), esa visita
 * automática lo consume en el momento de pegarlo, y para cuando la persona
 * lo toca de verdad ya está muerto (ver historial: así se "gastaron" solos
 * los links de Yamila, Ada y Diego).
 *
 * Esta página no consume nada al cargarse — es HTML estático, un rastreador
 * de vista previa la lee y se va. El token recién se gasta cuando la persona
 * toca el botón de abajo (una navegación real del navegador, no algo que un
 * rastreador de preview haga solo).
 */
export default async function CompletarInvitacionPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; type?: string }>;
}) {
  const { token, type } = await searchParams;
  const sitio = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  const linkValido = token && type;
  const hrefVerificacion = linkValido
    ? `${supabaseUrl}/auth/v1/verify?token=${encodeURIComponent(token)}&type=${encodeURIComponent(type)}&redirect_to=${encodeURIComponent(`${sitio}/invitacion`)}`
    : null;

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-sm border border-borde bg-superficie p-8">
        <Logo className="mx-auto mb-6 h-20 w-auto" />
        {hrefVerificacion ? (
          <>
            <p className="mb-6 text-center text-sm opacity-70">
              Te invitaron a PersonalCheck. Tocá el botón para crear tu
              contraseña y entrar.
            </p>
            <a
              href={hrefVerificacion}
              className="block rounded-sm bg-acento px-4 py-2 text-center text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Continuar
            </a>
            <p className="mt-3 text-center text-xs opacity-60">
              Es de un solo uso — tocalo solo cuando estés list@ para crear tu
              contraseña.
            </p>
          </>
        ) : (
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
