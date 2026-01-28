COMPOSE := docker-compose
API := quantumflow-api

.PHONY: up down logs sh migrate seed test backup

up:
	$(COMPOSE) up --build -d

down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f

sh:
	docker exec -it $(API) /bin/sh

migrate:
	docker exec -it -w /code $(API) alembic upgrade head

seed:
	docker exec -it $(API) python /code/seed_intents.py

test:
	docker exec -it -w /code $(API) pytest

backup:
	@echo "Dumping database to ./backup.sql ..."
	docker exec -t quantumflow-db pg_dump -U quantum -d quantum_flow > backup.sql