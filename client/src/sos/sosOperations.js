import db from '../db/dexie';
import { saveAndQueue } from '../sync/mutations';
import { PRIORITIES } from '../sync/priorities';
import { authService } from '../services/auth';
import api from '../services/api';
import { fireBeacon } from './beacon';

/**
 * Realistic polar neighbours dataset.
 * Every entry is marked is_sample: true as per Antarctic operations safety guidelines.
 */
export const SAMPLE_POLAR_NEIGHBOURS = [
  // Station 1: Maitri (Schirmacher Oasis, Queen Maud Land)
  {
    id: 'nbr-novolazarevskaya',
    station_id: 1,
    name: 'Novolazarevskaya Station',
    country: 'Russia',
    distance_km: 4,
    distance_note: '~4 km North-East across Schirmacher Oasis',
    services: 'Field Doctor, Surgical Clinic, Emergency Shelter, Runway Logistics',
    contact_channels: 'VHF Ch 16 (156.800 MHz) | HF 8.975 MHz USB | Iridium +8816...',
    is_sample: true,
    notes: 'Primary overland mutual-aid partner for Maitri Station.',
  },
  {
    id: 'nbr-novo-runway',
    station_id: 1,
    name: 'ALCI Air Logistics / Novo Runway',
    country: 'International (ALCI)',
    distance_km: 12,
    distance_note: '~12 km South on blue ice glacial runway',
    services: 'Heavy Air Lift (IL-76), Ski-equipped BT-67 Basler, Twin Otter SAR, Medevac Flights',
    contact_channels: 'VHF Air 129.700 MHz | HF 5.484 MHz | SatCom',
    is_sample: true,
    notes: 'Intercontinental air link and tactical aeromedical evacuation hub.',
  },
  // Station 2: Bharati (Larsemann Hills, Princess Elizabeth Land)
  {
    id: 'nbr-progress',
    station_id: 2,
    name: 'Progress Station',
    country: 'Russia',
    distance_km: 1.2,
    distance_note: '~1.2 km overland across Larsemann Hills ridgeline',
    services: 'Surgeon & Trauma Suite, Heavy PistenBully Snowcats, Helipad, Fuel Reserves',
    contact_channels: 'VHF Ch 16 / Ch 06 (156.300 MHz) | HF 6.224 MHz | Station SatPhone',
    is_sample: true,
    notes: 'Closest year-round neighbour to Bharati. Direct snowmobile access.',
  },
  {
    id: 'nbr-zhongshan',
    station_id: 2,
    name: 'Zhongshan Station',
    country: 'China',
    distance_km: 2.4,
    distance_note: '~2.4 km North across glacial fjord',
    services: 'Level-2 Medical Facility, Kamov Ka-32 Heavy Lift Helicopter, Winterization Base',
    contact_channels: 'VHF Ch 16 / Ch 10 | HF 8.120 MHz USB | Station SatLink',
    is_sample: true,
    notes: 'Helicopter evacuation capable. Bilateral SAR coordination protocol.',
  },
  {
    id: 'nbr-law-racovita',
    station_id: 2,
    name: 'Law-Racoviță-Negoiță Base',
    country: 'Romania / Australia',
    distance_km: 3.1,
    distance_note: '~3.1 km East in Larsemann Hills',
    services: 'Field Research Outpost, Basic First Aid, Emergency Survival Cache',
    contact_channels: 'VHF Ch 16 (Summer season operational only)',
    is_sample: true,
    notes: 'Unmanned during austral winter. Emergency survival shelter accessible.',
  },
  {
    id: 'nbr-davis',
    station_id: 2,
    name: 'Davis Station',
    country: 'Australia (AAD)',
    distance_km: 110,
    distance_note: '~110 km East in Vestfold Hills',
    services: 'Major Surgical Hospital, Twin Otter Aircraft, Deep Field SAR Ops',
    contact_channels: 'HF 8.291 MHz Distress | HF 4.125 MHz | Iridium Ops Net',
    is_sample: true,
    notes: 'Regional Australian Antarctic Division hub. Long-range air/sea rescue coordinate.',
  },
];

