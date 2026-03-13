"""Feature engineering service for extracting ML-ready features from calls."""
import re
from collections import Counter

import numpy as np


POSITIVE_PHRASES = [
    "great deal", "special offer", "free shipping", "discount", "guarantee",
    "satisfaction", "value", "benefit", "save", "exclusive", "premium",
    "perfect for you", "absolutely", "wonderful", "excellent",
]

NEGATIVE_PHRASES = [
    "too expensive", "not interested", "no thanks", "can't afford",
    "competitor", "cancel", "refund", "complaint", "problem", "issue",
    "frustrated", "disappointed", "unhappy",
]

CLOSING_PHRASES = [
    "ready to", "sign up", "go ahead", "let's do it", "sounds good",
    "i'll take it", "place the order", "proceed", "finalize",
]

OBJECTION_PHRASES = [
    "too expensive", "not sure", "need to think", "let me check",
    "talk to my", "call back", "not right now", "maybe later",
]


def extract_features(
    transcript_text: str,
    segments: dict | None,
    duration_seconds: float | None,
    sentiment_score: float | None,
    keywords: list[dict] | None,
    call_date=None,
) -> dict:
    """Extract 30+ features from a call for ML model input."""
    text_lower = transcript_text.lower() if transcript_text else ""
    words = text_lower.split()
    word_count = len(words)
    sentences = [s.strip() for s in re.split(r"[.!?]+", text_lower) if s.strip()]

    features = {}

    features["word_count"] = word_count
    features["sentence_count"] = len(sentences)
    features["avg_sentence_length"] = round(word_count / max(len(sentences), 1), 2)
    features["unique_word_ratio"] = round(len(set(words)) / max(word_count, 1), 4)

    features["char_count"] = len(text_lower)
    features["avg_word_length"] = round(
        sum(len(w) for w in words) / max(word_count, 1), 2
    )

    features["duration_seconds"] = duration_seconds or 0
    features["words_per_second"] = round(
        word_count / max(duration_seconds or 1, 1), 2
    )

    features["question_count"] = text_lower.count("?")
    features["exclamation_count"] = text_lower.count("!")
    features["question_ratio"] = round(
        features["question_count"] / max(len(sentences), 1), 4
    )

    features["sentiment_score"] = sentiment_score or 0.0

    if segments and "segments" in segments:
        seg_list = segments["segments"]
        if seg_list and len(seg_list) > 1:
            seg_sentiments = []
            third = len(seg_list) // 3
            features["segment_count"] = len(seg_list)

            first_third_text = " ".join(s.get("text", "") for s in seg_list[:max(third, 1)])
            last_third_text = " ".join(s.get("text", "") for s in seg_list[-max(third, 1):])
            features["opening_length"] = len(first_third_text.split())
            features["closing_length"] = len(last_third_text.split())
        else:
            features["segment_count"] = len(seg_list) if seg_list else 0
            features["opening_length"] = 0
            features["closing_length"] = 0
    else:
        features["segment_count"] = 0
        features["opening_length"] = 0
        features["closing_length"] = 0

    features["positive_phrase_count"] = sum(
        1 for p in POSITIVE_PHRASES if p in text_lower
    )
    features["negative_phrase_count"] = sum(
        1 for p in NEGATIVE_PHRASES if p in text_lower
    )
    features["closing_phrase_count"] = sum(
        1 for p in CLOSING_PHRASES if p in text_lower
    )
    features["objection_phrase_count"] = sum(
        1 for p in OBJECTION_PHRASES if p in text_lower
    )

    features["positive_negative_ratio"] = round(
        features["positive_phrase_count"]
        / max(features["negative_phrase_count"], 1),
        2,
    )

    features["has_discount_mention"] = int("discount" in text_lower or "offer" in text_lower)
    features["has_competitor_mention"] = int("competitor" in text_lower or "other company" in text_lower)
    features["has_price_mention"] = int("price" in text_lower or "cost" in text_lower or "expensive" in text_lower)
    features["has_urgency"] = int("today" in text_lower or "limited" in text_lower or "now" in text_lower)

    if keywords:
        features["top_keyword_count"] = len(keywords)
        features["avg_keyword_score"] = round(
            np.mean([k.get("score", 0) for k in keywords]) if keywords else 0, 4
        )
    else:
        features["top_keyword_count"] = 0
        features["avg_keyword_score"] = 0

    if call_date:
        features["hour_of_day"] = call_date.hour
        features["day_of_week"] = call_date.weekday()
        features["is_morning"] = int(6 <= call_date.hour < 12)
        features["is_afternoon"] = int(12 <= call_date.hour < 18)
        features["is_evening"] = int(18 <= call_date.hour < 22)
    else:
        features["hour_of_day"] = 0
        features["day_of_week"] = 0
        features["is_morning"] = 0
        features["is_afternoon"] = 0
        features["is_evening"] = 0

    return features


def get_feature_names() -> list[str]:
    """Return ordered list of all feature names."""
    return [
        "word_count", "sentence_count", "avg_sentence_length", "unique_word_ratio",
        "char_count", "avg_word_length", "duration_seconds", "words_per_second",
        "question_count", "exclamation_count", "question_ratio", "sentiment_score",
        "segment_count", "opening_length", "closing_length",
        "positive_phrase_count", "negative_phrase_count", "closing_phrase_count",
        "objection_phrase_count", "positive_negative_ratio",
        "has_discount_mention", "has_competitor_mention", "has_price_mention", "has_urgency",
        "top_keyword_count", "avg_keyword_score",
        "hour_of_day", "day_of_week", "is_morning", "is_afternoon", "is_evening",
    ]
