const { withTransaction } = require('../db/transaction');
const { registrarAuditoria } = require('../utils/auditoria');
const { addMoney, subtractMoney } = require('../utils/money');

async function registrarMovimiento({ tipo, concepto, monto, fecha, usuarioId }) {
  return withTransaction(async (client) => {
    const { rows: cierres } = await client.query('SELECT id FROM caja_grande_cierres WHERE fecha = $1 FOR UPDATE', [fecha]);
    if (cierres.length) throw Object.assign(new Error('No se puede registrar un movimiento en un día cerrado.'), { status: 409 });
    const { rows } = await client.query(`INSERT INTO caja_grande_movimientos (tipo, concepto, monto, fecha, creado_por) VALUES ($1,$2,$3,$4,$5) RETURNING *`, [tipo, concepto, monto, fecha, usuarioId]);
    await registrarAuditoria({ usuario_id: usuarioId, accion: 'crear', entidad: 'caja_grande_movimientos', entidad_id: rows[0].id, detalle: rows[0], client, strict: true });
    return rows[0];
  }, { isolationLevel: 'SERIALIZABLE' });
}

async function eliminarMovimiento({ id, usuarioId }) {
  return withTransaction(async (client) => {
    const { rows } = await client.query('SELECT * FROM caja_grande_movimientos WHERE id = $1 FOR UPDATE', [id]);
    if (!rows[0]) throw Object.assign(new Error('Movimiento no encontrado.'), { status: 404 });
    const { rows: cierres } = await client.query('SELECT id FROM caja_grande_cierres WHERE fecha = $1 FOR UPDATE', [rows[0].fecha]);
    if (cierres.length) throw Object.assign(new Error('No se puede eliminar un movimiento de un día ya cerrado.'), { status: 409 });
    await client.query('DELETE FROM caja_grande_movimientos WHERE id = $1', [id]);
    await registrarAuditoria({ usuario_id: usuarioId, accion: 'eliminar', entidad: 'caja_grande_movimientos', entidad_id: id, detalle: rows[0], client, strict: true });
    return rows[0];
  }, { isolationLevel: 'SERIALIZABLE' });
}

async function cerrarCaja({ fecha, usuarioId }) {
  return withTransaction(async (client) => {
    const { rows: existentes } = await client.query('SELECT id FROM caja_grande_cierres WHERE fecha = $1 FOR UPDATE', [fecha]);
    if (existentes.length) throw Object.assign(new Error(`La caja grande del ${fecha} ya fue cerrada.`), { status: 409 });
    const { rows: movimientos } = await client.query('SELECT tipo, monto FROM caja_grande_movimientos WHERE fecha = $1 FOR UPDATE', [fecha]);
    const ingresos = addMoney(movimientos.filter((m) => m.tipo === 'ingreso').map((m) => m.monto));
    const egresos = addMoney(movimientos.filter((m) => m.tipo === 'egreso').map((m) => m.monto));
    const { rows } = await client.query(`INSERT INTO caja_grande_cierres (fecha, total_ingresos, total_egresos, saldo, cerrado_por) VALUES ($1,$2,$3,$4,$5) RETURNING *`, [fecha, ingresos, egresos, subtractMoney(ingresos, egresos), usuarioId]);
    await registrarAuditoria({ usuario_id: usuarioId, accion: 'cerrar', entidad: 'caja_grande_cierres', entidad_id: rows[0].id, detalle: rows[0], client, strict: true });
    return rows[0];
  }, { isolationLevel: 'SERIALIZABLE' });
}

module.exports = { registrarMovimiento, eliminarMovimiento, cerrarCaja };
