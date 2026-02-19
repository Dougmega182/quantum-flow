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

    # Phase 4C: in N hours
    in_hours_match = re.search(r"in (\d+) hours?", cleaned_text.lower())
    if in_hours_match and not due_at:
        hours = int(in_hours_match.group(1))
        due_at = now + timedelta(hours=hours)
        cleaned_text = re.sub(r"in \d+ hours?", "", cleaned_text, flags=re.IGNORECASE).strip()

    # Phase 4C: next <dayname>
    day_names = {"monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3, "friday": 4, "saturday": 5, "sunday": 6}
    next_day_match = re.search(r"next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)", cleaned_text.lower())
    if next_day_match and not due_at:
        target_day = day_names[next_day_match.group(1)]
        current_day = now.weekday()
        delta = (target_day - current_day) % 7
        if delta == 0:
            delta = 7  # "next Monday" when today is Monday = 7 days
        due_at = datetime(now.year, now.month, now.day) + timedelta(days=delta, hours=9)
        cleaned_text = re.sub(r"next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)", "", cleaned_text, flags=re.IGNORECASE).strip()

    # Phase 4C: end of week
    if re.search(r"end of (?:the )?week", cleaned_text.lower()) and not due_at:
        days_until_friday = (4 - now.weekday()) % 7
        if days_until_friday == 0:
            days_until_friday = 7
        due_at = datetime(now.year, now.month, now.day) + timedelta(days=days_until_friday, hours=17)
        cleaned_text = re.sub(r"end of (?:the )?week", "", cleaned_text, flags=re.IGNORECASE).strip()

    # Phase 4C: this weekend
    if re.search(r"this weekend", cleaned_text.lower()) and not due_at:
        days_until_saturday = (5 - now.weekday()) % 7
        if days_until_saturday == 0:
            days_until_saturday = 7
        due_at = datetime(now.year, now.month, now.day) + timedelta(days=days_until_saturday, hours=10)
        cleaned_text = re.sub(r"this weekend", "", cleaned_text, flags=re.IGNORECASE).strip()

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
