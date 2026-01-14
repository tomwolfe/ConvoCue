import React, { useState, useEffect } from 'react';
import { useML } from './useML';
import VAD from './components/VAD';
import SuggestionHUD from './components/SuggestionHUD';
import SessionSummary from './components/SessionSummary';
import SessionHistoryModal from './components/SessionHistoryModal';
import InsightsModal from './components/InsightsModal';
import { useSessionHistory } from './hooks/useSessionHistory';
import { AppConfig } from './core/config';
import {
    ShieldAlert,
    Briefcase,
    Heart,
    Globe,
    Info,
    User,
    Users,
    Battery,
    RotateCcw,
    ChevronRight,
    LogOut,
    Sparkles,
    History,
    BarChart3
} from 'lucide-react';

const ICON_MAP = {
    ShieldAlert: <ShieldAlert size={14} />,
    Briefcase: <Briefcase size={14} />,
    Heart: <Heart size={14} />,
    Globe: <Globe size={14} />
};

const App = () => {
    const [sessionToLoad, setSessionToLoad] = useState(null);

    const {
        status,
        progress,
        sttProgress,
        llmProgress,
        transcript,
        suggestion,
        detectedIntent,
        persona,
        setPersona,
        isReady,
        battery,
        lastDrain,
        resetBattery,
        dismissSuggestion,
        refreshSuggestion,
        processAudio,
        isProcessing,
        currentSpeaker,
        toggleSpeaker,
        shouldPulse,
        consecutiveCount,
        sensitivity,
        setSensitivity,
        isPaused,
        togglePause,
        recharge,
        isExhausted,
        summarizeSession,
        startNewSession,
        closeSummary,
        sessionSummary,
        isSummarizing,
        summaryError,
        initialBattery,
        progressiveReadiness,
        sttStage,
        llmStage
    } = useML(sessionToLoad);

    const sessionHistory = useSessionHistory();
    const {
        sessions,
        saveSession,
        loadSession,
        deleteSession,
        exportSession,
        exportAllSessions,
        clearAllSessions,
        getSessionStats
    } = sessionHistory;

    const handleLoadSession = (sessionId) => {
        const session = loadSession(sessionId);
        if (session) {
            // Set the session data to trigger a re-initialization of useML
            setSessionToLoad(session);
            setShowSessionHistory(false);
        }
    };

    const [showTutorial, setShowTutorial] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showSessionHistory, setShowSessionHistory] = useState(false);
    const [showInsights, setShowInsights] = useState(false);

    return (
        <div className="app">
            <header>
                <div className="header-left">
                    <h1>ConvoCue <span>2</span></h1>
                    <button className="btn-icon" onClick={() => setShowTutorial(true)} title="How it works">
                        <Info size={18} />
                    </button>
                    <button className={`btn-icon ${showSettings ? 'active' : ''}`} onClick={() => setShowSettings(!showSettings)} title="Settings">
                        <RotateCcw size={18} style={{ transform: showSettings ? 'rotate(-90deg)' : 'none', transition: 'transform 0.3s' }} />
                    </button>
                </div>
                <div className="header-right">
                    <button
                        className="btn-insights prominent-feature"
                        onClick={() => setShowInsights(true)}
                        title="View conversation insights"
                    >
                        <BarChart3 size={16} />
                        <span>Insights</span>
                    </button>
                    <button
                        className="btn-session-history prominent-feature"
                        onClick={() => setShowSessionHistory(true)}
                        title="View session history"
                    >
                        <History size={16} />
                        <span>History</span>
                    </button>
                    <button
                        className={`btn-end-session ${(isExhausted && transcript.length > 5) ? 'pulse-urgent' : ''}`}
                        onClick={summarizeSession}
                        disabled={transcript.length === 0 || isSummarizing}
                    >
                        <LogOut size={14} />
                        <span>{isSummarizing ? 'Summarizing...' : 'End Session'}</span>
                    </button>
                    <div className="battery-section" title="Social Battery">
                        <div className="battery-label" onClick={() => recharge(10)}>
                            {isPaused ? <Info size={14} className="paused-icon" /> : <Battery size={14} />}
                            <span>{Math.round(battery)}%</span>
                        </div>
                        <div className={`battery-hud ${battery < 30 && !isPaused && !isExhausted ? 'warning' : ''}`} onClick={togglePause}>
                            <div className={`battery-fill ${isExhausted && !isPaused ? 'critical' : ''}`} style={{
                                width: `${battery}%`,
                                backgroundColor: isPaused ? '#94a3b8' : isExhausted ? '#ef4444' : battery < 50 ? '#f59e0b' : '#10b981'
                            }}></div>
                            {isPaused && <div className="battery-paused-overlay">PAUSED</div>}
                            {lastDrain && (
                                <div className={`drain-indicator animate-float-up severity-${lastDrain.severity || 'low'} ${lastDrain.amount.startsWith('+') ? 'is-positive' : ''}`}>
                                    {lastDrain.amount}% {lastDrain.reason && <span className="drain-reason">{lastDrain.reason}</span>}
                                    {lastDrain.severity === 'surge' && <Sparkles size={10} className="surge-icon" />}
                                </div>
                            )}
                        </div>
                        {/* Battery Visualization Icon - persistent visual reference */}
                        <div className="battery-visualization-icon" title="Battery drain visualization">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M1 12C1 7.58172 4.58172 4 9 4H15C19.4183 4 23 7.58172 23 12C23 16.4183 19.4183 20 15 20H9C4.58172 20 1 16.4183 1 12Z" stroke="#94a3b8" strokeWidth="2"/>
                                <path d="M12 8V12L15 15" stroke="#10b981" strokeWidth="2" strokeLinecap="round"/>
                                <circle cx="12" cy="12" r="10" stroke="#f59e0b" strokeWidth="2" strokeDasharray="2 4"/>
                            </svg>
                        </div>
                        {/* Battery Explanation Tooltip */}
                        <div className="battery-explanation-tooltip">
                            <div className="tooltip-trigger">?</div>
                            <div className="tooltip-content">
                                <h4>How Social Battery Works</h4>
                                <p>Every interaction drains your social energy:</p>
                                <div className="battery-drain-visualization">
                                    <div className="drain-factor high-drain">
                                        <div className="factor-label">Conflict</div>
                                        <div className="drain-amount">High Drain</div>
                                    </div>
                                    <div className="drain-factor medium-drain">
                                        <div className="factor-label">Work Discussions</div>
                                        <div className="drain-amount">Moderate</div>
                                    </div>
                                    <div className="drain-factor medium-drain">
                                        <div className="factor-label">Emotional Topics</div>
                                        <div className="drain-amount">Moderate</div>
                                    </div>
                                    <div className="drain-factor low-drain">
                                        <div className="factor-label">Casual Conversation</div>
                                        <div className="drain-amount">Low</div>
                                    </div>
                                    <div className="drain-factor recharge">
                                        <div className="factor-label">Positive Interactions</div>
                                        <div className="drain-amount">Recharge!</div>
                                    </div>
                                </div>
                                <p>Take breaks to let your battery recover.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {(isSummarizing || sessionSummary || summaryError) && (
                <SessionSummary
                    summary={sessionSummary}
                    transcript={transcript}
                    battery={battery}
                    initialBattery={initialBattery}
                    onNewSession={startNewSession}
                    error={summaryError}
                    onRetry={summarizeSession}
                    onClose={() => {
                        // Save session when closing summary
                        if (sessionSummary && transcript.length > 0) {
                            const stats = {
                                totalCount: transcript.length,
                                meCount: transcript.filter(t => t.speaker === 'me').length,
                                themCount: transcript.filter(t => t.speaker === 'them').length,
                                totalDrain: Math.round(initialBattery - battery)
                            };
                            saveSession(transcript, battery, initialBattery, stats);
                        }
                        closeSummary();
                    }}
                />
            )}

            {showSessionHistory && (
                <div className="session-history-overlay" onClick={() => setShowSessionHistory(false)}>
                    <div className="session-history-modal-wrapper" onClick={e => e.stopPropagation()}>
                        <SessionHistoryModal
                            sessions={sessions}
                            onLoadSession={handleLoadSession}
                            onDeleteSession={deleteSession}
                            onExportSession={exportSession}
                            onExportAll={exportAllSessions}
                            onClose={() => setShowSessionHistory(false)}
                            stats={getSessionStats()}
                        />
                    </div>
                </div>
            )}

            {showInsights && (
                <InsightsModal
                    sessions={sessions}
                    isOpen={showInsights}
                    onClose={() => setShowInsights(false)}
                />
            )}

            {showSettings && (
                <div className="settings-panel">
                    <div className="setting-item">
                        <label>Battery Sensitivity</label>
                        <div className="sensitivity-options">
                            {AppConfig.agency.sensitivityOptions.map(opt => (
                                <button 
                                    key={opt.value}
                                    className={sensitivity === opt.value ? 'active' : ''}
                                    onClick={() => setSensitivity(opt.value)}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="setting-actions">
                        <button className="btn-secondary" onClick={resetBattery}>Full Reset</button>
                        <button className="btn-secondary" onClick={togglePause}>{isPaused ? 'Resume Drain' : 'Snooze Drain'}</button>
                    </div>
                </div>
            )}

            <div className="persona-nav">
                {Object.entries(AppConfig.personas).map(([id, p]) => (
                    <div key={id} className="persona-tooltip-wrapper">
                        <button
                            className={`persona-pill ${persona === id ? 'active' : ''}`}
                            onClick={() => setPersona(id)}
                        >
                            {ICON_MAP[p.icon]}
                            <span>{p.label}</span>
                        </button>
                        <div className="persona-tooltip">
                            <div className="tooltip-content">
                                <h4>{p.label}</h4>
                                <p>{p.description || 'Provides tailored suggestions based on this persona.'}</p>
                                <div className="tooltip-stats">
                                    <span className="drain-rate">Drain Rate: {p.drainRate}x</span>
                                    <span className="best-for">Best For: {p.bestFor || 'General use'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <main>
                {battery < 30 && !isExhausted && (
                    <div className="battery-warning-banner">
                        <div className="warning-content">
                            <Battery size={16} className="warning-icon" />
                            {battery < 20 ? (
                                <span>Your social battery is critically low ({Math.round(battery)}%). Switching to Exhausted Mode for easier exits.</span>
                            ) : (
                                <span>Your social battery is running low ({Math.round(battery)}%). Consider wrapping up the conversation soon.</span>
                            )}
                        </div>
                    </div>
                )}
                <SuggestionHUD
                    suggestion={suggestion}
                    intent={detectedIntent}
                    onDismiss={dismissSuggestion}
                    onRefresh={refreshSuggestion}
                    isProcessing={isProcessing}
                    battery={battery}
                    isExhausted={isExhausted}
                />

                <div className="transcript-container">
                    <div className="transcript-header">
                        <h3>Live Transcript</h3>
                        <button className={`btn-toggle-speaker ${shouldPulse ? 'nudge-pulse' : ''}`} onClick={toggleSpeaker}>
                            {currentSpeaker === 'me' ? <User size={14} /> : <Users size={14} />}
                            <span>Talking: {currentSpeaker === 'me' ? 'You' : 'Them'}</span>
                            {consecutiveCount >= 3 && <div className="speaker-hint">Switch?</div>}
                        </button>
                    </div>
                    <div className="transcript-scroll">
                        {transcript.length === 0 ? (
                            <div className="empty-transcript">No speech detected yet. Start talking!</div>
                        ) : (
                            transcript.map((entry, i) => (
                                <div key={i} className={`transcript-entry ${entry.speaker}`}>
                                    <span className="speaker-icon">
                                        {entry.speaker === 'me' ? <User size={12} /> : <Users size={12} />}
                                    </span>
                                    <span className="entry-text">{entry.text}</span>
                                    <span className="entry-time">{entry.timestamp}</span>
                                    {entry.intent && (
                                        <span className="entry-intent" title={`This interaction was categorized as ${entry.intent}`}>
                                            {entry.intent}
                                        </span>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </main>

            <footer>
                <VAD
                    onSpeechEnd={processAudio}
                    isReady={isReady}
                    status={status}
                    progressiveReadiness={progressiveReadiness}
                />
                {!isReady && (
                    <div className="model-loading-overlay-minimized">
                        <div className="loading-status-bar">
                            <div className="status-info">
                                <Sparkles size={14} className="loading-icon-spin" />
                                <span>{status}</span>
                                <span className="overall-percent">{Math.round(progress)}%</span>
                            </div>
                            <div className="progress-bar-mini">
                                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                            </div>
                        </div>
                    </div>
                )}
                {(status.includes('Loading') || status.includes('models')) && showTutorial && (
                    <div className="model-loading-context">
                        <div className="loading-tips">
                            <p>💡 Tip: Exploring Session History while we prepare your AI co-pilot!</p>
                        </div>
                    </div>
                )}
            </footer>

            {showTutorial && (
                <div className="tutorial-overlay" onClick={() => setShowTutorial(false)}>
                    <div className="tutorial-modal" onClick={e => e.stopPropagation()}>
                        <h2>Welcome to ConvoCue 2</h2>
                        <p>Your real-time social co-pilot.</p>

                        <div className="tutorial-step">
                            <div className="step-icon"><Battery size={20} /></div>
                            <div className="step-content">
                                <h4>Social Battery</h4>
                                <p>Cues drain your battery based on intensity. Low battery triggers "Exhaustion" mode for easier exits. Your battery recovers when conversations pause.</p>
                                <p><strong>Drain Levels:</strong></p>
                                <ul>
                                    <li>Conflict: Highest drain</li>
                                    <li>Work discussions: Moderate drain</li>
                                    <li>Emotional topics: Moderate drain</li>
                                    <li>Casual conversation: Low drain</li>
                                    <li>Positive interactions: Recharge!</li>
                                </ul>
                                <p><strong>Example:</strong> Saying "I'm not sure about that" drains less than "I strongly disagree" (conflict).</p>

                                <div className="battery-visualization">
                                    <h5>Visual Drain Indicators:</h5>
                                    <div className="drain-indicator-example">
                                        <div className="drain-factor high-drain">
                                            <div className="factor-label">Conflict</div>
                                            <div className="drain-amount">-2.5%</div>
                                        </div>
                                        <div className="drain-factor medium-drain">
                                            <div className="factor-label">Work Discussion</div>
                                            <div className="drain-amount">-1.2%</div>
                                        </div>
                                        <div className="drain-factor low-drain">
                                            <div className="factor-label">Casual Chat</div>
                                            <div className="drain-amount">-0.6%</div>
                                        </div>
                                        <div className="drain-factor recharge">
                                            <div className="factor-label">Positive Interaction</div>
                                            <div className="drain-amount">+0.3%</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="tutorial-step">
                            <div className="step-icon"><ShieldAlert size={20} /></div>
                            <div className="step-content">
                                <h4>Personas</h4>
                                <p>Switch between Anxiety Coach, EQ Guide, or Pro Exec to change the style of suggestions.</p>
                                <p><strong>Tip:</strong> Start with "Anxiety Coach" if you're new to the app.</p>
                                <div className="persona-comparison-table">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Persona</th>
                                                <th>Best For</th>
                                                <th>Drain Rate</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td>Anxiety Coach</td>
                                                <td>Social anxiety, gentle guidance</td>
                                                <td>Medium-High</td>
                                            </tr>
                                            <tr>
                                                <td>Pro Exec</td>
                                                <td>Business meetings, direct feedback</td>
                                                <td>Low-Medium</td>
                                            </tr>
                                            <tr>
                                                <td>EQ Coach</td>
                                                <td>Relationships, emotional support</td>
                                                <td>Low</td>
                                            </tr>
                                            <tr>
                                                <td>Culture Guide</td>
                                                <td>Cross-cultural, diplomatic</td>
                                                <td>Medium</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div className="tutorial-step">
                            <div className="step-icon"><Users size={20} /></div>
                            <div className="step-content">
                                <h4>Speaker Toggle</h4>
                                <p>Tap the speaker badge to tell the AI who is talking for better context.</p>
                                <p><strong>Pro tip:</strong> Switch to "You" when you're speaking to get better suggestions.</p>
                            </div>
                        </div>

                        <div className="tutorial-step">
                            <div className="step-icon"><Sparkles size={20} /></div>
                            <div className="step-content">
                                <h4>How to Use</h4>
                                <p>1. Click the mic to start listening</p>
                                <p>2. Speak normally - the AI will detect intent and suggest responses</p>
                                <p>3. Use quick actions for instant responses</p>
                                <p>4. End your session to get insights</p>
                            </div>
                        </div>

                        <button className="btn-close-tutorial" onClick={() => setShowTutorial(false)}>
                            Got it! <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;