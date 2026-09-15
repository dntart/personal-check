-- ============================================================================
-- PersonalCheck — Un admin/supervisor eliminado (soft delete) pierde acceso
-- de verdad, no solo en la interfaz.
-- Migración aditiva sobre las anteriores.
-- Aplicar con: supabase migration new personalcheck_admins_eliminados_pierden_acceso
-- ============================================================================

-- Mismo tipo de bug que 20260915_..._respeta_suspension.sql, esta vez con
-- `admins.deleted_at` en lugar de `organizaciones.activo`: org_actual() y
-- rol_actual() resolvían el admin autenticado SIN mirar si su fila estaba
-- soft-deleted. Como todas las políticas RLS de datos operativos comparan
-- `organizacion_id = personalcheck.org_actual()`, un supervisor al que se
-- le "quitó el acceso" desde la app seguía teniendo acceso completo vía la
-- API (con su JWT todavía válido) hasta que ese JWT expirara.
--
-- Fix: ambas funciones ahora excluyen admins con deleted_at no nulo. Como
-- puede_ver_area() y el resto de las políticas siempre están AND-eadas con
-- `organizacion_id = org_actual()`, alcanza con arreglar estas dos — no
-- hace falta tocar puede_ver_area() ni cada policy una por una.

create or replace function personalcheck.org_actual()
returns uuid
language sql
security definer
stable
as $$
  select a.organizacion_id
  from personalcheck.admins a
  join personalcheck.organizaciones o on o.id = a.organizacion_id
  where a.id = auth.uid() and o.activo = true and a.deleted_at is null;
$$;

create or replace function personalcheck.rol_actual()
returns text
language sql security definer stable
as $$
  select rol from personalcheck.admins where id = auth.uid() and deleted_at is null;
$$;
