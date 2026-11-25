import { motion, AnimatePresence } from 'framer-motion'
import { ShieldAlert, ShieldCheck, Check, X, ArrowRight, Target, AlertOctagon, Lock, Clock } from 'lucide-react'
import { useStore } from '../store.jsx'
import { POLICIES } from '../engine/agent.js'
import { Badge, Button, Card, CardHeader, Highlighted, RiskGauge, cx, fmtArgs, fmtTime, TEXT } from './ui.jsx'

export function ThreatPanel({ scan }) {
  const benign = scan.level === 'SAFE'
  return (
    <Card>
      <CardHeader icon={benign ? ShieldCheck : ShieldAlert} title={benign ? 'No Threat Detected' : 'Threat Detected'} subtitle="Explainable detection — classifier + heuristics"
        right={<Badge value={scan.level}>{scan.level}</Badge>} />
      <div className="grid gap-5 p-5 md:grid-cols-[170px_1fr]">
        <div className="flex flex-col items-center gap-3">
          <RiskGauge score={scan.score} />
          <div className="text-center text-[11px] text-slate-500">Raw signal sum {scan.rawScore} · capped at 100</div>
        </div>
        <div className="space-y-4 min-w-0">
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div><dt className="text-xs text-slate-500">Attack Type</dt><dd className="font-semibold text-white">{scan.attackType}</dd></div>
            <div><dt className="text-xs text-slate-500">Severity</dt><dd className={cx('font-semibold', TEXT[scan.level])}>{scan.level}</dd></div>
            <div><dt className="text-xs text-slate-500">Recommended Action</dt><dd className={cx('font-semibold', benign ? 'text-emerald-400' : scan.level === 'LOW' ? 'text-amber-400' : 'text-red-400')}>{scan.recommended}</dd></div>
          </dl>
          <div>
            <div className="mb-2 text-xs font-medium text-slate-400">Detected Signals</div>
            {scan.signals.length ? (
              <ul className="space-y-1.5">
                {scan.signals.map((s) => (
                  <li key={s.id} className="flex items-start gap-2 rounded-lg bg-white/[0.02] px-3 py-2 ring-1 ring-inset ring-white/[0.05]">
                    <Check size={14} className="mt-0.5 shrink-0 text-red-400" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2"><span className="text-sm font-medium text-slate-100">{s.label}</span><span className="font-mono text-xs font-semibold text-red-300">+{s.weight}</span></div>
                      <div className="text-xs text-slate-500">{s.explain}</div>
                      {s.matches.length > 0 && <div className="mt-1 truncate font-mono text-[11px] text-slate-400">“{s.matches.join('” · “')}”</div>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-emerald-300/90">No injection, exfiltration, financial or override signals matched.</p>}
            <div className="mt-1.5 flex items-center justify-between rounded-lg bg-blue-500/5 px-3 py-2 text-xs ring-1 ring-inset ring-blue-500/15">
              <span className="text-slate-300">ML classifier (TF-IDF + LogReg) · p(injection) = <b className="font-mono">{scan.classifier.prob}</b>{scan.classifier.tokens.length > 0 && <span className="text-slate-500"> · top: {scan.classifier.tokens.slice(0, 3).map((t) => t.token).join(', ')}</span>}</span>
              <span className="font-mono font-semibold text-blue-300">+{scan.classifier.points}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

export function ContentView({ scan }) {
  return (
    <div className="space-y-2">
      <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-black/30 p-3 font-mono text-xs leading-relaxed text-slate-300 ring-1 ring-inset ring-white/[0.05]"><Highlighted text={scan.text} ranges={scan.highlights} /></pre>
      {(scan.decoded.length > 0 || scan.zeroWidth > 0) && (
        <div className="rounded-lg bg-amber-500/5 p-3 text-xs text-amber-200 ring-1 ring-inset ring-amber-500/20">
          <b>Hidden content revealed:</b> {scan.zeroWidth > 0 && `${scan.zeroWidth} zero-width characters stripped. `}
          {scan.decoded.map((d, i) => <div key={i} className="mt-1 font-mono">base64 → “{d}”</div>)}
        </div>
      )}
    </div>
  )
}

export function DecisionPill({ call }) {
  const v = call.resolution === 'APPROVED' ? 'APPROVED' : call.resolution === 'REJECTED' ? 'BLOCKED' : call.status === 'PENDING' ? 'REVIEW' : call.decision
  return <Badge value={v} className="text-xs">{v === 'BLOCK' ? 'BLOCKED' : v === 'ALLOW' ? 'ALLOWED' : v}</Badge>
}

export function ApprovalCard({ run, call, compact }) {
  const { resolve } = useStore()
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-4" role="alert">
      <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-amber-300"><AlertOctagon size={14} />HIGH-RISK ACTION · HUMAN APPROVAL</div>
      <div className="mt-2 text-sm text-slate-300">Agent wants to: <b className="text-white">{call.label}</b></div>
      <div className="mt-1 font-mono text-[11px] text-slate-500">{call.tool}({fmtArgs(call.args)})</div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs"><span>Risk: <b className="font-mono text-amber-300">{call.risk}/100</b></span>{!compact && <span className="text-slate-500">{run.id} · {run.name}</span>}</div>
      <div className="mt-1 text-xs text-slate-400">Reason: “{call.reason}”</div>
      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="success" icon={Check} onClick={() => resolve(run.id, call.id, 'APPROVE')}>APPROVE</Button>
        <Button size="sm" variant="danger" icon={X} onClick={() => resolve(run.id, call.id, 'REJECT')}>BLOCK</Button>
      </div>
    </div>
  )
}

export function AgentTrace({ run }) {
  const a = run.agent
  return (
    <ol className="space-y-3">
      {a.calls.map((c, i) => (
        <motion.li key={c.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15 }}
          className={cx('rounded-xl p-4 ring-1 ring-inset', c.status === 'BLOCKED' ? 'bg-red-500/[0.05] ring-red-500/25' : c.status === 'PENDING' ? 'bg-amber-500/[0.05] ring-amber-500/25' : c.tainted ? 'bg-red-600/10 ring-red-500/50' : 'bg-white/[0.02] ring-white/[0.06]')}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-white/[0.06] font-mono text-[11px] text-slate-400">{c.id}</span>
              <code className="truncate font-mono text-sm text-slate-100">{c.tool}()</code>
              {c.tainted ? <Badge value="CRITICAL">FROM UNTRUSTED CONTENT</Badge> : <Badge value="INFO">FROM USER GOAL</Badge>}
            </div>
            <div className="flex items-center gap-2"><span className="font-mono text-xs text-slate-400">risk {c.risk}</span><DecisionPill call={c} /></div>
          </div>
          <div className="mt-2 text-sm text-slate-300">{c.label}</div>
          <div className="mt-0.5 truncate font-mono text-[11px] text-slate-500">args: {fmtArgs(c.args)}</div>
          {c.violations.length > 0 && (
            <ul className="mt-2 space-y-1">
              {c.violations.map((v, k) => (
                <li key={k} className="flex gap-2 text-xs"><Lock size={12} className={cx('mt-0.5 shrink-0', v.decision === 'BLOCK' ? 'text-red-400' : 'text-amber-400')} />
                  <span><b className="text-slate-300">{v.policy} {POLICIES.find((p) => p.id === v.policy)?.name}:</b> <span className="text-slate-400">{v.reason}</span></span></li>
              ))}
            </ul>
          )}
          {c.result && <pre className="mt-2 overflow-auto rounded-md bg-black/30 p-2 font-mono text-[11px] text-emerald-200/80">{JSON.stringify(c.result)}</pre>}
          {c.status === 'PENDING' && <div className="mt-3"><ApprovalCard run={run} call={c} compact /></div>}
        </motion.li>
      ))}
    </ol>
  )
}

export function DeviationPanel({ agent }) {
  const d = agent.deviation
  return (
    <Card>
      <CardHeader icon={Target} title="Compromised Agent Detection" subtitle="Original intent vs proposed action"
        right={d.detected ? <Badge value={d.severity}>GOAL DEVIATION DETECTED</Badge> : <Badge value="SAFE">ON TASK</Badge>} />
      <div className="grid items-center gap-3 p-5 md:grid-cols-[1fr_auto_1fr]">
        <div className="rounded-lg bg-white/[0.02] p-3 ring-1 ring-inset ring-white/[0.06]"><div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Original Intent</div><div className="mt-1 text-sm text-slate-100">{d.original}</div></div>
        <ArrowRight className="mx-auto text-slate-600" />
        <div className={cx('rounded-lg p-3 ring-1 ring-inset', d.detected ? 'bg-red-500/[0.06] ring-red-500/30' : 'bg-emerald-500/[0.05] ring-emerald-500/25')}><div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Current / Proposed Intent</div><div className="mt-1 text-sm text-slate-100">{d.current}</div></div>
      </div>
      <div className="flex flex-wrap gap-4 border-t border-white/[0.06] px-5 py-3 text-xs text-slate-400">
        <span>Deviation: <b className={TEXT[d.severity] || 'text-emerald-400'}>{d.detected ? d.severity : 'NONE'}</b></span>
        <span>Action: <b className="text-slate-200">{d.action === 'BLOCK' ? 'BLOCK' : d.action}</b></span>
        <span>Agent status: <Badge value={agent.status}>{agent.status}</Badge></span>
      </div>
    </Card>
  )
}

export function EventFeed({ events, limit = 12, className }) {
  const list = events.slice(-limit).reverse()
  return (
    <ul className={cx('divide-y divide-white/[0.04]', className)} aria-live="polite">
      <AnimatePresence initial={false}>
        {list.map((e) => (
          <motion.li key={e.id} layout initial={{ opacity: 0, x: -12, backgroundColor: 'rgba(59,130,246,.12)' }} animate={{ opacity: 1, x: 0, backgroundColor: 'rgba(0,0,0,0)' }} transition={{ duration: 0.5 }}
            className="grid grid-cols-[64px_1fr_auto] items-start gap-3 px-5 py-2.5">
            <span className="font-mono text-[11px] text-slate-500 pt-0.5"><Clock size={10} className="mr-1 inline" />{fmtTime(e.ts)}</span>
            <div className="min-w-0">
              <div className="flex items-center gap-2"><span className="text-xs font-semibold tracking-wide text-slate-100">{e.type}</span>{e.tool !== '—' && <code className="font-mono text-[10px] text-slate-500">{e.tool}</code>}</div>
              <div className="truncate text-xs text-slate-400">{e.description}</div>
            </div>
            <div className="flex flex-col items-end gap-1"><Badge value={e.severity}>{e.severity}</Badge>{e.decision !== '—' && <span className="font-mono text-[10px] text-slate-500">{e.risk} · {e.decision}</span>}</div>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  )
}
