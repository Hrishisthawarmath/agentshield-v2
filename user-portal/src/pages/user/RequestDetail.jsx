import { useParams, Link, Navigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useStore } from '../../store.jsx'
import VerdictCard from '../../components/VerdictCard.jsx'
import { Card, EmptyState, fmtTime } from '../../components/ui.jsx'

export default function RequestDetail() {
  const { id } = useParams()
  const { session, store, decide } = useStore()
  const req = store.requests.find((r) => r.id === id)
  const isAdmin = session?.role === 'admin'

  if (!req) return <EmptyState title="Request not found" body="It may have been cleared when the demo data was reset." />
  // A user may only open their own requests. An admin may open any.
  if (!isAdmin && req.userEmail !== session?.email) {
    return <Navigate to="/requests" replace />
  }

  const backTo = isAdmin ? '/admin/requests' : '/requests'
  const backLabel = isAdmin ? 'Back to all requests' : 'Back to My Requests'

  return (
    <div className="fade-up space-y-4">
      <Link to={backTo} className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 dark:text-blue-400">
        <ArrowLeft className="h-4 w-4" /> {backLabel}
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">{req.name}</h1>
          <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
            {req.id} · Submitted by {req.userName} ({req.userEmail}) · {fmtTime(req.ts)}
          </p>
        </div>
      </div>

      <VerdictCard
        request={req}
        showAdminActions={isAdmin}
        onDecide={(rid, decision) => decide(rid, decision)}
      />

      <Card>
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">What happened, step by step</h3>
        <ol className="mt-3 space-y-2">
          {req.events.map((e) => (
            <li key={e.id} className="flex gap-3 text-sm">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
              <span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{e.type}</span>
                <span className="text-slate-600 dark:text-slate-400"> — {e.description}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">{fmtTime(e.ts)}{e.reason ? ` · ${e.reason}` : ''}</span>
              </span>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  )
}
