// src/server.js
require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');

const authRoutes = require('./routes/authRoutes');
const productosRoutes = require('./routes/productosRoutes');
const clientesRoutes = require('./routes/clientesRoutes');
const presupuestosRoutes = require('./routes/presupuestosRoutes');
const remitosRoutes = require('./routes/remitosRoutes');
const ventasRoutes = require('./routes/ventasRoutes');
const cajaRoutes = require('./routes/cajaRoutes');
const contabilidadRoutes = require('./routes/contabilidadRoutes');
const proveedoresRoutes = require('./routes/proveedoresRoutes');
const comprasRoutes = require('./routes/comprasRoutes');
const obrasRoutes = require('./routes/obrasRoutes');
const empleadosRoutes = require('./routes/empleadosRoutes');
const cajaGrandeRoutes = require('./routes/cajaGrandeRoutes');
const auditoriaRoutes = require('./routes/auditoriaRoutes');
const backupsRoutes = require('./routes/backupsRoutes');
const { iniciarBackupsAutomaticos } = require('./utils/backupScheduler');

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.DATABASE_URL) throw new Error('Falta configurar DATABASE_URL.');
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET.startsWith('GENERAR_')) {
  throw new Error('JWT_SECRET debe ser un valor aleatorio de al menos 32 caracteres.');
}

app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"], baseUri: ["'self'"], objectSrc: ["'none'"],
      frameAncestors: ["'none'"], formAction: ["'self'"], scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], imgSrc: ["'self'", 'data:', 'blob:'],
      fontSrc: ["'self'", 'data:'], connectSrc: ["'self'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
}));
if (process.env.NODE_ENV !== 'production') {
  app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
}
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Volvé a probar en 15 minutos.' },
}));
app.use('/api/auth', authRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/presupuestos', presupuestosRoutes);
app.use('/api/remitos', remitosRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/caja', cajaRoutes);
app.use('/api/contabilidad', contabilidadRoutes);
app.use('/api/proveedores', proveedoresRoutes);
app.use('/api/compras', comprasRoutes);
app.use('/api/obras', obrasRoutes);
app.use('/api/empleados', empleadosRoutes);
app.use('/api/caja-grande', cajaGrandeRoutes);
app.use('/api/auditoria', auditoriaRoutes);
app.use('/api/backups', backupsRoutes);

// --- Servir el frontend compilado (producción) ---
// En Render solo desplegamos ESTE servicio (backend). El build del frontend
// (carpeta frontend/dist) se copia dentro de backend/public durante el build
// (ver render.yaml / buildCommand). Así evitamos CORS: todo vive en un mismo dominio.
const frontendDist = path.join(__dirname, '..', 'public');
app.use(express.static(frontendDist));

app.use((req, res, next) => {
  // Cualquier ruta que no sea /api/* devuelve index.html (React Router maneja el resto)
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Ruta no encontrada.' });
  }
  res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
    if (err) res.status(404).json({ error: 'Ruta no encontrada.' });
  });
});

app.use((err, req, res, next) => {
  console.error('Error no capturado:', err);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor SB Metalúrgica corriendo en http://localhost:${PORT}`);
  iniciarBackupsAutomaticos();
});
