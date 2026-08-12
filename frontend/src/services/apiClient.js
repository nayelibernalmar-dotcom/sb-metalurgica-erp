// src/services/apiClient.js
// Cliente HTTP centralizado. Todas las llamadas a la API pasan por acá.
// El interceptor agrega el token JWT automáticamente en cada pedido.
// Si el servidor devuelve 401 (token vencido), cierra sesión automáticamente.

import axios from 'axios'

// Usa VITE_API_URL si está definida (frontend/.env). Si no existe (por ejemplo,
// alguien clonó el proyecto y todavía no creó su .env), cae en localhost:3000/api
// en vez de fallar en silencio contra el propio puerto del frontend.
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

// Antes de cada pedido: agrega el token si existe
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('sbm_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Después de cada respuesta: si el servidor dice 401, limpiar sesión
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('sbm_token')
      localStorage.removeItem('sbm_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default apiClient
