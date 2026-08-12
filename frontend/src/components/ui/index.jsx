// src/components/ui/index.jsx
// Componentes UI reutilizables en toda la app

import { IconX, IconLoader2 } from '@tabler/icons-react'

// ─── BUTTON ───────────────────────────────────────────────
export function Button({ children, variant = 'default', size = 'md', loading, className = '', ...props }) {
  const base = 'inline-flex items-center gap-2 font-medium rounded-lg transition-all duration-150 cursor-pointer border disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    default: 'bg-white border-[#d0d4e8] text-[#1a1f3a] hover:bg-[#f0f2f8]',
    primary: 'bg-[#1B2A6B] border-[#1B2A6B] text-white hover:bg-[#14205a]',
    secondary: 'bg-[#F5C433] border-[#F5C433] text-[#1a1f3a] hover:bg-[#e0b020]',
    danger: 'bg-[#A32D2D] border-[#A32D2D] text-white hover:bg-[#8a2525]',
    success: 'bg-[#2a7a3b] border-[#2a7a3b] text-white hover:bg-[#236633]',
    ghost: 'bg-transparent border-transparent text-[#6b72a0] hover:bg-[#f0f2f8] hover:text-[#1a1f3a]',
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  }
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} disabled={loading} {...props}>
      {loading && <IconLoader2 size={14} className="animate-spin" />}
      {children}
    </button>
  )
}

// ─── BADGE ────────────────────────────────────────────────
export function Badge({ children, variant = 'gray' }) {
  const variants = {
    green: 'bg-[#d4edda] text-[#2a7a3b]',
    red: 'bg-[#FCEBEB] text-[#A32D2D]',
    amber: 'bg-[#fff3cd] text-[#856404]',
    blue: 'bg-[#e8ecf8] text-[#1B2A6B]',
    gold: 'bg-[#fff8e0] text-[#8a6a00]',
    gray: 'bg-[#eef0f8] text-[#6b72a0]',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  )
}

// ─── MODAL ────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  if (!open) return null
  const sizes = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-2xl', xl: 'max-w-4xl' }
  return (
    <div className="fixed inset-0 bg-[rgba(10,15,50,0.5)] flex items-center justify-center z-50 p-4"
         onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`bg-white rounded-xl w-full ${sizes[size]} max-h-[90vh] flex flex-col shadow-2xl`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#d0d4e8] bg-[#f5f6fb] rounded-t-xl sticky top-0">
          <h2 className="text-[15px] font-semibold text-[#1B2A6B]">{title}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-[#e8ecf8] text-[#6b72a0]">
            <IconX size={16} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-6">{children}</div>
        {footer && (
          <div className="px-6 py-3 border-t border-[#d0d4e8] flex gap-2 justify-end bg-white rounded-b-xl sticky bottom-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── CARD ─────────────────────────────────────────────────
export function Card({ children, className = '' }) {
  return <div className={`bg-white border border-[#d0d4e8] rounded-xl overflow-hidden ${className}`}>{children}</div>
}
export function CardHeader({ children, className = '' }) {
  return <div className={`px-5 py-3.5 border-b border-[#d0d4e8] flex items-center justify-between ${className}`}>{children}</div>
}
export function CardTitle({ children, icon: Icon }) {
  return (
    <div className="flex items-center gap-2 text-[14px] font-semibold text-[#1a1f3a]">
      {Icon && <Icon size={16} className="text-[#1B2A6B]" />}
      {children}
    </div>
  )
}

// ─── STAT CARD ────────────────────────────────────────────
export function StatCard({ label, value, sub, accent = 'blue' }) {
  const accents = {
    blue: 'border-l-[#1B2A6B]',
    gold: 'border-l-[#F5C433]',
    green: 'border-l-[#2a7a3b]',
    warn: 'border-l-[#c47a00]',
    danger: 'border-l-[#A32D2D]',
  }
  return (
    <div className={`bg-white border border-[#d0d4e8] border-l-4 ${accents[accent]} rounded-xl p-4`}>
      <div className="text-[11px] font-medium text-[#6b72a0] uppercase tracking-wide mb-1">{label}</div>
      <div className="text-[22px] font-semibold text-[#1a1f3a] font-mono">{value}</div>
      {sub && <div className="text-[11px] text-[#6b72a0] mt-1">{sub}</div>}
    </div>
  )
}

// ─── TABLE ────────────────────────────────────────────────
export function Table({ columns, data, emptyIcon: EmptyIcon, emptyText = 'Sin datos', renderRow }) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          {columns.map((col, i) => (
            <th key={i} className="text-left text-[11px] font-medium text-[#6b72a0] uppercase tracking-wide px-4 py-2.5 bg-[#f5f6fb] border-b border-[#d0d4e8]">
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.length === 0 ? (
          <tr>
            <td colSpan={columns.length}>
              <div className="flex flex-col items-center justify-center py-12 text-[#6b72a0]">
                {EmptyIcon && <EmptyIcon size={40} className="opacity-30 mb-3" />}
                <span className="text-sm">{emptyText}</span>
              </div>
            </td>
          </tr>
        ) : data.map((row, i) => (
          <tr key={row.id || i} className="hover:bg-[#f8f9fd] border-b border-[#e5e8f5] last:border-0">
            {renderRow(row)}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ─── INPUT / SELECT / TEXTAREA ────────────────────────────
const inputBase = 'w-full px-3 py-2 border border-[#d0d4e8] rounded-lg text-sm text-[#1a1f3a] bg-white outline-none transition-all focus:border-[#1B2A6B] focus:ring-2 focus:ring-[#1B2A6B]/10 font-sans'

export function Input({ label, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-medium text-[#6b72a0]">{label}</label>}
      <input className={`${inputBase} ${error ? 'border-red-400' : ''} ${className}`} {...props} />
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  )
}

export function Select({ label, error, children, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-medium text-[#6b72a0]">{label}</label>}
      <select className={`${inputBase} ${error ? 'border-red-400' : ''} ${className}`} {...props}>
        {children}
      </select>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  )
}

export function Textarea({ label, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-medium text-[#6b72a0]">{label}</label>}
      <textarea className={`${inputBase} resize-y min-h-[70px] ${error ? 'border-red-400' : ''} ${className}`} {...props} />
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  )
}

// ─── LOADING SPINNER ──────────────────────────────────────
export function Spinner({ size = 20 }) {
  return <IconLoader2 size={size} className="animate-spin text-[#1B2A6B]" />
}

export function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-64">
      <Spinner size={32} />
    </div>
  )
}

// ─── EMPTY STATE ──────────────────────────────────────────
export function EmptyState({ icon: Icon, text }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-[#6b72a0]">
      {Icon && <Icon size={48} className="opacity-25 mb-3" />}
      <span className="text-sm">{text}</span>
    </div>
  )
}

// ─── FORM GRID ────────────────────────────────────────────
export function FormGrid({ children, cols = 2 }) {
  return (
    <div className={`grid grid-cols-${cols} gap-4`}>
      {children}
    </div>
  )
}

export function FormRow({ children }) {
  return <div className="col-span-2">{children}</div>
}
