/**
 * NBI Experiment Portal – Session Store
 * 
 * Central state management for experiment sessions.
 * Handles session creation, data storage, autosave, and export.
 * Uses localStorage for persistence with researcher-confirmed recovery.
 */

import { v4 as uuidv4 } from 'uuid';
import { PROTOCOL_VERSION, COUNTERBALANCE_CELLS, PASSAGE_MAPPINGS, TIMING } from '../config/protocol.js';
import { PASSAGES } from '../config/passages.js';
import { eventLogger } from './eventLogger.js';
import { createSeededRNG } from './stroopGenerator.js';

const STORAGE_KEY = 'nbi_session_data';
const AUTOSAVE_INTERVAL = 10000; // 10 seconds

/**
 * Create a new session object with all required fields
 */
export function createSession({
  participantCode,
  taskOrderCell,
  passageMapping,
  notificationVariant,
  lTimingChoice,
  trackerModel = '',
  samplingFrequency = '',
  sleepHours = '',
  testingTime = '',
  unusualFatigue = '',
  isTestMode = false,
}) {
  const sessionId = uuidv4();
  const stroopSeed = Math.floor(Math.random() * 2147483647);
  const notificationSeed = Math.floor(Math.random() * 2147483647);

  // Generate jitter vector: 6 values from -5000 to +5000 ms
  const rng = createSeededRNG(notificationSeed);
  const jitterVector = Array.from({ length: 6 }, () =>
    Math.round((rng() * (TIMING.NOTIFICATION_JITTER_RANGE[1] - TIMING.NOTIFICATION_JITTER_RANGE[0]) + TIMING.NOTIFICATION_JITTER_RANGE[0]))
  );

  const blockOrder = COUNTERBALANCE_CELLS[taskOrderCell];
  const passages = PASSAGE_MAPPINGS[passageMapping];

  return {
    // Session identification
    sessionId,
    participantCode,
    createdAt: new Date().toISOString(),
    protocolVersion: PROTOCOL_VERSION,
    isTestMode,

    // Allocation
    taskOrderCell,
    passageMapping,
    notificationVariant,
    lTimingChoice, // 'earlier' or 'later'
    blockOrder: [...blockOrder],
    passages: { ...passages },

    // Seeds
    stroopSeed,
    notificationSeed,
    jitterVector,

    // Researcher/tracker metadata
    trackerModel,
    samplingFrequency,
    sleepHours,
    testingTime,
    unusualFatigue,
    calibrationResult: '',
    validationResult: '',

    // Session state
    currentPhase: 'SETUP',
    currentBlockIndex: -1,
    status: 'in_progress',

    // Timing configuration snapshot
    timingConfig: { ...TIMING },

    // Data stores
    stroopTrials: [],
    readingEvents: [],
    comprehensionResponses: [],
    notificationEvents: [],
    ratings: [],
    breaks: [],
    deviations: [],
    extraBreaks: [],
    recalibrations: [],

    // Completion tracking
    completedPhases: [],
    phaseTimestamps: {},
  };
}

/**
 * Auto-balance: pick the next counterbalance cell to maintain even distribution
 */
export function autoSelectCell(existingSessions = [], isTestMode = false) {
  const cellCounts = {};
  Object.keys(COUNTERBALANCE_CELLS).forEach(cell => { cellCounts[cell] = 0; });
  
  const relevantSessions = existingSessions.filter(s => !!s.isTestMode === !!isTestMode && s.status !== 'aborted');
  relevantSessions.forEach(s => {
    if (cellCounts[s.taskOrderCell] !== undefined) {
      cellCounts[s.taskOrderCell]++;
    }
  });

  const minCount = Math.min(...Object.values(cellCounts));
  return Object.keys(cellCounts).find(cell => cellCounts[cell] === minCount) || 'A1';
}

/**
 * Auto-balance passage mapping (P1, P2, P3)
 */
export function autoSelectPassageMapping(existingSessions = [], isTestMode = false) {
  const mappingCounts = {};
  Object.keys(PASSAGE_MAPPINGS).forEach(m => { mappingCounts[m] = 0; });
  
  const relevantSessions = existingSessions.filter(s => !!s.isTestMode === !!isTestMode && s.status !== 'aborted');
  relevantSessions.forEach(s => {
    if (mappingCounts[s.passageMapping] !== undefined) {
      mappingCounts[s.passageMapping]++;
    }
  });

  const minCount = Math.min(...Object.values(mappingCounts));
  return Object.keys(mappingCounts).find(m => mappingCounts[m] === minCount) || 'P1';
}

/**
 * Auto-balance L timing choice ('earlier' or 'later')
 */
export function autoSelectLTiming(existingSessions = [], isTestMode = false) {
  const choices = { earlier: 0, later: 0 };
  const relevantSessions = existingSessions.filter(s => !!s.isTestMode === !!isTestMode && s.status !== 'aborted');
  relevantSessions.forEach(s => {
    if (choices[s.lTimingChoice] !== undefined) {
      choices[s.lTimingChoice]++;
    }
  });
  return choices.earlier <= choices.later ? 'earlier' : 'later';
}

/**
 * Auto-balance notification variant ('Q1', 'Q2', 'Q3')
 */
export function autoSelectNotificationVariant(existingSessions = [], isTestMode = false) {
  const variants = { Q1: 0, Q2: 0, Q3: 0 };
  const relevantSessions = existingSessions.filter(s => !!s.isTestMode === !!isTestMode && s.status !== 'aborted');
  relevantSessions.forEach(s => {
    if (variants[s.notificationVariant] !== undefined) {
      variants[s.notificationVariant]++;
    }
  });
  const minCount = Math.min(...Object.values(variants));
  return Object.keys(variants).find(v => variants[v] === minCount) || 'Q1';
}

