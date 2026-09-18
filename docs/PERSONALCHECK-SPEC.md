# PersonalCheck — Spec técnico y funcional

> **Cómo usar este documento**: esto es el handoff completo para reconstruir PersonalCheck desde cero en VS Code con Claude Code. Léelo entero antes de escribir código. Es autocontenido — no debería hacer falta volver a esta conversación para entender el qué y el porqué de cada decisión. El prototipo navegable (link abajo) es la referencia visual y de flujo; este documento es la referencia funcional y de datos.

---

## 1. Qué es PersonalCheck

Micro-SaaS de gestión de personal para PyMEs con operarios por turno (piloto: un taller textil). Lo usa el **encargado de RRHH**, no el personal operativo — el personal nunca tiene login propio.

Reemplaza un cuadro de horarios en papel/Excel por un sistema con:

- Nómina de personal editable, agrupada por turno y área
- Horarios versionados por fecha (se puede reconstruir el horario histórico exacto de cualquier persona)
- Un **banco de días** (crédito/débito) que se calcula solo a partir de "novedades" cargadas por el admin — nunca se infiere del reloj biométrico
- Auditoría inmutable de cada alta/edición/baja
- Alertas (campanita) para saldos negativos o excesivamente altos
- Informes en PDF, filtrables por mes y por tipo (a favor / a descontar / general)

**No está en el alcance del MVP**: portal de autoservicio para el personal, integración con liquidación de sueldos, lectura automática del reloj biométrico (queda como archivo aparte que el admin consulta manualmente).

**Modelo de venta**: multi-tenant — se vende a otras PyMEs, cada una como una organización aislada por RLS dentro del mismo proyecto Supabase.

**Prototipo de referencia (UX/flujo/copy)**: https://claude.ai/code/artifact/89b94413-4c6b-471d-a10f-17b93a4708c3
Es un HTML con datos mock — no tiene backend. Replicá el flujo de pantallas, la paleta y el copy en español que usa; no repliques su persistencia (ahí vive todo en memoria del navegador).

---

## 2. Stack

Igual al resto del portfolio de Dante (ver skill `saas-shared-infra`):

- **Frontend**: Next.js (App Router) + TypeScript
- **Hosting**: Vercel
- **Base de datos + Auth + Storage**: Supabase — **mismo proyecto compartido** que el resto del portfolio, schema propio `personalcheck` (no un proyecto Supabase nuevo)
- **Email transaccional** (invitaciones de admin, notificaciones): Resend
- **Pagos** (Fase 4, no MVP): Stripe con Managed Payments
- **PDF**: generación client-side (jsPDF, como en el prototipo) o server-side con una librería de Node si se prefiere — a definir en implementación, no es una decisión bloqueante
- **Excel**: SheetJS (xlsx), client-side — cada informe se puede descargar en PDF o en Excel (.xlsx, dos hojas: Novedades + Resumen), a elección del admin

---

## 3. Modelo de acceso y autenticación

Tres niveles de rol, cada uno con un alcance distinto — **ver también `20260914_personalcheck_super_admin_y_alcance_area.sql`** para el detalle técnico completo:

| Rol                       | Pertenece a una organización  | Puede                                                                                                                                                                                                                    | No puede                                                                         |
| ------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| **Super Admin** (Dante)   | No — opera por fuera de todas | Crear organizaciones nuevas, crear el primer admin de cada una, activar/desactivar una organización (suspensión reversible, no borra nada), entrar a los datos operativos de **cualquier** organización para dar soporte | — (acceso total, pero cada acción queda en `auditoria` igual que la de un admin) |
| **Admin de Organización** | Sí, una sola                  | Todo dentro de su organización: nómina, horarios, novedades, auditoría, invitar Supervisores                                                                                                                             | Ver o tocar datos de otra organización                                           |
| **Supervisor**            | Sí, una sola                  | Solo las áreas que su Admin le asignó (ej. "Textil" y "Tejido", pero no "Administración")                                                                                                                                | Ver áreas no asignadas, invitar a otros admins/supervisores                      |

