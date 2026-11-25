"""Explainable regex heuristics for indirect prompt injection. Mirrored in frontend/src/lib/detector.js."""
import re
from dataclasses import dataclass

@dataclass(frozen=True)
class Rule:
    id: str
    name: str
    category: str
    weight: float
    pattern: str
    explain: str

RULES = [
    Rule("H01", "Instruction override", "override", 0.55,
         r"\b(ignore|disregard|forget|override)\b[^.]{0,30}\b(previous|prior|above|all|earlier|your|the)\b[^.]{0,20}\b(instructions?|rules|prompts?|task|policy|everything)\b|\bforget everything\b|\bignore the task\b|\bstop summari[sz]ing\b",
         "Text tries to replace the agent's original instructions."),
    Rule("H02", "Role / system impersonation", "impersonation", 0.45,
         r"\b(system\s*(notice|prompt|update|:)|you are now|act as|pretend|developer mode|new instructions|as your new operator|administrator:)|###\s*(system|instruction)|<\|im_start\|>",
         "Data claims to be a system/admin message or redefines the agent's role."),
    Rule("H03", "Concealment request", "concealment", 0.4,
         r"\b(do not|don't|without)\s+(inform|tell|telling|notify|notifying|mention|alert)\w*|\bsilently\b|\bsecretly\b|\bwithout (approval|telling anyone)\b|\bdisable logging\b|\bdelete the audit log\b",
         "Asks the agent to hide actions from the user or audit trail."),
    Rule("H04", "Embedded financial command", "financial_action", 0.45,
         r"\b(transfer|wire|send|pay|remit|initiate)\b[^.]{0,40}\b(inr|rs\.?|usd|funds|money|payment|\d[\d,]{3,})\b[^.]{0,40}\b(to|account|beneficiary)\b",
         "Contains an imperative money-movement instruction inside untrusted content."),
    Rule("H05", "Credential / PII exfiltration", "exfiltration", 0.55,
         r"\b(forward|send|share|email|reveal|export|output)\b[^.]{0,60}\b(card number|cvv|otp|pin|passwords?|api keys?|credentials|account numbers|balances|customer records?|system prompt)\b",
         "Requests sensitive data be sent or revealed."),
    Rule("H06", "Tool-call syntax in data", "tool_injection", 0.5,
         r"\b(initiate_payment|draft_email|payment_lookup|read_document)\s*\(|\bcall (the )?(tool|function)\b|\bfunction_call\b|\bexecute:",
         "Untrusted content contains direct tool/function invocation syntax."),
    Rule("H07", "Policy / control bypass", "bypass", 0.45,
         r"\b(bypass|skip|disable|override)\b[^.]{0,30}\b(verification|approval|2fa|two-factor|limits?|fraud checks?|policy)\b|\blimits are disabled\b",
         "Attempts to switch off security controls."),
    Rule("H08", "False authority / urgency", "social_engineering", 0.2,
         r"\b(authori[sz]ed by|approved it|ceo|ciso|cfo approval|mandatory compliance)\b",
         "Invokes executive authority to pressure the agent."),
    Rule("H09", "Obfuscation / hidden text", "obfuscation", 0.4,
         r"[\u200b\u200c\u200d\u2060\ufeff]|<!--|\[white-text\]|display\s*:\s*none|font-size\s*:\s*0|\b[A-Za-z0-9+/]{32,}={0,2}(?=\s|$)|decode and execute",
         "Uses hidden/encoded text that a human reviewer would not see."),
    Rule("H10", "Path traversal / secrets access", "file_access", 0.5,
         r"\.\./|/etc/passwd|secrets?\.env|\.ssh/|id_rsa",
         "References files outside the sandbox or secret stores."),
]
_COMPILED = [(r, re.compile(r.pattern, re.IGNORECASE)) for r in RULES]


_NEGATION = re.compile(r"\b(never|not|no|don't|must not)\b[^.]{0,20}$", re.IGNORECASE)
NEGATABLE = {"H04", "H05"}


def scan(text: str):
    hits = []
    for rule, rx in _COMPILED:
        m = rx.search(text)
        if m and rule.id in NEGATABLE and _NEGATION.search(text[max(0, m.start() - 30):m.start()]):
            m = None
        if m:
            hits.append({"id": rule.id, "name": rule.name, "category": rule.category, "weight": rule.weight,
                         "match": m.group(0)[:80], "explain": rule.explain})
    score = 1.0
    for h in hits:
        score *= (1 - h["weight"])
    return 1 - score, hits
