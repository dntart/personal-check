import { z } from "zod";

export const altaPersonalSchema = z
  .object({
    nombre: z.string().trim().min(1, "Ingresá un nombre"),
    areaId: z.string().uuid().optional(),
    areaNueva: z.string().trim().optional(),
  })
  .refine((d) => d.areaId || (d.areaNueva && d.areaNueva.length > 0), {
    message: "Elegí un área existente o escribí una nueva",
    path: ["areaId"],
  });

export const horarioDiaSchema = z.object({
  diaSemana: z.number().int().min(1).max(7),
  activo: z.boolean(),
  horaInicio: z.string().optional(),
  horaFin: z.string().optional(),
});

export const editarHorarioSchema = z.object({
  operarioId: z.string().uuid(),
  dias: z.array(horarioDiaSchema).length(7),
});

export const cargarNovedadSchema = z.object({
  operarioId: z.string().uuid(),
  tipoMovimientoId: z.string().uuid(),
  fecha: z.string().min(1, "Elegí una fecha"),
  cantidad: z.coerce.number(),
  observaciones: z.string().trim().optional(),
});

export const eliminarPersonalSchema = z.object({
  operarioId: z.string().uuid(),
  motivo: z.string().trim().min(1, "El motivo es obligatorio"),
});

export const editarNovedadSchema = z.object({
  movimientoId: z.string().uuid(),
  tipoMovimientoId: z.string().uuid(),
  fecha: z.string().min(1, "Elegí una fecha"),
  cantidad: z.coerce.number(),
  observaciones: z.string().trim().optional(),
  motivo: z.string().trim().min(1, "Contá brevemente qué se corrigió"),
});
