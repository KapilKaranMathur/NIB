/**
 * NBI Experiment Portal – Reading Task Component
 * 
 * Implements protocol Section 5: Reading Task
 * 
 * - One of six panels at a time; no scrolling
 * - Show title, text, and small panel number only
 * - Right Arrow = next panel; Left Arrow = previous panel; no automatic advance
 * - 300s timer starts when panel 1 appears; stops at exactly 300s
 * - After all panels completed, Space records completion; participant reviews until 300s ends
 * - Notifications appear in a fixed region beside the text (never cover it)
 * - Log every panel change, completion key, last panel reached, completed-panel words, review-period timing
 * 
 * Layout per protocol (on 1920×1080):
 *   Text region:         x=160, y=150, width=960, height=780
 *   Notification region: x=1320, y=180, width=440, height=160
 *   ~24px sans-serif, 1.4 line spacing, constant light background
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { TIMING, LAYOUT } from '../config/protocol.js';
import { PASSAGES } from '../config/passages.js';
import { buildNotificationSchedule, NotificationController } from '../engine/notificationEngine.js';
import { eventLogger } from '../engine/eventLogger.js';

export default function ReadingTask({
  session,
  condition,       // 'N', 'L', or 'H'
  passageId,       // 'A', 'B', or 'C'
  onComplete,
}) {
  const passage = PASSAGES[passageId];
  if (!passage) {
    return <div className="reading-error">Passage "{passageId}" not found.</div>;
  }

  const totalPanels = passage.panels.length;

  const [currentPanel, setCurrentPanel] = useState(1);
  const [timeRemaining, setTimeRemaining] = useState(TIMING.READING_DURATION_MS);
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false); // all panels read
  const [passageCompleted, setPassageCompleted] = useState(false); // Space pressed
  const [reviewStartTime, setReviewStartTime] = useState(null);
  const [notification, setNotification] = useState(null); // currently visible notification
  const [taskDone, setTaskDone] = useState(false); // 300s elapsed

  // Refs for timing and state
  const blockStartRef = useRef(null);
  const animFrameRef = useRef(null);
  const controllerRef = useRef(null);
  const panelEventsRef = useRef([]);
  const keyPressedRef = useRef(new Set());
  const currentPanelRef = useRef(1);
  const maxPanelReachedRef = useRef(1);
  const completionKeyRef = useRef(null);
  const passageCompletedRef = useRef(false);
  const invalidKeysRef = useRef([]);

  // Track cumulative completed-panel words
  const getCumulativeWords = useCallback((panelNum) => {
    let total = 0;
    for (let i = 0; i < panelNum && i < passage.panels.length; i++) {
      total += passage.panels[i].wordCount;
    }
    return total;
  }, [passage]);

  // Build notification schedule on mount
  useEffect(() => {
    const schedule = buildNotificationSchedule(
      condition,
      session.jitterVector,
      session.lTimingChoice,
      session.notificationVariant,
      passageId,
    );

    const controller = new NotificationController(
      schedule,
      // onShowNotification
      (data) => {
        setNotification({
          text: data.messageText,
          id: data.messageId,
          category: data.messageCategory,
        });
      },
      // onHideNotification
      () => {
        setNotification(null);
      },
    );

    controllerRef.current = controller;

    eventLogger.log('READING_SCHEDULE_BUILT', {
      condition,
      passageId,
      totalVisible: schedule.totalVisible,
      totalPseudo: schedule.totalPseudo,
      events: schedule.events.map(e => ({
        candidateIndex: e.candidateIndex,
        scheduledOnset: e.scheduledOnset,
        visible: e.visible,
        messageId: e.messageId,
      })),
    });

    return () => {
      controller.stop();
    };
  }, [condition, passageId, session]);

  // Start the reading block
  const handleStart = useCallback(() => {
    setStarted(true);
    blockStartRef.current = performance.now();
    currentPanelRef.current = 1;

    eventLogger.log('READING_BLOCK_START', {
      condition,
      passageId,
      passageTitle: passage.title,
      totalPanels,
      monotonicOnset: blockStartRef.current,
    });

    // Log initial panel enter
    panelEventsRef.current.push({
      panel: 1,
      action: 'enter',
      timestamp: blockStartRef.current,
      elapsed: 0,
      direction: 'initial',
    });

    // Start notification controller
    controllerRef.current?.start(blockStartRef.current);

    // Start the 300s timer
    const tick = () => {
      const elapsed = performance.now() - blockStartRef.current;
      const remaining = Math.max(0, TIMING.READING_DURATION_MS - elapsed);
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        // Time's up
        setTaskDone(true);
        controllerRef.current?.stop();

        const endTime = performance.now();
        eventLogger.log('READING_BLOCK_END', {
          condition,
          passageId,
          lastPanel: currentPanelRef.current,
          maxPanelReached: maxPanelReachedRef.current,
          passageCompleted: passageCompletedRef.current,
          cumulativeWords: getCumulativeWords(maxPanelReachedRef.current),
          reviewStartTime: reviewStartTime,
          actualDuration: elapsed,
          monotonicOffset: endTime,
        });

        // Brief pause then complete
        setTimeout(() => {
          const scheduleData = controllerRef.current?.getScheduleData();
          onComplete?.({
            condition,
            passageId,
            panelEvents: panelEventsRef.current,
            notificationSchedule: scheduleData,
            lastPanel: currentPanelRef.current,
            maxPanelReached: maxPanelReachedRef.current,
            passageCompleted: passageCompletedRef.current,
            completionKey: completionKeyRef.current,
            cumulativeWords: getCumulativeWords(maxPanelReachedRef.current),
            invalidKeys: invalidKeysRef.current,
          });
        }, 1500);
        return;
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
  }, [condition, passageId, passage, totalPanels, getCumulativeWords, onComplete, reviewStartTime]);

  const finishReadingBlock = useCallback(() => {
    if (taskDone) return;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setTaskDone(true);
    controllerRef.current?.stop();

    const endTime = performance.now();
    const elapsed = blockStartRef.current ? endTime - blockStartRef.current : 0;
    eventLogger.log('READING_BLOCK_END', {
      condition,
      passageId,
      lastPanel: currentPanelRef.current,
      maxPanelReached: maxPanelReachedRef.current,
      passageCompleted: passageCompletedRef.current,
      cumulativeWords: getCumulativeWords(maxPanelReachedRef.current),
      reviewStartTime: reviewStartTime,
      actualDuration: elapsed,
      monotonicOffset: endTime,
      earlyFinish: true,
    });

    setTimeout(() => {
      const scheduleData = controllerRef.current?.getScheduleData();
      onComplete?.({
        condition,
        passageId,
        panelEvents: panelEventsRef.current,
        notificationSchedule: scheduleData,
        lastPanel: currentPanelRef.current,
        maxPanelReached: maxPanelReachedRef.current,
        passageCompleted: passageCompletedRef.current,
        completionKey: completionKeyRef.current,
        cumulativeWords: getCumulativeWords(maxPanelReachedRef.current),
        invalidKeys: invalidKeysRef.current,
      });
    }, 1000);
  }, [condition, passageId, getCumulativeWords, onComplete, reviewStartTime, taskDone]);

  // Keyboard handler
  useEffect(() => {
    if (!started || taskDone) return;

    const handleKeyDown = (e) => {
      const key = e.key;

      // Prevent key-repeat
      if (e.repeat || keyPressedRef.current.has(key)) {
        e.preventDefault();
        return;
      }
      keyPressedRef.current.add(key);

      const now = performance.now();
      const elapsed = now - blockStartRef.current;
      const panel = currentPanelRef.current;

      if (key === 'ArrowRight') {
        e.preventDefault();
        if (panel < totalPanels) {
          const newPanel = panel + 1;

          // Log leave current panel
          panelEventsRef.current.push({
            panel,
            action: 'leave',
            timestamp: now,
            elapsed,
            direction: 'forward',
          });

          // Log enter new panel
          panelEventsRef.current.push({
            panel: newPanel,
            action: 'enter',
            timestamp: now,
            elapsed,
            direction: 'forward',
          });

          currentPanelRef.current = newPanel;
          setCurrentPanel(newPanel);
          maxPanelReachedRef.current = Math.max(maxPanelReachedRef.current, newPanel);

          // Notify controller of panel change
          controllerRef.current?.onPanelChange(newPanel, now);

          eventLogger.log('READING_PANEL_CHANGE', {
            fromPanel: panel,
            toPanel: newPanel,
            direction: 'forward',
            elapsed,
            monotonicTime: now,
          });

          // Check if all panels have been reached
          if (newPanel === totalPanels && !completed) {
            setCompleted(true);
          }
        }
      } else if (key === 'ArrowLeft') {
        e.preventDefault();
        if (panel > 1) {
          const newPanel = panel - 1;

          panelEventsRef.current.push({
            panel,
            action: 'leave',
            timestamp: now,
            elapsed,
            direction: 'backward',
          });

          panelEventsRef.current.push({
            panel: newPanel,
            action: 'enter',
            timestamp: now,
            elapsed,
            direction: 'backward',
          });

          currentPanelRef.current = newPanel;
          setCurrentPanel(newPanel);
          controllerRef.current?.onPanelChange(newPanel, now);

          eventLogger.log('READING_PANEL_CHANGE', {
            fromPanel: panel,
            toPanel: newPanel,
            direction: 'backward',
            elapsed,
            monotonicTime: now,
          });
        }
      } else if (key === ' ' || key === 'Space') {
        e.preventDefault();
        // Space = mark passage as complete (only after reaching last panel)
        if (completed && !passageCompletedRef.current) {
          passageCompletedRef.current = true;
          setPassageCompleted(true);
          setReviewStartTime(now);
          completionKeyRef.current = {
            timestamp: now,
            elapsed,
            panel: currentPanelRef.current,
          };

          controllerRef.current?.onPassageComplete();

          eventLogger.log('READING_PASSAGE_COMPLETED', {
            panel: currentPanelRef.current,
            elapsed,
            cumulativeWords: getCumulativeWords(maxPanelReachedRef.current),
            monotonicTime: now,
          });
        } else if (passageCompletedRef.current || completed) {
          // Second space bar press or space bar when completed finishes reading block immediately
          finishReadingBlock();
        }
      } else {
        // Log invalid keys
        invalidKeysRef.current.push({ key, timestamp: now, elapsed });
        eventLogger.log('READING_INVALID_KEY', {
          key,
          panel: currentPanelRef.current,
          elapsed,
          monotonicTime: now,
        });
      }
    };

    const handleKeyUp = (e) => {
      keyPressedRef.current.delete(e.key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [started, taskDone, totalPanels, completed, getCumulativeWords]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      controllerRef.current?.stop();
    };
  }, []);

  // ─── RENDER ────────────────────────────────────────────────────────

  // Pre-start screen
  if (!started) {
    return (
      <div className="reading-screen">
        <div className="reading-prestart">
          <h2>Reading Block — {condition}</h2>
          <p>Passage: <strong>{passage.title}</strong></p>
          <p className="reading-prestart-info">
            You will have {TIMING.READING_DURATION_MS / 1000 / 60} minutes to read the passage.
            Navigate between panels using arrow keys.
          </p>
          <div className="reading-key-reminder">
            <span><kbd>→</kbd> Next panel</span>
            <span><kbd>←</kbd> Previous panel</span>
            <span><kbd>Space</kbd> Mark complete</span>
          </div>
          <button className="btn-primary btn-lg" onClick={handleStart}>
            Begin Reading
          </button>
        </div>
      </div>
    );
  }

  // Task done screen
  if (taskDone) {
    return (
      <div className="reading-screen">
        <div className="reading-done">
          <div className="reading-done-icon">✓</div>
          <h2>Reading Block Complete</h2>
          <div className="reading-done-stats">
            <div className="stat-item">
              <span className="stat-value">{maxPanelReachedRef.current}</span>
              <span className="stat-label">Panels Reached</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{getCumulativeWords(maxPanelReachedRef.current)}</span>
              <span className="stat-label">Words Read</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{passageCompleted ? 'Yes' : 'No'}</span>
              <span className="stat-label">Completed</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active reading
  const panelData = passage.panels[currentPanel - 1];
  const minutes = Math.floor(timeRemaining / 60000);
  const seconds = Math.floor((timeRemaining % 60000) / 1000);
  const progress = ((TIMING.READING_DURATION_MS - timeRemaining) / TIMING.READING_DURATION_MS) * 100;

  return (
    <div className="reading-screen reading-active">
      {/* Timer progress bar */}
      <div className="reading-progress">
        <div className="reading-progress-bar" style={{ width: `${progress}%` }} />
      </div>

      {/* Main layout container — mimics 1920×1080 protocol layout */}
      <div className="reading-layout">
        {/* Text region */}
        <div className="reading-text-region">
          <h2 className="reading-passage-title">{passage.title}</h2>
          <div className="reading-text-content">
            {panelData.text}
          </div>

          {/* Panel indicator */}
          <div className="reading-panel-indicator">
            <span className="panel-number">Panel {currentPanel} of {totalPanels}</span>
            {currentPanel > 1 && <span className="nav-hint">← Prev</span>}
            {currentPanel < totalPanels && <span className="nav-hint">Next →</span>}
            {completed && !passageCompleted && (
              <button className="btn-secondary" onClick={() => {
                const now = performance.now();
                const elapsed = now - blockStartRef.current;
                passageCompletedRef.current = true;
                setPassageCompleted(true);
                setReviewStartTime(now);
                completionKeyRef.current = { timestamp: now, elapsed, panel: currentPanelRef.current };
                controllerRef.current?.onPassageComplete();
                eventLogger.log('READING_PASSAGE_COMPLETED', {
                  panel: currentPanelRef.current,
                  elapsed,
                  cumulativeWords: getCumulativeWords(maxPanelReachedRef.current),
                  monotonicTime: now,
                });
              }}>
                Mark Complete (Space)
              </button>
            )}
            {passageCompleted && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="review-badge">Reviewing — you may revisit panels</span>
                <button className="btn-primary" onClick={finishReadingBlock}>
                  Finish Reading & Proceed to Q&A (Space)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Notification region — fixed beside text, never covers it */}
        <div className="reading-notification-region">
          {notification && (
            <div className="notification-banner">
              <div className="notification-header">Study notification</div>
              <div className="notification-body">{notification.text}</div>
            </div>
          )}
        </div>
      </div>

      {/* Timer display (subtle, researcher-visible) */}
      <div className="reading-timer">
        {minutes}:{seconds.toString().padStart(2, '0')}
      </div>
    </div>
  );
}
