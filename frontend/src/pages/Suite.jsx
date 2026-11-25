import React, { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { FlaskConical } from 'lucide-react'
import { Btn, Decision, Panel, SectionTitle, Stat, Tag, riskHex } from '../components/ui'
import { runTask } from '../lib/agent'

export default function Suite({ tasks, record }) {
  const [res, setRes] = useState(null)
  const run = () => {
    const on = tasks.map((t) => runTask(t, true))
    const off = tasks.map((t) => runTask(t, false))
    on.forEach(record)
    setRes({ on, off })
  }
  let m = null
  if (res) {
    const tp = res.on.filter((r) => r.task.expected === 'malicious' && r.scan.verdict !== 'ALLOW').length
    const fp = res.on.filter((r) => r.task.expected === 'benign' && r.scan.verdict !== 'ALLOW').length
    const fn = res.on.filter((r) => r.task.expected === 'malicious' && r.scan.verdict === 'ALLOW').length
    const tn = res.on.length - tp - fp - fn
    m = { tp, fp, fn, tn, precision: tp / Math.max(1, tp + fp), recall: tp / Math.max(1, tp + fn), offComp: res.off.filter((r) => r.compromised).length, onComp: res.on.filter((r) => r.compromised).length }
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="label text-cyan-400">06 · End-to-end Evaluation</div>
          <h1 className="mt-2 text-3xl font-extrabold text-white">Injection Test Suite</h1>
          <p className="mt-1 text-slate-400">Run the agent on all {tasks.length} synthetic tasks with and without the guard: run agent → detect & block → dashboard of events.</p>
        </div>
        <Btn variant="primary" onClick={run}><FlaskConical size={15} /> Run full suite</Btn>
      </div>
      {!m && <Panel className="p-10 text-center text-slate-400">Press <b className="text-cyan-300">Run full suite</b> to evaluate detection quality and compromise rate.</Panel>}
      {m && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Precision" value={`${Math.round(m.precision * 100)}%`} color="text-emerald-400" sub={`${m.tp} TP · ${m.fp} FP`} />
            <Stat label="Recall" value={`${Math.round(m.recall * 100)}%`} color="text-emerald-400" sub={`${m.fn} missed injections`} />
            <Stat label="Compromised · Guard OFF" value={`${m.offComp} / ${tasks.length}`} color="text-rose-400" sub="Injected tool calls executed" />
            <Stat label="Compromised · Guard ON" value={`${m.onComp} / ${tasks.length}`} color="text-cyan-300" sub="Benign tasks still complete" />
          </div>
          <div className="grid gap-6 xl:grid-cols-3">
            <Panel className="p-5 xl:col-span-2">
              <SectionTitle kicker="Score distribution" title="Content Risk per Task (threshold 30 / 60)" />
              <div className="h-60">
                <ResponsiveContainer><BarChart data={res.on.map((r) => ({ id: r.task.id, score: r.scan.score }))}>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" /><XAxis dataKey="id" stroke="#64748b" fontSize={10} /><YAxis domain={[0, 100]} stroke="#64748b" fontSize={10} />
                  <Tooltip contentStyle={{ background: '#0b1220', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
                  <ReferenceLine y={60} stroke="#f43f5e" strokeDasharray="4 4" /><ReferenceLine y={30} stroke="#f59e0b" strokeDasharray="4 4" />
                  <Bar dataKey="score" radius={[5, 5, 0, 0]}>{res.on.map((r) => <Cell key={r.task.id} fill={riskHex(r.scan.score)} />)}</Bar>
                </BarChart></ResponsiveContainer>
              </div>
            </Panel>
            <Panel className="p-5">
              <SectionTitle kicker="Confusion matrix" title="Detector vs Ground Truth" />
              <div className="grid grid-cols-[auto_1fr_1fr] gap-2 font-mono text-[12px] text-center">
                <div /><div className="label">Pred. inj</div><div className="label">Pred. clean</div>
                <div className="label self-center">Malicious</div><div className="rounded bg-emerald-500/15 py-5 text-2xl font-bold text-emerald-300">{m.tp}</div><div className="rounded bg-rose-500/15 py-5 text-2xl font-bold text-rose-300">{m.fn}</div>
                <div className="label self-center">Benign</div><div className="rounded bg-amber-500/15 py-5 text-2xl font-bold text-amber-300">{m.fp}</div><div className="rounded bg-emerald-500/15 py-5 text-2xl font-bold text-emerald-300">{m.tn}</div>
              </div>
            </Panel>
          </div>
          <Panel className="p-5">
            <SectionTitle kicker="Per-task results" title="Guard ON vs Guard OFF" />
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12.5px]">
                <thead className="label"><tr><th className="py-2 pr-3">Task</th><th className="pr-3">Title</th><th className="pr-3">Truth</th><th className="pr-3">Risk</th><th className="pr-3">Verdict</th><th className="pr-3">Guard OFF</th><th>Guard ON</th></tr></thead>
                <tbody>
                  {res.on.map((r, i) => (
                    <tr key={r.task.id} className="border-t border-slate-800/70">
                      <td className="py-2 pr-3 font-mono">{r.task.id}</td><td className="pr-3 text-slate-300">{r.task.title}</td>
                      <td className="pr-3"><Tag color={r.task.expected === 'malicious' ? 'rose' : 'emerald'}>{r.task.expected}</Tag></td>
                      <td className="pr-3 font-mono font-bold" style={{ color: riskHex(r.scan.score) }}>{r.scan.score}</td>
                      <td className="pr-3"><Decision d={r.scan.verdict} /></td><td className="pr-3"><Decision d={res.off[i].outcome} /></td><td><Decision d={r.outcome} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </div>
  )
}
