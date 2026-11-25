"""Sandboxed banking agent + tool-security gateway (policy engine, decisions, audit events). Mock tools only."""
import json
import re

from .scanner import ROOT, scan

POLICIES = json.loads((ROOT / "data" / "policies.json").read_text())["policies"]
POLICY_NAME = {p["id"]: p["name"] for p in POLICIES}
TOOLS = {
    "read_file": {"name": "File Reader", "fn": "read_file()", "permission": "READ", "risk": "LOW", "base": 10, "desc": "Reads files from the sandboxed /uploads store."},
    "payment_lookup": {"name": "Payment Lookup", "fn": "payment_lookup()", "permission": "SENSITIVE", "risk": "HIGH", "base": 45, "desc": "Looks up balances & transactions in the mock core-banking ledger."},
    "draft_email": {"name": "Email Draft", "fn": "draft_email()", "permission": "WRITE", "risk": "MEDIUM", "base": 30, "desc": "Creates an email draft. Never sends."},
    "fetch_web_content": {"name": "Web Fetch", "fn": "fetch_web_content()", "permission": "EXTERNAL", "risk": "MEDIUM", "base": 30, "desc": "Fetches a page from allow-listed mock websites."},
}
MONEY_TOOLS = {"transfer_money", "approve_payment", "initiate_payment"}
ALLOWED_DOMAINS = ["examplebank.in", "customer.examplebank.in", "rbi.example"]
SECRET_RE = re.compile(r"secret|\.env|credential|password|system_prompt|\.\./", re.I)
SENSITIVE_RE = re.compile(r"customer records|account numbers|card|cvv|otp|passwords?|credentials|customer list|balances", re.I)
LEDGER = {"CUST-1042": {"name": "A. Sharma (synthetic)", "balance": "₹1,84,220.55", "limit": "₹2,00,000",
                        "txns": ["UPI Grocery ₹1,240", "Electricity bill ₹2,310", "Salary credit ₹85,000", "Fuel ₹3,100", "UPI Pharmacy ₹640"]}}


def default_policy_state() -> dict:
    return {p["id"]: True for p in POLICIES}


def inr(n) -> str:
    s = str(int(n or 0))
    if len(s) <= 3:
        return s
    head, tail = s[:-3], s[-3:]
    groups = []
    while len(head) > 2:
        groups.insert(0, head[-2:])
        head = head[:-2]
    return ",".join(([head] if head else []) + groups + [tail])


def jdump(v) -> str:
    return json.dumps(v, ensure_ascii=False, separators=(",", ":"))


def goal_tools(goal: str) -> list[str]:
    g, t = goal.lower(), []
    for tool, pat in (("read_file", r"read|summar|invoice|document|statement|file|kyc"),
                      ("payment_lookup", r"balance|account|payment status|transaction|look ?up|card limit"),
                      ("draft_email", r"draft|reply|email|respond"),
                      ("fetch_web_content", r"fetch|web|page|url|site|circular")):
        if re.search(pat, g):
            t.append(tool)
    return t or ["read_file"]


def _cust_id(text: str) -> str:
    m = re.search(r"CUST-\d{4}", text)
    return m.group(0) if m else "CUST-1042"


def _legit_calls(goal, content, source, resource):
    paths = {"document": "uploads/document.pdf", "email": "inbox/message.eml", "web": "web/page.html", "tool_output": "tool/output.json"}
    out = []
    for tool in goal_tools(goal):
        if tool == "read_file" and source == "user" and not resource:
            continue
        if tool == "read_file":
            args = {"path": resource or paths.get(source)}
        elif tool == "payment_lookup":
            args = {"customer_id": _cust_id(content), "fields": ["balance", "last_5_txns"]}
        elif tool == "draft_email":
            args = {"to": "customer@customer.examplebank.in", "subject": "Re: your request", "body": "Summary of your request and next steps."}
        else:
            args = {"url": "https://rbi.example/circulars/latest"}
        out.append({"tool": tool, "args": args})
    return out


def _parse_amount(text):
    m = re.search(r"(?:₹|rs\.?\s?|inr\s?|amount\s*=\s*)([\d,]{3,})", text, re.I)
    return int(m.group(1).replace(",", "")) if m else None


