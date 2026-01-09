import React from 'react';
import { Heart, Users, Shield, Briefcase, Zap, Presentation } from 'lucide-react';

/**
 * Robust helper to safely access insights from the coaching state.
 * This makes the UI resilient to changes in the data structure.
 */
const getSafeInsights = (insights, key, subKey = 'insights') => {
  if (!insights || !key) return null;
  return insights[key]?.[subKey] || insights[key]?.anxietySpecificInsights || null;
};

const getSafeCoping = (insights, key) => {
  if (!insights || !key) return null;
  return insights[key]?.copingStrategies || null;
};

/**
 * Configuration for coaching insights across different personas.
 * This ensures the UI is data-driven and easily scalable.
 */
export const CoachingConfig = {
  anxiety: {
    title: 'Anxiety Support',
    icon: <Heart size={16} className="text-rose-500" />,
    className: 'anxiety-insight',
    pattern: 'insight-pattern-dots', // Visual differentiator for accessibility
    insightPath: (insights) => getSafeInsights(insights, 'anxiety'),
    copingPath: (insights) => getSafeCoping(insights, 'anxiety'),
    ariaLabel: 'Personalized anxiety support insight'
  },
  relationship: {
    title: 'EQ Coach',
    icon: <Users size={16} className="text-blue-500" />,
    className: 'relationship-insight',
    pattern: 'insight-pattern-lines',
    insightPath: (insights) => getSafeInsights(insights, 'relationship', 'relationshipInsights'),
    copingPath: (insights) => null,
    ariaLabel: 'Emotional intelligence coaching insight'
  },
  professional: {
    title: 'Professional Insight',
    icon: <Briefcase size={16} className="text-slate-500" />,
    className: 'professional-insight',
    pattern: 'insight-pattern-diagonal',
    insightPath: (insights) => getSafeInsights(insights, 'professional'),
    copingPath: (insights) => null,
    ariaLabel: 'Professional communication insight'
  },
  meeting: {
    title: 'Meeting Coach',
    icon: <Presentation size={16} className="text-violet-500" />,
    className: 'meeting-insight',
    pattern: 'insight-pattern-grid',
    insightPath: (insights) => getSafeInsights(insights, 'professional'),
    copingPath: (insights) => null,
    ariaLabel: 'Professional meeting coaching insight'
  },
  // Default fallback
  default: {
    title: 'Coaching Insight',
    icon: <Zap size={16} className="text-amber-500" />,
    className: 'default-insight',
    pattern: '',
    insightPath: (insights) => null,
    copingPath: (insights) => null,
    ariaLabel: 'Coaching insight'
  }
};