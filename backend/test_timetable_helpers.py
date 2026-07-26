"""Unit tests for venue zoning, scoring helpers, and iCal export formatting."""
from datetime import date

from timetable_generator import _venue_zone, _score
from timetable_routes import _week_monday, _slots_to_ical


# ── _venue_zone ───────────────────────────────────────────────────────────────

def test_venue_zone_computing():
    assert _venue_zone("COM1-0210") == 0


def test_venue_zone_arts():
    assert _venue_zone("AS4-0602") == 1


def test_venue_zone_science():
    assert _venue_zone("S16-0430") == 2


def test_venue_zone_unknown_defaults_central():
    assert _venue_zone("LT27") == 8


def test_venue_zone_empty_defaults_central():
    assert _venue_zone("") == 8


# ── _score ────────────────────────────────────────────────────────────────────

def test_score_empty_slots_is_zero():
    assert _score([], {}) == 0.0


def test_score_returns_value_in_unit_interval():
    slots = [
        {
            "day": "Monday",
            "startTime": "1000",
            "endTime": "1200",
            "venue": "COM1-0203",
        },
        {
            "day": "Wednesday",
            "startTime": "1400",
            "endTime": "1600",
            "venue": "COM1-0203",
        },
    ]
    prefs = {
        "latest_start": 1,
        "earliest_end": 1,
        "lunch_break": 1,
        "compact_days": 1,
        "minimal_gaps": 1,
        "minimize_travel": 1,
        "peer_avoidance": 0,
    }
    value = _score(slots, prefs)
    assert 0.0 <= value <= 1.0


# ── iCal helpers ──────────────────────────────────────────────────────────────

def test_week_monday_sem1_week1():
    assert _week_monday(1, 1) == date(2025, 8, 11)


def test_week_monday_skips_recess_after_week_6():
    # Week 7 should be one calendar week further than a contiguous offset
    week6 = _week_monday(1, 6)
    week7 = _week_monday(1, 7)
    assert (week7 - week6).days == 14


def test_slots_to_ical_contains_calendar_envelope():
    ical = _slots_to_ical(
        [{
            "day": "Monday",
            "startTime": "1000",
            "endTime": "1200",
            "weeks": [1],
            "moduleCode": "CS1010",
            "lessonType": "Lecture",
            "classNo": "1",
            "venue": "LT27",
        }],
        sem=1,
    )
    assert "BEGIN:VCALENDAR" in ical
    assert "END:VCALENDAR" in ical
    assert "BEGIN:VEVENT" in ical
    assert "CS1010 Lecture [1]" in ical
    assert "LOCATION:LT27" in ical
