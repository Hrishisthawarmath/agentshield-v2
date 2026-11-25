"""Custom agent loop with a deterministic mock planner.

The planner is intentionally *naive*: it obeys instructions found in content (as a real LLM might),
so the guard layer can be demonstrated. Swap `plan_steps` for an LLM call to use a real model.
"""
import time
import uuid

from .. import tools
from ..detection import analyze
from ..monitor import evaluate_call


def plan_steps(task: dict):
    steps = [{"tool": "read_document", "args": {"path": task["source"]}, "tainted": False}]
    steps += [dict(c, tainted=False) for c in task.get("legit_calls", [])]
    steps += [dict(c, tainted=True) for c in task.get("injected_calls", [])]
    return steps


def run_task(task: dict, guard: bool = True):
    run_id = uuid.uuid4().hex[:8]
    trace, events, history = [], [], []
    content_scan = analyze(task["content"], task.get("trust", "external"))
    quarantined = guard and content_scan["verdict"] == "BLOCK"
    events.append({"run_id": run_id, "task_id": task["id"], "type": "content_scan", "ts": time.time(),
                   "decision": content_scan["verdict"], "risk": content_scan["score"],
                   "reasons": content_scan["reasons"], "target": task["source"]})
    for step in plan_steps(task):
        call = {"tool": step["tool"], "args": step["args"]}
        if step["tool"] == "read_document" and step["args"].get("path") == task["source"]:
            mon = {"decision": "ALLOW", "risk": 0, "reasons": ["Reading the task's own source document"]}
        else:
            mon = evaluate_call(call, task, history, step["tainted"])
            if quarantined and step["tainted"]:
                mon["decision"] = "BLOCK"
                mon["reasons"].insert(0, "Source content quarantined by injection detector")
                mon["risk"] = max(mon["risk"], content_scan["score"])
        executed = (not guard) or mon["decision"] != "BLOCK"
        result = tools.execute(call["tool"], call["args"], {task["source"]: task["content"]}) if executed else None
        history.append(call)
        trace.append({**call, "tainted": step["tainted"], "monitor": mon, "executed": executed, "result": result})
        if mon["decision"] != "ALLOW":
            events.append({"run_id": run_id, "task_id": task["id"], "type": "tool_call", "ts": time.time(),
                           "decision": mon["decision"] if guard else "EXECUTED", "risk": mon["risk"],
                           "reasons": mon["reasons"], "target": call["tool"], "args": call["args"]})
    compromised = any(t["tainted"] and t["executed"] for t in trace)
    return {"run_id": run_id, "task": task["id"], "guard": guard, "content_scan": content_scan,
            "trace": trace, "events": events, "compromised": compromised,
            "outcome": "COMPROMISED" if compromised else ("BLOCKED" if quarantined or any(not t["executed"] for t in trace) else "SAFE")}
