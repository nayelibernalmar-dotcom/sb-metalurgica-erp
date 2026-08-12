// src/pages/contabilidad/ContabilidadPage.jsx
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import {
  IconBooks, IconPlus, IconX, IconBan, IconListDetails, IconReportMoney,
  IconScale, IconChartPie, IconLayoutList, IconBuildingBank,
} from '@tabler/icons-react'
import {
  fetchCuentas, crearCuenta, fetchCentrosCosto, crearCentroCosto, eliminarCentroCosto,
  fetchAsientos, crearAsiento, anularAsiento, fetchLibroMayor, fetchBalance, fetchEstadoResultados,
} from '../../app/slices/contabilidadSlice'
import { Button, Badge, Modal, Card, Input, Select, LoadingScreen, EmptyState, Table } from '../../components/ui'
import ExportButton from '../../components/shared/ExportButton'
import { fmt, fmtN, fmtDate, today } from '../../utils/format'

const TABS = [
  { id: 'diario', label: 'Libro Diario', icon: IconListDetails },
  { id: 'mayor', label: 'Libro Mayor', icon: IconBooks },
  { id: 'balance', label: 'Balance de Sumas y Saldos', icon: IconScale },
  { id: 'resultados', label: 'Estado de Resultados', icon: IconChartPie },
  { id: 'plan', label: 'Plan de Cuentas', icon: IconLayoutList },
  { id: 'centros', label: 'Centros de Costo', icon: IconBuildingBank },
]

function primerDiaMes() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

const EMPTY_LINEA = { cuenta_id: '', centro_costo_id: '', debe: '', haber: '', descripcion: '' }

