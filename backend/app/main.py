"""AgentShield API - FastAPI service exposing the scanner, sandbox agent and event log."""
import json
import time
from collections import Counter
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .agent import run_task
from .detection import analyze
from .detection.classifier import load as load_model
from .tools import TOOL_SPECS
from . import engine as eng

TASKS = {t["id"]: t for t in json.loads((Path(__file__).resolve().parents[2] / "data" / "test_tasks.json").read_text())}
EVENTS: list[dict] = []
SCAN_EVENTS = {"REQUEST RECEIVED", "CONTENT ANALYZED", "PROMPT INJECTION DETECTED", "SUSPICIOUS CONTENT"}

app = FastAPI(title="AgentShield API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


class ScanIn(BaseModel):
    text: str
    trust: str = "external"


class RunIn(BaseModel):
    task_id: str
    guard: bool = True


@app.get("/api/health")
def health():
    m = load_model()
    return {"status": "ok", "model": m["type"], "cv_f1": m["cv_f1"], "tasks": len(TASKS), "engine": eng.MODEL_INFO}


@app.get("/api/tasks")
def tasks():
    return list(TASKS.values())


@app.get("/api/tools")
def tool_specs():
    return [{"id": k, **v} for k, v in eng.TOOLS.items()]


@app.get("/api/tools/legacy")
def legacy_tool_specs():
    return TOOL_SPECS


class ScanV2In(BaseModel):
    text: str = ""
    content: str | None = None
    source: str = "user"
    trust: str | None = None


@app.post("/api/scan")
def scan(body: ScanV2In):
    """Explainable risk scan: score 0-100, level, attack type, signals with points, classifier output."""
    return eng.scan(body.content if body.content is not None else body.text, body.source)


@app.post("/api/scan/legacy")
def scan_legacy(body: ScanIn):
    return analyze(body.text, body.trust)


# ---- AgentShield v2 runtime API (mirrors the in-browser engine) ----
STATE: dict = {"policies": eng.default_policy_state(), "runs": {}, "events": [], "seq": 0}


class SimIn(BaseModel):
    goal: str
    content: str
    source: str = "user"
    resource: str | None = None
    id: str | None = None
    name: str | None = None
    scenarioId: str | None = None
    policies: dict | None = None
    ts: int | None = None
    with_agent: bool = True


def _now() -> int:
    return int(time.time() * 1000)


def _record(run: dict) -> dict:
    STATE["runs"][run["id"]] = run
    STATE["events"].extend(run["events"])
    return run


@app.post("/api/simulation/run")
def simulation_run(body: SimIn):
    """Full pipeline: scan -> agent plan -> tool interception -> policy -> decision -> audit events."""
    STATE["seq"] += 1
    return _record(eng.run_pipeline(id=body.id or f"API-{STATE['seq']:04d}", goal=body.goal, content=body.content, source=body.source,
                                    resource=body.resource, policies=body.policies or STATE["policies"], ts=body.ts or _now(),
                                    name=body.name, scenarioId=body.scenarioId, with_agent=body.with_agent))


class AgentIn(BaseModel):
    id: str | None = None
    goal: str
    content: str
    source: str = "user"
    resource: str | None = None
    name: str | None = None
    policies: dict | None = None
    ts: int | None = None


@app.post("/api/agent/run")
def agent_run(body: AgentIn):
    sc = eng.scan(body.content, body.source)
    agent = eng.run_agent(body.goal, body.content, body.source, body.resource, body.policies or STATE["policies"], sc)
    run = {"id": body.id or f"API-{len(STATE['runs']) + 1:04d}", "name": body.name, "goal": body.goal, "scan": sc, "agent": agent}
    events = [e for e in eng.build_events(run, body.ts or _now()) if e["type"] not in SCAN_EVENTS]
    if run["id"] in STATE["runs"]:
        STATE["runs"][run["id"]]["agent"] = agent
    STATE["events"].extend(events)
    return {"agent": agent, "events": events}


class ToolExecIn(BaseModel):
    run_id: str | None = None
    call_id: int | None = None
    decision: str | None = None
    tool: str | None = None
    args: dict | None = None
    goal: str = ""


@app.post("/api/tool/execute")
def tool_execute(body: ToolExecIn):
    """Resolve a REVIEW decision (APPROVE/REJECT), or gate an ad-hoc tool call through the policy engine."""
    if body.run_id and body.call_id and body.decision:
        run = STATE["runs"].get(body.run_id)
        if not run or not run.get("agent"):
            raise HTTPException(404, "unknown run")
        call = next((c for c in run["agent"]["calls"] if c["id"] == body.call_id), None)
        if not call or call["status"] != "PENDING":
            raise HTTPException(409, "call is not awaiting approval")
        ok = body.decision.upper() == "APPROVE"
        call.update(executed=ok, status="EXECUTED" if ok else "BLOCKED", resolution="APPROVED" if ok else "REJECTED",
                    result=eng.execute_tool(call, run["scan"]["text"]) if ok else None)
        run["agent"]["status"], run["agent"]["compromised"] = eng.agent.agent_status(run["agent"]["calls"])
        STATE["events"].append({"id": f"{body.run_id}-H{body.call_id}", "runId": body.run_id, "ts": _now(),
                                "type": "HUMAN APPROVED" if ok else "HUMAN BLOCKED", "severity": "LOW" if ok else "HIGH",
                                "description": call["label"], "risk": call["risk"], "attackType": run["scan"]["attackType"],
                                "tool": call["tool"], "decision": "ALLOW" if ok else "BLOCK", "reason": "Analyst decision", "scenario": run.get("name")})
        return call
    if not body.tool:
        raise HTTPException(422, "provide run_id/call_id/decision or tool/args")
    sc = eng.scan(json.dumps(body.args or {}), "tool_output")
    call = {"tool": body.tool, "args": body.args or {}, "tainted": False}
    ev = eng.evaluate_call(call, sc, eng.agent.goal_tools(body.goal) if body.goal else list(eng.TOOLS), STATE["policies"])
    return {**ev, "result": eng.execute_tool(call, "") if ev["decision"] == "ALLOW" else None}


@app.get("/api/policies")
def policies():
    return [{**p, "enabled": STATE["policies"].get(p["id"], True)} for p in eng.POLICIES]


class PolicyIn(BaseModel):
    id: str | None = None
    enabled: bool | None = None
    policies: dict | None = None


@app.post("/api/policies/update")
def policies_update(body: PolicyIn):
    if body.policies:
        STATE["policies"].update({k: bool(v) for k, v in body.policies.items() if k in STATE["policies"]})
    if body.id:
        if body.id not in STATE["policies"]:
            raise HTTPException(404, "unknown policy")
        STATE["policies"][body.id] = (not STATE["policies"][body.id]) if body.enabled is None else body.enabled
    return policies()


@app.get("/api/dashboard")
def dashboard():
    runs = list(STATE["runs"].values())
    calls = [c for r in runs if r.get("agent") for c in r["agent"]["calls"]]
    scores = [r["scan"]["score"] for r in runs]
    return {"agents_monitored": 1, "requests_scanned": len(runs),
            "threats_detected": sum(r["scan"]["level"] != "SAFE" for r in runs),
            "actions_blocked": sum(c["status"] == "BLOCKED" for c in calls),
            "actions_reviewed": sum(c["decision"] == "REVIEW" for c in calls),
            "safe_requests": sum(r["scan"]["level"] == "SAFE" for r in runs),
            "critical_threats": sum(r["scan"]["level"] == "CRITICAL" for r in runs),
            "overall_risk": round(sum(scores[-10:]) / max(1, len(scores[-10:]))),
            "by_attack_type": Counter(r["scan"]["attackType"] for r in runs if r["scan"]["level"] != "SAFE"),
            "events": len(STATE["events"])}


@app.post("/api/reset")
def reset():
    """Clears runs, events and counters; keeps policy configuration."""
    STATE["runs"].clear()
    STATE["events"].clear()
    STATE["seq"] = 0
    EVENTS.clear()
    return {"status": "reset", "policies": STATE["policies"]}


@app.post("/api/run")
def run(body: RunIn):
    task = TASKS.get(body.task_id)
    if not task:
        raise HTTPException(404, "unknown task")
    res = run_task(task, body.guard)
    EVENTS.extend(res["events"])
    return res


@app.post("/api/run-suite")
def run_suite(guard: bool = True):
    rows = []
    for t in TASKS.values():
        r = run_task(t, guard)
        EVENTS.extend(r["events"])
        rows.append({"task": t["id"], "expected": t["expected"], "score": r["content_scan"]["score"],
                     "verdict": r["content_scan"]["verdict"], "outcome": r["outcome"]})
    tp = sum(1 for r in rows if r["expected"] == "malicious" and r["verdict"] != "ALLOW")
    fp = sum(1 for r in rows if r["expected"] == "benign" and r["verdict"] != "ALLOW")
    fn = sum(1 for r in rows if r["expected"] == "malicious" and r["verdict"] == "ALLOW")
    tn = len(rows) - tp - fp - fn
    return {"rows": rows, "confusion": {"tp": tp, "fp": fp, "fn": fn, "tn": tn},
            "precision": tp / max(1, tp + fp), "recall": tp / max(1, tp + fn)}


@app.get("/api/events")
def events(limit: int = 200):
    return (STATE["events"] + EVENTS)[-limit:][::-1]


@app.get("/api/stats")
def stats():
    c = Counter(e["decision"] for e in EVENTS)
    return {"total": len(EVENTS), "by_decision": c, "avg_risk": round(sum(e["risk"] for e in EVENTS) / max(1, len(EVENTS)), 1)}
