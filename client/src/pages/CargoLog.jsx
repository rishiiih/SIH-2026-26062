import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';

import api from '../services/api';
import db from '../db/dexie';
import { authService } from '../services/auth';
import syncEngine from '../sync/sync-engine';
import { saveAndQueue } from '../sync/mutations';


const EMPTY_FORM = {
  name: '',
  tracking_number: '',
  destination: '',
  weight: '',
  cube: '',
  priority: 2,
  status: 'pending',
};


function CargoLog() {
  const [selectedConsignment, setSelectedConsignment] =
    useState(null);

  const [showCreateForm, setShowCreateForm] =
    useState(false);

  const [formData, setFormData] =
    useState(EMPTY_FORM);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const consignments = useLiveQuery(
    () => db.consignments.toArray(),
    [],
    []
  );

  const openCreateForm = () => {
    setError('');
    setMessage('');
    setFormData(EMPTY_FORM);
    setShowCreateForm(true);
  };

  const closeCreateForm = () => {
    if (!saving) {
      setShowCreateForm(false);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]:
        name === 'priority'
          ? Number(value)
          : value,
    }));
  };

  const handleCreate = async (event) => {
    event.preventDefault();

    setError('');
    setMessage('');

    if (!formData.tracking_number.trim()) {
      setError('Tracking number is required.');
      return;
    }

    setSaving(true);

    try {
      const result = await saveAndQueue(
        'consignment',
        {
          name:
            formData.name.trim() ||
            formData.tracking_number.trim(),
          tracking_number:
            formData.tracking_number.trim(),
          destination:
            formData.destination.trim(),
          weight: formData.weight.trim(),
          cube: formData.cube.trim(),
          priority: formData.priority,
          status: formData.status,
        },
        'create',
        {
          priority: formData.priority,
        }
      );

      setSelectedConsignment({
        ...result.payload,
      });

      setShowCreateForm(false);
      setFormData(EMPTY_FORM);
      setMessage(
        'Consignment saved locally and queued for sync.'
      );

      const user = authService.getUser();

      if (navigator.onLine && user?.id) {
        await syncEngine.sync(user.id);
      }
    } catch (createError) {
      setError(
        createError.message ||
          'Unable to create consignment.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handlePrintLabel = async (consignment) => {
    setError('');
    setMessage('');

    try {
      const response = await api.get(
        `/api/cargo/${consignment.id}/qr`
      );

      const qrBase64 =
        response.data?.qr_base64;

      if (!qrBase64) {
        throw new Error(
          'QR code was not returned by the server.'
        );
      }

      const printWindow = window.open(
        '',
        '_blank',
        'width=520,height=700'
      );

      if (!printWindow) {
        throw new Error(
          'Please allow pop-ups to print the label.'
        );
      }

      printWindow.document.write(`
        <!doctype html>
        <html>
          <head>
            <title>Consignment Label</title>
            <style>
              body {
                font-family: sans-serif;
                text-align: center;
                padding: 32px;
              }

              img {
                width: 280px;
                height: 280px;
              }

              .id {
                font-family: monospace;
                font-size: 18px;
                margin-top: 16px;
              }
            </style>
          </head>
          <body>
            <h1>DHruv Consignment</h1>
            <img src="${qrBase64}" alt="Consignment QR code" />
            <div class="id">${consignment.id}</div>
            <div>${consignment.tracking_number || ''}</div>
            <script>
              window.onload = () => window.print();
            </script>
          </body>
        </html>
      `);

      printWindow.document.close();
    } catch (printError) {
      setError(
        printError.response?.data?.detail ||
          printError.message ||
          'Unable to generate label.'
      );
    }
  };

  const formatPriority = (priority) => {
    const numericPriority =
      Number(priority) || 2;

    return `Priority ${numericPriority}`;
  };

  return (
    <div className="w-full pt-14 pb-10 px-gutter-lg bg-surface min-h-[calc(100vh-2.5rem)]">
      <div className="flex flex-col w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md py-space-lg mb-space-md">
          <div>
            <div className="flex items-center gap-space-xs mb-space-xs">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                Logistics
              </span>

              <span className="text-outline-variant">
                /
              </span>

              <span className="font-data-mono-md text-label-sm text-primary font-semibold">
                CARGO & LOG
              </span>
            </div>

            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
              Cargo & Consignment Tracking
            </h1>

            <p className="font-body-md text-body-md text-on-surface-variant mt-[2px]">
              Track consignments, chain of custody,
              cold-chain telemetry, and shipment status
              across polar supply routes.
            </p>
          </div>

          <div className="flex items-center gap-space-sm self-start md:self-auto">
            <button
              onClick={openCreateForm}
              className="h-8 px-space-md bg-primary-container text-on-primary font-title-sm text-title-sm rounded-[3px] hover:bg-primary flex items-center gap-space-xs transition-colors"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">
                add
              </span>

              <span>Create Consignment</span>
            </button>

            <button
              className="h-8 px-space-md bg-surface-container-low text-on-surface font-title-sm text-title-sm rounded-[3px] hover:bg-surface-container-high flex items-center gap-space-xs transition-colors"
              type="button"
              onClick={() => {
                setMessage(
                  'Use a QR scanner to scan an existing label.'
                );
              }}
            >
              <span className="material-symbols-outlined text-[16px]">
                qr_code_scanner
              </span>

              <span>Scan Label</span>
            </button>
          </div>
        </div>

        {message && (
          <div className="mb-space-md p-space-sm bg-secondary-container text-on-secondary-fixed-variant rounded-[3px]">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-space-md p-space-sm bg-error-container text-on-error-container rounded-[3px]">
            {error}
          </div>
        )}

        {consignments.length === 0 ? (
          <section className="bg-surface-container rounded-[3px] p-space-lg">
            <div className="flex flex-col items-center justify-center py-space-lg text-center">
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-space-md">
                local_shipping
              </span>

              <h2 className="font-headline-md text-headline-md text-on-surface mb-space-sm">
                No Consignments
              </h2>

              <p className="font-body-md text-body-md text-on-surface-variant max-w-md mb-space-md">
                No consignments have been created yet.
                Create a cargo manifest to begin tracking
                the shipment.
              </p>

              <button
                onClick={openCreateForm}
                className="h-8 px-space-md bg-primary-container text-on-primary font-title-sm text-title-sm rounded-[3px] hover:bg-primary flex items-center gap-space-xs transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">
                  add
                </span>

                <span>Create First Consignment</span>
              </button>
            </div>
          </section>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-md">
            <section className="lg:col-span-5 bg-surface-container rounded-[3px] overflow-hidden">
              <div className="px-space-md py-space-sm bg-surface-container-high flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-[18px] text-primary">
                    local_shipping
                  </span>

                  <h2 className="font-headline-sm text-headline-sm text-on-surface">
                    Active Consignments
                  </h2>
                </div>

                <span className="font-data-mono-md text-body-sm text-on-surface-variant">
                  {consignments.length} items
                </span>
              </div>

              <div className="p-space-md space-y-space-sm">
                {consignments.map((consignment) => (
                  <button
                    key={consignment.id}
                    type="button"
                    className="w-full text-left bg-surface-container-lowest p-space-sm rounded-[3px] hover:bg-surface-container-low transition-colors"
                    onClick={() =>
                      setSelectedConsignment(
                        consignment
                      )
                    }
                  >
                    <div className="flex items-center justify-between mb-space-xs">
                      <span className="font-data-mono-md text-body-sm font-semibold text-on-surface">
                        {consignment.id}
                      </span>

                      <span className="px-space-xs py-[1px] font-label-sm text-label-sm rounded-[3px] bg-secondary-container text-on-secondary-fixed-variant">
                        {formatPriority(
                          consignment.priority
                        )}
                      </span>
                    </div>

                    <div className="font-title-sm text-title-sm text-on-surface">
                      {consignment.name ||
                        consignment.tracking_number}
                    </div>

                    <div className="flex items-center justify-between mt-space-xs font-data-mono-md text-body-sm text-on-surface-variant">
                      <span>
                        {consignment.destination ||
                          'Destination pending'}
                      </span>

                      <span className="text-primary">
                        {consignment.status ||
                          'pending'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section className="lg:col-span-7 bg-surface-container rounded-[3px] p-space-md">
              {selectedConsignment ? (
                <div>
                  <div className="flex items-center justify-between mb-space-md">
                    <div>
                      <span className="font-data-mono-md text-body-sm text-primary font-semibold">
                        {selectedConsignment.id}
                      </span>

                      <h2 className="font-headline-md text-headline-md text-on-surface">
                        {selectedConsignment.name ||
                          selectedConsignment.tracking_number}
                      </h2>
                    </div>

                    <span className="px-space-xs py-[2px] font-label-sm text-label-sm rounded-[3px] bg-secondary-container text-on-secondary-fixed-variant">
                      {formatPriority(
                        selectedConsignment.priority
                      )}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-space-md mb-space-md">
                    <div className="bg-surface-container-lowest p-space-sm rounded-[3px]">
                      <span className="font-label-sm text-label-sm text-on-surface-variant block">
                        Tracking Number
                      </span>

                      <span className="font-title-sm text-title-sm text-on-surface">
                        {selectedConsignment.tracking_number ||
                          'Not assigned'}
                      </span>
                    </div>

                    <div className="bg-surface-container-lowest p-space-sm rounded-[3px]">
                      <span className="font-label-sm text-label-sm text-on-surface-variant block">
                        Destination
                      </span>

                      <span className="font-title-sm text-title-sm text-on-surface">
                        {selectedConsignment.destination ||
                          'Not assigned'}
                      </span>
                    </div>

                    <div className="bg-surface-container-lowest p-space-sm rounded-[3px]">
                      <span className="font-label-sm text-label-sm text-on-surface-variant block">
                        Gross Weight
                      </span>

                      <span className="font-data-mono-md text-body-md text-on-surface">
                        {selectedConsignment.weight ||
                          'Not recorded'}
                      </span>
                    </div>

                    <div className="bg-surface-container-lowest p-space-sm rounded-[3px]">
                      <span className="font-label-sm text-label-sm text-on-surface-variant block">
                        Status
                      </span>

                      <span className="font-title-sm text-title-sm text-on-surface">
                        {selectedConsignment.status ||
                          'pending'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-space-sm">
                    <button
                      onClick={() =>
                        handlePrintLabel(
                          selectedConsignment
                        )
                      }
                      className="h-8 px-space-md bg-primary-container text-on-primary font-title-sm text-title-sm rounded-[3px] hover:bg-primary flex items-center gap-space-xs transition-colors"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        print
                      </span>

                      <span>Print Label</span>
                    </button>

                    <button
                      onClick={() =>
                        setMessage(
                          'Custody transfer will be available when the custody endpoint is connected.'
                        )
                      }
                      className="h-8 px-space-md bg-surface-container-low text-on-surface font-title-sm text-title-sm rounded-[3px] hover:bg-surface-container-high flex items-center gap-space-xs transition-colors"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        swap_horiz
                      </span>

                      <span>Transfer Custody</span>
                    </button>

                    <button
                      onClick={() =>
                        setMessage(
                          'Breach reporting will be available when the incident endpoint is connected.'
                        )
                      }
                      className="h-8 px-space-md bg-error text-on-error font-title-sm text-title-sm rounded-[3px] hover:bg-error-container hover:text-on-error-container flex items-center gap-space-xs transition-colors"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        warning
                      </span>

                      <span>Report Breach</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-space-lg text-center">
                  <span className="material-symbols-outlined text-[32px] text-on-surface-variant mb-space-sm">
                    inbox
                  </span>

                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Select a consignment to view details
                  </p>
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-space-md">
          <div className="w-full max-w-2xl bg-surface-container-low border border-outline-variant rounded-[3px] p-space-lg">
            <div className="flex items-center justify-between mb-space-md">
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface">
                  Create Consignment
                </h2>

                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  The record is saved locally first and queued
                  for synchronization.
                </p>
              </div>

              <button
                onClick={closeCreateForm}
                disabled={saving}
                type="button"
                className="w-8 h-8 flex items-center justify-center text-on-surface hover:bg-surface-container-high rounded-[3px]"
                aria-label="Close create consignment form"
              >
                <span className="material-symbols-outlined">
                  close
                </span>
              </button>
            </div>

            <form
              onSubmit={handleCreate}
              className="grid grid-cols-1 md:grid-cols-2 gap-space-md"
            >
              <label className="block">
                <span className="block mb-space-xs font-label-sm text-label-sm text-on-surface-variant">
                  Tracking number
                </span>

                <input
                  name="tracking_number"
                  value={formData.tracking_number}
                  onChange={handleChange}
                  required
                  placeholder="TRK-2026-001"
                  className="w-full h-9 px-space-sm bg-surface-container-lowest border border-outline rounded-[3px] text-on-surface"
                />
              </label>

              <label className="block">
                <span className="block mb-space-xs font-label-sm text-label-sm text-on-surface-variant">
                  Cargo name
                </span>

                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Winter supplies"
                  className="w-full h-9 px-space-sm bg-surface-container-lowest border border-outline rounded-[3px] text-on-surface"
                />
              </label>

              <label className="block">
                <span className="block mb-space-xs font-label-sm text-label-sm text-on-surface-variant">
                  Destination
                </span>

                <input
                  name="destination"
                  value={formData.destination}
                  onChange={handleChange}
                  placeholder="Maitri Station"
                  className="w-full h-9 px-space-sm bg-surface-container-lowest border border-outline rounded-[3px] text-on-surface"
                />
              </label>

              <label className="block">
                <span className="block mb-space-xs font-label-sm text-label-sm text-on-surface-variant">
                  Status
                </span>

                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full h-9 px-space-sm bg-surface-container-lowest border border-outline rounded-[3px] text-on-surface"
                >
                  <option value="pending">
                    Pending
                  </option>
                  <option value="packed">
                    Packed
                  </option>
                  <option value="dispatched">
                    Dispatched
                  </option>
                  <option value="received">
                    Received
                  </option>
                </select>
              </label>

              <label className="block">
                <span className="block mb-space-xs font-label-sm text-label-sm text-on-surface-variant">
                  Gross weight
                </span>

                <input
                  name="weight"
                  value={formData.weight}
                  onChange={handleChange}
                  placeholder="1200 kg"
                  className="w-full h-9 px-space-sm bg-surface-container-lowest border border-outline rounded-[3px] text-on-surface"
                />
              </label>

              <label className="block">
                <span className="block mb-space-xs font-label-sm text-label-sm text-on-surface-variant">
                  Cube
                </span>

                <input
                  name="cube"
                  value={formData.cube}
                  onChange={handleChange}
                  placeholder="4.5 m³"
                  className="w-full h-9 px-space-sm bg-surface-container-lowest border border-outline rounded-[3px] text-on-surface"
                />
              </label>

              <label className="block">
                <span className="block mb-space-xs font-label-sm text-label-sm text-on-surface-variant">
                  Priority
                </span>

                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="w-full h-9 px-space-sm bg-surface-container-lowest border border-outline rounded-[3px] text-on-surface"
                >
                  <option value={1}>
                    Priority 1
                  </option>
                  <option value={2}>
                    Priority 2
                  </option>
                  <option value={3}>
                    Priority 3
                  </option>
                </select>
              </label>

              <div className="md:col-span-2 flex justify-end gap-space-sm pt-space-sm border-t border-outline-variant">
                <button
                  onClick={closeCreateForm}
                  disabled={saving}
                  type="button"
                  className="h-9 px-space-md bg-surface-container-lowest border border-outline text-on-surface rounded-[3px]"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="h-9 px-space-md bg-primary-container text-on-primary rounded-[3px] disabled:opacity-50"
                >
                  {saving
                    ? 'Saving...'
                    : 'Save Consignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


export default CargoLog;