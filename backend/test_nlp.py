"""Unit tests for NLP helpers (no Gemini / network calls)."""
import nlp


def _comment(message: str, likes: int = 0):
    return {"message": message, "likes": likes}


# ── clean_comment_message ─────────────────────────────────────────────────────

def test_clean_strips_html_tags():
    cleaned = nlp.clean_comment_message(_comment("<p>Great <b>module</b></p>"))
    assert cleaned == "Great module"


def test_clean_collapses_whitespace():
    cleaned = nlp.clean_comment_message(_comment("too   many\n\nspaces"))
    assert cleaned == "too many spaces"


# ── analyze_sentiment ─────────────────────────────────────────────────────────

def test_sentiment_clearly_positive():
    assert nlp.analyze_sentiment(_comment("This module is amazing and I loved it!")) == "positive"


def test_sentiment_clearly_negative():
    assert nlp.analyze_sentiment(_comment("Terrible module, worst experience ever.")) == "negative"


# ── grade extraction ──────────────────────────────────────────────────────────

def test_extract_expected_gpa_a_minus():
    assert nlp.extract_expected_gpa(_comment("expecting A-")) == 4.5


def test_extract_actual_gpa_got_b_plus():
    assert nlp.extract_actual_gpa(_comment("got B+")) == 4.0


def test_extract_expected_ignores_component_context():
    # Midterm scores should not count as overall expected grade
    assert nlp.extract_expected_gpa(_comment("expecting A on the midterm")) is None


def test_extract_actual_ignores_component_context():
    assert nlp.extract_actual_gpa(_comment("got A on the quiz")) is None


def test_extract_expected_returns_none_when_absent():
    assert nlp.extract_expected_gpa(_comment("Decent workload overall")) is None


def test_extract_expected_grade_letter():
    assert nlp.extract_expected_grade_letter(_comment("expected grade: B+")) == "B+"


def test_extract_actual_grade_letter():
    assert nlp.extract_actual_grade_letter(_comment("ended up with A-")) == "A-"


def test_has_component_context_detects_midterm():
    assert nlp._has_component_context("scored well on the midterm") is True


def test_has_component_context_plain_sentence():
    assert nlp._has_component_context("overall a solid module") is False
