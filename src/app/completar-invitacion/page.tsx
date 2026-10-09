import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/supabase/sesion";
import { CompletarInvitacionClient } from "./CompletarInvitacionClient";

export default async function CompletarInvitacionPage() {
  // Quien ya creó su contraseña y vuelve a abrir el link del mail (ya tiene
  // sesión activa) va directo al dashboard, no de nuevo a este panel — mismo
  // criterio que /login.
  const sesion = await obtenerSesion();
  if (sesion) redirect("/");

  return <CompletarInvitacionClient />;
}
