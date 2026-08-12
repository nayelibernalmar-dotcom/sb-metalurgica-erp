// src/routes/cajaRoutes.js
const express = require('express');
const router = express.Router();
const {
  obtenerMovimientos, obtenerResumen, registrarMovimiento,
  eliminarMovimiento, cerrarCaja,
} = require('../controllers/cajaController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', obtenerMovimientos);                                             // ?fecha=YYYY-MM-DD
router.get('/resumen', obtenerResumen);                                          // ?desde=...&hasta=...
router.post('/movimientos', requireRole('admin', 'caja'), registrarMovimiento);
router.delete('/movimientos/:id', requireRole('admin'), eliminarMovimiento);
router.post('/cierre', requireRole('admin', 'caja'), cerrarCaja);

module.exports = router;
