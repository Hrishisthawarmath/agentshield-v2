import { verdictOf } from '../lib/requests.js'

export const TONE = {
  safe: { chip: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800', dot: 'bg-emerald-500', bar: '#10b981', text: 'text-emerald-700 dark:text-emerald-400' },
  review: { chip: 'bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800', dot: 'bg-amber-500', bar: '#f59e0b', text: 'text-amber-800 dark:text-amber-300' },
  blocked: { chip: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800', dot: 'bg-red-500', bar: '#ef4444', text: 'text-red-700 dark:text-red-400' },
  info: { chip: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800', dot: 'bg-blue-500', bar: '#3b82f6', text: 'text-blue-700 dark:text-blue-400' },
  neutral: { chip: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700', dot: 'bg-slate-400', bar: '#64748b', text: 'text-slate-600 dark:text-slate-400' },
}

export function Badge({ tone = 'neutral', children }) {
  const t = TONE[tone] || TONE.neutral
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${t.chip}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />
      {children}
    </span>
  )
}

export function Card({ className = '', children }) {
  return <div className={`card p-5 ${className}`}>{children}</div>
}

export function Stat({ label, value, sub, delta, deltaTone = 'info' }) {
  const dt = TONE[deltaTone] || TONE.info
  return (
    <div className="card p-5">
      <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">{value}</div>
      {delta ? <div className={`mt-1.5 text-xs font-semibold ${dt.text}`}>{delta}</div> : null}
      {sub ? <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{sub}</div> : null}
    </div>
  )
}

export function LivePill() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 pulse-dot" /> Live
    </span>
  )
}

export function ScoreBar({ score, level }) {
  const v = verdictOf({ level })
  const tone = TONE[v.tone]
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Risk score</span>
        <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {score}
          <span className="text-sm font-medium text-slate-400 dark:text-slate-500"> / 100</span>
        </span>
      </div>
      <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.max(2, score)}%`, background: tone.bar }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
        <span>0 · Safe</span>
        <span>30 · Review</span>
        <span>60 · Block</span>
        <span>100</span>
      </div>
    </div>
  )
}

export function EmptyState({ title, body }) {
  return (
    <div className="card p-8 text-center">
      <div className="text-base font-semibold text-slate-800 dark:text-slate-200">{title}</div>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">{body}</p>
    </div>
  )
}

export function timeAgo(ts) {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} hr ago`
  return `${Math.floor(h / 24)} d ago`
}

export function fmtTime(ts) {
  return new Date(ts).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
