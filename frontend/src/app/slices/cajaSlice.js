// src/app/slices/cajaSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { cajaService } from '../../services'

export const fetchMovimientos = createAsyncThunk('caja/fetchMovimientos', async (fecha, { rejectWithValue }) => {
  try { return (await cajaService.movimientos(fecha)).data }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al cargar caja') }
})
export const fetchResumen = createAsyncThunk('caja/fetchResumen', async ({ desde, hasta }, { rejectWithValue }) => {
  try { return (await cajaService.resumen(desde, hasta)).data }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al cargar resumen') }
})
export const registrarMovimiento = createAsyncThunk('caja/registrar', async (data, { rejectWithValue }) => {
  try { return (await cajaService.registrarMovimiento(data)).data.movimiento }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al registrar') }
})
export const eliminarMovimiento = createAsyncThunk('caja/eliminar', async (id, { rejectWithValue }) => {
  try { await cajaService.eliminarMovimiento(id); return id }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al eliminar') }
})

const cajaSlice = createSlice({
  name: 'caja',
  initialState: {
    movimientos: [],
    resumen: null,
    resumenPeriodo: null,
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchMovimientos.pending, (s) => { s.loading = true })
     .addCase(fetchMovimientos.fulfilled, (s, a) => {
       s.loading = false
       s.movimientos = a.payload.movimientos
       s.resumen = a.payload.resumen
     })
     .addCase(fetchMovimientos.rejected, (s, a) => { s.loading = false; s.error = a.payload })
     .addCase(fetchResumen.fulfilled, (s, a) => { s.resumenPeriodo = a.payload })
     .addCase(registrarMovimiento.fulfilled, (s, a) => { s.movimientos.push(a.payload) })
     .addCase(eliminarMovimiento.fulfilled, (s, a) => {
       s.movimientos = s.movimientos.filter(m => m.id !== a.payload)
     })
  },
})
export default cajaSlice.reducer
