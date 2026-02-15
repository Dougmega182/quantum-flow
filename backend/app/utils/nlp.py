import re
from datetime import datetime, timedelta

def parse_task_nlp(text: str):
    """
    Primitive NLP parser for dates/times in task titles.
    Supports:
    - 'tomorrow'
    - 'at 5pm', 'at 17:00'
    - 'today'
    - 'in 2 days'
    Returns: (cleaned_title, due_at)
    """
    now = datetime.utcnow()
    due_at = None
    cleaned_text = text

    # Helper: tomorrow
    if "tomorrow" in cleaned_text.lower():
        due_at = datetime(now.year, now.month, now.day) + timedelta(days=1, hours=9) # default 9am
        cleaned_text = re.sub(r"tomorrow", "", cleaned_text, flags=re.IGNORECASE).strip()

    # Helper: today
    elif "today" in cleaned_text.lower():
        due_at = datetime(now.year, now.month, now.day, 17, 0) # default 5pm today
        cleaned_text = re.sub(r"today", "", cleaned_text, flags=re.IGNORECASE).strip()

    # Helper: in N days
    in_days_match = re.search(r"in (\d+) days", cleaned_text.lower())
    if in_days_match:
        days = int(in_days_match.group(1))
        due_at = datetime(now.year, now.month, now.day) + timedelta(days=days, hours=9)
        cleaned_text = re.sub(r"in \d+ days", "", cleaned_text, flags=re.IGNORECASE).strip()

    # Helper: at HH:MM or at Hpm
    time_match = re.search(r"at (\d+)(?::(\d+))?\s*(am|pm)?", cleaned_text.lower())
    if time_match:
        hh = int(time_match.group(1))
        mm = int(time_match.group(2)) if time_match.group(2) else 0
        ampm = time_match.group(3)
        
        if ampm == "pm" and hh < 12:
            hh += 12
        elif ampm == "am" and hh == 12:
            hh = 0

        # If we already have a date (e.g. from tomorrow), just set the time
        if due_at:
            due_at = due_at.replace(hour=hh, minute=mm)
        else:
            # Default to today if no date specified
            due_at = now.replace(hour=hh, minute=mm, second=0, microsecond=0)
            if due_at < now: # If time already passed today, assume tomorrow
                due_at += timedelta(days=1)
        
        cleaned_text = re.sub(r"at \d+(?::\d+)?\s*(am|pm)?", "", cleaned_text, flags=re.IGNORECASE).strip()

    # Final cleanup of double spaces
    cleaned_text = re.sub(r"\s+", " ", cleaned_text).strip()
    
    return cleaned_text, due_at
