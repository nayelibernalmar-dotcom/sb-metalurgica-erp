const { verificarToken } = require('../utils/jwt');

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No se envió un token de sesión.' });
  }
  try {
    req.usuario = verificarToken(header.split(' ')[1]);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado. Iniciá sesión de nuevo.' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.usuario) return res.status(401).json({ error: 'No autenticado.' });
    if (!roles.includes(req.usuario.rol)) {
      return res.status(403).json({ error: `Rol requerido: ${roles.join(' o ')}.` });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
