import { useState } from 'react'
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, FlaskConical, Bot, Wrench, ShieldCheck, ScrollText, Network, Info, Bell, Menu, X, Home, AlertTriangle, Cpu } from 'lucide-react'
import { useStore, useMetrics } from '../store.jsx'
import { apiConfigured } from '../engine/api.js'
import { Badge, cx, fmtTime } from './ui.jsx'

const NAV = [
  ['/dashboard', 'Dashboard', LayoutDashboard], ['/simulator', 'Attack Simulator', FlaskConical], ['/agent', 'Agent Monitor', Bot],
  ['/tools', 'Tools', Wrench], ['/policies', 'Policies', ShieldCheck], ['/events', 'Events', ScrollText],
  ['/architecture', 'Architecture', Network], ['/about', 'About', Info],
]

export function Logo({ compact }) {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="AgentShield home">
      <img src="/shield.svg" alt="" className="h-8 w-8" />
      {!compact && <div className="leading-tight"><div className="text-[15px] font-bold tracking-tight text-white">AGENTSHIELD</div><div className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">AI Agent Runtime Security</div></div>}
    </Link>
  )
}

function Sidebar({ open, onClose }) {
  const { state } = useStore()
  const m = useMetrics()
  return (
    <>
      <div className={cx('fixed inset-0 z-30 bg-black/60 lg:hidden', open ? 'block' : 'hidden')} onClick={onClose} />
      <aside className={cx('fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-white/[0.06] bg-[#0a0f1c]/95 backdrop-blur transition-transform lg:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')} aria-label="Main navigation">
        <div className="flex h-16 items-center justify-between px-5"><Logo /><button className="lg:hidden text-slate-400" onClick={onClose} aria-label="Close menu"><X size={18} /></button></div>
        <nav className="flex-1 space-y-0.5 px-3 py-3">
          <NavLink to="/" onClick={onClose} className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"><Home size={16} />Product Overview</NavLink>
          <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">Security Console</div>
          {NAV.map(([to, label, Icon]) => (
            <NavLink key={to} to={to} onClick={onClose} className={({ isActive }) => cx('flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
              isActive ? 'bg-blue-500/10 text-blue-300 ring-1 ring-inset ring-blue-500/20' : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200')}>
              <Icon size={16} />{label}
              {to === '/agent' && m.pending.length > 0 && <span className="ml-auto rounded-full bg-amber-500/15 px-1.5 text-[10px] font-bold text-amber-300">{m.pending.length}</span>}
              {to === '/policies' && Object.values(state.policies).some((v) => !v) && <span className="ml-auto rounded-full bg-red-500/15 px-1.5 text-[10px] font-bold text-red-300">OFF</span>}
            </NavLink>
          ))}
        </nav>
        <div className="m-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">System Status</div>
          <div className="mt-2 flex items-center gap-2 text-sm text-slate-200"><span className="pulse-dot h-2 w-2 rounded-full bg-emerald-400" />All Systems Operational</div>
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500"><Cpu size={12} />Engine: {state.engine === 'online' ? 'FastAPI (online)' : state.engine === 'offline' ? 'Local fallback' : 'In-browser'}</div>
        </div>
      </aside>
    </>
  )
}

function TopBar({ onMenu }) {
  const { state, markSeen } = useStore()
  const m = useMetrics()
  const [open, setOpen] = useState(false)
  const unseen = state.events.slice(state.lastSeen).filter((e) => e.severity === 'CRITICAL').length
  const alerts = state.events.filter((e) => e.severity === 'CRITICAL' || e.type === 'HUMAN REVIEW REQUIRED').slice(-6).reverse()
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-white/[0.06] bg-[#070b14]/80 px-4 backdrop-blur md:px-6">
      <button className="text-slate-400 lg:hidden" onClick={onMenu} aria-label="Open menu"><Menu size={20} /></button>
      <div className="hidden text-sm font-semibold text-white sm:block">AgentShield</div>
      <div className="hidden items-center gap-2 md:flex">
        <span className="text-xs text-slate-500">Environment</span><Badge value="INFO">SANDBOX</Badge>
        <span className="ml-2 text-xs text-slate-500">System</span>{m.compromised ? <Badge value="COMPROMISED">AT RISK</Badge> : <Badge value="SAFE" dot>PROTECTED</Badge>}
      </div>
      <div className="ml-auto flex items-center gap-2 md:gap-3">
        <span className="hidden text-xs text-slate-500 sm:inline">Threat Level</span><Badge value={m.threatLevel === 'ELEVATED' ? 'WARNING' : m.threatLevel === 'LOW' ? 'SAFE' : m.threatLevel}>{m.threatLevel}</Badge>
        <div className="relative">
          <button onClick={() => { setOpen(!open); markSeen() }} className="relative grid h-9 w-9 place-items-center rounded-lg text-slate-300 hover:bg-white/[0.06]" aria-label={`Notifications, ${unseen} new`}>
            <Bell size={17} />{unseen > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">{unseen}</span>}
          </button>
          {open && (
            <div className="glass absolute right-0 mt-2 w-80 rounded-xl p-2 text-sm" role="dialog" aria-label="Notifications">
              <div className="px-2 py-1.5 text-xs font-semibold text-slate-400">Recent alerts</div>
              {alerts.length ? alerts.map((e) => (
                <Link key={e.id} to="/events" onClick={() => setOpen(false)} className="flex gap-2 rounded-lg px-2 py-2 hover:bg-white/[0.05]">
                  <AlertTriangle size={14} className={e.severity === 'CRITICAL' ? 'mt-0.5 text-red-400' : 'mt-0.5 text-amber-400'} />
                  <div className="min-w-0"><div className="truncate text-xs font-medium text-slate-200">{e.type}</div><div className="truncate text-[11px] text-slate-500">{fmtTime(e.ts)} · {e.description}</div></div>
                </Link>
              )) : <div className="px-2 py-4 text-xs text-slate-500">No alerts yet.</div>}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] px-2 py-1">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-blue-600 text-[11px] font-bold text-white">ZN</div>
          <div className="hidden leading-tight md:block"><div className="text-xs font-semibold text-slate-200">Zer0-Neuro</div><div className="text-[10px] text-slate-500">SOC Analyst</div></div>
        </div>
      </div>
    </header>
  )
}

export default function Layout() {
  const [open, setOpen] = useState(false)
  const { state } = useStore()
  const loc = useLocation()
  return (
    <div className="min-h-screen">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="min-w-0 overflow-x-clip lg:pl-64">
        <TopBar onMenu={() => setOpen(true)} />
        {apiConfigured && state.engine === 'offline' && (
          <div role="alert" className="flex items-center gap-2 border-b border-amber-500/20 bg-amber-500/10 px-6 py-2 text-xs text-amber-200">
            <AlertTriangle size={14} /><b>Security Engine Offline</b> — the FastAPI backend is unreachable. Running the safe local demo engine in your browser.
          </div>
        )}
        <main key={loc.pathname} className="mx-auto max-w-[1440px] px-4 py-6 md:px-8 md:py-8"><Outlet /></main>
      </div>
    </div>
  )
}
