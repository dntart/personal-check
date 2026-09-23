-- ============================================================================
-- PersonalCheck — Dividir "Día/hora extra trabajado" en dos tipos
-- Migración aditiva sobre las anteriores.
-- Aplicar con: supabase migration new personalcheck_dividir_extra_trabajado
-- ============================================================================

-- Problema real (Dante): "Día/hora extra trabajado" solo dejaba cargar en
-- días — si alguien se quedó 1 hora de más, no había forma de registrarlo.
-- Se divide en dos, mismo patrón que Tardanza/Salida anticipada:
--
-- "Día extra trabajado" (días, suma al banco): se renombra el tipo
-- existente en el lugar — NO se crea uno nuevo — porque ya hay 15
-- movimientos cargados con este tipo, todos en cantidades enteras de días
-- (verificado antes de esta migración). Cambiar el codigo/nombre no rompe
-- esos movimientos: la referencia real es tipo_movimiento_id, no codigo.
--
-- "Hora extra trabajada" (minutos, en bloques de 30 como Salida
-- anticipada): tipo nuevo. Neutro, no informativo — mismo criterio que el
-- resto del catálogo en minutos (Tardanza, Salida anticipada, Cambio de
-- horario): no hay conversión automática entre minutos y días, así que no
-- suma al banco directamente.

update personalcheck.tipos_movimiento
set codigo = 'dia_extra_trabajado', nombre = 'Día extra trabajado'
where codigo = 'extra_trabajado';

insert into personalcheck.tipos_movimiento (codigo, nombre, impacto, requiere_adjunto, unidad) values
  ('hora_extra_trabajada', 'Hora extra trabajada', 'neutro', false, 'minutos');
