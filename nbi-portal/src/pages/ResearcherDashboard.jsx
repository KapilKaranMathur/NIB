/**
 * NBI Experiment Portal – Researcher Dashboard
 * 
 * Create sessions, manage participants, view data, and export.
 */

import { useState, useEffect } from 'react';
import { COUNTERBALANCE_CELLS, PASSAGE_MAPPINGS, PROTOCOL_VERSION } from '../config/protocol.js';
import {
  createSession,
  loadAllSessions,
  saveSession,
  deleteSession,
  autoSelectCell,
  autoSelectPassageMapping,
  autoSelectLTiming,
  autoSelectNotificationVariant,
  exportSessionJSON,
  exportCleanResultsJSON,
  exportCSV,
} from '../engine/sessionStore.js';
import { useNavigate } from 'react-router-dom';

export default function ResearcherDashboard() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [showNewSession, setShowNewSession] = useState(false);
  const [activeTab, setActiveTab] = useState('sessions');

  // Form state
  const [participantCode, setParticipantCode] = useState('');
  const [taskOrderCell, setTaskOrderCell] = useState('');
  const [passageMapping, setPassageMapping] = useState('');
  const [notificationVariant, setNotificationVariant] = useState('Q1');
  const [lTimingChoice, setLTimingChoice] = useState('');
  const [sleepHours, setSleepHours] = useState('');
  const [testingTime, setTestingTime] = useState('');
  const [unusualFatigue, setUnusualFatigue] = useState('');
  const [isTestMode, setIsTestMode] = useState(false);
  const [autoBalance, setAutoBalance] = useState(true);

  useEffect(() => {
    const allSessions = loadAllSessions();
    setSessions(allSessions);
  }, []);

  useEffect(() => {
    if (autoBalance && sessions.length >= 0) {
      setTaskOrderCell(autoSelectCell(sessions, isTestMode));
      setPassageMapping(autoSelectPassageMapping(sessions, isTestMode));
      setLTimingChoice(autoSelectLTiming(sessions, isTestMode));
      setNotificationVariant(autoSelectNotificationVariant(sessions, isTestMode));
    }
  }, [autoBalance, sessions, isTestMode, showNewSession]);

  const handleCreateSession = () => {
    if (!participantCode.trim()) {
      alert('Participant code is required');
      return;
    }

    const newSession = createSession({
      participantCode: participantCode.trim(),
      taskOrderCell,
      passageMapping,
      notificationVariant,
      lTimingChoice,
      sleepHours,
      testingTime,
      unusualFatigue,
      isTestMode,
    });

    saveSession(newSession);
    setSessions(prev => [...prev, newSession]);
    setShowNewSession(false);
    resetForm();
  };

  const resetForm = () => {
    setParticipantCode('');
    setSleepHours('');
    setTestingTime('');
    setUnusualFatigue('');
    setIsTestMode(false);
  };

  const handleDeleteSession = (sessionId) => {
    if (!confirm('Are you sure you want to delete this session? This cannot be undone.')) return;
    deleteSession(sessionId);
    setSessions(prev => prev.filter(s => s.sessionId !== sessionId));
  };

  const handleExportSession = (session) => {
    exportSessionJSON(session);
  };

  const handleExportStroopCSV = (session) => {
    if (!session.stroopTrials?.length) {
      alert('No Stroop data available for this session');
      return;
    }
    const rows = session.stroopTrials.map(t => ({
      participant_code: session.participantCode,
      session_id: session.sessionId,
      trial_number: t.trialNumber,
      word: t.word,
      ink: t.ink,
      congruency: t.congruency,
      previous_congruency: t.previousCongruency ?? '',
      actual_onset: t.actualOnset?.toFixed(3) ?? '',
      response_key: t.responseKey ?? '',
      response_color: t.responseColor ?? '',
      reaction_time: t.reactionTime?.toFixed(3) ?? '',
      correct: t.correct,
      omission: t.omission,
      invalid_keys: JSON.stringify(t.invalidKeys || []),
    }));
    exportCSV(`stroop_trials_${session.participantCode}.csv`, rows);
  };

  const handleExportComprehensionCSV = (session) => {
    if (!session.comprehensionResponses?.length) {
      alert('No comprehension response data available for this session');
      return;
    }
    const rows = session.comprehensionResponses.map(c => ({
      participant_code: session.participantCode,
      session_id: session.sessionId,
      condition: c.condition,
      passage_id: c.passageId,
      question_id: c.questionId,
      question_text: c.question ?? '',
      user_answer: c.response ?? c.selectedAnswer ?? '',
      is_correct: c.correct ? 'TRUE' : 'FALSE',
      reaction_time_ms: c.rt?.toFixed(1) ?? '',
      omission: c.omission ? 'TRUE' : 'FALSE',
    }));
    exportCSV(`comprehension_responses_${session.participantCode}.csv`, rows);
  };

  const getStatusBadge = (status) => {
    const styles = {
      in_progress: 'badge-progress',
      complete: 'badge-complete',
      aborted: 'badge-aborted',
    };
    return <span className={`badge ${styles[status] || ''}`}>{status}</span>;
  };

  const realSessions = sessions.filter(s => !s.isTestMode);
  const testSessions = sessions.filter(s => s.isTestMode);

  return (
    <div className="researcher-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <h1 className="logo">NBI <span className="logo-accent">Research</span></h1>
          <span className="protocol-badge">Protocol {PROTOCOL_VERSION}</span>
        </div>
        <div className="header-right">
          <button
            className="btn-primary"
            onClick={() => setShowNewSession(true)}
          >
            + New Session
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="dashboard-tabs">
        <button
          className={`tab ${activeTab === 'sessions' ? 'active' : ''}`}
          onClick={() => setActiveTab('sessions')}
        >
          Sessions ({realSessions.length})
        </button>
        <button
          className={`tab ${activeTab === 'test' ? 'active' : ''}`}
          onClick={() => setActiveTab('test')}
        >
          Test Mode ({testSessions.length})
        </button>
        <button
          className={`tab ${activeTab === 'balance' ? 'active' : ''}`}
          onClick={() => setActiveTab('balance')}
        >
          Balance Overview
        </button>
      </nav>

      {/* Content */}
      <main className="dashboard-content">
        {/* New Session Modal */}
        {showNewSession && (
          <div className="modal-overlay" onClick={() => setShowNewSession(false)}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Create New Session</h2>
                <button className="modal-close" onClick={() => setShowNewSession(false)}>×</button>
              </div>

              <div className="modal-body">
                {/* Test Mode Toggle */}
                <label className="checkbox-label test-mode-toggle">
                  <input
                    type="checkbox"
                    checked={isTestMode}
                    onChange={e => setIsTestMode(e.target.checked)}
                  />
                  <span className={`test-mode-label ${isTestMode ? 'active' : ''}`}>
                    🧪 Test/Simulation Mode
                  </span>
                  {isTestMode && (
                    <span className="test-mode-warning">
                      Test data will never be mixed with real sessions
                    </span>
                  )}
                </label>

                {/* Participant Info */}
                <fieldset className="form-section">
                  <legend>Participant Information</legend>
                  <div className="form-grid">
                    <div className="form-field">
                      <label>Participant Code *</label>
                      <input
                        type="text"
                        value={participantCode}
                        onChange={e => setParticipantCode(e.target.value)}
                        placeholder="e.g., P001"
                        autoFocus
                      />
                    </div>
                    <div className="form-field">
                      <label>Sleep Hours (previous night)</label>
                      <input
                        type="text"
                        value={sleepHours}
                        onChange={e => setSleepHours(e.target.value)}
                        placeholder="e.g., 7.5"
                      />
                    </div>
                    <div className="form-field">
                      <label>Testing Time</label>
                      <input
                        type="time"
                        value={testingTime}
                        onChange={e => setTestingTime(e.target.value)}
                      />
                    </div>
                    <div className="form-field full-width">
                      <label>Unusual Fatigue Notes</label>
                      <textarea
                        value={unusualFatigue}
                        onChange={e => setUnusualFatigue(e.target.value)}
                        placeholder="Any notable fatigue, illness, medication..."
                        rows={2}
                      />
                    </div>
                  </div>
                </fieldset>

                {/* Counterbalancing */}
                <fieldset className="form-section">
                  <legend>
                    Counterbalancing
                    <label className="auto-balance-toggle">
                      <input
                        type="checkbox"
                        checked={autoBalance}
                        onChange={e => setAutoBalance(e.target.checked)}
                      />
                      Auto-balance
                    </label>
                  </legend>
                  <div className="form-grid">
                    <div className="form-field">
                      <label>Task Order Cell</label>
                      <select
                        value={taskOrderCell}
                        onChange={e => setTaskOrderCell(e.target.value)}
                        disabled={autoBalance}
                      >
                        {Object.entries(COUNTERBALANCE_CELLS).map(([cell, blocks]) => (
                          <option key={cell} value={cell}>
                            {cell}: {blocks.join(' → ')}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-field">
                      <label>Passage Mapping</label>
                      <select
                        value={passageMapping}
                        onChange={e => setPassageMapping(e.target.value)}
                        disabled={autoBalance}
                      >
                        {Object.entries(PASSAGE_MAPPINGS).map(([key, mapping]) => (
                          <option key={key} value={key}>
                            {key}: N→{mapping.N}, L→{mapping.L}, H→{mapping.H}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-field">
                      <label>Notification Variant</label>
                      <select
                        value={notificationVariant}
                        onChange={e => setNotificationVariant(e.target.value)}
                        disabled={autoBalance}
                      >
                        <option value="Q1">Q1 (Set 1)</option>
                        <option value="Q2">Q2 (Set 2)</option>
                        <option value="Q3">Q3 (Set 3)</option>
                      </select>
                    </div>
                    <div className="form-field">
                      <label>L Timing Choice</label>
                      <select
                        value={lTimingChoice}
                        onChange={e => setLTimingChoice(e.target.value)}
                        disabled={autoBalance}
                      >
                        <option value="earlier">Earlier candidates</option>
                        <option value="later">Later candidates</option>
                      </select>
                    </div>
                  </div>
                </fieldset>

                {/* Block Order Preview */}
                {taskOrderCell && (
                  <div className="block-order-preview">
                    <h4>Block Order Preview</h4>
                    <div className="block-sequence">
                      <div className="block-item baseline">Baseline</div>
                      {COUNTERBALANCE_CELLS[taskOrderCell]?.map((block, i) => (
                        <div key={i} className={`block-item block-${block.toLowerCase()}`}>
                          <span className="block-label">{block}</span>
                          {block !== 'Stroop' && passageMapping && (
                            <span className="block-passage">
                              Passage {PASSAGE_MAPPINGS[passageMapping]?.[block]}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setShowNewSession(false)}>
                  Cancel
                </button>
                <button className="btn-primary" onClick={handleCreateSession}>
                  Create Session
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sessions List */}
        {activeTab === 'sessions' && (
          <div className="sessions-list">
            {realSessions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <h3>No Sessions Yet</h3>
                <p>Create your first session to begin collecting data.</p>
                <button className="btn-primary" onClick={() => setShowNewSession(true)}>
                  + New Session
                </button>
              </div>
            ) : (
              <div className="sessions-table-wrapper">
                <table className="sessions-table">
                  <thead>
                    <tr>
                      <th>Participant</th>
                      <th>Cell</th>
                      <th>Passages</th>
                      <th>Status</th>
                      <th>Phase</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {realSessions.map(session => (
                      <tr key={session.sessionId}>
                        <td className="participant-code">{session.participantCode}</td>
                        <td>
                          <code>{session.taskOrderCell}</code>
                        </td>
                        <td>
                          <code>{session.passageMapping}</code>
                        </td>
                        <td>{getStatusBadge(session.status)}</td>
                        <td>
                          <span className="phase-tag">{session.currentPhase}</span>
                        </td>
                        <td>{new Date(session.createdAt).toLocaleDateString()}</td>
                        <td className="actions-cell">
                          {session.status === 'in_progress' && (
                            <button
                              className="btn-sm btn-primary"
                              onClick={() => navigate(`/experiment/${session.sessionId}`)}
                            >
                              Continue
                            </button>
                          )}
                          <button
                            className="btn-sm btn-primary"
                            onClick={() => exportCleanResultsJSON(session)}
                          >
                            Results JSON
                          </button>
                          <button
                            className="btn-sm btn-secondary"
                            onClick={() => exportSessionJSON(session)}
                          >
                            Raw JSON
                          </button>
                          {session.stroopTrials?.length > 0 && (
                            <button
                              className="btn-sm btn-secondary"
                              onClick={() => handleExportStroopCSV(session)}
                            >
                              Stroop CSV
                            </button>
                          )}
                          {session.comprehensionResponses?.length > 0 && (
                            <button
                              className="btn-sm btn-secondary"
                              onClick={() => handleExportComprehensionCSV(session)}
                            >
                              Q&A CSV
                            </button>
                          )}
                          <button
                            className="btn-sm btn-danger"
                            onClick={() => handleDeleteSession(session.sessionId)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Test Sessions */}
        {activeTab === 'test' && (
          <div className="sessions-list">
            <div className="test-mode-banner">
              <span>🧪</span> Test sessions are isolated from real data. Use for simulation and portal validation.
            </div>
            {testSessions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🧪</div>
                <h3>No Test Sessions</h3>
                <p>Create a test session with "Test Mode" enabled.</p>
              </div>
            ) : (
              <div className="sessions-table-wrapper">
                <table className="sessions-table">
                  <thead>
                    <tr>
                      <th>Participant</th>
                      <th>Cell</th>
                      <th>Status</th>
                      <th>Phase</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {testSessions.map(session => (
                      <tr key={session.sessionId} className="test-row">
                        <td className="participant-code">
                          🧪 {session.participantCode}
                        </td>
                        <td><code>{session.taskOrderCell}</code></td>
                        <td>{getStatusBadge(session.status)}</td>
                        <td><span className="phase-tag">{session.currentPhase}</span></td>
                        <td className="actions-cell">
                          {session.status === 'in_progress' && (
                            <button
                              className="btn-sm btn-primary"
                              onClick={() => navigate(`/experiment/${session.sessionId}`)}
                            >
                              Continue
                            </button>
                          )}
                          <button
                            className="btn-sm btn-danger"
                            onClick={() => handleDeleteSession(session.sessionId)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Balance Overview */}
        {activeTab === 'balance' && (
          <div className="balance-overview">
            <h3>Counterbalancing Distribution</h3>
            <div className="balance-grid">
              <div className="balance-section">
                <h4>Task Order Cells</h4>
                <div className="balance-bars">
                  {Object.keys(COUNTERBALANCE_CELLS).map(cell => {
                    const count = realSessions.filter(
                      s => s.taskOrderCell === cell && s.status === 'complete'
                    ).length;
                    return (
                      <div key={cell} className="balance-bar-item">
                        <span className="balance-label">{cell}</span>
                        <div className="balance-bar">
                          <div
                            className="balance-bar-fill"
                            style={{ width: `${Math.max(5, count * 20)}%` }}
                          />
                        </div>
                        <span className="balance-count">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="balance-section">
                <h4>Passage Mappings</h4>
                <div className="balance-bars">
                  {Object.keys(PASSAGE_MAPPINGS).map(mapping => {
                    const count = realSessions.filter(
                      s => s.passageMapping === mapping && s.status === 'complete'
                    ).length;
                    return (
                      <div key={mapping} className="balance-bar-item">
                        <span className="balance-label">{mapping}</span>
                        <div className="balance-bar">
                          <div
                            className="balance-bar-fill mapping"
                            style={{ width: `${Math.max(5, count * 30)}%` }}
                          />
                        </div>
                        <span className="balance-count">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="balance-section">
                <h4>L Timing Choice</h4>
                <div className="balance-bars">
                  {['earlier', 'later'].map(choice => {
                    const count = realSessions.filter(
                      s => s.lTimingChoice === choice && s.status === 'complete'
                    ).length;
                    return (
                      <div key={choice} className="balance-bar-item">
                        <span className="balance-label">{choice}</span>
                        <div className="balance-bar">
                          <div
                            className="balance-bar-fill timing"
                            style={{ width: `${Math.max(5, count * 40)}%` }}
                          />
                        </div>
                        <span className="balance-count">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="balance-section">
                <h4>Notification Variants</h4>
                <div className="balance-bars">
                  {['Q1', 'Q2', 'Q3'].map(variant => {
                    const count = realSessions.filter(
                      s => s.notificationVariant === variant && s.status === 'complete'
                    ).length;
                    return (
                      <div key={variant} className="balance-bar-item">
                        <span className="balance-label">{variant}</span>
                        <div className="balance-bar">
                          <div
                            className="balance-bar-fill"
                            style={{ width: `${Math.max(5, count * 30)}%`, background: 'var(--accent-info, #38bdf8)' }}
                          />
                        </div>
                        <span className="balance-count">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
