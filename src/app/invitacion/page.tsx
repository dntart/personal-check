import { Logo } from "@/components/Logo";
import { InvitacionForm } from "./InvitacionForm";

export default function InvitacionPage() {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-sm border border-borde bg-superficie p-8">
        <Logo className="mx-auto mb-6 h-20 w-auto" />
        <p className="mb-6 text-center text-sm opacity-70">
          Te invitaron a PersonalCheck. Creá tu contraseña para entrar.
        </p>
        <InvitacionForm />
      </div>
    </div>
  );
}
