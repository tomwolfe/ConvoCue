import React, { useState } from 'react';

const GOAL_TYPES = [
  { value: 'sessions', label: 'Conversations' },
  { value: 'messages', label: 'Messages' },
  { value: 'lowDrain', label: 'Low-Energy Sessions' },
  { value: 'conflictHandling', label: 'Conflict Handling' },
];

function ProgressBar({ current, target }) {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  return (
    <div style={styles.progressTrack}>
      <div style={{ ...styles.progressFill, width: `${pct}%` }} />
      <span style={styles.progressLabel}>{current}/{target}</span>
    </div>
  );
}

export default function GoalsModal({ goals, onAddGoal, onDeleteGoal, onClose }) {
  const [type, setType] = useState('sessions');
  const [target, setTarget] = useState('');
  const [timeframe, setTimeframe] = useState('daily');

  const active = goals.filter(g => !g.completedAt);
  const completed = goals.filter(g => g.completedAt);

  const handleSubmit = (e) => {
    e.preventDefault();
    const num = parseInt(target, 10);
    if (!num || num <= 0) return;
    onAddGoal(type, num, timeframe);
    setTarget('');
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Goals</h2>
          <button style={styles.closeBtn} onClick={onClose}>&times;</button>
        </div>

        <form style={styles.form} onSubmit={handleSubmit}>
          <select style={styles.select} value={type} onChange={e => setType(e.target.value)}>
            {GOAL_TYPES.map(g => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
          <input
            style={styles.input}
            type="number"
            min="1"
            placeholder="Target"
            value={target}
            onChange={e => setTarget(e.target.value)}
          />
          <select style={styles.select} value={timeframe} onChange={e => setTimeframe(e.target.value)}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
          <button style={styles.addBtn} type="submit">Add</button>
        </form>

        {active.length > 0 && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Active</h3>
            {active.map(g => (
              <div key={g.id} style={styles.goalCard}>
                <div style={styles.goalHeader}>
                  <span style={styles.goalType}>{GOAL_TYPES.find(t => t.value === g.type)?.label}</span>
                  <span style={styles.goalTimeframe}>{g.timeframe}</span>
                </div>
                <ProgressBar current={g.current} target={g.target} />
                <button style={styles.deleteBtn} onClick={() => onDeleteGoal(g.id)}>Remove</button>
              </div>
            ))}
          </div>
        )}

        {completed.length > 0 && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Completed</h3>
            {completed.map(g => (
              <div key={g.id} style={{ ...styles.goalCard, ...styles.completedCard }}>
                <div style={styles.goalHeader}>
                  <span style={styles.goalType}>{GOAL_TYPES.find(t => t.value === g.type)?.label}</span>
                  <span style={styles.celebration}>Done!</span>
                </div>
                <ProgressBar current={g.target} target={g.target} />
                <button style={styles.deleteBtn} onClick={() => onDeleteGoal(g.id)}>Remove</button>
              </div>
            ))}
          </div>
        )}

        {active.length === 0 && completed.length === 0 && (
          <p style={styles.empty}>No goals yet. Add one above.</p>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#1e1e2e',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 440,
    maxHeight: '80vh',
    overflowY: 'auto',
    color: '#cdd6f4',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    margin: 0,
    fontSize: 20,
    fontWeight: 600,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#cdd6f4',
    fontSize: 24,
    cursor: 'pointer',
    padding: '0 4px',
  },
  form: {
    display: 'flex',
    gap: 8,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  select: {
    flex: '1 1 100px',
    padding: '8px 10px',
    borderRadius: 6,
    border: '1px solid #45475a',
    backgroundColor: '#313244',
    color: '#cdd6f4',
    fontSize: 14,
  },
  input: {
    flex: '1 1 80px',
    padding: '8px 10px',
    borderRadius: 6,
    border: '1px solid #45475a',
    backgroundColor: '#313244',
    color: '#cdd6f4',
    fontSize: 14,
  },
  addBtn: {
    flex: '0 0 auto',
    padding: '8px 16px',
    borderRadius: 6,
    border: 'none',
    backgroundColor: '#89b4fa',
    color: '#1e1e2e',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 14,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#a6adc8',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  goalCard: {
    backgroundColor: '#313244',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  completedCard: {
    opacity: 0.75,
  },
  goalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalType: {
    fontWeight: 600,
    fontSize: 14,
  },
  goalTimeframe: {
    fontSize: 12,
    color: '#a6adc8',
  },
  celebration: {
    fontSize: 13,
    fontWeight: 700,
    color: '#a6e3a1',
  },
  progressTrack: {
    position: 'relative',
    height: 20,
    backgroundColor: '#45475a',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    backgroundColor: '#89b4fa',
    borderRadius: 10,
    transition: 'width 0.3s ease',
  },
  progressLabel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 600,
    color: '#1e1e2e',
  },
  deleteBtn: {
    background: 'none',
    border: '1px solid #45475a',
    color: '#f38ba8',
    borderRadius: 4,
    padding: '4px 10px',
    cursor: 'pointer',
    fontSize: 12,
  },
  empty: {
    textAlign: 'center',
    color: '#a6adc8',
    fontSize: 14,
  },
};
