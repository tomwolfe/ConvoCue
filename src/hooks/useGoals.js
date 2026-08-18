import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'convocue_goals';

function loadGoals() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveGoals(goals) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
}

function isDailyGoal(goal) {
  return goal.timeframe === 'daily';
}

function isWeeklyGoal(goal) {
  return goal.timeframe === 'weekly';
}

function goalNeedsReset(goal) {
  const now = new Date();
  const created = new Date(goal.createdAt);
  if (goal.completedAt) return false;

  if (isDailyGoal(goal)) {
    const createdDate = created.toDateString();
    const today = now.toDateString();
    return createdDate !== today;
  }

  if (isWeeklyGoal(goal)) {
    const createdMonday = getWeekStart(created);
    const currentMonday = getWeekStart(now);
    return createdMonday.getTime() !== currentMonday.getTime();
  }

  return false;
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function useGoals() {
  const [goals, setGoals] = useState(() => {
    const loaded = loadGoals();
    return loaded.map(g => goalNeedsReset(g) ? { ...g, current: 0, createdAt: new Date().toISOString() } : g);
  });

  useEffect(() => {
    saveGoals(goals);
  }, [goals]);

  const addGoal = useCallback((type, target, timeframe = 'daily') => {
    const goal = {
      id: generateId(),
      type,
      target,
      current: 0,
      timeframe,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    setGoals(prev => [...prev, goal]);
  }, []);

  const updateProgress = useCallback((type, amount) => {
    setGoals(prev =>
      prev.map(g => {
        if (g.type !== type || g.completedAt) return g;
        const newCurrent = g.current + amount;
        return {
          ...g,
          current: Math.min(newCurrent, g.target),
          completedAt: newCurrent >= g.target ? new Date().toISOString() : null,
        };
      })
    );
  }, []);

  const deleteGoal = useCallback((id) => {
    setGoals(prev => prev.filter(g => g.id !== id));
  }, []);

  const checkCompletions = useCallback(() => {
    setGoals(prev => {
      let changed = false;
      const updated = prev.map(g => {
        if (goalNeedsReset(g)) {
          changed = true;
          return { ...g, current: 0, createdAt: new Date().toISOString() };
        }
        return g;
      });
      return changed ? updated : prev;
    });
  }, []);

  useEffect(() => {
    checkCompletions();
    const interval = setInterval(checkCompletions, 60000);
    return () => clearInterval(interval);
  }, [checkCompletions]);

  return { goals, addGoal, updateProgress, deleteGoal, checkCompletions };
}
