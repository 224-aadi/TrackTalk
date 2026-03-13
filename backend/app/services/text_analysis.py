"""Text analysis using GPT for meaningful call insights."""
import json

from openai import OpenAI

from app.core.config import settings

_client = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=settings.OPENAI_API_KEY)
    return _client


ANALYSIS_PROMPT = """You are an expert call center analyst. Analyze this sales call transcript and return a JSON object with exactly these fields:

1. "agent_name": The sales agent's full name (the person calling on behalf of the company). Extract from where they introduce themselves (e.g. "My name is Neena"). If truly unclear, use "Unknown".

2. "company_name": The company the agent represents. Extract from the transcript. If unclear, use "Unknown".

3. "sentiment_score": A float from -1.0 (very negative) to 1.0 (very positive) representing the overall customer sentiment during the call. Consider their tone, satisfaction, and buying intent.

4. "sentiment_label": One of "POSITIVE", "NEGATIVE", or "NEUTRAL".

5. "summary": A 2-3 sentence plain-English summary of what happened in the call. Who called, what they wanted, what was offered, and the outcome.

6. "keywords": A list of 5-15 specific, meaningful keywords/phrases from this call (product names, services discussed, specific objections, pricing mentions, competitor names, etc). NOT generic words. Each should be a dict with "keyword" and "relevance" (high/medium/low).

7. "customer_intent": What the customer was looking for (e.g., "price inquiry", "product comparison", "complaint", "purchase", "cancellation", "technical support").

8. "objections_raised": List of specific objections or concerns the customer raised (empty list if none). Each as a short string.

9. "agent_tactics": List of sales tactics or approaches the agent used (empty list if unclear). Each as a short string.

10. "call_outcome": One of "sale_made", "follow_up_needed", "customer_declined", "information_provided", "unresolved", "unclear".

11. "quality_score": Integer 1-10 rating of the agent's performance based on professionalism, product knowledge, and handling of objections.

Return ONLY valid JSON, no markdown fences or explanation.

TRANSCRIPT:
{transcript}"""


def analyze_transcript(text: str) -> dict:
    """Use GPT to produce meaningful analysis of a call transcript."""
    client = _get_client()

    truncated = text[:12000]

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are a call center analytics expert. Always respond with valid JSON only."},
            {"role": "user", "content": ANALYSIS_PROMPT.format(transcript=truncated)},
        ],
        temperature=0.3,
        max_tokens=1500,
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
            "agent_name": "Unknown",
            "company_name": "Unknown",
            "sentiment_score": 0.0,
            "sentiment_label": "NEUTRAL",
            "summary": "Analysis could not be parsed.",
            "keywords": [],
            "customer_intent": "unknown",
            "objections_raised": [],
            "agent_tactics": [],
            "call_outcome": "unclear",
            "quality_score": 5,
        }

    return {
        "agent_name": result.get("agent_name", "Unknown"),
        "company_name": result.get("company_name", "Unknown"),
        "sentiment_score": float(result.get("sentiment_score", 0)),
        "sentiment_label": result.get("sentiment_label", "NEUTRAL"),
        "summary": result.get("summary", ""),
        "keywords": result.get("keywords", []),
        "customer_intent": result.get("customer_intent", "unknown"),
        "objections_raised": result.get("objections_raised", []),
        "agent_tactics": result.get("agent_tactics", []),
        "call_outcome": result.get("call_outcome", "unclear"),
        "quality_score": int(result.get("quality_score", 5)),
    }
