import "server-only";

// Llama a la Auth Admin API (GoTrue) directo por fetch, en vez del SDK
// completo de supabase-js: ese SDK inicializa un cliente Realtime que
// necesita WebSocket nativo (Node >=22) y este proyecto corre en Node 20
// en desarrollo — rompe con "native WebSocket not found" (ver historial:
// mismo problema que tuvimos al resetear una contraseña por Admin API).

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function headers() {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  };
}

type ResultadoInvitacion =
  { id: string; yaExistia: boolean } | { error: string };

/**
 * Invita a un email a PersonalCheck (spec sección 3: alta de admins/
 * supervisores exclusivamente por invitación).
 *
 * `auth.users` es compartido por todo el portfolio: si el email ya tiene
 * cuenta (por ejemplo, ya es usuario de otro SaaS del mismo Dante), no se
 * crea una identidad nueva — se reusa el mismo `auth.users.id` y solo se le
 * da acceso a PersonalCheck vía una fila en `personalcheck.admins`.
 */
export async function invitarOEncontrarUsuario(
  email: string,
): Promise<ResultadoInvitacion> {
  const sitio = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const redirectTo = `${sitio}/invitacion`;

  const invite = await fetch(
    `${url}/auth/v1/invite?redirect_to=${encodeURIComponent(redirectTo)}`,
    {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ email }),
    },
  );

  if (invite.ok) {
    const data = await invite.json();
    return { id: data.id, yaExistia: false };
  }

  const cuerpoError = await invite.text();
  const yaRegistrado = /already.*registered|already exists/i.test(cuerpoError);
  if (!yaRegistrado) {
    return { error: `No se pudo invitar: ${cuerpoError}` };
  }

  const lista = await fetch(`${url}/auth/v1/admin/users?per_page=1000`, {
    headers: headers(),
  });
  if (!lista.ok) {
    return { error: "El email ya existe pero no se pudo resolver su cuenta." };
  }
  const { users } = (await lista.json()) as {
    users: { id: string; email: string }[];
  };
  const encontrado = users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );
  if (!encontrado) {
    return { error: "El email ya existe pero no se pudo resolver su cuenta." };
  }
  return { id: encontrado.id, yaExistia: true };
}

/**
 * Genera un link de invitación/recuperación válido SIN pasar por el mailer
 * de Supabase (que tiene un límite muy bajo por defecto — ver historial:
 * dos supervisores se quedaron con la invitación vencida porque el mail no
 * volvía a salir por el rate limit compartido). El admin copia este link y
 * lo manda él mismo por el canal que quiera (WhatsApp, email, lo que sea).
 *
 * GoTrue distingue el `type` según si la cuenta ya confirmó el mail o no:
 * "invite" es para el primer alta (todavía sin confirmar); una vez que el
 * mail ya está confirmado (por ejemplo, abrió el link de invitación pero
 * nunca llegó a poner contraseña), hay que pedir "recovery" en su lugar —
 * "invite" para un mail ya confirmado no sirve para completar el alta. Por
 * eso siempre resolvemos el tipo correcto acá adentro en vez de asumir uno
 * fijo (ver historial: esto costó varias idas y vueltas manuales).
 *
 * El link que se devuelve NO apunta directo al endpoint de Supabase que
 * verifica el token — apunta a /completar-invitacion, una página propia
 * que no gasta nada al abrirse sola. Si apuntara directo, apps de chat
 * como WhatsApp lo "gastan" solas al armar la vista previa del link en
 * el momento de pegarlo, antes de que la persona lo toque (ver historial:
 * así se murieron en silencio los links de Yamila, Ada y Diego).
 */
export async function generarLinkInvitacion(
  email: string,
): Promise<{ link: string } | { error: string }> {
  const sitio = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const redirectTo = `${sitio}/invitacion`;

  const lista = await fetch(`${url}/auth/v1/admin/users?per_page=1000`, {
    headers: headers(),
  });
  if (!lista.ok) {
    return { error: "No se pudo verificar el estado de la cuenta." };
  }
  const { users } = (await lista.json()) as {
    users: { email: string; email_confirmed_at: string | null }[];
  };
  const cuenta = users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );
  const tipo = cuenta?.email_confirmed_at ? "recovery" : "invite";

  const res = await fetch(
    `${url}/auth/v1/admin/generate_link?redirect_to=${encodeURIComponent(redirectTo)}`,
    {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ type: tipo, email, redirect_to: redirectTo }),
    },
  );

  const data = await res.json();
  if (!res.ok || !data.hashed_token) {
    return {
      error:
        data.msg || data.error_description || "No se pudo generar el link.",
    };
  }
  const link =
    `${sitio}/completar-invitacion?token=${encodeURIComponent(data.hashed_token)}` +
    `&type=${encodeURIComponent(data.verification_type ?? tipo)}`;
  return { link };
}
