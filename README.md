# PersonalCheck

Micro-SaaS de gestión de personal para PyMEs con operarios por turno. Ver el
spec funcional y de datos completo en [`docs/PERSONALCHECK-SPEC.md`](docs/PERSONALCHECK-SPEC.md)
antes de tocar código — es la fuente de verdad de decisiones ya validadas.

Prototipo navegable (UX/flujo/copy de referencia): ver link en la sección 1
del spec.

## Stack

Next.js (App Router) + TypeScript + Tailwind, sobre el proyecto Supabase
compartido del portfolio (schema propio `personalcheck`). Ver
`saas-shared-infra` (skill del portfolio) para la arquitectura compartida.

## Setup local

```bash
npm install
cp .env.example .env.local   # completar con las credenciales del proyecto Supabase compartido
npm run dev
```

> Nota: `@supabase/supabase-js` pide Node >=22; el entorno local actual tiene
> Node 20 (funciona igual, es solo un warning de npm). Alinear la versión de
> Node en Vercel al deployar.

## Migraciones de base de datos

Están en [`docs/migrations/`](docs/migrations/), aplicar en este orden con
Supabase CLI apuntando al proyecto compartido del portfolio:

1. `20260902_personalcheck_initial_schema.sql`
2. `20260914_personalcheck_super_admin_y_alcance_area.sql`
3. `20260914_personalcheck_tardanza_y_unidad.sql`

## Ramas

- `main` — producción
- `dev` — integración
- `feature/nombre-corto` — trabajo en curso

## Estructura

```
src/
  app/              # rutas (App Router)
  components/
  lib/
    supabase/       # clientes browser/server
    ai-proxy/       # si este SaaS termina usando el proxy de IA compartido
    validations/    # esquemas zod
  types/
  proxy.ts          # refresco de sesión + protección de rutas (convención Next.js 16)
```

## Estado

Fase 1 del roadmap (ver spec, sección 8): MVP funcional — auth de admin por
invitación, nómina, horarios versionados, novedades, auditoría de solo
lectura. Todavía no aplicado a este scaffold.
