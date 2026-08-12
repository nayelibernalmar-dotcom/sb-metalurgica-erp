// src/routes/ventasRoutes.js
const express = require('express');
const router = express.Router();
const { listarVentas, obtenerVenta, crearVenta, cambiarEstadoVenta } = require('../controllers/ventasController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', listarVentas);
router.get('/:id', obtenerVenta);
router.post('/', requireRole('admin', 'vendedor', 'caja'), crearVenta);
router.patch('/:id/estado', requireRole('admin', 'caja'), cambiarEstadoVenta);

module.exports = router;
