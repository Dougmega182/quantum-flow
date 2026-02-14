# Quantum Flow

Quantum Flow is an AI-enhanced task management system with Google Calendar integration, automated workflows, and recurring task support.

## Features

- **✅ Task Management**: Full CRUD with priority, due dates, and status tracking (Today, Overdue, Upcoming).
- **📋 Task Templates**: Create reusable blueprints for common tasks.
- **🔄 Recurrence**: Schedule repeating tasks (Daily, Weekly, Monthly) based on templates.
- **☁️ Google Calendar Integration**: Bidirectional sync between app tasks and Google events.
- **🤖 Automations**: Define custom workflows and trigger actions (e.g., auto-task creation) manually or via batch.
- **🧠 AI Suggestions**: Smart task summarization and overdue action suggestions.

## Dev Quickstart

1. **Spin up Infrastructure**:
   ```bash
   docker-compose up --build -d
   ```

2. **Database Migration & Seeding**:
   ```bash
   docker exec -it quantumflow-api alembic upgrade head
   ```

3. **Frontend Setup**:
   ```bash
   cd web
   npm install
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173). Use the `API_KEY` from your `.env` file to log in.

## Production Setup

Ensure `backend/.env.prod` is configured with production secrets (Google OAuth credentials, production `DATABASE_URL`, etc.).

```bash
docker compose -f docker-compose.prod.yml up --build -d
docker exec -it quantumflow-api-1 alembic upgrade head
```

- **API**: http://localhost:8005
- **Web (Nginx)**: http://localhost:8080

## Project Architecture

- **Backend**: FastAPI (Python), SQLAlchemy, PostgreSQL, Alembic.
- **Frontend**: React (TypeScript), Vite, Vanilla CSS.
- **Proxy**: Nginx (Production).
- **Infrastructure**: Docker Compose.

## Testing

Run the full backend test suite:
```bash
docker exec -it quantumflow-api python -m pytest tests/
```

Verify frontend build:
```bash
cd web && npm run build
```