import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useStore } from '../../store.jsx'
import { requestsForUser, statusText } from '../../lib/requests.js'
import { Badge, EmptyState, timeAgo } from '../../components/ui.jsx'

export default function UserPanel() {
  const { email } = useParams()
  const userEmail = decodeURIComponent(email || '')
  const { store } = useStore()
  const list = requestsForUser(store, userEmail)
  const name = list[0]?.userName || userEmail

  return (
    <div className="fade-up space-y-4">
      <Link to="/admin/requests" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 dark:text-blue-400">
        <ArrowLeft className="h-4 w-4" /> Back to all requests
      </Link>
      <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 p-4">
        <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{name}’s panel</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Viewing as admin — this is exactly what {name} sees in their own panel: only their requests,
          with the same verdicts and statuses. You can open any request to approve or deny it.
        </p>
        <p className="mt-1 font-mono text-xs text-slate-500 dark:text-slate-400">{userEmail}</p>
      </div>

      {list.length === 0 ? (
        <EmptyState title="No requests from this user" body="This user has not submitted anything yet." />
      ) : (
        <div className="space-y-2">
          {list.map((r) => (
            <Link key={r.id} to={`/admin/requests/${r.id}`} className="card card-hover block px-4 py-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{r.name} — {r.goal}</span>
                <span className="flex items-center gap-2">
                  <Badge tone={r.scan.level === 'SAFE' ? 'safe' : r.scan.level === 'LOW' ? 'review' : 'blocked'}>
                    {r.scan.level === 'SAFE' ? 'Safe' : r.scan.level === 'LOW' ? 'Needs review' : 'Blocked'} · {r.scan.score}/100
                  </Badge>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{statusText(r.status).label}</span>
                </span>
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{r.id} · {timeAgo(r.ts)}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
