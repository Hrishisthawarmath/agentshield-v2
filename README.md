# AgentShield — Prompt Injection & Compromised AI Agent Detection

| Field | Value |
|---|---|
| Title of Problem Statement | Prompt Injection and Compromised AI Agent Detection |
| Domain | AI in Cybersecurity and Fintech |
| Team Name | Zer0-Neuro |
| Event | AVISHKAR'26 — 24 Hour Hackathon, Adichunchanagiri Institute of Technology, Chikkamagaluru |

AgentShield is a runtime security layer for AI agents in banking workflows:

```
Untrusted Input → Detection → Risk Analysis → Policy Evaluation → Agent → Tool Call → Allow / Review / Block → Audit Log → Dashboard
```

> Mock tools and synthetic data only. No real banking or payment APIs. Defensive / detective use only.

## Pages

| Route | Purpose |
|---|---|
| `/` | Product overview, protection pipeline, capabilities |
| `/dashboard` | Live SOC dashboard: 8 dynamic KPIs, activity feed, approval queue, 4 charts, Demo Mode, Reset |
| `/simulator` | Attack Lab (9 scenarios) + custom input → scan → simulate agent → intercept → policy → decision |
| `/agent` | Agent status (SAFE / WARNING / COMPROMISED / BLOCKED), goal vs proposed action, permissions, timeline |
| `/tools` | 4 mock tools + unregistered-tool denial, call / block counts, per-tool activity |
| `/policies` | 9 runtime policies with enable/disable toggles, risk-scoring model |
| `/events` | Filterable, searchable audit log with CSV / JSON export |
| `/architecture`, `/about` | Architecture layers, stack, team |

## Engine

* **Detection** — 10 weighted heuristic signals (`data/rules.json`, negation-aware, zero-width / base64 de-obfuscation)
  + TF-IDF/Logistic Regression classifier (`src/data/model.json`, trained by `backend/train_model.py`).
* **Risk** — `score = min(100, Σ signal weights + classifier points)`; 0–29 SAFE → ALLOW, 30–59 LOW → REVIEW,
  60–79 HIGH / 80–100 CRITICAL → BLOCK. Every point is explained.
* **Agent** — deliberately naive sandboxed planner that obeys instructions in its context, so the guardrails provide
  safety. Tools: `read_file`, `payment_lookup`, `draft_email`, `fetch_web_content`. `transfer_money` / `approve_payment`
  are not registered and are always denied.
* **Policies** — P01–P09 (`data/policies.json`): untrusted content, payment approval, high-risk confirmation, credentials,
  unknown tools, parameter validation, goal deviation, data export, human approval for critical actions.
* The same engine exists in JavaScript (`src/engine/`) and Python (`backend/app/engine/`); both read the same JSON files
  and produce identical results.

## API (FastAPI)

`POST /api/scan` · `POST /api/simulation/run` · `POST /api/agent/run` · `POST /api/tool/execute` · `GET /api/events` ·
`GET /api/dashboard` · `GET /api/tools` · `GET /api/policies` · `POST /api/policies/update` · `POST /api/reset` ·
`GET /api/health` (docs at `/docs`).

## Run locally

```bash
# Backend
cd backend && pip install -r requirements.txt
pytest -q                          # engine + API tests
uvicorn app.main:app --reload      # http://localhost:8000/docs

# Frontend (repo root)
npm install
npm run dev                        # http://localhost:5173 — full engine runs in-browser
VITE_API_URL=http://localhost:8000 npm run dev   # route scans through FastAPI ("Security Engine Offline" fallback if unreachable)
```

## Deploy

Netlify: import the repo, leave Base directory empty. `netlify.toml` sets `npm run build`, publish `dist`, Node 20 and
the SPA fallback. Optionally set `VITE_API_URL` to a hosted FastAPI instance.

## Judge flow

Dashboard → Attack Simulator → **Indirect Prompt Injection** → CRITICAL 100/100 with signals → agent tries
`payment_lookup(*)` and `transfer_money` → policies block → BLOCKED → events + counters update → Events page →
**Safe Request** → SAFE → ALLOWED. Toggle all policies off on `/policies` and replay to see **AGENT COMPROMISED**.
