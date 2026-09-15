#!/usr/bin/env node
// Genera src/types/database.ts a partir del schema `personalcheck` real en
// Supabase. Cross-platform a propósito (Node puro, sin sintaxis de shell)
// porque este portfolio se desarrolla tanto en Windows como en otros SO.
//
// Uso:
//   npm run types:generate
//
// Requiere en el entorno (ver .env.example):
//   SUPABASE_ACCESS_TOKEN  — token personal de tu cuenta Supabase (uno solo
//                            te sirve para todos tus SaaS, se genera en
//                            https://supabase.com/dashboard/account/tokens)
//   SUPABASE_PROJECT_ID    — el project ref del proyecto compartido
//                            (se ve en la URL del dashboard:
//                            supabase.com/dashboard/project/<ESTO>)
//
// Deliberadamente NO usa `--db-url` (esa variante del CLI necesita Docker
// Desktop corriendo localmente para levantar un contenedor interno) — este
// método pega directo contra la Management API de Supabase.

import { spawnSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Carga .env.local si existe (no falla si todavía no lo creaste).
try {
  process.loadEnvFile(join(__dirname, "..", ".env.local"));
} catch {
  // sin .env.local todavía — seguimos, los chequeos de abajo explican qué falta.
}

const { SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_ID } = process.env;

const faltantes = [
  !SUPABASE_ACCESS_TOKEN && "SUPABASE_ACCESS_TOKEN",
  !SUPABASE_PROJECT_ID && "SUPABASE_PROJECT_ID",
].filter(Boolean);

if (faltantes.length > 0) {
  console.error(
    `Falta ${faltantes.join(" y ")} en .env.local (ver .env.example).\n\n` +
      "SUPABASE_ACCESS_TOKEN: generalo en https://supabase.com/dashboard/account/tokens\n" +
      "SUPABASE_PROJECT_ID: el project ref del proyecto compartido (se ve en la URL\n" +
      "del dashboard: supabase.com/dashboard/project/<ESTO>)",
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
    "--project-id",
    SUPABASE_PROJECT_ID,
    "--schema",
    "personalcheck",
  ],
  {
    encoding: "utf-8",
    shell: true,
    env: { ...process.env, SUPABASE_ACCESS_TOKEN },
  },
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
