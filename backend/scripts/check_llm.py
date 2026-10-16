import sys
import os
import time
import asyncio
from pydantic import BaseModel

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import settings
from app.core.llm import _invoke_groq, _invoke_gemini, strip_code_fences
import json

class HealthCheckSchema(BaseModel):
    status: str

def is_not_found_error(exc: Exception) -> bool:
    msg = str(exc).lower()
    exc_type = type(exc).__name__.lower()
    if "503" in msg or "unavailable" in msg:
        return False
    return "notfound" in exc_type or "not found" in msg or "does not exist" in msg or "no longer available" in msg or "404" in msg

async def check_groq():
    print(f"Testing Groq provider connectivity [Model: {settings.GROQ_MODEL}]...")
    start = time.time()
    try:
        raw = await _invoke_groq(
            system_prompt="You are a system health check. Respond strictly with JSON.",
            user_prompt='Return JSON: {"status": "ok"}',
            max_tokens=200,
            temperature=0.0
        )
        cleaned = strip_code_fences(raw)
        data = json.loads(cleaned)
        HealthCheckSchema.model_validate(data)
        latency = (time.time() - start) * 1000
        print(f"[PASS] Groq ({settings.GROQ_MODEL}): Operational (latency: {latency:.1f}ms)")
        return True
    except Exception as e:
        latency = (time.time() - start) * 1000
        if is_not_found_error(e):
            print(f"[FAIL] Groq ({settings.GROQ_MODEL}): Model not found. Run scripts/list_models.py and update GROQ_MODEL or GEMINI_MODEL.")
        else:
            print(f"[FAIL] Groq ({settings.GROQ_MODEL}): {type(e).__name__} (latency: {latency:.1f}ms)")
        return False

async def check_gemini():
    print(f"Testing Gemini provider connectivity [Model: {settings.GEMINI_MODEL}]...")
    start = time.time()
    for attempt in range(2):
        try:
            raw = await _invoke_gemini(
                system_prompt="You are a system health check. Respond strictly with JSON.",
                user_prompt='Return JSON: {"status": "ok"}',
                max_tokens=200,
                temperature=0.0
            )
            cleaned = strip_code_fences(raw)
            data = json.loads(cleaned)
            HealthCheckSchema.model_validate(data)
            latency = (time.time() - start) * 1000
            print(f"[PASS] Gemini ({settings.GEMINI_MODEL}): Operational (latency: {latency:.1f}ms)")
            return True
        except Exception as e:
            if is_not_found_error(e):
                print(f"[FAIL] Gemini ({settings.GEMINI_MODEL}): Model not found. Run scripts/list_models.py and update GROQ_MODEL or GEMINI_MODEL.")
                return False
            if attempt == 0 and ("503" in str(e) or "servererror" in type(e).__name__.lower()):
                await asyncio.sleep(1.0)
                continue
            latency = (time.time() - start) * 1000
            print(f"[FAIL] Gemini ({settings.GEMINI_MODEL}): {type(e).__name__} (latency: {latency:.1f}ms)")
            return False

async def main():
    print("=== asanHire LLM Connectivity Check ===")
    groq_ok = await check_groq()
    gemini_ok = await check_gemini()
    print("========================================")
    if not (groq_ok and gemini_ok):
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
