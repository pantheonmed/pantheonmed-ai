"""Lab report analysis service."""
import re
import uuid
from typing import Optional

from app.services.ai_service import get_ai_response


async def analyze_lab_text(
    raw_text: str,
    lab_name: Optional[str] = None,
    patient_context: Optional[str] = None,
) -> dict:
    """Analyze lab report text and return structured result."""
    report_id = str(uuid.uuid4())

    context = ""
    if lab_name:
        context += f"Lab: {lab_name}. "
    if patient_context:
        context += f"Patient context: {patient_context}. "

    prompt = (
        f"Analyze this lab report:\n\n{raw_text}\n\n"
        f"{context}"
        "Provide: 1) Brief analysis (2-3 sentences). "
        "2) List abnormal values. 3) List urgent flags. 4) One-line summary."
    )

    analysis = await get_ai_response(prompt)

    # Extract abnormal/urgent flags from common patterns
    abnormal_flags = _extract_flags(raw_text, r"(?:high|low|elevated|decreased|abnormal)\s*[:\s]?\s*([\w\s,]+)", re.IGNORECASE)
    urgent_flags = _extract_flags(raw_text, r"(?:critical|urgent|severe|danger)\w*", re.IGNORECASE)

    if not abnormal_flags:
        abnormal_flags = ["See analysis for details"]
    if not urgent_flags:
        urgent_flags = []

    summary = analysis.split("\n")[0] if analysis else "No summary available"

    return {
        "report_id": report_id,
        "analysis": analysis,
        "abnormal_flags": abnormal_flags[:10],
        "urgent_flags": urgent_flags[:5],
        "summary": summary,
        "patterns": [],
        "parsed_tests_count": len(re.findall(r"%|mg/dL|g/L|U/L|mmol/L", raw_text)) or 1,
    }


def _extract_flags(text: str, pattern: str, flags: int = 0) -> list[str]:
    matches = re.findall(pattern, text)
    return list(set(m.strip() for m in matches if m and len(m.strip()) < 100))[:10]
