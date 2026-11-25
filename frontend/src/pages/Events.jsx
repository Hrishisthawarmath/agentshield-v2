import React, { useState } from 'react'
import { ChevronDown, Download } from 'lucide-react'
import { Btn, Decision, Panel, SectionTitle, Tag, riskHex } from '../components/ui'

export default function Events({ events }) {
  const [dec, setDec] = useState('BLOCK+FLAG')
  const [type, setType] = useState('all')
  const [open, setOpen] = useState(null)
  const list = events.filter((e) => (dec === 'ALL' || (dec === 'BLOCK+FLAG' ? ['BLOCK', 'FLAG', 'EXECUTED'].includes(e.decision) : e.decision === dec)) && (type === 'all' || e.type === type))
  const exportJson = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' }))
    a.download = 'aegis-events.json'
    a.click()
  }
  return (
    <div className="space-y-6">
      <div>
        <div className="label text-cyan-400">05 · Incident Dashboard</div>
        <h1 className="mt-2 text-3xl font-extrabold text-white">Blocked & Flagged Actions</h1>
        <p className="mt-1 text-slate-400">Every detection with its risk score and the exact reasons — ready for analyst triage or SIEM export.</p>
      </div>
      <Panel className="p-5">
        <SectionTitle kicker={`${list.length} events`} title="Event Log" right={
          <div className="flex flex-wrap items-center gap-2">
            {['BLOCK+FLAG', 'BLOCK', 'FLAG', 'EXECUTED', 'ALL'].map((d) => <button key={d} onClick={() => setDec(d)} className={`rounded px-2 py-0.5 font-mono text-[11px] border ${dec === d ? 'border-cyan-400/60 text-cyan-200 bg-cyan-400/10' : 'border-slate-700 text-slate-400'}`}>{d}</button>)}
            <select value={type} onChange={(e) => setType(e.target.value)} className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 font-mono text-[11px]"><option value="all">all types</option><option value="content_scan">content scans</option><option value="tool_call">tool calls</option></select>
            <Btn onClick={exportJson}><Download size={14} /> Export JSON</Btn>
          </div>} />
        <div className="space-y-2">
          {list.map((e) => (
            <div key={e.id} className="rounded-lg border border-slate-800 bg-slate-950/50">
              <button onClick={() => setOpen(open === e.id ? null : e.id)} className="flex w-full items-center gap-3 p-3 text-left">
                <Decision d={e.decision} />
                <span className="font-mono text-[11px] text-slate-500 w-20 shrink-0">{new Date(e.ts).toLocaleTimeString('en-GB')}</span>
                <span className="min-w-0 flex-1 truncate text-[13px] text-slate-200"><b>{e.task_id}</b> · {e.type === 'content_scan' ? `content ${e.target}` : `${e.target}(${Object.values(e.args || {}).slice(0, 2).join(', ')})`}</span>
                <Tag color="slate">{e.channel}</Tag>
                <span className="w-10 text-right font-mono font-bold" style={{ color: riskHex(e.risk) }}>{e.risk}</span>
                <ChevronDown size={15} className={`text-slate-500 transition ${open === e.id ? 'rotate-180' : ''}`} />
              </button>
              {open === e.id && (
                <div className="border-t border-slate-800 p-3 fadein">
                  <div className="label mb-1">Reasons</div>
                  <ul className="list-disc pl-5 space-y-1 text-[12.5px] text-slate-300">{e.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
                  <div className="mt-2 font-mono text-[10.5px] text-slate-500">run {e.run_id} · {e.task_title}</div>
                </div>
              )}
            </div>
          ))}
          {!list.length && <div className="text-sm text-slate-500">No events for this filter.</div>}
        </div>
      </Panel>
    </div>
  )
}
