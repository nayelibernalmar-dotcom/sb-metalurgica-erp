const express = require('express');
const router = express.Router();
const { listarClientes, obtenerCliente, crearCliente, actualizarCliente, eliminarCliente } = require('../controllers/clientesController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);
router.get('/', listarClientes);
router.get('/:id', obtenerCliente);
router.post('/', crearCliente);
router.put('/:id', actualizarCliente);
router.delete('/:id', requireRole('admin'), eliminarCliente);

module.exports = router;
