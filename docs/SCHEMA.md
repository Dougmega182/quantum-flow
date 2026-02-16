# Database Schema

## Users
- `id`: Primary Key (Integer)
- `email`: String (Unique)
- `hashed_password`: String
- `avatar_url`: String (512) - URL to profile picture
- `is_active`: Boolean

## Tasks
- `id`: Primary Key (Integer)
- `title`: String
- `description`: Text
- `status`: String
- `energy_level`: String (16) - [Low, Medium, High]
- `parent_id`: Foreign Key (`tasks.id`) - Hierarchy support
- `depends_on_id`: Foreign Key (`tasks.id`) - Dependency tracking
- `owner_id`: Foreign Key (`users.id`)

## Revisions
Tracked via Alembic. Head: `537f39d2c4e4_manual`
