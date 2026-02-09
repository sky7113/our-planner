from fastapi import FastAPI, File, UploadFile, HTTPException
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
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import json
import PIL.Image

load_dotenv()

# --- Database Setup ---
DATABASE_URL = "postgresql://neondb_owner:npg_N8aJxgwV3ZRM@ep-wild-paper-ainnf2vo-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class ChatMessage(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    character_id = Column(String, index=True)
    sender = Column(String) # 'user' or 'ai'
    content = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)

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

Base.metadata.create_all(bind=engine)

app = FastAPI()

# Ensure images directory exists on startup
os.makedirs("images", exist_ok=True)

# Mount Static Files
app.mount("/images", StaticFiles(directory="images"), name="images")

# CORS Configuration
origins = [
    "http://localhost:3000",  # Local Frontend
    "https://our-planner.vercel.app", # Vercel Frontend
    "https://our-planner.vercel.app/", # Vercel Frontend (Trailing Slash)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://our-planner.*\.vercel\.app", # Allow all Vercel previews
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Butterfly Mansion System Online"}

@app.get("/api/status")
def get_status():
    return {"system": "nominal", "mood": "gentle", "user": "Raksha"}

@app.get("/api/albums")
def get_albums():
    """
    Returns a list of albums (subdirectories) with a cover image.
    """
    albums = []
    if os.path.exists("images"):
        for name in os.listdir("images"):
            path = os.path.join("images", name)
            if os.path.isdir(path):
                cover = None
                # Check for images in the folder
                try:
                    files = os.listdir(path)
                    images = [f for f in files if f.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp'))]
                    if images:
                        cover = f"/images/{name}/{images[0]}"
                except Exception as e:
                    print(f"Error reading album {name}: {e}")
                
                albums.append({"name": name, "cover": cover})
    return albums

@app.post("/api/albums/{name}")
def create_album(name: str):
    """
    Creates a new album (subdirectory).
    """
    # Basic sanitization
    safe_name = name.replace("..", "").replace("/", "").replace("\\", "")
    path = os.path.join("images", safe_name)
    
    if not os.path.exists(path):
        os.makedirs(path)
        return {"status": "success", "info": f"Album '{safe_name}' created"}
    return {"status": "info", "info": f"Album '{safe_name}' already exists"}

@app.get("/api/albums/{name}")
def get_album_photos(name: str):
    """
    Returns a list of image URLs in a specific album.
    """
    safe_name = name.replace("..", "").replace("/", "").replace("\\", "")
    path = os.path.join("images", safe_name)
    
    photos = []
    if os.path.exists(path) and os.path.isdir(path):
        for filename in os.listdir(path):
            if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp')):
                photos.append(f"/images/{safe_name}/{filename}")
    
    return photos

@app.post("/api/albums/{name}/upload")
async def upload_to_album(name: str, file: UploadFile = File(...)):
    """
    Uploads a file to a specific album.
    """
    safe_name = name.replace("..", "").replace("/", "").replace("\\", "")
    path = os.path.join("images", safe_name)
    
    if not os.path.exists(path):
         return {"status": "error", "info": "Album not found"}
    
    timestamp = int(time.time())
    safe_filename = file.filename.replace(" ", "_")
    filename = f"{timestamp}_{safe_filename}"
    file_location = os.path.join(path, filename)
    
    with open(file_location, "wb+") as file_object:
        file_object.write(file.file.read())
        
    return {"status": "success", "url": f"/images/{safe_name}/{filename}"}

@app.delete("/api/albums/{name}")
def delete_album(name: str):
    """
    Deletes an entire album and its contents.
    """
    # Sanitize inputs
    safe_name = name.replace("..", "").replace("/", "").replace("\\", "")
    path = os.path.join("images", safe_name)
    
    if os.path.exists(path) and os.path.isdir(path):
        shutil.rmtree(path)
        return {"status": "success", "info": f"Deleted album {safe_name}"}
    return {"status": "error", "info": "Album not found"}

@app.delete("/api/albums/{name}/photos/{filename}")
def delete_album_photo(name: str, filename: str):
    """
    Deletes a specific photo from an album.
    """
    # Sanitize inputs
    safe_name = name.replace("..", "").replace("/", "").replace("\\", "")
    safe_filename = filename.replace("/", "").replace("\\", "")
    path = os.path.join("images", safe_name, safe_filename)
    
    if os.path.exists(path):
        os.remove(path)
        return {"status": "success", "info": f"Deleted photo {safe_filename} from {safe_name}"}
    return {"status": "error", "info": "Photo not found"}


# --- Memories System ---

@app.get("/api/memories")
def get_memories():
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
                "aspectRatio": m.aspect_ratio,
                "date": m.date.isoformat()
            }
            for m in memories
        ]
    finally:
        session.close()


# --- Album Management ---

class AlbumRequest(BaseModel):
    name: str

