const express = require('express');
const router = express.Router();
const {
  listarProveedores, obtenerProveedor, crearProveedor, actualizarProveedor, eliminarProveedor,
  cuentaCorriente, registrarPago, exportarCuentaCorriente,
} = require('../controllers/proveedoresController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', listarProveedores);
router.get('/:id', obtenerProveedor);
router.post('/', crearProveedor);
router.put('/:id', actualizarProveedor);
router.delete('/:id', eliminarProveedor);
router.get('/:id/cuenta-corriente', cuentaCorriente);
router.get('/:id/cuenta-corriente/exportar', exportarCuentaCorriente);
router.post('/:id/pagos', registrarPago);

module.exports = router;
