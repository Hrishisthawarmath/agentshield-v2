import { useState, Fragment } from 'react'
import { Download, ScrollText, Search } from 'lucide-react'
import { useStore } from '../store.jsx'
import { Badge, Button, Card, PageHeader, Empty, cx, fmtTime } from '../components/ui.jsx'

const FILTERS = ['ALL', 'SAFE', 'LOW', 'HIGH', 'CRITICAL', 'BLOCKED', 'REVIEW']
const match = (e, f) => f === 'ALL' || (f === 'BLOCKED' ? e.decision === 'BLOCK' || e.decision === 'BLOCKED' : f === 'REVIEW' ? e.decision === 'REVIEW' : e.severity === f)

export default function Events() {
  const { state } = useStore()
  const [f, setF] = useState('ALL'); const [q, setQ] = useState(''); const [open, setOpen] = useState(null)
  const list = state.events.filter((e) => match(e, f) && (!q || JSON.stringify(e).toLowerCase().includes(q.toLowerCase()))).slice().reverse()
  const download = (type) => {
    const cols = ['ts', 'runId', 'type', 'attackType', 'risk', 'severity', 'tool', 'decision', 'reason', 'description']
    const body = type === 'json' ? JSON.stringify(list, null, 2) : [cols.join(','), ...list.map((e) => cols.map((c) => `"${String(c === 'ts' ? new Date(e.ts).toISOString() : e[c]).replace(/"/g, '""')}"`).join(','))].join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([body], { type: 'text/plain' })); a.download = `agentshield-audit.${type}`; a.click()
  }
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Audit Log" title="Security Event Log" subtitle="Immutable, time-ordered trail of every scan, interception, policy violation and decision."
        actions={<><Button icon={Download} onClick={() => download('csv')}>Export CSV</Button><Button icon={Download} onClick={() => download('json')}>Export JSON</Button></>} />
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] px-5 py-3">
          <div className="flex flex-wrap gap-1" role="tablist" aria-label="Filter events">
            {FILTERS.map((x) => <button key={x} role="tab" aria-selected={f === x} onClick={() => setF(x)} className={cx('rounded-md px-2.5 py-1 text-xs font-semibold', f === x ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/[0.05]')}>{x}</button>)}
          </div>
          <label className="relative ml-auto"><Search size={14} className="absolute left-2.5 top-2 text-slate-500" /><input aria-label="Search events" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="rounded-lg border border-white/10 bg-black/30 py-1.5 pl-8 pr-3 text-xs text-slate-200 outline-none focus:border-blue-500" /></label>
          <span className="text-xs text-slate-500">{list.length} events</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-xs">
            <thead><tr className="border-b border-white/[0.06] text-left text-[10px] uppercase tracking-wider text-slate-500">{['Time', 'Event', 'Attack Type', 'Risk', 'Severity', 'Tool', 'Decision', 'Reason'].map((h) => <th key={h} className="px-4 py-2.5 first:pl-5">{h}</th>)}</tr></thead>
            <tbody>
              {list.slice(0, 300).map((e) => (
                <Fragment key={e.id}>
                  <tr onClick={() => setOpen(open === e.id ? null : e.id)} className="cursor-pointer border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="py-2.5 pl-5 pr-4 font-mono text-slate-400">{fmtTime(e.ts)}</td>
                    <td className="px-4 font-semibold text-slate-200">{e.type}</td>
                    <td className="px-4 text-slate-300">{e.attackType}</td>
                    <td className="px-4 font-mono text-slate-200">{e.risk}</td>
                    <td className="px-4"><Badge value={e.severity}>{e.severity}</Badge></td>
                    <td className="px-4 font-mono text-slate-400">{e.tool}</td>
                    <td className="px-4">{e.decision !== '—' ? <Badge value={e.decision}>{e.decision === 'BLOCK' ? 'BLOCKED' : e.decision}</Badge> : '—'}</td>
                    <td className="max-w-[320px] truncate px-4 text-slate-400">{e.reason || e.description}</td>
                  </tr>
                  {open === e.id && <tr className="bg-black/20"><td colSpan={8} className="px-5 py-3 text-slate-300"><div><b>{e.runId}</b> · {e.scenario}</div><div className="mt-1">{e.description}</div>{e.reason && <div className="mt-1 text-slate-400">Reason: {e.reason}</div>}</td></tr>}
                </Fragment>
              ))}
            </tbody>
          </table>
          {!list.length && <Empty><ScrollText className="mx-auto mb-2 text-slate-600" />No events match this filter.</Empty>}
        </div>
      </Card>
    </div>
  )
}
