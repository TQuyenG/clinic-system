// client/src/pages/ConsultationDetailPage.js
// Trang xem chi tiết buổi tư vấn

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import consultationService from '../services/consultationService';
import { 
  FaUserMd, 
  FaUser, 
  FaClock, 
  FaMoneyBillWave,
  FaComments,
  FaStar,
  FaCheckCircle,
  FaTimesCircle,
  FaFileAlt,
  FaPaperclip,
  FaArrowLeft
} from 'react-icons/fa';
import './ConsultationDetailPage.css';

const ConsultationDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [consultation, setConsultation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');

  useEffect(() => {
    fetchConsultationDetail();
  }, [id]);

  const fetchConsultationDetail = async () => {
    try {
      setLoading(true);
      const response = await consultationService.getConsultationById(id);
      
      if (response.data.success) {
        setConsultation(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching consultation:', error);
      alert('Lỗi tải thông tin tư vấn');
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = async () => {
    try {
      await consultationService.startConsultation(id);
      navigate(`/tu-van/${id}/chat`);
    } catch (error) {
      console.error('Error starting consultation:', error);
      alert('Lỗi bắt đầu tư vấn: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleSubmitRating = async () => {
    try {
      await consultationService.rateConsultation(id, { rating, review });
      alert('Đánh giá thành công!');
      setShowRatingModal(false);
      fetchConsultationDetail();
    } catch (error) {
      console.error('Error submitting rating:', error);
      alert('Lỗi gửi đánh giá');
    }
  };

  if (loading) {
    return (
      <div className="consultation-detail-loading">
        <div className="spinner"></div>
        <p>Đang tải thông tin...</p>
      </div>
    );
  }

  if (!consultation) {
    return (
      <div className="consultation-detail-error">
        <h2>Không tìm thấy buổi tư vấn</h2>
        <button onClick={() => navigate(-1)}>Quay lại</button>
      </div>
    );
  }

  const isDoctor = user.role === 'doctor' && user.id === consultation.doctor_id;
  const isPatient = user.role === 'patient' && user.id === consultation.patient_id;
  
  return (
    <div className="consultation-detail-page">
      {/* Header */}
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate(-1)}>
          <FaArrowLeft /> Quay lại
        </button>
        <h1>Chi tiết buổi tư vấn</h1>
      </div>

      {/* Main Info Card */}
      <div className="detail-card main-info-card">
        <div className="card-header">
          <h2>Thông tin tư vấn</h2>
          <span className={`status-badge status-${consultationService.formatStatus(consultation.status).color}`}>
            {consultationService.formatStatus(consultation.status).icon}
            {' '}
            {consultationService.formatStatus(consultation.status).text}
          </span>
        </div>

        <div className="card-body">
          <div className="info-grid">
            <div className="info-item">
              <label>Mã tư vấn:</label>
              <p className="code">{consultation.consultation_code}</p>
            </div>

            <div className="info-item">
              <label>Loại tư vấn:</label>
              <p>
                <span className={`type-badge type-${consultation.consultation_type}`}>
                  {consultationService.formatConsultationType(consultation.consultation_type).icon}
                  {' '}
                  {consultationService.formatConsultationType(consultation.consultation_type).text}
                </span>
              </p>
            </div>

            <div className="info-item">
              <label><FaClock /> Thời gian hẹn:</label>
              <p>{consultationService.formatDateTime(consultation.appointment_time)}</p>
            </div>

            {consultation.started_at && (
              <div className="info-item">
                <label>Thời gian bắt đầu:</label>
                <p>{consultationService.formatDateTime(consultation.started_at)}</p>
              </div>
            )}

            {consultation.ended_at && (
              <div className="info-item">
                <label>Thời gian kết thúc:</label>
                <p>{consultationService.formatDateTime(consultation.ended_at)}</p>
              </div>
            )}

            {consultation.duration_minutes && (
              <div className="info-item">
                <label>Thời lượng:</label>
                <p>{consultation.duration_minutes} phút</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Participants Info */}
      <div className="participants-section">
        {/* Bác sĩ */}
        <div className="detail-card participant-card">
          <div className="card-header">
            <h3><FaUserMd /> Bác sĩ</h3>
          </div>
          <div className="card-body">
            <div className="participant-info">
              <img 
                src={consultation.doctor?.avatar_url || '/default-avatar.png'} 
                alt={consultation.doctor?.full_name}
                className="participant-avatar"
              />
              <div>
                <h4>{consultation.doctor?.full_name}</h4>
                {consultation.doctor?.Doctor?.Specialty && (
                  <p className="specialty">{consultation.doctor.Doctor.Specialty.name}</p>
                )}
                <p className="text-muted">{consultation.doctor?.phone}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bệnh nhân */}
        <div className="detail-card participant-card">
          <div className="card-header">
            <h3><FaUser /> Bệnh nhân</h3>
          </div>
          <div className="card-body">
            <div className="participant-info">
              <img 
                src={consultation.patient?.avatar_url || '/default-avatar.png'} 
                alt={consultation.patient?.full_name}
                className="participant-avatar"
              />
              <div>
                <h4>{consultation.patient?.full_name}</h4>
                <p className="text-muted">{consultation.patient?.phone}</p>
                {consultation.patient?.dob && (
                  <p className="text-muted">
                    Ngày sinh: {new Date(consultation.patient.dob).toLocaleDateString('vi-VN')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Medical Info */}
      <div className="detail-card medical-info-card">
        <div className="card-header">
          <h3><FaFileAlt /> Thông tin y tế</h3>
        </div>
        <div className="card-body">
          <div className="medical-section">
            <h4>Triệu chứng chính</h4>
            <p>{consultation.chief_complaint || 'Không có thông tin'}</p>
          </div>

          {consultation.symptom_duration && (
            <div className="medical-section">
              <h4>Thời gian xuất hiện triệu chứng</h4>
              <p>{consultation.symptom_duration}</p>
            </div>
          )}

          {consultation.medical_history && (
            <div className="medical-section">
              <h4>Tiền sử bệnh</h4>
              <p>{consultation.medical_history}</p>
            </div>
          )}

          {consultation.current_medications && (
            <div className="medical-section">
              <h4>Thuốc đang sử dụng</h4>
              <p>{consultation.current_medications}</p>
            </div>
          )}

          {/* Chẩn đoán (chỉ hiện khi đã hoàn thành) */}
          {consultation.status === 'completed' && consultation.diagnosis && (
            <>
              <div className="medical-section highlight">
                <h4>Chẩn đoán của bác sĩ</h4>
                <p>{consultation.diagnosis}</p>
              </div>

              {consultation.treatment_plan && (
                <div className="medical-section highlight">
                  <h4>Kế hoạch điều trị</h4>
                  <p>{consultation.treatment_plan}</p>
                </div>
              )}

              {consultation.prescription_data && (
                <div className="medical-section highlight">
                  <h4>Đơn thuốc</h4>
                  <pre>{JSON.stringify(consultation.prescription_data, null, 2)}</pre>
                </div>
              )}

              {consultation.need_followup && (
                <div className="medical-section alert-info">
                  <h4>Cần tái khám</h4>
                  {consultation.followup_date && (
                    <p>Ngày tái khám: {consultationService.formatDateTime(consultation.followup_date)}</p>
                  )}
                  {consultation.followup_notes && (
                    <p>Ghi chú: {consultation.followup_notes}</p>
                  )}
                </div>
              )}
            </>
          )}

          {/* File đính kèm */}
          {consultation.attachments && consultation.attachments.length > 0 && (
            <div className="medical-section">
              <h4><FaPaperclip /> File đính kèm từ bệnh nhân</h4>
              <ul className="attachment-list">
                {consultation.attachments.map((file, index) => (
                  <li key={index}>
                    <a href={file.url} target="_blank" rel="noopener noreferrer">
                      {file.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {consultation.doctor_files && consultation.doctor_files.length > 0 && (
            <div className="medical-section">
              <h4><FaPaperclip /> File từ bác sĩ</h4>
              <ul className="attachment-list">
                {consultation.doctor_files.map((file, index) => (
                  <li key={index}>
                    <a href={file.url} target="_blank" rel="noopener noreferrer">
                      {file.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Payment Info */}
      <div className="detail-card payment-info-card">
        <div className="card-header">
          <h3><FaMoneyBillWave /> Thông tin thanh toán</h3>
        </div>
        <div className="card-body">
          <div className="payment-breakdown">
            <div className="payment-item">
              <span>Phí tư vấn cơ bản:</span>
              <span>{consultationService.formatCurrency(consultation.base_fee)}</span>
            </div>
            <div className="payment-item">
              <span>Phí nền tảng (10%):</span>
              <span>{consultationService.formatCurrency(consultation.platform_fee)}</span>
            </div>
            <div className="payment-item total">
              <span>Tổng cộng:</span>
              <span>{consultationService.formatCurrency(consultation.total_fee)}</span>
            </div>
          </div>

          <div className="payment-status">
            <label>Trạng thái thanh toán:</label>
            <span className={`badge payment-${consultation.payment_status}`}>
              {consultation.payment_status === 'paid' ? '✅ Đã thanh toán' :
               consultation.payment_status === 'refunded' ? '🔄 Đã hoàn tiền' :
               '⏳ Chờ thanh toán'}
            </span>
          </div>

          {consultation.payment_method && (
            <div className="payment-method">
              <label>Phương thức:</label>
              <span>{consultation.payment_method.toUpperCase()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Rating (nếu đã hoàn thành) */}
      {consultation.status === 'completed' && (
        <div className="detail-card rating-card">
          <div className="card-header">
            <h3><FaStar /> Đánh giá</h3>
          </div>
          <div className="card-body">
            {consultation.rating ? (
              <>
                <div className="rating-stars">
                  {[1, 2, 3, 4, 5].map(star => (
                    <FaStar 
                      key={star}
                      className={star <= consultation.rating ? 'star-filled' : 'star-empty'}
                    />
                  ))}
                  <span className="rating-value">{consultation.rating}/5</span>
                </div>
                {consultation.review && (
                  <div className="rating-review">
                    <p>{consultation.review}</p>
                    <small className="text-muted">
                      {consultationService.formatDateTime(consultation.reviewed_at)}
                    </small>
                  </div>
                )}
              </>
            ) : (
              isPatient && (
                <button 
                  className="btn-rate"
                  onClick={() => setShowRatingModal(true)}
                >
                  <FaStar /> Đánh giá buổi tư vấn
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="action-buttons-section">
        {consultation.status === 'confirmed' && 
         consultationService.canStartConsultation(consultation.appointment_time) && (
          <button className="btn-primary" onClick={handleStartChat}>
            <FaComments /> Vào phòng tư vấn
          </button>
        )}

        {consultationService.canCancel(consultation.status) && (
          <button 
            className="btn-danger"
            onClick={async () => {
              const reason = prompt('Vui lòng nhập lý do hủy:');
              if (reason) {
                try {
                  await consultationService.cancelConsultation(id, { reason });
                  alert('Đã hủy buổi tư vấn');
                  fetchConsultationDetail();
                } catch (error) {
                  alert('Lỗi hủy tư vấn');
                }
              }
            }}
          >
            <FaTimesCircle /> Hủy tư vấn
          </button>
        )}
      </div>

      {/* Rating Modal */}
      {showRatingModal && (
        <div className="modal-overlay" onClick={() => setShowRatingModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Đánh giá buổi tư vấn</h3>
            
            <div className="modal-body">
              <div className="rating-input">
                <label>Đánh giá chất lượng tư vấn:</label>
                <div className="stars-selector">
                  {[1, 2, 3, 4, 5].map(star => (
                    <FaStar
                      key={star}
                      className={star <= rating ? 'star-filled' : 'star-empty'}
                      onClick={() => setRating(star)}
                    />
                  ))}
                </div>
              </div>

              <div className="review-input">
                <label>Nhận xét (tùy chọn):</label>
                <textarea
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder="Chia sẻ trải nghiệm của bạn..."
                  rows="4"
                />
              </div>
            </div>

            <div className="modal-actions">
              <button onClick={() => setShowRatingModal(false)} className="btn-secondary">
                Hủy
              </button>
              <button onClick={handleSubmitRating} className="btn-primary">
                Gửi đánh giá
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsultationDetailPage;