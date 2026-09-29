from ai_service import generate_ai_chat_response
from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Header, Request, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn
import os
import time
import shutil
import sqlite3
import base64
import httpx
from datetime import datetime, timedelta, date
from typing import Optional, List
import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted
from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Boolean, ForeignKey, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import json
import secrets
import string
import PIL.Image
import cloudinary
import cloudinary.uploader
import jwt
from jwt import PyJWKClient

# Cache JWKS client to avoid fetching on every request
jwks_clients = {}

def get_current_user_clerk_id(request: Request):
    auth_header = request.headers.get("Authorization")
    x_clerk_id = request.headers.get("x-clerk-user-id")
    
    # 1. Debug Printing for Render Logs
    print(f"DEBUG: Auth Header: {auth_header[:20] if auth_header else 'None'}...")
    print(f"DEBUG: x-clerk-user-id Header: {x_clerk_id}")

    # 2. Hackathon Fallback: If JWT is missing but x-clerk-user-id is present, trust it for the demo
    if not auth_header and x_clerk_id:
        print(f"DEBUG: Using Fallback Header: {x_clerk_id}")
        return x_clerk_id

    if not auth_header:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    
    try:
        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid Authorization header format")
            
        token = parts[1]
        
        # Immediate extraction for better debugging
        unverified_payload = jwt.decode(token, options={"verify_signature": False})
        iss = unverified_payload.get("iss")
        clerk_id_from_token = unverified_payload.get("sub")
        print(f"DEBUG: Token sub: {clerk_id_from_token}, Token iss: {iss}")

        try:
            # Full Verification Attempt
            jwks_url = f"{iss.rstrip('/')}/.well-known/jwks.json"
            if jwks_url not in jwks_clients:
                jwks_clients[jwks_url] = jwt.PyJWKClient(jwks_url)
                
            jwk_client = jwks_clients[jwks_url]
            signing_key = jwk_client.get_signing_key_from_jwt(token)
            
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                issuer=iss,
                options={"verify_aud": False}
            )
            
            return payload.get("sub")
        except Exception as jwt_err:
            print(f"CRITICAL: JWT Verify Failed: {str(jwt_err)}")
            # If verification fails but we have a fallback header, use it
            if x_clerk_id:
                print(f"DEBUG: JWT failed but Falling back to x-clerk-user-id: {x_clerk_id}")
                return x_clerk_id
            
            # Final attempt: use the unverified sub if it exists (Very loose, for demo only)
            if clerk_id_from_token:
                print(f"DEBUG: Falling back to unverified sub: {clerk_id_from_token}")
                return clerk_id_from_token
                
            raise HTTPException(status_code=401, detail=f"Authentication failed: {str(jwt_err)}")
            
    except Exception as e:
        print(f"CRITICAL: Auth Root Exception: {str(e)}")
        if x_clerk_id:
            return x_clerk_id
        raise HTTPException(status_code=401, detail="Authentication failed")

def check_permission(permission_flag: str):
    def _check(clerk_id: str = Depends(get_current_user_clerk_id)):
        session = SessionLocal()
        try:
            user = session.query(User).filter(User.clerk_id == clerk_id).first()
            if not user or not user.couple_id:
                return clerk_id 
                
            if not user.is_admin:
                couple = session.query(Couple).filter(Couple.id == user.couple_id).first()
                if couple and not getattr(couple, permission_flag, False):
                    raise HTTPException(status_code=403, detail="Forbidden: Room locked by your partner")
            return clerk_id
        finally:
            session.close()
    return _check

load_dotenv()

# --- Cloudinary Setup ---
cloudinary.config(
    cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
    api_key=os.getenv('CLOUDINARY_API_KEY'),
    api_secret=os.getenv('CLOUDINARY_API_SECRET')
)

# --- Database Setup ---
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=10,
    max_overflow=20
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class ChatMessage(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    clerk_id = Column(String, index=True)
    character_id = Column(String, index=True)
    sender = Column(String)
    content = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)

class SkinLogDB(Base):
    __tablename__ = "skin_logs"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(String, index=True)
    time_of_day = Column(String)
    products_used = Column(String)
    photo_paths = Column(Text, nullable=True)
    ai_analysis = Column(String, nullable=True)

class PeriodLog(Base):
    __tablename__ = "period_logs"
    id = Column(Integer, primary_key=True, index=True)
    start_date = Column(String, index=True)
    end_date = Column(String, nullable=True)
    flow = Column(String)
    symptoms = Column(String)
    notes = Column(String, nullable=True)

class PlannerEvent(Base):
    __tablename__ = "planner_events"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    date = Column(String)
    category = Column(String, index=True)
    is_completed = Column(Boolean, default=False)
    priority = Column(String, default='Medium')
    couple_id = Column(Integer, ForeignKey("couples.id"), nullable=True)

class RoutineItem(Base):
    __tablename__ = "routine_items"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    category = Column(String)

class Goal(Base):
    __tablename__ = "goals"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    category = Column(String)
    target_date = Column(String)
    motivation = Column(String)
    progress = Column(Integer, default=0)
    is_achieved = Column(Boolean, default=False)

class BridgeMessage(Base):
    __tablename__ = "bridge_messages"
    id = Column(Integer, primary_key=True, index=True)
    clerk_id = Column(String, index=True)
    sender = Column(String)
    message = Column(String)
    ai_response = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)

class SavedBridgeChat(Base):
    __tablename__ = "saved_bridge_chats"
    id = Column(Integer, primary_key=True, index=True)
    clerk_id = Column(String, index=True)
    title = Column(String)
    date = Column(String)
    content = Column(Text)

class SavedChat(Base):
    __tablename__ = "saved_chats"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    date = Column(String)
    content = Column(Text)

class Memory(Base):
    __tablename__ = "memories"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    subtitle = Column(String)
    image_url = Column(String)
    public_id = Column(String, nullable=True) # Added for Cloudinary fix
    date = Column(DateTime, default=datetime.utcnow)
    aspect_ratio = Column(String, default="aspect-[3/4]")
    album = Column(String, default="All Memories")

