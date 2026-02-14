# Quantum Flow Backend

The backend is a FastAPI-based intent and task management service.

## Completed Roadmap

- **✅ Phase 1: Intent Registry**: SQL foundation and intent CRUD.
- **✅ Phase 2: Core Domain**: Tasks and status tracking.
- **✅ Phase 3: Planning Model**: Filters, due dates, and priorities.
- **✅ Phase 4: Recurrence + Templates**: Task blueprints and materialization.
- **✅ Phase 5: Integrations Layer**: Google Calendar OAuth and sync adaptors.
- **✅ Phase 6: Automation & Workflows**: Manual and batch execution engine.
- **✅ Phase 7: AI Layer**: Suggestions and summaries.
- **✅ Phase 8: Web Frontend Integration**: Full wiring with React client.
- **✅ Phase 9: Production Hardening**: CI/CD ready, Nginx config, and tests.

## Tech Stack

- **API**: FastAPI
- **DB**: PostgreSQL + SQLAlchemy
- **Migrations**: Alembic
- **Testing**: Pytest
- **Runtime**: Docker / Uvicorn

## Development

Run migrations:
```bash
alembic upgrade head
```

Run tests:
```bash
pytest
```

Seed intents:
```bash
python seed_intents.py
```