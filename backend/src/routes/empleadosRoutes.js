const express = require('express');
const router = express.Router();
const {
  listarEmpleados, crearEmpleado, actualizarEmpleado, eliminarEmpleado,
  historialPagos, registrarPago, editarPago, eliminarPago, resumenMes,
} = require('../controllers/empleadosController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);
router.use(requireRole('admin')); // Toda la pantalla de Empleados es solo para admin

router.get('/resumen', resumenMes);
router.get('/', listarEmpleados);
router.post('/', crearEmpleado);
router.put('/:id', actualizarEmpleado);
router.delete('/:id', eliminarEmpleado);
router.get('/:id/pagos', historialPagos);
router.post('/:id/pagos', registrarPago);
router.put('/:id/pagos/:pagoId', editarPago);
router.delete('/:id/pagos/:pagoId', eliminarPago);

module.exports = router;
