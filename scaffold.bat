@echo off
setlocal enabledelayedexpansion

REM Root folder
set ROOT=QUANTUM_FLOW\backend

REM Directories
set DIRS=^
%ROOT% ^
%ROOT%\app ^
%ROOT%\app\models ^
%ROOT%\app\routes ^
%ROOT%\app\schemas ^
%ROOT%\app\config ^
%ROOT%\alembic_migrations ^
%ROOT%\alembic ^
%ROOT%\tests

for %%d in (%DIRS%) do (
  if not exist "%%d" (
    mkdir "%%d"
    echo Created dir: %%d
  ) else (
    echo Exists: %%d
  )
)

REM Core files (created if missing)
call :touch "%ROOT%\app\__init__.py"
call :touch "%ROOT%\app\models\__init__.py"
call :touch "%ROOT%\app\routes\__init__.py"
call :touch "%ROOT%\app\schemas\__init__.py"
call :touch "%ROOT%\app\config\__init__.py"
call :touch "%ROOT%\app\db.py"
call :touch "%ROOT%\app\main.py"
call :touch "%ROOT%\app\models\intent.py"
call :touch "%ROOT%\app\schemas\intent.py"
call :touch "%ROOT%\app\routes\intents.py"
call :touch "%ROOT%\alembic.ini"
call :touch "%ROOT%\alembic\env.py"
call :touch "%ROOT%\alembic\script.py.mako"
call :touch "%ROOT%\alembic_migrations\README"
call :touch "%ROOT%\seed_intents.py"
call :touch "%ROOT%\docker-compose.yml"
call :touch "%ROOT%\Dockerfile"
call :touch "%ROOT%\.env.example"
call :touch "%ROOT%\requirements.txt"

REM db.py skeleton
call :write "%ROOT%\app\db.py" ^
"from sqlalchemy import create_engine" ^
"from sqlalchemy.orm import sessionmaker, declarative_base" ^
"import os" ^
"" ^
"DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql+psycopg2://quantum:quantum123@db:5432/quantum_flow')" ^
"" ^
"engine = create_engine(DATABASE_URL, pool_pre_ping=True, echo=False)" ^
"SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)" ^
"Base = declarative_base()" ^
""

REM models/intent.py with CITEXT
call :write "%ROOT%\app\models\intent.py" ^
"from sqlalchemy import Column, Integer, Text" ^
"from sqlalchemy.dialects.postgresql import CITEXT" ^
"from app.db import Base" ^
"" ^
"class Intent(Base):" ^
"    __tablename__ = 'intents'" ^
"    id = Column(Integer, primary_key=True, index=True)" ^
"    name = Column(CITEXT, unique=True, index=True, nullable=False)" ^
"    description = Column(Text, nullable=True)" ^
""

REM schemas/intent.py
call :write "%ROOT%\app\schemas\intent.py" ^
"from pydantic import BaseModel, constr" ^
"from typing import Optional" ^
"" ^
"class IntentBase(BaseModel):" ^
"    name: constr(strip_whitespace=True, min_length=1, max_length=255)" ^
"    description: Optional[str] = None" ^
"" ^
"class IntentCreate(IntentBase):" ^
"    pass" ^
"" ^
"class IntentUpdate(BaseModel):" ^
"    description: Optional[str] = None" ^
"" ^
"class IntentOut(BaseModel):" ^
"    id: int" ^
"    name: str" ^
"    description: Optional[str]" ^
"" ^
"    class Config:" ^
"        from_attributes = True" ^
""