- **Alta de administradores/supervisores: por invitación de correo únicamente. Nunca hay un formulario público de registro.**
  - Un Admin de Organización invita Supervisores desde dentro del sistema, y de paso les asigna qué área(s) pueden ver (tabla `admin_areas`).
  - El **primer admin de una organización nueva** lo crea el Super Admin — es un paso operativo de Dante (vía un panel propio o, en el arranque, directamente en Supabase), no un flujo dentro de la app del cliente.
- **Aislamiento entre SaaS**: PersonalCheck vive en su propio schema de Postgres (`personalcheck.*`) dentro del proyecto Supabase compartido con el resto del portfolio de Dante. Un schema es un espacio completamente aislado — ninguna tabla, política RLS o función de `personalcheck` tiene relación con las de otro SaaS (`alma.*`, etc.). Lo único compartido a nivel de todo el proyecto es `auth.users` (el login); los permisos de cada SaaS se resuelven aparte, contra su propia tabla de admins.
- **Suspensión de organización**: `organizaciones.activo = false` bloquea el acceso a nivel de RLS (no solo de interfaz) para toda esa organización — reversible con un solo update, no es un borrado.
- Sin invitación aceptada ni sesión activa, no se entra al sistema bajo ninguna circunstancia.

---

## 4. Modelo de datos

El schema completo, con RLS multi-tenant, está en `docs/migrations/` — la
lista completa y actualizada de migraciones (y el orden para aplicarlas)
vive en el [`README.md`](../README.md) del repo, no acá, para no mantener
dos listas desincronizadas.

No las dupliques acá; estas son las decisiones clave detrás de ese schema:

| Tabla                | Para qué                                              | Decisión clave                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `organizaciones`     | Un cliente = una fila                                 | Tenant raíz; `activo` (bool) para suspender sin borrar                                                                                                                                                                                                                                                                                                                                               |
| `admins`             | Únicos usuarios con login                             | `id` = `auth.users.id`; único email por organización; `rol` = `admin` / `supervisor`                                                                                                                                                                                                                                                                                                                 |
| `super_admins`       | Dante — por fuera de toda organización                | Sin `organizacion_id`; solo un super admin puede ver esta tabla                                                                                                                                                                                                                                                                                                                                      |
| `admin_areas`        | Qué área(s) puede ver cada Supervisor                 | Vacío para un `admin` (ve todo su organización); una fila por área asignada para un `supervisor`                                                                                                                                                                                                                                                                                                     |
| `areas`              | Tejido, Textil, Administración, etc.                  | Normalizado, no texto libre repetido por fila                                                                                                                                                                                                                                                                                                                                                        |
| `operarios`          | El personal (nunca loguean)                           | Soft delete — al "Eliminar personal" no se borra la fila (`deleted_at`), y el motivo ingresado por el admin queda en `auditoria.datos_nuevos`                                                                                                                                                                                                                                                        |
| `horarios_semanales` | Horario planificado, un registro por día de la semana | **Versionado por fecha** (`vigente_desde`/`vigente_hasta`). **El turno NO es un campo acá ni en `operarios`** — se calcula en el momento a partir de la hora de inicio de cada día (antes de las 13:00 = mañana, si no, tarde). Una persona puede tener días de mañana y de tarde en el mismo horario semanal (ej. viernes tarde + sábado mañana) sin necesitar ningún campo extra ni fila duplicada |
| `tipos_movimiento`   | Catálogo de novedades — **6 tipos fijos**, no 5       | **Fijo para todos los clientes** (no configurable por organización en el MVP). Tiene una columna `unidad` (`dias` / `minutos`) — ver tabla de reglas de negocio abajo                                                                                                                                                                                                                                |
| `movimientos`        | Cada novedad cargada (el banco de días)               | `observaciones` (texto libre) + `adjunto_url` (foto del justificativo vía Supabase Storage)                                                                                                                                                                                                                                                                                                          |
| `auditoria`          | Log inmutable de crear/editar/eliminar                | `datos_anteriores`/`datos_nuevos` en JSONB. El actor es `admin_id` **o** `super_admin_id` (nunca los dos) — así una acción de soporte del Super Admin queda igual de trazable que la de un admin común                                                                                                                                                                                               |

