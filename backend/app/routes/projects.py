from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app import models
from app.db import SessionLocal
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectOut, ProjectList

router = APIRouter(prefix="/v1/projects", tags=["projects"])

DEFAULT_USER_ID = 1

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("", response_model=ProjectList)
def list_projects(
    db: Session = Depends(get_db),
    limit: int = 100,
    offset: int = 0
):
    query = db.query(models.Project).filter(models.Project.user_id == DEFAULT_USER_ID)
    total = query.count()
    items = query.order_by(models.Project.updated_at.desc()).offset(offset).limit(limit).all()
    return {"items": items, "total": total}

@router.post("", response_model=ProjectOut, status_code=201)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db)):
    project = models.Project(user_id=DEFAULT_USER_ID, **payload.model_dump())
    db.add(project)
    db.commit()
    db.refresh(project)
    return project

@router.get("/{project_id}", response_model=ProjectOut)
def get_project(project_id: int, db: Session = Depends(get_db)):
    project = db.get(models.Project, project_id)
    if not project or project.user_id != DEFAULT_USER_ID:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.patch("/{project_id}", response_model=ProjectOut)
def update_project(project_id: int, payload: ProjectUpdate, db: Session = Depends(get_db)):
    project = db.get(models.Project, project_id)
    if not project or project.user_id != DEFAULT_USER_ID:
        raise HTTPException(status_code=404, detail="Project not found")
    
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(project, key, value)
    
    db.commit()
    db.refresh(project)
    return project

@router.delete("/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db)):
    project = db.get(models.Project, project_id)
    if not project or project.user_id != DEFAULT_USER_ID:
        raise HTTPException(status_code=404, detail="Project not found")
    
    db.delete(project)
    db.commit()
    return {"status": "deleted"}

@router.get("/{project_id}/backlinks", response_model=List[ProjectOut])
def get_backlinks(project_id: int, db: Session = Depends(get_db)):
    target_project = db.get(models.Project, project_id)
    if not target_project or target_project.user_id != DEFAULT_USER_ID:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Simple WikiLink search: [[Target Name]]
    link_pattern = f"[[{target_project.name}]]"
    backlinks = db.query(models.Project).filter(
        models.Project.user_id == DEFAULT_USER_ID,
        models.Project.content.ilike(f"%{link_pattern}%"),
        models.Project.id != project_id
    ).all()
    
    return backlinks

@router.get("/graph/data")
def get_graph_data(db: Session = Depends(get_db)):
    projects = db.query(models.Project).filter(models.Project.user_id == DEFAULT_USER_ID).all()
    
    nodes = []
    edges = []
    project_map = {p.name: p.id for p in projects}
    
    for p in projects:
        nodes.append({"id": p.id, "name": p.name, "val": 10})
        
        # Simple extraction of WikiLinks from content
        if p.content:
            import re
            links = re.findall(r"\[\[(.*?)\]\]", p.content)
            for link_name in links:
                if link_name in project_map:
                    edges.append({"source": p.id, "target": project_map[link_name]})
                    
    return {"nodes": nodes, "links": edges}

@router.get("/{project_id}/export")
def export_project(project_id: int, db: Session = Depends(get_db)):
    project = db.get(models.Project, project_id)
    if not project or project.user_id != DEFAULT_USER_ID:
        raise HTTPException(status_code=404, detail="Project not found")
    
    filename = f"{project.name.replace(' ', '_')}.md"
    content = project.content or ""
    
    from fastapi.responses import Response
    return Response(
        content=content,
        media_type="text/markdown",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
