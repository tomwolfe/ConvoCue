// Type definitions for preferences utilities

interface Preferences {
  preferredPersona?: string;
  [key: string]: any;
}

interface FeedbackEntry {
  suggestion: string;
  feedbackType: 'like' | 'dislike' | 'report';
  persona: string;
  culturalContext: string;
  transcript: string;
  timestamp: string;
}

interface UserPreferences {
  preferredLength: 'short' | 'medium' | 'long';
  preferredTone: 'formal' | 'casual' | 'balanced';
  preferredStyle: 'directive' | 'supportive' | 'adaptive';
}

interface Persona {
  id: string;
  label: string;
  description: string;
  prompt: string;
}

interface CustomPersonas {
  [key: string]: Persona;
}