/**
 * NBI Experiment Portal – Experiment Runner
 * 
 * State machine that drives the entire session flow:
 * Setup → Practice → Baseline → Active Blocks → Debrief
 * 
 * Handles the exact session flow per protocol section 3.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { loadSession, saveSession, exportSessionJSON, exportCleanResultsJSON } from '../engine/sessionStore.js';
import { eventLogger } from '../engine/eventLogger.js';
import { COUNTERBALANCE_CELLS } from '../config/protocol.js';
import StroopTask from '../components/StroopTask.jsx';
import ReadingTask from '../components/ReadingTask.jsx';
import ComprehensionTest from '../components/ComprehensionTest.jsx';
import Baseline from '../components/Baseline.jsx';
import RatingScale, { ReadingRatings } from '../components/RatingScale.jsx';
import BreakScreen from '../components/BreakScreen.jsx';

// ─── State Machine Phases ────────────────────────────────────────────
const PHASES = {
  LOADING: 'LOADING',
  SETUP: 'SETUP',
  CALIBRATION: 'CALIBRATION',
  STROOP_PRACTICE: 'STROOP_PRACTICE',
  READING_PRACTICE: 'READING_PRACTICE',
  BASELINE: 'BASELINE',
  INITIAL_RATING: 'INITIAL_RATING',
  ACTIVE_BLOCK: 'ACTIVE_BLOCK',
  COMPREHENSION: 'COMPREHENSION',
  READING_RATINGS: 'READING_RATINGS',
  POST_BLOCK_RATING: 'POST_BLOCK_RATING',
  BREAK: 'BREAK',
  DEBRIEF: 'DEBRIEF',
  COMPLETE: 'COMPLETE',
  ERROR: 'ERROR',
};

export default function ExperimentRunner() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  
  const [session, setSession] = useState(null);
  const [phase, setPhase] = useState(PHASES.LOADING);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [breakCount, setBreakCount] = useState(0);
  const [error, setError] = useState(null);
  
  // Track the last reading block data for comprehension/ratings flow
  const [lastReadingData, setLastReadingData] = useState(null);
  
  // Setup form state
  const [calibrationResult, setCalibrationResult] = useState('');
  const [validationResult, setValidationResult] = useState('');
  const [consentComplete, setConsentComplete] = useState(false);
  const [instructionsComplete, setInstructionsComplete] = useState(false);

  // Debrief state
  const [debriefDifficulties, setDebriefDifficulties] = useState('');
  const [debriefDeviations, setDebriefDeviations] = useState('');
  const [debriefMissedNotifications, setDebriefMissedNotifications] = useState('');
  const [debriefExtraBreaks, setDebriefExtraBreaks] = useState('');
  
  const autosaveRef = useRef(null);

  // Load session
  useEffect(() => {
    const loaded = loadSession(sessionId);
    if (!loaded) {
      setError('Session not found');
      setPhase(PHASES.ERROR);
      return;
    }
    setSession(loaded);
    eventLogger.init(loaded.sessionId, loaded.participantCode);
    
    // Resume from saved phase or start fresh
    if (loaded.currentPhase === 'SETUP' || !loaded.currentPhase) {
      setPhase(PHASES.SETUP);
    } else {
      setPhase(loaded.currentPhase);
      setCurrentBlockIndex(loaded.currentBlockIndex || 0);
    }

    // Start autosave
    autosaveRef.current = setInterval(() => {
      const currentSession = loadSession(sessionId);
      if (currentSession?.status === 'in_progress') {
        saveSession(currentSession);
      }
    }, 10000);

    return () => {
      if (autosaveRef.current) clearInterval(autosaveRef.current);
    };
  }, [sessionId]);

  // Save session state
  const updateSession = useCallback((updates) => {
    setSession(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      saveSession(updated);
      return updated;
    });
  }, []);

  const advancePhase = useCallback((newPhase, extraUpdates = {}) => {
    eventLogger.log('PHASE_TRANSITION', {
      from: phase,
      to: newPhase,
      monotonicTime: performance.now(),
    });
    
    setPhase(newPhase);
    updateSession({
      currentPhase: newPhase,
      completedPhases: [...(session?.completedPhases || []), phase],
      phaseTimestamps: {
        ...(session?.phaseTimestamps || {}),
        [`${phase}_end`]: new Date().toISOString(),
        [`${newPhase}_start`]: new Date().toISOString(),
      },
      ...extraUpdates,
    });
  }, [phase, session, updateSession]);

  // ─── Helper: get current block type ───────────────────────────────
  const getCurrentBlockType = useCallback(() => {
    return session?.blockOrder?.[currentBlockIndex] || null;
  }, [session, currentBlockIndex]);

  const getPassageForCondition = useCallback((condition) => {
    return session?.passages?.[condition] || null;
  }, [session]);

  // ─── SETUP PHASE ────────────────────────────────────────────────────
  const handleSetupComplete = () => {
    updateSession({
      calibrationResult,
      validationResult,
    });
    advancePhase(PHASES.CALIBRATION);
  };

  const handleCalibrationComplete = () => {
    advancePhase(PHASES.STROOP_PRACTICE);
  };

  // ─── PRACTICE PHASES ────────────────────────────────────────────────
  const handleStroopPracticeComplete = (data) => {
    eventLogger.log('STROOP_PRACTICE_COMPLETE', { 
      trials: data.trials?.length,
      monotonicTime: performance.now(),
    });
    advancePhase(PHASES.READING_PRACTICE);
  };

  const handleReadingPracticeComplete = () => {
    advancePhase(PHASES.BASELINE);
  };

  // ─── BASELINE ───────────────────────────────────────────────────────
  const handleBaselineComplete = () => {
    advancePhase(PHASES.INITIAL_RATING);
  };

  // ─── RATINGS ────────────────────────────────────────────────────────
  const handleInitialRatingComplete = (result) => {
    updateSession({
      ratings: [...(session?.ratings || []), { ...result, timing: 'pre_block_1' }],
    });
    setCurrentBlockIndex(0);
    advancePhase(PHASES.ACTIVE_BLOCK, { currentBlockIndex: 0 });
  };

  const handlePostBlockRatingComplete = (result) => {
    const blockIndex = currentBlockIndex;
    updateSession({
      ratings: [...(session?.ratings || []), { ...result, timing: `post_block_${blockIndex + 1}` }],
    });

    // Check if there are more blocks
    if (blockIndex + 1 < 4) {
      setBreakCount(prev => prev + 1);
      advancePhase(PHASES.BREAK);
    } else {
      advancePhase(PHASES.DEBRIEF);
    }
  };

  const handleReadingRatingsComplete = (results) => {
    updateSession({
      ratings: [
        ...(session?.ratings || []),
        ...results.map(r => ({ ...r, timing: `post_reading_block_${currentBlockIndex + 1}` })),
      ],
    });
    // After reading-specific ratings, collect mental fatigue rating
    advancePhase(PHASES.POST_BLOCK_RATING);
  };

  // ─── ACTIVE BLOCKS ──────────────────────────────────────────────────
  const handleActiveBlockComplete = (data) => {
    const blockType = getCurrentBlockType();
    
    if (blockType === 'Stroop') {
      // Save Stroop trials
      updateSession({
        stroopTrials: data.trials || [],
      });
      // Stroop block → mental fatigue rating directly (no comprehension/reading ratings)
      advancePhase(PHASES.POST_BLOCK_RATING);
    } else {
      // Reading block (N, L, or H)
      // Save reading events and notification schedule
      setLastReadingData(data);
      updateSession({
        readingEvents: [
          ...(session?.readingEvents || []),
          {
            condition: data.condition,
            passageId: data.passageId,
            panelEvents: data.panelEvents,
            lastPanel: data.lastPanel,
            maxPanelReached: data.maxPanelReached,
            passageCompleted: data.passageCompleted,
            completionKey: data.completionKey,
            cumulativeWords: data.cumulativeWords,
            invalidKeys: data.invalidKeys,
            blockIndex: currentBlockIndex,
          },
        ],
        notificationEvents: [
          ...(session?.notificationEvents || []),
          ...(data.notificationSchedule?.events || []).map(e => ({
            ...e,
            condition: data.condition,
            passageId: data.passageId,
            blockIndex: currentBlockIndex,
          })),
        ],
      });
      // Reading block → comprehension → reading ratings → mental fatigue
      advancePhase(PHASES.COMPREHENSION);
    }
  };

  // ─── COMPREHENSION ──────────────────────────────────────────────────
  const handleComprehensionComplete = (results) => {
    updateSession({
      comprehensionResponses: [
        ...(session?.comprehensionResponses || []),
        ...results.map(r => ({ ...r, blockIndex: currentBlockIndex })),
      ],
    });
    // After comprehension → reading-specific ratings (distraction + return difficulty)
    advancePhase(PHASES.READING_RATINGS);
  };

  // ─── BREAK ──────────────────────────────────────────────────────────
  const handleBreakComplete = (breakData) => {
    updateSession({
      breaks: [...(session?.breaks || []), breakData],
    });
    
    const nextBlockIndex = currentBlockIndex + 1;
    setCurrentBlockIndex(nextBlockIndex);
    advancePhase(PHASES.ACTIVE_BLOCK, { currentBlockIndex: nextBlockIndex });
  };

  // ─── DEBRIEF ────────────────────────────────────────────────────────
  const handleDebriefComplete = () => {
    updateSession({
      deviations: [
        ...(session?.deviations || []),
        {
          difficulties: debriefDifficulties,
          deviations: debriefDeviations,
          missedNotifications: debriefMissedNotifications,
          extraBreaks: debriefExtraBreaks,
          timestamp: new Date().toISOString(),
        },
      ],
      status: 'complete',
    });
    
    eventLogger.log('SESSION_COMPLETE', {
      monotonicTime: performance.now(),
    });
    
    advancePhase(PHASES.COMPLETE);
  };

  // ─── RENDER ─────────────────────────────────────────────────────────

  if (phase === PHASES.ERROR) {
    return (
      <div className="experiment-screen">
        <div className="error-card">
          <h2>Error</h2>
          <p>{error}</p>
          <button className="btn-primary" onClick={() => navigate('/')}>
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (phase === PHASES.LOADING || !session) {
    return (
      <div className="experiment-screen">
        <div className="loading-spinner">
          <div className="spinner" />
          <p>Loading session...</p>
        </div>
      </div>
    );
  }

  // ─── Phase-specific renders ─────────────────────────────────────────

  if (phase === PHASES.SETUP) {
    return (
      <div className="experiment-screen">
        <div className="setup-card">
          <div className="setup-header">
            <h1>Session Setup</h1>
            <div className="session-meta">
              <span className="meta-item">
                <span className="meta-label">Participant:</span> {session.participantCode}
              </span>
              <span className="meta-item">
                <span className="meta-label">Cell:</span> {session.taskOrderCell}
              </span>
              {session.isTestMode && <span className="badge badge-test">🧪 Test Mode</span>}
            </div>
          </div>

          <div className="setup-checklist">
            <h3>Pre-experiment Checklist</h3>

            <div className="checklist-section">
              <h4>Block Order</h4>
              <div className="block-sequence-display">
                <div className="block-item baseline">Baseline</div>
                {session.blockOrder?.map((block, i) => (
                  <div key={i} className={`block-item block-${block.toLowerCase()}`}>
                    {block}
                    {block !== 'Stroop' && session.passages && (
                      <span className="block-passage-small">
                        Pass. {session.passages[block]}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="checklist-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={consentComplete}
                  onChange={e => setConsentComplete(e.target.checked)}
                />
                Consent and instructions completed
              </label>
            </div>

            <div className="checklist-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={instructionsComplete}
                  onChange={e => setInstructionsComplete(e.target.checked)}
                />
                Participant has been briefed on Stroop key mappings
              </label>
            </div>

            <div className="setup-fields">
              <div className="form-field">
                <label>Calibration Result</label>
                <input
                  type="text"
                  value={calibrationResult}
                  onChange={e => setCalibrationResult(e.target.value)}
                  placeholder="e.g., Good, Average deviation: 0.3°"
                />
              </div>
              <div className="form-field">
                <label>Validation Result</label>
                <input
                  type="text"
                  value={validationResult}
                  onChange={e => setValidationResult(e.target.value)}
                  placeholder="e.g., Max deviation: 0.5°"
                />
              </div>
            </div>
          </div>

          <button
            className="btn-primary btn-lg"
            onClick={handleSetupComplete}
            disabled={!consentComplete || !instructionsComplete}
          >
            Begin Experiment →
          </button>
        </div>
      </div>
    );
  }

  if (phase === PHASES.CALIBRATION) {
    return (
      <div className="experiment-screen">
        <div className="calibration-card">
          <h2>Eye Tracker Calibration & Validation</h2>
          <p>Complete calibration and validation in the eye tracker software.</p>
          <p className="calibration-note">
            Mark this checkpoint complete when the tracker is calibrated and validated.
          </p>
          <button className="btn-primary btn-lg" onClick={handleCalibrationComplete}>
            Calibration Complete — Start Practice
          </button>
        </div>
      </div>
    );
  }

  if (phase === PHASES.STROOP_PRACTICE) {
    return (
      <div className="experiment-screen experiment-fullscreen">
        <StroopTask
          session={session}
          isPractice={true}
          onComplete={handleStroopPracticeComplete}
        />
      </div>
    );
  }

  if (phase === PHASES.READING_PRACTICE) {
    return (
      <div className="experiment-screen">
        <div className="practice-card">
          <h2>Reading Practice</h2>
          <div className="reading-practice-content">
            <p>Practice navigating through reading panels:</p>
            <ul className="practice-instructions">
              <li><kbd>→</kbd> Right Arrow — Next panel</li>
              <li><kbd>←</kbd> Left Arrow — Previous panel</li>
              <li><kbd>Space</kbd> — Mark passage as complete (after reaching the last panel)</li>
            </ul>
            <p>You will see a practice passage with two panels, followed by a practice question.</p>
            <p>A sample notification will also appear during practice.</p>

            <div className="practice-demo">
              <div className="practice-panel">
                <h3 className="practice-title">Practice Passage</h3>
                <p className="practice-text">
                  This is a sample text panel. In the actual experiment, you will read longer passages
                  displayed one panel at a time. Use the arrow keys to navigate between panels.
                  Pay attention to the content as you will be asked comprehension questions afterward.
                </p>
                <div className="practice-panel-indicator">Panel 1 of 2</div>
              </div>
            </div>
          </div>
          
          <button className="btn-primary btn-lg" onClick={handleReadingPracticeComplete}>
            Practice Complete — Continue to Baseline
          </button>
        </div>
      </div>
    );
  }

  if (phase === PHASES.BASELINE) {
    return (
      <div className="experiment-screen experiment-fullscreen">
        <Baseline session={session} onComplete={handleBaselineComplete} />
      </div>
    );
  }

  if (phase === PHASES.INITIAL_RATING) {
    return (
      <div className="experiment-screen">
        <RatingScale
          ratingType="mentalFatigue"
          context="pre_block_1"
          onComplete={handleInitialRatingComplete}
        />
      </div>
    );
  }

  if (phase === PHASES.ACTIVE_BLOCK) {
    const blockType = getCurrentBlockType();
    
    if (blockType === 'Stroop') {
      return (
        <div className="experiment-screen experiment-fullscreen">
          <StroopTask
            session={session}
            isPractice={false}
            onComplete={handleActiveBlockComplete}
          />
        </div>
      );
    }
    
    // Reading block (N, L, or H)
    const passageId = getPassageForCondition(blockType);
    return (
      <div className="experiment-screen experiment-fullscreen">
        <ReadingTask
          key={`reading-${currentBlockIndex}-${blockType}`}
          session={session}
          condition={blockType}
          passageId={passageId}
          onComplete={handleActiveBlockComplete}
        />
      </div>
    );
  }

  if (phase === PHASES.COMPREHENSION) {
    const blockType = getCurrentBlockType();
    const passageId = getPassageForCondition(blockType);
    return (
      <div className="experiment-screen">
        <ComprehensionTest
          key={`comp-${currentBlockIndex}`}
          passageId={passageId}
          condition={blockType}
          lastPanel={lastReadingData?.lastPanel || 0}
          onComplete={handleComprehensionComplete}
        />
      </div>
    );
  }

  if (phase === PHASES.READING_RATINGS) {
    return (
      <div className="experiment-screen">
        <ReadingRatings
          key={`rr-${currentBlockIndex}`}
          context={`post_reading_block_${currentBlockIndex + 1}`}
          onComplete={handleReadingRatingsComplete}
        />
      </div>
    );
  }

  if (phase === PHASES.POST_BLOCK_RATING) {
    return (
      <div className="experiment-screen">
        <RatingScale
          key={`pbr-${currentBlockIndex}`}
          ratingType="mentalFatigue"
          context={`post_block_${currentBlockIndex + 1}`}
          onComplete={handlePostBlockRatingComplete}
        />
      </div>
    );
  }

  if (phase === PHASES.BREAK) {
    return (
      <div className="experiment-screen experiment-fullscreen">
        <BreakScreen
          breakNumber={breakCount}
          session={session}
          onComplete={handleBreakComplete}
        />
      </div>
    );
  }

  if (phase === PHASES.DEBRIEF) {
    return (
      <div className="experiment-screen">
        <div className="debrief-card">
          <h2>Session Debrief</h2>
          <p>Record any observations about this session.</p>
          
          <div className="debrief-form">
            <div className="form-field">
              <label>Difficulties reported by participant</label>
              <textarea
                value={debriefDifficulties}
                onChange={e => setDebriefDifficulties(e.target.value)}
                rows={3}
                placeholder="Any difficulties mentioned..."
              />
            </div>
            <div className="form-field">
              <label>Protocol deviations</label>
              <textarea
                value={debriefDeviations}
                onChange={e => setDebriefDeviations(e.target.value)}
                rows={3}
                placeholder="Any deviations from protocol..."
              />
            </div>
            <div className="form-field">
              <label>Missed notifications</label>
              <textarea
                value={debriefMissedNotifications}
                onChange={e => setDebriefMissedNotifications(e.target.value)}
                rows={2}
                placeholder="Any missed or problematic notifications..."
              />
            </div>
            <div className="form-field">
              <label>Extra breaks or recalibrations</label>
              <textarea
                value={debriefExtraBreaks}
                onChange={e => setDebriefExtraBreaks(e.target.value)}
                rows={2}
                placeholder="Any additional breaks or recalibrations..."
              />
            </div>
          </div>

          <button className="btn-primary btn-lg" onClick={handleDebriefComplete}>
            Complete Session
          </button>
        </div>
      </div>
    );
  }

  if (phase === PHASES.COMPLETE) {
    return (
      <div className="experiment-screen">
        <div className="complete-card">
          <div className="complete-icon">✓</div>
          <h2>Session Complete</h2>
          <p>All data has been saved. You can now export the session data.</p>
          
          <div className="complete-summary">
            <div className="summary-item">
              <span className="summary-label">Participant:</span>
              <span className="summary-value">{session.participantCode}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Cell:</span>
              <span className="summary-value">{session.taskOrderCell}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Stroop Trials:</span>
              <span className="summary-value">{session.stroopTrials?.length || 0}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Reading Blocks:</span>
              <span className="summary-value">{session.readingEvents?.length || 0}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Comprehension:</span>
              <span className="summary-value">{session.comprehensionResponses?.length || 0} answers</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Ratings:</span>
              <span className="summary-value">{session.ratings?.length || 0}</span>
            </div>
          </div>

          <div className="complete-actions">
            <button
              className="btn-primary"
              onClick={() => exportCleanResultsJSON(session)}
            >
              Export Results JSON (Credentials + Responses)
            </button>
            <button
              className="btn-secondary"
              onClick={() => exportSessionJSON(session)}
            >
              Export Full Raw Session JSON (Tobii Logs)
            </button>
            <button className="btn-secondary" onClick={() => navigate('/')}>
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
