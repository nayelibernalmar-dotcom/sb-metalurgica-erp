const pool = require('../db/pool');
const { siguienteNumero } = require('../utils/numeracion');
const { crearAsientoAutomatico, anularAsientosDeOrigen } = require('../utils/asientos');
const { addMoney, multiplyMoney } = require('../utils/money');
const UNIDADES = ['unidades', 'metros'];
const ESTADOS = ['pendiente', 'pagada', 'anulada'];

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
    `SELECT v.*, c.nombre AS cliente_nombre, c.ruc AS cliente_ruc, c.direccion AS cliente_direccion, c.ciudad AS cliente_ciudad
     FROM ventas v LEFT JOIN clientes c ON c.id = v.cliente_id WHERE v.id = $1`, [id]
  );
  if (!rows[0]) return null;
  const { rows: items } = await pool.query(`SELECT * FROM venta_items WHERE venta_id = $1 ORDER BY orden`, [id]);
  return { ...rows[0], items };
}

async function listarVentas(req, res) {
  const { estado, cliente_id } = req.query;
  let q = `SELECT v.*, c.nombre AS cliente_nombre FROM ventas v LEFT JOIN clientes c ON c.id = v.cliente_id WHERE 1=1`;
  const p = [];
  if (estado) { p.push(estado); q += ` AND v.estado = $${p.length}`; }
  if (cliente_id) { p.push(cliente_id); q += ` AND v.cliente_id = $${p.length}`; }
  q += ' ORDER BY v.creado_en DESC';
  try { const { rows } = await pool.query(q, p); res.json({ ventas: rows }); }
  catch (err) { console.error('Error al listar ventas:', err); res.status(500).json({ error: 'Error interno del servidor.' }); }
}

async function obtenerVenta(req, res) {
  try {
    const venta = await obtenerCompleto(req.params.id);
    if (!venta) return res.status(404).json({ error: 'Venta no encontrada.' });
    res.json({ venta });
  } catch (err) { res.status(500).json({ error: 'Error interno del servidor.' }); }
}

async function crearVenta(req, res) {
  const { cliente_id, presupuesto_id, notas, estado, items } = req.body;
  if (!cliente_id) return res.status(400).json({ error: 'El cliente es obligatorio.' });
  if (estado && !ESTADOS.includes(estado)) return res.status(400).json({ error: 'Estado inválido.' });
  const errItems = validarItems(items); if (errItems) return res.status(400).json({ error: errItems });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const numero = await siguienteNumero(client, 'ventas', 'V');
    const totalesItems = items.map((it) => multiplyMoney(it.cantidad, it.precio_unitario));
    const total = addMoney(totalesItems);
    const estadoFinal = estado || 'pagada';

    const { rows } = await client.query(
      `INSERT INTO ventas (numero,cliente_id,presupuesto_id,estado,subtotal,total,notas,creado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [numero, cliente_id, presupuesto_id || null, estadoFinal, total, total, notas || null, req.usuario.id]
    );
    const venta = rows[0];

    let orden = 1;
    for (const [indice, it] of items.entries()) {
      await client.query(
        `INSERT INTO venta_items (venta_id,orden,producto_id,descripcion,cantidad,unidad,precio_unitario,precio_total)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [venta.id, orden++, it.producto_id || null, it.descripcion.trim(), it.cantidad, it.unidad || 'unidades', it.precio_unitario, totalesItems[indice]]
      );
    }

    // Si la venta ya se registra como pagada, se asienta el ingreso en caja y el asiento contable automáticamente
    if (estadoFinal === 'pagada') {
      await client.query(
        `INSERT INTO caja_movimientos (tipo,concepto,monto,venta_id,creado_por) VALUES ('ingreso',$1,$2,$3,$4)`,
        [`Venta ${numero}`, total, venta.id, req.usuario.id]
      );
      await crearAsientoAutomatico(client, {
        fecha: venta.fecha,
        descripcion: `Venta ${numero}`,
        origen: 'venta',
        origen_tabla: 'ventas',
        origen_id: venta.id,
        creado_por: req.usuario.id,
        lineas: [
          { cuenta_codigo: '1.1.01', debe: total, descripcion: `Cobro venta ${numero}` },
          { cuenta_codigo: '4.1.01', haber: total, descripcion: `Venta ${numero}` },
        ],
      });
    }

    await client.query('COMMIT');
    res.status(201).json({ venta: await obtenerCompleto(venta.id) });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al crear venta:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  } finally { client.release(); }
}

async function cambiarEstadoVenta(req, res) {
  const { estado } = req.body;
  if (!ESTADOS.includes(estado)) return res.status(400).json({ error: 'Estado inválido.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: cur } = await client.query('SELECT * FROM ventas WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (!cur[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Venta no encontrada.' }); }
    const venta = cur[0];

    if (venta.estado === 'anulada') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'La venta ya está anulada y no se puede modificar.' });
    }

    await client.query('UPDATE ventas SET estado=$1, actualizado_en=now() WHERE id=$2', [estado, req.params.id]);

    // Si pasa a pagada y todavía no tiene un movimiento de caja asociado, lo crea (con su asiento contable)
    if (estado === 'pagada' && venta.estado !== 'pagada') {
      const { rows: existente } = await client.query('SELECT id FROM caja_movimientos WHERE venta_id = $1', [venta.id]);
      if (existente.length === 0) {
        await client.query(
          `INSERT INTO caja_movimientos (tipo,concepto,monto,venta_id,creado_por) VALUES ('ingreso',$1,$2,$3,$4)`,
          [`Venta ${venta.numero}`, venta.total, venta.id, req.usuario.id]
        );
        await crearAsientoAutomatico(client, {
          fecha: new Date().toISOString().slice(0, 10),
          descripcion: `Venta ${venta.numero}`,
          origen: 'venta',
          origen_tabla: 'ventas',
          origen_id: venta.id,
          creado_por: req.usuario.id,
          lineas: [
            { cuenta_codigo: '1.1.01', debe: venta.total, descripcion: `Cobro venta ${venta.numero}` },
            { cuenta_codigo: '4.1.01', haber: venta.total, descripcion: `Venta ${venta.numero}` },
          ],
        });
      }
    }

    // Si se anula una venta que ya tenía movimiento de caja y asiento, se eliminan/anulan
    if (estado === 'anulada') {
      await client.query('DELETE FROM caja_movimientos WHERE venta_id = $1', [venta.id]);
      await anularAsientosDeOrigen(client, 'ventas', venta.id);
    }

    await client.query('COMMIT');
    res.json({ venta: await obtenerCompleto(req.params.id) });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al cambiar estado de venta:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  } finally { client.release(); }
}

module.exports = { listarVentas, obtenerVenta, crearVenta, cambiarEstadoVenta };
