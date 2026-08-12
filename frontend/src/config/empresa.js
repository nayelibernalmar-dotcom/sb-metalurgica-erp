// src/config/empresa.js
// Datos que aparecen en el membrete de los documentos generados (presupuestos,
// remitos, obras, etc). Centralizados acá para no repetirlos en cada página.
// Se pueden sobrescribir con variables de entorno (útil si este proyecto se
// clona/publica como portafolio y no se quiere exponer el contacto real).
export const EMPRESA = {
  nombre: import.meta.env.VITE_EMPRESA_NOMBRE || 'SB Metalúrgica SA',
  direccion: import.meta.env.VITE_EMPRESA_DIRECCION || 'Av. Médicos del Chaco esquina Guarambaré',
  email: import.meta.env.VITE_EMPRESA_EMAIL || 'contacto@ejemplo.com',
  telefono: import.meta.env.VITE_EMPRESA_TELEFONO || '(021) 000-000',
}
