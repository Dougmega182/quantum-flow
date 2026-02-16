from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db import SessionLocal
from app import models
from app.schemas.ai import AISuggestion, AISummaryRequest, AISummaryResponse, SmartScheduleItem, SmartScheduleResponse
from app.services.embeddings import compute_embedding, sync_task_embeddings, sync_project_embeddings

router = APIRouter(prefix="/v1/ai", tags=["ai"])
DEFAULT_USER_ID = 1

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/suggest", response_model=list[AISuggestion])
def suggest(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    suggestions = []
    overdue = db.query(models.Task).filter(
        models.Task.user_id == DEFAULT_USER_ID,
        models.Task.deleted_at.is_(None),
        models.Task.status != "done",
        models.Task.due_at.isnot(None),
        models.Task.due_at < now,
    ).limit(5).all()
    for t in overdue:
        suggestions.append(AISuggestion(
            title=f"Complete overdue: {t.title}",
            description=t.description,
            action_type="complete_task",
            payload={"task_id": t.id},
            confidence=0.8,
        ))
    tpl = db.query(models.TaskTemplate).filter_by(title="Daily review", user_id=DEFAULT_USER_ID).first()
    if tpl:
        suggestions.append(AISuggestion(
            title="Create Daily review for today",
            description="Use template Daily review",
            action_type="create_task_from_template",
            payload={"template_id": tpl.id, "due_at": now.isoformat()},
            confidence=0.7,
        ))

    # RAG: Semantic Context Suggestions
    # Sync first to ensure we have data
    sync_project_embeddings(db, DEFAULT_USER_ID)
    
    # Simple grounding: Find the most recently updated project and suggest relevant next steps
    latest_project = db.query(models.Project).filter(
        models.Project.user_id == DEFAULT_USER_ID,
        models.Project.content.isnot(None)
    ).order_by(models.Project.updated_at.desc()).first()
    
    if latest_project:
        # Conceptual: Find tasks semantically similar to this project
        query_vector = compute_embedding(latest_project.name)
        related_tasks = db.query(models.Task).filter(
            models.Task.user_id == DEFAULT_USER_ID,
            models.Task.status == "open"
        ).order_by(
            models.Task.embedding.cosine_distance(query_vector)
        ).limit(2).all()
        
        for rt in related_tasks:
            suggestions.append(AISuggestion(
                title=f"Context: {latest_project.name}",
                description=f"This task seems relevant to your active project: {rt.title}",
                action_type="focus_task",
                payload={"task_id": rt.id},
                confidence=0.6,
            ))

    return suggestions

@router.post("/summarize", response_model=AISummaryResponse)
def summarize(req: AISummaryRequest):
    text = req.text.strip()
    summary = text[:197] + "..." if len(text) > 200 else text
    return AISummaryResponse(summary=summary)

@router.post("/smart-schedule", response_model=SmartScheduleResponse)
def smart_schedule(db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    # Assume 9 AM to 6 PM (18:00) today
    start_of_day = datetime(now.year, now.month, now.day, 9, 0, tzinfo=timezone.utc)
    end_of_day = datetime(now.year, now.month, now.day, 18, 0, tzinfo=timezone.utc)
    
    if now >= end_of_day:
        start_of_day += timedelta(days=1)
        end_of_day += timedelta(days=1)
        current_time = start_of_day
    elif now > start_of_day:
        current_time = now.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
    else:
        current_time = start_of_day

    # Fetch open tasks
    tasks = db.query(models.Task).filter(
        models.Task.user_id == DEFAULT_USER_ID,
        models.Task.deleted_at.is_(None),
        models.Task.status != "done",
    ).all()

    # Dynamic Peak Performance Detection (New ML Optimizer Logic)
    # Fetch focus heatmap from the last 30 days
    last_month = datetime.utcnow() - timedelta(days=30)
    hourly_stats = db.query(func.extract('hour', models.Task.completed_at), func.count(models.Task.id))\
        .filter(models.Task.status == "done", models.Task.completed_at >= last_month)\
        .group_by(func.extract('hour', models.Task.completed_at)).all()
    
    heatmap = {int(h): c for h, c in hourly_stats}
    # Heuristic: A peak is any hour with > 80% of the max completion count
    max_completions = max(heatmap.values()) if heatmap else 0
    peak_hours = {h for h, c in heatmap.items() if c >= max_completions * 0.8 and c > 0}
    
    if not peak_hours:
        # Fallback to standard 9-1 if no data
        peak_hours = {9, 10, 11, 12}

    # Sort tasks: Dependencies first, then priority, then energy match
    priority_map = {"high": 3, "medium": 2, "low": 1}
    
    # Topological-ish sort or just simple dependency first
    def get_sort_score(t):
        # Base priority score
        score = priority_map.get(t.priority or "low", 1) * 10
        # If it has a dependency, it should ideally come after, 
        # but if we are the dependency, we come first.
        # For simplicity in this solver: we prioritize items that others depend on.
        is_depended_on = db.query(models.Task).filter(models.Task.depends_on_id == t.id).first() is not None
        if is_depended_on: score += 100
        return score

    tasks.sort(key=get_sort_score, reverse=True)

    scheduled_items = []
    
    for t in tasks:
        if current_time >= end_of_day:
            break
            
        task_energy = (t.energy_level or "medium").lower()
        duration = t.duration_minutes or 30
        
        # ML Optimization: If high energy task, try to find the next AVAILABLE peak hour
        is_high_energy = task_energy == "high"
        if is_high_energy and current_time.hour not in peak_hours:
            # Look ahead for a peak slot
            lookahead = current_time
            found_peak = False
            while lookahead < end_of_day:
                if lookahead.hour in peak_hours:
                    current_time = lookahead
                    found_peak = True
                    break
                lookahead += timedelta(minutes=30)
            # If no peak found today, just proceed from current
        
        end_time = current_time + timedelta(minutes=duration)
        
        if end_time > end_of_day:
            continue
            
        # Check dependency: Has it been scheduled in this run?
        # (Real implementation would check global schedule, here we just do this batch)
        if t.depends_on_id:
            dep_found = next((item for item in scheduled_items if item.task_id == t.depends_on_id), None)
            if not dep_found:
                # If dependency not in this batch, assume it needs scheduling first 
                # (or skip for now to simplify)
                pass

        end_time = current_time + timedelta(minutes=duration)
        
        if end_time > end_of_day:
            continue
            
        is_peak = current_time.hour in peak_hours
        rationale = "Matches your productivity peak" if is_peak and is_high_energy else None
        
        scheduled_items.append(SmartScheduleItem(
            task_id=t.id,
            title=t.title,
            start_time=current_time.isoformat(),
            end_time=end_time.isoformat(),
            duration_minutes=duration,
            rationale=rationale
        ))
        
        current_time = end_time + timedelta(minutes=5)

    return SmartScheduleResponse(
        items=scheduled_items,
        message=f"Smart Schedule: Placed {len(scheduled_items)} tasks based on energy and priority."
    )
