import { Link } from 'react-router-dom'
import { Bot, ScanSearch, ShieldAlert, Ban, Eye, CheckCircle2, Siren, Gauge, Play, Pause, RotateCcw, Activity, ShieldCheck, FlaskConical, Hourglass, Square } from 'lucide-react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts'
import { useStore, useMetrics, DEMO_STEPS } from '../store.jsx'
import { Badge, Button, Card, CardHeader, PageHeader, Stat, Empty, HEX, TEXT, cx, fmtTime } from '../components/ui.jsx'
import { EventFeed, ApprovalCard } from '../components/security.jsx'

const tip = { contentStyle: { background: '#0b1120', border: '1px solid rgba(148,163,184,.15)', borderRadius: 8, fontSize: 12 }, labelStyle: { color: '#94a3b8' } }
const axis = { stroke: '#475569', fontSize: 11, tickLine: false, axisLine: false }

function DemoPanel() {
  const { state, demo, reset } = useStore()
  const d = state.demo
  const cur = DEMO_STEPS[Math.min(d.step, DEMO_STEPS.length - 1)]
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-400">Judge Demo Mode</div>
          <div className="text-sm text-slate-300">{d.running ? <>Step {Math.min(d.step + 1, DEMO_STEPS.length)}/{DEMO_STEPS.length}: <b className="text-white">{cur.title}</b> — {cur.note}</> : d.step >= DEMO_STEPS.length ? 'Demo complete — every decision is in the feed, charts and audit log.' : 'Auto-plays 7 steps in ~45 seconds: safe → injection → tool abuse → compromised agent → financial attack → blocked.'}</div>
        </div>
        {!d.running ? <Button variant="primary" icon={Play} onClick={() => demo({ running: true, paused: false, step: d.step >= DEMO_STEPS.length ? 0 : d.step })}>Start Demo Mode</Button>
          : <Button icon={d.paused ? Play : Pause} onClick={() => demo({ paused: !d.paused })}>{d.paused ? 'Resume Demo' : 'Pause Demo'}</Button>}
        {d.running && <Button icon={Square} onClick={() => demo({ running: false, paused: false })}>Stop</Button>}
        <Button icon={RotateCcw} onClick={reset}>Reset Demo</Button>
      </div>
      {(d.running || d.step > 0) && (
        <div className="mt-3 flex gap-1.5" aria-hidden>
          {DEMO_STEPS.map((s, i) => <div key={i} className={cx('h-1.5 flex-1 rounded-full transition', i < d.step ? 'bg-blue-500' : i === d.step && d.running ? 'bg-blue-500/40 pulse-dot' : 'bg-white/[0.06]')} />)}
        </div>
      )}
    </Card>
  )
}

