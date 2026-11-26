import { Link } from 'react-router-dom'
import { CheckCircle2, XCircle } from 'lucide-react'
import { useStore } from '../../store.jsx'
import { awaitingRequests, attackTypePlain } from '../../lib/requests.js'
import { Badge, EmptyState, LivePill, timeAgo } from '../../components/ui.jsx'
import VerdictCard from '../../components/VerdictCard.jsx'

export default function Queue() {
  const { store, decide } = useStore()
  const queue = awaitingRequests(store)

  return (
    <div className="fade-up space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Approval Queue</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
            Every request that scored 30 or higher, or had an action held for review. Approve runs the
            held actions in the sandbox; deny blocks them. Actions the policies already blocked stay
            blocked either way. Your decision shows up in the user’s panel straight away.
          </p>
        </div>
        <LivePill />
      </div>

      {queue.length === 0 ? (
        <EmptyState
          title="Queue is clear"
          body="No requests are waiting for a decision. Risky requests from any user will appear here, oldest first."
        />
      ) : (
        <div className="space-y-5">
          {queue.map((r) => (
            <article key={r.id} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{r.userName} — {r.goal}</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {r.id} · {r.userEmail} · {timeAgo(r.ts)} · {attackTypePlain(r.scan.attackType)}
                  </p>
                </div>
                <Badge tone={r.scan.level === 'LOW' ? 'review' : 'blocked'}>
                  {r.scan.level} · {r.scan.score}/100
                </Badge>
              </div>
              <VerdictCard request={r} showAdminActions onDecide={(id, d) => decide(id, d)} />
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn btn-success" onClick={() => decide(r.id, 'approve')}>
                  <CheckCircle2 className="h-4 w-4" /> Approve
                </button>
                <button type="button" className="btn btn-danger" onClick={() => decide(r.id, 'deny')}>
                  <XCircle className="h-4 w-4" /> Deny
                </button>
                <Link to={`/admin/requests/${r.id}`} className="btn btn-outline">Open full detail</Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
