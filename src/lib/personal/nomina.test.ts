import { describe, it, expect } from "vitest";
import {
  agruparParaNomina,
  filtrarNomina,
  filtrarPorNombre,
  type AreaNomina,
  type PersonaNomina,
} from "./nomina";

describe("agruparParaNomina", () => {
  const areas = [
    { id: "a1", nombre: "Producción" },
    { id: "a2", nombre: "Administración" },
    { id: "a3", nombre: "Área sin nadie" },
  ];
  const operarios = [
    { id: "o1", nombre: "Juan", area_id: "a1" }, // horario de mañana
    { id: "o2", nombre: "Ana", area_id: "a2" }, // administración
    { id: "o3", nombre: "Luis", area_id: "a1" }, // sin horario cargado
  ];
  const horariosPorOperario = new Map([
    [
      "o1",
      [
        {
          operario_id: "o1",
          dia_semana: 1,
          hora_inicio: "08:00:00",
          hora_fin: "16:00:00",
        },
      ],
    ],
    [
      "o2",
      [
        {
          operario_id: "o2",
          dia_semana: 1,
          hora_inicio: "09:00:00",
          hora_fin: "17:00:00",
        },
      ],
    ],
  ]);
  const saldoPorOperario = new Map([
    ["o1", 5],
    ["o2", 0],
  ]);
  const minutosTardanzaPorOperario = new Map([["o1", 10]]);
  const minutosExtraPorOperario = new Map([["o1", 60]]);

  const resultado = agruparParaNomina(
    areas,
    operarios,
    horariosPorOperario,
    saldoPorOperario,
    minutosTardanzaPorOperario,
    minutosExtraPorOperario,
  );

  it("descarta las áreas sin ningún operario", () => {
    expect(resultado.map((a) => a.areaId)).toEqual(["a1", "a2"]);
  });

  it("agrupa por turno según la hora de inicio del horario", () => {
    const produccion = resultado.find((a) => a.areaId === "a1")!;
    const manana = produccion.bloques.find((b) => b.turno === "manana")!;
    const tarde = produccion.bloques.find((b) => b.turno === "tarde")!;
    expect(manana.personas.map((p) => p.id)).toEqual(["o1"]);
    expect(tarde.personas).toEqual([]);
  });

  it("marca día sin horario como 'franco' y el día cargado como 'horario'", () => {
    const produccion = resultado.find((a) => a.areaId === "a1")!;
    const manana = produccion.bloques.find((b) => b.turno === "manana")!;
    const juan = manana.personas[0];
    expect(juan.dias.find((d) => d.diaSemana === 1)).toEqual({
      diaSemana: 1,
      estado: "horario",
      horaInicio: "08:00:00",
      horaFin: "16:00:00",
    });
    expect(juan.dias.find((d) => d.diaSemana === 2)?.estado).toBe("franco");
  });

  it("a alguien sin horario cargado lo deja en 'sinHorario', no en ningún bloque", () => {
    const produccion = resultado.find((a) => a.areaId === "a1")!;
    expect(produccion.sinHorario.map((p) => p.id)).toEqual(["o3"]);
    expect(
      produccion.bloques.flatMap((b) => b.personas.map((p) => p.id)),
    ).not.toContain("o3");
  });

  it("Administración queda en un único bloque (turno null), no se parte en mañana/tarde", () => {
    const administracion = resultado.find((a) => a.areaId === "a2")!;
    expect(administracion.bloques).toHaveLength(1);
    expect(administracion.bloques[0].turno).toBeNull();
    expect(administracion.bloques[0].personas.map((p) => p.id)).toEqual(["o2"]);
  });

  it("arrastra saldo, tardanza y hora extra a cada persona", () => {
    const produccion = resultado.find((a) => a.areaId === "a1")!;
    const juan = produccion.bloques.find((b) => b.turno === "manana")!
      .personas[0];
    expect(juan.saldo).toBe(5);
    expect(juan.minutosTardanza).toBe(10);
    expect(juan.minutosExtra).toBe(60);
  });

  it("alguien sin fila en los mapas de saldo/tardanza/extra queda en 0, no undefined", () => {
    const produccion = resultado.find((a) => a.areaId === "a1")!;
    const luis = produccion.sinHorario[0];
    expect(luis.saldo).toBe(0);
    expect(luis.minutosTardanza).toBe(0);
    expect(luis.minutosExtra).toBe(0);
  });
});

