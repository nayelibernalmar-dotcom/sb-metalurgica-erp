const pool = require('./pool');

// Plan de cuentas simple y estándar para una PyME comercial.
// [codigo, nombre, tipo, codigo_padre|null, imputable]
const PLAN_DE_CUENTAS = [
  ['1', 'ACTIVO', 'activo', null, false],
  ['1.1', 'Activo Corriente', 'activo', '1', false],
  ['1.1.01', 'Caja', 'activo', '1.1', true],
  ['1.1.02', 'Banco', 'activo', '1.1', true],
  ['1.1.03', 'Clientes (Cuentas por Cobrar)', 'activo', '1.1', true],
  ['1.1.04', 'Mercaderías', 'activo', '1.1', true],
  ['1.1.05', 'IVA Crédito Fiscal', 'activo', '1.1', true],
  ['1.1.06', 'Anticipos a Empleados', 'activo', '1.1', true],
  ['1.2', 'Activo No Corriente', 'activo', '1', false],
  ['1.2.01', 'Muebles y Útiles', 'activo', '1.2', true],
  ['1.2.02', 'Rodados', 'activo', '1.2', true],
  ['1.2.03', 'Maquinarias y Herramientas', 'activo', '1.2', true],

  ['2', 'PASIVO', 'pasivo', null, false],
  ['2.1', 'Pasivo Corriente', 'pasivo', '2', false],
  ['2.1.01', 'Proveedores (Cuentas por Pagar)', 'pasivo', '2.1', true],
  ['2.1.02', 'IVA Débito Fiscal', 'pasivo', '2.1', true],
  ['2.1.03', 'Sueldos y Cargas Sociales a Pagar', 'pasivo', '2.1', true],
  ['2.1.04', 'Préstamos a Corto Plazo', 'pasivo', '2.1', true],
  ['2.1.05', 'Anticipos de Clientes', 'pasivo', '2.1', true],

  ['3', 'PATRIMONIO NETO', 'patrimonio', null, false],
  ['3.1.01', 'Capital', 'patrimonio', '3', true],
  ['3.1.02', 'Resultados Acumulados', 'patrimonio', '3', true],
  ['3.1.03', 'Resultado del Ejercicio', 'patrimonio', '3', true],

  ['4', 'INGRESOS', 'ingreso', null, false],
  ['4.1.01', 'Ventas', 'ingreso', '4', true],
  ['4.1.02', 'Descuentos Otorgados', 'ingreso', '4', true],
  ['4.1.03', 'Otros Ingresos', 'ingreso', '4', true],

  ['5', 'EGRESOS', 'egreso', null, false],
  ['5.1', 'Costos', 'egreso', '5', false],
  ['5.1.01', 'Costo de Mercadería Vendida', 'egreso', '5.1', true],
  ['5.2', 'Gastos', 'egreso', '5', false],
  ['5.2.01', 'Sueldos y Jornales', 'egreso', '5.2', true],
  ['5.2.02', 'Alquiler', 'egreso', '5.2', true],
  ['5.2.03', 'Servicios (Luz, Agua, Internet)', 'egreso', '5.2', true],
  ['5.2.04', 'Gastos Bancarios', 'egreso', '5.2', true],
  ['5.2.05', 'Impuestos y Tasas', 'egreso', '5.2', true],
  ['5.2.06', 'Gastos Varios', 'egreso', '5.2', true],
];

async function seedPlanDeCuentas() {
  // Se resuelven ids por código a medida que se insertan, para poder armar la jerarquía.
  // Si una cuenta ya existe (mismo código) no se toca; si es nueva, se agrega. Esto permite
  // que instalaciones que ya corrieron la migración antes reciban cuentas agregadas después.
  const idPorCodigo = {};
  const { rows: existentes } = await pool.query('SELECT id, codigo FROM cuentas_contables');
  for (const c of existentes) idPorCodigo[c.codigo] = c.id;

  let nuevas = 0;
  for (const [codigo, nombre, tipo, codigoPadre, imputable] of PLAN_DE_CUENTAS) {
    if (idPorCodigo[codigo]) continue; // ya existe, no se duplica
    const padreId = codigoPadre ? idPorCodigo[codigoPadre] : null;
    const { rows: r } = await pool.query(
      `INSERT INTO cuentas_contables (codigo, nombre, tipo, cuenta_padre_id, imputable)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [codigo, nombre, tipo, padreId, imputable]
    );
    idPorCodigo[codigo] = r[0].id;
    nuevas++;
  }
  if (nuevas > 0) console.log(`✅ Plan de cuentas: se agregaron ${nuevas} cuenta(s) nueva(s).`);
  else console.log('ℹ️  El plan de cuentas ya estaba completo, no se agregó nada.');
}

module.exports = { seedPlanDeCuentas };
