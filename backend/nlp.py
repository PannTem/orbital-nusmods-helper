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