export default function Dashboard() {
  const { state, reset } = useStore()
  const m = useMetrics()
  const runs = state.runs
  let cum = 0
  const overTime = runs.map((r) => ({ t: fmtTime(r.ts).slice(0, 5), risk: r.scan.score, threats: (cum += r.scan.level !== 'SAFE' ? 1 : 0) }))
  const types = Object.entries(runs.reduce((a, r) => (r.scan.level !== 'SAFE' ? { ...a, [r.scan.attackType]: (a[r.scan.attackType] || 0) + 1 } : a), {})).map(([k, v]) => ({ type: k.replace(' Prompt Injection', ' Inj.').replace('Injection', 'Inj.'), count: v }))
  const dec = ['ALLOW', 'REVIEW', 'BLOCK'].map((k) => ({ name: k === 'ALLOW' ? 'Allowed' : k === 'REVIEW' ? 'Reviewed' : 'Blocked', key: k, value: m.calls.filter((c) => (k === 'REVIEW' ? c.decision === 'REVIEW' : k === 'BLOCK' ? c.status === 'BLOCKED' && c.decision !== 'REVIEW' : c.decision === 'ALLOW')).length }))
  const dist = ['SAFE', 'LOW', 'HIGH', 'CRITICAL'].map((l) => ({ level: l, count: runs.filter((r) => r.scan.level === l).length }))
  const blockedRecent = m.calls.filter((c) => c.status === 'BLOCKED').slice(-5).reverse()

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Security Operations" title="AI Agent Security Dashboard" subtitle="Live view of every request scanned, tool call intercepted and decision taken by AgentShield for the sandboxed banking agent."
        actions={<><Link to="/simulator"><Button variant="primary" icon={FlaskConical}>Run Attack Simulation</Button></Link><Button icon={RotateCcw} onClick={reset}>Reset Simulation</Button></>} />

      <Card className={cx('flex flex-wrap items-center gap-4 px-5 py-3.5', m.compromised ? 'ring-1 ring-red-500/40' : '')}>
        {m.compromised ? <ShieldAlert className="text-red-400" /> : <ShieldCheck className="text-emerald-400" />}
        <div className="mr-auto">
          <div className={cx('text-sm font-semibold', m.compromised ? 'text-red-300' : 'text-emerald-300')}>{m.compromised ? 'Agent compromise recorded — protective policies were disabled' : 'System Protected'}</div>
          <div className="text-xs text-slate-400">{Object.values(state.policies).filter(Boolean).length}/9 policies enforced · Classifier + 10 heuristic signals active · Mock tools only, no real payment APIs</div>
        </div>
        <div className="text-xs text-slate-500">Overall risk <span className={cx('ml-1 font-mono text-base font-bold', TEXT[m.overall >= 80 ? 'CRITICAL' : m.overall >= 60 ? 'HIGH' : m.overall >= 30 ? 'LOW' : 'SAFE'])}>{m.overall}</span>/100</div>
      </Card>

      <DemoPanel />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <Stat label="Agents Monitored" value="01" icon={Bot} />
        <Stat label="Requests Scanned" value={m.requests} icon={ScanSearch} />
        <Stat label="Threats Detected" value={m.threats} icon={ShieldAlert} tone="text-orange-300" />
        <Stat label="Actions Blocked" value={m.blocked} icon={Ban} tone="text-red-300" />
        <Stat label="Actions Reviewed" value={m.reviewed} icon={Eye} tone="text-amber-300" hint={`${m.pending.length} awaiting approval`} />
        <Stat label="Safe Requests" value={m.safe} icon={CheckCircle2} tone="text-emerald-300" />
        <Stat label="Critical Threats" value={m.critical} icon={Siren} tone="text-red-400" />
        <Stat label="Overall Risk" value={m.overall} icon={Gauge} tone={TEXT[m.overall >= 80 ? 'CRITICAL' : m.overall >= 60 ? 'HIGH' : m.overall >= 30 ? 'LOW' : 'SAFE']} hint={m.threatLevel} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader icon={Activity} title="Live Security Activity" subtitle="Every pipeline stage emits an auditable event" right={<Link to="/events" className="text-xs text-blue-400 hover:underline">Full audit log →</Link>} />
          {state.events.length ? <EventFeed events={state.events} limit={14} className="max-h-[460px] overflow-auto" /> : <Empty>No activity — start Demo Mode or run an attack.</Empty>}
        </Card>
        <div className="space-y-5">
          <Card>
            <CardHeader icon={Hourglass} title="Human Approval Queue" subtitle="REVIEW decisions waiting for an analyst" right={<Badge value={m.pending.length ? 'PENDING' : 'SAFE'}>{m.pending.length} pending</Badge>} />
            <div className="max-h-[300px] space-y-3 overflow-auto p-4">{m.pending.length ? m.pending.slice(-3).reverse().map(({ run, call }) => <ApprovalCard key={run.id + call.id} run={run} call={call} />) : <Empty>Queue is clear.</Empty>}</div>
          </Card>
          <Card>
            <CardHeader icon={Ban} title="Recently Blocked" />
            <ul className="divide-y divide-white/[0.04]">
              {blockedRecent.length ? blockedRecent.map((c) => (
                <li key={c.runId + c.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-xs">
                  <div className="min-w-0"><div className="truncate text-slate-200">{c.label}</div><div className="truncate text-slate-500">{c.reason}</div></div>
                  <Badge value="BLOCKED">{c.risk}</Badge>
                </li>)) : <Empty>Nothing blocked yet.</Empty>}
            </ul>
          </Card>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card><CardHeader title="Threats Over Time" subtitle="Risk score per request & cumulative threats" />
          <div className="h-60 p-4"><ResponsiveContainer><LineChart data={overTime}><CartesianGrid stroke="rgba(148,163,184,.08)" vertical={false} /><XAxis dataKey="t" {...axis} /><YAxis {...axis} domain={[0, 100]} width={30} /><Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="risk" name="Risk score" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2.5 }} isAnimationActive={false} /><Line type="stepAfter" dataKey="threats" name="Cumulative threats" stroke="#f87171" strokeWidth={2} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div></Card>
        <Card><CardHeader title="Threat Types" subtitle="Classified attack technique" />
          <div className="h-60 p-4"><ResponsiveContainer><BarChart data={types} layout="vertical" margin={{ left: 10 }}><CartesianGrid stroke="rgba(148,163,184,.08)" horizontal={false} /><XAxis type="number" allowDecimals={false} {...axis} /><YAxis type="category" dataKey="type" width={130} {...axis} /><Tooltip {...tip} cursor={{ fill: 'rgba(255,255,255,.03)' }} /><Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} isAnimationActive={false} /></BarChart></ResponsiveContainer></div></Card>
        <Card><CardHeader title="Decisions" subtitle="Tool-call outcomes" />
          <div className="h-60 p-4"><ResponsiveContainer><PieChart><Pie data={dec} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3} stroke="none" isAnimationActive={false}>{dec.map((d) => <Cell key={d.key} fill={HEX[d.key]} />)}</Pie><Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 11 }} /></PieChart></ResponsiveContainer></div></Card>
        <Card><CardHeader title="Risk Distribution" subtitle="Requests per severity band" />
          <div className="h-60 p-4"><ResponsiveContainer><BarChart data={dist}><CartesianGrid stroke="rgba(148,163,184,.08)" vertical={false} /><XAxis dataKey="level" {...axis} /><YAxis allowDecimals={false} {...axis} width={30} /><Tooltip {...tip} cursor={{ fill: 'rgba(255,255,255,.03)' }} /><Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive={false}>{dist.map((d) => <Cell key={d.level} fill={HEX[d.level]} />)}</Bar></BarChart></ResponsiveContainer></div></Card>
      </div>
    </div>
  )
}