REM routes/intents.py
call :write "%ROOT%\app\routes\intents.py" ^
"from fastapi import APIRouter, Depends, HTTPException, status" ^
"from sqlalchemy.orm import Session" ^
"from app.db import SessionLocal" ^
"from app import models" ^
"from app.schemas.intent import IntentCreate, IntentUpdate, IntentOut" ^
"from typing import List, Optional" ^
"" ^
"router = APIRouter(prefix='/v1/intents', tags=['intents'])" ^
"" ^
"def get_db():" ^
"    db = SessionLocal()" ^
"    try:" ^
"        yield db" ^
"    finally:" ^
"        db.close()" ^
"" ^
"@router.get('', response_model=dict)" ^
"def list_intents(q: Optional[str] = None, limit: int = 50, offset: int = 0, db: Session = Depends(get_db)):" ^
"    limit = min(limit, 200)" ^
"    query = db.query(models.Intent)" ^
"    if q:" ^
"        query = query.filter(models.Intent.name.ilike(f'%{q}%'))" ^
"    total = query.count()" ^
"    items = query.order_by(models.Intent.id).offset(offset).limit(limit).all()" ^
"    return {'items': items, 'limit': limit, 'offset': offset, 'total': total}" ^
"" ^
"@router.get('/{intent_id}', response_model=IntentOut)" ^
"def get_intent(intent_id: int, db: Session = Depends(get_db)):" ^
"    intent = db.query(models.Intent).get(intent_id)" ^
"    if not intent:" ^
"        raise HTTPException(status_code=404, detail='INTENT_NOT_FOUND')" ^
"    return intent" ^
"" ^
"@router.post('', response_model=IntentOut, status_code=status.HTTP_201_CREATED)" ^
"def create_intent(payload: IntentCreate, db: Session = Depends(get_db)):" ^
"    # case-insensitive check via CITEXT unique; also double-check manually" ^
"    existing = db.query(models.Intent).filter(models.Intent.name == payload.name).first()" ^
"    if existing:" ^
"        raise HTTPException(status_code=409, detail='INTENT_ALREADY_EXISTS')" ^
"    intent = models.Intent(name=payload.name, description=payload.description)" ^
"    db.add(intent)" ^
"    db.commit()" ^
"    db.refresh(intent)" ^
"    return intent" ^
"" ^
"@router.patch('/{intent_id}', response_model=IntentOut)" ^
"def update_intent(intent_id: int, payload: IntentUpdate, db: Session = Depends(get_db)):" ^
"    intent = db.query(models.Intent).get(intent_id)" ^
"    if not intent:" ^
"        raise HTTPException(status_code=404, detail='INTENT_NOT_FOUND')" ^
"    if payload.description is not None:" ^
"        intent.description = payload.description" ^
"    db.commit()" ^
"    db.refresh(intent)" ^
"    return intent" ^
"" ^
"@router.delete('/{intent_id}')" ^
"def delete_intent(intent_id: int):" ^
"    raise HTTPException(status_code=405, detail='INTENT_DELETE_DISABLED')" ^
""

REM app/main.py
call :write "%ROOT%\app\main.py" ^
"from fastapi import FastAPI" ^
"from app.routes import intents" ^
"" ^
"app = FastAPI(title='Quantum Flow Intent Service', version='0.1')" ^
"" ^
"app.include_router(intents.router)" ^
""

REM seed_intents.py
call :write "%ROOT%\seed_intents.py" ^
"import os" ^
"from sqlalchemy import create_engine" ^
"from sqlalchemy.orm import sessionmaker" ^
"from app.db import Base, DATABASE_URL" ^
"from app.models.intent import Intent" ^
"" ^
"SEED_INTENTS = [" ^
"    {'name': 'capture.task', 'description': 'Create a task from captured snippet'}," ^
"    {'name': 'plan.daily', 'description': 'Daily planning routine'}," ^
"    {'name': 'review.weekly', 'description': 'Weekly review and prioritization'}" ^
"]" ^
"" ^
"def main():" ^
"    engine = create_engine(DATABASE_URL, pool_pre_ping=True)" ^
"    SessionLocal = sessionmaker(bind=engine)" ^
"    Base.metadata.create_all(engine)" ^
"    db = SessionLocal()" ^
"    try:" ^
"        for seed in SEED_INTENTS:" ^
"            existing = db.query(Intent).filter(Intent.name == seed['name']).first()" ^
"            if existing:" ^
"                if existing.description != seed['description']:" ^
"                    existing.description = seed['description']" ^
"            else:" ^
"                db.add(Intent(**seed))" ^
"        db.commit()" ^
"    finally:" ^
"        db.close()" ^
"" ^
"if __name__ == '__main__':" ^
"    main()" ^
""

