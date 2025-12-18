// client/src/pages/ConsultationDetailPage.js
// ✅ TRANG CHI TIẾT TƯ VẤN - COMPACT MEDICAL THEME

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import consultationService from '../services/consultationService';
import paymentService from '../services/paymentService';
import { 
  FaUserMd, FaUser, FaClock, FaMoneyBillWave, FaComments, FaStar,
  FaCheckCircle, FaTimesCircle, FaFileAlt, FaPaperclip, FaArrowLeft,
  FaVideo, FaCalendarCheck, FaExclamationTriangle
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
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

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
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = async () => {
    try {
      await consultationService.startConsultation(id);
      if (consultation.consultation_type === 'video') {
        navigate(`/tu-van/video/${id}`);
      } else {
        navigate(`/tu-van/${id}/chat`);
      }
    } catch (error) {
      alert('Lỗi bắt đầu: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleSubmitRating = async () => {
    try {
      await consultationService.rateConsultation(id, { rating, review });
      alert('Đánh giá thành công!');
      setShowRatingModal(false);
      fetchConsultationDetail();
    } catch (error) {
      alert('Lỗi gửi đánh giá');
    }
  };

  const handleCreatePayment = async (method) => {
    if (!consultation || !consultation.id) return;
    try {
      setPaymentLoading(true);
      const payload = { consultation_id: consultation.id, method };
      const res = await paymentService.createConsultationPayment(payload);
      // Nếu API trả về đường dẫn thanh toán, chuyển hướng
      const payUrl = res?.data?.data?.payment_url || res?.data?.payment_url;
      if (payUrl) {
        window.location.href = payUrl;
        return;
      }
      // Nếu không có URL, có thể trả về payment object -> show success/toast and refresh
      if (res?.data?.success) {
        alert('Tạo yêu cầu thanh toán thành công.');
        setShowPaymentModal(false);
        fetchConsultationDetail();
      }
    } catch (err) {
      console.error('Payment error:', err);
      alert(err.response?.data?.message || 'Lỗi tạo giao dịch thanh toán');
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) return <div className="cdp-loading"><div className="cdp-spinner"></div><p>Đang tải dữ liệu...</p></div>;
  if (!consultation) return <div className="cdp-error"><p>Không tìm thấy buổi tư vấn</p><button className="cdp-btn" onClick={() => navigate(-1)}>Quay lại</button></div>;

  const isPatient = user.role === 'patient' && user.id === consultation.patient_id;
  // Normalize attachments which may be stored as JSON string or array from backend
  const attachments = (() => {
    const a = consultation.attachments;
    if (!a) return [];
    if (Array.isArray(a)) return a;
    try {
      const parsed = typeof a === 'string' ? JSON.parse(a) : a;
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn('Could not parse consultation.attachments', e);
      return [];
    }
  })();

  const doctorFiles = (() => {
    const d = consultation.doctor_files;
    if (!d) return [];
    if (Array.isArray(d)) return d;
    try {
      const parsed = typeof d === 'string' ? JSON.parse(d) : d;
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn('Could not parse consultation.doctor_files', e);
      return [];
    }
  })();
  
  return (
    <div className="cdp-page">
      {/* Header */}
      <div className="cdp-header">
        <button className="cdp-btn-back" onClick={() => navigate(-1)}>
          <FaArrowLeft />
        </button>
        <div className="cdp-header-title">
          <h1>Chi tiết tư vấn</h1>
          <span className="cdp-code-badge">{consultation.consultation_code}</span>
        </div>
      </div>

      <div className="cdp-container">
        {/* Left Column: Main Info */}
        <div className="cdp-col-main">
          
          {/* Status Card */}
          <div className="cdp-card">
            <div className="cdp-card-header">
              <h3><FaCalendarCheck /> Thông tin chung</h3>
              <span className={`cdp-status-badge ${consultation.status}`}>
                 {consultation.status === 'completed' ? 'Hoàn thành' : 
                  consultation.status === 'pending' ? 'Chờ duyệt' :
                  consultation.status === 'confirmed' ? 'Đã xác nhận' :
                  consultation.status === 'cancelled' ? 'Đã hủy' : consultation.status}
              </span>
            </div>
            <div className="cdp-card-body">
              <div className="cdp-info-grid">
                 <div className="cdp-info-item">
                    <label>Loại hình</label>
                    <span className={`cdp-type-badge ${consultation.consultation_type}`}>
                      {consultation.consultation_type === 'chat' ? <FaComments/> : <FaVideo/>} 
                      {consultation.consultation_type.toUpperCase()}
                    </span>
                 </div>
                 <div className="cdp-info-item">
                    <label>Thời gian hẹn</label>
                    <strong>{new Date(consultation.appointment_time).toLocaleString('vi-VN')}</strong>
                 </div>
                 <div className="cdp-info-item">
                    <label>Thời lượng</label>
                    <span>{consultation.duration_minutes} phút</span>
                 </div>
                 {consultation.started_at && (
                   <div className="cdp-info-item">
                      <label>Bắt đầu lúc</label>
                      <span>{new Date(consultation.started_at).toLocaleTimeString('vi-VN')}</span>
                   </div>
                 )}
              </div>
            </div>
          </div>

          {/* Participants */}
          <div className="cdp-grid-2">
            <div className="cdp-card">
              <div className="cdp-card-header sm"><h4><FaUserMd /> Bác sĩ</h4></div>
              <div className="cdp-user-row">
                <img src={consultation.doctor?.avatar_url || '/default-avatar.png'} alt="Doctor" className="cdp-avatar"/>
                <div className="cdp-user-info">
                  <strong>{consultation.doctor?.full_name}</strong>
                  <span>{consultation.doctor?.Doctor?.Specialty?.name}</span>
                  <small>{consultation.doctor?.phone}</small>
                </div>
              </div>
            </div>
            <div className="cdp-card">
              <div className="cdp-card-header sm"><h4><FaUser /> Bệnh nhân</h4></div>
              <div className="cdp-user-row">
                <img src={consultation.patient?.avatar_url || '/default-avatar.png'} alt="Patient" className="cdp-avatar"/>
                <div className="cdp-user-info">
                  <strong>{consultation.patient?.full_name}</strong>
                  <span>{consultation.patient?.email}</span>
                  <small>{consultation.patient?.phone}</small>
                </div>
              </div>
            </div>
          </div>

          {/* Medical Info */}
          <div className="cdp-card">
            <div className="cdp-card-header">
              <h3><FaFileAlt /> Hồ sơ y tế</h3>
            </div>
            <div className="cdp-card-body">
              <div className="cdp-medical-section">
                <label>Triệu chứng chính</label>
                <p>{consultation.chief_complaint || 'Chưa cập nhật'}</p>
              </div>
              
              {consultation.medical_history && (
                <div className="cdp-medical-section">
                  <label>Tiền sử bệnh</label>
                  <p>{consultation.medical_history}</p>
                </div>
              )}

              {/* Diagnosis (Only if completed) */}
              {consultation.status === 'completed' && consultation.diagnosis && (
                <div className="cdp-diagnosis-box">
                  <h4><FaCheckCircle /> Kết luận của bác sĩ</h4>
                  <div className="cdp-diagnosis-item">
                    <label>Chẩn đoán:</label>
                    <p>{consultation.diagnosis}</p>
                  </div>
                  {consultation.treatment_plan && (
                    <div className="cdp-diagnosis-item">
                      <label>Hướng điều trị:</label>
                      <p>{consultation.treatment_plan}</p>
                    </div>
                  )}
                  {consultation.prescription_data && (
                     <div className="cdp-diagnosis-item">
                       <label>Đơn thuốc:</label>
                       <pre className="cdp-pre">{JSON.stringify(consultation.prescription_data, null, 2)}</pre>
                     </div>
                  )}
                </div>
              )}

              {/* Attachments */}
              {(attachments.length > 0 || doctorFiles.length > 0) && (
                <div className="cdp-files-section">
                   <label><FaPaperclip /> File đính kèm</label>
                   <div className="cdp-file-list">
                      {attachments.map((f, i) => (
                        <a key={`p-${i}`} href={f.url} target="_blank" rel="noreferrer" className="cdp-file-link">
                          {f.name || f.filename || `file-${i+1}`} (BN)
                        </a>
                      ))}
                      {doctorFiles.map((f, i) => (
                        <a key={`d-${i}`} href={f.url} target="_blank" rel="noreferrer" className="cdp-file-link doc">
                          {f.name || f.filename || `file-${i+1}`} (BS)
                        </a>
                      ))}
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Payment & Actions */}
        <div className="cdp-col-side">
          {/* Payment */}
          <div className="cdp-card">
            <div className="cdp-card-header">
              <h3><FaMoneyBillWave /> Thanh toán</h3>
            </div>
            <div className="cdp-card-body">
                  <div className="cdp-payment-row">
                    <span>Phí cơ bản:</span>
                    <strong>{parseFloat(consultation.base_fee || 0).toLocaleString()}đ</strong>
                  </div>
                  <div className="cdp-payment-row total">
                    <span>Tổng cộng:</span>
                    <strong className="cdp-text-primary">{parseFloat(consultation.total_fee || 0).toLocaleString()}đ</strong>
                  </div>
                  <div className="cdp-payment-status">
                    {/* Hỗ trợ cả dạng cũ (payment_status) hoặc record Payment */}
                    {(() => {
                      const isPaid = (consultation.Payment && consultation.Payment.status === 'paid') || 
                                     consultation.payment_status === 'paid_online' || 
                                     consultation.payment_status === 'paid_at_clinic';
                      const method = consultation.Payment?.method || consultation.payment_method || '';
                      return (
                        <>
                          <span className={`cdp-pay-badge ${isPaid ? 'paid' : 'unpaid'}`}>
                            {consultation.payment_status === 'paid_online' ? 'Đã TT Online' : 
                             consultation.payment_status === 'paid_at_clinic' ? 'Đã TT tại PK' : 
                             consultation.payment_status === 'not_required' ? 'Miễn phí' :
                             isPaid ? 'Đã thanh toán' : 'Chưa thanh toán'}
                          </span>
                          <small>{method?.toUpperCase()}</small>
                          {!isPaid && consultation.status !== 'cancelled' && consultation.status !== 'completed' && (
                            <div style={{marginTop:10}}>
                              <button className="cdp-btn cdp-btn-primary" onClick={() => setShowPaymentModal(true)}>Thanh toán</button>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {/* Nếu backend cung cấp payment_due_at, hiển thị countdown */}
                  {consultation.payment_due_at && (
                    <div className="cdp-payment-due">
                      <small>Hạn thanh toán: {new Date(consultation.payment_due_at).toLocaleString('vi-VN')}</small>
                      <div>
                        <small> Còn lại: {(() => {
                          const due = new Date(consultation.payment_due_at).getTime();
                          const now = Date.now();
                          const diff = due - now;
                          if (diff <= 0) return 'Đã quá hạn';
                          const hours = Math.floor(diff / 3600000);
                          const mins = Math.floor((diff % 3600000) / 60000);
                          return hours > 0 ? `${hours} giờ ${mins} phút` : `${mins} phút`;
                        })()}</small>
                      </div>
                    </div>
                  )}
            </div>
          </div>

          {/* Rating */}
          {consultation.status === 'completed' && (
            <div className="cdp-card">
              <div className="cdp-card-header">
                <h3><FaStar /> Đánh giá</h3>
              </div>
              <div className="cdp-card-body centered">
                {consultation.rating ? (
                  <>
                    <div className="cdp-stars-display">
                      {[...Array(5)].map((_, i) => (
                        <FaStar key={i} className={i < consultation.rating ? 'star filled' : 'star'} />
                      ))}
                    </div>
                    <p className="cdp-review-text">"{consultation.review}"</p>
                  </>
                ) : (
                  isPatient && (
                    <button className="cdp-btn cdp-btn-warning" onClick={() => setShowRatingModal(true)}>
                      Viết đánh giá
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="cdp-actions">
            {consultation.status === 'confirmed' && 
             consultationService.canStartConsultation(consultation.appointment_time) && (
              <button className="cdp-btn cdp-btn-primary full" onClick={handleStartChat}>
                 {consultation.consultation_type === 'video' ? <FaVideo /> : <FaComments />} Vào phòng
              </button>
            )}

            {consultationService.canCancel(consultation.status) && (
              <button className="cdp-btn cdp-btn-danger full" onClick={async () => {
                  const r = prompt('Lý do hủy:');
                  if (r) {
                    try { await consultationService.cancelConsultation(id, { reason: r }); fetchConsultationDetail(); }
                    catch { alert('Lỗi hủy'); }
                  }
                }}>
                <FaTimesCircle /> Hủy tư vấn
              </button>
            )}
          </div>
        </div>
      </div>

      {/* RATING MODAL */}
      {/* PAYMENT MODAL */}
      {showPaymentModal && (
        <div className="cdp-modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="cdp-modal" onClick={e => e.stopPropagation()}>
            <div className="cdp-modal-header">
              <h3>Chọn phương thức thanh toán</h3>
              <button onClick={() => setShowPaymentModal(false)}><FaTimesCircle/></button>
            </div>
            <div className="cdp-modal-body">
              <button className="cdp-btn" disabled={paymentLoading} onClick={() => handleCreatePayment('vnpay')}>VNPay / ATM</button>
              <button className="cdp-btn" disabled={paymentLoading} onClick={() => handleCreatePayment('momo')}>Ví MoMo</button>
            </div>
            <div className="cdp-modal-footer">
              <button className="cdp-btn cdp-btn-secondary" onClick={() => setShowPaymentModal(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
      {showRatingModal && (
        <div className="cdp-modal-overlay" onClick={() => setShowRatingModal(false)}>
          <div className="cdp-modal" onClick={e => e.stopPropagation()}>
            <div className="cdp-modal-header">
              <h3>Đánh giá dịch vụ</h3>
              <button onClick={() => setShowRatingModal(false)}><FaTimesCircle/></button>
            </div>
            <div className="cdp-modal-body">
              <div className="cdp-star-input">
                {[1, 2, 3, 4, 5].map(s => (
                  <FaStar 
                    key={s} 
                    className={`star-lg ${s <= rating ? 'active' : ''}`}
                    onClick={() => setRating(s)}
                  />
                ))}
              </div>
              <textarea 
                className="cdp-textarea" 
                placeholder="Nhập nhận xét của bạn..." 
                value={review}
                onChange={e => setReview(e.target.value)}
                rows="4"
              />
            </div>
            <div className="cdp-modal-footer">
              <button className="cdp-btn cdp-btn-secondary" onClick={() => setShowRatingModal(false)}>Hủy</button>
              <button className="cdp-btn cdp-btn-primary" onClick={handleSubmitRating}>Gửi đánh giá</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsultationDetailPage;