const express = require('express');
const router = express.Router();
const {
  listarCuentas, crearCuenta,
  listarCentrosCosto, crearCentroCosto, eliminarCentroCosto,
  listarAsientos, obtenerAsiento, crearAsientoManual, anularAsiento,
  libroMayor, balanceSumasYSaldos, estadoResultados,
  exportarBalance, exportarEstadoResultados,
} = require('../controllers/contabilidadController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);
router.use(requireRole('admin')); // Toda la pantalla de Contabilidad es solo para admin

// Plan de cuentas
router.get('/cuentas', listarCuentas);
router.post('/cuentas', crearCuenta);

// Centros de costo
router.get('/centros-costo', listarCentrosCosto);
router.post('/centros-costo', crearCentroCosto);
router.delete('/centros-costo/:id', eliminarCentroCosto);

// Asientos / Libro diario
router.get('/asientos', listarAsientos);
router.get('/asientos/:id', obtenerAsiento);
router.post('/asientos', crearAsientoManual);
router.patch('/asientos/:id/anular', anularAsiento);

// Reportes
router.get('/libro-mayor', libroMayor);
router.get('/balance', balanceSumasYSaldos);
router.get('/balance/exportar', exportarBalance);
router.get('/estado-resultados', estadoResultados);
router.get('/estado-resultados/exportar', exportarEstadoResultados);

module.exports = router;
