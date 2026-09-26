/**
 * NBI Experiment Portal – Rating Scale Component
 * 
 * Mental fatigue: "How mentally tired do you feel right now?" 0-10
 * Reading-specific ratings (researcher-configurable):
 * - Experienced distraction
 * - Difficulty returning to reading
 */

import { useState } from 'react';
import { RATING_SCALES } from '../config/protocol.js';
import { eventLogger } from '../engine/eventLogger.js';

export default function RatingScale({ 
  ratingType = 'mentalFatigue', 
  context = '', 
  onComplete,
  customScales = null,
}) {
  const scale = customScales?.[ratingType] || RATING_SCALES[ratingType] || RATING_SCALES.mentalFatigue;
  const [value, setValue] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (value === null) return;
    setSubmitted(true);
    
    const result = {
      ratingType,
      context,
      question: scale.question,
      value,
      min: scale.min,
      max: scale.max,
      minLabel: scale.minLabel,
      maxLabel: scale.maxLabel,
      timestamp: new Date().toISOString(),
    };

    eventLogger.log('RATING_SUBMITTED', result);
    
    setTimeout(() => {
      onComplete?.(result);
    }, 300);
  };

  if (submitted) {
    return (
      <div className="rating-screen">
        <div className="rating-submitted">
          <div className="rating-check">✓</div>
          <p>Response recorded</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rating-screen">
      <div className="rating-card">
        <h2 className="rating-question">{scale.question}</h2>
        
        <div className="rating-scale">
          <div className="rating-labels">
            <span className="rating-label-min">{scale.minLabel}</span>
            <span className="rating-label-max">{scale.maxLabel}</span>
          </div>
          
          <div className="rating-buttons">
            {Array.from({ length: scale.max - scale.min + 1 }, (_, i) => {
              const val = scale.min + i;
              return (
                <button
                  key={val}
                  className={`rating-btn ${value === val ? 'selected' : ''}`}
                  onClick={() => setValue(val)}
                >
                  {val}
                </button>
              );
            })}
          </div>
        </div>

        <button
          className="btn-primary rating-submit"
          onClick={handleSubmit}
          disabled={value === null}
        >
          Confirm
        </button>
      </div>
    </div>
  );
}

/**
 * Multi-rating component for reading-specific ratings
 * Collects distraction + return difficulty after each reading block
 */
export function ReadingRatings({ context, onComplete, customScales }) {
  const [step, setStep] = useState(0);
  const [results, setResults] = useState([]);
  
  const ratingTypes = ['distraction', 'returnDifficulty'];
  
  const handleRatingComplete = (result) => {
    const newResults = [...results, result];
    setResults(newResults);
    
    if (step + 1 < ratingTypes.length) {
      setStep(step + 1);
    } else {
      onComplete?.(newResults);
    }
  };
  
  return (
    <RatingScale
      key={`${ratingTypes[step]}-${step}`}
      ratingType={ratingTypes[step]}
      context={context}
      onComplete={handleRatingComplete}
      customScales={customScales}
    />
  );
}