/**
 * Realistic default station personnel roster for polar stations.
 */
export const SAMPLE_STATION_CREW = {
  1: [
    { id: 'pers-101', name: 'Dr. Rajesh Sharma', role: 'Station Leader & Expedition Head', station_id: 1, blood_group: 'O+', status: 'active' },
    { id: 'pers-102', name: 'Dr. Ananya Sen', role: 'Chief Medical Officer / Surgeon', station_id: 1, blood_group: 'A+', status: 'active' },
    { id: 'pers-103', name: 'Vikram Negi', role: 'Logistics & Winter Survival Officer', station_id: 1, blood_group: 'B+', status: 'active' },
    { id: 'pers-104', name: 'Sunil Kumar', role: 'HVAC & Generator Plant Engineer', station_id: 1, blood_group: 'AB+', status: 'active' },
    { id: 'pers-105', name: 'Priya Iyer', role: 'Senior Meteorologist & Glaciologist', station_id: 1, blood_group: 'O-', status: 'active' },
    { id: 'pers-106', name: 'Amitabh Roy', role: 'SatCom & VHF Radio Communications Lead', station_id: 1, blood_group: 'B-', status: 'active' },
    { id: 'pers-107', name: 'Kavita Deshmukh', role: 'Atmospheric Research Scientist', station_id: 1, blood_group: 'A-', status: 'active' },
    { id: 'pers-108', name: 'Tsering Dorje', role: 'Polar Field Guide & Snowcat Driver', station_id: 1, blood_group: 'O+', status: 'active' },
  ],
  2: [
    { id: 'pers-201', name: 'Dr. Meera Nambiar', role: 'Station Leader & Marine Scientist', station_id: 2, blood_group: 'B+', status: 'active' },
    { id: 'pers-202', name: 'Dr. Harish Patel', role: 'Expedition Surgeon & Trauma Lead', station_id: 2, blood_group: 'O+', status: 'active' },
    { id: 'pers-203', name: 'Rohan Deshmukh', role: 'Power Plant & Fuel System Engineer', station_id: 2, blood_group: 'A+', status: 'active' },
    { id: 'pers-204', name: 'Devendra Verma', role: 'Heavy Vehicle & PistenBully Specialist', station_id: 2, blood_group: 'O+', status: 'active' },
    { id: 'pers-205', name: 'Sneha Banerjee', role: 'Satellite Telemetry & Networking Officer', station_id: 2, blood_group: 'AB+', status: 'active' },
    { id: 'pers-206', name: 'Arjun Rathore', role: 'Field Operations & Crevasse Rescue Specialist', station_id: 2, blood_group: 'B+', status: 'active' },
    { id: 'pers-207', name: 'Pooja Nair', role: 'Oceanographic & Geomagnetism Scientist', station_id: 2, blood_group: 'A-', status: 'active' },
    { id: 'pers-208', name: 'Farooq Ahmed', role: 'Chef & Life Support Inventory Specialist', station_id: 2, blood_group: 'O-', status: 'active' },
  ],
};

/**
 * Seed station neighbours into Dexie if not already present.
 */
export async function seedStationNeighboursIfEmpty() {
  if (!db.station_neighbours) return;
  const count = await db.station_neighbours.count();
  if (count === 0) {
    await db.station_neighbours.bulkAdd(SAMPLE_POLAR_NEIGHBOURS);
  }
}

/**
 * Seed realistic station crew into Dexie personnel table if empty.
 */
export async function seedStationPersonnelIfEmpty(stationId = 1) {
  if (!db.personnel) return;
  const count = await db.personnel.count();
  if (count === 0) {
    const allCrew = [
      ...SAMPLE_STATION_CREW[1],
      ...SAMPLE_STATION_CREW[2],
    ];
    await db.personnel.bulkAdd(allCrew);
  }
}

/**
 * Acknowledge an SOS incident (Station Leader or Central Command).
 */
