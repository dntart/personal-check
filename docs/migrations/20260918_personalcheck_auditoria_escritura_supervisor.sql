-- ============================================================================
-- PersonalCheck — Corregir: Supervisor no podía ESCRIBIR en auditoría
-- Migración aditiva sobre las anteriores (corrige un bug real de la
-- migración 20260915_personalcheck_auditoria_solo_admin.sql).
-- Aplicar con: supabase migration new personalcheck_auditoria_escritura_supervisor
-- ============================================================================

-- Bug encontrado (Dante: "en auditoria no puedo ver las cargas de los
-- supervisores"): la policy anterior era `for all using (rol_actual() =
-- 'admin')`. En Postgres, una policy `for all` con solo USING (sin WITH
-- CHECK) usa esa misma expresión para decidir tanto qué filas se pueden LEER
-- como qué filas se pueden INSERTAR/actualizar. Como registrarAuditoria()
-- inserta usando la sesión del propio usuario (no service role), cualquier
-- INSERT hecho por un Supervisor quedaba rechazado por RLS en silencio —
-- registrarAuditoria() no revisa el error de ese insert, así que la novedad
-- se guardaba bien pero jamás quedaba registrada en Auditoría. Pasó con
-- TODA acción de un Supervisor desde el 2026-09-15 (fecha de esa migración).
--
-- Fix: separar lectura (solo Admin de organización, como se pretendía) de
-- escritura (cualquier admin/supervisor de la organización puede REGISTRAR
-- una entrada — la tabla es de solo inserción, nunca se actualiza ni se
-- borra, así que alcanza con permitir INSERT ahí).

drop policy "auditoria_acceso" on personalcheck.auditoria;

create policy "auditoria_lectura" on personalcheck.auditoria
  for select using (
    (organizacion_id = personalcheck.org_actual() and personalcheck.rol_actual() = 'admin')
    or personalcheck.es_super_admin()
  );

create policy "auditoria_escritura" on personalcheck.auditoria
  for insert with check (
    organizacion_id = personalcheck.org_actual()
    or personalcheck.es_super_admin()
  );