Todas las tablas con datos de negocio tienen `organizacion_id` indexado y RLS activado vía una función `personalcheck.org_actual()` que resuelve la organización del admin autenticado.

---

## 5. Reglas de negocio — el banco de días

El saldo de cada persona **nunca se calcula a partir del reloj de fichaje**. Se calcula exclusivamente sumando el efecto de sus movimientos cargados a mano por un admin. Esto desacopla el sistema del reloj biométrico (que queda como fuente de consulta manual aparte) y evita depender de integrarlo en el MVP.

**Catálogo fijo de tipos de movimiento**:

| Tipo                            | Unidad                      | Efecto en el saldo (días)                                              | Requiere adjunto                                                                                                       |
| ------------------------------- | --------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Falta injustificada             | Días                        | Resta                                                                  | No                                                                                                                     |
| Falta justificada               | Días                        | **Neutro — no suma ni resta** (queda solo registrada, con certificado) | **Sí, obligatorio** — TEMPORAL: desactivado desde 2026-09-17 (a pedido de Dante), no bloquea la carga; ver nota debajo |
| Día/hora extra trabajado        | Días                        | Suma                                                                   | No                                                                                                                     |
| Día compensado tomado           | Días                        | Resta                                                                  | No                                                                                                                     |
| Ajuste manual                   | Días                        | Variable — el signo lo define el admin al cargar la cantidad           | No                                                                                                                     |
| Tardanza injustificada          | **Minutos**                 | **Siempre neutro — nunca toca el saldo en días**                       | No                                                                                                                     |
| Tardanza justificada            | **Minutos**                 | **Siempre neutro — nunca toca el saldo en días**                       | No                                                                                                                     |
| Salida anticipada injustificada | **Minutos** (bloques de 30) | **Siempre neutro — nunca toca el saldo en días**                       | No                                                                                                                     |
| Salida anticipada justificada   | **Minutos** (bloques de 30) | **Siempre neutro — nunca toca el saldo en días**                       | No                                                                                                                     |
| Licencia Anual Ordinaria        | Días                        | **Neutro — no suma ni resta** (banco compensatorio es otra cuenta)     | No                                                                                                                     |

> **AGREGADO 2026-09-18** — Licencia Anual Ordinaria (vacaciones
> reglamentarias): a diferencia del resto del catálogo, no es una novedad
> "de excepción" sino algo pautado de antemano. Neutra a propósito — el
> banco de días es la cuenta de compensados/faltas, una cosa totalmente
> aparte de la licencia anual; esto es solo registro/historial.

> **AGREGADO 2026-09-17** — caso real: una persona pide permiso para
> retirarse antes por fuerza mayor (enfermedad, urgencia) y ficha la salida
> anticipada — el reloj biométrico marca menos horas de las que corresponden.
> No encajaba en ningún tipo existente: "Falta justificada" es para un día
> entero de ausencia (la persona no vino), no para quien vino y se retiró
> antes; "Tardanza" es el otro extremo del turno. Mismo patrón que
> tardanza_injustificada/justificada — neutro, solo registro/respaldo (el
> sistema nunca descuenta por el reloj automáticamente, sección 1). Se carga
> en bloques de 30 minutos (30, 60, 90…) en vez de minuto a minuto, a pedido
> de Dante, porque en la práctica los permisos se dan en medias horas.

> **TEMPORAL 2026-09-17** — el adjunto obligatorio de "Falta justificada" está
> desactivado en el código (`cargarNovedad`, `src/app/(app)/personal/[id]/novedad/actions.ts`,
> validación comentada, no borrada) porque todavía no existe el bucket de
> Supabase Storage para subir fotos — exigirlo sin tener dónde cargar la
> imagen bloqueaba cargar la novedad por completo. A pedido explícito de
> Dante: "permitamos por el momento avanzar con la carga sin poner como
> condición fotografía del certificado. ya luego lo modificaremos". Volver a
> exigirlo (descomentar) en cuanto el upload de fotos esté implementado —
> esto NO cambia la decisión de negocio de que sigue siendo obligatorio en
> el diseño, solo que no se puede hacer cumplir todavía.

