import { Link } from 'react-router-dom'
import { Bot, ScanSearch, ShieldAlert, Ban, Eye, CheckCircle2, Siren, Gauge, Play, Pause, RotateCcw, Activity, ShieldCheck, FlaskConical, Hourglass, Square } from 'lucide-react'
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceArea, ReferenceLine } from 'recharts'
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
  const outcomeOf = (r) => (r.agent?.compromised ? 'COMPROMISED' : r.agent?.calls.some((c) => c.status === 'BLOCKED') ? 'BLOCK' : r.agent?.calls.some((c) => c.status === 'PENDING') ? 'REVIEW' : r.scan.level === 'SAFE' ? 'ALLOW' : 'REVIEW')
  const series = runs.map((r) => ({ id: r.id, t: fmtTime(r.ts).slice(0, 5), name: r.name, attack: r.scan.attackType, level: r.scan.level, outcome: outcomeOf(r), risk: r.scan.score, threats: (cum += r.scan.level !== 'SAFE' ? 1 : 0) }))
  const decCount = (k) => series.filter((x) => (k === 'BLOCK' ? x.outcome === 'BLOCK' || x.outcome === 'COMPROMISED' : x.outcome === k)).length
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

      <Card>
        <CardHeader icon={Gauge} title="Security Overview" subtitle="Risk score of every request, cumulative threats and the decision taken — one view"
          right={<div className="hidden flex-wrap gap-2 md:flex">
            <Badge value="ALLOW">{decCount('ALLOW')} allowed</Badge><Badge value="REVIEW">{decCount('REVIEW')} review</Badge><Badge value="BLOCK">{decCount('BLOCK')} blocked</Badge></div>} />
        <div className="h-[380px] px-2 pb-2 pt-4 md:px-4">
          <ResponsiveContainer>
            <ComposedChart data={series} margin={{ top: 10, right: 40, left: 0, bottom: 0 }}>
              <defs><linearGradient id="riskFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.45} /><stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} /></linearGradient></defs>
              <ReferenceArea yAxisId="r" y1={80} y2={100} fill="#f87171" fillOpacity={0.05} />
              <ReferenceArea yAxisId="r" y1={60} y2={80} fill="#fb923c" fillOpacity={0.04} />
              <ReferenceArea yAxisId="r" y1={30} y2={60} fill="#facc15" fillOpacity={0.03} />
              <ReferenceLine yAxisId="r" y={80} stroke="#f87171" strokeDasharray="4 4" strokeOpacity={0.5} label={{ value: 'CRITICAL', position: 'insideTopLeft', fill: '#f87171', fontSize: 10 }} />
              <ReferenceLine yAxisId="r" y={60} stroke="#fb923c" strokeDasharray="4 4" strokeOpacity={0.4} label={{ value: 'BLOCK ≥ 60', position: 'insideTopLeft', fill: '#fb923c', fontSize: 10 }} />
              <ReferenceLine yAxisId="r" y={30} stroke="#facc15" strokeDasharray="4 4" strokeOpacity={0.3} label={{ value: 'REVIEW ≥ 30', position: 'insideTopLeft', fill: '#facc15', fontSize: 10 }} />
              <CartesianGrid stroke="rgba(148,163,184,.07)" vertical={false} />
              <XAxis dataKey="id" {...axis} tickFormatter={(v) => v.replace('RUN-', '#')} />
              <YAxis yAxisId="r" {...axis} domain={[0, 100]} width={34} />
              <YAxis yAxisId="c" orientation="right" {...axis} allowDecimals={false} width={30} />
              <Tooltip {...tip} content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload
                return <div className="rounded-lg border border-white/10 bg-[#0b1120] p-3 text-xs shadow-xl">
                  <div className="font-semibold text-white">{d.id} · {d.t}</div><div className="text-slate-400">{d.name}</div>
                  <div className="mt-1.5 flex items-center gap-2"><span className={cx('font-mono text-base font-bold', TEXT[d.level])}>{d.risk}</span><Badge value={d.level}>{d.level}</Badge><Badge value={d.outcome}>{d.outcome === 'BLOCK' ? 'BLOCKED' : d.outcome === 'ALLOW' ? 'ALLOWED' : d.outcome}</Badge></div>
                  <div className="mt-1 text-slate-400">{d.attack}</div><div className="text-slate-500">Cumulative threats: {d.threats}</div></div>
              }} />
              <Area yAxisId="r" type="monotone" dataKey="risk" name="Risk score" stroke="#3b82f6" strokeWidth={2.5} fill="url(#riskFill)" isAnimationActive={false}
                dot={({ cx: x, cy: y, payload, index }) => <circle key={index} cx={x} cy={y} r={6} fill={HEX[payload.outcome] || '#ef4444'} stroke="#0b1120" strokeWidth={2} />} activeDot={{ r: 8 }} />
              <Line yAxisId="c" type="stepAfter" dataKey="threats" name="Cumulative threats" stroke="#f87171" strokeWidth={2} strokeDasharray="5 3" dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/[0.06] px-5 py-3 text-xs text-slate-400">
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 rounded bg-blue-500" />Risk score (left axis)</span>
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 border-t-2 border-dashed border-red-400" />Cumulative threats (right axis)</span>
          {[['ALLOW', 'Allowed'], ['REVIEW', 'Human review'], ['BLOCK', 'Blocked']].map(([k, l]) => <span key={k} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: HEX[k] }} />{l}</span>)}
          <span className="ml-auto text-slate-500">{series.length} requests · {m.threats} threats · {m.critical} critical</span>
        </div>
      </Card>
    </div>
  )
}
