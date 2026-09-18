-- ============================================================================
-- PersonalCheck — Agregar "Cambio de día" y "Cambio de horario"
-- Migración aditiva sobre las anteriores.
-- Aplicar con: supabase migration new personalcheck_cambio_dia_y_horario
-- ============================================================================

-- Dos avisos informativos, ninguno de los dos toca el banco de días:
--
-- "Cambio de día": alguien se ausenta un día pero lo compensa trabajando
-- otro día distinto, con autorización — no se le descuenta porque lo va a
-- devolver. Es un aviso de que ese día está cubierto de esa forma, no un
-- movimiento de saldo (a diferencia de "Día compensado tomado", que sí
-- resta porque ahí se está usando un día ya acumulado a favor).
--
-- "Cambio de horario": alguien que cumple un turno fijo (ej. tarde) entra
-- en el otro turno (ej. mañana) por un trabajo puntual — se deja asentado
-- para que quede registrado por qué esa persona aparece en un turno que no
-- es el suyo, sin que eso implique ninguna falta ni ajuste de saldo.

insert into personalcheck.tipos_movimiento (codigo, nombre, impacto, requiere_adjunto, unidad) values
  ('cambio_dia', 'Cambio de día', 'neutro', false, 'dias'),
  ('cambio_horario', 'Cambio de horario', 'neutro', false, 'dias');
