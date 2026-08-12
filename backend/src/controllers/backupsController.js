// src/controllers/backupsController.js
const path = require('path');
const { ejecutarBackup, listarBackups, BACKUPS_DIR } = require('../utils/backup');
const { registrarAuditoria } = require('../utils/auditoria');

async function listar(req, res) {
  try {
    res.json({ backups: listarBackups() });
  } catch (err) {
    console.error('Error al listar backups:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

async function ejecutar(req, res) {
  try {
    const resultado = await ejecutarBackup({ disparadoPor: req.usuario.nombre || `usuario #${req.usuario.id}` });
    await registrarAuditoria({ usuario_id: req.usuario.id, accion: 'crear', entidad: 'backups', detalle: resultado });
    res.status(201).json(resultado);
  } catch (err) {
    console.error('Error al ejecutar backup manual:', err);
    res.status(500).json({ error: 'No se pudo generar el backup.' });
  }
}

async function descargar(req, res) {
  const { archivo } = req.params;
  // Evita path traversal: solo nombres de archivo, sin "/" ni "..".
  if (!/^backup_[\w.-]+\.json$/.test(archivo)) {
    return res.status(400).json({ error: 'Nombre de archivo inválido.' });
  }
  const ruta = path.join(BACKUPS_DIR, archivo);
  res.download(ruta, archivo, (err) => {
    if (err) res.status(404).json({ error: 'Backup no encontrado.' });
  });
}

module.exports = { listar, ejecutar, descargar };
