import sys
import os
import asyncio

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import settings

async def list_groq_models():
    print("--- Available Groq Models ---")
    try:
        from groq import AsyncGroq
        client = AsyncGroq(api_key=settings.GROQ_API_KEY)
        models = await client.models.list()
        for m in sorted(models.data, key=lambda x: x.id):
            print(f"  • {m.id}")
    except Exception as e:
        print(f"  [ERROR] Could not list Groq models: {type(e).__name__} ({str(e)})")

async def list_gemini_models():
    print("\n--- Available Gemini Models ---")
    try:
        from google import genai
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        pager = await client.aio.models.list()
        count = 0
        async for m in pager:
            # Display model name stripped of 'models/' prefix for clarity
            short_name = m.name.replace("models/", "")
            print(f"  • {short_name}  ({m.name})")
            count += 1
        if count == 0:
            print("  (No models returned)")
    except Exception as e:
        print(f"  [ERROR] Could not list Gemini models: {type(e).__name__} ({str(e)})")

async def main():
    print("====================================================")
    print("asanHire: Model Discovery Tool")
    print("Use this list to set GROQ_MODEL and GEMINI_MODEL in .env")
    print("====================================================")
    await list_groq_models()
    await list_gemini_models()
    print("====================================================")

if __name__ == "__main__":
    asyncio.run(main())