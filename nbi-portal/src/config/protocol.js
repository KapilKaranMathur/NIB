/**
 * NBI Experiment Portal – Protocol Configuration
 * Based on "Notification Burden Index – Eye Tracking Study Protocol", Pilot v1.1, 23 September 2026
 * 
 * All values here are PILOT DEFAULTS. The portal allows researcher-controlled,
 * versioned changes. Every completed session retains the exact configuration used.
 */

export const PROTOCOL_VERSION = 'pilot-v1.1-20260923';

// ─── Timing Defaults (ms) ────────────────────────────────────────────
export const TIMING = {
  // Stroop
  STROOP_FIXATION_MS: 500,
  STROOP_WORD_DISPLAY_MS: 1500,
  STROOP_BLANK_MS: 500,
  STROOP_TRIAL_TOTAL_MS: 2500, // 500 + 1500 + 500
  STROOP_SCORED_TRIALS: 120,
  STROOP_TOTAL_DURATION_MS: 300000, // 120 × 2500 = 300s
  STROOP_PRACTICE_TRIALS: 16,

  // Reading
  READING_DURATION_MS: 300000, // 300s = 5 min
  READING_PANELS: 6,

  // Comprehension
  COMPREHENSION_DURATION_MS: 60000, // 60s

  // Baseline
  BASELINE_DURATION_MS: 120000, // 120s = 2 min

  // Breaks
  BREAK_DURATION_MS: 120000, // 120s = 2 min
  BREAK_NEUTRAL_SCREEN_MS: 30000, // final 30s of break

  // Notifications
  NOTIFICATION_DURATION_MS: 3000, // 3s default
  NOTIFICATION_JITTER_RANGE: [-5000, 5000], // ±5s in ms
  NOTIFICATION_MIN_SPACING_MS: 20000, // 20s between onsets
  NOTIFICATION_MIN_READING_AFTER_MS: 10000, // 10s reading after onset
  NOTIFICATION_PANEL_STABILITY_MS: 5000, // 5s after panel change
  NOTIFICATION_MAX_DELAY_MS: 5000, // max extra delay

  // Analysis window
  ANALYSIS_WINDOW_PRE_MS: 5000,  // −5s before onset
  ANALYSIS_WINDOW_POST_MS: 10000, // +10s after onset
};

// ─── Stroop Configuration ────────────────────────────────────────────
export const STROOP_COLORS = ['RED', 'GREEN', 'BLUE', 'YELLOW'];
export const STROOP_WORDS = ['RED', 'GREEN', 'BLUE', 'YELLOW'];

export const STROOP_KEY_MAP = {
  'd': 'RED',
  'f': 'GREEN',
  'j': 'BLUE',
  'k': 'YELLOW',
};

export const STROOP_COLOR_HEX = {
  RED: '#FF0000',
  GREEN: '#00AA00',
  BLUE: '#0000FF',
  YELLOW: '#CCCC00',
};

/**
 * Appendix A: 4×4 count matrix
 * Rows = word, Cols = ink color
 * Diagonal (congruent) = 15 each → 60 congruent
 * Off-diagonal (incongruent) = 5 each → 60 incongruent
 * Total = 120 trials
 * 
 * Protocol ambiguity: One prose line states "15 incongruent pairs", but the explicit
 * 4×4 matrix has 12 off-diagonal pairs × 5 = 60 incongruent trials.
 * The portal uses the explicit matrix as the default generator and surfaces this discrepancy.
 */
export const STROOP_MATRIX = {
  // [word][ink] = count
  RED:    { RED: 15, GREEN: 5, BLUE: 5, YELLOW: 5 },
  GREEN:  { RED: 5, GREEN: 15, BLUE: 5, YELLOW: 5 },
  BLUE:   { RED: 5, GREEN: 5, BLUE: 15, YELLOW: 5 },
  YELLOW: { RED: 5, GREEN: 5, BLUE: 5, YELLOW: 15 },
};

