import React, { useState } from 'react'
import { FileText, Mail, Search, Wallet } from 'lucide-react'
import { Decision, Panel, SectionTitle, Tag, riskHex } from '../components/ui'
import { POLICIES, TOOL_SPECS } from '../lib/monitor'

const ICON = { read_document: FileText, payment_lookup: Search, draft_email: Mail, initiate_payment: Wallet }
const RC = { low: 'emerald', medium: 'amber', critical: 'rose' }

export default function Monitor({ calls }) {
  const [filter, setFilter] = useState('ALL')
  const stats = Object.keys(TOOL_SPECS).map((t) => {
    const cs = calls.filter((c) => c.tool === t)
    return { t, total: cs.length, blocked: cs.filter((c) => !c.executed).length, flagged: cs.filter((c) => c.monitor.decision === 'FLAG').length }
  })
  const rows = calls.filter((c) => filter === 'ALL' || c.monitor.decision === filter).slice(0, 80)
  return (
    <div className="space-y-6">
      <div>
        <div className="label text-cyan-400">04 · Runtime Tool-Call Monitor</div>
        <h1 className="mt-2 text-3xl font-extrabold text-white">Tool-Call Monitor</h1>
        <p className="mt-1 text-slate-400">Every action the agent attempts is checked against task scope, taint provenance, DLP and behavioural baselines before it reaches a (mock) tool.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ t, total, blocked, flagged }) => {
          const I = ICON[t]
          return (
            <Panel bracket key={t} className="p-5">
              <div className="flex items-center justify-between"><I size={18} className="text-cyan-400" /><Tag color={RC[TOOL_SPECS[t].risk]}>{TOOL_SPECS[t].risk}</Tag></div>
              <div className="mt-3 font-mono text-[14px] font-bold text-white">{t}()</div>
              <div className="mt-1 text-[12px] text-slate-400">{TOOL_SPECS[t].desc}</div>
              <div className="mt-3 flex gap-4 font-mono text-[11px]"><span className="text-slate-300">{total} calls</span><span className="text-amber-300">{flagged} flag</span><span className="text-rose-300">{blocked} block</span></div>
            </Panel>
          )
        })}
      </div>
      <Panel className="p-5">
        <SectionTitle kicker="Policy engine" title="Active Tool-Call Policies" />
        <div className="grid gap-2 md:grid-cols-3">
          {POLICIES.map((p) => (
            <div key={p.id} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-100"><Tag color="cyan">{p.id}</Tag>{p.name}<span className="ml-auto font-mono text-[11px] text-rose-300">+{p.risk}</span></div>
              <div className="mt-1 text-[12px] text-slate-400">{p.desc}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 font-mono text-[11px] text-slate-500">Decision: risk ≥ 60 → BLOCK · 30–59 → FLAG (human review) · &lt; 30 → ALLOW. Calls from quarantined content are always blocked.</div>
      </Panel>
      <Panel className="p-5">
        <SectionTitle kicker="Call log" title="Agent Tool Invocations" right={
          <div className="flex gap-1">{['ALL', 'BLOCK', 'FLAG', 'ALLOW'].map((f) => <button key={f} onClick={() => setFilter(f)} className={`rounded px-2 py-0.5 font-mono text-[11px] border ${filter === f ? 'border-cyan-400/60 text-cyan-200 bg-cyan-400/10' : 'border-slate-700 text-slate-400'}`}>{f}</button>)}</div>} />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12.5px]">
            <thead className="label"><tr><th className="py-2 pr-3">Task</th><th className="pr-3">Call</th><th className="pr-3">Guard</th><th className="pr-3">Decision</th><th className="pr-3">Risk</th><th>Primary reason</th></tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-t border-slate-800/70 align-top">
                  <td className="py-2 pr-3 font-mono text-slate-300">{c.task.id}</td>
                  <td className="pr-3"><code className="text-cyan-200">{c.tool}</code>{c.tainted && <Tag color="violet" className="ml-1">tainted</Tag>}</td>
                  <td className="pr-3"><Tag color={c.guard ? 'emerald' : 'rose'}>{c.guard ? 'on' : 'off'}</Tag></td>
                  <td className="pr-3"><Decision d={c.executed ? c.monitor.decision : 'BLOCK'} /></td>
                  <td className="pr-3 font-mono font-bold" style={{ color: riskHex(c.monitor.risk) }}>{c.monitor.risk}</td>
                  <td className="text-slate-400">{c.monitor.reasons[0]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}
