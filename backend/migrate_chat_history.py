import sqlite3

db_path = "chat_history.db"

def migrate():
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if the column already exists
        cursor.execute("PRAGMA table_info(messages)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if "clerk_id" not in columns:
            print("Adding clerk_id column to messages table...")
            cursor.execute("ALTER TABLE messages ADD COLUMN clerk_id VARCHAR")
            conn.commit()
            print("Migration successful.")
        else:
            print("clerk_id column already exists.")
            
    except Exception as e:
        print(f"Migration error: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    migrate()
