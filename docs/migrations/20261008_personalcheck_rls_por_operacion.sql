-- Endurece RLS en admins/organizaciones/movimientos, que hoy tienen una
-- sola policy "for all" sin with_check (el mismo gotcha que ya rompió
-- auditoría el 18/09 — ver 20260918_personalcheck_auditoria_escritura_
-- supervisor.sql, y que ahora quedó documentado en la skill compartida,
-- references/admin-y-gestion-usuarios.md sección 2).
--
-- Hoy, por policy, cualquier miembro de la organización (supervisor
-- incluido) puede hacer UPDATE/DELETE sobre CUALQUIER fila de admins,
-- organizaciones y movimientos de su org — incluido cambiar su propio
-- `rol` a 'admin'. La app nunca usa esos caminos (se verificó grepeando
-- todas las escrituras a estas tablas), así que esto es un cierre puro,
-- no debería afectar ningún flujo real:
--   - admins:         insert/update → solo Admin de organización (o Super
--                     Admin, que ya tiene bypass vía es_super_admin());
--                     delete real → nunca lo usa la app, solo Super Admin.
--   - organizaciones: insert/update/delete → solo Super Admin (la app de
--                     cada organización nunca escribe su propia fila).
--   - movimientos:    insert → cualquier admin/supervisor con el área
--                     visible, pero el admin_id insertado tiene que ser
--                     el propio usuario (no se puede cargar "a nombre de
--                     otro"); update → Admin, o el mismo Supervisor que
--                     cargó la novedad (espejo exacto de la regla ya
--                     aplicada en el código el 2026-10-01); delete real →
--                     nunca lo usa la app (todo es soft delete).
--
-- No requiere backfill: ninguna policy nueva agrega una condición de
-- lectura (SELECT queda igual en las tres tablas), así que ningún usuario
-- existente pierde acceso a datos que ya veía. Solo se restringen
-- caminos de escritura que la app no usa hoy.

-- admins ----------------------------------------------------------------
drop policy "admins_acceso" on personalcheck.admins;

create policy "admins_lectura" on personalcheck.admins
  for select
  using (organizacion_id = personalcheck.org_actual() or personalcheck.es_super_admin());

create policy "admins_escritura" on personalcheck.admins
  for insert
  with check (
    (organizacion_id = personalcheck.org_actual() and personalcheck.rol_actual() = 'admin')
    or personalcheck.es_super_admin()
  );

create policy "admins_actualizacion" on personalcheck.admins
  for update
  using (
    (organizacion_id = personalcheck.org_actual() and personalcheck.rol_actual() = 'admin')
    or personalcheck.es_super_admin()
  )
  with check (
    (organizacion_id = personalcheck.org_actual() and personalcheck.rol_actual() = 'admin')
    or personalcheck.es_super_admin()
  );

create policy "admins_borrado" on personalcheck.admins
  for delete
  using (personalcheck.es_super_admin());

-- organizaciones ----------------------------------------------------------
drop policy "organizaciones_acceso" on personalcheck.organizaciones;

create policy "organizaciones_lectura" on personalcheck.organizaciones
  for select
  using (id = personalcheck.org_actual() or personalcheck.es_super_admin());

create policy "organizaciones_escritura" on personalcheck.organizaciones
  for insert
  with check (personalcheck.es_super_admin());

create policy "organizaciones_actualizacion" on personalcheck.organizaciones
  for update
  using (personalcheck.es_super_admin())
  with check (personalcheck.es_super_admin());

create policy "organizaciones_borrado" on personalcheck.organizaciones
  for delete
  using (personalcheck.es_super_admin());

-- movimientos -------------------------------------------------------------
drop policy "movimientos_acceso" on personalcheck.movimientos;

create policy "movimientos_lectura" on personalcheck.movimientos
  for select
  using (
    (organizacion_id = personalcheck.org_actual()
      and personalcheck.puede_ver_area((select o.area_id from personalcheck.operarios o where o.id = movimientos.operario_id)))
    or personalcheck.es_super_admin()
  );

create policy "movimientos_escritura" on personalcheck.movimientos
  for insert
  with check (
    (
      organizacion_id = personalcheck.org_actual()
      and personalcheck.puede_ver_area((select o.area_id from personalcheck.operarios o where o.id = movimientos.operario_id))
      and admin_id = auth.uid()
    )
    or personalcheck.es_super_admin()
  );

create policy "movimientos_actualizacion" on personalcheck.movimientos
  for update
  using (
    (
      organizacion_id = personalcheck.org_actual()
      and personalcheck.puede_ver_area((select o.area_id from personalcheck.operarios o where o.id = movimientos.operario_id))
      and (personalcheck.rol_actual() = 'admin' or admin_id = auth.uid())
    )
    or personalcheck.es_super_admin()
  )
  with check (
    (
      organizacion_id = personalcheck.org_actual()
      and personalcheck.puede_ver_area((select o.area_id from personalcheck.operarios o where o.id = movimientos.operario_id))
      and (personalcheck.rol_actual() = 'admin' or admin_id = auth.uid())
    )
    or personalcheck.es_super_admin()
  );

create policy "movimientos_borrado" on personalcheck.movimientos
  for delete
  using (personalcheck.es_super_admin());
