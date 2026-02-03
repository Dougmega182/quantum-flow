from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db import Base, DATABASE_URL
from app.models.intent import Intent
from app.models.user import User
from app.models.task import Task
from app.models.task_template import TaskTemplate
from app.models.recurrence_rule import RecurrenceRule

SEED_INTENTS = [
    {"name": "capture.task", "description": "Create a task from captured snippet"},
    {"name": "plan.daily", "description": "Daily planning routine"},
    {"name": "review.weekly", "description": "Weekly review and prioritization"},
]

def main():
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    SessionLocal = sessionmaker(bind=engine)
    Base.metadata.create_all(engine)
    db = SessionLocal()
    try:
        # intents
        for seed in SEED_INTENTS:
            existing = db.query(Intent).filter(Intent.name == seed["name"]).first()
            if existing:
                if existing.description != seed["description"]:
                    existing.description = seed["description"]
            else:
                db.add(Intent(**seed))

        # default user
        user = db.query(User).filter_by(email="demo@example.com").first()
        if not user:
            user = User(email="demo@example.com")
            db.add(user)
            db.commit()
            db.refresh(user)

        # sample task
        if not db.query(Task).filter_by(title="Sample task").first():
            db.add(Task(user_id=user.id, title="Sample task", description="First task", intent_id=None))

        # sample template
        tpl = db.query(TaskTemplate).filter_by(title="Daily review").first()
        if not tpl:
            tpl = TaskTemplate(
                user_id=user.id,
                title="Daily review",
                description="Plan the day",
                priority="med",
                default_due_days=None,
            )
            db.add(tpl)
            db.commit()
            db.refresh(tpl)

        # sample recurrence rule
        rule = db.query(RecurrenceRule).filter_by(template_id=tpl.id).first()
        if not rule:
            rule = RecurrenceRule(
                user_id=user.id,
                template_id=tpl.id,
                freq="daily",
                interval=1,
            )
            db.add(rule)

        db.commit()
    finally:
        db.close()

if __name__ == "__main__":
    main()