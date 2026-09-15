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
