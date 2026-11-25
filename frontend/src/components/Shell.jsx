import React, { useEffect, useState } from 'react'
import { Bell, ChevronLeft, ChevronRight, Search } from 'lucide-react'

export function Sidebar({ nav, page, setPage, collapsed, setCollapsed, counts }) {
  return (
    <aside className={`${collapsed ? 'w-[76px]' : 'w-[250px]'} shrink-0 border-r border-slate-800/80 bg-[#050b16]/90 flex flex-col transition-all`}>
      <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-800/80 h-[68px]">
        <img src="./shield.svg" className="h-9 w-9" alt="" />
        {!collapsed && <div><div className="font-display text-lg font-bold tracking-[0.3em] text-white">AEGIS</div><div className="font-mono text-[9px] tracking-[0.2em] text-cyan-400 uppercase">Agent Injection Shield</div></div>}
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {nav.map(({ id, label, icon: Icon, badge }) => {
          const active = page === id
          const b = typeof badge === 'function' ? badge(counts) : badge
          return (
            <button key={id} title={label} onClick={() => setPage(id)}
              className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] transition border ${active ? 'border-cyan-500/40 bg-cyan-500/10 text-white shadow-[inset_3px_0_0_#22d3ee]' : 'border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}>
              <Icon size={17} className={active ? 'text-cyan-300' : ''} />
              {!collapsed && <span className="flex-1 text-left">{label}</span>}
              {!collapsed && b != null && <span className={`rounded border px-1.5 font-mono text-[10px] ${String(b).match(/^\d+$/) ? 'border-rose-500/40 bg-rose-500/10 text-rose-300' : 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'}`}>{b}</span>}
            </button>
          )
        })}
      </nav>
      {!collapsed && (
        <div className="m-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-emerald-300"><span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Guard Layer Active</div>
          <div className="mt-1 font-mono text-[10px] text-slate-400">Classifier · Heuristics · Tool Monitor</div>
        </div>
      )}
      <button onClick={() => setCollapsed(!collapsed)} className="m-3 mt-0 flex items-center justify-center gap-2 rounded-lg border border-slate-800 py-2 font-mono text-[11px] text-slate-400 hover:text-cyan-300">
        {collapsed ? <ChevronRight size={14} /> : <><ChevronLeft size={14} /> Collapse Sidebar</>}
      </button>
    </aside>
  )
}

export function Header({ threat, alerts, onSearch }) {
  const [now, setNow] = useState(new Date())
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t) }, [])
  const ist = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false })
  const utc = now.toLocaleTimeString('en-GB', { timeZone: 'UTC', hour12: false })
  const tc = threat === 'ELEVATED' ? 'border-rose-500/40 bg-rose-500/10 text-rose-300' : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
  return (
    <header className="h-[68px] shrink-0 flex items-center gap-4 border-b border-slate-800/80 bg-[#050b16]/80 px-5">
      <button onClick={onSearch} className="flex flex-1 max-w-md items-center gap-3 rounded-lg border border-slate-700/80 bg-slate-900/60 px-3 py-2 text-sm text-slate-400 hover:border-cyan-500/50">
        <Search size={16} /><span className="flex-1 text-left truncate">Scan text, tasks, tool calls, incidents...</span><kbd className="rounded border border-slate-700 px-1.5 font-mono text-[10px]">CTRL K</kbd>
      </button>
      <div className={`hidden md:flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-[11px] tracking-wider ${tc}`}>
        <span className="h-2 w-2 rounded-full bg-current animate-pulse" /> THREAT LEVEL · {threat}
      </div>
      <div className="ml-auto hidden lg:block text-right font-mono">
        <div className="text-[15px] font-bold text-white">{ist}<span className="ml-1 text-[10px] text-slate-400">IST</span></div>
        <div className="text-[10px] text-slate-500">{utc} UTC</div>
      </div>
      <button className="relative rounded-lg p-2 text-slate-300 hover:bg-slate-800" title="Alerts" aria-label={`${alerts} blocked actions`}>
        <Bell size={18} />{alerts > 0 && <span className="absolute -right-0.5 -top-0.5 rounded-full bg-rose-500 px-1 font-mono text-[9px] text-white">{alerts}</span>}
      </button>
      <div className="hidden sm:flex items-center gap-3 rounded-lg border border-slate-700/80 bg-slate-900/60 px-3 py-1.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-cyan-400 to-blue-600 text-xs font-bold text-slate-950">SO</div>
        <div><div className="text-[13px] font-semibold text-white">SOC Analyst</div><div className="font-mono text-[10px] text-emerald-400">● AI Risk Desk · Tier 2</div></div>
      </div>
    </header>
  )
}

export function Ticker({ items }) {
  const list = items.length ? items : ['Awaiting agent activity...']
  return (
    <div className="h-9 shrink-0 flex items-center overflow-hidden border-b border-slate-800/80 bg-[#040a14]">
      <div className="shrink-0 h-full flex items-center gap-1.5 bg-amber-500/90 px-3 font-mono text-[10px] font-bold tracking-wider text-slate-950">● LIVE AGENT TELEMETRY</div>
      <div className="relative flex-1 overflow-hidden">
        <div className="marquee flex w-max gap-10 whitespace-nowrap px-4 font-mono text-[11.5px] text-slate-300">
          {[...list, ...list].map((t, i) => typeof t === 'string' ? <span key={i}>{t}</span> : <span key={i}><span className={t.color}>[{t.tag}]</span> {t.text}</span>)}
        </div>
      </div>
    </div>
  )
}
