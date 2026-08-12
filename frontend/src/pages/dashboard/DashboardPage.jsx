// src/pages/dashboard/DashboardPage.jsx
import { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'
import { IconShoppingCart, IconCashRegister, IconPackage, IconFileInvoice } from '@tabler/icons-react'
import { fetchVentas } from '../../app/slices/ventasSlice'
import { fetchMovimientos, fetchResumen } from '../../app/slices/cajaSlice'
import { fetchProductos } from '../../app/slices/productosSlice'
import { fetchPresupuestos } from '../../app/slices/presupuestosSlice'
import { StatCard, Card, CardHeader, CardTitle, LoadingScreen } from '../../components/ui'
import { fmt, fmtDate, today, getWeekRange } from '../../utils/format'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

export default function DashboardPage() {
  const dispatch = useDispatch()
  const ventas = useSelector((s) => s.ventas.items)
  const { movimientos, resumen, resumenPeriodo } = useSelector((s) => s.caja)
  const productos = useSelector((s) => s.productos.items)
  const presupuestos = useSelector((s) => s.presupuestos.items)
  const ventasLoading = useSelector((s) => s.ventas.loading)

  useEffect(() => {
    const d = today()
    const week = getWeekRange(d)
    dispatch(fetchVentas({ desde: d, hasta: d }))
    dispatch(fetchMovimientos(d))
    dispatch(fetchProductos({ activo: true }))
    dispatch(fetchPresupuestos({ estado: 'vigente' }))
    dispatch(fetchResumen({ desde: week.start, hasta: week.end }))
  }, [])

  const totalVentasHoy = ventas.reduce((s, v) => s + parseFloat(v.total || 0), 0)
  const stockBajo = productos.filter(p => parseFloat(p.stock) <= parseFloat(p.stock_minimo)).length
  const ingresosHoy = resumen?.total_ingresos || 0

  // Datos para el gráfico semanal
  const week = getWeekRange(today())
  const weekStart = new Date(week.start + 'T12:00:00')
  const dayDates = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d.toISOString().slice(0, 10)
  })
  const dias = resumenPeriodo?.dias || []
  const chartData = {
    labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
    datasets: [
      {
        label: 'Ingresos',
        data: dayDates.map(d => { const x = dias.find(r => r.fecha === d); return x ? parseFloat(x.total_ingresos) : 0 }),
        backgroundColor: 'rgba(27,42,107,0.75)',
        borderRadius: 4,
      },
      {
        label: 'Egresos',
        data: dayDates.map(d => { const x = dias.find(r => r.fecha === d); return x ? parseFloat(x.total_egresos) : 0 }),
        backgroundColor: 'rgba(163,45,45,0.6)',
        borderRadius: 4,
      },
    ],
  }

  if (ventasLoading) return <LoadingScreen />

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#1B2A6B]">Panel principal</h1>
        <p className="text-sm text-[#6b72a0] mt-1">{new Date().toLocaleDateString('es-PY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Ventas hoy" value={fmt(totalVentasHoy)} sub={`${ventas.length} operaciones`} accent="blue" />
        <StatCard label="Caja hoy" value={fmt(ingresosHoy)} sub={`${movimientos.length} movimientos`} accent="green" />
        <StatCard label="Productos" value={productos.length} sub={`${stockBajo} con stock bajo`} accent="gold" />
        <StatCard label="Presupuestos" value={presupuestos.length} sub="vigentes" accent="warn" />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Últimas ventas */}
        <Card>
          <CardHeader>
            <CardTitle icon={IconShoppingCart}>Ventas de hoy</CardTitle>
          </CardHeader>
          {ventas.length === 0 ? (
            <div className="py-10 text-center text-[#6b72a0] text-sm">Sin ventas hoy</div>
          ) : (
            <div>
              {[...ventas].reverse().slice(0, 5).map(v => (
                <div key={v.id} className="flex justify-between items-center px-5 py-3 border-b border-[#e5e8f5] last:border-0 hover:bg-[#f8f9fd]">
                  <div>
                    <div className="text-sm font-medium">{v.numero} — {v.cliente_nombre || '—'}</div>
                    <div className="text-xs text-[#6b72a0]">{fmtDate(v.fecha)}</div>
                  </div>
                  <div className="font-mono text-sm font-semibold">{fmt(v.total)}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Últimos movimientos de caja */}
        <Card>
          <CardHeader>
            <CardTitle icon={IconCashRegister}>Caja — hoy</CardTitle>
          </CardHeader>
          {movimientos.length === 0 ? (
            <div className="py-10 text-center text-[#6b72a0] text-sm">Sin movimientos hoy</div>
          ) : (
            <div>
              {[...movimientos].reverse().slice(0, 5).map(m => (
                <div key={m.id} className="flex justify-between items-center px-5 py-3 border-b border-[#e5e8f5] last:border-0 hover:bg-[#f8f9fd]">
                  <div>
                    <div className="text-sm font-medium">{m.concepto}</div>
                    <div className="text-xs text-[#6b72a0] capitalize">{m.tipo}</div>
                  </div>
                  <div className={`font-mono text-sm font-semibold ${m.tipo === 'ingreso' ? 'text-[#2a7a3b]' : 'text-[#A32D2D]'}`}>
                    {m.tipo === 'ingreso' ? '+' : '-'}{fmt(m.monto)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Gráfico semanal */}
      <Card>
        <CardHeader>
          <CardTitle icon={IconCashRegister}>Ingresos y egresos esta semana</CardTitle>
        </CardHeader>
        <div className="p-4" style={{ height: 240 }}>
          <Bar data={chartData} options={{
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, color: '#6b72a0' } } },
            scales: {
              x: { ticks: { color: '#6b72a0', font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.04)' } },
              y: { ticks: { color: '#6b72a0', font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.04)' } },
            },
          }} />
        </div>
      </Card>
    </div>
  )
}
