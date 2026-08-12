// src/app/slices/empleadosSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { empleadosService } from '../../services'

export const fetchEmpleados = createAsyncThunk('empleados/fetch', async (params, { rejectWithValue }) => {
  try { return (await empleadosService.listar(params)).data.empleados }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al cargar empleados') }
})
export const crearEmpleado = createAsyncThunk('empleados/crear', async (data, { rejectWithValue }) => {
  try { return (await empleadosService.crear(data)).data.empleado }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al crear empleado') }
})
export const actualizarEmpleado = createAsyncThunk('empleados/actualizar', async ({ id, data }, { rejectWithValue }) => {
  try { return (await empleadosService.actualizar(id, data)).data.empleado }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al actualizar empleado') }
})
export const eliminarEmpleado = createAsyncThunk('empleados/eliminar', async (id, { rejectWithValue }) => {
  try { await empleadosService.eliminar(id); return id }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al eliminar empleado') }
})
export const fetchHistorialPagos = createAsyncThunk('empleados/fetchHistorial', async (id, { rejectWithValue }) => {
  try { return (await empleadosService.historialPagos(id)).data }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al cargar el historial') }
})
export const registrarPagoEmpleado = createAsyncThunk('empleados/registrarPago', async ({ id, data }, { rejectWithValue }) => {
  try { await empleadosService.registrarPago(id, data); return id }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al registrar el pago') }
})
export const editarPagoEmpleado = createAsyncThunk('empleados/editarPago', async ({ id, pagoId, data }, { rejectWithValue }) => {
  try { await empleadosService.editarPago(id, pagoId, data); return id }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al editar el pago') }
})
export const eliminarPagoEmpleado = createAsyncThunk('empleados/eliminarPago', async ({ id, pagoId }, { rejectWithValue }) => {
  try { await empleadosService.eliminarPago(id, pagoId); return id }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al eliminar el pago') }
})
export const fetchResumenMes = createAsyncThunk('empleados/fetchResumen', async (periodo, { rejectWithValue }) => {
  try { return (await empleadosService.resumenMes(periodo)).data }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al cargar el resumen') }
})

const empleadosSlice = createSlice({
  name: 'empleados',
  initialState: { items: [], historial: null, resumen: null, loading: false, error: null },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchEmpleados.pending, (s) => { s.loading = true })
     .addCase(fetchEmpleados.fulfilled, (s, a) => { s.loading = false; s.items = a.payload })
     .addCase(fetchEmpleados.rejected, (s, a) => { s.loading = false; s.error = a.payload })
     .addCase(crearEmpleado.fulfilled, (s, a) => { s.items.push(a.payload); s.items.sort((x, y) => x.nombre.localeCompare(y.nombre)) })
     .addCase(actualizarEmpleado.fulfilled, (s, a) => {
       const i = s.items.findIndex(e => e.id === a.payload.id)
       if (i !== -1) s.items[i] = a.payload
     })
     .addCase(eliminarEmpleado.fulfilled, (s, a) => {
       s.items = s.items.filter(e => e.id !== a.payload)
     })
     .addCase(fetchHistorialPagos.fulfilled, (s, a) => { s.historial = a.payload })
     .addCase(fetchResumenMes.fulfilled, (s, a) => { s.resumen = a.payload })
  },
})
export default empleadosSlice.reducer
