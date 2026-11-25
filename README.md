# AEGIS — Prompt Injection & Compromised AI Agent Detection

| Field | Value |
|---|---|
| Title of Problem Statement | Prompt Injection and Compromised AI Agent Detection |
| Domain | AI in Cybersecurity and Fintech |
| Team ID | _fill in_ |
| Team Name | _fill in_ |

A defensive prototype that runs a sandboxed banking agent on documents, emails and web pages containing hidden
instructions, **detects** the injection (classifier + heuristics), **monitors and blocks** unsafe tool calls, and shows
every flagged/blocked action with an **explainable risk score** on a live dashboard and API.

> Mock tools and synthetic data only. No real payment APIs. Defensive / detective use only.

## Folder structure

```
agentshield/
├── index.html, package.json, vite.config.js, vercel.json   # Vite app at repo root (Vercel auto-detects)
├── src/                      # React + Tailwind command-center dashboard
│   ├── src/components/       # Boot screen, sidebar, header, ticker, UI kit
│   ├── src/pages/            # Threat Command, Agent Sandbox, Scanner, Tool Monitor, Events, Test Suite, Rules, About
│   ├── src/lib/              # detector.js, monitor.js, agent.js (in-browser mirror of the Python engine)
│   └── src/data/             # model.json (exported classifier) + tasks.json
├── backend/                  # Python engine + FastAPI
│   ├── app/detection/        # heuristics.py, classifier.py, training_data.py, detector.py
│   ├── app/monitor/          # policy.py — tool-call monitor (scope, taint, DLP, baselines, limits)
│   ├── app/agent/            # runner.py — custom agent loop with naive planner + guard layer
│   ├── app/tools.py          # 4 sandboxed mock tools
│   ├── app/main.py           # FastAPI: /api/scan, /api/run, /api/run-suite, /api/events, /api/stats
│   ├── train_model.py        # trains model & exports to src/data
│   └── tests/                # pytest end-to-end checks
├── dashboard/streamlit_app.py# Streamlit analyst view
├── data/test_tasks.json      # 12 synthetic banking tasks (5 benign, 7 injected)
└── docs/
```

## Quick start

```bash
# Backend
cd backend
pip install -r requirements.txt
python train_model.py              # trains classifier, exports model.json + tasks.json to src/data
pytest -q                          # 3 end-to-end tests
uvicorn app.main:app --reload      # http://localhost:8000/docs

# Streamlit (from repo root)
streamlit run dashboard/streamlit_app.py

# Frontend (from repo root)
npm install
npm run dev                        # http://localhost:5173
# optional: VITE_API_URL=http://localhost:8000 npm run dev  -> enables "Verify via FastAPI" in Scanner
```

Deploy to Vercel by importing the repo with default settings (Framework: Vite, Root Directory: `./`). Output is `dist/`.

## How it works

1. **Sandboxed agent** (`backend/app/agent/runner.py`): reads the task's source, then plans tool calls. The planner is
   intentionally naive — it follows instructions found in content — so attacks are reproducible. Swap `plan_steps` for an
   LLM call to use a real model.
2. **Mock tools**: `read_document`, `payment_lookup`, `draft_email`, `initiate_payment` (staged only, never executed).
3. **Injection detector**: 10 regex heuristics (override, impersonation, concealment, financial command, exfiltration,
   tool syntax, bypass, false authority, obfuscation, path traversal) + TF-IDF/Logistic Regression classifier.
   `risk = 100 × (0.55 × heuristic + 0.45 × P(classifier))` (−8 for internal sources). ≥60 BLOCK, 30–59 FLAG.
4. **Tool-call monitor**: task tool allow-list, taint tracking from untrusted content, sandbox paths, lookup-volume
   baseline, sensitive fields, recipient allow-list, outbound DLP, money-movement approval and limits.
5. **Dashboard**: KPIs, risk-ranked input grid, charts, live event ticker, tool-call log, incident list with reasons,
   guard ON/OFF test suite with precision/recall and confusion matrix.

## Results on the synthetic suite

| Metric | Value |
|---|---|
| Precision / Recall | 100% / 100% (12 tasks) |
| Compromised runs, guard OFF | 7 / 12 |
| Compromised runs, guard ON | 0 / 12 (all 5 benign tasks complete) |
