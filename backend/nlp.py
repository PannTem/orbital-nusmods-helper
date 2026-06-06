from bs4 import BeautifulSoup #for formatting (turning html into plain text)

from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer #sorting comments positive/neutral/negative
analyzer = SentimentIntensityAnalyzer()

import re

def clean_comment_message(comment):
    #Convert HTML to plain text
    comment_message_plaintext = BeautifulSoup(comment["message"], "html.parser").get_text(separator="\n")

    #Remove extra        whitespace (lol)
    comment_message_cleaned = re.sub(r'\s+', ' ', comment_message_plaintext).strip()

    return comment_message_cleaned.strip()

#sentiment value breakpoints obtained from
#https://ak1adyous.medium.com/sentiment-analysis-using-vader-c56bcffe6f24
def analyze_sentiment(comment):
    cleaned = clean_comment_message(comment)

    score = analyzer.polarity_scores(cleaned)["compound"]
    if score >= 0.05:
        return "positive"
    elif score <= -0.05:
        return "negative"
    else:
        return "neutral"

from transformers import pipeline

classifier = pipeline(
    "zero-shot-classification",
    model="facebook/bart-large-mnli"
)

difficulty_labels = [
    "very easy",
    "easy",
    "moderate",
    "hard",
    "very hard"
]

recommend_labels = [
    "recommend",
    "not recommend"
]

difficulty_map = {
    "very easy": 1,
    "easy": 2,
    "moderate": 3,
    "hard": 4,
    "very hard": 5
}

recommend_map = {
    "recommend": 1,
    "not recommend": 0
}

def analyze_diff_recc(comment):

    cleaned = clean_comment_message(comment)

    #multi_label=False ensures total weights of each category sums to 1
    difficulty_result = classifier(cleaned, difficulty_labels, multi_label=False)
    recommend_result = classifier(cleaned, recommend_labels, multi_label=False)

    difficulty_score = 0

    for label, confidence in zip(
        difficulty_result["labels"],
        difficulty_result["scores"]
    ):
        difficulty_score += difficulty_map[label] * confidence

    recommend_score = 0

    for label, confidence in zip(
        recommend_result["labels"],
        recommend_result["scores"]
    ):
        recommend_score += recommend_map[label] * confidence

    return {
        "difficulty_score": difficulty_score,
        "recommend_score": recommend_score
    }

grade_map = {
    "A+": 5.0,
    "A": 5.0,
    "A-": 4.5,
    "B+": 4.0,
    "B": 3.5,
    "B-": 3.0,
    "C+": 2.5,
    "C": 2.0,
    "D+": 1.5,
    "D": 1.0,
    "F": 0.0
}

def extract_expected_gpa(comment):

    pattern = r"""
    (?:expected\s*grade|
    predicted\s*grade|
    expecting|
    expect|
    predicting|
    projected\s*grade|
    estimated\s*grade|
    anticipated\s*grade|
    forecasted\s*grade
    )
    \s*[:\-]?\s* #account for symbols
    (A\+|A-|A|B\+|B-|B|C\+|C-|C|D\+|D|F)
    """
    
    cleaned = clean_comment_message(comment)
    match = re.search(pattern, cleaned, re.IGNORECASE | re.VERBOSE)

    if match: #check if not None
        letter_grade = match.group(1).upper()  #matching group(1) corresponds to only the letter grade
        return grade_map.get(letter_grade)

    return None #no match found

def extract_actual_gpa(comment):

    pattern = r"""
    (?:actual\s*grade|
    got|
    received|
    ended\s*up\s*with|
    scored|
    achieved|
    obtained|
    final\s*grade|
    actual\s*grade|
    ended\s*with|
    came\s*out\s*with|
    grade
    )
    \s*[:\-]?\s*
    (A\+|A-|A|B\+|B-|B|C\+|C-|C|D\+|D|F)
    """

    cleaned = clean_comment_message(comment)
    match = re.search(pattern, cleaned, re.IGNORECASE | re.VERBOSE)

    if match: #check if not None
        letter_grade = match.group(1).upper()  #matching group(1) corresponds to only the letter grade
        return grade_map.get(letter_grade)

    return None #no match found


# ── Extractive summarisation ──────────────────────────────────────────────────

from collections import Counter

