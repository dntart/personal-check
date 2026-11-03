import { describe, it, expect } from "vitest";
import { formatearCantidad, celdaResumen } from "./generar-informe";

describe("formatearCantidad — una novedad puntual", () => {
  it("minutos: siempre en horas, el impacto no cambia el formato (todos son neutro)", () => {
    expect(formatearCantidad(90, "minutos", "neutro")).toBe("1 h 30 min");
    expect(formatearCantidad(90, "minutos", "suma")).toBe("1 h 30 min");
    expect(formatearCantidad(90, "minutos", "resta")).toBe("1 h 30 min");
  });

  it("días con impacto resta: signo negativo (regresión del bug real reportado — 'Día compensado tomado' mostraba +1 en vez de -1)", () => {
    expect(formatearCantidad(1, "dias", "resta")).toBe("-1 días");
    expect(formatearCantidad(3, "dias", "resta")).toBe("-3 días");
  });

  it("días con impacto suma: signo positivo", () => {
    expect(formatearCantidad(1, "dias", "suma")).toBe("+1 días");
    expect(formatearCantidad(2, "dias", "suma")).toBe("+2 días");
  });

  it("días con impacto neutro: sin signo", () => {
    expect(formatearCantidad(1, "dias", "neutro")).toBe("1 días");
  });

  it("cantidad 0 en días: nunca debe mostrar '-0 días'", () => {
    expect(formatearCantidad(0, "dias", "resta")).toBe("0 días");
    expect(formatearCantidad(0, "dias", "suma")).toBe("0 días");
  });
});

describe("celdaResumen — total agregado del resumen histórico", () => {
  it("total 0: muestra un guion, no '0 días'/'0 min'", () => {
    expect(celdaResumen(0, "dias")).toBe("—");
    expect(celdaResumen(0, "minutos")).toBe("—");
  });

  it("días positivos: con signo +", () => {
    expect(celdaResumen(5, "dias")).toBe("+5 días");
  });

  it("días negativos: el signo ya viene resuelto por quien suma (calcularEfecto), no se le agrega otro", () => {
    expect(celdaResumen(-3, "dias")).toBe("-3 días");
  });

  it("minutos: siempre en horas", () => {
    expect(celdaResumen(90, "minutos")).toBe("1 h 30 min");
  });
});
