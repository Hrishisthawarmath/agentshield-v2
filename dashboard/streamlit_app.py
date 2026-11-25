"""Streamlit analyst view: run the sandbox agent and review flagged / blocked events.

Run:  streamlit run dashboard/streamlit_app.py   (from repo root)
"""
import json
import sys
from pathlib import Path

import pandas as pd
import streamlit as st

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
from app.agent import run_task  # noqa: E402
from app.detection import analyze  # noqa: E402

TASKS = json.loads((ROOT / "data" / "test_tasks.json").read_text())
st.set_page_config(page_title="AEGIS · Agent Injection Shield", page_icon="🛡️", layout="wide")
st.title("AEGIS — Prompt Injection & Compromised Agent Detection")
st.caption("Defensive prototype · mock tools & synthetic data only")

if "events" not in st.session_state:
    st.session_state.events = []

tab_scan, tab_agent, tab_events = st.tabs(["Injection Scanner", "Agent Sandbox", "Blocked & Flagged"])

with tab_scan:
    text = st.text_area("Content to scan", TASKS[3]["content"], height=140)
    trust = st.selectbox("Source trust", ["external", "internal"])
    r = analyze(text, trust)
    c1, c2, c3 = st.columns(3)
    c1.metric("Risk score", r["score"])
    c2.metric("Verdict", r["verdict"])
    c3.metric("Classifier P(injection)", f"{r['classifier_prob']:.0%}")
    st.subheader("Reasons")
    for reason in r["reasons"]:
        st.write("•", reason)

with tab_agent:
    tid = st.selectbox("Task", [f"{t['id']} · {t['title']}" for t in TASKS])
    guard = st.toggle("Guard layer", value=True)
    if st.button("Run agent"):
        task = next(t for t in TASKS if tid.startswith(t["id"]))
        res = run_task(task, guard)
        st.session_state.events.extend(res["events"])
        st.markdown(f"**Outcome:** `{res['outcome']}` · content risk **{res['content_scan']['score']}**")
        st.dataframe(pd.DataFrame([{"tool": s["tool"], "args": json.dumps(s["args"]), "tainted": s["tainted"],
                                    "decision": s["monitor"]["decision"], "risk": s["monitor"]["risk"],
                                    "executed": s["executed"], "reasons": " | ".join(s["monitor"]["reasons"])}
                                   for s in res["trace"]]), use_container_width=True)
    if st.button("Run full test suite"):
        for t in TASKS:
            st.session_state.events.extend(run_task(t, True)["events"])
        st.success(f"Ran {len(TASKS)} tasks")

with tab_events:
    ev = [e for e in st.session_state.events if e["decision"] != "ALLOW"]
    if ev:
        df = pd.DataFrame([{**e, "reasons": " | ".join(e["reasons"])} for e in ev])
        st.metric("Blocked", int((df.decision == "BLOCK").sum()))
        st.dataframe(df[["task_id", "type", "target", "decision", "risk", "reasons"]], use_container_width=True)
    else:
        st.info("Run the agent or the test suite to populate events.")
