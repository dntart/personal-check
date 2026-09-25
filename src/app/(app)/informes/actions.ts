"use server";

import { obtenerSesion } from "@/lib/supabase/sesion";
import {
  obtenerInforme,
  type DatosInforme,
  type ParametrosInforme,
} from "@/lib/personal/informes";

/**
 * Trae los datos del informe para que el cliente arme el PDF/Excel (spec
 * sección 5). La generación del archivo en sí es client-side (jsPDF/xlsx,
 * como en el prototipo) — acá solo se resuelve el acceso a datos, con RLS
 * aplicado normal.
 */
export async function obtenerDatosInformeAction(
  mes: number,
  anio: number,
  params: ParametrosInforme,
  incluirResumen: boolean,
  operario?: { id: string; nombre: string },
): Promise<DatosInforme | { error: string }> {
  const sesion = await obtenerSesion();
  if (!sesion) return { error: "No hay sesión activa." };

  return obtenerInforme(mes, anio, params, incluirResumen, operario);
}
