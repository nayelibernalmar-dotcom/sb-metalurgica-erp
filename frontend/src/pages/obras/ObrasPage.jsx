// src/pages/obras/ObrasPage.jsx
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { IconHammer, IconEye, IconPrinter, IconCash, IconCheck, IconBan } from '@tabler/icons-react'
import { fetchObras, fetchObra, cambiarEstadoObra, registrarPagoObra, limpiarObraActual } from '../../app/slices/obrasSlice'
import { Button, Badge, Modal, Card, LoadingScreen, EmptyState, Table } from '../../components/ui'
import { fmt, fmtN, fmtDate, today } from '../../utils/format'
import { EMPRESA } from '../../config/empresa'

const estadoBadge = { en_proceso: 'blue', finalizada: 'green', cancelada: 'red' }
const estadoLabel = { en_proceso: 'En proceso', finalizada: 'Finalizada', cancelada: 'Cancelada' }

export default function ObrasPage() {
  const dispatch = useDispatch()
  const obras = useSelector((s) => s.obras.items)
  const actual = useSelector((s) => s.obras.actual)
  const loading = useSelector((s) => s.obras.loading)

  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [fechaPago, setFechaPago] = useState(today())
  const [conceptoPago, setConceptoPago] = useState('Seña')
  const [montoPago, setMontoPago] = useState('')
  const [formaPago, setFormaPago] = useState('Efectivo')

  useEffect(() => { dispatch(fetchObras()) }, [])

  async function abrirObra(id) {
    await dispatch(fetchObra(id))
    setFechaPago(today()); setConceptoPago('Seña'); setMontoPago(''); setFormaPago('Efectivo')
    setModal(true)
  }

  function cerrarModal() { setModal(false); dispatch(limpiarObraActual()); dispatch(fetchObras()) }

  async function guardarPago() {
    const monto = parseFloat(montoPago)
    if (!monto || monto <= 0) { toast.error('Ingresá un monto válido'); return }
    setSaving(true)
    try {
      await dispatch(registrarPagoObra({ id: actual.id, data: { fecha: fechaPago, concepto: conceptoPago, monto, forma_pago: formaPago } })).unwrap()
      toast.success('Pago registrado')
      setMontoPago('')
    } catch (e) { toast.error(e) }
    setSaving(false)
  }

  async function marcarFinalizada() {
    if (!confirm('¿Marcar esta obra como finalizada?')) return
    try { await dispatch(cambiarEstadoObra({ id: actual.id, estado: 'finalizada' })).unwrap(); toast.success('Obra finalizada') }
    catch (e) { toast.error(e) }
  }
  async function cancelarObra() {
    if (!confirm('¿Cancelar el seguimiento de esta obra?')) return
    try { await dispatch(cambiarEstadoObra({ id: actual.id, estado: 'cancelada' })).unwrap(); toast.success('Obra cancelada') }
    catch (e) { toast.error(e) }
  }

  function docContent() {
    if (!actual) return ''
    const filasPagos = (actual.pagos || []).map(p =>
      `<tr><td>${fmtDate(p.fecha)}</td><td>${p.concepto}</td><td>${p.forma_pago || '—'}</td>
       <td style="text-align:right;font-weight:600">${fmtN(p.monto)} Gs.</td></tr>`
    ).join('') || '<tr><td colspan="4" style="text-align:center;color:#999">Sin pagos registrados todavía</td></tr>'

    return `
      <div class="header">
        <div>
          <div style="font-size:20px;font-weight:bold;color:#1B2A6B">${EMPRESA.nombre}</div>
          <div style="font-size:11px;color:#666;margin-top:6px;line-height:1.8">
            Dirección: ${EMPRESA.direccion}<br>Correo: ${EMPRESA.email}<br>Teléfono: ${EMPRESA.telefono}
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.5px">Estado de cuenta — Obra</div>
          <div style="font-size:20px;font-weight:bold;font-family:monospace;color:#1B2A6B">Presupuesto ${actual.presupuesto_numero}</div>
          <div style="font-size:12px;color:#888">${fmtDate(new Date().toISOString().slice(0, 10))}</div>
        </div>
      </div>
      <p style="margin-bottom:14px">
        <b>Cliente:</b> ${actual.cliente_nombre || '—'} &nbsp; <b>RUC:</b> ${actual.cliente_ruc || '—'}
      </p>
      <div style="display:flex;gap:20px;margin-bottom:18px">
        <div style="flex:1;background:#f4f6fb;padding:12px 16px;border-radius:6px">
          <div style="font-size:10px;color:#888;text-transform:uppercase">Monto total del trabajo</div>
          <div style="font-size:18px;font-weight:bold;color:#1B2A6B">${fmtN(actual.monto_total)} Gs.</div>
        </div>
        <div style="flex:1;background:#f0f9f0;padding:12px 16px;border-radius:6px">
          <div style="font-size:10px;color:#888;text-transform:uppercase">Total entregado</div>
          <div style="font-size:18px;font-weight:bold;color:#2a7a3b">${fmtN(actual.total_pagado)} Gs.</div>
        </div>
        <div style="flex:1;background:#fdf1f1;padding:12px 16px;border-radius:6px">
          <div style="font-size:10px;color:#888;text-transform:uppercase">Saldo pendiente</div>
          <div style="font-size:18px;font-weight:bold;color:#A32D2D">${fmtN(actual.saldo_pendiente)} Gs.</div>
        </div>
      </div>
      <div style="font-size:11px;font-weight:600;color:#888;margin-bottom:6px;letter-spacing:.5px;text-transform:uppercase">Historial de pagos</div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
        <thead><tr>
          <th style="background:#f4f4f4;text-align:left;padding:7px 10px;font-size:11px;border:1px solid #ddd">Fecha</th>
          <th style="background:#f4f4f4;text-align:left;padding:7px 10px;font-size:11px;border:1px solid #ddd">Concepto</th>
          <th style="background:#f4f4f4;text-align:left;padding:7px 10px;font-size:11px;border:1px solid #ddd">Forma de pago</th>
          <th style="background:#f4f4f4;text-align:right;padding:7px 10px;font-size:11px;border:1px solid #ddd">Monto</th>
        </tr></thead>
        <tbody style="font-size:12px">${filasPagos}</tbody>
      </table>
      <p style="font-size:11px;color:#aaa;margin-top:20px;border-top:1px solid #eee;padding-top:8px">
        Documento informativo de seguimiento de pagos. No reemplaza la factura legal correspondiente.
      </p>
    `
  }

  function imprimir() {
    const w = window.open('', '_blank')
    w.document.write(`<html><head><title>Estado de cuenta — ${actual?.presupuesto_numero}</title>
    <style>body{font-family:Arial,sans-serif;font-size:13px;color:#222;padding:30px;max-width:820px;margin:0 auto}
    td{padding:7px 10px;border:1px solid #eee}
    .header{display:flex;justify-content:space-between;padding-bottom:14px;border-bottom:3px solid #1B2A6B;margin-bottom:20px}
    </style></head><body>${docContent()}</body></html>`)
    w.document.close(); w.print()
  }

  if (loading && obras.length === 0) return <LoadingScreen />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#1B2A6B]">Obras en Seguimiento</h1>
          <p className="text-sm text-[#6b72a0] mt-1">Control de anticipos y pagos de presupuestos aprobados</p>
        </div>
      </div>

      {obras.length === 0 ? (
        <EmptyState icon={IconHammer} text='Todavía no hay obras. Aprobá un presupuesto y usá el botón "Iniciar obra" para empezar el seguimiento.' />
      ) : (
        <Card>
          <Table
            columns={['Presupuesto', 'Cliente', 'Monto total', 'Pagado', 'Saldo', 'Estado', '']}
            data={obras}
            emptyIcon={IconHammer}
            emptyText="Sin obras"
            renderRow={(o) => (
              <>
                <td className="px-4 py-3 font-mono text-sm font-semibold">{o.presupuesto_numero}</td>
                <td className="px-4 py-3 text-sm font-medium">{o.cliente_nombre || '—'}</td>
                <td className="px-4 py-3 font-mono text-sm">{fmt(o.monto_total)}</td>
                <td className="px-4 py-3 font-mono text-sm text-[#2a7a3b]">{fmt(o.total_pagado)}</td>
                <td className="px-4 py-3 font-mono text-sm font-semibold text-[#A32D2D]">{fmt(o.saldo_pendiente)}</td>
                <td className="px-4 py-3"><Badge variant={estadoBadge[o.estado] || 'gray'}>{estadoLabel[o.estado] || o.estado}</Badge></td>
                <td className="px-4 py-3">
                  <Button size="sm" onClick={() => abrirObra(o.id)}><IconEye size={13} /> Ver / registrar pago</Button>
                </td>
              </>
            )}
          />
        </Card>
      )}

      {/* Modal detalle de obra */}
      <Modal open={modal} onClose={cerrarModal} title={`Obra — Presupuesto ${actual?.presupuesto_numero || ''}`} size="xl"
        footer={<>
          <Button onClick={cerrarModal}>Cerrar</Button>
          <Button variant="secondary" onClick={imprimir}><IconPrinter size={14} /> Estado de cuenta (para el cliente)</Button>
          {actual?.estado === 'en_proceso' && <Button variant="success" onClick={marcarFinalizada}><IconCheck size={14} /> Finalizar obra</Button>}
          {actual?.estado !== 'cancelada' && <Button variant="danger" onClick={cancelarObra}><IconBan size={14} /> Cancelar</Button>}
        </>}>
        {!actual ? <LoadingScreen /> : (
          <>
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-[#f5f6fb] rounded-lg p-3">
                <div className="text-[10px] font-semibold text-[#6b72a0] uppercase">Monto total</div>
                <div className="text-lg font-bold text-[#1B2A6B] font-mono">{fmt(actual.monto_total)}</div>
              </div>
              <div className="bg-[#eefaf0] rounded-lg p-3">
                <div className="text-[10px] font-semibold text-[#6b72a0] uppercase">Entregado</div>
                <div className="text-lg font-bold text-[#2a7a3b] font-mono">{fmt(actual.total_pagado)}</div>
              </div>
              <div className="bg-[#fdf1f1] rounded-lg p-3">
                <div className="text-[10px] font-semibold text-[#6b72a0] uppercase">Saldo pendiente</div>
                <div className="text-lg font-bold text-[#A32D2D] font-mono">{fmt(actual.saldo_pendiente)}</div>
              </div>
            </div>

            <div className="mb-5">
              <div className="h-2 rounded-full bg-[#e5e8f5] overflow-hidden">
                <div className="h-full bg-[#2a7a3b] transition-all" style={{ width: `${actual.porcentaje_pagado}%` }} />
              </div>
              <div className="text-xs text-[#6b72a0] mt-1">{actual.porcentaje_pagado.toFixed(0)}% entregado</div>
            </div>

            <div className="mb-2 text-xs font-semibold text-[#6b72a0] uppercase tracking-wide">Historial de pagos</div>
            <div className="max-h-48 overflow-y-auto mb-5">
              <Table
                columns={['Fecha', 'Concepto', 'Forma de pago', 'Monto']}
                data={actual.pagos}
                emptyText="Sin pagos registrados todavía"
                renderRow={(p) => (
                  <>
                    <td className="px-4 py-2 text-sm">{fmtDate(p.fecha)}</td>
                    <td className="px-4 py-2 text-sm">{p.concepto}</td>
                    <td className="px-4 py-2 text-sm text-[#6b72a0]">{p.forma_pago || '—'}</td>
                    <td className="px-4 py-2 font-mono text-sm font-semibold">{fmt(p.monto)}</td>
                  </>
                )}
              />
            </div>

            {actual.estado === 'en_proceso' && (
              <div className="border-t border-[#e5e8f5] pt-4">
                <div className="mb-2 text-xs font-semibold text-[#6b72a0] uppercase tracking-wide">Registrar anticipo / pago</div>
                <div className="grid gap-2" style={{ gridTemplateColumns: '130px 1fr 140px 120px auto' }}>
                  <input type="date" value={fechaPago} onChange={e => setFechaPago(e.target.value)}
                    className="px-2 py-2 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B]" />
                  <select value={conceptoPago} onChange={e => setConceptoPago(e.target.value)}
                    className="px-2 py-2 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B]">
                    <option>Seña</option><option>Anticipo</option><option>Pago parcial</option><option>Pago final</option>
                  </select>
                  <select value={formaPago} onChange={e => setFormaPago(e.target.value)}
                    className="px-2 py-2 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B]">
                    <option>Efectivo</option><option>Transferencia</option><option>Cheque</option>
                  </select>
                  <input type="number" value={montoPago} onChange={e => setMontoPago(e.target.value)} placeholder="Monto Gs."
                    className="px-2 py-2 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B]" />
                  <Button variant="primary" loading={saving} onClick={guardarPago}><IconCash size={14} /> Registrar</Button>
                </div>
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  )
}