_STOPWORDS = {
    'the','a','an','is','it','in','of','and','to','i','for','that','this','was',
    'are','with','as','at','be','by','from','or','but','not','have','has','had',
    'my','me','we','you','he','she','they','so','if','do','did','will','can','on',
    'its','also','very','your','our','their','which','who','what','just','been',
    'when','would','could','should','than','then','there','some','more','about',
    'one','all','up','out','module','course','class','sem','semester','nus',
}

def extractive_summarize(texts, num_sentences=5):
    """Return a summary paragraph from a list of cleaned comment strings."""
    if not texts:
        return None

    combined = ' '.join(texts)

    # Split into sentences (rough)
    raw_sentences = re.split(r'(?<=[.!?])\s+', combined)
    sentences = [s.strip() for s in raw_sentences if len(s.strip()) > 40]

    if not sentences:
        return None

    # Word frequency (stop-word filtered)
    words = re.findall(r'\b[a-z]+\b', combined.lower())
    freq = Counter(w for w in words if w not in _STOPWORDS and len(w) > 2)
    if not freq:
        return None

    def score(sent):
        ws = re.findall(r'\b[a-z]+\b', sent.lower())
        return sum(freq.get(w, 0) for w in ws) / max(len(ws), 1)

    scored = sorted(enumerate(sentences), key=lambda x: score(x[1]), reverse=True)
    top_idx = sorted([i for i, _ in scored[:num_sentences]])
    return ' '.join(sentences[i] for i in top_idx)


# ── Grade threshold extraction ────────────────────────────────────────────────

import statistics

_GRADE_ORDER = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D']
_GRADE_PAT   = r'(?:A\+|A-|A|B\+|B-|B|C\+|C-|C|D\+|D)'

# Patterns: each yields (grade_or_score, score_or_grade) pairs
_THRESHOLD_PATTERNS = [
    # "got A with 85", "scored B+ with 75%", "received A- at 88 marks"
    rf'(?:got|scored|received|achieved|obtained|ended\s+up\s+(?:with)?|grade)\s+({_GRADE_PAT})\D{{0,15}}?(\d{{2,3}})',
    # "A: 85", "B+: 75-84", "A- – 88"
    rf'({_GRADE_PAT})\s*[:\-–]\s*(\d{{2,3}})',
    # "85 for A", "78 marks for B+", "need 80 for an A-"
    rf'(\d{{2,3}})\s*(?:%|marks?|points?)?\s+(?:for|to\s+get|gets?)\s+(?:an?\s+)?({_GRADE_PAT})',
    # "cutoff for A is 80", "A cutoff at 85", "A+ requires 90"
    rf'({_GRADE_PAT})\s+(?:cutoff|cut.off|requires?|needs?|minimum)\s+(?:is|was|at|of|around)?\s*(\d{{2,3}})',
    rf'(?:cutoff|cut.off|minimum)\s+(?:for\s+)?(?:an?\s+)?({_GRADE_PAT})\s+(?:is|was|at|around)?\s*(\d{{2,3}})',
    # "above 85 is A", "80 and above gets A-"
    rf'(\d{{2,3}})\s*(?:and\s+above|or\s+above|\+)?\s+(?:is|gets?|for)\s+(?:an?\s+)?({_GRADE_PAT})',
]

def extract_grade_thresholds(texts):
    """
    Parse self-reported grade scores from review texts.
    Returns an ordered dict {grade: median_score} for grades with data, or None.
    """
    buckets: dict[str, list[int]] = {}

    for text in texts:
        text = re.sub(r'\s+', ' ', text)
        for pat in _THRESHOLD_PATTERNS:
            for m in re.findall(pat, text, re.IGNORECASE):
                a, b = m[0].strip(), m[1].strip()
                try:
                    if re.match(r'^\d+$', a):
                        score_val, grade = int(a), b.upper()
                    else:
                        grade, score_val = a.upper(), int(b)
                    grade = grade.replace(' ', '')
                    if grade in _GRADE_ORDER and 40 <= score_val <= 100:
                        buckets.setdefault(grade, []).append(score_val)
                except (ValueError, IndexError):
                    continue

    if not buckets:
        return None

    result = {
        g: round(statistics.median(scores), 1)
        for g, scores in buckets.items()
        if scores
    }
    # Return in standard grade order
    ordered = {g: result[g] for g in _GRADE_ORDER if g in result}
    return ordered if ordered else None