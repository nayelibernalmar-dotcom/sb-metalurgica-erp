const pool = require('../db/pool');
const { siguienteNumero } = require('../utils/numeracion');
const { registrarAuditoria } = require('../utils/auditoria');
const { exportarTabla } = require('../utils/exportes');

const TIPOS_CUENTA = ['activo', 'pasivo', 'patrimonio', 'ingreso', 'egreso'];
const MAX_CENTROS_COSTO = 3;

// ─── PLAN DE CUENTAS ──────────────────────────────────────────────
async function listarCuentas(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT c.*, p.codigo AS padre_codigo, p.nombre AS padre_nombre
       FROM cuentas_contables c LEFT JOIN cuentas_contables p ON p.id = c.cuenta_padre_id
       WHERE c.activo = true ORDER BY c.codigo`
    );
    res.json({ cuentas: rows });
  } catch (err) { console.error('Error al listar cuentas:', err); res.status(500).json({ error: 'Error interno del servidor.' }); }
}

async function crearCuenta(req, res) {
  const { codigo, nombre, tipo, cuenta_padre_id, imputable } = req.body;
  if (!codigo?.trim() || !nombre?.trim()) return res.status(400).json({ error: 'Código y nombre son obligatorios.' });
  if (!TIPOS_CUENTA.includes(tipo)) return res.status(400).json({ error: 'Tipo de cuenta inválido.' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO cuentas_contables (codigo, nombre, tipo, cuenta_padre_id, imputable) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [codigo.trim(), nombre.trim(), tipo, cuenta_padre_id || null, imputable !== false]
    );
    res.status(201).json({ cuenta: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ya existe una cuenta con ese código.' });
    console.error('Error al crear cuenta:', err); res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

// ─── CENTROS DE COSTO ─────────────────────────────────────────────
async function listarCentrosCosto(req, res) {
  try {
    const { rows } = await pool.query(`SELECT * FROM centros_costo WHERE activo = true ORDER BY nombre`);
    res.json({ centros: rows });
  } catch (err) { res.status(500).json({ error: 'Error interno del servidor.' }); }
}

async function crearCentroCosto(req, res) {
  const { nombre } = req.body;
  if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es obligatorio.' });
  try {
    const { rows: existentes } = await pool.query(`SELECT COUNT(*)::int AS n FROM centros_costo WHERE activo = true`);
    if (existentes[0].n >= MAX_CENTROS_COSTO) {
      return res.status(400).json({ error: `Este sistema admite hasta ${MAX_CENTROS_COSTO} centros de costo activos.` });
    }
    const { rows } = await pool.query(`INSERT INTO centros_costo (nombre) VALUES ($1) RETURNING *`, [nombre.trim()]);
    res.status(201).json({ centro: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ya existe un centro de costo con ese nombre.' });
    console.error('Error al crear centro de costo:', err); res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

async function eliminarCentroCosto(req, res) {
  try {
    await pool.query(`UPDATE centros_costo SET activo = false WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Error interno del servidor.' }); }
}

// ─── ASIENTOS ─────────────────────────────────────────────────────
async function obtenerAsientoCompleto(id) {
  const { rows } = await pool.query(
    `SELECT a.*, u.nombre AS creado_por_nombre FROM asientos_contables a
     LEFT JOIN usuarios u ON u.id = a.creado_por WHERE a.id = $1`, [id]
  );
  if (!rows[0]) return null;
  const { rows: items } = await pool.query(
    `SELECT i.*, c.codigo AS cuenta_codigo, c.nombre AS cuenta_nombre, cc.nombre AS centro_costo_nombre
     FROM asiento_items i
     JOIN cuentas_contables c ON c.id = i.cuenta_id
     LEFT JOIN centros_costo cc ON cc.id = i.centro_costo_id
     WHERE i.asiento_id = $1 ORDER BY i.orden`, [id]
  );
  return { ...rows[0], items };
}

// Libro diario: listado de asientos (resumidos) en un rango de fechas
async function listarAsientos(req, res) {
  const { desde, hasta, origen } = req.query;
  let q = `SELECT a.*, u.nombre AS creado_por_nombre,
             (SELECT COALESCE(SUM(debe),0) FROM asiento_items WHERE asiento_id = a.id) AS total
           FROM asientos_contables a LEFT JOIN usuarios u ON u.id = a.creado_por WHERE 1=1`;
  const p = [];
  if (desde) { p.push(desde); q += ` AND a.fecha >= $${p.length}`; }
  if (hasta) { p.push(hasta); q += ` AND a.fecha <= $${p.length}`; }
  if (origen) { p.push(origen); q += ` AND a.origen = $${p.length}`; }
  q += ' ORDER BY a.fecha DESC, a.id DESC';
  try { const { rows } = await pool.query(q, p); res.json({ asientos: rows }); }
  catch (err) { console.error('Error al listar asientos:', err); res.status(500).json({ error: 'Error interno del servidor.' }); }
}

