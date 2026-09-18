-- ============================================================================
-- PersonalCheck — Corregir unidad de "Cambio de horario" a minutos
-- Migración aditiva sobre las anteriores (corrige un dato ya insertado por
-- 20260918_personalcheck_cambio_dia_y_horario.sql).
-- Aplicar con: supabase migration new personalcheck_cambio_horario_minutos
-- ============================================================================

-- A pedido de Dante: "Cambio de horario" carga la cantidad en minutos por
-- defecto, igual que Tardanza — no en días. Sigue siendo neutro (no toca
-- el banco de días), solo cambia la unidad de carga.

update personalcheck.tipos_movimiento
set unidad = 'minutos'
where codigo = 'cambio_horario';