export default function ContabilidadPage() {
  const dispatch = useDispatch()
  const { cuentas, centros, asientos, libroMayor, balance, estadoResultados, loading } = useSelector((s) => s.contabilidad)

  const [tab, setTab] = useState('diario')
  const [desde, setDesde] = useState(primerDiaMes())
  const [hasta, setHasta] = useState(today())
  const [cuentaMayorId, setCuentaMayorId] = useState('')
  const [centroResultadosId, setCentroResultadosId] = useState('')
  const [tasaCambio, setTasaCambio] = useState('')

  const [modalAsiento, setModalAsiento] = useState(false)
  const [modalCuenta, setModalCuenta] = useState(false)
  const [modalCentro, setModalCentro] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form nuevo asiento
  const [fecha, setFecha] = useState(today())
  const [descripcion, setDescripcion] = useState('')
  const [lineas, setLineas] = useState([{ ...EMPTY_LINEA }, { ...EMPTY_LINEA }])

  // Form nueva cuenta
  const [cCodigo, setCCodigo] = useState('')
  const [cNombre, setCNombre] = useState('')
  const [cTipo, setCTipo] = useState('activo')
  const [cPadre, setCPadre] = useState('')

  // Form nuevo centro de costo
  const [nombreCentro, setNombreCentro] = useState('')

  useEffect(() => {
    dispatch(fetchCuentas())
    dispatch(fetchCentrosCosto())
  }, [])

  useEffect(() => {
    if (tab === 'diario') dispatch(fetchAsientos({ desde, hasta }))
    if (tab === 'mayor' && cuentaMayorId) dispatch(fetchLibroMayor({ cuenta_id: cuentaMayorId, desde, hasta }))
    if (tab === 'balance') dispatch(fetchBalance({ desde, hasta }))
    if (tab === 'resultados') dispatch(fetchEstadoResultados({ desde, hasta, centro_costo_id: centroResultadosId || undefined, tasa_cambio: tasaCambio || undefined }))
  }, [tab, desde, hasta, cuentaMayorId, centroResultadosId, tasaCambio])

  const cuentasImputables = cuentas.filter(c => c.imputable)

  const totalDebeForm = lineas.reduce((s, l) => s + (parseFloat(l.debe) || 0), 0)
  const totalHaberForm = lineas.reduce((s, l) => s + (parseFloat(l.haber) || 0), 0)
  const balanceado = Math.abs(totalDebeForm - totalHaberForm) < 0.01 && totalDebeForm > 0

  function abrirModalAsiento() {
    setFecha(today()); setDescripcion(''); setLineas([{ ...EMPTY_LINEA }, { ...EMPTY_LINEA }])
    setModalAsiento(true)
  }
  function addLinea() { setLineas(prev => [...prev, { ...EMPTY_LINEA }]) }
  function removeLinea(i) { setLineas(prev => prev.filter((_, idx) => idx !== i)) }
  function updateLinea(i, field, value) {
    setLineas(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l))
  }

  async function guardarAsiento() {
    if (!descripcion.trim()) { toast.error('La descripción es obligatoria'); return }
    const validas = lineas.filter(l => l.cuenta_id && (parseFloat(l.debe) > 0 || parseFloat(l.haber) > 0))
    if (validas.length < 2) { toast.error('Necesitás al menos dos líneas con cuenta y monto'); return }
    if (!balanceado) { toast.error('El asiento no está balanceado: Debe debe ser igual a Haber'); return }

    setSaving(true)
    try {
      await dispatch(crearAsiento({
        fecha, descripcion,
        items: validas.map(l => ({
          cuenta_id: l.cuenta_id, centro_costo_id: l.centro_costo_id || null,
          debe: parseFloat(l.debe) || 0, haber: parseFloat(l.haber) || 0, descripcion: l.descripcion || null,
        })),
      })).unwrap()
      toast.success('Asiento registrado')
      setModalAsiento(false)
      if (tab === 'diario') dispatch(fetchAsientos({ desde, hasta }))
    } catch (e) { toast.error(e) }
    setSaving(false)
  }

  async function handleAnularAsiento(id) {
    if (!confirm('¿Anular este asiento? No se puede deshacer.')) return
    try { await dispatch(anularAsiento(id)).unwrap(); toast.success('Asiento anulado') }
    catch (e) { toast.error(e) }
  }

  async function guardarCuenta() {
    if (!cCodigo.trim() || !cNombre.trim()) { toast.error('Completá código y nombre'); return }
    setSaving(true)
    try {
      await dispatch(crearCuenta({ codigo: cCodigo.trim(), nombre: cNombre.trim(), tipo: cTipo, cuenta_padre_id: cPadre || null, imputable: true })).unwrap()
      toast.success('Cuenta creada')
      setModalCuenta(false); setCCodigo(''); setCNombre(''); setCTipo('activo'); setCPadre('')
    } catch (e) { toast.error(e) }
    setSaving(false)
  }

  async function guardarCentro() {
    if (!nombreCentro.trim()) { toast.error('Ingresá un nombre'); return }
    setSaving(true)
    try {
      await dispatch(crearCentroCosto({ nombre: nombreCentro.trim() })).unwrap()
      toast.success('Centro de costo creado')
      setModalCentro(false); setNombreCentro('')
    } catch (e) { toast.error(e) }
    setSaving(false)
  }

  async function handleEliminarCentro(id) {
    if (!confirm('¿Eliminar este centro de costo?')) return
    try { await dispatch(eliminarCentroCosto(id)).unwrap(); toast.success('Centro eliminado') }
    catch (e) { toast.error(e) }
  }

  if (loading && cuentas.length === 0) return <LoadingScreen />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#1B2A6B]">Contabilidad</h1>
          <p className="text-sm text-[#6b72a0] mt-1">Libro diario, libro mayor, balance y estado de resultados</p>
        </div>
        {tab === 'diario' && <Button variant="primary" onClick={abrirModalAsiento}><IconPlus size={15} /> Nuevo asiento</Button>}
        {tab === 'plan' && <Button variant="primary" onClick={() => setModalCuenta(true)}><IconPlus size={15} /> Nueva cuenta</Button>}
        {tab === 'centros' && centros.length < 3 && <Button variant="primary" onClick={() => setModalCentro(true)}><IconPlus size={15} /> Nuevo centro de costo</Button>}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-[#d0d4e8]">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors
              ${tab === t.id ? 'border-[#1B2A6B] text-[#1B2A6B]' : 'border-transparent text-[#6b72a0] hover:text-[#1a1f3a]'}`}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {/* Filtros de fecha (comunes a Diario / Mayor / Balance / Resultados) */}
      {tab !== 'plan' && tab !== 'centros' && (
        <Card className="mb-5">
          <div className="px-5 py-4 flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[#6b72a0]">Desde</label>
              <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
                className="px-3 py-2 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B]" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[#6b72a0]">Hasta</label>
              <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
                className="px-3 py-2 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B]" />
            </div>
            {tab === 'mayor' && (
              <div className="flex flex-col gap-1 min-w-[260px]">
                <label className="text-xs font-medium text-[#6b72a0]">Cuenta</label>
                <select value={cuentaMayorId} onChange={e => setCuentaMayorId(e.target.value)}
                  className="px-3 py-2 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B]">
                  <option value="">— Elegí una cuenta —</option>
                  {cuentasImputables.map(c => <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>)}
                </select>
              </div>
            )}
            {tab === 'resultados' && (
              <>
                <div className="flex flex-col gap-1 min-w-[200px]">
                  <label className="text-xs font-medium text-[#6b72a0]">Centro de costo</label>
                  <select value={centroResultadosId} onChange={e => setCentroResultadosId(e.target.value)}
                    className="px-3 py-2 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B]">
                    <option value="">Todos</option>
                    {centros.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-[#6b72a0]">Cotización USD (opcional)</label>
                  <input type="number" value={tasaCambio} onChange={e => setTasaCambio(e.target.value)} placeholder="Ej: 7500"
                    className="px-3 py-2 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B] w-32" />
                </div>
              </>
            )}
          </div>
        </Card>
      )}

      {/* LIBRO DIARIO */}
      {tab === 'diario' && (
        <Card>
          <Table
            columns={['Número', 'Fecha', 'Descripción', 'Origen', 'Total', 'Estado', '']}
            data={asientos}
            emptyIcon={IconListDetails}
            emptyText="Sin asientos en el período"
            renderRow={(a) => (
              <>
                <td className="px-4 py-3 font-mono text-sm font-semibold">{a.numero}</td>
                <td className="px-4 py-3 text-sm">{fmtDate(a.fecha)}</td>
                <td className="px-4 py-3 text-sm">{a.descripcion}</td>
                <td className="px-4 py-3"><Badge variant={a.origen === 'manual' ? 'blue' : 'gray'}>{a.origen}</Badge></td>
                <td className="px-4 py-3 font-mono text-sm font-semibold">{fmt(a.total)}</td>
                <td className="px-4 py-3">{a.anulado ? <Badge variant="red">anulado</Badge> : <Badge variant="green">activo</Badge>}</td>
                <td className="px-4 py-3">
                  {!a.anulado && (
                    <Button size="sm" variant="danger" onClick={() => handleAnularAsiento(a.id)} title="Anular asiento">
                      <IconBan size={13} />
                    </Button>
                  )}
                </td>
              </>
            )}
          />
        </Card>
      )}

      {/* LIBRO MAYOR */}
      {tab === 'mayor' && (
        !cuentaMayorId ? <EmptyState icon={IconBooks} text="Elegí una cuenta para ver su libro mayor" /> : (
          <Card>
            {libroMayor && (
              <div className="px-5 py-4 border-b border-[#d0d4e8] flex items-center justify-between">
                <div className="text-sm font-semibold text-[#1a1f3a]">{libroMayor.cuenta.codigo} — {libroMayor.cuenta.nombre}</div>
                <div className="text-sm font-mono font-semibold text-[#1B2A6B]">Saldo: {fmt(libroMayor.saldo_final)}</div>
              </div>
            )}
            <Table
              columns={['Fecha', 'Número', 'Descripción', 'Centro de costo', 'Debe', 'Haber', 'Saldo']}
              data={libroMayor?.movimientos || []}
              emptyIcon={IconBooks}
              emptyText="Sin movimientos en el período"
              renderRow={(m) => (
                <>
                  <td className="px-4 py-3 text-sm">{fmtDate(m.fecha)}</td>
                  <td className="px-4 py-3 font-mono text-sm">{m.numero}</td>
                  <td className="px-4 py-3 text-sm">{m.descripcion}</td>
                  <td className="px-4 py-3 text-sm text-[#6b72a0]">{m.centro_costo_nombre || '—'}</td>
                  <td className="px-4 py-3 font-mono text-sm">{Number(m.debe) > 0 ? fmt(m.debe) : '—'}</td>
                  <td className="px-4 py-3 font-mono text-sm">{Number(m.haber) > 0 ? fmt(m.haber) : '—'}</td>
                  <td className="px-4 py-3 font-mono text-sm font-semibold">{fmt(m.saldo)}</td>
                </>
              )}
            />
          </Card>
        )
      )}

      {/* BALANCE DE SUMAS Y SALDOS */}
      {tab === 'balance' && (
        <Card>
          <div className="flex justify-end mb-3">
            <ExportButton url="/contabilidad/balance/exportar" params={{ desde, hasta }} />
          </div>
          <Table
            columns={['Código', 'Cuenta', 'Suma Debe', 'Suma Haber', 'Saldo Deudor', 'Saldo Acreedor']}
            data={balance?.cuentas || []}
            emptyIcon={IconScale}
            emptyText="Sin movimientos en el período"
            renderRow={(c) => (
              <>
                <td className="px-4 py-3 font-mono text-sm">{c.codigo}</td>
                <td className="px-4 py-3 text-sm">{c.nombre}</td>
                <td className="px-4 py-3 font-mono text-sm">{fmt(c.suma_debe)}</td>
                <td className="px-4 py-3 font-mono text-sm">{fmt(c.suma_haber)}</td>
                <td className="px-4 py-3 font-mono text-sm">{c.saldo_deudor > 0 ? fmt(c.saldo_deudor) : '—'}</td>
                <td className="px-4 py-3 font-mono text-sm">{c.saldo_acreedor > 0 ? fmt(c.saldo_acreedor) : '—'}</td>
              </>
            )}
          />
          {balance && balance.cuentas.length > 0 && (
            <div className="px-4 py-3 border-t border-[#d0d4e8] bg-[#f5f6fb] flex justify-end gap-8 text-sm font-mono font-semibold text-[#1B2A6B]">
              <span>Totales:</span>
              <span>Debe {fmt(balance.totales.suma_debe)}</span>
              <span>Haber {fmt(balance.totales.suma_haber)}</span>
              <span>Deudor {fmt(balance.totales.saldo_deudor)}</span>
              <span>Acreedor {fmt(balance.totales.saldo_acreedor)}</span>
            </div>
          )}
        </Card>
      )}

      {/* ESTADO DE RESULTADOS */}
      {tab === 'resultados' && estadoResultados && (
        <div className="grid grid-cols-2 gap-5">
          <div className="col-span-2 flex justify-end">
            <ExportButton
              url="/contabilidad/estado-resultados/exportar"
              params={{ desde, hasta, centro_costo_id: centroResultadosId || undefined, tasa_cambio: tasaCambio || undefined }}
            />
          </div>
          <Card>
            <div className="px-5 py-3.5 border-b border-[#d0d4e8] font-semibold text-sm text-[#2a7a3b]">Ingresos</div>
            <div className="divide-y divide-[#e5e8f5]">
              {estadoResultados.ingresos.length === 0 ? (
                <div className="px-5 py-6 text-sm text-[#6b72a0] text-center">Sin ingresos en el período</div>
              ) : estadoResultados.ingresos.map(c => (
                <div key={c.id} className="px-5 py-2.5 flex justify-between text-sm">
                  <span>{c.nombre}</span><span className="font-mono">{fmt(c.monto)}</span>
                </div>
              ))}
            </div>
            <div className="px-5 py-3 bg-[#f5f6fb] border-t border-[#d0d4e8] flex justify-between text-sm font-semibold">
              <span>Total Ingresos</span><span className="font-mono">{fmt(estadoResultados.total_ingresos)}</span>
            </div>
          </Card>
          <Card>
            <div className="px-5 py-3.5 border-b border-[#d0d4e8] font-semibold text-sm text-[#A32D2D]">Egresos</div>
            <div className="divide-y divide-[#e5e8f5]">
              {estadoResultados.egresos.length === 0 ? (
                <div className="px-5 py-6 text-sm text-[#6b72a0] text-center">Sin egresos en el período</div>
              ) : estadoResultados.egresos.map(c => (
                <div key={c.id} className="px-5 py-2.5 flex justify-between text-sm">
                  <span>{c.nombre}</span><span className="font-mono">{fmt(c.monto)}</span>
                </div>
              ))}
            </div>
            <div className="px-5 py-3 bg-[#f5f6fb] border-t border-[#d0d4e8] flex justify-between text-sm font-semibold">
              <span>Total Egresos</span><span className="font-mono">{fmt(estadoResultados.total_egresos)}</span>
            </div>
          </Card>
          <Card className="col-span-2">
            <div className="px-5 py-4 flex items-center justify-between">
              <span className="text-[15px] font-semibold text-[#1a1f3a]">Resultado del período</span>
              <span className={`text-[20px] font-mono font-bold ${estadoResultados.resultado_neto >= 0 ? 'text-[#2a7a3b]' : 'text-[#A32D2D]'}`}>
                {fmt(estadoResultados.resultado_neto)}
              </span>
            </div>
            {estadoResultados.usd && (
              <div className="px-5 pb-4 flex items-center justify-between text-sm text-[#6b72a0] border-t border-[#e5e8f5] pt-3">
                <span>En USD (cotización {fmtN(estadoResultados.usd.tasa_cambio)})</span>
                <span className="font-mono font-semibold text-[#1a1f3a]">
                  US$ {estadoResultados.usd.resultado_neto.toLocaleString('es-PY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* PLAN DE CUENTAS */}
      {tab === 'plan' && (
        <Card>
          <Table
            columns={['Código', 'Nombre', 'Tipo', 'Imputable']}
            data={cuentas}
            emptyIcon={IconLayoutList}
            emptyText="Sin cuentas"
            renderRow={(c) => (
              <>
                <td className="px-4 py-3 font-mono text-sm" style={{ paddingLeft: `${16 + (c.codigo.split('.').length - 1) * 16}px` }}>{c.codigo}</td>
                <td className={`px-4 py-3 text-sm ${!c.imputable ? 'font-semibold text-[#1B2A6B]' : ''}`}>{c.nombre}</td>
                <td className="px-4 py-3"><Badge variant="blue">{c.tipo}</Badge></td>
                <td className="px-4 py-3">{c.imputable ? <Badge variant="green">sí</Badge> : <Badge variant="gray">rubro</Badge>}</td>
              </>
            )}
          />
        </Card>
      )}

      {/* CENTROS DE COSTO */}
      {tab === 'centros' && (
        <Card>
          <Table
            columns={['Nombre', '']}
            data={centros}
            emptyIcon={IconBuildingBank}
            emptyText="Sin centros de costo (podés crear hasta 3)"
            renderRow={(c) => (
              <>
                <td className="px-4 py-3 text-sm font-medium">{c.nombre}</td>
                <td className="px-4 py-3">
                  <Button size="sm" variant="danger" onClick={() => handleEliminarCentro(c.id)}><IconX size={13} /></Button>
                </td>
              </>
            )}
          />
        </Card>
      )}

      {/* Modal: nuevo asiento manual */}
      <Modal open={modalAsiento} onClose={() => setModalAsiento(false)} title="Nuevo asiento contable" size="xl"
        footer={<><Button onClick={() => setModalAsiento(false)}>Cancelar</Button><Button variant="primary" loading={saving} onClick={guardarAsiento}>Registrar asiento</Button></>}>
        <div className="grid grid-cols-2 gap-4 mb-5">
          <Input label="Fecha" type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
          <Input label="Descripción *" value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Ej: Pago de alquiler julio" />
        </div>

        <div className="mb-2 text-xs font-semibold text-[#6b72a0] uppercase tracking-wide">Líneas del asiento</div>
        <div className="space-y-2 mb-3">
          {lineas.map((l, i) => (
            <div key={i} className="grid gap-2 items-start" style={{ gridTemplateColumns: '2fr 1.3fr 110px 110px auto' }}>
              <select value={l.cuenta_id} onChange={e => updateLinea(i, 'cuenta_id', e.target.value)}
                className="px-2 py-1.5 border border-[#d0d4e8] rounded text-xs outline-none focus:border-[#1B2A6B]">
                <option value="">— Cuenta —</option>
                {cuentasImputables.map(c => <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>)}
              </select>
              <select value={l.centro_costo_id} onChange={e => updateLinea(i, 'centro_costo_id', e.target.value)}
                className="px-2 py-1.5 border border-[#d0d4e8] rounded text-xs outline-none focus:border-[#1B2A6B]">
                <option value="">Sin centro de costo</option>
                {centros.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <input type="number" value={l.debe} min="0"
                onChange={e => updateLinea(i, 'debe', e.target.value)} placeholder="Debe"
                className="px-2 py-1.5 border border-[#d0d4e8] rounded text-xs outline-none focus:border-[#1B2A6B]" />
              <input type="number" value={l.haber} min="0"
                onChange={e => updateLinea(i, 'haber', e.target.value)} placeholder="Haber"
                className="px-2 py-1.5 border border-[#d0d4e8] rounded text-xs outline-none focus:border-[#1B2A6B]" />
              <button onClick={() => removeLinea(i)} className="p-1.5 rounded bg-red-50 text-red-500 hover:bg-red-100">
                <IconX size={13} />
              </button>
            </div>
          ))}
        </div>
        <Button size="sm" onClick={addLinea}><IconPlus size={13} /> Agregar línea</Button>

        <div className={`text-right mt-4 pt-3 border-t border-[#e5e8f5] text-sm font-mono ${balanceado ? 'text-[#2a7a3b]' : 'text-[#A32D2D]'}`}>
          Debe: {fmt(totalDebeForm)} &nbsp;|&nbsp; Haber: {fmt(totalHaberForm)}
          {!balanceado && <span className="block text-xs mt-1">El asiento debe quedar balanceado antes de guardar.</span>}
        </div>
      </Modal>

      {/* Modal: nueva cuenta */}
      <Modal open={modalCuenta} onClose={() => setModalCuenta(false)} title="Nueva cuenta contable"
        footer={<><Button onClick={() => setModalCuenta(false)}>Cancelar</Button><Button variant="primary" loading={saving} onClick={guardarCuenta}>Guardar</Button></>}>
        <div className="flex flex-col gap-4">
          <Input label="Código *" value={cCodigo} onChange={e => setCCodigo(e.target.value)} placeholder="Ej: 5.2.07" />
          <Input label="Nombre *" value={cNombre} onChange={e => setCNombre(e.target.value)} placeholder="Ej: Publicidad" />
          <Select label="Tipo *" value={cTipo} onChange={e => setCTipo(e.target.value)}>
            <option value="activo">Activo</option>
            <option value="pasivo">Pasivo</option>
            <option value="patrimonio">Patrimonio</option>
            <option value="ingreso">Ingreso</option>
            <option value="egreso">Egreso</option>
          </Select>
          <Select label="Rubro / cuenta padre (opcional)" value={cPadre} onChange={e => setCPadre(e.target.value)}>
            <option value="">Sin rubro padre</option>
            {cuentas.filter(c => !c.imputable).map(c => <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>)}
          </Select>
        </div>
      </Modal>

      {/* Modal: nuevo centro de costo */}
      <Modal open={modalCentro} onClose={() => setModalCentro(false)} title="Nuevo centro de costo"
        footer={<><Button onClick={() => setModalCentro(false)}>Cancelar</Button><Button variant="primary" loading={saving} onClick={guardarCentro}>Guardar</Button></>}>
        <Input label="Nombre *" value={nombreCentro} onChange={e => setNombreCentro(e.target.value)} placeholder="Ej: Sucursal Centro" />
        <p className="text-xs text-[#6b72a0] mt-2">Este sistema admite hasta 3 centros de costo activos ({centros.length}/3 en uso).</p>
      </Modal>
    </div>
  )
}
