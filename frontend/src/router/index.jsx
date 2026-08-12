// src/router/index.jsx
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import AppLayout from '../components/layout/AppLayout'
import LoginPage from '../pages/auth/LoginPage'
import DashboardPage from '../pages/dashboard/DashboardPage'
import InventarioPage from '../pages/inventario/InventarioPage'
import ClientesPage from '../pages/clientes/ClientesPage'
import VentasPage from '../pages/ventas/VentasPage'
import PresupuestosPage from '../pages/presupuestos/PresupuestosPage'
import RemitosPage from '../pages/remitos/RemitosPage'
import CajaPage from '../pages/caja/CajaPage'
import ContabilidadPage from '../pages/contabilidad/ContabilidadPage'
import ComprasPage from '../pages/compras/ComprasPage'
import ObrasPage from '../pages/obras/ObrasPage'
import EmpleadosPage from '../pages/empleados/EmpleadosPage'

// HOC que protege rutas: si no hay token, redirige al login
function PrivateRoute({ children }) {
  const token = useSelector((s) => s.auth.token)
  return token ? children : <Navigate to="/login" replace />
}

// HOC que redirige al dashboard si ya está logueado
function PublicOnlyRoute({ children }) {
  const token = useSelector((s) => s.auth.token)
  return !token ? children : <Navigate to="/dashboard" replace />
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <PublicOnlyRoute><LoginPage /></PublicOnlyRoute>,
  },
  {
    path: '/',
    element: <PrivateRoute><AppLayout /></PrivateRoute>,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'inventario', element: <InventarioPage /> },
      { path: 'clientes', element: <ClientesPage /> },
      { path: 'ventas', element: <VentasPage /> },
      { path: 'presupuestos', element: <PresupuestosPage /> },
      { path: 'remitos', element: <RemitosPage /> },
      { path: 'caja', element: <CajaPage /> },
      { path: 'contabilidad', element: <ContabilidadPage /> },
      { path: 'compras', element: <ComprasPage /> },
      { path: 'obras', element: <ObrasPage /> },
      { path: 'empleados', element: <EmpleadosPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
])

export default router
