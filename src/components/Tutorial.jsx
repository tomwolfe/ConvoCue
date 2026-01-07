import React, { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowLeft } from 'lucide-react';
import './Tutorial.css';

const Tutorial = ({ onComplete, isCompactMode }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const steps = [
    {
      title: "Welcome to ConvoCue",
      content: "Your AI-powered conversation assistant that listens and suggests thoughtful responses.",
      visual: "main-interface"
    },
    {
      title: "How It Works",
      content: "ConvoCue listens to your conversations and suggests context-aware responses. All processing happens locally on your device for privacy.",
      visual: "process-flow"
    },
    {
      title: "Choose Your Mode",
      content: "Select from different conversation modes like Social Anxiety support, Professional settings, or Cross-cultural communication.",
      visual: "personas"
    },
    {
      title: "Personalized for You",
      content: "ConvoCue learns from your feedback. Use the Thumbs Up or Thumbs Down icons to help the AI understand your preferred communication style over time.",
      visual: "feedback"
    },
    {
      title: "Get Started",
      content: "Click the microphone to start listening, or use the 'Heartbeat' mode for continuous conversation assistance.",
      visual: "controls"
    }
  ];

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
            {/* Visual representation of the current step */}
            {steps[currentStep].visual === 'main-interface' && (
              <div className="interface-preview">
                <div className="preview-element">Status indicator</div>
                <div className="preview-element">Transcript display</div>
                <div className="preview-element">Suggestion card</div>
                <div className="preview-element">Control buttons</div>
              </div>
            )}
            {steps[currentStep].visual === 'process-flow' && (
              <div className="process-preview">
                <div className="step">Listen</div>
                <ArrowRight size={16} />
                <div className="step">Analyze</div>
                <ArrowRight size={16} />
                <div className="step">Suggest</div>
              </div>
            )}
            {steps[currentStep].visual === 'personas' && (
              <div className="personas-preview">
                <div className="persona-option">Social Anxiety</div>
                <div className="persona-option">Professional</div>
                <div className="persona-option">Cross-cultural</div>
              </div>
            )}
            {steps[currentStep].visual === 'controls' && (
              <div className="controls-preview">
                <div className="control-btn">Microphone</div>
                <div className="control-btn">Heartbeat</div>
              </div>
            )}
            {steps[currentStep].visual === 'feedback' && (
              <div className="feedback-preview">
                <div className="feedback-item">👍 Learn what you like</div>
                <div className="feedback-item">👎 Avoid what you don't</div>
                <div className="feedback-item">✨ Adaptive experience</div>
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