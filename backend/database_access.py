import sqlite3

DB_PATH = "database/modules.db"

#to be called once at main.py startup
def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS module_scores (
            module_code TEXT PRIMARY KEY,
            title TEXT,
            description TEXT,
            module_credits INTEGER,
            department TEXT,
            difficulty_score REAL,
            recommend_score REAL,
            top_positive_comment_message TEXT,
            top_positive_comment_likes INTEGER,
            top_neutral_comment_message TEXT,
            top_neutral_comment_likes INTEGER,
            top_negative_comment_message TEXT,
            top_negative_comment_likes INTEGER,
            comment_count INTEGER,
            expected_gpa REAL,
            actual_gpa REAL
        )
    """)
    conn.commit()
    conn.close()

def get_connection():
    return sqlite3.connect(DB_PATH)

def get_cached_module(module_code: str, conn: sqlite3.Connection):
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM module_scores WHERE module_code = ?
    """, (module_code.upper(),))

    row = cursor.fetchone()
    if row is None:
        return None

    return {
        "module_code": row[0],
        "title": row[1],
        "description": row[2],
        "module_credits": row[3],
        "department": row[4],
        "difficulty_score": row[5],
        "recommend_score": row[6],
        "top_positive_comment_message": row[7],
        "top_positive_comment_likes": row[8],
        "top_neutral_comment_message": row[9],
        "top_neutral_comment_likes": row[10],
        "top_negative_comment_message": row[11],
        "top_negative_comment_likes": row[12],
        "comment_count": row[13],
        "expected_gpa": row[14],
        "actual_gpa": row[15]
    }

def save_module_data(
    module_code: str,
    title: str,
    description: str,
    module_credits: int,
    department: str,
    difficulty_score: float,
    recommend_score: float,
    top_positive_comment: dict,
    top_neutral_comment: dict,
    top_negative_comment: dict,
    comment_count: int,
    expected_gpa: float,
    actual_gpa: float,
    conn: sqlite3.Connection
):
    conn.execute("""
        INSERT OR REPLACE INTO module_scores
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        module_code,
        title,
        description,
        module_credits,
        department,
        difficulty_score,
        recommend_score,
        top_positive_comment["message"],
        top_positive_comment["likes"],
        top_neutral_comment["message"],
        top_neutral_comment["likes"],
        top_negative_comment["message"],
        top_negative_comment["likes"],
        comment_count,
        expected_gpa,
        actual_gpa
    ))
    conn.commit()