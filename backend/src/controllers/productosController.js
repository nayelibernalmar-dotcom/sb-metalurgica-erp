const pool = require('../db/pool');
const UNIDADES = ['unidades', 'metros'];

async function listarProductos(req, res) {
  const { buscar, activo } = req.query;
  let q = 'SELECT * FROM productos WHERE 1=1';
  const p = [];
  if (buscar) { p.push(`%${buscar}%`); q += ` AND descripcion ILIKE $${p.length}`; }
  if (activo === 'true' || activo === 'false') { p.push(activo === 'true'); q += ` AND activo = $${p.length}`; }
  q += ' ORDER BY descripcion ASC';
  try {
    const { rows } = await pool.query(q, p);
    res.json({ productos: rows });
  } catch (err) { res.status(500).json({ error: 'Error interno del servidor.' }); }
}

async function obtenerProducto(req, res) {
  try {
    const { rows } = await pool.query('SELECT * FROM productos WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Producto no encontrado.' });
    res.json({ producto: rows[0] });
  } catch (err) { res.status(500).json({ error: 'Error interno del servidor.' }); }
}

async function crearProducto(req, res) {
  const { descripcion, unidad, precio, stock, stock_minimo } = req.body;
  if (!descripcion?.trim()) return res.status(400).json({ error: 'La descripción es obligatoria.' });
  if (unidad && !UNIDADES.includes(unidad)) return res.status(400).json({ error: `Unidad inválida. Debe ser: ${UNIDADES.join(' o ')}.` });
  try {
    const { rows } = await pool.query(
      `INSERT INTO productos (descripcion, unidad, precio, stock, stock_minimo) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [descripcion.trim(), unidad || 'unidades', precio || 0, stock || 0, stock_minimo || 0]
    );
    res.status(201).json({ producto: rows[0] });
  } catch (err) { res.status(500).json({ error: 'Error interno del servidor.' }); }
}

async function actualizarProducto(req, res) {
  const { descripcion, unidad, precio, stock, stock_minimo, activo } = req.body;
  if (unidad && !UNIDADES.includes(unidad)) return res.status(400).json({ error: 'Unidad inválida.' });
  try {
    const { rows: cur } = await pool.query('SELECT * FROM productos WHERE id = $1', [req.params.id]);
    if (!cur[0]) return res.status(404).json({ error: 'Producto no encontrado.' });
    const c = cur[0];
    const { rows } = await pool.query(
      `UPDATE productos SET descripcion=$1,unidad=$2,precio=$3,stock=$4,stock_minimo=$5,activo=$6,actualizado_en=now() WHERE id=$7 RETURNING *`,
      [descripcion??c.descripcion, unidad??c.unidad, precio??c.precio, stock??c.stock, stock_minimo??c.stock_minimo, activo??c.activo, req.params.id]
    );
    res.json({ producto: rows[0] });
  } catch (err) { res.status(500).json({ error: 'Error interno del servidor.' }); }
}

async function eliminarProducto(req, res) {
  try {
    const { rows } = await pool.query(`UPDATE productos SET activo=false,actualizado_en=now() WHERE id=$1 RETURNING *`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Producto no encontrado.' });
    res.json({ mensaje: 'Producto desactivado.', producto: rows[0] });
  } catch (err) { res.status(500).json({ error: 'Error interno del servidor.' }); }
}

async function ajustarStock(req, res) {
  const { cantidad, tipo } = req.body;
  if (!cantidad || isNaN(cantidad) || cantidad <= 0) return res.status(400).json({ error: 'Cantidad inválida.' });
  if (!['entrada', 'salida'].includes(tipo)) return res.status(400).json({ error: 'Tipo debe ser "entrada" o "salida".' });
  try {
    const { rows: cur } = await pool.query('SELECT stock FROM productos WHERE id = $1', [req.params.id]);
    if (!cur[0]) return res.status(404).json({ error: 'Producto no encontrado.' });
    const nuevo = parseFloat(cur[0].stock) + (tipo === 'entrada' ? cantidad : -cantidad);
    if (nuevo < 0) return res.status(400).json({ error: 'Stock insuficiente.' });
    const { rows } = await pool.query(`UPDATE productos SET stock=$1,actualizado_en=now() WHERE id=$2 RETURNING *`, [nuevo, req.params.id]);
    res.json({ producto: rows[0] });
  } catch (err) { res.status(500).json({ error: 'Error interno del servidor.' }); }
}

module.exports = { listarProductos, obtenerProducto, crearProducto, actualizarProducto, eliminarProducto, ajustarStock };
