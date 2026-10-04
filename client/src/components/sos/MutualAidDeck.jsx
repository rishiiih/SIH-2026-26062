import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';

import db from '../../db/dexie';
import {
  seedStationNeighboursIfEmpty,
  SAMPLE_POLAR_NEIGHBOURS,
  generateDistressScript,
  readAloudScript,
  stopReadingAloud,
  createAssistanceRequest,
  updateAssistanceStatus,
} from '../../sos/sosOperations';
import { authService } from '../../services/auth';

const CHANNELS = [
  'VHF Ch 16 (156.800 MHz)',
  'VHF Ch 06 (156.300 MHz)',
  'VHF Air 129.700 MHz',
  'HF 8.291 MHz USB (Antarctic Distress)',
  'HF 6.224 MHz USB',
  'HF 4.125 MHz USB',
  'Iridium Polar Satellite Phone',
  'Overland Snowcat Runner',
];

const AID_STATUS_BADGES = {
  requested: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  contacted: 'bg-blue-100 text-blue-800 border-blue-300',
  accepted: 'bg-green-100 text-green-800 border-green-300',
  declined: 'bg-red-100 text-red-800 border-red-300',
  completed: 'bg-purple-100 text-purple-800 border-purple-300',
  no_response: 'bg-gray-100 text-gray-800 border-gray-300',
};

