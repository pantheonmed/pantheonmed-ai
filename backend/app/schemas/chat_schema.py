from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ChatMessageRequest(BaseModel):
    content: str
    session_id: Optional[str] = None

class ChatMessageResponse(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    has_disclaimer: bool
    created_at: datetime
    model_config = {"from_attributes": True}

class ChatResponse(BaseModel):
    session_id: str
    message: ChatMessageResponse
    ai_response: ChatMessageResponse
