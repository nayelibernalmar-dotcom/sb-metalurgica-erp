const express = require('express');
const router = express.Router();
const { listarObras, obtenerObra, crearObra, cambiarEstadoObra, registrarPagoObra } = require('../controllers/obrasController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', listarObras);
router.get('/:id', obtenerObra);
router.post('/', crearObra);
router.patch('/:id/estado', cambiarEstadoObra);
router.post('/:id/pagos', registrarPagoObra);

module.exports = router;
