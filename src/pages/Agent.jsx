import { Link } from 'react-router-dom'
import { Bot, Activity, KeyRound, Hourglass, FlaskConical } from 'lucide-react'
import { useStore, useMetrics } from '../store.jsx'
import { TOOLS } from '../engine/agent.js'
import { Badge, Button, Card, CardHeader, PageHeader, Empty, cx, fmtArgs, TEXT } from '../components/ui.jsx'
import { DeviationPanel, EventFeed, ApprovalCard, DecisionPill } from '../components/security.jsx'

const STATUS = ['SAFE', 'WARNING', 'COMPROMISED', 'BLOCKED']
const RING = { SAFE: 'ring-emerald-500/50 text-emerald-300', WARNING: 'ring-amber-500/50 text-amber-300', COMPROMISED: 'ring-red-500/70 text-red-300', BLOCKED: 'ring-red-500/50 text-red-300' }

export default function Agent() {
  const { state } = useStore()
  const m = useMetrics()
  const run = [...state.runs].reverse().find((r) => r.agent)
  if (!run) return <div><PageHeader eyebrow="Agent Monitor" title="Live AI Agent Monitor" /><Card><Empty>No agent activity yet. <Link to="/simulator" className="text-blue-400">Run a simulation →</Link></Empty></Card></div>
  const a = run.agent
  const last = a.calls[a.calls.length - 1]
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Agent Monitor" title="Live AI Agent Monitor" subtitle="Runtime view of the sandboxed banking assistant: goal, context, risk, last tool call and AgentShield's decision."
        actions={<Link to="/simulator"><Button variant="primary" icon={FlaskConical}>New simulation</Button></Link>} />
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <Card className="p-5">
          <div className="flex items-center gap-4">
            <div className={cx('grid h-16 w-16 place-items-center rounded-2xl bg-white/[0.03] ring-2', RING[a.status])}><Bot size={28} /></div>
            <div><div className="text-sm font-semibold text-white">bank-assistant-01</div><div className="mt-1 flex items-center gap-2 text-xs text-slate-400">Agent Status <Badge value="ONLINE" dot>ONLINE</Badge></div></div>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-1.5" role="list" aria-label="Agent security status">
            {STATUS.map((s) => <div key={s} role="listitem" className={cx('rounded-md py-1.5 text-center text-[10px] font-bold tracking-wide ring-1 ring-inset', a.status === s ? RING[s] + ' bg-white/[0.04]' : 'text-slate-600 ring-white/[0.05]')}>{s}</div>)}
          </div>
          <dl className="mt-5 space-y-3 text-sm">
            <div><dt className="text-xs text-slate-500">Current Task</dt><dd className="text-slate-200">{run.id} · {run.name}</dd></div>
            <div><dt className="text-xs text-slate-500">Original User Goal</dt><dd className="text-slate-200">{a.goal}</dd></div>
            <div><dt className="text-xs text-slate-500">Current Context</dt><dd className="line-clamp-3 font-mono text-xs text-slate-400">[{run.scan.source}] {run.scan.text}</dd></div>
            <div className="grid grid-cols-2 gap-3">
              <div><dt className="text-xs text-slate-500">Current Risk</dt><dd className={cx('font-mono text-lg font-bold', TEXT[run.scan.level])}>{run.scan.score}/100</dd></div>
              <div><dt className="text-xs text-slate-500">Current Decision</dt><dd className="mt-1">{last ? <DecisionPill call={last} /> : '—'}</dd></div>
            </div>
            <div><dt className="text-xs text-slate-500">Last Tool Call</dt><dd className="truncate font-mono text-xs text-slate-300">{last ? `${last.tool}(${fmtArgs(last.args)})` : '—'}</dd></div>
          </dl>
        </Card>
        <div className="space-y-5">
          <DeviationPanel agent={a} />
          <Card>
            <CardHeader icon={KeyRound} title="Tool Permissions" subtitle={`Tools granted by the goal: ${a.goalTools.join(', ')}`} />
            <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
              {Object.entries(TOOLS).map(([k, t]) => {
                const granted = a.goalTools.includes(k)
                return <div key={k} className={cx('rounded-lg p-3 ring-1 ring-inset', granted ? 'ring-emerald-500/25 bg-emerald-500/[0.04]' : 'ring-white/[0.06]')}>
                  <div className="font-mono text-xs text-slate-200">{t.fn}</div>
                  <div className="mt-1.5 flex gap-1.5"><Badge value="INFO">{t.permission}</Badge><Badge value={granted ? 'ALLOW' : 'NONE'}>{granted ? 'GRANTED' : 'NOT IN SCOPE'}</Badge></div>
                </div>
              })}
            </div>
          </Card>
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card><CardHeader icon={Activity} title="Agent Activity Timeline" subtitle={`Events for ${run.id}`} /><EventFeed events={state.events.filter((e) => e.runId === run.id)} limit={30} className="max-h-[420px] overflow-auto" /></Card>
        <Card><CardHeader icon={Hourglass} title="Pending Human Approvals" right={<Badge value={m.pending.length ? 'PENDING' : 'SAFE'}>{m.pending.length}</Badge>} />
          <div className="max-h-[420px] space-y-3 overflow-auto p-4">{m.pending.length ? m.pending.map(({ run: r, call }) => <ApprovalCard key={r.id + call.id} run={r} call={call} />) : <Empty>No actions waiting for approval.</Empty>}</div></Card>
      </div>
    </div>
  )
}
