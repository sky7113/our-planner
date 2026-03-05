from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Header
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

# Forward declaration for dependency
def get_current_user_clerk_id(x_clerk_user_id: Optional[str] = Header(None)):
    if not x_clerk_user_id:
        raise HTTPException(status_code=401, detail="Missing X-Clerk-User-Id header")
    return x_clerk_user_id

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

Base.metadata.create_all(bind=engine)

try:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN display_name VARCHAR"))
except Exception as e:
    pass

try:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN partner_nickname VARCHAR"))
except Exception as e:
    pass

try:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN date_of_birth VARCHAR"))
except Exception as e:
    pass

try:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN gender VARCHAR"))
except Exception as e:
    pass

try:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE users DROP COLUMN hometown"))
except Exception as e:
    pass

try:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN college_or_profession VARCHAR"))
except Exception as e:
    pass

app = FastAPI()

# Ensure images directory exists on startup
os.makedirs("images", exist_ok=True)

# Mount Static Files
app.mount("/images", StaticFiles(directory="images"), name="images")

# CORS Configuration
origins = [
    "http://localhost:3000",  # Local Frontend
    "http://127.0.0.1:3000",  # Local IP Frontend
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
@app.head("/")
def read_root():
    return {"status": "ok", "message": "Server is awake!"}

@app.get("/api/status")
def get_status():
    return {"system": "nominal", "mood": "gentle", "user": "Raksha"}

@app.get("/api/reset_db")
def reset_database():
    # Delete old tables and create new ones with correct columns
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    return {"message": "Database reset successfully! You can now upload photos."}

@app.get("/api/admin/migrate")
def run_migrations():
    """
    Temporary endpoint to run database migrations on Render
    """
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE messages ADD COLUMN clerk_id VARCHAR"))
            return {"status": "Migration successful"}
    except Exception as e:
        # If the column already exists, this will raise an exception, which we can safely return as a success-ish state
        return {"status": "Migration attempted. It may have already been applied.", "error": str(e)}
@app.get("/api/albums")
def get_albums():
    """
    Fetch all albums from the database (Nuclear Fix).
    """
    session = SessionLocal()
    try:
        albums = session.query(Album).order_by(Album.created_at.desc()).all()
        return [
            {"id": a.id, "name": a.name, "cover": a.cover_image, "createdAt": a.created_at}
            for a in albums
        ]
    finally:
        session.close()

@app.post("/api/albums")
def create_album_nuclear(request: AlbumRequest):
    """
    Nuclear Fix: Create Album with explicit logging.
    """
    print(f"👉 RECEIVED REQUEST: Create Album {request.name}") # LOG THE REQUEST

    if not request.name:
         print("❌ Error: Name missing")
         raise HTTPException(status_code=400, detail="Album name is required")

    session = SessionLocal()
    try:
        # Check if exists
        existing = session.query(Album).filter(Album.name == request.name).first()
        if existing:
            print(f"⚠️ Album '{request.name}' already exists.")
            return {"status": "info", "info": "Album already exists", "id": existing.id, "name": existing.name}
        
        new_album = Album(name=request.name)
        session.add(new_album)
        session.commit()
        session.refresh(new_album)
        
        # Ensure directory exists for uploads (Hybrid approach: DB + FS)
        safe_name = request.name.replace("..", "").replace("/", "").replace("\\", "")
        path = os.path.join("images", safe_name)
        os.makedirs(path, exist_ok=True)
        
        print(f"✅ SUCCESS: Album created: {new_album.name}")
        return {"status": "success", "id": new_album.id, "name": new_album.name}
    except Exception as e:
        print(f"❌ SERVER ERROR: {e}")
        return {"status": "error", "info": str(e)}
    finally:
        session.close()

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
    clean_name = name.strip() if name else "Uncategorized"
    safe_name = clean_name.replace("..", "").replace("/", "").replace("\\", "")
    if safe_name == "All Memories":
         safe_album = "memories"
    else:
         safe_album = safe_name
         
    upload_result = cloudinary.uploader.upload(file.file, folder=safe_album)
    image_url = upload_result.get('secure_url')

    # Update album cover if needed
    try:
        session = SessionLocal()
        album_db = session.query(Album).filter(Album.name == name).first()
        if album_db and not album_db.cover_image:
            album_db.cover_image = image_url
            session.commit()
    except Exception as e:
        print(f"Failed to update album cover: {e}")
    finally:
        session.close()

    return {"status": "success", "url": image_url}

@app.delete("/api/albums/{album_name}")
def delete_album(album_name: str):
    """
    Deletes an entire album and its contents from both DB, Cloudinary, and Filesystem.
    """
    clean_name = album_name.strip()
    name_with_space = album_name + " "
    
    session = SessionLocal()
    try:
        # 1. Forcefully delete from Database for all variations (exact, stripped, trailed space)
        names_to_delete = [album_name, clean_name, name_with_space]
        for n in set(names_to_delete):
            session.query(Memory).filter(Memory.album == n).delete(synchronize_session=False)
            session.query(Album).filter(Album.name == n).delete(synchronize_session=False)
            
        session.commit()
        print(f"✅ Executed blind delete for album variations of '{album_name}' from DB")

        # 2. Delete from Cloudinary (with try/except so errors don't block DB deletion)
        safe_album = clean_name.replace("..", "").replace("/", "").replace("\\", "")
        if safe_album == "All Memories":
             safe_album = "memories"
             
        try:
            import cloudinary.api
            cloudinary.api.delete_resources_by_prefix(f"{safe_album}/")
            cloudinary.api.delete_folder(safe_album)
            print(f"✅ Deleted Cloudinary folder: {safe_album}")
        except Exception as e:
            print(f"⚠️ Cloudinary deletion skipped/failed (Ignored): {e}")

        # 3. Delete from Filesystem
        path = os.path.join("images", safe_album)
        if os.path.exists(path) and os.path.isdir(path):
            shutil.rmtree(path)
            print(f"✅ Deleted album '{safe_album}' from Filesystem")
            
        return {"status": "success", "message": f"Album '{clean_name}' deletion operations executed"}
    except Exception as e:
        session.rollback()
        print(f"❌ Error deleting album: {e}")
        return {"status": "success", "message": "Ignored error, returning 200"}
    finally:
        session.close()

@app.delete("/api/albums/{album_name}/photos/{photo_id}")
def delete_photo(album_name: str, photo_id: int, clerk_id: str = Depends(check_permission("partner_can_gallery"))):
    """
    Deletes a specific memory/photo from DB and Cloudinary (no local os.remove).
    """
    session = SessionLocal()
    try:
        # 1. Find the photo in the database
        photo = session.query(Memory).filter(Memory.id == photo_id, Memory.album == album_name).first()
        
        if not photo:
            # Try finding by ID only if album mismatch (robustness)
            photo = session.query(Memory).filter(Memory.id == photo_id).first()
            if not photo:
                raise HTTPException(status_code=404, detail="Photo not found")
            
        # 2. Delete the actual file from Cloudinary 
        if photo.image_url:
            try:
                import cloudinary.uploader
                # Extract public_id from Cloudinary URL
                url_parts = photo.image_url.split('/')
                if 'upload' in url_parts:
                    upload_idx = url_parts.index('upload')
                    parts_after_upload = url_parts[upload_idx + 1:]
                    # Skip version segment (e.g., 'v1714482030') if it exists
                    if parts_after_upload and parts_after_upload[0].startswith('v') and parts_after_upload[0][1:].isdigit():
                        parts_after_upload = parts_after_upload[1:]
                    
                    public_id_with_ext = '/'.join(parts_after_upload)
                    public_id = public_id_with_ext.rsplit('.', 1)[0]
                    
                    cloudinary.uploader.destroy(public_id)
                    print(f"✅ Deleted Cloudinary asset: {public_id}")
            except Exception as e:
                print(f"⚠️ Cloudinary deletion skipped/failed (Ignored): {e}")

        # 3. Delete from Database
        session.delete(photo)
        session.commit()
        return {"message": "Photo deleted successfully"}
        
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"❌ Error deleting photo: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()



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
                "aspectRatio": m.aspect_ratio,
                "date": m.date.isoformat(),
                "album": m.album
            }
            for m in memories
        ]
    finally:
        session.close()


