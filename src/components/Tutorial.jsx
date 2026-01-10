import React, { useState } from 'react';
import { X, ArrowRight, ArrowLeft, Heart, Users, Globe, Briefcase, GraduationCap, Zap } from 'lucide-react';
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

  // Simplified default steps focusing on core value
  const defaultSteps = [
    {
      title: "Welcome to ConvoCue",
      content: "Your AI-powered conversation assistant that listens and suggests thoughtful, context-aware responses. All processing happens locally on your device for complete privacy.",
      visual: "welcome"
    },
    {
      title: "How It Works",
      content: "ConvoCue listens to your conversations and suggests context-aware responses. Start with the 'Social Anxiety' persona for gentle, supportive cues.",
      visual: "process-flow"
    },
    {
      title: "Real-time Assistance",
      content: "ConvoCue provides real-time suggestions to help you navigate conversations with confidence. Just start talking and receive helpful cues.",
      visual: "live-insights"
    }
  ];

  // Get steps based on selected use case
  const getSteps = () => {
    if (selectedUseCase) {
      const useCase = useCases.find(uc => uc.id === selectedUseCase);
      return [...defaultSteps, {
        title: "Get Started",
        content: `You've selected ${useCase.title} as your focus. ConvoCue is ready to assist you!`,
        visual: "controls"
      }];
    }
    return [...defaultSteps, {
      title: "Get Started",
      content: "ConvoCue is ready to help you with your conversations. Click Get Started to begin!",
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
    setCurrentStep(4); // Skip to the use case specific steps (updated index due to new steps)
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

            {/* Live insights visualization */}
            {steps[currentStep].visual === 'live-insights' && (
              <div className="live-preview">
                <div className="live-badge pulse-animation">
                  <Zap size={14} /> Question (Live)
                </div>
                <p>Instant detection before AI finishes</p>
              </div>
            )}

            {/* Intent breakdown visualization */}
            {steps[currentStep].visual === 'intent-breakdown' && (
              <div className="intent-breakdown-grid">
                <div className="intent-card">
                  <div className="intent-badge social">Social</div>
                  <p>Greetings &amp; affirmations</p>
                </div>
                <div className="intent-card">
                  <div className="intent-badge question">Question</div>
                  <p>Inquiries &amp; clarifications</p>
                </div>
                <div className="intent-card">
                  <div className="intent-badge conflict">Conflict</div>
                  <p>Disagreements &amp; tensions</p>
                </div>
                <div className="intent-card">
                  <div className="intent-badge strategic">Strategic</div>
                  <p>Business &amp; planning</p>
                </div>
                <div className="intent-card">
                  <div className="intent-badge action">Action</div>
                  <p>Suggestions &amp; recommendations</p>
                </div>
                <div className="intent-card">
                  <div className="intent-badge empathy">Empathy</div>
                  <p>Emotional support</p>
                </div>
                <div className="intent-card">
                  <div className="intent-badge language">Language</div>
                  <p>Phrasing &amp; clarity</p>
                </div>
              </div>
            )}

            {/* Intent settings visualization */}
            {steps[currentStep].visual === 'intent-settings' && (
              <div className="settings-preview">
                <div className="setting-item-preview">
                  <label>Confidence Threshold</label>
                  <div className="setting-slider-preview">
                    <div className="setting-slider-track">
                      <div className="setting-slider-thumb" style={{left: '50%'}}></div>
                    </div>
                    <span>0.5</span>
                  </div>
                  <p className="setting-desc">Minimum confidence for live intent display</p>
                </div>
                <div className="setting-item-preview">
                  <label>Debounce Window</label>
                  <div className="setting-slider-preview">
                    <div className="setting-slider-track">
                      <div className="setting-slider-thumb" style={{left: '40%'}}></div>
                    </div>
                    <span>800ms</span>
                  </div>
                  <p className="setting-desc">Prevents rapid switching between intents</p>
                </div>
                <div className="setting-item-preview">
                  <label>Sticky Duration</label>
                  <div className="setting-slider-preview">
                    <div className="setting-slider-track">
                      <div className="setting-slider-thumb" style={{left: '60%'}}></div>
                    </div>
                    <span>2000ms</span>
                  </div>
                  <p className="setting-desc">Keep same intent visible before allowing change</p>
                </div>
              </div>
            )}

            {/* Intent filtering visualization */}
            {steps[currentStep].visual === 'intent-filtering' && (
              <div className="filter-preview">
                <div className="intent-toggle-preview">
                  <div className="toggle-switch-preview">
                    <input type="checkbox" id="social-enabled" defaultChecked />
                    <span className="toggle-slider-preview"></span>
                  </div>
                  <div className="intent-info-preview">
                    <div className="intent-header-preview">
                      <span className="glance-badge social">Social</span>
                    </div>
                    <p className="intent-description-preview">Greetings &amp; affirmations</p>
                  </div>
                </div>
                <div className="intent-toggle-preview">
                  <div className="toggle-switch-preview">
                    <input type="checkbox" id="question-enabled" defaultChecked />
                    <span className="toggle-slider-preview"></span>
                  </div>
                  <div className="intent-info-preview">
                    <div className="intent-header-preview">
                      <span className="glance-badge question">Question</span>
                    </div>
                    <p className="intent-description-preview">Inquiries &amp; clarifications</p>
                  </div>
                </div>
                <div className="intent-toggle-preview">
                  <div className="toggle-switch-preview">
                    <input type="checkbox" id="conflict-enabled" defaultChecked />
                    <span className="toggle-slider-preview"></span>
                  </div>
                  <div className="intent-info-preview">
                    <div className="intent-header-preview">
                      <span className="glance-badge conflict">Conflict</span>
                    </div>
                    <p className="intent-description-preview">Disagreements &amp; tensions</p>
                  </div>
                </div>
                <div className="intent-toggle-preview">
                  <div className="toggle-switch-preview">
                    <input type="checkbox" id="action-enabled" />
                    <span className="toggle-slider-preview"></span>
                  </div>
                  <div className="intent-info-preview">
                    <div className="intent-header-preview">
                      <span className="glance-badge action">Action</span>
                    </div>
                    <p className="intent-description-preview">Suggestions &amp; recommendations</p>
                  </div>
                </div>
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