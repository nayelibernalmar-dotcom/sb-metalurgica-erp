const bcrypt = require('bcryptjs');
const pool = require('../db/pool');
const { firmarToken } = require('../utils/jwt');

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email y contraseña son obligatorios.' });

  try {
    const { rows } = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email.toLowerCase().trim()]);
    const u = rows[0];
    if (!u) return res.status(401).json({ error: 'Email o contraseña incorrectos.' });
    if (!u.activo) return res.status(403).json({ error: 'Usuario desactivado. Contactá al administrador.' });
    if (!await bcrypt.compare(password, u.password_hash)) return res.status(401).json({ error: 'Email o contraseña incorrectos.' });

    const token = firmarToken({ id: u.id, email: u.email, rol: u.rol, nombre: u.nombre });
    res.json({ token, usuario: { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol } });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

async function crearUsuario(req, res) {
  const { nombre, email, password, rol } = req.body;
  const rolesValidos = ['admin', 'vendedor', 'caja', 'deposito'];
  if (!nombre || !email || !password) return res.status(400).json({ error: 'Nombre, email y contraseña son obligatorios.' });
  if (password.length < 8) return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
  if (rol && !rolesValidos.includes(rol)) return res.status(400).json({ error: `Rol inválido. Debe ser: ${rolesValidos.join(', ')}.` });

  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES ($1, $2, $3, $4) RETURNING id, nombre, email, rol, activo, creado_en`,
      [nombre.trim(), email.toLowerCase().trim(), hash, rol || 'vendedor']
    );
    res.status(201).json({ usuario: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ya existe un usuario con ese email.' });
    console.error('Error al crear usuario:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

async function obtenerPerfil(req, res) {
  try {
    const { rows } = await pool.query('SELECT id, nombre, email, rol, creado_en FROM usuarios WHERE id = $1', [req.usuario.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado.' });
    res.json({ usuario: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

async function listarUsuarios(req, res) {
  try {
    const { rows } = await pool.query('SELECT id, nombre, email, rol, activo, creado_en FROM usuarios ORDER BY creado_en DESC');
    res.json({ usuarios: rows });
  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

async function cambiarEstadoUsuario(req, res) {
  const { activo } = req.body;
  if (typeof activo !== 'boolean') return res.status(400).json({ error: '"activo" debe ser true o false.' });
  try {
    const { rows } = await pool.query(
      `UPDATE usuarios SET activo = $1, actualizado_en = now() WHERE id = $2 RETURNING id, nombre, email, rol, activo`,
      [activo, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado.' });
    res.json({ usuario: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

module.exports = { login, crearUsuario, obtenerPerfil, listarUsuarios, cambiarEstadoUsuario };
