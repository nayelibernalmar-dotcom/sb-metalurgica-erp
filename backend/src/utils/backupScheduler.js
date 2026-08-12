// src/utils/backupScheduler.js
const cron = require('node-cron');
const { ejecutarBackup } = require('./backup');

// Por defecto corre todos los días a las 3:00 AM (hora del servidor).
// Se puede sobrescribir con BACKUP_CRON en las variables de entorno,
// por ejemplo "0 */6 * * *" para cada 6 horas.
function iniciarBackupsAutomaticos() {
  const expresion = process.env.BACKUP_CRON || '0 3 * * *';
  cron.schedule(expresion, async () => {
    try {
      const resultado = await ejecutarBackup({ disparadoPor: 'automático' });
      console.log(`🗄️  Backup automático generado: ${resultado.archivo} (${resultado.tablas} tablas)`);
    } catch (err) {
      console.error('❌ Falló el backup automático:', err);
    }
  });
  console.log(`🗄️  Backups automáticos programados (cron: "${expresion}")`);
}

module.exports = { iniciarBackupsAutomaticos };
