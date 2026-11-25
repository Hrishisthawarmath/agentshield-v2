import React, { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, FileText, Globe, Mail, Play, ShieldCheck, ShieldOff, XCircle } from 'lucide-react'
import { Btn, Decision, Gauge, Panel, SectionTitle, Tag, highlight, riskHex } from '../components/ui'
import { runTask } from '../lib/agent'

const CH_ICON = { document: FileText, email: Mail, web: Globe }

export default function Sandbox({ tasks, record, focusTask, setFocusTask }) {
  const task = tasks.find((t) => t.id === focusTask) || tasks[0]
  const [guard, setGuard] = useState(true)
  const [res, setRes] = useState(null)
  const [shown, setShown] = useState(0)
  useEffect(() => { setRes(null); setShown(0) }, [focusTask])
  useEffect(() => {
    if (!res || shown >= res.trace.length) return
    const t = setTimeout(() => setShown(shown + 1), 450)
    return () => clearTimeout(t)
  }, [res, shown])
  const run = () => { const r = runTask(task, guard); setRes(r); setShown(0); record(r) }
  const done = res && shown >= res.trace.length
  const Icon = CH_ICON[task.channel]

  return (
    <div className="space-y-6">
      <div>
        <div className="label text-cyan-400">02 · Sandboxed Demo Agent</div>
        <h1 className="mt-2 text-3xl font-extrabold text-white">Agent Sandbox — Run Tasks with Injected Content</h1>
        <p className="mt-1 text-slate-400">A deliberately naive agent follows any instruction it reads. Toggle the guard layer to compare a compromised run with a protected one.</p>
      </div>
      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <Panel className="p-3 h-fit">
          <div className="label px-2 py-2">Test tasks ({tasks.length})</div>
          <div className="space-y-1">
            {tasks.map((t) => {
              const I = CH_ICON[t.channel]
              return (
                <button key={t.id} onClick={() => setFocusTask(t.id)} className={`w-full rounded-lg border px-3 py-2 text-left ${t.id === task.id ? 'border-cyan-500/50 bg-cyan-500/10' : 'border-transparent hover:bg-slate-800/50'}`}>
                  <div className="flex items-center gap-2 text-[12.5px] font-semibold text-slate-100"><I size={13} className="text-slate-400" />{t.id}<Tag color={t.expected === 'malicious' ? 'rose' : 'emerald'} className="ml-auto">{t.expected}</Tag></div>
                  <div className="mt-0.5 truncate text-[12px] text-slate-400">{t.title}</div>
                </button>
              )
            })}
          </div>
        </Panel>

        <div className="space-y-6 min-w-0">
          <Panel bracket className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2"><Icon size={16} className="text-cyan-400" /><span className="font-mono text-[12px] text-slate-400">{task.source}</span><Tag color={task.trust === 'internal' ? 'emerald' : 'amber'}>{task.trust}</Tag></div>
                <h2 className="mt-2 text-xl font-bold text-white">{task.title}</h2>
                <div className="mt-2 text-sm text-slate-300"><span className="label mr-2">User instruction</span>{task.instruction}</div>
                <div className="mt-2 flex flex-wrap gap-1.5"><span className="label mr-1">Allowed tools</span>{task.allowed_tools.map((t) => <Tag key={t} color="slate">{t}</Tag>)}</div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button onClick={() => setGuard(!guard)} className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-semibold ${guard ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300' : 'border-rose-500/50 bg-rose-500/10 text-rose-300'}`}>
                  {guard ? <ShieldCheck size={15} /> : <ShieldOff size={15} />} Guard {guard ? 'ON' : 'OFF'}
                </button>
                <Btn variant="primary" onClick={run}><Play size={15} /> Run Agent</Btn>
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/70 p-4 font-mono text-[12.5px] leading-relaxed text-slate-300 whitespace-pre-wrap break-words">
              <div className="label mb-2">Retrieved content {res && '· injected spans highlighted'}</div>
              {res ? highlight(task.content, res.scan.rules) : task.content}
            </div>
          </Panel>

          {res && (
            <div className="grid gap-6 lg:grid-cols-[230px_1fr]">
              <Panel className="p-5 flex flex-col items-center">
                <div className="label">Content risk</div>
                <Gauge score={res.scan.score} />
                <Decision d={res.scan.verdict} />
                <div className="mt-3 w-full space-y-1 font-mono text-[11px] text-slate-400">
                  <div className="flex justify-between"><span>Heuristics</span><span>{Math.round(res.scan.heuristic_score * 100)}%</span></div>
                  <div className="flex justify-between"><span>Classifier</span><span>{Math.round(res.scan.classifier_prob * 100)}%</span></div>
                  <div className="flex justify-between"><span>Rules hit</span><span>{res.scan.rules.length}</span></div>
                </div>
              </Panel>
              <Panel className="p-5 min-w-0">
                <SectionTitle kicker="Explainable risk output" title="Why this score?" />
                <ul className="space-y-1.5 text-[12.5px] text-slate-300">
                  {res.scan.reasons.map((r, i) => <li key={i} className="flex gap-2"><AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-400" /><span className="break-words">{r}</span></li>)}
                </ul>
              </Panel>
            </div>
          )}

          {res && (
            <Panel className="p-5">
              <SectionTitle kicker="Agent loop trace" title="Planned Tool Calls → Monitor Decision" right={done && <OutcomeBanner o={res.outcome} />} />
              <div className="space-y-2">
                {res.trace.slice(0, shown).map((s, i) => (
                  <div key={i} className="fadein rounded-lg border border-slate-800 bg-slate-950/60 p-3" style={{ borderLeft: `3px solid ${s.executed ? (s.tainted ? '#a78bfa' : '#10b981') : '#f43f5e'}` }}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] text-slate-500">STEP {i + 1}</span>
                      <code className="text-[13px] text-cyan-200">{s.tool}({Object.entries(s.args).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(', ')})</code>
                      {s.tainted && <Tag color="violet">from injected content</Tag>}
                      <span className="ml-auto flex items-center gap-2"><Decision d={s.monitor.decision} />{s.executed ? <Tag color={s.tainted ? 'rose' : 'emerald'}><CheckCircle2 size={11} /> executed</Tag> : <Tag color="rose"><XCircle size={11} /> blocked</Tag>}</span>
                    </div>
                    <div className="mt-1.5 font-mono text-[11px] text-slate-400">risk <b style={{ color: riskHex(s.monitor.risk) }}>{s.monitor.risk}</b> · {s.monitor.reasons.join(' · ')}</div>
                    {s.result && <div className="mt-1 font-mono text-[10.5px] text-slate-500 truncate">↳ {JSON.stringify(s.result)}</div>}
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  )
}

function OutcomeBanner({ o }) {
  const m = { COMPROMISED: ['rose', 'Agent compromised — injected actions executed'], BLOCKED: ['cyan', 'Attack contained — unsafe actions blocked'], SAFE: ['emerald', 'Task completed safely'] }[o]
  return <Tag color={m[0]} className="!text-[11px] !py-1">{m[1]}</Tag>
}
