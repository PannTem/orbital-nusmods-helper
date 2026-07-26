"""Unit tests for CourseReg scoring helpers (no DB / NUSMods calls)."""
from coursereg_routes import (
    _time_desirability,
    _round_probabilities,
    _recommendation,
    _analyse_slots,
)


# ── _time_desirability ────────────────────────────────────────────────────────

def test_peak_morning_slot_is_most_desirable():
    assert _time_desirability("1000") == 1.00


def test_early_morning_slot_is_low_desirability():
    assert _time_desirability("0730") == 0.20


def test_lunch_slot_is_moderately_undesirable():
    assert _time_desirability("1230") == 0.55


def test_evening_slot_is_low_desirability():
    assert _time_desirability("1800") == 0.25


# ── _round_probabilities ──────────────────────────────────────────────────────

def test_high_competition_lowers_early_round_odds():
    high = _round_probabilities(1.0)
    low = _round_probabilities(0.0)
    assert high["round_1a"] < low["round_1a"]
    assert high["round_2"] <= low["round_2"]


def test_round_probabilities_are_clamped():
    probs = _round_probabilities(1.0)
    assert probs["round_0"] >= 0.05
    assert probs["round_1a"] >= 0.20
    assert probs["round_1b"] >= 0.30
    assert probs["round_2"] >= 0.45


def test_round_probabilities_keys():
    probs = _round_probabilities(0.5)
    assert set(probs.keys()) == {"round_0", "round_1a", "round_1b", "round_2"}


# ── _recommendation ───────────────────────────────────────────────────────────

def test_recommendation_high_demand():
    text = _recommendation(0.8)
    assert "High demand" in text


def test_recommendation_moderate_demand():
    text = _recommendation(0.5)
    assert "Moderate demand" in text


def test_recommendation_low_demand():
    text = _recommendation(0.1)
    assert "Low demand" in text


# ── _analyse_slots ────────────────────────────────────────────────────────────

def _slot(lesson_type, class_no, day, start, end, size=30, venue="COM1-0203"):
    return {
        "lessonType": lesson_type,
        "classNo": class_no,
        "day": day,
        "startTime": start,
        "endTime": end,
        "size": size,
        "venue": venue,
    }


def test_analyse_slots_normalises_within_lesson_type():
    slots = [
        _slot("Tutorial", "1", "Tuesday", "1000", "1100", size=15),  # smaller → scarcer
        _slot("Tutorial", "2", "Friday", "1800", "1900", size=80),
    ]
    result = _analyse_slots(slots, demand_counts={})
    tutorials = result["Tutorial"]
    assert len(tutorials) == 2
    scores = {c["class_no"]: c["competition_score"] for c in tutorials}
    # Scores are normalised to [0, 1] within the lesson type
    assert max(scores.values()) == 1.0
    assert min(scores.values()) == 0.0


def test_analyse_slots_platform_demand_increases_competition():
    slots = [
        _slot("Tutorial", "1", "Wednesday", "1000", "1100", size=40),
        _slot("Tutorial", "2", "Wednesday", "1000", "1100", size=40),
    ]
    with_demand = _analyse_slots(slots, demand_counts={("Tutorial", "1"): 10})
    no_demand = _analyse_slots(slots, demand_counts={})

    demanded = next(c for c in with_demand["Tutorial"] if c["class_no"] == "1")
    undemanded_baseline = next(c for c in no_demand["Tutorial"] if c["class_no"] == "1")

    assert demanded["platform_demand"] == 10
    # With equal capacity/timing, demand should push class 1 to the top
    assert demanded["competition_score"] >= undemanded_baseline["competition_score"]
