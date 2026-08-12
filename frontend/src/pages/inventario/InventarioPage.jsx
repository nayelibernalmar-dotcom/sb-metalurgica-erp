// src/pages/inventario/InventarioPage.jsx
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { IconPackage, IconPlus, IconEdit, IconTrash, IconAdjustments } from '@tabler/icons-react'
import { fetchProductos, crearProducto, actualizarProducto, eliminarProducto, ajustarStock } from '../../app/slices/productosSlice'
import { Button, Badge, Modal, Card, CardHeader, CardTitle, Input, Select, Textarea, LoadingScreen } from '../../components/ui'
import { fmtN } from '../../utils/format'

const CATS = { chapa: 'Chapa', caño: 'Caño/Perfil', insumo: 'Insumo', pedido: 'Por pedido', otro: 'Otro' }
const EMPTY_FORM = { descripcion: '', cod: '', cat: 'chapa', medida: '', unidad: 'unidades', stock: 0, stock_minimo: 2, precio: 0, notas: '' }

export default function InventarioPage() {
  const dispatch = useDispatch()
  const { items, loading } = useSelector((s) => s.productos)
  const [buscar, setBuscar] = useState('')
  const [catTab, setCatTab] = useState('todos')
  const [modal, setModal] = useState(false)
  const [stockModal, setStockModal] = useState(null) // { producto, tipo }
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState(null)
  const [stockCantidad, setStockCantidad] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { dispatch(fetchProductos()) }, [])

  const lista = items.filter(p =>
    (!buscar || (p.descripcion + (p.cod || '') + (p.medida || '')).toLowerCase().includes(buscar.toLowerCase())) &&
    (catTab === 'todos' || p.cat === catTab || p.categoria === catTab)
  )

  function abrirNuevo() {
    setForm(EMPTY_FORM); setEditId(null); setModal(true)
  }
  function abrirEditar(p) {
    setForm({ descripcion: p.descripcion, cod: p.cod || '', cat: p.cat || p.categoria || 'otro', medida: p.medida || '', unidad: p.unidad, stock: p.stock, stock_minimo: p.stock_minimo, precio: p.precio, notas: p.notas || '' })
    setEditId(p.id); setModal(true)
  }
  async function guardar() {
    if (!form.descripcion.trim()) { toast.error('La descripción es obligatoria'); return }
    setSaving(true)
    try {
      if (editId) {
        await dispatch(actualizarProducto({ id: editId, data: { descripcion: form.descripcion, unidad: form.unidad, precio: parseFloat(form.precio) || 0, stock: parseFloat(form.stock) || 0, stock_minimo: parseFloat(form.stock_minimo) || 0 } })).unwrap()
        toast.success('Producto actualizado')
      } else {
        await dispatch(crearProducto({ descripcion: form.descripcion, unidad: form.unidad, precio: parseFloat(form.precio) || 0, stock: parseFloat(form.stock) || 0, stock_minimo: parseFloat(form.stock_minimo) || 0 })).unwrap()
        toast.success('Producto creado')
      }
      setModal(false)
    } catch (e) { toast.error(e) }
    setSaving(false)
  }
  async function eliminar(id) {
    if (!confirm('¿Desactivar este producto?')) return
    try { await dispatch(eliminarProducto(id)).unwrap(); toast.success('Producto desactivado') }
    catch (e) { toast.error(e) }
  }
  async function guardarStock() {
    const cant = parseFloat(stockCantidad)
    if (!cant || cant <= 0) { toast.error('Cantidad inválida'); return }
    setSaving(true)
    try {
      await dispatch(ajustarStock({ id: stockModal.producto.id, cantidad: cant, tipo: stockModal.tipo })).unwrap()
      toast.success(`Stock ${stockModal.tipo === 'entrada' ? 'aumentado' : 'reducido'}`)
      setStockModal(null); setStockCantidad('')
    } catch (e) { toast.error(e) }
    setSaving(false)
  }

  const tabs = ['todos', 'chapa', 'caño', 'insumo', 'pedido', 'otro']
  const tabLabels = { todos: 'Todos', ...CATS }

  if (loading && items.length === 0) return <LoadingScreen />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#1B2A6B]">Inventario</h1>
          <p className="text-sm text-[#6b72a0] mt-1">{items.filter(p => p.activo !== false).length} productos activos</p>
        </div>
        <Button variant="primary" onClick={abrirNuevo}><IconPlus size={15} /> Nuevo producto</Button>
      </div>

      <Card>
        <div className="px-5 pt-4 pb-0">
          <input
            value={buscar} onChange={e => setBuscar(e.target.value)}
            placeholder="Buscar por descripción, código o medida..."
            className="w-full px-3 py-2 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B] mb-4"
          />
          <div className="flex gap-1 border-b border-[#d0d4e8] -mx-5 px-5">
            {tabs.map(t => (
              <button key={t} onClick={() => setCatTab(t)}
                className={`px-3 py-2 text-sm font-medium border-b-2 mb-[-1px] transition-all ${catTab === t ? 'text-[#1B2A6B] border-[#F5C433]' : 'text-[#6b72a0] border-transparent hover:text-[#1a1f3a]'}`}>
                {tabLabels[t]}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {['Descripción', 'Categoría', 'Stock', 'Precio venta', 'Estado', ''].map((h, i) => (
                  <th key={i} className="text-left text-[11px] font-medium text-[#6b72a0] uppercase tracking-wide px-4 py-2.5 bg-[#f5f6fb] border-b border-[#d0d4e8]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.length === 0 ? (
                <tr><td colSpan={6}><div className="flex flex-col items-center py-12 text-[#6b72a0]"><IconPackage size={40} className="opacity-25 mb-3" /><span className="text-sm">Sin productos</span></div></td></tr>
              ) : lista.map(p => {
                const bajo = p.cat !== 'pedido' && p.categoria !== 'pedido' && parseFloat(p.stock) <= parseFloat(p.stock_minimo)
                return (
                  <tr key={p.id} className="hover:bg-[#f8f9fd] border-b border-[#e5e8f5] last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm">{p.descripcion}</div>
                      {p.medida && <div className="text-xs text-[#6b72a0]">{p.medida}</div>}
                    </td>
                    <td className="px-4 py-3 text-sm">{CATS[p.cat || p.categoria] || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`font-mono text-sm ${bajo ? 'text-[#A32D2D] font-semibold' : ''}`}>{p.stock}</span>
                      <span className="text-xs text-[#6b72a0] ml-1">{p.unidad}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm font-semibold">{fmtN(p.precio)} Gs.</td>
                    <td className="px-4 py-3">
                      {p.cat === 'pedido' || p.categoria === 'pedido'
                        ? <Badge variant="blue">Por pedido</Badge>
                        : bajo ? <Badge variant="red">Stock bajo</Badge>
                        : <Badge variant="green">OK</Badge>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <Button size="sm" onClick={() => setStockModal({ producto: p, tipo: 'entrada' })} title="Entrada de stock"><IconAdjustments size={13} /></Button>
                        <Button size="sm" onClick={() => abrirEditar(p)}><IconEdit size={13} /></Button>
                        <Button size="sm" variant="danger" onClick={() => eliminar(p.id)}><IconTrash size={13} /></Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal producto */}
      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Editar producto' : 'Nuevo producto'} size="lg"
        footer={<><Button onClick={() => setModal(false)}>Cancelar</Button><Button variant="primary" loading={saving} onClick={guardar}>Guardar</Button></>}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><Input label="Descripción *" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Descripción completa del producto" /></div>
          <Select label="Unidad de medida" value={form.unidad} onChange={e => setForm({ ...form, unidad: e.target.value })}>
            <option value="unidades">Unidades</option>
            <option value="metros">Metros</option>
          </Select>
          <Input label="Stock actual" type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} min="0" />
          <Input label="Stock mínimo" type="number" value={form.stock_minimo} onChange={e => setForm({ ...form, stock_minimo: e.target.value })} min="0" />
          <Input label="Precio venta (Gs.)" type="number" value={form.precio} onChange={e => setForm({ ...form, precio: e.target.value })} min="0" />
        </div>
      </Modal>

      {/* Modal ajuste de stock */}
      <Modal open={!!stockModal} onClose={() => { setStockModal(null); setStockCantidad('') }}
        title={stockModal?.tipo === 'entrada' ? 'Entrada de stock' : 'Salida de stock'}
        footer={<><Button onClick={() => setStockModal(null)}>Cancelar</Button><Button variant="primary" loading={saving} onClick={guardarStock}>Confirmar</Button></>}>
        {stockModal && (
          <div className="space-y-4">
            <p className="text-sm text-[#6b72a0]">Producto: <span className="font-medium text-[#1a1f3a]">{stockModal.producto.descripcion}</span></p>
            <p className="text-sm text-[#6b72a0]">Stock actual: <span className="font-mono font-semibold">{stockModal.producto.stock} {stockModal.producto.unidad}</span></p>
            <div className="flex gap-2">
              <Button size="sm" variant={stockModal.tipo === 'entrada' ? 'primary' : 'default'} onClick={() => setStockModal({ ...stockModal, tipo: 'entrada' })}>Entrada</Button>
              <Button size="sm" variant={stockModal.tipo === 'salida' ? 'danger' : 'default'} onClick={() => setStockModal({ ...stockModal, tipo: 'salida' })}>Salida</Button>
            </div>
            <Input label="Cantidad" type="number" value={stockCantidad} onChange={e => setStockCantidad(e.target.value)} min="0.01" step="0.01" placeholder="0" autoFocus />
          </div>
        )}
      </Modal>
    </div>
  )
}
