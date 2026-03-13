import { useState, useEffect, useCallback } from 'react';
import { goalDB, analyticsDB, sessionDB, metricsDB } from '../core/database';

/**
 * Growth Engine Hook - Provides actionable social coaching based on conversation history
 * Analyzes patterns and suggests weekly goals for EQ improvement
 */

// Goal templates for different improvement areas
const GOAL_TEMPLATES = {
    energy: {
        title: 'Energy Management',
        description: 'Keep average battery drain below {target}% per conversation',
        icon: 'battery',
        defaultTarget: 15
    },
    balance: {
        title: 'Conversation Balance',
        description: 'Achieve {target}% speaking balance (currently {current}%)',
        icon: 'balance',
        defaultTarget: 50
    },
    intent: {
        title: 'Positive Interactions',
        description: 'Have {target} positive/social conversations this week',
        icon: 'heart',
        defaultTarget: 5
    },
    frequency: {
        title: 'Social Engagement',
        description: 'Complete {target} conversations this week',
        icon: 'calendar',
        defaultTarget: 3
    },
    conflict: {
        title: 'Conflict Reduction',
        description: 'Reduce conflict intents to below {target}% of conversations',
        icon: 'shield',
        defaultTarget: 20
    }
};

export const useGrowthEngine = () => {
    const [goals, setGoals] = useState([]);
    const [weeklyTrends, setWeeklyTrends] = useState([]);
    const [monthlyStats, setMonthlyStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [suggestedGoal, setSuggestedGoal] = useState(null);

    // Analyze conversation history and suggest appropriate goals
    const analyzeAndSuggestGoal = useCallback(async () => {
        try {
            const last30Days = await sessionDB.getByDateRange(
                new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                new Date().toISOString()
            );

            if (last30Days.length === 0) {
                // No history - suggest a simple starter goal
                setSuggestedGoal({
                    type: 'frequency',
                    title: 'Get Started',
                    description: 'Complete 3 conversations this week',
                    target: 3,
                    current: 0,
                    reason: 'Start building your conversation history!'
                });
                return;
            }

            // Calculate metrics from last 30 days
            const totalDrain = last30Days.reduce((sum, s) => sum + (s.initialBattery - s.finalBattery), 0);
            const avgDrain = totalDrain / last30Days.length;

            // Get intent distribution
            const sessionIds = last30Days.map(s => s.id);
            const intentDistribution = await analyticsDB.getIntentDistribution(sessionIds);
            const totalIntents = intentDistribution.reduce((sum, i) => sum + i.count, 0);
            
            const conflictPercent = totalIntents > 0 
                ? (intentDistribution.find(i => i.intent === 'conflict')?.count || 0) / totalIntents * 100 
                : 0;

            const positivePercent = totalIntents > 0
                ? ((intentDistribution.find(i => i.intent === 'positive')?.count || 0) + 
                   (intentDistribution.find(i => i.intent === 'social')?.count || 0)) / totalIntents * 100
                : 0;

            // Get speaker balance
            const speakerBalance = await analyticsDB.getSpeakerBalance(sessionIds);
            const totalMessages = speakerBalance.me + speakerBalance.them;
            const mePercent = totalMessages > 0 ? (speakerBalance.me / totalMessages) * 100 : 50;

            // Determine the most impactful goal based on data
            let suggestion = null;
            let priority = 0;

            // High conflict = priority focus on conflict reduction
            if (conflictPercent > 30) {
                suggestion = {
                    type: 'conflict',
                    title: GOAL_TEMPLATES.conflict.title,
                    description: GOAL_TEMPLATES.conflict.description.replace('{target}', '15'),
                    target: 15,
                    current: Math.round(conflictPercent),
                    reason: `Conflict represents ${Math.round(conflictPercent)}% of your conversations. Reducing this can improve your social energy.`
                };
                priority = 3;
            }

            // High drain = energy management focus
            if (avgDrain > 20 && priority < 3) {
                suggestion = {
                    type: 'energy',
                    title: GOAL_TEMPLATES.energy.title,
                    description: GOAL_TEMPLATES.energy.description.replace('{target}', '12'),
                    target: 12,
                    current: Math.round(avgDrain),
                    reason: `Your average battery drain (${Math.round(avgDrain)}%) is high. Better energy management can help.`
                };
                priority = 2;
            }

            // Imbalanced speaking = conversation balance focus
            if (mePercent > 65 || mePercent < 35) {
                const targetBalance = mePercent > 50 ? 45 : 55;
                const newSuggestion = {
                    type: 'balance',
                    title: GOAL_TEMPLATES.balance.title,
                    description: GOAL_TEMPLATES.balance.description
                        .replace('{target}', targetBalance.toString())
                        .replace('{current}', Math.round(mePercent).toString()),
                    target: targetBalance,
                    current: Math.round(mePercent),
                    reason: `You speak ${Math.round(mePercent)}% of the time. A more balanced conversation can improve connection.`
                };
                
                if (priority < 2) {
                    suggestion = newSuggestion;
                    priority = 2;
                }
            }

            // Low positive interactions = encourage more positive social engagement
            if (positivePercent < 40 && priority < 2) {
                suggestion = {
                    type: 'intent',
                    title: GOAL_TEMPLATES.intent.title,
                    description: GOAL_TEMPLATES.intent.description.replace('{target}', '5'),
                    target: 5,
                    current: Math.round(positivePercent),
                    reason: 'Increasing positive interactions can boost your overall social well-being.'
                };
            }

            // Default: encourage more conversations
            if (!suggestion) {
                const last7Days = last30Days.filter(s => 
                    new Date(s.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                );
                
                suggestion = {
                    type: 'frequency',
                    title: GOAL_TEMPLATES.frequency.title,
                    description: GOAL_TEMPLATES.frequency.description.replace('{target}', '5'),
                    target: 5,
                    current: last7Days.length,
                    reason: 'Regular practice helps build social confidence and skills.'
                };
            }

            setSuggestedGoal(suggestion);
        } catch (error) {
            console.error('[useGrowthEngine] Error analyzing goals:', error);
        }
    }, []);

    // Load active goals
    const loadGoals = useCallback(async () => {
        try {
            const activeGoals = await goalDB.getActive();
            setGoals(activeGoals);
        } catch (error) {
            console.error('[useGrowthEngine] Error loading goals:', error);
        }
    }, []);

    // Load weekly trends (last 7 days)
    const loadWeeklyTrends = useCallback(async () => {
        try {
            const trends = await analyticsDB.getWeeklyActivity();
            setWeeklyTrends(trends);
        } catch (error) {
            console.error('[useGrowthEngine] Error loading weekly trends:', error);
        }
    }, []);

    // Load monthly statistics
    const loadMonthlyStats = useCallback(async () => {
        try {
            const last30Days = await sessionDB.getByDateRange(
                new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                new Date().toISOString()
            );

            if (last30Days.length === 0) {
                setMonthlyStats(null);
                return;
            }

            const totalConversations = last30Days.length;
            const totalDrain = last30Days.reduce((sum, s) => sum + (s.initialBattery - s.finalBattery), 0);
            const avgDrain = totalDrain / totalConversations;
            const totalDuration = last30Days.reduce((sum, s) => sum + (s.duration || 0), 0);
            
            const sessionIds = last30Days.map(s => s.id);
            const intentDistribution = await analyticsDB.getIntentDistribution(sessionIds);
            const dominantIntent = intentDistribution[0]?.intent || 'N/A';

            const speakerBalance = await analyticsDB.getSpeakerBalance(sessionIds);
            const totalMessages = speakerBalance.me + speakerBalance.them;

            setMonthlyStats({
                totalConversations,
                avgBatteryDrain: Math.round(avgDrain * 100) / 100,
                totalDuration,
                avgDuration: Math.round(totalDuration / totalConversations / 1000), // seconds
                dominantIntent,
                meMessagePercent: totalMessages > 0 ? Math.round((speakerBalance.me / totalMessages) * 100) : 50,
                totalMessages,
                conversationsByIntent: intentDistribution
            });
        } catch (error) {
            console.error('[useGrowthEngine] Error loading monthly stats:', error);
            setMonthlyStats(null);
        }
    }, []);

    // Create a new goal
    const createGoal = useCallback(async (goalType, customTarget = null) => {
        try {
            const template = GOAL_TEMPLATES[goalType];
            if (!template) throw new Error(`Unknown goal type: ${goalType}`);

            const target = customTarget || template.defaultTarget;
            
            const goalId = await goalDB.create({
                title: template.title,
                description: template.description.replace('{target}', target.toString()),
                type: goalType,
                target,
                current: 0,
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
            });

            await loadGoals();
            return goalId;
        } catch (error) {
            console.error('[useGrowthEngine] Error creating goal:', error);
            throw error;
        }
    }, [loadGoals]);

    // Accept the suggested goal
    const acceptSuggestedGoal = useCallback(async () => {
        if (!suggestedGoal) return null;

        try {
            const goalId = await createGoal(suggestedGoal.type, suggestedGoal.target);
            setSuggestedGoal(null);
            await loadGoals();
            return goalId;
        } catch (error) {
            console.error('[useGrowthEngine] Error accepting suggested goal:', error);
            throw error;
        }
    }, [suggestedGoal, createGoal, loadGoals]);

    // Update goal progress
    const updateGoalProgress = useCallback(async (goalId, current) => {
        try {
            const updated = await goalDB.updateProgress(goalId, current);
            await loadGoals();
            return updated;
        } catch (error) {
            console.error('[useGrowthEngine] Error updating goal progress:', error);
            throw error;
        }
    }, [loadGoals]);

    // Complete a goal
    const completeGoal = useCallback(async (goalId) => {
        try {
            await goalDB.complete(goalId);
            await loadGoals();
        } catch (error) {
            console.error('[useGrowthEngine] Error completing goal:', error);
            throw error;
        }
    }, [loadGoals]);

    // Archive a goal
    const archiveGoal = useCallback(async (goalId) => {
        try {
            await goalDB.archive(goalId);
            await loadGoals();
        } catch (error) {
            console.error('[useGrowthEngine] Error archiving goal:', error);
            throw error;
        }
    }, [loadGoals]);

    // Delete a goal
    const deleteGoal = useCallback(async (goalId) => {
        try {
            await goalDB.delete(goalId);
            await loadGoals();
        } catch (error) {
            console.error('[useGrowthEngine] Error deleting goal:', error);
            throw error;
        }
    }, [loadGoals]);

    // Auto-update goal progress based on recent sessions
    const updateGoalsFromSessions = useCallback(async () => {
        try {
            const activeGoals = await goalDB.getActive();
            if (activeGoals.length === 0) return;

            const now = new Date();
            const last7DaysStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

            for (const goal of activeGoals) {
                let current = 0;

                switch (goal.type) {
                    case 'frequency':
                        // Count conversations in last 7 days
                        const sessions = await sessionDB.getByDateRange(
                            last7DaysStart.toISOString(),
                            now.toISOString()
                        );
                        current = sessions.length;
                        break;

                    case 'energy':
                        // Calculate average drain in last 7 days
                        const energySessions = await sessionDB.getByDateRange(
                            last7DaysStart.toISOString(),
                            now.toISOString()
                        );
                        if (energySessions.length > 0) {
                            const totalDrain = energySessions.reduce((sum, s) => 
                                sum + (s.initialBattery - s.finalBattery), 0
                            );
                            current = Math.round(totalDrain / energySessions.length);
                        }
                        break;

                    case 'balance':
                        // Calculate speaking balance
                        const balanceSessions = await sessionDB.getByDateRange(
                            last7DaysStart.toISOString(),
                            now.toISOString()
                        );
                        const balanceSessionIds = balanceSessions.map(s => s.id);
                        const speakerBalance = await analyticsDB.getSpeakerBalance(balanceSessionIds);
                        const total = speakerBalance.me + speakerBalance.them;
                        current = total > 0 ? Math.round((speakerBalance.me / total) * 100) : 50;
                        break;

                    case 'intent':
                        // Count positive/social conversations
                        const intentSessions = await sessionDB.getByDateRange(
                            last7DaysStart.toISOString(),
                            now.toISOString()
                        );
                        const intentSessionIds = intentSessions.map(s => s.id);
                        const intentDist = await analyticsDB.getIntentDistribution(intentSessionIds);
                        current = intentDist.filter(i => i.intent === 'positive' || i.intent === 'social')
                            .reduce((sum, i) => sum + i.count, 0);
                        break;

                    case 'conflict':
                        // Calculate conflict percentage
                        const conflictSessions = await sessionDB.getByDateRange(
                            last7DaysStart.toISOString(),
                            now.toISOString()
                        );
                        const conflictSessionIds = conflictSessions.map(s => s.id);
                        const conflictDist = await analyticsDB.getIntentDistribution(conflictSessionIds);
                        const totalIntents = conflictDist.reduce((sum, i) => sum + i.count, 0);
                        const conflictCount = conflictDist.find(i => i.intent === 'conflict')?.count || 0;
                        current = totalIntents > 0 ? Math.round((conflictCount / totalIntents) * 100) : 0;
                        break;

                    default:
                        break;
                }

                // Update goal progress if changed
                if (current !== goal.current) {
                    await goalDB.updateProgress(goal.id, current);
                }
            }

            await loadGoals();
        } catch (error) {
            console.error('[useGrowthEngine] Error updating goals from sessions:', error);
        }
    }, [loadGoals]);

    // Initial load
    useEffect(() => {
        const initialize = async () => {
            await Promise.all([
                loadGoals(),
                loadWeeklyTrends(),
                loadMonthlyStats(),
                analyzeAndSuggestGoal()
            ]);
            setIsLoading(false);
        };

        initialize();
    }, [loadGoals, loadWeeklyTrends, loadMonthlyStats, analyzeAndSuggestGoal]);

    // Periodic goal progress update
    useEffect(() => {
        const interval = setInterval(() => {
            updateGoalsFromSessions();
        }, 60000); // Update every minute

        return () => clearInterval(interval);
    }, [updateGoalsFromSessions]);

    return {
        goals,
        weeklyTrends,
        monthlyStats,
        suggestedGoal,
        isLoading,
        createGoal,
        acceptSuggestedGoal,
        updateGoalProgress,
        completeGoal,
        archiveGoal,
        deleteGoal,
        refreshData: useCallback(async () => {
            await Promise.all([
                loadGoals(),
                loadWeeklyTrends(),
                loadMonthlyStats(),
                analyzeAndSuggestGoal(),
                updateGoalsFromSessions()
            ]);
        }, [loadGoals, loadWeeklyTrends, loadMonthlyStats, analyzeAndSuggestGoal, updateGoalsFromSessions])
    };
};

export default useGrowthEngine;