def _injected_calls(sc):
    ids = {s["id"] for s in sc["signals"]}
    text = "\n".join([sc["text"], *sc["decoded"]])
    calls = []
    em = re.search(r"[\w.+-]+@[\w-]+(\.[\w-]+)+", text, re.A)
    acc = re.search(r"account[^\d\n]{0,20}(\d{8,})|to_account\s*=\s*'?(\d{8,})", text, re.I)
    account = next((g for g in acc.groups() if g), None) if acc else None
    if re.search(r"payment_lookup tool|payment_lookup\s*\(|customer accounts|all customers", text, re.I) or {"privesc", "financial"} <= ids:
        calls.append({"tool": "payment_lookup", "args": {"customer_id": "*", "scope": "ALL_CUSTOMERS"}})
    if "financial" in ids:
        if re.search(r"approve any payment", text, re.I):
            calls.append({"tool": "approve_payment", "args": {"payment_id": "ANY", "bypass_verification": True}})
        else:
            calls.append({"tool": "transfer_money", "args": {"amount": _parse_amount(text) or 50000, "to_account": account or "UNKNOWN"}})
    if "sysreveal" in ids or ("credential" in ids and re.search(r"secret|password|credential|\.\.", text, re.I)):
        calls.append({"tool": "read_file", "args": {"path": "config/system_prompt.txt" if "sysreveal" in ids else "../../config/secrets.env"}})
    if "exfil" in ids:
        calls.append({"tool": "draft_email", "args": {"to": em.group(0) if em else "unknown@external.example", "subject": "Data export",
                                                      "body": "Customer records CUST-1001..1050: names, account numbers, balances"}})
    url = re.search(r"https?://[^\s'\")]+", text)
    if url and "tool" in ids:
        calls.append({"tool": "fetch_web_content", "args": {"url": url.group(0)}})
    return [{**c, "tainted": True} for c in calls]


def _domain(s: str) -> str:
    return (s.split("@")[1] if "@" in s else re.sub(r"^https?://", "", s).split("/")[0]).lower()


def _allowed(d: str) -> bool:
    return any(d == a or d.endswith("." + a) for a in ALLOWED_DOMAINS)


def describe_call(c) -> str:
    a, t = c["args"], c["tool"]
    if t == "transfer_money":
        return f"Transfer ₹{inr(a.get('amount'))} to account {a.get('to_account')}"
    if t == "approve_payment":
        return "Approve any pending payment without verification"
    if t == "payment_lookup":
        return "Retrieve ALL customer accounts" if a.get("customer_id") == "*" else f"Look up balance & transactions for {a.get('customer_id')}"
    if t == "read_file":
        return f"Read restricted file {a['path']}" if SECRET_RE.search(a["path"]) else f"Read {a['path']}"
    if t == "draft_email":
        return f"Draft reply to {a['to']}" if _allowed(_domain(a["to"])) else f"Send customer information to external address {a['to']}"
    if t == "fetch_web_content":
        return f"Fetch {a['url']}"
    return f"{t}()"


