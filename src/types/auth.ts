/**
 * Identidad resuelta después del login: quién es, y si es un admin de
 * organización (rol admin/supervisor) o el Super Admin del portfolio.
 * Ver spec sección 3 — son tablas separadas (`personalcheck.admins` vs
 * `personalcheck.super_admins`), nunca la misma fila.
 */
export type SesionPersonalCheck =
  | {
      tipo: "admin";
      id: string;
      nombre: string;
      email: string;
      rol: "admin" | "supervisor";
      organizacionId: string;
      organizacionNombre: string;
    }
  | {
      tipo: "super_admin";
      id: string;
      nombre: string;
      email: string;
    };