export async function acknowledgeIncident(incidentId) {
  const user = authService.getUser() || { id: 'commander', full_name: 'Commander on Duty' };
  const now = new Date().toISOString();

  if (db.incidents) {
    await db.incidents.update(incidentId, {
      acknowledged_by: user.id,
      acknowledged_at: now,
      updated_at: now,
    });
  }

  const update = {
    id: crypto.randomUUID(),
    incident_id: incidentId,
    user_id: user.id,
    station_id: user.station_id || null,
    note: `SOS Acknowledged by ${user.full_name || user.username || 'Station Leader'}`,
    kind: 'ack',
    created_at: now,
    updated_at: now,
    version: 1,
  };

  await saveAndQueue('incident_update', update, 'create', {
    priority: PRIORITIES.INCIDENT_UPDATE,
  });

  // Non-blocking network sync attempt
  api.post(`/sos/${incidentId}/ack`).catch(() => {});
  return update;
}

/**
 * Dispatch or respond to emergency scene.
 */
export async function respondToIncident(incidentId, note) {
  const user = authService.getUser() || { id: 'responder', full_name: 'Response Team' };
  const now = new Date().toISOString();
  const responderNote = note?.trim() || `${user.full_name || user.username || 'Response unit'} deployed to emergency site`;

  const update = {
    id: crypto.randomUUID(),
    incident_id: incidentId,
    user_id: user.id,
    station_id: user.station_id || null,
    note: responderNote,
    kind: 'respond',
    created_at: now,
    updated_at: now,
    version: 1,
  };

  if (db.incidents) {
    await db.incidents.update(incidentId, { updated_at: now });
  }

  await saveAndQueue('incident_update', update, 'create', {
    priority: PRIORITIES.INCIDENT_UPDATE,
  });

  api.post(`/sos/${incidentId}/respond`, { note: responderNote }).catch(() => {});
  return update;
}

/**
 * Escalate incident level (Level 1, 2, 3).
 */
export async function escalateIncident(incidentId, level, note = '') {
  const user = authService.getUser() || { id: 'commander' };
  const now = new Date().toISOString();

  if (db.incidents) {
    await db.incidents.update(incidentId, {
      escalation_level: level,
      updated_at: now,
    });
  }

  const update = {
    id: crypto.randomUUID(),
    incident_id: incidentId,
    user_id: user.id,
    station_id: user.station_id || null,
    note: `Incident Escalated to Level ${level}. ${note}`.trim(),
    kind: 'escalation',
    created_at: now,
    updated_at: now,
    version: 1,
  };

  await saveAndQueue('incident_update', update, 'create', {
    priority: PRIORITIES.INCIDENT_UPDATE,
  });

  api.post(`/sos/${incidentId}/escalate`, { level, note }).catch(() => {});
  return update;
}

/**
 * Confirm cancellation of a false alarm (requires Leader / Command role).
 */
export async function confirmCancellation(incidentId, note = '') {
  const user = authService.getUser() || { id: 'commander', username: 'Leader' };
  const now = new Date().toISOString();

  if (db.incidents) {
    await db.incidents.update(incidentId, {
      status: 'cancelled',
      cancel_confirmed_at: now,
      cancel_confirmed_by: user.id,
      updated_at: now,
    });
  }

  const update = {
    id: crypto.randomUUID(),
    incident_id: incidentId,
    user_id: user.id,
    station_id: user.station_id || null,
    note: `False Alarm Cancellation Confirmed by ${user.full_name || user.username}. Radio verification completed. ${note}`.trim(),
    kind: 'cancel_confirm',
    status_change: 'cancelled',
    created_at: now,
    updated_at: now,
    version: 1,
  };

  await saveAndQueue('incident_update', update, 'create', {
    priority: PRIORITIES.INCIDENT_UPDATE,
  });

  api.post(`/sos/${incidentId}/cancel-confirm`, { note }).catch(() => {});
  return update;
}

/**
 * Reject cancellation request and keep incident active.
 */
