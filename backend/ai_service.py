"""
Butterfly Mansion - Multi-Provider AI Fallback System
Provides seamless fallback between:
1. Local Ollama (Optional, when USE_LOCAL_OLLAMA is true)
2. Google Gemini (Primary Cloud LLM)
3. Groq (High-Speed Fallback: llama-3.3-70b-versatile, llama-3.1-8b-instant)
4. Graceful In-Character Fallback
"""

import os
import re
from dotenv import load_dotenv
load_dotenv()
import json
import logging
import httpx
from typing import List, Dict, Optional, Any
import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted, GoogleAPICallError

logger = logging.getLogger("ai_service")
logging.basicConfig(level=logging.INFO)

# --- Configuration ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
if GEMINI_API_KEY:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
    except Exception as e:
        logger.warning(f"Failed to configure Gemini: {e}")

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")
USE_LOCAL_OLLAMA = os.getenv("USE_LOCAL_OLLAMA", "false").lower() in ("true", "1", "yes")

ACTIVE_GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
GROQ_PRIMARY_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
GROQ_FALLBACK_MODEL = "llama-3.1-8b-instant"
GROQ_CANDIDATE_MODELS = [
    GROQ_PRIMARY_MODEL,
    GROQ_FALLBACK_MODEL,
    "qwen/qwen3.8-27b",
    "groq/compound-mini",
]
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")


async def call_ollama(system_prompt: str, user_message: str, history: List[Dict[str, str]] = None) -> Optional[str]:
    """Route prompts to a local Ollama endpoint (OpenAI-compatible) when enabled."""
    base = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1").rstrip("/")
    url = f"{base}/chat/completions"
    messages = [{"role": "system", "content": system_prompt}]
    if history:
        for msg in history:
            role = "user" if msg.get("role") in ("user", "human") else "assistant"
            messages.append({"role": role, "content": msg.get("content", "")})
    messages.append({"role": "user", "content": user_message})

    payload = {
        "model": OLLAMA_MODEL,
        "messages": messages,
        "temperature": 0.7,
        "stream": False,
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(url, json=payload)
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]


async def call_gemini(system_prompt: str, user_message: str, history: List[Dict[str, str]] = None) -> Optional[str]:
    """Call Google Gemini with system instructions and chat history."""
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not configured.")

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(ACTIVE_GEMINI_MODEL, system_instruction=system_prompt)
    gemini_history = []
    if history:
        for msg in history:
            role = "user" if msg.get("role") in ("user", "human") else "model"
            content = msg.get("content") or ""
            gemini_history.append({"role": role, "parts": [content]})

    chat = model.start_chat(history=gemini_history)
    response = chat.send_message(user_message)
    return response.text


async def call_groq(
    system_prompt: str,
    user_message: str,
    history: List[Dict[str, str]] = None,
    model_name: str = GROQ_PRIMARY_MODEL,
) -> Optional[str]:
    """Call Groq API using the official Groq SDK or OpenAI-compatible endpoint."""
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key or api_key.strip() in ("", "your_groq_api_key_here"):
        raise ValueError("GROQ_API_KEY is missing or unconfigured.")

    messages = [{"role": "system", "content": system_prompt}]
    if history:
        for msg in history:
            role = "user" if msg.get("role") in ("user", "human") else "assistant"
            messages.append({"role": role, "content": msg.get("content", "")})
    messages.append({"role": "user", "content": user_message})

    # 1. Try with groq SDK if installed
    try:
        from groq import AsyncGroq

        client = AsyncGroq(api_key=api_key.strip())
        completion = await client.chat.completions.create(
            model=model_name,
            messages=messages,
            temperature=0.7,
            max_tokens=1024,
        )
        return completion.choices[0].message.content
    except ImportError:
        # 2. Fallback to direct HTTP call via httpx
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key.strip()}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": model_name,
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 1024,
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]


async def generate_ai_chat_response(
    system_prompt: str,
    user_message: str,
    history: List[Dict[str, str]] = None,
    character_name: str = "Shinobu Kocho",
) -> str:
    """
    Unified multi-provider fallback orchestrator.
    Tries Local Ollama (if enabled) -> Gemini -> Groq -> In-character fallback.
    """
    # 1. Local Ollama (Optional)
    if os.getenv("USE_LOCAL_OLLAMA", "false").lower() in ("true", "1", "yes"):
        try:
            logger.info("Routing prompt to local Ollama endpoint...")
            reply = await call_ollama(system_prompt, user_message, history)
            if reply and reply.strip():
                return reply.strip()
        except Exception as e:
            logger.warning(f"Local Ollama failed ({e}). Proceeding to Gemini...")

    # 2. Google Gemini (Primary Cloud LLM)
    try:
        reply = await call_gemini(system_prompt, user_message, history)
        if reply and reply.strip():
            return reply.strip()
    except (ResourceExhausted, GoogleAPICallError) as e:
        logger.warning(f"Gemini quota/rate limit reached ({e}). Triggering Groq fallback...")
    except Exception as e:
        logger.warning(f"Gemini API error ({e}). Triggering Groq fallback...")

    # 3. Groq Fallback (Iterating through candidate models)
    for model_name in GROQ_CANDIDATE_MODELS:
        try:
            logger.info(f"Invoking Groq fallback with {model_name}...")
            reply = await call_groq(system_prompt, user_message, history, model_name=model_name)
            if reply and reply.strip():
                cleaned = re.sub(r'<think>.*?</think>', '', reply, flags=re.DOTALL).strip()
                if cleaned:
                    return cleaned
                return reply.strip()
        except Exception as groq_err:
            logger.warning(f"Groq {model_name} failed ({groq_err}). Checking next available model...")

    # 4. Graceful in-character fallback response
    return (
        f"The Butterfly Estate archives are momentarily clouded by spiritual mist! 🌸 "
        f"Please rest your breathing for a moment and speak with me again shortly."
    )
