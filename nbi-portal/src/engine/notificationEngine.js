/**
 * NBI Experiment Portal – Notification Scheduling Engine
 * 
 * Implements protocol Section 6: Notification Scheduling for N/L/H
 * 
 * Rules:
 * 1. Six candidate times (3 earlier + 3 later), one per 100s block third
 * 2. Six independent jitter values from -5 to +5s (generated at session creation, reused across N/L/H)
 * 3. H = all 6 candidates; L = either 3 earlier or 3 later; N = 0 visible + 6 pseudo-events
 * 4. If candidate falls within 5s after a panel change, delay until panel stable for 5s (max extra delay 5s)
 * 5. Maintain at least 20s between actual event onsets
 * 6. Maintain at least 10s of reading after each onset
 * 7. If constraints fail, mark event missed; do not compress later events
 * 8. Store scheduled and actual onset/offset
 * 9. Analysis window: -5s to +10s around actual onset; flag panel transitions inside window
 */

import { NOTIFICATION_CANDIDATES, TIMING } from '../config/protocol.js';
import { NOTIFICATION_MESSAGES } from '../config/passages.js';
import { eventLogger } from './eventLogger.js';

/**
 * Compute the 6 scheduled candidate times for a reading block.
 * 
 * @param {number[]} jitterVector - 6 jitter values in ms (from session)
 * @returns {{ earlier: number[], later: number[], all: {index: number, type: string, base: number, jitter: number, scheduled: number}[] }}
 */
function computeCandidateTimes(jitterVector) {
  const candidates = [];

  for (let third = 0; third < 3; third++) {
    const config = NOTIFICATION_CANDIDATES[third];
    const earlierIdx = third * 2;     // 0, 2, 4
    const laterIdx = third * 2 + 1;   // 1, 3, 5

    candidates.push({
      index: earlierIdx,
      type: 'earlier',
      third,
      base: config.earlier,
      jitter: jitterVector[earlierIdx],
      scheduled: config.earlier + jitterVector[earlierIdx],
    });

    candidates.push({
      index: laterIdx,
      type: 'later',
      third,
      base: config.later,
      jitter: jitterVector[laterIdx],
      scheduled: config.later + jitterVector[laterIdx],
    });
  }

  // Sort by scheduled time
  candidates.sort((a, b) => a.scheduled - b.scheduled);

  return {
    earlier: candidates.filter(c => c.type === 'earlier'),
    later: candidates.filter(c => c.type === 'later'),
    all: candidates,
  };
}

/**
 * Select which candidates are active for a given condition.
 * 
 * @param {'N'|'L'|'H'} condition
 * @param {string} lTimingChoice - 'earlier' or 'later' (for L condition)
 * @param {object} candidateData - from computeCandidateTimes
 * @returns {object[]} - selected candidates with visibility info
 */
function selectActiveCandidates(condition, lTimingChoice, candidateData) {
  return candidateData.all.map(candidate => {
    let visible = false;

    if (condition === 'H') {
      visible = true; // All 6
    } else if (condition === 'L') {
      visible = candidate.type === lTimingChoice; // 3 earlier OR 3 later
    }
    // N: all invisible (pseudo-events)

    return {
      ...candidate,
      visible,
      condition,
      isPseudo: !visible,
    };
  });
}

/**
 * Build the complete notification schedule for a reading block.
 * Applies panel stability constraints and spacing rules.
 * 
 * @param {'N'|'L'|'H'} condition
 * @param {number[]} jitterVector - 6 jitter values
 * @param {string} lTimingChoice - 'earlier' or 'later'
 * @param {string} notificationVariant - 'Q1', 'Q2', or 'Q3'
 * @param {string} passageId - e.g., 'A', 'B', 'C'
 * @returns {object} - Full schedule with all events
 */
