/**
 * beacon.js — Compact SOS beacon generator.
 *
 * Builds the smallest possible JSON payload (≤ BEACON_MAX_BYTES)
 * that the backend's POST /api/sos/beacon endpoint accepts.
 *
 * The beacon is designed to succeed even over narrowband satellite
 * links where every byte counts.
 */

import { BEACON_MAX_BYTES, DELIVERY_CHANNELS } from './sosConfig';
import { PRIORITIES } from '../sync/priorities';
import { saveAndQueue } from '../sync/mutations';
import { authService } from '../services/auth';
import db from '../db/dexie';

/**
 * Attempt to grab the device's current GPS coordinates.
 * Returns { lat, lon } or null (non-blocking, 5s timeout).
 */
function grabLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: Math.round(pos.coords.latitude * 1e6) / 1e6,
          lon: Math.round(pos.coords.longitude * 1e6) / 1e6,
        }),
      () => resolve(null),
      { timeout: 5000, maximumAge: 30000, enableHighAccuracy: false }
    );
  });
}

/**
 * Build the compact beacon payload object.
 * Ensures the JSON serialisation fits within BEACON_MAX_BYTES.
 */
export function buildBeaconPayload({
  incidentId,
  stationId,
  userId,
  personnelId,
  lat = null,
  lon = null,
  category = null,
}) {
  const payload = {
    id: incidentId,
    sid: stationId,
    uid: userId,
  };

  // Only include optional fields if they are present
  if (personnelId) payload.pid = personnelId;
  if (lat != null && lon != null) {
    payload.lat = lat;
    payload.lon = lon;
  }
  if (category) payload.cat = category;

  // Safety check
  const bytes = new TextEncoder().encode(JSON.stringify(payload)).length;
  if (bytes > BEACON_MAX_BYTES) {
    console.warn(
      `[SOS] Beacon payload exceeds ${BEACON_MAX_BYTES}B (${bytes}B). Stripping optional fields.`
    );
    // Strip non-critical fields to fit
    delete payload.cat;
    delete payload.pid;
  }

  return payload;
}

/**
 * Fire an SOS beacon.
 *
 * 1. Generates a client UUID for the incident.
 * 2. Grabs geolocation (non-blocking).
 * 3. Writes the incident record to Dexie.
 * 4. Enqueues via saveAndQueue at PRIORITIES.SOS (100).
 * 5. Records a local delivery receipt in sos_delivery.
 *
 * Returns { incidentId, idempotencyKey }.
 */
export async function fireBeacon({ category = null } = {}) {
  const user = authService.getUser();
  if (!user) {
    throw new Error('Cannot fire SOS: no authenticated user');
  }

  const incidentId = crypto.randomUUID();
  const now = new Date().toISOString();
  const loc = await grabLocation();

  const beaconPayload = buildBeaconPayload({
    incidentId,
    stationId: user.station_id,
    userId: user.id,
    personnelId: user.personnel_id || null,
    lat: loc?.lat,
    lon: loc?.lon,
    category,
  });

  // Build the full incident record for local Dexie storage
  const incident = {
    id: incidentId,
    type: category || 'other',
    severity: 'critical',
    status: 'raised',
    title: category
      ? `SOS — ${category}`
      : 'SOS Alert',
    description: '',
    is_sos: true,
    sos_category: category,
    source: 'manual',
    reporter_personnel_id: user.personnel_id || null,
    location_text: null,
    lat: loc?.lat || null,
    lon: loc?.lon || null,
    station_id: user.station_id || null,
    raised_at: now,
    created_at: now,
    updated_at: now,
    version: 1,
    escalation_level: 0,
    people_affected: null,
    details: null,
    cancel_requested_at: null,
    cancel_requested_by: null,
    cancel_reason: null,
    cancel_confirmed_at: null,
    cancel_confirmed_by: null,
  };

  // Save to Dexie + queue in outbox at SOS priority
  const { idempotencyKey } = await saveAndQueue(
    'incident',
    incident,
    'create',
    { priority: PRIORITIES.SOS }
  );

  // Record local delivery receipt
  if (db.sos_delivery) {
    await db.sos_delivery.add({
      incident_id: incidentId,
      channel: DELIVERY_CHANNELS.LOCAL,
      status: 'delivered',
      timestamp: now,
    });
  }

  return { incidentId, idempotencyKey, beaconPayload };
}

/**
 * Cancel a beacon within the undo window.
 * Dispatches a cancel-request mutation at SOS_DETAIL priority.
 */
export async function cancelBeacon(incidentId) {
  const user = authService.getUser();
  if (!user) return;

  const now = new Date().toISOString();

  // Update local Dexie record
  if (db.incidents) {
    await db.incidents.update(incidentId, {
      cancel_requested_at: now,
      cancel_requested_by: user.id,
      cancel_reason: 'false_alarm_undo',
      updated_at: now,
    });
  }

  await saveAndQueue(
    'incident_update',
    {
      id: crypto.randomUUID(),
      incident_id: incidentId,
      kind: 'cancel_request',
      content: 'False alarm — cancelled within undo window',
      user_id: user.id,
      station_id: user.station_id,
      created_at: now,
      updated_at: now,
      version: 1,
    },
    'create',
    { priority: PRIORITIES.SOS_DETAIL }
  );
}
