-- Modelo analítico mínimo para Power BI.
-- Solo expone columnas necesarias para análisis; no publica datos de contacto,
-- documentos, credenciales, notas libres, pagos individuales ni auditoría.

CREATE SCHEMA IF NOT EXISTS analytics;
REVOKE ALL ON SCHEMA analytics FROM PUBLIC;

CREATE OR REPLACE VIEW analytics.dim_fecha AS
WITH limites AS (
  SELECT LEAST(
    COALESCE((SELECT MIN(fecha) FROM ventas), CURRENT_DATE),
    COALESCE((SELECT MIN(fecha) FROM caja_movimientos), CURRENT_DATE),
    COALESCE((SELECT MIN(fecha) FROM caja_grande_movimientos), CURRENT_DATE)
  ) AS desde,
  GREATEST(
    COALESCE((SELECT MAX(fecha) FROM ventas), CURRENT_DATE),
    COALESCE((SELECT MAX(fecha) FROM caja_movimientos), CURRENT_DATE),
    COALESCE((SELECT MAX(fecha) FROM caja_grande_movimientos), CURRENT_DATE),
    CURRENT_DATE
  ) AS hasta
)
SELECT
  fecha::date AS fecha,
  EXTRACT(YEAR FROM fecha)::integer AS anio,
  EXTRACT(QUARTER FROM fecha)::integer AS trimestre,
  EXTRACT(MONTH FROM fecha)::integer AS mes_numero,
  CASE EXTRACT(MONTH FROM fecha)::integer
    WHEN 1 THEN 'Enero' WHEN 2 THEN 'Febrero' WHEN 3 THEN 'Marzo'
    WHEN 4 THEN 'Abril' WHEN 5 THEN 'Mayo' WHEN 6 THEN 'Junio'
    WHEN 7 THEN 'Julio' WHEN 8 THEN 'Agosto' WHEN 9 THEN 'Septiembre'
    WHEN 10 THEN 'Octubre' WHEN 11 THEN 'Noviembre' ELSE 'Diciembre'
  END AS mes,
  TO_CHAR(fecha, 'YYYY-MM') AS anio_mes,
  EXTRACT(WEEK FROM fecha)::integer AS semana,
  EXTRACT(DAY FROM fecha)::integer AS dia,
  EXTRACT(ISODOW FROM fecha)::integer AS dia_semana_numero,
  CASE EXTRACT(ISODOW FROM fecha)::integer
    WHEN 1 THEN 'Lunes' WHEN 2 THEN 'Martes' WHEN 3 THEN 'Miércoles'
    WHEN 4 THEN 'Jueves' WHEN 5 THEN 'Viernes' WHEN 6 THEN 'Sábado' ELSE 'Domingo'
  END AS dia_semana,
  (EXTRACT(ISODOW FROM fecha) IN (6, 7)) AS es_fin_semana
FROM limites
CROSS JOIN LATERAL generate_series(limites.desde, limites.hasta, INTERVAL '1 day') AS calendario(fecha);

CREATE OR REPLACE VIEW analytics.dim_clientes AS
SELECT id AS cliente_id, nombre, ciudad, activo
FROM clientes;

CREATE OR REPLACE VIEW analytics.dim_productos AS
SELECT id AS producto_id, descripcion, unidad::text AS unidad, activo
FROM productos;

-- Grano: una fila por ítem de venta.
CREATE OR REPLACE VIEW analytics.fact_venta_items AS
SELECT
  vi.id AS venta_item_id,
  v.id AS venta_id,
  v.numero AS venta_numero,
  v.fecha,
  v.estado::text AS estado,
  v.cliente_id,
  vi.producto_id,
  vi.descripcion AS item_descripcion,
  vi.cantidad,
  vi.unidad::text AS unidad,
  vi.precio_unitario,
  vi.precio_total
FROM venta_items vi
JOIN ventas v ON v.id = vi.venta_id;

-- Grano: una fila por movimiento. Los egresos llevan monto_neto negativo.
CREATE OR REPLACE VIEW analytics.fact_caja AS
SELECT
  'chica-' || m.id::text AS movimiento_clave,
  m.id AS movimiento_id,
  'Caja Chica'::text AS caja,
  m.fecha,
  m.tipo::text AS tipo,
  m.monto,
  CASE WHEN m.tipo = 'ingreso' THEN m.monto ELSE -m.monto END AS monto_neto,
  CASE WHEN m.venta_id IS NOT NULL THEN 'Venta' ELSE 'Manual' END AS origen,
  m.venta_id
FROM caja_movimientos m
UNION ALL
SELECT
  'grande-' || m.id::text,
  m.id,
  'Caja Grande'::text,
  m.fecha,
  m.tipo::text,
  m.monto,
  CASE WHEN m.tipo = 'ingreso' THEN m.monto ELSE -m.monto END,
  CASE WHEN m.empleado_pago_id IS NOT NULL THEN 'Pago de personal' ELSE 'Manual' END,
  NULL::integer
FROM caja_grande_movimientos m;

-- Grano: una fila por producto; representa el estado actual, no histórico.
CREATE OR REPLACE VIEW analytics.fact_inventario_actual AS
SELECT
  p.id AS producto_id,
  CURRENT_DATE AS fecha_snapshot,
  p.stock,
  p.stock_minimo,
  GREATEST(p.stock_minimo - p.stock, 0) AS cantidad_a_reponer,
  (p.stock <= p.stock_minimo) AS necesita_reposicion,
  p.precio AS precio_venta_referencia,
  principal.precio_compra AS costo_referencia,
  (p.stock * p.precio)::numeric(18,2) AS valor_venta_estimado,
  CASE WHEN principal.precio_compra IS NULL THEN NULL
       ELSE (p.stock * principal.precio_compra)::numeric(18,2)
  END AS valor_costo_estimado
FROM productos p
LEFT JOIN producto_proveedores principal
  ON principal.producto_id = p.id AND principal.es_principal = true
WHERE p.activo = true;

COMMENT ON VIEW analytics.dim_fecha IS 'Calendario para relaciones de fecha en Power BI.';
COMMENT ON VIEW analytics.dim_clientes IS 'Clientes sin datos de contacto ni identificación fiscal.';
COMMENT ON VIEW analytics.dim_productos IS 'Catálogo de productos sin información de proveedores.';
COMMENT ON VIEW analytics.fact_venta_items IS 'Ventas al grano de ítem; conserva anuladas para auditoría analítica.';
COMMENT ON VIEW analytics.fact_caja IS 'Movimientos consolidados de Caja Chica y Caja Grande.';
COMMENT ON VIEW analytics.fact_inventario_actual IS 'Snapshot actual de stock; no representa inventario histórico.';

REVOKE ALL ON ALL TABLES IN SCHEMA analytics FROM PUBLIC;
