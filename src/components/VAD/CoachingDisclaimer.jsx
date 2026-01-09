import React from 'react';
import { AlertCircle } from 'lucide-react';

const CoachingDisclaimer = ({ compact = false }) => {
  return (
    <div className={`coaching-disclaimer ${compact ? 'compact' : ''}`} role="note">
      <div className="flex items-start gap-2">
        <AlertCircle size={compact ? 12 : 14} className="text-amber-500 mt-0.5 flex-shrink-0" />
        <p className="disclaimer-text">
          <strong>Disclaimer:</strong> Not a substitute for professional advice (medical, mental health, or legal). 
          {!compact && " If you are in crisis, please contact emergency services or a qualified professional."}
        </p>
      </div>
    </div>
  );
};

export default CoachingDisclaimer;
