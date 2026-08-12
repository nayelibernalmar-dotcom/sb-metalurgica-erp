const express = require('express');
const router = express.Router();
const { listar } = require('../controllers/auditoriaController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth, requireRole('admin'));
router.get('/', listar);

module.exports = router;
