from app.utils.nlp import parse_task_nlp
from datetime import datetime

test_cases = [
    "Call Bob tomorrow at 5pm",
    "Go to gym today at 18:30",
    "Submit report in 2 days at 10am",
    "Review strategy at 2pm"
]

for text in test_cases:
    title, due = parse_task_nlp(text)
    print(f"Input: {text}")
    print(f"  Title: {title}")
    print(f"  Due:   {due}")
    print("-" * 20)
