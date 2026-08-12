const pool = require('../db/pool');
const { crearAsientoAutomatico, anularAsientosDeOrigen } = require('../utils/asientos');
const { registrarAuditoria } = require('../utils/auditoria');

const TIPOS_PAGO = ['adelanto', 'sueldo', 'aguinaldo', 'bono', 'otro'];

async function listarEmpleados(req, res) {
  const { activo } = req.query;
  let q = 'SELECT * FROM empleados WHERE 1=1';
  const p = [];
  if (activo === 'true' || activo === 'false') { p.push(activo === 'true'); q += ` AND activo = $${p.length}`; }
  q += ' ORDER BY nombre ASC';
  try { const { rows } = await pool.query(q, p); res.json({ empleados: rows }); }
  catch (err) { console.error('Error al listar empleados:', err); res.status(500).json({ error: 'Error interno del servidor.' }); }
}

async function crearEmpleado(req, res) {
  const { nombre, documento, cargo, telefono, fecha_ingreso, sueldo_mensual } = req.body;
  if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es obligatorio.' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO empleados (nombre,documento,cargo,telefono,fecha_ingreso,sueldo_mensual)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [nombre.trim(), documento || null, cargo || null, telefono || null, fecha_ingreso || null, parseFloat(sueldo_mensual) || 0]
    );
    res.status(201).json({ empleado: rows[0] });
  } catch (err) { console.error('Error al crear empleado:', err); res.status(500).json({ error: 'Error interno del servidor.' }); }
}

async function actualizarEmpleado(req, res) {
  const { nombre, documento, cargo, telefono, fecha_ingreso, sueldo_mensual, activo } = req.body;
  try {
    const { rows: cur } = await pool.query('SELECT * FROM empleados WHERE id = $1', [req.params.id]);
    if (!cur[0]) return res.status(404).json({ error: 'Empleado no encontrado.' });
    const e = cur[0];
    const { rows } = await pool.query(
      `UPDATE empleados SET nombre=$1,documento=$2,cargo=$3,telefono=$4,fecha_ingreso=$5,sueldo_mensual=$6,activo=$7,actualizado_en=now() WHERE id=$8 RETURNING *`,
      [nombre ?? e.nombre, documento ?? e.documento, cargo ?? e.cargo, telefono ?? e.telefono,
       fecha_ingreso ?? e.fecha_ingreso, sueldo_mensual != null ? parseFloat(sueldo_mensual) : e.sueldo_mensual, activo ?? e.activo, req.params.id]
    );
    res.json({ empleado: rows[0] });
  } catch (err) { res.status(500).json({ error: 'Error interno del servidor.' }); }
}

