const express = require('express');
const router = express.Router();
const { listarPresupuestos, obtenerPresupuesto, crearPresupuesto, actualizarPresupuesto, eliminarPresupuesto } = require('../controllers/presupuestosController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);
router.get('/', listarPresupuestos);
router.get('/:id', obtenerPresupuesto);
router.post('/', requireRole('admin', 'vendedor'), crearPresupuesto);
router.put('/:id', requireRole('admin', 'vendedor'), actualizarPresupuesto);
router.delete('/:id', requireRole('admin'), eliminarPresupuesto);

module.exports = router;
