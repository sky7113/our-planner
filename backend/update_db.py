from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()
# Database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL")

def migrate():
    engine = create_engine(DATABASE_URL)
    
    print("Connecting to database...")
    try:
        with engine.begin() as conn:
            print("Adding 'public_id' column to 'memories' table...")
            # Use text() to safely execute the raw SQL
            conn.execute(text("ALTER TABLE memories ADD COLUMN IF NOT EXISTS public_id VARCHAR;"))
            print("SUCCESS: 'public_id' column added (or already exists).")
            
    except Exception as e:
        print(f"ERROR: Migration failed: {e}")

if __name__ == "__main__":
    migrate()