> **ACTUALIZADO 2026-09-15** — esto reemplaza la decisión de más abajo que
> decía "no volver a preguntar". Caso real: el personal a veces ficha tarde
> por una causa ajena (ej. no le entregaron la llave a tiempo) y esa demora
> no debería anotarse como una tardanza real de la persona. Se separó
> siguiendo el mismo patrón que falta_injustificada/falta_justificada.

**Tardanza — reglas propias, separadas del resto del catálogo**:

- Se separa en **injustificada** y **justificada** — misma lógica que las faltas: si no hay una causa ajena a la persona, es injustificada por defecto. La justificada no requiere adjunto obligatorio (a diferencia de la falta justificada), porque el motivo típico (ej. no le entregaron la llave) no siempre tiene un comprobante fotografiable — alcanza con la observación.
- Se miden en **minutos**, no en días — y por diseño **no hay conversión automática entre minutos y días** (depende del horario de cada persona, no hay una tasa única que tenga sentido).
- Solo la **injustificada** se acumula en el **contador informativo** de la ficha de la persona (visible cuando es mayor a cero). La justificada queda registrada en el timeline pero no suma a ese contador — mismo criterio que una falta justificada con el saldo en días.
- Ninguna de las dos aparece en los informes filtrados "Solo días a favor" / "Solo días a descontar" (no tienen efecto en días) — solo en el informe General, o en un informe filtrado por ese tipo específico (ver sección de Informes).

**Decisión confirmada explícitamente por Dante**: una falta justificada (con certificado médico) **nunca mueve el banco de días**, sea cual sea el motivo. Es puramente informativa/probatoria. Si en el futuro se necesita otra política (ej. que algunas faltas justificadas sí descuenten según el tipo de certificado), es un cambio de negocio a validar de nuevo — no asumir.

`saldo(persona) = Σ efecto(movimiento)` para todos sus movimientos, sin límite de tiempo (saldo acumulado histórico, no mensual).

**Alertas** (campanita en el dashboard):

- Saldo negativo → alerta
- Saldo ≥ umbral configurable (default: 15 días) → alerta de "revisar" (evita que un crédito gigante pase desapercibido, ej. casos reales del taller con +36/+37 días)

**Informes**, exportables en **PDF o Excel**, filtrables por **mes** y por **tipo**:

- General: todos los movimientos del mes + saldo acumulado por persona (histórico total, no solo del mes)
- Solo días a favor: filtra movimientos con efecto positivo + total acumulado de días a favor por persona
- Solo días a descontar: filtra movimientos con efecto negativo + total acumulado de días a descontar por persona
- **ACTUALIZADO 2026-09-15**: además de esos 3, el filtro de tipo admite elegir **un tipo de novedad específico** (Día compensado tomado / Día u hora extra trabajado / Falta injustificada / Falta justificada / Tardanza injustificada / Tardanza justificada) — el detalle muestra solo ese tipo en el mes, y el resumen es el total histórico de esa persona en ese tipo puntual (en su propia unidad: días o minutos)
- Las faltas justificadas y las tardanzas (ambas de efecto neutro) **nunca aparecen** en los informes "Solo a favor"/"Solo a descontar" — sí aparecen en el General, y en un informe filtrado exactamente por ese tipo
- El Excel se genera con dos hojas: **Novedades** (el detalle) y **Resumen** (el mismo total que el PDF)

---

## 6. Flujo de pantallas

Ver el prototipo para el detalle visual exacto. Resumen funcional:

