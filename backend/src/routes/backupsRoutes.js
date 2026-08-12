const express = require('express');
const router = express.Router();
const { listar, ejecutar, descargar } = require('../controllers/backupsController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth, requireRole('admin'));

router.get('/', listar);
router.post('/ejecutar', ejecutar);
router.get('/:archivo/descargar', descargar);

module.exports = router;
