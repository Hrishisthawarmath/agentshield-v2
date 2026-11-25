import json
from pathlib import Path

from app.agent import run_task
from app.detection import analyze

TASKS = json.loads((Path(__file__).resolve().parents[2] / "data" / "test_tasks.json").read_text())


def test_detector_separates_suite():
    for t in TASKS:
        r = analyze(t["content"], t["trust"])
        assert (r["verdict"] != "ALLOW") == (t["expected"] == "malicious"), (t["id"], r["score"])


def test_guard_prevents_compromise():
    for t in TASKS:
        assert not run_task(t, guard=True)["compromised"], t["id"]


def test_unguarded_agent_is_compromised_by_injections():
    bad = [t for t in TASKS if t["expected"] == "malicious"]
    assert all(run_task(t, guard=False)["compromised"] for t in bad)
