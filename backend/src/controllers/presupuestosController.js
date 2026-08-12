const pool = require('../db/pool');
const { siguienteNumero } = require('../utils/numeracion');
const UNIDADES = ['unidades', 'metros'];

function validarItems(items) {
  if (!Array.isArray(items) || items.length === 0) return 'Debe incluir al menos un ítem.';
  for (const it of items) {
    if (!it.descripcion?.trim()) return 'Cada ítem necesita descripción.';
    if (!it.cantidad || isNaN(it.cantidad) || it.cantidad <= 0) return 'Cada ítem necesita cantidad mayor a 0.';
    if (it.unidad && !UNIDADES.includes(it.unidad)) return 'Unidad inválida en un ítem.';
    if (it.precio_unitario === undefined || isNaN(it.precio_unitario) || it.precio_unitario < 0) return 'Precio unitario inválido en un ítem.';
  }
  return null;
}

async function obtenerCompleto(id) {
  const { rows } = await pool.query(
    `SELECT p.*, c.nombre AS cliente_nombre, c.ruc AS cliente_ruc, c.direccion AS cliente_direccion, c.ciudad AS cliente_ciudad
     FROM presupuestos p LEFT JOIN clientes c ON c.id = p.cliente_id WHERE p.id = $1`, [id]
  );
  if (!rows[0]) return null;
  const { rows: items } = await pool.query(`SELECT * FROM presupuesto_items WHERE presupuesto_id = $1 ORDER BY orden`, [id]);
  return { ...rows[0], items };
}

async function listarPresupuestos(req, res) {
  const { estado, cliente_id } = req.query;
  let q = `SELECT p.*, c.nombre AS cliente_nombre FROM presupuestos p LEFT JOIN clientes c ON c.id = p.cliente_id WHERE 1=1`;
  const p = [];
  if (estado) { p.push(estado); q += ` AND p.estado = $${p.length}`; }
  if (cliente_id) { p.push(cliente_id); q += ` AND p.cliente_id = $${p.length}`; }
  q += ' ORDER BY p.creado_en DESC';
  try { const { rows } = await pool.query(q, p); res.json({ presupuestos: rows }); }
  catch (err) { res.status(500).json({ error: 'Error interno del servidor.' }); }
}

async function obtenerPresupuesto(req, res) {
  try {
    const pres = await obtenerCompleto(req.params.id);
    if (!pres) return res.status(404).json({ error: 'Presupuesto no encontrado.' });
    res.json({ presupuesto: pres });
  } catch (err) { res.status(500).json({ error: 'Error interno del servidor.' }); }
}

async function crearPresupuesto(req, res) {
  const { cliente_id, contacto, validez_dias, notas, items } = req.body;
  if (!cliente_id) return res.status(400).json({ error: 'El cliente es obligatorio.' });
  const err = validarItems(items); if (err) return res.status(400).json({ error: err });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const numero = await siguienteNumero(client, 'presupuestos', 'P');
    const total = items.reduce((s, it) => s + it.cantidad * it.precio_unitario, 0);
    const { rows } = await client.query(
      `INSERT INTO presupuestos (numero,cliente_id,contacto,validez_dias,total,notas,creado_por) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [numero, cliente_id, contacto||null, validez_dias||15, total, notas||null, req.usuario.id]
    );
    let orden = 1;
    for (const it of items) {
      await client.query(
        `INSERT INTO presupuesto_items (presupuesto_id,orden,producto_id,descripcion,cantidad,unidad,precio_unitario,precio_total) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [rows[0].id, orden++, it.producto_id||null, it.descripcion.trim(), it.cantidad, it.unidad||'unidades', it.precio_unitario, it.cantidad*it.precio_unitario]
      );
    }
    await client.query('COMMIT');
    res.status(201).json({ presupuesto: await obtenerCompleto(rows[0].id) });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al crear presupuesto:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  } finally { client.release(); }
}

async function actualizarPresupuesto(req, res) {
  const { cliente_id, contacto, validez_dias, notas, estado, items } = req.body;
  if (items !== undefined) { const e = validarItems(items); if (e) return res.status(400).json({ error: e }); }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: cur } = await client.query('SELECT * FROM presupuestos WHERE id = $1', [req.params.id]);
    if (!cur[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Presupuesto no encontrado.' }); }
    const p = cur[0];
    const total = items ? items.reduce((s, it) => s + it.cantidad * it.precio_unitario, 0) : p.total;
    await client.query(
      `UPDATE presupuestos SET cliente_id=$1,contacto=$2,validez_dias=$3,notas=$4,estado=$5,total=$6,actualizado_en=now() WHERE id=$7`,
      [cliente_id??p.cliente_id, contacto??p.contacto, validez_dias??p.validez_dias, notas??p.notas, estado??p.estado, total, req.params.id]
    );
    if (items) {
      await client.query('DELETE FROM presupuesto_items WHERE presupuesto_id = $1', [req.params.id]);
      let orden = 1;
      for (const it of items) {
        await client.query(
          `INSERT INTO presupuesto_items (presupuesto_id,orden,producto_id,descripcion,cantidad,unidad,precio_unitario,precio_total) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [req.params.id, orden++, it.producto_id||null, it.descripcion.trim(), it.cantidad, it.unidad||'unidades', it.precio_unitario, it.cantidad*it.precio_unitario]
        );
      }
    }
    await client.query('COMMIT');
    res.json({ presupuesto: await obtenerCompleto(req.params.id) });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Error interno del servidor.' });
  } finally { client.release(); }
}

async function eliminarPresupuesto(req, res) {
  try {
    const { rows } = await pool.query('DELETE FROM presupuestos WHERE id = $1 RETURNING id', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Presupuesto no encontrado.' });
    res.json({ mensaje: 'Presupuesto eliminado.' });
  } catch (err) { res.status(500).json({ error: 'Error interno del servidor.' }); }
}

module.exports = { listarPresupuestos, obtenerPresupuesto, crearPresupuesto, actualizarPresupuesto, eliminarPresupuesto };
