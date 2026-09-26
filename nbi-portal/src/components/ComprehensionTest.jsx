/**
 * NBI Experiment Portal – Comprehension Test Component
 * 
 * Protocol Section 7: After each reading block, hide passage and show
 * all 3 multiple-choice questions together for 60s.
 * 
 * - Accept one A/B/C/D response per question
 * - Unanswered items are omissions
 * - No feedback until study ends
 * - Score 1 point per correct answer
 * - Answer keys remain researcher-only
 */

import { useState, useEffect, useRef } from 'react';
import { TIMING } from '../config/protocol.js';
import { PASSAGES } from '../config/passages.js';
import { eventLogger } from '../engine/eventLogger.js';

export default function ComprehensionTest({
  passageId,
  condition,
  lastPanel,
  onComplete,
}) {
  const passage = PASSAGES[passageId];
  if (!passage) {
    return <div>Passage not found</div>;
  }

  const questions = passage.questions;
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(TIMING.COMPREHENSION_DURATION_MS);
  const [done, setDone] = useState(false);
  const startTimeRef = useRef(null);
  const animFrameRef = useRef(null);
  const answersRef = useRef({});

  // Keep ref in sync
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  // Start timer on mount
  useEffect(() => {
    startTimeRef.current = performance.now();

    eventLogger.log('COMPREHENSION_START', {
      passageId,
      condition,
      totalQuestions: questions.length,
      monotonicOnset: startTimeRef.current,
    });

    const tick = () => {
      const elapsed = performance.now() - startTimeRef.current;
      const remaining = Math.max(0, TIMING.COMPREHENSION_DURATION_MS - elapsed);
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        finalize();
        return;
      }
      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const handleAnswer = (questionId, answer) => {
    if (done) return;
    const now = performance.now();
    const elapsed = now - startTimeRef.current;

    setAnswers(prev => {
      // Only accept first response per question
      if (prev[questionId]) return prev;
      const next = { ...prev, [questionId]: { answer, timestamp: now, elapsed, rt: elapsed } };
      answersRef.current = next;
      return next;
    });

    eventLogger.log('COMPREHENSION_ANSWER', {
      questionId,
      answer,
      elapsed,
      monotonicTime: now,
    });
  };

  const finalize = () => {
    if (done) return;
    setDone(true);

    const currentAnswers = answersRef.current;
    const results = questions.map(q => {
      const response = currentAnswers[q.id];
      return {
        passageId,
        condition,
        questionId: q.id,
        question: q.question,
        response: response?.answer || null,
        timestamp: response?.timestamp || null,
        rt: response?.rt || null,
        correct: response ? response.answer === q.correctAnswer : false,
        omission: !response,
        lastPanel,
      };
    });

    const totalCorrect = results.filter(r => r.correct).length;
    const totalOmissions = results.filter(r => r.omission).length;

    eventLogger.log('COMPREHENSION_END', {
      passageId,
      condition,
      totalCorrect,
      totalOmissions,
      monotonicOffset: performance.now(),
    });

    setTimeout(() => {
      onComplete?.(results);
    }, 1000);
  };

  const handleSubmitEarly = () => {
    finalize();
  };

  const seconds = Math.floor(timeRemaining / 1000);
  const progress = ((TIMING.COMPREHENSION_DURATION_MS - timeRemaining) / TIMING.COMPREHENSION_DURATION_MS) * 100;

  if (done) {
    const answered = Object.keys(answers).length;
    return (
      <div className="comprehension-screen">
        <div className="comprehension-done">
          <div className="comprehension-done-icon">✓</div>
          <h2>Responses Recorded</h2>
          <p>{answered} of {questions.length} questions answered</p>
        </div>
      </div>
    );
  }

  return (
    <div className="comprehension-screen">
      {/* Timer */}
      <div className="comprehension-timer-bar">
        <div className="comprehension-timer-fill" style={{ width: `${100 - progress}%` }} />
        <span className="comprehension-timer-text">{seconds}s remaining</span>
      </div>

      <div className="comprehension-content">
        <h2 className="comprehension-title">Comprehension Questions</h2>
        <p className="comprehension-subtitle">
          Answer the following questions about the passage you just read.
        </p>

        <div className="comprehension-questions">
          {questions.map((q, qIndex) => (
            <div key={q.id} className="comprehension-question-card">
              <div className="question-number">Question {qIndex + 1}</div>
              <p className="question-text">{q.question}</p>
              <div className="question-options">
                {Object.entries(q.options).map(([key, text]) => (
                  <button
                    key={key}
                    className={`option-btn ${answers[q.id]?.answer === key ? 'selected' : ''} ${answers[q.id] && answers[q.id].answer !== key ? 'disabled' : ''}`}
                    onClick={() => handleAnswer(q.id, key)}
                    disabled={!!answers[q.id]}
                  >
                    <span className="option-key">{key}</span>
                    <span className="option-text">{text}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Submit early button - only when all answered */}
        {Object.keys(answers).length === questions.length && (
          <button className="btn-primary comprehension-submit" onClick={handleSubmitEarly}>
            Submit Answers
          </button>
        )}
      </div>
    </div>
  );
}
