## README (add/update)
```
# Quantum Flow

## Dev Quickstart
docker-compose up --build -d
docker exec -it quantumflow-api alembic upgrade head
docker exec -it quantumflow-api python /code/seed_intents.py
cd web && npm install && npm run dev   # open http://localhost:5173

## Prod Quickstart (Compose)
# prerequisites: backend/.env.prod with real secrets, built web (npm run build)
docker compose -f docker-compose.prod.yml up --build -d
docker exec -it quantumflow-api-1 alembic upgrade head
docker exec -it quantumflow-api-1 python /code/seed_intents.py
# API: http://localhost:8005, Web via nginx: http://localhost:8080
```

Ensure `backend/.env.prod` contains (no quotes):
```
API_KEY=your-prod-key
DATABASE_URL=postgresql+psycopg2://quantum:quantum123@db:5432/quantum_flow
ALLOW_ORIGINS=https://parakeet-novel-accurately.ngrok-free.app,http://localhost:5173
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://parakeet-novel-accurately.ngrok-free.app/v1/integrations/google/callback
```

## .github/workflows/ci.yml
```yaml
name: CI
on:
  push:
  pull_request:

jobs:
  build-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: quantum
          POSTGRES_PASSWORD: quantum123
          POSTGRES_DB: quantum_flow
        ports: ["5432:5432"]
        options: >-
          --health-cmd="pg_isready -U quantum"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=5
    env:
      DATABASE_URL: postgresql+psycopg2://quantum:quantum123@localhost:5432/quantum_flow
      API_KEY: test-key
      ALLOW_ORIGINS: http://localhost:5173
    steps:
      - uses: actions/checkout@v4

      - name: Backend deps
        run: |
          cd backend
          pip install --no-cache-dir -r requirements.txt

      - name: Alembic upgrade
        run: |
          cd backend
          alembic upgrade head

      - name: Backend tests
        run: |
          cd backend
          pytest

      - name: Web build
        run: |
          cd web
          npm ci
          npm run build
```

## nginx.conf (mounted to /etc/nginx/conf.d/default.conf)
```nginx
server {
    listen 80;
    server_name parakeet-novel-accurately.ngrok-free.app;

    root /usr/share/nginx/html;
    index index.html;

    location / { try_files $uri $uri/ /index.html; }

    location /v1/ {
        proxy_pass http://api:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /health  { proxy_pass http://api:8000/health; }
    location /metrics { proxy_pass http://api:8000/metrics; }
}
```

## docker-compose.prod.yml (key bits)
- Ensure host ports don’t conflict (adjust if needed):
```yaml
db:
  image: postgres:15
  environment:
    POSTGRES_DB: quantum_flow
    POSTGRES_USER: quantum
    POSTGRES_PASSWORD: quantum123
  ports:
    - "5434:5432"   # change host port if 5432/5433 in use
  volumes:
    - pgdata:/var/lib/postgresql/data

api:
  build: ./backend
  env_file:
    - ./backend/.env.prod
  environment:
    DATABASE_URL: postgresql+psycopg2://quantum:quantum123@db:5432/quantum_flow
  ports:
    - "8005:8000"
  command: ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

web:
  image: nginx:stable-alpine
  depends_on: [api]
  volumes:
    - ./web/dist:/usr/share/nginx/html:ro
    - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
  ports:
    - "8080:80"

volumes:
  pgdata:
```

## Notes
- Run DB first if needed: `docker compose -f docker-compose.prod.yml up -d db` then API/Web.
- Port conflicts: adjust db host port (5434) and api host port if 8005 is taken.
- Google OAuth: register redirect `https://parakeet-novel-accurately.ngrok-free.app/v1/integrations/google/callback` in Google console.
- API key: regenerate if lost; set in `backend/.env.prod`.

This gives you a repeatable prod/dev path with CI.Below are production-ready drop-ins for CI and README (dev/prod quickstart), plus the corrected nginx site config.

---

## README additions (concise)

## Dev Quickstart
docker-compose up --build -d
docker exec -it quantumflow-api alembic upgrade head
docker exec -it quantumflow-api python /code/seed_intents.py
cd web && npm install && npm run dev

## Prod Quickstart
# ensure backend/.env.prod is set with real secrets
docker compose -f docker-compose.prod.yml up -d --build
docker exec -it quantumflow-api-1 alembic upgrade head
docker exec -it quantumflow-api-1 python /code/seed_intents.py

## Health checks
curl http://localhost:8005/health        # API direct
curl http://localhost:8080/health        # via nginx

`backend/.env.prod` (example):

API_KEY=your-prod-key
ALLOW_ORIGINS=https://parakeet-novel-accurately.ngrok-free.app,http://localhost:5173
DATABASE_URL=postgresql+psycopg2://quantum:quantum123@db:5432/quantum_flow
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://parakeet-novel-accurately.ngrok-free.app/v1/integrations/google/callback
```

---

## GitHub Actions CI (`.github/workflows/ci.yml`)
```yaml
name: CI
on:
  push:
  pull_request:

jobs:
  build-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: quantum
          POSTGRES_PASSWORD: quantum123
          POSTGRES_DB: quantum_flow
        ports: ["5432:5432"]
        options: >-
          --health-cmd="pg_isready -U quantum" --health-interval=10s
          --health-timeout=5s --health-retries=5
    env:
      DATABASE_URL: postgresql+psycopg2://quantum:quantum123@localhost:5432/quantum_flow
      API_KEY: test-key
      ALLOW_ORIGINS: http://localhost:5173
    steps:
      - uses: actions/checkout@v4

      - name: Backend deps
        run: |
          cd backend
          pip install --no-cache-dir -r requirements.txt

      - name: Alembic upgrade
        run: |
          cd backend
          alembic upgrade head

      - name: Backend tests
        run: |
          cd backend
          pytest

      - name: Web build
        run: |
          cd web
          npm ci
          npm run build
```

---

## nginx site config (mount to `/etc/nginx/conf.d/default.conf`)
```nginx
server {
    listen 80;
    server_name parakeet-novel-accurately.ngrok-free.app;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API to FastAPI (service name "api", port 8000 inside compose)
    location /v1/ {
        proxy_pass http://api:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /health   { proxy_pass http://api:8000/health; }
    location /metrics  { proxy_pass http://api:8000/metrics; }
}
```

Make sure your compose mounts it as:
```yaml
web:
  image: nginx:stable-alpine
  volumes:
    - ./web/dist:/usr/share/nginx/html:ro
    - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
  ports:
    - "8080:80"
  depends_on:
    - api
```

---

## Tips
- Resolve DB port conflicts by mapping to a free host port (e.g., `5434:5432`) if 5432/5433 are in use.
- Run alembic/seed only after DB is healthy.
- Keep `.env` files out of git; rotate API_KEY for prod and update clients accordingly.