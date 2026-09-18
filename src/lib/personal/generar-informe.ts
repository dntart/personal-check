// Generación de PDF/Excel — deliberadamente client-side (spec sección 2:
// "PDF client-side (jsPDF, como en el prototipo)"). Los imports de jsPDF/
// xlsx son dinámicos para no meterlos en el bundle inicial de cada página.
import type { DatosInforme } from "./informes";
import { formatearFecha } from "./reglas";

export const NOMBRE_MES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function nombreArchivo(datos: DatosInforme, extension: string) {
  const mesStr = String(datos.mes).padStart(2, "0");
  return `personalcheck-${datos.anio}-${mesStr}.${extension}`;
}

// Exportadas para que la vista previa (InformeDescarga) muestre exactamente
// el mismo formato que termina en el PDF/Excel — una sola fuente de verdad.
export function formatearCantidad(
  cantidad: number,
  unidad: "dias" | "minutos",
) {
  const signo = cantidad > 0 ? "+" : "";
  return `${signo}${cantidad} ${unidad === "minutos" ? "min" : "días"}`;
}

/** "—" si el total es 0 — evita imprimir "0 días" en una fila que en
 * realidad solo tiene minutos (o viceversa). */
export function celdaResumen(total: number, unidad: "dias" | "minutos") {
  return total === 0 ? "—" : formatearCantidad(total, unidad);
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
  const subtitulo = `${organizacionNombre} — ${NOMBRE_MES[datos.mes - 1]} ${datos.anio}`;

  doc.setFontSize(14);
  doc.text(titulo, 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(subtitulo, 14, 25);

  const filasMovimientos = datos.movimientos.map((m) => [
    formatearFecha(m.fecha),
    m.operarioNombre,
    m.tipoNombre,
    formatearCantidad(m.cantidad, m.tipoUnidad),
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
      Cantidad: m.cantidad,
      Unidad: m.tipoUnidad === "minutos" ? "minutos" : "días",
      Observaciones: m.observaciones ?? "",
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
    [
      [
        `${organizacionNombre} — ${NOMBRE_MES[datos.mes - 1]} ${datos.anio} — ${datos.filtroLabel}`,
      ],
    ],
    { origin: -1 },
  );

  XLSX.writeFile(libro, nombreArchivo(datos, "xlsx"));
}
