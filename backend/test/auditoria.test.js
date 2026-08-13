const test = require('node:test');
const assert = require('node:assert/strict');
const { registrarAuditoria } = require('../src/utils/auditoria');

test('usa el cliente transaccional recibido', async () => {
  const calls = [];
  const client = { query: async (...args) => calls.push(args) };
  await registrarAuditoria({ usuario_id: 7, accion: 'crear', entidad: 'venta', entidad_id: 3, detalle: { total: '10.00' }, client, strict: true });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0][1].slice(0, 4), [7, 'crear', 'venta', 3]);
});

test('modo estricto propaga el fallo para provocar rollback', async () => {
  const client = { query: async () => { throw new Error('db caída'); } };
  await assert.rejects(() => registrarAuditoria({ accion: 'crear', client, strict: true }), /db caída/);
});
