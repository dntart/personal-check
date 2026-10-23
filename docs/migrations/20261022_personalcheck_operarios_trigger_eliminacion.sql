-- Cierra el gap que quedó documentado al aplicar
-- 20261008_personalcheck_rls_por_operacion.sql: "Eliminar personal" en la
-- app es un UPDATE operarios SET deleted_at = ahora() (soft delete),
-- restringido a Admin en el código — pero la policy de `operarios` sigue
-- siendo una sola FOR ALL abierta a cualquier supervisor con el área
-- visible, porque los supervisores SÍ necesitan poder editar personal
-- (nombre, área, horario). Una policy no puede distinguir "edita un campo
-- normal" de "hace la transición de soft-delete" porque ambas son el mismo
-- UPDATE — hace falta comparar el valor viejo contra el nuevo, y eso es
-- un trigger, no una policy.
--
-- Mismo criterio que ya tiene el código (sesion.rol !== "admin" en
-- personal/[id]/eliminar/actions.ts): esto es un espejo a nivel de base,
-- no un cambio de comportamiento para ningún flujo real de la app.

create or replace function personalcheck.operarios_bloquear_eliminacion_no_admin()
returns trigger
language plpgsql
security definer
set search_path = personalcheck, public
as $$
begin
  if old.deleted_at is null and new.deleted_at is not null then
    if personalcheck.rol_actual() <> 'admin' and not personalcheck.es_super_admin() then
      raise exception 'Solo un Admin de organización puede eliminar personal.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists operarios_bloquear_eliminacion_no_admin on personalcheck.operarios;

create trigger operarios_bloquear_eliminacion_no_admin
  before update on personalcheck.operarios
  for each row
  execute function personalcheck.operarios_bloquear_eliminacion_no_admin();
