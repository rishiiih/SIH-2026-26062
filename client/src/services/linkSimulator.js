/**
 * linkSimulator.js — Network link quality simulator for demos.
 *
 * Enabled when:
 *   - VITE_DEMO=true  (build-time), or
 *   - localStorage 'link_profile' is set at runtime.
 *
 * Profiles
 * --------
 * | Profile          | Behaviour                                          |
 * |------------------|----------------------------------------------------|
 * | Full             | All traffic passes unmodified.                      |
 * | Narrowband       | Only SOS beacons (≤ BEACON_MAX_BYTES) pass.         |
 * |                  | Bulky payloads are delayed or rejected.              |
 * | Station LAN only | Central endpoint blocked; station_lan passes.       |
 * | None             | All network requests fail (full offline).            |
 *
 * Usage
 * -----
 *   import linkSimulator from './linkSimulator';
 *
 *   // Before making a fetch / axios call:
 *   const verdict = linkSimulator.check(payloadBytes, target);
 *   if (verdict.blocked) throw new Error(verdict.reason);
 */

import { BEACON_MAX_BYTES } from '../sos/sosConfig';

const PROFILES = {
  FULL: 'full',
  NARROWBAND: 'narrowband',
  STATION_LAN_ONLY: 'station_lan_only',
  NONE: 'none',
};

const DEMO_MODE =
  typeof import.meta !== 'undefined' &&
  import.meta.env?.VITE_DEMO === 'true';

class LinkSimulator {
  constructor() {
    this._profile = PROFILES.FULL;
    this._listeners = new Set();

    // Restore persisted profile
    const stored = localStorage.getItem('link_profile');
    if (stored && Object.values(PROFILES).includes(stored)) {
      this._profile = stored;
    }
  }

  /** Current active profile. */
  get profile() {
    return this._profile;
  }

  /** Whether the simulator is actively degrading traffic. */
  get isActive() {
    return (
      (DEMO_MODE || localStorage.getItem('link_profile') !== null) &&
      this._profile !== PROFILES.FULL
    );
  }

  /** All available profiles. */
  static get PROFILES() {
    return { ...PROFILES };
  }

  /**
   * Switch to a new profile.
   * @param {string} profile - One of PROFILES values.
   */
  setProfile(profile) {
    if (!Object.values(PROFILES).includes(profile)) {
      console.warn(`[LinkSim] Unknown profile: ${profile}`);
      return;
    }
    this._profile = profile;
    localStorage.setItem('link_profile', profile);
    this._notify();
  }

  /** Reset to full connectivity. */
  reset() {
    this._profile = PROFILES.FULL;
    localStorage.removeItem('link_profile');
    this._notify();
  }

  /**
   * Subscribe to profile changes.
   * @param {Function} listener
   * @returns {Function} unsubscribe
   */
  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  /** @private */
  _notify() {
    const snapshot = {
      profile: this._profile,
      isActive: this.isActive,
    };
    this._listeners.forEach((fn) => {
      try {
        fn(snapshot);
      } catch (e) {
        console.error('[LinkSim] Listener error:', e);
      }
    });
  }

  /**
   * Check whether a request should be allowed through.
   *
   * @param {number}  payloadBytes  - Size of the outgoing payload in bytes.
   * @param {'central'|'station_lan'} target - Which endpoint the request targets.
   * @returns {{ blocked: boolean, reason?: string, delay?: number }}
   */
  check(payloadBytes = 0, target = 'central') {
    if (!this.isActive) {
      return { blocked: false };
    }

    switch (this._profile) {
      case PROFILES.NONE:
        return {
          blocked: true,
          reason: '[LinkSim] Full offline — all requests blocked.',
        };

      case PROFILES.STATION_LAN_ONLY:
        if (target === 'central') {
          return {
            blocked: true,
            reason:
              '[LinkSim] Station LAN only — Central endpoint blocked.',
          };
        }
        return { blocked: false };

      case PROFILES.NARROWBAND:
        if (payloadBytes > BEACON_MAX_BYTES) {
          return {
            blocked: true,
            reason: `[LinkSim] Narrowband — payload ${payloadBytes}B exceeds ${BEACON_MAX_BYTES}B limit.`,
          };
        }
        // Small payloads pass but with simulated latency
        return { blocked: false, delay: 800 };

      case PROFILES.FULL:
      default:
        return { blocked: false };
    }
  }
}

const linkSimulator = new LinkSimulator();

export { PROFILES };
export default linkSimulator;
