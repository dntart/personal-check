-- A pedido explícito de Dante (2026-10-01): "entre supervisores no pueden
-- modificarse los movimientos, esa es potestad de los administradores" +
-- "si hay una modificación debe marcarse como modificada la novedad y por
-- qué se modificó". Antes "Corregir" (editar) estaba abierto a cualquier
-- Supervisor, igual que cargar — un supervisor editó un movimiento cargado
-- por otro supervisor sin que el Admin de organización lo viera en ningún
-- lado salvo Auditoría. El permiso ahora se restringe en el código
-- (sesion.rol === "admin", mismo criterio que "Eliminar novedad"); esta
-- migración solo agrega las columnas para dejar la marca visible en la
-- propia novedad, sin tener que ir a Auditoría a buscarla.

alter table personalcheck.movimientos
  add column editado_por uuid references personalcheck.admins(id),
  add column motivo_edicion text;
