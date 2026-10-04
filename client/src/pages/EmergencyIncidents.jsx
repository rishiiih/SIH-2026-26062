import { useState, useEffect, useCallback } from 'react';
import db from '../db/dexie';
import { saveAndQueue } from '../sync/mutations';
import { authService } from '../services/auth';

export const EmergencyIncidents = () => {
  const [incidents, setIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [noteText, setNoteText] = useState('');
  
  // New incident form fields
  const [type, setType] = useState('other');
  const [severity, setSeverity] = useState('critical');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationText, setLocationText] = useState('');

  const currentUser = authService.getUser();

  const loadData = useCallback(async () => {
    const list = await db.incidents.toArray();
    list.sort((a, b) => new Date(b.raised_at) - new Date(a.raised_at));
    setIncidents(list);

    if (selectedIncident) {
      const upds = await db.incident_updates
        .where('incident_id')
        .equals(selectedIncident.id)
        .toArray();
      setUpdates(upds);
    }
  }, [selectedIncident]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleCreate = async (e) => {
    e.preventDefault();
    const newInc = {
      id: crypto.randomUUID(),
      type,
      severity,
      status: 'raised',
      title,
      description,
      location_text: locationText,
      station_id: currentUser?.station_id || null,
      raised_at: new Date().toISOString(),
      escalation_level: 0,
    };

    await saveAndQueue('incident', newInc, 'create', { priority: 100 });
    setTitle('');
    setDescription('');
    setLocationText('');
    await loadData();
  };

  const handleStatusTransition = async (newStatus) => {
    if (!selectedIncident) return;

    const updateRecord = {
      id: crypto.randomUUID(),
      incident_id: selectedIncident.id,
      user_id: currentUser?.id,
      note: noteText || `Status updated to ${newStatus}`,
      status_change: newStatus,
      created_at: new Date().toISOString(),
    };
    
    await saveAndQueue('incident_update', updateRecord, 'create');

    const updatedInc = {
      ...selectedIncident,
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    setNoteText('');
    setSelectedIncident(updatedInc);
    await loadData();
  };

  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Incidents List */}
      <div className="md:col-span-2 space-y-4">
        <h2 className="text-xl font-bold">Active Incidents</h2>
        <div className="space-y-3">
          {incidents.map((inc) => (
            <div
              key={inc.id}
              onClick={() => setSelectedIncident(inc)}
              className={`p-4 rounded border cursor-pointer ${
                selectedIncident?.id === inc.id ? 'border-blue-500 bg-blue-50' : 'bg-white'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-semibold">{inc.title}</span>
                <span className={`px-2 py-1 text-xs rounded text-white ${
                  inc.severity === 'critical' ? 'bg-red-600' : 'bg-amber-500'
                }`}>
                  {inc.severity.toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">{inc.description}</p>
              <div className="mt-2 text-xs text-gray-500 flex gap-4">
                <span>Status: <strong>{inc.status}</strong></span>
                <span>Escalation: <strong>Lvl {inc.escalation_level || 0}</strong></span>
                <span>Location: {inc.location_text || 'N/A'}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Raise Form */}
        <form onSubmit={handleCreate} className="bg-white p-4 rounded border space-y-3 mt-6">
          <h3 className="font-bold text-lg">Raise New Incident</h3>
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full p-2 border rounded"
          />
          <div className="grid grid-cols-2 gap-3">
            <select value={type} onChange={(e) => setType(e.target.value)} className="p-2 border rounded">
              <option value="medical">Medical</option>
              <option value="fire">Fire</option>
              <option value="equipment">Equipment</option>
              <option value="missing_person">Missing Person</option>
              <option value="weather">Weather</option>
              <option value="other">Other</option>
            </select>
            <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="p-2 border rounded">
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
            </select>
          </div>
          <input
            type="text"
            placeholder="Location text"
            value={locationText}
            onChange={(e) => setLocationText(e.target.value)}
            className="w-full p-2 border rounded"
          />
          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2 border rounded"
          />
          <button type="submit" className="bg-red-600 text-white font-bold py-2 px-4 rounded">
            Raise Incident
          </button>
        </form>
      </div>

      {/* Detail & Action Panel */}
      <div className="bg-white p-4 rounded border">
        {selectedIncident ? (
          <div className="space-y-4">
            <h3 className="font-bold text-lg">Incident Details</h3>
            <div>
              <p><strong>Title:</strong> {selectedIncident.title}</p>
              <p><strong>Status:</strong> {selectedIncident.status}</p>
              <p><strong>Location:</strong> {selectedIncident.location_text || 'N/A'}</p>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                placeholder="Action note..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="w-full p-2 border rounded text-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleStatusTransition('acknowledged')}
                  className="bg-yellow-500 text-white text-xs px-3 py-2 rounded"
                >
                  Acknowledge
                </button>
                <button
                  onClick={() => handleStatusTransition('responding')}
                  className="bg-blue-500 text-white text-xs px-3 py-2 rounded"
                >
                  Respond
                </button>
                <button
                  onClick={() => handleStatusTransition('resolved')}
                  className="bg-green-600 text-white text-xs px-3 py-2 rounded"
                >
                  Resolve
                </button>
              </div>
            </div>

            <hr />
            <div>
              <h4 className="font-semibold text-sm mb-2">Update Timeline</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {updates.map((u) => (
                  <div key={u.id} className="text-xs bg-gray-50 p-2 rounded border">
                    <p className="font-semibold">{u.status_change}</p>
                    <p>{u.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Select an incident to view details and timeline.</p>
        )}
      </div>
    </div>
  );
};

export default EmergencyIncidents;