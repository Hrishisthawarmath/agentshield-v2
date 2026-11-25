import { useEffect, useRef, useState } from 'react'
import { ScanSearch, Eraser, Bot, Check, Loader2, FlaskConical, FileText, Binary, Crosshair, DatabaseZap, FileWarning, KeyRound, Landmark, ShieldCheck, Terminal, Wrench } from 'lucide-react'

const Icons = { Binary, Crosshair, DatabaseZap, FileWarning, KeyRound, Landmark, ShieldCheck, Terminal, Wrench }
import { useStore, SCENARIOS } from '../store.jsx'
import { Badge, Button, Card, CardHeader, PageHeader, cx } from '../components/ui.jsx'
import { ThreatPanel, ContentView, AgentTrace, DeviationPanel } from '../components/security.jsx'

const SOURCES = [['user', 'User prompt'], ['document', 'Document'], ['email', 'Email'], ['web', 'Web page'], ['tool_output', 'Tool output']]
const STAGES = ['Load payload', 'Run detection', 'Calculate risk', 'Simulate agent', 'Attempt tool call', 'Apply policy', 'Allow / review / block', 'Add event to audit log', 'Update dashboard metrics']

export default function Simulator() {
  const { state, execute, simulateAgent } = useStore()
  const [form, setForm] = useState({ scenarioId: null, name: 'Custom input', goal: 'Check account balance and prepare a summary.', content: '', source: 'user', resource: undefined })
  const [runId, setRunId] = useState(null)
  const [stage, setStage] = useState(-1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const timers = useRef([])
  const run = state.runs.find((r) => r.id === runId)
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const animate = (from, to) => new Promise((res) => {
    for (let i = from; i <= to; i++) timers.current.push(setTimeout(() => { setStage(i); if (i === to) res() }, (i - from) * 260))
  })

  const load = (s) => { setForm({ scenarioId: s.id, name: s.name, goal: s.goal, content: s.content, source: s.source, resource: s.resource }); setRunId(null); setStage(-1); setError('') }

  async function scanOnly() {
    if (!form.content.trim()) { setError('Enter some untrusted content or pick an attack scenario first.'); return }
    setError(''); setBusy(true); setStage(-1)
    await animate(0, 2)
    const r = await execute(form, { withAgent: false })
    setRunId(r.id); setBusy(false)
  }
  async function agentStep() {
    setBusy(true)
    await animate(3, 8)
    await simulateAgent(runId)
    setBusy(false)
  }
  async function replay(s) {
    load(s); setBusy(true)
    await animate(0, 8)
    const r = await execute({ scenarioId: s.id, name: s.name, goal: s.goal, content: s.content, source: s.source, resource: s.resource })
    setRunId(r.id); setBusy(false)
  }

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Attack Simulator" title="Prompt Injection Attack Lab" subtitle="Replay a curated attack or paste your own untrusted content. AgentShield scans it, simulates the sandboxed banking agent, intercepts every tool call and decides ALLOW / REVIEW / BLOCK." />

      <Card>
        <CardHeader icon={FlaskConical} title="Attack Lab" subtitle="Click a card to replay the full 9-step pipeline" />
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {SCENARIOS.map((s) => {
            const Icon = Icons[s.icon] || FileText
            const safe = s.id === 'safe'
            return (
              <button key={s.id} disabled={busy} onClick={() => replay(s)} className={cx('group rounded-xl p-3.5 text-left ring-1 ring-inset transition hover:-translate-y-0.5 disabled:opacity-50',
                form.scenarioId === s.id ? 'bg-blue-500/10 ring-blue-500/40' : 'bg-white/[0.02] ring-white/[0.07] hover:ring-white/20')}>
                <div className="flex items-center justify-between"><Icon size={18} className={safe ? 'text-emerald-400' : 'text-blue-400'} /><Badge value={safe ? 'SAFE' : 'INFO'}>{s.source.replace('_', ' ')}</Badge></div>
                <div className="mt-2.5 text-sm font-semibold text-slate-100">{s.name}</div>
                <div className="mt-0.5 line-clamp-2 text-xs text-slate-500">{s.goal}</div>
              </button>
            )
          })}
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
        <Card className="p-5">
          <div className="grid gap-4 md:grid-cols-[1fr_200px]">
            <label className="block"><span className="text-xs font-medium text-slate-400">Original user goal (what the agent is allowed to do)</span>
              <input value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value, scenarioId: null, name: 'Custom input' })} className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500" /></label>
            <label className="block"><span className="text-xs font-medium text-slate-400">Content source</span>
              <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500">
                {SOURCES.map(([v, l]) => <option key={v} value={v} className="bg-slate-900">{l}</option>)}</select></label>
          </div>
          <label className="mt-4 block"><span className="text-xs font-medium text-slate-400">Untrusted Content / Prompt</span>
            <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value, scenarioId: null, name: 'Custom input' })} rows={7} placeholder="Paste a prompt, email, document or web page…"
              className="mt-1 w-full resize-y rounded-lg border border-white/10 bg-black/30 p-3 font-mono text-[13px] leading-relaxed text-slate-100 outline-none focus:border-blue-500" /></label>
          {error && <p role="alert" className="mt-2 text-xs text-amber-300">{error}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="primary" icon={busy ? Loader2 : ScanSearch} onClick={scanOnly} disabled={busy}>Run Security Scan</Button>
            {run && !run.agent && <Button variant="primary" icon={Bot} onClick={agentStep} disabled={busy}>Simulate Agent</Button>}
            <Button icon={Eraser} onClick={() => { setForm({ ...form, content: '', scenarioId: null }); setRunId(null); setStage(-1); setError('') }}>Clear</Button>
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Pipeline</div>
          <ol className="mt-3 space-y-2">
            {STAGES.map((s, i) => (
              <li key={s} className="flex items-center gap-2.5 text-sm">
                <span className={cx('grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold transition', stage >= i ? 'bg-blue-600 text-white' : 'bg-white/[0.06] text-slate-500')}>{stage >= i ? <Check size={11} /> : i + 1}</span>
                <span className={stage >= i ? 'text-slate-200' : 'text-slate-500'}>{s}</span>
              </li>))}
          </ol>
        </Card>
      </div>

      {run && (
        <div className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <ThreatPanel scan={run.scan} />
            <Card><CardHeader icon={FileText} title="Analyzed Content" subtitle={`${run.id} · source: ${run.scan.source.replace('_', ' ')} · matched spans highlighted`} /><div className="p-5"><ContentView scan={run.scan} /></div></Card>
          </div>
          {run.agent ? (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
              <Card>
                <CardHeader icon={Bot} title="Sandboxed Agent · Tool Security Gateway" subtitle="Every tool request is intercepted, risk-scored and policy-checked" right={<Badge value={run.agent.status}>{run.agent.status}</Badge>} />
                <div className="p-5"><AgentTrace run={run} /></div>
              </Card>
              <div className="space-y-5">
                <DeviationPanel agent={run.agent} />
                <Card className="p-5 text-sm text-slate-300">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Outcome</div>
                  <p className="mt-2">{run.agent.status === 'SAFE' ? <><b className="text-emerald-400">SAFE → ALLOWED.</b> The legitimate request completed with permitted tools — AgentShield does not block normal work.</>
                    : run.agent.status === 'COMPROMISED' ? <><b className="text-red-400">AGENT COMPROMISED.</b> With policies disabled the injected instruction was executed (sandbox only). Re-enable policies to contain it.</>
                    : <><b className="text-red-400">Attack contained.</b> {run.agent.calls.filter((c) => c.status === 'BLOCKED').length} tool call(s) blocked, {run.agent.calls.filter((c) => c.status === 'PENDING').length} awaiting human approval. Events were written to the audit log and the dashboard updated.</>}</p>
                </Card>
              </div>
            </div>
          ) : <Card className="p-5 text-sm text-slate-400">Scan complete. Click <b className="text-slate-200">Simulate Agent</b> to see what the agent attempts and how AgentShield intercepts it.</Card>}
        </div>
      )}
    </div>
  )
}
