// Reglas de negocio centrales de PersonalCheck (spec secciones 5 y 6.3).
// Puras, sin acceso a datos — así se pueden testear y reusar tanto en
// Server Components como en el cálculo de informes más adelante.

export type Turno = "manana" | "tarde";

export const DIAS_SEMANA: { valor: number; nombre: string; corto: string }[] = [
  { valor: 1, nombre: "Lunes", corto: "Lun" },
  { valor: 2, nombre: "Martes", corto: "Mar" },
  { valor: 3, nombre: "Miércoles", corto: "Mié" },
  { valor: 4, nombre: "Jueves", corto: "Jue" },
  { valor: 5, nombre: "Viernes", corto: "Vie" },
  { valor: 6, nombre: "Sábado", corto: "Sáb" },
  { valor: 7, nombre: "Domingo", corto: "Dom" },
];

/**
 * El turno NO es un campo en la base — se calcula por día a partir de la
 * hora de inicio de ese día. Antes de las 13:00 = mañana, si no, tarde.
 * (spec sección 4, tabla horarios_semanales, y sección 6.3)
 */
export function calcularTurno(horaInicio: string): Turno {
  // horaInicio viene de Postgres como "HH:MM:SS" — comparación lexicográfica
  // funciona porque el formato está siempre zero-padded.
  return horaInicio < "13:00:00" ? "manana" : "tarde";
}

export function formatearHora(hora: string): string {
  // "08:00:00" -> "08:00"
  return hora.slice(0, 5);
}

/**
 * Efecto de un movimiento sobre el saldo en días (spec sección 5).
 * - suma: se suma la cantidad tal cual (incluye ajuste_manual, donde el
 *   admin ya carga el signo en `cantidad`)
 * - resta: se resta la cantidad
 * - neutro: no toca el saldo (falta justificada, tardanza)
 */
export function calcularEfecto(
  impacto: "suma" | "resta" | "neutro",
  cantidad: number,
): number {
  if (impacto === "resta") return -cantidad;
  if (impacto === "neutro") return 0;
  return cantidad;
}

export const UMBRAL_SALDO_ALTO = 15;

export function esAdministracion(nombreDeArea: string): boolean {
  return nombreDeArea.trim().toLowerCase() === "administración";
}
