"""Chat request/response schemas."""
from pydantic import BaseModel
from typing import Optional


class ChatMessageSchema(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    has_disclaimer: bool
    created_at: str

    class Config:
        from_attributes = True


class ChatRequest(BaseModel):
    content: str
    session_id: Optional[str] = None
    guest_session_id: Optional[str] = None


class ChatResponse(BaseModel):
    session_id: str
    message: ChatMessageSchema
    ai_response: ChatMessageSchema


class ChatHistoryResponse(BaseModel):
    session_id: Optional[str]
    messages: list[ChatMessageSchema]
    items: list[dict]
    total: int


class GuestMergeRequest(BaseModel):
    messages: list[dict]
    guest_session_id: Optional[str] = None
