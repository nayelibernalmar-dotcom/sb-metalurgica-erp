const pool = require('../db/pool');
const { exportarTabla } = require('../utils/exportes');

async function listarProveedores(req, res) {
  const { buscar, activo } = req.query;
  let q = `SELECT p.*, COALESCE(sc.total_compras,0) - COALESCE(sp.total_pagos,0) AS saldo
           FROM proveedores p
           LEFT JOIN (SELECT proveedor_id, SUM(monto) AS total_compras FROM proveedor_movimientos WHERE tipo='compra' GROUP BY proveedor_id) sc ON sc.proveedor_id = p.id
           LEFT JOIN (SELECT proveedor_id, SUM(monto) AS total_pagos FROM proveedor_movimientos WHERE tipo='pago' GROUP BY proveedor_id) sp ON sp.proveedor_id = p.id
           WHERE 1=1`;
  const p = [];
  if (buscar) { p.push(`%${buscar}%`); q += ` AND (p.nombre ILIKE $${p.length} OR p.ruc ILIKE $${p.length})`; }
  if (activo === 'true' || activo === 'false') { p.push(activo === 'true'); q += ` AND p.activo = $${p.length}`; }
  q += ' ORDER BY p.nombre ASC';
  try { const { rows } = await pool.query(q, p); res.json({ proveedores: rows }); }
  catch (err) { console.error('Error al listar proveedores:', err); res.status(500).json({ error: 'Error interno del servidor.' }); }
}

async function obtenerProveedor(req, res) {
  try {
    const { rows } = await pool.query('SELECT * FROM proveedores WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Proveedor no encontrado.' });
    res.json({ proveedor: rows[0] });
  } catch (err) { res.status(500).json({ error: 'Error interno del servidor.' }); }
}

async function crearProveedor(req, res) {
  const { nombre, ruc, direccion, ciudad, telefono, email } = req.body;
  if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es obligatorio.' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO proveedores (nombre,ruc,direccion,ciudad,telefono,email) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [nombre.trim(), ruc || null, direccion || null, ciudad || null, telefono || null, email || null]
    );
    res.status(201).json({ proveedor: rows[0] });
  } catch (err) { console.error('Error al crear proveedor:', err); res.status(500).json({ error: 'Error interno del servidor.' }); }
}

async function actualizarProveedor(req, res) {
  const { nombre, ruc, direccion, ciudad, telefono, email, activo } = req.body;
  try {
    const { rows: cur } = await pool.query('SELECT * FROM proveedores WHERE id = $1', [req.params.id]);
    if (!cur[0]) return res.status(404).json({ error: 'Proveedor no encontrado.' });
    const pr = cur[0];
    const { rows } = await pool.query(
      `UPDATE proveedores SET nombre=$1,ruc=$2,direccion=$3,ciudad=$4,telefono=$5,email=$6,activo=$7,actualizado_en=now() WHERE id=$8 RETURNING *`,
      [nombre ?? pr.nombre, ruc ?? pr.ruc, direccion ?? pr.direccion, ciudad ?? pr.ciudad, telefono ?? pr.telefono, email ?? pr.email, activo ?? pr.activo, req.params.id]
    );
    res.json({ proveedor: rows[0] });
  } catch (err) { res.status(500).json({ error: 'Error interno del servidor.' }); }
}

