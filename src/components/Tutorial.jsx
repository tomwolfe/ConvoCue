import React, { useState } from 'react';
import { X, ArrowRight, ArrowLeft, Heart, Users, Globe, Briefcase, GraduationCap } from 'lucide-react';
import './Tutorial.css';

const Tutorial = ({ onComplete, isCompactMode }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [selectedUseCase, setSelectedUseCase] = useState('');

  const useCases = [
    {
      id: 'social-anxiety',
      title: 'Social Anxiety Support',
      icon: Heart,
      description: 'Build confidence in conversations with gentle, supportive cues',
      steps: [
        {
          title: "Social Anxiety Support",
          content: "ConvoCue provides gentle, supportive cues to help you navigate conversations with confidence. The 'EQ Coach' persona offers empathetic responses and validates your feelings.",
          visual: "social-anxiety"
        },
        {
          title: "Building Confidence",
          content: "Receive encouraging suggestions that help you respond thoughtfully without overwhelming pressure. The AI recognizes when you might be feeling anxious and adjusts accordingly.",
          visual: "confidence-building"
        }
      ]
    },
    {
      id: 'professional',
      title: 'Professional Settings',
      icon: Briefcase,
      description: 'Ace meetings, sales calls, and negotiations with strategic cues',
      steps: [
        {
          title: "Professional Excellence",
          content: "Get strategic cues for meetings, presentations, and business conversations. The 'Professional' persona helps you project confidence and make impactful contributions.",
          visual: "professional"
        },
        {
          title: "Strategic Interactions",
          content: "Receive suggestions for calibrated questions, strategic interjections, and professional transitions that advance your objectives.",
          visual: "strategy"
        }
      ]
    },
    {
      id: 'cross-cultural',
      title: 'Cross-Cultural Communication',
      icon: Globe,
      description: 'Navigate cultural differences with sensitivity and awareness',
      steps: [
        {
          title: "Cultural Bridge",
          content: "Get culturally-sensitive suggestions that respect communication styles, formality levels, and face-saving norms across different cultures.",
          visual: "cross-cultural"
        },
        {
          title: "Cultural Awareness",
          content: "The 'Cultural Guide' persona helps you phrase things appropriately for diverse audiences while avoiding cultural missteps.",
          visual: "awareness"
        }
      ]
    },
    {
      id: 'language-learning',
      title: 'Language Learning',
      icon: GraduationCap,
      description: 'Improve fluency with natural phrasing and grammar suggestions',
      steps: [
        {
          title: "Language Growth",
          content: "Get real-time feedback on natural phrasing, idioms, and grammar. The 'Language Tutor' persona helps you sound more fluent and natural.",
          visual: "language-learning"
        },
        {
          title: "Natural Communication",
          content: "Receive suggestions for more idiomatic expressions and natural conversation flow in your target language.",
          visual: "fluency"
        }
      ]
    },
    {
      id: 'relationships',
      title: 'Relationship Coaching',
      icon: Users,
      description: 'Improve emotional intelligence in personal conversations',
      steps: [
        {
          title: "Relationship Growth",
          content: "Enhance your emotional intelligence with the 'EQ Coach' persona. Get suggestions for active listening, empathy, and validation.",
          visual: "relationships"
        },
        {
          title: "Emotional Connection",
          content: "Receive guidance on acknowledging emotions, validating feelings, and building stronger connections with others.",
          visual: "connection"
        }
      ]
    }
  ];

  // Default steps if no use case is selected
  const defaultSteps = [
    {
      title: "Welcome to ConvoCue",
      content: "Your AI-powered conversation assistant that listens and suggests thoughtful, context-aware responses. Choose your primary use case below to customize your experience.",
      visual: "welcome"
    },
    {
      title: "How It Works",
      content: "ConvoCue listens to your conversations and suggests context-aware responses. All processing happens locally on your device for complete privacy.",
      visual: "process-flow"
    }
  ];

  // Get steps based on selected use case
  const getSteps = () => {
    if (selectedUseCase) {
      const useCase = useCases.find(uc => uc.id === selectedUseCase);
      return [...defaultSteps, ...useCase.steps, {
        title: "Get Started",
        content: `You're ready to use ConvoCue for ${useCase.title}! Click Get Started to begin your journey.`,
        visual: "controls"
      }];
    }
    return [...defaultSteps, {
      title: "Choose Your Focus",
      content: "Select your primary use case to customize ConvoCue for your specific needs:",
      visual: "use-cases"
    }, {
      title: "Get Started",
      content: "You're ready to begin! Click Get Started to launch ConvoCue.",
      visual: "controls"
    }];
  };

  const steps = getSteps();

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    onComplete();
  };

  const handleUseCaseSelect = (useCaseId) => {
    setSelectedUseCase(useCaseId);
    setCurrentStep(2); // Skip to the use case specific steps
  };

  if (!isVisible) return null;

  return (
    <div className={`tutorial-overlay ${isCompactMode ? 'compact' : ''}`}>
      <div className="tutorial-modal">
        <div className="tutorial-header">
          <h2>{steps[currentStep].title}</h2>
          <button className="close-btn" onClick={handleComplete} aria-label="Close tutorial">
            <X size={20} />
          </button>
        </div>

        <div className="tutorial-content">
          <p>{steps[currentStep].content}</p>

          <div className="tutorial-visual" data-visual={steps[currentStep].visual}>
            {/* Welcome screen visualization */}
            {steps[currentStep].visual === 'welcome' && (
              <div className="interface-preview">
                <div className="preview-element">AI Listening</div>
                <div className="preview-element">Context Analysis</div>
                <div className="preview-element">Smart Suggestions</div>
                <div className="preview-element">Privacy First</div>
              </div>
            )}

            {/* Process flow visualization */}
            {steps[currentStep].visual === 'process-flow' && (
              <div className="process-preview">
                <div className="step">Listen</div>
                <ArrowRight size={16} />
                <div className="step">Analyze</div>
                <ArrowRight size={16} />
                <div className="step">Suggest</div>
                <ArrowRight size={16} />
                <div className="step">Learn</div>
              </div>
            )}

            {/* Use cases selection visualization */}
            {steps[currentStep].visual === 'use-cases' && (
              <div className="use-cases-grid">
                {useCases.map((useCase) => {
                  const IconComponent = useCase.icon;
                  return (
                    <button
                      key={useCase.id}
                      className={`use-case-option ${selectedUseCase === useCase.id ? 'selected' : ''}`}
                      onClick={() => handleUseCaseSelect(useCase.id)}
                    >
                      <IconComponent size={24} />
                      <h3>{useCase.title}</h3>
                      <p>{useCase.description}</p>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Use case specific visualizations */}
            {steps[currentStep].visual === 'social-anxiety' && (
              <div className="use-case-visual">
                <Heart className="highlight-icon" size={48} color="#ff6b6b" />
                <p>Gentle, supportive cues</p>
                <p>Confidence building</p>
                <p>Low-pressure responses</p>
              </div>
            )}

            {steps[currentStep].visual === 'professional' && (
              <div className="use-case-visual">
                <Briefcase className="highlight-icon" size={48} color="#4ecdc4" />
                <p>Strategic suggestions</p>
                <p>Professional transitions</p>
                <p>Impactful contributions</p>
              </div>
            )}

            {steps[currentStep].visual === 'cross-cultural' && (
              <div className="use-case-visual">
                <Globe className="highlight-icon" size={48} color="#45b7d1" />
                <p>Cultural sensitivity</p>
                <p>Appropriate phrasing</p>
                <p>Diverse communication</p>
              </div>
            )}

            {steps[currentStep].visual === 'language-learning' && (
              <div className="use-case-visual">
                <GraduationCap className="highlight-icon" size={48} color="#96ceb4" />
                <p>Natural phrasing</p>
                <p>Grammar feedback</p>
                <p>Fluency improvement</p>
              </div>
            )}

            {steps[currentStep].visual === 'relationships' && (
              <div className="use-case-visual">
                <Users className="highlight-icon" size={48} color="#feca57" />
                <p>Emotional intelligence</p>
                <p>Active listening</p>
                <p>Connection building</p>
              </div>
            )}

            {/* Controls visualization */}
            {steps[currentStep].visual === 'controls' && (
              <div className="controls-preview">
                <div className="control-btn">Microphone</div>
                <div className="control-btn">Heartbeat</div>
                <div className="control-btn">Feedback</div>
              </div>
            )}
          </div>
        </div>

        <div className="tutorial-footer">
          <div className="step-indicators">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`step-indicator ${index === currentStep ? 'active' : ''}`}
                onClick={() => setCurrentStep(index)}
              />
            ))}
          </div>

          <div className="navigation">
            <button
              className="nav-btn prev"
              onClick={handlePrev}
              disabled={currentStep === 0}
            >
              <ArrowLeft size={16} />
              Prev
            </button>

            <button
              className="nav-btn next"
              onClick={handleNext}
              disabled={steps[currentStep].visual === 'use-cases' && !selectedUseCase}
            >
              {currentStep < steps.length - 1 ? 'Next' : 'Get Started'}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tutorial;