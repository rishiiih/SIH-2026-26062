import { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';

import db from '../../db/dexie';
import { authService } from '../../services/auth';
import {
  reportMusterStatus,
  markPersonnelMuster,
  seedStationPersonnelIfEmpty,
  SAMPLE_STATION_CREW,
} from '../../sos/sosOperations';
import { fireBeacon } from '../../sos/beacon';
import { MUSTER_TIMEOUT_S } from '../../sos/sosConfig';

export default function MusterBoard({ activeIncident = null, onSosFired = null }) {
  const user = authService.getUser() || { id: 'station-user', username: 'Guest' };
  const stationId = activeIncident?.station_id || user.station_id || 1;

  const [selectedStation, setSelectedStation] = useState(stationId);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [filter, setFilter] = useState('all'); // all | unaccounted | safe | injured | away
  const [isEscalating, setIsEscalating] = useState(false);
  const [message, setMessage] = useState('');

  // Ensure crew exists in DB
  useEffect(() => {
    seedStationPersonnelIfEmpty(selectedStation);
  }, [selectedStation]);

  // Track elapsed seconds since muster called or incident raised
  useEffect(() => {
    const startTime = activeIncident?.raised_at
      ? new Date(activeIncident.raised_at).getTime()
      : Date.now();

    const interval = setInterval(() => {
      const now = Date.now();
      const sec = Math.floor((now - startTime) / 1000);
      setElapsedSeconds(sec >= 0 ? sec : 0);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeIncident]);

  // Live query for personnel
  const dbPersonnel = useLiveQuery(
    async () => {
      if (!db.personnel) return [];
      const list = await db.personnel
        .filter((p) => Number(p.station_id) === Number(selectedStation))
        .toArray();
      return list;
    },
    [selectedStation],
    []
  );

  // Fallback to sample roster if DB has no entries for this station
  const crewList = useMemo(() => {
    if (dbPersonnel && dbPersonnel.length > 0) return dbPersonnel;
    return SAMPLE_STATION_CREW[selectedStation] || SAMPLE_STATION_CREW[1];
  }, [dbPersonnel, selectedStation]);

  // Live query for muster entries
  const incidentId = activeIncident?.id || 'station-general-muster';
  const musterEntries = useLiveQuery(
    async () => {
      if (!db.muster_entries) return [];
      const entries = await db.muster_entries
        .filter((m) => m.incident_id === incidentId || m.station_id === selectedStation)
        .toArray();
      return entries;
    },
    [incidentId, selectedStation],
    []
  );

  // Map each person to their current status
  const rosterWithStatus = useMemo(() => {
    const statusMap = new Map();
    (musterEntries || []).forEach((entry) => {
      const key = entry.personnel_id || entry.user_id;
      if (key) {
        // Keep most recent entry
        const existing = statusMap.get(key);
        if (!existing || new Date(entry.reported_at) > new Date(existing.reported_at)) {
          statusMap.set(key, entry);
        }
      }
    });

    return crewList.map((person) => {
      const report = statusMap.get(person.id);
      return {
        ...person,
        musterStatus: report ? report.status : 'unaccounted',
        reportedAt: report?.reported_at || null,
        via: report?.via || null,
      };
    });
  }, [crewList, musterEntries]);

  // Summary counts
  const totalCount = rosterWithStatus.length;
  const safeCount = rosterWithStatus.filter((p) => p.musterStatus === 'safe').length;
  const unaccountedCount = rosterWithStatus.filter((p) => p.musterStatus === 'unaccounted').length;
  const injuredCount = rosterWithStatus.filter((p) => p.musterStatus === 'injured').length;
  const awayCount = rosterWithStatus.filter((p) => p.musterStatus === 'away').length;

  const accountedPercent = totalCount > 0 ? Math.round((safeCount / totalCount) * 100) : 0;
  const isTimeoutExceeded = elapsedSeconds > MUSTER_TIMEOUT_S && unaccountedCount > 0;

  // Filtered view
  const displayedPersonnel = rosterWithStatus.filter((person) => {
    if (filter === 'all') return true;
    return person.musterStatus === filter;
  });

  // Self check-in
  const handleSelfSafe = async () => {
    try {
      await reportMusterStatus({
        incidentId,
        personnelId: user.personnel_id || user.id,
        status: 'safe',
        via: 'self',
      });
      setMessage('✅ Your safety check-in has been logged and transmitted to the station roll call.');
      setTimeout(() => setMessage(''), 4000);
    } catch (err) {
      console.error('Self muster error:', err);
    }
  };

  // Commander marks a person
  const handleMarkStatus = async (person, newStatus) => {
    try {
      await markPersonnelMuster({
        incidentId,
        personnelId: person.id,
        userId: person.id,
        status: newStatus,
        via: 'leader',
      });
    } catch (err) {
      console.error('Leader mark muster error:', err);
    }
  };

  // Automatic / 1-click Escalation to Missing Person SOS
  const handleEscalateMissingPerson = async () => {
    try {
      setIsEscalating(true);
      const res = await fireBeacon({ category: 'MISSING' });
      setMessage(`🚨 Missing Person SOS triggered for ${unaccountedCount} unaccounted crew! Beacon ID: ${res.incidentId.slice(0, 8)}`);
      if (onSosFired) onSosFired(res.incidentId);
      setTimeout(() => setMessage(''), 6000);
    } catch (err) {
      console.error('Failed to fire missing person SOS:', err);
    } finally {
      setIsEscalating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Station Switcher */}
      <div className="bg-[#EEF1F2] border border-[#C3CCD0] rounded-[3px] p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#E4E8EA] border border-[#C3CCD0] rounded text-primary">
            <span className="material-symbols-outlined text-[24px]">checklist</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-headline-sm text-headline-sm font-bold text-[#1D2B33]">
                Emergency Station Muster & Accountability Roll Call
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-[#EEF1F2] text-[#3F6B3A] border border-[#3F6B3A] uppercase tracking-wide">
                Offline Active
              </span>
            </div>
            <p className="text-xs text-[#50616a]">
              Track presence, shelter locations, and unaccounted expedition personnel in real-time.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedStation}
            onChange={(e) => setSelectedStation(Number(e.target.value))}
            className="h-8 px-2.5 bg-white border border-[#C3CCD0] rounded text-xs font-semibold text-[#1D2B33] focus:outline-none"
          >
            <option value={1}>Maitri Station (Schirmacher Oasis)</option>
            <option value={2}>Bharati Station (Larsemann Hills)</option>
          </select>

          <button
            type="button"
            onClick={handleSelfSafe}
            className="h-8 px-3.5 bg-[#3F6B3A] hover:bg-[#33562E] text-white rounded text-xs font-bold flex items-center gap-1.5 shadow transition-transform active:scale-95"
          >
            <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
            <span>I AM SAFE (One-Tap)</span>
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-green-50 border border-green-300 text-green-800 text-xs rounded font-medium flex items-center gap-2 animate-fadeIn">
          <span className="material-symbols-outlined text-[18px]">verified</span>
          <span>{message}</span>
        </div>
      )}

      {/* Timeout / Missing Person Alert Banner */}
      {isTimeoutExceeded && (
        <div className="p-4 bg-red-50 border-2 border-red-600 rounded-[3px] flex flex-col md:flex-row md:items-center justify-between gap-3 animate-pulse">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-red-600 text-[28px]">warning</span>
            <div>
              <div className="font-bold text-red-800 text-sm">
                CRITICAL WARNING: 5-MINUTE MUSTER TIMEOUT EXCEEDED
              </div>
              <div className="text-xs text-red-700 mt-0.5">
                Elapsed roll-call time: <strong>{Math.floor(elapsedSeconds / 60)}m {elapsedSeconds % 60}s</strong>.
                There are <strong>{unaccountedCount} personnel</strong> still unaccounted for. Polar safety protocol mandates immediate Missing Person Search & Rescue.
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleEscalateMissingPerson}
            disabled={isEscalating}
            className="h-9 px-4 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded shadow-md flex items-center gap-2 shrink-0 transition-transform active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">person_search</span>
            <span>{isEscalating ? 'Triggering...' : 'TRIGGER MISSING PERSON SOS'}</span>
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#EEF1F2] border border-[#C3CCD0] p-3 rounded-[3px]">
          <div className="text-[11px] font-bold uppercase text-[#50616a]">Station Personnel</div>
          <div className="text-2xl font-bold font-data-mono-lg text-[#1D2B33] mt-1">{totalCount}</div>
          <div className="text-[10px] text-[#50616a]">Total rostered crew</div>
        </div>

        <div className="bg-[#EEF1F2] border border-[#C3CCD0] p-3 rounded-[3px]">
          <div className="text-[11px] font-bold uppercase text-[#3F6B3A]">Accounted (Safe)</div>
          <div className="text-2xl font-bold font-data-mono-lg text-[#3F6B3A] mt-1">{safeCount}</div>
          <div className="w-full bg-[#C3CCD0] h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-[#3F6B3A] h-full transition-all duration-300"
              style={{ width: `${accountedPercent}%` }}
            />
          </div>
          <div className="text-[10px] text-[#50616a] mt-1">{accountedPercent}% verified safe</div>
        </div>

        <div className={`border p-3 rounded-[3px] ${unaccountedCount > 0 ? 'bg-red-50 border-red-300' : 'bg-[#EEF1F2] border-[#C3CCD0]'}`}>
          <div className={`text-[11px] font-bold uppercase ${unaccountedCount > 0 ? 'text-red-700' : 'text-[#50616a]'}`}>
            Unaccounted
          </div>
          <div className={`text-2xl font-bold font-data-mono-lg mt-1 ${unaccountedCount > 0 ? 'text-red-700' : 'text-[#1D2B33]'}`}>
            {unaccountedCount}
          </div>
          <div className="text-[10px] text-[#50616a]">
            {unaccountedCount > 0 ? 'Action required' : 'All clear'}
          </div>
        </div>

        <div className="bg-[#EEF1F2] border border-[#C3CCD0] p-3 rounded-[3px]">
          <div className="text-[11px] font-bold uppercase text-[#A16207]">Injured / Field Away</div>
          <div className="text-2xl font-bold font-data-mono-lg text-[#A16207] mt-1">
            {injuredCount + awayCount}
          </div>
          <div className="text-[10px] text-[#50616a]">
            {injuredCount} injured • {awayCount} field team
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-[#C3CCD0] pb-2">
        <div className="flex items-center gap-1">
          {[
            { key: 'all', label: `All Crew (${totalCount})` },
            { key: 'unaccounted', label: `Unaccounted (${unaccountedCount})` },
            { key: 'safe', label: `Safe (${safeCount})` },
            { key: 'injured', label: `Injured (${injuredCount})` },
            { key: 'away', label: `Field Team (${awayCount})` },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-[3px] transition-colors ${
                filter === tab.key
                  ? 'bg-primary-container text-on-primary'
                  : 'text-[#50616a] hover:bg-[#E4E8EA]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <span className="text-[11px] text-[#50616a] font-data-mono-md">
          Muster Timer: {Math.floor(elapsedSeconds / 60)}m {elapsedSeconds % 60}s
        </span>
      </div>

      {/* Personnel Roster Table */}
      <div className="bg-white border border-[#C3CCD0] rounded-[3px] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#E4E8EA] border-b border-[#C3CCD0] text-[#50616a] font-bold uppercase">
                <th className="py-2.5 px-3">Personnel Member</th>
                <th className="py-2.5 px-3">Station Role & Blood Group</th>
                <th className="py-2.5 px-3">Muster Status</th>
                <th className="py-2.5 px-3">Last Check-In</th>
                <th className="py-2.5 px-3 text-right">Commander Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C3CCD0]">
              {displayedPersonnel.map((person) => {
                const statusStyles = {
                  safe: 'bg-green-100 text-green-800 border-green-300',
                  unaccounted: 'bg-red-100 text-red-800 border-red-300 font-bold',
                  injured: 'bg-orange-100 text-orange-800 border-orange-300',
                  away: 'bg-purple-100 text-purple-800 border-purple-300',
                };

                return (
                  <tr key={person.id} className="hover:bg-[#F5F7F7] transition-colors">
                    <td className="py-2.5 px-3 font-medium text-[#1D2B33]">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-[#50616a]">
                          account_circle
                        </span>
                        <span>{person.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-[#50616a]">
                      <div>{person.role}</div>
                      {person.blood_group && (
                        <span className="text-[10px] font-mono px-1 bg-gray-100 rounded text-[#1D2B33]">
                          {person.blood_group}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] uppercase border ${
                          statusStyles[person.musterStatus] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {person.musterStatus}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[#50616a] text-[11px]">
                      {person.reportedAt
                        ? `${new Date(person.reportedAt).toLocaleTimeString()} (${person.via || 'self'})`
                        : 'No report'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleMarkStatus(person, 'safe')}
                          title="Mark Safe"
                          className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
                            person.musterStatus === 'safe'
                              ? 'bg-[#3F6B3A] text-white border-[#3F6B3A]'
                              : 'bg-white text-[#3F6B3A] border-[#C3CCD0] hover:bg-green-50'
                          }`}
                        >
                          Safe
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMarkStatus(person, 'injured')}
                          title="Mark Injured"
                          className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
                            person.musterStatus === 'injured'
                              ? 'bg-[#C2410C] text-white border-[#C2410C]'
                              : 'bg-white text-[#C2410C] border-[#C3CCD0] hover:bg-orange-50'
                          }`}
                        >
                          Injured
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMarkStatus(person, 'away')}
                          title="Mark Field Team"
                          className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
                            person.musterStatus === 'away'
                              ? 'bg-purple-700 text-white border-purple-700'
                              : 'bg-white text-purple-700 border-[#C3CCD0] hover:bg-purple-50'
                          }`}
                        >
                          Field
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMarkStatus(person, 'unaccounted')}
                          title="Mark Unaccounted"
                          className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
                            person.musterStatus === 'unaccounted'
                              ? 'bg-red-700 text-white border-red-700'
                              : 'bg-white text-red-700 border-[#C3CCD0] hover:bg-red-50'
                          }`}
                        >
                          Missing
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
