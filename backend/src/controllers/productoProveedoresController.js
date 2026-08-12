// src/controllers/productoProveedoresController.js
// Relación N a N entre productos y proveedores: permite saber a quién
// comprarle cada producto (y a qué precio) sin elegirlo a mano cada vez.
const pool = require('../db/pool');
const { registrarAuditoria } = require('../utils/auditoria');

// GET /api/productos/:id/proveedores
async function listarPorProducto(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT pp.id, pp.producto_id, pp.proveedor_id, pp.precio_compra, pp.es_principal,
              pv.nombre AS proveedor_nombre, pv.ruc AS proveedor_ruc
       FROM producto_proveedores pp
       JOIN proveedores pv ON pv.id = pp.proveedor_id
       WHERE pp.producto_id = $1
       ORDER BY pp.es_principal DESC, pv.nombre`,
      [req.params.id]
    );
    res.json({ proveedores: rows });
  } catch (err) {
    console.error('Error al listar proveedores del producto:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

// POST /api/productos/:id/proveedores  { proveedor_id, precio_compra, es_principal }
async function vincular(req, res) {
  const producto_id = req.params.id;
  const { proveedor_id, precio_compra, es_principal } = req.body;
  if (!proveedor_id) return res.status(400).json({ error: 'Debe indicar el proveedor.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (es_principal) {
      // Solo puede haber un principal por producto: bajamos el anterior
      await client.query(`UPDATE producto_proveedores SET es_principal = false WHERE producto_id = $1`, [producto_id]);
    }
    const { rows } = await client.query(
      `INSERT INTO producto_proveedores (producto_id, proveedor_id, precio_compra, es_principal)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (producto_id, proveedor_id)
       DO UPDATE SET precio_compra = EXCLUDED.precio_compra, es_principal = EXCLUDED.es_principal
       RETURNING *`,
      [producto_id, proveedor_id, precio_compra || 0, !!es_principal]
    );
    await client.query('COMMIT');
    await registrarAuditoria({ usuario_id: req.usuario.id, accion: 'vincular', entidad: 'producto_proveedores', entidad_id: rows[0].id, detalle: rows[0] });
    res.status(201).json({ vinculo: rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al vincular proveedor con producto:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  } finally { client.release(); }
}

// DELETE /api/productos/:id/proveedores/:proveedorId
async function desvincular(req, res) {
  try {
    const { rows } = await pool.query(
      `DELETE FROM producto_proveedores WHERE producto_id = $1 AND proveedor_id = $2 RETURNING id`,
      [req.params.id, req.params.proveedorId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Ese proveedor no está vinculado a este producto.' });
    res.json({ mensaje: 'Proveedor desvinculado del producto.' });
  } catch (err) {
    console.error('Error al desvincular proveedor:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

module.exports = { listarPorProducto, vincular, desvincular };
