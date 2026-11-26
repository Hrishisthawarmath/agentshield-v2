import { useState } from 'react'
import { Download } from 'lucide-react'
import { useStore } from '../../store.jsx'
import { allEvents } from '../../lib/requests.js'
import { Badge, EmptyState, fmtTime } from '../../components/ui.jsx'

function toCsv(rows) {
  const head = ['time', 'user', 'type', 'description', 'risk', 'decision', 'reason']
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  return [head.join(','), ...rows.map((r) => head.map((h) => esc(r[h])).join(','))].join('\n')
}

export default function Events() {
  const { store } = useStore()
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const events = allEvents(store)

  const filtered = events.filter((e) => {
    if (filter === 'blocked' && e.decision !== 'BLOCKED') return false
    if (filter === 'approved' && e.decision !== 'APPROVED') return false
    if (filter === 'flagged' && !(e.type.includes('INJECTION') || e.type.includes('SUSPICIOUS') || e.type.includes('DEVIATION'))) return false
    if (query && !`${e.description} ${e.type} ${e.userName}`.toLowerCase().includes(query.toLowerCase())) return false
    return true
  })

  const downloadCsv = () => {
    const rows = filtered.map((e) => ({
      time: new Date(e.ts).toISOString(),
      user: e.userEmail,
      type: e.type,
      description: e.description,
      risk: e.risk,
      decision: e.decision,
      reason: e.reason,
    }))
    const blob = new Blob([toCsv(rows)], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'agentshield-events.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fade-up space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Events — Audit Log</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Every check, block, approval and denial, with its reasons. Nothing is hidden.</p>
        </div>
        <button type="button" className="btn btn-outline" onClick={downloadCsv}>
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <div className="card flex flex-wrap gap-2 p-3">
        {[
          ['all', 'All events'],
          ['blocked', 'Blocked'],
          ['approved', 'Approved'],
          ['flagged', 'Flagged'],
        ].map(([v, label]) => (
          <button
            key={v}
            type="button"
            onClick={() => setFilter(v)}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${filter === v ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:bg-slate-700'}`}
          >
            {label}
          </button>
        ))}
        <input className="input !w-auto flex-1" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search events…" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No events match" body="Try a different filter or search." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Risk</th>
                <th className="px-4 py-3">Decision</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500 dark:text-slate-400">{fmtTime(e.ts)}</td>
                  <td className="px-4 py-3">
                    <span className="block font-semibold text-slate-800 dark:text-slate-200">{e.type}</span>
                    <span className="block text-slate-600 dark:text-slate-400">{e.description}</span>
                    {e.reason && <span className="block text-xs text-slate-500 dark:text-slate-400">{e.reason}</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-400">{e.userName}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-800 dark:text-slate-200">{e.risk}/100</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <Badge tone={e.decision === 'BLOCKED' ? 'blocked' : e.decision === 'APPROVED' ? 'safe' : e.decision === 'REVIEW' ? 'review' : 'neutral'}>
                      {e.decision}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
