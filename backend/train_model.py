"""Train the classifier and export model.json + tasks for the web dashboard."""
import json
import shutil
from pathlib import Path

from app.detection.classifier import MODEL_JSON, train

ROOT = Path(__file__).resolve().parents[1]
m = train()
dst = ROOT / "frontend" / "src" / "data"
dst.mkdir(parents=True, exist_ok=True)
shutil.copy(MODEL_JSON, dst / "model.json")
shutil.copy(ROOT / "data" / "test_tasks.json", dst / "tasks.json")
print(f"trained on {m['n_samples']} samples, cv F1={m['cv_f1']}, vocab={len(m['vocab'])} -> {dst}")
