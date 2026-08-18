import React, { useState, useEffect } from 'react';
import { WifiOff, Check } from 'lucide-react';

const OfflineBanner = ({ modelsLoaded }) => {
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (!isOffline) return null;

    if (modelsLoaded) {
        return (
            <div className="offline-banner offline-ready">
                <Check size={14} />
                <span>Offline mode -- all features available.</span>

                <style>{`
                    .offline-banner {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        padding: 6px 16px;
                        font-size: 0.75rem;
                        font-weight: 500;
                    }

                    .offline-ready {
                        background: rgba(16, 185, 129, 0.1);
                        color: #10b981;
                        border-bottom: 1px solid rgba(16, 185, 129, 0.15);
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="offline-banner offline-warning">
            <WifiOff size={14} />
            <span>You're offline. Models need to be downloaded on first use.</span>

            <style>{`
                .offline-banner {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    padding: 6px 16px;
                    font-size: 0.75rem;
                    font-weight: 500;
                }

                .offline-warning {
                    background: rgba(239, 68, 68, 0.12);
                    color: #ef4444;
                    border-bottom: 1px solid rgba(239, 68, 68, 0.15);
                }
            `}</style>
        </div>
    );
};

export default OfflineBanner;
