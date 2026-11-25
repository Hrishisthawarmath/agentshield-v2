import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

client = TestClient(app)
SCENARIOS = {s["id"]: s for s in json.loads((Path(__file__).resolve().parents[2] / "data" / "scenarios.json").read_text())}


def sim(sid, **kw):
    s = SCENARIOS[sid]
    body = {"goal": s["goal"], "content": s["content"], "source": s["source"], "resource": s.get("resource"), "name": s["name"], **kw}
    return client.post("/api/simulation/run", json=body).json()


def test_scan_explains_indirect_injection():
    r = client.post("/api/scan", json={"text": SCENARIOS["indirect"]["content"], "source": "document"}).json()
    assert r["level"] == "CRITICAL" and r["score"] >= 80
    assert {"Instruction Override", "Financial Action"} <= {s["label"] for s in r["signals"]}


def test_safe_request_allowed_and_attack_blocked():
    client.post("/api/reset")
    safe = sim("safe")
    assert safe["scan"]["level"] == "SAFE" and safe["agent"]["status"] == "SAFE"
    assert all(c["decision"] == "ALLOW" for c in safe["agent"]["calls"])
    bad = sim("indirect")
    assert bad["agent"]["status"] == "BLOCKED" and not bad["agent"]["compromised"]
    assert any(c["tool"] == "transfer_money" and c["decision"] == "BLOCK" for c in bad["agent"]["calls"])
    d = client.get("/api/dashboard").json()
    assert d["requests_scanned"] == 2 and d["safe_requests"] == 1 and d["actions_blocked"] >= 1


def test_policies_off_shows_compromise_and_reset_keeps_config():
    client.post("/api/policies/update", json={"policies": {f"P0{i}": False for i in range(1, 10)}})
    assert sim("indirect")["agent"]["status"] == "COMPROMISED"
    r = client.post("/api/reset").json()
    assert r["policies"]["P01"] is False and client.get("/api/dashboard").json()["requests_scanned"] == 0
    client.post("/api/policies/update", json={"policies": {f"P0{i}": True for i in range(1, 10)}})
    assert all(p["enabled"] for p in client.get("/api/policies").json())


def test_human_approval_flow():
    client.post("/api/reset")
    run = sim("direct", id="RUN-T1")
    pending = [c for c in run["agent"]["calls"] if c["status"] == "PENDING"]
    assert pending
    r = client.post("/api/tool/execute", json={"run_id": "RUN-T1", "call_id": pending[0]["id"], "decision": "REJECT"}).json()
    assert r["status"] == "BLOCKED" and r["resolution"] == "REJECTED"
    unknown = client.post("/api/tool/execute", json={"tool": "transfer_money", "args": {"amount": 90000, "to_account": "1"}}).json()
    assert unknown["decision"] == "BLOCK"
