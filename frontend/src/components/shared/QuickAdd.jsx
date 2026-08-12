// src/components/shared/QuickAdd.jsx
// Modales chicos para dar de alta un cliente o un producto sin salir del formulario
// donde se los está usando (Ventas, Presupuestos, etc.). Se guardan en la base de
// datos real (mismo endpoint que las pantallas de Clientes / Inventario) y quedan
// disponibles ahí también.
import { useState } from 'react'
import { useDispatch } from 'react-redux'
import toast from 'react-hot-toast'
import { IconUserPlus } from '@tabler/icons-react'
import { crearCliente } from '../../app/slices/clientesSlice'
import { crearProducto } from '../../app/slices/productosSlice'
import { Button, Modal, Input, Select } from '../ui'

export function QuickAddButton({ onClick, title }) {
  return (
    <button type="button" onClick={onClick} title={title}
      className="px-2.5 py-2 border border-dashed border-[#1B2A6B] text-[#1B2A6B] rounded-lg text-xs font-medium hover:bg-[#1B2A6B] hover:text-white transition-colors flex items-center gap-1 whitespace-nowrap">
      <IconUserPlus size={13} /> Nuevo
    </button>
  )
}

export function QuickAddClienteModal({ open, onClose, onCreated }) {
  const dispatch = useDispatch()
  const [saving, setSaving] = useState(false)
  const [nombre, setNombre] = useState('')
  const [ruc, setRuc] = useState('')
  const [telefono, setTelefono] = useState('')
  const [direccion, setDireccion] = useState('')

  function reset() { setNombre(''); setRuc(''); setTelefono(''); setDireccion('') }

  async function guardar() {
    if (!nombre.trim()) { toast.error('El nombre es obligatorio'); return }
    setSaving(true)
    try {
      const cliente = await dispatch(crearCliente({ nombre: nombre.trim(), ruc, telefono, direccion })).unwrap()
      toast.success('Cliente creado y guardado en la base de datos')
      onCreated(cliente)
      reset()
      onClose()
    } catch (e) { toast.error(e) }
    setSaving(false)
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose() }} title="Nuevo cliente"
      footer={<><Button onClick={() => { reset(); onClose() }}>Cancelar</Button><Button variant="primary" loading={saving} onClick={guardar}>Crear y usar</Button></>}>
      <div className="flex flex-col gap-4">
        <Input label="Nombre *" value={nombre} onChange={e => setNombre(e.target.value)} autoFocus />
        <Input label="RUC" value={ruc} onChange={e => setRuc(e.target.value)} />
        <Input label="Teléfono" value={telefono} onChange={e => setTelefono(e.target.value)} />
        <Input label="Dirección" value={direccion} onChange={e => setDireccion(e.target.value)} />
        <p className="text-xs text-[#6b72a0]">Este cliente queda guardado en la base de datos, igual que si lo hubieras creado desde la pantalla de Clientes.</p>
      </div>
    </Modal>
  )
}

export function QuickAddProductoModal({ open, onClose, onCreated }) {
  const dispatch = useDispatch()
  const [saving, setSaving] = useState(false)
  const [descripcion, setDescripcion] = useState('')
  const [unidad, setUnidad] = useState('unidades')
  const [precio, setPrecio] = useState('')
  const [stock, setStock] = useState('')

  function reset() { setDescripcion(''); setUnidad('unidades'); setPrecio(''); setStock('') }

  async function guardar() {
    if (!descripcion.trim()) { toast.error('La descripción es obligatoria'); return }
    setSaving(true)
    try {
      const producto = await dispatch(crearProducto({
        descripcion: descripcion.trim(), unidad, precio: parseFloat(precio) || 0, stock: parseFloat(stock) || 0,
      })).unwrap()
      toast.success('Producto creado y guardado en el inventario')
      onCreated(producto)
      reset()
      onClose()
    } catch (e) { toast.error(e) }
    setSaving(false)
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose() }} title="Nuevo producto"
      footer={<><Button onClick={() => { reset(); onClose() }}>Cancelar</Button><Button variant="primary" loading={saving} onClick={guardar}>Crear y usar</Button></>}>
      <div className="flex flex-col gap-4">
        <Input label="Descripción *" value={descripcion} onChange={e => setDescripcion(e.target.value)} autoFocus />
        <Select label="Unidad" value={unidad} onChange={e => setUnidad(e.target.value)}>
          <option value="unidades">Unidades</option>
          <option value="metros">Metros</option>
        </Select>
        <Input label="Precio de venta (Gs.)" type="number" value={precio} onChange={e => setPrecio(e.target.value)} />
        <Input label="Stock inicial" type="number" value={stock} onChange={e => setStock(e.target.value)} />
        <p className="text-xs text-[#6b72a0]">Este producto queda guardado en el inventario, igual que si lo hubieras creado desde esa pantalla.</p>
      </div>
    </Modal>
  )
}
