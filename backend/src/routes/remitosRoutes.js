const express = require('express');
const router = express.Router();
const { listarRemitos, obtenerRemito, crearRemito, actualizarRemito } = require('../controllers/remitosController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);
router.get('/', listarRemitos);
router.get('/:id', obtenerRemito);
router.post('/', requireRole('admin', 'vendedor', 'deposito'), crearRemito);
router.put('/:id', requireRole('admin', 'vendedor', 'deposito'), actualizarRemito);

module.exports = router;
