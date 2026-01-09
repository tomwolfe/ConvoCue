import React from 'react';
import { Heart, Users, Shield, Briefcase, Zap } from 'lucide-react';

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
    insightPath: (insights) => insights?.anxiety?.anxietySpecificInsights,
    copingPath: (insights) => insights?.anxiety?.copingStrategies,
    ariaLabel: 'Personalized anxiety support insight'
  },
  relationship: {
    title: 'EQ Coach',
    icon: <Users size={16} className="text-blue-500" />,
    className: 'relationship-insight',
    pattern: 'insight-pattern-lines',
    insightPath: (insights) => insights?.relationship?.relationshipInsights,
    copingPath: (insights) => null,
    ariaLabel: 'Emotional intelligence coaching insight'
  },
  professional: {
    title: 'Professional Insight',
    icon: <Briefcase size={16} className="text-slate-500" />,
    className: 'professional-insight',
    pattern: 'insight-pattern-diagonal',
    insightPath: (insights) => insights?.professional?.insights,
    copingPath: (insights) => null,
    ariaLabel: 'Professional communication insight'
  },
  meeting: {
    title: 'Meeting Coach',
    icon: <Briefcase size={16} className="text-slate-500" />,
    className: 'professional-insight',
    pattern: 'insight-pattern-diagonal',
    insightPath: (insights) => insights?.professional?.insights,
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
