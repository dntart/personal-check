-- ============================================================================
-- PersonalCheck — Schema inicial
-- Convención del portfolio: un schema por SaaS dentro del mismo proyecto Supabase.
-- Aplicar con: supabase migration new personalcheck_initial_schema
-- y pegar este contenido, o supabase db push si ya está como archivo de migración.
-- ============================================================================

create schema if not exists personalcheck;

-- ----------------------------------------------------------------------------
-- 1. ORGANIZACIONES (tenants — una fila por empresa cliente)
-- ----------------------------------------------------------------------------
create table personalcheck.organizaciones (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

-- ----------------------------------------------------------------------------
-- 2. ADMINS (encargados de RRHH — únicos usuarios con login; 1 fila = 1 auth.users)
-- ----------------------------------------------------------------------------
create table personalcheck.admins (
  id              uuid primary key references auth.users(id) on delete cascade,
  organizacion_id uuid not null references personalcheck.organizaciones(id),
  nombre          text not null,
  email           text not null,
  rol             text not null default 'admin' check (rol in ('admin', 'supervisor')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  constraint admins_email_unico_por_org unique (organizacion_id, email)
);
create index idx_admins_organizacion on personalcheck.admins (organizacion_id);

-- ----------------------------------------------------------------------------
-- 3. AREAS (Tejido, Textil, Manualidad, etc. — normalizado, no texto libre repetido)
-- ----------------------------------------------------------------------------
create table personalcheck.areas (
  id              uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references personalcheck.organizaciones(id),
  nombre          text not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  constraint areas_nombre_unico_por_org unique (organizacion_id, nombre)
);
create index idx_areas_organizacion on personalcheck.areas (organizacion_id);

-- ----------------------------------------------------------------------------
-- 4. OPERARIOS (trabajadores/as del roster)
-- ----------------------------------------------------------------------------
create table personalcheck.operarios (
  id              uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references personalcheck.organizaciones(id),
  area_id         uuid not null references personalcheck.areas(id),
  nombre          text not null,
  activo          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create index idx_operarios_organizacion on personalcheck.operarios (organizacion_id);
create index idx_operarios_area on personalcheck.operarios (area_id);

-- ----------------------------------------------------------------------------
-- 5. HORARIOS_SEMANALES (versionado por fecha — permite reconstruir el horario
--    histórico exacto de una persona en cualquier momento)
-- ----------------------------------------------------------------------------
create table personalcheck.horarios_semanales (
  id              uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references personalcheck.organizaciones(id),
  operario_id     uuid not null references personalcheck.operarios(id),
  dia_semana      smallint not null check (dia_semana between 1 and 7), -- 1=Lunes ... 7=Domingo
  hora_inicio     time not null,
  hora_fin        time not null,
  vigente_desde   date not null,
  vigente_hasta   date, -- null = vigente actualmente
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  constraint horarios_rango_valido check (hora_fin > hora_inicio),
  constraint horarios_vigencia_valida check (vigente_hasta is null or vigente_hasta >= vigente_desde)
);
create index idx_horarios_operario on personalcheck.horarios_semanales (operario_id, dia_semana, vigente_desde);
create index idx_horarios_organizacion on personalcheck.horarios_semanales (organizacion_id);
-- Nota: evitar solapamiento de dos vigencias para el mismo día se valida en el
-- backend al crear una nueva versión (cerrar la anterior con vigente_hasta = nueva
-- fecha - 1 antes de insertar). Postgres puede reforzarlo con un exclusion
-- constraint (btree_gist) si el volumen lo justifica más adelante.

-- ----------------------------------------------------------------------------
-- 6. TIPOS_MOVIMIENTO (catálogo fijo, igual para todos los clientes — MVP)
-- ----------------------------------------------------------------------------
create table personalcheck.tipos_movimiento (
  id                 uuid primary key default gen_random_uuid(),
  codigo             text not null unique,
  nombre             text not null,
  impacto            text not null check (impacto in ('suma', 'resta', 'neutro')),
  requiere_adjunto   boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

insert into personalcheck.tipos_movimiento (codigo, nombre, impacto, requiere_adjunto) values
  ('falta_injustificada', 'Falta injustificada',        'resta',  false),
  ('falta_justificada',   'Falta justificada',          'neutro', true),
  ('extra_trabajado',     'Día/hora extra trabajado',   'suma',   false),
  ('compensado_tomado',   'Día compensado tomado',      'resta',  false),
  ('ajuste_manual',       'Ajuste manual',               'suma',   false); -- signo real lo decide el admin en 'cantidad'

-- ----------------------------------------------------------------------------
-- 7. MOVIMIENTOS (el banco de días/horas — cada novedad cargada)
-- ----------------------------------------------------------------------------
create table personalcheck.movimientos (
  id                  uuid primary key default gen_random_uuid(),
  organizacion_id     uuid not null references personalcheck.organizaciones(id),
  operario_id         uuid not null references personalcheck.operarios(id),
  admin_id            uuid not null references personalcheck.admins(id), -- quién lo cargó
  tipo_movimiento_id  uuid not null references personalcheck.tipos_movimiento(id),
  fecha               date not null,
  cantidad            numeric(5,2) not null default 1, -- días u horas según convención del tipo
  observaciones       text,
  adjunto_url         text, -- referencia al archivo en Supabase Storage
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz
);
create index idx_movimientos_operario_fecha on personalcheck.movimientos (operario_id, fecha desc);
create index idx_movimientos_organizacion on personalcheck.movimientos (organizacion_id);

-- ----------------------------------------------------------------------------
-- 8. AUDITORIA (log inmutable de crear/editar/eliminar — nunca se actualiza ni borra)
-- ----------------------------------------------------------------------------
create table personalcheck.auditoria (
  id                 uuid primary key default gen_random_uuid(),
  organizacion_id    uuid not null references personalcheck.organizaciones(id),
  admin_id           uuid not null references personalcheck.admins(id),
  accion             text not null check (accion in ('crear', 'editar', 'eliminar')),
  entidad             text not null, -- 'operario', 'movimiento', 'horario_semanal', etc.
  entidad_id         uuid not null,
  datos_anteriores   jsonb,
  datos_nuevos       jsonb,
  created_at         timestamptz not null default now()
);
create index idx_auditoria_organizacion_fecha on personalcheck.auditoria (organizacion_id, created_at desc);
create index idx_auditoria_entidad on personalcheck.auditoria (entidad, entidad_id);

-- ============================================================================
-- ROW LEVEL SECURITY — cada admin solo ve/toca filas de su propia organización
-- ============================================================================

-- Función helper: devuelve la organizacion_id del admin autenticado actual
create or replace function personalcheck.org_actual()
returns uuid
language sql
security definer
stable
as $$
  select organizacion_id from personalcheck.admins where id = auth.uid();
$$;

alter table personalcheck.organizaciones     enable row level security;
alter table personalcheck.admins             enable row level security;
alter table personalcheck.areas              enable row level security;
alter table personalcheck.operarios          enable row level security;
alter table personalcheck.horarios_semanales enable row level security;
alter table personalcheck.movimientos        enable row level security;
alter table personalcheck.auditoria          enable row level security;
-- tipos_movimiento queda SIN RLS: es catálogo fijo, de lectura pública para todo admin autenticado.
alter table personalcheck.tipos_movimiento   enable row level security;
create policy "tipos_movimiento_lectura_admins" on personalcheck.tipos_movimiento
  for select using (auth.uid() is not null);

create policy "organizaciones_propia" on personalcheck.organizaciones
  for all using (id = personalcheck.org_actual());

create policy "admins_misma_org" on personalcheck.admins
  for all using (organizacion_id = personalcheck.org_actual());

create policy "areas_misma_org" on personalcheck.areas
  for all using (organizacion_id = personalcheck.org_actual());

create policy "operarios_misma_org" on personalcheck.operarios
  for all using (organizacion_id = personalcheck.org_actual());

create policy "horarios_misma_org" on personalcheck.horarios_semanales
  for all using (organizacion_id = personalcheck.org_actual());

create policy "movimientos_misma_org" on personalcheck.movimientos
  for all using (organizacion_id = personalcheck.org_actual());

create policy "auditoria_misma_org" on personalcheck.auditoria
  for all using (organizacion_id = personalcheck.org_actual());
