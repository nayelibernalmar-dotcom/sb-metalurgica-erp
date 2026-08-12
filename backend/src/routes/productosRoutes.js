const express = require('express');
const router = express.Router();
const { listarProductos, obtenerProducto, crearProducto, actualizarProducto, eliminarProducto, ajustarStock } = require('../controllers/productosController');
const { listarPorProducto, vincular, desvincular } = require('../controllers/productoProveedoresController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);
router.get('/', listarProductos);
router.get('/:id', obtenerProducto);
router.post('/', requireRole('admin', 'deposito'), crearProducto);
router.put('/:id', requireRole('admin', 'deposito'), actualizarProducto);
router.patch('/:id/stock', requireRole('admin', 'deposito'), ajustarStock);
router.delete('/:id', requireRole('admin'), eliminarProducto);

// Relación producto-proveedor (para reponer stock sin elegir proveedor a mano)
router.get('/:id/proveedores', listarPorProducto);
router.post('/:id/proveedores', requireRole('admin', 'deposito'), vincular);
router.delete('/:id/proveedores/:proveedorId', requireRole('admin', 'deposito'), desvincular);

module.exports = router;
