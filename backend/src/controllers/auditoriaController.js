// src/controllers/auditoriaController.js
const pool = require('../db/pool');

// GET /api/auditoria?entidad=empleado_pagos&desde=...&hasta=...
async function listar(req, res) {
  const { entidad, usuario_id, desde, hasta } = req.query;
  const cond = [];
  const params = [];
  if (entidad) { params.push(entidad); cond.push(`a.entidad = $${params.length}`); }
  if (usuario_id) { params.push(usuario_id); cond.push(`a.usuario_id = $${params.length}`); }
  if (desde) { params.push(desde); cond.push(`a.creado_en >= $${params.length}`); }
  if (hasta) { params.push(hasta); cond.push(`a.creado_en <= $${params.length}::date + interval '1 day'`); }
  const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
  try {
    const { rows } = await pool.query(
      `SELECT a.*, u.nombre AS usuario_nombre
       FROM auditoria a LEFT JOIN usuarios u ON u.id = a.usuario_id
       ${where}
       ORDER BY a.creado_en DESC
       LIMIT 500`,
      params
    );
    res.json({ registros: rows });
  } catch (err) {
    console.error('Error al listar auditoría:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

module.exports = { listar };
