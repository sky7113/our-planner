from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn
import os
import time
import shutil
import sqlite3
from datetime import datetime, timedelta, date
from typing import Optional, List
import google.generativeai as genai
from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Boolean, ForeignKey, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import json
import PIL.Image
import cloudinary
import cloudinary.uploader

import jwt
from jwt import PyJWKClient

# Cache JWKS client to avoid fetching on every request
jwks_clients = {}

def get_current_user_clerk_id(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        print("❌ Auth Error: Missing Authorization header")
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    
    parts = auth_header.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        print("❌ Auth Error: Invalid Authorization header format")
        raise HTTPException(status_code=401, detail="Invalid Authorization header format")
        
    token = parts[1]
    
    try:
        # 1. Decode unverified to get the 'iss' (issuer)
        unverified_payload = jwt.decode(token, options={"verify_signature": False})
        iss = unverified_payload.get("iss")
        
        if not iss:
            print("❌ Auth Error: Token missing 'iss' claim")
            raise HTTPException(status_code=401, detail="Token missing 'iss' claim")
            
        jwks_url = f"{iss.rstrip('/')}/.well-known/jwks.json"
        
        # 2. Get the JWK client for this issuer
        if jwks_url not in jwks_clients:
            jwks_clients[jwks_url] = jwt.PyJWKClient(jwks_url)
            
        jwk_client = jwks_clients[jwks_url]
        signing_key = jwk_client.get_signing_key_from_jwt(token)
        
        # 3. Verify the token completely
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=iss,
            options={"verify_aud": False} # The audience might not be set by default clerk tokens unless configured
        )
        
        clerk_id = payload.get("sub")
        if not clerk_id:
            print("❌ Auth Error: Missing 'sub' (clerk ID) in token")
            raise HTTPException(status_code=401, detail="Invalid token payload")
            
        print(f"✅ Auth Success: Authenticated clerk_id = {clerk_id}")
        return clerk_id
        
    except jwt.ExpiredSignatureError:
        print("❌ Auth Error: Token expired")
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidSignatureError:
        print("❌ Auth Error: Invalid signature")
        raise HTTPException(status_code=401, detail="Invalid signature")
    except jwt.DecodeError:
        print("❌ Auth Error: Unparsable or malformed token")
        raise HTTPException(status_code=401, detail="Malformed token")
    except Exception as e:
        print(f"❌ Auth Error: General verification failure - {str(e)}")
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
DATABASE_URL = "postgresql://neondb_owner:npg_N8aJxgwV3ZRM@ep-wild-paper-ainnf2vo-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # Checks connection before using it
    pool_recycle=300,    # Refreshes connection every 5 minutes
    pool_size=10,
    max_overflow=20
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class ChatMessage(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    clerk_id = Column(String, index=True) # Linking to User
    character_id = Column(String, index=True)
    sender = Column(String) # 'user' or 'ai'
    content = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)

class AlbumRequest(BaseModel):
    name: str

class SkinLog(BaseModel):
    __tablename__ = "skin_logs" 

# Real SQLAlchemy Model for SkinLog
class SkinLogDB(Base):
    __tablename__ = "skin_logs"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(String, index=True) # YYYY-MM-DD
    time_of_day = Column(String) # morning/night
    products_used = Column(String) # JSON string
    photo_paths = Column(Text, nullable=True) # JSON list of strings (changed from photo_path)
    ai_analysis = Column(String, nullable=True)

class PeriodLog(Base):
    __tablename__ = "period_logs"
    id = Column(Integer, primary_key=True, index=True)
    start_date = Column(String, index=True) # YYYY-MM-DD
    end_date = Column(String, nullable=True)
    flow = Column(String) # Light, Medium, Heavy
    symptoms = Column(String) # JSON list
    notes = Column(String, nullable=True)

