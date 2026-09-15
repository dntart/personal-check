import { z } from "zod";

export const invitarSupervisorSchema = z.object({
  nombre: z.string().trim().min(1, "Ingresá un nombre"),
  email: z.email("Ingresá un email válido"),
  areaIds: z.array(z.string().uuid()).min(1, "Elegí al menos un área"),
});
