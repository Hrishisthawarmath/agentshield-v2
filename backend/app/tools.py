"""Sandboxed mock banking tools. Dummy data only - no real payment APIs."""
from datetime import datetime, timezone

TRANSACTIONS = {
    "TXN-77821": {"status": "PAID", "amount": 48200, "payee": "Acme Office Supplies", "date": "2026-11-02"},
    "TXN-55102": {"status": "FAILED_DEBITED", "amount": 1250, "payee": "FreshMart", "date": "2026-11-24"},
    "TXN-88410": {"status": "PENDING", "amount": 112000, "payee": "Globex Logistics", "date": "2026-11-20"},
    "TXN-66231": {"status": "DISPUTED", "amount": 8999, "payee": "ShopFast Online", "date": "2026-11-23"},
    "TXN-90017": {"status": "PENDING", "amount": 35000, "payee": "Initech Services", "date": "2026-11-22"},
}
ACCOUNTS = {f"ACC-{1000 + i}": {"holder": f"Customer {i}", "balance": 10000 * i} for i in range(1, 51)}
SANDBOX_FILES = {"invoices/", "inbox/", "shared/", "kyc/", "policies/", "https://"}

TOOL_SPECS = {
    "read_document": {"risk": "low", "desc": "Read a file/email/web page from the sandbox", "args": ["path"]},
    "payment_lookup": {"risk": "medium", "desc": "Look up a transaction or account (read-only)", "args": ["txn_id", "account"]},
    "draft_email": {"risk": "medium", "desc": "Create an email DRAFT (never sent)", "args": ["to", "subject", "body"]},
    "initiate_payment": {"risk": "critical", "desc": "Stage a payment (mock, requires human approval)", "args": ["to_account", "amount"]},
}


def execute(tool: str, args: dict, content_store: dict | None = None):
    ts = datetime.now(timezone.utc).isoformat()
    if tool == "read_document":
        path = args.get("path", "")
        return {"ok": True, "ts": ts, "content": (content_store or {}).get(path, "<mock file contents>")}
    if tool == "payment_lookup":
        if "txn_id" in args:
            return {"ok": True, "ts": ts, "record": TRANSACTIONS.get(args["txn_id"], {"status": "NOT_FOUND"})}
        return {"ok": True, "ts": ts, "record": ACCOUNTS.get(args.get("account", ""), {"status": "NOT_FOUND"})}
    if tool == "draft_email":
        return {"ok": True, "ts": ts, "draft_id": f"DRAFT-{abs(hash(str(args))) % 10000:04d}", "sent": False}
    if tool == "initiate_payment":
        return {"ok": True, "ts": ts, "staged_id": f"PAY-{abs(hash(str(args))) % 10000:04d}", "executed": False}
    return {"ok": False, "ts": ts, "error": "unknown tool"}