export function buildNotificationSchedule(condition, jitterVector, lTimingChoice, notificationVariant, passageId) {
  const candidateData = computeCandidateTimes(jitterVector);
  const events = selectActiveCandidates(condition, lTimingChoice, candidateData);
  const messages = NOTIFICATION_MESSAGES[notificationVariant] || NOTIFICATION_MESSAGES.Q1;

  // Assign messages to events (in candidate order by index)
  const sortedByIndex = [...events].sort((a, b) => a.index - b.index);
  sortedByIndex.forEach((event, i) => {
    event.messageId = messages[i]?.id || `MSG-${i}`;
    event.messageCategory = messages[i]?.category || 'unknown';
    event.messageText = messages[i]?.message || '';
  });

  // Re-sort by scheduled time
  events.sort((a, b) => a.scheduled - b.scheduled);

  return {
    condition,
    passageId,
    notificationVariant,
    lTimingChoice,
    jitterVector: [...jitterVector],
    events: events.map((e, i) => ({
      eventIndex: i,
      candidateIndex: e.index,
      candidateType: e.type,
      third: e.third,
      baseCandidate: e.base,
      jitter: e.jitter,
      scheduledOnset: e.scheduled,
      actualOnset: null,
      actualOffset: null,
      delay: 0,
      visible: e.visible,
      isPseudo: e.isPseudo,
      messageId: e.messageId,
      messageCategory: e.messageCategory,
      messageText: e.messageText,
      presentationSuccess: null,
      missedReason: null,
      panelAtOnset: null,
      panelTransitionsInWindow: [],
      completionStatus: null,
      reviewStatus: null,
    })),
    totalVisible: events.filter(e => e.visible).length,
    totalPseudo: events.filter(e => e.isPseudo).length,
  };
}

/**
 * Runtime notification controller.
 * Manages real-time notification display during a reading block.
 */
export class NotificationController {
  constructor(schedule, onShowNotification, onHideNotification) {
    this.schedule = schedule;
    this.onShowNotification = onShowNotification;
    this.onHideNotification = onHideNotification;
    this.blockStartTime = null;
    this.currentPanel = 1;
    this.lastPanelChangeTime = 0;
    this.lastOnsetTime = -Infinity;
    this.passageComplete = false;
    this.active = false;
    this.checkInterval = null;
    this.hideTimeout = null;
    this.processedEvents = new Set();
    this.panelChangeLog = []; // track all panel changes for analysis window flagging
  }

  /**
   * Start the controller when the reading block begins
   */
  start(blockStartTime) {
    this.blockStartTime = blockStartTime;
    this.lastPanelChangeTime = blockStartTime;
    this.active = true;
    this.processedEvents = new Set();

    eventLogger.log('NOTIFICATION_CONTROLLER_START', {
      condition: this.schedule.condition,
      totalEvents: this.schedule.events.length,
      totalVisible: this.schedule.totalVisible,
      monotonicTime: performance.now(),
    });

    // Check every 50ms for events that should fire
    this.checkInterval = setInterval(() => this.tick(), 50);
  }

  /**
   * Stop the controller
   */
  stop() {
    this.active = false;
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }

