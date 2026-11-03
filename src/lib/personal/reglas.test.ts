import { describe, it, expect } from "vitest";
import {
  calcularTurno,
  formatearHora,
  formatearFecha,
  calcularEfecto,
  formatearMinutosComoHoras,
  esAdministracion,
  esBloque30,
  OPCIONES_BLOQUE_30,
} from "./reglas";

describe("calcularTurno", () => {
  it("antes de las 13:00 es mañana", () => {
    expect(calcularTurno("08:00:00")).toBe("manana");
    expect(calcularTurno("12:59:59")).toBe("manana");
  });

  it("13:00 en adelante es tarde", () => {
    expect(calcularTurno("13:00:00")).toBe("tarde");
    expect(calcularTurno("18:30:00")).toBe("tarde");
  });
});

describe("formatearHora", () => {
  it("recorta los segundos", () => {
    expect(formatearHora("08:00:00")).toBe("08:00");
    expect(formatearHora("00:00:00")).toBe("00:00");
  });
});

describe("formatearFecha", () => {
  it("convierte ISO a dd/mm/aaaa sin pasar por Date (evita el corrimiento de huso horario)", () => {
    expect(formatearFecha("2026-09-18")).toBe("18/09/2026");
    expect(formatearFecha("2026-01-01")).toBe("01/01/2026");
    expect(formatearFecha("2026-12-31")).toBe("31/12/2026");
  });
});

describe("calcularEfecto", () => {
  it("resta: devuelve la cantidad negada", () => {
    expect(calcularEfecto("resta", 1)).toBe(-1);
    expect(calcularEfecto("resta", 5)).toBe(-5);
  });

  it("suma: devuelve la cantidad tal cual", () => {
    expect(calcularEfecto("suma", 1)).toBe(1);
    expect(calcularEfecto("suma", 0)).toBe(0);
  });

  it("neutro: siempre 0, sin importar la cantidad", () => {
    expect(calcularEfecto("neutro", 999)).toBe(0);
    expect(calcularEfecto("neutro", 0)).toBe(0);
  });
});

describe("formatearMinutosComoHoras", () => {
  it("menos de 60 minutos: solo minutos", () => {
    expect(formatearMinutosComoHoras(0)).toBe("0 min");
    expect(formatearMinutosComoHoras(30)).toBe("30 min");
    expect(formatearMinutosComoHoras(59)).toBe("59 min");
  });

  it("múltiplo exacto de 60: solo horas", () => {
    expect(formatearMinutosComoHoras(60)).toBe("1 h");
    expect(formatearMinutosComoHoras(120)).toBe("2 h");
  });

  it("mezcla de horas y minutos", () => {
    expect(formatearMinutosComoHoras(90)).toBe("1 h 30 min");
    expect(formatearMinutosComoHoras(125)).toBe("2 h 5 min");
  });
});

describe("esAdministracion", () => {
  it("coincide sin importar mayúsculas o espacios", () => {
    expect(esAdministracion("Administración")).toBe(true);
    expect(esAdministracion("administración")).toBe(true);
    expect(esAdministracion("  ADMINISTRACIÓN  ")).toBe(true);
  });

  it("no coincide con otras áreas", () => {
    expect(esAdministracion("Producción")).toBe(false);
    expect(esAdministracion("Depósito")).toBe(false);
  });

  it("OJO: no coincide si falta la tilde — comparación de string exacta, no normaliza acentos", () => {
    expect(esAdministracion("Administracion")).toBe(false);
  });
});

describe("esBloque30", () => {
  it("todos los tipos en minutos del catálogo usan bloques de 30", () => {
    expect(esBloque30("tardanza_injustificada")).toBe(true);
    expect(esBloque30("tardanza_justificada")).toBe(true);
    expect(esBloque30("cambio_horario")).toBe(true);
    expect(esBloque30("hora_extra_trabajada")).toBe(true);
    expect(esBloque30("salida_anticipada_injustificada")).toBe(true);
    expect(esBloque30("salida_anticipada_justificada")).toBe(true);
  });

  it("los tipos en días no usan bloques de 30", () => {
    expect(esBloque30("compensado_tomado")).toBe(false);
    expect(esBloque30("falta_injustificada")).toBe(false);
    expect(esBloque30("falta_justificada")).toBe(false);
    expect(esBloque30("dia_extra_trabajado")).toBe(false);
    expect(esBloque30("licencia_anual_ordinaria")).toBe(false);
    expect(esBloque30("licencia_extraordinaria")).toBe(false);
    expect(esBloque30("cambio_dia")).toBe(false);
    expect(esBloque30("ajuste_manual")).toBe(false);
  });

  it("undefined no es bloque de 30", () => {
    expect(esBloque30(undefined)).toBe(false);
  });
});

describe("OPCIONES_BLOQUE_30", () => {
  it("8 opciones, de 30 en 30, hasta 4 horas", () => {
    expect(OPCIONES_BLOQUE_30).toEqual([30, 60, 90, 120, 150, 180, 210, 240]);
  });
});
