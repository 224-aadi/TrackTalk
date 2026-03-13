"""Phase 5 - QA & Compliance scoring service using GPT."""
import json

from openai import OpenAI
from app.core.config import settings

_client = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=settings.OPENAI_API_KEY)
    return _client


QA_PROMPT = """You are a call center quality assurance analyst. Score this sales call against standard QA criteria.

Compliance rules to check:
{rules_text}

Transcript:
{transcript}

Return a JSON object with:

1. "total_score": Float 0-100 representing overall QA score.

2. "rule_results": For each compliance rule above, a dict with:
   - "rule_name": The rule name
   - "passed": Boolean
   - "score": Points awarded (0 if failed, full points if passed, partial if partially met)
   - "evidence": Short quote or explanation of why it passed/failed

3. "flags": List of any serious compliance issues found. Each as a dict with "severity" (critical/warning/info), "issue", and "detail".

4. "positive_notes": List of 2-3 things the agent did well from a QA perspective.

5. "mandatory_check": Dict with "all_mandatory_passed" (boolean) and "missed_mandatory" (list of rule names that were mandatory but failed).

Return ONLY valid JSON."""


DEFAULT_RULES = [
    {"name": "Professional Greeting", "description": "Agent introduces themselves with name and company", "points": 10, "is_mandatory": True},
    {"name": "Customer Name Usage", "description": "Agent asks for and uses the customer's name", "points": 5, "is_mandatory": False},
    {"name": "Needs Assessment", "description": "Agent asks about customer needs before pitching", "points": 10, "is_mandatory": False},
    {"name": "Product Knowledge", "description": "Agent demonstrates accurate product knowledge", "points": 15, "is_mandatory": False},
    {"name": "Pricing Transparency", "description": "Agent clearly states pricing without hidden costs", "points": 10, "is_mandatory": True},
    {"name": "No Pressure Tactics", "description": "Agent does not use high-pressure or deceptive sales tactics", "points": 10, "is_mandatory": True},
    {"name": "Objection Handling", "description": "Agent addresses customer concerns respectfully and thoroughly", "points": 15, "is_mandatory": False},
    {"name": "Clear Next Steps", "description": "Agent outlines clear next steps or follow-up", "points": 10, "is_mandatory": False},
    {"name": "Professional Closing", "description": "Agent ends the call politely with a proper goodbye", "points": 5, "is_mandatory": True},
    {"name": "No Inappropriate Language", "description": "No rude, dismissive, or inappropriate language used", "points": 10, "is_mandatory": True},
]


def score_call(transcript_text: str, custom_rules: list[dict] | None = None) -> dict:
    """Score a call transcript against QA/compliance rules using GPT."""
    client = _get_client()

    rules = custom_rules if custom_rules else DEFAULT_RULES
    rules_text = "\n".join(
        f"- {r['name']} ({'MANDATORY' if r.get('is_mandatory') else 'optional'}, {r['points']} pts): {r['description']}"
        for r in rules
    )

    truncated = transcript_text[:10000]

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are a QA compliance analyst. Return valid JSON only."},
            {"role": "user", "content": QA_PROMPT.format(rules_text=rules_text, transcript=truncated)},
        ],
        temperature=0.2,
        max_tokens=2000,
    )

    raw = response.choices[0].message.content.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
        if raw.endswith("```"):
            raw = raw[:-3]
        raw = raw.strip()

    try:
        result = json.loads(raw)
    except json.JSONDecodeError:
        result = {
            "total_score": 0,
            "rule_results": [],
            "flags": [{"severity": "warning", "issue": "Parse error", "detail": "Could not parse QA response"}],
            "positive_notes": [],
            "mandatory_check": {"all_mandatory_passed": False, "missed_mandatory": []},
        }

    return result


def get_default_rules() -> list[dict]:
    """Return the default compliance rules."""
    return DEFAULT_RULES
