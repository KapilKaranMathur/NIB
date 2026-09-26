/**
 * NBI Experiment Portal – Break Component
 * 
 * 120s break between active blocks:
 * - First 90s: normal break screen
 * - Final 30s: neutral screen for readaptation
 * - Researcher drift check before next block
 */

import { useState, useEffect, useRef } from 'react';
import { TIMING } from '../config/protocol.js';
import { eventLogger } from '../engine/eventLogger.js';

export default function BreakScreen({ breakNumber, onComplete, session }) {
  const [timeRemaining, setTimeRemaining] = useState(TIMING.BREAK_DURATION_MS);
  const [phase, setPhase] = useState('break'); // 'break' | 'neutral' | 'drift_check'
  const [driftCheckDone, setDriftCheckDone] = useState(false);
  const [driftCheckNote, setDriftCheckNote] = useState('');
  const [needsRecalibration, setNeedsRecalibration] = useState(false);
  const [recalibrationNote, setRecalibrationNote] = useState('');
  const startTimeRef = useRef(null);
  const animFrameRef = useRef(null);

  const skipBreak = () => {
    if (phase === 'drift_check') return;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    eventLogger.log('BREAK_SKIPPED', {
      breakNumber,
      skippedPhase: phase,
      monotonicOffset: performance.now(),
    });
    setPhase('drift_check');
  };

  useEffect(() => {
    if (phase === 'drift_check') return;

    const handleKeyDown = (e) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        skipBreak();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase]);

  useEffect(() => {
    startTimeRef.current = performance.now();
    eventLogger.log('BREAK_START', {
      breakNumber,
      monotonicOnset: startTimeRef.current,
    });

    const tick = () => {
      const elapsed = performance.now() - startTimeRef.current;
      const remaining = Math.max(0, TIMING.BREAK_DURATION_MS - elapsed);
      setTimeRemaining(remaining);

      // Switch to neutral screen in final 30s
      const neutralThreshold = TIMING.BREAK_DURATION_MS - TIMING.BREAK_NEUTRAL_SCREEN_MS;
      if (elapsed >= neutralThreshold && phase === 'break') {
        setPhase('neutral');
        eventLogger.log('BREAK_NEUTRAL_SCREEN', {
          breakNumber,
          monotonicOnset: performance.now(),
        });
      }

      if (remaining <= 0) {
        eventLogger.log('BREAK_TIMER_END', {
          breakNumber,
          monotonicOffset: performance.now(),
        });
        setPhase('drift_check');
        return;
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [breakNumber]);

  const handleDriftCheckComplete = () => {
    eventLogger.log('DRIFT_CHECK_COMPLETE', {
      breakNumber,
      note: driftCheckNote,
      needsRecalibration,
      recalibrationNote,
      monotonicTime: performance.now(),
    });
    setDriftCheckDone(true);
    
    if (needsRecalibration) {
      eventLogger.log('RECALIBRATION', {
        breakNumber,
        note: recalibrationNote,
        monotonicTime: performance.now(),
      });
    }
    
    setTimeout(() => onComplete?.({
      breakNumber,
      driftCheckNote,
      needsRecalibration,
      recalibrationNote,
    }), 500);
  };

  if (phase === 'drift_check') {
    return (
      <div className="break-screen">
        <div className="drift-check-card">
          <h2>Break {breakNumber} Complete — Drift Check</h2>
          <p className="drift-check-instruction">
            Researcher: Perform drift check before proceeding to the next block.
          </p>
          
          <div className="drift-check-form">
            <label>
              Drift check notes:
              <textarea
                value={driftCheckNote}
                onChange={(e) => setDriftCheckNote(e.target.value)}
                placeholder="Any observations about drift check..."
                rows={2}
              />
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={needsRecalibration}
                onChange={(e) => setNeedsRecalibration(e.target.checked)}
              />
              Recalibration needed
            </label>

            {needsRecalibration && (
              <label>
                Recalibration notes:
                <textarea
                  value={recalibrationNote}
                  onChange={(e) => setRecalibrationNote(e.target.value)}
                  placeholder="Recalibration details..."
                  rows={2}
                />
              </label>
            )}

            <button className="btn-primary" onClick={handleDriftCheckComplete}>
              {needsRecalibration ? 'Recalibration Complete — Continue' : 'Drift Check OK — Continue'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const minutes = Math.floor(timeRemaining / 60000);
  const seconds = Math.floor((timeRemaining % 60000) / 1000);
  const progress = ((TIMING.BREAK_DURATION_MS - timeRemaining) / TIMING.BREAK_DURATION_MS) * 100;

  if (phase === 'neutral') {
    return (
      <div className="break-screen neutral-screen">
        <div className="baseline-marker">+</div>
        <div className="break-neutral-label">
          Readaptation — {seconds}s remaining
        </div>
        <button className="btn-secondary skip-break-btn" onClick={skipBreak} style={{ marginTop: '20px' }}>
          Skip Break (Space)
        </button>
      </div>
    );
  }

  return (
    <div className="break-screen">
      <div className="break-content">
        <h2>Break {breakNumber}</h2>
        <p>Rest your eyes and adjust your posture if needed.</p>
        <p className="break-warning">Please do not use your phone during the break.</p>
        
        <div className="break-timer">
          <div className="break-progress-ring">
            <svg viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" className="progress-bg" />
              <circle
                cx="60" cy="60" r="52"
                className="progress-fill"
                style={{
                  strokeDasharray: `${2 * Math.PI * 52}`,
                  strokeDashoffset: `${2 * Math.PI * 52 * (1 - progress / 100)}`,
                }}
              />
            </svg>
            <span className="break-time-text">
              {minutes}:{seconds.toString().padStart(2, '0')}
            </span>
          </div>
        </div>

        <button className="btn-secondary skip-break-btn" onClick={skipBreak} style={{ marginTop: '24px' }}>
          Skip Break (Press Space)
        </button>
      </div>
    </div>
  );
}
