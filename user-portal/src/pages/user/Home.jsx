import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ShieldCheck, Search, ListChecks, Clock3, ArrowRight, FlaskConical } from 'lucide-react'
import { useStore } from '../../store.jsx'
import { SAMPLE_TASKS, requestsForUser, metrics, statusText } from '../../lib/requests.js'
import { Badge, Card, EmptyState, timeAgo } from '../../components/ui.jsx'

const SOURCE_OPTIONS = [
  { value: 'user', label: 'I typed it myself' },
  { value: 'email', label: 'Pasted from an email' },
  { value: 'document', label: 'Pasted from a document' },
  { value: 'web', label: 'Pasted from a web page' },
]

const SHOW_SAMPLES = ['safe', 'indirect', 'fintech', 'direct', 'obfusc']

export default function Home() {
  const { session, store, submit } = useStore()
  const navigate = useNavigate()
  const [goal, setGoal] = useState('')
  const [content, setContent] = useState('')
  const [source, setSource] = useState('user')
  const [error, setError] = useState('')

  const mine = requestsForUser(store, session.email)
  const m = metrics(store)
  const myAwaiting = mine.filter((r) => r.status === 'awaiting').length
  const samples = SAMPLE_TASKS.filter((s) => SHOW_SAMPLES.includes(s.id))

  const fillSample = (s) => {
    setGoal(s.goal)
    setContent(s.content)
    setSource(s.source)
    setError('')
    document.getElementById('check-box')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const onSubmit = (e) => {
    e.preventDefault()
    const g = goal.trim()
    const c = content.trim()
    if (!g && !c) {
      setError('Type a request or pick a sample task below.')
      return
    }
    const id = submit({
      goal: g || 'Check the pasted content',
      content: c || g,
      source: c ? source : 'user',
      resource: undefined,
    })
    if (id) navigate(`/requests/${id}`)
  }

  return (
    <div className="fade-up space-y-6">
      <section className="card p-6 sm:p-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
          Your AI assistant, guarded.
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400 sm:text-base">
          Your assistant reads documents, emails and web pages to help you — but a hidden
          instruction inside that content can try to push it to do something you never asked
          for, like moving money or sending your details outside. AgentShield checks every
          request <strong className="text-slate-800 dark:text-slate-200">before</strong> the assistant acts,
          explains the risk in plain language, and stops anything dangerous.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200"><Search className="h-4 w-4 text-blue-600 dark:text-blue-400" /> 1 · Check</div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Every word is scanned for hidden instructions and scored 0–100.</p>
          </div>
          <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200"><ListChecks className="h-4 w-4 text-blue-600 dark:text-blue-400" /> 2 · Explain</div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">You see the score and the reason for every point — in plain English.</p>
          </div>
          <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200"><ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" /> 3 · Stop or allow</div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Safe requests run. Risky ones are blocked or sent to an admin first.</p>
          </div>
        </div>
        {myAwaiting > 0 && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30 p-3 text-sm text-amber-900 dark:text-amber-200">
            <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <strong>{myAwaiting} of your request{myAwaiting > 1 ? 's are' : ' is'} waiting for an admin decision.</strong>{' '}
              <Link to="/requests" className="font-semibold underline">See them in My Requests</Link>
            </span>
          </div>
        )}
      </section>

      <section id="check-box" className="card scroll-mt-4 p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Check my request</h2>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Paste the task, email or document — or pick a sample below. The check runs in your browser.</p>
        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <div>
            <label htmlFor="goal" className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">What should the assistant do?</label>
            <input id="goal" className="input" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. Check my account balance and prepare a summary" />
          </div>
          <div>
            <label htmlFor="content" className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">Paste the content it will read (email, document, or web page)</label>
            <textarea id="content" className="input min-h-28" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Paste the message or document text here. Leave empty to check just the request above." />
          </div>
          <div>
            <label htmlFor="source" className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">Where did this content come from?</label>
            <select id="source" className="input" value={source} onChange={(e) => setSource(e.target.value)}>
              {SOURCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {error && <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}
          <button type="submit" className="btn btn-primary">
            <ShieldCheck className="h-4 w-4" /> Check this request
          </button>
        </form>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Try a sample — see protection work</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {samples.map((s) => (
            <button key={s.id} type="button" onClick={() => fillSample(s)} className="card card-hover p-4 text-left">
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{s.name}</span>
              <span className="mt-1 block text-sm leading-relaxed text-slate-600 dark:text-slate-400">{s.plain}</span>
              <span className="mt-2 block text-xs font-semibold text-blue-700 dark:text-blue-400">{s.expected} →</span>
            </button>
          ))}
          <Link to="/how-it-works" className="card card-hover flex flex-col justify-between p-4">
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">How does the check work?</span>
            <span className="mt-1 block text-sm leading-relaxed text-slate-600 dark:text-slate-400">Four plain steps — no security jargon, and a list of what we never do.</span>
            <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 dark:text-blue-400">Read how it works <ArrowRight className="h-3.5 w-3.5" /></span>
          </Link>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Your recent requests</h2>
          <Link to="/requests" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 dark:text-blue-400">View all <ArrowRight className="h-4 w-4" /></Link>
        </div>
        {mine.length === 0 ? (
          <EmptyState title="No requests yet" body="Check a request above, or try a sample task — it will show up here with its verdict." />
        ) : (
          <div className="space-y-2">
            {mine.slice(0, 3).map((r) => (
              <Link key={r.id} to={`/requests/${r.id}`} className="card card-hover flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <span>
                  <span className="block text-sm font-bold text-slate-900 dark:text-slate-100">{r.name} — {r.goal}</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">{r.id} · {timeAgo(r.ts)} · Risk {r.scan.score}/100</span>
                </span>
                <span className="flex items-center gap-2">
                  <Badge tone={r.scan.level === 'SAFE' ? 'safe' : r.scan.level === 'LOW' ? 'review' : 'blocked'}>
                    {r.scan.level === 'SAFE' ? 'Safe' : r.scan.level === 'LOW' ? 'Needs review' : 'Blocked'}
                  </Badge>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{statusText(r.status).label}</span>
                </span>
              </Link>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          So far across all users: {m.total} requests checked, {m.threats} with a threat found, {m.blocked} actions blocked, {m.awaiting} waiting for an admin.
        </p>
      </section>
    </div>
  )
}
