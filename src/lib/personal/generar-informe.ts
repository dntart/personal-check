// Generación de PDF/Excel — deliberadamente client-side (spec sección 2:
// "PDF client-side (jsPDF, como en el prototipo)"). Los imports de jsPDF/
// xlsx son dinámicos para no meterlos en el bundle inicial de cada página.
import type { DatosInforme } from "./informes";
import { formatearFecha, formatearMinutosComoHoras } from "./reglas";

function nombreArchivo(datos: DatosInforme, extension: string) {
  // Informe de un mes puntual vs. año completo (AGREGADO 2026-09-29) —
  // este último no tiene un "mes" que le corresponda.
  if (datos.mes) {
    const mesStr = String(datos.mes).padStart(2, "0");
    return `personalcheck-${datos.anio}-${mesStr}.${extension}`;
  }
  return `personalcheck-${datos.anio}-completo.${extension}`;
}

// Exportadas para que la vista previa (InformeDescarga) muestre exactamente
// el mismo formato que termina en el PDF/Excel — una sola fuente de verdad.

/**
 * Formatea la cantidad de UNA novedad puntual. Para minutos, siempre en
 * horas (ej. "1 h 30 min") — a pedido explícito de Dante, 2026-09-30: TODO
 * tipo en minutos (Tardanza, Salida anticipada, Cambio de horario, Hora
 * extra trabajada) se carga y se muestra en horas, no en minutos crudos.
 * Ninguno de esos tipos tiene efecto en el saldo (todos son neutro), así
 * que no hace falta pensar en signo para ese caso.
 *
 * Para días, el signo corresponde a su efecto real en el saldo — no el
 * signo del número crudo guardado (que siempre es positivo, ej. "1" para
 * un día compensado tomado). Bug real reportado: "Día compensado tomado"
 * (RESTA un día del saldo) mostraba "+1", que se prestaba a confusión —
 * ahora muestra "-1". "neutro" no fuerza ningún signo.
 */
export function formatearCantidad(
  cantidad: number,
  unidad: "dias" | "minutos",
  impacto: "suma" | "resta" | "neutro",
) {
  if (unidad === "minutos") return formatearMinutosComoHoras(cantidad);
  const valor = impacto === "resta" ? -Math.abs(cantidad) : cantidad;
  const signo = impacto !== "neutro" && valor > 0 ? "+" : "";
  return `${signo}${valor} días`;
}

/**
 * Formatea un TOTAL ya agregado (resumen histórico). Para minutos, en
 * horas, mismo criterio que formatearCantidad. Para días, a diferencia de
 * formatearCantidad, acá el número que llega ya tiene el signo correcto
 * resuelto por quien lo calculó (informes.ts: neto con calcularEfecto en
 * modo agregado, suma cruda en modo específico — no hay un "impacto" único
 * cuando el resumen combina más de un tipo de novedad a la vez), así que
 * solo hace falta anteponerle el "+" si es positivo.
 */
function formatearMonto(cantidad: number, unidad: "dias" | "minutos") {
  if (unidad === "minutos") return formatearMinutosComoHoras(cantidad);
  const signo = cantidad > 0 ? "+" : "";
  return `${signo}${cantidad} días`;
}

/** "—" si el total es 0 — evita imprimir "0 días" en una fila que en
 * realidad solo tiene minutos (o viceversa). */
export function celdaResumen(total: number, unidad: "dias" | "minutos") {
  return total === 0 ? "—" : formatearMonto(total, unidad);
}

export async function generarPdf(
  datos: DatosInforme,
  organizacionNombre: string,
) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF();
  const titulo = `Informe de novedades — ${datos.filtroLabel}`;
  const subtitulo = `${organizacionNombre} — ${datos.periodoLabel}`;

  doc.setFontSize(14);
  doc.text(titulo, 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(subtitulo, 14, 25);

  // Sin "Cargado por" (AGREGADO 2026-10-01): el PDF es para presentar
  // (ej. a un personal o a un tercero), no un registro de auditoría interno
  // — quién cargó cada novedad queda solo en el Excel y en la ficha.
  const filasMovimientos = datos.movimientos.map((m) => [
    formatearFecha(m.fecha),
    m.operarioNombre,
    m.tipoNombre,
    formatearCantidad(m.cantidad, m.tipoUnidad, m.tipoImpacto),
    m.observaciones ?? "",
  ]);

  autoTable(doc, {
    startY: 32,
    head: [["Fecha", "Persona", "Tipo", "Cantidad", "Observaciones"]],
    body: filasMovimientos,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [31, 77, 76] },
  });

  if (datos.resumen) {
    const finTabla =
      (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
        ?.finalY ?? 32;

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("Resumen (histórico acumulado)", 14, finTabla + 12);

    autoTable(doc, {
      startY: finTabla + 16,
      head: [["Persona", "Total días", "Total horas"]],
      body: datos.resumen.map((r) => [
        r.nombre,
        celdaResumen(r.totalDias, "dias"),
        celdaResumen(r.totalMinutos, "minutos"),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [31, 77, 76] },
    });
  }

  doc.save(nombreArchivo(datos, "pdf"));
}

export async function generarExcel(
  datos: DatosInforme,
  organizacionNombre: string,
) {
  const XLSX = await import("xlsx");

  const hojaNovedades = XLSX.utils.json_to_sheet(
    datos.movimientos.map((m) => ({
      Fecha: formatearFecha(m.fecha),
      Persona: m.operarioNombre,
      Tipo: m.tipoNombre,
      // Mismo criterio que en el PDF: para días, el número refleja el
      // efecto real en el saldo, no el valor crudo siempre-positivo
      // guardado. Para minutos, en horas (decimal, ej. 1.5) — a pedido
      // explícito de Dante — no como texto, para que siga siendo un
      // número usable en Excel.
      Cantidad:
        m.tipoUnidad === "minutos"
          ? Math.round((m.cantidad / 60) * 100) / 100
          : m.tipoImpacto === "resta"
            ? -Math.abs(m.cantidad)
            : m.cantidad,
      Unidad: m.tipoUnidad === "minutos" ? "horas" : "días",
      Observaciones: m.observaciones ?? "",
      "Cargado por": m.cargadoPor,
    })),
  );

  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hojaNovedades, "Novedades");

  if (datos.resumen) {
    const hojaResumen = XLSX.utils.json_to_sheet(
      datos.resumen.map((r) => ({
        Persona: r.nombre,
        "Total histórico (días)": r.totalDias,
        "Total histórico (horas)":
          Math.round((r.totalMinutos / 60) * 100) / 100,
      })),
    );
    XLSX.utils.book_append_sheet(libro, hojaResumen, "Resumen");
  }

  XLSX.utils.sheet_add_aoa(
    hojaNovedades,
    [[`${organizacionNombre} — ${datos.periodoLabel} — ${datos.filtroLabel}`]],
    { origin: -1 },
  );

  XLSX.writeFile(libro, nombreArchivo(datos, "xlsx"));
}
