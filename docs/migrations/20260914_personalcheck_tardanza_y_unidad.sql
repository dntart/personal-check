-- ============================================================================
-- PersonalCheck — Unidad de medida en tipos_movimiento + tipo "Tardanza"
-- Migración aditiva sobre las dos anteriores.
-- Aplicar con: supabase migration new personalcheck_tardanza_y_unidad
-- ============================================================================

-- Hasta ahora todo tipos_movimiento asumía "cantidad" en días. La tardanza se
-- mide en minutos, y mezclarla con el saldo en días no tiene una conversión
-- limpia (depende del horario de cada persona) — por eso es una unidad
-- explícita, no una conversión automática.
alter table personalcheck.tipos_movimiento
  add column unidad text not null default 'dias' check (unidad in ('dias', 'minutos'));

-- La tardanza es un solo tipo, sin distinguir justificada/injustificada: si no
-- hay una observación que la explique, ya se entiende que fue una tardanza sin
-- más. impacto = 'neutro' porque NUNCA toca el saldo en días — se acumula
-- aparte, en un contador puramente informativo (todo movimiento con
-- unidad = 'minutos' se sigue así, no hace falta una columna extra para esto).
insert into personalcheck.tipos_movimiento (codigo, nombre, impacto, requiere_adjunto, unidad) values
  ('tardanza', 'Tardanza', 'neutro', false, 'minutos');
