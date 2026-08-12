// src/components/shared/ExportButton.jsx
import { useState, useRef, useEffect } from 'react'
import toast from 'react-hot-toast'
import { IconDownload, IconFileSpreadsheet, IconFileTypePdf, IconLoader2 } from '@tabler/icons-react'
import { descargarArchivo } from '../../utils/descargarArchivo'

// Botón "Exportar" con desplegable Excel / PDF. Pide el mismo endpoint dos
// veces (una por formato) agregando ?formato=xlsx|pdf, y descarga el archivo.
//
// Uso:
// <ExportButton url="/contabilidad/balance/exportar" params={{ desde, hasta }} />
export default function ExportButton({ url, params = {}, label = 'Exportar', className = '' }) {
  const [abierto, setAbierto] = useState(false)
  const [descargando, setDescargando] = useState(null) // 'xlsx' | 'pdf' | null
  const ref = useRef(null)

  useEffect(() => {
    function alClickAfuera(e) {
      if (ref.current && !ref.current.contains(e.target)) setAbierto(false)
    }
    document.addEventListener('mousedown', alClickAfuera)
    return () => document.removeEventListener('mousedown', alClickAfuera)
  }, [])

  async function exportar(formato) {
    setDescargando(formato)
    setAbierto(false)
    try {
      await descargarArchivo(url, { ...params, formato })
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo generar el archivo.')
    } finally {
      setDescargando(null)
    }
  }

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        disabled={!!descargando}
        className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-[#d0d4e8] bg-white text-[#1a1f3a] hover:bg-[#f0f2f8] transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        {descargando ? <IconLoader2 size={14} className="animate-spin" /> : <IconDownload size={14} />}
        {label}
      </button>

      {abierto && (
        <div className="absolute right-0 mt-1 w-44 bg-white border border-[#e5e8f5] rounded-lg shadow-lg z-20 overflow-hidden">
          <button
            type="button"
            onClick={() => exportar('xlsx')}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#1a1f3a] hover:bg-[#f0f2f8] transition-colors"
          >
            <IconFileSpreadsheet size={15} className="text-[#2a7a3b]" /> Excel (.xlsx)
          </button>
          <button
            type="button"
            onClick={() => exportar('pdf')}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#1a1f3a] hover:bg-[#f0f2f8] transition-colors border-t border-[#e5e8f5]"
          >
            <IconFileTypePdf size={15} className="text-[#A32D2D]" /> PDF
          </button>
        </div>
      )}
    </div>
  )
}