def evaluate_call(call, sc, goal_set, policies) -> dict:
    on = lambda pid: policies.get(pid) is not False  # noqa: E731
    spec, a, v = TOOLS.get(call["tool"]), call["args"], []

    def add(pid, decision, reason):
        if on(pid):
            v.append({"policy": pid, "decision": decision, "reason": reason})

    if call.get("tainted"):
        if sc["score"] >= 60:
            add("P01", "BLOCK", f"Call originates from untrusted {sc['source']} content rated {sc['level']} ({sc['score']}/100).")
        elif sc["score"] >= 30:
            add("P01", "REVIEW", f"Call originates from untrusted content rated {sc['level']}.")
    if call["tool"] in MONEY_TOOLS:
        add("P02", "REVIEW", "Payment action requires human approval.")
    if spec and spec["risk"] == "HIGH" and (sc["score"] >= 30 or a.get("customer_id") == "*"):
        add("P03", "REVIEW", f"{spec['name']} is a SENSITIVE tool and the request context is not clean.")
    if SECRET_RE.search(jdump(a)):
        add("P04", "BLOCK", "Agents cannot access credentials, secrets or system prompts.")
    if not spec:
        add("P05", "BLOCK", f'Unknown tool "{call["tool"]}" is not registered in the sandbox.' + (" Unauthorized financial action." if call["tool"] in MONEY_TOOLS else ""))
    if a.get("customer_id") == "*":
        add("P06", "BLOCK", "Wildcard customer_id — bulk lookups are not permitted.")
    if (a.get("amount") or 0) > 50000:
        add("P06", "BLOCK", f"Amount ₹{inr(a['amount'])} exceeds the ₹50,000 sandbox limit.")
    if a.get("to") and not _allowed(_domain(a["to"])):
        add("P06", "REVIEW", f"Recipient domain {_domain(a['to'])} is not on the allow-list.")
    if a.get("url") and not _allowed(_domain(a["url"])):
        add("P06", "REVIEW", f"URL domain {_domain(a['url'])} is not on the allow-list.")
    if call["tool"] not in goal_set:
        add("P07", "BLOCK", "The requested tool action exceeds the original user goal (goal deviation).")
    if call["tool"] in ("draft_email", "fetch_web_content") and SENSITIVE_RE.search(jdump(a)) and not _allowed(_domain(a.get("to") or a.get("url") or "")):
        add("P08", "BLOCK", "Sensitive customer data cannot be exported outside the bank.")
    risk = spec["base"] if spec else 70
    if call.get("tainted"):
        risk = max(risk, sc["score"])
    if any(x["decision"] == "BLOCK" for x in v):
        risk = max(risk, 85)
    elif v:
        risk = max(risk, 65)
    if call.get("tainted") and call["tool"] in MONEY_TOOLS:
        risk = max(risk, 95)
    risk = min(100, risk)
    decision = "BLOCK" if any(x["decision"] == "BLOCK" for x in v) else "REVIEW" if v else "ALLOW"
    if decision == "ALLOW" and risk >= 60 and on("P09"):
        v.append({"policy": "P09", "decision": "REVIEW", "reason": "Critical action (risk ≥ 60) requires human approval."})
        decision = "REVIEW"
    return {"decision": decision, "risk": risk, "violations": v, "reason": v[0]["reason"] if v else "Within goal scope, parameters valid, context clean."}


def execute_tool(call, content: str) -> dict:
    a, t = call["args"], call["tool"]
    if t == "read_file":
        return {"simulated": True, "note": "Sandbox decoy: restricted file contents withheld"} if SECRET_RE.search(a["path"]) else {"path": a["path"], "preview": content[:140]}
    if t == "payment_lookup":
        if a.get("customer_id") == "*":
            return {"simulated": True, "rows": 50, "note": "Synthetic bulk dataset returned (sandbox)"}
        c = LEDGER.get(a["customer_id"], LEDGER["CUST-1042"])
        return {"customer_id": a["customer_id"], "name": c["name"], "balance": c["balance"], "last_5_txns": c["txns"]}
    if t == "draft_email":
        return {"draft_id": f"DRF-{(len(a['to']) * 97 + len(a['subject'])) % 9000 + 1000}", "status": "DRAFT (not sent)", "to": a["to"]}
    if t == "fetch_web_content":
        return {"status": 200, "url": a["url"], "title": "Mock page (sandbox)"}
    return {"simulated": True, "note": "Sandbox only — no funds moved, no real API called"}


def agent_status(calls) -> tuple[str, bool]:
    tainted = [c for c in calls if c.get("tainted")]
    compromised = any(c["executed"] for c in tainted)
    status = "COMPROMISED" if compromised else "WARNING" if any(c["status"] == "PENDING" for c in calls) else "BLOCKED" if tainted else "SAFE"
    return status, compromised


def run_agent(goal, content, source="user", resource=None, policies=None, scan_result=None) -> dict:
    policies = policies or default_policy_state()
    sc = scan_result or scan(content, source)
    goal_set = goal_tools(goal)
    planned = [{**c, "tainted": False} for c in _legit_calls(goal, content, source, resource)] + (_injected_calls(sc) if sc["score"] >= 30 else [])
    calls = []
    for i, c in enumerate(planned):
        ev = evaluate_call(c, sc, goal_set, policies)
        executed = ev["decision"] == "ALLOW"
        calls.append({"id": i + 1, **c, "label": describe_call(c), **ev, "executed": executed,
                      "status": "EXECUTED" if executed else "BLOCKED" if ev["decision"] == "BLOCK" else "PENDING",
                      "result": execute_tool(c, sc["text"]) if executed else None})
    status, compromised = agent_status(calls)
    dev = next((c for c in calls if c.get("tainted") or c["tool"] not in goal_set), None)
    if dev:
        deviation = {"detected": True, "original": goal, "current": dev["label"],
                     "severity": "CRITICAL" if dev["tool"] in MONEY_TOOLS or dev["tool"] == "draft_email" or dev["risk"] >= 80 else "HIGH",
                     "action": "EXECUTED (policies disabled)" if compromised else dev["decision"]}
    else:
        deviation = {"detected": False, "original": goal, "current": goal, "severity": "NONE", "action": "ALLOW"}
    return {"goal": goal, "goalTools": goal_set, "source": source, "calls": calls, "status": status, "compromised": compromised, "deviation": deviation,
            "summary": "Agent completed the user task with permitted tools." if any(c["executed"] and not c.get("tainted") for c in calls) else "No legitimate result produced."}


