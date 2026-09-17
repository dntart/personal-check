-- ============================================================================
-- PersonalCheck — Agregar "Salida anticipada" (injustificada/justificada)
-- Migración aditiva sobre las anteriores.
-- Aplicar con: supabase migration new personalcheck_salida_anticipada
-- ============================================================================

-- Caso real (Dante): a veces una persona pide permiso para retirarse antes
-- por una causa de fuerza mayor (enfermedad, urgencia) y ficha la salida
-- antes de tiempo — el reloj biométrico va a marcar menos horas de las que
-- corresponden. El catálogo no tenía ningún tipo para esto: "Falta
-- justificada" es para un día entero de ausencia (la persona no vino), no
-- para quien sí vino y se retiró antes; "Tardanza" es el otro extremo del
-- turno (llegar tarde), no salir antes.
--
-- Mismo patrón que tardanza_injustificada/justificada (ver migración
-- 20260915_personalcheck_tardanza_justificada.sql): neutro, no toca el
-- saldo en días — el sistema nunca descuenta por el reloj automáticamente
-- (spec sección 1), esto es solo registro/respaldo. Medido en minutos.

insert into personalcheck.tipos_movimiento (codigo, nombre, impacto, requiere_adjunto, unidad) values
  ('salida_anticipada_injustificada', 'Salida anticipada injustificada', 'neutro', false, 'minutos'),
  ('salida_anticipada_justificada',   'Salida anticipada justificada',   'neutro', false, 'minutos');