/**
 * Save session to localStorage
 */
export function saveSession(session) {
  try {
    const allSessions = loadAllSessions();
    const idx = allSessions.findIndex(s => s.sessionId === session.sessionId);
    if (idx >= 0) {
      allSessions[idx] = session;
    } else {
      allSessions.push(session);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allSessions));
    return true;
  } catch (e) {
    console.error('Failed to save session:', e);
    return false;
  }
}

/**
 * Load all sessions from localStorage
 */
export function loadAllSessions() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load sessions:', e);
    return [];
  }
}

/**
 * Load a specific session by ID
 */
export function loadSession(sessionId) {
  return loadAllSessions().find(s => s.sessionId === sessionId) || null;
}

/**
 * Delete a session
 */
export function deleteSession(sessionId) {
  const sessions = loadAllSessions().filter(s => s.sessionId !== sessionId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

/**
 * Start autosave interval
 */
export function startAutosave(getSessionFn) {
  return setInterval(() => {
    const session = getSessionFn();
    if (session && session.status === 'in_progress') {
      saveSession(session);
      eventLogger.log('AUTOSAVE', { sessionId: session.sessionId });
    }
  }, AUTOSAVE_INTERVAL);
}

/**
 * Export session as full raw JSON (includes Tobii timestamps & event logs)
 */
export function exportSessionJSON(session) {
  const data = {
    ...session,
    eventLog: eventLogger.toJSON(),
    exportedAt: new Date().toISOString(),
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nbi_full_session_${session.participantCode}_${session.sessionId.slice(0, 8)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Export clean, human-readable results JSON (Participant info, responses, scores & ratings)
 */
export function exportCleanResultsJSON(session) {
  const stroopTrials = session.stroopTrials || [];
  const validStroop = stroopTrials.filter(t => t.response);
  const correctStroop = validStroop.filter(t => t.correct);
  const congruent = validStroop.filter(t => t.isCongruent);
  const incongruent = validStroop.filter(t => !t.isCongruent);
  
  const mean = (arr) => arr.length ? Math.round(arr.reduce((a, b) => a + (b.reactionTime || 0), 0) / arr.length) : 0;

  const data = {
    participantCredentials: {
      participantCode: session.participantCode,
      createdAt: session.createdAt,
      taskOrderCell: session.taskOrderCell,
      passageMapping: session.passageMapping,
      notificationVariant: session.notificationVariant,
      trackerModel: session.trackerModel || 'Not specified',
      samplingFrequency: session.samplingFrequency || 'Not specified',
      sleepHours: session.sleepHours || 'Not specified',
      testingTime: session.testingTime || 'Not specified',
      unusualFatigue: session.unusualFatigue || 'Not specified',
      calibrationResult: session.calibrationResult || 'N/A',
      validationResult: session.validationResult || 'N/A',
    },
    responsesAndScores: {
      stroopSummary: {
        totalTrials: stroopTrials.length,
        respondedTrials: validStroop.length,
        correctTrials: correctStroop.length,
        overallAccuracy: validStroop.length ? Math.round((correctStroop.length / validStroop.length) * 100) + '%' : '0%',
        meanReactionTimeMs: mean(validStroop),
        congruentMeanRtMs: mean(congruent),
        incongruentMeanRtMs: mean(incongruent),
      },
      readingBlocks: (session.readingEvents || []).map(r => ({
        condition: r.condition,
        passageId: r.passageId,
        maxPanelReached: r.maxPanelReached,
        cumulativeWords: r.cumulativeWords,
        passageCompleted: r.passageCompleted,
      })),
      comprehensionSummary: {
        totalQuestions: (session.comprehensionResponses || []).length,
        correctAnswers: (session.comprehensionResponses || []).filter(c => c.correct).length,
        omissions: (session.comprehensionResponses || []).filter(c => c.omission || !c.response).length,
        scorePercentage: (session.comprehensionResponses || []).length > 0 
          ? Math.round(((session.comprehensionResponses || []).filter(c => c.correct).length / (session.comprehensionResponses || []).length) * 100) + '%'
          : '0%',
      },
      comprehensionQuestionsAndAnswers: (session.comprehensionResponses || []).map(c => {
        const passage = PASSAGES[c.passageId];
        const qObj = passage?.questions?.find(q => q.id === c.questionId);
        const userChoice = c.response || c.selectedAnswer || c.selectedOption || null;
        const isCorrect = c.correct !== undefined ? c.correct : (userChoice === qObj?.correctAnswer);

        return {
          passageId: c.passageId,
          condition: c.condition,
          questionId: c.questionId,
          questionText: c.question || qObj?.question || '',
          userAnswerKey: userChoice || 'Omitted (No response)',
          userAnswerText: userChoice && qObj?.options ? qObj.options[userChoice] : 'None',
          correctAnswerKey: qObj?.correctAnswer || 'N/A',
          correctAnswerText: qObj?.correctAnswer && qObj?.options ? qObj.options[qObj.correctAnswer] : 'N/A',
          isCorrect: !!isCorrect,
          reactionTimeMs: c.rt ? Math.round(c.rt) : null,
        };
      }),
      workloadAndFatigueRatings: (session.ratings || []).map(r => ({
        ratingType: r.ratingType,
        context: r.context,
        question: r.question,
        scoreValue: r.value,
        timestamp: r.timestamp,
      })),
      researcherDebriefNotes: session.deviations || [],
    },
    exportedAt: new Date().toISOString(),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nbi_results_${session.participantCode}_${session.sessionId.slice(0, 8)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Export specific data as CSV
 */
export function exportCSV(filename, rows) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map(row => headers.map(h => {
      const val = row[h];
      if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val ?? '';
    }).join(','))
  ].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
