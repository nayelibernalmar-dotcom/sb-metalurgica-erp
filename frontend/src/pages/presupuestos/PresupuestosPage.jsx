// src/pages/presupuestos/PresupuestosPage.jsx
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { IconFileInvoice, IconPlus, IconEdit, IconTrash, IconEye, IconPrinter, IconX, IconHammer } from '@tabler/icons-react'
import { fetchPresupuestos, fetchPresupuesto, crearPresupuesto, actualizarPresupuesto, eliminarPresupuesto } from '../../app/slices/presupuestosSlice'
import { crearObra } from '../../app/slices/obrasSlice'
import { fetchClientes } from '../../app/slices/clientesSlice'
import { fetchProductos } from '../../app/slices/productosSlice'
import { Button, Badge, Modal, Card, LoadingScreen } from '../../components/ui'
import { QuickAddButton, QuickAddClienteModal, QuickAddProductoModal } from '../../components/shared/QuickAdd'
import { fmt, fmtN, fmtDate, today } from '../../utils/format'
import { EMPRESA } from '../../config/empresa'

const EMPTY_ITEM = { descripcion: '', qty: 1, unidad: 'unidades', precio: 0 }
const estadoBadge = { vigente: 'green', aprobado: 'blue', rechazado: 'red', vencido: 'gray' }

