import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/supabase/sesion";
import { Logo } from "@/components/Logo";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const sesion = await obtenerSesion();
  if (sesion) redirect("/");

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-sm border border-borde bg-superficie p-8">
        <Logo className="mx-auto mb-6 h-24 w-auto" />
        <p className="mb-6 text-center text-sm opacity-70">
          Ingresá con el email y contraseña que te compartieron.
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
