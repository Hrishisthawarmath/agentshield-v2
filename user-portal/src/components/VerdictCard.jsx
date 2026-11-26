import { ShieldCheck, AlertTriangle, Ban, Clock, CheckCircle2, XCircle } from 'lucide-react'
import {
  verdictOf,
  attackTypePlain,
  statusText,
  callStatusText,
  sourceLabel,
} from '../lib/requests.js'
import { Badge, Card, ScoreBar, TONE, fmtTime, timeAgo } from './ui.jsx'

const VERDICT_ICON = {
  safe: ShieldCheck,
  review: AlertTriangle,
  blocked: Ban,
}

export default function VerdictCard({ request, showAdminActions = false, onDecide }) {
  const { scan, agent } = request
  const v = verdictOf(scan)
  const st = statusText(request.status)
  const Icon = VERDICT_ICON[v.tone] || ShieldCheck
  const tone = TONE[v.tone]

  return (
    <div className="space-y-4">
      {/* Verdict */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${tone.chip}`}>
              <Icon className="h-6 w-6" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">{v.headline}</h2>
                <Badge tone={v.tone}>{v.label}</Badge>
              </div>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">{v.blurb}</p>
              <p className="mt-2 text-sm text-slate-600">
                <span className="font-semibold text-slate-800">{attackTypePlain(scan.attackType)}</span>
              </p>
            </div>
          </div>
          <Badge tone={request.status === 'allowed' ? 'safe' : request.status === 'awaiting' ? 'review' : request.status === 'approved' ? 'safe' : 'blocked'}>
            {st.label}
          </Badge>
        </div>

        <div className="mt-5">
          <ScoreBar score={scan.score} level={scan.level} />
        </div>

        <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
          <div><span className="font-semibold text-slate-800">Came from: </span>{sourceLabel(request.source)}{request.resource ? ` · ${request.resource}` : ''}</div>
          <div><span className="font-semibold text-slate-800">Checked: </span>{fmtTime(request.ts)} ({timeAgo(request.ts)})</div>
          <div className="sm:col-span-2"><span className="font-semibold text-slate-800">Your request: </span>{request.goal}</div>
        </div>

        {request.status === 'awaiting' && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <Clock className="mt-0.5 h-4 w-4 shrink-0" />
            <span><strong>Waiting for admin decision.</strong> An admin will review this request. Nothing risky has run, and the assistant is on hold until then.</span>
          </div>
        )}
        {request.decisionBy && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            {request.status === 'approved' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />}
            <span><strong>Decided by {request.decisionBy}</strong> · {fmtTime(request.decisionTs)}. {request.decisionNote}</span>
          </div>
        )}

        {showAdminActions && request.status === 'awaiting' && onDecide && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            <button type="button" className="btn btn-success" onClick={() => onDecide(request.id, 'approve')}>
              <CheckCircle2 className="h-4 w-4" /> Approve — run the safe actions
            </button>
            <button type="button" className="btn btn-danger" onClick={() => onDecide(request.id, 'deny')}>
              <XCircle className="h-4 w-4" /> Deny — block it
            </button>
          </div>
        )}
      </Card>

      {/* Why this score */}
      <Card>
        <h3 className="text-base font-bold text-slate-900">Why this score</h3>
        <p className="mt-0.5 text-sm text-slate-500">Every point is explained — nothing is just a colour.</p>
        {scan.signals.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">No warning signs were found in the words. The pattern checker also gave this a clean result.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {scan.signals.map((s) => (
              <li key={s.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                <div>
                  <div className="text-sm font-semibold text-slate-800">{s.label}</div>
                  <div className="text-sm text-slate-600">{s.explain}</div>
                  {s.matches && s.matches.length > 0 && (
                    <div className="mt-1 font-mono text-xs text-slate-500">Matched: {s.matches.slice(0, 3).join(' · ')}</div>
                  )}
                </div>
                <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-700 ring-1 ring-slate-200">+{s.weight} pts</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-sm text-slate-600">
          The pattern checker (a small trained classifier) added{' '}
          <strong className="text-slate-800">{scan.classifier.points} points</strong>{' '}
          with a confidence of {Math.round(scan.classifier.prob * 100)}%.
          {scan.decoded && scan.decoded.length > 0 && (
            <> Hidden encoded text was decoded and checked too: {scan.decoded.map((d) => `"${d}"`).join(', ')}.</>
          )}
          {scan.zeroWidth > 0 && <> {scan.zeroWidth} invisible characters were found and removed before checking.</>}
        </p>
      </Card>

      {/* What the assistant tried to do */}
      <Card>
        <h3 className="text-base font-bold text-slate-900">What the assistant tried to do</h3>
        <p className="mt-0.5 text-sm text-slate-500">Each action the assistant planned, and whether it ran. Nothing here moves real money or sends real email — this is a sandbox.</p>
        <ul className="mt-3 space-y-2">
          {agent.calls.map((c) => {
            const cs = callStatusText(c)
            return (
              <li key={c.id} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-800">{c.label}</span>
                  <Badge tone={cs.tone}>{cs.label}</Badge>
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  {c.tainted ? 'This action came from the untrusted content, not from you. ' : ''}
                  {c.reason}
                </div>
                {c.result && c.tool === 'payment_lookup' && c.result.balance && (
                  <div className="mt-1.5 rounded-lg bg-white px-2.5 py-2 font-mono text-xs text-slate-600 ring-1 ring-slate-200">
                    {c.result.name} · Balance {c.result.balance}
                  </div>
                )}
                {c.result && c.result.draft_id && (
                  <div className="mt-1.5 rounded-lg bg-white px-2.5 py-2 font-mono text-xs text-slate-600 ring-1 ring-slate-200">
                    Draft {c.result.draft_id} · {c.result.status} · To {c.result.to}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
        <p className="mt-3 text-sm text-slate-600">
          Assistant status: <strong className="text-slate-800">{agent.status}</strong> — {agent.summary}
        </p>
      </Card>
    </div>
  )
}
