import React from 'react';
import { Briefcase } from 'lucide-react';
import { getSafeInsights } from './helpers';

export default {
  title: 'Professional Insight',
  icon: <Briefcase size={16} className="text-slate-500" />,
  className: 'professional-insight',
  pattern: 'insight-pattern-diagonal',
  insightPath: (insights) => getSafeInsights(insights, 'professional'),
  copingPath: (insights) => null,
  ariaLabel: 'Professional communication insight'
};
