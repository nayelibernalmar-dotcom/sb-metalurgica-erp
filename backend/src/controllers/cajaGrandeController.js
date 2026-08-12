// src/controllers/cajaGrandeController.js
// La Caja Grande es de donde sale la plata para pagar a los empleados
// (adelantos, sueldos, aguinaldos, bonos). Está separada de la Caja Chica
// (caja_movimientos) para que las ventas del día a día no se mezclen con esto.
const pool = require('../db/pool');
const { registrarAuditoria } = require('../utils/auditoria');

// GET /api/caja-grande?fecha=2026-07-02
async function obtenerMovimientos(req, res) {
  const fecha = req.query.fecha || new Date().toISOString().split('T')[0];
  try {
    const { rows: movimientos } = await pool.query(
      `SELECT m.*, u.nombre AS creado_por_nombre
       FROM caja_grande_movimientos m
       LEFT JOIN usuarios u ON u.id = m.creado_por
       WHERE m.fecha = $1
       ORDER BY m.creado_en ASC`,
      [fecha]
    );
    const ingresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + parseFloat(m.monto), 0);
    const egresos = movimientos.filter(m => m.tipo === 'egreso').reduce((s, m) => s + parseFloat(m.monto), 0);

    const { rows: cierres } = await pool.query(`SELECT * FROM caja_grande_cierres WHERE fecha = $1`, [fecha]);

    res.json({
      fecha,
      movimientos,
      resumen: { total_ingresos: ingresos, total_egresos: egresos, saldo: ingresos - egresos },
      cierre: cierres[0] || null,
    });
  } catch (err) {
    console.error('Error al obtener movimientos de caja grande:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

// GET /api/caja-grande/resumen?desde=...&hasta=...
async function obtenerResumen(req, res) {
  const { desde, hasta } = req.query;
  if (!desde || !hasta) {
    return res.status(400).json({ error: 'Debe indicar los parámetros "desde" y "hasta" (formato: YYYY-MM-DD).' });
  }
  try {
    const { rows } = await pool.query(
      `SELECT fecha,
         SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END) AS total_ingresos,
         SUM(CASE WHEN tipo = 'egreso' THEN monto ELSE 0 END) AS total_egresos,
         SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE -monto END) AS saldo
       FROM caja_grande_movimientos
       WHERE fecha BETWEEN $1 AND $2
       GROUP BY fecha ORDER BY fecha ASC`,
      [desde, hasta]
    );
    const totalIngresos = rows.reduce((s, r) => s + parseFloat(r.total_ingresos), 0);
    const totalEgresos = rows.reduce((s, r) => s + parseFloat(r.total_egresos), 0);
    res.json({ desde, hasta, dias: rows, totales: { total_ingresos: totalIngresos, total_egresos: totalEgresos, saldo: totalIngresos - totalEgresos } });
  } catch (err) {
    console.error('Error al obtener resumen de caja grande:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

// POST /api/caja-grande/movimientos — ingreso manual de fondos (ej: el dueño mete plata) o egreso que no es un pago de empleado
async function registrarMovimiento(req, res) {
  const { tipo, concepto, monto, fecha } = req.body;
  if (!['ingreso', 'egreso'].includes(tipo)) return res.status(400).json({ error: 'El tipo debe ser "ingreso" o "egreso".' });
  if (!concepto || !concepto.trim()) return res.status(400).json({ error: 'El concepto es obligatorio.' });
  if (!monto || isNaN(monto) || monto <= 0) return res.status(400).json({ error: 'El monto debe ser un número positivo.' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO caja_grande_movimientos (tipo, concepto, monto, fecha, creado_por)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [tipo, concepto.trim(), monto, fecha || new Date().toISOString().split('T')[0], req.usuario.id]
    );
    await registrarAuditoria({ usuario_id: req.usuario.id, accion: 'crear', entidad: 'caja_grande_movimientos', entidad_id: rows[0].id, detalle: rows[0] });
    res.status(201).json({ movimiento: rows[0] });
  } catch (err) {
    console.error('Error al registrar movimiento de caja grande:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

// DELETE /api/caja-grande/movimientos/:id (solo admin, y solo si el día no está cerrado)
async function eliminarMovimiento(req, res) {
  const { id } = req.params;
  try {
    const { rows: mov } = await pool.query(`SELECT * FROM caja_grande_movimientos WHERE id = $1`, [id]);
    if (mov.length === 0) return res.status(404).json({ error: 'Movimiento no encontrado.' });

    const { rows: cierre } = await pool.query(`SELECT id FROM caja_grande_cierres WHERE fecha = $1`, [mov[0].fecha]);
    if (cierre.length > 0) return res.status(400).json({ error: 'No se puede eliminar un movimiento de un día ya cerrado.' });

    await pool.query(`DELETE FROM caja_grande_movimientos WHERE id = $1`, [id]);
    await registrarAuditoria({ usuario_id: req.usuario.id, accion: 'eliminar', entidad: 'caja_grande_movimientos', entidad_id: Number(id), detalle: mov[0] });
    res.json({ mensaje: 'Movimiento eliminado correctamente.' });
  } catch (err) {
    console.error('Error al eliminar movimiento de caja grande:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

// POST /api/caja-grande/cierre
async function cerrarCaja(req, res) {
  const fecha = req.body.fecha || new Date().toISOString().split('T')[0];
  try {
    const { rows: yaExiste } = await pool.query(`SELECT id FROM caja_grande_cierres WHERE fecha = $1`, [fecha]);
    if (yaExiste.length > 0) return res.status(400).json({ error: `La caja grande del ${fecha} ya fue cerrada.` });

    const { rows: movs } = await pool.query(`SELECT tipo, SUM(monto) as total FROM caja_grande_movimientos WHERE fecha = $1 GROUP BY tipo`, [fecha]);
    const ingresos = parseFloat(movs.find(m => m.tipo === 'ingreso')?.total || 0);
    const egresos = parseFloat(movs.find(m => m.tipo === 'egreso')?.total || 0);

    const { rows } = await pool.query(
      `INSERT INTO caja_grande_cierres (fecha, total_ingresos, total_egresos, saldo, cerrado_por)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [fecha, ingresos, egresos, ingresos - egresos, req.usuario.id]
    );
    res.status(201).json({ cierre: rows[0] });
  } catch (err) {
    console.error('Error al cerrar caja grande:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

module.exports = { obtenerMovimientos, obtenerResumen, registrarMovimiento, eliminarMovimiento, cerrarCaja };
