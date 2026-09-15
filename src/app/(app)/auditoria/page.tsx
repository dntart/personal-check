import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/supabase/sesion";
import { obtenerAuditoria } from "@/lib/personal/auditoria-listado";

const ACCION_LABEL: Record<string, string> = {
  crear: "Creó",
  editar: "Editó",
  eliminar: "Eliminó",
};

const ACCION_COLOR: Record<string, string> = {
  crear: "text-positivo",
  editar: "text-acento",
  eliminar: "text-negativo",
};

const ENTIDAD_LABEL: Record<string, string> = {
  operario: "personal",
  movimiento: "una novedad",
  horario_semanal: "un horario",
  area: "un área",
  admin: "un admin/supervisor",
  nómina: "la nómina",
};

const FORMATO_FECHA = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ entidad?: string }>;
}) {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");
  if (sesion.tipo !== "admin" || sesion.rol !== "admin") redirect("/");

  const { entidad } = await searchParams;
  const filas = await obtenerAuditoria({ entidad });

  return (
    <div className="flex flex-1 flex-col p-4 sm:p-6">
      <h1 className="text-lg font-semibold">Auditoría</h1>
      <p className="mt-1 mb-6 text-sm opacity-70">
        Quién hizo qué y cuándo — log inmutable, incluye altas, ediciones y
        bajas de toda la organización.
      </p>

      {filas.length === 0 ? (
        <p className="text-sm opacity-70">
          Todavía no hay actividad registrada.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filas.map((f) => (
            <li
              key={f.id}
              className="rounded-sm border border-borde p-3 text-sm"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p>
                  <span className="font-medium">{f.actor}</span>{" "}
                  <span className={ACCION_COLOR[f.accion]}>
                    {ACCION_LABEL[f.accion] ?? f.accion}
                  </span>{" "}
                  {ENTIDAD_LABEL[f.entidad] ?? f.entidad}
                </p>
                <span className="font-mono text-xs opacity-60">
                  {FORMATO_FECHA.format(new Date(f.createdAt))}
                </span>
              </div>
              {f.accion === "eliminar" &&
                typeof f.datosNuevos === "object" &&
                f.datosNuevos !== null &&
                "motivo" in f.datosNuevos && (
                  <p className="mt-1 text-xs opacity-70">
                    Motivo:{" "}
                    {String((f.datosNuevos as { motivo: unknown }).motivo)}
                  </p>
                )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
