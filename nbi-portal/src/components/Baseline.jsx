/**
 * NBI Experiment Portal – Baseline Component
 * 
 * 300s neutral screen with central fixation marker.
 * Quiet viewing, normal blinking, no notifications.
 */

import { useState, useEffect, useRef } from 'react';
import { TIMING } from '../config/protocol.js';
import { eventLogger } from '../engine/eventLogger.js';

export default function Baseline({ session, onComplete, duration = TIMING.BASELINE_DURATION_MS }) {
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const startTimeRef = useRef(null);
  const animFrameRef = useRef(null);

  const skipBaseline = () => {
    if (completed) return;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setCompleted(true);
    const elapsed = startTimeRef.current ? performance.now() - startTimeRef.current : 0;
    eventLogger.log('BASELINE_SKIPPED', {
      monotonicOffset: performance.now(),
      actualDuration: elapsed,
    });
    setTimeout(() => onComplete?.(), 500);
  };

  useEffect(() => {
    if (!started || completed) return;

    const handleKeyDown = (e) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        skipBaseline();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [started, completed]);

  useEffect(() => {
    if (!started) return;
    
    startTimeRef.current = performance.now();
    eventLogger.log('BASELINE_START', {
      duration,
      monotonicOnset: startTimeRef.current,
    });

    const tick = () => {
      const elapsed = performance.now() - startTimeRef.current;
      const remaining = Math.max(0, duration - elapsed);
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        setCompleted(true);
        eventLogger.log('BASELINE_END', {
          monotonicOffset: performance.now(),
          actualDuration: elapsed,
        });
        setTimeout(() => onComplete?.(), 1000);
        return;
      }
      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [started, duration, onComplete]);

  if (!started) {
    return (
      <div className="baseline-screen">
        <div className="baseline-instructions">
          <h2>Baseline Recording</h2>
          <p>A fixation marker will appear on screen for {Math.round(duration / 1000 / 60)} minutes.</p>
          <p>Please look at the marker, blink normally, and stay relaxed.</p>
          <p className="baseline-note">The researcher will start this phase when ready.</p>
          <button className="btn-primary" onClick={() => setStarted(true)}>
            Start Baseline
          </button>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="baseline-screen">
        <div className="baseline-complete">
          <div className="baseline-complete-icon">✓</div>
          <h2>Baseline Complete</h2>
        </div>
      </div>
    );
  }

  const minutes = Math.floor(timeRemaining / 60000);
  const seconds = Math.floor((timeRemaining % 60000) / 1000);
  const progress = ((duration - timeRemaining) / duration) * 100;

  return (
    <div className="baseline-screen baseline-active">
      <div className="baseline-marker">+</div>
      {/* Researcher overlay timer & skip control */}
      <div className="baseline-timer-overlay">
        <div className="baseline-progress-ring">
          <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" className="progress-bg" />
            <circle
              cx="50" cy="50" r="45"
              className="progress-fill"
              style={{
                strokeDasharray: `${2 * Math.PI * 45}`,
                strokeDashoffset: `${2 * Math.PI * 45 * (1 - progress / 100)}`,
              }}
            />
          </svg>
          <span className="baseline-time-text">
            {minutes}:{seconds.toString().padStart(2, '0')}
          </span>
        </div>
        <button className="btn-secondary skip-btn" onClick={skipBaseline} style={{ marginTop: '12px' }}>
          Skip Baseline (Space)
        </button>
      </div>
    </div>
  );
}
