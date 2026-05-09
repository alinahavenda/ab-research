from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime

VALID_VARIANTS = {'A', 'B'}

VALID_EVENT_TYPES = {
    'page_view',
    'click',
    'form_error',
    'form_submit',
    'session_drop',
    'time_on_page',
}


class EventCreate(BaseModel):
    session_id: str
    variant: str
    event_type: str
    element: Optional[str] = None
    page: str
    timestamp: datetime
    duration_ms: Optional[int] = None

    @field_validator('variant')
    @classmethod
    def validate_variant(cls, v: str) -> str:
        if v not in VALID_VARIANTS:
            raise ValueError(f'variant must be one of {sorted(VALID_VARIANTS)}')
        return v

    @field_validator('event_type')
    @classmethod
    def validate_event_type(cls, v: str) -> str:
        if v not in VALID_EVENT_TYPES:
            raise ValueError(f'event_type must be one of {sorted(VALID_EVENT_TYPES)}')
        return v

    @field_validator('duration_ms')
    @classmethod
    def validate_duration(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 0:
            raise ValueError('duration_ms must be non-negative')
        return v