export default function MutualAidDeck({ activeIncident = null }) {
  const user = authService.getUser() || {};
  const stationId = activeIncident?.station_id || user.station_id || 1;

  const [selectedStation, setSelectedStation] = useState(stationId);
  const [selectedNeighbour, setSelectedNeighbour] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(CHANNELS[0]);
  const [soulsCount, setSoulsCount] = useState(activeIncident?.people_affected || 2);
  const [customAidNote, setCustomAidNote] = useState('');
  const [copied, setCopied] = useState(false);
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusNoteInput, setStatusNoteInput] = useState('');
  const [activeAidId, setActiveAidId] = useState(null);

  useEffect(() => {
    seedStationNeighboursIfEmpty();
  }, []);

  // Fetch neighbours from Dexie
  const dbNeighbours = useLiveQuery(
    async () => {
      if (!db.station_neighbours) return [];
      const list = await db.station_neighbours
        .filter((n) => Number(n.station_id) === Number(selectedStation))
        .toArray();
      return list;
    },
    [selectedStation],
    []
  );

  const neighboursList =
    dbNeighbours && dbNeighbours.length > 0
      ? dbNeighbours
      : SAMPLE_POLAR_NEIGHBOURS.filter((n) => Number(n.station_id) === Number(selectedStation));

  // Set default neighbour
  useEffect(() => {
    if (neighboursList && neighboursList.length > 0 && !selectedNeighbour) {
      setSelectedNeighbour(neighboursList[0]);
    }
  }, [neighboursList, selectedNeighbour]);

  // Fetch assistance requests for this incident
  const incidentId = activeIncident?.id || 'station-general-ops';
  const aidRequests = useLiveQuery(
    async () => {
      if (!db.assistance_requests) return [];
      const reqs = await db.assistance_requests
        .filter((r) => r.incident_id === incidentId || !activeIncident)
        .toArray();
      return reqs;
    },
    [incidentId, activeIncident],
    []
  );

  // Generate distress radio script
  const stationName = selectedStation === 2 ? 'Bharati Station' : 'Maitri Station';
  const scriptText = generateDistressScript({
    incident: activeIncident,
    stationName,
    soulsCount,
    natureOfEmergency: activeIncident?.title || 'Critical Life-Safety Emergency',
    assistanceType: selectedNeighbour?.services || 'Medical & Heavy Transport Support',
    channel: selectedChannel,
  });

  const handleCopyScript = async () => {
    try {
      await navigator.clipboard.writeText(scriptText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleToggleTTS = () => {
    if (isPlayingTTS) {
      stopReadingAloud();
      setIsPlayingTTS(false);
    } else {
      setIsPlayingTTS(true);
      readAloudScript(scriptText, () => setIsPlayingTTS(false));
    }
  };

  const handleCreateRequest = async () => {
    if (!selectedNeighbour) return;
    try {
      setSubmitting(true);
      await createAssistanceRequest({
        incidentId,
        neighbourId: selectedNeighbour.id,
        externalLabel: `${selectedNeighbour.name} (${selectedNeighbour.country})`,
        channel: selectedChannel,
        scriptText,
        note: customAidNote || `Mutual aid dispatched via ${selectedChannel}`,
      });
      setCustomAidNote('');
    } catch (err) {
      console.error('Failed to log assistance request:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (aidId, status) => {
    try {
      await updateAssistanceStatus({
        incidentId,
        aidId,
        status,
        note: statusNoteInput,
      });
      setActiveAidId(null);
      setStatusNoteInput('');
    } catch (err) {
      console.error('Failed to update aid request status:', err);
    }
  };

  return (
    <div className="space-y-5">
      {/* Station Selector Bar */}
      <div className="bg-[#EEF1F2] border border-[#C3CCD0] rounded-[3px] p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#E4E8EA] border border-[#C3CCD0] rounded text-primary">
            <span className="material-symbols-outlined text-[24px]">satellite_alt</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-headline-sm text-headline-sm font-bold text-[#1D2B33]">
                International Polar Mutual Aid & Distress Radio Net
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-[#EEF1F2] text-[#2F6B73] border border-[#2F6B73] uppercase tracking-wide">
                Antarctic Treaty Protocol
              </span>
            </div>
            <p className="text-xs text-[#50616a]">
              Cross-station emergency assistance directory, ICAO distress scripts, and request ledger.
            </p>
          </div>
        </div>

        <select
          value={selectedStation}
          onChange={(e) => {
            setSelectedStation(Number(e.target.value));
            setSelectedNeighbour(null);
          }}
          className="h-8 px-2.5 bg-white border border-[#C3CCD0] rounded text-xs font-semibold text-[#1D2B33] focus:outline-none"
        >
          <option value={1}>Maitri Sector (Schirmacher Oasis)</option>
          <option value={2}>Bharati Sector (Larsemann Hills)</option>
        </select>
      </div>

      {/* Grid: Neighbours + Radio Script */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Neighbours Directory (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#50616a]">
              Nearby Polar Research Stations
            </h3>
            <span className="text-[11px] text-[#50616a]">
              {neighboursList.length} stations in range
            </span>
          </div>

          <div className="space-y-2.5">
            {neighboursList.map((nbr) => {
              const isSelected = selectedNeighbour?.id === nbr.id;
              return (
                <div
                  key={nbr.id}
                  onClick={() => setSelectedNeighbour(nbr)}
                  className={`p-3.5 border rounded-[3px] cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-white border-primary shadow-sm ring-1 ring-primary'
                      : 'bg-[#EEF1F2] border-[#C3CCD0] hover:bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-sm text-[#1D2B33] flex items-center gap-1.5">
                        <span>{nbr.name}</span>
                      </div>
                      <div className="text-xs text-[#50616a] mt-0.5">
                        {nbr.country} • <strong className="text-primary font-mono">{nbr.distance_note}</strong>
                      </div>
                    </div>
                    {nbr.is_sample && (
                      <span className="px-1.5 py-0.5 bg-amber-100 border border-amber-300 text-amber-800 text-[9px] font-bold uppercase rounded">
                        SAMPLE — verify
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-[#50616a] mt-2 pt-2 border-t border-[#C3CCD0]/60 space-y-1">
                    <div>
                      <span className="font-semibold text-[#1D2B33]">Capability:</span> {nbr.services}
                    </div>
                    <div className="font-mono text-[11px] text-[#2F6B73]">
                      {nbr.contact_channels}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Standard Distress Script Generator (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="bg-[#EEF1F2] border border-[#C3CCD0] rounded-[3px] p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-[#C3CCD0] pb-3">
              <div>
                <h3 className="font-headline-sm text-headline-sm font-bold text-[#1D2B33]">
                  Tactical Distress Radio Script Generator
                </h3>
                <p className="text-xs text-[#50616a]">
                  Formatted per ICAO / Antarctic Treaty search-and-rescue distress transmission standards.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleTTS}
                  className={`h-8 px-3 rounded text-xs font-bold flex items-center gap-1.5 transition-colors ${
                    isPlayingTTS
                      ? 'bg-red-600 text-white'
                      : 'bg-white border border-[#C3CCD0] text-[#1D2B33] hover:bg-gray-100'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {isPlayingTTS ? 'stop' : 'volume_up'}
                  </span>
                  <span>{isPlayingTTS ? 'Stop Audio' : 'Read Aloud (TTS)'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyScript}
                  className="h-8 px-3 bg-primary-container text-on-primary rounded text-xs font-bold flex items-center gap-1.5 hover:bg-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {copied ? 'check' : 'content_copy'}
                  </span>
                  <span>{copied ? 'Copied!' : 'Copy Script'}</span>
                </button>
              </div>
            </div>

            {/* Config inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-[#50616a] mb-1">
                  Primary Radio Frequency / Net
                </label>
                <select
                  value={selectedChannel}
                  onChange={(e) => setSelectedChannel(e.target.value)}
                  className="w-full h-8 px-2 bg-white border border-[#C3CCD0] rounded text-xs text-[#1D2B33]"
                >
                  {CHANNELS.map((ch) => (
                    <option key={ch} value={ch}>
                      {ch}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#50616a] mb-1">
                  Souls / Crew Requiring Assistance
                </label>
                <input
                  type="number"
                  min={1}
                  value={soulsCount}
                  onChange={(e) => setSoulsCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full h-8 px-2.5 bg-white border border-[#C3CCD0] rounded text-xs text-[#1D2B33]"
                />
              </div>
            </div>

            {/* Teleprompter Display */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-bold uppercase text-[#50616a] mb-1">
                <span>Distress Teleprompter (Read verbatim over VHF/HF)</span>
                <span className="text-red-700 font-bold">● LIVE PROTOCOL</span>
              </div>
              <pre className="p-3.5 bg-[#1D2B33] text-green-400 font-mono text-xs rounded border border-gray-700 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                {scriptText}
              </pre>
            </div>

            {/* Dispatch Mutual Aid Request */}
            <div className="pt-2 border-t border-[#C3CCD0] flex flex-col sm:flex-row items-center gap-2">
              <input
                type="text"
                value={customAidNote}
                onChange={(e) => setCustomAidNote(e.target.value)}
                placeholder="Optional dispatch notes (e.g. Basler aircraft fuel status)..."
                className="flex-1 h-8 px-3 bg-white border border-[#C3CCD0] rounded text-xs text-[#1D2B33]"
              />
              <button
                type="button"
                onClick={handleCreateRequest}
                disabled={submitting || !selectedNeighbour}
                className="h-8 px-4 bg-[#2F6B73] hover:bg-[#25555C] text-white rounded text-xs font-bold flex items-center gap-1.5 shrink-0 transition-transform active:scale-95 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">send</span>
                <span>Log Outgoing Aid Request</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: Assistance Requests Ledger */}
      <div className="bg-[#EEF1F2] border border-[#C3CCD0] rounded-[3px] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">fact_check</span>
            <h3 className="font-headline-sm text-headline-sm font-bold text-[#1D2B33]">
              Mutual Aid Assistance Request Ledger
            </h3>
          </div>
          <span className="text-xs text-[#50616a]">
            {aidRequests ? aidRequests.length : 0} logged requests
          </span>
        </div>

        {!aidRequests || aidRequests.length === 0 ? (
          <div className="p-6 bg-white border border-[#C3CCD0] rounded text-center text-xs text-[#50616a]">
            No mutual aid requests logged yet. Use the directory above to dispatch and track aid requests.
          </div>
        ) : (
          <div className="bg-white border border-[#C3CCD0] rounded overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#E4E8EA] border-b border-[#C3CCD0] text-[#50616a] font-bold uppercase">
                    <th className="py-2.5 px-3">Target Station</th>
                    <th className="py-2.5 px-3">Comm Channel</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Logged Time</th>
                    <th className="py-2.5 px-3 text-right">Update Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#C3CCD0]">
                  {aidRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-2.5 px-3 font-medium text-[#1D2B33]">
                        {req.external_label || req.neighbour_id}
                        {req.note && (
                          <div className="text-[11px] text-[#50616a] font-normal">{req.note}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-[#50616a]">
                        {req.channel}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            AID_STATUS_BADGES[req.status] || 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-[#50616a]">
                        {req.requested_at ? new Date(req.requested_at).toLocaleTimeString() : 'N/A'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(req.id, 'contacted')}
                            className="px-2 py-1 bg-white border border-[#C3CCD0] hover:bg-blue-50 text-blue-800 rounded text-[10px] font-bold"
                          >
                            Contacted
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(req.id, 'accepted')}
                            className="px-2 py-1 bg-white border border-[#C3CCD0] hover:bg-green-50 text-green-800 rounded text-[10px] font-bold"
                          >
                            Accepted
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(req.id, 'completed')}
                            className="px-2 py-1 bg-white border border-[#C3CCD0] hover:bg-purple-50 text-purple-800 rounded text-[10px] font-bold"
                          >
                            Completed
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(req.id, 'declined')}
                            className="px-2 py-1 bg-white border border-[#C3CCD0] hover:bg-red-50 text-red-800 rounded text-[10px] font-bold"
                          >
                            Declined
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