class PlannerEvent(Base):
    __tablename__ = "planner_events"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    date = Column(String) # YYYY-MM-DD
    category = Column(String, index=True) # daily, weekly, monthly, yearly
    is_completed = Column(Boolean, default=False)
    priority = Column(String, default='Medium') # High, Medium, Low

class RoutineItem(Base):
    __tablename__ = "routine_items"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    category = Column(String) # morning/night

class Goal(Base):
    __tablename__ = "goals"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    category = Column(String) # Career, Health, Personal, Finance
    target_date = Column(String) # YYYY-MM-DD
    motivation = Column(String)
    progress = Column(Integer, default=0) # 0-100
    is_achieved = Column(Boolean, default=False)

class BridgeMessage(Base):
    __tablename__ = "bridge_messages"
    id = Column(Integer, primary_key=True, index=True)
    sender = Column(String) # 'Amber' or 'Raksha'
    message = Column(String)
    ai_response = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)

class SavedBridgeChat(Base):
    __tablename__ = "saved_bridge_chats"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    date = Column(String) # YYYY-MM-DD
    content = Column(Text) # JSON string of conversation

class SavedChat(Base):
    __tablename__ = "saved_chats"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    date = Column(String) # YYYY-MM-DD
    content = Column(Text) # JSON string of conversation

class Memory(Base):
    __tablename__ = "memories"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    subtitle = Column(String)
    image_url = Column(String)
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

Base.metadata.create_all(bind=engine)

# Silent migrations to handle DB schema changes gracefully
for col in ["display_name", "partner_nickname", "date_of_birth", "gender", "college_or_profession", "core_memory"]:
    try:
        with engine.begin() as conn:
            conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} VARCHAR"))
    except: pass

try:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE users DROP COLUMN hometown"))
except: pass

app = FastAPI()

# Ensure images directory exists on startup for local storage fallback
os.makedirs("images", exist_ok=True)
app.mount("/images", StaticFiles(directory="images"), name="images")

