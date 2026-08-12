// src/pages/clientes/ClientesPage.jsx
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { IconUsers, IconPlus, IconEdit, IconTrash } from '@tabler/icons-react'
import { fetchClientes, crearCliente, actualizarCliente, eliminarCliente } from '../../app/slices/clientesSlice'
import { Button, Badge, Modal, Card, Input, LoadingScreen } from '../../components/ui'

const EMPTY = { nombre: '', ruc: '', telefono: '', email: '', ciudad: '', direccion: '' }

export default function ClientesPage() {
  const dispatch = useDispatch()
  const { items, loading } = useSelector((s) => s.clientes)
  const [buscar, setBuscar] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { dispatch(fetchClientes()) }, [])

  const lista = items.filter(c =>
    !buscar || (c.nombre + (c.ruc || '') + (c.ciudad || '')).toLowerCase().includes(buscar.toLowerCase())
  )

  function abrirNuevo() { setForm(EMPTY); setEditId(null); setModal(true) }
  function abrirEditar(c) {
    setForm({ nombre: c.nombre, ruc: c.ruc || '', telefono: c.telefono || '', email: c.email || '', ciudad: c.ciudad || '', direccion: c.direccion || '' })
    setEditId(c.id); setModal(true)
  }

  async function guardar() {
    if (!form.nombre.trim()) { toast.error('El nombre es obligatorio'); return }
    setSaving(true)
    try {
      if (editId) {
        await dispatch(actualizarCliente({ id: editId, data: form })).unwrap()
        toast.success('Cliente actualizado')
      } else {
        await dispatch(crearCliente(form)).unwrap()
        toast.success('Cliente creado')
      }
      setModal(false)
    } catch (e) { toast.error(e) }
    setSaving(false)
  }

  async function eliminar(id) {
    if (!confirm('¿Desactivar este cliente?')) return
    try { await dispatch(eliminarCliente(id)).unwrap(); toast.success('Cliente desactivado') }
    catch (e) { toast.error(e) }
  }

  if (loading && items.length === 0) return <LoadingScreen />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#1B2A6B]">Clientes</h1>
          <p className="text-sm text-[#6b72a0] mt-1">{items.length} clientes registrados</p>
        </div>
        <Button variant="primary" onClick={abrirNuevo}><IconPlus size={15} /> Nuevo cliente</Button>
      </div>

      <Card>
        <div className="px-5 py-4">
          <input value={buscar} onChange={e => setBuscar(e.target.value)}
            placeholder="Buscar por nombre, RUC o ciudad..."
            className="w-full px-3 py-2 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B]" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {['Nombre / Razón social', 'RUC', 'Ciudad', 'Teléfono', 'Email', ''].map((h, i) => (
                  <th key={i} className="text-left text-[11px] font-medium text-[#6b72a0] uppercase tracking-wide px-4 py-2.5 bg-[#f5f6fb] border-b border-[#d0d4e8]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.length === 0 ? (
                <tr><td colSpan={6}><div className="flex flex-col items-center py-12 text-[#6b72a0]"><IconUsers size={40} className="opacity-25 mb-3" /><span className="text-sm">Sin clientes</span></div></td></tr>
              ) : lista.map(c => (
                <tr key={c.id} className="hover:bg-[#f8f9fd] border-b border-[#e5e8f5] last:border-0">
                  <td className="px-4 py-3 font-medium text-sm">{c.nombre}</td>
                  <td className="px-4 py-3 font-mono text-sm">{c.ruc || '—'}</td>
                  <td className="px-4 py-3 text-sm">{c.ciudad || '—'}</td>
                  <td className="px-4 py-3 text-sm">{c.telefono || '—'}</td>
                  <td className="px-4 py-3 text-sm">{c.email || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <Button size="sm" onClick={() => abrirEditar(c)}><IconEdit size={13} /></Button>
                      <Button size="sm" variant="danger" onClick={() => eliminar(c.id)}><IconTrash size={13} /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Editar cliente' : 'Nuevo cliente'} size="lg"
        footer={<><Button onClick={() => setModal(false)}>Cancelar</Button><Button variant="primary" loading={saving} onClick={guardar}>Guardar</Button></>}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><Input label="Nombre / Razón social *" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre del cliente o empresa" autoFocus /></div>
          <Input label="RUC" value={form.ruc} onChange={e => setForm({ ...form, ruc: e.target.value })} placeholder="RUC del cliente" />
          <Input label="Teléfono" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} placeholder="Número de contacto" />
          <Input label="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="correo@ejemplo.com" />
          <Input label="Ciudad" value={form.ciudad} onChange={e => setForm({ ...form, ciudad: e.target.value })} placeholder="Ej: Asunción" />
          <div className="col-span-2"><Input label="Dirección" value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} placeholder="Dirección completa" /></div>
        </div>
      </Modal>
    </div>
  )
}
