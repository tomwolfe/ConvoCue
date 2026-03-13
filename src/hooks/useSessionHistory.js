import { useState, useEffect, useCallback } from 'react';
import { sessionDB, db } from '../core/database';

// Track migration state to avoid repeated attempts
let migrationAttempted = false;

export const useSessionHistory = () => {
    const [sessions, setSessions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [migrationStatus, setMigrationStatus] = useState('pending'); // 'pending' | 'migrating' | 'completed' | 'failed'

    // Migrate data from localStorage to IndexedDB
    const migrateFromLocalStorage = useCallback(async () => {
        if (migrationAttempted) return;
        migrationAttempted = true;
        
        setMigrationStatus('migrating');
        
        try {
            const savedSessions = localStorage.getItem('convocue_sessions');
            if (!savedSessions) {
                setMigrationStatus('completed');
                return;
            }

            const parsedSessions = JSON.parse(savedSessions);
            if (!parsedSessions || parsedSessions.length === 0) {
                setMigrationStatus('completed');
                return;
            }

            console.log(`[useSessionHistory] Migrating ${parsedSessions.length} sessions from localStorage to IndexedDB...`);

            // Migrate each session to IndexedDB
            for (const session of parsedSessions) {
                const sessionData = {
                    timestamp: session.timestamp,
                    persona: session.persona || 'default',
                    initialBattery: session.initialBattery || 100,
                    finalBattery: session.battery,
                    duration: session.duration || 0,
                    stats: session.stats || {
                        totalCount: session.transcript?.length || 0,
                        meCount: session.transcript?.filter(t => t.speaker === 'me').length || 0,
                        themCount: session.transcript?.filter(t => t.speaker === 'them').length || 0,
                        totalDrain: (session.initialBattery || 100) - session.battery
                    }
                };

                const transcriptData = (session.transcript || []).map(entry => ({
                    speaker: entry.speaker,
                    text: entry.text,
                    intent: entry.intent || 'general',
                    timestamp: entry.timestamp || new Date().toISOString()
                }));

                await sessionDB.save(sessionData, transcriptData);
            }

            // Clear localStorage after successful migration
            localStorage.removeItem('convocue_sessions');
            setMigrationStatus('completed');
            console.log('[useSessionHistory] Migration completed successfully');
        } catch (error) {
            console.error('[useSessionHistory] Migration failed:', error);
            setMigrationStatus('failed');
        }
    }, []);

    // Load sessions from IndexedDB on initialization
    useEffect(() => {
        const loadSessions = async () => {
            try {
                // First, attempt migration if needed
                await migrateFromLocalStorage();

                // Load sessions from IndexedDB
                const loadedSessions = await sessionDB.getAll(500, 0);
                
                // Transform sessions to include transcript data for backward compatibility
                const sessionsWithTranscripts = await Promise.all(
                    loadedSessions.map(async (session) => {
                        const fullSession = await sessionDB.getById(session.id);
                        return {
                            id: session.id.toString(),
                            timestamp: session.timestamp,
                            persona: session.persona,
                            initialBattery: session.initialBattery,
                            battery: session.finalBattery,
                            duration: session.duration,
                            stats: session.stats,
                            transcript: fullSession?.transcript || []
                        };
                    })
                );

                setSessions(sessionsWithTranscripts);
            } catch (error) {
                console.error('[useSessionHistory] Error loading sessions:', error);
                setSessions([]);
            } finally {
                setIsLoading(false);
            }
        };

        loadSessions();
    }, [migrateFromLocalStorage]);

    // Save session to IndexedDB
    const saveSession = useCallback(async (transcript, battery, initialBattery, stats) => {
        const sessionData = {
            timestamp: new Date().toISOString(),
            persona: 'default', // Will be updated when session ends
            initialBattery,
            finalBattery: battery,
            duration: transcript.length > 0 ?
                new Date(transcript[transcript.length - 1].timestamp).getTime() -
                new Date(transcript[0].timestamp).getTime() : 0,
            stats: stats || {
                totalCount: transcript.length,
                meCount: transcript.filter(t => t.speaker === 'me').length,
                themCount: transcript.filter(t => t.speaker === 'them').length,
                totalDrain: initialBattery - battery
            }
        };

        const transcriptData = transcript.map(entry => ({
            speaker: entry.speaker,
            text: entry.text,
            intent: entry.intent || 'general',
            timestamp: entry.timestamp
        }));

        try {
            const { sessionId } = await sessionDB.save(sessionData, transcriptData);
            
            // Update local state optimistically
            const newSession = {
                id: sessionId.toString(),
                ...sessionData,
                transcript: transcriptData
            };
            
            setSessions(prev => [newSession, ...prev]);
            return sessionId;
        } catch (error) {
            console.error('[useSessionHistory] Error saving session:', error);
            throw error;
        }
    }, []);

    // Load a specific session
    const loadSession = useCallback(async (sessionId) => {
        try {
            const session = await sessionDB.getById(parseInt(sessionId, 10));
            if (!session) return null;

            return {
                id: session.id.toString(),
                timestamp: session.timestamp,
                persona: session.persona,
                initialBattery: session.initialBattery,
                battery: session.finalBattery,
                duration: session.duration,
                stats: session.stats,
                transcript: session.transcript || []
            };
        } catch (error) {
            console.error('[useSessionHistory] Error loading session:', error);
            return null;
        }
    }, []);

    // Delete a session
    const deleteSession = useCallback(async (sessionId) => {
        try {
            await sessionDB.delete(parseInt(sessionId, 10));
            setSessions(prev => prev.filter(session => session.id !== sessionId));
        } catch (error) {
            console.error('[useSessionHistory] Error deleting session:', error);
            throw error;
        }
    }, []);

    // Export a single session
    const exportSession = useCallback(async (sessionId) => {
        const session = await loadSession(sessionId);
        if (!session) return null;

        const dataStr = JSON.stringify(session, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

        const exportFileDefaultName = `convocue_session_${session.timestamp.replace(/[:.]/g, '-')}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();

        return true;
    }, [loadSession]);

    // Export all sessions
    const exportAllSessions = useCallback(async () => {
        const dataStr = JSON.stringify(sessions, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

        const exportFileDefaultName = `convocue_all_sessions_${new Date().toISOString().split('T')[0]}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();

        return true;
    }, [sessions]);

    // Clear all sessions
    const clearAllSessions = useCallback(async () => {
        try {
            await sessionDB.clearAll();
            setSessions([]);
        } catch (error) {
            console.error('[useSessionHistory] Error clearing sessions:', error);
            throw error;
        }
    }, []);

    // Get session statistics
    const getSessionStats = useCallback(() => {
        if (sessions.length === 0) return {
            totalSessions: 0,
            totalMessages: 0,
            avgDuration: 0,
            avgBatteryDrain: 0
        };

        const totalMessages = sessions.reduce((sum, session) => sum + (session.transcript?.length || 0), 0);
        const avgDuration = sessions.reduce((sum, session) => sum + (session.duration || 0), 0) / sessions.length;
        const avgBatteryDrain = sessions.reduce((sum, session) => {
            return sum + ((session.initialBattery || 100) - (session.battery || 0));
        }, 0) / sessions.length;

        return {
            totalSessions: sessions.length,
            totalMessages,
            avgDuration: Math.round(avgDuration / 1000), // Convert to seconds
            avgBatteryDrain: Math.round(avgBatteryDrain * 100) / 100
        };
    }, [sessions]);

    // Get sessions by date range (for analytics)
    const getSessionsByDateRange = useCallback(async (startDate, endDate) => {
        try {
            const filteredSessions = await sessionDB.getByDateRange(startDate, endDate);
            return filteredSessions.map(s => ({
                id: s.id.toString(),
                ...s
            }));
        } catch (error) {
            console.error('[useSessionHistory] Error getting sessions by date range:', error);
            return [];
        }
    }, []);

    return {
        sessions,
        isLoading,
        migrationStatus,
        saveSession,
        loadSession,
        deleteSession,
        exportSession,
        exportAllSessions,
        clearAllSessions,
        getSessionStats,
        getSessionsByDateRange
    };
};