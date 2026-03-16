from app.services.ai_service import ai_complete, user_msg

async def analyze_lab_text(raw_text: str, patient_context: str = "", lab_name: str = "") -> dict:
    prompt = f"""Analyze this lab report and explain in simple terms for Indian patient.

LAB REPORT:
{raw_text}

Patient context: {patient_context or "Not provided"}
Lab: {lab_name or "Not specified"}

Please:
1. List all tests with Normal/HIGH/LOW status
2. Explain abnormal values in simple language
3. Flag any URGENT values needing immediate attention
4. Give 2-3 sentence summary
5. Recommend next steps
"""
    messages = [user_msg(prompt)]
    analysis = await ai_complete(messages)
    abnormal = [line.strip("*- ") for line in analysis.split("\n") if "HIGH" in line or "LOW" in line or "abnormal" in line.lower()]
    urgent = [line.strip("*- ") for line in analysis.split("\n") if "urgent" in line.lower() or "immediate" in line.lower() or "critical" in line.lower()]
    summary = analysis.split("\n")[0][:300] if analysis else "Analysis complete."
    return {"analysis": analysis, "abnormal_flags": abnormal[:10], "urgent_flags": urgent[:5], "summary": summary}
