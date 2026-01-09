import anxiety from './anxiety';
import relationship from './relationship';
import professional from './professional';
import meeting from './meeting';
import fallback from './default';

export const CoachingConfig = {
  anxiety,
  relationship,
  professional,
  meeting,
  default: fallback
};
