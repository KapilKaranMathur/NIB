/**
 * Stroop Trial Generator
 * 
 * Generates 120 scored trials using the Appendix A 4×4 count matrix:
 * - Diagonal (congruent): 15 each = 60 total
 * - Off-diagonal (incongruent): 5 each = 60 total
 * 
 * Constraints:
 * - Approximately balance CC, CI, IC, II transitions
 * - Avoid identical word+ink pair on consecutive trials
 * - Use a new recorded random seed per participant
 */

import { STROOP_MATRIX, STROOP_COLORS, STROOP_WORDS } from '../config/protocol.js';

/**
 * Seeded pseudo-random number generator (Mulberry32)
 * Deterministic and reproducible for research purposes.
 */
export function createSeededRNG(seed) {
  let state = seed;
  return function () {
    state |= 0;
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fisher-Yates shuffle with seeded RNG
 */
function shuffle(array, rng) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Build the pool of 120 trials from the 4×4 matrix
 */
function buildTrialPool() {
  const pool = [];
  for (const word of STROOP_WORDS) {
    for (const ink of STROOP_COLORS) {
      const count = STROOP_MATRIX[word][ink];
      for (let i = 0; i < count; i++) {
        pool.push({
          word,
          ink,
          congruent: word === ink,
        });
      }
    }
  }
  return pool;
}

/**
 * Classify transition type
 */
function getTransitionType(prev, curr) {
  if (!prev) return null;
  const prevC = prev.congruent ? 'C' : 'I';
  const currC = curr.congruent ? 'C' : 'I';
  return prevC + currC;
}

/**
 * Score a trial ordering based on transition balance and consecutive pair avoidance
 */
function scoreOrdering(trials) {
  const transitions = { CC: 0, CI: 0, IC: 0, II: 0 };
  let consecutivePairs = 0;
  
  for (let i = 1; i < trials.length; i++) {
    const tt = getTransitionType(trials[i - 1], trials[i]);
    if (tt) transitions[tt]++;
    
    // Penalize identical word+ink on consecutive trials
    if (trials[i].word === trials[i - 1].word && trials[i].ink === trials[i - 1].ink) {
      consecutivePairs++;
    }
  }
  
  // Calculate transition balance score (lower = better)
  const idealTransitions = 119 / 4; // ~29.75
  const transitionVariance = Object.values(transitions).reduce(
    (sum, count) => sum + Math.pow(count - idealTransitions, 2), 0
  );
  
  return {
    transitions,
    consecutivePairs,
    score: transitionVariance + consecutivePairs * 1000,
  };
}

/**
 * Generate an optimized Stroop trial sequence
 * 
 * @param {number} seed - Random seed for reproducibility
 * @param {number} maxAttempts - Number of shuffle attempts to find best ordering
 * @returns {{ trials: Array, seed: number, transitions: Object, matrixVerification: Object }}
 */
export function generateStroopTrials(seed, maxAttempts = 1000) {
  const rng = createSeededRNG(seed);
  const pool = buildTrialPool();
  
  let bestTrials = null;
  let bestScore = Infinity;
  let bestMeta = null;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const shuffled = shuffle(pool, rng);
    const result = scoreOrdering(shuffled);
    
    if (result.consecutivePairs === 0 && result.score < bestScore) {
      bestTrials = shuffled;
      bestScore = result.score;
      bestMeta = result;
    }
  }
  
  // Fallback: use last shuffle if no perfect ordering found
  if (!bestTrials) {
    bestTrials = shuffle(pool, rng);
    bestMeta = scoreOrdering(bestTrials);
  }
  
  // Add trial numbers and previous congruency
  const trials = bestTrials.map((trial, i) => ({
    trialNumber: i + 1,
    word: trial.word,
    ink: trial.ink,
    congruent: trial.congruent,
    congruency: trial.congruent ? 'congruent' : 'incongruent',
    previousCongruency: i === 0 ? null : (bestTrials[i - 1].congruent ? 'congruent' : 'incongruent'),
  }));
  
  // Verify matrix totals
  const matrixVerification = {};
  for (const word of STROOP_WORDS) {
    matrixVerification[word] = {};
    for (const ink of STROOP_COLORS) {
      matrixVerification[word][ink] = trials.filter(t => t.word === word && t.ink === ink).length;
    }
  }
  
  const congruentCount = trials.filter(t => t.congruent).length;
  const incongruentCount = trials.filter(t => !t.congruent).length;
  
  return {
    trials,
    seed,
    transitions: bestMeta.transitions,
    consecutivePairs: bestMeta.consecutivePairs,
    matrixVerification,
    congruentCount,
    incongruentCount,
    totalTrials: trials.length,
    // Flag the protocol ambiguity for researcher awareness
    protocolNote: 'Protocol prose mentions "15 incongruent pairs" but the 4×4 matrix yields 12 off-diagonal pairs × 5 = 60 incongruent trials. Using explicit matrix.',
  };
}

/**
 * Generate Stroop practice trials (16 trials, all four conditions represented)
 */
export function generatePracticeTrials(seed) {
  const rng = createSeededRNG(seed);
  const pool = [];
  
  // 4 congruent + 12 incongruent for practice (representative sample)
  for (const word of STROOP_WORDS) {
    pool.push({ word, ink: word, congruent: true }); // 4 congruent
  }
  for (const word of STROOP_WORDS) {
    for (const ink of STROOP_COLORS) {
      if (word !== ink) {
        pool.push({ word, ink, congruent: false });
      }
    }
  }
  
  const shuffled = shuffle(pool, rng).slice(0, 16);
  
  return shuffled.map((trial, i) => ({
    trialNumber: i + 1,
    word: trial.word,
    ink: trial.ink,
    congruent: trial.congruent,
    congruency: trial.congruent ? 'congruent' : 'incongruent',
    previousCongruency: i === 0 ? null : (shuffled[i - 1].congruent ? 'congruent' : 'incongruent'),
    isPractice: true,
  }));
}