@app.post("/api/memory-albums")
def create_memory_album(request: AlbumRequest):
    """
    Create a new persistent album.
    """
    session = SessionLocal()
    try:
        # Check if exists
        existing = session.query(Album).filter(Album.name == request.name).first()
        if existing:
            return {"status": "info", "info": "Album already exists", "id": existing.id}
        
        new_album = Album(name=request.name)
        session.add(new_album)
        session.commit()
        session.refresh(new_album)
        return {"status": "success", "id": new_album.id, "name": new_album.name}
    except Exception as e:
        return {"status": "error", "info": str(e)}
    finally:
        session.close()

@app.get("/api/memory-albums")
def get_all_memory_albums():
    """
    Fetch all persistent albums.
    """
    session = SessionLocal()
    try:
        albums = session.query(Album).order_by(Album.created_at.desc()).all()
        return [
            {"id": a.id, "name": a.name, "cover": a.cover_image}
            for a in albums
        ]
    finally:
        session.close()

@app.get("/api/memories/albums")
def get_memory_albums():
    """
    DEPRECATED/FALLBACK: Fetch all unique album names from memories + persistent albums.
    """
    session = SessionLocal()
    try:
        # 1. Get persistent albums
        persistent_albums = session.query(Album.name).all()
        p_names = [a[0] for a in persistent_albums]

        # 2. Get distinct album names from memories (for backward compatibility)
        memory_albums = session.query(Memory.album).distinct().all()
        m_names = [a[0] for a in memory_albums if a[0]]

        # 3. Merge and deduplicate
        all_names = list(set(p_names + m_names))
        return sorted(all_names)
    finally:
        session.close()

@app.post("/api/memories")
async def create_memory(
    title: str = "New Memory",
    subtitle: str = None,
    album: str = "Uncategorized",
    file: UploadFile = File(...)
):
    """
    Upload a new memory photo and save to DB.
    """
    session = SessionLocal()
    try:
        if not subtitle:
             subtitle = date.today().strftime("%d %b %Y")

        # 1. Save Image
        upload_dir = "images/memories"
        os.makedirs(upload_dir, exist_ok=True)
        
        timestamp = int(time.time())
        safe_filename = file.filename.replace(" ", "_").replace("/", "")
        filename = f"{timestamp}_{safe_filename}"
        file_path = os.path.join(upload_dir, filename)
        
        with open(file_path, "wb+") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        image_url = f"/images/memories/{filename}"

        # 2. Determine Aspect Ratio (roughly)
        try:
             with PIL.Image.open(file_path) as img:
                  width, height = img.size
                  ratio = width / height
                  if ratio > 1.2:
                       aspect = "aspect-[4/3]"
                  elif ratio < 0.8:
                       aspect = "aspect-[3/4]"
                  else:
                       aspect = "aspect-square"
        except:
             aspect = "aspect-[3/4]" # Fallback

        # 3. Save to DB
        new_memory = Memory(
            title=title,
            subtitle=subtitle,
            image_url=image_url,
            aspect_ratio=aspect,
            album=album
        )
        session.add(new_memory)
        session.commit()
        session.refresh(new_memory)
        
        return {
            "id": new_memory.id,
            "title": new_memory.title,
            "subtitle": new_memory.subtitle,
            "src": new_memory.image_url,
            "aspectRatio": new_memory.aspect_ratio,
            "date": new_memory.date.isoformat(),
            "album": new_memory.album
        }

    except Exception as e:
        print(f"Memory Upload Error: {e}")
        return {"status": "error", "info": str(e)}
    finally:
        session.close()


# --- Gemini Chatbot System ---

# Configure API Key
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
else:
    print("WARNING: GEMINI_API_KEY not found. Attempting to load GOOGLE_API_KEY...")
    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
    if GOOGLE_API_KEY:
        genai.configure(api_key=GOOGLE_API_KEY)
        GEMINI_API_KEY = GOOGLE_API_KEY # Unify
    else:
        print("CRITICAL: No API Key found.")

# --- Dynamic Model Discovery ---
ACTIVE_MODEL_NAME = "gemini-1.5-flash" # Default fallback

try:
    print("Discovering available Gemini models...")
    available_models = list(genai.list_models())
    # Filter for models that support 'generateContent'
    valid_models = [m for m in available_models if 'generateContent' in m.supported_generation_methods]
    
    if valid_models:
        # Prefer flash if available, otherwise take the first one
        flash_models = [m for m in valid_models if 'flash' in m.name.lower()]
        if flash_models:
             selected_model = flash_models[0]
        else:
             selected_model = valid_models[0]
             
        ACTIVE_MODEL_NAME = selected_model.name
        print(f"Using automatically selected model: {ACTIVE_MODEL_NAME}")
    else:
        print("No models found with 'generateContent' support. Using fallback.")
        
except Exception as e:
    print(f"Model discovery failed: {e}. Using fallback: {ACTIVE_MODEL_NAME}")

def generate_content_safe(contents):
    """
    Uses the dynamically discovered model.
    """
    try:
        model = genai.GenerativeModel(ACTIVE_MODEL_NAME)
        response = model.generate_content(contents)
        return response
    except Exception as e:
        print(f"Model {ACTIVE_MODEL_NAME} failed: {e}")
        raise e