    eventLogger.log('NOTIFICATION_CONTROLLER_STOP', {
      condition: this.schedule.condition,
      monotonicTime: performance.now(),
    });
  }

  /**
   * Notify the controller of a panel change
   */
  onPanelChange(newPanel, timestamp) {
    this.currentPanel = newPanel;
    this.lastPanelChangeTime = timestamp || performance.now();
    this.panelChangeLog.push({
      panel: newPanel,
      timestamp: this.lastPanelChangeTime,
      elapsed: this.lastPanelChangeTime - this.blockStartTime,
    });
  }

  /**
   * Notify completion
   */
  onPassageComplete() {
    this.passageComplete = true;
  }

  /**
   * Main tick: check if any events should fire
   */
  tick() {
    if (!this.active) return;

    const now = performance.now();
    const elapsed = now - this.blockStartTime;

    for (let i = 0; i < this.schedule.events.length; i++) {
      const event = this.schedule.events[i];
      if (this.processedEvents.has(i)) continue;
      if (elapsed < event.scheduledOnset) continue;

      // Event is due or overdue — apply constraints
      this.processEvent(i, event, now, elapsed);
    }
  }

  /**
   * Process a single notification event with all protocol constraints
   */
  processEvent(index, event, now, elapsed) {
    this.processedEvents.add(index);

    const timeSinceLastPanelChange = now - this.lastPanelChangeTime;
    const timeSinceLastOnset = elapsed - (this.lastOnsetTime >= 0 ? this.lastOnsetTime : -Infinity);
    const readingBlockEnd = TIMING.READING_DURATION_MS;

    let actualOnsetTime = elapsed;
    let delay = 0;
    let missed = false;
    let missedReason = null;

    // Constraint 1: Panel stability — if within 5s after a panel change, delay until stable
    if (timeSinceLastPanelChange < TIMING.NOTIFICATION_PANEL_STABILITY_MS) {
      const neededDelay = TIMING.NOTIFICATION_PANEL_STABILITY_MS - timeSinceLastPanelChange;
      if (neededDelay <= TIMING.NOTIFICATION_MAX_DELAY_MS) {
        delay = neededDelay;
        actualOnsetTime = elapsed + delay;
      } else {
        // Delay would exceed max — mark as missed
        missed = true;
        missedReason = 'panel_stability_delay_exceeded';
      }
    }

    // Constraint 2: Minimum 20s between actual event onsets
    if (!missed && this.lastOnsetTime >= 0) {
      const gapFromLastOnset = actualOnsetTime - this.lastOnsetTime;
      if (gapFromLastOnset < TIMING.NOTIFICATION_MIN_SPACING_MS) {
        missed = true;
        missedReason = 'insufficient_spacing';
      }
    }

    // Constraint 3: At least 10s of reading after onset
    if (!missed) {
      const remainingAfterOnset = readingBlockEnd - actualOnsetTime;
      if (remainingAfterOnset < TIMING.NOTIFICATION_MIN_READING_AFTER_MS) {
        missed = true;
        missedReason = 'insufficient_reading_after';
      }
    }

    // Constraint 4: Don't exceed reading block duration
    if (!missed && actualOnsetTime >= readingBlockEnd) {
      missed = true;
      missedReason = 'beyond_block_duration';
    }

    // Flag panel transitions inside analysis window
    const windowStart = actualOnsetTime - TIMING.ANALYSIS_WINDOW_PRE_MS;
    const windowEnd = actualOnsetTime + TIMING.ANALYSIS_WINDOW_POST_MS;
    const transitionsInWindow = this.panelChangeLog.filter(pc => {
      const pcElapsed = pc.elapsed;
      return pcElapsed >= windowStart && pcElapsed <= windowEnd;
    });

    // Update event record
    event.actualOnset = missed ? null : (this.blockStartTime + actualOnsetTime);
    event.delay = delay;
    event.presentationSuccess = !missed;
    event.missedReason = missedReason;
    event.panelAtOnset = this.currentPanel;
    event.panelTransitionsInWindow = transitionsInWindow;
    event.completionStatus = this.passageComplete ? 'review' : 'reading';
    event.reviewStatus = this.passageComplete;

    // Log the event
    eventLogger.log(event.isPseudo ? 'NOTIFICATION_PSEUDO_EVENT' : 'NOTIFICATION_EVENT', {
      eventIndex: index,
      candidateIndex: event.candidateIndex,
      condition: this.schedule.condition,
      visible: event.visible,
      isPseudo: event.isPseudo,
      baseCandidate: event.baseCandidate,
      jitter: event.jitter,
      scheduledOnset: event.scheduledOnset,
      actualOnset: event.actualOnset,
      delay,
      missed,
      missedReason,
      messageId: event.messageId,
      messageCategory: event.messageCategory,
      panel: this.currentPanel,
      transitionsInWindow: transitionsInWindow.length,
      monotonicTime: performance.now(),
    });

    // Show notification if visible and not missed
    if (event.visible && !missed) {
      this.lastOnsetTime = actualOnsetTime;

      if (delay > 0) {
        // Schedule with delay
        setTimeout(() => {
          this.showNotification(event, index);
        }, delay);
      } else {
        this.showNotification(event, index);
      }
    } else if (event.isPseudo && !missed) {
      // Pseudo-event: record timing but don't show anything
      this.lastOnsetTime = actualOnsetTime;
      event.actualOffset = this.blockStartTime + actualOnsetTime + TIMING.NOTIFICATION_DURATION_MS;
    }
  }

  /**
   * Display a notification banner
   */
  showNotification(event, index) {
    const onsetTime = performance.now();
    event.actualOnset = onsetTime;

    this.onShowNotification?.({
      messageText: event.messageText,
      messageId: event.messageId,
      messageCategory: event.messageCategory,
      eventIndex: index,
    });

    eventLogger.log('NOTIFICATION_SHOW', {
      eventIndex: index,
      messageId: event.messageId,
      monotonicOnset: onsetTime,
    });

    // Auto-hide after duration
    this.hideTimeout = setTimeout(() => {
      const offsetTime = performance.now();
      event.actualOffset = offsetTime;

      this.onHideNotification?.({ eventIndex: index });

      eventLogger.log('NOTIFICATION_HIDE', {
        eventIndex: index,
        messageId: event.messageId,
        monotonicOffset: offsetTime,
        displayDuration: offsetTime - onsetTime,
      });
    }, TIMING.NOTIFICATION_DURATION_MS);
  }

  /**
   * Get final schedule data for export
   */
  getScheduleData() {
    return {
      ...this.schedule,
      panelChangeLog: this.panelChangeLog,
    };
  }
}
