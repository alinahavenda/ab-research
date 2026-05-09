import logging
from fastapi import APIRouter, HTTPException, status
from models import EventCreate
from database import supabase

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/api/events", status_code=status.HTTP_201_CREATED)
async def create_event(event: EventCreate):
    try:
        data = event.model_dump()
        data["timestamp"] = data["timestamp"].isoformat()
        supabase.table("events").insert(data).execute()
        logger.info(
            "event saved | variant=%s page=%-16s type=%s",
            event.variant, event.page, event.event_type,
        )
        return {"status": "ok"}
    except Exception as e:
        logger.error("failed to insert event: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
