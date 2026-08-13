# Power BI para SB Metalúrgica ERP

El ERP publica un modelo analítico de solo lectura en el esquema PostgreSQL `analytics`. No hace falta conectar Power BI a las tablas operativas ni copiar datos sensibles.

## Modelo disponible

| Vista | Grano | Uso |
|---|---|---|
| `analytics.dim_fecha` | Un día | Filtros de año, trimestre, mes, semana y día |
| `analytics.dim_clientes` | Un cliente | Segmentación por cliente y ciudad, sin RUC ni contacto |
| `analytics.dim_productos` | Un producto | Segmentación por producto, unidad y estado |
| `analytics.fact_venta_items` | Un ítem de venta | Ventas, unidades, precios y ticket promedio |
| `analytics.fact_caja` | Un movimiento | Ingresos, egresos y saldo de ambas cajas |
| `analytics.fact_inventario_actual` | Un producto activo | Stock actual, reposición y valorización estimada |

## Relaciones en Power BI

Crear relaciones `1 → *`, con dirección de filtro simple desde la dimensión hacia el hecho:

```text
dim_fecha[fecha] → fact_venta_items[fecha]
dim_fecha[fecha] → fact_caja[fecha]
dim_fecha[fecha] → fact_inventario_actual[fecha_snapshot]
dim_clientes[cliente_id] → fact_venta_items[cliente_id]
dim_productos[producto_id] → fact_venta_items[producto_id]
dim_productos[producto_id] → fact_inventario_actual[producto_id]
```

Marcar `dim_fecha[fecha]` como tabla de fechas. Ordenar `dim_fecha[mes]` por `mes_numero` y `dim_fecha[dia_semana]` por `dia_semana_numero`.

## Acceso de solo lectura

`backend/src/db/powerbi_reader_role.sql` crea el rol grupal `powerbi_reader` y le permite leer únicamente `analytics`. Debe ejecutarlo un administrador de PostgreSQL una sola vez. Después crea un usuario de servicio con una contraseña generada en un gestor de secretos:

```sql
CREATE USER powerbi_servicio WITH LOGIN PASSWORD '<secreto-del-gestor>';
GRANT powerbi_reader TO powerbi_servicio;
```

No guardar esa contraseña en Git, `.env.example`, Power Query ni capturas. Si el proveedor no permite usuarios adicionales, crear una base o réplica analítica independiente en lugar de usar las credenciales administrativas de producción.

## Conexión desde Power BI Desktop

1. Ejecutar `npm run migrate` en el backend para crear o actualizar las vistas.
2. Elegir **Obtener datos → PostgreSQL**.
3. Ingresar servidor y base de datos por separado; no pegar la URL completa del ERP en el informe.
4. Elegir **Importar** como modo inicial.
5. Autenticarse con el usuario de servicio de solo lectura.
6. Seleccionar únicamente las seis vistas de `analytics`.
7. Crear las relaciones anteriores y las medidas de `docs/power-bi/medidas.dax`.

Importar es apropiado para el volumen actual y evita que cada interacción consulte la base operativa. DirectQuery solo conviene si aparece un requisito real de datos casi en tiempo real y se mide previamente su impacto.

## Páginas recomendadas

1. **Resumen ejecutivo:** ventas, ticket promedio, ingresos, egresos, saldo y productos bajo mínimo.
2. **Ventas:** evolución, top de clientes/productos, estados y detalle por venta.
3. **Caja:** entradas, salidas y saldo; comparación Caja Chica contra Caja Grande.
4. **Inventario:** stock, mínimo, reposición y valorización estimada.

## Reglas de interpretación

- Las ventas anuladas permanecen para trazabilidad, pero las medidas netas las excluyen.
- `fact_inventario_actual` es un snapshot del momento de actualización; todavía no permite stock histórico.
- `valor_venta_estimado` no equivale a ganancia. El margen solo es confiable cuando todos los productos tienen costo vigente.
- Los movimientos de personal aparecen agregados; no se expone empleado, documento, sueldo ni concepto.

## Actualización y publicación

- Programar actualización diaria o varias veces al día; el tablero inicial no necesita tiempo real.
- Si PostgreSQL está en una red privada, usar un gateway en un equipo o VM siempre encendido.
- Publicar en un workspace restringido. No usar **Publicar en la web**, porque permite acceso sin autenticación.
- Rotar la contraseña del usuario de servicio y revisar sus permisos.

## Próxima fase

Después de validar el tablero, agregar snapshots diarios de inventario, costos históricos y hechos de compras/obras. No se deben inferir márgenes históricos con precios actuales.
