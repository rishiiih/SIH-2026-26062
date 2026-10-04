/**
 * SOS Configuration — mirrors backend/app/sos_config.py
 *
 * Keep these values in sync with the backend.  Any constant
 * referenced by both client and server MUST be declared here.
 */

/** How long the button must be held before a beacon fires (ms). */
export const HOLD_MS = 1500;

/** Seconds the sender gets to undo / cancel a beacon. */
export const UNDO_WINDOW_S = 10;

/** Seconds before the local UI warns that nobody has ACK'd. */
export const LOCAL_ACK_WARN_S = 60;

/** Escalation tier thresholds in seconds (level 1, 2, 3). */
export const UNACK_ESCALATION_S = [120, 300, 600];

/** Seconds after a muster call before missing persons trigger SOS. */
export const MUSTER_TIMEOUT_S = 300;

/** Maximum beacon payload size in bytes (UTF-8). */
export const BEACON_MAX_BYTES = 256;

/** Fast retry interval for SOS mutations (ms). */
export const RETRY_FAST_MS = 2000;

/** Slow retry interval for lower-priority mutations (ms). */
export const RETRY_SLOW_MS = 5000;

/** Maximum token age in days that the SOS endpoint will still accept. */
export const SOS_MAX_TOKEN_AGE_DAYS = 30;

/**
 * SOS incident categories — matches the type selector on
 * the sender quick-fields screen (Phase 4).
 */
export const SOS_CATEGORIES = [
  { key: 'MED',     label: 'Medical Emergency' },
  { key: 'MCI',     label: 'Mass Casualty' },
  { key: 'FIRE',    label: 'Fire' },
  { key: 'HAZ',     label: 'Hazardous Material' },
  { key: 'FIELD',   label: 'Field / Outdoor' },
  { key: 'MISSING', label: 'Missing Person' },
  { key: 'INFRA',   label: 'Infrastructure / Power' },
  { key: 'EVAC',    label: 'Evacuation' },
];

/**
 * Delivery channels used for tracking per-channel receipt.
 */
export const DELIVERY_CHANNELS = {
  LOCAL:   'local',
  STATION: 'station_lan',
  CENTRAL: 'central',
};
