const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const pool = require('./pool');
const { seedPlanDeCuentas } = require('./seedContabilidad');

async function migrate() {
  console.log('🔧 Conectando a la base de datos...');
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

  try {
    console.log('🔧 Creando tablas...');
    await pool.query(schema);
    console.log('✅ Tablas creadas correctamente.');

    const { rows } = await pool.query(`SELECT id FROM usuarios WHERE rol = 'admin' LIMIT 1`);
    if (rows.length === 0) {
      const email = process.env.ADMIN_EMAIL;
      const password = process.env.ADMIN_PASSWORD;
      if (!email || !password || password.length < 12 || password.startsWith('CAMBIAR_')) {
        throw new Error('Configurá ADMIN_EMAIL y una ADMIN_PASSWORD segura de al menos 12 caracteres.');
      }
      const hash = await bcrypt.hash(password, 10);
      await pool.query(
        `INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES ($1, $2, $3, 'admin')`,
        ['Administrador', email, hash]
      );
      console.log(`✅ Usuario administrador creado: ${email}`);
    } else {
      console.log('ℹ️  Ya existe un usuario admin, no se creó uno nuevo.');
    }

    await seedPlanDeCuentas();
  } catch (err) {
    console.error('❌ Error al migrar:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

migrate();
