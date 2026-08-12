// src/app/slices/comprasSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { proveedoresService, comprasService } from '../../services'

// Proveedores
export const fetchProveedores = createAsyncThunk('compras/fetchProveedores', async (params, { rejectWithValue }) => {
  try { return (await proveedoresService.listar(params)).data.proveedores }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al cargar proveedores') }
})
export const crearProveedor = createAsyncThunk('compras/crearProveedor', async (data, { rejectWithValue }) => {
  try { return (await proveedoresService.crear(data)).data.proveedor }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al crear proveedor') }
})
export const actualizarProveedor = createAsyncThunk('compras/actualizarProveedor', async ({ id, data }, { rejectWithValue }) => {
  try { return (await proveedoresService.actualizar(id, data)).data.proveedor }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al actualizar proveedor') }
})
export const fetchCuentaCorriente = createAsyncThunk('compras/fetchCuentaCorriente', async (id, { rejectWithValue }) => {
  try { return (await proveedoresService.cuentaCorriente(id)).data }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al cargar la cuenta corriente') }
})
export const registrarPago = createAsyncThunk('compras/registrarPago', async ({ id, data }, { rejectWithValue }) => {
  try { await proveedoresService.registrarPago(id, data); return id }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al registrar el pago') }
})

// Compras
export const fetchCompras = createAsyncThunk('compras/fetchCompras', async (params, { rejectWithValue }) => {
  try { return (await comprasService.listar(params)).data.compras }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al cargar compras') }
})
export const crearCompra = createAsyncThunk('compras/crearCompra', async (data, { rejectWithValue }) => {
  try { return (await comprasService.crear(data)).data.compra }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al crear la compra') }
})
export const cambiarEstadoCompra = createAsyncThunk('compras/cambiarEstadoCompra', async ({ id, estado }, { rejectWithValue }) => {
  try { return (await comprasService.cambiarEstado(id, estado)).data.compra }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al cambiar el estado') }
})
export const fetchSugerencias = createAsyncThunk('compras/fetchSugerencias', async (_, { rejectWithValue }) => {
  try { return (await comprasService.sugerencias()).data.sugerencias }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al cargar sugerencias') }
})

const comprasSlice = createSlice({
  name: 'compras',
  initialState: {
    proveedores: [],
    compras: [],
    cuentaCorriente: null,
    sugerencias: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchProveedores.pending, (s) => { s.loading = true })
     .addCase(fetchProveedores.fulfilled, (s, a) => { s.loading = false; s.proveedores = a.payload })
     .addCase(fetchProveedores.rejected, (s, a) => { s.loading = false; s.error = a.payload })
     .addCase(crearProveedor.fulfilled, (s, a) => { s.proveedores.push(a.payload); s.proveedores.sort((x, y) => x.nombre.localeCompare(y.nombre)) })
     .addCase(actualizarProveedor.fulfilled, (s, a) => {
       const i = s.proveedores.findIndex(p => p.id === a.payload.id)
       if (i !== -1) s.proveedores[i] = { ...s.proveedores[i], ...a.payload }
     })
     .addCase(fetchCuentaCorriente.fulfilled, (s, a) => { s.cuentaCorriente = a.payload })
     .addCase(registrarPago.fulfilled, (s) => { s.cuentaCorriente = null })

     .addCase(fetchCompras.pending, (s) => { s.loading = true })
     .addCase(fetchCompras.fulfilled, (s, a) => { s.loading = false; s.compras = a.payload })
     .addCase(fetchCompras.rejected, (s, a) => { s.loading = false; s.error = a.payload })
     .addCase(crearCompra.fulfilled, (s, a) => { s.compras.unshift(a.payload) })
     .addCase(cambiarEstadoCompra.fulfilled, (s, a) => {
       const i = s.compras.findIndex(c => c.id === a.payload.id)
       if (i !== -1) s.compras[i] = a.payload
     })

     .addCase(fetchSugerencias.fulfilled, (s, a) => { s.sugerencias = a.payload })
  },
})
export default comprasSlice.reducer
