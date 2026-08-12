// src/pages/remitos/RemitosPage.jsx
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { IconTruck, IconPlus, IconEdit, IconEye, IconPrinter, IconX } from '@tabler/icons-react'
import { fetchRemitos, fetchRemito, crearRemito, actualizarRemito } from '../../app/slices/remitosSlice'
import { fetchClientes } from '../../app/slices/clientesSlice'
import { fetchProductos } from '../../app/slices/productosSlice'
import { Button, Modal, Card, LoadingScreen } from '../../components/ui'
import { fmtN, fmtDate, today } from '../../utils/format'
import { EMPRESA } from '../../config/empresa'

const EMPTY_ITEM = { descripcion: '', qty: 1, unidad: 'unidades' }

export default function RemitosPage() {
  const dispatch = useDispatch()
  const remitos = useSelector((s) => s.remitos.items)
  const current = useSelector((s) => s.remitos.current)
  const clientes = useSelector((s) => s.clientes.items)
  const productos = useSelector((s) => s.productos.items)
  const loading = useSelector((s) => s.remitos.loading)

  const [buscar, setBuscar] = useState('')
  const [modal, setModal] = useState(false)
  const [docModal, setDocModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState(null)

  // Form
  const [fecha, setFecha] = useState(today())
  const [destNombre, setDestNombre] = useState('')
  const [motivo, setMotivo] = useState('')
  const [origen, setOrigen] = useState('Av. Médicos del Chaco esquina Guarambaré')
  const [ciudad, setCiudad] = useState('Asunción')
  const [rucReceptor, setRucReceptor] = useState('')
  const [dirEntrega, setDirEntrega] = useState('')
  const [notas, setNotas] = useState('')
  const [items, setItems] = useState([{ ...EMPTY_ITEM }])

  useEffect(() => {
    dispatch(fetchRemitos())
    dispatch(fetchClientes())
    dispatch(fetchProductos({ activo: true }))
  }, [])

  const listaFiltrada = remitos.filter(r =>
    !buscar || (r.numero + (r.cliente_nombre || '')).toLowerCase().includes(buscar.toLowerCase())
  )

  function abrirNuevo() {
    setEditId(null); setFecha(today()); setDestNombre(''); setMotivo('')
    setOrigen('Av. Médicos del Chaco esquina Guarambaré'); setCiudad('Asunción')
    setRucReceptor(''); setDirEntrega(''); setNotas(''); setItems([{ ...EMPTY_ITEM }])
    setModal(true)
  }

  async function abrirEditar(id) {
    const res = await dispatch(fetchRemito(id)).unwrap()
    setEditId(id)
    setFecha(res.fecha?.slice(0, 10) || today())
    setDestNombre(res.cliente_nombre || '')
    setMotivo(res.motivo_traslado || '')
    setOrigen(res.direccion_origen || '')
    setCiudad(res.ciudad_origen || '')
    setRucReceptor(res.ruc_receptor || '')
    setDirEntrega(res.direccion_entrega || '')
    setNotas(res.notas || '')
    setItems((res.items || []).map(it => ({ descripcion: it.descripcion, qty: parseFloat(it.cantidad), unidad: it.unidad })))
    setModal(true)
  }

  async function verDoc(id) {
    await dispatch(fetchRemito(id))
    setDocModal(true)
  }

  function addItem() { setItems(prev => [...prev, { ...EMPTY_ITEM }]) }
  function removeItem(i) { setItems(prev => prev.filter((_, idx) => idx !== i)) }
  function updateItem(i, field, value) {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: value } : it))
  }
  function selProducto(i, e) {
    const opt = e.target.options[e.target.selectedIndex]
    if (!opt.dataset.desc) return
    updateItem(i, 'descripcion', opt.dataset.desc)
  }

  async function guardar() {
    if (!destNombre.trim()) { toast.error('Indicá el destinatario'); return }
    const itsValidos = items.filter(it => it.descripcion.trim())
    if (!itsValidos.length) { toast.error('Agregá al menos un ítem'); return }
    const cliente = clientes.find(c => c.nombre.toLowerCase() === destNombre.toLowerCase())
    if (!cliente) { toast.error('Destinatario no encontrado. Crealo primero en Clientes.'); return }

    setSaving(true)
    try {
      const body = {
        cliente_id: cliente.id, motivo_traslado: motivo, direccion_origen: origen,
        ciudad_origen: ciudad, direccion_entrega: dirEntrega, ruc_receptor: rucReceptor, notas,
        items: itsValidos.map(it => ({
          descripcion: it.descripcion, cantidad: parseFloat(it.qty) || 1, unidad: it.unidad,
        })),
      }
      if (editId) {
        await dispatch(actualizarRemito({ id: editId, data: body })).unwrap()
        toast.success('Remito actualizado')
      } else {
        await dispatch(crearRemito(body)).unwrap()
        toast.success('Remito guardado')
      }
      setModal(false)
    } catch (e) { toast.error(e) }
    setSaving(false)
  }

  function imprimir() {
    const w = window.open('', '_blank')
    w.document.write(`<html><head><title>Remito ${current?.numero}</title>
    <style>body{font-family:Arial,sans-serif;font-size:13px;color:#222;padding:30px;max-width:820px;margin:0 auto}
    table{width:100%;border-collapse:collapse;margin:12px 0}
    th{background:#f4f4f4;text-align:left;padding:7px 10px;font-size:11px;border:1px solid #ddd;text-transform:uppercase}
    td{padding:7px 10px;border:1px solid #eee}
    </style></head><body>${docContent()}</body></html>`)
    w.document.close(); w.print()
  }

  function docContent() {
    if (!current) return ''
    const rows = (current.items || []).map(it =>
      `<tr><td>${it.descripcion}</td><td style="text-align:center">${it.cantidad}</td><td style="text-align:center">${it.unidad}</td></tr>`
    ).join('')
    return `
      <div style="display:flex;justify-content:space-between;padding-bottom:14px;border-bottom:3px solid #1B2A6B;margin-bottom:20px">
        <div>
          <div style="font-size:20px;font-weight:bold;color:#1B2A6B">${EMPRESA.nombre}</div>
          <div style="font-size:11px;color:#888;margin-top:4px">Corte · Plegado · Herrería · Materiales</div>
          <div style="font-size:11px;color:#666;margin-top:6px;line-height:1.8">
            Dirección: ${EMPRESA.direccion}<br>Correo: ${EMPRESA.email}<br>Teléfono: ${EMPRESA.telefono}
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.5px">Nota de Remisión</div>
          <div style="font-size:24px;font-weight:bold;font-family:monospace;color:#1B2A6B">${current.numero}</div>
          <div style="font-size:12px;color:#888">${fmtDate(current.fecha)}</div>
        </div>
      </div>
      <table style="margin-bottom:16px">
        <tr><td width="180"><b>Motivo de traslado:</b></td><td>${current.motivo_traslado || '—'}</td></tr>
        <tr><td><b>Punto de partida:</b></td><td>${current.direccion_origen || '—'}</td></tr>
        <tr><td><b>Ciudad de origen:</b></td><td>${current.ciudad_origen || '—'}</td></tr>
        <tr><td><b>Destinatario:</b></td><td>${current.cliente_nombre}</td></tr>
        <tr><td><b>Dirección de entrega:</b></td><td>${current.direccion_entrega || '—'}</td></tr>
        <tr><td><b>RUC del receptor:</b></td><td>${current.ruc_receptor || '—'}</td></tr>
      </table>
      <table>
        <thead><tr><th>Descripción</th><th>Cantidad</th><th>Unidad</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${current.notas ? `<p style="font-size:12px;margin-top:10px;color:#555">Obs.: ${current.notas}</p>` : ''}
      <div style="margin-top:60px;display:flex;justify-content:space-between">
        <div style="text-align:center;border-top:1px solid #ccc;padding-top:6px;width:200px;font-size:11px;color:#888">Firma recepción</div>
        <div style="text-align:center;border-top:1px solid #ccc;padding-top:6px;width:200px;font-size:11px;color:#888">Responsable despacho</div>
      </div>
    `
  }

  if (loading && remitos.length === 0) return <LoadingScreen />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#1B2A6B]">Remitos / Notas de Remisión</h1>
          <p className="text-sm text-[#6b72a0] mt-1">{remitos.length} remitos registrados</p>
        </div>
        <Button variant="primary" onClick={abrirNuevo}><IconPlus size={15} /> Nuevo remito</Button>
      </div>

      <Card>
        <div className="px-5 py-4">
          <input value={buscar} onChange={e => setBuscar(e.target.value)}
            placeholder="Buscar por número o destinatario..."
            className="w-full px-3 py-2 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B]" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {['Número', 'Fecha', 'Destinatario', 'Motivo', ''].map((h, i) => (
                  <th key={i} className="text-left text-[11px] font-medium text-[#6b72a0] uppercase tracking-wide px-4 py-2.5 bg-[#f5f6fb] border-b border-[#d0d4e8]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {listaFiltrada.length === 0 ? (
                <tr><td colSpan={5}><div className="flex flex-col items-center py-12 text-[#6b72a0]"><IconTruck size={40} className="opacity-25 mb-3" /><span className="text-sm">Sin remitos</span></div></td></tr>
              ) : listaFiltrada.map(r => (
                <tr key={r.id} className="hover:bg-[#f8f9fd] border-b border-[#e5e8f5] last:border-0">
                  <td className="px-4 py-3 font-mono text-sm font-semibold">{r.numero}</td>
                  <td className="px-4 py-3 text-sm">{fmtDate(r.fecha)}</td>
                  <td className="px-4 py-3 text-sm font-medium">{r.cliente_nombre || '—'}</td>
                  <td className="px-4 py-3 text-sm text-[#6b72a0]">{r.motivo_traslado || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <Button size="sm" onClick={() => verDoc(r.id)} title="Ver documento"><IconEye size={13} /></Button>
                      <Button size="sm" variant="secondary" onClick={() => abrirEditar(r.id)} title="Editar"><IconEdit size={13} /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal crear/editar */}
      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Editar remito' : 'Nueva nota de remisión'} size="xl"
        footer={<><Button onClick={() => setModal(false)}>Cancelar</Button><Button variant="primary" loading={saving} onClick={guardar}>Guardar</Button></>}>
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#6b72a0]">Fecha</label>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
              className="px-3 py-2 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B]" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#6b72a0]">Destinatario *</label>
            <input value={destNombre} onChange={e => setDestNombre(e.target.value)}
              list="cli-rem-list" placeholder="Nombre o empresa"
              className="px-3 py-2 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B]" />
            <datalist id="cli-rem-list">
              {clientes.map(c => <option key={c.id} value={c.nombre} />)}
            </datalist>
          </div>
          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-xs font-medium text-[#6b72a0]">Motivo de traslado</label>
            <input value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ej: Venta, Traslado entre depósitos, Devolución..."
              className="px-3 py-2 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B]" />
          </div>
          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-xs font-medium text-[#6b72a0]">Dirección punto de partida</label>
            <input value={origen} onChange={e => setOrigen(e.target.value)}
              className="px-3 py-2 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B]" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#6b72a0]">Ciudad origen</label>
            <input value={ciudad} onChange={e => setCiudad(e.target.value)} placeholder="Ej: Asunción"
              className="px-3 py-2 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B]" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#6b72a0]">RUC del receptor</label>
            <input value={rucReceptor} onChange={e => setRucReceptor(e.target.value)} placeholder="RUC"
              className="px-3 py-2 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B]" />
          </div>
          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-xs font-medium text-[#6b72a0]">Dirección de entrega</label>
            <input value={dirEntrega} onChange={e => setDirEntrega(e.target.value)} placeholder="Dirección destino"
              className="px-3 py-2 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B]" />
          </div>
        </div>

        <div className="mb-2 text-xs font-semibold text-[#6b72a0] uppercase tracking-wide">Ítems</div>
        <div className="space-y-2 mb-3">
          {items.map((it, i) => (
            <div key={i} className="grid gap-2 items-start" style={{ gridTemplateColumns: '2fr 70px 110px auto' }}>
              <div className="flex flex-col gap-1">
                <select onChange={e => selProducto(i, e)}
                  className="w-full px-2 py-1.5 border border-[#d0d4e8] rounded text-xs outline-none focus:border-[#1B2A6B] mb-1">
                  <option value="">— Seleccionar del inventario —</option>
                  {productos.map(p => <option key={p.id} value={p.id} data-desc={p.descripcion}>{p.descripcion}</option>)}
                </select>
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
              <button onClick={() => removeItem(i)} className="p-1.5 rounded bg-red-50 text-red-500 hover:bg-red-100">
                <IconX size={13} />
              </button>
            </div>
          ))}
        </div>
        <Button size="sm" onClick={addItem}><IconPlus size={13} /> Agregar ítem</Button>

        <div className="mt-4 flex flex-col gap-1">
          <label className="text-xs font-medium text-[#6b72a0]">Observaciones</label>
          <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2}
            className="px-3 py-2 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B] resize-y" />
        </div>
      </Modal>

      {/* Modal documento */}
      <Modal open={docModal} onClose={() => setDocModal(false)} title={`Nota de Remisión ${current?.numero || ''}`} size="xl"
        footer={<><Button onClick={() => setDocModal(false)}>Cerrar</Button><Button variant="secondary" onClick={imprimir}><IconPrinter size={14} /> Imprimir</Button></>}>
        {current && <div dangerouslySetInnerHTML={{ __html: docContent() }} />}
      </Modal>
    </div>
  )
}
