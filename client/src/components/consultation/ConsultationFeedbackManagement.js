// Path: client/src/components/consultation/ConsultationFeedbackManagement.js
// ============================================================================

import React, { useState, useEffect } from 'react';
import consultationService from '../../services/consultationService';
import { FaStar, FaEye, FaEyeSlash } from 'react-icons/fa';

export const ConsultationFeedbackManagement = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const response = await consultationService.getAllFeedbacks();
      if (response.data.success) {
        setFeedbacks(response.data.data.feedbacks);
      }
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFeedbackStatus = async (feedbackId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'published' ? 'hidden' : 'published';
      await consultationService.toggleFeedbackStatus(feedbackId, {
        status: newStatus,
        admin_note: 'Admin thay đổi trạng thái'
      });
      fetchFeedbacks();
    } catch (error) {
      console.error('Error toggling feedback:', error);
    }
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <FaStar key={i} className={i < rating ? 'star-filled' : 'star-empty'} />
    ));
  };

  return (
    <div className="feedback-management">
      <div className="feedback-header">
        <h3><FaStar /> Quản lý đánh giá</h3>
      </div>

      {loading ? (
        <div className="loading-state">Đang tải...</div>
      ) : (
        <div className="feedbacks-grid">
          {feedbacks.map((feedback) => (
            <div key={feedback.id} className="feedback-card">
              <div className="feedback-header-section">
                <div className="doctor-info">
                  <img 
                    src={feedback.doctor?.avatar_url || '/default-avatar.png'} 
                    alt={feedback.doctor?.full_name}
                  />
                  <div>
                    <strong>{feedback.doctor?.full_name}</strong>
                    <span>{feedback.doctor?.Doctor?.Specialty?.name}</span>
                  </div>
                </div>
                <div className="rating-display">
                  {renderStars(feedback.rating)}
                  <span>{feedback.rating}/5</span>
                </div>
              </div>

              <div className="feedback-content">
                <p className="review-text">{feedback.review}</p>
                <div className="feedback-meta">
                  <span>Bởi: {feedback.patient?.full_name}</span>
                  <span>{new Date(feedback.created_at).toLocaleDateString('vi-VN')}</span>
                </div>
              </div>

              <div className="feedback-actions">
                <span className={`feedback-status ${feedback.status}`}>
                  {feedback.status === 'published' ? 'Đang hiển thị' : 'Đã ẩn'}
                </span>
                <button 
                  className={`btn-toggle-status ${feedback.status === 'published' ? 'btn-hide' : 'btn-show'}`}
                  onClick={() => toggleFeedbackStatus(feedback.id, feedback.status)}
                >
                  {feedback.status === 'published' ? (
                    <><FaEyeSlash /> Ẩn</>
                  ) : (
                    <><FaEye /> Hiện</>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
