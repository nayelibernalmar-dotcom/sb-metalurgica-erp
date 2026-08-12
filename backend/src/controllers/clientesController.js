const pool = require('../db/pool');

async function listarClientes(req, res) {
  const { buscar, activo } = req.query;
  let q = 'SELECT * FROM clientes WHERE 1=1'; const p = [];
  if (buscar) { p.push(`%${buscar}%`); q += ` AND (nombre ILIKE $${p.length} OR ruc ILIKE $${p.length})`; }
  if (activo === 'true' || activo === 'false') { p.push(activo === 'true'); q += ` AND activo = $${p.length}`; }
  q += ' ORDER BY nombre ASC';
  try { const { rows } = await pool.query(q, p); res.json({ clientes: rows }); }
  catch (err) { res.status(500).json({ error: 'Error interno del servidor.' }); }
}

async function obtenerCliente(req, res) {
  try {
    const { rows } = await pool.query('SELECT * FROM clientes WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Cliente no encontrado.' });
    res.json({ cliente: rows[0] });
  } catch (err) { res.status(500).json({ error: 'Error interno del servidor.' }); }
}

async function crearCliente(req, res) {
  const { nombre, ruc, direccion, ciudad, telefono, email } = req.body;
  if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es obligatorio.' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO clientes (nombre,ruc,direccion,ciudad,telefono,email) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [nombre.trim(), ruc||null, direccion||null, ciudad||null, telefono||null, email||null]
    );
    res.status(201).json({ cliente: rows[0] });
  } catch (err) { res.status(500).json({ error: 'Error interno del servidor.' }); }
}

async function actualizarCliente(req, res) {
  const { nombre, ruc, direccion, ciudad, telefono, email, activo } = req.body;
  try {
    const { rows: cur } = await pool.query('SELECT * FROM clientes WHERE id = $1', [req.params.id]);
    if (!cur[0]) return res.status(404).json({ error: 'Cliente no encontrado.' });
    const c = cur[0];
    const { rows } = await pool.query(
      `UPDATE clientes SET nombre=$1,ruc=$2,direccion=$3,ciudad=$4,telefono=$5,email=$6,activo=$7,actualizado_en=now() WHERE id=$8 RETURNING *`,
      [nombre??c.nombre, ruc??c.ruc, direccion??c.direccion, ciudad??c.ciudad, telefono??c.telefono, email??c.email, activo??c.activo, req.params.id]
    );
    res.json({ cliente: rows[0] });
  } catch (err) { res.status(500).json({ error: 'Error interno del servidor.' }); }
}

async function eliminarCliente(req, res) {
  try {
    const { rows } = await pool.query(`UPDATE clientes SET activo=false,actualizado_en=now() WHERE id=$1 RETURNING *`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Cliente no encontrado.' });
    res.json({ mensaje: 'Cliente desactivado.', cliente: rows[0] });
  } catch (err) { res.status(500).json({ error: 'Error interno del servidor.' }); }
}

module.exports = { listarClientes, obtenerCliente, crearCliente, actualizarCliente, eliminarCliente };
