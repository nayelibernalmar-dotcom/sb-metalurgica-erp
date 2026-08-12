// src/app/slices/productosSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { productosService } from '../../services'

export const fetchProductos = createAsyncThunk('productos/fetch', async (params, { rejectWithValue }) => {
  try { return (await productosService.listar(params)).data.productos }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al cargar productos') }
})

export const crearProducto = createAsyncThunk('productos/crear', async (data, { rejectWithValue }) => {
  try { return (await productosService.crear(data)).data.producto }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al crear producto') }
})

export const actualizarProducto = createAsyncThunk('productos/actualizar', async ({ id, data }, { rejectWithValue }) => {
  try { return (await productosService.actualizar(id, data)).data.producto }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al actualizar producto') }
})

export const eliminarProducto = createAsyncThunk('productos/eliminar', async (id, { rejectWithValue }) => {
  try { await productosService.eliminar(id); return id }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al eliminar producto') }
})

export const ajustarStock = createAsyncThunk('productos/stock', async ({ id, cantidad, tipo }, { rejectWithValue }) => {
  try { return (await productosService.ajustarStock(id, cantidad, tipo)).data.producto }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al ajustar stock') }
})

const productosSlice = createSlice({
  name: 'productos',
  initialState: { items: [], loading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProductos.pending, (s) => { s.loading = true; s.error = null })
      .addCase(fetchProductos.fulfilled, (s, a) => { s.loading = false; s.items = a.payload })
      .addCase(fetchProductos.rejected, (s, a) => { s.loading = false; s.error = a.payload })
      .addCase(crearProducto.fulfilled, (s, a) => { s.items.push(a.payload) })
      .addCase(actualizarProducto.fulfilled, (s, a) => {
        const i = s.items.findIndex(p => p.id === a.payload.id)
        if (i >= 0) s.items[i] = a.payload
      })
      .addCase(eliminarProducto.fulfilled, (s, a) => {
        s.items = s.items.filter(p => p.id !== a.payload)
      })
      .addCase(ajustarStock.fulfilled, (s, a) => {
        const i = s.items.findIndex(p => p.id === a.payload.id)
        if (i >= 0) s.items[i] = a.payload
      })
  },
})

export default productosSlice.reducer
