// src/app/slices/contabilidadSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { contabilidadService } from '../../services'

export const fetchCuentas = createAsyncThunk('contabilidad/fetchCuentas', async (_, { rejectWithValue }) => {
  try { return (await contabilidadService.listarCuentas()).data.cuentas }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al cargar el plan de cuentas') }
})
export const crearCuenta = createAsyncThunk('contabilidad/crearCuenta', async (data, { rejectWithValue }) => {
  try { return (await contabilidadService.crearCuenta(data)).data.cuenta }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al crear la cuenta') }
})

export const fetchCentrosCosto = createAsyncThunk('contabilidad/fetchCentrosCosto', async (_, { rejectWithValue }) => {
  try { return (await contabilidadService.listarCentrosCosto()).data.centros }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al cargar centros de costo') }
})
export const crearCentroCosto = createAsyncThunk('contabilidad/crearCentroCosto', async (data, { rejectWithValue }) => {
  try { return (await contabilidadService.crearCentroCosto(data)).data.centro }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al crear el centro de costo') }
})
export const eliminarCentroCosto = createAsyncThunk('contabilidad/eliminarCentroCosto', async (id, { rejectWithValue }) => {
  try { await contabilidadService.eliminarCentroCosto(id); return id }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al eliminar el centro de costo') }
})

export const fetchAsientos = createAsyncThunk('contabilidad/fetchAsientos', async (params, { rejectWithValue }) => {
  try { return (await contabilidadService.listarAsientos(params)).data.asientos }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al cargar el libro diario') }
})
export const crearAsiento = createAsyncThunk('contabilidad/crearAsiento', async (data, { rejectWithValue }) => {
  try { return (await contabilidadService.crearAsiento(data)).data.asiento }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al crear el asiento') }
})
export const anularAsiento = createAsyncThunk('contabilidad/anularAsiento', async (id, { rejectWithValue }) => {
  try { await contabilidadService.anularAsiento(id); return id }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al anular el asiento') }
})

export const fetchLibroMayor = createAsyncThunk('contabilidad/fetchLibroMayor', async (params, { rejectWithValue }) => {
  try { return (await contabilidadService.libroMayor(params)).data }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al cargar el libro mayor') }
})
export const fetchBalance = createAsyncThunk('contabilidad/fetchBalance', async (params, { rejectWithValue }) => {
  try { return (await contabilidadService.balance(params)).data }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al cargar el balance') }
})
export const fetchEstadoResultados = createAsyncThunk('contabilidad/fetchEstadoResultados', async (params, { rejectWithValue }) => {
  try { return (await contabilidadService.estadoResultados(params)).data }
  catch (err) { return rejectWithValue(err.response?.data?.error || 'Error al cargar el estado de resultados') }
})

const contabilidadSlice = createSlice({
  name: 'contabilidad',
  initialState: {
    cuentas: [],
    centros: [],
    asientos: [],
    libroMayor: null,
    balance: null,
    estadoResultados: null,
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchCuentas.pending, (s) => { s.loading = true })
     .addCase(fetchCuentas.fulfilled, (s, a) => { s.loading = false; s.cuentas = a.payload })
     .addCase(fetchCuentas.rejected, (s, a) => { s.loading = false; s.error = a.payload })
     .addCase(crearCuenta.fulfilled, (s, a) => { s.cuentas.push(a.payload); s.cuentas.sort((x, y) => x.codigo.localeCompare(y.codigo)) })

     .addCase(fetchCentrosCosto.fulfilled, (s, a) => { s.centros = a.payload })
     .addCase(crearCentroCosto.fulfilled, (s, a) => { s.centros.push(a.payload) })
     .addCase(eliminarCentroCosto.fulfilled, (s, a) => { s.centros = s.centros.filter(c => c.id !== a.payload) })

     .addCase(fetchAsientos.pending, (s) => { s.loading = true })
     .addCase(fetchAsientos.fulfilled, (s, a) => { s.loading = false; s.asientos = a.payload })
     .addCase(fetchAsientos.rejected, (s, a) => { s.loading = false; s.error = a.payload })
     .addCase(crearAsiento.fulfilled, (s, a) => { s.asientos.unshift(a.payload) })
     .addCase(anularAsiento.fulfilled, (s, a) => {
       const asiento = s.asientos.find(x => x.id === a.payload)
       if (asiento) asiento.anulado = true
     })

     .addCase(fetchLibroMayor.fulfilled, (s, a) => { s.libroMayor = a.payload })
     .addCase(fetchBalance.fulfilled, (s, a) => { s.balance = a.payload })
     .addCase(fetchEstadoResultados.fulfilled, (s, a) => { s.estadoResultados = a.payload })
  },
})
export default contabilidadSlice.reducer
