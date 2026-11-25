import React, { useMemo, useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Bot, Database, FileText, FlaskConical, Globe, Mail, ScanSearch, ShieldCheck } from 'lucide-react'
import { Btn, Decision, Panel, SectionTitle, Stat, Tag, riskHex } from '../components/ui'
import { runTask } from '../lib/agent'
import { modelInfo } from '../lib/detector'

const CH_ICON = { document: FileText, email: Mail, web: Globe }
const PROFILES = ['Payments Operations Agent', 'Customer Support Agent', 'Compliance Research Agent', 'Treasury Reconciliation Agent']
const tip = { contentStyle: { background: '#0b1220', border: '1px solid #334155', borderRadius: 8, fontSize: 12 } }

export default function Command({ runs, events, calls, record, go, tasks }) {
  const [profile, setProfile] = useState(PROFILES[0])
  const [sel, setSel] = useState(tasks[3].id)
  const scans = events.filter((e) => e.type === 'content_scan')
  const blocked = events.filter((e) => e.decision === 'BLOCK')
  const flagged = events.filter((e) => e.decision === 'FLAG')
  const toolBlocked = calls.filter((c) => !c.executed).length
  const avg = Math.round(scans.reduce((s, e) => s + e.risk, 0) / Math.max(1, scans.length))
  const compromised = runs.filter((r) => r.compromised).length

  const latest = useMemo(() => {
    const m = new Map()
    runs.forEach((r) => { if (!m.has(r.task.id)) m.set(r.task.id, r) })
    return tasks.map((t) => m.get(t.id)).filter(Boolean).sort((a, b) => b.scan.score - a.scan.score)
  }, [runs, tasks])
  const malicious = latest.filter((r) => r.task.expected === 'malicious')
  const recall = Math.round((malicious.filter((r) => r.scan.verdict !== 'ALLOW').length / Math.max(1, malicious.length)) * 100)
  const benign = latest.filter((r) => r.task.expected === 'benign')
  const fpr = Math.round((benign.filter((r) => r.scan.verdict !== 'ALLOW').length / Math.max(1, benign.length)) * 100)

  const byChannel = ['document', 'email', 'web'].map((ch) => {
    const rs = latest.filter((r) => r.task.channel === ch)
    return { ch, avg: Math.round(rs.reduce((s, r) => s + r.scan.score, 0) / Math.max(1, rs.length)), blocked: rs.filter((r) => r.scan.verdict === 'BLOCK').length }
  })
  const timeline = [...runs].reverse().slice(-24).map((r, i) => ({ i: i + 1, risk: r.scan.score, label: r.task.id }))
  const cats = useMemo(() => {
    const c = {}
    latest.forEach((r) => r.scan.rules.forEach((h) => { c[h.name] = (c[h.name] || 0) + 1 }))
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [latest])
  const selRun = latest.find((r) => r.task.id === sel)

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-6">
        <div className="label text-cyan-400 flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />01 · Autonomous Agent Threat Defense</div>
        <h1 className="mt-2 text-3xl lg:text-4xl font-extrabold text-white">Prompt Injection & Compromised Agent Command Center</h1>
        <p className="mt-2 max-w-3xl text-slate-400">Real-time detection of malicious instructions hidden in documents, emails and web pages, live monitoring of agent tool calls, and explainable risk scores for banking & payment workflows.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Btn onClick={() => go('sandbox')}><Bot size={15} /> Run Agent Sandbox</Btn>
          <Btn variant="success" onClick={() => go('scanner')}><ScanSearch size={15} /> Scan Content (ML + Heuristics)</Btn>
          <Btn variant="primary" onClick={() => go('suite')}><FlaskConical size={15} /> Run Injection Test Suite</Btn>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Stat label="Content Sources Scanned" value={scans.length} sub={`${new Set(scans.map((s) => s.task_id)).size} unique docs · emails · pages`} badge={<Tag color="cyan">Live</Tag>} />
        <Stat label="Injections Blocked" value={`${scans.filter((s) => s.decision === 'BLOCK').length} Quarantined`} color="text-rose-400" sub="Content-level BLOCK verdicts" />
        <Stat label="Unsafe Tool Calls Stopped" value={toolBlocked} color="text-amber-300" sub={`${flagged.length} flagged for review`} />
        <Stat label="Mean Content Risk" value={`${avg} / 100`} color="text-cyan-300" sub="Classifier 45% · Heuristics 55%" />
        <Stat label="Detection Recall · FPR" value={`${recall}% · ${fpr}%`} color="text-emerald-400" sub={`On ${latest.length} synthetic banking tasks`} />
        <Stat label="Agent Compromises" value={compromised} color={compromised ? 'text-rose-400' : 'text-emerald-400'} sub={compromised ? 'Runs with guard OFF executed injected calls' : 'Zero with guard ON'} />
      </div>

      <Panel className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-2 text-sm text-slate-400"><Bot size={15} className="text-cyan-400" /> Agent Profile:</span>
          {PROFILES.map((p) => <button key={p} onClick={() => setProfile(p)} className={`rounded-md border px-2.5 py-1 font-mono text-[12px] ${profile === p ? 'border-cyan-400/60 bg-cyan-400/10 text-cyan-200' : 'border-slate-700 text-slate-400 hover:text-slate-200'}`}>{p}</button>)}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="text-sm text-slate-400">Target Task:</label>
          <select value={sel} onChange={(e) => setSel(e.target.value)} className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 font-mono text-[12px] text-slate-200">
            {tasks.map((t) => <option key={t.id} value={t.id}>{t.id} · {t.title}</option>)}
          </select>
          <Btn variant="success" onClick={() => record(runTask(tasks.find((t) => t.id === sel), true))}><ShieldCheck size={14} /> Run (guard ON)</Btn>
          <Btn variant="danger" onClick={() => record(runTask(tasks.find((t) => t.id === sel), false))}>Run unguarded</Btn>
          {selRun && <span className="ml-auto font-mono text-[12px] text-slate-400">last verdict <Decision d={selRun.scan.verdict} /> risk <b style={{ color: riskHex(selRun.scan.score) }}>{selRun.scan.score}</b></span>}
        </div>
      </Panel>

      <Panel className="p-5">
        <SectionTitle kicker="Content Threat Grid" tag="Synthetic data" title="Agent Inputs Ranked by Injection Risk"
          right={<div className="hidden md:flex gap-3 font-mono text-[11px] text-slate-400"><span><span className="text-emerald-400">●</span> Allow (&lt;30)</span><span><span className="text-amber-400">●</span> Flag</span><span><span className="text-rose-400">●</span> Block (≥60)</span></div>} />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {latest.map((r) => {
            const Icon = CH_ICON[r.task.channel]
            return (
              <button key={r.task.id} onClick={() => go('sandbox', r.task.id)} className="group text-left rounded-xl border border-slate-800 bg-slate-950/60 p-3 hover:border-cyan-500/50" style={{ borderTop: `3px solid ${riskHex(r.scan.score)}` }}>
                <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-100"><Icon size={14} className="text-slate-400" /><span className="truncate">{r.task.title}</span></div>
                <div className="mt-2 flex items-center justify-between font-mono text-[11px]"><span style={{ color: riskHex(r.scan.score) }} className="font-bold">RISK {r.scan.score}</span><span className="text-slate-500 truncate max-w-[55%]">{r.task.source}</span></div>
                <div className="mt-1.5 flex items-center justify-between font-mono text-[10.5px] text-slate-400"><span>{r.scan.rules.length} rules · ML {Math.round(r.scan.classifier_prob * 100)}%</span><Decision d={r.scan.verdict} /></div>
              </button>
            )
          })}
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel className="p-5 xl:col-span-2">
          <SectionTitle kicker="Risk Dynamics" tag="Live" title="Content Risk per Agent Run" />
          <div className="h-56">
            <ResponsiveContainer><AreaChart data={timeline}>
              <defs><linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#22d3ee" stopOpacity={0.5} /><stop offset="1" stopColor="#22d3ee" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" /><XAxis dataKey="label" stroke="#64748b" fontSize={10} /><YAxis domain={[0, 100]} stroke="#64748b" fontSize={10} /><Tooltip {...tip} />
              <Area type="monotone" dataKey="risk" stroke="#22d3ee" fill="url(#rg)" strokeWidth={2} />
            </AreaChart></ResponsiveContainer>
          </div>
        </Panel>
        <Panel className="p-5">
          <SectionTitle kicker="Attack Surface" title="Mean Risk by Channel" />
          <div className="h-56">
            <ResponsiveContainer><BarChart data={byChannel}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" /><XAxis dataKey="ch" stroke="#64748b" fontSize={11} /><YAxis domain={[0, 100]} stroke="#64748b" fontSize={10} /><Tooltip {...tip} />
              <Bar dataKey="avg" radius={[6, 6, 0, 0]}>{byChannel.map((d) => <Cell key={d.ch} fill={riskHex(d.avg)} />)}</Bar>
            </BarChart></ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel className="p-5 xl:col-span-2">
          <SectionTitle kicker="Event Stream" title="Latest Blocked & Flagged Actions" right={<Btn onClick={() => go('events')}>View all →</Btn>} />
          <div className="space-y-2">
            {[...blocked, ...flagged].slice(0, 6).map((e) => (
              <div key={e.id} className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                <Decision d={e.decision} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-slate-100">{e.task_id} · {e.type === 'content_scan' ? `Content scan of ${e.target}` : `Tool call ${e.target}()`}</div>
                  <div className="truncate font-mono text-[11px] text-slate-400">{e.reasons[0]}</div>
                </div>
                <span className="font-mono text-sm font-bold" style={{ color: riskHex(e.risk) }}>{e.risk}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel className="p-5">
          <SectionTitle kicker="Detection Signals" tag="Explainable" title="Top Triggered Rules" />
          <div className="space-y-3">
            {cats.map(([name, n]) => (
              <div key={name}>
                <div className="flex justify-between text-[12.5px]"><span className="text-slate-300">{name}</span><span className="font-mono text-cyan-300">{n}</span></div>
                <div className="mt-1 h-1.5 rounded bg-slate-800"><div className="h-1.5 rounded bg-gradient-to-r from-cyan-400 to-rose-500" style={{ width: `${(n / Math.max(...cats.map((c) => c[1]))) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel className="p-5">
        <div className="flex items-center gap-2 text-[15px] font-bold text-white"><Database size={16} className="text-cyan-400" /> Data Provenance & Model Transparency</div>
        <div className="label mt-1">Synthetic · Mock · Open-source only</div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {[
            ['Injection Classifier', 'MODEL', `TF-IDF (1–2 grams) + Logistic Regression · ${modelInfo.samples} synthetic samples · CV F1 ${modelInfo.cvF1}`, 'scikit-learn, exported to JSON for in-browser inference'],
            ['Heuristic Engine', 'RULES', '10 regex rules: override, impersonation, concealment, exfiltration, tool syntax, bypass, obfuscation…', 'Negation-aware, every hit cited in the risk output'],
            ['Sandboxed Tools', 'MOCK', 'read_document · payment_lookup · draft_email · initiate_payment', 'Dummy ledger; payments are staged only, never executed'],
          ].map(([t, tag, d, s]) => (
            <div key={t} className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">{t}<Tag color={tag === 'MOCK' ? 'amber' : 'violet'}>{tag}</Tag></div>
              <div className="mt-2 text-[12.5px] text-slate-300">{d}</div>
              <div className="mt-1 font-mono text-[10.5px] text-slate-500">{s}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}
