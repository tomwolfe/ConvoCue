import React from 'react';
import { useML } from './useML';
import VAD from './components/VAD';
import SuggestionHUD from './components/SuggestionHUD';
import { AppConfig } from './core/config';

const App = () => {
    const { 
        status, 
        progress, 
        transcript, 
        suggestion, 
        detectedIntent, 
        persona, 
        setPersona, 
        isReady, 
        battery,
        resetBattery,
        dismissSuggestion,
        processAudio,
        isProcessing
    } = useML();

    return (
        <div className="app">
            <header>
                <h1>ConvoCue <span>2</span></h1>
                <div className="header-right">
                    <div className="battery-container" onClick={resetBattery} title="Click to Reset Battery">
                        <div className="battery-hud">
                            <div className="battery-fill" style={{ width: `${battery}%`, backgroundColor: battery < 20 ? '#ef4444' : '#10b981' }}></div>
                        </div>
                        <span className="battery-text">{Math.round(battery)}%</span>
                    </div>
                    <div className="persona-selector">
                        {Object.entries(AppConfig.personas).map(([id, p]) => (
                            <button 
                                key={id} 
                                className={persona === id ? 'active' : ''}
                                onClick={() => setPersona(id)}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <main>
                <SuggestionHUD 
                    suggestion={suggestion} 
                    intent={detectedIntent} 
                    onDismiss={dismissSuggestion} 
                    isProcessing={isProcessing}
                />
                
                <div className="transcript-area">
                    <h3>Transcript</h3>
                    <div className="transcript-text">
                        {transcript || "No speech detected yet."}
                    </div>
                </div>
            </main>

            <footer>
                <VAD 
                    onSpeechEnd={processAudio} 
                    isReady={isReady} 
                    status={status} 
                />
                {status === 'Loading Models...' && (
                    <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                    </div>
                )}
            </footer>
        </div>
    );
};

export default App;
