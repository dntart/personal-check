-- ============================================================================
-- PersonalCheck — Agregar "Licencia Extraordinaria"
-- Migración aditiva sobre las anteriores.
-- Aplicar con: supabase migration new personalcheck_licencia_extraordinaria
-- ============================================================================

-- Caso real del taller (Dante): se da licencia extraordinaria por
-- temporada (invierno/verano), aparte de la Licencia Anual Ordinaria.
-- Mismo tratamiento que esa: días, neutra — no toca el banco de días
-- compensatorio, es una cuenta aparte — solo registro/historial.

insert into personalcheck.tipos_movimiento (codigo, nombre, impacto, requiere_adjunto, unidad) values
  ('licencia_extraordinaria', 'Licencia Extraordinaria', 'neutro', false, 'dias');
