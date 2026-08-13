const cron = require('node-cron');
const { ejecutarBackup } = require('./backup');

let ejecutando = false;

function iniciarBackupsAutomaticos() {
  if (process.env.BACKUPS_HABILITADOS === 'false' || process.env.NODE_ENV === 'test') return null;
  const expresion = process.env.BACKUP_CRON || '0 3 * * *';
  if (!cron.validate(expresion)) throw new Error('BACKUP_CRON no es una expresión cron válida.');
  const tarea = cron.schedule(expresion, async () => {
    if (ejecutando) return console.warn('Se omite el backup: la ejecución anterior todavía no terminó.');
    ejecutando = true;
    try {
      const resultado = await ejecutarBackup({ disparadoPor: 'automático' });
      console.log(`Backup generado: ${resultado.archivo} (${resultado.tablas} tablas, sha256 ${resultado.sha256})`);
    } catch (err) { console.error('Falló el backup automático:', err); }
    finally { ejecutando = false; }
  });
  console.log(`Backups automáticos programados (cron: "${expresion}")`);
  return tarea;
}

module.exports = { iniciarBackupsAutomaticos };
