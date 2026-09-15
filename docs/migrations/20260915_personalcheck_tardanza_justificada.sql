-- ============================================================================
-- PersonalCheck — Separar Tardanza en injustificada/justificada
-- Migración aditiva sobre las anteriores.
-- Aplicar con: supabase migration new personalcheck_tardanza_justificada
-- ============================================================================

-- Decisión de negocio nueva de Dante, que REEMPLAZA la de la spec sección 5/9
-- ("Tardanza es un solo tipo, sin distinguir justificada/injustificada" —
-- estaba marcada como "no volver a preguntar", pero el caso real lo pide:
-- a veces el personal ficha tarde por una causa ajena (ej: no le entregaron
-- la llave) y esa demora no debería anotarse como una tardanza real.
--
-- Mismo patrón que falta_injustificada/falta_justificada: la justificada es
-- neutra e informativa, la injustificada es la que cuenta para el contador
-- de minutos acumulados. Ninguna de las dos toca el saldo en días (eso no
-- cambió — ver spec sección 5, "Tardanza... nunca toca el saldo en días").
--
-- No hace falta migrar movimientos existentes: no hay ninguno cargado con
-- el tipo `tardanza` todavía (verificado antes de esta migración).

delete from personalcheck.tipos_movimiento where codigo = 'tardanza';

insert into personalcheck.tipos_movimiento (codigo, nombre, impacto, requiere_adjunto, unidad) values
  ('tardanza_injustificada', 'Tardanza injustificada', 'neutro', false, 'minutos'),
  ('tardanza_justificada',   'Tardanza justificada',   'neutro', false, 'minutos');
