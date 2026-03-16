from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db, AsyncSessionLocal
from app.models.user import User
from app.models.chat import ChatSession, ChatMessage
from app.schemas.chat_schema import ChatMessageRequest, ChatMessageResponse, ChatResponse
from app.services.auth_service import get_current_user
from app.services.ai_service import ai_complete

router = APIRouter(prefix="/chat", tags=["AI Chat"])

@router.post("", response_model=ChatResponse)
async def chat(body: ChatMessageRequest, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if body.session_id:
        result = await db.execute(select(ChatSession).where(ChatSession.id == body.session_id, ChatSession.user_id == current_user.id))
        session = result.scalar_one_or_none()
        if not session:
            raise HTTPException(404, "Session not found")
    else:
        title = body.content[:50] + "..." if len(body.content) > 50 else body.content
        session = ChatSession(user_id=current_user.id, title=title)
        db.add(session)
        await db.flush()

    user_message = ChatMessage(session_id=session.id, role="user", content=body.content)
    db.add(user_message)
    await db.flush()

    history_result = await db.execute(select(ChatMessage).where(ChatMessage.session_id == session.id).order_by(ChatMessage.created_at).limit(20))
    messages = [{"role": m.role, "content": m.content} for m in history_result.scalars().all()]

    ai_text = await ai_complete(messages)

    ai_message = ChatMessage(session_id=session.id, role="assistant", content=ai_text, has_disclaimer=True)
    db.add(ai_message)
    await db.commit()
    await db.refresh(user_message)
    await db.refresh(ai_message)

    return ChatResponse(session_id=session.id, message=ChatMessageResponse.model_validate(user_message), ai_response=ChatMessageResponse.model_validate(ai_message))
