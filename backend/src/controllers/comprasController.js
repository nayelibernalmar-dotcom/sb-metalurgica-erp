const pool = require('../db/pool');
const { siguienteNumero } = require('../utils/numeracion');
const { crearAsientoAutomatico, anularAsientosDeOrigen } = require('../utils/asientos');

const UNIDADES = ['unidades', 'metros'];
const ESTADOS = ['pendiente', 'recibida', 'anulada'];

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
    `SELECT c.*, p.nombre AS proveedor_nombre, p.ruc AS proveedor_ruc
     FROM compras c LEFT JOIN proveedores p ON p.id = c.proveedor_id WHERE c.id = $1`, [id]
  );
  if (!rows[0]) return null;
  const { rows: items } = await pool.query(`SELECT * FROM compra_items WHERE compra_id = $1 ORDER BY orden`, [id]);
  return { ...rows[0], items };
}

async function listarCompras(req, res) {
  const { estado, proveedor_id } = req.query;
  let q = `SELECT c.*, p.nombre AS proveedor_nombre FROM compras c LEFT JOIN proveedores p ON p.id = c.proveedor_id WHERE 1=1`;
  const par = [];
  if (estado) { par.push(estado); q += ` AND c.estado = $${par.length}`; }
  if (proveedor_id) { par.push(proveedor_id); q += ` AND c.proveedor_id = $${par.length}`; }
  q += ' ORDER BY c.creado_en DESC';
  try { const { rows } = await pool.query(q, par); res.json({ compras: rows }); }
  catch (err) { console.error('Error al listar compras:', err); res.status(500).json({ error: 'Error interno del servidor.' }); }
}

async function obtenerCompra(req, res) {
  try {
    const compra = await obtenerCompleto(req.params.id);
    if (!compra) return res.status(404).json({ error: 'Compra no encontrada.' });
    res.json({ compra });
  } catch (err) { res.status(500).json({ error: 'Error interno del servidor.' }); }
}

// Registra en cuenta corriente + stock + asiento contable cuando una compra queda "recibida"
async function aplicarRecepcion(client, compra, items, usuarioId) {
  for (const it of items) {
    if (it.producto_id) {
      await client.query('UPDATE productos SET stock = stock + $1, actualizado_en = now() WHERE id = $2', [it.cantidad, it.producto_id]);
    }
  }
  await client.query(
    `INSERT INTO proveedor_movimientos (proveedor_id,fecha,tipo,concepto,monto,compra_id,creado_por)
     VALUES ($1,$2,'compra',$3,$4,$5,$6)`,
    [compra.proveedor_id, compra.fecha, `Compra ${compra.numero}`, compra.total, compra.id, usuarioId]
  );
  await crearAsientoAutomatico(client, {
    fecha: compra.fecha,
    descripcion: `Compra ${compra.numero}`,
    origen: 'compra',
    origen_tabla: 'compras',
    origen_id: compra.id,
    creado_por: usuarioId,
    lineas: [
      { cuenta_codigo: '1.1.04', debe: compra.total, descripcion: `Compra ${compra.numero}` },
      { cuenta_codigo: '2.1.01', haber: compra.total, descripcion: `Compra ${compra.numero}` },
    ],
  });
}

async function crearCompra(req, res) {
  const { proveedor_id, fecha, notas, estado, items } = req.body;
  if (!proveedor_id) return res.status(400).json({ error: 'El proveedor es obligatorio.' });
  if (estado && !ESTADOS.includes(estado)) return res.status(400).json({ error: 'Estado inválido.' });
  const errItems = validarItems(items); if (errItems) return res.status(400).json({ error: errItems });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const numero = await siguienteNumero(client, 'compras', 'C');
    const total = items.reduce((s, it) => s + it.cantidad * it.precio_unitario, 0);
    const estadoFinal = estado || 'pendiente';
    const fechaCompra = fecha || new Date().toISOString().slice(0, 10);

    const { rows } = await client.query(
      `INSERT INTO compras (numero,proveedor_id,fecha,estado,subtotal,total,notas,creado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [numero, proveedor_id, fechaCompra, estadoFinal, total, total, notas || null, req.usuario.id]
    );
    const compra = rows[0];

    let orden = 1;
    for (const it of items) {
      await client.query(
        `INSERT INTO compra_items (compra_id,orden,producto_id,descripcion,cantidad,unidad,precio_unitario,precio_total)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [compra.id, orden++, it.producto_id || null, it.descripcion.trim(), it.cantidad, it.unidad || 'unidades', it.precio_unitario, it.cantidad * it.precio_unitario]
      );
    }

    if (estadoFinal === 'recibida') {
      await aplicarRecepcion(client, compra, items.map(it => ({ ...it, cantidad: parseFloat(it.cantidad) })), req.usuario.id);
    }

    await client.query('COMMIT');
    res.status(201).json({ compra: await obtenerCompleto(compra.id) });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al crear compra:', err);
    res.status(500).json({ error: err.message || 'Error interno del servidor.' });
  } finally { client.release(); }
}