1. **Login** — solo email/contraseña de un admin ya invitado
2. **Dashboard** — saludo, tarjetas táctiles (Personal activo / Saldo negativo / Saldo positivo / Novedades del mes — cada una navega a la Nómina ya filtrada), campanita de notificaciones, últimas novedades, botón de exportar (PDF o Excel)
3. **Nómina de personal** — tabla agrupada por **turno + área**, con una salvedad importante: **el turno no es un dato fijo de la persona, se calcula por día** a partir de la hora de inicio de cada horario (antes de las 13:00 = mañana, si no, tarde). Consecuencias de esto en la UI:
   - Alguien con horario mixto (ej. viernes tarde + sábado mañana) aparece en **ambos** bloques de turno, con la misma ficha y el mismo saldo — nunca se duplica a la persona en la base de datos
   - En el bloque de un turno, los días que la persona trabaja en el _otro_ turno se ven como **"Otro"** (con tooltip explicativo), distinto de "Franco" (que es un día realmente libre)
   - **Administración se muestra como un único bloque, sin partir por turno** (decisión explícita: es "un mismo equipo" aunque tenga gente de mañana y de tarde) — cada fila lleva una etiqueta chica con su turno calculado en vez de heredar el encabezado de turno
   - Alguien recién dado de alta, sin ningún día de horario cargado todavía, cae en un bloque aparte **"Sin horario asignado todavía"** — para que nunca desaparezca de la vista
   - **Mobile-first**: columnas Nombre y Saldo fijas (sticky) al hacer scroll horizontal, tipografía chica por defecto y que crece desde ~641px de ancho; cada bloque de turno tiene un tinte de fondo sutil propio (ver sección 7)
4. **Ficha de personal** — horario semanal, saldo, contador de minutos de tardanza acumulados (solo si es mayor a cero), timeline de novedades con observaciones y adjunto (cada una con un link **Corregir** — ver punto 5.1); acciones: Cargar novedad / Editar horario / **Eliminar personal**
5. **Cargar novedad** — tipo (catálogo fijo — ACTUALIZADO 2026-09-15: Tardanza se separó en injustificada/justificada; AGREGADO 2026-09-17: Salida anticipada injustificada/justificada; AGREGADO 2026-09-18: Licencia Anual Ordinaria), fecha, observaciones (campo con espacio para texto largo — soporta salto de línea real en el PDF), adjunto de imagen (obligatorio solo si el tipo lo requiere, ver nota TEMPORAL más abajo). El campo de cantidad cambia de etiqueta según el tipo: "Cantidad (± días)", "Minutos de tardanza" o "Minutos de salida anticipada"
   1. **AGREGADO 2026-09-18 — Corregir novedad**: mismo formulario que cargar, precargado con los valores actuales, más un **motivo obligatorio** de la corrección (no se guarda en la novedad, solo en Auditoría junto al valor anterior y el nuevo — accion `editar`, entidad `movimiento`). Mismo permiso que cargar novedad (Admin de Organización **o** Supervisor, a diferencia de "Eliminar personal" que es solo Admin) — el supervisor es quien más carga novedades día a día, tiene sentido que corrija sus propios errores de tipeo.
6. **Editar horario** — por día de la semana; genera una nueva versión vigente y cierra la anterior
7. **Eliminar personal** — pide un **motivo obligatorio** antes de confirmar (ej. "cargado por error, es duplicado de otra persona"); no es un borrado silencioso — queda registrado en Auditoría con quién lo hizo y por qué. Distinto conceptualmente de una "baja" por fin de relación laboral, que en el modelo real debería conservar el historial (ver nota en la sección 4, tabla `operarios`). **ACTUALIZADO 2026-09-18**: solo el Admin de Organización puede eliminar personal — un Supervisor no (antes cualquiera de los dos podía; decisión explícita de Dante). El botón ni siquiera se muestra en la ficha si sos Supervisor.
8. **Auditoría** — listado de quién hizo qué y cuándo, sobre cualquier entidad
9. **Alta de personal** — nombre, área (existente o nueva). **No pide turno** — se calcula solo cuando se le carga el horario en el paso 6

---

## 7. Identidad visual (para no perder consistencia con el prototipo)

