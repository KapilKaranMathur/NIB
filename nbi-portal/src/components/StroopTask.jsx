/**
 * NBI Experiment Portal – Stroop Task Component
 * 
 * Implements the exact Stroop color-word task per protocol:
 * - Fixed timing: 500ms fixation + 1500ms word+response + 500ms blank = 2500ms/trial
 * - 120 scored trials (300s total)
 * - Early response NEVER shortens the 1500ms word display
 * - No scored feedback during actual task
 * - Keys: D=RED, F=GREEN, J=BLUE, K=YELLOW
 * - Prevents key-repeat from generating multiple responses
 * - Logs all trial data including invalid/anticipatory keys
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { TIMING, STROOP_KEY_MAP, STROOP_COLOR_HEX } from '../config/protocol.js';
import { generateStroopTrials, generatePracticeTrials } from '../engine/stroopGenerator.js';
import { eventLogger } from '../engine/eventLogger.js';

const PHASE_FIXATION = 'FIXATION';
const PHASE_WORD = 'WORD';
const PHASE_BLANK = 'BLANK';
const PHASE_COMPLETE = 'COMPLETE';

export default function StroopTask({ session, onComplete, isPractice = false, onTrialUpdate }) {
  const [currentTrialIndex, setCurrentTrialIndex] = useState(0);
  const [phase, setPhase] = useState(null); // null = not started
  const [trials, setTrials] = useState([]);
  const [trialResults, setTrialResults] = useState([]);
  const [showFeedback, setShowFeedback] = useState(null); // Only in practice
  const [taskStarted, setTaskStarted] = useState(false);
  const [generatorMeta, setGeneratorMeta] = useState(null);
  const [countdown, setCountdown] = useState(3);
  const [showCountdown, setShowCountdown] = useState(true);

  const phaseTimerRef = useRef(null);
  const trialStartTimeRef = useRef(null);
  const wordOnsetTimeRef = useRef(null);
  const responseRecordedRef = useRef(false);
  const invalidKeysRef = useRef([]);
  const keyPressedRef = useRef(new Set()); // Prevent key-repeat
  const currentTrialRef = useRef(null);
  const phaseRef = useRef(null);

  // Generate trials on mount
  useEffect(() => {
    if (isPractice) {
      const practiceTrials = generatePracticeTrials(session.stroopSeed + 1);
      setTrials(practiceTrials);
    } else {
      const result = generateStroopTrials(session.stroopSeed);
      setTrials(result.trials);
      setGeneratorMeta({
        seed: result.seed,
        transitions: result.transitions,
        consecutivePairs: result.consecutivePairs,
        congruentCount: result.congruentCount,
        incongruentCount: result.incongruentCount,
        totalTrials: result.totalTrials,
        protocolNote: result.protocolNote,
        matrixVerification: result.matrixVerification,
      });
      eventLogger.log('STROOP_TRIALS_GENERATED', {
        seed: result.seed,
        totalTrials: result.totalTrials,
        congruent: result.congruentCount,
        incongruent: result.incongruentCount,
        transitions: result.transitions,
      });
    }
  }, [session.stroopSeed, isPractice]);

  // Countdown then start
  useEffect(() => {
    if (trials.length === 0) return;

    if (showCountdown && countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }

    if (showCountdown && countdown === 0) {
      setShowCountdown(false);
      setTaskStarted(true);
      setPhase(PHASE_FIXATION);
      phaseRef.current = PHASE_FIXATION;
      setCurrentTrialIndex(0);
      currentTrialRef.current = trials[0];
      
      eventLogger.log(isPractice ? 'STROOP_PRACTICE_START' : 'STROOP_TASK_START', {
        totalTrials: trials.length,
        monotonicOnset: performance.now(),
      });

      startFixation(0);
    }
  }, [trials, showCountdown, countdown]);

  const startFixation = useCallback((trialIdx) => {
    if (trialIdx >= trials.length) {
      setPhase(PHASE_COMPLETE);
      phaseRef.current = PHASE_COMPLETE;
      return;
    }

    setShowFeedback(null);
    setPhase(PHASE_FIXATION);
    phaseRef.current = PHASE_FIXATION;
    setCurrentTrialIndex(trialIdx);
    currentTrialRef.current = trials[trialIdx];
    responseRecordedRef.current = false;
    invalidKeysRef.current = [];
    trialStartTimeRef.current = performance.now();

    eventLogger.log('STROOP_FIXATION_ONSET', {
      trialNumber: trialIdx + 1,
      monotonicOnset: performance.now(),
    });

    phaseTimerRef.current = setTimeout(() => {
      startWord(trialIdx);
    }, TIMING.STROOP_FIXATION_MS);
  }, [trials]);

  const startWord = useCallback((trialIdx) => {
    setShowFeedback(null);
    setPhase(PHASE_WORD);
    phaseRef.current = PHASE_WORD;
    wordOnsetTimeRef.current = performance.now();

    const trial = trials[trialIdx];
    eventLogger.log('STROOP_WORD_ONSET', {
      trialNumber: trialIdx + 1,
      word: trial.word,
      ink: trial.ink,
      congruency: trial.congruency,
      monotonicOnset: performance.now(),
    });

    // Word display runs for EXACTLY 1500ms regardless of response
    phaseTimerRef.current = setTimeout(() => {
      startBlank(trialIdx);
    }, TIMING.STROOP_WORD_DISPLAY_MS);
  }, [trials]);

  const startBlank = useCallback((trialIdx) => {
    setPhase(PHASE_BLANK);
    phaseRef.current = PHASE_BLANK;

    const trial = trials[trialIdx];

    // Record trial result if response was given
    if (responseRecordedRef.current) {
      // Already saved in handleKeyDown
    } else {
      // Omission - no response given
      const result = {
        trialNumber: trialIdx + 1,
        word: trial.word,
        ink: trial.ink,
        congruency: trial.congruency,
        previousCongruency: trial.previousCongruency,
        actualOnset: wordOnsetTimeRef.current,
        responseKey: null,
        responseColor: null,
        reactionTime: null,
        correct: false,
        omission: true,
        invalidKeys: [...invalidKeysRef.current],
        isPractice,
      };
      setTrialResults(prev => {
        const next = [...prev, result];
        if (onTrialUpdate) onTrialUpdate(next);
        return next;
      });

      eventLogger.log('STROOP_TRIAL_RESULT', {
        ...result,
        monotonicTime: performance.now(),
      });
    }

    eventLogger.log('STROOP_BLANK_ONSET', {
      trialNumber: trialIdx + 1,
      monotonicOnset: performance.now(),
    });

    phaseTimerRef.current = setTimeout(() => {
      // In practice mode with feedback, show feedback between trials
      if (isPractice && showFeedback !== null) {
        setShowFeedback(null);
      }
      
      if (trialIdx + 1 >= trials.length) {
        setPhase(PHASE_COMPLETE);
        phaseRef.current = PHASE_COMPLETE;
        
        eventLogger.log(isPractice ? 'STROOP_PRACTICE_END' : 'STROOP_TASK_END', {
          totalTrials: trials.length,
          monotonicOffset: performance.now(),
        });

        // Signal completion after a brief pause
        setTimeout(() => {
          if (onComplete) {
            onComplete({
              trials: trialResults,
              generatorMeta,
              isPractice,
            });
          }
        }, 1000);
      } else {
        startFixation(trialIdx + 1);
      }
    }, TIMING.STROOP_BLANK_MS);
  }, [trials, isPractice, trialResults, generatorMeta, onComplete, showFeedback, onTrialUpdate, startFixation]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();

      // Prevent key-repeat
      if (e.repeat || keyPressedRef.current.has(key)) {
        e.preventDefault();
        return;
      }
      keyPressedRef.current.add(key);

      const currentPhase = phaseRef.current;

      // Only process during WORD phase
      if (currentPhase !== PHASE_WORD) {
        // Log invalid/anticipatory keys
        if (currentPhase === PHASE_FIXATION || currentPhase === PHASE_BLANK) {
          invalidKeysRef.current.push({
            key,
            phase: currentPhase,
            time: performance.now(),
          });
          eventLogger.log('STROOP_INVALID_KEY', {
            key,
            phase: currentPhase,
            trialNumber: (currentTrialRef.current?.trialNumber || 0),
            monotonicTime: performance.now(),
          });
        }
        return;
      }

      // Check if valid Stroop key
      const validKeys = Object.keys(STROOP_KEY_MAP);
      if (!validKeys.includes(key)) {
        invalidKeysRef.current.push({
          key,
          phase: PHASE_WORD,
          time: performance.now(),
        });
        eventLogger.log('STROOP_INVALID_KEY', {
          key,
          phase: PHASE_WORD,
          trialNumber: currentTrialRef.current?.trialNumber,
          monotonicTime: performance.now(),
        });
        return;
      }

      // Only first valid response counts
      if (responseRecordedRef.current) return;
      responseRecordedRef.current = true;

      const trial = currentTrialRef.current;
      const rt = performance.now() - wordOnsetTimeRef.current;
      const responseColor = STROOP_KEY_MAP[key];
      const correct = responseColor === trial.ink;

      const result = {
        trialNumber: trial.trialNumber,
        word: trial.word,
        ink: trial.ink,
        congruency: trial.congruency,
        previousCongruency: trial.previousCongruency,
        actualOnset: wordOnsetTimeRef.current,
        responseKey: key,
        responseColor,
        reactionTime: rt,
        correct,
        omission: false,
        invalidKeys: [...invalidKeysRef.current],
        isPractice,
      };

      setTrialResults(prev => {
        const next = [...prev, result];
        if (onTrialUpdate) onTrialUpdate(next);
        return next;
      });

      // In practice mode, show feedback
      if (isPractice) {
        setShowFeedback(correct);
      }

      eventLogger.log('STROOP_TRIAL_RESULT', {
        ...result,
        monotonicTime: performance.now(),
      });

      // NOTE: Response does NOT shorten the 1500ms word display
    };

    const handleKeyUp = (e) => {
      keyPressedRef.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPractice, onTrialUpdate]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
    };
  }, []);

  // ─── RENDER ────────────────────────────────────────────────────────

  if (phase === PHASE_COMPLETE) {
    const totalTrials = trialResults.length;
    const correctTrials = trialResults.filter(t => t.correct).length;
    const omissions = trialResults.filter(t => t.omission).length;
    const avgRT = trialResults.filter(t => t.reactionTime !== null).length > 0
      ? Math.round(trialResults.filter(t => t.reactionTime !== null)
          .reduce((sum, t) => sum + t.reactionTime, 0) / trialResults.filter(t => t.reactionTime !== null).length)
      : 0;

    return (
      <div className="stroop-complete">
        <div className="stroop-complete-card">
          <div className="stroop-complete-icon">✓</div>
          <h2>{isPractice ? 'Practice Complete' : 'Stroop Task Complete'}</h2>
          <div className="stroop-stats-grid">
            <div className="stat-item">
              <span className="stat-value">{totalTrials}</span>
              <span className="stat-label">Trials</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{correctTrials}</span>
              <span className="stat-label">Correct</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{omissions}</span>
              <span className="stat-label">Omissions</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{avgRT} ms</span>
              <span className="stat-label">Avg RT</span>
            </div>
          </div>
          {isPractice && (
            <p className="stroop-practice-note">
              The researcher will review your performance and proceed when ready.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (showCountdown) {
    return (
      <div className="stroop-screen">
        <div className="stroop-countdown">
          <div className="countdown-text">
            {isPractice ? 'Practice' : 'Stroop Task'} Starting
          </div>
          <div className="countdown-number">{countdown || 'GO'}</div>
          <div className="stroop-key-reminder">
            <span className="key-item"><kbd>D</kbd> = <span style={{ color: STROOP_COLOR_HEX.RED }}>RED</span></span>
            <span className="key-item"><kbd>F</kbd> = <span style={{ color: STROOP_COLOR_HEX.GREEN }}>GREEN</span></span>
            <span className="key-item"><kbd>J</kbd> = <span style={{ color: STROOP_COLOR_HEX.BLUE }}>BLUE</span></span>
            <span className="key-item"><kbd>K</kbd> = <span style={{ color: STROOP_COLOR_HEX.YELLOW }}>YELLOW</span></span>
          </div>
        </div>
      </div>
    );
  }

  const currentTrial = trials[currentTrialIndex];
  const totalTrials = trials.length;
  const progress = ((currentTrialIndex) / totalTrials) * 100;

  return (
    <div className="stroop-screen">
      {/* Progress bar - subtle, non-distracting */}
      <div className="stroop-progress">
        <div className="stroop-progress-bar" style={{ width: `${progress}%` }} />
      </div>

      {/* Main stimulus area */}
      <div className="stroop-stimulus-area">
        {phase === PHASE_FIXATION && (
          <div className="stroop-fixation">+</div>
        )}

        {phase === PHASE_WORD && currentTrial && (
          <div
            className="stroop-word"
            style={{ color: STROOP_COLOR_HEX[currentTrial.ink] }}
          >
            {currentTrial.word}
          </div>
        )}

        {phase === PHASE_BLANK && (
          <div className="stroop-blank" />
        )}

        {/* Practice feedback overlay */}
        {isPractice && showFeedback !== null && phase === PHASE_WORD && (
          <div className={`stroop-practice-feedback ${showFeedback ? 'correct' : 'incorrect'}`}>
            {showFeedback ? '✓' : '✗'}
          </div>
        )}
      </div>

      {/* Trial counter - minimal */}
      <div className="stroop-trial-counter">
        {currentTrialIndex + 1} / {totalTrials}
      </div>
    </div>
  );
}
