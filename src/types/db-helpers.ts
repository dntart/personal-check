// Helpers de conveniencia sobre database.ts (generado). Este archivo SÍ se
// edita a mano — no lo pisa `npm run types:generate`.
//
// Como el proyecto no tiene schema `public` (solo `personalcheck`), los
// helpers `Tables<>`/`TablesInsert<>`/etc. que el CLI genera al final de
// database.ts exigen pasar `{ schema: "personalcheck" }` en cada uso. Estos
// wrappers evitan repetirlo.
import type { Database } from "./database";

type PersonalcheckSchema = Database["personalcheck"];

export type Tables<T extends keyof PersonalcheckSchema["Tables"]> =
  PersonalcheckSchema["Tables"][T]["Row"];

export type TablesInsert<T extends keyof PersonalcheckSchema["Tables"]> =
  PersonalcheckSchema["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof PersonalcheckSchema["Tables"]> =
  PersonalcheckSchema["Tables"][T]["Update"];
