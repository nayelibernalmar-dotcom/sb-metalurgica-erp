// src/app/slices/clientesSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { clientesService } from '../../services'

export const fetchClientes = createAsyncThunk('clientes/fetch', async (params, { rejectWithValue }) => {
  try { return (await clientesService.listar(params)).data.clientes }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al cargar clientes') }
})
export const crearCliente = createAsyncThunk('clientes/crear', async (data, { rejectWithValue }) => {
  try { return (await clientesService.crear(data)).data.cliente }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al crear cliente') }
})
export const actualizarCliente = createAsyncThunk('clientes/actualizar', async ({ id, data }, { rejectWithValue }) => {
  try { return (await clientesService.actualizar(id, data)).data.cliente }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al actualizar') }
})
export const eliminarCliente = createAsyncThunk('clientes/eliminar', async (id, { rejectWithValue }) => {
  try { await clientesService.eliminar(id); return id }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al eliminar') }
})

const clientesSlice = createSlice({
  name: 'clientes',
  initialState: { items: [], loading: false, error: null },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchClientes.pending, (s) => { s.loading = true })
     .addCase(fetchClientes.fulfilled, (s, a) => { s.loading = false; s.items = a.payload })
     .addCase(fetchClientes.rejected, (s, a) => { s.loading = false; s.error = a.payload })
     .addCase(crearCliente.fulfilled, (s, a) => { s.items.push(a.payload) })
     .addCase(actualizarCliente.fulfilled, (s, a) => { const i = s.items.findIndex(c => c.id === a.payload.id); if (i >= 0) s.items[i] = a.payload })
     .addCase(eliminarCliente.fulfilled, (s, a) => { s.items = s.items.filter(c => c.id !== a.payload) })
  },
})
export default clientesSlice.reducer
