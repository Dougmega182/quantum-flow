from app.database import SessionLocal
from app.models.intent import Intent
from datetime import datetime

# Create a database session
db = SessionLocal()

# Example data
new_intent = Intent(
    source="test",
    content="Hello world",
    status="new",
    created_at=datetime.utcnow()
)

# Add and commit
db.add(new_intent)
db.commit()
db.refresh(new_intent)

print(f"Inserted intent with ID: {new_intent.id}")

# Close session
db.close()
