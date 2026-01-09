import React from 'react';
import { Users } from 'lucide-react';
import { getSafeInsights } from './helpers';

export default {
  title: 'EQ Coach',
  icon: <Users size={16} className="text-blue-500" />,
  className: 'relationship-insight',
  pattern: 'insight-pattern-lines',
  insightPath: (insights) => getSafeInsights(insights, 'relationship'),
  copingPath: (insights) => null,
  ariaLabel: 'Emotional intelligence coaching insight'
};
