import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FlaskConical, ShieldCheck, Play, ListChecks, ArrowRight, RotateCcw } from 'lucide-react'
import { useStore } from '../../store.jsx'
import { SAMPLE_TASKS, verdictOf, statusText } from '../../lib/requests.js'
import { Badge, Card } from '../../components/ui.jsx'
import VerdictCard from '../../components/VerdictCard.jsx'

const SOURCE_OPTIONS = [
  { value: 'user', label: 'I typed / pasted it myself' },
  { value: 'email', label: 'Pasted from an email' },
  { value: 'document', label: 'Pasted from a document' },
  { value: 'web', label: 'Pasted from a web page' },
]

const HARD_SET = SAMPLE_TASKS.filter((s) => s.id !== 'safe')
const BULK_CAP = 20

function snippet(r) {
  const text = (r.scan.text || r.goal || '').replace(/\s+/g, ' ').trim()
  return text.length > 90 ? `${text.slice(0, 90)}…` : text
}

export default function PromptLab() {
  const { store, submit, submitMany } = useStore()
  const [mode, setMode] = useState('single')

  // Single test
  const [singleText, setSingleText] = useState('')
  const [singleSource, setSingleSource] = useState('user')
  const [singleError, setSingleError] = useState('')
  const [singleId, setSingleId] = useState(null)
  const singleReq = useMemo(
    () => (singleId ? store.requests.find((r) => r.id === singleId) || null : null),
    [store, singleId],
  )

  // Bulk test
  const [bulkText, setBulkText] = useState('')
  const [bulkSource, setBulkSource] = useState('user')
  const [bulkError, setBulkError] = useState('')
  const [bulkIds, setBulkIds] = useState([])
  const [checked, setChecked] = useState(() => new Set(HARD_SET.map((s) => s.id)))
  const bulkReqs = useMemo(
    () => bulkIds.map((id) => store.requests.find((r) => r.id === id)).filter(Boolean),
    [store, bulkIds],
  )
  const bulkSummary = useMemo(() => {
    if (!bulkReqs.length) return null
    return {
      total: bulkReqs.length,
      caught: bulkReqs.filter((r) => r.scan.level !== 'SAFE').length,
      safe: bulkReqs.filter((r) => r.scan.level === 'SAFE').length,
      awaiting: bulkReqs.filter((r) => r.status === 'awaiting').length,
    }
  }, [bulkReqs])

  const testSingle = (e) => {
    e.preventDefault()
    const text = singleText.trim()
    if (!text) {
      setSingleError('Paste a prompt first — any text, from anywhere.')
      return
    }
    setSingleError('')
    const id = submit({
      goal: 'Lab test — pasted prompt',
      content: text,
      source: singleSource,
      resource: undefined,
    })
    if (id) {
      setSingleId(id)
      document.getElementById('single-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const testHardSet = () => {
    const selected = HARD_SET.filter((s) => checked.has(s.id))
    if (!selected.length) {
      setBulkError('Pick at least one hard prompt to test.')
      return
    }
    setBulkError('')
    const ids = submitMany(
      selected.map((s) => ({ goal: s.goal, content: s.content, source: s.source, resource: undefined })),
    )
    setBulkIds(ids)
    document.getElementById('bulk-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const testBulkPaste = (e) => {
    e.preventDefault()
    const lines = bulkText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, BULK_CAP)
    if (!lines.length) {
      setBulkError('Paste at least one prompt — one per line.')
      return
    }
    setBulkError('')
    const ids = submitMany(
      lines.map((line) => ({
        goal: 'Lab test — pasted prompt',
        content: line,
        source: bulkSource,
        resource: undefined,
      })),
    )
    setBulkIds(ids)
    document.getElementById('bulk-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const toggleHard = (id) => {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="fade-up space-y-6">
      <section className="card p-6 sm:p-8">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Prompt Lab</h1>
        </div>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400 sm:text-base">
          Test any prompt — paste it from a dataset, a document, an email, or anywhere else.
          The same check runs on it as on a real request, and the result explains itself in
          plain language. Hard prompts are the tricky ones attackers use to try to take over
          the assistant, so they are the best test of the protection.
        </p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Every test is saved to <Link to="/requests" className="font-semibold text-blue-700 dark:text-blue-400 underline">My Requests</Link>,
          and anything risky goes to the admin — exactly like a real request.
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setMode('single')}
            className={`btn ${mode === 'single' ? 'btn-primary' : 'btn-ghost'}`}
          >
            Single prompt
          </button>
          <button
            type="button"
            onClick={() => setMode('bulk')}
            className={`btn ${mode === 'bulk' ? 'btn-primary' : 'btn-ghost'}`}
          >
            Test many at once
          </button>
        </div>
      </section>

      {mode === 'single' && (
        <section className="card scroll-mt-4 p-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Test one prompt</h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Paste any prompt — long, short, from any database or dataset. Line breaks are fine.
          </p>
          <form onSubmit={testSingle} className="mt-4 space-y-3">
            <div>
              <label htmlFor="lab-text" className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">Paste the prompt</label>
              <textarea
                id="lab-text"
                className="input min-h-36"
                value={singleText}
                onChange={(e) => setSingleText(e.target.value)}
                placeholder="Paste the prompt here — for example a message from a dataset, a document, or an email."
              />
            </div>
            <div>
              <label htmlFor="lab-source" className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">Where did it come from?</label>
              <select id="lab-source" className="input" value={singleSource} onChange={(e) => setSingleSource(e.target.value)}>
                {SOURCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            {singleError && <p className="text-sm font-medium text-red-600 dark:text-red-400">{singleError}</p>}
            <button type="submit" className="btn btn-primary">
              <ShieldCheck className="h-4 w-4" /> Test this prompt
            </button>
          </form>

          {singleReq && (
            <div id="single-result" className="mt-6 scroll-mt-4 space-y-4 border-t border-slate-100 dark:border-slate-800 pt-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Result — {singleReq.id}</h3>
                <span className="flex gap-2">
                  <Link to={`/requests/${singleReq.id}`} className="btn btn-ghost !px-3">
                    <ListChecks className="h-4 w-4" /> Full detail
                  </Link>
                  <button
                    type="button"
                    className="btn btn-ghost !px-3"
                    onClick={() => { setSingleId(null); setSingleText('') }}
                  >
                    <RotateCcw className="h-4 w-4" /> Test another
                  </button>
                </span>
              </div>
              <VerdictCard request={singleReq} />
            </div>
          )}
        </section>
      )}

      {mode === 'bulk' && (
        <>
          <section className="card p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Hard test set</h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              The toughest prompts in the demo — one for each attack pattern. Pick the ones to
              run, then test them all at once.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {HARD_SET.map((s) => (
                <label key={s.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-blue-600"
                    checked={checked.has(s.id)}
                    onChange={() => toggleHard(s.id)}
                  />
                  <span>
                    <span className="block text-sm font-bold text-slate-900 dark:text-slate-100">{s.name}</span>
                    <span className="block text-sm text-slate-600 dark:text-slate-400">{s.plain}</span>
                  </span>
                </label>
              ))}
            </div>
            <button type="button" className="btn btn-primary mt-4" onClick={testHardSet}>
              <Play className="h-4 w-4" /> Test the selected hard prompts
            </button>
          </section>

          <section className="card p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Paste your own prompts</h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              One prompt per line, up to {BULK_CAP} at a time. Paste a whole list from a dataset
              and test it in one go. For a long prompt with line breaks, use the single test instead.
            </p>
            <form onSubmit={testBulkPaste} className="mt-4 space-y-3">
              <div>
                <label htmlFor="bulk-text" className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">Prompts — one per line</label>
                <textarea
                  id="bulk-text"
                  className="input min-h-36"
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={'Paste one prompt per line, for example:\nCheck my balance\nSummarize this invoice\nDraft a reply to the customer'}
                />
              </div>
              <div>
                <label htmlFor="bulk-source" className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">Where did they come from?</label>
                <select id="bulk-source" className="input" value={bulkSource} onChange={(e) => setBulkSource(e.target.value)}>
                  {SOURCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              {bulkError && <p className="text-sm font-medium text-red-600 dark:text-red-400">{bulkError}</p>}
              <button type="submit" className="btn btn-primary">
                <Play className="h-4 w-4" /> Test these prompts
              </button>
            </form>
          </section>

          {bulkReqs.length > 0 && (
            <section id="bulk-results" className="card scroll-mt-4 p-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Results</h2>
              {bulkSummary && (
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  <strong className="text-slate-800 dark:text-slate-200">{bulkSummary.total} tested</strong> ·{' '}
                  <strong className="text-red-700 dark:text-red-400">{bulkSummary.caught} caught</strong> ·{' '}
                  <strong className="text-emerald-700 dark:text-emerald-400">{bulkSummary.safe} safe</strong> ·{' '}
                  <strong className="text-amber-700">{bulkSummary.awaiting} waiting for an admin</strong>
                </p>
              )}
              <div className="mt-4 space-y-2">
                {bulkReqs.map((r) => {
                  const v = verdictOf(r.scan)
                  const st = statusText(r.status)
                  return (
                    <Link key={r.id} to={`/requests/${r.id}`} className="card card-hover flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-slate-900 dark:text-slate-100">{snippet(r)}</span>
                        <span className="block text-xs text-slate-500 dark:text-slate-400">{r.id} · Risk {r.scan.score}/100 · {st.label}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <Badge tone={v.tone}>{v.label}</Badge>
                        <ArrowRight className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                      </span>
                    </Link>
                  )
                })}
              </div>
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Tap any row for the full breakdown — every point explained, and what the assistant tried to do.
              </p>
            </section>
          )}
        </>
      )}
    </div>
  )
}
