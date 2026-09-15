-- ============================================================================
-- PersonalCheck — Auditoría es capacidad de Admin de organización, no de
-- Supervisor (spec sección 3: la tabla de capacidades lista "auditoría"
-- para Admin y no la menciona para Supervisor).
-- Migración aditiva sobre las anteriores.
-- Aplicar con: supabase migration new personalcheck_auditoria_solo_admin
-- ============================================================================

-- La policy original (migración 1) solo miraba organizacion_id = org_actual(),
-- sin distinguir rol — un Supervisor invitado podía leer el log completo de
-- auditoría de toda la organización, incluyendo acciones sobre áreas que no
-- tiene asignadas. La UI ya lo esconde (no hay link ni la página lo permite
-- para un Supervisor), pero eso no alcanza: RLS es la fuente de verdad, no
-- la interfaz — un Supervisor podía igual leerlo pegándole directo a la API.

drop policy "auditoria_acceso" on personalcheck.auditoria;

create policy "auditoria_acceso" on personalcheck.auditoria
  for all using (
    (organizacion_id = personalcheck.org_actual() and personalcheck.rol_actual() = 'admin')
    or personalcheck.es_super_admin()
  );