export async function rejectCancellation(incidentId, note = '') {
  const user = authService.getUser() || { id: 'commander', username: 'Leader' };
  const now = new Date().toISOString();

  if (db.incidents) {
    await db.incidents.update(incidentId, {
      cancel_requested_at: null,
      cancel_requested_by: null,
      cancel_reason: null,
      updated_at: now,
    });
  }

  const update = {
    id: crypto.randomUUID(),
    incident_id: incidentId,
    user_id: user.id,
    station_id: user.station_id || null,
    note: `Cancellation request rejected by ${user.full_name || user.username} after radio review. Incident kept active. ${note}`.trim(),
    kind: 'note',
    created_at: now,
    updated_at: now,
    version: 1,
  };

  await saveAndQueue('incident_update', update, 'create', {
    priority: PRIORITIES.INCIDENT_UPDATE,
  });

  return update;
}

/**
 * Resolve an emergency incident with mandatory commander resolution notes.
 */
export async function resolveIncident(incidentId, note, resolutionType = 'Resolved & Stabilized') {
  if (!note || !note.trim()) {
    throw new Error('Resolution notes are mandatory to close an emergency incident.');
  }

  const user = authService.getUser() || { id: 'commander', username: 'Leader' };
  const now = new Date().toISOString();
  const fullNote = `[${resolutionType}] ${note.trim()}`;

  if (db.incidents) {
    await db.incidents.update(incidentId, {
      status: 'resolved',
      resolved_at: now,
      updated_at: now,
    });
  }

  const update = {
    id: crypto.randomUUID(),
    incident_id: incidentId,
    user_id: user.id,
    station_id: user.station_id || null,
    note: fullNote,
    kind: 'status',
    status_change: 'resolved',
    created_at: now,
    updated_at: now,
    version: 1,
  };

  await saveAndQueue('incident_update', update, 'create', {
    priority: PRIORITIES.INCIDENT_UPDATE,
  });

  api.post(`/sos/${incidentId}/resolve`, { note: fullNote }).catch(() => {});
  return update;
}

/**
 * Report individual muster status ("I am Safe" / "Injured" / "Sheltered").
 */
export async function reportMusterStatus({ incidentId, personnelId, status = 'safe', via = 'self' }) {
  const user = authService.getUser() || { id: 'user' };
  const now = new Date().toISOString();
  const entryId = crypto.randomUUID();

  const entry = {
    id: entryId,
    incident_id: incidentId,
    personnel_id: personnelId || user.personnel_id || null,
    user_id: user.id,
    station_id: user.station_id || null,
    status,
    reported_at: now,
    reported_by: user.id,
    via,
  };

  if (db.muster_entries) {
    await db.muster_entries.put(entry);
  }

  await saveAndQueue('muster_entry', entry, 'create', {
    priority: PRIORITIES.MUSTER,
  });

  api.post(`/sos/${incidentId}/muster/report`, {
    status,
    personnel_id: personnelId || user.personnel_id || null,
    via,
  }).catch(() => {});

  return entry;
}

/**
 * Leader or Commander marks status for another crew member.
 */
export async function markPersonnelMuster({ incidentId, personnelId, userId, status, via = 'leader' }) {
  const leader = authService.getUser() || { id: 'leader', username: 'Station Leader' };
  const now = new Date().toISOString();
  const entryId = crypto.randomUUID();

  const entry = {
    id: entryId,
    incident_id: incidentId,
    personnel_id: personnelId || null,
    user_id: userId || null,
    station_id: leader.station_id || null,
    status,
    reported_at: now,
    reported_by: leader.id,
    via,
  };

  if (db.muster_entries) {
    await db.muster_entries.put(entry);
  }

  await saveAndQueue('muster_entry', entry, 'create', {
    priority: PRIORITIES.MUSTER,
  });

  api.post(`/sos/${incidentId}/muster/mark`, {
    personnel_id: personnelId,
    user_id: userId,
    status,
    via,
  }).catch(() => {});

  return entry;
}

/**
 * Create a mutual aid assistance request.
 */
