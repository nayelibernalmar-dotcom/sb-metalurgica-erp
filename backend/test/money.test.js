const test = require('node:test');
const assert = require('node:assert/strict');
const { addMoney, subtractMoney, multiplyMoney, parseDecimal } = require('../src/utils/money');

test('suma montos sin error de coma flotante', () => {
  assert.equal(addMoney(['0.10', '0.20']), '0.30');
  assert.equal(subtractMoney('1000.00', '0.01'), '999.99');
});

test('multiplica cantidad y precio como decimales exactos', () => {
  assert.equal(multiplyMoney('2.50', '12.40'), '31.00');
  assert.equal(multiplyMoney('3', '10.01'), '30.03');
  assert.equal(multiplyMoney('0.33', '0.02'), '0.01');
});

test('rechaza precisión monetaria no admitida', () => {
  assert.throws(() => parseDecimal('1.001'), /máximo 2 decimales/);
  assert.throws(() => multiplyMoney('0.333', '0.01'), /máximo 2 decimales/);
});