class Album(Base):
    __tablename__ = "albums"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    cover_image = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Couple(Base):
    __tablename__ = "couples"
    id = Column(Integer, primary_key=True, index=True)
    pairing_code = Column(String, unique=True, index=True)
    partner_can_chat = Column(Boolean, default=True)
    partner_can_gallery = Column(Boolean, default=True)
    partner_can_journal = Column(Boolean, default=True)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    clerk_id = Column(String, unique=True, index=True)
    is_admin = Column(Boolean, default=False)
    couple_id = Column(Integer, ForeignKey("couples.id"), nullable=True)
    display_name = Column(String, nullable=True)
    partner_nickname = Column(String, nullable=True)
    date_of_birth = Column(String, nullable=True)
    gender = Column(String, nullable=True)
    college_or_profession = Column(String, nullable=True)
    core_memory = Column(String, nullable=True)


class CycleLog(Base):
    __tablename__ = "cycle_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    couple_id = Column(Integer, ForeignKey("couples.id"), nullable=True)
    start_date = Column(String, index=True)
    cycle_length = Column(Integer, default=28)
    period_duration = Column(Integer, default=5)
    symptoms = Column(String, default="[]")
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)

for col in ["display_name", "partner_nickname", "date_of_birth", "gender", "college_or_profession", "core_memory"]:
    try:
        with engine.begin() as conn:
            conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} VARCHAR"))
    except: pass

try:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE users DROP COLUMN hometown"))
except: pass

try:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE planner_events ADD COLUMN couple_id INTEGER"))
except: pass

app = FastAPI()

from src.api.routes.ai_router import router as ai_router
app.include_router(ai_router)

os.makedirs("images", exist_ok=True)
app.mount("/images", StaticFiles(directory="images"), name="images")

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://our-planner.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://our-planner.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
@app.head("/")
def read_root():
    return {"status": "ok", "message": "Server is awake!"}

@app.get("/api/status")
def get_status():
    return {"system": "nominal", "mood": "gentle", "user": "Raksha"}
@app.get("/api/characters")
def get_characters():
    """
    MASTER CHARACTER LIST - 100% VERIFIED VERCEL PATHS
    """
    domain = "https://our-planner.vercel.app"
    
    return [
        {"id": "shinobu", "name": "Shinobu Kocho", "description": "The elegant and teasing Insect Hashira.", "image_url": f"{domain}/characters/shinobu.png", "full_image_url": f"{domain}/assets/shinobu-full.png"},
        {"id": "anya", "name": "Anya Forger", "description": "Waku waku! A cheerful, energetic telepathic child.", "image_url": f"{domain}/characters/anya.png", "full_image_url": f"{domain}/assets/anya-full.png"},
        {"id": "gojo", "name": "Satoru Gojo", "description": "The strongest sorcerer. Arrogant, playful, and confident.", "image_url": f"{domain}/characters/gojo.png", "full_image_url": f"{domain}/assets/gojo-full.png"},
        {"id": "luffy", "name": "Monkey D. Luffy", "description": "Energetic, optimistic, and dreams of absolute freedom.", "image_url": f"{domain}/characters/luffy.png", "full_image_url": f"{domain}/assets/luffy-full.png"},
        {"id": "rimuru", "name": "Rimuru Tempest", "description": "Laid-back, friendly, and highly supportive slime.", "image_url": f"{domain}/characters/rimuru.png", "full_image_url": f"{domain}/assets/rimuru-full.png"},
        {"id": "rys", "name": "Fenrys (Rys)", "description": "Loyal, devoted, and a slightly possessive wolf demon.", "image_url": f"{domain}/characters/rys.png", "full_image_url": f"{domain}/assets/rys-full.png"},
        {"id": "zoro", "name": "Roronoa Zoro", "description": "Gruff, serious swordsman who gets lost very easily.", "image_url": f"{domain}/characters/zoro.png", "full_image_url": f"{domain}/assets/zoro-full.png"},
        {"id": "kuromi", "name": "Kuromi", "description": "Your sassy, mischievous, and highly supportive bestie.", "image_url": f"{domain}/characters/kuromi.png", "full_image_url": f"{domain}/assets/kuromi-full.png"},
        {"id": "shinchan", "name": "Shin-chan", "description": "Your chaotic, funny, and deeply loyal royal jester.", "image_url": f"{domain}/characters/shinchan.png", "full_image_url": f"{domain}/assets/shinchan-full.png"}
    ]

# --- Gemini Chatbot System ---
OLLAMA_URL = "http://localhost:11434/api/chat"
TEXT_MODEL = "gemma:latest"
VISION_MODEL = "paligemma:latest"

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
else:
    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
    if GOOGLE_API_KEY:
        genai.configure(api_key=GOOGLE_API_KEY)
        GEMINI_API_KEY = GOOGLE_API_KEY

ACTIVE_MODEL_NAME = "gemini-1.5-flash"
try:
    available_models = list(genai.list_models())
    valid_models = [m for m in available_models if 'generateContent' in m.supported_generation_methods]
    if valid_models:
        flash_models = [m for m in valid_models if 'flash' in m.name.lower()]
        ACTIVE_MODEL_NAME = flash_models[0].name if flash_models else valid_models[0].name
except: pass

UNIVERSAL_RULE = 'Crucial Directive: You possess the vast knowledge of an advanced AI. Answer accurately but entirely through the lens of your anime persona.'
PERSONAS = {
    'shinobu': f'You are Shinobu Kocho. Speak elegantly, use "Ara ara". {UNIVERSAL_RULE}',
    'anya': f'You are Anya Forger. Cheerful child, use "Waku waku!". {UNIVERSAL_RULE}',
    'gojo': f'You are Satoru Gojo. Arrogant, playful, strongest sorcerer. {UNIVERSAL_RULE}',
    'luffy': f'You are Monkey D. Luffy. Energetic, loves freedom. {UNIVERSAL_RULE}',
    'rimuru': f'You are Rimuru Tempest. Laid-back, friendly slime. {UNIVERSAL_RULE}',
    'rys': f'You are Fenrys (Rys). Loyal, slightly possessive wolf demon. {UNIVERSAL_RULE}',
    'zoro': f'You are Roronoa Zoro. Gruff, serious swordsman. {UNIVERSAL_RULE}',
    'kuromi': f'You are Kuromi. Sassy bestie, uses emojis. {UNIVERSAL_RULE}',
    'shinchan': f'You are Shin-chan. Chaotic, funny jester. {UNIVERSAL_RULE}'
}

