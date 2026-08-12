// src/pages/compras/ComprasPage.jsx
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import {
  IconTruckDelivery, IconPlus, IconX, IconBan, IconCheck, IconUsers,
  IconBulb, IconWallet, IconShoppingBag,
} from '@tabler/icons-react'
import {
  fetchProveedores, crearProveedor, fetchCuentaCorriente, registrarPago,
  fetchCompras, crearCompra, cambiarEstadoCompra, fetchSugerencias,
} from '../../app/slices/comprasSlice'
import { fetchProductos } from '../../app/slices/productosSlice'
import { Button, Badge, Modal, Card, Input, LoadingScreen, EmptyState, Table } from '../../components/ui'
import ExportButton from '../../components/shared/ExportButton'
import { fmt, fmtN, fmtDate, today } from '../../utils/format'

const TABS = [
  { id: 'compras', label: 'Órdenes de compra', icon: IconShoppingBag },
  { id: 'proveedores', label: 'Proveedores', icon: IconUsers },
  { id: 'sugerencias', label: 'Sugerencias de reposición', icon: IconBulb },
]

const EMPTY_ITEM = { descripcion: '', producto_id: '', qty: 1, unidad: 'unidades', precio: 0 }
const estadoBadge = { recibida: 'green', pendiente: 'amber', anulada: 'red' }

