import requests
import base64
import uuid

BASE_URL = 'http://localhost:5001/api'
USERNAME = 'admin2'
PASSWORD = 'password123'

def test_qr():
    print("1. Logging in...")
    login_res = requests.post(f"{BASE_URL}/auth/login", data={"username": USERNAME, "password": PASSWORD})
    if login_res.status_code != 200:
        print("Login failed:", login_res.text)
        return
    
    token = login_res.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}

    print("2. Pushing a test consignment...")
    consignment_id = str(uuid.uuid4())
    push_payload = {
        "device_id": "laptop-01",
        "mutations": [
            {
                "id": str(uuid.uuid4()),
                "entity_type": "consignment",
                "operation": "create",
                "payload": {
                    "id": consignment_id,
                    "name": "Sat-Phone Batteries",
                    "destination": "Bharati Station",
                    "version": 1
                }
            }
        ]
    }
    requests.post(f"{BASE_URL}/sync/push", json=push_payload, headers=headers)

    print(f"3. Fetching QR Code for {consignment_id}...")
    qr_res = requests.get(f"{BASE_URL}/cargo/{consignment_id}/qr", headers=headers)
    
    if qr_res.status_code != 200:
        print("Failed to fetch QR:", qr_res.text)
        return

    data = qr_res.json()
    
    # Strip the 'data:image/png;base64,' prefix to get the raw base64 string
    b64_string = data["qr_base64"].split(",")[1]
    
    print("4. Saving image...")
    with open("cargo_qr.png", "wb") as f:
        f.write(base64.b64decode(b64_string))

    print(f"\nSuccess! QR code saved as 'cargo_qr.png'.")
    print(f"Payload embedded in QR: {data['payload']}")

if __name__ == "__main__":
    test_qr()