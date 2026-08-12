// src/app/slices/ventasSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { ventasService } from '../../services'

export const fetchVentas = createAsyncThunk('ventas/fetch', async (params, { rejectWithValue }) => {
  try { return (await ventasService.listar(params)).data.ventas }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al cargar ventas') }
})
export const crearVenta = createAsyncThunk('ventas/crear', async (data, { rejectWithValue }) => {
  try { return (await ventasService.crear(data)).data.venta }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al crear venta') }
})
export const cambiarEstadoVenta = createAsyncThunk('ventas/estado', async ({ id, estado }, { rejectWithValue }) => {
  try { return (await ventasService.cambiarEstado(id, estado)).data.venta }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al cambiar estado') }
})

const ventasSlice = createSlice({
  name: 'ventas',
  initialState: { items: [], loading: false, error: null },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchVentas.pending, (s) => { s.loading = true })
     .addCase(fetchVentas.fulfilled, (s, a) => { s.loading = false; s.items = a.payload })
     .addCase(fetchVentas.rejected, (s, a) => { s.loading = false; s.error = a.payload })
     .addCase(crearVenta.fulfilled, (s, a) => { s.items.unshift(a.payload) })
     .addCase(cambiarEstadoVenta.fulfilled, (s, a) => {
       const i = s.items.findIndex(v => v.id === a.payload.id)
       if (i >= 0) s.items[i] = { ...s.items[i], ...a.payload }
     })
  },
})
export default ventasSlice.reducer
