from fastapi.testclient import TestClient
from main import app, Base, engine, SessionLocal, User, Couple
import json

# Make sure tables are created (they should be since main imports them)
Base.metadata.create_all(bind=engine)

client = TestClient(app)

def test_auth_flow():
    # 1. Clean DB (for these tests) - DANGEROUS IN PROD, but let's just create a new user ID instead
    clerk_id_1 = "test_clerk_111"
    clerk_id_2 = "test_clerk_222"
    
    # Clean up from previous runs if any
    session = SessionLocal()
    session.query(User).filter((User.clerk_id == clerk_id_1) | (User.clerk_id == clerk_id_2)).delete()
    session.commit()
    session.close()

    print("--- 1. Testing GET /api/users/me (User 1 - Unpaired) ---")
    response1 = client.get("/api/users/me", headers={"x-clerk-user-id": clerk_id_1})
    assert response1.status_code == 200
    data1 = response1.json()
    print("User 1 Data (Before):", json.dumps(data1, indent=2))
    
    assert data1["clerk_id"] == clerk_id_1
    assert data1["is_admin"] == False
    assert data1["couple"] is None
    
    print("\n--- 2. Testing POST /api/couple/generate (User 1) ---")
    response_gen = client.post("/api/couple/generate", headers={"x-clerk-user-id": clerk_id_1})
    assert response_gen.status_code == 200
    gen_data = response_gen.json()
    print("Generate Response:", gen_data)
    assert "pairing_code" in gen_data
    
    pairing_code = gen_data["pairing_code"]
    
    # Re-fetch User 1 to get couple ID
    response1_after_gen = client.get("/api/users/me", headers={"x-clerk-user-id": clerk_id_1})
    data1_after_gen = response1_after_gen.json()
    assert data1_after_gen["is_admin"] == True
    assert data1_after_gen["couple"]["pairing_code"] == pairing_code
    couple_id = data1_after_gen["couple"]["id"]

    print("\n--- 3. Testing GET /api/users/me (User 2) ---")
    response2 = client.get("/api/users/me", headers={"x-clerk-user-id": clerk_id_2})
    assert response2.status_code == 200
    data2 = response2.json()
    print("User 2 Data:", json.dumps(data2, indent=2))
    
    assert data2["clerk_id"] == clerk_id_2
    assert data2["is_admin"] == False
    assert data2["couple"] is None
    
    print("\n--- 4. Testing POST /api/users/pair (User 2 joins User 1's couple) ---")
    response_pair = client.post("/api/users/pair", 
                                headers={"x-clerk-user-id": clerk_id_2},
                                json={"pairing_code": pairing_code})
    assert response_pair.status_code == 200
    print("Pair Response:", response_pair.json())

    # Verify User 2 is now in User 1's couple and not an admin
    response2_after = client.get("/api/users/me", headers={"x-clerk-user-id": clerk_id_2})
    data2_after = response2_after.json()
    assert data2_after["is_admin"] == False
    assert data2_after["couple"]["id"] == couple_id

    print("\n--- 5. Testing PUT /api/couple/permissions (By Admin: User 1) ---")
    response_perm = client.put("/api/couple/permissions",
                               headers={"x-clerk-user-id": clerk_id_1},
                               json={
                                   "partner_can_chat": False,
                                   "partner_can_gallery": True,
                                   "partner_can_journal": False
                               })
    assert response_perm.status_code == 200
    print("Permissions Response:", response_perm.json())

    # Verify changes applied to the couple
    response1_after = client.get("/api/users/me", headers={"x-clerk-user-id": clerk_id_1})
    data1_after = response1_after.json()
    assert data1_after["couple"]["partner_can_chat"] == False
    assert data1_after["couple"]["partner_can_journal"] == False
    assert data1_after["couple"]["partner_can_gallery"] == True
    
    # Verify User 2 sees the same changes
    response2_perm_check = client.get("/api/users/me", headers={"x-clerk-user-id": clerk_id_2})
    data2_perm_check = response2_perm_check.json()
    assert data2_perm_check["couple"]["partner_can_chat"] == False

    print("\n--- 6. Testing PUT /api/couple/permissions (By Non-Admin -> SHOULD FAIL) ---")
    response_perm_fail = client.put("/api/couple/permissions",
                               headers={"x-clerk-user-id": clerk_id_2},
                               json={
                                   "partner_can_chat": True,
                                   "partner_can_gallery": True,
                                   "partner_can_journal": True
                               })
    assert response_perm_fail.status_code == 403
    print("Permissions Fail Response:", response_perm_fail.json())
    
    print("\n✅ All Tests Passed Successfully")

if __name__ == "__main__":
    test_auth_flow()