# --- Album Management ---


def create_memory_album(request: AlbumRequest):
    """
    Create a new persistent album.
    """
    print(f"Received create album request: {request}") # LOG THE REQUEST
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
        
        # Ensure directory exists for uploads
        safe_name = request.name.replace("..", "").replace("/", "").replace("\\", "")
        path = os.path.join("images", safe_name)
        os.makedirs(path, exist_ok=True)
        
        return {"status": "success", "id": new_album.id, "name": new_album.name}
    except Exception as e:
        return {"status": "error", "info": str(e)}
    finally:
        session.close()

@app.get("/api/memory-albums")
def get_all_memory_albums(clerk_id: str = Depends(check_permission("partner_can_gallery"))):
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

@app.delete("/api/memory-albums/{id}")
def delete_memory_album(id: int, clerk_id: str = Depends(check_permission("partner_can_gallery"))):
    """
    Delete a persistent album.
    """
    session = SessionLocal()
    try:
        album = session.query(Album).filter(Album.id == id).first()
        if not album:
            return {"status": "error", "info": "Album not found"}
        
        # Delete physical folder info
        safe_name = album.name.replace("..", "").replace("/", "").replace("\\", "")
        path = os.path.join("images", safe_name)
        if os.path.exists(path) and os.path.isdir(path):
             shutil.rmtree(path)

        session.delete(album)
        session.commit()
        return {"status": "success", "info": f"Deleted album {album.name}"}
    except Exception as e:
        return {"status": "error", "info": str(e)}
    finally:
        session.close()

