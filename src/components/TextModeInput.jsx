import React, { useState } from 'react';
import { Send, User, Users, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

const TextModeInput = ({ onTextSubmit, isModelLoading }) => {
    const [text, setText] = useState('');
    const [speaker, setSpeaker] = useState('me');
    const [isExpanded, setIsExpanded] = useState(false);

    const handleSubmit = () => {
        if (!text.trim()) return;
        onTextSubmit(text.trim(), speaker);
        setText('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const toggleSpeaker = () => {
        setSpeaker(prev => (prev === 'me' ? 'them' : 'me'));
    };

    return (
        <div className="text-mode-input">
            <button
                className="text-mode-toggle"
                onClick={() => setIsExpanded(prev => !prev)}
            >
                <span>{isExpanded ? 'Hide Text Input' : 'Type Instead'}</span>
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {isExpanded && (
                <div className="text-mode-body">
                    {isModelLoading && (
                        <div className="loading-badge">
                            <Loader2 size={12} className="animate-spin" />
                            <span>Try while models load</span>
                        </div>
                    )}

                    <div className="text-mode-row">
                        <button
                            className={`speaker-toggle ${speaker === 'me' ? 'active' : ''}`}
                            onClick={toggleSpeaker}
                            title={speaker === 'me' ? 'Speaking as yourself' : 'Speaking as the other person'}
                        >
                            {speaker === 'me' ? <User size={16} /> : <Users size={16} />}
                            <span>{speaker === 'me' ? 'Me' : 'Them'}</span>
                        </button>

                        <textarea
                            className="text-mode-textarea"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type what was said..."
                            rows={2}
                            disabled={isModelLoading}
                        />

                        <button
                            className="text-mode-submit"
                            onClick={handleSubmit}
                            disabled={!text.trim() || isModelLoading}
                            title="Get Suggestion"
                        >
                            {isModelLoading ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <Send size={18} />
                            )}
                            <span>Get Suggestion</span>
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                .text-mode-input {
                    border-top: 1px solid var(--border, rgba(255,255,255,0.08));
                    padding-top: 0.5rem;
                }

                .text-mode-toggle {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    width: 100%;
                    background: none;
                    border: none;
                    color: var(--text-muted, #888);
                    font-size: 0.75rem;
                    padding: 6px;
                    cursor: pointer;
                    border-radius: 6px;
                    transition: background 0.2s, color 0.2s;
                }

                .text-mode-toggle:hover {
                    background: var(--surface-hover, rgba(255,255,255,0.05));
                    color: var(--text, #ccc);
                }

                .text-mode-body {
                    margin-top: 0.5rem;
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    animation: fadeIn 0.2s ease;
                }

                .loading-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    background: rgba(251, 191, 36, 0.15);
                    color: #fbbf24;
                    font-size: 0.7rem;
                    font-weight: 500;
                    padding: 3px 10px;
                    border-radius: 12px;
                    width: fit-content;
                }

                .text-mode-row {
                    display: flex;
                    align-items: flex-start;
                    gap: 8px;
                }

                .speaker-toggle {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 2px;
                    background: var(--surface, rgba(255,255,255,0.04));
                    border: 1px solid var(--border, rgba(255,255,255,0.08));
                    color: var(--text-muted, #888);
                    padding: 8px 10px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 0.65rem;
                    font-weight: 500;
                    transition: all 0.2s;
                    min-width: 50px;
                }

                .speaker-toggle.active {
                    background: var(--primary-subtle, rgba(59,130,246,0.15));
                    border-color: var(--primary, #3b82f6);
                    color: var(--primary, #3b82f6);
                }

                .text-mode-textarea {
                    flex: 1;
                    background: var(--surface, rgba(255,255,255,0.04));
                    border: 1px solid var(--border, rgba(255,255,255,0.08));
                    border-radius: 8px;
                    color: var(--text, #ccc);
                    font-size: 0.85rem;
                    padding: 8px 12px;
                    resize: none;
                    font-family: inherit;
                    line-height: 1.4;
                    transition: border-color 0.2s;
                }

                .text-mode-textarea:focus {
                    outline: none;
                    border-color: var(--primary, #3b82f6);
                }

                .text-mode-textarea::placeholder {
                    color: var(--text-muted, #666);
                }

                .text-mode-submit {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    background: var(--primary, #3b82f6);
                    border: none;
                    color: #fff;
                    padding: 8px 14px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 0.8rem;
                    font-weight: 500;
                    white-space: nowrap;
                    transition: opacity 0.2s;
                }

                .text-mode-submit:hover:not(:disabled) {
                    opacity: 0.9;
                }

                .text-mode-submit:disabled {
                    opacity: 0.4;
                    cursor: not-allowed;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default TextModeInput;
