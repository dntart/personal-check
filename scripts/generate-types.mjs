#!/usr/bin/env node
// Genera src/types/database.ts a partir del schema `personalcheck` real en
// Supabase. Cross-platform a propósito (Node puro, sin sintaxis de shell)
// porque este portfolio se desarrolla tanto en Windows como en otros SO.
//
// Uso:
//   npm run types:generate
//
// Requiere SUPABASE_DB_URL en el entorno (ver .env.example): la connection
// string de Postgres del proyecto Supabase COMPARTIDO del portfolio
// (Project Settings > Database > Connection string > "URI"). No hace falta
// `supabase login` ni linkear el repo — el CLI se conecta directo a la DB.

import { spawnSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Carga .env.local si existe (no falla si todavía no lo creaste).
try {
  process.loadEnvFile(join(__dirname, "..", ".env.local"));
} catch {
  // sin .env.local todavía — seguimos, el chequeo de SUPABASE_DB_URL de
  // abajo va a explicar qué falta.
}

const dbUrl = process.env.SUPABASE_DB_URL;

if (!dbUrl) {
  console.error(
    "Falta SUPABASE_DB_URL. Copiá .env.example a .env.local y completá esa " +
      "variable con la connection string de Postgres del proyecto Supabase " +
      "compartido del portfolio (Project Settings > Database > Connection " +
      'string > "URI"), después volvé a correr `npm run types:generate`.',
  );
  process.exit(1);
}

const outPath = join(__dirname, "..", "src", "types", "database.ts");

console.log("Generando tipos desde el schema `personalcheck`...");

const resultado = spawnSync(
  "npx",
  [
    "supabase",
    "gen",
    "types",
    "typescript",
    "--db-url",
    dbUrl,
    "--schema",
    "personalcheck",
  ],
  { encoding: "utf-8", shell: true },
);

if (resultado.status !== 0) {
  console.error(resultado.stderr || "Falló `supabase gen types typescript`.");
  process.exit(resultado.status ?? 1);
}

const encabezado = `// Generado automáticamente — NO editar a mano.
// Fuente: schema \`personalcheck\` del proyecto Supabase compartido del portfolio.
// Regenerar con: npm run types:generate
`;

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, encabezado + resultado.stdout);

console.log(`Listo: ${outPath}`);
