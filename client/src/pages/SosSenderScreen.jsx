import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';

import db from '../db/dexie';
import { cancelBeacon } from '../sos/beacon';
import { saveAndQueue } from '../sync/mutations';
import syncEngine from '../sync/sync-engine';
import { authService } from '../services/auth';
import {
  UNDO_WINDOW_S,
  SOS_CATEGORIES,
  DELIVERY_CHANNELS,
} from '../sos/sosConfig';
import { PRIORITIES } from '../sync/priorities';

/**
 * Delivery status labels for the channel delivery ladder.
 */
const CHANNEL_LABELS = {
  [DELIVERY_CHANNELS.LOCAL]: {
    icon: 'save',
    label: 'Saved locally',
    description: 'Written to device storage',
  },
  [DELIVERY_CHANNELS.STATION]: {
    icon: 'lan',
    label: 'Station network',
    description: 'Delivered to Station Node LAN',
  },
  [DELIVERY_CHANNELS.CENTRAL]: {
    icon: 'cloud_done',
    label: 'Central Command',
    description: 'Received by Central HQ',
  },
};

/**
 * Medical quick-fields (shown when category is MED or MCI).
 */
const MED_FIELDS = [
  { key: 'conscious', label: 'Patient conscious?', type: 'toggle' },
  { key: 'breathing', label: 'Patient breathing?', type: 'toggle' },
  { key: 'bleeding', label: 'Active bleeding?', type: 'toggle' },
  { key: 'people_affected', label: 'Number of people', type: 'number' },
];

/**
 * Fire quick-fields.
 */
const FIRE_FIELDS = [
  { key: 'contained', label: 'Fire contained?', type: 'toggle' },
  { key: 'structure', label: 'Structure at risk?', type: 'toggle' },
  { key: 'people_affected', label: 'People in area', type: 'number' },
];

/**
 * Missing person quick-fields.
 */
const MISSING_FIELDS = [
  { key: 'last_seen', label: 'Last seen (time)', type: 'text' },
  { key: 'last_location', label: 'Last known location', type: 'text' },
  { key: 'people_affected', label: 'Number missing', type: 'number' },
];

function getQuickFields(category) {
  switch (category) {
    case 'MED':
    case 'MCI':
      return MED_FIELDS;
    case 'FIRE':
      return FIRE_FIELDS;
    case 'MISSING':
      return MISSING_FIELDS;
    default:
      return [];
  }
}

/**
 * Playbook checklist items per category.
 */
const PLAYBOOKS = {
  MED: [
    'Assess patient responsiveness (AVPU)',
    'Check airway, breathing, circulation',
    'Apply direct pressure to bleeding',
    'Keep patient warm — prevent hypothermia',
    'Do NOT move patient unless danger is immediate',
  ],
  MCI: [
    'Activate mass casualty protocol',
    'Establish triage area (START method)',
    'Radio station leader for all-hands response',
    'Begin patient tagging',
  ],
  FIRE: [
    'Activate fire alarm if not automatic',
    'Evacuate immediate area',
    'Close doors behind you',
    'Use fire extinguisher only if safe to do so',
    'Do NOT re-enter building',
  ],
  HAZ: [
    'Move upwind from the spill/release',
    'Do NOT touch contaminated materials',
    'Seal the area if possible',
    'Radio HazMat details to station leader',
  ],
  FIELD: [
    'Stay with the group — do not separate',
    'Deploy emergency shelter if conditions worsen',
    'Activate personal locator beacon (PLB)',
    'Conserve battery on all devices',
  ],
  MISSING: [
    'Confirm last known location',
    'Establish search party (minimum 2 persons)',
    'Radio all field teams for sightings',
    'Mark last known position on map',
  ],
  INFRA: [
    'Switch to backup generator if available',
    'Secure critical refrigeration and comms',
    'Check circuit breakers and fuel supply',
    'Report status to Central Command',
  ],
  EVAC: [
    'Sound evacuation alarm',
    'Proceed to designated muster point',
    'Account for all personnel',
    'Await station leader headcount confirmation',
  ],
};

