"""Combines heuristics + classifier into an explainable risk score (0-100)."""
from . import classifier, heuristics

W_HEUR, W_CLF = 0.55, 0.45
TRUST_BONUS = {"internal": -8, "external": 0}


def level(score: float) -> str:
    return "HIGH" if score >= 60 else "MEDIUM" if score >= 30 else "LOW"


def analyze(text: str, trust: str = "external"):
    h_score, hits = heuristics.scan(text)
    p, tokens = classifier.predict(text)
    score = max(0, min(100, round((W_HEUR * h_score + W_CLF * p) * 100 + TRUST_BONUS.get(trust, 0))))
    reasons = [f"[{h['id']}] {h['name']}: \"{h['match']}\" - {h['explain']}" for h in hits]
    reasons.append(f"[ML] Classifier injection probability {p:.0%}" +
                   (f" (top signals: {', '.join(t['token'] for t in tokens[:3])})" if tokens else ""))
    lv = level(score)
    return {"score": score, "level": lv, "verdict": {"HIGH": "BLOCK", "MEDIUM": "FLAG", "LOW": "ALLOW"}[lv],
            "heuristic_score": round(h_score, 3), "classifier_prob": round(p, 3),
            "rules": hits, "tokens": tokens, "reasons": reasons}
