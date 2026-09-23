# PersonalCheck

Micro-SaaS de gestión de personal para PyMEs con operarios por turno. Ver el
spec funcional y de datos completo en [`docs/PERSONALCHECK-SPEC.md`](docs/PERSONALCHECK-SPEC.md)
antes de tocar código — es la fuente de verdad de decisiones ya validadas.

Prototipo navegable (UX/flujo/copy de referencia): ver link en la sección 1
del spec.

**En producción**: https://personal-check-omega.vercel.app

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

> Nota: `@supabase/supabase-js` pide Node >=22; el entorno local puede tener
> Node 20 (funciona igual, es solo un warning de npm). `package.json` ya
> fija `engines.node >= 22` para el deploy.

## Migraciones de base de datos

Están en [`docs/migrations/`](docs/migrations/), aplicar en este orden (vía
SQL Editor del dashboard, o directo por conexión a Postgres, apuntando al
proyecto compartido del portfolio):

1. `20260902_personalcheck_initial_schema.sql`
2. `20260914_personalcheck_super_admin_y_alcance_area.sql`
3. `20260914_personalcheck_tardanza_y_unidad.sql`
4. `20260915_personalcheck_org_actual_respeta_suspension.sql`
5. `20260915_personalcheck_grants_api_roles.sql` — **no te la saltees**: sin
   esto, la Data API devuelve `permission denied for schema personalcheck`
   aunque el schema esté expuesto en Project Settings > Data API
6. `20260915_personalcheck_admins_eliminados_pierden_acceso.sql`
7. `20260915_personalcheck_auditoria_solo_admin.sql`
8. `20260915_personalcheck_tardanza_justificada.sql` — separa Tardanza en
   injustificada/justificada (decisión de negocio que reemplaza a la
   original del spec)
9. `20260917_personalcheck_salida_anticipada.sql` — agrega Salida
   anticipada injustificada/justificada (mismo patrón que Tardanza)
10. `20260918_personalcheck_licencia_anual_ordinaria.sql` — agrega Licencia
    Anual Ordinaria (neutra, no toca el banco de días compensatorio)
11. `20260918_personalcheck_cambio_dia_y_horario.sql` — agrega Cambio de
    día y Cambio de horario (avisos, no movimientos de saldo)
12. `20260918_personalcheck_cambio_horario_minutos.sql` — corrige la unidad
    de Cambio de horario a minutos (igual que Tardanza)
13. `20260918_personalcheck_auditoria_escritura_supervisor.sql` — **no te
    la saltees**: corrige un bug real donde un Supervisor no podía escribir
    en Auditoría (solo se había restringido lectura por error, la policy
    también bloqueaba el INSERT) — sin esto, ninguna acción de un
    Supervisor queda en el historial
14. `20260922_personalcheck_dividir_extra_trabajado.sql` — renombra "Día/hora
    extra trabajado" a "Día extra trabajado" (mismo tipo, mismos
    movimientos ya cargados) y agrega "Hora extra trabajada" (minutos,
    bloques de 30, neutra)
15. `20260922_personalcheck_licencia_extraordinaria.sql` — agrega Licencia
    Extraordinaria (mismo tratamiento que Licencia Anual Ordinaria)

Además, en **Project Settings > Data API**, el schema `personalcheck` y sus
10 tablas tienen que estar tildados en "Exposed schemas" / "Exposed tables"
— a diferencia de `public`, un schema nuevo no se expone solo.

Los seeds con datos reales de clientes (nombres de personas) viven en
`docs/seeds/` **fuera del repo** (gitignored a propósito) — pedile el
archivo a Dante si necesitás recargarlos, nunca van a control de versiones.

## Deploy

Vercel, cuenta compartida del portfolio (proyecto `personal-check`).

**Variables de entorno de producción** (`vercel env add <NOMBRE> production`):
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL` (la URL de producción
real — hay que actualizarla si el dominio cambia, y redeployar).
`RESEND_API_KEY`/`RESEND_FROM_EMAIL` opcionales — sin ellas, las alertas de
saldo solo se loguean en vez de mandarse de verdad.

**Supabase Auth → `uri_allow_list`** tiene que incluir la URL de producción
(`https://tu-dominio/*`) — si no, el link de invitación de un admin/
supervisor puede no redirigir bien. Se administra vía la Management API
(`PATCH /v1/projects/{ref}/config/auth`) con `SUPABASE_ACCESS_TOKEN`, sin
tocar el `site_url` (es compartido con el resto del portfolio).

```bash
npx vercel --prod
```

## Ramas

- `main` — producción
- `dev` — integración
- `feature/nombre-corto` — trabajo en curso

## Estructura

```
src/
  app/
    (app)/          # rutas autenticadas (layout compartido con nav)
    login/
    invitacion/     # el invitado crea su contraseña acá
  components/
  lib/
    supabase/       # clientes browser/server + Auth Admin API
    personal/       # reglas de negocio, queries, informes
    validations/    # esquemas zod
  types/
  proxy.ts          # refresco de sesión + protección de rutas (convención Next.js 16)
```

## Generar tipos TS desde la base real

```bash
npm run types:generate
```

Requiere `SUPABASE_ACCESS_TOKEN` (personal, de tu cuenta:
supabase.com/dashboard/account/tokens) y `SUPABASE_PROJECT_ID` en
`.env.local` — ver `.env.example`. No usa Docker ni la contraseña de la
base, pega directo contra la Management API de Supabase.

## Estado

Fases 1 a 3 del roadmap (ver spec, sección 8) completas:

- **Fase 1 — MVP**: login por invitación, Nómina (agrupada por área/turno),
  alta/edición/baja de personal, horarios versionados, novedades con
  adjunto (por ahora un link, no upload real a Storage), Auditoría
- **Fase 2 — Reportes y alertas**: informes PDF/Excel (filtrables por mes y
  tipo), alertas de saldo por email
- **Fase 3 — Preparar para vender**: panel de Super Admin (alta de
  organización + invitación de su primer admin, suspender/reactivar),
  Supervisor con permisos acotados por área

**Pendiente, no por decisión técnica sino de negocio/datos:**

- Fase 4 (Stripe) — sin definir todavía (precio, plan)
- Fase 5 (importar reloj biométrico) — falta un archivo de ejemplo real