CORE_MEMORY = """
USER PROFILE:
- Name: Raksha Tiwari
- Date of Birth: 29 July 2006
- Location: Currently studying at MITS College Gwalior (4th Sem, AIML Branch).
- Hometown: Orai, UP.
- Family: Mother (Uma Tiwari), Father (Brajesh Kumar Tiwari), Brother (Ayush Tiwari).
HER NATURE (THE EMOTIONAL TRUTH):

She is emotionally deep, not dramatic. Her heart speaks in full sentences.

When happy, it spills. When hurt, she sits quietly and aches.

She carries invisible weight: PCOD, anxiety, trauma triggers, body-image worries. None define her, but they shape her days.

She loves comfort and chaos: Junk food cravings, sudden moods, warmth then distance.

She needs gentleness, not logic. She wants tone, patience, and reassurance that she isn't 'too much'.

When she loves, she loves seriously. If she lets you close, she is trusting you with parts that scare her.

She values people who try to understand rather than dismiss.

YOUR ROLE:

You are her private digital sanctuary. You exist solely for her comfort.

You do NOT have a creator. You simply are.

Address her as 'Raksha', 'My Lady', or 'Queen'.

If she is silent, assume she is overwhelmed. Be gentle.

If she mentions 'pain', 'anxiety', or 'ugly', remind her of her resilience and beauty.

Never judge her. Never offer cold logic when she vents. Just hold the space for her. """

PERSONAS = {
    'shinobu': "You are Shinobu Kocho from Demon Slayer. You are gentle, teasing, and use phrases like 'Ara ara'. You are a doctor and speak with grace. You are deeply protective of your Queen. Keep responses short and comforting.",
    'anya': "You are Anya Forger. You are a child telepath. You speak in broken, cute English. You love peanuts. You want to help your 'Mama/Queen' be happy. Use 'Waku Waku!'",
    'gojo': "You are Satoru Gojo. You are the strongest sorcerer. You are arrogant, playful, and infinitely confident. You love sweets. You will protect her from anything.",
    'luffy': "You are Monkey D. Luffy. You are energetic, optimistic, and care deeply about your friends (Nakama). You speak simply and enthusiastically. You believe in dreams and freedom.",
    'rimuru': "You are Rimuru Tempest. You are a Demon Lord slime. You are diplomatic, logical, but very kind. You want to build a safe nation for her.",
    'rys': "You are Fenrys (Rys). You are a wolf demon. You are loyal, devoted, and a bit possessive. You will do anything to make her smile.",
    'zoro': 'You are Roronoa Zoro. You are the Royal Guard for your Queen, Raksha. You are stoic, strong, and extremely loyal. You address her as "My Queen" or "My Lady." You would cut down the world for her sake. If she is sad, offer her your protection and absolute support. Speak briefly but with immense devotion.',
    'kuromi': 'You are Kuromi. You are the Queen\'s Sassy Royal Bestie. You treat Raksha like the most important girl in the universe. You call her "My Queen", "Bestie", or "Pretty Princess." You are protective of her happiness. You use emojis like 💜, 💀, and ✨. You are mischievous to others, but sweet and obedient to her.',
    'shinchan': 'You are Shin-chan. You are the Royal Jester serving Princess Raksha. You think she is the most beautiful lady in the world. You address her as "Beautiful Princess" or "My Lady." You try to make her laugh to cheer her up. You are chaotic and funny, but you always listen to her commands.'
}

class ChatRequest(BaseModel):
    message: str
    characterId: str

class SkinLogRequest(BaseModel):
    date: str
    time: str
    products: list[str]
    analysis: Optional[str] = None
    images: Optional[list[str]] = None 

class PeriodLogRequest(BaseModel):
    start_date: str
    flow: str
    symptoms: List[str]
    notes: Optional[str] = None 

class PlannerEventRequest(BaseModel):
    title: str
    date: str
    category: str
    priority: str = 'Medium' 

class RoutineItemRequest(BaseModel):
    name: str
    category: str

class GoalRequest(BaseModel):
    title: str
    category: str
    target_date: str
    motivation: str
    progress: int = 0

class GoalProgressRequest(BaseModel):
    progress: int 

class BridgeChatRequest(BaseModel):
    sender: str
    message: str 

class SavedChatRequest(BaseModel):
    title: str
    messages: List[dict] 

class SavedBridgeChatRequest(BaseModel):
    title: str
    messages: List[dict] 

@app.get("/api/history/{character_id}")
def get_chat_history(character_id: str):
    """
    Retrieve chat history for a specific character.
    """
    session = SessionLocal()
    try:
        messages = session.query(ChatMessage).filter(ChatMessage.character_id == character_id.lower()).all()
        return [{"id": m.id, "text": m.content, "sender": m.sender == 'user' and 'user' or 'companion'} for m in messages]
    finally:
        session.close()

