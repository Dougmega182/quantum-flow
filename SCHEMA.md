# 🏗 Database Schema Architecture

## 👤 1. Identity & Accounts
- `users`: Core user data and timezones.
- `workspaces`: Multi-tenant containers.
- `workspace_members`: RBAC mapping.

## 📋 2. Tasks & Projects Domain
- `projects`: Groupings with status and color.
- `tasks`: Support for estimated/actual duration, energy level, and soft/hard deadlines.
- `task_dependencies`: Logic for sequential workflows.
- `task_tags`: Multi-tagging support.

## 📅 3. Scheduling & Calendar
- `calendars`: Provider mapping (Google, Outlook).
- `calendar_events`: External event cache.
- `scheduled_blocks`: Task-to-time mapping with confidence scores.
- `availability_windows`: Working hours definitions.

## 🧠 4. AI Intelligence Layer
- `user_behavior_profiles`: Learned patterns (avg completion, peak focus).
- `energy_patterns`: Hourly energy score mapping.
- `scheduling_preferences`: Deep work min blocks, context switch tolerance.

## 📊 5. Analytics & Telemetry
- `time_logs`: Granular tracking.
- `productivity_metrics_daily`: Aggregated scores.
- `task_reschedule_history`: Context for future AI optimizations.

## 🔍 10. Vector Search (pgvector)
- `task_embeddings`: Semantic clustering for reasoning.
- `conversation_embeddings`: Conversational context memory.
- `scheduled_blocks`: Time-block retrieval.
