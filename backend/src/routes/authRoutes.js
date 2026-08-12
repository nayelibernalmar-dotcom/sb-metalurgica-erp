const express = require('express');
const router = express.Router();
const { login, crearUsuario, obtenerPerfil, listarUsuarios, cambiarEstadoUsuario } = require('../controllers/authController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.post('/login', login);
router.get('/me', requireAuth, obtenerPerfil);
router.post('/usuarios', requireAuth, requireRole('admin'), crearUsuario);
router.get('/usuarios', requireAuth, requireRole('admin'), listarUsuarios);
router.patch('/usuarios/:id/estado', requireAuth, requireRole('admin'), cambiarEstadoUsuario);

module.exports = router;
