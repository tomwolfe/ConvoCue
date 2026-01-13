import React, { useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { useML } from './useML';
import VAD from './components/VAD';
import SuggestionHUD from './components/SuggestionHUD';
import SessionSummary from './components/SessionSummary';
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
    LogOut
} from 'lucide-react';

const ICON_MAP = {
    ShieldAlert: <ShieldAlert size={14} />,
    Briefcase: <Briefcase size={14} />,
    Heart: <Heart size={14} />,
    Globe: <Globe size={14} />
};

const App = () => {
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
        initialBattery
    } = useML();

    const [showTutorial, setShowTutorial] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

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
                        <div className="battery-hud" onClick={togglePause}>
                            <div className={`battery-fill ${isExhausted && !isPaused ? 'critical' : ''}`} style={{ 
                                width: `${battery}%`, 
                                backgroundColor: isPaused ? '#94a3b8' : isExhausted ? '#ef4444' : battery < 50 ? '#f59e0b' : '#10b981' 
                            }}></div>
                            {isPaused && <div className="battery-paused-overlay">PAUSED</div>}
                            {lastDrain && (
                                <div className={`drain-indicator animate-float-up ${lastDrain.amount.startsWith('+') ? 'is-positive' : ''}`}>
                                    {lastDrain.amount}% {lastDrain.reason && <span className="drain-reason">{lastDrain.reason}</span>}
                                </div>
                            )}
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
                    onClose={closeSummary}
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
                    <button 
                        key={id} 
                        className={`persona-pill ${persona === id ? 'active' : ''}`}
                        onClick={() => setPersona(id)}
                    >
                        {ICON_MAP[p.icon]}
                        <span>{p.label}</span>
                    </button>
                ))}
            </div>

            <main>
                <SuggestionHUD 
                    suggestion={suggestion} 
                    intent={detectedIntent} 
                    onDismiss={dismissSuggestion} 
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
                />
                {(status.includes('Loading') || status.includes('models')) && (
                    <div className="model-loading">
                        <div className="progress-group">
                            <div className="progress-item">
                                <div className="progress-labels">
                                    <span>Speech Recognition</span>
                                    <span>{Math.round(sttProgress)}%</span>
                                </div>
                                <div className="progress-bar mini">
                                    <div className="progress-fill" style={{ width: `${sttProgress}%`, backgroundColor: '#3b82f6' }}></div>
                                </div>
                            </div>
                            <div className="progress-item">
                                <div className="progress-labels">
                                    <span>AI Assistant</span>
                                    <span>{Math.round(llmProgress)}%</span>
                                </div>
                                <div className="progress-bar mini">
                                    <div className="progress-fill" style={{ width: `${llmProgress}%`, backgroundColor: '#8b5cf6' }}></div>
                                </div>
                            </div>
                        </div>
                        <div className="loading-status-text">
                            <span>{status}</span>
                        </div>
                        <div className="loading-tips">
                            <p>💡 Tip: The first load may take 1-2 minutes as models download. Future sessions will be faster!</p>
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
                            </div>
                        </div>

                        <div className="tutorial-step">
                            <div className="step-icon"><ShieldAlert size={20} /></div>
                            <div className="step-content">
                                <h4>Personas</h4>
                                <p>Switch between Anxiety Coach, EQ Guide, or Pro Exec to change the style of suggestions.</p>
                            </div>
                        </div>

                        <div className="tutorial-step">
                            <div className="step-icon"><Users size={20} /></div>
                            <div className="step-content">
                                <h4>Speaker Toggle</h4>
                                <p>Tap the speaker badge to tell the AI who is talking for better context.</p>
                            </div>
                        </div>

                        <button className="btn-close-tutorial" onClick={() => setShowTutorial(false)}>
                            Got it! <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
            <Analytics />
        </div>
    );
};

export default App;