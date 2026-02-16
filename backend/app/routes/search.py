from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, text
from app import models
from app.db import SessionLocal
from app.services.embeddings import compute_embedding, sync_task_embeddings, sync_project_embeddings

router = APIRouter(prefix="/v1/search", tags=["search"])

DEFAULT_USER_ID = 1

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/semantic")
def semantic_search(
    q: str = Query(..., min_length=1),
    limit: int = 10,
    db: Session = Depends(get_db)
):
    # Ensure current data is synced (for demo simplicity, normally backgrounded)
    sync_task_embeddings(db, DEFAULT_USER_ID)
    sync_project_embeddings(db, DEFAULT_USER_ID)
    
    query_vector = compute_embedding(q)
    
    # Search Tasks
    # pgvector cosine distance: <=>
    task_results = db.query(models.Task).filter(
        models.Task.user_id == DEFAULT_USER_ID
    ).order_by(
        models.Task.embedding.cosine_distance(query_vector)
    ).limit(limit).all()
    
    # Search Projects
    project_results = db.query(models.Project).filter(
        models.Project.user_id == DEFAULT_USER_ID
    ).order_by(
        models.Project.embedding.cosine_distance(query_vector)
    ).limit(limit).all()
    
    return {
        "tasks": [{"id": t.id, "title": t.title, "score": 0} for t in task_results],
        "projects": [{"id": p.id, "name": p.name, "score": 0} for p in project_results]
    }

@router.post("/sync")
def trigger_sync(db: Session = Depends(get_db)):
    sync_task_embeddings(db, DEFAULT_USER_ID)
    sync_project_embeddings(db, DEFAULT_USER_ID)
    return {"status": "synced"}
