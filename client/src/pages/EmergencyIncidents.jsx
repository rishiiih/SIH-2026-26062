import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';

import db from '../db/dexie';
import { saveAndQueue } from '../sync/mutations';
import { authService } from '../services/auth';
import {
  acknowledgeIncident,
  respondToIncident,
  escalateIncident,
  confirmCancellation,
  rejectCancellation,
} from '../sos/sosOperations';
import MusterBoard from '../components/sos/MusterBoard';
import MutualAidDeck from '../components/sos/MutualAidDeck';
import IncidentResolutionModal from '../components/sos/IncidentResolutionModal';

const INITIAL_FORM = {
  title: '',
  description: '',
  severity: 'critical',
  type: 'medical',
  sos_category: 'MED',
};

const CATEGORY_LABELS = {
  MED: { label: 'Medical Emergency', icon: 'medical_services', color: 'bg-red-100 text-red-800 border-red-300' },
  MCI: { label: 'Mass Casualty', icon: 'groups', color: 'bg-red-200 text-red-900 border-red-400' },
  FIRE: { label: 'Fire Hazard', icon: 'local_fire_department', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  HAZ: { label: 'Hazardous Material', icon: 'warning', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  FIELD: { label: 'Field / Outdoor Lost', icon: 'explore', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  MISSING: { label: 'Missing Person', icon: 'person_search', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  INFRA: { label: 'Life-Support Failure', icon: 'power_off', color: 'bg-slate-100 text-slate-800 border-slate-300' },
  EVAC: { label: 'Emergency Evacuation', icon: 'emergency_share', color: 'bg-rose-100 text-rose-800 border-rose-300' },
  UNSPEC: { label: 'Emergency Incident', icon: 'emergency', color: 'bg-gray-100 text-gray-800 border-gray-300' },
};

export default function EmergencyIncidents() {
  const navigate = useNavigate();
  const user = authService.getUser() || { id: 'anonymous', username: 'Guest' };

  const [activeTab, setActiveTab] = useState('deck'); // deck | muster | mutual_aid | archive
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [isOpenRaiseModal, setIsOpenRaiseModal] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [respondingNote, setRespondingNote] = useState('');
  const [isRespondingOpen, setIsRespondingOpen] = useState(false);
  const [resolutionIncident, setResolutionIncident] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');

  // Live query for all incidents
  const incidents = useLiveQuery(
    async () => {
      if (!db.incidents) return [];
      return db.incidents.orderBy('created_at').reverse().toArray();
    },
    [],
    []
  );

  // Active (unresolved) vs archive (resolved/cancelled)
  const activeIncidents = useMemo(
    () => incidents.filter((i) => i.status !== 'resolved' && i.status !== 'cancelled'),
    [incidents]
  );

  const archiveIncidents = useMemo(
    () => incidents.filter((i) => i.status === 'resolved' || i.status === 'cancelled'),
    [incidents]
  );

  // Auto-select first active incident if none selected
  const activeIncident = useMemo(() => {
    if (!incidents.length) return null;
    if (selectedIncidentId) {
      return incidents.find((i) => i.id === selectedIncidentId) || null;
    }
    return activeIncidents[0] || incidents[0] || null;
  }, [incidents, activeIncidents, selectedIncidentId]);

  // Find any incident with a pending false alarm cancellation request
  const pendingCancelIncidents = useMemo(
    () => activeIncidents.filter((i) => i.cancel_requested_at && !i.cancel_confirmed_at),
    [activeIncidents]
  );

  // Live query for delivery receipts
  const deliveryReceipts = useLiveQuery(
    async () => {
      if (!db.sos_delivery || !activeIncident) return [];
      return db.sos_delivery.where('incident_id').equals(activeIncident.id).toArray();
    },
    [activeIncident?.id],
    []
  );

  // Live query for updates / timeline of active incident
  const incidentUpdates = useLiveQuery(
    async () => {
      if (!db.incident_updates || !activeIncident) return [];
      return db.incident_updates
        .where('incident_id')
        .equals(activeIncident.id)
        .reverse()
        .sortBy('created_at');
    },
    [activeIncident?.id],
    []
  );

  // Form input handler
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Submit new incident
  const handleRaiseSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    const now = new Date().toISOString();
    const incidentId = crypto.randomUUID();

    const incident = {
      id: incidentId,
      type: formData.type,
      severity: formData.severity,
      status: 'raised',
      title: formData.title.trim(),
      description: formData.description.trim(),
      is_sos: formData.severity === 'critical',
      sos_category: formData.sos_category,
      location_text: null,
      lat: null,
      lon: null,
      station_id: user.station_id || 1,
      raised_at: now,
      created_at: now,
      updated_at: now,
      version: 1,
      escalation_level: 0,
    };

    await saveAndQueue('incident', incident, 'create', {
      priority: formData.severity === 'critical' ? 100 : 1,
    });

    setFormData(INITIAL_FORM);
    setIsOpenRaiseModal(false);
    setSelectedIncidentId(incidentId);
    setStatusMessage('🚨 Emergency incident registered and prioritized in offline queue.');
    setTimeout(() => setStatusMessage(''), 4000);
  };

  // Commander Actions
  const handleAck = async (incId) => {
    await acknowledgeIncident(incId);
    setStatusMessage('✅ Incident Acknowledged. Alarm countdown disarmed.');
    setTimeout(() => setStatusMessage(''), 4000);
  };

  const handleRespondSubmit = async (e) => {
    e.preventDefault();
    if (!activeIncident) return;
    await respondToIncident(activeIncident.id, respondingNote);
    setRespondingNote('');
    setIsRespondingOpen(false);
    setStatusMessage('🚑 Responder deployment logged to station incident log.');
    setTimeout(() => setStatusMessage(''), 4000);
  };

  const handleEscalate = async (incId, level) => {
    await escalateIncident(incId, level, `Escalation requested via Command Deck`);
    setStatusMessage(`⚡ Incident Escalated to Level ${level}.`);
    setTimeout(() => setStatusMessage(''), 4000);
  };

  const handleConfirmCancel = async (incId) => {
    await confirmCancellation(incId, 'Verified identity and zero-hazard status via radio');
    setStatusMessage('🛡️ False alarm cancellation confirmed. Incident closed.');
    setTimeout(() => setStatusMessage(''), 4000);
  };

  const handleRejectCancel = async (incId) => {
    await rejectCancellation(incId, 'Radio verification failed or hazard remains active');
    setStatusMessage('⚠️ Cancellation rejected. Incident kept active.');
    setTimeout(() => setStatusMessage(''), 4000);
  };

  return (
    <div className="w-full pt-14 pb-10 px-gutter-lg bg-surface min-h-[calc(100vh-2.5rem)]">
      <div className="flex flex-col w-full space-y-5">
        {/* Top Operations Header */}
        <div className="bg-[#EEF1F2] border border-[#C3CCD0] rounded-[3px] p-space-md flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div>
            <div className="flex items-center gap-2 mb-[2px]">
              <span className="material-symbols-outlined text-primary text-[22px]">emergency</span>
              <h1 className="font-headline-lg text-headline-lg text-[#1D2B33]">
                Emergency & Incident Operations Console
              </h1>
              {activeIncidents.length > 0 ? (
                <span className="px-2 py-[2px] bg-red-100 text-red-700 border border-red-300 rounded-[3px] font-label-sm text-label-sm font-bold flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-red-600 animate-ping" />
                  {activeIncidents.length} ACTIVE CRISIS
                </span>
              ) : (
                <span className="px-2 py-[2px] bg-[#EEF1F2] text-[#3F6B3A] border border-[#3F6B3A] rounded-[3px] font-label-sm text-label-sm font-bold">
                  ALL CLEAR • NOMINAL
                </span>
              )}
            </div>
            <p className="font-body-md text-body-md text-[#50616a]">
              Tactical polar command deck, real-time muster roll call, and Antarctic mutual-aid net.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsOpenRaiseModal(true)}
              className="h-8 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-[3px] shadow flex items-center gap-2 text-xs transition-transform active:scale-95"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">add_alert</span>
              <span>Raise Incident (SOS)</span>
            </button>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {statusMessage && (
          <div className="p-3 bg-green-50 border border-green-300 text-green-800 text-xs rounded font-medium flex items-center gap-2 animate-fadeIn">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span>{statusMessage}</span>
          </div>
        )}

        {/* ⚠️ False Alarm Cancellation Warning Banner (Phase 5.2) */}
        {pendingCancelIncidents.map((pInc) => (
          <div
            key={pInc.id}
            className="p-4 bg-amber-50 border-2 border-amber-500 rounded-[3px] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm animate-pulse"
          >
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-amber-600 text-[28px]">
                report_problem
              </span>
              <div>
                <div className="font-bold text-amber-900 text-sm flex items-center gap-2">
                  <span>SENDER REPORTS FALSE ALARM — VERIFICATION MANDATORY</span>
                  <span className="font-mono text-xs font-normal bg-amber-200 px-1.5 py-0.5 rounded text-amber-900">
                    Incident: {pInc.id.slice(0, 8)}
                  </span>
                </div>
                <div className="text-xs text-amber-800 mt-1">
                  Sender reported: <em>"{pInc.cancel_requested_reason || 'False alarm — cancelled within undo window'}"</em>.
                  <strong> Polar standard protocol:</strong> Verify sender identity, status, and physical safety via VHF Radio Channel 16 before closing alarm.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
              <button
                type="button"
                onClick={() => handleRejectCancel(pInc.id)}
                className="h-8 px-3 bg-white border border-amber-400 text-amber-900 hover:bg-amber-100 rounded text-xs font-semibold"
              >
                Reject / Keep Open
              </button>
              <button
                type="button"
                onClick={() => handleConfirmCancel(pInc.id)}
                className="h-8 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold shadow flex items-center gap-1.5 transition-transform active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">verified</span>
                <span>Confirm Cancellation</span>
              </button>
            </div>
          </div>
        ))}

        {/* Operational Navigation Tabs */}
        <div className="border-b border-[#C3CCD0] flex items-center gap-2">
          {[
            { key: 'deck', label: `Operations Deck (${activeIncidents.length})`, icon: 'dashboard' },
            { key: 'muster', label: 'Station Muster Board', icon: 'checklist' },
            { key: 'mutual_aid', label: 'Mutual Aid & Radio Net', icon: 'satellite_alt' },
            { key: 'archive', label: `Incident Archive (${archiveIncidents.length})`, icon: 'history' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-xs font-bold rounded-t-[3px] border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-primary text-primary bg-[#EEF1F2]'
                  : 'border-transparent text-[#50616a] hover:bg-[#EEF1F2]/60'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* TAB 1: OPERATIONS COMMAND DECK */}
        {activeTab === 'deck' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Col: Incident Selector List (5 cols) */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#50616a]">
                  Active Emergency Feed
                </span>
                <span className="text-[11px] text-[#50616a]">
                  {activeIncidents.length} active incidents
                </span>
              </div>

              {!activeIncidents.length ? (
                <div className="p-8 bg-[#EEF1F2] border border-[#C3CCD0] rounded-[3px] text-center text-[#50616a]">
                  <span className="material-symbols-outlined text-[36px] text-[#3F6B3A] mb-2 block">
                    check_circle
                  </span>
                  <div className="font-semibold text-sm text-[#1D2B33]">All Polar Sectors Nominal</div>
                  <div className="text-xs mt-1">No active crisis alerts reported across stations.</div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {activeIncidents.map((inc) => {
                    const isSelected = activeIncident?.id === inc.id;
                    const cat = CATEGORY_LABELS[inc.sos_category] || CATEGORY_LABELS[inc.type] || CATEGORY_LABELS.UNSPEC;

                    return (
                      <div
                        key={inc.id}
                        onClick={() => setSelectedIncidentId(inc.id)}
                        className={`p-3.5 border rounded-[3px] cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-white border-primary shadow-sm ring-1 ring-primary'
                            : 'bg-[#EEF1F2] border-[#C3CCD0] hover:bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase border ${cat.color}`}>
                              {inc.sos_category || inc.type}
                            </span>
                            <span className="text-xs font-bold text-[#1D2B33]">
                              {inc.title || 'SOS Emergency Alert'}
                            </span>
                          </div>

                          <span className="text-[10px] font-mono text-[#50616a]">
                            {inc.raised_at ? new Date(inc.raised_at).toLocaleTimeString() : ''}
                          </span>
                        </div>

                        {inc.description && (
                          <p className="text-xs text-[#50616a] mt-2 line-clamp-2">
                            {inc.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#C3CCD0]/60 text-[11px] text-[#50616a]">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold uppercase text-red-700">
                              {inc.severity}
                            </span>
                            <span>•</span>
                            <span className="font-medium text-[#2F6B73]">
                              Level {inc.escalation_level ?? 0}
                            </span>
                          </div>

                          {inc.acknowledged_at ? (
                            <span className="text-[#3F6B3A] font-medium flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">done_all</span>
                              ACK'd
                            </span>
                          ) : (
                            <span className="text-red-600 font-bold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">priority_high</span>
                              Unacknowledged
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Col: Tactical Incident Detail Deck (7 cols) */}
            <div className="lg:col-span-7">
              {!activeIncident ? (
                <div className="p-8 bg-[#EEF1F2] border border-[#C3CCD0] rounded-[3px] text-center text-[#50616a]">
                  Select an emergency incident to view the response deck and live timeline.
                </div>
              ) : (
                <div className="bg-[#EEF1F2] border border-[#C3CCD0] rounded-[3px] p-5 space-y-5">
                  {/* Incident Header & Badges */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-[#C3CCD0] pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded uppercase">
                          {activeIncident.severity}
                        </span>
                        <h2 className="font-headline-sm text-headline-sm font-bold text-[#1D2B33]">
                          {activeIncident.title}
                        </h2>
                      </div>
                      <div className="text-xs text-[#50616a] mt-1">
                        ID: <span className="font-mono">{activeIncident.id}</span> • Station ID: <strong className="text-[#1D2B33]">{activeIncident.station_id || 'Maitri'}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start">
                      <button
                        type="button"
                        onClick={() => navigate(`/sos/${activeIncident.id}`)}
                        className="h-8 px-2.5 bg-white border border-[#C3CCD0] text-[#1D2B33] hover:bg-gray-100 rounded text-xs font-semibold flex items-center gap-1"
                        title="Open Mobile Sender View"
                      >
                        <span className="material-symbols-outlined text-[16px]">smartphone</span>
                        <span>Sender UX</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setResolutionIncident(activeIncident)}
                        className="h-8 px-3 bg-[#3F6B3A] hover:bg-[#33562E] text-white rounded text-xs font-bold flex items-center gap-1 shadow"
                      >
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        <span>Resolve</span>
                      </button>
                    </div>
                  </div>

                  {/* Multi-Channel Transmission Receipts */}
                  <div className="bg-white border border-[#C3CCD0] p-3 rounded-[3px]">
                    <div className="text-[11px] font-bold uppercase text-[#50616a] mb-2">
                      Transmission & Delivery Channels
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 bg-green-50 border border-green-200 rounded">
                        <div className="font-bold text-[#3F6B3A] flex items-center justify-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">save</span>
                          Local Dexie
                        </div>
                        <div className="text-[10px] text-[#50616a] mt-0.5">Committed</div>
                      </div>

                      <div className="p-2 bg-blue-50 border border-blue-200 rounded">
                        <div className="font-bold text-blue-800 flex items-center justify-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">wifi</span>
                          Station LAN
                        </div>
                        <div className="text-[10px] text-[#50616a] mt-0.5">
                          {deliveryReceipts?.some((r) => r.channel === 'station_lan') ? 'Delivered' : 'Standby / LAN'}
                        </div>
                      </div>

                      <div className="p-2 bg-purple-50 border border-purple-200 rounded">
                        <div className="font-bold text-purple-800 flex items-center justify-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">satellite_alt</span>
                          Central Command
                        </div>
                        <div className="text-[10px] text-[#50616a] mt-0.5">
                          {deliveryReceipts?.some((r) => r.channel === 'central') ? 'Delivered' : 'Uplink Synced'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tactical Action Bar */}
                  <div className="bg-[#E4E8EA] p-3 rounded-[3px] border border-[#C3CCD0] flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {!activeIncident.acknowledged_at && (
                        <button
                          type="button"
                          onClick={() => handleAck(activeIncident.id)}
                          className="h-8 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded text-xs font-bold shadow flex items-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-[16px]">notifications_paused</span>
                          <span>Acknowledge (Disarm Alarm)</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setIsRespondingOpen(true)}
                        className="h-8 px-3 bg-primary-container text-on-primary hover:bg-primary rounded text-xs font-bold flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[16px]">send</span>
                        <span>Dispatch / En Route</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#50616a] font-semibold">Escalate:</span>
                      <button
                        type="button"
                        onClick={() => handleEscalate(activeIncident.id, 1)}
                        className="h-7 px-2 bg-white border border-[#C3CCD0] hover:bg-gray-100 rounded text-xs font-bold"
                      >
                        L1 Team
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEscalate(activeIncident.id, 2)}
                        className="h-7 px-2 bg-white border border-[#C3CCD0] hover:bg-gray-100 rounded text-xs font-bold text-orange-700"
                      >
                        L2 Station
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEscalate(activeIncident.id, 3)}
                        className="h-7 px-2 bg-white border border-red-300 hover:bg-red-50 rounded text-xs font-bold text-red-700"
                      >
                        L3 Mutual Aid
                      </button>
                    </div>
                  </div>

                  {/* Responder Dispatch Input Drawer */}
                  {isRespondingOpen && (
                    <form onSubmit={handleRespondSubmit} className="p-3 bg-white border border-[#C3CCD0] rounded space-y-2">
                      <div className="text-xs font-bold text-[#1D2B33]">Log Responder Movement</div>
                      <input
                        type="text"
                        required
                        value={respondingNote}
                        onChange={(e) => setRespondingNote(e.target.value)}
                        placeholder="e.g., Station Doctor & Medic dispatched with trauma kit..."
                        className="w-full h-8 px-3 bg-white border border-[#C3CCD0] rounded text-xs text-[#1D2B33]"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setIsRespondingOpen(false)}
                          className="h-7 px-3 bg-transparent border border-[#C3CCD0] rounded text-xs text-[#50616a]"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="h-7 px-3 bg-primary-container text-on-primary rounded text-xs font-bold"
                        >
                          Commit Note
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Live Updates Timeline & Audit Trail */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#50616a] mb-2">
                      <span>Timeline & Response Audit Trail</span>
                      <span className="font-mono">{incidentUpdates ? incidentUpdates.length : 0} events</span>
                    </div>

                    <div className="bg-white border border-[#C3CCD0] rounded-[3px] p-3 max-h-72 overflow-y-auto space-y-2.5">
                      {!incidentUpdates || incidentUpdates.length === 0 ? (
                        <div className="text-xs text-[#50616a] text-center py-4">
                          No timeline updates recorded yet. Actions taken will appear here.
                        </div>
                      ) : (
                        incidentUpdates.map((upd) => (
                          <div key={upd.id} className="flex items-start gap-2.5 text-xs pb-2 border-b border-gray-100 last:border-0 last:pb-0">
                            <span className="material-symbols-outlined text-[16px] text-primary mt-0.5">
                              {upd.kind === 'ack' ? 'task_alt' : upd.kind === 'respond' ? 'directions_run' : upd.kind === 'escalation' ? 'warning' : 'circle'}
                            </span>
                            <div className="flex-1">
                              <div className="text-[#1D2B33] font-medium">
                                {upd.note || upd.content || 'Incident updated'}
                              </div>
                              <div className="text-[10px] text-[#50616a] font-mono mt-0.5">
                                {upd.created_at ? new Date(upd.created_at).toLocaleTimeString() : ''} • User: {upd.user_id || 'System'}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: STATION MUSTER BOARD */}
        {activeTab === 'muster' && (
          <MusterBoard
            activeIncident={activeIncident}
            onSosFired={(newId) => setSelectedIncidentId(newId)}
          />
        )}

        {/* TAB 3: MUTUAL AID & RADIO DISTRESS */}
        {activeTab === 'mutual_aid' && (
          <MutualAidDeck activeIncident={activeIncident} />
        )}

        {/* TAB 4: INCIDENT ARCHIVE */}
        {activeTab === 'archive' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-headline-sm text-headline-sm font-bold text-[#1D2B33]">
                Resolved & Cancelled Incident Archive
              </h2>
              <span className="text-xs text-[#50616a]">
                {archiveIncidents.length} historical records
              </span>
            </div>

            {!archiveIncidents.length ? (
              <div className="p-8 bg-[#EEF1F2] border border-[#C3CCD0] rounded-[3px] text-center text-[#50616a]">
                No archived incidents. Resolved and cancelled incidents will be stored here.
              </div>
            ) : (
              <div className="bg-white border border-[#C3CCD0] rounded overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#E4E8EA] border-b border-[#C3CCD0] text-[#50616a] font-bold uppercase">
                      <th className="py-2.5 px-3">Incident Title & ID</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Raised At</th>
                      <th className="py-2.5 px-3">Resolved At</th>
                      <th className="py-2.5 px-3 text-right">After-Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#C3CCD0]">
                    {archiveIncidents.map((inc) => (
                      <tr key={inc.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-2.5 px-3 font-medium text-[#1D2B33]">
                          <div>{inc.title}</div>
                          <div className="text-[10px] font-mono text-[#50616a]">{inc.id}</div>
                        </td>
                        <td className="py-2.5 px-3 font-bold uppercase text-[#50616a]">
                          {inc.sos_category || inc.type}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                              inc.status === 'resolved'
                                ? 'bg-green-100 text-green-800 border-green-300'
                                : 'bg-gray-100 text-gray-800 border-gray-300'
                            }`}
                          >
                            {inc.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-[#50616a]">
                          {inc.raised_at ? new Date(inc.raised_at).toLocaleString() : 'N/A'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-[#50616a]">
                          {inc.resolved_at ? new Date(inc.resolved_at).toLocaleString() : (inc.cancel_confirmed_at ? new Date(inc.cancel_confirmed_at).toLocaleString() : 'N/A')}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => setResolutionIncident(inc)}
                            className="px-2.5 py-1 bg-white border border-[#C3CCD0] hover:bg-gray-50 text-[#1D2B33] rounded text-[11px] font-semibold flex items-center gap-1 ml-auto"
                          >
                            <span className="material-symbols-outlined text-[14px]">description</span>
                            <span>Report</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Raise Emergency Incident Modal */}
        {isOpenRaiseModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <form
              onSubmit={handleRaiseSubmit}
              className="bg-white border border-[#C3CCD0] p-6 rounded-[3px] w-full max-w-lg space-y-4 text-gray-900 shadow-xl"
            >
              <div className="flex items-center justify-between border-b pb-2">
                <h2 className="text-lg font-bold text-red-600 flex items-center gap-2">
                  <span className="material-symbols-outlined">warning</span>
                  Raise Emergency Incident
                </h2>
                <button
                  type="button"
                  onClick={() => setIsOpenRaiseModal(false)}
                  className="text-gray-400 hover:text-gray-700"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 mb-1">
                  Incident Title
                </label>
                <input
                  name="title"
                  type="text"
                  required
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Generator fuel line freeze / Crevasse fall"
                  className="w-full h-9 px-3 bg-white border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-600 mb-1">
                    SOS Category
                  </label>
                  <select
                    name="sos_category"
                    value={formData.sos_category}
                    onChange={handleChange}
                    className="w-full h-9 px-2 bg-white border border-gray-300 rounded text-sm text-gray-900"
                  >
                    <option value="MED">Medical (MED)</option>
                    <option value="MCI">Mass Casualty (MCI)</option>
                    <option value="FIRE">Fire (FIRE)</option>
                    <option value="HAZ">Hazardous Mat (HAZ)</option>
                    <option value="FIELD">Field Lost (FIELD)</option>
                    <option value="MISSING">Missing Person (MISSING)</option>
                    <option value="INFRA">Life-Support / Power (INFRA)</option>
                    <option value="EVAC">Evacuation (EVAC)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-600 mb-1">
                    Severity
                  </label>
                  <select
                    name="severity"
                    value={formData.severity}
                    onChange={handleChange}
                    className="w-full h-9 px-2 bg-white border border-gray-300 rounded text-sm text-gray-900"
                  >
                    <option value="critical">Critical (Priority P0)</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 mb-1">
                  Description & Context
                </label>
                <textarea
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Describe conditions, casualties, location markers..."
                  className="w-full p-3 bg-white border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsOpenRaiseModal(false)}
                  className="h-9 px-4 bg-gray-100 border border-gray-300 text-gray-700 rounded text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold shadow"
                >
                  Dispatch Alert (Offline Safe)
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Resolution Modal */}
        {resolutionIncident && (
          <IncidentResolutionModal
            incident={resolutionIncident}
            onClose={() => setResolutionIncident(null)}
            onResolved={() => {
              setStatusMessage('✅ Incident resolved and formally logged.');
              setTimeout(() => setStatusMessage(''), 4000);
            }}
          />
        )}
      </div>
    </div>
  );
}