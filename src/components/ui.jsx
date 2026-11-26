import { forwardRef } from 'react'

export const cx = (...c) => c.filter(Boolean).join(' ')

export const TONE = {
  SAFE: 'text-emerald-300 bg-emerald-500/10 ring-emerald-500/30',
  ALLOW: 'text-emerald-300 bg-emerald-500/10 ring-emerald-500/30',
  ALLOWED: 'text-emerald-300 bg-emerald-500/10 ring-emerald-500/30',
  EXECUTED: 'text-emerald-300 bg-emerald-500/10 ring-emerald-500/30',
  APPROVED: 'text-emerald-300 bg-emerald-500/10 ring-emerald-500/30',
  ONLINE: 'text-emerald-300 bg-emerald-500/10 ring-emerald-500/30',
  ACTIVE: 'text-emerald-300 bg-emerald-500/10 ring-emerald-500/30',
  LOW: 'text-yellow-300 bg-yellow-500/10 ring-yellow-500/30',
  REVIEW: 'text-amber-300 bg-amber-500/10 ring-amber-500/30',
  PENDING: 'text-amber-300 bg-amber-500/10 ring-amber-500/30',
  WARNING: 'text-amber-300 bg-amber-500/10 ring-amber-500/30',
  MEDIUM: 'text-amber-300 bg-amber-500/10 ring-amber-500/30',
  ELEVATED: 'text-amber-300 bg-amber-500/10 ring-amber-500/30',
  HIGH: 'text-orange-300 bg-orange-500/10 ring-orange-500/30',
  CRITICAL: 'text-red-300 bg-red-500/12 ring-red-500/40',
  BLOCK: 'text-red-300 bg-red-500/12 ring-red-500/40',
  BLOCKED: 'text-red-300 bg-red-500/12 ring-red-500/40',
  REJECTED: 'text-red-300 bg-red-500/12 ring-red-500/40',
  COMPROMISED: 'text-red-200 bg-red-600/25 ring-red-500/60',
  INFO: 'text-sky-300 bg-sky-500/10 ring-sky-500/30',
  NONE: 'text-slate-300 bg-slate-500/10 ring-slate-500/30',
}
export const TEXT = { SAFE: 'text-emerald-400', LOW: 'text-yellow-300', HIGH: 'text-orange-400', CRITICAL: 'text-red-400', ALLOW: 'text-emerald-400', REVIEW: 'text-amber-400', BLOCK: 'text-red-400' }
export const HEX = { SAFE: '#34d399', LOW: '#facc15', HIGH: '#fb923c', CRITICAL: '#f87171', ALLOW: '#34d399', REVIEW: '#fbbf24', BLOCK: '#f87171', INFO: '#38bdf8', COMPROMISED: '#dc2626' }
export const levelOfScore = (s) => (s >= 80 ? 'CRITICAL' : s >= 60 ? 'HIGH' : s >= 30 ? 'LOW' : 'SAFE')

export function Badge({ value, children, className, dot }) {
  const v = value || children
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide ring-1 ring-inset whitespace-nowrap', TONE[v] || TONE.NONE, className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}{children || value}
    </span>
  )
}

export const Card = forwardRef(function Card({ className, children, ...p }, ref) {
  return <section ref={ref} className={cx('glass min-w-0 rounded-xl', className)} {...p}>{children}</section>
})

export function CardHeader({ icon: Icon, title, subtitle, right, className }) {
  return (
    <div className={cx('flex items-start justify-between gap-3 border-b border-white/[0.06] px-5 py-3.5', className)}>
      <div className="flex items-center gap-3 min-w-0">
        {Icon && <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20"><Icon size={16} /></span>}
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-100 truncate">{title}</h2>
          {subtitle && <p className="text-xs text-slate-400 truncate">{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  )
}

export function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-400">{eyebrow}</p>}
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white md:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 max-w-3xl text-sm text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

const BTN = {
  primary: 'bg-blue-600 text-white hover:bg-blue-500 shadow-[0_8px_24px_-10px_rgba(37,99,235,.8)]',
  secondary: 'bg-white/[0.04] text-slate-200 ring-1 ring-inset ring-white/10 hover:bg-white/[0.08]',
  danger: 'bg-red-600/90 text-white hover:bg-red-500',
  success: 'bg-emerald-600/90 text-white hover:bg-emerald-500',
  ghost: 'text-slate-300 hover:bg-white/[0.06]',
}
export function Button({ variant = 'secondary', icon: Icon, className, children, size = 'md', ...p }) {
  return (
    <button className={cx('inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-40',
      size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-sm', BTN[variant], className)} {...p}>
      {Icon && <Icon size={size === 'sm' ? 13 : 15} />}{children}
    </button>
  )
}

export function Stat({ label, value, icon: Icon, tone = 'text-white', hint }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between text-xs font-medium text-slate-400">
        <span>{label}</span>{Icon && <Icon size={15} className="text-slate-500" />}
      </div>
      <div className={cx('mt-2 font-mono text-[28px] font-semibold leading-none tabular-nums', tone)}>{value}</div>
      {hint && <div className="mt-1.5 text-[11px] text-slate-500">{hint}</div>}
    </Card>
  )
}

export function RiskGauge({ score, size = 150 }) {
  const level = levelOfScore(score)
  const r = 54; const c = Math.PI * r
  return (
    <div className="relative" style={{ width: size, height: size * 0.62 }} role="img" aria-label={`Risk score ${score} of 100, ${level}`}>
      <svg viewBox="0 0 140 80" className="h-full w-full">
        <path d="M16 72 A54 54 0 0 1 124 72" fill="none" stroke="rgba(148,163,184,.15)" strokeWidth="10" strokeLinecap="round" />
        <path d="M16 72 A54 54 0 0 1 124 72" fill="none" stroke={HEX[level]} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} style={{ transition: 'stroke-dashoffset .8s ease' }} />
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <div className="font-mono text-3xl font-bold leading-none text-white">{score}<span className="text-sm text-slate-500">/100</span></div>
        <div className={cx('mt-1 text-[11px] font-bold tracking-widest', TEXT[level])}>{level}</div>
      </div>
    </div>
  )
}

export function Highlighted({ text, ranges }) {
  if (!ranges?.length) return <>{text}</>
  const out = []; let i = 0
  const merged = []
  for (const [a, b] of ranges) { const last = merged[merged.length - 1]; if (last && a <= last[1]) last[1] = Math.max(last[1], b); else merged.push([a, b]) }
  merged.forEach(([a, b], k) => { if (a > i) out.push(text.slice(i, a)); out.push(<mark key={k} className="hl">{text.slice(a, b)}</mark>); i = b })
  out.push(text.slice(i))
  return <>{out}</>
}

export const fmtTime = (ts) => new Date(ts).toLocaleTimeString('en-GB', { hour12: false })
export const fmtArgs = (args) => Object.entries(args).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(', ')

export function Empty({ children }) {
  return <div className="px-5 py-10 text-center text-sm text-slate-500">{children}</div>
}
