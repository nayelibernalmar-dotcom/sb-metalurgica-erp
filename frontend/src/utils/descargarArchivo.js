// src/utils/descargarArchivo.js
import apiClient from '../services/apiClient'

// Pide un endpoint que devuelve un archivo (Excel/PDF) como blob y dispara la
// descarga en el navegador, respetando el nombre de archivo que manda el backend
// en el header Content-Disposition.
export async function descargarArchivo(url, params = {}) {
  const response = await apiClient.get(url, { params, responseType: 'blob' })

  const disposition = response.headers['content-disposition'] || ''
  const match = disposition.match(/filename="?([^"]+)"?/)
  const nombreArchivo = match ? match[1] : 'archivo'

  const blobUrl = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = nombreArchivo
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(blobUrl)
}
