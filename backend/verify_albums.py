from fastapi.testclient import TestClient
from main import app, Base, engine, SessionLocal, Album
import os

# Create a test client
client = TestClient(app)

def test_album_flow():
    print("1. Creating a new album 'VerificationAlbum'...")
    response = client.post("/api/memory-albums", json={"name": "VerificationAlbum"})
    if response.status_code != 200:
        print(f"FAILED: Create Album. Status: {response.status_code}, Response: {response.json()}")
        return
    print(f"SUCCESS: Created. {response.json()}")

    print("\n2. Fetching albums (expect 'VerificationAlbum' to be present)...")
    response = client.get("/api/memory-albums")
    if response.status_code != 200:
        print(f"FAILED: Fetch Albums. Status: {response.status_code}")
        return
    
    albums = response.json()
    found = any(a['name'] == 'VerificationAlbum' for a in albums)
    if found:
        print(f"SUCCESS: 'VerificationAlbum' found in list. Total albums: {len(albums)}")
    else:
        print("FAILED: 'VerificationAlbum' NOT found in list.")
        print("Albums:", albums)

    print("\n3. Verifying persistence (checking DB directly)...")
    session = SessionLocal()
    try:
        album = session.query(Album).filter(Album.name == "VerificationAlbum").first()
        if album:
            print(f"SUCCESS: Album found in DB. ID: {album.id}")
            
            # Clean up
            print("Cleaning up...")
            session.delete(album)
            session.commit()
            print("Cleanup complete.")
        else:
            print("FAILED: Album NOT found in DB.")
    finally:
        session.close()

if __name__ == "__main__":
    # Ensure we are in the backend directory so imports work
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    test_album_flow()
