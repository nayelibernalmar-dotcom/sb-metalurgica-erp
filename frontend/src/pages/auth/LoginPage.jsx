// src/pages/auth/LoginPage.jsx
import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { login, clearError } from '../../app/slices/authSlice'
import { Button, Input } from '../../components/ui'
import { IconLock, IconMail } from '@tabler/icons-react'

export default function LoginPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { loading, error, token } = useSelector((s) => s.auth)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (token) navigate('/dashboard', { replace: true })
    return () => dispatch(clearError())
  }, [token])

  async function handleSubmit(e) {
    e.preventDefault()
    const result = await dispatch(login({ email, password }))
    if (result.meta.requestStatus === 'fulfilled') {
      navigate('/dashboard', { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-[#1B2A6B] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#F5C433] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-[#1B2A6B] font-bold text-2xl">SB</span>
          </div>
          <h1 className="text-white text-xl font-semibold">SB Metalúrgica SA</h1>
          <p className="text-white/50 text-sm mt-1">Sistema de Gestión Integral</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 shadow-2xl">
          <h2 className="text-[#1B2A6B] text-[16px] font-semibold mb-6">Iniciá sesión</h2>

          <div className="space-y-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[#6b72a0]">Email</label>
              <div className="relative">
                <IconMail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b72a0]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@sbmetalurgica.com"
                  required
                  autoFocus
                  className="w-full pl-9 pr-3 py-2.5 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B] focus:ring-2 focus:ring-[#1B2A6B]/10 transition-all"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[#6b72a0]">Contraseña</label>
              <div className="relative">
                <IconLock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b72a0]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-9 pr-3 py-2.5 border border-[#d0d4e8] rounded-lg text-sm outline-none focus:border-[#1B2A6B] focus:ring-2 focus:ring-[#1B2A6B]/10 transition-all"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            loading={loading}
            className="w-full mt-6 justify-center py-2.5"
          >
            {loading ? 'Iniciando sesión...' : 'Ingresar al sistema'}
          </Button>
        </form>

        <p className="text-center text-white/30 text-xs mt-6">
          SB Metalúrgica SA © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