// ─── Counterbalancing Cells ──────────────────────────────────────────
// A cells: Stroop first, then 3 reading blocks
// B cells: 3 reading blocks first, then Stroop
export const COUNTERBALANCE_CELLS = {
  A1: ['Stroop', 'N', 'L', 'H'],
  A2: ['Stroop', 'N', 'H', 'L'],
  A3: ['Stroop', 'L', 'N', 'H'],
  A4: ['Stroop', 'L', 'H', 'N'],
  A5: ['Stroop', 'H', 'N', 'L'],
  A6: ['Stroop', 'H', 'L', 'N'],
  B1: ['N', 'L', 'H', 'Stroop'],
  B2: ['N', 'H', 'L', 'Stroop'],
  B3: ['L', 'N', 'H', 'Stroop'],
  B4: ['L', 'H', 'N', 'Stroop'],
  B5: ['H', 'N', 'L', 'Stroop'],
  B6: ['H', 'L', 'N', 'Stroop'],
};

// ─── Passage Mapping ─────────────────────────────────────────────────
// Maps condition (N/L/H) to passage (A/B/C)
export const PASSAGE_MAPPINGS = {
  P1: { N: 'A', L: 'B', H: 'C' },
  P2: { N: 'B', L: 'C', H: 'A' },
  P3: { N: 'C', L: 'A', H: 'B' },
};

// ─── Notification Scheduling Candidates ──────────────────────────────
// Each block third (0-100s, 100-200s, 200-300s) has earlier and later candidates
export const NOTIFICATION_CANDIDATES = [
  { third: 0, earlier: 45000, later: 80000 },   // 0–100s
  { third: 1, earlier: 140000, later: 180000 },  // 100–200s
  { third: 2, earlier: 240000, later: 275000 },  // 200–300s
];

// ─── Layout (for 1920×1080 display) ──────────────────────────────────
export const LAYOUT = {
  TEXT_REGION: { x: 160, y: 150, width: 960, height: 780 },
  NOTIFICATION_REGION: { x: 1320, y: 180, width: 440, height: 160 },
  READING_FONT_SIZE: 24,
  READING_LINE_HEIGHT: 1.4,
};

// ─── Session Flow Phases ─────────────────────────────────────────────
export const SESSION_PHASES = [
  'SETUP',
  'STROOP_PRACTICE',
  'READING_PRACTICE',
  'BASELINE',
  'INITIAL_RATING',
  'ACTIVE_BLOCK_1',
  'POST_BLOCK_1',
  'BREAK_1',
  'ACTIVE_BLOCK_2',
  'POST_BLOCK_2',
  'BREAK_2',
  'ACTIVE_BLOCK_3',
  'POST_BLOCK_3',
  'BREAK_3',
  'ACTIVE_BLOCK_4',
  'POST_BLOCK_4',
  'DEBRIEF',
  'COMPLETE',
];

// ─── Rating Scale Defaults ───────────────────────────────────────────
export const RATING_SCALES = {
  mentalFatigue: {
    question: 'How mentally tired do you feel right now?',
    min: 0,
    max: 10,
    minLabel: 'Not at all',
    maxLabel: 'Extremely',
  },
  // These are researcher-configurable as per protocol
  distraction: {
    question: 'How distracted did you feel during the reading?',
    min: 0,
    max: 10,
    minLabel: 'Not at all',
    maxLabel: 'Extremely',
    configurable: true,
  },
  returnDifficulty: {
    question: 'How difficult was it to return to reading after distractions?',
    min: 0,
    max: 10,
    minLabel: 'Not at all difficult',
    maxLabel: 'Extremely difficult',
    configurable: true,
  },
};

// ─── Export File Names ───────────────────────────────────────────────
export const EXPORT_FILES = [
  'session_summary.csv',
  'stroop_trials.csv',
  'reading_panel_events.csv',
  'comprehension_responses.csv',
  'notification_events.csv',
  'ratings.csv',
  'breaks_and_calibration.csv',
  'event_log.csv',
  'full_session.json',
];