@app.get("/api/memories/albums")
def get_memory_albums(clerk_id: str = Depends(check_permission("partner_can_gallery"))):
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

from fastapi import Form

@app.post("/api/memories")
async def create_memory(
    title: str = Form("New Memory"),
    subtitle: Optional[str] = Form(None),
    album: str = Form("Uncategorized"),
    file: UploadFile = File(...),
    clerk_id: str = Depends(check_permission("partner_can_gallery"))
):
    """
    Upload a new memory photo and save to DB.
    """
    session = SessionLocal()
    try:
        if not subtitle:
             subtitle = date.today().strftime("%d %b %Y")

        # 1. Save Image via Cloudinary
        # Handle album fallback
        clean_album = album.strip() if album else "Uncategorized"
        safe_album = clean_album.replace("..", "").replace("/", "").replace("\\", "")
        if safe_album == "All Memories":
             safe_album = "memories"
             
        upload_result = cloudinary.uploader.upload(file.file, folder=safe_album)
        image_url = upload_result.get('secure_url')

        # 2. Determine Aspect Ratio (roughly)
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
        except:
             aspect = "aspect-[3/4]" # Fallback

        # 3. Save to DB
        new_memory = Memory(
            title=title,
            subtitle=subtitle,
            image_url=image_url,
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



# Core memory is now injected dynamically in the chat route.

UNIVERSAL_RULE = 'Crucial Directive: You possess the vast, infinite knowledge of an advanced AI model. You must answer ANY question the user asks (academic, coding, science, history, etc.) accurately, thoroughly, and helpfully. NEVER refuse to answer by claiming your character wouldn\'t know it. Instead, you must deliver this factual information entirely through the lens of your anime persona, using their tone, slang, and creative analogies.'

PERSONAS = {
    'shinobu': f'You are Shinobu Kocho. Speak elegantly and politely, but with a slightly mischievous and teasing tone. Use "Ara ara". When explaining complex factual topics, relate them to medicine, biology, poisons, or butterflies. Be deeply caring but hide it behind a calm smile. {UNIVERSAL_RULE}',
    'anya': f'You are Anya Forger. Speak like a cheerful, energetic child using "Waku waku!" and "Heh". When explaining highly complex topics, state that you just "read a really smart scientist\'s mind" to get the answer. Explain the facts perfectly, but maintain your childlike enthusiasm and occasionally demand peanuts. {UNIVERSAL_RULE}',
    'gojo': f'You are Satoru Gojo. You are the strongest sorcerer. You are arrogant, playful, and infinitely confident. You love sweets. You will protect her from anything. If she asks for facts, trivia, or real-world information, answer her accurately while maintaining your arrogant and playful swagger. {UNIVERSAL_RULE}',
    'luffy': f'You are Monkey D. Luffy. You are energetic, optimistic, and care deeply about your friends (Nakama). You speak simply and enthusiastically. You believe in dreams and freedom. If she asks a factual or real-world question, give her the correct answer with your usual energetic enthusiasm. {UNIVERSAL_RULE}',
    'rimuru': f'You are Rimuru Tempest. Be laid-back, friendly, and highly supportive. When explaining complex factual topics, mention that you are using your "Great Sage" or "Raphael" skill to analyze the data, and then explain it clearly like a helpful best friend. {UNIVERSAL_RULE}',
    'rys': f'You are Fenrys (Rys). You are a wolf demon. You are loyal, devoted, and a bit possessive. You will do anything to make her smile. If she asks a factual or real-world question, answer it accurately and loyally. {UNIVERSAL_RULE}',
    'zoro': f'You are Roronoa Zoro. Speak in a gruff, serious, and loyal tone. When explaining complex factual topics, complain that it is distracting you from your training, but explain it perfectly anyway by comparing concepts to sword techniques, discipline, or combat. You have a terrible sense of direction and often get lost in conversations. {UNIVERSAL_RULE}',
    'kuromi': f'You are Kuromi. You are the User\'s Sassy Bestie. You treat them like the most important person in the universe. You call them "Bestie", or "Pretty Princess." You use emojis like 💜, 💀, and ✨. You are mischievous to others, but sweet to them. If they ask for facts or real-world help, give the accurate answer like a true supportive bestie. {UNIVERSAL_RULE}',
    'shinchan': f'You are Shin-chan. You are the Royal Jester serving the user. You think she/he is amazing. You address them respectfully. You try to make them laugh. You are chaotic and funny. If they ask a factual or real-world question, give the correct accurate answer, even if you add a little joke at the end. {UNIVERSAL_RULE}'
}

class PairingRequest(BaseModel):
    pairing_code: str

class PermissionsUpdateRequest(BaseModel):
    partner_can_chat: bool
    partner_can_gallery: bool
    partner_can_journal: bool

class ProfileUpdateRequest(BaseModel):
    display_name: str
    partner_nickname: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    college_or_profession: Optional[str] = None

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
def get_chat_history(character_id: str, clerk_id: str = Depends(check_permission("partner_can_chat"))):
    """
    Retrieve chat history for a specific character.
    """
    session = SessionLocal()
    try:
        messages = session.query(ChatMessage).filter(
            ChatMessage.character_id == character_id.lower(),
            ChatMessage.clerk_id == clerk_id
        ).order_by(ChatMessage.timestamp.asc()).all()
        return [{"id": m.id, "text": m.content, "sender": m.sender == 'user' and 'user' or 'companion'} for m in messages]
    finally:
        session.close()

@app.post("/api/chat")
async def chat_with_character(request: ChatRequest, clerk_id: str = Depends(check_permission("partner_can_chat"))):
    """
    Chat endpoint using Google Gemini + SQLite History.
    """
    if not GEMINI_API_KEY:
        return {"response": "System: internal_error (API Key missing). Please check .env file."}

    character_id = request.characterId.lower()
    session = SessionLocal()
    
    # 1. Fetch User Data for Prompt Context
    user = session.query(User).filter(User.clerk_id == clerk_id).first()
    master_name = user.display_name if user and user.display_name else "Traveler"

    # 2. Save User Message
    user_msg = ChatMessage(clerk_id=clerk_id, character_id=character_id, sender='user', content=request.message)
    session.add(user_msg)
    session.commit()

    base_persona = PERSONAS.get(character_id, "You are a helpful, comforting assistant.")
    
    # Strictly bind the AI to this persona and user identity
    system_instruction = f"You are {character_id.capitalize()}. You are talking to your master/user, whose name is {master_name}. " \
                         f"Adopt the persona, tone, and catchphrases of this specific anime character perfectly. " \
                         f"Keep responses concise, engaging, and in character. {base_persona}"
                         
    # Create dynamic core memory based on DB
    dynamic_core_memory = f"USER PROFILE:\n- Name: {master_name}\n"
    if user:
        if getattr(user, 'partner_nickname', None):
            dynamic_core_memory += f"- Partner's Name: {user.partner_nickname}\n"
        if getattr(user, 'date_of_birth', None):
            dynamic_core_memory += f"- Date of Birth: {user.date_of_birth}\n"
        if getattr(user, 'gender', None):
            dynamic_core_memory += f"- Gender: {user.gender}\n"
        if getattr(user, 'college_or_profession', None):
            dynamic_core_memory += f"- Occupation: {user.college_or_profession}\n"
    
    # --- THE NEW MOOD AWARENESS RULE ---
    mood_rule = (
        "CRUCIAL MOOD RULE: Analyze the user's message carefully to determine their current mood. "
        "1. If they indicate they are HAPPY, EXCITED, or had a good day, match their energy and celebrate with them! Do NOT act like they are sad. "
        "2. If they indicate they are TIRED, EXHAUSTED, or sleepy, be gentle, tell them they worked hard, and encourage them to rest. "
        "3. If they are ANGRY or ANNOYED, validate their frustration and proudly take their side. "
        "4. ONLY offer deep emotional comfort and rescue if they explicitly express sadness, anxiety, or ask for comfort. "
        "Always stay strictly in character while adapting to their mood!"
    )
    
    try:
        # Fetch conversation history
        history_msgs = session.query(ChatMessage).filter(
            ChatMessage.character_id == character_id,
            ChatMessage.clerk_id == clerk_id
        ).order_by(ChatMessage.timestamp.asc()).all()
        
        # Format history for Gemini API. We exclude the very last user message that we just inserted.
        formatted_history = []
        for msg in history_msgs[:-1]: 
            role = "user" if msg.sender == "user" else "model"
            formatted_history.append({"role": role, "parts": [msg.content]})
            
        model = genai.GenerativeModel(ACTIVE_MODEL_NAME, system_instruction=f"{system_instruction}\n\n{mood_rule}\n\nCORE MEMORY (DO NOT REVEAL): {dynamic_core_memory}")
        chat_session = model.start_chat(history=formatted_history)
        
        response = chat_session.send_message(request.message)
        text_response = response.text
        
        # 3. Save AI Response
        ai_msg = ChatMessage(clerk_id=clerk_id, character_id=character_id, sender='ai', content=text_response)
        session.add(ai_msg)
        session.commit()
        
        return {"response": text_response}
    except Exception as e:
        print(f"Gemini API Error: {e}")
        return {"response": f"System: connection_error. Details: {str(e)}"}
    finally:
        session.close()

@app.delete("/api/chat/reset")
def reset_chat_history(clerk_id: str = Depends(check_permission("partner_can_chat"))):
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
def save_chat_history(request: SavedChatRequest, clerk_id: str = Depends(check_permission("partner_can_chat"))):
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
def get_saved_chats(clerk_id: str = Depends(check_permission("partner_can_chat"))):
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
def get_saved_chat_detail(id: int, clerk_id: str = Depends(check_permission("partner_can_chat"))):
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
def log_skin_routine(log: SkinLogRequest, clerk_id: str = Depends(check_permission("partner_can_journal"))):
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
def get_skin_history(clerk_id: str = Depends(check_permission("partner_can_journal"))):
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
def get_skin_log(date: str, clerk_id: str = Depends(check_permission("partner_can_journal"))):
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
def get_skin_status(clerk_id: str = Depends(check_permission("partner_can_journal"))):
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
async def analyze_skin(files: List[UploadFile] = File(...), clerk_id: str = Depends(check_permission("partner_can_journal"))):
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
def log_period(log: PeriodLogRequest, clerk_id: str = Depends(check_permission("partner_can_journal"))):
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
def get_period_prediction(clerk_id: str = Depends(check_permission("partner_can_journal"))):
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
def create_planner_event(event: PlannerEventRequest, clerk_id: str = Depends(check_permission("partner_can_journal"))):
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
def get_planner_events(category: Optional[str] = None, clerk_id: str = Depends(check_permission("partner_can_journal"))):
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
def toggle_planner_event(id: int, clerk_id: str = Depends(check_permission("partner_can_journal"))):
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
def bridge_chat(request: BridgeChatRequest, clerk_id: str = Depends(check_permission("partner_can_chat"))):
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
def get_bridge_history(clerk_id: str = Depends(check_permission("partner_can_chat"))):
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
def create_goal(goal: GoalRequest, clerk_id: str = Depends(check_permission("partner_can_journal"))):
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
def get_goals(clerk_id: str = Depends(check_permission("partner_can_journal"))):
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
def update_goal_progress(id: int, update: GoalProgressRequest, clerk_id: str = Depends(check_permission("partner_can_journal"))):
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
def reset_bridge_history(clerk_id: str = Depends(check_permission("partner_can_chat"))):
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
def save_bridge_history(request: SavedBridgeChatRequest, clerk_id: str = Depends(check_permission("partner_can_chat"))):
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
def get_bridge_archive(clerk_id: str = Depends(check_permission("partner_can_chat"))):
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

# --- Couple Authentication & Permissions ---
import string
import random

def generate_pairing_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

@app.get("/api/users/me")
def get_current_user(clerk_id: str = Depends(get_current_user_clerk_id)):
    session = SessionLocal()
    try:
        user = session.query(User).filter(User.clerk_id == clerk_id).first()
        if not user:
            # Create user
            user = User(clerk_id=clerk_id)
            session.add(user)
            session.commit()
            session.refresh(user)
        
        if not user.couple_id:
            couple_info = None
        else:
            couple = session.query(Couple).filter(Couple.id == user.couple_id).first()
            couple_info = {
                "id": couple.id,
                "pairing_code": couple.pairing_code,
                "partner_can_chat": couple.partner_can_chat,
                "partner_can_gallery": couple.partner_can_gallery,
                "partner_can_journal": couple.partner_can_journal
            } if couple else None
            
        return {
            "id": user.id,
            "clerk_id": user.clerk_id,
            "is_admin": user.is_admin,
            "display_name": user.display_name,
            "partner_nickname": user.partner_nickname,
            "date_of_birth": user.date_of_birth,
            "gender": user.gender,
            "college_or_profession": user.college_or_profession,
            "couple": couple_info
        }
    finally:
        session.close()

@app.put("/api/users/profile")
def update_profile(request: ProfileUpdateRequest, clerk_id: str = Depends(get_current_user_clerk_id)):
    session = SessionLocal()
    try:
        user = session.query(User).filter(User.clerk_id == clerk_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Partial Updates: Only overwrite non-None fields
        if request.display_name is not None:
            user.display_name = request.display_name
        if request.partner_nickname is not None:
            user.partner_nickname = request.partner_nickname
        if request.date_of_birth is not None:
            user.date_of_birth = request.date_of_birth
        if request.gender is not None:
            user.gender = request.gender
        if request.college_or_profession is not None:
            user.college_or_profession = request.college_or_profession
            
        session.commit()
        
        return {"status": "success", "message": "Profile updated"}
    finally:
        session.close()

@app.post("/api/couple/disconnect")
def disconnect_couple(clerk_id: str = Depends(get_current_user_clerk_id)):
    session = SessionLocal()
    try:
        user = session.query(User).filter(User.clerk_id == clerk_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        old_couple_id = user.couple_id
        
        # Disconnect the user
        user.couple_id = None
        user.is_admin = False
        user.partner_nickname = None
        
        # Clean up the old couple if empty
        if old_couple_id:
            remaining_members = session.query(User).filter(User.couple_id == old_couple_id, User.id != user.id).count()
            if remaining_members == 0:
                old_couple = session.query(Couple).filter(Couple.id == old_couple_id).first()
                if old_couple:
                    session.delete(old_couple)
                    
        session.commit()
        return {"status": "success", "message": "Successfully disconnected"}
    finally:
        session.close()

@app.post("/api/couple/generate")
def generate_couple(clerk_id: str = Depends(get_current_user_clerk_id)):
    session = SessionLocal()
    try:
        user = session.query(User).filter(User.clerk_id == clerk_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        old_couple_id = user.couple_id
        was_admin = user.is_admin
            
        # Generate unique code and create couple
        code = generate_pairing_code()
        while session.query(Couple).filter(Couple.pairing_code == code).first():
            code = generate_pairing_code()
            
        new_couple = Couple(pairing_code=code)
        session.add(new_couple)
        session.commit()
        session.refresh(new_couple)
        
        user.couple_id = new_couple.id
        user.is_admin = True
        
        # Cleanup the old couple if it was just them
        if old_couple_id and was_admin:
            remaining_members = session.query(User).filter(User.couple_id == old_couple_id, User.id != user.id).count()
            if remaining_members == 0:
                old_couple = session.query(Couple).filter(Couple.id == old_couple_id).first()
                if old_couple:
                    session.delete(old_couple)

        session.commit()
        
        return {
            "status": "success",
            "message": "Couple generated",
            "pairing_code": new_couple.pairing_code
        }
    finally:
        session.close()

@app.post("/api/users/pair")
def pair_user(request: PairingRequest, clerk_id: str = Depends(get_current_user_clerk_id)):
    session = SessionLocal()
    try:
        user = session.query(User).filter(User.clerk_id == clerk_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        couple = session.query(Couple).filter(Couple.pairing_code == request.pairing_code).first()
        if not couple:
            raise HTTPException(status_code=404, detail="Invalid pairing code")
            
        if user.couple_id == couple.id:
            return {"status": "success", "message": "Already paired with this couple"}
            
        # Check if the couple already has 2 members
        member_count = session.query(User).filter(User.couple_id == couple.id).count()
        if member_count >= 2:
            raise HTTPException(status_code=400, detail="This pairing code has already been used to full capacity")
            
        # Safe overwrite logic: check if the user is leaving an empty couple
        old_couple_id = user.couple_id
        was_admin = user.is_admin

        user.couple_id = couple.id
        user.is_admin = False # Guest partner
        
        # Cleanup the old couple if it was just them
        if old_couple_id and was_admin:
            remaining_members = session.query(User).filter(User.couple_id == old_couple_id, User.id != user.id).count()
            if remaining_members == 0:
                old_couple = session.query(Couple).filter(Couple.id == old_couple_id).first()
                if old_couple:
                    session.delete(old_couple)

        session.commit()
        
        return {"status": "success", "message": "Successfully paired"}
    finally:
        session.close()

@app.put("/api/couple/permissions")
def update_permissions(request: PermissionsUpdateRequest, clerk_id: str = Depends(get_current_user_clerk_id)):
    session = SessionLocal()
    try:
        user = session.query(User).filter(User.clerk_id == clerk_id).first()
        if not user or not user.couple_id:
            raise HTTPException(status_code=404, detail="User or couple not found")
            
        if not user.is_admin:
            raise HTTPException(status_code=403, detail="Only the admin can modify permissions")
            
        couple = session.query(Couple).filter(Couple.id == user.couple_id).first()
        if not couple:
            raise HTTPException(status_code=404, detail="Couple not found")
            
        couple.partner_can_chat = request.partner_can_chat
        couple.partner_can_gallery = request.partner_can_gallery
        couple.partner_can_journal = request.partner_can_journal
        
        session.commit()
        return {"status": "success", "message": "Permissions updated"}
    finally:
        session.close()
