// client/src/pages/ConsultationDetailPage.js
// ✅ TRANG CHI TIẾT TƯ VẤN - COMPACT MEDICAL THEME

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import consultationService from '../services/consultationService';
import paymentService from '../services/paymentService';
import axios from 'axios';
import AppointmentRatingModal from '../components/appointments/AppointmentRatingModal';
import { 
  FaUserMd, FaUser, FaClock, FaMoneyBillWave, FaComments, FaStar,
  FaCheckCircle, FaTimesCircle, FaFileAlt, FaPaperclip, FaArrowLeft,
  FaVideo, FaCalendarCheck, FaExclamationTriangle, FaChevronDown, FaNotesMedical,
  FaInfoCircle, FaCreditCard, FaHospital
} from 'react-icons/fa';
import './ConsultationDetailPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const ConsultationDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const autoOpenResultRef = useRef(false);
  
  const [consultation, setConsultation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showRatingMenu, setShowRatingMenu] = useState(false);
  const [ratingTarget, setRatingTarget] = useState('consultation');
  const [ratingMode, setRatingMode] = useState('submit');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [hasConsultationRating, setHasConsultationRating] = useState(false);
  const [hasDoctorRating, setHasDoctorRating] = useState(false);
  const [doctorRating, setDoctorRating] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    fetchConsultationDetail();
  }, [id]);

  // Auto-open result panel if coming from consultation detail with ?openResult=1
  useEffect(() => {
    if (!consultation || autoOpenResultRef.current) return;
    if (searchParams.get('openResult') !== '1') return;
    
    // Compute canWriteResult here to avoid hook dependency issues
    const isDoctorOwner = user?.role === 'doctor' && (
      user?.id === consultation.doctor_id ||
      user?.id === consultation.doctor?.id ||
      user?.id === consultation.doctor?.user_id
    );
    const canWrite = isDoctorOwner && ['confirmed', 'in_progress'].includes(consultation.status);
    if (!canWrite) return;

    autoOpenResultRef.current = true;
    handleStartChat();
  }, [consultation, searchParams, user?.id, user?.role]);

  const fetchConsultationDetail = async () => {
    try {
      setLoading(true);
      const response = await consultationService.getConsultationById(id);
      if (response.data.success) {
        const consultationData = response.data.data;
        setConsultation(consultationData);

        const existingConsultationRating = Boolean(consultationData.rating);
        setHasConsultationRating(existingConsultationRating);

        const doctorId = consultationData.doctor_id || consultationData.doctor?.id || consultationData.doctor?.user_id;
        if (user?.role === 'patient' && doctorId) {
          try {
            const doctorReviewRes = await axios.get(`${API_URL}/statistics/doctor/${doctorId}/my-review`, {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            const existingDoctorReview = doctorReviewRes.data?.data?.review || null;
            setDoctorRating(existingDoctorReview);
            setHasDoctorRating(Boolean(existingDoctorReview));
          } catch (doctorReviewError) {
            setDoctorRating(null);
            setHasDoctorRating(false);
          }
        } else {
          setDoctorRating(null);
          setHasDoctorRating(false);
        }
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
      // If doctor entering and can write results, include flag to open result editor from room
      const isDoctorEntering = user?.role === 'doctor' && (user?.id === consultation.doctor_id || user?.id === consultation.doctor?.id || user?.id === consultation.doctor?.user_id);
      const roomPath = consultation.consultation_type === 'video' ? `/tu-van/video/${id}` : `/tu-van/${id}/chat`;
      const suffix = isDoctorEntering && (['confirmed', 'in_progress'].includes(consultation.status)) ? '?openResult=1' : '';
      navigate(roomPath + suffix);
    } catch (error) {
      alert('Lỗi bắt đầu: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleSubmitRating = async (ratingData) => {
    if (!consultation) return;

    try {
      setIsSubmittingRating(true);
      if (ratingTarget === 'doctor') {
        const doctorId = consultation.doctor_id || consultation.doctor?.id || consultation.doctor?.user_id;
        if (!doctorId) {
          alert('Không tìm thấy bác sĩ để đánh giá.');
          return;
        }

        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        const response = hasDoctorRating
          ? await axios.put(`${API_URL}/statistics/doctor/${doctorId}/reviews`, ratingData, { headers })
          : await axios.post(`${API_URL}/statistics/doctor/${doctorId}/reviews`, ratingData, { headers });

        if (response.data?.success) {
          alert('Đánh giá bác sĩ thành công!');
          setHasDoctorRating(true);
          setDoctorRating(response.data?.data?.review || { ...ratingData, doctor_id: doctorId });
        } else {
          alert(response.data?.message || 'Lỗi gửi đánh giá bác sĩ');
          return;
        }
      } else {
        const response = await consultationService.submitConsultationFeedback({
          consultation_id: consultation.id,
          rating: ratingData.rating,
          review: ratingData.review
        });

        if (response.data?.success) {
          alert('Đánh giá tư vấn thành công!');
          setHasConsultationRating(true);
        } else {
          alert(response.data?.message || 'Lỗi gửi đánh giá tư vấn');
          return;
        }
      }

      setShowRatingModal(false);
      await fetchConsultationDetail();
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi gửi đánh giá');
    } finally {
      setIsSubmittingRating(false);
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

  const isPatientOwner = user?.role === 'patient' && (
    user?.id === consultation.patient_id ||
    user?.id === consultation.patient?.id ||
    user?.id === consultation.patient?.user_id
  );
  const isDoctorOwner = user?.role === 'doctor' && (
    user?.id === consultation.doctor_id ||
    user?.id === consultation.doctor?.id ||
    user?.id === consultation.doctor?.user_id
  );
  const canJoinRoom = consultation.status === 'confirmed' && consultationService.canStartConsultation(consultation.appointment_time);
  const canWriteResult = isDoctorOwner && ['confirmed', 'in_progress'].includes(consultation.status);

  const statusMeta = (() => {
    switch (consultation.status) {
      case 'pending':
        return { className: 'pending', label: 'Chờ duyệt' };
      case 'pending_payment':
        return { className: 'pending', label: 'Chờ thanh toán' };
      case 'confirmed':
        return { className: 'confirmed', label: 'Đã xác nhận' };
      case 'in_progress':
        return { className: 'in-progress', label: 'Đang tư vấn' };
      case 'completed':
        return { className: 'completed', label: 'Hoàn thành' };
      case 'cancelled':
        return { className: 'cancelled', label: 'Đã hủy' };
      case 'rejected':
        return { className: 'cancelled', label: 'Từ chối' };
      default:
        return { className: 'pending', label: consultation.status || 'Không rõ' };
    }
  })();

  const paymentMeta = (() => {
    if ((consultation.Payment && consultation.Payment.status === 'paid') || consultation.payment_status === 'paid_online') {
      return { className: 'payment-paid', text: 'Đã thanh toán online', icon: <FaCreditCard /> };
    }
    if (consultation.payment_status === 'paid_at_clinic') {
      return { className: 'payment-at-clinic', text: 'Đã thanh toán tại quầy', icon: <FaHospital /> };
    }
    if (consultation.payment_status === 'not_required') {
      return { className: 'payment-free', text: 'Miễn phí', icon: <FaCheckCircle /> };
    }
    if (consultation.payment_status === 'refunded') {
      return { className: 'payment-refunded', text: 'Đã hoàn tiền', icon: <FaMoneyBillWave /> };
    }
    return { className: 'payment-pending', text: 'Chưa thanh toán', icon: <FaExclamationTriangle /> };
  })();

  const serviceLabel = consultation?.package?.name || consultation?.consultation_pricing?.name || consultation?.specialty_name || 'Tư vấn trực tuyến';
  const serviceCode = consultation?.consultation_code || consultation?.id;

  const ratingModalPayload = ratingTarget === 'doctor' && doctorRating
    ? {
        ...consultation,
        code: serviceCode,
        rating: doctorRating.rating,
        review: doctorRating.review
      }
    : {
        ...consultation,
        code: serviceCode,
        service_name: serviceLabel
      };

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
      <div className="cdp-wrapper">
        {/* Header */}
        <div className="cdp-header">
          <button className="cdp-btn-back" onClick={() => navigate(-1)}>
            <FaArrowLeft />
            Quay lại
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
              <h3><FaCalendarCheck /> Thông tin lịch hẹn</h3>
              <span className={`cdp-status-badge ${statusMeta.className}`}>
                {statusMeta.label}
              </span>
            </div>
            <div className="cdp-card-body">
              <div className="cdp-info-grid">
                  <div className="cdp-info-item">
                    <label>Dịch vụ</label>
                    <strong>{serviceLabel}</strong>
                  </div>
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
              <div className="cdp-card-body">
                <div className="cdp-info-grid">
                  <div className="cdp-info-item">
                    <label>Họ và tên</label>
                    <strong>{consultation.patient?.full_name || 'N/A'}</strong>
                  </div>
                  <div className="cdp-info-item">
                    <label>Email</label>
                    <span>{consultation.patient?.email || 'N/A'}</span>
                  </div>
                  <div className="cdp-info-item">
                    <label>Điện thoại</label>
                    <span>{consultation.patient?.phone || 'N/A'}</span>
                  </div>
                  <div className="cdp-info-item">
                    <label>Sinh nhật</label>
                    <span>{consultation.patient?.dob ? new Date(consultation.patient.dob).toLocaleDateString('vi-VN') : 'N/A'}</span>
                  </div>
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
                  <div className="cdp-payment-row">
                    <span>Phương thức:</span>
                    <strong>{(consultation.Payment?.method || consultation.payment_method || 'N/A').toUpperCase()}</strong>
                  </div>
                  <div className="cdp-payment-status">
                    <span className={`cdp-pay-badge ${paymentMeta.className}`}>
                      {paymentMeta.icon}
                      {paymentMeta.text}
                    </span>
                    {paymentMeta.className === 'payment-pending' && consultation.status !== 'cancelled' && consultation.status !== 'completed' && (
                      <div style={{ marginTop: 10 }}>
                        <button className="cdp-btn cdp-btn-primary" onClick={() => setShowPaymentModal(true)}>Thanh toán</button>
                      </div>
                    )}
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
          {consultation.status === 'completed' && isPatientOwner && (
            <div className="cdp-card">
              <div className="cdp-card-header">
                <h3><FaStar /> {hasConsultationRating || hasDoctorRating ? 'Xem đánh giá' : 'Đánh giá'}</h3>
              </div>
              <div className="cdp-card-body">
                <p className="cdp-rating-text">
                  {hasConsultationRating || hasDoctorRating
                    ? 'Bạn có thể xem đánh giá buổi tư vấn hoặc đánh giá bác sĩ.'
                    : 'Vui lòng chia sẻ cảm nhận của bạn để giúp chúng tôi cải thiện dịch vụ.'}
                </p>

                <div className="cdp-rating-menu-wrap">
                  <button
                    className="cdp-btn cdp-btn-warning full"
                    onClick={() => setShowRatingMenu(prev => !prev)}
                  >
                    <FaStar /> {hasConsultationRating || hasDoctorRating ? 'Xem đánh giá' : 'Viết đánh giá'} <FaChevronDown />
                  </button>

                  {showRatingMenu && (
                    <div className="cdp-rating-dropdown">
                      <button
                        className="cdp-rating-menu-item"
                        onClick={() => {
                          setShowRatingMenu(false);
                          setRatingTarget('consultation');
                          setRatingMode(hasConsultationRating ? 'view' : 'submit');
                          setShowRatingModal(true);
                        }}
                      >
                        <FaStar /> {hasConsultationRating ? 'Xem đánh giá Tư vấn' : 'Đánh giá Tư vấn'}
                      </button>
                      <button
                        className="cdp-rating-menu-item"
                        onClick={() => {
                          setShowRatingMenu(false);
                          setRatingTarget('doctor');
                          setRatingMode(hasDoctorRating ? 'view' : 'submit');
                          setShowRatingModal(true);
                        }}
                      >
                        <FaUserMd /> {hasDoctorRating ? 'Xem đánh giá Bác sĩ' : 'Đánh giá Bác sĩ'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Doctor Specific Actions */}
          {(isDoctorOwner || user?.role === 'admin') && (
            <div className="cdp-card">
              <div className="cdp-card-header">
                <h3><FaNotesMedical /> Kết quả khám</h3>
              </div>
              <div className="cdp-card-body">
                <button
                  type="button"
                  onClick={handleStartChat}
                  className="cdp-btn cdp-btn-primary full"
                  style={{ display: 'inline-flex', justifyContent: 'center' }}
                >
                  <FaNotesMedical /> {consultation.diagnosis ? 'Mở phòng để cập nhật kết quả' : 'Mở phòng để nhập kết quả'}
                </button>

                {!canWriteResult && (
                  <p className="cdp-note-muted"><FaInfoCircle /> Có thể nhập kết quả khi ca tư vấn ở trạng thái đã xác nhận hoặc đang diễn ra.</p>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="cdp-card">
            <div className="cdp-card-header">
              <h3><FaCalendarCheck /> Thao tác</h3>
            </div>
            <div className="cdp-card-body">
              <div className="cdp-actions">
                {(user?.role === 'patient' || user?.role === 'doctor' || user?.role === 'admin') && canJoinRoom && (
                  <button className="cdp-btn cdp-btn-primary full" onClick={handleStartChat}>
                     {consultation.consultation_type === 'video' ? <FaVideo /> : <FaComments />} Vào phòng
                  </button>
                )}

                {consultationService.canCancel(consultation.status) && (isPatientOwner || isDoctorOwner || user?.role === 'admin' || user?.role === 'staff') && (
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
              <div className="cdp-action-notes">
                <p><FaInfoCircle /> Chỉ vào phòng khi tư vấn đã xác nhận và đến giờ hẹn.</p>
                <p><FaInfoCircle /> Hủy tư vấn cần nhập lý do để hệ thống xử lý hoàn tiền nếu có.</p>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>

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

      <AppointmentRatingModal
        show={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        onSubmit={handleSubmitRating}
        mode={ratingMode}
        appointment={ratingModalPayload}
        isSubmitting={isSubmittingRating}
        contextType={ratingTarget === 'doctor' ? 'doctor' : 'consultation'}
      />
    </div>
  );
};

export default ConsultationDetailPage;