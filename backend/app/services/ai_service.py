"""Multi-provider AI service (Gemini, OpenAI, Claude)."""
from typing import Optional
import httpx

from app.config import get_settings

settings = get_settings()

# Medical disclaimer appended to AI responses
DISCLAIMER = (
    "This information is for educational purposes only and does not constitute "
    "medical advice. Always consult a qualified healthcare provider for diagnosis and treatment."
)


async def get_ai_response(user_message: str, session_id: Optional[str] = None) -> str:
    """Generate AI response using configured provider."""
    provider = settings.AI_PROVIDER.lower()

    if provider == "gemini" and settings.GEMINI_API_KEY:
        return await _gemini_generate(user_message)
    if provider == "openai" and settings.OPENAI_API_KEY:
        return await _openai_generate(user_message)
    if provider == "anthropic" and settings.ANTHROPIC_API_KEY:
        return await _anthropic_generate(user_message)

    # Fallback: try any available provider
    if settings.GEMINI_API_KEY:
        return await _gemini_generate(user_message)
    if settings.OPENAI_API_KEY:
        return await _openai_generate(user_message)
    if settings.ANTHROPIC_API_KEY:
        return await _anthropic_generate(user_message)

    return (
        "AI service is not configured. Please set GEMINI_API_KEY, OPENAI_API_KEY, "
        "or ANTHROPIC_API_KEY in your environment."
    )


async def _gemini_generate(prompt: str) -> str:
    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(
            f"You are a helpful medical assistant. Provide clear, concise responses. "
            f"Always include appropriate medical disclaimers.\n\nUser: {prompt}"
        )
        text = response.text or ""
        return f"{text}\n\n{DISCLAIMER}" if text else DISCLAIMER
    except Exception as e:
        return f"AI error: {str(e)}"


async def _openai_generate(prompt: str) -> str:
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a helpful medical assistant. Provide clear, concise responses. Include appropriate medical disclaimers."},
                {"role": "user", "content": prompt},
            ],
        )
        text = response.choices[0].message.content or ""
        return f"{text}\n\n{DISCLAIMER}" if text else DISCLAIMER
    except Exception as e:
        return f"AI error: {str(e)}"


async def _anthropic_generate(prompt: str) -> str:
    try:
        from anthropic import AsyncAnthropic
        client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        response = await client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        text = response.content[0].text if response.content else ""
        return f"{text}\n\n{DISCLAIMER}" if text else DISCLAIMER
    except Exception as e:
        return f"AI error: {str(e)}"
