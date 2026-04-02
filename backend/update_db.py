from sqlalchemy import create_engine, text
import os

# Database URL from your main.py
DATABASE_URL = "postgresql://neondb_owner:npg_N8aJxgwV3ZRM@ep-wild-paper-ainnf2vo-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

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
