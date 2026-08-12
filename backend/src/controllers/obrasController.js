const pool = require('../db/pool');
const { crearAsientoAutomatico } = require('../utils/asientos');

const ESTADOS = ['en_proceso', 'finalizada', 'cancelada'];

async function obtenerObraCompleta(id) {
  const { rows } = await pool.query(
    `SELECT o.*, pr.numero AS presupuesto_numero, pr.fecha AS presupuesto_fecha, pr.notas AS presupuesto_notas,
            c.id AS cliente_id, c.nombre AS cliente_nombre, c.ruc AS cliente_ruc, c.direccion AS cliente_direccion, c.ciudad AS cliente_ciudad
     FROM obras o
     JOIN presupuestos pr ON pr.id = o.presupuesto_id
     LEFT JOIN clientes c ON c.id = pr.cliente_id
     WHERE o.id = $1`, [id]
  );
  if (!rows[0]) return null;
  const obra = rows[0];
  const { rows: items } = await pool.query(
    `SELECT * FROM presupuesto_items WHERE presupuesto_id = $1 ORDER BY orden`, [obra.presupuesto_id]
  );
  const { rows: pagos } = await pool.query(
    `SELECT op.*, u.nombre AS creado_por_nombre FROM obra_pagos op
     LEFT JOIN usuarios u ON u.id = op.creado_por
     WHERE op.obra_id = $1 ORDER BY op.fecha, op.id`, [id]
  );
  const totalPagado = pagos.reduce((s, p) => s + Number(p.monto), 0);
  return {
    ...obra,
    items,
    pagos,
    total_pagado: totalPagado,
    saldo_pendiente: Number(obra.monto_total) - totalPagado,
    porcentaje_pagado: obra.monto_total > 0 ? Math.min(100, (totalPagado / Number(obra.monto_total)) * 100) : 0,
  };
}

async function listarObras(req, res) {
  const { estado } = req.query;
  let q = `SELECT o.*, pr.numero AS presupuesto_numero, c.nombre AS cliente_nombre,
             COALESCE((SELECT SUM(monto) FROM obra_pagos WHERE obra_id = o.id), 0) AS total_pagado
           FROM obras o
           JOIN presupuestos pr ON pr.id = o.presupuesto_id
           LEFT JOIN clientes c ON c.id = pr.cliente_id
           WHERE 1=1`;
  const p = [];
  if (estado) { p.push(estado); q += ` AND o.estado = $${p.length}`; }
  q += ' ORDER BY o.creado_en DESC';
  try {
    const { rows } = await pool.query(q, p);
    const obras = rows.map(o => ({ ...o, saldo_pendiente: Number(o.monto_total) - Number(o.total_pagado) }));
    res.json({ obras });
  } catch (err) { console.error('Error al listar obras:', err); res.status(500).json({ error: 'Error interno del servidor.' }); }
}

async function obtenerObra(req, res) {
  try {
    const obra = await obtenerObraCompleta(req.params.id);
    if (!obra) return res.status(404).json({ error: 'Obra no encontrada.' });
    res.json({ obra });
  } catch (err) { res.status(500).json({ error: 'Error interno del servidor.' }); }
}

// Inicia el seguimiento de obra a partir de un presupuesto ya aprobado
async function crearObra(req, res) {
  const { presupuesto_id, notas } = req.body;
  if (!presupuesto_id) return res.status(400).json({ error: 'Falta indicar el presupuesto.' });
  try {
    const { rows: pres } = await pool.query('SELECT * FROM presupuestos WHERE id = $1', [presupuesto_id]);
    if (!pres[0]) return res.status(404).json({ error: 'Presupuesto no encontrado.' });
    if (pres[0].estado !== 'aprobado') return res.status(400).json({ error: 'Solo se puede iniciar una obra a partir de un presupuesto aprobado.' });

    const { rows: existente } = await pool.query('SELECT id FROM obras WHERE presupuesto_id = $1', [presupuesto_id]);
    if (existente[0]) return res.status(409).json({ error: 'Este presupuesto ya tiene una obra en seguimiento.', obra_id: existente[0].id });

    const { rows } = await pool.query(
      `INSERT INTO obras (presupuesto_id, monto_total, notas, creado_por) VALUES ($1,$2,$3,$4) RETURNING *`,
      [presupuesto_id, pres[0].total, notas || null, req.usuario.id]
    );
    res.status(201).json({ obra: await obtenerObraCompleta(rows[0].id) });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Este presupuesto ya tiene una obra en seguimiento.' });
    console.error('Error al crear obra:', err); res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

async function cambiarEstadoObra(req, res) {
  const { estado } = req.body;
  if (!ESTADOS.includes(estado)) return res.status(400).json({ error: 'Estado inválido.' });
  try {
    const { rows } = await pool.query(
      `UPDATE obras SET estado=$1, actualizado_en=now() WHERE id=$2 RETURNING id`, [estado, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Obra no encontrada.' });
    res.json({ obra: await obtenerObraCompleta(req.params.id) });
  } catch (err) { res.status(500).json({ error: 'Error interno del servidor.' }); }
}

// Registra un pago/anticipo/seña de la obra: caja + asiento contable (Debe Caja / Haber Anticipos de Clientes)
async function registrarPagoObra(req, res) {
  const { fecha, concepto, monto, forma_pago } = req.body;
  const montoNum = parseFloat(monto);
  if (!montoNum || montoNum <= 0) return res.status(400).json({ error: 'El monto debe ser mayor a 0.' });
  if (!concepto?.trim()) return res.status(400).json({ error: 'El concepto es obligatorio (ej: Seña, Anticipo, Pago parcial).' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: obraRows } = await client.query('SELECT * FROM obras WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (!obraRows[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Obra no encontrada.' }); }
    const obra = obraRows[0];
    if (obra.estado === 'cancelada') { await client.query('ROLLBACK'); return res.status(400).json({ error: 'La obra está cancelada, no se pueden registrar más pagos.' }); }

    const fechaPago = fecha || new Date().toISOString().slice(0, 10);
    const { rows: pagoRows } = await client.query(
      `INSERT INTO obra_pagos (obra_id,fecha,concepto,monto,forma_pago,creado_por) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [obra.id, fechaPago, concepto.trim(), montoNum, forma_pago || null, req.usuario.id]
    );

    await client.query(
      `INSERT INTO caja_movimientos (tipo,concepto,monto,creado_por) VALUES ('ingreso',$1,$2,$3)`,
      [`Obra ${obra.presupuesto_id} — ${concepto.trim()}`, montoNum, req.usuario.id]
    );

    await crearAsientoAutomatico(client, {
      fecha: fechaPago,
      descripcion: `${concepto.trim()} — obra #${obra.id}`,
      origen: 'caja',
      origen_tabla: 'obra_pagos',
      origen_id: pagoRows[0].id,
      creado_por: req.usuario.id,
      lineas: [
        { cuenta_codigo: '1.1.01', debe: montoNum, descripcion: concepto.trim() },
        { cuenta_codigo: '2.1.05', haber: montoNum, descripcion: concepto.trim() },
      ],
    });

    await client.query('COMMIT');
    res.status(201).json({ obra: await obtenerObraCompleta(obra.id) });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al registrar pago de obra:', err);
    res.status(400).json({ error: err.message || 'Error interno del servidor.' });
  } finally { client.release(); }
}

module.exports = { listarObras, obtenerObra, crearObra, cambiarEstadoObra, registrarPagoObra };
