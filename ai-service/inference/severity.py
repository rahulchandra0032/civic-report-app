from datetime import datetime, timedelta
from typing import Optional

CATEGORY_WEIGHTS = {
    "pothole": 20,
    "garbage": 15,
    "streetlight": 12,
    "water_leak": 18,
    "drainage": 16,
    "road_damage": 19,
    "construction": 14,
    "other": 10
}

TIME_DECAY_HOURS = {
    "pothole": 168,
    "garbage": 72,
    "streetlight": 240,
    "water_leak": 96,
    "drainage": 120,
    "road_damage": 168,
    "construction": 336,
    "other": 240
}


def calculate_severity(
    category: str,
    upvotes: int,
    nearby_count: int = 0,
    hours_since_report: float = 0,
    ai_confidence: float = 0.0
) -> dict:
    category_score = CATEGORY_WEIGHTS.get(category, 10)

    upvote_score = min(upvotes * 5, 30)

    density_score = min(nearby_count * 8, 25)

    decay_hours = TIME_DECAY_HOURS.get(category, 168)
    time_factor = max(0, 20 * (1 - hours_since_report / decay_hours))

    confidence_bonus = ai_confidence * 5

    total = category_score + upvote_score + density_score + time_factor + confidence_bonus
    total = min(total, 100)

    if total >= 70:
        level = "CRITICAL"
        sla_hours = 24
    elif total >= 50:
        level = "HIGH"
        sla_hours = 48
    elif total >= 30:
        level = "MEDIUM"
        sla_hours = 72
    else:
        level = "LOW"
        sla_hours = 120

    sla_deadline = datetime.utcnow() + timedelta(hours=sla_hours)

    return {
        "severity_score": round(total, 2),
        "severity_level": level,
        "sla_deadline": sla_deadline.isoformat(),
        "sla_hours": sla_hours,
        "breakdown": {
            "category_weight": category_score,
            "upvote_score": upvote_score,
            "density_score": density_score,
            "time_factor": round(time_factor, 2),
            "confidence_bonus": round(confidence_bonus, 2)
        }
    }
