// src/app/slices/remitosSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { remitosService } from '../../services'

export const fetchRemitos = createAsyncThunk('remitos/fetch', async (params, { rejectWithValue }) => {
  try { return (await remitosService.listar(params)).data.remitos }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al cargar remitos') }
})
export const fetchRemito = createAsyncThunk('remitos/fetchOne', async (id, { rejectWithValue }) => {
  try { return (await remitosService.obtener(id)).data.remito }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error') }
})
export const crearRemito = createAsyncThunk('remitos/crear', async (data, { rejectWithValue }) => {
  try { return (await remitosService.crear(data)).data.remito }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al crear') }
})
export const actualizarRemito = createAsyncThunk('remitos/actualizar', async ({ id, data }, { rejectWithValue }) => {
  try { return (await remitosService.actualizar(id, data)).data.remito }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al actualizar') }
})

const remitosSlice = createSlice({
  name: 'remitos',
  initialState: { items: [], current: null, loading: false, error: null },
  reducers: { clearCurrent(s) { s.current = null } },
  extraReducers: (b) => {
    b.addCase(fetchRemitos.pending, (s) => { s.loading = true })
     .addCase(fetchRemitos.fulfilled, (s, a) => { s.loading = false; s.items = a.payload })
     .addCase(fetchRemitos.rejected, (s, a) => { s.loading = false; s.error = a.payload })
     .addCase(fetchRemito.fulfilled, (s, a) => { s.current = a.payload })
     .addCase(crearRemito.fulfilled, (s, a) => { s.items.unshift(a.payload) })
     .addCase(actualizarRemito.fulfilled, (s, a) => {
       const i = s.items.findIndex(r => r.id === a.payload.id)
       if (i >= 0) s.items[i] = a.payload
       s.current = a.payload
     })
  },
})
export const { clearCurrent } = remitosSlice.actions
export default remitosSlice.reducer