async function eliminarProveedor(req, res) {
  try {
    const { rows } = await pool.query(`UPDATE proveedores SET activo=false,actualizado_en=now() WHERE id=$1 RETURNING *`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Proveedor no encontrado.' });
    res.json({ mensaje: 'Proveedor desactivado.', proveedor: rows[0] });
  } catch (err) { res.status(500).json({ error: 'Error interno del servidor.' }); }
}

// Cuenta corriente: historial de movimientos de un proveedor
async function calcularCuentaCorriente(proveedorId) {
  const { rows: movimientos } = await pool.query(
    `SELECT m.*, c.numero AS compra_numero FROM proveedor_movimientos m
     LEFT JOIN compras c ON c.id = m.compra_id
     WHERE m.proveedor_id = $1 ORDER BY m.fecha, m.id`, [proveedorId]
  );
  let saldo = 0;
  const detalle = movimientos.map(m => {
    saldo += m.tipo === 'compra' ? Number(m.monto) : -Number(m.monto);
    return { ...m, saldo };
  });
  return { movimientos: detalle, saldo_final: saldo };
}

async function cuentaCorriente(req, res) {
  try {
    res.json(await calcularCuentaCorriente(req.params.id));
  } catch (err) { console.error('Error en cuenta corriente:', err); res.status(500).json({ error: 'Error interno del servidor.' }); }
}

async function exportarCuentaCorriente(req, res) {
  try {
    const { rows: prov } = await pool.query('SELECT * FROM proveedores WHERE id = $1', [req.params.id]);
    if (!prov[0]) return res.status(404).json({ error: 'Proveedor no encontrado.' });
    const { movimientos, saldo_final } = await calcularCuentaCorriente(req.params.id);
    await exportarTabla(res, {
      formato: req.query.formato === 'pdf' ? 'pdf' : 'xlsx',
      nombreArchivo: `cuenta_corriente_${prov[0].nombre.replace(/\s+/g, '_')}`,
      titulo: `Cuenta Corriente — ${prov[0].nombre}`,
      subtitulo: prov[0].ruc ? `RUC: ${prov[0].ruc}` : undefined,
      columnas: [
        { header: 'Fecha', key: 'fecha', width: 14 },
        { header: 'Tipo', key: 'tipo', width: 12 },
        { header: 'Concepto', key: 'concepto', width: 32 },
        { header: 'Comprobante', key: 'compra_numero', width: 14 },
        { header: 'Monto', key: 'monto', width: 18, align: 'right', formato: 'moneda' },
        { header: 'Saldo', key: 'saldo', width: 18, align: 'right', formato: 'moneda' },
      ],
      filas: movimientos,
      totales: { fecha: '', tipo: '', concepto: '', compra_numero: 'SALDO FINAL', saldo: saldo_final },
    });
  } catch (err) { console.error('Error al exportar cuenta corriente:', err); res.status(500).json({ error: 'Error interno del servidor.' }); }
}

// Registrar un pago a proveedor (reduce la deuda) + asiento contable Debe Proveedores / Haber Caja
async function registrarPago(req, res) {
  const { monto, concepto, fecha } = req.body;
  const montoNum = parseFloat(monto);
  if (!montoNum || montoNum <= 0) return res.status(400).json({ error: 'El monto debe ser mayor a 0.' });

  const { crearAsientoAutomatico } = require('../utils/asientos');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: prov } = await client.query('SELECT * FROM proveedores WHERE id = $1', [req.params.id]);
    if (!prov[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Proveedor no encontrado.' }); }

    const fechaPago = fecha || new Date().toISOString().slice(0, 10);
    const { rows: mov } = await client.query(
      `INSERT INTO proveedor_movimientos (proveedor_id,fecha,tipo,concepto,monto,creado_por)
       VALUES ($1,$2,'pago',$3,$4,$5) RETURNING *`,
      [req.params.id, fechaPago, concepto?.trim() || `Pago a ${prov[0].nombre}`, montoNum, req.usuario.id]
    );

    await crearAsientoAutomatico(client, {
      fecha: fechaPago,
      descripcion: `Pago a proveedor ${prov[0].nombre}`,
      origen: 'compra',
      origen_tabla: 'proveedor_movimientos',
      origen_id: mov[0].id,
      creado_por: req.usuario.id,
      lineas: [
        { cuenta_codigo: '2.1.01', debe: montoNum, descripcion: `Pago a ${prov[0].nombre}` },
        { cuenta_codigo: '1.1.01', haber: montoNum, descripcion: `Pago a ${prov[0].nombre}` },
      ],
    });

    await client.query('COMMIT');
    res.status(201).json({ movimiento: mov[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al registrar pago:', err);
    res.status(400).json({ error: err.message || 'Error interno del servidor.' });
  } finally { client.release(); }
}

module.exports = {
  listarProveedores, obtenerProveedor, crearProveedor, actualizarProveedor, eliminarProveedor,
  cuentaCorriente, registrarPago, exportarCuentaCorriente,
};