- **Paleta**: fondo papel `#F1EFE7` (dark mode: `#1B1A17`), superficie `#FFFFFF`/`#242320`, acento teal `#1F4D4C`/`#5FA6A0`, positivo verde musgo `#3F6B34`/`#8FC47C`, negativo ladrillo `#A8462B`/`#E28A67` — deliberadamente **no** cream+terracota genérico de IA, es una paleta tipo "libro de registro de taller"
- **Tinte por turno en la Nómina**: cada bloque de turno tiene un tinte de fondo muy sutil, distinto entre sí — cálido para Tarde (`#FBF3E6`, dark: `#2B2419`), frío para Mañana (`#EDF5F3`, dark: `#1E2825`) — con una versión ligeramente más marcada para el estado hover de cada fila. El criterio es evocar luz de tarde vs. luz de mañana, no es un color arbitrario
- **Tipografía**: IBM Plex Sans (UI general) + IBM Plex Mono (horarios, saldos, cualquier dato numérico — reduce ambigüedad visual en una tabla de horarios)
- **Radios de borde chicos** (6px), bordes finos en vez de sombras pesadas — evita el look "tarjeta SaaS genérica"

---

## 8. Roadmap

1. **Fase 0 — Prototipo navegable** ✅ hecho (el HTML publicado)
2. **Fase 1 — MVP funcional**: auth de admin (invitación por email), nómina con alta/edición/baja, horarios versionados, carga de novedades con adjunto, auditoría de solo lectura — **esto es lo que se construye ahora**
3. **Fase 2 — Reportes y alertas**: PDF ya validado en el prototipo (llevar la misma lógica al backend), notificaciones por email de saldo fuera de rango
4. **Fase 3 — Preparar para vender**: alta de organización self-service, rol de supervisor con permisos acotados por área
5. **Fase 4 — Cobros**: Stripe Managed Payments
6. **Fase 5 — Futuro**: importar el archivo que suelta el reloj biométrico como sugerencias de novedad (no como fuente de verdad del saldo)

---

## 9. Decisiones ya validadas — no volver a preguntar

- Multi-tenant por fila con RLS, no un proyecto Supabase por cliente
- Catálogo de tipos de movimiento fijo para el MVP (no configurable por organización)
- Horarios versionados por fecha, no solo "horario actual"
- Falta justificada = neutra, nunca resta ni suma, requiere adjunto obligatorio
- Sin portal de autoservicio para el personal
- Sin integración de nómina/liquidación de sueldos en el MVP
- Alta de admin exclusivamente por invitación de correo; primer admin de cada organización se siembra manualmente
- Tres niveles de rol: Super Admin (Dante, fuera de toda organización, con acceso de soporte a cualquiera), Admin de Organización (control total dentro de la suya), Supervisor (solo las áreas que le asigne su admin)
- Las organizaciones se activan/desactivan (suspensión reversible vía RLS), nunca se borran
- Aislamiento entre SaaS garantizado por schema de Postgres separado (`personalcheck.*`), no por convención de la app
- Nomenclatura: "Personal", nunca "operario/operaria", en toda la UI y los documentos generados
- No existe "Administración fin de semana" como área separada — es Administración con horario de fin de semana
- El turno no es un campo fijo de la persona ni de su horario en la base de datos — se calcula por día desde la hora de inicio (antes de las 13:00 = mañana). Esto permite representar horarios mixtos (ej. viernes tarde + sábado mañana) sin duplicar a la persona
- Administración se muestra unificada en la Nómina, sin partir por turno, a diferencia del resto de las áreas
- ~~Tardanza es un solo tipo (sin distinguir justificada/injustificada)~~ — **REEMPLAZADO 2026-09-15**: se separó en injustificada/justificada (ver sección 5). Se sigue midiendo en minutos y nunca se convierte ni se mezcla con el saldo en días
- "Eliminar personal" exige un motivo obligatorio y queda registrado en Auditoría — es un caso de error de carga, distinto de una baja real por fin de relación laboral (que en el modelo real debería conservar el historial en vez de eliminarse)
