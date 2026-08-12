// src/controllers/cajaController.js
const pool = require('../db/pool');

// GET /api/caja?fecha=2026-07-02
// Si no se pasa fecha, devuelve el día de hoy.
async function obtenerMovimientos(req, res) {
  const fecha = req.query.fecha || new Date().toISOString().split('T')[0];

  try {
    const { rows: movimientos } = await pool.query(
      `SELECT m.*, u.nombre AS creado_por_nombre
       FROM caja_movimientos m
       LEFT JOIN usuarios u ON u.id = m.creado_por
       WHERE m.fecha = $1
       ORDER BY m.creado_en ASC`,
      [fecha]
    );

    // Totales del día
    const ingresos = movimientos
      .filter(m => m.tipo === 'ingreso')
      .reduce((s, m) => s + parseFloat(m.monto), 0);
    const egresos = movimientos
      .filter(m => m.tipo === 'egreso')
      .reduce((s, m) => s + parseFloat(m.monto), 0);

    // Ver si el día ya fue cerrado
    const { rows: cierres } = await pool.query(
      `SELECT * FROM caja_cierres WHERE fecha = $1`, [fecha]
    );

    res.json({
      fecha,
      movimientos,
      resumen: {
        total_ingresos: ingresos,
        total_egresos: egresos,
        saldo: ingresos - egresos,
      },
      cierre: cierres[0] || null,
    });
  } catch (err) {
    console.error('Error al obtener movimientos de caja:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

// GET /api/caja/resumen?desde=2026-07-01&hasta=2026-07-07
// Resumen por día para el rango dado (útil para el reporte semanal al jefe)
async function obtenerResumen(req, res) {
  const { desde, hasta } = req.query;

  if (!desde || !hasta) {
    return res.status(400).json({ error: 'Debe indicar los parámetros "desde" y "hasta" (formato: YYYY-MM-DD).' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT
         fecha,
         SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END) AS total_ingresos,
         SUM(CASE WHEN tipo = 'egreso' THEN monto ELSE 0 END) AS total_egresos,
         SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE -monto END) AS saldo
       FROM caja_movimientos
       WHERE fecha BETWEEN $1 AND $2
       GROUP BY fecha
       ORDER BY fecha ASC`,
      [desde, hasta]
    );

    const totalIngresos = rows.reduce((s, r) => s + parseFloat(r.total_ingresos), 0);
    const totalEgresos = rows.reduce((s, r) => s + parseFloat(r.total_egresos), 0);

    res.json({
      desde,
      hasta,
      dias: rows,
      totales: {
        total_ingresos: totalIngresos,
        total_egresos: totalEgresos,
        saldo: totalIngresos - totalEgresos,
      },
    });
  } catch (err) {
    console.error('Error al obtener resumen de caja:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

// POST /api/caja/movimientos
// Registrar un movimiento manual (ingreso o egreso que no viene de una venta)
// body: { tipo: 'ingreso'|'egreso', concepto, monto, fecha? }
async function registrarMovimiento(req, res) {
  const { tipo, concepto, monto, fecha } = req.body;

  if (!['ingreso', 'egreso'].includes(tipo)) {
    return res.status(400).json({ error: 'El tipo debe ser "ingreso" o "egreso".' });
  }
  if (!concepto || !concepto.trim()) {
    return res.status(400).json({ error: 'El concepto es obligatorio.' });
  }
  if (!monto || isNaN(monto) || monto <= 0) {
    return res.status(400).json({ error: 'El monto debe ser un número positivo.' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO caja_movimientos (tipo, concepto, monto, fecha, creado_por)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [tipo, concepto.trim(), monto, fecha || new Date().toISOString().split('T')[0], req.usuario.id]
    );
    res.status(201).json({ movimiento: rows[0] });
  } catch (err) {
    console.error('Error al registrar movimiento:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

// DELETE /api/caja/movimientos/:id (solo admin, y solo si el día no está cerrado)
async function eliminarMovimiento(req, res) {
  const { id } = req.params;
  try {
    const { rows: mov } = await pool.query(
      `SELECT * FROM caja_movimientos WHERE id = $1`, [id]
    );
    if (mov.length === 0) {
      return res.status(404).json({ error: 'Movimiento no encontrado.' });
    }

    const { rows: cierre } = await pool.query(
      `SELECT id FROM caja_cierres WHERE fecha = $1`, [mov[0].fecha]
    );
    if (cierre.length > 0) {
      return res.status(400).json({ error: 'No se puede eliminar un movimiento de un día ya cerrado.' });
    }

    await pool.query(`DELETE FROM caja_movimientos WHERE id = $1`, [id]);
    res.json({ mensaje: 'Movimiento eliminado correctamente.' });
  } catch (err) {
    console.error('Error al eliminar movimiento:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

// POST /api/caja/cierre
// Cierra la caja del día (o de una fecha específica)
// body: { fecha? }
async function cerrarCaja(req, res) {
  const fecha = req.body.fecha || new Date().toISOString().split('T')[0];

  try {
    // Verificar que no esté ya cerrada
    const { rows: yaExiste } = await pool.query(
      `SELECT id FROM caja_cierres WHERE fecha = $1`, [fecha]
    );
    if (yaExiste.length > 0) {
      return res.status(400).json({ error: `La caja del ${fecha} ya fue cerrada.` });
    }

    const { rows: movs } = await pool.query(
      `SELECT tipo, SUM(monto) as total FROM caja_movimientos
       WHERE fecha = $1 GROUP BY tipo`, [fecha]
    );

    const ingresos = parseFloat(movs.find(m => m.tipo === 'ingreso')?.total || 0);
    const egresos = parseFloat(movs.find(m => m.tipo === 'egreso')?.total || 0);

    const { rows } = await pool.query(
      `INSERT INTO caja_cierres (fecha, total_ingresos, total_egresos, saldo, cerrado_por)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [fecha, ingresos, egresos, ingresos - egresos, req.usuario.id]
    );

    res.status(201).json({ cierre: rows[0] });
  } catch (err) {
    console.error('Error al cerrar caja:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

module.exports = {
  obtenerMovimientos,
  obtenerResumen,
  registrarMovimiento,
  eliminarMovimiento,
  cerrarCaja,
};
