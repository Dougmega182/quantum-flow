import os

try:
    from sentence_transformers import SentenceTransformer
    _HAS_ML = True
except ImportError:
    _HAS_ML = False

from sqlalchemy.orm import Session
from app import models

# Use a reasonably small and efficient model for CPU inference
MODEL_NAME = "all-MiniLM-L6-v2"
model = None

def get_model():
    global model
    if not _HAS_ML:
        return None
    if model is None:
        model = SentenceTransformer(MODEL_NAME)
    return model

def compute_embedding(text: str):
    if not text or not _HAS_ML:
        return [0.0] * 384
    return get_model().encode(text).tolist()

def sync_task_embeddings(db: Session, user_id: int = 1):
    tasks_to_sync = db.query(models.Task).filter(
        models.Task.user_id == user_id,
        models.Task.embedding == None
    ).all()
    
    for task in tasks_to_sync:
        text = f"{task.title} {task.description or ''}"
        task.embedding = compute_embedding(text)
    
    db.commit()

def sync_project_embeddings(db: Session, user_id: int = 1):
    projects_to_sync = db.query(models.Project).filter(
        models.Project.user_id == user_id,
        models.Project.embedding == None
    ).all()
    
    for project in projects_to_sync:
        text = f"{project.name} {project.content or ''}"
        project.embedding = compute_embedding(text)
    
    db.commit()
