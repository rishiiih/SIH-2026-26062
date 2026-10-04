# DHRUV Polar Emergency SOS & Fast Lane — 2-Minute Demo Script

> **Smart India Hackathon 2026 — Problem Statement 26062**  
> *Offline-First Expedition Logistics & Crisis Life-Safety for Polar Research Stations*

---

## 🎯 Demonstration Objective
Demonstrate an end-to-end polar emergency scenario during a **complete satellite blackout** in mid-winter Antarctica:
1. Field scientist triggers an SOS beacon **completely offline** via a 1.5-second hold button.
2. The beacon bypasses normal queueing via the **SOS Fast Lane** (≤ 256 bytes payload) and propagates instantly over Station Wi-Fi.
3. The **Station Alarm Overlay** triggers synchronously across station screens with Web Audio polar siren, device vibration, and Screen Wake Lock.
4. The Station Leader initiates the **Muster Roll Call**, while station crew self-report safety.
5. As satellite uplink is restored, Central Command in Goa receives the alert, acknowledges the crisis, and coordinates international **Mutual Aid** with neighboring Antarctic stations.

---

## ⏱️ Timeline & Step-by-Step Walkthrough

```
[00:00] MID-WINTER BLACKOUT ──► [00:25] BEACON FIRED ──► [00:45] GLOBAL STATION ALARM
                                                              │
[02:00] MUTUAL AID DISPATCH ◄── [01:30] SATELLITE UPLINK ◄───┴── [01:00] MUSTER ROLL CALL
```

---

### Step 1: Simulate the Mid-Winter Blackout (00:00 – 00:20)
1. Open two browser windows side-by-side:
   - **Window 1 (Mobile View / Field Scientist)**: Press `F12` > Toggle Device Toolbar (iPhone 14 / Pixel). Navigate to `http://localhost:5173/emergency` or Station Leader.
   - **Window 2 (Desktop / Station Leader Console)**: Navigate to `http://localhost:5173/station-leader`.
2. **Sever the Satellite Link**:
   - In DevTools (Window 1), toggle Network to **Offline** (or in Settings > Link Simulator, select `Station LAN only` or `Narrowband`).
   - Notice the UI indicator confirms offline operation: Dexie IndexedDB is actively caching state and ready for zero-connectivity operation.

---

### Step 2: Trigger Emergency SOS via 1.5s Hold Button (00:20 – 00:40)
1. On **Window 1** (Field Scientist):
   - Locate the pulsating red **SOS Button** in the header or the floating mobile FAB.
   - **Press and hold** the button.
   - Observe the **circular SVG progress ring** smoothly filling over 1,500 ms.
   - *Haptic feedback triggers on mobile on activation.*
2. **Instant Navigation to Sender Experience (`/sos/:id`)**:
   - Notice the **10-Second False Alarm Undo Window** with a countdown bar.
   - The beacon is already serialized into an ultra-compact payload (≤ 256 bytes) and committed to Dexie and the Outbox at Priority 100 (`PRIORITIES.SOS`).
3. **Context Enrichment**:
   - Tap **"MED — Medical Emergency"** or **"FIELD — Crevasse / Lost"**.
   - Current GPS coordinates are captured automatically with station fallbacks.

---

### Step 3: Global Station Alarm & Audio Siren (00:40 – 01:00)
1. On **Window 2** (Station Leader Console):
   - Without any internet access, the reactive `useLiveQuery` on Dexie detects the new SOS incident.
   - The **Full-Screen `SosAlarmOverlay`** activates:
     - 🚨 **Polar Two-Tone Siren** synthesized natively via Web Audio API (880 Hz / 660 Hz alternating tone).
     - Screen Wake Lock prevents display sleep in freezing control rooms.
     - Browser tab flashes: `🚨 [CRITICAL SOS ALERT] Polar Station Operations`.
2. **Leader Disarms Audible Siren**:
   - Leader taps **"Mute for Me (30s)"** or taps **"Acknowledge SOS"** on the Emergency Deck.
   - The siren halts, but the visual banner remains until the situation is stabilized.

---

### Step 4: Muster Roll Call & Accountability Board (01:00 – 01:30)
1. Leader navigates to the **Station Muster Board** tab:
   - Live roster of Maitri or Bharati expedition personnel (Station Leader, Surgeon, HVAC Engineer, Field Guides).
   - In Window 1, scientist taps **"I AM SAFE (One-Tap)"** — immediately reflected on Leader's board as Accounted (Safe) in green.
   - Leader marks unaccounted members or field parties.
2. **Muster Timeout Protocol**:
   - Highlight the 5-minute timeout countdown (`MUSTER_TIMEOUT_S = 300s`).
   - Show how unaccounted personnel past timeout trigger the **"Trigger Missing Person SOS"** one-click escalation.

---

### Step 5: Satellite Uplink Recovery & Central Command Sync (01:30 – 01:50)
1. **Restore Connectivity**:
   - In DevTools, switch Network back to **Online**.
2. **Fast-Lane Uplink Worker in Action**:
   - The background sync engine bypasses normal exponential backoff for high-priority mutations.
   - Independent delivery receipts update on the console:
     - `Local Dexie`: **Delivered** ✅
     - `Station LAN`: **Delivered** 🟢
     - `Central Command`: **Delivered** 🟣
3. Central Command receives the incident and all timestamped audit entries preserved with exactly-once idempotency.

---

### Step 6: International Mutual Aid & Distress Radio Net (01:50 – 02:10)
1. Switch to the **Mutual Aid & Radio Net** tab:
   - Review realistic Antarctic neighbour stations (Novolazarevskaya Station 4 km away, Progress Station 1.2 km away, Zhongshan 2.4 km away).
   - Every entry is clearly marked with `SAMPLE — verify before real use`.
2. **Generate Standard Distress Script**:
   - Select VHF Ch 16 (156.800 MHz) or HF 8.291 MHz Antarctic Distress.
   - The teleprompter dynamically formats a standard ICAO / Antarctic Treaty `MAYDAY` transmission with station callsigns, GPS coordinates, souls count, and required aid.
3. **Audio Teleprompter & Copy**:
   - Click **"Read Aloud (TTS)"** to hear the tactical voice synthesis read the radio transmission over station speakers.
   - Click **"Log Outgoing Aid Request"** to record the assistance dispatch in the immutable offline ledger.
4. **Resolution & Sign-Off**:
   - Click **"Resolve"** on the incident header.
   - Enter mandatory Commander notes and select **"Print After-Action Report"** to generate an official NCPOR Emergency Incident Closure summary.

---

## 🛠️ Verification & Test Commands

To verify the underlying engine programmatically:

```powershell
# 1. Run full backend pytest test suite (18 automated tests)
cd backend
python -m pytest tests -v

# 2. Verify client production build
cd ../client
npm run build
```

---

*DHRUV: Built for India's Polar Research Missions (Maitri & Bharati) • Smart India Hackathon 2026*
