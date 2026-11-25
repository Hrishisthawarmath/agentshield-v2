"""Hybrid prompt-injection detector: weighted heuristic signals (data/rules.json) + TF-IDF/LogReg classifier."""
import base64
import json
import math
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
RULES = json.loads((ROOT / "data" / "rules.json").read_text())
MODEL = json.loads((ROOT / "src" / "data" / "model.json").read_text())

FLAGS = re.I | re.A
NEG = re.compile(RULES["negation"].rstrip("$") + r"\Z", FLAGS)
NEGATABLE = set(RULES["negatable"])
SIGNALS = [{**s, "re": re.compile(s["pattern"], FLAGS)} for s in RULES["signals"]]
LEVELS = RULES["levels"]
ZW = re.compile("[\u200b\u200c\u200d\u2060\ufeff]")
B64 = re.compile(r"[A-Za-z0-9+/]{20,}={0,2}")
TOKEN = re.compile(r"\b\w\w+\b", re.A)
RECOMMEND = {"SAFE": "ALLOW", "LOW": "REVIEW — HUMAN APPROVAL", "HIGH": "BLOCK TOOL EXECUTION", "CRITICAL": "BLOCK TOOL EXECUTION"}
MODEL_INFO = {"type": MODEL["type"], "samples": MODEL["n_samples"], "vocab": len(MODEL["vocab"]), "cvF1": MODEL["cv_f1"]}


def r3(x: float) -> float:
    return math.floor(x * 1000 + 0.5) / 1000


def level_of(score: int) -> dict:
    return [lv for lv in LEVELS if score >= lv["min"]][-1]


def _decode_b64(s: str):
    try:
        out = base64.b64decode(s + "=" * (-len(s) % 4)).decode("latin-1")
    except Exception:
        return None
    return out if re.fullmatch(r"[\x20-\x7e\n\r\t]+", out) and re.search(r"[a-z]{3,}\s+[a-z]{3,}", out, re.I) else None


def _tokens(text: str) -> list[str]:
    toks = TOKEN.findall(text.lower())
    return toks + [f"{a} {b}" for a, b in zip(toks, toks[1:])]


def classify(text: str) -> dict:
    vocab = MODEL["vocab"]
    tf: dict[str, int] = {}
    for g in _tokens(text):
        if g in vocab:
            tf[g] = tf.get(g, 0) + 1
    w = {g: c * vocab[g][0] for g, c in tf.items()}
    norm = math.sqrt(sum(v * v for v in w.values())) or 1
    contrib = [(g, v / norm * vocab[g][1]) for g, v in w.items()]
    prob = 1 / (1 + math.exp(-(MODEL["intercept"] + sum(c for _, c in contrib))))
    top = sorted([x for x in contrib if x[1] > 0], key=lambda x: -x[1])[:5]
    points = min(15, math.floor((prob - 0.5) * 30 + 0.5)) if prob >= 0.5 else 0
    return {"prob": r3(prob), "points": points, "tokens": [{"token": g, "weight": r3(c)} for g, c in top]}


def _attack_type(ids: set, source: str, hidden_hit: bool) -> str:
    if not ids:
        return "None (Benign)"
    if hidden_hit:
        return "Obfuscated Injection"
    if source != "user" and ids & {"override", "goal"}:
        return "Indirect Prompt Injection"
    for k, name in (("goal", "Goal Hijacking"), ("exfil", "Data Exfiltration"), ("privesc", "Privilege Escalation")):
        if k in ids:
            return name
    if ids & {"tool", "financial"}:
        return "Tool Manipulation"
    if ids & {"override", "sysreveal"}:
        return "Direct Prompt Injection"
    return "Suspicious Content"


def scan(text: str, source: str = "user") -> dict:
    zero_width = len(ZW.findall(text))
    clean = ZW.sub("", text)
    decoded = [d for d in (_decode_b64(m) for m in B64.findall(clean)) if d]
    parts = [(clean, False)] + [(d, True) for d in decoded]
    found: dict[str, dict] = {}
    highlights, hidden_hit = [], False
    for s in SIGNALS:
        for part, hidden in parts:
            for m in s["re"].finditer(part):
                if s["id"] in NEGATABLE and NEG.search(part[: m.start()]):
                    continue
                f = found.setdefault(s["id"], {k: s[k] for k in ("id", "label", "weight", "category", "explain")} | {"matches": []})
                if len(f["matches"]) < 3:
                    f["matches"].append(m.group(0).strip())
                if hidden:
                    hidden_hit = hidden_hit or s["id"] != "obfusc"
                else:
                    highlights.append([m.start(), m.end()])
    if (zero_width or decoded) and "obfusc" not in found:
        s = next(x for x in SIGNALS if x["id"] == "obfusc")
        found["obfusc"] = {k: s[k] for k in ("id", "label", "weight", "category", "explain")} | {"matches": []}
    if "obfusc" in found:
        if zero_width:
            found["obfusc"]["matches"].append(f"{zero_width} zero-width chars")
        found["obfusc"]["matches"] += [f'base64 → "{d}"' for d in decoded]
    signals = [found[s["id"]] for s in SIGNALS if s["id"] in found]
    cls = classify(clean + ("\n" + "\n".join(decoded) if decoded else ""))
    raw = sum(s["weight"] for s in signals) + cls["points"]
    score = min(100, raw)
    level = level_of(score)["name"]
    ids = {s["id"] for s in signals if s["id"] != "obfusc" or len(signals) == 1}
    return {"source": source, "text": clean, "zeroWidth": zero_width, "decoded": decoded, "score": score, "rawScore": raw,
            "level": level, "attackType": _attack_type(ids, source, hidden_hit), "signals": signals, "classifier": cls,
            "recommended": RECOMMEND[level], "highlights": sorted(highlights, key=lambda h: h[0])}
