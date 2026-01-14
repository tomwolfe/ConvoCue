import React, { useState } from 'react';
import { Sparkles, MessageSquare, AlertCircle, Briefcase, Heart, X, Loader2, ClipboardCheck, Zap, Battery, RefreshCw } from 'lucide-react';
import { QUICK_ACTIONS, AppConfig, BRIDGE_PHRASES } from '../core/config';

const INTENT_UI = {
    social: { icon: <MessageSquare size={14} />, color: '#3b82f6', label: 'Social' },
    professional: { icon: <Briefcase size={14} />, color: '#10b981', label: 'Professional' },
    conflict: { icon: <AlertCircle size={14} />, color: '#ef4444', label: 'Conflict' },
    empathy: { icon: <Heart size={14} />, color: '#ec4899', label: 'Empathy' },
    positive: { icon: <Sparkles size={14} />, color: '#f59e0b', label: 'Positive' },
    general: { icon: <Sparkles size={14} />, color: '#8b5cf6', label: 'General' }
};

const SuggestionHUD = ({ suggestion, intent, onDismiss, onRefresh, isProcessing, battery, isExhausted }) => {
    const [copied, setCopied] = useState(null);
    const ui = INTENT_UI[intent] || INTENT_UI.general;

    const isLowPowerMode = battery < 30;

    const handleQuickAction = (text, index) => {
        if (!navigator.clipboard) {
            console.error('Clipboard API not available');
            return;
        }
        navigator.clipboard.writeText(text).then(() => {
            setCopied(index);
            setTimeout(() => setCopied(null), 2000);
        }).catch(err => {
            console.error('Failed to copy: ', err);
        });
    };

    let actions = isExhausted
        ? QUICK_ACTIONS.exhausted
        : (QUICK_ACTIONS[intent] || QUICK_ACTIONS.social);

    // Social Power Save: Reduce options when battery is low
    if (isLowPowerMode && !isExhausted) {
        actions = actions.slice(0, 2);
    }

    return (
        <div className={`suggestion-hud ${isExhausted ? 'exhausted' : ''} ${isLowPowerMode ? 'power-save' : ''}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <div className="intent-badge" style={{ backgroundColor: ui.color, marginBottom: 0 }}>
                        {isProcessing ? <Loader2 size={12} className="animate-spin" /> : ui.icon}
                        <span>{ui.label} {isProcessing && '(Updating...)'}</span>
                    </div>
                    {battery < 30 && !isExhausted && (
                        <div className="intent-badge" style={{ backgroundColor: '#f59e0b', marginBottom: 0 }}>
                            <Battery size={12} />
                            <span>Power Save</span>
                        </div>
                    )}
                    {battery < 20 && !isExhausted && (
                        <div className="intent-badge battery-critical-badge">
                            <AlertCircle size={12} />
                            <span>Critical</span>
                        </div>
                    )}
                    {isExhausted && (
                        <div className="intent-badge exhausted-badge">
                            <AlertCircle size={12} />
                            <span>Exhausted</span>
                        </div>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                    {suggestion && !isProcessing && (
                        <button
                            onClick={onRefresh}
                            className="hud-action-btn"
                            title="Re-roll suggestion"
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                        >
                            <RefreshCw size={16} />
                        </button>
                    )}
                    <button
                        onClick={onDismiss}
                        className="hud-action-btn"
                        title="Dismiss"
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            <div className={`suggestion-box ${isProcessing ? 'is-processing' : ''}`}>
                {suggestion ? (
                    <div className="suggestion-content animate-fade-in">
                        <div className="keyword-chips">
                            {(isLowPowerMode ? suggestion.split(' ').slice(0, 5) : suggestion.split(' ').slice(0, 15)).map((word, index) => (
                                <span key={index} className="keyword-chip" style={{ animationDelay: `${index * 50}ms` }}>{word}</span>
                            ))}
                            {isLowPowerMode && suggestion.split(' ').length > 5 && <span className="keyword-chip-more">...</span>}
                        </div>
                        {isProcessing && (
                            <div className="processing-overlay">
                                <div className="pulse-loader"></div>
                                <span>Refining...</span>
                            </div>
                        )}
                    </div>
                ) : (
                    (isProcessing ? (
                        <div className="processing-message">
                            <div className="thinking-dots">
                                <span></span><span></span><span></span>
                            </div>
                            <span className="animate-pulse">{BRIDGE_PHRASES[intent] || "Generating suggestion..."}</span>
                        </div>
                    ) : (
                        <div className="no-suggestion-placeholder">
                            <Sparkles size={20} style={{ opacity: 0.3 }} />
                            <p>AI suggestions will appear here based on your conversation</p>
                        </div>
                    ))
                )}
            </div>

            <div className={`quick-actions-container ${isExhausted ? 'priority-exhaustion' : ''}`}>
                <div className="quick-actions-label">
                    <Zap size={10} className="text-yellow-500" />
                    <span>{isExhausted ? 'EMERGENCY EXIT STRATEGIES' : (isLowPowerMode ? 'LOW ENERGY CUES' : 'INSTANT REACTIONS')}</span>
                </div>
                <div className="quick-actions-list horizontal-scroll">
                    {actions.map((action, i) => (
                        <button
                            key={i}
                            className={`quick-action-btn ${copied === i ? 'copied' : ''} ${isExhausted ? 'exhaustion-action' : 'smart-action'}`}
                            onClick={() => handleQuickAction(action.text, i)}
                        >
                            {copied === i ? <ClipboardCheck size={12} /> : <Zap size={12} className="zap-icon" />}
                            <div className="action-label-group">
                                <span className="action-main-label">{action.label}</span>
                                {!isLowPowerMode && <span className="action-preview">{action.text.substring(0, 20)}...</span>}
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SuggestionHUD;