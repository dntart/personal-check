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
 * "2026-09-18" -> "18/09/2026" (a pedido de Dante: día-mes-año, no
 * año-mes-día). A propósito NO pasa por `new Date(...)`: una fecha pura sin
 * hora, parseada como Date, se interpreta en UTC y al formatearla en la
 * zona horaria local puede mostrar el día anterior — manipulación de
 * string directa, sin ese riesgo.
 */
export function formatearFecha(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${anio}`;
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

/**
 * A partir de cuántos minutos acumulados de "Hora extra trabajada" avisar
 * (spec/pedido de Dante, 2026-09-24: "cuando un personal acumule más de 4
 * horas... podría cambiarse por un día completo a favor"). Mismo mecanismo
 * que UMBRAL_SALDO_ALTO: alimenta tanto la campanita de alertas como el
 * mail que se manda a los Admin al cargar/corregir una novedad.
 */
export const UMBRAL_HORAS_EXTRA_ALTO = 240; // 4 horas, en minutos

/**
 * Tardanza se separa en injustificada/justificada (decisión de negocio que
 * reemplaza a la de spec sección 5/9 — a veces la demora es por una causa
 * ajena a la persona, ej: no le entregaron la llave, y no debería anotarse
 * como una tardanza real). Solo la injustificada cuenta para el contador
 * informativo de minutos acumulados — mismo patrón que
 * falta_injustificada/falta_justificada. Ninguna de las dos toca el saldo
 * en días.
 */
export const CODIGO_TARDANZA_INJUSTIFICADA = "tardanza_injustificada";

/**
 * Contador informativo de horas extra acumuladas en la ficha de la persona
 * (a pedido de Dante: "no tengo como contabilizar el total... de las horas
 * extras trabajadas") — mismo patrón que minutosTardanza: se suma la
 * cantidad de todas las novedades de este tipo, nunca toca el saldo en
 * días (es neutro, ver catálogo).
 */
export const CODIGO_HORA_EXTRA_TRABAJADA = "hora_extra_trabajada";

/**
 * "90" -> "1 h 30 min". El acumulado de horas extra es histórico (nunca se
 * resetea, mismo criterio que el saldo en días) y en la práctica puede
 * juntar varias horas — mostrarlo en minutos crudos (ej. "600 min") es
 * mucho menos legible que "10 h".
 */
export function formatearMinutosComoHoras(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas === 0) return `${resto} min`;
  if (resto === 0) return `${horas} h`;
  return `${horas} h ${resto} min`;
}

export function esAdministracion(nombreDeArea: string): boolean {
  return nombreDeArea.trim().toLowerCase() === "administración";
}

/**
 * Tipos de novedad que se cargan en bloques de 30 minutos (30, 60, 90…),
 * no minuto a minuto como Tardanza — Salida anticipada (a pedido de Dante,
 * "podemos hacerla cada 30 minutos") y Hora extra trabajada (mismo
 * criterio, porque en la práctica los permisos/horas extra se dan en
 * medias horas). Un solo lugar para esta lista: la usan tanto los
 * formularios (para mostrar un <select> en vez de un número libre — un
 * <input type=number> con step no impide tipear cualquier valor a mano,
 * sobre todo en mobile) como las Server Actions (para no confiar solo en
 * el <select> del cliente).
 */
const CODIGOS_BLOQUE_30 = ["hora_extra_trabajada"];
export function esBloque30(codigo: string | undefined): boolean {
  return (
    codigo !== undefined &&
    (codigo.startsWith("salida_anticipada") ||
      CODIGOS_BLOQUE_30.includes(codigo))
  );
}
export const OPCIONES_BLOQUE_30 = Array.from(
  { length: 8 },
  (_, i) => (i + 1) * 30,
);
