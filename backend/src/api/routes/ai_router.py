import os
import json
import base64
import httpx
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import Optional
import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted

router = APIRouter(prefix="/api/ai", tags=["Cloud AI Integration"])

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

TUNNEL_URL = os.getenv("LOCAL_OLLAMA_TUNNEL_URL")

# Cloud Models
TEXT_MODEL = "gemini-1.5-flash"
VISION_MODEL = "gemini-1.5-flash"

# Local Models (Ollama)
LOCAL_TEXT_MODEL = "gemma:latest"
LOCAL_VISION_MODEL = "paligemma:latest"

class ChatRequest(BaseModel):
    user_message: str
    partner_name: Optional[str] = None
    gender: Optional[str] = None

class ChatResponse(BaseModel):
    message: str

@router.post("/chat", response_model=ChatResponse)
async def chat_mediator(request: ChatRequest):
    """The Celestial Mediator - Local-First with Cloud Fallback"""
    
    context = "Single Individual" if not request.partner_name else f"In a relationship with {request.partner_name}"
    
    system_prompt = f"""You are Shinobu Kocho, the Celestial Mediator of The Butterfly Mansion. 
    You are elegant, slightly teasing but deeply empathetic. 
    Current User Context: {context}. 
    Always respond strictly in character, offering gentle advice and maintaining a premium, magical tone."""

    # 1. Try Block 1 (Local)
    if TUNNEL_URL:
        try:
            local_payload = {
                "model": LOCAL_TEXT_MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": request.user_message}
                ],
                "stream": False
            }
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.post(f"{TUNNEL_URL}/api/chat", json=local_payload)
                response.raise_for_status()
                return ChatResponse(message=response.json()["message"]["content"])
        except (httpx.ConnectError, httpx.TimeoutException):
            print("Local AI failed (Connection Error or Timeout), falling back to Gemini...")
            pass
        except Exception as e:
            print(f"Local AI failed ({str(e)}), falling back to Gemini...")
            pass

    # 2. Try Block 2 (Cloud Fallback)
    if not GEMINI_API_KEY:
         return ChatResponse(message="System Error: Local AI is offline and Gemini API Key is missing. 🦋")

    try:
        model = genai.GenerativeModel(TEXT_MODEL, system_instruction=system_prompt)
        chat_session = model.start_chat(history=[])
        response = chat_session.send_message(request.user_message)
        
        return ChatResponse(message=response.text)
            
    except ResourceExhausted:
        return ChatResponse(message="The Celestial Mediator is catching its breath! 🦋 Please wait about 60 seconds and try again.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cloud AI Error: {str(e)}")


@router.post("/analyze-skin")
async def analyze_skin(file: UploadFile = File(...)):
    """Skincare Analyzer - Local-First with Cloud Fallback"""
    
    file_bytes = await file.read()
    
    system_prompt = """Analyze the provided face image. 
    Output STRICTLY a JSON array containing exactly 3 recommended skincare steps. 
    Format: [{"step": 1, "action": "...", "reason": "..."}]"""

    # 1. Try Block 1 (Local)
    if TUNNEL_URL:
        try:
            base64_image = base64.b64encode(file_bytes).decode("utf-8")
            local_payload = {
                "model": LOCAL_VISION_MODEL,
                "messages": [
                    {
                        "role": "user",
                        "content": system_prompt,
                        "images": [base64_image]
                    }
                ],
                "stream": False
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(f"{TUNNEL_URL}/api/chat", json=local_payload)
                response.raise_for_status()
                ai_content = response.json()["message"]["content"]
                
                # Clean up markdown formatting if local model returns a markdown block
                if ai_content.startswith("```json"):
                    ai_content = ai_content.replace("```json", "", 1)
                    if ai_content.endswith("```"):
                        ai_content = ai_content[:-3]
                ai_content = ai_content.strip()
                
                routine_steps = json.loads(ai_content)
                return {"routine": routine_steps}
        except (httpx.ConnectError, httpx.TimeoutException):
            print("Local Vision AI failed (Connection Error or Timeout), falling back to Gemini...")
            pass
        except json.JSONDecodeError:
            print("Local AI failed to return valid JSON, falling back to Gemini...")
            pass
        except Exception as e:
            print(f"Local Vision AI failed ({str(e)}), falling back to Gemini...")
            pass

    # 2. Try Block 2 (Cloud Fallback)
    if not GEMINI_API_KEY:
         raise HTTPException(status_code=500, detail="Local AI offline and Gemini API Key missing")
         
    try:
        import PIL.Image
        import io
        
        img = PIL.Image.open(io.BytesIO(file_bytes))
        
        model = genai.GenerativeModel(VISION_MODEL)
        
        try:
            response = model.generate_content([system_prompt, img])
            ai_content = response.text
            
            # Clean up markdown formatting if Gemini returns a markdown block
            if ai_content.startswith("```json"):
                ai_content = ai_content.replace("```json", "", 1)
                if ai_content.endswith("```"):
                    ai_content = ai_content[:-3]
            ai_content = ai_content.strip()
            
            routine_steps = json.loads(ai_content)
            
            return {"routine": routine_steps}
            
        except ResourceExhausted:
            raise HTTPException(status_code=429, detail="The Skincare AI is currently resting. Please wait about 60 seconds and try again. 🦋")
            
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="The AI failed to format the skincare routine correctly.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Vision API Error: {str(e)}")
