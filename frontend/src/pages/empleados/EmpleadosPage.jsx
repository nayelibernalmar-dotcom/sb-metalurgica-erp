// src/pages/empleados/EmpleadosPage.jsx
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { IconUsers, IconPlus, IconCash, IconHistory, IconCalendarStats, IconEdit, IconTrash } from '@tabler/icons-react'
import {
  fetchEmpleados, crearEmpleado, actualizarEmpleado, eliminarEmpleado,
  fetchHistorialPagos, registrarPagoEmpleado, editarPagoEmpleado, eliminarPagoEmpleado, fetchResumenMes,
} from '../../app/slices/empleadosSlice'
import { Button, Badge, Modal, Card, Input, LoadingScreen, EmptyState, Table } from '../../components/ui'
import { fmt, fmtN, fmtDate, today } from '../../utils/format'

const TABS = [
  { id: 'empleados', label: 'Empleados', icon: IconUsers },
  { id: 'resumen', label: 'Resumen del mes', icon: IconCalendarStats },
]
const tipoBadge = { adelanto: 'amber', sueldo: 'green', aguinaldo: 'blue', bono: 'blue', otro: 'gray' }

function mesActual() { return new Date().toISOString().slice(0, 7) }

export default function EmpleadosPage() {
  const dispatch = useDispatch()
  const { items: empleados, historial, resumen, loading } = useSelector((s) => s.empleados)

  const [tab, setTab] = useState('empleados')
  const [saving, setSaving] = useState(false)
  const [periodo, setPeriodo] = useState(mesActual())

  const [modalEmpleado, setModalEmpleado] = useState(false)
  const [empleadoEditando, setEmpleadoEditando] = useState(null) // null = creando nuevo
  const [nombre, setNombre] = useState('')
  const [documento, setDocumento] = useState('')
  const [cargo, setCargo] = useState('')
  const [telefono, setTelefono] = useState('')
  const [fechaIngreso, setFechaIngreso] = useState('')
  const [sueldoMensual, setSueldoMensual] = useState('')

  const [modalPago, setModalPago] = useState(false)
  const [empleadoActivo, setEmpleadoActivo] = useState(null)
  const [pagoEditando, setPagoEditando] = useState(null) // null = registrando nuevo pago
  const [fechaPago, setFechaPago] = useState(today())
  const [tipoPago, setTipoPago] = useState('adelanto')
  const [conceptoPago, setConceptoPago] = useState('')
  const [montoPago, setMontoPago] = useState('')
  const [formaPago, setFormaPago] = useState('Efectivo')

  useEffect(() => { dispatch(fetchEmpleados({ activo: true })) }, [])
  useEffect(() => { if (tab === 'resumen') dispatch(fetchResumenMes(periodo)) }, [tab, periodo])

  function abrirNuevoEmpleado() {
    setEmpleadoEditando(null)
    setNombre(''); setDocumento(''); setCargo(''); setTelefono(''); setFechaIngreso(''); setSueldoMensual('')
    setModalEmpleado(true)
  }

  function abrirEditarEmpleado(emp) {
    setEmpleadoEditando(emp)
    setNombre(emp.nombre || ''); setDocumento(emp.documento || ''); setCargo(emp.cargo || '')
    setTelefono(emp.telefono || ''); setFechaIngreso(emp.fecha_ingreso ? emp.fecha_ingreso.slice(0, 10) : '')
    setSueldoMensual(emp.sueldo_mensual || '')
    setModalEmpleado(true)
  }

  async function guardarEmpleado() {
    if (!nombre.trim()) { toast.error('El nombre es obligatorio'); return }
    setSaving(true)
    const data = { nombre: nombre.trim(), documento, cargo, telefono, fecha_ingreso: fechaIngreso || null, sueldo_mensual: parseFloat(sueldoMensual) || 0 }
    try {
      if (empleadoEditando) {
        await dispatch(actualizarEmpleado({ id: empleadoEditando.id, data })).unwrap()
        toast.success('Empleado actualizado')
      } else {
        await dispatch(crearEmpleado(data)).unwrap()
        toast.success('Empleado creado')
      }
      setModalEmpleado(false)
    } catch (e) { toast.error(e) }
    setSaving(false)
  }

  async function confirmarEliminarEmpleado(emp) {
    if (!confirm(`¿Eliminar a ${emp.nombre}? Se lo va a marcar como inactivo, pero su historial de pagos se conserva.`)) return
    try {
      await dispatch(eliminarEmpleado(emp.id)).unwrap()
      toast.success('Empleado eliminado')
    } catch (e) { toast.error(e) }
  }

  async function abrirPago(emp) {
    setEmpleadoActivo(emp)
    limpiarFormPago()
    await dispatch(fetchHistorialPagos(emp.id))
    setModalPago(true)
  }

  function limpiarFormPago() {
    setPagoEditando(null)
    setFechaPago(today()); setTipoPago('adelanto'); setConceptoPago(''); setMontoPago(''); setFormaPago('Efectivo')
  }

  function abrirEditarPago(pago) {
    setPagoEditando(pago)
    setFechaPago(pago.fecha ? pago.fecha.slice(0, 10) : today())
    setTipoPago(pago.tipo)
    setConceptoPago(pago.concepto || '')
    setMontoPago(pago.monto)
    setFormaPago(pago.forma_pago || 'Efectivo')
  }

  async function guardarPago() {
    const monto = parseFloat(montoPago)
    if (!monto || monto <= 0) { toast.error('Ingresá un monto válido'); return }
    setSaving(true)
    const data = { fecha: fechaPago, tipo: tipoPago, concepto: conceptoPago, monto, forma_pago: formaPago }
    try {
      if (pagoEditando) {
        await dispatch(editarPagoEmpleado({ id: empleadoActivo.id, pagoId: pagoEditando.id, data })).unwrap()
        toast.success('Pago actualizado')
      } else {
        await dispatch(registrarPagoEmpleado({ id: empleadoActivo.id, data })).unwrap()
        toast.success('Pago registrado')
      }
      dispatch(fetchHistorialPagos(empleadoActivo.id))
      limpiarFormPago()
    } catch (e) { toast.error(e) }
    setSaving(false)
  }

  async function confirmarEliminarPago(pago) {
    if (!confirm('¿Eliminar este pago? Se va a revertir el asiento contable y el movimiento en Caja Grande.')) return
    try {
      await dispatch(eliminarPagoEmpleado({ id: empleadoActivo.id, pagoId: pago.id })).unwrap()
      toast.success('Pago eliminado')
      dispatch(fetchHistorialPagos(empleadoActivo.id))
      if (pagoEditando?.id === pago.id) limpiarFormPago()
    } catch (e) { toast.error(e) }
  }

  if (loading && empleados.length === 0) return <LoadingScreen />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#1B2A6B]">Empleados</h1>
          <p className="text-sm text-[#6b72a0] mt-1">Sueldos, adelantos, aguinaldos y bonos</p>
        </div>
        {tab === 'empleados' && <Button variant="primary" onClick={abrirNuevoEmpleado}><IconPlus size={15} /> Nuevo empleado</Button>}
      </div>

      <div className="flex gap-1 mb-5 border-b border-[#d0d4e8]">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors
              ${tab === t.id ? 'border-[#1B2A6B] text-[#1B2A6B]' : 'border-transparent text-[#6b72a0] hover:text-[#1a1f3a]'}`}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'empleados' && (
        empleados.length === 0 ? (
          <EmptyState icon={IconUsers} text="Sin empleados registrados" />
        ) : (
          <Card>
            <Table
              columns={['Nombre', 'Cargo', 'Sueldo mensual', 'Teléfono', '']}
              data={empleados}
              emptyIcon={IconUsers}
              emptyText="Sin empleados"
              renderRow={(e) => (
                <>
                  <td className="px-4 py-3 text-sm font-medium">{e.nombre}</td>
                  <td className="px-4 py-3 text-sm text-[#6b72a0]">{e.cargo || '—'}</td>
                  <td className="px-4 py-3 font-mono text-sm">{fmt(e.sueldo_mensual)}</td>
                  <td className="px-4 py-3 text-sm text-[#6b72a0]">{e.telefono || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 justify-end">
                      <Button size="sm" onClick={() => abrirPago(e)}><IconCash size={13} /> Registrar pago</Button>
                      <Button size="sm" onClick={() => abrirEditarEmpleado(e)}><IconEdit size={13} /></Button>
                      <Button size="sm" variant="danger" onClick={() => confirmarEliminarEmpleado(e)}><IconTrash size={13} /></Button>
                    </div>
                  </td>
                </>
              )}
            />
          </Card>
        )
      )}

      {tab === 'resumen' && (
        <>
          <Card className="mb-5">
            <div className="px-5 py-4 flex items-center gap-3">
              <label className="text-xs font-medium text-[#6b72a0]">Período</label>
              <input type="month" value={periodo} onChange={e => setPeriodo(e.target.value)}
                className="px-3 py-2 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B]" />
            </div>
          </Card>
          <Card>
            <Table
              columns={['Empleado', 'Cargo', 'Sueldo mensual', 'Adelantos', 'Sueldo pagado', 'Otros (aguinaldo/bono)', 'Saldo pendiente']}
              data={resumen?.resumen || []}
              emptyIcon={IconCalendarStats}
              emptyText="Sin datos para este período"
              renderRow={(r) => (
                <>
                  <td className="px-4 py-3 text-sm font-medium">{r.nombre}</td>
                  <td className="px-4 py-3 text-sm text-[#6b72a0]">{r.cargo || '—'}</td>
                  <td className="px-4 py-3 font-mono text-sm">{fmt(r.sueldo_mensual)}</td>
                  <td className="px-4 py-3 font-mono text-sm text-[#a37a1f]">{fmt(r.adelantos)}</td>
                  <td className="px-4 py-3 font-mono text-sm text-[#2a7a3b]">{fmt(r.sueldo_pagado)}</td>
                  <td className="px-4 py-3 font-mono text-sm text-[#6b72a0]">{fmt(r.otros_pagos)}</td>
                  <td className={`px-4 py-3 font-mono text-sm font-semibold ${r.saldo_sueldo < 0 ? 'text-[#A32D2D]' : ''}`}>{fmt(r.saldo_sueldo)}</td>
                </>
              )}
            />
          </Card>
        </>
      )}

      {/* Modal nuevo/editar empleado */}
      <Modal open={modalEmpleado} onClose={() => setModalEmpleado(false)} title={empleadoEditando ? `Editar — ${empleadoEditando.nombre}` : 'Nuevo empleado'}
        footer={<><Button onClick={() => setModalEmpleado(false)}>Cancelar</Button><Button variant="primary" loading={saving} onClick={guardarEmpleado}>Guardar</Button></>}>
        <div className="flex flex-col gap-4">
          <Input label="Nombre *" value={nombre} onChange={e => setNombre(e.target.value)} />
          <Input label="Cargo" value={cargo} onChange={e => setCargo(e.target.value)} placeholder="Ej: Soldador, Administrativo" />
          <Input label="Documento (CI)" value={documento} onChange={e => setDocumento(e.target.value)} />
          <Input label="Teléfono" value={telefono} onChange={e => setTelefono(e.target.value)} />
          <Input label="Fecha de ingreso" type="date" value={fechaIngreso} onChange={e => setFechaIngreso(e.target.value)} />
          <Input label="Sueldo mensual (Gs.)" type="number" value={sueldoMensual} onChange={e => setSueldoMensual(e.target.value)} />
        </div>
      </Modal>

      {/* Modal registrar pago / historial */}
      <Modal open={modalPago} onClose={() => setModalPago(false)} title={`Pagos — ${empleadoActivo?.nombre || ''}`} size="lg"
        footer={<Button onClick={() => setModalPago(false)}>Cerrar</Button>}>
        {historial && (
          <>
            <div className="flex gap-3 mb-4 text-sm">
              <div className="flex-1 bg-[#f5f6fb] rounded-lg p-3">
                <div className="text-[10px] font-semibold text-[#6b72a0] uppercase">Total pagado (histórico)</div>
                <div className="text-lg font-bold text-[#1B2A6B] font-mono">{fmt(historial.totales.total || 0)}</div>
              </div>
              <div className="flex-1 bg-[#fdf7ea] rounded-lg p-3">
                <div className="text-[10px] font-semibold text-[#6b72a0] uppercase">Adelantos</div>
                <div className="text-lg font-bold text-[#a37a1f] font-mono">{fmt(historial.totales.adelanto || 0)}</div>
              </div>
            </div>
            <div className="max-h-52 overflow-y-auto mb-5">
              <Table
                columns={['Fecha', 'Tipo', 'Concepto', 'Monto', '']}
                data={historial.pagos}
                emptyText="Sin pagos registrados"
                renderRow={(p) => (
                  <>
                    <td className="px-4 py-2 text-sm">{fmtDate(p.fecha)}</td>
                    <td className="px-4 py-2"><Badge variant={tipoBadge[p.tipo] || 'gray'}>{p.tipo}</Badge></td>
                    <td className="px-4 py-2 text-sm">{p.concepto}</td>
                    <td className="px-4 py-2 font-mono text-sm font-semibold">{fmt(p.monto)}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" onClick={() => abrirEditarPago(p)}><IconEdit size={12} /></Button>
                        <Button size="sm" variant="danger" onClick={() => confirmarEliminarPago(p)}><IconTrash size={12} /></Button>
                      </div>
                    </td>
                  </>
                )}
              />
            </div>
            <div className="border-t border-[#e5e8f5] pt-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-[#6b72a0] uppercase tracking-wide">
                  {pagoEditando ? 'Editando pago' : 'Registrar pago'}
                </span>
                {pagoEditando && (
                  <button onClick={limpiarFormPago} className="text-xs text-[#6b72a0] hover:text-[#1a1f3a] underline">
                    Cancelar edición
                  </button>
                )}
              </div>
              <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: '130px 120px 140px 1fr' }}>
                <input type="date" value={fechaPago} onChange={e => setFechaPago(e.target.value)}
                  className="px-2 py-2 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B]" />
                <select value={tipoPago} onChange={e => setTipoPago(e.target.value)}
                  className="px-2 py-2 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B]">
                  <option value="adelanto">Adelanto</option>
                  <option value="sueldo">Sueldo</option>
                  <option value="aguinaldo">Aguinaldo</option>
                  <option value="bono">Bono</option>
                  <option value="otro">Otro</option>
                </select>
                <select value={formaPago} onChange={e => setFormaPago(e.target.value)}
                  className="px-2 py-2 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B]">
                  <option>Efectivo</option><option>Transferencia</option>
                </select>
                <input value={conceptoPago} onChange={e => setConceptoPago(e.target.value)} placeholder="Concepto (opcional)"
                  className="px-2 py-2 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B]" />
              </div>
              <div className="flex gap-2">
                <input type="number" value={montoPago} onChange={e => setMontoPago(e.target.value)} placeholder="Monto Gs."
                  className="flex-1 px-3 py-2 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B]" />
                <Button variant="primary" loading={saving} onClick={guardarPago}>
                  <IconCash size={14} /> {pagoEditando ? 'Guardar cambios' : 'Registrar'}
                </Button>
              </div>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
