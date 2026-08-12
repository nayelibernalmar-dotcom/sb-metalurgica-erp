// src/app/slices/obrasSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { obrasService } from '../../services'

export const fetchObras = createAsyncThunk('obras/fetch', async (params, { rejectWithValue }) => {
  try { return (await obrasService.listar(params)).data.obras }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al cargar obras') }
})
export const fetchObra = createAsyncThunk('obras/fetchOne', async (id, { rejectWithValue }) => {
  try { return (await obrasService.obtener(id)).data.obra }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al cargar la obra') }
})
export const crearObra = createAsyncThunk('obras/crear', async (data, { rejectWithValue }) => {
  try { return (await obrasService.crear(data)).data.obra }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al iniciar la obra') }
})
export const cambiarEstadoObra = createAsyncThunk('obras/cambiarEstado', async ({ id, estado }, { rejectWithValue }) => {
  try { return (await obrasService.cambiarEstado(id, estado)).data.obra }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al cambiar el estado') }
})
export const registrarPagoObra = createAsyncThunk('obras/registrarPago', async ({ id, data }, { rejectWithValue }) => {
  try { return (await obrasService.registrarPago(id, data)).data.obra }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al registrar el pago') }
})

const obrasSlice = createSlice({
  name: 'obras',
  initialState: { items: [], actual: null, loading: false, error: null },
  reducers: { limpiarObraActual: (s) => { s.actual = null } },
  extraReducers: (b) => {
    b.addCase(fetchObras.pending, (s) => { s.loading = true })
     .addCase(fetchObras.fulfilled, (s, a) => { s.loading = false; s.items = a.payload })
     .addCase(fetchObras.rejected, (s, a) => { s.loading = false; s.error = a.payload })
     .addCase(fetchObra.fulfilled, (s, a) => { s.actual = a.payload })
     .addCase(crearObra.fulfilled, (s, a) => { s.actual = a.payload })
     .addCase(cambiarEstadoObra.fulfilled, (s, a) => { s.actual = a.payload })
     .addCase(registrarPagoObra.fulfilled, (s, a) => { s.actual = a.payload })
  },
})
export const { limpiarObraActual } = obrasSlice.actions
export default obrasSlice.reducer
