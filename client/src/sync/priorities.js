/**
 * Sync priority levels — higher numbers are dispatched first.
 *
 * SOS mutations (priority ≥ SOS_THRESHOLD) bypass batching,
 * exponential back-off, and the health-check gate inside
 * sync-engine.js and outbox.js.
 */

export const PRIORITIES = {
  /** Default for cargo / inventory / personnel writes. */
  NORMAL: 0,

  /** Standard incident mutations. */
  INCIDENT: 1,

  /** Muster roll-call entries. */
  MUSTER: 90,

  /** Incident updates (ack, respond, escalation notes). */
  INCIDENT_UPDATE: 90,

  /** Quick-fields and enrichment details sent after the beacon. */
  SOS_DETAIL: 95,

  /** The beacon itself — highest priority. */
  SOS: 100,
};

/**
 * Any outbox entry whose priority is at or above this threshold
 * gets SOS fast-lane treatment:
 *   • Immediate fire (no batch wait, no exponential backoff).
 *   • Concurrent dispatch to all known endpoints.
 *   • Bypasses the global health-check gate.
 */
export const SOS_THRESHOLD = PRIORITIES.MUSTER;

export default PRIORITIES;
