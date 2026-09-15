-- ============================================================================
-- PersonalCheck — org_actual() debe respetar organizaciones.activo
-- Migración aditiva sobre las tres anteriores.
-- Aplicar con: supabase migration new personalcheck_org_actual_respeta_suspension
-- ============================================================================

-- Bug encontrado al implementar el login: org_actual() (definida en
-- 20260902_personalcheck_initial_schema.sql) resuelve la organización del
-- admin autenticado SIN mirar organizaciones.activo. Como todas las políticas
-- RLS de datos operativos comparan `organizacion_id = personalcheck.org_actual()`,
-- una organización suspendida (activo = false) en la práctica seguía
-- teniendo acceso total vía RLS — contradice la spec (sección 3): "activo =
-- false bloquea el acceso a nivel de RLS (no solo de interfaz) para toda esa
-- organización".
--
-- Fix: org_actual() devuelve NULL si la organización del admin está
-- suspendida. Como ninguna fila real tiene organizacion_id = NULL, todas las
-- políticas que dependen de esta función quedan bloqueadas automáticamente
-- para esa organización, sin tocar una sola policy. El bypass de
-- es_super_admin() sigue intacto (el Super Admin conserva acceso de soporte
-- a organizaciones suspendidas, como pide la spec).
create or replace function personalcheck.org_actual()
returns uuid
language sql
security definer
stable
as $$
  select a.organizacion_id
  from personalcheck.admins a
  join personalcheck.organizaciones o on o.id = a.organizacion_id
  where a.id = auth.uid() and o.activo = true;
$$;
