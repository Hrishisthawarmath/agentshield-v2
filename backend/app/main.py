"""AgentShield API - FastAPI service exposing the scanner, sandbox agent and event log."""
import json
from collections import Counter
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .agent import run_task
from .detection import analyze
from .detection.classifier import load as load_model
from .tools import TOOL_SPECS

TASKS = {t["id"]: t for t in json.loads((Path(__file__).resolve().parents[2] / "data" / "test_tasks.json").read_text())}
EVENTS: list[dict] = []

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
    return {"status": "ok", "model": m["type"], "cv_f1": m["cv_f1"], "tasks": len(TASKS)}


@app.get("/api/tasks")
def tasks():
    return list(TASKS.values())


@app.get("/api/tools")
def tool_specs():
    return TOOL_SPECS


@app.post("/api/scan")
def scan(body: ScanIn):
    return analyze(body.text, body.trust)


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
    return EVENTS[-limit:][::-1]


@app.get("/api/stats")
def stats():
    c = Counter(e["decision"] for e in EVENTS)
    return {"total": len(EVENTS), "by_decision": c, "avg_risk": round(sum(e["risk"] for e in EVENTS) / max(1, len(EVENTS)), 1)}
