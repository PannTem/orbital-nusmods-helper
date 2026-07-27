import psycopg2
from fastapi import APIRouter, Depends
import database_access

router = APIRouter(tags=["achievements"])


def get_conn():
    conn = database_access.get_connection()
    try:
        yield conn
    finally:
        conn.close()


# Achievement definitions. `check` is a rule evaluated against the stats dict
# returned by database_access.get_achievement_stats(). Adding an achievement is
# just appending a dict here — no other code changes needed.
ACHIEVEMENTS = [
    {
        "id": "study_0h",
        "name": "Getting Started",
        "description": "Complete your first study session",
        "icon": "🎯",
        "check": lambda s: s["total_seconds"] > 0
    },
    {
        "id": "study_10h",
        "name": "Warming Up",
        "description": "Study for 10 hours in total",
        "icon": "📖",
        "check": lambda s: s["total_seconds"] >= 10 * 3600
    },
    {
        "id": "study_50h",
        "name": "Dedicated",
        "description": "Study for 50 hours in total",
        "icon": "💪",
        "check": lambda s: s["total_seconds"] >= 50 * 3600
    },
    {
        "id": "streak_3",
        "name": "On a Roll",
        "description": "Reach a 3-day review streak",
        "icon": "🔥",
        "check": lambda s: s["streak"] >= 3
    },
    {
        "id": "streak_7",
        "name": "Consistent",
        "description": "Reach a 7-day review streak",
        "icon": "⚡",
        "check": lambda s: s["streak"] >= 7
    },
    {
        "id": "streak_10",
        "name": "Strike!",
        "description": "Reach a 10-day review streak",
        "icon": "🎳",
        "check": lambda s: s["streak"] >= 10
    },
    {
        "id": "streak_67",
        "name": "Brainrot",
        "description": "Reach a 67-day review streak",
        "icon": "🤡",
        "check": lambda s: s["streak"] >= 67
    },
    {
        "id": "streak_365",
        "name": "Go take a shower",
        "description": "Reach a 365-day review streak",
        "icon": "🚿",
        "check": lambda s: s["streak"] >= 365
    },
    {
        "id": "streak_999",
        "name": "HOW?????",
        "description": "Reach a 999-day review streak",
        "icon": "💀",
        "check": lambda s: s["streak"] >= 999
    },
    {
        "id": "friends_1",
        "name": "Not Alone",
        "description": "Add your first friend",
        "icon": "🤝",
        "check": lambda s: s["friend_count"] >= 1
    },
    {
        "id": "friends_3",
        "name": "Three's Company", #im old bruh
        "description": "Add 3 friends",
        "icon": "🫂",
        "check": lambda s: s["friend_count"] >= 3
    },
    {
        "id": "friends_10",
        "name": "Socialite",
        "description": "Add 10 friends",
        "icon": "🎉",
        "check": lambda s: s["friend_count"] >= 10
    },
    {
        "id": "timetable_built",
        "name": "Planner",
        "description": "Add a module to your timetable",
        "icon": "📅",
        "check": lambda s: s["has_timetable"]
    },
]


def _meta(a):
    """Display fields only — the `check` lambda is not JSON-serialisable."""
    return {"id": a["id"], "name": a["name"], "description": a["description"], "icon": a["icon"]}


@router.post("/achievements/{user_id}/sync")
def sync_achievements(user_id: str, conn: psycopg2.extensions.connection = Depends(get_conn)):
    """
    Award any newly-earned achievements for this user. Called when the user
    visits their profile. Returns the ids unlocked this call so the frontend
    can celebrate them.
    """
    stats = database_access.get_achievement_stats(user_id, conn)
    unlocked = database_access.get_unlocked_achievements(user_id, conn)

    newly = []
    for a in ACHIEVEMENTS:
        if a["check"](stats) and a["id"] not in unlocked:
            database_access.award_achievement(user_id, a["id"], conn)
            newly.append(a["id"])

    return {"newly_unlocked": newly}


@router.get("/achievements/{user_id}")
def get_achievements(user_id: str, conn: psycopg2.extensions.connection = Depends(get_conn)):
    """Read-only: the full achievement list with earned status and unlock times."""
    unlocked = database_access.get_unlocked_achievements(user_id, conn)
    return {
        "achievements": [
            {**_meta(a), "earned": a["id"] in unlocked, "unlocked_at": unlocked.get(a["id"])}
            for a in ACHIEVEMENTS
        ],
    }
