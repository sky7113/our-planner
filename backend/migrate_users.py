from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)

def add_columns():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN display_name VARCHAR;"))
            print("Added display_name successfully.")
        except Exception as e:
            print("display_name might already exist:", e)
            
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN partner_nickname VARCHAR;"))
            print("Added partner_nickname successfully.")
        except Exception as e:
            print("partner_nickname might already exist:", e)

    print("Migration complete!")

if __name__ == "__main__":
    add_columns()
