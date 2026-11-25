import { Users, Target, CheckCircle2, GitBranch as Github } from 'lucide-react'
import { Card, CardHeader, PageHeader } from '../components/ui.jsx'

const OUTCOMES = ['Sandboxed demo agent with 4 mock tools', 'Classifier + heuristic injection detection', 'Tool-call monitoring with policy enforcement', 'Explainable 0–100 risk score with reasons', 'Human-in-the-loop approval for risky actions', 'Compromised-agent (goal deviation) detection', 'Live dashboard, charts and exportable audit log', 'Mock tools & synthetic data only — defensive only']

export default function About() {
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="About" title="Project, Team & Technology" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader icon={Target} title="Problem Statement" />
          <dl className="space-y-3 p-5 text-sm">
            <div><dt className="text-xs text-slate-500">Title</dt><dd className="font-semibold text-white">Prompt Injection and Compromised AI Agent Detection</dd></div>
            <div><dt className="text-xs text-slate-500">Domain</dt><dd className="text-slate-200">AI in Cybersecurity and Fintech</dd></div>
            <div><dt className="text-xs text-slate-500">Description</dt><dd className="text-slate-400">A malicious instruction hidden in a document, email or web page can push an AI agent to act beyond its intended authority in banking and payment workflows.</dd></div>
            <div><dt className="text-xs text-slate-500">Challenge</dt><dd className="text-slate-400">To the model, instructions hidden in data look like legitimate content. Agents act quickly and autonomously, attacks evolve, and detection must not block normal tasks.</dd></div>
          </dl>
        </Card>
        <Card>
          <CardHeader icon={Users} title="Team" />
          <dl className="space-y-3 p-5 text-sm">
            <div><dt className="text-xs text-slate-500">Team Name</dt><dd className="text-lg font-semibold text-white">Zer0-Neuro</dd></div>
            <div><dt className="text-xs text-slate-500">Event</dt><dd className="text-slate-200">AVISHKAR'26 — 24 Hour Hackathon</dd></div>
            <div><dt className="text-xs text-slate-500">Institution</dt><dd className="text-slate-200">Adichunchanagiri Institute of Technology, Chikkamagaluru</dd></div>
            <div><dt className="text-xs text-slate-500">Source</dt><dd><a href="https://github.com/Hrishisthawarmath/agentshield" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-blue-400 hover:underline"><Github size={14} />Hrishisthawarmath/agentshield</a></dd></div>
          </dl>
        </Card>
      </div>
      <Card>
        <CardHeader icon={CheckCircle2} title="Delivered Outcomes" />
        <ul className="grid gap-2 p-5 sm:grid-cols-2">{OUTCOMES.map((o) => <li key={o} className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 size={14} className="text-emerald-400" />{o}</li>)}</ul>
      </Card>
    </div>
  )
}