async function obtenerAsiento(req, res) {
  try {
    const asiento = await obtenerAsientoCompleto(req.params.id);
    if (!asiento) return res.status(404).json({ error: 'Asiento no encontrado.' });
    res.json({ asiento });
  } catch (err) { res.status(500).json({ error: 'Error interno del servidor.' }); }
}

function validarLineas(items) {
  if (!Array.isArray(items) || items.length < 2) return 'Un asiento necesita al menos dos líneas (debe y haber).';
  let totalDebe = 0, totalHaber = 0;
  for (const it of items) {
    const debe = parseFloat(it.debe) || 0;
    const haber = parseFloat(it.haber) || 0;
    if (!it.cuenta_id) return 'Cada línea necesita una cuenta.';
    if (debe > 0 && haber > 0) return 'Una línea no puede tener debe y haber a la vez.';
    if (debe === 0 && haber === 0) return 'Cada línea necesita un monto en debe o en haber.';
    totalDebe += debe; totalHaber += haber;
  }
  if (Math.abs(totalDebe - totalHaber) > 0.01) return `El asiento no está balanceado: Debe ${totalDebe.toFixed(2)} ≠ Haber ${totalHaber.toFixed(2)}.`;
  return null;
}

async function crearAsientoManual(req, res) {
  const { fecha, descripcion, items } = req.body;
  if (!fecha) return res.status(400).json({ error: 'La fecha es obligatoria.' });
  if (!descripcion?.trim()) return res.status(400).json({ error: 'La descripción es obligatoria.' });
  const errItems = validarLineas(items); if (errItems) return res.status(400).json({ error: errItems });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const numero = await siguienteNumero(client, 'asientos_contables', 'A');
    const { rows } = await client.query(
      `INSERT INTO asientos_contables (numero, fecha, descripcion, origen, creado_por)
       VALUES ($1,$2,$3,'manual',$4) RETURNING *`,
      [numero, fecha, descripcion.trim(), req.usuario.id]
    );
    const asiento = rows[0];
    let orden = 1;
    for (const it of items) {
      const { rows: cuenta } = await client.query(`SELECT imputable FROM cuentas_contables WHERE id = $1`, [it.cuenta_id]);
      if (!cuenta[0]) throw new Error('Una de las cuentas seleccionadas no existe.');
      if (!cuenta[0].imputable) throw new Error('No se puede imputar a un rubro (cuenta agrupadora), elegí una subcuenta.');
      await client.query(
        `INSERT INTO asiento_items (asiento_id, orden, cuenta_id, centro_costo_id, descripcion, debe, haber)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [asiento.id, orden++, it.cuenta_id, it.centro_costo_id || null, it.descripcion || null, parseFloat(it.debe) || 0, parseFloat(it.haber) || 0]
      );
    }
    await client.query('COMMIT');
    await registrarAuditoria({ usuario_id: req.usuario.id, accion: 'crear', entidad: 'asientos_contables', entidad_id: asiento.id, detalle: { numero: asiento.numero, descripcion: asiento.descripcion, items } });
    res.status(201).json({ asiento: await obtenerAsientoCompleto(asiento.id) });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al crear asiento:', err);
    res.status(400).json({ error: err.message || 'Error interno del servidor.' });
  } finally { client.release(); }
}

async function anularAsiento(req, res) {
  try {
    const { rows } = await pool.query(
      `UPDATE asientos_contables SET anulado = true WHERE id = $1 AND anulado = false RETURNING id`, [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Asiento no encontrado o ya estaba anulado.' });
    await registrarAuditoria({ usuario_id: req.usuario.id, accion: 'anular', entidad: 'asientos_contables', entidad_id: rows[0].id });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Error interno del servidor.' }); }
}

// ─── LIBRO MAYOR (por cuenta) ─────────────────────────────────────
async function libroMayor(req, res) {
  const { cuenta_id, desde, hasta } = req.query;
  if (!cuenta_id) return res.status(400).json({ error: 'Falta indicar la cuenta.' });
  try {
    const { rows: cuentaRows } = await pool.query(`SELECT * FROM cuentas_contables WHERE id = $1`, [cuenta_id]);
    if (!cuentaRows[0]) return res.status(404).json({ error: 'Cuenta no encontrada.' });
    const cuenta = cuentaRows[0];

    let q = `SELECT i.id, a.fecha, a.numero, a.descripcion, i.debe, i.haber, cc.nombre AS centro_costo_nombre
              FROM asiento_items i JOIN asientos_contables a ON a.id = i.asiento_id
              LEFT JOIN centros_costo cc ON cc.id = i.centro_costo_id
              WHERE i.cuenta_id = $1 AND a.anulado = false`;
    const p = [cuenta_id];
    if (desde) { p.push(desde); q += ` AND a.fecha >= $${p.length}`; }
    if (hasta) { p.push(hasta); q += ` AND a.fecha <= $${p.length}`; }
    q += ' ORDER BY a.fecha, a.id';
    const { rows: movimientos } = await pool.query(q, p);

    // Naturaleza deudora (activo/egreso) suma con el debe; acreedora (pasivo/patrimonio/ingreso) suma con el haber
    const deudora = ['activo', 'egreso'].includes(cuenta.tipo);
    let saldo = 0;
    const detalle = movimientos.map(m => {
      saldo += deudora ? (Number(m.debe) - Number(m.haber)) : (Number(m.haber) - Number(m.debe));
      return { ...m, saldo };
    });

    res.json({ cuenta, movimientos: detalle, saldo_final: saldo });
  } catch (err) { console.error('Error en libro mayor:', err); res.status(500).json({ error: 'Error interno del servidor.' }); }
}

// ─── BALANCE DE SUMAS Y SALDOS ────────────────────────────────────
async function calcularBalance(desde, hasta) {
  let q = `SELECT c.id, c.codigo, c.nombre, c.tipo,
             COALESCE(SUM(i.debe),0) AS suma_debe,
             COALESCE(SUM(i.haber),0) AS suma_haber
           FROM cuentas_contables c
           LEFT JOIN asiento_items i ON i.cuenta_id = c.id
           LEFT JOIN asientos_contables a ON a.id = i.asiento_id AND a.anulado = false`;
  const p = [];
  const condiciones = ['c.imputable = true'];
  if (desde) { p.push(desde); condiciones.push(`(a.fecha IS NULL OR a.fecha >= $${p.length})`); }
  if (hasta) { p.push(hasta); condiciones.push(`(a.fecha IS NULL OR a.fecha <= $${p.length})`); }
  q += ' WHERE ' + condiciones.join(' AND ');
  q += ' GROUP BY c.id ORDER BY c.codigo';

  const { rows } = await pool.query(q, p);
  const cuentas = rows.map(c => {
    const deudora = ['activo', 'egreso'].includes(c.tipo);
    const sd = Number(c.suma_debe), sh = Number(c.suma_haber);
    const saldo = deudora ? sd - sh : sh - sd;
    return { ...c, suma_debe: sd, suma_haber: sh, saldo_deudor: saldo > 0 && deudora ? saldo : (saldo < 0 && !deudora ? -saldo : 0), saldo_acreedor: saldo > 0 && !deudora ? saldo : (saldo < 0 && deudora ? -saldo : 0), saldo };
  }).filter(c => c.suma_debe > 0 || c.suma_haber > 0);

  const totales = cuentas.reduce((acc, c) => ({
    suma_debe: acc.suma_debe + c.suma_debe,
    suma_haber: acc.suma_haber + c.suma_haber,
    saldo_deudor: acc.saldo_deudor + c.saldo_deudor,
    saldo_acreedor: acc.saldo_acreedor + c.saldo_acreedor,
  }), { suma_debe: 0, suma_haber: 0, saldo_deudor: 0, saldo_acreedor: 0 });

  return { cuentas, totales };
}

async function balanceSumasYSaldos(req, res) {
  const { desde, hasta } = req.query;
  try {
    res.json(await calcularBalance(desde, hasta));
  } catch (err) { console.error('Error en balance de sumas y saldos:', err); res.status(500).json({ error: 'Error interno del servidor.' }); }
}

async function exportarBalance(req, res) {
  const { desde, hasta, formato } = req.query;
  try {
    const { cuentas, totales } = await calcularBalance(desde, hasta);
    const rango = desde || hasta ? `Del ${desde || 'inicio'} al ${hasta || 'hoy'}` : 'Histórico completo';
    await exportarTabla(res, {
      formato: formato === 'pdf' ? 'pdf' : 'xlsx',
      nombreArchivo: 'balance_sumas_y_saldos',
      titulo: 'Balance de Sumas y Saldos',
      subtitulo: rango,
      columnas: [
        { header: 'Código', key: 'codigo', width: 12 },
        { header: 'Cuenta', key: 'nombre', width: 32 },
        { header: 'Debe', key: 'suma_debe', width: 18, align: 'right', formato: 'moneda' },
        { header: 'Haber', key: 'suma_haber', width: 18, align: 'right', formato: 'moneda' },
        { header: 'Saldo deudor', key: 'saldo_deudor', width: 18, align: 'right', formato: 'moneda' },
        { header: 'Saldo acreedor', key: 'saldo_acreedor', width: 18, align: 'right', formato: 'moneda' },
      ],
      filas: cuentas,
      totales: { codigo: '', nombre: 'TOTALES', ...totales },
    });
  } catch (err) { console.error('Error al exportar balance:', err); res.status(500).json({ error: 'Error interno del servidor.' }); }
}

// ─── ESTADO DE RESULTADOS ──────────────────────────────────────────
async function calcularEstadoResultados(desde, hasta, centro_costo_id, tasa_cambio) {
  let q = `SELECT c.id, c.codigo, c.nombre, c.tipo,
             COALESCE(SUM(i.debe),0) AS suma_debe, COALESCE(SUM(i.haber),0) AS suma_haber
           FROM cuentas_contables c
           JOIN asiento_items i ON i.cuenta_id = c.id
           JOIN asientos_contables a ON a.id = i.asiento_id AND a.anulado = false
           WHERE c.tipo IN ('ingreso','egreso') AND c.imputable = true`;
  const p = [];
  if (desde) { p.push(desde); q += ` AND a.fecha >= $${p.length}`; }
  if (hasta) { p.push(hasta); q += ` AND a.fecha <= $${p.length}`; }
  if (centro_costo_id) { p.push(centro_costo_id); q += ` AND i.centro_costo_id = $${p.length}`; }
  q += ' GROUP BY c.id ORDER BY c.codigo';

  const { rows } = await pool.query(q, p);
  const ingresos = [], egresos = [];
  let totalIngresos = 0, totalEgresos = 0;
  for (const c of rows) {
    const sd = Number(c.suma_debe), sh = Number(c.suma_haber);
    if (c.tipo === 'ingreso') {
      const monto = sh - sd; // naturaleza acreedora
      ingresos.push({ ...c, monto }); totalIngresos += monto;
    } else {
      const monto = sd - sh; // naturaleza deudora
      egresos.push({ ...c, monto }); totalEgresos += monto;
    }
  }
  const resultadoNeto = totalIngresos - totalEgresos;

  let usd = null;
  if (tasa_cambio && parseFloat(tasa_cambio) > 0) {
    const t = parseFloat(tasa_cambio);
    usd = { tasa_cambio: t, total_ingresos: totalIngresos / t, total_egresos: totalEgresos / t, resultado_neto: resultadoNeto / t };
  }

  return { ingresos, egresos, total_ingresos: totalIngresos, total_egresos: totalEgresos, resultado_neto: resultadoNeto, usd };
}

async function estadoResultados(req, res) {
  const { desde, hasta, centro_costo_id, tasa_cambio } = req.query;
  try {
    res.json(await calcularEstadoResultados(desde, hasta, centro_costo_id, tasa_cambio));
  } catch (err) { console.error('Error en estado de resultados:', err); res.status(500).json({ error: 'Error interno del servidor.' }); }
}

async function exportarEstadoResultados(req, res) {
  const { desde, hasta, centro_costo_id, tasa_cambio, formato } = req.query;
  try {
    const { ingresos, egresos, total_ingresos, total_egresos, resultado_neto } = await calcularEstadoResultados(desde, hasta, centro_costo_id, tasa_cambio);
    const filas = [
      { codigo: '', nombre: 'INGRESOS', monto: '' },
      ...ingresos.map(c => ({ codigo: c.codigo, nombre: c.nombre, monto: c.monto })),
      { codigo: '', nombre: 'Total ingresos', monto: total_ingresos },
      { codigo: '', nombre: '', monto: '' },
      { codigo: '', nombre: 'EGRESOS', monto: '' },
      ...egresos.map(c => ({ codigo: c.codigo, nombre: c.nombre, monto: c.monto })),
      { codigo: '', nombre: 'Total egresos', monto: total_egresos },
    ];
    const rango = desde || hasta ? `Del ${desde || 'inicio'} al ${hasta || 'hoy'}` : 'Histórico completo';
    await exportarTabla(res, {
      formato: formato === 'pdf' ? 'pdf' : 'xlsx',
      nombreArchivo: 'estado_de_resultados',
      titulo: 'Estado de Resultados',
      subtitulo: rango,
      columnas: [
        { header: 'Código', key: 'codigo', width: 12 },
        { header: 'Cuenta', key: 'nombre', width: 36 },
        { header: 'Monto', key: 'monto', width: 20, align: 'right', formato: 'moneda' },
      ],
      filas,
      totales: { codigo: '', nombre: 'RESULTADO NETO', monto: resultado_neto },
    });
  } catch (err) { console.error('Error al exportar estado de resultados:', err); res.status(500).json({ error: 'Error interno del servidor.' }); }
}

module.exports = {
  listarCuentas, crearCuenta,
  listarCentrosCosto, crearCentroCosto, eliminarCentroCosto,
  listarAsientos, obtenerAsiento, crearAsientoManual, anularAsiento,
  libroMayor, balanceSumasYSaldos, estadoResultados,
  exportarBalance, exportarEstadoResultados,
};
