const pool = require('../db/pool');
const { siguienteNumero } = require('../utils/numeracion');
const UNIDADES = ['unidades', 'metros'];

function validarItems(items) {
  if (!Array.isArray(items) || items.length === 0) return 'Debe incluir al menos un ítem.';
  for (const it of items) {
    if (!it.descripcion?.trim()) return 'Cada ítem necesita descripción.';
    if (!it.cantidad || isNaN(it.cantidad) || it.cantidad <= 0) return 'Cada ítem necesita cantidad mayor a 0.';
    if (it.unidad && !UNIDADES.includes(it.unidad)) return 'Unidad inválida en un ítem.';
  }
  return null;
}

async function obtenerCompleto(id) {
  const { rows } = await pool.query(
    `SELECT r.*, c.nombre AS cliente_nombre, c.ruc AS cliente_ruc
     FROM remitos r LEFT JOIN clientes c ON c.id = r.cliente_id WHERE r.id = $1`, [id]
  );
  if (!rows[0]) return null;
  const { rows: items } = await pool.query(`SELECT * FROM remito_items WHERE remito_id = $1 ORDER BY orden`, [id]);
  return { ...rows[0], items };
}

async function listarRemitos(req, res) {
  const { cliente_id } = req.query;
  let q = `SELECT r.*, c.nombre AS cliente_nombre FROM remitos r LEFT JOIN clientes c ON c.id = r.cliente_id WHERE 1=1`;
  const p = [];
  if (cliente_id) { p.push(cliente_id); q += ` AND r.cliente_id = $${p.length}`; }
  q += ' ORDER BY r.creado_en DESC';
  try { const { rows } = await pool.query(q, p); res.json({ remitos: rows }); }
  catch (err) { res.status(500).json({ error: 'Error interno del servidor.' }); }
}

async function obtenerRemito(req, res) {
  try {
    const rem = await obtenerCompleto(req.params.id);
    if (!rem) return res.status(404).json({ error: 'Remito no encontrado.' });
    res.json({ remito: rem });
  } catch (err) { res.status(500).json({ error: 'Error interno del servidor.' }); }
}

async function crearRemito(req, res) {
  const { cliente_id, motivo_traslado, direccion_origen, ciudad_origen, direccion_entrega, ruc_receptor, notas, items } = req.body;
  if (!cliente_id) return res.status(400).json({ error: 'El cliente es obligatorio.' });
  const err = validarItems(items); if (err) return res.status(400).json({ error: err });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const numero = await siguienteNumero(client, 'remitos', 'R');
    const { rows } = await client.query(
      `INSERT INTO remitos (numero,cliente_id,motivo_traslado,direccion_origen,ciudad_origen,direccion_entrega,ruc_receptor,notas,creado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [numero, cliente_id, motivo_traslado||null, direccion_origen||null, ciudad_origen||null, direccion_entrega||null, ruc_receptor||null, notas||null, req.usuario.id]
    );
    let orden = 1;
    for (const it of items) {
      await client.query(
        `INSERT INTO remito_items (remito_id,orden,producto_id,descripcion,cantidad,unidad) VALUES ($1,$2,$3,$4,$5,$6)`,
        [rows[0].id, orden++, it.producto_id||null, it.descripcion.trim(), it.cantidad, it.unidad||'unidades']
      );
    }
    await client.query('COMMIT');
    res.status(201).json({ remito: await obtenerCompleto(rows[0].id) });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Error interno del servidor.' });
  } finally { client.release(); }
}

async function actualizarRemito(req, res) {
  const { cliente_id, motivo_traslado, direccion_origen, ciudad_origen, direccion_entrega, ruc_receptor, notas, items } = req.body;
  if (items !== undefined) { const e = validarItems(items); if (e) return res.status(400).json({ error: e }); }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: cur } = await client.query('SELECT * FROM remitos WHERE id = $1', [req.params.id]);
    if (!cur[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Remito no encontrado.' }); }
    const r = cur[0];
    await client.query(
      `UPDATE remitos SET cliente_id=$1,motivo_traslado=$2,direccion_origen=$3,ciudad_origen=$4,direccion_entrega=$5,ruc_receptor=$6,notas=$7,actualizado_en=now() WHERE id=$8`,
      [cliente_id??r.cliente_id, motivo_traslado??r.motivo_traslado, direccion_origen??r.direccion_origen, ciudad_origen??r.ciudad_origen, direccion_entrega??r.direccion_entrega, ruc_receptor??r.ruc_receptor, notas??r.notas, req.params.id]
    );
    if (items) {
      await client.query('DELETE FROM remito_items WHERE remito_id = $1', [req.params.id]);
      let orden = 1;
      for (const it of items) {
        await client.query(
          `INSERT INTO remito_items (remito_id,orden,producto_id,descripcion,cantidad,unidad) VALUES ($1,$2,$3,$4,$5,$6)`,
          [req.params.id, orden++, it.producto_id||null, it.descripcion.trim(), it.cantidad, it.unidad||'unidades']
        );
      }
    }
    await client.query('COMMIT');
    res.json({ remito: await obtenerCompleto(req.params.id) });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Error interno del servidor.' });
  } finally { client.release(); }
}

module.exports = { listarRemitos, obtenerRemito, crearRemito, actualizarRemito };
