/**
 * NBI Experiment Portal – Event Logger
 * 
 * All events are logged with:
 * - performance.now()-based monotonic time
 * - UTC time (Date.now())
 * - Event type and payload JSON
 * 
 * This creates accurate task/event timestamps for later merging with Tobii eye-tracking data.
 */

class EventLogger {
  constructor() {
    this.events = [];
    this.sessionId = null;
    this.participantCode = null;
    this._baseTime = performance.now();
    this._baseDate = Date.now();
  }

  init(sessionId, participantCode) {
    this.sessionId = sessionId;
    this.participantCode = participantCode;
    this.events = [];
    this._baseTime = performance.now();
    this._baseDate = Date.now();
    this.log('SESSION_INIT', { sessionId, participantCode });
  }

  /**
   * Get monotonic time (ms since session start)
   */
  getMonotonicTime() {
    return performance.now() - this._baseTime;
  }

  /**
   * Log an event with full timing data
   */
  log(eventType, payload = {}) {
    const monotonic = performance.now();
    const event = {
      eventType,
      monotonicTime: monotonic,
      monotonicRelative: monotonic - this._baseTime,
      utcTime: new Date().toISOString(),
      utcMs: Date.now(),
      sessionId: this.sessionId,
      participantCode: this.participantCode,
      payload: { ...payload },
    };
    this.events.push(event);
    return event;
  }

  /**
   * Get all events of a specific type
   */
  getEventsByType(eventType) {
    return this.events.filter(e => e.eventType === eventType);
  }

  /**
   * Get all events
   */
  getAllEvents() {
    return [...this.events];
  }

  /**
   * Export events as JSON
   */
  toJSON() {
    return {
      sessionId: this.sessionId,
      participantCode: this.participantCode,
      baseTime: this._baseTime,
      baseDate: this._baseDate,
      eventCount: this.events.length,
      events: this.events,
    };
  }

  /**
   * Export events as CSV-ready array
   */
  toCSVRows() {
    return this.events.map(e => ({
      event_type: e.eventType,
      monotonic_time: e.monotonicTime.toFixed(3),
      monotonic_relative: e.monotonicRelative.toFixed(3),
      utc_time: e.utcTime,
      utc_ms: e.utcMs,
      session_id: e.sessionId,
      participant_code: e.participantCode,
      payload_json: JSON.stringify(e.payload),
    }));
  }

  /**
   * Clear all events (for test mode)
   */
  clear() {
    this.events = [];
  }
}

// Singleton instance
export const eventLogger = new EventLogger();
export default eventLogger;
