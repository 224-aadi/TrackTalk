"""Phase 4 - Call Coaching service using GPT."""
import json

from openai import OpenAI
from app.core.config import settings

_client = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=settings.OPENAI_API_KEY)
    return _client


COACHING_PROMPT = """You are a senior call center coach reviewing a sales call transcript. Provide actionable coaching feedback.

Call metadata:
- Agent: {agent_name}
- Duration: {duration}s
- Sentiment: {sentiment} ({sentiment_label})
- Outcome: {outcome}

Transcript:
{transcript}

Return a JSON object with these fields:

1. "overall_rating": Integer 1-10 for overall agent performance.

2. "strengths": List of 3-5 specific things the agent did well (with examples from the transcript). Each as a dict with "point" and "example" (a short quote).

3. "improvements": List of 3-5 specific areas to improve. Each as a dict with "issue", "why_it_matters", and "suggestion".

4. "objection_handling": For each objection the customer raised, provide a dict with "objection", "agent_response" (what the agent actually said), "better_response" (what would have been more effective), and "technique" (the sales technique to apply).

5. "recommended_script": A short (3-5 line) improved opening script the agent could use based on what went wrong.

6. "key_moment": The single most critical moment in the call that determined the outcome. Dict with "timestamp_hint" (approximate position like "middle" or "near end"), "what_happened", and "what_should_have_happened".

7. "training_tags": List of 2-4 skill areas this agent should train on (e.g. "objection handling", "building trust", "closing techniques", "active listening").

Return ONLY valid JSON."""


def generate_coaching(
    transcript_text: str,
    agent_name: str = "Unknown",
    duration: float = 0,
    sentiment: float = 0,
    sentiment_label: str = "NEUTRAL",
    outcome: str = "unknown",
) -> dict:
    """Generate GPT-powered coaching report for a call."""
    client = _get_client()

    truncated = transcript_text[:10000]

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are an expert sales coach. Return valid JSON only."},
            {"role": "user", "content": COACHING_PROMPT.format(
                agent_name=agent_name,
                duration=int(duration),
                sentiment=sentiment,
                sentiment_label=sentiment_label,
                outcome=outcome,
                transcript=truncated,
            )},
        ],
        temperature=0.4,
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
            "overall_rating": 5,
            "strengths": [],
            "improvements": [],
            "objection_handling": [],
            "recommended_script": "",
            "key_moment": {},
            "training_tags": [],
        }

    return result