async function eliminarEmpleado(req, res) {
  try {
    const { rows } = await pool.query(`UPDATE empleados SET activo=false,actualizado_en=now() WHERE id=$1 RETURNING *`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Empleado no encontrado.' });
    await registrarAuditoria({ usuario_id: req.usuario.id, accion: 'desactivar', entidad: 'empleados', entidad_id: rows[0].id, detalle: rows[0] });
    res.json({ mensaje: 'Empleado desactivado.', empleado: rows[0] });
  } catch (err) { res.status(500).json({ error: 'Error interno del servidor.' }); }
}

// Historial de pagos de un empleado (adelantos, sueldos, aguinaldos, bonos)
async function historialPagos(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM empleado_pagos WHERE empleado_id = $1 ORDER BY fecha DESC, id DESC`, [req.params.id]
    );
    const totales = rows.reduce((acc, p) => {
      acc[p.tipo] = (acc[p.tipo] || 0) + Number(p.monto);
      acc.total = (acc.total || 0) + Number(p.monto);
      return acc;
    }, {});
    res.json({ pagos: rows, totales });
  } catch (err) { console.error('Error en historial de pagos:', err); res.status(500).json({ error: 'Error interno del servidor.' }); }
}

// Registra un pago (adelanto, sueldo, aguinaldo, bono u otro) + asiento contable correspondiente
async function registrarPago(req, res) {
  const { fecha, tipo, periodo, concepto, monto, forma_pago } = req.body;
  if (!TIPOS_PAGO.includes(tipo)) return res.status(400).json({ error: `Tipo inválido. Debe ser: ${TIPOS_PAGO.join(', ')}.` });
  const montoNum = parseFloat(monto);
  if (!montoNum || montoNum <= 0) return res.status(400).json({ error: 'El monto debe ser mayor a 0.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: emp } = await client.query('SELECT * FROM empleados WHERE id = $1', [req.params.id]);
    if (!emp[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Empleado no encontrado.' }); }

    const fechaPago = fecha || new Date().toISOString().slice(0, 10);
    const conceptoFinal = concepto?.trim() || `${tipo[0].toUpperCase()}${tipo.slice(1)} — ${emp[0].nombre}`;

    const { rows: pago } = await client.query(
      `INSERT INTO empleado_pagos (empleado_id,fecha,tipo,periodo,concepto,monto,forma_pago,creado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.params.id, fechaPago, tipo, periodo || fechaPago.slice(0, 7), conceptoFinal, montoNum, forma_pago || null, req.usuario.id]
    );

    await client.query(
      `INSERT INTO caja_grande_movimientos (tipo,concepto,monto,empleado_pago_id,creado_por) VALUES ('egreso',$1,$2,$3,$4)`,
      [conceptoFinal, montoNum, pago[0].id, req.usuario.id]
    );

    // Un adelanto es un activo (se lo vamos a descontar del sueldo más adelante);
    // sueldo/aguinaldo/bono/otro son gasto directo del período.
    const cuentaContrapartida = tipo === 'adelanto' ? '1.1.06' : '5.2.01';
    await crearAsientoAutomatico(client, {
      fecha: fechaPago,
      descripcion: conceptoFinal,
      origen: 'caja',
      origen_tabla: 'empleado_pagos',
      origen_id: pago[0].id,
      creado_por: req.usuario.id,
      lineas: [
        { cuenta_codigo: cuentaContrapartida, debe: montoNum, descripcion: conceptoFinal },
        { cuenta_codigo: '1.1.01', haber: montoNum, descripcion: conceptoFinal },
      ],
    });

    await client.query('COMMIT');
    await registrarAuditoria({ usuario_id: req.usuario.id, accion: 'crear', entidad: 'empleado_pagos', entidad_id: pago[0].id, detalle: pago[0] });
    res.status(201).json({ pago: pago[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al registrar pago de empleado:', err);
    res.status(400).json({ error: err.message || 'Error interno del servidor.' });
  } finally { client.release(); }
}

// Verifica que el día de un movimiento de caja grande no esté ya cerrado
async function diaCerrado(client, fecha) {
  const { rows } = await client.query('SELECT id FROM caja_grande_cierres WHERE fecha = $1', [fecha]);
  return rows.length > 0;
}

// Edita un pago ya registrado: corrige fecha/tipo/concepto/monto/forma_pago.
// Por prolijidad contable, no "parchea" el asiento viejo: lo anula y genera uno nuevo,
// para que quede rastro de la corrección en el libro diario.
async function editarPago(req, res) {
  const { id: empleadoId, pagoId } = req.params;
  const { fecha, tipo, periodo, concepto, monto, forma_pago } = req.body;
  if (!TIPOS_PAGO.includes(tipo)) return res.status(400).json({ error: `Tipo inválido. Debe ser: ${TIPOS_PAGO.join(', ')}.` });
  const montoNum = parseFloat(monto);
  if (!montoNum || montoNum <= 0) return res.status(400).json({ error: 'El monto debe ser mayor a 0.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: pagoActual } = await client.query(
      'SELECT * FROM empleado_pagos WHERE id = $1 AND empleado_id = $2', [pagoId, empleadoId]
    );
    if (!pagoActual[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Pago no encontrado.' }); }

    const { rows: emp } = await client.query('SELECT * FROM empleados WHERE id = $1', [empleadoId]);
    const fechaNueva = fecha || pagoActual[0].fecha;

    if (await diaCerrado(client, pagoActual[0].fecha) || await diaCerrado(client, fechaNueva)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No se puede editar: el día de Caja Grande ya fue cerrado.' });
    }

    const conceptoFinal = concepto?.trim() || `${tipo[0].toUpperCase()}${tipo.slice(1)} — ${emp[0].nombre}`;

    // 1) Actualizar el registro de pago
    const { rows: pago } = await client.query(
      `UPDATE empleado_pagos SET fecha=$1, tipo=$2, periodo=$3, concepto=$4, monto=$5, forma_pago=$6
       WHERE id = $7 RETURNING *`,
      [fechaNueva, tipo, periodo || fechaNueva.slice(0, 7), conceptoFinal, montoNum, forma_pago || null, pagoId]
    );

    // 2) Actualizar el movimiento de Caja Grande asociado
    await client.query(
      `UPDATE caja_grande_movimientos SET concepto=$1, monto=$2, fecha=$3 WHERE empleado_pago_id = $4`,
      [conceptoFinal, montoNum, fechaNueva, pagoId]
    );

    // 3) Anular el asiento viejo y generar uno nuevo con los datos corregidos
    await anularAsientosDeOrigen(client, 'empleado_pagos', pagoId);
    const cuentaContrapartida = tipo === 'adelanto' ? '1.1.06' : '5.2.01';
    await crearAsientoAutomatico(client, {
      fecha: fechaNueva,
      descripcion: `${conceptoFinal} (corregido)`,
      origen: 'caja',
      origen_tabla: 'empleado_pagos',
      origen_id: Number(pagoId),
      creado_por: req.usuario.id,
      lineas: [
        { cuenta_codigo: cuentaContrapartida, debe: montoNum, descripcion: conceptoFinal },
        { cuenta_codigo: '1.1.01', haber: montoNum, descripcion: conceptoFinal },
      ],
    });

    await client.query('COMMIT');
    await registrarAuditoria({ usuario_id: req.usuario.id, accion: 'editar', entidad: 'empleado_pagos', entidad_id: Number(pagoId), detalle: { antes: pagoActual[0], despues: pago[0] } });
    res.json({ pago: pago[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al editar pago de empleado:', err);
    res.status(400).json({ error: err.message || 'Error interno del servidor.' });
  } finally { client.release(); }
}

// Elimina un pago: revierte el movimiento de Caja Grande y anula el asiento contable.
async function eliminarPago(req, res) {
  const { id: empleadoId, pagoId } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: pago } = await client.query(
      'SELECT * FROM empleado_pagos WHERE id = $1 AND empleado_id = $2', [pagoId, empleadoId]
    );
    if (!pago[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Pago no encontrado.' }); }

    if (await diaCerrado(client, pago[0].fecha)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No se puede eliminar: el día de Caja Grande ya fue cerrado.' });
    }

    await client.query('DELETE FROM caja_grande_movimientos WHERE empleado_pago_id = $1', [pagoId]);
    await anularAsientosDeOrigen(client, 'empleado_pagos', pagoId);
    await client.query('DELETE FROM empleado_pagos WHERE id = $1', [pagoId]);

    await client.query('COMMIT');
    await registrarAuditoria({ usuario_id: req.usuario.id, accion: 'eliminar', entidad: 'empleado_pagos', entidad_id: Number(pagoId), detalle: pago[0] });
    res.json({ mensaje: 'Pago eliminado correctamente.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al eliminar pago de empleado:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  } finally { client.release(); }
}


async function resumenMes(req, res) {
  const periodo = req.query.periodo || new Date().toISOString().slice(0, 7);
  try {
    const { rows } = await pool.query(
      `SELECT e.id, e.nombre, e.cargo, e.sueldo_mensual,
         COALESCE(SUM(CASE WHEN p.tipo = 'adelanto' THEN p.monto ELSE 0 END), 0) AS adelantos,
         COALESCE(SUM(CASE WHEN p.tipo = 'sueldo' THEN p.monto ELSE 0 END), 0) AS sueldo_pagado,
         COALESCE(SUM(CASE WHEN p.tipo IN ('aguinaldo','bono','otro') THEN p.monto ELSE 0 END), 0) AS otros_pagos,
         COALESCE(SUM(p.monto), 0) AS total_pagado
       FROM empleados e
       LEFT JOIN empleado_pagos p ON p.empleado_id = e.id AND p.periodo = $1
       WHERE e.activo = true
       GROUP BY e.id ORDER BY e.nombre`, [periodo]
    );
    const resumen = rows.map(e => ({ ...e, saldo_sueldo: Number(e.sueldo_mensual) - Number(e.adelantos) - Number(e.sueldo_pagado) }));
    res.json({ periodo, resumen });
  } catch (err) { console.error('Error en resumen mensual:', err); res.status(500).json({ error: 'Error interno del servidor.' }); }
}

module.exports = { listarEmpleados, crearEmpleado, actualizarEmpleado, eliminarEmpleado, historialPagos, registrarPago, editarPago, eliminarPago, resumenMes };
