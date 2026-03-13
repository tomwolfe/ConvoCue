import Dexie from 'dexie';

/**
 * ConvoCue IndexedDB Database using Dexie.js
 * Supports unlimited session history, transcripts, and analytics data
 */
export const db = new Dexie('ConvoCueDB');

// Define database schema with versioning
db.version(1).stores({
  sessions: '++id, timestamp, persona', // Auto-increment id, indexed by timestamp and persona
  transcripts: '++id, sessionId, speaker, timestamp', // Indexed by session and speaker
  intentLogs: '++id, sessionId, intent, timestamp', // Indexed for analytics
  goals: '++id, createdAt, status, dueDate', // Social goals tracking
  metrics: '++id, date, type' // Daily metrics aggregation
});

/**
 * Session schema:
 * {
 *   id: auto,
 *   timestamp: ISO string,
 *   persona: string,
 *   initialBattery: number,
 *   finalBattery: number,
 *   duration: number (ms),
 *   stats: { totalCount, meCount, themCount, totalDrain }
 * }
 */

/**
 * Transcript entry schema:
 * {
 *   id: auto,
 *   sessionId: foreign key,
 *   speaker: 'me' | 'them',
 *   text: string,
 *   intent: string,
 *   timestamp: ISO string
 * }
 */

/**
 * Goal schema:
 * {
 *   id: auto,
 *   title: string,
 *   description: string,
 *   type: 'energy' | 'balance' | 'intent' | 'frequency',
 *   target: number,
 *   current: number,
 *   status: 'active' | 'completed' | 'archived',
 *   createdAt: ISO string,
 *   dueDate: ISO string,
 *   completedAt: ISO string | null
 * }
 */

/**
 * Daily metrics schema:
 * {
 *   id: auto,
 *   date: YYYY-MM-DD,
 *   type: 'daily',
 *   totalConversations: number,
 *   totalMessages: number,
 *   avgBatteryDrain: number,
 *   dominantIntent: string,
 *   avgDuration: number
 * }
 */

// Helper functions for common operations
export const sessionDB = {
  /**
   * Save a complete session with transcript
   */
  async save(sessionData, transcriptData) {
    return await db.transaction('rw', db.sessions, db.transcripts, db.intentLogs, async () => {
      const sessionId = await db.sessions.add(sessionData);
      
      // Save transcript entries
      const transcriptIds = await Promise.all(
        transcriptData.map(entry => 
          db.transcripts.add({ ...entry, sessionId })
        )
      );
      
      // Log intents for analytics
      const intentEntries = transcriptData.map(entry => ({
        sessionId,
        intent: entry.intent,
        timestamp: entry.timestamp
      }));
      await db.intentLogs.bulkAdd(intentEntries);
      
      return { sessionId, transcriptIds };
    });
  },

  /**
   * Get all sessions with optional pagination
   */
  async getAll(limit = 100, offset = 0) {
    return await db.sessions
      .orderBy('timestamp')
      .reverse()
      .offset(offset)
      .limit(limit)
      .toArray();
  },

  /**
   * Get a single session with its transcript
   */
  async getById(sessionId) {
    const session = await db.sessions.get(sessionId);
    if (!session) return null;
    
    const transcript = await db.transcripts
      .where('sessionId')
      .equals(sessionId)
      .sortBy('timestamp');
    
    return { ...session, transcript };
  },

  /**
   * Delete a session and all related data
   */
  async delete(sessionId) {
    return await db.transaction('rw', db.sessions, db.transcripts, db.intentLogs, async () => {
      await db.sessions.delete(sessionId);
      await db.transcripts.where('sessionId').equals(sessionId).delete();
      await db.intentLogs.where('sessionId').equals(sessionId).delete();
    });
  },

  /**
   * Clear all sessions
   */
  async clearAll() {
    return await db.transaction('rw', db.sessions, db.transcripts, db.intentLogs, async () => {
      await db.sessions.clear();
      await db.transcripts.clear();
      await db.intentLogs.clear();
    });
  },

  /**
   * Get sessions by date range
   */
  async getByDateRange(startDate, endDate) {
    return await db.sessions
      .where('timestamp')
      .between(startDate, endDate, true, true)
      .toArray();
  },

  /**
   * Get sessions by persona
   */
  async getByPersona(persona) {
    return await db.sessions
      .where('persona')
      .equals(persona)
      .reverse()
      .toArray();
  },

  /**
   * Get count of all sessions
   */
  async getCount() {
    return await db.sessions.count();
  }
};

