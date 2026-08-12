-- Schema completo SB Metalúrgica SA
-- Etapas 1, 2, 3 y 4

-- TIPOS
DO $$ BEGIN CREATE TYPE rol_usuario AS ENUM ('admin', 'vendedor', 'caja', 'deposito');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE unidad_medida AS ENUM ('unidades', 'metros');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE estado_venta AS ENUM ('pendiente', 'pagada', 'anulada');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE tipo_movimiento AS ENUM ('ingreso', 'egreso');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ETAPA 1: Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  rol rol_usuario NOT NULL DEFAULT 'vendedor',
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);

CREATE TABLE IF NOT EXISTS auditoria (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER REFERENCES usuarios(id),
  accion VARCHAR(100) NOT NULL,
  entidad VARCHAR(50),
  entidad_id INTEGER,
  detalle JSONB,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ETAPA 2: Productos
CREATE TABLE IF NOT EXISTS productos (
  id SERIAL PRIMARY KEY,
  descripcion TEXT NOT NULL,
  unidad unidad_medida NOT NULL DEFAULT 'unidades',
  precio NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (precio >= 0),
  stock NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (stock >= 0),
  stock_minimo NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0),
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_productos_descripcion ON productos(descripcion);
CREATE INDEX IF NOT EXISTS idx_productos_activo ON productos(activo);

-- ETAPA 3: Clientes, Presupuestos, Remitos
CREATE TABLE IF NOT EXISTS clientes (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  ruc VARCHAR(30),
  direccion VARCHAR(255),
  ciudad VARCHAR(100),
  telefono VARCHAR(50),
  email VARCHAR(150),
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON clientes(nombre);
CREATE INDEX IF NOT EXISTS idx_clientes_ruc ON clientes(ruc);

CREATE TABLE IF NOT EXISTS presupuestos (
  id SERIAL PRIMARY KEY,
  numero VARCHAR(30) UNIQUE NOT NULL,
  cliente_id INTEGER REFERENCES clientes(id),
  contacto VARCHAR(150),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  validez_dias INTEGER NOT NULL DEFAULT 15,
  estado VARCHAR(20) NOT NULL DEFAULT 'vigente',
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  notas TEXT,
  creado_por INTEGER REFERENCES usuarios(id),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS presupuesto_items (
  id SERIAL PRIMARY KEY,
  presupuesto_id INTEGER NOT NULL REFERENCES presupuestos(id) ON DELETE CASCADE,
  orden INTEGER NOT NULL DEFAULT 1,
  producto_id INTEGER REFERENCES productos(id),
  descripcion TEXT NOT NULL,
  cantidad NUMERIC(14,2) NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  unidad unidad_medida NOT NULL DEFAULT 'unidades',
  precio_unitario NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (precio_unitario >= 0),
  precio_total NUMERIC(14,2) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_presupuesto_items_presupuesto ON presupuesto_items(presupuesto_id);

CREATE TABLE IF NOT EXISTS remitos (
  id SERIAL PRIMARY KEY,
  numero VARCHAR(30) UNIQUE NOT NULL,
  cliente_id INTEGER REFERENCES clientes(id),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  motivo_traslado VARCHAR(255),
  direccion_origen VARCHAR(255),
  ciudad_origen VARCHAR(100),
  direccion_entrega VARCHAR(255),
  ruc_receptor VARCHAR(30),
  notas TEXT,
  creado_por INTEGER REFERENCES usuarios(id),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS remito_items (
  id SERIAL PRIMARY KEY,
  remito_id INTEGER NOT NULL REFERENCES remitos(id) ON DELETE CASCADE,
  orden INTEGER NOT NULL DEFAULT 1,
  producto_id INTEGER REFERENCES productos(id),
  descripcion TEXT NOT NULL,
  cantidad NUMERIC(14,2) NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  unidad unidad_medida NOT NULL DEFAULT 'unidades'
);
CREATE INDEX IF NOT EXISTS idx_remito_items_remito ON remito_items(remito_id);

-- ETAPA 4: Ventas y Caja
CREATE TABLE IF NOT EXISTS ventas (
  id SERIAL PRIMARY KEY,
  numero VARCHAR(30) UNIQUE NOT NULL,
  cliente_id INTEGER REFERENCES clientes(id),
  presupuesto_id INTEGER REFERENCES presupuestos(id),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  estado estado_venta NOT NULL DEFAULT 'pendiente',
  descuento NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (descuento >= 0 AND descuento <= 100),
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  notas TEXT,
  creado_por INTEGER REFERENCES usuarios(id),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ventas_cliente ON ventas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha);

CREATE TABLE IF NOT EXISTS venta_items (
  id SERIAL PRIMARY KEY,
  venta_id INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  orden INTEGER NOT NULL DEFAULT 1,
  producto_id INTEGER REFERENCES productos(id),
  descripcion TEXT NOT NULL,
  cantidad NUMERIC(14,2) NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  unidad unidad_medida NOT NULL DEFAULT 'unidades',
  precio_unitario NUMERIC(14,2) NOT NULL DEFAULT 0,
  precio_total NUMERIC(14,2) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_venta_items_venta ON venta_items(venta_id);

CREATE TABLE IF NOT EXISTS caja_movimientos (
  id SERIAL PRIMARY KEY,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo tipo_movimiento NOT NULL,
  concepto VARCHAR(255) NOT NULL,
  monto NUMERIC(14,2) NOT NULL CHECK (monto > 0),
  venta_id INTEGER REFERENCES ventas(id),
  creado_por INTEGER REFERENCES usuarios(id),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_caja_fecha ON caja_movimientos(fecha);

CREATE TABLE IF NOT EXISTS caja_cierres (
  id SERIAL PRIMARY KEY,
  fecha DATE UNIQUE NOT NULL,
  total_ingresos NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_egresos NUMERIC(14,2) NOT NULL DEFAULT 0,
  saldo NUMERIC(14,2) NOT NULL DEFAULT 0,
  cerrado_por INTEGER REFERENCES usuarios(id),
  cerrado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ETAPA 7: Contabilidad
DO $$ BEGIN CREATE TYPE tipo_cuenta AS ENUM ('activo','pasivo','patrimonio','ingreso','egreso');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE origen_asiento AS ENUM ('manual','venta','caja','compra','apertura','ajuste');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Plan de cuentas (soporta jerarquía: rubros no imputables + cuentas imputables)
CREATE TABLE IF NOT EXISTS cuentas_contables (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(20) UNIQUE NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  tipo tipo_cuenta NOT NULL,
  cuenta_padre_id INTEGER REFERENCES cuentas_contables(id),
  imputable BOOLEAN NOT NULL DEFAULT true,
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cuentas_codigo ON cuentas_contables(codigo);
CREATE INDEX IF NOT EXISTS idx_cuentas_tipo ON cuentas_contables(tipo);

-- Centros de costo (hasta 3, validado en la aplicación)
CREATE TABLE IF NOT EXISTS centros_costo (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) UNIQUE NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cabecera de asiento contable
CREATE TABLE IF NOT EXISTS asientos_contables (
  id SERIAL PRIMARY KEY,
  numero VARCHAR(30) UNIQUE NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  descripcion TEXT NOT NULL,
  origen origen_asiento NOT NULL DEFAULT 'manual',
  origen_tabla VARCHAR(50),
  origen_id INTEGER,
  anulado BOOLEAN NOT NULL DEFAULT false,
  creado_por INTEGER REFERENCES usuarios(id),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_asientos_fecha ON asientos_contables(fecha);
CREATE INDEX IF NOT EXISTS idx_asientos_origen ON asientos_contables(origen_tabla, origen_id);

-- Líneas (movimientos) de cada asiento — el debe y el haber siempre deben sumar igual por asiento
CREATE TABLE IF NOT EXISTS asiento_items (
  id SERIAL PRIMARY KEY,
  asiento_id INTEGER NOT NULL REFERENCES asientos_contables(id) ON DELETE CASCADE,
  orden INTEGER NOT NULL DEFAULT 1,
  cuenta_id INTEGER NOT NULL REFERENCES cuentas_contables(id),
  centro_costo_id INTEGER REFERENCES centros_costo(id),
  descripcion TEXT,
  debe NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (debe >= 0),
  haber NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (haber >= 0)
);
CREATE INDEX IF NOT EXISTS idx_asiento_items_asiento ON asiento_items(asiento_id);
CREATE INDEX IF NOT EXISTS idx_asiento_items_cuenta ON asiento_items(cuenta_id);

-- ETAPA 8: Compras y Proveedores
DO $$ BEGIN CREATE TYPE estado_compra AS ENUM ('pendiente','recibida','anulada');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE tipo_mov_proveedor AS ENUM ('compra','pago','ajuste');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS proveedores (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  ruc VARCHAR(30),
  direccion VARCHAR(255),
  ciudad VARCHAR(100),
  telefono VARCHAR(50),
  email VARCHAR(150),
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_proveedores_nombre ON proveedores(nombre);
CREATE INDEX IF NOT EXISTS idx_proveedores_ruc ON proveedores(ruc);

CREATE TABLE IF NOT EXISTS compras (
  id SERIAL PRIMARY KEY,
  numero VARCHAR(30) UNIQUE NOT NULL,
  proveedor_id INTEGER NOT NULL REFERENCES proveedores(id),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  estado estado_compra NOT NULL DEFAULT 'pendiente',
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  notas TEXT,
  creado_por INTEGER REFERENCES usuarios(id),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_compras_proveedor ON compras(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_compras_fecha ON compras(fecha);
CREATE INDEX IF NOT EXISTS idx_compras_estado ON compras(estado);

CREATE TABLE IF NOT EXISTS compra_items (
  id SERIAL PRIMARY KEY,
  compra_id INTEGER NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
  orden INTEGER NOT NULL DEFAULT 1,
  producto_id INTEGER REFERENCES productos(id),
  descripcion TEXT NOT NULL,
  cantidad NUMERIC(14,2) NOT NULL CHECK (cantidad > 0),
  unidad unidad_medida NOT NULL DEFAULT 'unidades',
  precio_unitario NUMERIC(14,2) NOT NULL DEFAULT 0,
  precio_total NUMERIC(14,2) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_compra_items_compra ON compra_items(compra_id);

-- Cuenta corriente de proveedores: compras suman deuda, pagos la restan
CREATE TABLE IF NOT EXISTS proveedor_movimientos (
  id SERIAL PRIMARY KEY,
  proveedor_id INTEGER NOT NULL REFERENCES proveedores(id),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo tipo_mov_proveedor NOT NULL,
  concepto VARCHAR(255) NOT NULL,
  monto NUMERIC(14,2) NOT NULL CHECK (monto > 0),
  compra_id INTEGER REFERENCES compras(id),
  creado_por INTEGER REFERENCES usuarios(id),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_prov_mov_proveedor ON proveedor_movimientos(proveedor_id);

-- ETAPA 9: Obras (seguimiento de pagos de presupuestos aprobados)
CREATE TABLE IF NOT EXISTS obras (
  id SERIAL PRIMARY KEY,
  presupuesto_id INTEGER UNIQUE NOT NULL REFERENCES presupuestos(id),
  estado VARCHAR(20) NOT NULL DEFAULT 'en_proceso', -- en_proceso | finalizada | cancelada
  monto_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  notas TEXT,
  creado_por INTEGER REFERENCES usuarios(id),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_obras_presupuesto ON obras(presupuesto_id);

CREATE TABLE IF NOT EXISTS obra_pagos (
  id SERIAL PRIMARY KEY,
  obra_id INTEGER NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  concepto VARCHAR(150) NOT NULL,
  monto NUMERIC(14,2) NOT NULL CHECK (monto > 0),
  forma_pago VARCHAR(50),
  creado_por INTEGER REFERENCES usuarios(id),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_obra_pagos_obra ON obra_pagos(obra_id);

-- ETAPA 10: Empleados (sueldos y adelantos)
DO $$ BEGIN CREATE TYPE tipo_pago_empleado AS ENUM ('adelanto','sueldo','aguinaldo','bono','otro');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS empleados (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  documento VARCHAR(30),
  cargo VARCHAR(100),
  telefono VARCHAR(50),
  fecha_ingreso DATE,
  sueldo_mensual NUMERIC(14,2) NOT NULL DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_empleados_nombre ON empleados(nombre);

-- Cada pago (adelanto, sueldo del mes, aguinaldo, bono) queda registrado individualmente,
-- así el saldo de "cuánto se le adelantó este mes" surge de sumar los movimientos del período.
CREATE TABLE IF NOT EXISTS empleado_pagos (
  id SERIAL PRIMARY KEY,
  empleado_id INTEGER NOT NULL REFERENCES empleados(id),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo tipo_pago_empleado NOT NULL,
  periodo VARCHAR(7), -- 'YYYY-MM', el mes que ese pago está cubriendo (útil para adelantos vs sueldo)
  concepto VARCHAR(150),
  monto NUMERIC(14,2) NOT NULL CHECK (monto > 0),
  forma_pago VARCHAR(50),
  creado_por INTEGER REFERENCES usuarios(id),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_empleado_pagos_empleado ON empleado_pagos(empleado_id);
CREATE INDEX IF NOT EXISTS idx_empleado_pagos_periodo ON empleado_pagos(periodo);

-- ETAPA 11: Caja Grande (separada de la Caja Chica/diaria)
-- La Caja Chica (caja_movimientos) es el día a día: ventas, gastos menores.
-- La Caja Grande es de donde sale la plata para pagarle a los empleados
-- (adelantos, sueldos, aguinaldos, bonos) y para inyecciones de fondos más grandes.
CREATE TABLE IF NOT EXISTS caja_grande_movimientos (
  id SERIAL PRIMARY KEY,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo tipo_movimiento NOT NULL,
  concepto VARCHAR(255) NOT NULL,
  monto NUMERIC(14,2) NOT NULL CHECK (monto > 0),
  empleado_pago_id INTEGER REFERENCES empleado_pagos(id),
  creado_por INTEGER REFERENCES usuarios(id),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_caja_grande_fecha ON caja_grande_movimientos(fecha);

CREATE TABLE IF NOT EXISTS caja_grande_cierres (
  id SERIAL PRIMARY KEY,
  fecha DATE UNIQUE NOT NULL,
  total_ingresos NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_egresos NUMERIC(14,2) NOT NULL DEFAULT 0,
  saldo NUMERIC(14,2) NOT NULL DEFAULT 0,
  cerrado_por INTEGER REFERENCES usuarios(id),
  cerrado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ETAPA 12: Relación Producto-Proveedor
-- Permite saber a quién comprarle cada producto (y a qué precio) sin elegirlo a mano cada vez.
CREATE TABLE IF NOT EXISTS producto_proveedores (
  id SERIAL PRIMARY KEY,
  producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  proveedor_id INTEGER NOT NULL REFERENCES proveedores(id) ON DELETE CASCADE,
  precio_compra NUMERIC(14,2) DEFAULT 0,
  es_principal BOOLEAN NOT NULL DEFAULT false,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (producto_id, proveedor_id)
);
CREATE INDEX IF NOT EXISTS idx_prodprov_producto ON producto_proveedores(producto_id);
CREATE INDEX IF NOT EXISTS idx_prodprov_proveedor ON producto_proveedores(proveedor_id);

-- Solo un proveedor "principal" por producto
CREATE UNIQUE INDEX IF NOT EXISTS uidx_prodprov_principal
  ON producto_proveedores(producto_id) WHERE es_principal = true;

-- ETAPA 13: Ampliar columnas "descripcion" de VARCHAR(255) a TEXT.
-- VARCHAR(255) resultaba insuficiente para descripciones largas de ítems
-- (ej: presupuestos con detalles extensos) y rompía con
-- "value too long for type character varying(255)".
-- Con ALTER porque CREATE TABLE IF NOT EXISTS no toca tablas ya existentes.
ALTER TABLE productos ALTER COLUMN descripcion TYPE TEXT;
ALTER TABLE presupuesto_items ALTER COLUMN descripcion TYPE TEXT;
ALTER TABLE remito_items ALTER COLUMN descripcion TYPE TEXT;
ALTER TABLE venta_items ALTER COLUMN descripcion TYPE TEXT;
ALTER TABLE asientos_contables ALTER COLUMN descripcion TYPE TEXT;
ALTER TABLE asiento_items ALTER COLUMN descripcion TYPE TEXT;
ALTER TABLE compra_items ALTER COLUMN descripcion TYPE TEXT;
