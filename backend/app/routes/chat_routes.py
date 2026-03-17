import uuid
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/chat", tags=["AI Chat"])

class ChatRequest(BaseModel):
    content: str

@router.post("")
async def chat(body: ChatRequest):
    session_id = str(uuid.uuid4())
    return {
        "session_id": session_id,
        "ai_response": {
            "id": str(uuid.uuid4()),
            "session_id": session_id,
            "role": "assistant",
            "content": f"Dynamic AI response: {body.content}",
            "has_disclaimer": True,
            "created_at": "",
        }
    }
