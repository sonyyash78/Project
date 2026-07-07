import os
import json
import asyncio
from google import genai
from google.genai import types
import logging
import re
import traceback

from app.ai_question_generator.key_manager import key_manager

MODELS = [
    "gemini-2.5-flash", 
    "gemini-2.0-flash", 
    "gemini-1.5-flash", 
    "gemini-2.5-flash-lite"
]
logger = logging.getLogger("examside")

async def generate_content_with_retry(prompt: str, max_retries: int = 5) -> list:
    logger.info("Entering generate_content_with_retry function (Multi-Key with Model Fallback)")
    
    last_error = None
    for attempt in range(max_retries):
        current_model = MODELS[attempt % len(MODELS)]
        try:
            # 1. Get the next healthy key from Key Manager
            key_state = key_manager.get_next_key()
            logger.info(f"Using Gemini Key {key_state.index} ({key_state.masked_key}) with model {current_model} - Attempt {attempt + 1}/{max_retries}")
            
            client = genai.Client(api_key=key_state.key)
            
            # 2. Call API (using to_thread for safety with sync client)
            # Some versions of genai SDK might not support aio properly, so to_thread is robust
            response = await asyncio.to_thread(
                client.models.generate_content,
                model=current_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                )
            )
            
            text_resp = response.text.strip()
            
            # Extract JSON if markdown wrapped
            json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', text_resp)
            if json_match:
                text_resp = json_match.group(1).strip()
            elif text_resp.startswith("```json"):
                text_resp = text_resp[7:]
            if text_resp.endswith("```"):
                text_resp = text_resp[:-3]
            
            try:
                # Aggressively remove unescaped control characters (keep newlines and tabs)
                text_resp = re.sub(r'[\x00-\x08\x0b-\x0c\x0e-\x1F]', '', text_resp)
                # Allow unescaped control characters (like literal newlines in solution strings)
                data = json.loads(text_resp, strict=False)
            except json.JSONDecodeError as e:
                logger.error(f"JSON parsing exception using Key {key_state.index}:\n{traceback.format_exc()}")
                raise ValueError(f"Gemini returned invalid JSON. Could not parse: {e}")
            
            if not isinstance(data, list):
                if isinstance(data, dict) and "questions" in data:
                    data = data["questions"]
                else:
                    data = [data]
            
            if not data:
                raise ValueError("Gemini returned an empty array [].")
                
            return data
            
        except Exception as e:
            last_error = e
            error_str = str(e).lower()
            logger.error(f"Exception on attempt {attempt + 1} with Key {key_state.index}: {str(e)}")
            
            # Check for Rate Limit or Quota Error
            if "429" in error_str or "503" in error_str or "quota" in error_str or "rate limit" in error_str:
                logger.warning(f"Key {key_state.index} hit Rate Limit/Quota. Triggering failover.")
                key_manager.report_failure(key_state, str(e))
                # Instantly retry with a NEW key (continue loop without sleep, except a tiny backoff)
                await asyncio.sleep(0.5)
            else:
                logger.warning(f"General error on Key {key_state.index}. Sleeping before retry.")
                await asyncio.sleep(2 ** attempt)
            
    logger.error("Failed to generate content after max retries across all keys.")
    raise RuntimeError(f"Failed to generate content after {max_retries} attempts. Last error: {last_error}")