export async function createAssistanceRequest({
  incidentId,
  neighbourId,
  externalLabel,
  channel = 'radio_vhf',
  scriptText = '',
  note = '',
}) {
  const user = authService.getUser() || { id: 'commander' };
  const requestId = crypto.randomUUID();
  const now = new Date().toISOString();

  const req = {
    id: requestId,
    incident_id: incidentId,
    neighbour_id: neighbourId,
    external_label: externalLabel,
    station_id: user.station_id || null,
    channel,
    status: 'requested',
    script_text: scriptText,
    requested_by: user.id,
    requested_at: now,
    note,
  };

  if (db.assistance_requests) {
    await db.assistance_requests.put(req);
  }

  await saveAndQueue('assistance_request', req, 'create', {
    priority: PRIORITIES.INCIDENT_UPDATE,
  });

  api.post(`/sos/${incidentId}/aid-requests`, {
    neighbour_id: neighbourId,
    external_label: externalLabel,
    channel,
    script_text: scriptText,
    note,
  }).catch(() => {});

  return req;
}

/**
 * Update mutual aid assistance request status (requested -> contacted -> accepted/declined -> completed).
 */
export async function updateAssistanceStatus({ incidentId, aidId, status, note = '' }) {
  const now = new Date().toISOString();

  if (db.assistance_requests) {
    const patch = { status, note, updated_at: now };
    if (status === 'contacted') patch.contacted_at = now;
    if (status === 'accepted' || status === 'declined') patch.responded_at = now;
    if (status === 'completed') patch.completed_at = now;
    await db.assistance_requests.update(aidId, patch);
  }

  api.patch(`/sos/${incidentId}/aid-requests/${aidId}/status`, {
    status,
    note,
  }).catch(() => {});
}

/**
 * Generate standard Antarctic Treaty / ICAO distress radio script.
 */
export function generateDistressScript({
  incident,
  stationName = 'Bharati Station',
  soulsCount = 'Unknown',
  natureOfEmergency = 'Critical Medical Emergency',
  assistanceType = 'Immediate Aeromedical Evacuation / Surgical Team',
  channel = 'VHF Ch 16 (156.800 MHz)',
}) {
  const callsign = stationName.toUpperCase().replace(/\s+/g, '-');
  const lat = incident?.lat != null ? incident.lat.toFixed(4) : '69.4075° S';
  const lon = incident?.lon != null ? incident.lon.toFixed(4) : '76.1950° E';
  const category = incident?.sos_category || incident?.type || 'CRITICAL EMERGENCY';
  const priorityWord = incident?.severity === 'critical' ? 'MAYDAY MAYDAY MAYDAY' : 'PAN-PAN PAN-PAN PAN-PAN';

  return `${priorityWord}
ALL STATIONS, ALL STATIONS, ALL STATIONS.
THIS IS ${callsign}, ${callsign}, ${callsign}.

POSITION:
LATITUDE ${lat}, LONGITUDE ${lon}
SECTOR: LARSEMANN HILLS / QUEEN MAUD LAND, ANTARCTICA.

NATURE OF DISTRESS:
${priorityWord.split(' ')[0]} — ${category.toUpperCase()} EMERGENCY.
DETAILS: ${incident?.title || natureOfEmergency}
DESCRIPTION: ${incident?.description || 'Life-safety emergency in progress. Station operations alert active.'}

PERSONNEL ON SCENE / SOULS AFFECTED:
${soulsCount} PERSONNEL REQUIRING IMMEDIATE ASSISTANCE.

ASSISTANCE REQUESTED:
${assistanceType.toUpperCase()}
PRIMARY FREQUENCY: ${channel}
SECONDARY / GUARD FREQUENCY: HF 8.291 MHz USB.

DHRUV TRACKING ID: ${incident?.id || 'LOCAL-INCIDENT'}
TIME OF TRANSMISSION: ${new Date().toUTCString()}

THIS IS ${callsign}. OVER.`;
}

/**
 * Text-to-speech synthesized read-aloud of radio script.
 */
let currentUtterance = null;

export function readAloudScript(scriptText, onEnd = null) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    alert('Web Speech API is not supported on this device/browser.');
    return false;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(scriptText);
  utterance.rate = 0.9; // deliberate tactical radio cadence
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  if (onEnd) {
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
  }

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
  return true;
}

export function stopReadingAloud() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    currentUtterance = null;
  }
}
