import sqlite3

# Connect to the database
conn = sqlite3.connect('budget.db')
cursor = conn.cursor()

try:
    # Check if column exists to avoid error
    cursor.execute("SELECT album FROM memories LIMIT 1")
    print("Column 'album' already exists.")
except sqlite3.OperationalError:
    # Column doesn't exist, add it
    print("Adding 'album' column to memories table...")
    cursor.execute("ALTER TABLE memories ADD COLUMN album TEXT DEFAULT 'Uncategorized'")
    conn.commit()
    print("Column added successfully.")

conn.close()
