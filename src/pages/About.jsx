import React from 'react'
import { ArrowRight } from 'lucide-react'
import { Panel, SectionTitle, Tag } from '../components/ui'

const META = [['Title of Problem Statement', 'Prompt Injection and Compromised AI Agent Detection'], ['Domain', 'AI in Cybersecurity and Fintech'], ['Team ID', '—'], ['Team Name', '—']]
const FLOW = ['Untrusted input (doc / email / web)', 'Injection detector (classifier + heuristics)', 'Agent planner (custom loop)', 'Tool-call monitor (scope · taint · DLP · baselines)', 'Mock tools (sandbox)', 'Event log → dashboard / API']

export default function About() {
  return (
    <div className="space-y-6">
      <div>
        <div className="label text-cyan-400">08 · Problem Statement & Architecture</div>
        <h1 className="mt-2 text-3xl font-extrabold text-white">Prompt Injection and Compromised AI Agent Detection</h1>
      </div>
      <Panel bracket className="p-5">
        <div className="grid gap-3 md:grid-cols-4">
          {META.map(([k, v]) => <div key={k} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3"><div className="label">{k}</div><div className="mt-1 text-[14px] font-semibold text-white">{v}</div></div>)}
        </div>
      </Panel>
      <div className="grid gap-6 lg:grid-cols-2">
        {[
          ['2 · Problem Description', 'A malicious instruction hidden in a document, email or web page can push an AI agent to act beyond its intended authority in banking and payment workflows.'],
          ['3 · Background / Context', 'Banks are adopting AI agents that read documents, emails and web pages and then call tools such as payment lookups or email drafts.'],
          ['4 · Current Challenges', 'To the model, instructions hidden in data look like legitimate content. Agents act quickly and autonomously, attacks keep evolving, and detection must not block normal tasks.'],
          ['6 · Expected Outcome', 'Run agent on test tasks with injected content → detect and block → dashboard of events, with an explainable risk output (score + clear reasons) via a live dashboard, web app or API.'],
        ].map(([t, d]) => <Panel key={t} className="p-5"><div className="label text-cyan-400">{t}</div><p className="mt-2 text-[14px] text-slate-300">{d}</p></Panel>)}
      </div>
      <Panel className="p-5">
        <SectionTitle kicker="5 · Proposed Solution" title="End-to-end Pipeline" />
        <div className="flex flex-wrap items-center gap-2">
          {FLOW.map((f, i) => (
            <React.Fragment key={f}>
              <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 px-3 py-2 text-[12.5px] text-cyan-100">{f}</div>
              {i < FLOW.length - 1 && <ArrowRight size={16} className="text-slate-500" />}
            </React.Fragment>
          ))}
        </div>
        <ul className="mt-5 grid gap-2 md:grid-cols-2 text-[13px] text-slate-300">
          <li>✔ Sandboxed demo agent with 4 mock tools (file read, payment lookup, email draft, staged payment)</li>
          <li>✔ Classifier (TF-IDF + Logistic Regression) plus 10 explainable heuristics</li>
          <li>✔ Tool-call monitor flags unsafe / out-of-pattern actions with reasons</li>
          <li>✔ Dashboard of flagged & blocked actions, exportable event log</li>
          <li>✔ FastAPI backend (/api/scan, /api/run, /api/run-suite, /api/events) + Streamlit view</li>
          <li>✔ Guard ON / OFF comparison proves impact without blocking benign tasks</li>
        </ul>
      </Panel>
      <Panel className="p-5">
        <SectionTitle kicker="7 · Constraints" title="Compliance by Design" />
        <div className="flex flex-wrap gap-2">
          {['Mock tools & dummy data only', 'No real payment APIs', 'Synthetic / public data', 'Open-source stack', 'Defensive & detective only', '24h · 3–4 member build'].map((c) => <Tag key={c} color="emerald">{c}</Tag>)}
        </div>
        <div className="mt-4 label">Stack</div>
        <div className="mt-2 flex flex-wrap gap-2">{['Python', 'FastAPI', 'scikit-learn', 'Streamlit', 'Custom agent loop', 'React + Vite', 'Tailwind CSS', 'Recharts'].map((s) => <Tag key={s} color="slate">{s}</Tag>)}</div>
      </Panel>
    </div>
  )
}