export default function ComprasPage() {
  const dispatch = useDispatch()
  const { proveedores, compras, cuentaCorriente, sugerencias, loading } = useSelector((s) => s.compras)
  const productos = useSelector((s) => s.productos.items)

  const [tab, setTab] = useState('compras')
  const [saving, setSaving] = useState(false)

  // Modal nueva compra
  const [modalCompra, setModalCompra] = useState(false)
  const [proveedorNombre, setProveedorNombre] = useState('')
  const [fechaCompra, setFechaCompra] = useState(today())
  const [estadoCompra, setEstadoCompra] = useState('pendiente')
  const [notasCompra, setNotasCompra] = useState('')
  const [itemsCompra, setItemsCompra] = useState([{ ...EMPTY_ITEM }])

  // Modal nuevo proveedor
  const [modalProveedor, setModalProveedor] = useState(false)
  const [pNombre, setPNombre] = useState('')
  const [pRuc, setPRuc] = useState('')
  const [pTelefono, setPTelefono] = useState('')
  const [pDireccion, setPDireccion] = useState('')

  // Modal cuenta corriente / pago
  const [modalCuenta, setModalCuenta] = useState(false)
  const [proveedorActivo, setProveedorActivo] = useState(null)
  const [montoPago, setMontoPago] = useState('')
  const [conceptoPago, setConceptoPago] = useState('')

  useEffect(() => {
    dispatch(fetchProveedores())
    dispatch(fetchCompras())
    dispatch(fetchProductos({ activo: true }))
  }, [])

  useEffect(() => { if (tab === 'sugerencias') dispatch(fetchSugerencias()) }, [tab])

  const totalCompra = itemsCompra.reduce((s, it) => s + (parseFloat(it.qty) || 0) * (parseFloat(it.precio) || 0), 0)

  function abrirModalCompra(prefill) {
    setFechaCompra(today()); setProveedorNombre(''); setEstadoCompra('pendiente'); setNotasCompra('')
    setItemsCompra(prefill?.length ? prefill : [{ ...EMPTY_ITEM }])
    setModalCompra(true)
  }
  function addItemCompra() { setItemsCompra(prev => [...prev, { ...EMPTY_ITEM }]) }
  function removeItemCompra(i) { setItemsCompra(prev => prev.filter((_, idx) => idx !== i)) }
  function updateItemCompra(i, field, value) {
    setItemsCompra(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: value } : it))
  }
  function selProductoCompra(i, e) {
    const id = e.target.value
    if (!id) return
    const prod = productos.find(p => String(p.id) === id)
    if (!prod) return
    setItemsCompra(prev => prev.map((it, idx) => idx === i ? { ...it, producto_id: prod.id, descripcion: prod.descripcion } : it))
  }

  async function guardarCompra() {
    if (!proveedorNombre.trim()) { toast.error('Seleccioná un proveedor'); return }
    const validos = itemsCompra.filter(it => it.descripcion.trim())
    if (!validos.length) { toast.error('Agregá al menos un ítem'); return }
    const proveedor = proveedores.find(p => p.nombre.toLowerCase() === proveedorNombre.toLowerCase())
    if (!proveedor) { toast.error('Proveedor no encontrado. Creálo primero.'); return }

    setSaving(true)
    try {
      await dispatch(crearCompra({
        proveedor_id: proveedor.id,
        fecha: fechaCompra,
        estado: estadoCompra,
        notas: notasCompra,
        items: validos.map(it => ({
          producto_id: it.producto_id || null,
          descripcion: it.descripcion,
          cantidad: parseFloat(it.qty) || 1,
          unidad: it.unidad,
          precio_unitario: parseFloat(it.precio) || 0,
        })),
      })).unwrap()
      toast.success('Compra guardada')
      setModalCompra(false)
      dispatch(fetchCompras())
    } catch (e) { toast.error(e) }
    setSaving(false)
  }

  async function marcarRecibida(id) {
    if (!confirm('¿Marcar esta compra como recibida? Esto va a sumar el stock de los productos y actualizar la cuenta corriente del proveedor.')) return
    try { await dispatch(cambiarEstadoCompra({ id, estado: 'recibida' })).unwrap(); toast.success('Compra marcada como recibida') }
    catch (e) { toast.error(e) }
  }
  async function anularCompra(id) {
    if (!confirm('¿Anular esta compra?')) return
    try { await dispatch(cambiarEstadoCompra({ id, estado: 'anulada' })).unwrap(); toast.success('Compra anulada') }
    catch (e) { toast.error(e) }
  }

  async function guardarProveedor() {
    if (!pNombre.trim()) { toast.error('El nombre es obligatorio'); return }
    setSaving(true)
    try {
      await dispatch(crearProveedor({ nombre: pNombre.trim(), ruc: pRuc, telefono: pTelefono, direccion: pDireccion })).unwrap()
      toast.success('Proveedor creado')
      setModalProveedor(false); setPNombre(''); setPRuc(''); setPTelefono(''); setPDireccion('')
    } catch (e) { toast.error(e) }
    setSaving(false)
  }

  function abrirCuentaCorriente(prov) {
    setProveedorActivo(prov); setMontoPago(''); setConceptoPago('')
    dispatch(fetchCuentaCorriente(prov.id))
    setModalCuenta(true)
  }

  async function guardarPago() {
    const monto = parseFloat(montoPago)
    if (!monto || monto <= 0) { toast.error('Ingresá un monto válido'); return }
    setSaving(true)
    try {
      await dispatch(registrarPago({ id: proveedorActivo.id, data: { monto, concepto: conceptoPago } })).unwrap()
      toast.success('Pago registrado')
      dispatch(fetchCuentaCorriente(proveedorActivo.id))
      dispatch(fetchProveedores())
      setMontoPago(''); setConceptoPago('')
    } catch (e) { toast.error(e) }
    setSaving(false)
  }

  function usarSugerenciaEnCompra(sug) {
    abrirModalCompra([{ descripcion: sug.descripcion, producto_id: sug.id, qty: sug.cantidad_sugerida, unidad: sug.unidad, precio: 0 }])
  }

  if (loading && proveedores.length === 0 && compras.length === 0) return <LoadingScreen />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#1B2A6B]">Compras y Proveedores</h1>
          <p className="text-sm text-[#6b72a0] mt-1">Cuenta corriente, órdenes de compra y reposición de stock</p>
        </div>
        {tab === 'compras' && <Button variant="primary" onClick={() => abrirModalCompra()}><IconPlus size={15} /> Nueva compra</Button>}
        {tab === 'proveedores' && <Button variant="primary" onClick={() => setModalProveedor(true)}><IconPlus size={15} /> Nuevo proveedor</Button>}
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

      {/* ÓRDENES DE COMPRA */}
      {tab === 'compras' && (
        <Card>
          <Table
            columns={['Número', 'Fecha', 'Proveedor', 'Total', 'Estado', '']}
            data={compras}
            emptyIcon={IconShoppingBag}
            emptyText="Sin compras registradas"
            renderRow={(c) => (
              <>
                <td className="px-4 py-3 font-mono text-sm font-semibold">{c.numero}</td>
                <td className="px-4 py-3 text-sm">{fmtDate(c.fecha)}</td>
                <td className="px-4 py-3 text-sm font-medium">{c.proveedor_nombre || '—'}</td>
                <td className="px-4 py-3 font-mono text-sm font-semibold">{fmt(c.total)}</td>
                <td className="px-4 py-3"><Badge variant={estadoBadge[c.estado] || 'gray'}>{c.estado}</Badge></td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    {c.estado === 'pendiente' && (
                      <Button size="sm" variant="success" onClick={() => marcarRecibida(c.id)} title="Marcar como recibida"><IconCheck size={13} /></Button>
                    )}
                    {c.estado !== 'anulada' && (
                      <Button size="sm" variant="danger" onClick={() => anularCompra(c.id)} title="Anular compra"><IconBan size={13} /></Button>
                    )}
                  </div>
                </td>
              </>
            )}
          />
        </Card>
      )}

      {/* PROVEEDORES */}
      {tab === 'proveedores' && (
        <Card>
          <Table
            columns={['Nombre', 'RUC', 'Teléfono', 'Saldo (le debemos)', '']}
            data={proveedores}
            emptyIcon={IconUsers}
            emptyText="Sin proveedores registrados"
            renderRow={(p) => (
              <>
                <td className="px-4 py-3 text-sm font-medium">{p.nombre}</td>
                <td className="px-4 py-3 text-sm text-[#6b72a0]">{p.ruc || '—'}</td>
                <td className="px-4 py-3 text-sm text-[#6b72a0]">{p.telefono || '—'}</td>
                <td className={`px-4 py-3 font-mono text-sm font-semibold ${Number(p.saldo) > 0 ? 'text-[#A32D2D]' : 'text-[#6b72a0]'}`}>{fmt(p.saldo)}</td>
                <td className="px-4 py-3">
                  <Button size="sm" onClick={() => abrirCuentaCorriente(p)}><IconWallet size={13} /> Cuenta corriente</Button>
                </td>
              </>
            )}
          />
        </Card>
      )}

      {/* SUGERENCIAS DE REPOSICIÓN */}
      {tab === 'sugerencias' && (
        sugerencias.length === 0 ? (
          <EmptyState icon={IconBulb} text="No hay productos que necesiten reposición por ahora" />
        ) : (
          <Card>
            <Table
              columns={['Producto', 'Stock actual', 'Stock mínimo', 'Rotación diaria (30d)', 'Cantidad sugerida', '']}
              data={sugerencias}
              emptyIcon={IconBulb}
              emptyText="Sin sugerencias"
              renderRow={(s) => (
                <>
                  <td className="px-4 py-3 text-sm font-medium">{s.descripcion}</td>
                  <td className="px-4 py-3 font-mono text-sm">{fmtN(s.stock)} {s.unidad}</td>
                  <td className="px-4 py-3 font-mono text-sm text-[#6b72a0]">{fmtN(s.stock_minimo)}</td>
                  <td className="px-4 py-3 font-mono text-sm text-[#6b72a0]">{s.rotacion_diaria}</td>
                  <td className="px-4 py-3 font-mono text-sm font-semibold text-[#1B2A6B]">{fmtN(s.cantidad_sugerida)} {s.unidad}</td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="primary" onClick={() => usarSugerenciaEnCompra(s)}><IconPlus size={13} /> Usar en compra</Button>
                  </td>
                </>
              )}
            />
          </Card>
        )
      )}

      {/* Modal: nueva compra */}
      <Modal open={modalCompra} onClose={() => setModalCompra(false)} title="Nueva compra" size="xl"
        footer={<><Button onClick={() => setModalCompra(false)}>Cancelar</Button><Button variant="primary" loading={saving} onClick={guardarCompra}>Guardar compra</Button></>}>
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#6b72a0]">Fecha</label>
            <input type="date" value={fechaCompra} onChange={e => setFechaCompra(e.target.value)}
              className="px-3 py-2 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B]" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#6b72a0]">Proveedor *</label>
            <input value={proveedorNombre} onChange={e => setProveedorNombre(e.target.value)}
              list="prov-compra-list" placeholder="Nombre del proveedor"
              className="px-3 py-2 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B]" />
            <datalist id="prov-compra-list">
              {proveedores.map(p => <option key={p.id} value={p.nombre}>{p.nombre} — {p.ruc || 'sin RUC'}</option>)}
            </datalist>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#6b72a0]">Estado</label>
            <select value={estadoCompra} onChange={e => setEstadoCompra(e.target.value)}
              className="px-3 py-2 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B]">
              <option value="pendiente">Pendiente (orden de compra)</option>
              <option value="recibida">Recibida (suma stock ahora)</option>
            </select>
          </div>
        </div>

        <div className="mb-2 text-xs font-semibold text-[#6b72a0] uppercase tracking-wide">Ítems de la compra</div>
        <div className="space-y-2 mb-3">
          {itemsCompra.map((it, i) => (
            <div key={i} className="grid gap-2 items-start" style={{ gridTemplateColumns: '2fr 70px 110px 120px auto' }}>
              <div className="flex flex-col gap-1">
                <select onChange={e => selProductoCompra(i, e)}
                  className="w-full px-2 py-1.5 border border-[#d0d4e8] rounded text-xs outline-none focus:border-[#1B2A6B] mb-1">
                  <option value="">— Del inventario —</option>
                  {productos.map(p => <option key={p.id} value={p.id}>{p.descripcion}</option>)}
                </select>
                <input value={it.descripcion} onChange={e => updateItemCompra(i, 'descripcion', e.target.value)}
                  placeholder="O escribir descripción"
                  className="w-full px-2 py-1.5 border border-[#d0d4e8] rounded text-xs outline-none focus:border-[#1B2A6B]" />
              </div>
              <input type="number" value={it.qty} min="0.01" step="0.01"
                onChange={e => updateItemCompra(i, 'qty', e.target.value)} placeholder="Cant."
                className="px-2 py-1.5 border border-[#d0d4e8] rounded text-xs outline-none focus:border-[#1B2A6B]" />
              <select value={it.unidad} onChange={e => updateItemCompra(i, 'unidad', e.target.value)}
                className="px-2 py-1.5 border border-[#d0d4e8] rounded text-xs outline-none focus:border-[#1B2A6B]">
                <option value="unidades">Unidades</option>
                <option value="metros">Metros</option>
              </select>
              <input type="number" value={it.precio} min="0"
                onChange={e => updateItemCompra(i, 'precio', e.target.value)} placeholder="Costo Gs."
                className="px-2 py-1.5 border border-[#d0d4e8] rounded text-xs outline-none focus:border-[#1B2A6B]" />
              <button onClick={() => removeItemCompra(i)} className="p-1.5 rounded bg-red-50 text-red-500 hover:bg-red-100">
                <IconX size={13} />
              </button>
            </div>
          ))}
        </div>
        <Button size="sm" onClick={addItemCompra}><IconPlus size={13} /> Agregar ítem</Button>

        <div className="text-right mt-4 pt-3 border-t border-[#e5e8f5]">
          <span className="text-[16px] font-semibold text-[#1B2A6B]">TOTAL: <span className="font-mono">{fmt(totalCompra)}</span></span>
        </div>

        <div className="mt-4 flex flex-col gap-1">
          <label className="text-xs font-medium text-[#6b72a0]">Notas</label>
          <textarea value={notasCompra} onChange={e => setNotasCompra(e.target.value)} rows={2}
            className="px-3 py-2 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B] resize-y" />
        </div>
      </Modal>

      {/* Modal: nuevo proveedor */}
      <Modal open={modalProveedor} onClose={() => setModalProveedor(false)} title="Nuevo proveedor"
        footer={<><Button onClick={() => setModalProveedor(false)}>Cancelar</Button><Button variant="primary" loading={saving} onClick={guardarProveedor}>Guardar</Button></>}>
        <div className="flex flex-col gap-4">
          <Input label="Nombre *" value={pNombre} onChange={e => setPNombre(e.target.value)} />
          <Input label="RUC" value={pRuc} onChange={e => setPRuc(e.target.value)} />
          <Input label="Teléfono" value={pTelefono} onChange={e => setPTelefono(e.target.value)} />
          <Input label="Dirección" value={pDireccion} onChange={e => setPDireccion(e.target.value)} />
        </div>
      </Modal>

      {/* Modal: cuenta corriente / registrar pago */}
      <Modal open={modalCuenta} onClose={() => setModalCuenta(false)} title={`Cuenta corriente — ${proveedorActivo?.nombre || ''}`} size="lg"
        footer={<Button onClick={() => setModalCuenta(false)}>Cerrar</Button>}>
        {cuentaCorriente ? (
          <>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#e5e8f5]">
              <span className="text-sm text-[#6b72a0]">Saldo actual (le debemos)</span>
              <div className="flex items-center gap-4">
                <span className="text-[18px] font-mono font-bold text-[#A32D2D]">{fmt(cuentaCorriente.saldo_final)}</span>
                <ExportButton url={`/proveedores/${proveedorActivo?.id}/cuenta-corriente/exportar`} label="Exportar" />
              </div>
            </div>
            <div className="max-h-56 overflow-y-auto mb-5">
              <Table
                columns={['Fecha', 'Concepto', 'Tipo', 'Monto', 'Saldo']}
                data={cuentaCorriente.movimientos}
                emptyText="Sin movimientos"
                renderRow={(m) => (
                  <>
                    <td className="px-4 py-2 text-sm">{fmtDate(m.fecha)}</td>
                    <td className="px-4 py-2 text-sm">{m.concepto}</td>
                    <td className="px-4 py-2"><Badge variant={m.tipo === 'compra' ? 'amber' : 'green'}>{m.tipo}</Badge></td>
                    <td className="px-4 py-2 font-mono text-sm">{fmt(m.monto)}</td>
                    <td className="px-4 py-2 font-mono text-sm font-semibold">{fmt(m.saldo)}</td>
                  </>
                )}
              />
            </div>
            <div className="border-t border-[#e5e8f5] pt-4">
              <div className="mb-2 text-xs font-semibold text-[#6b72a0] uppercase tracking-wide">Registrar pago</div>
              <div className="flex gap-2">
                <input type="number" value={montoPago} onChange={e => setMontoPago(e.target.value)} placeholder="Monto Gs."
                  className="px-3 py-2 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B] w-40" />
                <input value={conceptoPago} onChange={e => setConceptoPago(e.target.value)} placeholder="Concepto (opcional)"
                  className="flex-1 px-3 py-2 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B]" />
                <Button variant="primary" loading={saving} onClick={guardarPago}>Registrar</Button>
              </div>
            </div>
          </>
        ) : <LoadingScreen />}
      </Modal>
    </div>
  )
}
