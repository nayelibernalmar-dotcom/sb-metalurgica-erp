# Estado del proyecto

## Resumen

ERP full stack funcional para centralizar la gestión operativa y administrativa de una empresa metalúrgica. La versión de este repositorio fue preparada para portafolio y no contiene información de producción.

## Módulos implementados

- Autenticación JWT, usuarios, roles y permisos.
- Dashboard e indicadores.
- Clientes, proveedores y relación producto-proveedor.
- Inventario y ajustes de stock.
- Ventas, presupuestos y remitos.
- Compras, pagos y sugerencias de reposición.
- Caja chica y caja destinada a pagos de personal.
- Obras, anticipos y estados de cuenta.
- Empleados y registro de pagos.
- Contabilidad por partida doble y reportes.
- Auditoría de operaciones sensibles.
- Backups lógicos en JSON con rotación.
- Exportaciones a PDF y Excel.

## Estado técnico

| Componente | Estado |
|---|---|
| Frontend React | Funcional y compilable para producción |
| API REST Node.js/Express | Funcional |
| PostgreSQL y migraciones | Funcional |
| Autenticación y roles | Funcional |
| Configuración para Render | Incluida |
| Datos o credenciales reales | No incluidos |

## Instalación local

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Completá .env con valores propios y seguros.
npm run migrate
npm run dev
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## Publicación

`render.yaml` permite desplegar el frontend y el backend en un mismo servicio, junto con PostgreSQL. Las variables `ADMIN_EMAIL` y `ADMIN_PASSWORD` deben definirse de forma privada durante el despliegue; `DATABASE_URL` y `JWT_SECRET` nunca deben guardarse en Git.

## Seguridad

- No publicar archivos `.env`, backups, dumps SQL ni datos reales.
- Cambiar cualquier contraseña que haya sido compartida previamente.
- Usar un secreto JWT aleatorio de al menos 32 caracteres.
- Mantener las dependencias actualizadas y ejecutar `npm audit` antes de publicar.