REM alembic.ini (minimal placeholder)
call :write "%ROOT%\alembic.ini" ^
"[alembic]" ^
"script_location = alembic" ^
"sqlalchemy.url = postgresql+psycopg2://quantum:quantum123@db:5432/quantum_flow" ^
""

REM alembic/env.py (placeholder wiring)
call :write "%ROOT%\alembic\env.py" ^
"from logging.config import fileConfig" ^
"from sqlalchemy import engine_from_config, pool" ^
"from alembic import context" ^
"import os" ^
"from app.db import Base" ^
"from app.models.intent import Intent" ^
"" ^
"config = context.config" ^
"DATABASE_URL = os.getenv('DATABASE_URL', config.get_main_option('sqlalchemy.url'))" ^
"config.set_main_option('sqlalchemy.url', DATABASE_URL)" ^
"" ^
"if config.config_file_name is not None:" ^
"    fileConfig(config.config_file_name)" ^
"" ^
"target_metadata = Base.metadata" ^
"" ^
"def run_migrations_offline():" ^
"    url = config.get_main_option('sqlalchemy.url')" ^
"    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)" ^
"    with context.begin_transaction():" ^
"        context.run_migrations()" ^
"" ^
"def run_migrations_online():" ^
"    connectable = engine_from_config(config.get_section(config.config_ini_section), prefix='sqlalchemy.', poolclass=pool.NullPool)" ^
"    with connectable.connect() as connection:" ^
"        context.configure(connection=connection, target_metadata=target_metadata)" ^
"        with context.begin_transaction():" ^
"            context.run_migrations()" ^
"" ^
"if context.is_offline_mode():" ^
"    run_migrations_offline()" ^
"else:" ^
"    run_migrations_online()" ^
""

REM requirements.txt
call :write "%ROOT%\requirements.txt" ^
"fastapi==0.110.0" ^
"uvicorn[standard]==0.29.0" ^
"SQLAlchemy==2.0.29" ^
"psycopg2-binary==2.9.9" ^
"alembic==1.13.1" ^
"pydantic==2.6.4" ^
"python-dotenv==1.0.1" ^
""

REM docker-compose.yml
call :write "%ROOT%\docker-compose.yml" ^
"version: '3.9'" ^
"services:" ^
"  api:" ^
"    build: ." ^
"    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload" ^
"    volumes:" ^
"      - ./:/code" ^
"    working_dir: /code" ^
"    env_file:" ^
"      - .env" ^
"    ports:" ^
"      - '8000:8000'" ^
"    depends_on:" ^
"      - db" ^
"  db:" ^
"    image: postgres:15" ^
"    environment:" ^
"      POSTGRES_USER: quantum" ^
"      POSTGRES_PASSWORD: quantum123" ^
"      POSTGRES_DB: quantum_flow" ^
"    ports:" ^
"      - '5432:5432'" ^
"    volumes:" ^
"      - pgdata:/var/lib/postgresql/data" ^
"volumes:" ^
"  pgdata:" ^
""

REM Dockerfile
call :write "%ROOT%\Dockerfile" ^
"FROM python:3.11-slim" ^
"WORKDIR /code" ^
"COPY requirements.txt ." ^
"RUN pip install --no-cache-dir -r requirements.txt" ^
"COPY . ." ^
"CMD [\"uvicorn\", \"app.main:app\", \"--host\", \"0.0.0.0\", \"--port\", \"8000\"]" ^
""

REM .env.example
call :write "%ROOT%\.env.example" ^
"DATABASE_URL=postgresql+psycopg2://quantum:quantum123@db:5432/quantum_flow" ^
""

echo Done.
goto :eof

:touch
if not exist "%~1" (
  type nul > "%~1"
  echo Created file: %~1
) else (
  echo Exists: %~1
)
goto :eof

:write
set "file=%~1"
shift
> "%file%" (
  for %%l in (%*) do echo %%~l
)
echo Wrote: %file%
goto :eof