export default function PresupuestosPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const presupuestos = useSelector((s) => s.presupuestos.items)
  const current = useSelector((s) => s.presupuestos.current)
  const clientes = useSelector((s) => s.clientes.items)
  const productos = useSelector((s) => s.productos.items)
  const loading = useSelector((s) => s.presupuestos.loading)

  const [buscar, setBuscar] = useState('')
  const [modal, setModal] = useState(false)
  const [docModal, setDocModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState(null)

  // Form
  const [fecha, setFecha] = useState(today())
  const [validez, setValidez] = useState(15)
  const [clienteNombre, setClienteNombre] = useState('')
  const [contacto, setContacto] = useState('')
  const [notas, setNotas] = useState('')
  const [items, setItems] = useState([{ ...EMPTY_ITEM }])
  const [modalNuevoCliente, setModalNuevoCliente] = useState(false)
  const [itemNuevoProducto, setItemNuevoProducto] = useState(null)

  useEffect(() => {
    dispatch(fetchPresupuestos())
    dispatch(fetchClientes())
    dispatch(fetchProductos({ activo: true }))
  }, [])

  const total = items.reduce((s, it) => s + (parseFloat(it.qty) || 0) * (parseFloat(it.precio) || 0), 0)

  const listaFiltrada = presupuestos.filter(p =>
    !buscar || (p.numero + (p.cliente_nombre || '')).toLowerCase().includes(buscar.toLowerCase())
  )

  function abrirNuevo() {
    setEditId(null); setFecha(today()); setValidez(15); setClienteNombre('')
    setContacto(''); setNotas(''); setItems([{ ...EMPTY_ITEM }]); setModal(true)
  }

  async function abrirEditar(id) {
    const res = await dispatch(fetchPresupuesto(id)).unwrap()
    setEditId(id)
    setFecha(res.fecha?.slice(0, 10) || today())
    setValidez(res.validez_dias)
    setClienteNombre(res.cliente_nombre || '')
    setContacto(res.contacto || '')
    setNotas(res.notas || '')
    setItems((res.items || []).map(it => ({
      descripcion: it.descripcion, qty: parseFloat(it.cantidad),
      unidad: it.unidad, precio: parseFloat(it.precio_unitario),
    })))
    setModal(true)
  }

  async function verDoc(id) {
    await dispatch(fetchPresupuesto(id))
    setDocModal(true)
  }

  function addItem() { setItems(prev => [...prev, { ...EMPTY_ITEM }]) }
  function removeItem(i) { setItems(prev => prev.filter((_, idx) => idx !== i)) }
  function updateItem(i, field, value) {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: value } : it))
  }
  function selProducto(i, e) {
    const opt = e.target.options[e.target.selectedIndex]
    if (!opt.value) return
    updateItem(i, 'descripcion', opt.dataset.desc)
    updateItem(i, 'precio', parseFloat(opt.value) || 0)
  }

  async function guardar() {
    if (!clienteNombre.trim()) { toast.error('Seleccioná un cliente'); return }
    const itsValidos = items.filter(it => it.descripcion.trim())
    if (!itsValidos.length) { toast.error('Agregá al menos un ítem'); return }
    const cliente = clientes.find(c => c.nombre.toLowerCase() === clienteNombre.toLowerCase())
    if (!cliente) { toast.error('Cliente no encontrado. Crealo primero en Clientes.'); return }

    setSaving(true)
    try {
      const body = {
        cliente_id: cliente.id, contacto, validez_dias: parseInt(validez) || 15, notas,
        items: itsValidos.map(it => ({
          descripcion: it.descripcion, cantidad: parseFloat(it.qty) || 1,
          unidad: it.unidad, precio_unitario: parseFloat(it.precio) || 0,
        })),
      }
      if (editId) {
        await dispatch(actualizarPresupuesto({ id: editId, data: body })).unwrap()
        toast.success('Presupuesto actualizado')
      } else {
        await dispatch(crearPresupuesto(body)).unwrap()
        toast.success('Presupuesto creado')
      }
      setModal(false)
    } catch (e) { toast.error(e) }
    setSaving(false)
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar este presupuesto?')) return
    try { await dispatch(eliminarPresupuesto(id)).unwrap(); toast.success('Presupuesto eliminado') }
    catch (e) { toast.error(e) }
  }

  async function iniciarObra(id) {
    if (!confirm('¿Iniciar el seguimiento de obra para este presupuesto? Vas a poder registrar anticipos, señas y pagos parciales.')) return
    try {
      const obra = await dispatch(crearObra({ presupuesto_id: id })).unwrap()
      toast.success('Obra iniciada')
      navigate('/obras')
    } catch (e) {
      if (typeof e === 'string' && e.includes('ya tiene una obra')) { toast('Este presupuesto ya tiene una obra en seguimiento'); navigate('/obras'); return }
      toast.error(e)
    }
  }

  function imprimir() {
    const w = window.open('', '_blank')
    w.document.write(`<html><head><title>Presupuesto ${current?.numero}</title>
    <style>body{font-family:Arial,sans-serif;font-size:13px;color:#222;padding:30px;max-width:820px;margin:0 auto}
    table{width:100%;border-collapse:collapse;margin:12px 0}
    th{background:#f4f4f4;text-align:left;padding:7px 10px;font-size:11px;border:1px solid #ddd;text-transform:uppercase}
    td{padding:7px 10px;border:1px solid #eee}
    .header{display:flex;justify-content:space-between;padding-bottom:14px;border-bottom:3px solid #1B2A6B;margin-bottom:20px}
    </style></head><body>${docContent()}</body></html>`)
    w.document.close(); w.print()
  }

  function docContent() {
    if (!current) return ''
    const rows = (current.items || []).map((it, i) =>
      `<tr><td style="text-align:center">${i + 1}</td><td>${it.descripcion}</td>
       <td style="text-align:center">${it.cantidad}</td><td style="text-align:center">${it.unidad}</td>
       <td style="text-align:right">${fmtN(it.precio_unitario)} Gs.</td>
       <td style="text-align:right;font-weight:600">${fmtN(it.precio_total)} Gs.</td></tr>`
    ).join('')
    return `
      <div class="header">
        <div>
          <div style="font-size:20px;font-weight:bold;color:#1B2A6B">${EMPRESA.nombre}</div>
          <div style="font-size:11px;color:#888;margin-top:4px">Corte · Plegado · Herrería · Materiales</div>
          <div style="font-size:11px;color:#666;margin-top:6px;line-height:1.8">
            Dirección: ${EMPRESA.direccion}<br>
            Correo: ${EMPRESA.email}<br>
            Teléfono: ${EMPRESA.telefono}
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.5px">Presupuesto</div>
          <div style="font-size:24px;font-weight:bold;font-family:monospace;color:#1B2A6B">${current.numero}</div>
          <div style="font-size:12px;color:#888">${fmtDate(current.fecha)}</div>
        </div>
      </div>
      <p style="margin-bottom:14px">
        <b>Cliente:</b> ${current.cliente_nombre} &nbsp;
        <b>RUC:</b> ${current.cliente_ruc || '—'} &nbsp;
        <b>Contacto:</b> ${current.contacto || '—'} &nbsp;
        <b>Validez:</b> ${current.validez_dias} días
      </p>
      <div style="font-size:11px;font-weight:600;color:#888;margin-bottom:6px;letter-spacing:.5px;text-transform:uppercase">Detalle del presupuesto</div>
      <table>
        <thead><tr><th>Ítem</th><th>Descripción</th><th>Cantidad</th><th>Unidad</th><th>Precio Unitario</th><th>Precio Total</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="text-align:right;margin-top:16px;font-size:18px;font-weight:bold;color:#1B2A6B;border-top:2px solid #1B2A6B;padding-top:10px">
        TOTAL GENERAL (IVA incluido): ${fmtN(current.total)} Gs.
      </div>
      ${current.notas ? `<p style="font-size:12px;margin-top:10px;color:#555">${current.notas}</p>` : ''}
      <p style="font-size:11px;color:#aaa;margin-top:20px;border-top:1px solid #eee;padding-top:8px">
        Presupuesto válido por ${current.validez_dias} días desde la fecha de emisión.
      </p>
    `
  }

  if (loading && presupuestos.length === 0) return <LoadingScreen />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#1B2A6B]">Presupuestos</h1>
          <p className="text-sm text-[#6b72a0] mt-1">{presupuestos.length} presupuestos registrados</p>
        </div>
        <Button variant="primary" onClick={abrirNuevo}><IconPlus size={15} /> Nuevo presupuesto</Button>
      </div>

      <Card>
        <div className="px-5 py-4">
          <input value={buscar} onChange={e => setBuscar(e.target.value)}
            placeholder="Buscar por número o cliente..."
            className="w-full px-3 py-2 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B]" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {['Número', 'Fecha', 'Cliente', 'Total', 'Validez', 'Estado', ''].map((h, i) => (
                  <th key={i} className="text-left text-[11px] font-medium text-[#6b72a0] uppercase tracking-wide px-4 py-2.5 bg-[#f5f6fb] border-b border-[#d0d4e8]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {listaFiltrada.length === 0 ? (
                <tr><td colSpan={7}><div className="flex flex-col items-center py-12 text-[#6b72a0]"><IconFileInvoice size={40} className="opacity-25 mb-3" /><span className="text-sm">Sin presupuestos</span></div></td></tr>
              ) : listaFiltrada.map(p => (
                <tr key={p.id} className="hover:bg-[#f8f9fd] border-b border-[#e5e8f5] last:border-0">
                  <td className="px-4 py-3 font-mono text-sm font-semibold">{p.numero}</td>
                  <td className="px-4 py-3 text-sm">{fmtDate(p.fecha)}</td>
                  <td className="px-4 py-3 text-sm font-medium">{p.cliente_nombre || '—'}</td>
                  <td className="px-4 py-3 font-mono text-sm font-semibold">{fmt(p.total)}</td>
                  <td className="px-4 py-3 text-sm">{p.validez_dias} días</td>
                  <td className="px-4 py-3"><Badge variant={estadoBadge[p.estado] || 'gray'}>{p.estado}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <Button size="sm" onClick={() => verDoc(p.id)} title="Ver documento"><IconEye size={13} /></Button>
                      <Button size="sm" variant="secondary" onClick={() => abrirEditar(p.id)} title="Editar"><IconEdit size={13} /></Button>
                      {p.estado === 'aprobado' && (
                        <Button size="sm" variant="success" onClick={() => iniciarObra(p.id)} title="Iniciar seguimiento de obra"><IconHammer size={13} /></Button>
                      )}
                      <Button size="sm" variant="danger" onClick={() => eliminar(p.id)} title="Eliminar"><IconTrash size={13} /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal crear/editar */}
      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Editar presupuesto' : 'Nuevo presupuesto'} size="xl"
        footer={<><Button onClick={() => setModal(false)}>Cancelar</Button><Button variant="primary" loading={saving} onClick={guardar}>Guardar</Button></>}>
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#6b72a0]">Fecha</label>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
              className="px-3 py-2 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B]" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#6b72a0]">Validez (días)</label>
            <input type="number" value={validez} onChange={e => setValidez(e.target.value)} min="1"
              className="px-3 py-2 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B]" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#6b72a0]">Cliente *</label>
            <div className="flex gap-2">
              <input value={clienteNombre} onChange={e => setClienteNombre(e.target.value)}
                list="cli-pres-list" placeholder="Nombre del cliente"
                className="flex-1 px-3 py-2 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B]" />
              <QuickAddButton onClick={() => setModalNuevoCliente(true)} title="Crear cliente nuevo" />
            </div>
            <datalist id="cli-pres-list">
              {clientes.map(c => <option key={c.id} value={c.nombre} />)}
            </datalist>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#6b72a0]">Contacto</label>
            <input value={contacto} onChange={e => setContacto(e.target.value)} placeholder="Persona de contacto"
              className="px-3 py-2 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B]" />
          </div>
        </div>

        <div className="mb-2 text-xs font-semibold text-[#6b72a0] uppercase tracking-wide">Detalle del presupuesto</div>
        <div className="space-y-2 mb-3">
          {items.map((it, i) => (
            <div key={i} className="grid gap-2 items-start" style={{ gridTemplateColumns: '24px 2fr 70px 110px 120px auto' }}>
              <div className="text-[11px] font-semibold text-[#6b72a0] text-center pt-2">{i + 1}</div>
              <div className="flex flex-col gap-1">
                <div className="flex gap-1 mb-1">
                  <select onChange={e => selProducto(i, e)}
                    className="flex-1 w-full px-2 py-1.5 border border-[#d0d4e8] rounded text-xs outline-none focus:border-[#1B2A6B]">
                    <option value="">— Del inventario —</option>
                    {productos.map(p => <option key={p.id} value={p.precio} data-desc={p.descripcion}>{p.descripcion} — {fmtN(p.precio)} Gs.</option>)}
                  </select>
                  <button type="button" onClick={() => setItemNuevoProducto(i)} title="Crear producto nuevo"
                    className="px-2 border border-dashed border-[#1B2A6B] text-[#1B2A6B] rounded hover:bg-[#1B2A6B] hover:text-white transition-colors">
                    <IconPlus size={12} />
                  </button>
                </div>
                <input value={it.descripcion} onChange={e => updateItem(i, 'descripcion', e.target.value)}
                  placeholder="O escribir descripción"
                  className="w-full px-2 py-1.5 border border-[#d0d4e8] rounded text-xs outline-none focus:border-[#1B2A6B]" />
              </div>
              <input type="number" value={it.qty} min="0.01" step="0.01"
                onChange={e => updateItem(i, 'qty', e.target.value)} placeholder="Cant."
                className="px-2 py-1.5 border border-[#d0d4e8] rounded text-xs outline-none focus:border-[#1B2A6B]" />
              <select value={it.unidad} onChange={e => updateItem(i, 'unidad', e.target.value)}
                className="px-2 py-1.5 border border-[#d0d4e8] rounded text-xs outline-none focus:border-[#1B2A6B]">
                <option value="unidades">Unidades</option>
                <option value="metros">Metros</option>
              </select>
              <input type="number" value={it.precio} min="0"
                onChange={e => updateItem(i, 'precio', e.target.value)} placeholder="Precio Gs."
                className="px-2 py-1.5 border border-[#d0d4e8] rounded text-xs outline-none focus:border-[#1B2A6B]" />
              <button onClick={() => removeItem(i)} className="p-1.5 rounded bg-red-50 text-red-500 hover:bg-red-100">
                <IconX size={13} />
              </button>
            </div>
          ))}
        </div>
        <Button size="sm" onClick={addItem}><IconPlus size={13} /> Agregar ítem</Button>

        <div className="text-right mt-4 pt-3 border-t border-[#e5e8f5]">
          <span className="text-[16px] font-semibold text-[#1B2A6B]">TOTAL (IVA incluido): <span className="font-mono">{fmt(total)}</span></span>
        </div>

        <div className="mt-4 flex flex-col gap-1">
          <label className="text-xs font-medium text-[#6b72a0]">Notas</label>
          <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2}
            className="px-3 py-2 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B] resize-y" />
        </div>
      </Modal>

      {/* Modal documento */}
      <Modal open={docModal} onClose={() => setDocModal(false)} title={`Presupuesto ${current?.numero || ''}`} size="xl"
        footer={<><Button onClick={() => setDocModal(false)}>Cerrar</Button><Button variant="secondary" onClick={imprimir}><IconPrinter size={14} /> Imprimir</Button></>}>
        {current && (
          <div dangerouslySetInnerHTML={{ __html: docContent() }} />
        )}
      </Modal>

      <QuickAddClienteModal open={modalNuevoCliente} onClose={() => setModalNuevoCliente(false)}
        onCreated={(cliente) => setClienteNombre(cliente.nombre)} />

      <QuickAddProductoModal open={itemNuevoProducto !== null} onClose={() => setItemNuevoProducto(null)}
        onCreated={(producto) => {
          if (itemNuevoProducto !== null) {
            updateItem(itemNuevoProducto, 'descripcion', producto.descripcion)
            updateItem(itemNuevoProducto, 'precio', producto.precio)
          }
        }} />
    </div>
  )
}
