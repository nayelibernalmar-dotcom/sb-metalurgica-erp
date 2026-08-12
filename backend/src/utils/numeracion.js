async function siguienteNumero(pool, tabla, prefijo) {
  const { rows } = await pool.query(
    `SELECT numero FROM ${tabla} WHERE numero LIKE $1 ORDER BY id DESC LIMIT 1`,
    [`${prefijo}-%`]
  );
  if (rows.length === 0) return `${prefijo}-0001`;
  const num = parseInt(rows[0].numero.split('-')[1], 10) || 0;
  return `${prefijo}-${String(num + 1).padStart(4, '0')}`;
}

module.exports = { siguienteNumero };
