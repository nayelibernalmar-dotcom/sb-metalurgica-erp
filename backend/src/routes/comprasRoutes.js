const express = require('express');
const router = express.Router();
const {
  listarCompras, obtenerCompra, crearCompra, cambiarEstadoCompra, sugerenciasReposicion,
} = require('../controllers/comprasController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/sugerencias', sugerenciasReposicion);
router.get('/', listarCompras);
router.get('/:id', obtenerCompra);
router.post('/', crearCompra);
router.patch('/:id/estado', cambiarEstadoCompra);

module.exports = router;
