// src/pages/caja/CajaPage.jsx
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { Bar, Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js'
import { IconCashRegister, IconPlus, IconTrash, IconCopy, IconCheck } from '@tabler/icons-react'
import { fetchMovimientos, fetchResumen, registrarMovimiento, eliminarMovimiento } from '../../app/slices/cajaSlice'
import { Button, Badge, Card, StatCard, Modal, LoadingScreen } from '../../components/ui'
import { fmt, fmtDate, today, getWeekRange } from '../../utils/format'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

const TABS = ['hoy', 'diario', 'semanal', 'mensual', 'reporte']
const TAB_LABELS = { hoy: 'Hoy', diario: 'Diario', semanal: 'Semanal', mensual: 'Mensual', reporte: 'Reporte jefe' }

export default function CajaPage() {
  const dispatch = useDispatch()
  const { movimientos, resumen, resumenPeriodo, loading } = useSelector((s) => s.caja)

  const [tab, setTab] = useState('hoy')
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form movimiento
  const [concepto, setConcepto] = useState('')
  const [tipo, setTipo] = useState('ingreso')
  const [monto, setMonto] = useState('')
  const [fechaMov, setFechaMov] = useState(today())
  const [notasMov, setNotasMov] = useState('')

  // Diario
  const [diarioFecha, setDiarioFecha] = useState(today())
  const [diarioData, setDiarioData] = useState(null)

  // Semanal
  const [semanaRef, setSemanaRef] = useState(today())
  const [semanalData, setSemanalData] = useState(null)
  const [semanalMovs, setSemanalMovs] = useState([])

  // Mensual
  const [mes, setMes] = useState(today().slice(0, 7))
  const [mensualData, setMensualData] = useState(null)

  // Reporte
  const [repInicio, setRepInicio] = useState(getWeekRange(today()).start)
  const [repFin, setRepFin] = useState(getWeekRange(today()).end)
  const [reporteTexto, setReporteTexto] = useState('')
  const [copiado, setCopiado] = useState(false)

  useEffect(() => { dispatch(fetchMovimientos(today())) }, [])

  // ── TABS ──────────────────────────────────────────────
  function cambiarTab(t) {
    setTab(t)
    if (t === 'hoy') dispatch(fetchMovimientos(today()))
    if (t === 'diario') cargarDiario(diarioFecha)
    if (t === 'semanal') cargarSemanal(semanaRef)
    if (t === 'mensual') cargarMensual(mes)
  }

  // ── HOY ───────────────────────────────────────────────
  async function guardarMovimiento() {
    if (!concepto.trim() || !monto || parseFloat(monto) <= 0) { toast.error('Completá concepto y monto'); return }
    setSaving(true)
    try {
      await dispatch(registrarMovimiento({ tipo, concepto, monto: parseFloat(monto), fecha: fechaMov, notas: notasMov })).unwrap()
      toast.success('Movimiento guardado')
      setModal(false); setConcepto(''); setMonto(''); setNotasMov('')
      dispatch(fetchMovimientos(today()))
    } catch (e) { toast.error(e) }
    setSaving(false)
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar este movimiento?')) return
    try {
      await dispatch(eliminarMovimiento(id)).unwrap()
      toast.success('Movimiento eliminado')
      dispatch(fetchMovimientos(today()))
    } catch (e) { toast.error(e) }
  }

  // ── DIARIO ────────────────────────────────────────────
  async function cargarDiario(fecha) {
    try {
      const res = await dispatch(fetchMovimientos(fecha)).unwrap ? null : null
      // Llamamos directo al servicio para no pisar el estado "hoy"
      const { cajaService } = await import('../../services')
      const r = await cajaService.movimientos(fecha)
      setDiarioData(r.data)
    } catch (e) { toast.error('Error al cargar diario') }
  }

  function diaAnt() {
    const d = new Date(diarioFecha + 'T12:00:00'); d.setDate(d.getDate() - 1)
    const nueva = d.toISOString().slice(0, 10); setDiarioFecha(nueva); cargarDiario(nueva)
  }
  function diaSig() {
    const d = new Date(diarioFecha + 'T12:00:00'); d.setDate(d.getDate() + 1)
    const nueva = d.toISOString().slice(0, 10); setDiarioFecha(nueva); cargarDiario(nueva)
  }

  // ── SEMANAL ───────────────────────────────────────────
  async function cargarSemanal(ref) {
    const week = getWeekRange(ref)
    try {
      const { cajaService } = await import('../../services')
      const r = await cajaService.resumen(week.start, week.end)
      setSemanalData({ ...r.data, week })
      // Cargar movimientos de cada día
      const dayDates = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(week.start + 'T12:00:00'); d.setDate(d.getDate() + i)
        return d.toISOString().slice(0, 10)
      })
      const movRes = await Promise.all(dayDates.map(d => cajaService.movimientos(d).then(r => r.data.movimientos || []).catch(() => [])))
      setSemanalMovs(movRes.flat())
    } catch (e) { toast.error('Error al cargar semanal') }
  }
  function semAnt() { const d = new Date(semanaRef + 'T12:00:00'); d.setDate(d.getDate() - 7); const n = d.toISOString().slice(0, 10); setSemanaRef(n); cargarSemanal(n) }
  function semSig() { const d = new Date(semanaRef + 'T12:00:00'); d.setDate(d.getDate() + 7); const n = d.toISOString().slice(0, 10); setSemanaRef(n); cargarSemanal(n) }

  // ── MENSUAL ───────────────────────────────────────────
  async function cargarMensual(m) {
    try {
      const { cajaService } = await import('../../services')
      const r = await cajaService.resumen(m + '-01', m + '-31')
      setMensualData(r.data)
    } catch (e) { toast.error('Error al cargar mensual') }
  }

  // ── REPORTE ───────────────────────────────────────────
  async function generarReporte() {
    if (!repInicio || !repFin) { toast.error('Seleccioná el rango de fechas'); return }
    try {
      const { cajaService } = await import('../../services')
      const r = await cajaService.resumen(repInicio, repFin)
      const { dias = [], totales = {} } = r.data
      const lineas = dias.map(d =>
        `   ${d.fecha}  |  Ing: Gs.${Math.round(d.total_ingresos).toLocaleString('es-PY')}  |  Egr: Gs.${Math.round(d.total_egresos).toLocaleString('es-PY')}  |  Saldo: Gs.${Math.round(d.saldo).toLocaleString('es-PY')}`
      ).join('\n')
      setReporteTexto(`
════════════════════════════════════════════════
       SB METALÚRGICA — REPORTE DE CAJA
════════════════════════════════════════════════
Período:   ${repInicio}  →  ${repFin}
Generado:  ${new Date().toLocaleDateString('es-PY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

────────────── RESUMEN DEL PERÍODO ──────────────
   Total ingresos:     Gs. ${Math.round(totales.total_ingresos || 0).toLocaleString('es-PY')}
   Total egresos:      Gs. ${Math.round(totales.total_egresos || 0).toLocaleString('es-PY')}
   Saldo neto:         Gs. ${Math.round(totales.saldo || 0).toLocaleString('es-PY')}

────────────── DETALLE POR DÍA ──────────────
${lineas || '   (Sin movimientos en este período)'}

════════════════════════════════════════════════`.trim())
    } catch (e) { toast.error('Error al generar reporte') }
  }

  function copiarReporte() {
    navigator.clipboard.writeText(reporteTexto).then(() => {
      setCopiado(true); toast.success('Reporte copiado')
      setTimeout(() => setCopiado(false), 2000)
    })
  }

  // ── CHART helpers ─────────────────────────────────────
  function weekChartData(dias, week) {
    const weekStart = new Date((week?.start || getWeekRange(today()).start) + 'T12:00:00')
    const dayDates = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(weekStart); d.setDate(weekStart.getDate() + i)
      return d.toISOString().slice(0, 10)
    })
    return {
      labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
      datasets: [
        { label: 'Ingresos', data: dayDates.map(d => { const x = dias.find(r => r.fecha === d); return x ? parseFloat(x.total_ingresos) : 0 }), backgroundColor: 'rgba(27,42,107,0.75)', borderRadius: 4 },
        { label: 'Egresos', data: dayDates.map(d => { const x = dias.find(r => r.fecha === d); return x ? parseFloat(x.total_egresos) : 0 }), backgroundColor: 'rgba(163,45,45,0.6)', borderRadius: 4 },
      ],
    }
  }

  const chartOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, color: '#6b72a0' } } }, scales: { x: { ticks: { color: '#6b72a0', font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.04)' } }, y: { ticks: { color: '#6b72a0', font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.04)' } } } }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#1B2A6B]">Caja Diaria</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#d0d4e8] mb-6">
        {TABS.map(t => (
          <button key={t} onClick={() => cambiarTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 mb-[-1px] transition-all ${tab === t ? 'text-[#1B2A6B] border-[#F5C433]' : 'text-[#6b72a0] border-transparent hover:text-[#1a1f3a]'}`}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* ── HOY ── */}
      {tab === 'hoy' && (
        <div>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard label="Ingresos hoy" value={fmt(resumen?.total_ingresos || 0)} sub={`${movimientos.filter(m => m.tipo === 'ingreso').length} mov.`} accent="green" />
            <StatCard label="Egresos hoy" value={fmt(resumen?.total_egresos || 0)} sub={`${movimientos.filter(m => m.tipo === 'egreso').length} mov.`} accent="danger" />
            <StatCard label="Saldo neto" value={fmt(resumen?.saldo || 0)} accent="blue" />
            <StatCard label="Total movimientos" value={movimientos.length} accent="gold" />
          </div>
          <Card>
            <div className="px-5 py-3.5 border-b border-[#d0d4e8] flex items-center justify-between">
              <div className="text-sm font-semibold flex items-center gap-2"><IconCashRegister size={16} className="text-[#1B2A6B]" />Movimientos de hoy</div>
              <Button variant="primary" size="sm" onClick={() => { setFechaMov(today()); setModal(true) }}><IconPlus size={13} /> Nuevo</Button>
            </div>
            {movimientos.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-[#6b72a0]"><IconCashRegister size={40} className="opacity-25 mb-3" /><span className="text-sm">Sin movimientos hoy</span></div>
            ) : (
              <div>
                {[...movimientos].reverse().map(m => (
                  <div key={m.id} className="flex items-center justify-between px-5 py-3 border-b border-[#e5e8f5] last:border-0 hover:bg-[#f8f9fd]">
                    <div>
                      <div className="text-sm font-medium">{m.concepto}</div>
                      <div className="text-xs text-[#6b72a0] mt-0.5 flex items-center gap-2">
                        <Badge variant={m.tipo === 'ingreso' ? 'green' : 'red'}>{m.tipo}</Badge>
                        {m.notas && <span>{m.notas}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-mono text-sm font-semibold ${m.tipo === 'ingreso' ? 'text-[#2a7a3b]' : 'text-[#A32D2D]'}`}>
                        {m.tipo === 'ingreso' ? '+' : '-'}{fmt(m.monto)}
                      </span>
                      <Button size="sm" variant="danger" onClick={() => eliminar(m.id)}><IconTrash size={12} /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Gráfico semanal rápido */}
          {resumenPeriodo && (
            <Card className="mt-4">
              <div className="px-5 py-3.5 border-b border-[#d0d4e8] text-sm font-semibold">Esta semana</div>
              <div className="p-4" style={{ height: 220 }}>
                <Bar data={weekChartData(resumenPeriodo.dias || [], getWeekRange(today()))} options={chartOpts} />
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── DIARIO ── */}
      {tab === 'diario' && (
        <div>
          <Card className="mb-4 p-4">
            <div className="flex items-center gap-3">
              <Button size="sm" onClick={diaAnt}>← Anterior</Button>
              <input type="date" value={diarioFecha} onChange={e => { setDiarioFecha(e.target.value); cargarDiario(e.target.value) }}
                className="px-3 py-2 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B]" />
              <Button size="sm" onClick={diaSig}>Siguiente →</Button>
            </div>
          </Card>
          {diarioData ? (
            <>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <StatCard label="Ingresos" value={fmt(diarioData.resumen?.total_ingresos || 0)} accent="green" />
                <StatCard label="Egresos" value={fmt(diarioData.resumen?.total_egresos || 0)} accent="danger" />
                <StatCard label="Saldo neto" value={fmt(diarioData.resumen?.saldo || 0)} accent="blue" />
                <StatCard label="Movimientos" value={diarioData.movimientos?.length || 0} accent="gold" />
              </div>
              <Card>
                <table className="w-full border-collapse">
                  <thead><tr>{['Hora', 'Concepto', 'Tipo', 'Notas', 'Monto', ''].map((h, i) => <th key={i} className="text-left text-[11px] font-medium text-[#6b72a0] uppercase tracking-wide px-4 py-2.5 bg-[#f5f6fb] border-b border-[#d0d4e8]">{h}</th>)}</tr></thead>
                  <tbody>
                    {(diarioData.movimientos || []).length === 0 ? (
                      <tr><td colSpan={6}><div className="flex flex-col items-center py-10 text-[#6b72a0]"><span className="text-sm">Sin movimientos este día</span></div></td></tr>
                    ) : (diarioData.movimientos || []).map(m => (
                      <tr key={m.id} className="hover:bg-[#f8f9fd] border-b border-[#e5e8f5] last:border-0">
                        <td className="px-4 py-3 text-xs text-[#6b72a0]">{new Date(m.creado_en).toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="px-4 py-3 text-sm font-medium">{m.concepto}</td>
                        <td className="px-4 py-3"><Badge variant={m.tipo === 'ingreso' ? 'green' : 'red'}>{m.tipo}</Badge></td>
                        <td className="px-4 py-3 text-xs text-[#6b72a0]">{m.notas || '—'}</td>
                        <td className={`px-4 py-3 font-mono text-sm font-semibold ${m.tipo === 'ingreso' ? 'text-[#2a7a3b]' : 'text-[#A32D2D]'}`}>{m.tipo === 'ingreso' ? '+' : '-'}{fmt(m.monto)}</td>
                        <td className="px-4 py-3"><Button size="sm" variant="danger" onClick={() => eliminar(m.id)}><IconTrash size={12} /></Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </>
          ) : (
            <div className="text-center py-12 text-[#6b72a0] text-sm">Seleccioná una fecha para ver los movimientos</div>
          )}
        </div>
      )}

      {/* ── SEMANAL ── */}
      {tab === 'semanal' && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Button size="sm" onClick={semAnt}>← Anterior</Button>
            <span className="text-sm font-semibold text-[#1B2A6B]">
              {semanalData ? `${semanalData.week?.start} → ${semanalData.week?.end}` : 'Seleccioná una semana'}
            </span>
            <Button size="sm" onClick={semSig}>Siguiente →</Button>
            {!semanalData && <Button size="sm" variant="primary" onClick={() => cargarSemanal(semanaRef)}>Ver semana actual</Button>}
          </div>
          {semanalData && (
            <>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <StatCard label="Ingresos semana" value={fmt(semanalData.totales?.total_ingresos || 0)} accent="green" />
                <StatCard label="Egresos semana" value={fmt(semanalData.totales?.total_egresos || 0)} accent="danger" />
                <StatCard label="Saldo neto" value={fmt(semanalData.totales?.saldo || 0)} accent="blue" />
                <StatCard label="Días con movimientos" value={semanalData.dias?.length || 0} accent="gold" />
              </div>
              <Card className="mb-4">
                <div className="px-5 py-3.5 border-b border-[#d0d4e8] text-sm font-semibold">Por día</div>
                <div className="p-4" style={{ height: 240 }}>
                  <Bar data={weekChartData(semanalData.dias || [], semanalData.week)} options={chartOpts} />
                </div>
              </Card>
              <Card>
                <table className="w-full border-collapse">
                  <thead><tr>{['Fecha', 'Concepto', 'Tipo', 'Monto'].map((h, i) => <th key={i} className="text-left text-[11px] font-medium text-[#6b72a0] uppercase tracking-wide px-4 py-2.5 bg-[#f5f6fb] border-b border-[#d0d4e8]">{h}</th>)}</tr></thead>
                  <tbody>
                    {semanalMovs.length === 0 ? (
                      <tr><td colSpan={4}><div className="py-8 text-center text-[#6b72a0] text-sm">Sin movimientos esta semana</div></td></tr>
                    ) : semanalMovs.map(m => (
                      <tr key={m.id} className="hover:bg-[#f8f9fd] border-b border-[#e5e8f5] last:border-0">
                        <td className="px-4 py-3 text-xs text-[#6b72a0]">{fmtDate(m.fecha)}</td>
                        <td className="px-4 py-3 text-sm">{m.concepto}</td>
                        <td className="px-4 py-3"><Badge variant={m.tipo === 'ingreso' ? 'green' : 'red'}>{m.tipo}</Badge></td>
                        <td className={`px-4 py-3 font-mono text-sm font-semibold ${m.tipo === 'ingreso' ? 'text-[#2a7a3b]' : 'text-[#A32D2D]'}`}>{m.tipo === 'ingreso' ? '+' : '-'}{fmt(m.monto)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </>
          )}
        </div>
      )}

      {/* ── MENSUAL ── */}
      {tab === 'mensual' && (
        <div>
          <Card className="mb-4 p-4">
            <div className="flex items-center gap-3">
              <input type="month" value={mes} onChange={e => setMes(e.target.value)}
                className="px-3 py-2 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B]" />
              <Button variant="primary" size="sm" onClick={() => cargarMensual(mes)}>Ver</Button>
            </div>
          </Card>
          {mensualData && (
            <>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <StatCard label="Ingresos del mes" value={fmt(mensualData.totales?.total_ingresos || 0)} accent="green" />
                <StatCard label="Egresos del mes" value={fmt(mensualData.totales?.total_egresos || 0)} accent="danger" />
                <StatCard label="Saldo neto" value={fmt(mensualData.totales?.saldo || 0)} accent="blue" />
                <StatCard label="Días activos" value={mensualData.dias?.length || 0} accent="gold" />
              </div>
              <Card className="mb-4">
                <div className="px-5 py-3.5 border-b border-[#d0d4e8] text-sm font-semibold">Ingresos vs Egresos</div>
                <div className="p-4 grid grid-cols-2 gap-6" style={{ height: 240 }}>
                  <Doughnut data={{
                    labels: ['Ingresos', 'Egresos'],
                    datasets: [{ data: [parseFloat(mensualData.totales?.total_ingresos || 0), parseFloat(mensualData.totales?.total_egresos || 0)], backgroundColor: ['rgba(27,42,107,0.85)', 'rgba(163,45,45,0.75)'], borderWidth: 0 }],
                  }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '65%' }} />
                  <div className="flex flex-col justify-center gap-3">
                    <div className="flex justify-between text-sm"><span className="flex items-center gap-2 text-[#6b72a0]"><span className="w-3 h-3 rounded-sm bg-[#1B2A6B] inline-block" />Ingresos</span><span className="font-semibold text-[#2a7a3b]">{fmt(mensualData.totales?.total_ingresos || 0)}</span></div>
                    <div className="flex justify-between text-sm"><span className="flex items-center gap-2 text-[#6b72a0]"><span className="w-3 h-3 rounded-sm bg-[#A32D2D] inline-block" />Egresos</span><span className="font-semibold text-[#A32D2D]">{fmt(mensualData.totales?.total_egresos || 0)}</span></div>
                    <div className="flex justify-between text-sm border-t border-[#e5e8f5] pt-3 font-semibold"><span>Saldo</span><span style={{ color: (mensualData.totales?.saldo || 0) >= 0 ? '#2a7a3b' : '#A32D2D' }}>{fmt(mensualData.totales?.saldo || 0)}</span></div>
                  </div>
                </div>
              </Card>
              <Card>
                <table className="w-full border-collapse">
                  <thead><tr>{['Fecha', 'Ingresos', 'Egresos', 'Saldo'].map((h, i) => <th key={i} className="text-left text-[11px] font-medium text-[#6b72a0] uppercase tracking-wide px-4 py-2.5 bg-[#f5f6fb] border-b border-[#d0d4e8]">{h}</th>)}</tr></thead>
                  <tbody>
                    {(mensualData.dias || []).map((d, i) => (
                      <tr key={i} className="hover:bg-[#f8f9fd] border-b border-[#e5e8f5] last:border-0">
                        <td className="px-4 py-3 text-sm">{fmtDate(d.fecha)}</td>
                        <td className="px-4 py-3 font-mono text-sm text-[#2a7a3b] font-semibold">+{fmt(d.total_ingresos)}</td>
                        <td className="px-4 py-3 font-mono text-sm text-[#A32D2D] font-semibold">-{fmt(d.total_egresos)}</td>
                        <td className={`px-4 py-3 font-mono text-sm font-semibold ${parseFloat(d.saldo) >= 0 ? 'text-[#2a7a3b]' : 'text-[#A32D2D]'}`}>{fmt(d.saldo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </>
          )}
        </div>
      )}

      {/* ── REPORTE ── */}
      {tab === 'reporte' && (
        <div>
          <Card className="mb-4">
            <div className="px-5 py-3.5 border-b border-[#d0d4e8] text-sm font-semibold">Reporte para el jefe</div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-[#6b72a0]">Desde</label>
                  <input type="date" value={repInicio} onChange={e => setRepInicio(e.target.value)}
                    className="px-3 py-2 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B]" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-[#6b72a0]">Hasta</label>
                  <input type="date" value={repFin} onChange={e => setRepFin(e.target.value)}
                    className="px-3 py-2 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B]" />
                </div>
              </div>
              <Button variant="primary" onClick={generarReporte}>Generar reporte</Button>
            </div>
          </Card>

          {reporteTexto && (
            <Card>
              <div className="px-5 py-3.5 border-b border-[#d0d4e8] flex items-center justify-between">
                <span className="text-sm font-semibold">Reporte generado</span>
                <Button variant="secondary" size="sm" onClick={copiarReporte}>
                  {copiado ? <><IconCheck size={13} /> Copiado</> : <><IconCopy size={13} /> Copiar</>}
                </Button>
              </div>
              <div className="p-5">
                <pre className="bg-[#1a1f3a] text-white p-5 rounded-lg text-xs leading-relaxed overflow-x-auto border-l-4 border-[#F5C433] whitespace-pre-wrap">{reporteTexto}</pre>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Modal nuevo movimiento */}
      <Modal open={modal} onClose={() => setModal(false)} title="Nuevo movimiento de caja"
        footer={<><Button onClick={() => setModal(false)}>Cancelar</Button><Button variant="primary" loading={saving} onClick={guardarMovimiento}>Guardar</Button></>}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-xs font-medium text-[#6b72a0]">Concepto *</label>
            <input value={concepto} onChange={e => setConcepto(e.target.value)} placeholder="Descripción del movimiento" autoFocus
              className="px-3 py-2 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B]" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#6b72a0]">Tipo</label>
            <select value={tipo} onChange={e => setTipo(e.target.value)}
              className="px-3 py-2 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B]">
              <option value="ingreso">Ingreso</option>
              <option value="egreso">Egreso</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#6b72a0]">Monto (Gs.) *</label>
            <input type="number" value={monto} onChange={e => setMonto(e.target.value)} placeholder="0" min="1"
              className="px-3 py-2 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B]" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#6b72a0]">Fecha</label>
            <input type="date" value={fechaMov} onChange={e => setFechaMov(e.target.value)}
              className="px-3 py-2 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B]" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#6b72a0]">Notas (opcional)</label>
            <input value={notasMov} onChange={e => setNotasMov(e.target.value)} placeholder="Referencia, cliente..."
              className="px-3 py-2 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B]" />
          </div>
        </div>
      </Modal>
    </div>
  )
}
