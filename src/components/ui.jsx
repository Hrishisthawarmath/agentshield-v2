import React from 'react'

export const Panel = ({ className = '', children, bracket = false, ...p }) => (
  <div className={`panel ${bracket ? 'bracket' : ''} ${className}`} {...p}>{children}</div>
)

export const SectionTitle = ({ kicker, title, tag, right }) => (
  <div className="flex items-start justify-between gap-4 mb-4">
    <div>
      <div className="flex items-center gap-2"><span className="label">{kicker}</span>{tag && <Tag color="amber">{tag}</Tag>}</div>
      <h2 className="text-lg font-bold text-white mt-1">{title}</h2>
    </div>
    {right}
  </div>
)

const TAGS = {
  cyan: 'text-cyan-300 border-cyan-500/40 bg-cyan-500/10',
  emerald: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10',
  amber: 'text-amber-300 border-amber-500/40 bg-amber-500/10',
  rose: 'text-rose-300 border-rose-500/40 bg-rose-500/10',
  slate: 'text-slate-300 border-slate-600/60 bg-slate-700/20',
  violet: 'text-violet-300 border-violet-500/40 bg-violet-500/10',
}
export const Tag = ({ color = 'cyan', children, className = '' }) => (
  <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider uppercase ${TAGS[color]} ${className}`}>{children}</span>
)

export const decisionColor = (d) => ({ BLOCK: 'rose', FLAG: 'amber', ALLOW: 'emerald', EXECUTED: 'violet', COMPROMISED: 'rose', BLOCKED: 'cyan', SAFE: 'emerald', HIGH: 'rose', MEDIUM: 'amber', LOW: 'emerald' })[d] || 'slate'
export const Decision = ({ d }) => <Tag color={decisionColor(d)}>{d}</Tag>

export const riskHex = (s) => (s >= 60 ? '#f43f5e' : s >= 30 ? '#f59e0b' : '#10b981')

export const Stat = ({ label, value, sub, color = 'text-white', badge }) => (
  <Panel bracket className="p-5">
    <div className="flex items-start justify-between gap-2"><div className="label truncate">{label}</div>{badge}</div>
    <div className={`mt-3 text-2xl font-extrabold ${color}`}>{value}</div>
    {sub && <div className="mt-1 font-mono text-[11px] text-slate-400">{sub}</div>}
  </Panel>
)

export const Gauge = ({ score, size = 150, label = 'RISK' }) => {
  const r = size / 2 - 12
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, score)) / 100
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#1e293b" strokeWidth="10" fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} stroke={riskHex(score)} strokeWidth="10" fill="none" strokeLinecap="round"
        strokeDasharray={`${c * pct} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: 'stroke-dasharray .6s ease', filter: `drop-shadow(0 0 6px ${riskHex(score)})` }} />
      <text x="50%" y="48%" textAnchor="middle" fill="#fff" fontSize={size / 4.2} fontWeight="800" fontFamily="Inter">{score}</text>
      <text x="50%" y="64%" textAnchor="middle" fill="#94a3b8" fontSize="10" letterSpacing="3" fontFamily="JetBrains Mono">{label}</text>
    </svg>
  )
}

export const Btn = ({ variant = 'ghost', className = '', children, ...p }) => {
  const v = {
    primary: 'bg-cyan-400 text-slate-950 hover:bg-cyan-300 glow',
    ghost: 'border border-slate-700 bg-slate-900/60 text-slate-200 hover:border-cyan-500/60 hover:text-cyan-200',
    danger: 'border border-rose-500/50 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20',
    success: 'border border-emerald-500/50 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20',
  }[variant]
  return <button className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition disabled:opacity-40 ${v} ${className}`} {...p}>{children}</button>
}

export const highlight = (text, rules) => {
  const spans = rules.filter((r) => r.index != null).map((r) => [r.index, r.index + r.length, r.id]).sort((a, b) => a[0] - b[0])
  const out = []
  let pos = 0
  spans.forEach(([s, e, id], i) => {
    if (s < pos) return
    out.push(text.slice(pos, s))
    out.push(<mark key={i} className="inj" title={id}>{text.slice(s, e)}</mark>)
    pos = e
  })
  out.push(text.slice(pos))
  return out
}
