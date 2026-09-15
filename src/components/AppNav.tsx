"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoIcon } from "./Logo";
import { logout } from "@/app/(app)/actions";

type Props = {
  nombre: string;
  organizacionNombre: string | null;
  esAdminDeOrganizacion: boolean;
  esSuperAdmin: boolean;
  alertas: number;
};

const LINKS_ORGANIZACION = [
  { href: "/", label: "Dashboard" },
  { href: "/nomina", label: "Nómina de personal" },
];

// Auditoría es capacidad de Admin de organización, no de Supervisor (spec
// sección 3) — RLS ya lo bloquea igual, esto es solo para no ofrecerlo.
const LINKS_SOLO_ADMIN = [{ href: "/auditoria", label: "Auditoría" }];

const LINKS_SUPER_ADMIN = [{ href: "/super-admin", label: "Organizaciones" }];

export function AppNav({
  nombre,
  organizacionNombre,
  esAdminDeOrganizacion,
  esSuperAdmin,
  alertas,
}: Props) {
  const pathname = usePathname();
  const links = esSuperAdmin
    ? LINKS_SUPER_ADMIN
    : [
        ...LINKS_ORGANIZACION,
        ...(esAdminDeOrganizacion ? LINKS_SOLO_ADMIN : []),
      ];

  return (
    <header className="border-b border-borde">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <LogoIcon className="h-8 w-8 shrink-0" />
          <div className="leading-tight">
            <p className="text-sm font-semibold">PersonalCheck</p>
            <p className="text-xs opacity-60">
              {esSuperAdmin ? "Super Admin" : organizacionNombre}
            </p>
          </div>
        </div>

        <nav className="flex flex-wrap gap-1">
          {links.map((link) => {
            const activo =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-sm px-3 py-1.5 text-sm ${
                  activo
                    ? "bg-turno-manana font-medium text-acento"
                    : "hover:bg-papel"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          {esAdminDeOrganizacion && (
            <Link
              href="/supervisores"
              className={`rounded-sm px-3 py-1.5 text-sm ${
                pathname.startsWith("/supervisores")
                  ? "bg-turno-manana font-medium text-acento"
                  : "hover:bg-papel"
              }`}
            >
              Supervisores
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          {!esSuperAdmin && (
            <Link
              href="/nomina?filtro=alertas"
              className="relative rounded-sm p-2 hover:bg-papel"
              title={
                alertas > 0
                  ? `${alertas} alerta(s) de saldo`
                  : "Sin alertas de saldo"
              }
              aria-label="Notificaciones"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-5 w-5"
              >
                <path d="M6 8a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
                <path d="M9.5 21a2.5 2.5 0 0 0 5 0" />
              </svg>
              {alertas > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-negativo text-[10px] font-medium text-white">
                  {alertas}
                </span>
              )}
            </Link>
          )}
          <p className="hidden text-sm opacity-70 sm:block">Hola, {nombre}</p>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-sm border border-borde px-3 py-1.5 text-sm hover:bg-papel"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