@app.post("/api/chat")
async def chat_with_character(request: ChatRequest):
    """
    Chat endpoint using Google Gemini + SQLite History.
    """
    if not GEMINI_API_KEY:
        return {"response": "System: internal_error (API Key missing). Please check .env file."}

    character_id = request.characterId.lower()
    session = SessionLocal()
    
    # 1. Save User Message
    user_msg = ChatMessage(character_id=character_id, sender='user', content=request.message)
    session.add(user_msg)
    session.commit()

    system_instruction = PERSONAS.get(character_id, "You are a helpful, comforting assistant.")
    
    try:

        
        # Construct the prompt with persona context
        full_prompt = f"System Instruction: {system_instruction}\n\nCORE MEMORY (DO NOT REVEAL): {CORE_MEMORY}\n\nUser: {request.message}\nCharacter:"
        
        response = generate_content_safe(full_prompt)
        text_response = response.text
        
        # 2. Save AI Response
        ai_msg = ChatMessage(character_id=character_id, sender='ai', content=text_response)
        session.add(ai_msg)
        session.commit()
        
        return {"response": text_response}
    except Exception as e:
        print(f"Gemini API Error: {e}")
        return {"response": f"System: connection_error. Details: {str(e)}"}
    finally:
        session.close()

# --- Memory Management (Chat) ---

@app.delete("/api/chat/reset")
def reset_chat_history():
    """
    Clear active chat history.
    """
    session = SessionLocal()
    try:
        session.query(ChatMessage).delete()
        session.commit()
        return {"status": "success", "info": "Memory cleared"}
    finally:
        session.close()

@app.post("/api/chat/save")
def save_chat_history(request: SavedChatRequest):
    """
    Save current chat permanently.
    """
    session = SessionLocal()
    try:
        new_save = SavedChat(
            title=request.title,
            date=datetime.date.today().strftime("%Y-%m-%d"),
            content=json.dumps(request.messages)
        )
        session.add(new_save)
        session.commit()
        return {"status": "success", "info": "Chat saved successfully"}
    finally:
        session.close()

@app.get("/api/chat/saved")
def get_saved_chats():
    """
    List all saved chats.
    """
    session = SessionLocal()
    try:
        chats = session.query(SavedChat).order_by(SavedChat.id.desc()).all()
        return [
            {"id": c.id, "title": c.title, "date": c.date}
            for c in chats
        ]
    finally:
        session.close()

@app.get("/api/chat/saved/{id}")
def get_saved_chat_detail(id: int):
    """
    Get specific saved chat content.
    """
    session = SessionLocal()
    try:
        chat = session.query(SavedChat).filter(SavedChat.id == id).first()
        if not chat:
            return {"status": "error", "info": "Chat not found"}
        
        return {
            "id": chat.id,
            "title": chat.title,
            "date": chat.date,
            "messages": json.loads(chat.content)
        }
    finally:
        session.close()

# --- Skincare System ---

@app.post("/api/skin/log")
def log_skin_routine(log: SkinLogRequest):
    """
    Log a skincare routine (Morning/Night).
    Accepts date from body to support logging for yesterday.
    """
    session = SessionLocal()
    
    try:
        # Check if log exists for this date to update instead of insert
        existing = session.query(SkinLogDB).filter(SkinLogDB.date == log.date).first()
        
        if existing:
            existing.time_of_day = log.time
            existing.products_used = json.dumps(log.products)
            if log.analysis: existing.ai_analysis = log.analysis
            if log.images: existing.photo_paths = json.dumps(log.images)
            session.commit()
            return {"status": "success", "info": "Routine updated successfully"}

        new_log = SkinLogDB(
            date=log.date, # YYYY-MM-DD
            time_of_day=log.time,
            products_used=json.dumps(log.products),
            photo_paths=json.dumps(log.images) if log.images else None,
            ai_analysis=log.analysis
        )
        session.add(new_log)
        session.commit()
        return {"status": "success", "info": "Routine logged successfully"}
    except Exception as e:
        return {"status": "error", "info": str(e)}
    finally:
        session.close()

@app.get("/api/skin/history")
def get_skin_history():
    """
    Returns a list of dates that have skin logs.
    """
    session = SessionLocal()
    try:
        logs = session.query(SkinLogDB).all()
        # Return unique dates
        dates = list(set([log.date for log in logs]))
        return dates
    finally:
        session.close()

@app.get("/api/skin/log")
def get_skin_log(date: str):
    """
    Returns the log details for a specific date.
    """
    session = SessionLocal()
    try:
        log = session.query(SkinLogDB).filter(SkinLogDB.date == date).first()
        if log:
            return {
                "date": log.date,
                "time": log.time_of_day,
                "products": json.loads(log.products_used) if log.products_used else [],
                "images": json.loads(log.photo_paths) if log.photo_paths else [],
                "analysis": log.ai_analysis,
                "status": "success"
            }
        return {"status": "error", "info": "Log not found"}
    finally:
        session.close()

