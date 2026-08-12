// src/pages/ventas/VentasPage.jsx
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { IconShoppingCart, IconPlus, IconBan, IconCheck, IconX } from '@tabler/icons-react'
import { fetchVentas, crearVenta, cambiarEstadoVenta } from '../../app/slices/ventasSlice'
import { fetchClientes } from '../../app/slices/clientesSlice'
import { fetchProductos } from '../../app/slices/productosSlice'
import { Button, Badge, Modal, Card, Input, Select, LoadingScreen } from '../../components/ui'
import { QuickAddButton, QuickAddClienteModal, QuickAddProductoModal } from '../../components/shared/QuickAdd'
import { fmt, fmtN, fmtDate, today } from '../../utils/format'

const EMPTY_ITEM = { descripcion: '', qty: 1, unidad: 'unidades', precio: 0 }

const estadoBadge = { pagada: 'green', pendiente: 'amber', anulada: 'red' }

export default function VentasPage() {
  const dispatch = useDispatch()
  const ventasStore = useSelector((s) => s.ventas.items)
  const loading = useSelector((s) => s.ventas.loading)
  const clientes = useSelector((s) => s.clientes.items)
  const productos = useSelector((s) => s.productos.items)

  const [buscar, setBuscar] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form
  const [fecha, setFecha] = useState(today())
  const [clienteNombre, setClienteNombre] = useState('')
  const [formaPago, setFormaPago] = useState('Efectivo')
  const [estadoVenta, setEstadoVenta] = useState('pagada')
  const [notas, setNotas] = useState('')
  const [items, setItems] = useState([{ ...EMPTY_ITEM }])
  const [modalNuevoCliente, setModalNuevoCliente] = useState(false)
  const [itemNuevoProducto, setItemNuevoProducto] = useState(null) // índice del ítem que pidió crear producto

  useEffect(() => {
    dispatch(fetchVentas())
    dispatch(fetchClientes())
    dispatch(fetchProductos({ activo: true }))
  }, [])

  const total = items.reduce((s, it) => s + (parseFloat(it.qty) || 0) * (parseFloat(it.precio) || 0), 0)

  const listaFiltrada = ventasStore.filter(v => {
    const matchBuscar = !buscar || (v.numero + (v.cliente_nombre || '')).toLowerCase().includes(buscar.toLowerCase())
    const matchEstado = filtroEstado === 'todos' || v.estado === filtroEstado
    return matchBuscar && matchEstado
  })

  function abrirModal() {
    setFecha(today()); setClienteNombre(''); setFormaPago('Efectivo')
    setEstadoVenta('pagada'); setNotas(''); setItems([{ ...EMPTY_ITEM }])
    setModal(true)
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
      await dispatch(crearVenta({
        cliente_id: cliente.id,
        notas,
        estado: estadoVenta,
        items: itsValidos.map(it => ({
          descripcion: it.descripcion,
          cantidad: parseFloat(it.qty) || 1,
          unidad: it.unidad,
          precio_unitario: parseFloat(it.precio) || 0,
        })),
      })).unwrap()
      toast.success('Venta guardada')
      setModal(false)
      dispatch(fetchVentas())
    } catch (e) { toast.error(e) }
    setSaving(false)
  }

  async function cambiarEstado(id, estado) {
    const msg = estado === 'pagada' ? '¿Marcar como pagada?' : '¿Anular esta venta?'
    if (!confirm(msg)) return
    try {
      await dispatch(cambiarEstadoVenta({ id, estado })).unwrap()
      toast.success(estado === 'pagada' ? 'Venta marcada como pagada' : 'Venta anulada')
    } catch (e) { toast.error(e) }
  }

  if (loading && ventasStore.length === 0) return <LoadingScreen />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#1B2A6B]">Ventas</h1>
          <p className="text-sm text-[#6b72a0] mt-1">{ventasStore.length} ventas registradas</p>
        </div>
        <Button variant="primary" onClick={abrirModal}><IconPlus size={15} /> Nueva venta</Button>
      </div>

      <Card>
        <div className="px-5 py-4 flex gap-3">
          <input value={buscar} onChange={e => setBuscar(e.target.value)}
            placeholder="Buscar por número o cliente..."
            className="flex-1 px-3 py-2 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B]" />
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
            className="px-3 py-2 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B]">
            <option value="todos">Todos los estados</option>
            <option value="pagada">Pagadas</option>
            <option value="pendiente">Pendientes</option>
            <option value="anulada">Anuladas</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {['Número', 'Fecha', 'Cliente', 'Total', 'Estado', ''].map((h, i) => (
                  <th key={i} className="text-left text-[11px] font-medium text-[#6b72a0] uppercase tracking-wide px-4 py-2.5 bg-[#f5f6fb] border-b border-[#d0d4e8]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {listaFiltrada.length === 0 ? (
                <tr><td colSpan={6}><div className="flex flex-col items-center py-12 text-[#6b72a0]"><IconShoppingCart size={40} className="opacity-25 mb-3" /><span className="text-sm">Sin ventas</span></div></td></tr>
              ) : listaFiltrada.map(v => (
                <tr key={v.id} className="hover:bg-[#f8f9fd] border-b border-[#e5e8f5] last:border-0">
                  <td className="px-4 py-3 font-mono text-sm font-semibold">{v.numero}</td>
                  <td className="px-4 py-3 text-sm">{fmtDate(v.fecha)}</td>
                  <td className="px-4 py-3 text-sm font-medium">{v.cliente_nombre || '—'}</td>
                  <td className="px-4 py-3 font-mono text-sm font-semibold">{fmt(v.total)}</td>
                  <td className="px-4 py-3"><Badge variant={estadoBadge[v.estado] || 'gray'}>{v.estado}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      {v.estado === 'pendiente' && (
                        <Button size="sm" variant="success" onClick={() => cambiarEstado(v.id, 'pagada')} title="Marcar como pagada"><IconCheck size={13} /></Button>
                      )}
                      {v.estado !== 'anulada' && (
                        <Button size="sm" variant="danger" onClick={() => cambiarEstado(v.id, 'anulada')} title="Anular venta"><IconBan size={13} /></Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal nueva venta */}
      <Modal open={modal} onClose={() => setModal(false)} title="Nueva venta" size="xl"
        footer={<><Button onClick={() => setModal(false)}>Cancelar</Button><Button variant="primary" loading={saving} onClick={guardar}>Guardar venta</Button></>}>
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#6b72a0]">Fecha</label>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
              className="px-3 py-2 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B]" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#6b72a0]">Cliente *</label>
            <div className="flex gap-2">
              <input value={clienteNombre} onChange={e => setClienteNombre(e.target.value)}
                list="cli-venta-list" placeholder="Nombre del cliente"
                className="flex-1 px-3 py-2 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B]" />
              <QuickAddButton onClick={() => setModalNuevoCliente(true)} title="Crear cliente nuevo" />
            </div>
            <datalist id="cli-venta-list">
              {clientes.map(c => <option key={c.id} value={c.nombre}>{c.nombre} — {c.ruc || 'sin RUC'}</option>)}
            </datalist>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#6b72a0]">Forma de pago</label>
            <select value={formaPago} onChange={e => setFormaPago(e.target.value)}
              className="px-3 py-2 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B]">
              <option>Efectivo</option><option>Transferencia</option><option>Cheque</option><option>Cuenta corriente</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#6b72a0]">Estado</label>
            <select value={estadoVenta} onChange={e => setEstadoVenta(e.target.value)}
              className="px-3 py-2 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B]">
              <option value="pagada">Pagada (cobrado)</option>
              <option value="pendiente">Pendiente de cobro</option>
            </select>
          </div>
        </div>

        {/* Ítems */}
        <div className="mb-2 text-xs font-semibold text-[#6b72a0] uppercase tracking-wide">Ítems de la venta</div>
        <div className="space-y-2 mb-3">
          {items.map((it, i) => (
            <div key={i} className="grid gap-2 items-start" style={{ gridTemplateColumns: '2fr 70px 110px 120px auto' }}>
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
          <span className="text-[16px] font-semibold text-[#1B2A6B]">TOTAL: <span className="font-mono">{fmt(total)}</span></span>
        </div>

        <div className="mt-4 flex flex-col gap-1">
          <label className="text-xs font-medium text-[#6b72a0]">Notas</label>
          <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2}
            className="px-3 py-2 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B] resize-y" />
        </div>
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
