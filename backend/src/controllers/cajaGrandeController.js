const pool = require('../db/pool');
const service = require('../services/cajaGrandeService');
const { addMoney, subtractMoney } = require('../utils/money');

const hoy = () => new Date().toISOString().split('T')[0];
const responderError = (res, err, contexto) => {
  console.error(contexto, err);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Error interno del servidor.' });
};

async function obtenerMovimientos(req, res) {
  const fecha = req.query.fecha || hoy();
  try {
    const { rows: movimientos } = await pool.query(`SELECT m.*, u.nombre AS creado_por_nombre FROM caja_grande_movimientos m LEFT JOIN usuarios u ON u.id = m.creado_por WHERE m.fecha = $1 ORDER BY m.creado_en ASC`, [fecha]);
    const ingresos = addMoney(movimientos.filter((m) => m.tipo === 'ingreso').map((m) => m.monto));
    const egresos = addMoney(movimientos.filter((m) => m.tipo === 'egreso').map((m) => m.monto));
    const { rows: cierres } = await pool.query('SELECT * FROM caja_grande_cierres WHERE fecha = $1', [fecha]);
    res.json({ fecha, movimientos, resumen: { total_ingresos: ingresos, total_egresos: egresos, saldo: subtractMoney(ingresos, egresos) }, cierre: cierres[0] || null });
  } catch (err) { responderError(res, err, 'Error al obtener movimientos de caja grande:'); }
}

async function obtenerResumen(req, res) {
  const { desde, hasta } = req.query;
  if (!desde || !hasta) return res.status(400).json({ error: 'Debe indicar "desde" y "hasta" (YYYY-MM-DD).' });
  try {
    const { rows } = await pool.query(`SELECT fecha, SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END) AS total_ingresos, SUM(CASE WHEN tipo = 'egreso' THEN monto ELSE 0 END) AS total_egresos, SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE -monto END) AS saldo FROM caja_grande_movimientos WHERE fecha BETWEEN $1 AND $2 GROUP BY fecha ORDER BY fecha`, [desde, hasta]);
    const ingresos = addMoney(rows.map((r) => r.total_ingresos));
    const egresos = addMoney(rows.map((r) => r.total_egresos));
    res.json({ desde, hasta, dias: rows, totales: { total_ingresos: ingresos, total_egresos: egresos, saldo: subtractMoney(ingresos, egresos) } });
  } catch (err) { responderError(res, err, 'Error al obtener resumen de caja grande:'); }
}

async function registrarMovimiento(req, res) {
  const { tipo, concepto, monto, fecha } = req.body;
  if (!['ingreso', 'egreso'].includes(tipo)) return res.status(400).json({ error: 'El tipo debe ser "ingreso" o "egreso".' });
  if (!concepto?.trim()) return res.status(400).json({ error: 'El concepto es obligatorio.' });
  if (!/^\d+(?:\.\d{1,2})?$/.test(String(monto)) || Number(monto) <= 0) return res.status(400).json({ error: 'El monto debe ser positivo y tener hasta dos decimales.' });
  try { res.status(201).json({ movimiento: await service.registrarMovimiento({ tipo, concepto: concepto.trim(), monto, fecha: fecha || hoy(), usuarioId: req.usuario.id }) }); }
  catch (err) { responderError(res, err, 'Error al registrar movimiento de caja grande:'); }
}

async function eliminarMovimiento(req, res) {
  try { await service.eliminarMovimiento({ id: req.params.id, usuarioId: req.usuario.id }); res.json({ mensaje: 'Movimiento eliminado correctamente.' }); }
  catch (err) { responderError(res, err, 'Error al eliminar movimiento de caja grande:'); }
}

async function cerrarCaja(req, res) {
  try { res.status(201).json({ cierre: await service.cerrarCaja({ fecha: req.body.fecha || hoy(), usuarioId: req.usuario.id }) }); }
  catch (err) { responderError(res, err, 'Error al cerrar caja grande:'); }
}

module.exports = { obtenerMovimientos, obtenerResumen, registrarMovimiento, eliminarMovimiento, cerrarCaja };
