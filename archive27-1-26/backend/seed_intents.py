# backend/seed_intents.py
from app.db import SessionLocal, engine, Base
from app.models.intent import Intent

# create tables (optional, only if not migrated)
Base.metadata.create_all(bind=engine)

# define seed data
seed_data = [
    {"name": "greeting", "description": "User says hello"},
    {"name": "farewell", "description": "User says goodbye"},
    {"name": "help", "description": "User asks for help"},
]

def seed():
    db = SessionLocal()
    try:
        for item in seed_data:
            # check if exists
            exists = db.query(Intent).filter_by(name=item["name"]).first()
            if not exists:
                db.add(Intent(**item))
        db.commit()
        print("Seeding complete!")
    except Exception as e:
        db.rollback()
        print("Error seeding:", e)
    finally:
        db.close()

if __name__ == "__main__":
    seed()
