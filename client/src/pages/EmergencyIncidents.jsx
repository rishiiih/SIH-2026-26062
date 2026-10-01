import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';

import db from '../db/dexie';
import { saveAndQueue } from '../sync/mutations';


const INITIAL_FORM = {
  title: '',
  description: '',
  severity: 'medium',
  type: 'other',
};


export default function EmergencyIncidents() {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] =
    useState(INITIAL_FORM);

  const incidents = useLiveQuery(
    async () => {
      if (!db.incidents) {
        return [];
      }

      return db.incidents
        .orderBy('created_at')
        .reverse()
        .toArray();
    },
    [],
    []
  );

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.title.trim()) {
      return;
    }

    const user = JSON.parse(
      localStorage.getItem('user') || '{}'
    );

    const now = new Date().toISOString();

    const incident = {
      id: crypto.randomUUID(),
      type: formData.type,
      severity: formData.severity,
      status: 'raised',
      title: formData.title.trim(),
      description: formData.description.trim(),
      location_text: null,
      lat: null,
      lon: null,
      station_id: user.station_id || null,
      raised_at: now,
      created_at: now,
      updated_at: now,
      version: 1,
      escalation_level: 0,
    };

    await saveAndQueue(
      'incident',
      incident,
      'create',
      { priority: 1 }
    );

    setFormData(INITIAL_FORM);
    setIsOpen(false);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Emergency & Incident Operations
          </h1>

          <p className="text-sm text-gray-600">
            Raise crisis alerts and track station safety
            status offline.
          </p>
        </div>

        <button
          onClick={() => setIsOpen(true)}
          className="h-10 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md shadow flex items-center gap-2"
          type="button"
        >
          <span className="material-symbols-outlined text-[20px]">
            warning
          </span>

          <span>Raise Incident (SOS)</span>
        </button>
      </div>

      <div className="space-y-3">
        {!incidents.length ? (
          <div className="p-8 bg-gray-50 border border-gray-200 rounded-md text-center text-gray-600">
            No emergency incidents active. All stations
            operating nominally.
          </div>
        ) : (
          incidents.map((incident) => (
            <div
              key={incident.id}
              className={`p-4 bg-white border rounded-md shadow-sm ${
                incident.severity === 'critical'
                  ? 'border-red-500 bg-red-50/20'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 text-xs font-bold rounded uppercase ${
                      incident.severity === 'critical'
                        ? 'bg-red-100 text-red-700'
                        : incident.severity === 'high'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {incident.severity}
                  </span>

                  <h3 className="text-base font-semibold text-gray-900">
                    {incident.title}
                  </h3>
                </div>

                <span className="text-xs text-gray-500 font-mono">
                  {incident.created_at
                    ? new Date(
                        incident.created_at
                      ).toLocaleString()
                    : ''}
                </span>
              </div>

              <p className="text-sm text-gray-700 mt-2">
                {incident.description}
              </p>

              <div className="text-xs text-gray-500 mt-2 uppercase">
                Status: {incident.status}
              </div>
            </div>
          ))
        )}
      </div>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <form
            onSubmit={handleSubmit}
            className="bg-white border border-gray-200 p-6 rounded-md w-full max-w-lg space-y-4 text-gray-900 shadow-xl"
          >
            <h2 className="text-xl font-bold text-red-600 flex items-center gap-2">
              <span className="material-symbols-outlined">
                warning
              </span>

              Raise Emergency Incident
            </h2>

            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">
                Incident title
              </span>

              <input
                name="title"
                type="text"
                required
                value={formData.title}
                onChange={handleChange}
                placeholder="Generator power failure"
                className="w-full h-9 px-3 bg-white border border-gray-300 rounded-md text-sm"
              />
            </label>

            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">
                Incident type
              </span>

              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full h-9 px-3 bg-white border border-gray-300 rounded-md text-sm"
              >
                <option value="medical">Medical</option>
                <option value="fire">Fire</option>
                <option value="equipment">Equipment</option>
                <option value="missing_person">
                  Missing person
                </option>
                <option value="weather">Weather</option>
                <option value="other">Other</option>
              </select>
            </label>

            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">
                Severity
              </span>

              <select
                name="severity"
                value={formData.severity}
                onChange={handleChange}
                className="w-full h-9 px-3 bg-white border border-gray-300 rounded-md text-sm"
              >
                <option value="critical">
                  Critical
                </option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
              </select>
            </label>

            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </span>

              <textarea
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe the situation and active risks"
                className="w-full p-3 bg-white border border-gray-300 rounded-md text-sm"
              />
            </label>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="h-9 px-4 bg-gray-100 border border-gray-300 text-gray-700 rounded-md"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="h-9 px-4 bg-red-600 hover:bg-red-700 text-white rounded-md"
              >
                Dispatch Alert
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}