-- ============================================================================
-- PersonalCheck — Agregar "Licencia Anual Ordinaria" al catálogo
-- Migración aditiva sobre las anteriores.
-- Aplicar con: supabase migration new personalcheck_licencia_anual_ordinaria
-- ============================================================================

-- Vacaciones/licencia anual reglamentaria — a diferencia del resto del
-- catálogo, no es una novedad "de excepción" (falta, tardanza) sino algo
-- pautado de antemano. Neutro: no toca el banco de días compensatorio (esa
-- es una cuenta aparte, ver spec sección 5) — esto es solo registro de que
-- esos días fueron licencia anual, para el historial/informes.

insert into personalcheck.tipos_movimiento (codigo, nombre, impacto, requiere_adjunto, unidad) values
  ('licencia_anual_ordinaria', 'Licencia Anual Ordinaria', 'neutro', false, 'dias');
