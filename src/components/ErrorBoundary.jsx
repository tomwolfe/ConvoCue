import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    handleReload = () => {
        this.setState({ hasError: false, error: null });
        if (this.props.onRetry) {
            this.props.onRetry();
        } else {
            window.location.reload();
        }
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="error-boundary">
                    <div className="error-content">
                        <AlertTriangle size={32} className="error-icon" />
                        <h2>Something went wrong</h2>
                        <p className="error-message">
                            {this.state.error?.message || 'An unexpected error occurred.'}
                        </p>
                        <button className="error-reload-btn" onClick={this.handleReload}>
                            <RefreshCw size={16} />
                            <span>Reload</span>
                        </button>
                    </div>

                    <style>{`
                        .error-boundary {
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            padding: 2rem;
                            min-height: 200px;
                        }

                        .error-content {
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            gap: 12px;
                            text-align: center;
                            max-width: 400px;
                        }

                        .error-icon {
                            color: #ef4444;
                            opacity: 0.8;
                        }

                        .error-content h2 {
                            margin: 0;
                            font-size: 1.1rem;
                            font-weight: 600;
                            color: var(--text, #e5e5e5);
                        }

                        .error-message {
                            margin: 0;
                            font-size: 0.8rem;
                            color: var(--text-muted, #888);
                            line-height: 1.5;
                        }

                        .error-reload-btn {
                            display: flex;
                            align-items: center;
                            gap: 6px;
                            background: var(--surface, rgba(255,255,255,0.06));
                            border: 1px solid var(--border, rgba(255,255,255,0.1));
                            color: var(--text, #ccc);
                            padding: 8px 16px;
                            border-radius: 8px;
                            cursor: pointer;
                            font-size: 0.8rem;
                            font-weight: 500;
                            transition: all 0.2s;
                            margin-top: 4px;
                        }

                        .error-reload-btn:hover {
                            background: var(--surface-hover, rgba(255,255,255,0.1));
                            border-color: rgba(255,255,255,0.15);
                        }
                    `}</style>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
