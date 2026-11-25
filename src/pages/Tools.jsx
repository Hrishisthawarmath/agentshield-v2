import { useState } from 'react'
import { FileText, CreditCard, Mail, Globe, ShieldOff, ChevronDown } from 'lucide-react'
import { useMetrics } from '../store.jsx'
import { TOOLS } from '../engine/agent.js'
import { Badge, Button, Card, PageHeader, Empty, fmtArgs, fmtTime } from '../components/ui.jsx'
import { DecisionPill } from '../components/security.jsx'

const ICON = { read_file: FileText, payment_lookup: CreditCard, draft_email: Mail, fetch_web_content: Globe }

export default function Tools() {
  const m = useMetrics()
  const [open, setOpen] = useState(null)
  const unknown = m.calls.filter((c) => !TOOLS[c.tool])
  const rows = (k) => (k === 'unknown' ? unknown : m.calls.filter((c) => c.tool === k))
  const cards = [...Object.entries(TOOLS), ['unknown', { name: 'Unregistered tools', fn: 'transfer_money() · approve_payment()', permission: 'NONE', risk: 'CRITICAL', desc: 'Calls to tools that do not exist in the sandbox — always denied by P05.' }]]
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Tool Security" title="Tool Security & Permissions" subtitle="Four mock tools — no real banking or payment APIs. Every call is routed through the AgentShield interceptor." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map(([k, t]) => {
          const Icon = ICON[k] || ShieldOff; const r = rows(k)
          const last = r[r.length - 1]
          return (
            <Card key={k} className="p-5">
              <div className="flex items-start justify-between"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20"><Icon size={18} /></span>
                <div><div className="font-semibold text-white">{t.name}</div><code className="font-mono text-xs text-slate-500">{t.fn}</code></div></div>
                <Badge value={k === 'unknown' ? 'BLOCKED' : 'ACTIVE'} dot>{k === 'unknown' ? 'DENIED' : 'ACTIVE'}</Badge></div>
              <p className="mt-3 text-xs text-slate-400">{t.desc}</p>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                <div><dt className="text-slate-500">Permission</dt><dd className="mt-1"><Badge value="INFO">{t.permission}</Badge></dd></div>
                <div><dt className="text-slate-500">Risk</dt><dd className="mt-1"><Badge value={t.risk}>{t.risk}</Badge></dd></div>
                <div><dt className="text-slate-500">Calls</dt><dd className="mt-1 font-mono text-lg text-white">{r.length}</dd></div>
                <div><dt className="text-slate-500">Blocked</dt><dd className="mt-1 font-mono text-lg text-red-300">{r.filter((c) => c.status === 'BLOCKED').length}</dd></div>
              </dl>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500"><span>Last activity: {last ? fmtTime(last.ts) : '—'}</span>
                <Button size="sm" icon={ChevronDown} onClick={() => setOpen(open === k ? null : k)} aria-expanded={open === k}>View Activity</Button></div>
              {open === k && (
                <ul className="mt-3 max-h-60 space-y-1.5 overflow-auto">
                  {r.length ? [...r].reverse().map((c) => (
                    <li key={c.runId + c.id} className="rounded-md bg-black/25 p-2 text-[11px]"><div className="flex items-center justify-between gap-2"><code className="truncate font-mono text-slate-300">{c.tool}({fmtArgs(c.args)})</code><DecisionPill call={c} /></div><div className="mt-1 text-slate-500">{c.runId} · risk {c.risk} · {c.reason}</div></li>
                  )) : <Empty>No calls yet.</Empty>}
                </ul>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
