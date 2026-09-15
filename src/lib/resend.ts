import "server-only";

const RESEND_URL = "https://api.resend.com/emails";
const FROM =
  process.env.RESEND_FROM_EMAIL || "PersonalCheck <onboarding@resend.dev>";

/**
 * Envía un email vía Resend (REST directo, sin el SDK — consistente con el
 * resto del proyecto, que evita SDKs completos cuando un fetch alcanza).
 * Si todavía no configuraste RESEND_API_KEY, no rompe nada: solo loguea lo
 * que se hubiera mandado.
 */
export async function enviarEmail(params: {
  to: string[];
  subject: string;
  text: string;
}) {
  if (params.to.length === 0) return;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(
      `[Resend no configurado] Se hubiera enviado "${params.subject}" a ${params.to.join(", ")}`,
    );
    return;
  }

  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: params.to,
        subject: params.subject,
        text: params.text,
      }),
    });
    if (!res.ok) {
      console.error("Resend respondió con error:", await res.text());
    }
  } catch (err) {
    // Un email que falla nunca debe romper la carga de una novedad.
    console.error("Error enviando email vía Resend:", err);
  }
}