export default function SosSenderScreen() {
  const { id: incidentId } = useParams();
  const navigate = useNavigate();
  const user = authService.getUser();

  // ─── Live data from Dexie ───
  const incident = useLiveQuery(
    () => (incidentId && db.incidents ? db.incidents.get(incidentId) : null),
    [incidentId]
  );

  const deliveries = useLiveQuery(
    () =>
      db.sos_delivery
        ? db.sos_delivery
            .where('incident_id')
            .equals(incidentId || '')
            .toArray()
        : [],
    [incidentId],
    []
  );

  // ─── Undo countdown ───
  const [undoRemaining, setUndoRemaining] = useState(UNDO_WINDOW_S);
  const [undoExpired, setUndoExpired] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    if (!incident?.raised_at || cancelled) return;
    const raisedAt = new Date(incident.raised_at).getTime();

    const tick = () => {
      const elapsed = (Date.now() - raisedAt) / 1000;
      const remaining = Math.max(0, UNDO_WINDOW_S - elapsed);
      setUndoRemaining(Math.ceil(remaining));
      if (remaining <= 0) setUndoExpired(true);
    };

    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [incident?.raised_at, cancelled]);

  // ─── Category selection ───
  const [selectedCategory, setSelectedCategory] = useState(
    incident?.sos_category || null
  );

  useEffect(() => {
    if (incident?.sos_category) setSelectedCategory(incident.sos_category);
  }, [incident?.sos_category]);

  // ─── Quick-fields state ───
  const [quickFields, setQuickFields] = useState({});
  const [quickFieldsSent, setQuickFieldsSent] = useState(false);

  // ─── Playbook checklist ───
  const [checkedItems, setCheckedItems] = useState({});
  const playbookItems = PLAYBOOKS[selectedCategory] || PLAYBOOKS['FIELD'] || [];

  // ─── Handlers ───
  const handleUndo = useCallback(async () => {
    if (!incidentId || undoExpired || cancelled) return;
    setCancelled(true);
    await cancelBeacon(incidentId);
  }, [incidentId, undoExpired, cancelled]);

  const handleCategorySelect = useCallback(
    async (catKey) => {
      if (!incidentId || !incident) return;
      setSelectedCategory(catKey);
      // Update local Dexie
      await db.incidents.update(incidentId, {
        sos_category: catKey,
        type: catKey.toLowerCase(),
        title: `SOS — ${catKey}`,
        updated_at: new Date().toISOString(),
      });
    },
    [incidentId, incident]
  );

  const handleSendQuickFields = useCallback(async () => {
    if (!incidentId || quickFieldsSent) return;

    const peopleAffected = quickFields.people_affected
      ? parseInt(quickFields.people_affected, 10) || null
      : null;

    // Update incident with details
    await db.incidents.update(incidentId, {
      details: quickFields,
      people_affected: peopleAffected,
      sos_category: selectedCategory,
      updated_at: new Date().toISOString(),
    });

    // Create an incident_update with details
    await saveAndQueue(
      'incident_update',
      {
        id: crypto.randomUUID(),
        incident_id: incidentId,
        kind: 'note',
        content: JSON.stringify({
          category: selectedCategory,
          quick_fields: quickFields,
        }),
        user_id: user?.id,
        station_id: user?.station_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
      },
      'create',
      { priority: PRIORITIES.SOS_DETAIL }
    );

    setQuickFieldsSent(true);

    // Trigger fast-lane push
    if (user?.id) syncEngine.fireSosFastLane(user.id);
  }, [incidentId, quickFields, selectedCategory, quickFieldsSent, user]);

  // ─── Delivery ladder status ───
  function channelStatus(channel) {
    return deliveries.find((d) => d.channel === channel);
  }

  // ─── RENDER ───
  if (!incident) {
    return (
      <div className="p-6 pt-20 max-w-2xl mx-auto text-center text-on-surface-variant">
        Loading SOS details…
      </div>
    );
  }

  if (cancelled || incident.cancel_requested_at) {
    return (
      <div className="p-6 pt-20 max-w-2xl mx-auto space-y-6">
        <div className="p-8 bg-surface-container border border-outline-variant rounded-lg text-center space-y-4">
          <span className="material-symbols-outlined text-[48px] text-on-surface-variant">
            check_circle
          </span>
          <h2 className="font-headline-md text-headline-md text-on-surface">
            SOS Cancelled
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            A cancellation request has been dispatched. Station leaders will
            verify by radio before closing the incident.
          </p>
          <button
            type="button"
            onClick={() => navigate('/emergency')}
            className="h-9 px-4 bg-primary text-on-primary font-title-sm text-title-sm rounded-sm hover:bg-primary-container transition-colors"
          >
            Return to Emergency Console
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 pt-20 max-w-2xl mx-auto space-y-6">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">
            {incident.title || 'SOS Alert'}
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
            Incident {incidentId?.slice(0, 8)}… • raised{' '}
            {incident.raised_at
              ? new Date(incident.raised_at).toLocaleTimeString()
              : '—'}
          </p>
        </div>

        {/* Undo button */}
        {!undoExpired && (
          <button
            type="button"
            onClick={handleUndo}
            className="h-10 px-5 bg-surface-container-highest border border-outline text-on-surface font-title-md text-title-md rounded-sm hover:bg-surface-dim transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">undo</span>
            Cancel ({undoRemaining}s)
          </button>
        )}
      </div>

      {/* ─── Delivery Ladder ─── */}
      <section className="bg-surface-container border border-outline-variant rounded-lg p-5 space-y-3">
        <h2 className="font-title-md text-title-md text-on-surface uppercase tracking-wider">
          Delivery Status
        </h2>

        <div className="space-y-2">
          {Object.entries(CHANNEL_LABELS).map(([channel, meta]) => {
            const delivery = channelStatus(channel);
            const done = Boolean(delivery);

            return (
              <div
                key={channel}
                className={`flex items-center gap-3 p-3 rounded-sm border transition-colors ${
                  done
                    ? 'bg-surface-container-lowest border-outline-variant'
                    : 'bg-surface-container-high border-outline-variant/50 opacity-60'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[20px] ${
                    done ? 'text-primary' : 'text-outline'
                  }`}
                >
                  {done ? 'check_circle' : meta.icon}
                </span>
                <div className="flex-1">
                  <span className="font-title-sm text-title-sm text-on-surface">
                    {meta.label}
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant ml-2">
                    {done
                      ? `✓ ${new Date(delivery.timestamp).toLocaleTimeString()}`
                      : meta.description}
                  </span>
                </div>
              </div>
            );
          })}

          {/* ACK status */}
          <div
            className={`flex items-center gap-3 p-3 rounded-sm border transition-colors ${
              incident.status === 'acknowledged' ||
              incident.status === 'responding' ||
              incident.status === 'resolved'
                ? 'bg-surface-container-lowest border-outline-variant'
                : 'bg-surface-container-high border-outline-variant/50 opacity-60'
            }`}
          >
            <span
              className={`material-symbols-outlined text-[20px] ${
                incident.status === 'acknowledged' ||
                incident.status === 'responding'
                  ? 'text-primary'
                  : 'text-outline'
              }`}
            >
              {incident.status === 'acknowledged' ||
              incident.status === 'responding'
                ? 'check_circle'
                : 'person_check'}
            </span>
            <div className="flex-1">
              <span className="font-title-sm text-title-sm text-on-surface">
                Acknowledged
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant ml-2">
                {incident.status === 'acknowledged' ||
                incident.status === 'responding'
                  ? '✓ Someone is responding'
                  : 'Waiting for acknowledgement…'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Emergency Type Selector ─── */}
      <section className="bg-surface-container border border-outline-variant rounded-lg p-5 space-y-3">
        <h2 className="font-title-md text-title-md text-on-surface uppercase tracking-wider">
          Emergency Type
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SOS_CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => handleCategorySelect(cat.key)}
              className={`h-12 flex flex-col items-center justify-center rounded-sm border text-center transition-colors ${
                selectedCategory === cat.key
                  ? 'bg-primary-container border-primary text-on-primary-container font-semibold'
                  : 'bg-surface-container-lowest border-outline-variant text-on-surface hover:bg-surface-container-high'
              }`}
            >
              <span className="font-label-md text-label-md uppercase">
                {cat.key}
              </span>
              <span className="font-body-sm text-[10px] text-on-surface-variant leading-tight">
                {cat.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ─── Quick-Fields (contextual) ─── */}
      {selectedCategory && getQuickFields(selectedCategory).length > 0 && (
        <section className="bg-surface-container border border-outline-variant rounded-lg p-5 space-y-3">
          <h2 className="font-title-md text-title-md text-on-surface uppercase tracking-wider">
            Quick Details
          </h2>

          <div className="space-y-3">
            {getQuickFields(selectedCategory).map((field) => (
              <div key={field.key} className="flex items-center gap-3">
                <label className="font-body-md text-body-md text-on-surface w-40 shrink-0">
                  {field.label}
                </label>

                {field.type === 'toggle' ? (
                  <div className="flex gap-2">
                    {['Yes', 'No', 'Unknown'].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() =>
                          setQuickFields((prev) => ({
                            ...prev,
                            [field.key]: opt.toLowerCase(),
                          }))
                        }
                        className={`h-8 px-3 rounded-sm border font-title-sm text-title-sm transition-colors ${
                          quickFields[field.key] === opt.toLowerCase()
                            ? 'bg-primary-container border-primary text-on-primary-container'
                            : 'bg-surface-container-lowest border-outline-variant text-on-surface hover:bg-surface-container-high'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : field.type === 'number' ? (
                  <input
                    type="number"
                    min={1}
                    value={quickFields[field.key] || ''}
                    onChange={(e) =>
                      setQuickFields((prev) => ({
                        ...prev,
                        [field.key]: e.target.value,
                      }))
                    }
                    className="h-8 w-24 px-2 bg-surface-container-lowest border border-outline-variant rounded-sm font-data-mono-md text-body-sm text-on-surface"
                  />
                ) : (
                  <input
                    type="text"
                    value={quickFields[field.key] || ''}
                    onChange={(e) =>
                      setQuickFields((prev) => ({
                        ...prev,
                        [field.key]: e.target.value,
                      }))
                    }
                    className="h-8 flex-1 px-2 bg-surface-container-lowest border border-outline-variant rounded-sm font-body-md text-body-md text-on-surface"
                  />
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleSendQuickFields}
            disabled={quickFieldsSent}
            className="h-9 px-4 bg-primary text-on-primary font-title-sm text-title-sm rounded-sm hover:bg-primary-container transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px]">send</span>
            {quickFieldsSent ? 'Details Sent ✓' : 'Send Details'}
          </button>
        </section>
      )}

      {/* ─── Offline Playbook Checklist ─── */}
      <section className="bg-surface-container border border-outline-variant rounded-lg p-5 space-y-3">
        <h2 className="font-title-md text-title-md text-on-surface uppercase tracking-wider flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-primary">
            checklist
          </span>
          Emergency Playbook
          {selectedCategory && (
            <span className="px-2 py-0.5 bg-secondary-container text-on-secondary-fixed-variant font-label-sm text-label-sm rounded-sm uppercase">
              {selectedCategory}
            </span>
          )}
        </h2>

        <div className="space-y-1">
          {playbookItems.map((item, idx) => (
            <label
              key={idx}
              className={`flex items-start gap-3 p-2 rounded-sm cursor-pointer hover:bg-surface-container-high transition-colors ${
                checkedItems[idx] ? 'opacity-60' : ''
              }`}
            >
              <input
                type="checkbox"
                checked={!!checkedItems[idx]}
                onChange={() =>
                  setCheckedItems((prev) => ({
                    ...prev,
                    [idx]: !prev[idx],
                  }))
                }
                className="mt-0.5 w-4 h-4 accent-primary"
              />
              <span
                className={`font-body-md text-body-md text-on-surface ${
                  checkedItems[idx] ? 'line-through' : ''
                }`}
              >
                {item}
              </span>
            </label>
          ))}
        </div>
      </section>

      {/* ─── Geolocation Info ─── */}
      {(incident.lat || incident.lon) && (
        <section className="bg-surface-container border border-outline-variant rounded-lg p-4">
          <div className="flex items-center gap-2 text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px]">
              location_on
            </span>
            <span className="font-data-mono-md text-body-sm">
              {incident.lat?.toFixed(5)}, {incident.lon?.toFixed(5)}
            </span>
            <span className="font-body-sm text-body-sm ml-2">
              (captured at beacon time)
            </span>
          </div>
        </section>
      )}
    </div>
  );
}
