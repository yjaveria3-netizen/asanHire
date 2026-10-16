import time
import json
import re
import asyncio
import logging
from typing import Type, TypeVar, Optional, Any, Set
from pydantic import BaseModel
from app.core.config import settings
from app.core.errors import LLMError
from app.core.db import get_supabase_service_client

logger = logging.getLogger("asanhire.llm")

T = TypeVar("T", bound=BaseModel)

def strip_code_fences(raw_text: str) -> str:
    """Strips markdown code fences (```json ... ```) from LLM output."""
    s = raw_text.strip()
    if s.startswith("```json"):
        s = s[7:]
    elif s.startswith("```"):
        s = s[3:]
    if s.endswith("```"):
        s = s[:-3]
    return s.strip()

def strip_reasoning_tags(content: str) -> str:
    """Safeguard to ensure reasoning traces enclosed in <think>...</think> are discarded."""
    if not content:
        return ""
    cleaned = re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL)
    return cleaned.strip()

def clamp_scores(value: Any, min_val: float = 0.0, max_val: float = 100.0) -> Any:
    """
    Clamps numeric scores within specified ranges (e.g. 0-100 or 0-10).
    Can be used after validation on numbers, dicts, or field values.
    """
    if isinstance(value, (int, float)):
        return max(float(min_val), min(float(max_val), float(value)))
    elif isinstance(value, dict):
        return {
            k: clamp_scores(v, min_val, max_val) if isinstance(v, (int, float)) else v
            for k, v in value.items()
        }
    return value

async def _invoke_groq(
    system_prompt: str,
    user_prompt: str,
    max_tokens: int,
    temperature: float
) -> str:
    """
    Calls Groq API.
    - Requests JSON output mode.
    - Sets generous max_tokens so reasoning in reasoning models does not cut off JSON.
    - Uses low reasoning effort if the API/model supports it.
    - Reads only the final message content, never reasoning text.
    - If model is not found, logs a clear error naming GROQ_MODEL.
    """
    from groq import AsyncGroq, NotFoundError
    client = AsyncGroq(api_key=settings.GROQ_API_KEY)
    
    # Generous token allotment to ensure reasoning does not truncate JSON
    generous_tokens = max(max_tokens, 4096)
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]

    try:
        # First attempt: request with reasoning_effort='low'
        try:
            response = await asyncio.wait_for(
                client.chat.completions.create(
                    model=settings.GROQ_MODEL,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=generous_tokens,
                    response_format={"type": "json_object"},
                    reasoning_effort="low"
                ),
                timeout=20.0
            )
        except TypeError:
            # SDK or call parameter fallback if reasoning_effort not accepted
            response = await asyncio.wait_for(
                client.chat.completions.create(
                    model=settings.GROQ_MODEL,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=generous_tokens,
                    response_format={"type": "json_object"}
                ),
                timeout=20.0
            )
        except Exception as e:
            if "reasoning_effort" in str(e).lower() or "unsupported" in str(e).lower():
                # Model does not support reasoning_effort; retry without it
                response = await asyncio.wait_for(
                    client.chat.completions.create(
                        model=settings.GROQ_MODEL,
                        messages=messages,
                        temperature=temperature,
                        max_tokens=generous_tokens,
                        response_format={"type": "json_object"}
                    ),
                    timeout=20.0
                )
            else:
                raise

        # Extract only message content (never reasoning text)
        msg = response.choices[0].message
        content = msg.content or "{}"
        return strip_reasoning_tags(content)

    except NotFoundError as e:
        logger.error(
            f"Groq model '{settings.GROQ_MODEL}' was not found. "
            "Please update the GROQ_MODEL environment variable in your .env file. "
            "Run scripts/list_models.py to see available models."
        )
        raise
    except Exception as e:
        if "model_not_found" in str(e).lower() or "does not exist" in str(e).lower() or "404" in str(e):
            logger.error(
                f"Groq model '{settings.GROQ_MODEL}' was not found. "
                "Please update the GROQ_MODEL environment variable in your .env file. "
                "Run scripts/list_models.py to see available models."
            )
        raise

async def _invoke_gemini(
    system_prompt: str,
    user_prompt: str,
    max_tokens: int,
    temperature: float
) -> str:
    """
    Calls Google Gemini using the official google-genai SDK.
    - Uses client.aio.models.generate_content.
    - Configures JSON output via response_mime_type='application/json'.
    - If model is not found, logs a clear error naming GEMINI_MODEL.
    """
    from google import genai
    from google.genai import types
    from google.genai.errors import APIError

    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    config = types.GenerateContentConfig(
        system_instruction=system_prompt,
        temperature=temperature,
        max_output_tokens=max_tokens,
        response_mime_type="application/json"
    )

    for attempt in range(2):
        try:
            response = await asyncio.wait_for(
                client.aio.models.generate_content(
                    model=settings.GEMINI_MODEL,
                    contents=user_prompt,
                    config=config
                ),
                timeout=20.0
            )
            return response.text or "{}"

        except APIError as e:
            if getattr(e, "code", None) == 404 or ("not found" in str(e).lower() and "503" not in str(e)):
                logger.error(
                    f"Gemini model '{settings.GEMINI_MODEL}' was not found. "
                    "Please update the GEMINI_MODEL environment variable in your .env file. "
                    "Run scripts/list_models.py to see available models."
                )
                raise
            is_busy = getattr(e, "code", None) == 503 or "503" in str(e) or "unavailable" in str(e).lower()
            if is_busy and attempt == 0:
                await asyncio.sleep(1.0)
                continue
            raise
        except Exception as e:
            if ("not found" in str(e).lower() or "404" in str(e)) and "503" not in str(e):
                logger.error(
                    f"Gemini model '{settings.GEMINI_MODEL}' was not found. "
                    "Please update the GEMINI_MODEL environment variable in your .env file. "
                    "Run scripts/list_models.py to see available models."
                )
                raise
            is_busy = "503" in str(e) or "unavailable" in str(e).lower() or "servererror" in type(e).__name__.lower()
            if is_busy and attempt == 0:
                await asyncio.sleep(1.0)
                continue
            raise

