-- ============================================================================
-- PersonalCheck — Super Admin, activación de organizaciones y alcance por área
-- Migración aditiva sobre 20260902_personalcheck_initial_schema.sql
-- Aplicar con: supabase migration new personalcheck_super_admin_y_alcance_area
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. SUPER_ADMINS (Dante — opera por fuera de cualquier organización)
-- ----------------------------------------------------------------------------
create table personalcheck.super_admins (
  id          uuid primary key references auth.users(id) on delete cascade,
  nombre      text not null,
  email       text not null unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table personalcheck.super_admins enable row level security;
-- Solo un super admin puede ver la lista de super admins (no se expone a admins comunes)
create policy "super_admins_solo_ellos_mismos" on personalcheck.super_admins
  for all using (id = auth.uid());

-- ----------------------------------------------------------------------------
-- 2. ORGANIZACIONES.activo — el interruptor de alta/baja que maneja el Super Admin
-- ----------------------------------------------------------------------------
alter table personalcheck.organizaciones add column activo boolean not null default true;
-- "activo = false" no borra nada: bloquea el acceso a nivel de RLS en toda la
-- organización, no solo en la interfaz. Distinto de "deleted_at", que es un
-- soft-delete real (esto es una suspensión, reversible con un solo update).

-- ----------------------------------------------------------------------------
-- 3. ADMIN_AREAS — a qué área(s) puede acceder cada supervisor
--    (un admin de organización no necesita filas acá: ve todas las áreas)
-- ----------------------------------------------------------------------------
create table personalcheck.admin_areas (
  admin_id    uuid not null references personalcheck.admins(id) on delete cascade,
  area_id     uuid not null references personalcheck.areas(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (admin_id, area_id)
);
create index idx_admin_areas_admin on personalcheck.admin_areas (admin_id);

-- ----------------------------------------------------------------------------
-- 4. AUDITORIA — ahora el actor puede ser un admin de organización O un super
--    admin (soporte). Exactamente uno de los dos campos debe estar cargado.
-- ----------------------------------------------------------------------------
alter table personalcheck.auditoria alter column admin_id drop not null;
alter table personalcheck.auditoria add column super_admin_id uuid references personalcheck.super_admins(id);
alter table personalcheck.auditoria add constraint auditoria_actor_unico
  check ( (admin_id is not null)::int + (super_admin_id is not null)::int = 1 );

-- ============================================================================
-- FUNCIONES DE APOYO PARA RLS
-- ============================================================================

create or replace function personalcheck.es_super_admin()
returns boolean
language sql security definer stable
as $$
  select exists(select 1 from personalcheck.super_admins where id = auth.uid());
$$;

create or replace function personalcheck.rol_actual()
returns text
language sql security definer stable
as $$
  select rol from personalcheck.admins where id = auth.uid();
$$;

-- Un admin ('rol'=admin) puede ver cualquier área de su organización.
-- Un supervisor solo puede ver las áreas que le asignaron en admin_areas.
create or replace function personalcheck.puede_ver_area(p_area_id uuid)
returns boolean
language sql security definer stable
as $$
  select
    personalcheck.rol_actual() = 'admin'
    or exists(
      select 1 from personalcheck.admin_areas aa
      where aa.admin_id = auth.uid() and aa.area_id = p_area_id
    );
$$;

-- ============================================================================
-- RLS ACTUALIZADA: bypass de Super Admin + alcance por área en datos operativos
-- ============================================================================

drop policy "organizaciones_propia" on personalcheck.organizaciones;
create policy "organizaciones_acceso" on personalcheck.organizaciones
  for all using (id = personalcheck.org_actual() or personalcheck.es_super_admin());

drop policy "admins_misma_org" on personalcheck.admins;
create policy "admins_acceso" on personalcheck.admins
  for all using (organizacion_id = personalcheck.org_actual() or personalcheck.es_super_admin());

drop policy "areas_misma_org" on personalcheck.areas;
create policy "areas_acceso" on personalcheck.areas
  for all using (organizacion_id = personalcheck.org_actual() or personalcheck.es_super_admin());

drop policy "operarios_misma_org" on personalcheck.operarios;
create policy "operarios_acceso" on personalcheck.operarios
  for all using (
    (organizacion_id = personalcheck.org_actual() and personalcheck.puede_ver_area(area_id))
    or personalcheck.es_super_admin()
  );

drop policy "horarios_misma_org" on personalcheck.horarios_semanales;
create policy "horarios_acceso" on personalcheck.horarios_semanales
  for all using (
    (organizacion_id = personalcheck.org_actual()
      and personalcheck.puede_ver_area((select o.area_id from personalcheck.operarios o where o.id = operario_id)))
    or personalcheck.es_super_admin()
  );

drop policy "movimientos_misma_org" on personalcheck.movimientos;
create policy "movimientos_acceso" on personalcheck.movimientos
  for all using (
    (organizacion_id = personalcheck.org_actual()
      and personalcheck.puede_ver_area((select o.area_id from personalcheck.operarios o where o.id = operario_id)))
    or personalcheck.es_super_admin()
  );

drop policy "auditoria_misma_org" on personalcheck.auditoria;
create policy "auditoria_acceso" on personalcheck.auditoria
  for all using (organizacion_id = personalcheck.org_actual() or personalcheck.es_super_admin());

alter table personalcheck.admin_areas enable row level security;
create policy "admin_areas_acceso" on personalcheck.admin_areas
  for all using (
    exists(
      select 1 from personalcheck.admins a
      where a.id = admin_id and a.organizacion_id = personalcheck.org_actual()
    )
    or personalcheck.es_super_admin()
  );

-- NOTA: la creación de una organización nueva + su primer admin no es pura SQL
-- — requiere invitar por email vía Supabase Auth (supabase.auth.admin.
-- inviteUserByEmail), que solo se puede llamar desde un contexto server-side
-- de confianza (API route con la service role key), no desde el cliente. Esta
-- migración deja lista la base de datos; el flujo de alta en sí se implementa
-- como una acción de servidor, no como una función SQL.
