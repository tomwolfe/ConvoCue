import React, { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

const FEEDBACK_KEY = 'convocue_feedback';
const MAX_ENTRIES = 200;
const SHOW_DELAY = 2000;

function loadFeedback() {
    try {
        const raw = localStorage.getItem(FEEDBACK_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveFeedback(entries) {
    try {
        const trimmed = entries.slice(-MAX_ENTRIES);
        localStorage.setItem(FEEDBACK_KEY, JSON.stringify(trimmed));
    } catch (e) {
        console.error('Failed to save feedback:', e);
    }
}

const SuggestionFeedback = ({ suggestion, intent, persona, onFeedback }) => {
    const [visible, setVisible] = useState(false);
    const [submitted, setSubmitted] = useState(null);

    useEffect(() => {
        setVisible(false);
        setSubmitted(null);

        if (!suggestion) return;

        const timer = setTimeout(() => {
            setVisible(true);
        }, SHOW_DELAY);

        return () => clearTimeout(timer);
    }, [suggestion]);

    const handleFeedback = (rating) => {
        if (!suggestion || submitted) return;

        const entry = {
            suggestion,
            intent,
            persona,
            rating,
            timestamp: Date.now()
        };

        const existing = loadFeedback();
        existing.push(entry);
        saveFeedback(existing);

        setSubmitted(rating);
        if (onFeedback) onFeedback(entry);
    };

    if (!visible || !suggestion || submitted) return null;

    return (
        <div className="suggestion-feedback">
            <span className="feedback-label">Was this helpful?</span>
            <div className="feedback-buttons">
                <button
                    className="feedback-btn feedback-up"
                    onClick={() => handleFeedback('up')}
                    title="Helpful"
                >
                    <ThumbsUp size={14} />
                </button>
                <button
                    className="feedback-btn feedback-down"
                    onClick={() => handleFeedback('down')}
                    title="Not helpful"
                >
                    <ThumbsDown size={14} />
                </button>
            </div>

            <style>{`
                .suggestion-feedback {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-top: 6px;
                    animation: feedbackFadeIn 0.3s ease;
                }

                .feedback-label {
                    font-size: 0.7rem;
                    color: var(--text-muted, #888);
                }

                .feedback-buttons {
                    display: flex;
                    gap: 4px;
                }

                .feedback-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--surface, rgba(255,255,255,0.04));
                    border: 1px solid var(--border, rgba(255,255,255,0.08));
                    color: var(--text-muted, #888);
                    border-radius: 6px;
                    padding: 4px 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .feedback-btn:hover {
                    background: var(--surface-hover, rgba(255,255,255,0.08));
                    color: var(--text, #ccc);
                }

                .feedback-up:hover {
                    border-color: rgba(16, 185, 129, 0.4);
                    color: #10b981;
                }

                .feedback-down:hover {
                    border-color: rgba(239, 68, 68, 0.4);
                    color: #ef4444;
                }

                @keyframes feedbackFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default SuggestionFeedback;