async def _execute_provider_call(
    provider: str,
    system_prompt: str,
    user_prompt: str,
    schema_model: Type[T],
    max_tokens: int,
    temperature: float
) -> T:
    """Executes a single provider call, parses JSON, and validates schema strictly."""
    start_time = time.time()
    try:
        if provider == "groq":
            raw_text = await _invoke_groq(system_prompt, user_prompt, max_tokens, temperature)
        elif provider == "gemini":
            raw_text = await _invoke_gemini(system_prompt, user_prompt, max_tokens, temperature)
        else:
            raise ValueError(f"Unsupported LLM provider: {provider}")

        # Strip fences and parse JSON
        cleaned_json = strip_code_fences(raw_text)
        data = json.loads(cleaned_json)
        if not isinstance(data, dict):
            raise ValueError("Expected JSON object from LLM response")

        # Reject extra fields
        expected_fields: Set[str] = set(schema_model.model_fields.keys())
        extra_fields = set(data.keys()) - expected_fields
        if extra_fields:
            raise ValueError(f"Schema validation failed: extra fields not permitted: {extra_fields}")

        # Validate with Pydantic
        validated_instance = schema_model.model_validate(data)
        latency = time.time() - start_time
        logger.info(f"LLM call to {provider}: success (latency={latency:.2f}s)")
        return validated_instance

    except Exception as e:
        latency = time.time() - start_time
        error_class = type(e).__name__
        logger.error(f"LLM call to {provider} failed: {error_class} (latency={latency:.2f}s)")
        raise

async def call_json(
    provider: str,
    system_prompt: str,
    user_prompt: str,
    schema_model: Type[T],
    max_tokens: int = 1500,
    temperature: float = 0.2
) -> T:
    """
    Unified robust LLM interface.
    - System and user prompts are strictly isolated.
    - Requests JSON output.
    - Strips code fences, parses JSON, and enforces Pydantic validation (rejects extra/missing fields).
    - On parse, validation, or API error: retries once, then falls back to other provider.
    - 20s timeout and backoff on 429.
    - Logs provider, status, latency, error class only (never keys, prompts, or candidate text).
    - Raises LLMError if all attempts fail.
    """
    primary = provider.lower()
    fallback = "gemini" if primary == "groq" else "groq"

    # Attempt Primary (with 1 retry)
    for attempt in range(2):
        try:
            return await _execute_provider_call(
                primary, system_prompt, user_prompt, schema_model, max_tokens, temperature
            )
        except Exception as e:
            is_rate_limit = "429" in str(e) or "503" in str(e) or "rate" in type(e).__name__.lower() or "unavailable" in str(e).lower()
            if is_rate_limit:
                await asyncio.sleep(1.0)
            if attempt == 0:
                # Retry primary once
                await asyncio.sleep(0.5)
                continue
            logger.warning(f"Primary provider '{primary}' exhausted retries. Falling back to '{fallback}'.")

    # Attempt Fallback
    try:
        return await _execute_provider_call(
            fallback, system_prompt, user_prompt, schema_model, max_tokens, temperature
        )
    except Exception as e:
        logger.critical(f"Both primary ('{primary}') and fallback ('{fallback}') providers failed.")
        raise LLMError(f"LLM invocation failed across providers: {type(e).__name__}") from e

async def log_agent_run(
    agent: str,
    job_id: Optional[str] = None,
    candidate_id: Optional[str] = None,
    status: str = "success",
    provider: str = "gemini",
    latency_ms: Optional[int] = None,
) -> None:
    """
    Records an agent execution in the agent_runs table with NO sensitive text.
    Only agent name, provider, execution status, and foreign keys are persisted.
    """
    normalized_status = "success" if status in ("completed", "success") else "failed"
    try:
        client = get_supabase_service_client()
        row: dict[str, Any] = {
            "agent": agent,
            "job_id": job_id,
            "candidate_id": candidate_id,
            "status": normalized_status,
            "provider": provider,
        }
        if latency_ms is not None:
            row["latency_ms"] = latency_ms
        client.table("agent_runs").insert(row).execute()
    except Exception as e:
        logger.error(f"Failed to record agent run log: {type(e).__name__}")
