// src/services/index.js
// Todas las llamadas a la API organizadas por módulo.

import api from './apiClient'

// AUTH
export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
  crearUsuario: (data) => api.post('/auth/usuarios', data),
  listarUsuarios: () => api.get('/auth/usuarios'),
  cambiarEstado: (id, activo) => api.patch(`/auth/usuarios/${id}/estado`, { activo }),
}

// PRODUCTOS
export const productosService = {
  listar: (params) => api.get('/productos', { params }),
  obtener: (id) => api.get(`/productos/${id}`),
  crear: (data) => api.post('/productos', data),
  actualizar: (id, data) => api.put(`/productos/${id}`, data),
  ajustarStock: (id, cantidad, tipo) => api.patch(`/productos/${id}/stock`, { cantidad, tipo }),
  eliminar: (id) => api.delete(`/productos/${id}`),
}

// CLIENTES
export const clientesService = {
  listar: (params) => api.get('/clientes', { params }),
  obtener: (id) => api.get(`/clientes/${id}`),
  crear: (data) => api.post('/clientes', data),
  actualizar: (id, data) => api.put(`/clientes/${id}`, data),
  eliminar: (id) => api.delete(`/clientes/${id}`),
}

// VENTAS
export const ventasService = {
  listar: (params) => api.get('/ventas', { params }),
  obtener: (id) => api.get(`/ventas/${id}`),
  crear: (data) => api.post('/ventas', data),
  cambiarEstado: (id, estado) => api.patch(`/ventas/${id}/estado`, { estado }),
}

// PRESUPUESTOS
export const presupuestosService = {
  listar: (params) => api.get('/presupuestos', { params }),
  obtener: (id) => api.get(`/presupuestos/${id}`),
  crear: (data) => api.post('/presupuestos', data),
  actualizar: (id, data) => api.put(`/presupuestos/${id}`, data),
  eliminar: (id) => api.delete(`/presupuestos/${id}`),
}

// REMITOS
export const remitosService = {
  listar: (params) => api.get('/remitos', { params }),
  obtener: (id) => api.get(`/remitos/${id}`),
  crear: (data) => api.post('/remitos', data),
  actualizar: (id, data) => api.put(`/remitos/${id}`, data),
}

// CAJA
export const cajaService = {
  movimientos: (fecha) => api.get('/caja', { params: { fecha } }),
  resumen: (desde, hasta) => api.get('/caja/resumen', { params: { desde, hasta } }),
  registrarMovimiento: (data) => api.post('/caja/movimientos', data),
  eliminarMovimiento: (id) => api.delete(`/caja/movimientos/${id}`),
  cerrar: (fecha) => api.post('/caja/cierre', { fecha }),
}

// PROVEEDORES
export const proveedoresService = {
  listar: (params) => api.get('/proveedores', { params }),
  obtener: (id) => api.get(`/proveedores/${id}`),
  crear: (data) => api.post('/proveedores', data),
  actualizar: (id, data) => api.put(`/proveedores/${id}`, data),
  eliminar: (id) => api.delete(`/proveedores/${id}`),
  cuentaCorriente: (id) => api.get(`/proveedores/${id}/cuenta-corriente`),
  registrarPago: (id, data) => api.post(`/proveedores/${id}/pagos`, data),
}

// COMPRAS
export const comprasService = {
  listar: (params) => api.get('/compras', { params }),
  obtener: (id) => api.get(`/compras/${id}`),
  crear: (data) => api.post('/compras', data),
  cambiarEstado: (id, estado) => api.patch(`/compras/${id}/estado`, { estado }),
  sugerencias: () => api.get('/compras/sugerencias'),
}

// OBRAS
export const obrasService = {
  listar: (params) => api.get('/obras', { params }),
  obtener: (id) => api.get(`/obras/${id}`),
  crear: (data) => api.post('/obras', data),
  cambiarEstado: (id, estado) => api.patch(`/obras/${id}/estado`, { estado }),
  registrarPago: (id, data) => api.post(`/obras/${id}/pagos`, data),
}

// EMPLEADOS
export const empleadosService = {
  listar: (params) => api.get('/empleados', { params }),
  crear: (data) => api.post('/empleados', data),
  actualizar: (id, data) => api.put(`/empleados/${id}`, data),
  eliminar: (id) => api.delete(`/empleados/${id}`),
  historialPagos: (id) => api.get(`/empleados/${id}/pagos`),
  registrarPago: (id, data) => api.post(`/empleados/${id}/pagos`, data),
  editarPago: (id, pagoId, data) => api.put(`/empleados/${id}/pagos/${pagoId}`, data),
  eliminarPago: (id, pagoId) => api.delete(`/empleados/${id}/pagos/${pagoId}`),
  resumenMes: (periodo) => api.get('/empleados/resumen', { params: { periodo } }),
}

// CONTABILIDAD
export const contabilidadService = {
  listarCuentas: () => api.get('/contabilidad/cuentas'),
  crearCuenta: (data) => api.post('/contabilidad/cuentas', data),
  listarCentrosCosto: () => api.get('/contabilidad/centros-costo'),
  crearCentroCosto: (data) => api.post('/contabilidad/centros-costo', data),
  eliminarCentroCosto: (id) => api.delete(`/contabilidad/centros-costo/${id}`),
  listarAsientos: (params) => api.get('/contabilidad/asientos', { params }),
  obtenerAsiento: (id) => api.get(`/contabilidad/asientos/${id}`),
  crearAsiento: (data) => api.post('/contabilidad/asientos', data),
  anularAsiento: (id) => api.patch(`/contabilidad/asientos/${id}/anular`),
  libroMayor: (params) => api.get('/contabilidad/libro-mayor', { params }),
  balance: (params) => api.get('/contabilidad/balance', { params }),
  estadoResultados: (params) => api.get('/contabilidad/estado-resultados', { params }),
}
