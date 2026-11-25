import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, BookOpen, Bot, FlaskConical, LayoutDashboard, ListChecks, ScanSearch, ShieldAlert, SlidersHorizontal } from 'lucide-react'
import Boot from './components/Boot'
import { Header, Sidebar, Ticker } from './components/Shell'
import TASKS from './data/tasks.json'
import { runTask } from './lib/agent'
import Command from './pages/Command'
import Sandbox from './pages/Sandbox'
import Scanner from './pages/Scanner'
import Monitor from './pages/Monitor'
import Events from './pages/Events'
import Suite from './pages/Suite'
import Policies from './pages/Policies'
import About from './pages/About'

const NAV = [
  { id: 'command', label: 'Threat Command', icon: LayoutDashboard },
  { id: 'sandbox', label: 'Agent Sandbox', icon: Bot, badge: 'LIVE' },
  { id: 'scanner', label: 'Injection Scanner', icon: ScanSearch, badge: 'ML' },
  { id: 'monitor', label: 'Tool-Call Monitor', icon: Activity },
  { id: 'events', label: 'Blocked & Flagged', icon: ShieldAlert, badge: (c) => c.blocked || null },
  { id: 'suite', label: 'Test Suite', icon: FlaskConical },
  { id: 'policies', label: 'Rules & Model', icon: SlidersHorizontal },
  { id: 'about', label: 'Problem & Architecture', icon: BookOpen },
]

export default function App() {
  const [booted, setBooted] = useState(false)
  const [page, setPage] = useState('command')
  const [collapsed, setCollapsed] = useState(false)
  const [runs, setRuns] = useState([])
  const [focusTask, setFocusTask] = useState(TASKS[3].id)

  const record = useCallback((res) => setRuns((r) => [res, ...r].slice(0, 300)), [])
  useEffect(() => { setRuns(TASKS.map((t) => runTask(t, true)).reverse()) }, [])

  const events = useMemo(() => runs.flatMap((r) => r.events), [runs])
  const calls = useMemo(() => runs.flatMap((r) => r.trace.map((t, i) => ({ ...t, id: `${r.runId}-${i}`, runId: r.runId, task: r.task, guard: r.guard }))), [runs])
  const counts = useMemo(() => ({ blocked: events.filter((e) => e.decision === 'BLOCK').length }), [events])
  const threat = runs.slice(0, 5).some((r) => r.compromised) ? 'ELEVATED' : 'GUARDED'

  const ticker = useMemo(() => events.slice(0, 10).map((e) => ({
    tag: `${e.task_id}·${e.type === 'content_scan' ? 'SCAN' : e.target.toUpperCase()}`,
    color: e.decision === 'BLOCK' ? 'text-rose-400' : e.decision === 'FLAG' ? 'text-amber-300' : e.decision === 'EXECUTED' ? 'text-violet-300' : 'text-emerald-400',
    text: `${e.decision} · risk ${e.risk} · ${e.reasons[0]}`,
  })), [events])

  useEffect(() => {
    const k = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPage('scanner') } }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])

  if (!booted) return <Boot onDone={() => setBooted(true)} />

  const go = (p, taskId) => { if (taskId) setFocusTask(taskId); setPage(p) }
  const props = { runs, events, calls, record, go, tasks: TASKS, focusTask, setFocusTask }
  const Page = { command: Command, sandbox: Sandbox, scanner: Scanner, monitor: Monitor, events: Events, suite: Suite, policies: Policies, about: About }[page]

  return (
    <div className="flex h-full">
      <Sidebar nav={NAV} page={page} setPage={setPage} collapsed={collapsed} setCollapsed={setCollapsed} counts={counts} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header threat={threat} alerts={counts.blocked} onSearch={() => setPage('scanner')} />
        <Ticker items={ticker} />
        <main className="flex-1 overflow-y-auto">
          <div key={page} className="fadein mx-auto max-w-[1400px] p-6 lg:p-8"><Page {...props} /></div>
          <footer className="border-t border-slate-800/80 px-8 py-5 font-mono text-[11px] text-slate-500">
            AEGIS · Prompt Injection & Compromised AI Agent Detection · AI in Cybersecurity & Fintech · Defensive prototype — mock tools & synthetic data only, no real payment APIs.
          </footer>
        </main>
      </div>
    </div>
  )
}
