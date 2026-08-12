// src/components/layout/AppLayout.jsx
import { useSelector, useDispatch } from 'react-redux'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  IconLayoutDashboard, IconPackage, IconUsers, IconShoppingCart,
  IconFileInvoice, IconTruck, IconCashRegister, IconLogout,
  IconChevronRight, IconBooks, IconTruckDelivery, IconHammer, IconBriefcase,
} from '@tabler/icons-react'
import { logout } from '../../app/slices/authSlice'
import toast from 'react-hot-toast'

const navItems = [
  { to: '/dashboard', label: 'Inicio', icon: IconLayoutDashboard, group: 'Principal' },
  { to: '/inventario', label: 'Inventario', icon: IconPackage, group: 'Gestión' },
  { to: '/clientes', label: 'Clientes', icon: IconUsers, group: 'Gestión' },
  { to: '/ventas', label: 'Ventas', icon: IconShoppingCart, group: 'Gestión' },
  { to: '/compras', label: 'Compras', icon: IconTruckDelivery, group: 'Gestión' },
  { to: '/presupuestos', label: 'Presupuestos', icon: IconFileInvoice, group: 'Documentos' },
  { to: '/remitos', label: 'Remitos', icon: IconTruck, group: 'Documentos' },
  { to: '/obras', label: 'Obras', icon: IconHammer, group: 'Documentos' },
  { to: '/caja', label: 'Caja diaria', icon: IconCashRegister, group: 'Finanzas' },
  { to: '/contabilidad', label: 'Contabilidad', icon: IconBooks, group: 'Finanzas' },
  { to: '/empleados', label: 'Empleados', icon: IconBriefcase, group: 'Finanzas' },
]

// Agrupa los items por sección del sidebar
function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    if (!acc[item[key]]) acc[item[key]] = []
    acc[item[key]].push(item)
    return acc
  }, {})
}

export default function AppLayout() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const usuario = useSelector((s) => s.auth.usuario)

  function handleLogout() {
    dispatch(logout())
    navigate('/login')
    toast.success('Sesión cerrada')
  }

  const groups = groupBy(navItems, 'group')

  return (
    <div className="flex h-screen overflow-hidden bg-[#f0f2f8]">

      {/* ── SIDEBAR ─────────────────────────────────── */}
      <aside className="w-[210px] min-w-[210px] bg-[#1B2A6B] flex flex-col">

        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
          <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
            <span className="text-[#F5C433] font-bold text-sm">SB</span>
          </div>
          <div>
            <div className="text-white text-[13px] font-semibold leading-tight">SB Metalúrgica SA</div>
            <div className="text-[#F5C433] text-[9px] font-mono tracking-widest uppercase mt-0.5">Sistema ERP</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2">
          {Object.entries(groups).map(([group, items]) => (
            <div key={group} className="mb-1">
              <div className="px-4 pt-4 pb-1 text-[9px] font-medium tracking-widest text-[#F5C433]/60 uppercase">
                {group}
              </div>
              {items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-4 py-2 text-[13px] transition-all duration-150 border-l-2 ${
                      isActive
                        ? 'text-white bg-[#F5C433]/15 border-[#F5C433]'
                        : 'text-white/60 border-transparent hover:text-white hover:bg-white/8'
                    }`
                  }
                >
                  <Icon size={15} />
                  {label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Usuario + logout */}
        <div className="px-3 py-3 border-t border-white/10">
          <div className="flex items-center gap-2.5 p-2 rounded-lg bg-white/8">
            <div className="w-7 h-7 rounded-full bg-[#F5C433] text-[#1B2A6B] flex items-center justify-center text-xs font-bold flex-shrink-0">
              {usuario?.nombre?.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-[12px] font-medium truncate">{usuario?.nombre}</div>
              <div className="text-white/40 text-[10px] capitalize">{usuario?.rol}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-2 flex items-center gap-2 w-full px-2 py-1.5 text-white/50 hover:text-white text-[12px] rounded hover:bg-white/10 transition-all"
          >
            <IconLogout size={14} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── MAIN ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Topbar */}
        <header className="bg-white border-b border-[#d0d4e8] px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-1 text-sm text-[#6b72a0]">
            <span className="font-medium text-[#1B2A6B]">SB Metalúrgica</span>
            <IconChevronRight size={14} />
            <span id="page-breadcrumb">Panel</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#6b72a0]">
            <span>{new Date().toLocaleDateString('es-PY', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            <span className="font-medium text-[#1B2A6B]">{usuario?.nombre}</span>
          </div>
        </header>

        {/* Contenido de la página */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
