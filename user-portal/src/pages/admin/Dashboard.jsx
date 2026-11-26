import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'
import { useStore } from '../../store.jsx'
import { metrics, awaitingRequests, allEvents } from '../../lib/requests.js'
import { Card, Stat, EmptyState, timeAgo } from '../../components/ui.jsx'

const LEVEL_COLORS = { SAFE: '#10b981', LOW: '#f59e0b', HIGH: '#f97316', CRITICAL: '#ef4444' }

export default function AdminDashboard() {
  const { store } = useStore()
  const m = metrics(store)
  const awaiting = awaitingRequests(store)
  const events = allEvents(store).slice(0, 8)
  const byLevel = ['SAFE', 'LOW', 'HIGH', 'CRITICAL'].map((level) => ({
    level,
    count: store.requests.filter((r) => r.scan.level === level).length,
  }))

  return (
    <div className="fade-up space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Every user’s requests, threats, and decisions — in one place.</p>
        </div>
        {awaiting.length > 0 && (
          <Link to="/admin/queue" className="btn btn-danger">
            {awaiting.length} waiting for your decision →
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Requests checked" value={m.total} sub={`${m.safe} safe · ${m.threats} with a threat`} />
        <Stat label="Threats detected" value={m.threats} sub={`Average risk ${m.avgScore}/100`} />
        <Stat label="Actions blocked" value={m.blocked} sub={`${m.executed} actions ran`} />
        <Stat label="Awaiting decision" value={m.awaiting} sub={`${m.approved} approved · ${m.denied} denied`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Requests by risk level</h2>
          <div className="mt-3 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byLevel} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="level" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {byLevel.map((d) => <Cell key={d.level} fill={LEVEL_COLORS[d.level]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Latest activity</h2>
          {events.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No activity yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {events.map((e) => (
                <li key={e.id} className="flex items-start gap-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3 py-2">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${e.decision === 'BLOCKED' ? 'bg-red-500' : e.decision === 'APPROVED' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200">{e.type} — {e.userName}</span>
                    <span className="block truncate text-sm text-slate-600 dark:text-slate-400">{e.description}</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">{timeAgo(e.ts)} · Risk {e.risk}/100</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link to="/admin/events" className="mt-3 inline-block text-sm font-semibold text-blue-700 dark:text-blue-400">Open the full audit log →</Link>
        </Card>
      </div>

      {awaiting.length > 0 && (
        <Card>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Needs your decision now</h2>
          <div className="mt-3 space-y-2">
            {awaiting.slice(0, 3).map((r) => (
              <Link key={r.id} to={`/admin/requests/${r.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30 px-3 py-2.5">
                <span>
                  <span className="block text-sm font-bold text-slate-900 dark:text-slate-100">{r.userName} — {r.goal}</span>
                  <span className="block text-xs text-slate-600 dark:text-slate-400">{r.scan.attackType} · Risk {r.scan.score}/100 · {timeAgo(r.ts)}</span>
                </span>
                <span className="text-sm font-bold text-amber-800 dark:text-amber-300">Review →</span>
              </Link>
            ))}
          </div>
        </Card>
      )}
      {awaiting.length === 0 && (
        <EmptyState title="Nothing waiting" body="No requests are waiting for a decision right now. New risky requests will appear in the Approval Queue." />
      )}
    </div>
  )
}
