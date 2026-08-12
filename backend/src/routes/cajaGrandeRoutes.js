// src/routes/cajaGrandeRoutes.js
const express = require('express');
const router = express.Router();
const {
  obtenerMovimientos, obtenerResumen, registrarMovimiento,
  eliminarMovimiento, cerrarCaja,
} = require('../controllers/cajaGrandeController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', obtenerMovimientos);
router.get('/resumen', obtenerResumen);
router.post('/movimientos', requireRole('admin'), registrarMovimiento);
router.delete('/movimientos/:id', requireRole('admin'), eliminarMovimiento);
router.post('/cierre', requireRole('admin'), cerrarCaja);

module.exports = router;
