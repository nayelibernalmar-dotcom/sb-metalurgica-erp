const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { withTransaction } = require('../db/transaction');

const BACKUPS_DIR = path.resolve(process.env.BACKUPS_DIR || path.join(__dirname, '..', '..', 'backups'));
const MAX_BACKUPS = Number.parseInt(process.env.BACKUPS_A_CONSERVAR || '30', 10);
const TABLAS_EXCLUIDAS = new Set(['auditoria']);

async function asegurarCarpeta() { await fs.mkdir(BACKUPS_DIR, { recursive: true }); }

async function crearSnapshot(client) {
  const { rows } = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`);
  const tablas = rows.map((row) => row.table_name).filter((name) => !TABLAS_EXCLUIDAS.has(name));
  const datos = {};
  for (const tabla of tablas) {
    const result = await client.query(`SELECT * FROM "${tabla}"`);
    datos[tabla] = result.rows;
  }
  return { tablas, datos };
}

async function ejecutarBackup({ disparadoPor = 'sistema' } = {}) {
  await asegurarCarpeta();
  const snapshot = await withTransaction((client) => crearSnapshot(client), { isolationLevel: 'REPEATABLE READ' });
  const dump = { version: 1, generado_en: new Date().toISOString(), disparado_por: disparadoPor, tablas: snapshot.datos };
  const contenido = JSON.stringify(dump);
  const nombre = `backup_${dump.generado_en.replace(/[:.]/g, '-')}.json`;
  const destino = path.join(BACKUPS_DIR, nombre);
  const temporal = `${destino}.tmp`;
  await fs.writeFile(temporal, contenido, { encoding: 'utf8', flag: 'wx' });
  await fs.rename(temporal, destino);
  await rotarBackupsViejos();
  return { archivo: nombre, tablas: snapshot.tablas.length, tamanioBytes: Buffer.byteLength(contenido), sha256: crypto.createHash('sha256').update(contenido).digest('hex') };
}

async function listarArchivos() {
  await asegurarCarpeta();
  const nombres = (await fs.readdir(BACKUPS_DIR)).filter((name) => /^backup_.+\.json$/.test(name));
  return Promise.all(nombres.map(async (nombre) => ({ nombre, stat: await fs.stat(path.join(BACKUPS_DIR, nombre)) })));
}

async function rotarBackupsViejos() {
  const archivos = (await listarArchivos()).sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);
  await Promise.all(archivos.slice(Number.isFinite(MAX_BACKUPS) ? MAX_BACKUPS : 30).map((item) => fs.unlink(path.join(BACKUPS_DIR, item.nombre))));
}

async function listarBackups() {
  return (await listarArchivos()).map(({ nombre, stat }) => ({ archivo: nombre, tamanioBytes: stat.size, creado_en: stat.mtime })).sort((a, b) => b.creado_en - a.creado_en);
}

module.exports = { ejecutarBackup, listarBackups, BACKUPS_DIR };
