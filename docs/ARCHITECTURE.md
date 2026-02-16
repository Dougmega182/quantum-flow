# Architecture - Quantum Flow

## Tech Stack
- **Frontend**: React + TypeScript + Vite
- **Backend**: FastAPI (Python 3.11)
- **Database**: PostgreSQL 15 + `pgvector` for ML/RAG
- **Infrastructure**: Docker Compose (Unified Stack)
- **Proxy/Tunnel**: ngrok

## Core Components
- **AI Center**: Orchestrates ML-driven scheduling and chat.
- **Project Vault**: Markdown-first project management with bidirectional linking.
- **Pomodoro Engine**: Integrated focus timer with configurable intervals.

## Data Flow
- Frontend communicates with Backend on Port 8005.
- CORS configured for `localhost:5173` and `ngrok` domains.
- Persistent storage via Docker Volumes (`pgdata`).