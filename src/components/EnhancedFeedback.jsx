import React, { useState, useEffect, useRef } from 'react';
import { ThumbsUp, ThumbsDown, Star, MessageCircle, X, CheckCircle } from 'lucide-react';
import { submitFeedback } from '../utils/feedback';
import { secureLocalStorageGet, secureLocalStorageSet } from '../utils/encryption';

/**
 * Enhanced Feedback Component
 * Provides a more comprehensive feedback system for user suggestions
 */
const EnhancedFeedback = ({ 
  suggestion, 
  persona, 
  culturalContext, 
  transcript, 
  originalInput,
  onSuccess = () => {},
  onError = () => {}
}) => {
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackType, setFeedbackType] = useState(null);
  const [detailedFeedback, setDetailedFeedback] = useState('');
  const [rating, setRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Ref for modal header to manage focus
  const modalHeaderRef = useRef(null);

  // Check if feedback has already been submitted for this suggestion
  const checkIfAlreadySubmitted = async () => {
    const feedbackHistory = await secureLocalStorageGet('convocue_feedback', []);
    return feedbackHistory.some(f =>
      f.suggestion === suggestion &&
      f.transcript === transcript &&
      f.timestamp > Date.now() - 24 * 60 * 60 * 1000 // Within last 24 hours
    );
  };

  // Manage focus when modal opens/closes
  useEffect(() => {
    if (showFeedbackModal && modalHeaderRef.current) {
      // Focus the modal header when modal opens
      modalHeaderRef.current.focus();
    }
  }, [showFeedbackModal]);

  const handleFeedbackSelect = async (type) => {
    const alreadySubmitted = await checkIfAlreadySubmitted();
    if (alreadySubmitted) {
      // If already submitted, just close the modal
      setShowFeedbackModal(false);
      return;
    }

    setFeedbackType(type);
    
    // For simple thumbs up/down, submit immediately
    if (type === 'like' || type === 'dislike') {
      handleSubmit(type, '');
    } else {
      // For detailed feedback, show the modal
      setShowFeedbackModal(true);
    }
  };

  const handleSubmit = async (type = feedbackType, text = detailedFeedback, userRating = rating) => {
    if (!suggestion) return;

    setIsSubmitting(true);

    try {
      // Prepare feedback data
      const feedbackData = {
        suggestion,
        feedbackType: type,
        persona,
        culturalContext,
        transcript,
        originalInput,
        detailedFeedback: text,
        rating: userRating,
        timestamp: Date.now()
      };

      // Submit feedback - pass the feedback data as a single object
      await submitFeedback({
        suggestion,
        feedbackType: type,
        persona,
        culturalContext,
        transcript,
        originalInput
      });

      // Store detailed feedback separately if provided
      // Purpose: For client-side analytics and offline review of detailed feedback
      if (text || userRating > 0) {
        const detailedFeedbackHistory = await secureLocalStorageGet('convocue_detailed_feedback', []);
        detailedFeedbackHistory.push({
          ...feedbackData,
          detailedFeedback: text,
          rating: userRating
        });

        // Keep only the last 100 detailed feedback entries
        const trimmedHistory = detailedFeedbackHistory.slice(-100);
        await secureLocalStorageSet('convocue_detailed_feedback', trimmedHistory);
      }

      setSubmitted(true);
      onSuccess();

      // Close modal after submission
      setTimeout(() => {
        setShowFeedbackModal(false);
        setSubmitted(false);
        setFeedbackType(null);
        setDetailedFeedback('');
        setRating(0);
        setIsSubmitting(false);
      }, 1500);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      onError(error);
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setShowFeedbackModal(false);
    setFeedbackType(null);
    setDetailedFeedback('');
    setRating(0);
  };

  // Simple feedback buttons that appear inline
  if (!showFeedbackModal && !submitted) {
    return (
      <div className="enhanced-feedback-inline">
        <button
          className="feedback-btn feedback-btn--sm feedback-btn--like"
          onClick={() => handleFeedbackSelect('like')}
          title="This suggestion was helpful"
          aria-label="Like this suggestion"
        >
          <ThumbsUp size={16} />
        </button>
        <button
          className="feedback-btn feedback-btn--sm feedback-btn--dislike"
          onClick={() => handleFeedbackSelect('dislike')}
          title="This suggestion was not helpful"
          aria-label="Dislike this suggestion"
        >
          <ThumbsDown size={16} />
        </button>
        <button
          className="feedback-btn feedback-btn--sm feedback-btn--detailed"
          onClick={() => handleFeedbackSelect('detailed')}
          title="Provide detailed feedback"
          aria-label="Provide detailed feedback"
        >
          <MessageCircle size={16} />
        </button>
      </div>
    );
  }

  // Feedback submission modal
  if (showFeedbackModal && !submitted) {
    return (
      <div className="enhanced-feedback-modal-overlay">
        <div className="enhanced-feedback-modal">
          <div className="modal-header" ref={modalHeaderRef} tabIndex="-1">
            <h3>How was this suggestion?</h3>
            <button
              className="close-btn"
              onClick={handleCancel}
              aria-label="Close feedback form"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="modal-body">
            <div className="suggestion-preview">
              <p>"{suggestion}"</p>
            </div>
            
            <div className="rating-section">
              <h4>Rate your experience</h4>
              <div className="star-rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    className={`star-btn ${rating >= star ? 'active' : ''}`}
                    onClick={() => setRating(star)}
                    aria-label={`Rate ${star} stars`}
                  >
                    <Star 
                      size={24} 
                      fill={rating >= star ? "#fbbf24" : "transparent"} 
                      color={rating >= star ? "#fbbf24" : "#d1d5db"} 
                    />
                  </button>
                ))}
              </div>
            </div>
            
            <div className="feedback-type-selection">
              <h4>What kind of feedback?</h4>
              <div className="feedback-type-buttons">
                <button
                  className={`feedback-type-btn ${feedbackType === 'very_helpful' ? 'selected' : ''}`}
                  onClick={() => setFeedbackType('very_helpful')}
                >
                  Very Helpful
                </button>
                <button
                  className={`feedback-type-btn ${feedbackType === 'somewhat_helpful' ? 'selected' : ''}`}
                  onClick={() => setFeedbackType('somewhat_helpful')}
                >
                  Somewhat Helpful
                </button>
                <button
                  className={`feedback-type-btn ${feedbackType === 'not_helpful' ? 'selected' : ''}`}
                  onClick={() => setFeedbackType('not_helpful')}
                >
                  Not Helpful
                </button>
                <button
                  className={`feedback-type-btn ${feedbackType === 'misleading' ? 'selected' : ''}`}
                  onClick={() => setFeedbackType('misleading')}
                >
                  Misleading
                </button>
                <button
                  className={`feedback-type-btn ${feedbackType === 'inappropriate' ? 'selected' : ''}`}
                  onClick={() => setFeedbackType('inappropriate')}
                >
                  Inappropriate
                </button>
              </div>
            </div>
            
            <div className="detailed-feedback-section">
              <h4>Tell us more (optional)</h4>
              <textarea
                value={detailedFeedback}
                onChange={(e) => setDetailedFeedback(e.target.value)}
                placeholder="What could we improve? What did you like? Any specific aspects?"
                rows={4}
              />
            </div>
          </div>
          
          <div className="modal-footer">
            <button 
              className="btn btn-secondary" 
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              className="btn btn-primary" 
              onClick={() => handleSubmit()}
              disabled={isSubmitting || !feedbackType}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (submitted) {
    return (
      <div className="enhanced-feedback-success">
        <CheckCircle size={24} color="#10B981" />
        <p>Thank you for your feedback!</p>
      </div>
    );
  }

  return null;
};

export default EnhancedFeedback;