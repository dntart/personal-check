import { z } from "zod";

export const invitarOrganizacionSchema = z.object({
  nombreOrganizacion: z
    .string()
    .trim()
    .min(1, "Ingresá el nombre de la organización"),
  nombreAdmin: z.string().trim().min(1, "Ingresá el nombre del admin"),
  emailAdmin: z.email("Ingresá un email válido"),
});
