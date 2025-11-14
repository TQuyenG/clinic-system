// Path: client/src/components/consultation/ConsultationRealtimeMonitor.js
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import consultationService from '../../services/consultationService';
import { FaComments, FaClock, FaExclamationTriangle, FaStop } from 'react-icons/fa';

export const ConsultationRealtimeMonitor = ({ activeCount }) => {
  const [activeConsultations, setActiveConsultations] = useState([]);
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const [messages, setMessages] = useState([]);
  const intervalRef = useRef(null);

  useEffect(() => {
    fetchActiveConsultations();
    
    // Auto refresh mỗi 5 giây
    intervalRef.current = setInterval(() => {
      fetchActiveConsultations();
    }, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const fetchActiveConsultations = async () => {
    try {
      const response = await consultationService.getActiveConsultations();
      if (response.data.success) {
        setActiveConsultations(response.data.data.active_consultations);
      }
    } catch (error) {
      console.error('Error fetching active consultations:', error);
    }
  };

  const viewMessages = async (consultationId) => {
    try {
      const response = await consultationService.getConsultationMessages(consultationId);
      if (response.data.success) {
        setMessages(response.data.data.messages);
        setSelectedConsultation(consultationId);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const forceEndConsultation = async (consultationId) => {
    if (!window.confirm('Bạn có chắc muốn kết thúc phiên này?')) return;

    try {
      const reason = prompt('Lý do kết thúc:');
      await consultationService.forceEndConsultation(consultationId, { reason });
      alert('Đã kết thúc phiên tư vấn');
      fetchActiveConsultations();
    } catch (error) {
      console.error('Error ending consultation:', error);
      alert('Lỗi khi kết thúc phiên');
    }
  };

  return (
    <div className="consultation-realtime-monitor">
      <div className="monitor-header">
        <h3>
          <FaComments /> Phiên đang hoạt động ({activeCount})
        </h3>
        <span className="live-indicator">
          <span className="pulse-dot"></span> LIVE
        </span>
      </div>

      {activeConsultations.length === 0 ? (
        <div className="no-active-consultations">
          <p>Không có phiên tư vấn nào đang hoạt động</p>
        </div>
      ) : (
        <div className="active-consultations-grid">
          {activeConsultations.map((consultation) => (
            <div key={consultation.id} className="active-consultation-card">
              <div className="consultation-header">
                <div className="user-info">
                  <img 
                    src={consultation.doctor?.avatar_url || '/default-avatar.png'} 
                    alt={consultation.doctor?.full_name}
                    className="avatar-small"
                  />
                  <div>
                    <strong>{consultation.doctor?.full_name}</strong>
                    <span className="specialty">{consultation.doctor?.Doctor?.Specialty?.name}</span>
                  </div>
                </div>
                
                <div className="patient-info">
                  ↔ {consultation.patient?.full_name}
                </div>
              </div>

              <div className="consultation-meta">
                <div className="meta-item">
                  <FaClock />
                  <span>Bắt đầu: {new Date(consultation.started_at).toLocaleTimeString('vi-VN')}</span>
                </div>
                <div className="meta-item">
                  <span className={`time-left ${consultation.is_overtime ? 'overtime' : ''}`}>
                    Còn: {consultation.time_left_minutes} phút
                  </span>
                </div>
              </div>

              {consultation.is_overtime && (
                <div className="warning-message">
                  <FaExclamationTriangle /> Đã quá thời gian quy định
                </div>
              )}

              <div className="consultation-actions">
                <button 
                  className="btn-view-chat"
                  onClick={() => viewMessages(consultation.id)}
                >
                  <FaComments /> Xem chat
                </button>
                <button 
                  className="btn-end-consultation"
                  onClick={() => forceEndConsultation(consultation.id)}
                >
                  <FaStop /> Kết thúc
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Messages Modal */}
      {selectedConsultation && (
        <div className="messages-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Nội dung chat (Read-only)</h3>
              <button onClick={() => setSelectedConsultation(null)}>✕</button>
            </div>
            <div className="messages-list">
              {messages.map((msg) => (
                <div key={msg.id} className={`message ${msg.sender_type}`}>
                  <strong>{msg.sender?.full_name}</strong>: {msg.content}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