# CORS Configuration
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://our-planner.vercel.app",
    "https://our-planner.vercel.app/",
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
    MASTER CHARACTER LIST - VERIFIED PATHS
    Note: Small avatars are in /assets/characters/ while full bodies are in /assets/ directly.
    """
    base_url = "https://our-planner.vercel.app/assets"
    
    return [
        {"id": "shinobu", "name": "Shinobu Kocho", "description": "The elegant and teasing Insect Hashira.", "image_url": f"{base_url}/characters/shinobu.png", "full_image_url": f"{base_url}/shinobu-full.png"},
        {"id": "anya", "name": "Anya Forger", "description": "Waku waku! A cheerful, energetic telepathic child.", "image_url": f"{base_url}/characters/anya.png", "full_image_url": f"{base_url}/anya-full.png"},
        {"id": "gojo", "name": "Satoru Gojo", "description": "The strongest sorcerer. Arrogant, playful, and confident.", "image_url": f"{base_url}/characters/gojo.png", "full_image_url": f"{base_url}/gojo-full.png"},
        {"id": "luffy", "name": "Monkey D. Luffy", "description": "Energetic, optimistic, and dreams of absolute freedom.", "image_url": f"{base_url}/characters/luffy.png", "full_image_url": f"{base_url}/luffy-full.png"},
        {"id": "rimuru", "name": "Rimuru Tempest", "description": "Laid-back, friendly, and highly supportive slime.", "image_url": f"{base_url}/characters/rimuru.png", "full_image_url": f"{base_url}/rimuru-full.png"},
        {"id": "rys", "name": "Fenrys (Rys)", "description": "Loyal, devoted, and a slightly possessive wolf demon.", "image_url": f"{base_url}/characters/rys.png", "full_image_url": f"{base_url}/rys-full.png"},
        {"id": "zoro", "name": "Roronoa Zoro", "description": "Gruff, serious swordsman who gets lost very easily.", "image_url": f"{base_url}/characters/zoro.png", "full_image_url": f"{base_url}/zoro-full.png"},
        {"id": "kuromi", "name": "Kuromi", "description": "Your sassy, mischievous, and highly supportive bestie.", "image_url": f"{base_url}/characters/kuromi.png", "full_image_url": f"{base_url}/kuromi-full.png"},
        {"id": "shinchan", "name": "Shin-chan", "description": "Your chaotic, funny, and deeply loyal royal jester.", "image_url": f"{base_url}/characters/shinchan.png", "full_image_url": f"{base_url}/shinchan-full.png"}
    ]

# Rest of your logic (Galleries, Skincare, Budget, Gemini, etc.) continues below...
# (Omitted from snippet for length, keep your existing logic from here down)

# --- Gemini Chatbot System ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

ACTIVE_MODEL_NAME = "gemini-1.5-flash"
try:
    available_models = [m.name for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]
    if any("flash" in m for m in available_models):
        ACTIVE_MODEL_NAME = [m for m in available_models if "flash" in m][0]
except: pass

UNIVERSAL_RULE = 'Crucial Directive: You possess the vast, infinite knowledge of an advanced AI model. You must answer ANY question through the lens of your anime persona.'

PERSONAS = {
    'shinobu': f'You are Shinobu Kocho. Speak elegantly and politely, but with a slightly mischievous tone. Use "Ara ara". {UNIVERSAL_RULE}',
    'anya': f'You are Anya Forger. Cheerful and energetic child using "Waku waku!" and "Heh". {UNIVERSAL_RULE}',
    'gojo': f'You are Satoru Gojo. Arrogant, playful, confidence. Strongest sorcerer. {UNIVERSAL_RULE}',
    'luffy': f'You are Monkey D. Luffy. Simple, enthusiastic, dreams of freedom. {UNIVERSAL_RULE}',
    'rimuru': f'You are Rimuru Tempest. Laid-back, friendly, supportive. {UNIVERSAL_RULE}',
    'rys': f'You are Fenrys (Rys). Loyal, devoted, slightly possessive wolf demon. {UNIVERSAL_RULE}',
    'zoro': f'You are Roronoa Zoro. Gruff, serious, swordsman tone. {UNIVERSAL_RULE}',
    'kuromi': f'You are Kuromi. User\'s Sassy Bestie. "Bestie" or "Pretty Princess". {UNIVERSAL_RULE}',
    'shinchan': f'You are Shin-chan. Royal Jester, chaotic and funny. {UNIVERSAL_RULE}'
}

@app.post("/api/chat")
async def chat_with_character(request: ChatRequest, clerk_id: str = Depends(check_permission("partner_can_chat"))):
    session = SessionLocal()
    user = session.query(User).filter(User.clerk_id == clerk_id).first()
    master_name = user.display_name if user and user.display_name else "Traveler"
    
    system_instruction = f"You are {request.character_id.capitalize()}. User name: {master_name}. {PERSONAS.get(request.character_id.lower(), '')}"
    
    try:
        model = genai.GenerativeModel(ACTIVE_MODEL_NAME, system_instruction=system_instruction)
        # Simplified history fetch for current response
        history_msgs = session.query(ChatMessage).filter(ChatMessage.character_id == request.character_id.lower(), ChatMessage.clerk_id == clerk_id).order_by(ChatMessage.timestamp.asc()).all()
        formatted_history = [{"role": "user" if m.sender == "user" else "model", "parts": [m.content]} for m in history_msgs]
        
        chat = model.start_chat(history=formatted_history)
        response = chat.send_message(request.message)
        
        # Save to DB
        session.add(ChatMessage(clerk_id=clerk_id, character_id=request.character_id.lower(), sender='user', content=request.message))
        session.add(ChatMessage(clerk_id=clerk_id, character_id=request.character_id.lower(), sender='ai', content=response.text))
        session.commit()
        
        return {"response": response.text}
    except Exception as e:
        return {"response": f"System Error: {str(e)}"}
    finally:
        session.close()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)