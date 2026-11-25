"""TF-IDF + Logistic Regression injection classifier with token-level explanations."""
import json
from functools import lru_cache
from pathlib import Path

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score
from sklearn.pipeline import make_pipeline

from .training_data import build_corpus

MODEL_JSON = Path(__file__).resolve().parent / "model.json"


def train():
    texts, labels = build_corpus()
    vec = TfidfVectorizer(ngram_range=(1, 2), lowercase=True, min_df=2, max_features=1500)
    clf = LogisticRegression(C=4.0, max_iter=2000)
    cv = cross_val_score(make_pipeline(vec, clf), texts, labels, cv=5, scoring="f1").mean()
    X = vec.fit_transform(texts)
    clf.fit(X, labels)
    coef = clf.coef_[0]
    vocab = {t: [round(float(vec.idf_[i]), 5), round(float(coef[i]), 5)] for t, i in vec.vocabulary_.items()}
    model = {"type": "tfidf-logreg", "ngram_range": [1, 2], "intercept": float(clf.intercept_[0]),
             "vocab": vocab, "n_samples": len(texts), "cv_f1": round(float(cv), 4)}
    MODEL_JSON.write_text(json.dumps(model))
    return model


@lru_cache(maxsize=1)
def load():
    if not MODEL_JSON.exists():
        return train()
    return json.loads(MODEL_JSON.read_text())


def _features(text: str, vocab: dict):
    import re
    toks = re.findall(r"(?u)\b\w\w+\b", text.lower())
    grams = toks + [f"{a} {b}" for a, b in zip(toks, toks[1:])]
    tf = {}
    for g in grams:
        if g in vocab:
            tf[g] = tf.get(g, 0) + 1
    w = {g: c * vocab[g][0] for g, c in tf.items()}
    norm = np.sqrt(sum(v * v for v in w.values())) or 1.0
    return {g: v / norm for g, v in w.items()}


def predict(text: str):
    m = load()
    feats = _features(text, m["vocab"])
    contrib = {g: v * m["vocab"][g][1] for g, v in feats.items()}
    z = m["intercept"] + sum(contrib.values())
    p = 1 / (1 + np.exp(-z))
    top = sorted(contrib.items(), key=lambda kv: kv[1], reverse=True)[:5]
    return float(p), [{"token": t, "weight": round(c, 3)} for t, c in top if c > 0]
