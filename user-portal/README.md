# AgentShield — User & Admin

Your AI assistant, guarded. AgentShield checks every request before your assistant acts. If a hidden instruction in a document or email tries to push it somewhere you did not ask, it gets stopped — and you get told why, in plain language.

This is the **user-facing** build: one site with two panels, a user panel and an admin panel, sharing the same requests and decisions in the same browser.

> Demo — synthetic data only. No real money, email, or data. All checks run in your browser.

## The two panels

### User panel — for the person asking
- **My Assistant** (`/`) — a plain-language explainer plus a "Check my request" box. Type a request, paste an email or document, or try a sample task.
- **My Requests** (`/requests`) — only your own requests, each with its verdict and status.
- **How it works** (`/how-it-works`) — the pipeline in plain language, and a list of what AgentShield never does.

Submitting a request runs the same pipeline every time: scan → agent → policy.
You get a verdict card: **Safe / Needs review / Blocked**, a risk score from 0–100 with a simple bar, the reasons in plain English, and what the assistant tried to do and whether it ran.

- Safe requests (score 0–29) are allowed straight away.
- Anything scoring 30 or more waits for an admin. While it waits, your panel reads **"Waiting for admin decision"**. Once the admin acts it becomes **"Approved — action ran"** or **"Denied — action blocked"**.

A user never sees admin controls, policy toggles, the approval queue, or anyone else's requests.

### Admin panel — for the person deciding
- **Dashboard** (`/admin`) — requests, threats, blocked actions, awaiting decisions, requests by risk level, and the latest activity.
- **Approval Queue** (`/admin/queue`) — every request waiting for a decision, oldest first, with **Approve / Deny** buttons.
- **All Requests** (`/admin/requests`) — every request from every user, with per-user, risk-level and status filters. From here the admin can open a specific user's panel.
- **User panel view** (`/admin/users/:email`) — the requests of one user, exactly as that user sees them.
- **Events** (`/admin/events`) — the full audit log of every check, block, approval and denial, with CSV export.
- **Policies** (`/admin/policies`) — the nine runtime policies, with toggles. Toggling affects future checks only.

Approving runs the held (review) actions in the sandbox and marks them executed; denying blocks them. Actions the policies already blocked stay blocked either way. The decision updates the user's panel immediately, because both panels share the same store in this browser.

## Demo accounts

No password, no sign-up. Pick a card on the sign-in screen.

| Account | Email | Sees |
| --- | --- | --- |
| Demo User | demo.user@gmail.com | Only their own requests |
| Admin | demo.admin@gmail.com | Every user's requests, the queue, the audit log, policies |

Sign out to switch accounts. A third demo user (Meera Nair) exists only in the seeded data, so the admin view is genuinely multi-user.

## How the check works

Same risk model throughout:

| Score | Level | Decision |
| ---: | --- | --- |
| 0–29 | SAFE | ALLOW |
| 30–59 | LOW | REVIEW |
| 60–79 | HIGH | BLOCK |
| 80–100 | CRITICAL | BLOCK |

- **10 weighted heuristic signals** (`data/rules.json`) — instruction override, goal deviation, tool manipulation, financial action, data exfiltration, privilege escalation, system-prompt extraction, sensitive-data access, security bypass, obfuscation — with zero-width and base64 de-obfuscation.
- **TF-IDF / logistic regression classifier** (`src/data/model.json`, 300 training samples, CV F1 0.7681).
- **9 runtime policies** (`data/policies.json`, P01–P09).
- **4 mock tools** — `read_file`, `payment_lookup`, `draft_email`, `fetch_web_content`. Money tools (`transfer_money`, `approve_payment`) are not registered, so any attempt to call them is always refused.
- Score = sum of signal points + classifier points, capped at 100. Every point is explained on the verdict card.

The detection engine (`src/engine/core.js`, `src/engine/agent.js`) and its data (`data/rules.json`, `data/policies.json`, `data/scenarios.json`, `src/data/model.json`) are the same engine used by the creator build, copied unchanged. The sandboxed agent is deliberately naive — it obeys instructions found in content, including injected ones — so the guardrails, not the agent's own judgement, provide the safety.

## Try it in three minutes

1. Sign in as **Demo User**. On My Assistant, try the **"Fintech: Balance-Check Hijack"** sample — it scores critical and goes to the admin queue.
2. Sign out, sign in as **Admin**. Open the **Approval Queue** and deny it.
3. Sign out, sign in as **Demo User** again. The request now reads **"Denied — action blocked"**.
4. Try the **"Safe Request"** sample — it is allowed straight away, no admin needed.

## For developers

```bash
npm install   # install
npm run dev   # run locally — http://localhost:5174
npm run build # production build
npm run preview
```

State lives in `localStorage` under `agentshield.user.store.v1` (requests, decisions, policies) and `agentshield.user.session.v1` (the signed-in demo account). First load seeds three demo requests. Resetting is a code-level `resetState()` call; clearing the site data in the browser also reseeds on next load.

## Deploy

Netlify: import the repo and leave the Base directory empty. `netlify.toml` sets the build command to `npm run build`, publishes `dist`, uses Node 20 and adds the SPA fallback. No environment variables are needed — the whole engine runs in the browser.

## Honest notes

This is a defensive prototype, not a production banking control. It detects and blocks inside a sandbox; it is not connected to any real account, payment rail or mailbox. Mock tools and dummy data only.

Detection must not block normal work. A clean request scores SAFE and is allowed, and the samples include one on purpose, so a high block rate on attacks is not bought by blocking everything.