describe("filtrarNomina", () => {
  function persona(p: Partial<PersonaNomina> & { id: string }): PersonaNomina {
    return {
      nombre: p.id,
      saldo: 0,
      minutosTardanza: 0,
      minutosExtra: 0,
      dias: [],
      ...p,
    };
  }

  const areas: AreaNomina[] = [
    {
      areaId: "a1",
      areaNombre: "Producción",
      esAdministracion: false,
      bloques: [
        {
          turno: "manana",
          personas: [
            persona({ id: "negativo", saldo: -2 }),
            persona({ id: "positivo", saldo: 3 }),
            persona({ id: "cero", saldo: 0 }),
            persona({ id: "saldo-alto", saldo: 15 }), // umbral exacto
            persona({ id: "horas-extra-altas", minutosExtra: 240 }), // umbral exacto
          ],
        },
      ],
      sinHorario: [],
    },
  ];

  it("sin filtro: devuelve todo sin tocar", () => {
    expect(filtrarNomina(areas, undefined)).toEqual(areas);
  });

  it("negativo: solo saldo < 0", () => {
    const resultado = filtrarNomina(areas, "negativo");
    const ids = resultado[0].bloques[0].personas.map((p) => p.id);
    expect(ids).toEqual(["negativo"]);
  });

  it("positivo: solo saldo > 0 (el saldo 0 queda afuera)", () => {
    const resultado = filtrarNomina(areas, "positivo");
    const ids = resultado[0].bloques[0].personas.map((p) => p.id);
    expect(ids).toEqual(["positivo", "saldo-alto"]);
  });

  it("alertas: saldo negativo, saldo >= 15, o >= 240 minutos de hora extra (umbrales inclusivos)", () => {
    const resultado = filtrarNomina(areas, "alertas");
    const ids = resultado[0].bloques[0].personas.map((p) => p.id);
    expect(ids).toEqual(["negativo", "saldo-alto", "horas-extra-altas"]);
  });

  it("si un área queda sin nadie tras filtrar, se descarta entera", () => {
    const soloPositivos: AreaNomina[] = [
      {
        areaId: "a2",
        areaNombre: "Sin nadie en rojo",
        esAdministracion: false,
        bloques: [
          { turno: "manana", personas: [persona({ id: "x", saldo: 1 })] },
        ],
        sinHorario: [],
      },
    ];
    expect(filtrarNomina(soloPositivos, "negativo")).toEqual([]);
  });
});

describe("filtrarPorNombre", () => {
  function persona(id: string, nombre: string): PersonaNomina {
    return {
      id,
      nombre,
      saldo: 0,
      minutosTardanza: 0,
      minutosExtra: 0,
      dias: [],
    };
  }

  const areas: AreaNomina[] = [
    {
      areaId: "a1",
      areaNombre: "Producción",
      esAdministracion: false,
      bloques: [
        {
          turno: "manana",
          personas: [persona("1", "José Pérez"), persona("2", "Ada Ampuero")],
        },
      ],
      sinHorario: [persona("3", "María Gómez")],
    },
  ];

  it("ignora tildes y mayúsculas", () => {
    const resultado = filtrarPorNombre(areas, "jose");
    expect(resultado[0].bloques[0].personas.map((p) => p.id)).toEqual(["1"]);
  });

  it("busca por coincidencia parcial, en cualquier parte del nombre", () => {
    const resultado = filtrarPorNombre(areas, "mar");
    expect(resultado[0].sinHorario.map((p) => p.id)).toEqual(["3"]);
  });

  it("búsqueda vacía devuelve todo sin tocar", () => {
    expect(filtrarPorNombre(areas, "   ")).toEqual(areas);
  });

  it("sin coincidencias, descarta el área entera", () => {
    expect(filtrarPorNombre(areas, "zzz")).toEqual([]);
  });
});
