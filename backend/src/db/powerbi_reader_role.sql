-- Ejecutar una sola vez como administrador de PostgreSQL.
-- Este rol grupal no puede iniciar sesión ni escribir en la base.
-- El usuario concreto y su contraseña se crean fuera del repositorio.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'powerbi_reader') THEN
    CREATE ROLE powerbi_reader NOLOGIN;
  END IF;
END
$$;

DO $$
BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO powerbi_reader', current_database());
END
$$;
GRANT USAGE ON SCHEMA analytics TO powerbi_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO powerbi_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA analytics
  GRANT SELECT ON TABLES TO powerbi_reader;

-- Ejemplo para el administrador (no guardar la contraseña en este archivo):
-- CREATE USER powerbi_servicio WITH LOGIN PASSWORD '<secreto-del-gestor>';
-- GRANT powerbi_reader TO powerbi_servicio;
