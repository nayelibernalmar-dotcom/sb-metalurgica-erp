const pool = require('./pool');

async function withTransaction(work, { isolationLevel } = {}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (isolationLevel) {
      const allowed = new Set(['READ COMMITTED', 'REPEATABLE READ', 'SERIALIZABLE']);
      if (!allowed.has(isolationLevel)) throw new Error('Nivel de aislamiento no permitido.');
      await client.query(`SET TRANSACTION ISOLATION LEVEL ${isolationLevel}`);
    }
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (rollbackError) {
      console.error('No se pudo revertir la transacción:', rollbackError);
    }
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { withTransaction };
