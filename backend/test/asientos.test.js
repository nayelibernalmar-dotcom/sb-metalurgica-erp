const test = require('node:test');
const assert = require('node:assert/strict');
const { crearAsientoAutomatico } = require('../src/utils/asientos');

test('rechaza un asiento desbalanceado antes de consultar la base', async () => {
  const client = { query: () => assert.fail('no debe consultar la base') };
  await assert.rejects(() => crearAsientoAutomatico(client, {
    fecha: '2026-08-12', descripcion: 'prueba', origen: 'test', origen_tabla: 'ventas', origen_id: 1, creado_por: 1,
    lineas: [{ cuenta_codigo: '1', debe: '10.00' }, { cuenta_codigo: '2', haber: '9.99' }],
  }), /desbalanceado/);
});