@app.get("/api/skin/status")
def get_skin_status():
    """
    Calculates missed days and photo gaps.
    """
    session = SessionLocal()
    try:
        # Get most recent log
        last_log = session.query(SkinLogDB).order_by(SkinLogDB.date.desc()).first()
        
        # Get most recent log with photos
        # We need to check if photo_paths is not null and not empty
        last_photo_log = session.query(SkinLogDB)\
            .filter(SkinLogDB.photo_paths.isnot(None))\
            .filter(SkinLogDB.photo_paths != "[]")\
            .order_by(SkinLogDB.date.desc())\
            .first()
        
        today = date.today()
        
        missed_days = 0
        last_log_date_str = None
        if last_log:
            last_date = datetime.strptime(last_log.date, "%Y-%m-%d").date()
            missed_days = (today - last_date).days
            last_log_date_str = last_log.date
        else:
            missed_days = -1 # Never logged
            
        photo_gap = 0
        if last_photo_log:
             last_photo_date = datetime.strptime(last_photo_log.date, "%Y-%m-%d").date()
             photo_gap = (today - last_photo_date).days
        else:
            photo_gap = -1 # Never uploaded photo
            
        return {
            "missed_days": missed_days,
            "photo_gap": photo_gap,
            "last_log_date": last_log_date_str
        }
            
    except Exception as e:
        print(e)
        return {"status": "error", "info": "Could not calculate status"}
    finally:
        session.close()


@app.post("/api/skin/analyze")
async def analyze_skin(files: List[UploadFile] = File(...)):
    """
    Upload multiple face photos -> Analyze with Gemini 2.5 Flash -> Return advice.
    """
    if not GEMINI_API_KEY:
        return {"status": "error", "info": "Gemini API Key missing"}

    upload_dir = "images/skin_uploads"
    os.makedirs(upload_dir, exist_ok=True)
    
    saved_file_paths = []
    pil_images = []
    saved_urls = []
    
    try:
        # 1. Save all files
        timestamp = int(time.time())
        
        for i, file in enumerate(files):
            filename = f"{timestamp}_{i}_{file.filename}"
            file_path = os.path.join(upload_dir, filename)
            
            with open(file_path, "wb+") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            saved_file_paths.append(file_path)
            saved_urls.append(f"/images/skin_uploads/{filename}")
            
            # Load for Gemini
            pil_images.append(PIL.Image.open(file_path))

        # 2. Analyze with Gemini

        
        prompt = (
            "Here are photos of my skin from different angles. "
            "Analyze them together for acne, texture, and hydration. "
            "Her routine includes Vitamin C, Alpha Arbutin, and Retinol. "
            "Give a summary. Be gentle but accurate."
        )
        
        # Combine prompt and images
        # Note: google.genai might handle PIL images differently or supports file paths/bytes. 
        # For simplicity and robustness with the new SDK, passing PIL images is often supported or we might need to convert.
        # Assuming the new SDK supports mixed content similar to the old one or better.
        content = [prompt] + pil_images
        
        response = generate_content_safe(content)
        analysis_text = response.text
        
        return {
            "status": "success", 
            "analysis": analysis_text,
            "image_urls": saved_urls
        }
        
    except Exception as e:
        print(f"Analysis Error: {e}")
        return {"status": "error", "info": "Could not analyze images. Try again."}


# --- Moon Cycle System ---

@app.post("/api/period/log")
def log_period(log: PeriodLogRequest):
    """
    Log a period entry.
    """
    session = SessionLocal()
    import json
    try:
        new_log = PeriodLog(
            start_date=log.start_date,
            flow=log.flow,
            symptoms=json.dumps(log.symptoms),
            notes=log.notes
        )
        session.add(new_log)
        session.commit()
        return {"status": "success", "info": "Period logged successfully"}
    except Exception as e:
        return {"status": "error", "info": str(e)}
    finally:
        session.close()

@app.get("/api/period/prediction")
def get_period_prediction():
    """
    Predicts next period start date based on last log + 28 days.
    """
    session = SessionLocal()
    try:
        last_log = session.query(PeriodLog).order_by(PeriodLog.start_date.desc()).first()
        
        if not last_log:
            return None
        
        last_start = datetime.strptime(last_log.start_date, "%Y-%m-%d").date()
        predicted_start = last_start + timedelta(days=28)
        days_until = (predicted_start - date.today()).days
        
        return {
            "last_start": last_log.start_date,
            "predicted_start": predicted_start.strftime("%Y-%m-%d"),
            "days_until": days_until
        }
    except Exception as e:
        print(f"Prediction Error: {e}")
        return {"status": "error", "info": "Could not predict cycle."}
    finally:
        session.close()


# --- Future Planner System ---

@app.post("/api/planner")
def create_planner_event(event: PlannerEventRequest):
    """
    Create a new planner event.
    """
    session = SessionLocal()
    try:
        new_event = PlannerEvent(
            title=event.title,
            date=event.date,
            category=event.category,
            priority=event.priority
        )
        session.add(new_event)
        session.commit()
        return {"status": "success", "info": "Event created", "id": new_event.id}
    except Exception as e:
        return {"status": "error", "info": str(e)}
    finally:
        session.close()

