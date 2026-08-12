// src/utils/format.js

export const fmt = (n) => 'Gs. ' + Number(Math.round(n || 0)).toLocaleString('es-PY')
export const fmtN = (n) => Number(Math.round(n || 0)).toLocaleString('es-PY')
export const fmtDate = (d) => {
  if (!d) return '—'
  return d.slice(0, 10).split('-').reverse().join('/')
}
export const today = () => new Date().toISOString().slice(0, 10)
export const getWeekRange = (dateStr) => {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const mon = new Date(d)
  mon.setDate(d.getDate() + diff)
  const sat = new Date(mon)
  sat.setDate(mon.getDate() + 5)
  return {
    start: mon.toISOString().slice(0, 10),
    end: sat.toISOString().slice(0, 10),
  }
}
