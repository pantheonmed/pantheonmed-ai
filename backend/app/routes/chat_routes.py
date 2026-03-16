"""Chat routes."""
from typing import Optional
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.models.chat import ChatSession, ChatMessage
from app.models.user import User
from app.schemas.chat_schema import ChatRequest, ChatResponse, ChatMessageSchema, ChatHistoryResponse, GuestMergeRequest
from app.services.auth_service import get_current_user
from app.services.ai_service import get_ai_response

router = APIRouter(prefix="/chat", tags=["chat"])


def _msg_to_schema(m: ChatMessage) -> ChatMessageSchema:
    return ChatMessageSchema(
        id=m.id,
        session_id=m.session_id,
        role=m.role,
        content=m.content,
        has_disclaimer=getattr(m, "has_disclaimer", True),
        created_at=m.created_at.isoformat() if m.created_at else "",
    )


@router.post("", response_model=ChatResponse)
async def chat(
    req: ChatRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_current_user),
):
    guest_id = request.headers.get("X-Guest-Session-Id") or req.guest_session_id

    # Get or create session
    session_id = req.session_id
    if session_id:
        result = await db.execute(select(ChatSession).where(ChatSession.id == session_id))
        session = result.scalar_one_or_none()
    else:
        session = ChatSession(
            user_id=user.id if user else None,
            guest_session_id=guest_id,
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)
        session_id = session.id

    # Save user message
    user_msg = ChatMessage(
        session_id=session_id,
        role="user",
        content=req.content,
        has_disclaimer=False,
    )
    db.add(user_msg)
    await db.commit()
    await db.refresh(user_msg)

    # Get AI response
    ai_content = await get_ai_response(req.content, session_id)

    # Save AI message
    ai_msg = ChatMessage(
        session_id=session_id,
        role="assistant",
        content=ai_content,
        has_disclaimer=True,
    )
    db.add(ai_msg)
    await db.commit()
    await db.refresh(ai_msg)

    return ChatResponse(
        session_id=session_id,
        message=_msg_to_schema(user_msg),
        ai_response=_msg_to_schema(ai_msg),
    )


@router.get("/history", response_model=ChatHistoryResponse)
async def get_history(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    user=None,
):
    # For now return empty if no auth - full impl would need user from get_current_user_required
    return ChatHistoryResponse(session_id=None, messages=[], items=[], total=0)


@router.post("/guest/merge")
async def merge_guest_session(req: GuestMergeRequest, db: AsyncSession = Depends(get_db)):
    # Create a new session and store merged messages
    session = ChatSession(guest_session_id=req.guest_session_id)
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return {"id": session.id}