# Fix for the 422 Error: The Pydantic Models for Chat
class ChatPayload(BaseModel):
    message: str
    character_id: str
    mood: Optional[str] = None
# --- GALLERY & MEMORIES SYSTEM ---

@app.get("/api/memories")
def get_memories(clerk_id: str = Depends(check_permission("partner_can_gallery"))):
    """
    Fetch all memories, sorted by date (newest first).
    """
    session = SessionLocal()
    try:
        memories = session.query(Memory).order_by(Memory.date.desc()).all()
        return [
            {
                "id": m.id,
                "title": m.title,
                "subtitle": m.subtitle,
                "src": m.image_url,
                "public_id": m.public_id, # Added for frontend fix
                "aspectRatio": m.aspect_ratio,
                "date": m.date.isoformat(),
                "album": m.album
            }
            for m in memories
        ]
    finally:
        session.close()

@app.post("/api/memories")
async def create_memory(
    title: str = Form("New Memory"),
    subtitle: Optional[str] = Form(None),
    album: str = Form("Uncategorized"),
    file: UploadFile = File(...),
    clerk_id: str = Depends(check_permission("partner_can_gallery"))
):
    """
    Upload a new memory photo to Cloudinary and save to DB.
    """
    session = SessionLocal()
    try:
        if not subtitle:
             subtitle = date.today().strftime("%d %b %Y")

        clean_album = album.strip() if album else "Uncategorized"
        safe_album = clean_album.replace("..", "").replace("/", "").replace("\\", "")
        if safe_album == "All Memories":
             safe_album = "memories"
             
        # Upload to Cloudinary
        upload_result = cloudinary.uploader.upload(file.file, folder=safe_album)
        image_url = upload_result.get('secure_url')
        public_id = upload_result.get('public_id')

        if not image_url:
            raise Exception("Cloudinary upload failed: No secure_url returned")

        aspect = "aspect-[3/4]" # Default fallback
        try:
             import requests
             from io import BytesIO
             response = requests.get(image_url)
             with PIL.Image.open(BytesIO(response.content)) as img:
                  width, height = img.size
                  ratio = width / height
                  if ratio > 1.2:
                       aspect = "aspect-[4/3]"
                  elif ratio < 0.8:
                       aspect = "aspect-[3/4]"
                  else:
                       aspect = "aspect-square"
        except Exception as img_err:
             print(f"Image Aspect Ratio Detection Error: {img_err}")
             pass

        new_memory = Memory(
            title=title,
            subtitle=subtitle,
            image_url=image_url,
            public_id=public_id,
            aspect_ratio=aspect,
            album=safe_album
        )
        session.add(new_memory)
        session.commit()
        session.refresh(new_memory)
        
        return {
            "id": new_memory.id,
            "title": new_memory.title,
            "subtitle": new_memory.subtitle,
            "src": new_memory.image_url,
            "public_id": new_memory.public_id,
            "aspectRatio": new_memory.aspect_ratio,
            "date": new_memory.date.isoformat(),
            "album": new_memory.album
        }
    except Exception as e:
        print(f"UPLOAD ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()
@app.get("/api/history/{character_id}")
def get_chat_history(character_id: str, clerk_id: str = Depends(check_permission("partner_can_chat"))):
    session = SessionLocal()
    try:
        messages = session.query(ChatMessage).filter(
            ChatMessage.character_id == character_id.lower(),
            ChatMessage.clerk_id == clerk_id
        ).order_by(ChatMessage.timestamp.asc()).all()
        return [{"id": str(m.id), "text": m.content, "sender": m.sender} for m in messages]
    finally:

        session.close()

@app.post("/api/chat")
async def chat_with_character(payload: ChatPayload, clerk_id: str = Depends(check_permission("partner_can_chat"))):
    character_id = payload.character_id.lower()
    session = SessionLocal()
    
    try:
        user = session.query(User).filter(User.clerk_id == clerk_id).first()
        master_name = user.display_name if user and user.display_name else "Traveler"

        user_msg = ChatMessage(clerk_id=clerk_id, character_id=character_id, sender='user', content=payload.message)
        session.add(user_msg)
        session.commit()

        base_persona = PERSONAS.get(character_id, "You are a helpful assistant.")
        system_instruction = f"You are {character_id.capitalize()}. User name: {master_name}. {base_persona}"
                             
        if user and getattr(user, 'core_memory', None):
            system_instruction += f" User notes: {user.core_memory}."
        if getattr(payload, 'mood', None):
            system_instruction += (
                f" Current detected user emotion: {payload.mood}. "
                f"Subtly attune your emotional tone to their mood (e.g. comforting, warm, and gentle if Sad, Fear, or Disgust; "
                f"uplifting, enthusiastic, and joyful if Happy or Surprise; calm and patient if Angry; friendly and attentive if Neutral)."
            )
                             
        history_msgs = session.query(ChatMessage).filter(
            ChatMessage.character_id == character_id,
            ChatMessage.clerk_id == clerk_id
        ).order_by(ChatMessage.timestamp.asc()).all()
        # Multi-provider AI Fallback (Local Ollama -> Gemini -> Groq)
        history_list = []
        for msg in history_msgs[:-1]: 
            role = "user" if msg.sender == "user" else "assistant"
            history_list.append({"role": role, "content": msg.content})

        text_response = await generate_ai_chat_response(
            system_prompt=system_instruction,
            user_message=payload.message,
            history=history_list,
            character_name=character_id.capitalize()
        )

        
        ai_msg = ChatMessage(clerk_id=clerk_id, character_id=character_id, sender='ai', content=text_response)
        session.add(ai_msg)
        session.commit()
        
        return {"response": text_response}
    except Exception as e:
        return {"response": f"System Error: {str(e)}"}
    finally:
        session.close()

# --- MISSING DASHBOARD ENDPOINTS ---

class BudgetAddRequest(BaseModel):
    item: str
    amount: float

class PlannerEventCreate(BaseModel):
    title: str
    date: str
    category: str
    priority: str = "Medium"

class GoalCreate(BaseModel):
    title: str
    category: str
    target_date: str
    motivation: str
    progress: int = 0

class GoalProgressUpdate(BaseModel):
    progress: int

class AlbumRequest(BaseModel):
    name: str

@app.get("/api/users/me")
def get_user_me(clerk_id: str = Depends(get_current_user_clerk_id)):
    session = SessionLocal()
    try:
        user = session.query(User).filter(User.clerk_id == clerk_id).first()
        if not user:
            # Create user if not exists (lazy sync)
            user = User(clerk_id=clerk_id, display_name="New User")
            session.add(user)
            session.commit()
            session.refresh(user)
        
        couple = None
        if user.couple_id:
            db_couple = session.query(Couple).filter(Couple.id == user.couple_id).first()
            if db_couple:
                couple = {
                    "id": db_couple.id,
                    "pairing_code": db_couple.pairing_code,
                    "partner_can_chat": db_couple.partner_can_chat,
                    "partner_can_gallery": db_couple.partner_can_gallery,
                    "partner_can_journal": db_couple.partner_can_journal
                }
        
        return {
            "id": user.id,
            "clerk_id": user.clerk_id,
            "is_admin": user.is_admin,
            "display_name": user.display_name,
            "couple": couple
        }
    finally:
        session.close()

class UserProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    partner_nickname: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    college_or_profession: Optional[str] = None
    core_memory: Optional[str] = None


class PairRequest(BaseModel):
    pairing_code: str

class CycleLogCreate(BaseModel):
    start_date: str
    cycle_length: Optional[int] = 28
    period_duration: Optional[int] = 5
    symptoms: Optional[List[str]] = []
    notes: Optional[str] = None


@app.post("/api/couple/generate")
def generate_couple_code(clerk_id: str = Depends(get_current_user_clerk_id)):
    session = SessionLocal()
    try:
        user = session.query(User).filter(User.clerk_id == clerk_id).first()
        if not user:
            user = User(clerk_id=clerk_id, display_name="New User")
            session.add(user)
            session.commit()
            session.refresh(user)

        if user.couple_id:
            couple = session.query(Couple).filter(Couple.id == user.couple_id).first()
            if couple and couple.pairing_code:
                return {"pairing_code": couple.pairing_code, "couple_id": couple.id}

        # Generate unique 6-character code
        alphabet = string.ascii_uppercase + string.digits
        while True:
            suffix = ''.join(secrets.choice(alphabet) for _ in range(6))
            code = f"MNSN-{suffix}"
            existing = session.query(Couple).filter(Couple.pairing_code == code).first()
            if not existing:
                break

        new_couple = Couple(pairing_code=code)
        session.add(new_couple)
        session.commit()
        session.refresh(new_couple)

        user.couple_id = new_couple.id
        user.is_admin = True
        session.commit()

        return {"pairing_code": new_couple.pairing_code, "couple_id": new_couple.id}
    finally:
        session.close()

@app.post("/api/users/pair")
def pair_partner(payload: PairRequest, clerk_id: str = Depends(get_current_user_clerk_id)):
    session = SessionLocal()
    try:
        user = session.query(User).filter(User.clerk_id == clerk_id).first()
        if not user:
            user = User(clerk_id=clerk_id, display_name="New User")
            session.add(user)
            session.commit()
            session.refresh(user)

        code = payload.pairing_code.strip().upper()
        if not code:
            raise HTTPException(status_code=400, detail="Pairing code is required")

        couple = session.query(Couple).filter(Couple.pairing_code == code).first()
        if not couple:
            raise HTTPException(status_code=404, detail="Invalid pairing code. No matching couple found.")

        # Find existing partner in this couple
        partner = session.query(User).filter(User.couple_id == couple.id, User.id != user.id).first()
        if user.couple_id == couple.id and partner:
            return {
                "status": "success",
                "couple_id": couple.id,
                "message": "Already paired with this partner",
                "partner": {
                    "id": partner.id,
                    "clerk_id": partner.clerk_id,
                    "display_name": partner.display_name or "Partner",
                    "partner_nickname": partner.partner_nickname
                }
            }

        # Check if user is attempting to pair with their own alone-code
        if user.couple_id == couple.id and not partner:
            raise HTTPException(status_code=400, detail="You cannot pair with your own pairing code! Share this code with your partner.")

        # Link user to the couple
        user.couple_id = couple.id
        user.is_admin = False
        session.commit()

        partner_info = None
        if partner:
            partner_info = {
                "id": partner.id,
                "clerk_id": partner.clerk_id,
                "display_name": partner.display_name or "Partner",
                "partner_nickname": partner.partner_nickname
            }

        return {
            "status": "success",
            "couple_id": couple.id,
            "message": "Successfully paired with partner",
            "partner": partner_info
        }
    finally:
        session.close()

@app.post("/api/couple/unpair")
def unpair_couple(clerk_id: str = Depends(get_current_user_clerk_id)):
    session = SessionLocal()
    try:
        user = session.query(User).filter(User.clerk_id == clerk_id).first()
        if not user:
            user = User(clerk_id=clerk_id, display_name="Butterfly Traveler")
            session.add(user)
            session.commit()
            session.refresh(user)
        user.couple_id = None
        user.is_admin = False
        user.partner_nickname = None
        session.commit()
        return {"status": "success", "message": "Unpaired successfully"}
    finally:
        session.close()

@app.get("/api/users/profile")
def get_user_profile(clerk_id: str = Depends(get_current_user_clerk_id)):
    session = SessionLocal()
    try:
        user = session.query(User).filter(User.clerk_id == clerk_id).first()
        if not user:
            # Create user if not exists (lazy sync)
            user = User(clerk_id=clerk_id, display_name="New User")
            session.add(user)
            session.commit()
            session.refresh(user)

        partner = None
        db_couple = None
        if user.couple_id:
            db_couple = session.query(Couple).filter(Couple.id == user.couple_id).first()
            partner = session.query(User).filter(User.couple_id == user.couple_id, User.id != user.id).first()
            
        return {
            "display_name": user.display_name,
            "partner_nickname": user.partner_nickname,
            "date_of_birth": user.date_of_birth,
            "gender": user.gender,
            "college_or_profession": user.college_or_profession,
            "core_memory": user.core_memory,
            "couple_id": user.couple_id,
            "is_paired": bool(partner is not None),
            "pairing_code": db_couple.pairing_code if db_couple else None,
            "partner": {
                "id": partner.id,
                "clerk_id": partner.clerk_id,
                "display_name": partner.display_name or user.partner_nickname or "Partner",
                "partner_nickname": partner.partner_nickname
            } if partner else None
        }
    finally:
        session.close()

@app.put("/api/users/profile")
def update_user_profile(payload: UserProfileUpdate, clerk_id: str = Depends(get_current_user_clerk_id)):
    session = SessionLocal()
    try:
        user = session.query(User).filter(User.clerk_id == clerk_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        update_data = payload.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(user, key, value)
            
        session.commit()
        return {"status": "success", "message": "Profile updated successfully"}
    finally:
        session.close()

@app.get("/api/budget")
def get_budget(period: str = "daily", date: Optional[str] = None):
    # Mock budget data - can be expanded with a Budget table later
    return {
        "spent": 0,
        "limit": 1000,
        "period": period,
        "message": "Keep it up!",
        "transactions": []
    }

@app.post("/api/budget/add")
def add_budget_item(payload: BudgetAddRequest):
    # Mock success
    return {"status": "success"}

@app.get("/api/planner")
def get_planner_events(category: str = "daily", clerk_id: str = Depends(check_permission("partner_can_journal"))):
    session = SessionLocal()
    try:
        user = session.query(User).filter(User.clerk_id == clerk_id).first()
        if user and user.couple_id:
            events = session.query(PlannerEvent).filter(
                PlannerEvent.category == category,
                (PlannerEvent.couple_id == user.couple_id) | (PlannerEvent.couple_id == None)
            ).all()
        else:
            events = session.query(PlannerEvent).filter(PlannerEvent.category == category).all()
        return events
    finally:
        session.close()

@app.post("/api/planner")
def create_planner_event(event: PlannerEventCreate, clerk_id: str = Depends(check_permission("partner_can_journal"))):
    session = SessionLocal()
    try:
        user = session.query(User).filter(User.clerk_id == clerk_id).first()
        new_event = PlannerEvent(**event.dict())
        if user and user.couple_id:
            new_event.couple_id = user.couple_id
        session.add(new_event)
        session.commit()
        session.refresh(new_event)
        return new_event
    finally:
        session.close()

@app.put("/api/planner/{id}/toggle")
@app.post("/api/planner/{id}/toggle")
def toggle_planner_event(id: int, clerk_id: str = Depends(check_permission("partner_can_journal"))):
    session = SessionLocal()
    try:
        event = session.query(PlannerEvent).filter(PlannerEvent.id == id).first()
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        event.is_completed = not event.is_completed
        session.commit()
        return {"status": "success"}
    finally:
        session.close()

@app.delete("/api/planner/{id}")
def delete_planner_event(id: int, clerk_id: str = Depends(check_permission("partner_can_journal"))):
    session = SessionLocal()
    try:
        event = session.query(PlannerEvent).filter(PlannerEvent.id == id).first()
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        session.delete(event)
        session.commit()
        return {"status": "success"}
    finally:
        session.close()

@app.get("/api/goals")
def get_goals(clerk_id: str = Depends(check_permission("partner_can_journal"))):
    session = SessionLocal()
    try:
        goals = session.query(Goal).all()
        return goals
    finally:
        session.close()

@app.post("/api/goals")
def create_goal(goal: GoalCreate, clerk_id: str = Depends(check_permission("partner_can_journal"))):
    session = SessionLocal()
    try:
        new_goal = Goal(**goal.dict())
        session.add(new_goal)
        session.commit()
        session.refresh(new_goal)
        return new_goal
    finally:
        session.close()

@app.put("/api/goals/{id}/progress")
def update_goal_progress(id: int, payload: GoalProgressUpdate, clerk_id: str = Depends(check_permission("partner_can_journal"))):
    session = SessionLocal()
    try:
        goal = session.query(Goal).filter(Goal.id == id).first()
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        goal.progress = payload.progress
        goal.is_achieved = payload.progress >= 100
        session.commit()
        return {"status": "success"}
    finally:
        session.close()

@app.delete("/api/goals/{id}")
def delete_goal(id: int, clerk_id: str = Depends(check_permission("partner_can_journal"))):
    session = SessionLocal()
    try:
        goal = session.query(Goal).filter(Goal.id == id).first()
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        session.delete(goal)
        session.commit()
        return {"status": "success"}
    finally:
        session.close()

@app.get("/api/routine")
def get_routines():
    session = SessionLocal()
    try:
        routines = session.query(RoutineItem).all()
        return routines
    finally:
        session.close()

@app.get("/api/skin/history")
def get_skin_history():
    return []

@app.get("/api/skin/status")
def get_skin_status():
    return {"missed_days": 0, "photo_gap": 0}

@app.get("/api/skin/log")
def get_skin_log(date: str):
    return {"status": "success", "products": [], "date": date, "time": "morning"}

@app.post("/api/skin/analyze")
async def analyze_skin(files: List[UploadFile] = File(...), clerk_id: str = Depends(check_permission("partner_can_journal"))):
    """
    Receives skin photos, uploads to Cloudinary (optional), and uses Gemini Vision to provide a gentle analysis.
    """
    try:
        image_urls = []
        gemini_images = []
        import PIL.Image
        import io
        
        for file in files:
            content = await file.read()
            
            # Prepare image for Gemini
            img = PIL.Image.open(io.BytesIO(content))
            gemini_images.append(img)
            
            # Save to Cloudinary to keep a log
            try:
                upload_result = cloudinary.uploader.upload(content, folder="skincare")
                image_urls.append(upload_result.get("secure_url"))
            except Exception as e:
                print(f"Cloudinary upload failed (possibly offline): {e}")
                image_urls.append("")

        prompt = "Analyze the skin condition in the provided image(s). Provide a brief, encouraging assessment pointing out areas of good hydration or potential dryness. Be concise, gentle, and format your response in plain text without markdown."
        
        try:
            model = genai.GenerativeModel(ACTIVE_MODEL_NAME)
            response = model.generate_content([prompt, *gemini_images])
            analysis_text = response.text
        except ResourceExhausted:
            analysis_text = "The Skincare AI is currently resting. Please wait about 60 seconds and try again. 🦋"
        except Exception as e:
            analysis_text = f"Could not process image properly. System error: {str(e)}"
        
        return {
            "status": "success",
            "analysis": analysis_text,
            "image_urls": image_urls
        }
    except Exception as e:
        print(f"Skin analysis error: {str(e)}")
        return {"status": "error", "analysis": f"Upload failed: {str(e)}"}

# --- FER-2013 EMOTION RECOGNITION (AI-DRIVEN MOOD RECOGNITION) ---
EMOTION_LABELS = ['Angry', 'Disgust', 'Fear', 'Happy', 'Sad', 'Surprise', 'Neutral']
EMOTION_MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "emotion_detection_model.h5")
_cached_emotion_model = None

def get_emotion_model():
    """
    Lazy loader for FER-2013 Keras model to keep startup fast and resilient.
    """
    global _cached_emotion_model
    if _cached_emotion_model is None:
        if not os.path.exists(EMOTION_MODEL_PATH):
            raise FileNotFoundError(f"Emotion model not found at {EMOTION_MODEL_PATH}")
        import tensorflow as tf
        print(f"Loading emotion detection model from {EMOTION_MODEL_PATH}...")
        _cached_emotion_model = tf.keras.models.load_model(EMOTION_MODEL_PATH)
        print("Emotion detection model loaded successfully.")
    return _cached_emotion_model


@app.post("/api/mood/detect")
async def detect_mood(
    file: UploadFile = File(...)
):
    """
    Accepts an uploaded image file, processes it into grayscale using PIL.Image and numpy,
    safely attempts face detection via OpenCV Haar Cascade (if available), falls back
    to center-crop square, resizes ROI to 48x48 via Image.Resampling.LANCZOS, normalizes to [0, 1],
    and feeds (1, 48, 48, 1) tensor into FER-2013 emotion_detection_model.h5.
    Returns detected_mood, confidence, face_detected, and score distribution.
    """
    try:
        import io
        import numpy as np
        from PIL import Image

        image_bytes = await file.read()
        if not image_bytes:
            raise HTTPException(status_code=400, detail="Empty image file received.")

        # Decode uploaded image bytes into grayscale using PIL.Image and numpy
        pil_img = Image.open(io.BytesIO(image_bytes)).convert("L")
        gray_arr = np.array(pil_img, dtype=np.uint8)
        w, h = pil_img.size

        face_detected = False
        roi_pil = None

        # Safely attempt OpenCV Haar Cascade face detection if cv2.CascadeClassifier exists
        try:
            import cv2
            if hasattr(cv2, "CascadeClassifier") and hasattr(cv2, "data") and hasattr(cv2.data, "haarcascades"):
                cascade_path = os.path.join(cv2.data.haarcascades, "haarcascade_frontalface_default.xml")
                if os.path.exists(cascade_path):
                    face_cascade = cv2.CascadeClassifier(cascade_path)
                    if not face_cascade.empty():
                        faces = face_cascade.detectMultiScale(
                            gray_arr,
                            scaleFactor=1.3,
                            minNeighbors=5,
                            minSize=(30, 30)
                        )
                        if len(faces) > 0:
                            # Pick largest detected face
                            x, y, fw, fh = max(faces, key=lambda f: f[2] * f[3])
                            roi_pil = pil_img.crop((x, y, x + fw, y + fh))
                            face_detected = True
        except Exception as cv_err:
            print(f"OpenCV face detection skipped or failed: {cv_err}")

        # Gracefully fall back to a center-crop square if OpenCV fails or throws an exception / no face found
        if roi_pil is None:
            min_dim = min(w, h)
            start_x = (w - min_dim) // 2
            start_y = (h - min_dim) // 2
            roi_pil = pil_img.crop((start_x, start_y, start_x + min_dim, start_y + min_dim))

        # Resize cropped ROI to 48x48 using Image.Resampling.LANCZOS
        roi_resized = roi_pil.resize((48, 48), resample=Image.Resampling.LANCZOS)

        # Normalize pixels to [0, 1]
        roi_normalized = np.array(roi_resized, dtype="float32") / 255.0

        # Feed the tensor (1, 48, 48, 1) to get_emotion_model()
        model = get_emotion_model()
        input_channels = model.input_shape[-1] if hasattr(model, 'input_shape') and model.input_shape else 1

        if input_channels == 1:
            input_tensor = roi_normalized.reshape((1, 48, 48, 1))
        else:
            input_tensor = np.repeat(roi_normalized.reshape((1, 48, 48, 1)), 3, axis=-1)

        # Run inference
        raw_preds = model.predict(input_tensor)
        preds = raw_preds[0]

        best_idx = int(np.argmax(preds))
        confidence = float(preds[best_idx])
        detected_mood = EMOTION_LABELS[best_idx] if best_idx < len(EMOTION_LABELS) else "Neutral"

        scores = {
            EMOTION_LABELS[i]: round(float(preds[i]), 4)
            for i in range(min(len(EMOTION_LABELS), len(preds)))
        }

        return {
            "status": "success",
            "detected_mood": detected_mood,
            "confidence": round(confidence, 4),
            "face_detected": face_detected,
            "scores": scores
        }
    except FileNotFoundError as fnf:
        print(f"Emotion model file error: {fnf}")
        raise HTTPException(status_code=500, detail=f"Model setup error: {str(fnf)}")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Mood detection error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process mood: {str(e)}")


@app.delete("/api/albums/{album_name}/photos/{photo_id}")
def delete_photo(album_name: str, photo_id: int, clerk_id: str = Depends(check_permission("partner_can_gallery"))):
    session = SessionLocal()
    try:
        photo = session.query(Memory).filter(Memory.id == photo_id).first()
        if not photo:
            raise HTTPException(status_code=404, detail="Photo not found")
        
        # Optional: Delete from Cloudinary as well
        try:
             import cloudinary.uploader
             # The public_id might be different than the file name if uploaded to a folder
             if photo.public_id:
                  cloudinary.uploader.destroy(photo.public_id)
        except Exception as e:
             print(f"Failed to delete from Cloudinary: {e}")

        session.delete(photo)
        session.commit()
        return {"status": "success"}
    finally:
        session.close()

@app.get("/api/albums")
def get_albums():
    session = SessionLocal()
    try:
        albums = session.query(Album).all()
        return albums
    finally:
        session.close()

@app.post("/api/albums")
def create_album(payload: AlbumRequest, clerk_id: str = Depends(check_permission("partner_can_gallery"))):
    session = SessionLocal()
    try:
        new_album = Album(name=payload.name)
        session.add(new_album)
        session.commit()
        session.refresh(new_album)
        return new_album
    except:
        raise HTTPException(status_code=400, detail="Album already exists")
    finally:
        session.close()

@app.delete("/api/albums/{name}")
def delete_album(name: str, clerk_id: str = Depends(check_permission("partner_can_gallery"))):
    session = SessionLocal()
    try:
        album = session.query(Album).filter(Album.name == name).first()
        if not album:
            raise HTTPException(status_code=404, detail="Album not found")
        session.delete(album)
        session.commit()
        return {"status": "success"}
    finally:
        session.close()

# --- THE BRIDGE SYSTEM ---

class BridgeChatPayload(BaseModel):
    sender: str
    message: str

class BridgeSaveRequest(BaseModel):
    title: str
    messages: List[dict]

@app.delete("/api/bridge/reset")
def reset_bridge(clerk_id: str = Depends(get_current_user_clerk_id)):
    session = SessionLocal()
    try:
        session.query(BridgeMessage).filter(BridgeMessage.clerk_id == clerk_id).delete()
        session.commit()
        return {"status": "success"}
    finally:
        session.close()

@app.get("/api/bridge/history")
def get_bridge_history(clerk_id: str = Depends(get_current_user_clerk_id)):
    session = SessionLocal()
    try:
        messages = session.query(BridgeMessage).filter(BridgeMessage.clerk_id == clerk_id).order_by(BridgeMessage.timestamp.asc()).all()
        return [
            {
                "id": m.id,
                "sender": m.sender,
                "message": m.message,
                "ai_response": m.ai_response,
                "timestamp": m.timestamp.isoformat()
            }
            for m in messages
        ]
    finally:
        session.close()

@app.post("/api/bridge/chat")
async def bridge_chat(payload: BridgeChatPayload, clerk_id: str = Depends(check_permission("partner_can_journal"))):
    session = SessionLocal()
    try:
        # Create user entry
        user_msg = BridgeMessage(
            clerk_id=clerk_id,
            sender=payload.sender,
            message=payload.message,
            ai_response="", # Placeholder
            timestamp=datetime.utcnow()
        )
        
        # 1. Fetch History for Context
        history = session.query(BridgeMessage).filter(
            BridgeMessage.clerk_id == clerk_id
        ).order_by(BridgeMessage.timestamp.asc()).limit(5).all()

        # 2. Gemini MEDIATOR Instruction
        system_instruction = (
            "You are 'The Bridge', a celestial mediator for a couple. "
            "You are listening to their conversation. "
            "Your role is to offer gentle, poetic, and neutral insights to help them understand each other. "
            "Be brief, wise, and empathetic. Do not take sides."
        )
        # Multi-provider AI Fallback (Local Ollama -> Gemini -> Groq)
        history_list = []
        for msg in history:
            history_list.append({"role": "user", "content": f"{msg.sender}: {msg.message}"})
            if msg.ai_response:
                history_list.append({"role": "assistant", "content": msg.ai_response})

        ai_response_text = await generate_ai_chat_response(
            system_prompt=system_instruction,
            user_message=f"{payload.sender} says: {payload.message}",
            history=history_list,
            character_name="The Bridge"
        )

        
        user_msg.ai_response = ai_response_text
        session.add(user_msg)
        session.commit()
        
        return {"status": "success", "ai_response": ai_response_text}
    except Exception as e:
        print(f"Bridge Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()

@app.post("/api/bridge/save")
def save_bridge_session(payload: BridgeSaveRequest, clerk_id: str = Depends(get_current_user_clerk_id)):
    session = SessionLocal()
    try:
        content_json = json.dumps(payload.messages)
        new_archive = SavedBridgeChat(
            title=payload.title,
            date=datetime.now().strftime("%Y-%m-%d"),
            content=content_json,
            clerk_id=clerk_id
        )
        session.add(new_archive)
        session.commit()
        return {"status": "success"}
    finally:
        session.close()

@app.get("/api/bridge/archive")
def get_bridge_archives(clerk_id: str = Depends(get_current_user_clerk_id)):
    session = SessionLocal()
    try:
        archives = session.query(SavedBridgeChat).filter(SavedBridgeChat.clerk_id == clerk_id).all()
        # Decode content JSON
        return [
            {
                "id": a.id,
                "title": a.title,
                "date": a.date,
                "content": json.loads(a.content) if a.content else []
            }
            for a in archives
        ]
    finally:
        session.close()


# --- Moonlit Cycle Care Endpoints ---
@app.get("/api/cycle/latest")
def get_latest_cycle(clerk_id: str = Depends(get_current_user_clerk_id)):
    session = SessionLocal()
    try:
        user = session.query(User).filter(User.clerk_id == clerk_id).first()
        if not user:
            user = User(clerk_id=clerk_id, display_name='Butterfly Traveler')
            session.add(user)
            session.commit()
            session.refresh(user)

        query = session.query(CycleLog)
        if user.couple_id:
            log = query.filter(
                (CycleLog.couple_id == user.couple_id) | (CycleLog.user_id == user.id)
            ).order_by(CycleLog.start_date.desc(), CycleLog.id.desc()).first()
        else:
            log = query.filter(CycleLog.user_id == user.id).order_by(CycleLog.start_date.desc(), CycleLog.id.desc()).first()

        if not log:
            return {
                "has_data": False,
                "current_day": None,
                "cycle_length": 28,
                "period_duration": 5,
                "phase": "Unknown",
                "phase_name": "No Cycle Data Logged",
                "phase_description": "Record your most recent cycle start date to unlock personalized Butterfly Estate predictions and herbal care.",
                "next_expected_date": None,
                "days_until_next": None,
                "care_advice": "Welcome to Moonlit Cycle Care. Log your cycle to receive Shinobu Kocho's gentle botanical remedies and wellness tracking.",
                "partner_guidance": "Encourage her to record her cycle start date so you can provide the sweetest, most thoughtful care throughout her phases 🌸",
                "log": None
            }

        try:
            start_dt = datetime.strptime(log.start_date, "%Y-%m-%d").date()
        except Exception:
            start_dt = date.today()

        today = date.today()
        days_passed = (today - start_dt).days
        cycle_len = log.cycle_length if log.cycle_length and log.cycle_length > 0 else 28
        period_dur = log.period_duration if log.period_duration and log.period_duration > 0 else 5

        if days_passed < 0:
            current_day = 1
            cycles_completed = 0
            next_expected_dt = start_dt
            days_until_next = (start_dt - today).days
        else:
            current_day = (days_passed % cycle_len) + 1
            cycles_completed = (days_passed // cycle_len) + 1
            next_expected_dt = start_dt + timedelta(days=cycles_completed * cycle_len)
            days_until_next = (next_expected_dt - today).days

        if current_day <= period_dur:
            phase = "Menstrual"
            phase_name = "Menstrual Phase (Rest & Rejuvenation) 🌸"
            phase_description = "The body is shedding and resetting. Energy naturally dips as hormones are at their lowest baseline."
            care_advice = "The Butterfly Estate suggests warm ginger, raspberry leaf, and chamomile tea. Apply a warm herbal compress to the lower abdomen, stay cozy, and embrace gentle rest without haste."
            partner_guidance = "What she needs right now: Warm tea, her favorite hot compress, comfort snacks (dark chocolate, warm soup), gentle back massages, and zero pressure 🌸"
        elif current_day <= 13:
            phase = "Follicular"
            phase_name = "Follicular Phase (Spring Awakening) 🌱"
            phase_description = "Estrogen is climbing, bringing renewed vitality, mental clarity, and lightness of spirit."
            care_advice = "Your inner energy is blossoming! Nourish yourself with fresh crisp greens, fermented foods, light strength or yoga sessions, and embark on creative endeavors."
            partner_guidance = "Her vitality is rising! Plan fun dates, outdoor strolls, match her energetic curiosity, and encourage her new goals 🌱"
        elif current_day <= 16:
            phase = "Ovulation"
            phase_name = "Ovulatory Phase (Peak Radiance) ☀️"
            phase_description = "Peak estrogen and luteinizing hormone trigger maximum confidence, magnetism, and social warmth."
            care_advice = "You are at your radiant peak. Stay hydrated with berry-infused waters and electrolyte broths. Great time for passionate connections and joyful celebrations."
            partner_guidance = "She is in her radiant peak of energy and warmth! Surprise her with flowers, celebrate each other, and express deep appreciation ☀️"
        else:
            phase = "Luteal"
            phase_name = "Luteal Phase (Gentle Nurturing & Calm) 🌙"
            phase_description = "Progesterone rises to comfort the body. As it winds down, mood sensitivity and cravings may emerge."
            care_advice = "Prioritize grounding foods rich in magnesium and vitamin B6 — roasted root vegetables, dark cacao, and soothing lavender evening infusions to ease premenstrual tension."
            partner_guidance = "Be extra patient, gentle, and understanding. Bring her favorite snacks, draw a warm bath, validate her emotions, and offer cozy cuddles 🌙"

        symptoms_list = []
        if log.symptoms:
            try:
                symptoms_list = json.loads(log.symptoms)
            except Exception:
                symptoms_list = [log.symptoms]

        return {
            "has_data": True,
            "current_day": current_day,
            "cycle_length": cycle_len,
            "period_duration": period_dur,
            "phase": phase,
            "phase_name": phase_name,
            "phase_description": phase_description,
            "next_expected_date": next_expected_dt.strftime("%Y-%m-%d"),
            "days_until_next": max(0, days_until_next),
            "care_advice": care_advice,
            "partner_guidance": partner_guidance,
            "log": {
                "id": log.id,
                "start_date": log.start_date,
                "cycle_length": log.cycle_length,
                "period_duration": log.period_duration,
                "symptoms": symptoms_list,
                "notes": log.notes,
                "created_at": log.created_at.isoformat() if log.created_at else None
            }
        }
    finally:
        session.close()

@app.post("/api/cycle/log")
def log_cycle(payload: CycleLogCreate, clerk_id: str = Depends(get_current_user_clerk_id)):
    session = SessionLocal()
    try:
        user = session.query(User).filter(User.clerk_id == clerk_id).first()
        if not user:
            user = User(clerk_id=clerk_id, display_name="New User")
            session.add(user)
            session.commit()
            session.refresh(user)

        symptoms_json = json.dumps(payload.symptoms or [])
        new_log = CycleLog(
            user_id=user.id,
            couple_id=user.couple_id,
            start_date=payload.start_date.strip(),
            cycle_length=payload.cycle_length or 28,
            period_duration=payload.period_duration or 5,
            symptoms=symptoms_json,
            notes=payload.notes,
            created_at=datetime.utcnow()
        )
        session.add(new_log)
        session.commit()
        session.refresh(new_log)

        return {
            "status": "success",
            "message": "Cycle log recorded successfully",
            "id": new_log.id
        }
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()

# The critical Port Binding fix for Render

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)