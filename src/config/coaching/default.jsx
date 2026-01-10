import React from 'react';
import { Zap } from 'lucide-react';

export default {
  title: 'Coaching Insight',
  icon: <Zap size={16} className="text-amber-500" />,
  className: 'default-insight',
  pattern: '',
  insightPath: (_insights) => null,
  copingPath: (_insights) => null,
  ariaLabel: 'Coaching insight'
};
