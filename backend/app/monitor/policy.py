"""Tool-call monitor: flags unsafe or out-of-pattern agent actions. Mirrored in frontend/src/lib/monitor.js."""
import re

TRUSTED_DOMAINS = ("@securebank.example", "@customer.example")
SENSITIVE = re.compile(r"\b(\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}|cvv|otp|password|api[_ ]?key|secret)\b", re.I)
PAYMENT_LIMIT = 50000
MAX_LOOKUPS = 3


def evaluate_call(call: dict, task: dict, history: list, tainted: bool):
    """Return decision dict: ALLOW / FLAG / BLOCK with risk and reasons."""
    tool, args = call["tool"], call.get("args", {})
    reasons, risk = [], 0
    if tool not in task.get("allowed_tools", []):
        risk += 45
        reasons.append(f"Tool '{tool}' is outside the task's allowed scope {task.get('allowed_tools')}")
    if tainted:
        risk += 30
        reasons.append("Call originated from instructions found in untrusted content (taint tracking)")
    if tool == "read_document":
        path = str(args.get("path", ""))
        if ".." in path or "secret" in path.lower() or path.startswith("/"):
            risk += 60
            reasons.append(f"Path '{path}' escapes the sandbox or targets secrets")
    elif tool == "payment_lookup":
        n = sum(1 for h in history if h["tool"] == "payment_lookup") + 1
        if n > MAX_LOOKUPS:
            risk += 40
            reasons.append(f"Out-of-pattern volume: {n} lookups in one task (baseline <= {MAX_LOOKUPS})")
        if "fields" in args and SENSITIVE.search(str(args["fields"])):
            risk += 50
            reasons.append("Requests sensitive card/OTP fields")
        if "account" in args and "txn_id" not in args:
            risk += 15
            reasons.append("Account-level lookup when task references a transaction")
    elif tool == "draft_email":
        to = str(args.get("to", ""))
        if not to.endswith(TRUSTED_DOMAINS):
            risk += 35
            reasons.append(f"Recipient '{to}' is an untrusted external domain")
        if SENSITIVE.search(str(args.get("body", ""))):
            risk += 50
            reasons.append("Email body contains card numbers / OTP / credentials (DLP)")
    elif tool == "initiate_payment":
        risk += 40
        reasons.append("Critical tool: money movement always needs human approval")
        if float(args.get("amount", 0) or 0) > PAYMENT_LIMIT:
            risk += 25
            reasons.append(f"Amount {args.get('amount')} exceeds agent limit {PAYMENT_LIMIT}")
    risk = min(100, risk)
    decision = "BLOCK" if risk >= 60 else "FLAG" if risk >= 30 else "ALLOW"
    if not reasons:
        reasons.append("Within task scope and normal usage pattern")
    return {"decision": decision, "risk": risk, "reasons": reasons}
