const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const sql = fs.readFileSync(path.join(__dirname, '..', 'src', 'db', 'analytics.sql'), 'utf8');

test('declara el modelo estrella mínimo de Power BI', () => {
  for (const vista of ['dim_fecha', 'dim_clientes', 'dim_productos', 'fact_venta_items', 'fact_caja', 'fact_inventario_actual']) {
    assert.match(sql, new RegExp(`CREATE OR REPLACE VIEW analytics\\.${vista}\\b`, 'i'));
  }
});

test('no expone columnas personales o credenciales en las vistas', () => {
  for (const columna of ['password_hash', 'ruc', 'telefono', 'email', 'documento', 'sueldo_mensual']) {
    assert.doesNotMatch(sql, new RegExp(`\\b${columna}\\b`, 'i'));
  }
});

test('revoca el acceso público al esquema analítico', () => {
  assert.match(sql, /REVOKE ALL ON SCHEMA analytics FROM PUBLIC/i);
  assert.match(sql, /REVOKE ALL ON ALL TABLES IN SCHEMA analytics FROM PUBLIC/i);
});