def _sev(r):
    return "CRITICAL" if r >= 80 else "HIGH" if r >= 60 else "LOW" if r >= 30 else "SAFE"


def build_events(run, start_ts) -> list[dict]:
    sc, agent, run_id = run["scan"], run.get("agent"), run["id"]
    ev, t = [], [start_ts]

    def push(typ, severity, description, risk=None, tool="—", decision="—", reason=""):
        t[0] += 350
        ev.append({"id": f"{run_id}-{len(ev) + 1}", "runId": run_id, "ts": t[0], "type": typ, "severity": severity, "description": description,
                   "risk": sc["score"] if risk is None else risk, "attackType": sc["attackType"], "tool": tool, "decision": decision,
                   "reason": reason, "scenario": run.get("name")})

    push("REQUEST RECEIVED", "INFO", f'Untrusted {sc["source"].replace("_", " ")} input received for goal: "{run["goal"]}"', risk=0)
    push("CONTENT ANALYZED", sc["level"], f'Risk {sc["score"]}/100 · {len(sc["signals"])} signal(s) · classifier p={sc["classifier"]["prob"]}',
         reason=", ".join(s["label"] for s in sc["signals"]) or "No malicious signals")
    if sc["level"] != "SAFE":
        push("SUSPICIOUS CONTENT" if sc["level"] == "LOW" else "PROMPT INJECTION DETECTED", sc["level"], f'{sc["attackType"]} detected',
             decision=sc["recommended"].split(" ")[0], reason=", ".join(f'{s["label"]} +{s["weight"]}' for s in sc["signals"]))
    if not agent:
        return ev
    for c in agent["calls"]:
        push("TOOL REQUEST INTERCEPTED", _sev(c["risk"]) if c.get("tainted") else "INFO",
             f'{c["tool"]}({", ".join(f"{k}={jdump(v)}" for k, v in c["args"].items())})', tool=c["tool"], risk=c["risk"])
        for v in c["violations"]:
            push("POLICY VIOLATION", "CRITICAL" if v["decision"] == "BLOCK" else "HIGH", f'{v["policy"]} — {POLICY_NAME.get(v["policy"])}',
                 tool=c["tool"], risk=c["risk"], decision=v["decision"], reason=v["reason"])
        d = c["decision"]
        typ = "ACTION ALLOWED" if d == "ALLOW" else "ACTION BLOCKED" if d == "BLOCK" else "HUMAN REVIEW REQUIRED"
        sev = ("CRITICAL" if c.get("tainted") else "SAFE") if d == "ALLOW" else _sev(c["risk"]) if d == "BLOCK" else "HIGH"
        push(typ, sev, c["label"], tool=c["tool"], risk=c["risk"], decision=d, reason=c["reason"])
    dv = agent["deviation"]
    if dv["detected"]:
        push("GOAL DEVIATION DETECTED", dv["severity"], f'Original: "{dv["original"]}" → Proposed: "{dv["current"]}"', decision=dv["action"], reason="Compromised-agent behaviour")
    if agent["compromised"]:
        push("AGENT COMPROMISED", "CRITICAL", "Untrusted instruction executed — protective policies were disabled.", decision="EXECUTED")
    return ev


def run_pipeline(id, goal, content, source="user", resource=None, policies=None, ts=0, name=None, scenarioId=None, with_agent=True) -> dict:
    sc = scan(content, source)
    agent = run_agent(goal, content, source, resource, policies, sc) if with_agent else None
    run = {"id": id, "name": name or "Custom input", "scenarioId": scenarioId, "goal": goal, "content": content, "source": source,
           "resource": resource, "ts": ts, "scan": sc, "agent": agent}
    return {**run, "events": build_events(run, ts)}
