// src/utils/backup.js
// Backup "lógico" en JSON, sin depender de pg_dump (que no siempre está
// disponible en el entorno de despliegue). Exporta el contenido de cada
// tabla del esquema `public` a un único archivo, con timestamp.
const fs = require('fs');
const path = require('path');
const pool = require('../db/pool');

const BACKUPS_DIR = path.join(__dirname, '..', '..', 'backups');
const MAX_BACKUPS = parseInt(process.env.BACKUPS_A_CONSERVAR || '30', 10);

// Tablas que NO se incluyen (logs muy grandes o que no hace falta restaurar)
const TABLAS_EXCLUIDAS = new Set(['auditoria']);

function asegurarCarpeta() {
  if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

async function listarTablas() {
  const { rows } = await pool.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
     ORDER BY table_name`
  );
  return rows.map(r => r.table_name).filter(t => !TABLAS_EXCLUIDAS.has(t));
}

// Ejecuta el backup y devuelve el nombre del archivo generado
async function ejecutarBackup({ disparadoPor = 'sistema' } = {}) {
  asegurarCarpeta();
  const tablas = await listarTablas();
  const dump = { generado_en: new Date().toISOString(), disparado_por: disparadoPor, tablas: {} };

  for (const tabla of tablas) {
    const { rows } = await pool.query(`SELECT * FROM "${tabla}"`);
    dump.tablas[tabla] = rows;
  }

  const nombreArchivo = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const rutaCompleta = path.join(BACKUPS_DIR, nombreArchivo);
  fs.writeFileSync(rutaCompleta, JSON.stringify(dump));

  rotarBackupsViejos();
  return { archivo: nombreArchivo, tablas: tablas.length, tamanioBytes: fs.statSync(rutaCompleta).size };
}

function rotarBackupsViejos() {
  asegurarCarpeta();
  const archivos = fs.readdirSync(BACKUPS_DIR)
    .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
    .map(f => ({ nombre: f, mtime: fs.statSync(path.join(BACKUPS_DIR, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  for (const viejo of archivos.slice(MAX_BACKUPS)) {
    fs.unlinkSync(path.join(BACKUPS_DIR, viejo.nombre));
  }
}

function listarBackups() {
  asegurarCarpeta();
  return fs.readdirSync(BACKUPS_DIR)
    .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
    .map(f => {
      const stat = fs.statSync(path.join(BACKUPS_DIR, f));
      return { archivo: f, tamanioBytes: stat.size, creado_en: stat.mtime };
    })
    .sort((a, b) => b.creado_en - a.creado_en);
}

module.exports = { ejecutarBackup, listarBackups, BACKUPS_DIR };
