const { siguienteNumero } = require('./numeracion');
const { parseDecimal, formatDecimal } = require('./money');

/**
 * Crea un asiento contable a partir de líneas ya armadas.
 * `client` debe ser una conexión (pool.connect()) DENTRO de una transacción ya abierta
 * por el módulo que llama (ventas, caja, etc.), para que el asiento y el movimiento de
 * origen se confirmen o reviertan juntos.
 *
 * lineas: [{ cuenta_codigo, centro_costo_id?, debe?, haber?, descripcion? }, ...]
 */
async function crearAsientoAutomatico(client, { fecha, descripcion, origen, origen_tabla, origen_id, lineas, creado_por }) {
  const totalDebe = lineas.reduce((s, l) => s + parseDecimal(l.debe || 0), 0n);
  const totalHaber = lineas.reduce((s, l) => s + parseDecimal(l.haber || 0), 0n);
  if (totalDebe !== totalHaber) {
    throw new Error(`Asiento automático desbalanceado (debe ${formatDecimal(totalDebe)} != haber ${formatDecimal(totalHaber)}), origen: ${origen_tabla}#${origen_id}`);
  }

  const numero = await siguienteNumero(client, 'asientos_contables', 'A');
  const { rows } = await client.query(
    `INSERT INTO asientos_contables (numero, fecha, descripcion, origen, origen_tabla, origen_id, creado_por)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [numero, fecha, descripcion, origen, origen_tabla || null, origen_id || null, creado_por]
  );
  const asiento = rows[0];

  let orden = 1;
  for (const l of lineas) {
    const { rows: cuenta } = await client.query(
      `SELECT id, imputable FROM cuentas_contables WHERE codigo = $1`, [l.cuenta_codigo]
    );
    if (!cuenta[0]) throw new Error(`No existe la cuenta contable ${l.cuenta_codigo}. Revisá el plan de cuentas.`);
    if (!cuenta[0].imputable) throw new Error(`La cuenta ${l.cuenta_codigo} es un rubro (no imputable), no se le pueden cargar movimientos.`);
    await client.query(
      `INSERT INTO asiento_items (asiento_id, orden, cuenta_id, centro_costo_id, descripcion, debe, haber)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [asiento.id, orden++, cuenta[0].id, l.centro_costo_id || null, l.descripcion || null, l.debe || 0, l.haber || 0]
    );
  }

  return asiento;
}

/** Elimina (anula) el/los asiento(s) generados automáticamente para un origen dado. Usado al anular una venta, etc. */
async function anularAsientosDeOrigen(client, origen_tabla, origen_id) {
  await client.query(
    `UPDATE asientos_contables SET anulado = true WHERE origen_tabla = $1 AND origen_id = $2 AND anulado = false`,
    [origen_tabla, origen_id]
  );
}

module.exports = { crearAsientoAutomatico, anularAsientosDeOrigen };
