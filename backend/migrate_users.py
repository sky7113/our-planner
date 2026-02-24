from sqlalchemy import create_engine, text
import os

DATABASE_URL = "postgresql://neondb_owner:npg_N8aJxgwV3ZRM@ep-wild-paper-ainnf2vo-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

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
