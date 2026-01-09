import React from 'react';
import { Presentation } from 'lucide-react';
import { getSafeInsights, getSafeCoping } from './helpers';

/**
 * Meeting Coach configuration.
 * Note: Currently reuses 'professional' insights as the underlying logic 
 * for both is aligned around workplace communication.
 */
export default {
  title: 'Meeting Coach',
  icon: <Presentation size={16} className="text-violet-500" />,
  className: 'meeting-insight',
  pattern: 'insight-pattern-grid',
  insightPath: (insights) => getSafeInsights(insights, 'meeting'),
  copingPath: (insights) => getSafeCoping(insights, 'meeting'),
  ariaLabel: 'Professional meeting coaching insight'
};