export const goalDB = {
  /**
   * Create a new social goal
   */
  async create(goalData) {
    return await db.goals.add({
      ...goalData,
      status: 'active',
      createdAt: new Date().toISOString(),
      completedAt: null
    });
  },

  /**
   * Get all active goals
   */
  async getActive() {
    return await db.goals
      .where('status')
      .equals('active')
      .sortBy('dueDate');
  },

  /**
   * Get all goals (with optional status filter)
   */
  async getAll(status = null) {
    if (status) {
      return await db.goals.where('status').equals(status).sortBy('createdAt');
    }
    return await db.goals.orderBy('createdAt').reverse().toArray();
  },

  /**
   * Update goal progress
   */
  async updateProgress(goalId, current) {
    const goal = await db.goals.get(goalId);
    if (!goal) return null;
    
    const updated = { ...goal, current };
    
    // Auto-complete if target reached
    if (current >= goal.target) {
      updated.status = 'completed';
      updated.completedAt = new Date().toISOString();
    }
    
    await db.goals.update(goalId, updated);
    return updated;
  },

  /**
   * Complete a goal manually
   */
  async complete(goalId) {
    return await db.goals.update(goalId, {
      status: 'completed',
      completedAt: new Date().toISOString()
    });
  },

  /**
   * Archive a goal
   */
  async archive(goalId) {
    return await db.goals.update(goalId, { status: 'archived' });
  },

  /**
   * Delete a goal
   */
  async delete(goalId) {
    return await db.goals.delete(goalId);
  }
};

export const metricsDB = {
  /**
   * Record daily metrics
   */
  async recordDaily(date, metrics) {
    const existing = await db.metrics
      .where({ date, type: 'daily' })
      .first();
    
    if (existing) {
      // Update existing record
      await db.metrics.update(existing.id, metrics);
      return existing.id;
    }
    
    // Create new record
    return await db.metrics.add({
      date,
      type: 'daily',
      ...metrics
    });
  },

  /**
   * Get metrics for date range
   */
  async getByDateRange(startDate, endDate) {
    return await db.metrics
      .where('date')
      .between(startDate, endDate, true, true)
      .toArray();
  },

  /**
   * Get last N days of metrics
   */
  async getLastNDays(days = 30) {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return await this.getByDateRange(
      startDate.toISOString().split('T')[0],
      endDate
    );
  }
};

/**
 * Analytics helpers for aggregated data
 */
export const analyticsDB = {
  /**
   * Get intent distribution across all sessions
   */
  async getIntentDistribution(sessionIds = null) {
    let query = db.intentLogs;
    if (sessionIds) {
      query = query.where('sessionId').anyOf(sessionIds);
    }
    
    const logs = await query.toArray();
    const distribution = {};
    
    logs.forEach(log => {
      distribution[log.intent] = (distribution[log.intent] || 0) + 1;
    });
    
    return Object.entries(distribution)
      .map(([intent, count]) => ({ intent, count }))
      .sort((a, b) => b.count - a.count);
  },

  /**
   * Get speaker balance across sessions
   */
  async getSpeakerBalance(sessionIds = null) {
    let query = db.transcripts;
    if (sessionIds) {
      query = query.where('sessionId').anyOf(sessionIds);
    }
    
    const transcripts = await query.toArray();
    const balance = { me: 0, them: 0 };
    
    transcripts.forEach(t => {
      balance[t.speaker] = (balance[t.speaker] || 0) + 1;
    });
    
    return balance;
  },

  /**
   * Get battery drain trends
   */
  async getBatteryDrainTrends(limit = 10) {
    const sessions = await db.sessions
      .orderBy('timestamp')
      .reverse()
      .limit(limit)
      .toArray();
    
    return sessions.map(s => ({
      sessionId: s.id,
      timestamp: s.timestamp,
      drain: s.initialBattery - s.finalBattery
    })).reverse();
  },

  /**
   * Get weekly activity summary
   */
  async getWeeklyActivity() {
    const now = new Date();
    const activity = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const nextDateStr = new Date(date.getTime() + 86400000).toISOString().split('T')[0];
      
      const sessions = await db.sessions
        .where('timestamp')
        .between(dateStr, nextDateStr, true, false)
        .toArray();
      
      const avgDrain = sessions.length > 0
        ? sessions.reduce((sum, s) => sum + (s.initialBattery - s.finalBattery), 0) / sessions.length
        : 0;
      
      activity.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        fullDate: dateStr,
        conversations: sessions.length,
        avgDrain: Math.round(avgDrain * 100) / 100
      });
    }
    
    return activity;
  }
};

export default db;
