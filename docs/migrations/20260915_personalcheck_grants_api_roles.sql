-- ============================================================================
-- PersonalCheck — Otorgar permisos de Postgres a los roles de la API
-- Migración aditiva sobre las anteriores.
-- Aplicar con: supabase migration new personalcheck_grants_api_roles
-- ============================================================================

-- Bug encontrado al probar el login real: crear el schema `personalcheck` y
-- exponerlo en Data API (Project Settings > Data API > Exposed schemas) NO
-- alcanza — a diferencia de `public` (que Supabase configura solo), un
-- schema creado a mano necesita GRANT explícito para que los roles que usa
-- PostgREST (anon, authenticated, service_role) puedan siquiera intentar
-- una consulta. Sin esto, toda query devuelve
-- `permission denied for schema personalcheck` (42501), incluso con RLS
-- bien configurado.
--
-- Esto NO debilita la seguridad: el GRANT solo habilita el intento de
-- operación a nivel de rol — RLS (ya activado en todas las tablas de
-- negocio, ver 20260902_..._initial_schema.sql) sigue decidiendo qué filas
-- puede ver o tocar cada quien.

grant usage on schema personalcheck to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema personalcheck
  to anon, authenticated, service_role;

grant execute on all functions in schema personalcheck
  to anon, authenticated, service_role;

-- Para que las tablas/funciones que se agreguen en migraciones futuras
-- (dentro de este mismo schema) hereden los mismos permisos automáticamente,
-- sin tener que repetir este GRANT cada vez.
alter default privileges in schema personalcheck
  grant select, insert, update, delete on tables to anon, authenticated, service_role;

alter default privileges in schema personalcheck
  grant execute on functions to anon, authenticated, service_role;
