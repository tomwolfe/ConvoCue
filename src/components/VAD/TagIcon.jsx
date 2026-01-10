import React from 'react';
import {
  AlertTriangle, Zap, Target, MessageCircle, Heart, ShieldAlert,
  Handshake, Users, Globe, BookOpen, Lightbulb, Star
} from 'lucide-react';

const TagIcon = ({ name, size = 14, className = "" }) => {
  switch (name) {
    case 'AlertTriangle': return <AlertTriangle size={size} className={className} />;
    case 'Zap': return <Zap size={size} className={className} />;
    case 'Target': return <Target size={size} className={className} />;
    case 'MessageCircle': return <MessageCircle size={size} className={className} />;
    case 'Heart': return <Heart size={size} className={className} />;
    case 'ShieldAlert': return <ShieldAlert size={size} className={className} />;
    case 'Handshake': return <Handshake size={size} className={className} />;
    case 'Users': return <Users size={size} className={className} />;
    case 'Globe': return <Globe size={size} className={className} />;
    case 'BookOpen': return <BookOpen size={size} className={className} />;
    case 'Lightbulb': return <Lightbulb size={size} className={className} />;
    case 'Star': return <Star size={size} className={className} />;
    default: return <MessageCircle size={size} className={className} />;
  }
};

export default TagIcon;
