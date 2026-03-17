import uuid
from datetime import datetime, timezone
from fastapi import APIRouter
from app.schemas.chat_schema import ChatMessageRequest, ChatMessageResponse, ChatResponse

router = APIRouter(prefix="/chat", tags=["AI Chat"])

@router.post("", response_model=ChatResponse)
async def chat(body: ChatMessageRequest):
    """No database — returns mock response."""
    session_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    user_msg = ChatMessageResponse(
        id=str(uuid.uuid4()),
        session_id=session_id,
        role="user",
        content=body.content,
        has_disclaimer=False,
        created_at=now,
    )

    ai_msg = ChatMessageResponse(
        id=str(uuid.uuid4()),
        session_id=session_id,
        role="assistant",
        content="AI working ✅ — Your message was received. (Database disabled — connect DB for full AI responses.)",
        has_disclaimer=True,
        created_at=now,
    )

    return ChatResponse(session_id=session_id, message=user_msg, ai_response=ai_msg)
