import requests
import uuid

BASE_URL = 'http://localhost:5001/api'
USERNAME = 'admin2'        
PASSWORD = 'password123'  

def run_test():
    print("1. Logging in...")
    # FastAPI requires form data (URL encoded) for login, not JSON!
    login_res = requests.post(f"{BASE_URL}/auth/login", data={"username": USERNAME, "password": PASSWORD})
    
    if login_res.status_code != 200:
        print("Login failed:", login_res.text)
        return
        
    token = login_res.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    print("Login successful!\n")

    print("2. Pushing an offline Consignment...")
    mutation_id = str(uuid.uuid4())
    consignment_id = str(uuid.uuid4())
    
    push_payload = {
        "device_id": "field-tablet-01",
        "mutations": [
            {
                "id": mutation_id,
                "entity_type": "consignment",
                "operation": "create",
                "payload": {
                    "id": consignment_id,
                    "name": "Medical Supplies (Winter Reserve)",
                    "destination": "Maitri Station",
                    "weight": "450kg",
                    "priority": "Priority 1",
                    "status": "Packed",
                    "version": 1
                }
            }
        ]
    }
    
    push_res = requests.post(f"{BASE_URL}/sync/push", json=push_payload, headers=headers)
    print("PUSH Status:", push_res.status_code)
    print("PUSH Body:", push_res.json())
    print("\n")

    print("3. Pulling changes down to another device...")
    pull_payload = {"cursor": "0"}
    pull_res = requests.post(f"{BASE_URL}/sync/pull", json=pull_payload, headers=headers)
    
    print("PULL Status:", pull_res.status_code)
    print("PULL Body:", pull_res.json())

if __name__ == "__main__":
    run_test()