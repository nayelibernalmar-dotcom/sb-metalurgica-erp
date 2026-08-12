// src/app/slices/presupuestosSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { presupuestosService } from '../../services'

export const fetchPresupuestos = createAsyncThunk('presupuestos/fetch', async (params, { rejectWithValue }) => {
  try { return (await presupuestosService.listar(params)).data.presupuestos }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al cargar presupuestos') }
})
export const fetchPresupuesto = createAsyncThunk('presupuestos/fetchOne', async (id, { rejectWithValue }) => {
  try { return (await presupuestosService.obtener(id)).data.presupuesto }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error') }
})
export const crearPresupuesto = createAsyncThunk('presupuestos/crear', async (data, { rejectWithValue }) => {
  try { return (await presupuestosService.crear(data)).data.presupuesto }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al crear') }
})
export const actualizarPresupuesto = createAsyncThunk('presupuestos/actualizar', async ({ id, data }, { rejectWithValue }) => {
  try { return (await presupuestosService.actualizar(id, data)).data.presupuesto }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al actualizar') }
})
export const eliminarPresupuesto = createAsyncThunk('presupuestos/eliminar', async (id, { rejectWithValue }) => {
  try { await presupuestosService.eliminar(id); return id }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al eliminar') }
})

const presupuestosSlice = createSlice({
  name: 'presupuestos',
  initialState: { items: [], current: null, loading: false, error: null },
  reducers: { clearCurrent(s) { s.current = null } },
  extraReducers: (b) => {
    b.addCase(fetchPresupuestos.pending, (s) => { s.loading = true })
     .addCase(fetchPresupuestos.fulfilled, (s, a) => { s.loading = false; s.items = a.payload })
     .addCase(fetchPresupuestos.rejected, (s, a) => { s.loading = false; s.error = a.payload })
     .addCase(fetchPresupuesto.fulfilled, (s, a) => { s.current = a.payload })
     .addCase(crearPresupuesto.fulfilled, (s, a) => { s.items.unshift(a.payload) })
     .addCase(actualizarPresupuesto.fulfilled, (s, a) => {
       const i = s.items.findIndex(p => p.id === a.payload.id)
       if (i >= 0) s.items[i] = a.payload
       s.current = a.payload
     })
     .addCase(eliminarPresupuesto.fulfilled, (s, a) => { s.items = s.items.filter(p => p.id !== a.payload) })
  },
})
export const { clearCurrent } = presupuestosSlice.actions
export default presupuestosSlice.reducer
