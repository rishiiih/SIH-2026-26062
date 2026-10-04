# DHRUV Station Node Architecture & Deployment Runbook

## Overview
In polar expeditions (Antarctica / Arctic), continuous internet connectivity cannot be guaranteed. Satellite uplinks frequently drop due to blizzards, satellite handover, solar geomagnetic storms, and power rationing.

DHRUV solves this through the **Station Node**:
- A lightweight, self-contained instance of the DHRUV backend running on local station hardware (e.g., standard PC, server rack, or Raspberry Pi) on the station Wi-Fi.
- In `STATION_MODE=true`, the backend initializes using local SQLite, automatically seeds station reference data (Bharati or Maitri + polar neighbours), serves the pre-built React PWA client statically, and acts as the local broadcast and sync authority for all expedition personnel devices on the station Wi-Fi.
- An asynchronous **Uplink Worker** continuously monitors connection to Central Command (`CENTRAL_URL`). Whenever ANY uplink (satellite, narrowband, cellular relay) becomes available, the node automatically pushes accumulated station mutations and pulls Central updates, preserving client idempotency keys for exactly-once effects.

```
       [ Central Command (Goa / Hyderabad) ]
                     ▲
                     │ (Intermittent Satellite / C-band)
                     ▼
          [ Station Node (Port 5002) ]
              │ (STATION_MODE=true)
              │ (Station Wi-Fi / LAN - NO INTERNET NEEDED)
    ┌─────────┴─────────┐
    ▼                   ▼
[Device 1 (Doctor)]  [Device 2 (Leader)]
```

---

## 1. Starting Central Command & Station Node

### A. Central Command (NCPOR HQ / Cloud Gateway)
Runs on port **5001** (connected to PostgreSQL or central persistence):

```powershell
# Windows PowerShell
$env:PORT="5001"
$env:DATABASE_URL="sqlite:///dhruv_central.db" # Or postgresql://...
python -m uvicorn main:app --port 5001 --host 0.0.0.0
```

### B. Station Node (Bharati or Maitri Base)
Runs on port **5002** with `STATION_MODE=true`:

```powershell
# Windows PowerShell
$env:STATION_MODE="true"
$env:STATION_ID="1" # 1 for Bharati, 2 for Maitri
$env:CENTRAL_URL="http://localhost:5001"
$env:UPLINK_USER="station_1_service"
$env:UPLINK_PASSWORD="uplink_secure_pass"
$env:PORT="5002"

# Build client once if needed:
# cd ../client; npm run build; cd ../backend

python -m uvicorn main:app --port 5002 --host 0.0.0.0
```

---

## 2. Secure Context & HTTPS Setup (Mandatory for Mobile PWAs)

Modern mobile browsers (Chrome Android, Safari iOS) **strictly enforce Secure Context (`https://` or `localhost`)** for the following critical emergency APIs:
- **Service Workers & Offline Caching**
- **Web Push Notifications**
- **Web Audio Siren Autoplay & AudioContext**
- **Screen Wake Lock API** (preventing screen dimming during alarms)
- **Geolocation API** (lat/lon coordinate capture)

When accessing the Station Node over local station Wi-Fi (e.g. `https://192.168.1.100:5002` or `https://station-node.local`), you **must** configure HTTPS.

### Method A: Local CA with `mkcert` (Recommended)

1. **Install `mkcert`**:
   - Windows (Chocolatey): `choco install mkcert`
   - Linux: `sudo apt install libnss3-tools; curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/amd64" ...`
   - macOS: `brew install mkcert`

2. **Generate Station Certificates**:
   ```bash
   mkcert -install
   mkcert station-node.local 192.168.1.100 localhost 127.0.0.1
   ```
   This generates `station-node.local+3.pem` (certificate) and `station-node.local+3-key.pem` (private key).

3. **Install Root Certificate on Station Devices**:
   - Run `mkcert -CAROOT` to find `rootCA.pem`.
   - Send `rootCA.pem` to station phones/tablets via Wi-Fi/Bluetooth or host it temporarily on HTTP.
   - Install as a trusted CA certificate on Android (`Settings > Security > Install a certificate > CA certificate`) or iOS (`Settings > Profile Downloaded > Trust Certificate`).

4. **Launch Station Node with TLS**:
   ```powershell
   python -m uvicorn main:app --port 5002 --host 0.0.0.0 `
     --ssl-keyfile="./station-node.local+3-key.pem" `
     --ssl-certfile="./station-node.local+3.pem"
   ```

### Method B: Caddy Reverse Proxy (Zero-Config Internal CA)
If running a reverse proxy on the station node:

1. Create a `Caddyfile`:
   ```caddyfile
   station-node.local:443, 192.168.1.100:443 {
       tls internal
       reverse_proxy localhost:5002
   }
   ```
2. Run Caddy: `caddy run`. Station devices download the root cert from `http://station-node.local/pki/ca.crt`.

---

## 3. Verification Test: Central Down Drill

This test validates that the SOS system functions 100% offline within the station, and reconciles with Central Command once connectivity returns:

### Step 1: Ensure Central is Stopped
Verify `http://localhost:5001/api/health` does NOT respond (Central stopped).

### Step 2: Start Station Node
Start the Station Node on port 5002 (`STATION_MODE=true`).
Open `http://localhost:5002` (or `https://<station-ip>:5002`) on Device 1 and Device 2.

### Step 3: Trigger SOS Offline on Device 1
1. On Device 1, hold the SOS button for 1.5 seconds.
2. Device 1 transmits the compact beacon to the Station Node.
3. Within 1-2 seconds, **Device 2 sounds the emergency siren** and displays the full-screen alarm overlay via the Station LAN Server-Sent Events stream.
4. Device 1 delivery ladder indicates: `Saved on this device -> Station network (1 device reached)`.

### Step 4: Restore Central Command
1. Start Central Command on port 5001:
   ```powershell
   python -m uvicorn main:app --port 5001
   ```
2. Within 5 seconds, the Station Node's background `UplinkWorker` detects `CENTRAL_URL/api/health` answering.
3. The worker authenticates and flushes the local `ChangeLog` containing the SOS incident through `/api/sync/push`.
4. Check Central Command at `http://localhost:5001/api/sos/active`. The SOS appears with the identical client UUID and details.
5. Device 1 delivery ladder updates to: `Delivered to Central Command`.
