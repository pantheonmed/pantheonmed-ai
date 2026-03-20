import uuid
from fastapi import APIRouter
from pydantic import BaseModel

from app.services.ai_service import get_ai_response

router = APIRouter(prefix="/chat", tags=["AI Chat"])


class ChatRequest(BaseModel):
    content: str


@router.post("")
async def chat(body: ChatRequest):
    session_id = str(uuid.uuid4())
    content = await get_ai_response(body.content)
    return {
        "session_id": session_id,
        "ai_response": {
            "id": str(uuid.uuid4()),
            "session_id": session_id,
            "role": "assistant",
            "content": content,
            "has_disclaimer": True,
            "created_at": "",
        }
    }
