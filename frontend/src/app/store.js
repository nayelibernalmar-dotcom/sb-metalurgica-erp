// src/app/store.js
import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import productosReducer from './slices/productosSlice'
import clientesReducer from './slices/clientesSlice'
import ventasReducer from './slices/ventasSlice'
import presupuestosReducer from './slices/presupuestosSlice'
import remitosReducer from './slices/remitosSlice'
import cajaReducer from './slices/cajaSlice'
import contabilidadReducer from './slices/contabilidadSlice'
import comprasReducer from './slices/comprasSlice'
import obrasReducer from './slices/obrasSlice'
import empleadosReducer from './slices/empleadosSlice'
import uiReducer from './slices/uiSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    productos: productosReducer,
    clientes: clientesReducer,
    ventas: ventasReducer,
    presupuestos: presupuestosReducer,
    remitos: remitosReducer,
    caja: cajaReducer,
    contabilidad: contabilidadReducer,
    compras: comprasReducer,
    obras: obrasReducer,
    empleados: empleadosReducer,
    ui: uiReducer,
  },
})

export default store
