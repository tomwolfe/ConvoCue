import React from 'react';
import { Heart } from 'lucide-react';
import { getSafeInsights, getSafeCoping } from './helpers';

export default {
  title: 'Anxiety Support',
  icon: <Heart size={16} className="text-rose-500" />,
  className: 'anxiety-insight',
  pattern: 'insight-pattern-dots', // Visual differentiator for accessibility
  insightPath: (insights) => getSafeInsights(insights, 'anxiety'),
  copingPath: (insights) => getSafeCoping(insights, 'anxiety'),
  ariaLabel: 'Personalized anxiety support insight'
};