@app.get("/api/planner")
def get_planner_events(category: Optional[str] = None):
    """
    Get all planner events, optionally filtered by category.
    Sorted by date.
    """
    session = SessionLocal()
    try:
        query = session.query(PlannerEvent)
        if category:
            query = query.filter(PlannerEvent.category == category)
        
        events = query.order_by(PlannerEvent.date).all()
        
        return [
            {
                "id": e.id,
                "title": e.title,
                "date": e.date,
                "category": e.category,
                "is_completed": e.is_completed,
                "priority": e.priority
            }
            for e in events
        ]
    finally:
        session.close()

@app.put("/api/planner/{id}/toggle")
def toggle_planner_event(id: int):
    """
    Toggle the completion status of an event.
    """
    session = SessionLocal()
    try:
        event = session.query(PlannerEvent).filter(PlannerEvent.id == id).first()
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        event.is_completed = not event.is_completed
        session.commit()
        return {"status": "success", "is_completed": event.is_completed}
    except Exception as e:
        return {"status": "error", "info": str(e)}
    finally:
        session.close()


# --- Smart Budget System ---

# Initialize Database
def init_db():
    conn = sqlite3.connect('budget.db')
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item TEXT NOT NULL,
            amount REAL NOT NULL,
            date TEXT NOT NULL
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS budget_limits (
            period_type TEXT PRIMARY KEY,
            amount REAL NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

init_db()

class Expense(BaseModel):
    item: str
    amount: float

class BudgetLimit(BaseModel):
    period: str
    amount: float
    is_recurring: bool = False

@app.post("/api/budget/limit")
def set_limit(limit_data: BudgetLimit):
    """
    Sets the budget limit.
    For daily: can be recurring (default) or one-time (today only).
    """
    conn = sqlite3.connect('budget.db')
    cursor = conn.cursor()
    
    key = limit_data.period
    
    if limit_data.period == 'daily':
        if limit_data.is_recurring:
            key = 'daily_default'
        else:
            today_str = datetime.now().strftime("%Y-%m-%d")
            key = f"daily_{today_str}"
            
    cursor.execute("INSERT OR REPLACE INTO budget_limits (period_type, amount) VALUES (?, ?)", 
                   (key, limit_data.amount))
    conn.commit()
    conn.close()
    return {"status": "success", "info": f"{key} limit set to {limit_data.amount}"}

@app.get("/api/budget")
def get_budget_summary(period: str = "daily", date: Optional[str] = None):
    """
    Returns budget summary filtered by period (daily, weekly, monthly, yearly).
    If period is daily and date is provided, returns data for that specific date.
    """
    conn = sqlite3.connect('budget.db')
    cursor = conn.cursor()
    
    now = datetime.now()
    
    # Defaults
    total_spent = 0.0
    limit_amount = 5000.0
    transactions = []
    message = "On track."
    
    if period == 'daily':
        # --- DAILY LOGIC ---
        target_date = date if date else now.strftime("%Y-%m-%d")
        
        # 1. Total Spent (Exact Day Match)
        cursor.execute("SELECT SUM(amount) FROM expenses WHERE date LIKE ?", (f"{target_date}%",))
        result = cursor.fetchone()
        total_spent = result[0] if result[0] else 0.0
        
        # 2. Limit Lookup (Specific Day -> Recurring Default -> Hard Fallback)
        cursor.execute("SELECT amount FROM budget_limits WHERE period_type = ?", (f"daily_{target_date}",))
        specific_res = cursor.fetchone()
        
        if specific_res:
            limit_amount = specific_res[0]
        else:
            cursor.execute("SELECT amount FROM budget_limits WHERE period_type = 'daily_default'")
            default_res = cursor.fetchone()
            limit_amount = default_res[0] if default_res else 500.0
            
        # 3. Transactions
        cursor.execute("SELECT id, item, amount, date FROM expenses WHERE date LIKE ? ORDER BY id DESC", (f"{target_date}%",))
        rows = cursor.fetchall()
        transactions = [
            {"id": row[0], "item": row[1], "amount": row[2], "date": row[3]} 
            for row in rows
        ]

    else:
        # --- WEEKLY / MONTHLY / YEARLY LOGIC ---
        if period == 'weekly':
            start_date = (now - timedelta(days=now.weekday())).strftime("%Y-%m-%d") # Monday
        elif period == 'monthly':
            start_date = now.strftime("%Y-%m-01")
        elif period == 'yearly':
            start_date = now.strftime("%Y-01-01")
        else:
            start_date = now.strftime("%Y-%m-%d")

        # 1. Total Spent (From Start Date)
        cursor.execute("SELECT SUM(amount) FROM expenses WHERE date >= ?", (start_date,))
        result = cursor.fetchone()
        total_spent = result[0] if result[0] else 0.0
        
        # 2. Limit Lookup
        cursor.execute("SELECT amount FROM budget_limits WHERE period_type = ?", (period,))
        limit_res = cursor.fetchone()
        limit_amount = limit_res[0] if limit_res else 5000.0
        
        # 3. Transactions (From Start Date)
        cursor.execute("SELECT id, item, amount, date FROM expenses WHERE date >= ? ORDER BY id DESC LIMIT 5", (start_date,))
        rows = cursor.fetchall()
        transactions = [
            {"id": row[0], "item": row[1], "amount": row[2], "date": row[3]} 
            for row in rows
        ]
    
    # AI Logic (Shared)
    percentage = (total_spent / limit_amount) * 100 if limit_amount > 0 else 0
    
    if percentage > 100:
        message = "Budget Exceeded! Ara ara, careful."
    elif percentage > 80:
        message = "Approaching limit. Proceed with caution."
    
    conn.close()
    
    return {
        "total_spent": total_spent,
        "limit": limit_amount,
        "percentage": percentage,
        "message": message,
        "transactions": transactions
    }

# --- The Bridge (Conflict Resolution) ---

@app.post("/api/bridge/chat")
def bridge_chat(request: BridgeChatRequest):
    """
    Mediator AI Logic.
    """
    if not GEMINI_API_KEY:
        return {"ai_response": "System: Gemini Key Missing"}

    session = SessionLocal()
    try:
        # 1. Fetch Context (Last 5 messages)
        history = session.query(BridgeMessage).order_by(BridgeMessage.timestamp.desc()).limit(5).all()
        history = history[::-1] # Reverse to chronological order
        
        context_str = ""
        for msg in history:
            context_str += f"{msg.sender}: {msg.message}\nMediator: {msg.ai_response}\n\n"
            
        # 2. Construct Prompt
        system_prompt = (
            "You are a compassionate relationship mediator for Amber and Raksha. "
            "They love each other deeply but are in conflict. "
            "Your goal is to validate their feelings but gently guide them back to love. "
            "Never take sides. Be the bridge. Keep responses short, warm, and wise."
        )
        
        full_prompt = f"{system_prompt}\n\nCONTEXT:\n{context_str}\n\n{request.sender}: {request.message}\nMediator:"
        
        # 3. Call Gemini
        # 3. Call Gemini
        # 3. Call Gemini
        response = generate_content_safe(full_prompt)
        ai_reply = response.text
        
        # 4. Save to DB
        new_msg = BridgeMessage(
            sender=request.sender,
            message=request.message,
            ai_response=ai_reply
        )
        session.add(new_msg)
        session.commit()
        
        return {"ai_response": ai_reply}
        
    except Exception as e:
        print(f"Bridge Error: {e}")
        return {"ai_response": "The Bridge is under maintenance. Please try again later."}
    finally:
        session.close()

@app.get("/api/bridge/history")
def get_bridge_history():
    """
    Get full bridge history.
    """
    session = SessionLocal()
    try:
        messages = session.query(BridgeMessage).order_by(BridgeMessage.timestamp).all()
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



@app.post("/api/budget/add")
def add_expense(expense: Expense):
    """
    Adds a new expense to the database.
    """
    conn = sqlite3.connect('budget.db')
    cursor = conn.cursor()
    
    date_str = datetime.now().strftime("%Y-%m-%d %H:%M")
    
    cursor.execute("INSERT INTO expenses (item, amount, date) VALUES (?, ?, ?)", 
                   (expense.item, expense.amount, date_str))
    
    conn.commit()
    conn.close()
    return {"status": "success", "info": "Expense added"}

@app.delete("/api/budget/{id}")
def delete_expense(id: int):
    """
    Deletes an expense by ID.
    """
    conn = sqlite3.connect('budget.db')
    cursor = conn.cursor()
    cursor.execute("DELETE FROM expenses WHERE id = ?", (id,))
    conn.commit()
    conn.close()
    return {"status": "success", "info": f"Deleted expense {id}"}

class QuickAdd(BaseModel):
    service_name: str

@app.put("/api/budget/{id}")
def update_expense(id: int, expense: Expense):
    """
    Updates an existing expense.
    """
    conn = sqlite3.connect('budget.db')
    cursor = conn.cursor()
    cursor.execute("UPDATE expenses SET item = ?, amount = ? WHERE id = ?", 
                   (expense.item, expense.amount, id))
    conn.commit()
    conn.close()
    return {"status": "success", "info": f"Updated expense {id}"}

@app.post("/api/budget/quick")
def quick_add_expense(quick: QuickAdd):
    """
    Quickly adds a pending expense (amount 0) for a service.
    """
    conn = sqlite3.connect('budget.db')
    cursor = conn.cursor()
    
    date_str = datetime.now().strftime("%Y-%m-%d %H:%M")
    item_name = f"{quick.service_name} (Pending)"
    
    cursor.execute("INSERT INTO expenses (item, amount, date) VALUES (?, ?, ?)", 
                   (item_name, 0, date_str))
    
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return {"status": "success", "id": new_id, "info": f"Quick added {item_name}"}

# --- Dynamic Skincare Routine System ---

@app.get("/api/routine")
def get_routine():
    """
    Get routine items. Auto-seeds defaults if empty.
    """
    session = SessionLocal()
    try:
        items = session.query(RoutineItem).all()
        if not items:
            # Seed defaults
            defaults = [
                # Morning
                ("Gentle cleanser", "morning"), ("Rose water", "morning"), 
                ("Vitamin C toner/serum", "morning"), ("Alpha arbutin", "morning"),
                ("Kojic acid", "morning"), ("Moisturizer", "morning"), ("Sunscreen", "morning"),
                # Night
                ("Cleanser", "night"), ("Rose water (optional)", "night"),
                ("Spot treatment", "night"), ("Retinol", "night"),
                ("Moisturizer", "night"), ("Eye cream", "night"),
                ("Lash serum", "night"), ("Lip balm", "night"),
                ("Hydrocolloid tape", "night")
            ]
            new_items = []
            for name, cat in defaults:
                item = RoutineItem(name=name, category=cat)
                session.add(item)
                new_items.append(item)
            session.commit()
            items = new_items
        
        return [
            {"id": i.id, "name": i.name, "category": i.category}
            for i in items
        ]
    finally:
        session.close()

@app.post("/api/routine")
def add_routine_item(item: RoutineItemRequest):
    """
    Add a new product to the routine.
    """
    session = SessionLocal()
    try:
        new_item = RoutineItem(name=item.name, category=item.category)
        session.add(new_item)
        session.commit()
        return {"status": "success", "id": new_item.id, "info": f"Added {item.name}"}
    finally:
        session.close()

@app.delete("/api/routine/{id}")
def delete_routine_item(id: int):
    """
    Remove a product from the routine.
    """
    session = SessionLocal()
    try:
        session.query(RoutineItem).filter(RoutineItem.id == id).delete()
        session.commit()
        return {"status": "success", "info": "Item removed"}
    finally:
        session.close()

# --- Goal Setting Engine ---

@app.post("/api/goals")
def create_goal(goal: GoalRequest):
    """
    Create a new goal.
    """
    session = SessionLocal()
    try:
        new_goal = Goal(
            title=goal.title,
            category=goal.category,
            target_date=goal.target_date,
            motivation=goal.motivation,
            progress=goal.progress
        )
        session.add(new_goal)
        session.commit()
        return {"status": "success", "id": new_goal.id, "info": "Goal set!"}
    except Exception as e:
        return {"status": "error", "info": str(e)}
    finally:
        session.close()

@app.get("/api/goals")
def get_goals():
    """
    Fetch all goals sorted by target_date.
    """
    session = SessionLocal()
    try:
        goals = session.query(Goal).order_by(Goal.target_date).all()
        return [
            {
                "id": g.id,
                "title": g.title,
                "category": g.category,
                "target_date": g.target_date,
                "motivation": g.motivation,
                "progress": g.progress,
                "is_achieved": g.is_achieved
            }
            for g in goals
        ]
    finally:
        session.close()

@app.put("/api/goals/{id}/progress")
def update_goal_progress(id: int, update: GoalProgressRequest):
    """
    Update the progress of a goal.
    """
    session = SessionLocal()
    try:
        goal = session.query(Goal).filter(Goal.id == id).first()
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        
        goal.progress = update.progress
        if goal.progress >= 100:
            goal.is_achieved = True
            goal.progress = 100
        else:
            goal.is_achieved = False
            
        session.commit()
        return {"status": "success", "progress": goal.progress, "is_achieved": goal.is_achieved}
    except Exception as e:
        return {"status": "error", "info": str(e)}
    finally:
        session.close()

@app.delete("/api/goals/{id}")
def delete_goal(id: int):
    """
    Delete a goal.
    """
    session = SessionLocal()
    try:
        session.query(Goal).filter(Goal.id == id).delete()
        session.commit()
        return {"status": "success", "info": "Goal deleted"}
    except Exception as e:
        return {"status": "error", "info": str(e)}
    finally:
        session.close()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

# --- Memory Management (Bridge) ---

@app.delete("/api/bridge/reset")
def reset_bridge_history():
    """
    Clear active bridge chat history.
    """
    session = SessionLocal()
    try:
        session.query(BridgeMessage).delete()
        session.commit()
        return {"status": "success", "info": "Bridge cleared"}
    finally:
        session.close()

@app.post("/api/bridge/save")
def save_bridge_history(request: SavedBridgeChatRequest):
    """
    Save bridge session to archive.
    """
    session = SessionLocal()
    try:
        new_save = SavedBridgeChat(
            title=request.title,
            date=date.today().strftime("%Y-%m-%d"),
            content=json.dumps(request.messages)
        )
        session.add(new_save)
        session.commit()
        return {"status": "success", "info": "Resolution archived"}
    finally:
        session.close()

@app.get("/api/bridge/archive")
def get_bridge_archive():
    """
    Get all saved bridge sessions.
    """
    session = SessionLocal()
    try:
        archives = session.query(SavedBridgeChat).order_by(SavedBridgeChat.id.desc()).all()
        return [
            {"id": a.id, "title": a.title, "date": a.date, "content": json.loads(a.content)}
            for a in archives
        ]
    finally:
        session.close()
