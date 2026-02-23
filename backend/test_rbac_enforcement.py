import requests
import time

BASE_URL = "http://localhost:8000"

def test_rbac_enforcement():
    print("--- 0. Setting up test users ---")
    
    clerk_id_admin = f"test_user_admin_{int(time.time())}"
    clerk_id_partner = f"test_user_partner_{int(time.time())}"
    
    print("Creating Admin User...")
    res_admin = requests.get(f"{BASE_URL}/api/users/me", headers={"x-clerk-user-id": clerk_id_admin})
    assert res_admin.status_code == 200
    
    print("Generating Pair Code...")
    res_gen = requests.post(f"{BASE_URL}/api/couple/generate", headers={"x-clerk-user-id": clerk_id_admin})
    pairing_code = res_gen.json()["pairing_code"]
    
    print("Creating Partner User...")
    requests.get(f"{BASE_URL}/api/users/me", headers={"x-clerk-user-id": clerk_id_partner})
    
    print("Pairing...")
    requests.post(f"{BASE_URL}/api/users/pair", headers={"x-clerk-user-id": clerk_id_partner}, json={"pairing_code": pairing_code})
    
    print("--- 1. Testing Default Allow (Should Pass) ---")
    res_gallery_allowed = requests.get(f"{BASE_URL}/api/memories", headers={"x-clerk-user-id": clerk_id_partner})
    assert res_gallery_allowed.status_code == 200, f"Expected 200, got {res_gallery_allowed.status_code}"
    print("Partner can view gallery initially.")

    print("\n--- 2. Admin Revokes Gallery Access ---")
    res_perm = requests.put(f"{BASE_URL}/api/couple/permissions",
                               headers={"x-clerk-user-id": clerk_id_admin},
                               json={
                                   "partner_can_chat": True,
                                   "partner_can_gallery": False,
                                   "partner_can_journal": True
                               })
    assert res_perm.status_code == 200

    print("\n--- 3. Testing Revoked Access (Should Fail) ---")
    res_gallery_blocked = requests.get(f"{BASE_URL}/api/memories", headers={"x-clerk-user-id": clerk_id_partner})
    assert res_gallery_blocked.status_code == 403, f"Expected 403 Forbidden, got {res_gallery_blocked.status_code}"
    print("SUCCESS: Partner is blocked from gallery!")

    print("\n--- 4. Testing Unaffected Access (Should Pass) ---")
    res_chat_allowed = requests.get(f"{BASE_URL}/api/chat/saved", headers={"x-clerk-user-id": clerk_id_partner})
    assert res_chat_allowed.status_code == 200, f"Expected 200, got {res_chat_allowed.status_code}"
    print("SUCCESS: Partner can still access chat.")

    print("\nALL RBAC TESTS PASSED.")

if __name__ == "__main__":
    test_rbac_enforcement()