async function cambiarEstadoCompra(req, res) {
  const { estado } = req.body;
  if (!ESTADOS.includes(estado)) return res.status(400).json({ error: 'Estado inválido.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: cur } = await client.query('SELECT * FROM compras WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (!cur[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Compra no encontrada.' }); }
    const compra = cur[0];

    if (compra.estado === 'anulada') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'La compra ya está anulada y no se puede modificar.' });
    }
    if (compra.estado === 'recibida' && estado === 'recibida') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Esta compra ya fue recibida.' });
    }

    await client.query('UPDATE compras SET estado=$1, actualizado_en=now() WHERE id=$2', [estado, req.params.id]);

    if (estado === 'recibida' && compra.estado !== 'recibida') {
      const { rows: items } = await client.query('SELECT * FROM compra_items WHERE compra_id = $1', [compra.id]);
      await aplicarRecepcion(client, compra, items.map(it => ({ ...it, cantidad: Number(it.cantidad) })), req.usuario.id);
    }

    if (estado === 'anulada') {
      // Si ya había sido recibida, se revierte el stock y la cuenta corriente
      if (compra.estado === 'recibida') {
        const { rows: items } = await client.query('SELECT * FROM compra_items WHERE compra_id = $1', [compra.id]);
        for (const it of items) {
          if (it.producto_id) {
            await client.query('UPDATE productos SET stock = GREATEST(stock - $1, 0), actualizado_en = now() WHERE id = $2', [it.cantidad, it.producto_id]);
          }
        }
        await client.query('DELETE FROM proveedor_movimientos WHERE compra_id = $1', [compra.id]);
      }
      await anularAsientosDeOrigen(client, 'compras', compra.id);
    }

    await client.query('COMMIT');
    res.json({ compra: await obtenerCompleto(req.params.id) });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al cambiar estado de compra:', err);
    res.status(500).json({ error: err.message || 'Error interno del servidor.' });
  } finally { client.release(); }
}

// Sugerencias de reposición: compara stock actual contra la rotación real (ventas de los últimos 30 días)
async function sugerenciasReposicion(req, res) {
  try {
    const { rows } = await pool.query(`
      SELECT p.id, p.descripcion, p.unidad, p.stock, p.stock_minimo,
        COALESCE(v.unidades_30d, 0) AS unidades_30d,
        pp.proveedor_id, pv.nombre AS proveedor_nombre, pp.precio_compra
      FROM productos p
      LEFT JOIN (
        SELECT vi.producto_id, SUM(vi.cantidad) AS unidades_30d
        FROM venta_items vi
        JOIN ventas ve ON ve.id = vi.venta_id
        WHERE ve.estado <> 'anulada' AND ve.fecha >= CURRENT_DATE - INTERVAL '30 days' AND vi.producto_id IS NOT NULL
        GROUP BY vi.producto_id
      ) v ON v.producto_id = p.id
      LEFT JOIN producto_proveedores pp ON pp.producto_id = p.id AND pp.es_principal = true
      LEFT JOIN proveedores pv ON pv.id = pp.proveedor_id
      WHERE p.activo = true
      ORDER BY p.descripcion
    `);

    const sugerencias = rows.map(p => {
      const rotacionDiaria = Number(p.unidades_30d) / 30;
      const stockActual = Number(p.stock);
      const stockMinimo = Number(p.stock_minimo);
      // Objetivo: cubrir 30 días de venta esperada, con un piso del stock mínimo configurado
      const objetivo = Math.max(rotacionDiaria * 30, stockMinimo * 2);
      const sugerido = Math.max(0, Math.ceil(objetivo - stockActual));
      const necesitaReponer = stockActual <= stockMinimo || (rotacionDiaria > 0 && stockActual < rotacionDiaria * 7);
      return { ...p, rotacion_diaria: Number(rotacionDiaria.toFixed(2)), cantidad_sugerida: sugerido, necesita_reponer: necesitaReponer };
    }).filter(p => p.necesita_reponer && p.cantidad_sugerida > 0);

    res.json({ sugerencias });
  } catch (err) { console.error('Error en sugerencias de reposición:', err); res.status(500).json({ error: 'Error interno del servidor.' }); }
}

module.exports = { listarCompras, obtenerCompra, crearCompra, cambiarEstadoCompra, sugerenciasReposicion };
