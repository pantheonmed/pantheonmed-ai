from app.config import settings

DISCLAIMER = "\n\n---\n⚠️ Medical Disclaimer: AI guidance only — not a substitute for professional medical advice. Emergency: call 112.\n---"

SYSTEM_PROMPT = """You are PantheonMed AI — India healthcare assistant.
Rules: 1) Informational only, never diagnose 2) Emergency symptoms → say Call 112 NOW 3) Use simple Hindi/English 4) Always recommend consulting a doctor"""

async def ai_complete(messages: list[dict], extra_context: str = "") -> str:
    provider = settings.AI_PROVIDER.lower()
    try:
        if provider == "gemini" and settings.GEMINI_API_KEY:
            return await _gemini_complete(messages) + DISCLAIMER
        elif provider == "openai" and settings.OPENAI_API_KEY:
            return await _plete(messages) + DISCLAIMER
        elif provider == "claude" and settings.ANTHROPIC_API_KEY:
            return await _claude_complete(messages) + DISCLAIMER
        else:
            return await _gemini_complete(messages) + DISCLAIMER
    except Exception as e:
        return f"AI service temporarily unavailable. Error: {str(e)[:100]}{DISCLAIMER}"

async def _gemini_complete(messages: list[dict]) -> str:
    import google.generativeai as genai
    import asyncio
    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel(settings.GEMINI_MODEL, system_instruction=SYSTEM_PROMPT)
    history = [{"role": "user" if m["role"] == "user" else "model", "parts": [m["content"]]} for m in messages[:-1]]
    chat = model.start_chat(history=history)
    response = await asyncio.get_event_loop().run_in_executor(None, lambda: chat.send_message(messages[-1]["content"]))
    return response.text

async def _openai_complete(messages: list[dict]) -> str:
    from openai import AsyncOpenAI
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    response = await client.chat.completions.create(
        model=settings.OPENAI_MODEL, max_tokens=settings.AI_MAX_TOKENS,
        messages=[{"role": "system", "content": SYSTEM_PROMPT}] + messages)
    return response.choices[0].message.content

async def _claude_complete(messages: list[dict]) -> str:
    import anthropic
    client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    response = await client.messages.create(
        model=settings.CLAUDE_MODEL, max_tokens=settings.AI_MAX_TOKENS,
        system=SYSTEM_PROMPT, messages=messages)
    return response.content[0].text

def user_msg(content: str) -> dict:
    return {"role": "user", "content": content}
