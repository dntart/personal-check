// Generación de PDF/Excel — deliberadamente client-side (spec sección 2:
// "PDF client-side (jsPDF, como en el prototipo)"). Los imports de jsPDF/
// xlsx son dinámicos para no meterlos en el bundle inicial de cada página.
import type { DatosInforme } from "./informes";
import { formatearFecha } from "./reglas";

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
 * Formatea la cantidad de UNA novedad puntual, con el signo que
 * corresponde a su efecto real en el saldo — no el signo del número crudo
 * guardado (que siempre es positivo, ej. "1" para un día compensado
 * tomado). Bug real reportado: "Día compensado tomado" (RESTA un día del
 * saldo) mostraba "+1", que se prestaba a confusión — ahora muestra "-1".
 * "neutro" no fuerza ningún signo — esa cantidad no afecta el saldo (ej.
 * minutos de tardanza), no tiene sentido sugerir un + o un -.
 */
export function formatearCantidad(
  cantidad: number,
  unidad: "dias" | "minutos",
  impacto: "suma" | "resta" | "neutro",
) {
  const valor = impacto === "resta" ? -Math.abs(cantidad) : cantidad;
  const signo = impacto !== "neutro" && valor > 0 ? "+" : "";
  return `${signo}${valor} ${unidad === "minutos" ? "min" : "días"}`;
}

/**
 * Formatea un TOTAL ya agregado (resumen histórico) — a diferencia de
 * formatearCantidad, acá el número que llega ya tiene el signo correcto
 * resuelto por quien lo calculó (informes.ts: neto con calcularEfecto en
 * modo agregado, suma cruda en modo específico — no hay un "impacto" único
 * cuando el resumen combina más de un tipo de novedad a la vez), así que
 * solo hace falta anteponerle el "+" si es positivo.
 */
function formatearMonto(cantidad: number, unidad: "dias" | "minutos") {
  const signo = cantidad > 0 ? "+" : "";
  return `${signo}${cantidad} ${unidad === "minutos" ? "min" : "días"}`;
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

  const filasMovimientos = datos.movimientos.map((m) => [
    formatearFecha(m.fecha),
    m.operarioNombre,
    m.tipoNombre,
    formatearCantidad(m.cantidad, m.tipoUnidad, m.tipoImpacto),
    m.observaciones ?? "",
    m.cargadoPor,
  ]);

  autoTable(doc, {
    startY: 32,
    head: [
      ["Fecha", "Persona", "Tipo", "Cantidad", "Observaciones", "Cargado por"],
    ],
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
      head: [["Persona", "Total días", "Total minutos"]],
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
      // Mismo criterio que en el PDF: el número refleja el efecto real en
      // el saldo, no el valor crudo siempre-positivo guardado.
      Cantidad: m.tipoImpacto === "resta" ? -Math.abs(m.cantidad) : m.cantidad,
      Unidad: m.tipoUnidad === "minutos" ? "minutos" : "días",
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
        "Total histórico (minutos)": r.totalMinutos,
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
