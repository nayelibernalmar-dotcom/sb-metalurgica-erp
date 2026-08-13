// src/utils/auditoria.js
const pool = require('../db/pool');

// Registra una entrada en la tabla `auditoria`. Se llama explícitamente desde
// los controllers en los puntos sensibles (plata, contabilidad, usuarios).
// No usamos un trigger de base de datos porque necesitamos saber QUÉ usuario
// de la app hizo el cambio, y eso solo lo sabemos acá (en el JWT), no en SQL puro.
async function registrarAuditoria({ usuario_id, accion, entidad, entidad_id, detalle, client = pool, strict = false }) {
  try {
    await client.query(
      `INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id, detalle)
       VALUES ($1, $2, $3, $4, $5)`,
      [usuario_id || null, accion, entidad || null, entidad_id || null, detalle ? JSON.stringify(detalle) : null]
    );
  } catch (err) {
    if (strict) throw err;
    // La auditoría nunca debe romper la operación principal; solo lo logueamos.
    console.error('No se pudo registrar auditoría:', err.message);
  }
}

module.exports = { registrarAuditoria };
