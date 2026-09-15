import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/supabase/sesion";
import { obtenerAlertas } from "@/lib/personal/data";
import { AppNav } from "@/components/AppNav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");

  const alertas = sesion.tipo === "admin" ? await obtenerAlertas() : 0;

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <AppNav
        nombre={sesion.nombre}
        organizacionNombre={
          sesion.tipo === "admin" ? sesion.organizacionNombre : null
        }
        esAdminDeOrganizacion={
          sesion.tipo === "admin" && sesion.rol === "admin"
        }
        esSuperAdmin={sesion.tipo === "super_admin"}
        alertas={alertas}
      />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
