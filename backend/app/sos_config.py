HOLD_MS = 1500
UNDO_WINDOW_S = 10
LOCAL_ACK_WARN_S = 60
UNACK_ESCALATION_S = [120, 300, 600]
MUSTER_TIMEOUT_S = 300
BEACON_MAX_BYTES = 256
RETRY_FAST_MS = 2000
RETRY_SLOW_MS = 5000
SOS_MAX_TOKEN_AGE_DAYS = 30

# Display-only uplink labels per station
UPLINK_LABELS = {
    "Bharati": "Bharati <-> NRSC Hyderabad (C-band) <-> NCPOR HQ, Goa",
    "Maitri": "Maitri <-> NCPOR HQ, Goa (satellite link)",
    "Default": "Station LAN <-> Satellite Uplink <-> Central Command",
}
