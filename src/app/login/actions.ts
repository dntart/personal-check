"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validations/auth";

export type EstadoLogin = { error: string } | null;

/**
 * Login por email/contraseña de un admin ya invitado (spec sección 3: nunca
 * hay un formulario público de registro). auth.users es compartido por todo
 * el portfolio, así que una autenticación válida en Supabase Auth no alcanza
 * — hace falta además una fila viva en personalcheck.admins o
 * personalcheck.super_admins.
 */
export async function login(
  _estadoPrevio: EstadoLogin,
  formData: FormData,
): Promise<EstadoLogin> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Ingresá un email y una contraseña válidos." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error || !data.user) {
    return { error: "Email o contraseña incorrectos." };
  }

  const [{ data: admin }, { data: superAdmin }] = await Promise.all([
    supabase
      .from("admins")
      .select("id")
      .eq("id", data.user.id)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .from("super_admins")
      .select("id")
      .eq("id", data.user.id)
      .maybeSingle(),
  ]);

  if (!admin && !superAdmin) {
    await supabase.auth.signOut();
    return {
      error:
        "Esta cuenta no tiene acceso a PersonalCheck, o tu organización está suspendida. Contactá a quien te invitó.",
    };
  }

  redirect("/");
}
