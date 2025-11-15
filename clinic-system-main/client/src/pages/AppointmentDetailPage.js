// client/src/pages/AppointmentDetailPage.js
// PHIÊN BẢN CẬP NHẬT HOÀN CHỈNH
// - Tích hợp luồng Hồ sơ Y tế (Medical Record)
// - Tích hợp Modal Xác thực Mật khẩu (PasswordConfirmModal)
// - Thay thế axios bằng service và localStorage bằng useAuth

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';

// Import CSS
import './AppointmentDetailPage.css';

// Import Service và Components mới
import appointmentService from '../services/appointmentService';
import { useAuth } from '../contexts/AuthContext';
import PasswordConfirmModal from '../components/auth/PasswordConfirmModal'; 

// Import Icons từ React-Icons
import {
  FaCalendarAlt, FaUserMd, FaHospital, FaClock, FaMoneyBillWave, FaUser,
  FaEnvelope, FaPhone, FaCheckCircle, FaExclamationTriangle, FaArrowLeft,
  FaTimes, FaNotesMedical, FaEdit, FaCreditCard, FaSpinner, FaInfoCircle,
  FaTimesCircle, FaBan, FaVideo, FaHeart, FaMapMarkerAlt, FaStar, FaShieldAlt
} from 'react-icons/fa';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const AppointmentDetailPage = () => {
  // Lấy ID từ URL (đã được cấu hình là 'code' trong App.js)
  const { code } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const guestToken = searchParams.get('token');

  // Dùng useAuth để lấy user
  const { user } = useAuth(); 

  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);

  // Countdown
  const [timeUntilAppointment, setTimeUntilAppointment] = useState(null);
  const [paymentTimeRemaining, setPaymentTimeRemaining] = useState(null);

  // Modals
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  
  // State cho modal mật khẩu
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Admin/Doctor update states
  const [adminStatus, setAdminStatus] = useState('');
  const [adminAddress, setAdminAddress] = useState('');
  const [adminCancelReason, setAdminCancelReason] = useState('');

  // Loading states
  const [submitting, setSubmitting] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // ========== INIT ==========
  useEffect(() => {
    // Không cần load user từ localStorage nữa vì đã có useAuth()
    // Chỉ chạy loadAppointment khi 'user' đã được load (nếu không phải guest)
    if (guestToken || user) {
      loadAppointment();
    }
  }, [code, guestToken, user]); // Thêm 'user' vào dependency

  // Countdown timer
  useEffect(() => {
    if (!appointment) return;

    const interval = setInterval(() => {
      updateCountdowns();
    }, 1000);

    return () => clearInterval(interval);
  }, [appointment]);

  // ========== LOAD DATA ==========
  const loadAppointment = async () => {
    try {
      setLoading(true);
      let response;

      if (guestToken) {
        // Guest dùng token (API này không đổi)
        response = await axios.get(`${API_URL}/appointments/guest/${guestToken}`);
      } else {
        // User đã đăng nhập
        if (!user) {
          // Chờ user load xong
          return; 
        }

        // Dùng service và `code`
        // Hàm getAppointmentByCode đã bao gồm include: MedicalRecord
        response = await appointmentService.getAppointmentByCode(code);
      }

      if (response.data.success) {
        const apptData = response.data.data;
        setAppointment(apptData);
        // Cập nhật state cho form admin
        setAdminStatus(apptData.status);
        setAdminAddress(apptData.appointment_address || '');
      }
    } catch (error) {
      console.error('Load appointment error:', error);
      toast.error(error.response?.data?.message || 'Không thể tải thông tin lịch hẹn');
      
      if (error.response?.status === 404) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableSlotsForReschedule = async (date) => {
    if (!appointment) return;
    try {
      setLoadingSlots(true);
      // API này là public, có thể giữ nguyên axios
      const response = await axios.get(
        `${API_URL}/appointments/available-slots`,
        {
          params: {
            doctor_id: appointment.doctor_id,
            date: date,
            service_id: appointment.service_id
          }
        }
      );

      if (response.data.success) {
        const allSlots = [
          ...response.data.data.grouped.morning,
          ...response.data.data.grouped.afternoon,
          ...response.data.data.grouped.evening
        ].filter(slot => slot.status === 'available');
        
        setAvailableSlots(allSlots);
      }
    } catch (error) {
      console.error('Load slots error:', error);
      toast.error('Không thể tải lịch trống');
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  // ========== COUNTDOWN LOGIC ==========
  const updateCountdowns = () => {
    if (!appointment) return;
    const now = new Date();
    const appointmentDateTime = new Date(`${appointment.appointment_date} ${appointment.appointment_start_time}`);
    const paymentDeadline = appointment.payment_hold_until ? new Date(appointment.payment_hold_until) : null;

    // Time until appointment
    const diffMs = appointmentDateTime.getTime() - now.getTime();
    if (diffMs > 0 && appointment.status === 'confirmed') {
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
      setTimeUntilAppointment({ days, hours, minutes, seconds });
    } else {
      setTimeUntilAppointment(null);
    }

    // Payment time remaining
    if (paymentDeadline && appointment.payment_status === 'pending') {
      const paymentDiffMs = paymentDeadline.getTime() - now.getTime();
      if (paymentDiffMs > 0) {
        const hours = Math.floor(paymentDiffMs / (1000 * 60 * 60));
        const minutes = Math.floor((paymentDiffMs % (1000 * 60 * 60)) / (1000 * 60));
        setPaymentTimeRemaining({ hours, minutes });
      } else {
        setPaymentTimeRemaining(null);
        // (Có thể tự động hủy nếu hết giờ)
      }
    }
  };

  // ========== BUSINESS LOGIC ==========
  const canCancelAppointment = () => {
    if (!appointment) return false;
    if (['cancelled', 'completed', 'in_progress'].includes(appointment.status)) return false;
    const now = new Date();
    const appointmentDateTime = new Date(`${appointment.appointment_date} ${appointment.appointment_start_time}`);
    const hoursDiff = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursDiff > 6;
  };

  const canRescheduleAppointment = () => {
    if (!appointment) return false;
    if (['cancelled', 'completed', 'in_progress'].includes(appointment.status)) return false;
    if ((appointment.reschedule_count || 0) >= 3) return false;
    const now = new Date();
    const appointmentDateTime = new Date(`${appointment.appointment_date} ${appointment.appointment_start_time}`);
    const hoursDiff = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursDiff > 24;
  };

  const needPayment = () => {
    return appointment && appointment.payment_status === 'pending' && appointment.status !== 'cancelled';
  };

  // ========== HANDLERS ==========

  // Handler Hủy lịch
  const handleCancelClick = () => {
    if (!canCancelAppointment()) {
      toast.error('Chỉ có thể hủy lịch hẹn trước ít nhất 6 tiếng');
      return;
    }
    setShowCancelModal(true);
  };

  const handleCancelConfirm = async () => {
    if (!cancelReason.trim()) {
      toast.error('Vui lòng nhập lý do hủy');
      return;
    }
    try {
      setSubmitting(true);
      // Dùng service
      await appointmentService.cancelAppointment(code, cancelReason);
      
      toast.success('Đã hủy lịch hẹn thành công');
      setShowCancelModal(false);
      setCancelReason('');
      loadAppointment();
      
    } catch (error) {
      console.error('Cancel appointment error:', error);
      toast.error(error.response?.data?.message || 'Không thể hủy lịch hẹn');
    } finally {
      setSubmitting(false);
    }
  };

  // Handler Đổi lịch
  const handleRescheduleClick = () => {
    if (!canRescheduleAppointment()) {
      if ((appointment.reschedule_count || 0) >= 3) {
        toast.error('Bạn đã đổi lịch tối đa 3 lần');
      } else {
        toast.error('Chỉ có thể đổi lịch hẹn trước 24 tiếng (1 ngày)');
      }
      return;
    }
    setNewDate('');
    setNewTime('');
    setAvailableSlots([]);
    setShowRescheduleModal(true);
  };

  const handleNewDateChange = (date) => {
    setNewDate(date);
    setNewTime('');
    setAvailableSlots([]);
    if (date) {
      loadAvailableSlotsForReschedule(date);
    }
  };

  const handleRescheduleConfirm = async () => {
    if (!newDate || !newTime) {
      toast.error('Vui lòng chọn ngày và giờ mới');
      return;
    }
    try {
      setSubmitting(true);
      
      const payload = {
        new_date: newDate,
        new_start_time: newTime,
        new_service_id: appointment.service_id,
        new_doctor_id: appointment.doctor_id,
      };

      // Dùng service
      await appointmentService.rescheduleAppointment(code, payload);
      
      toast.success('Đổi lịch hẹn thành công!');
      setShowRescheduleModal(false);
      loadAppointment();

    } catch (error) {
      console.error('Reschedule error:', error);
      toast.error(error.response?.data?.message || 'Không thể đổi lịch hẹn');
    } finally {
      setSubmitting(false);
    }
  };

  // Handler Thanh toán
  const handlePaymentClick = () => {
    // API backend của bạn dùng 'code' cho thanh toán
    navigate(`/thanh-toan/${code}${guestToken ? `?token=${guestToken}` : ''}`);
  };

  // Handler Cập nhật của Admin
  const handleAdminUpdate = async () => {
    if (adminStatus === 'cancelled' && !adminCancelReason.trim()) {
      toast.error('Vui lòng nhập lý do hủy (khi Admin/BS hủy)');
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Dùng service
      await appointmentService.updateAppointmentDetails(code, {
          status: adminStatus,
          appointment_address: adminAddress,
          cancel_reason: adminCancelReason,
      });

      toast.success('Cập nhật lịch hẹn thành công!');
      loadAppointment();
      
    } catch (error) {
      console.error('Admin update error:', error);
      toast.error(error.response?.data?.message || 'Lỗi khi cập nhật');
    } finally {
      setSubmitting(false);
    }
  };

  // Handler cho luồng Hồ sơ Y tế (MỚI)
  const handleViewMedicalRecord = () => {
    // Mở modal
    setShowPasswordModal(true);
  };
  
  const handlePasswordConfirm = () => {
    // Mật khẩu đã được xác thực bởi Modal
    setShowPasswordModal(false);
    
    // Điều hướng đến trang xem kết quả
    navigate(`/ket-qua-kham/${appointment.MedicalRecord.id}`);
  };


  // ========== HELPERS (Format) ==========
  const getStatusInfo = (status) => {
    const info = {
      pending: { text: 'Chờ xác nhận', class: 'status-pending', icon: <FaClock /> },
      confirmed: { text: 'Đã xác nhận', class: 'status-confirmed', icon: <FaCheckCircle /> },
      in_progress: { text: 'Đang khám', class: 'status-in-progress', icon: <FaSpinner className="fa-spin" /> },
      completed: { text: 'Đã hoàn thành', class: 'status-completed', icon: <FaCheckCircle /> },
      cancelled: { text: 'Đã hủy', class: 'status-cancelled', icon: <FaBan /> }
    };
    return info[status] || info.pending;
  };

  const getPaymentStatusInfo = (status) => {
    const info = {
      pending: { text: 'Chưa thanh toán', class: 'payment-pending', icon: <FaClock /> },
      paid: { text: 'Đã thanh toán', class: 'payment-paid', icon: <FaCheckCircle /> },
      refunded: { text: 'Đã hoàn tiền', class: 'payment-refunded', icon: <FaMoneyBillWave /> },
      paid_at_clinic: { text: 'Thanh toán tại quầy', class: 'payment-at-clinic', icon: <FaHospital /> },
      not_required: { text: 'Miễn phí', class: 'payment-free', icon: <FaCheckCircle /> }
    };
    return info[status] || info.pending;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };
  const formatTime = (timeStr) => timeStr ? timeStr.slice(0, 5) : 'N/A';
  const formatDateTime = (dateStr) => {
     if (!dateStr) return 'N/A';
     return new Date(dateStr).toLocaleString('vi-VN');
  }

  // ========== RENDER ==========
  if (loading || (!guestToken && !user)) { // Chờ cả loading và user (nếu ko phải guest)
    return (
      <div className="appointment-detail-page-container">
        <div className="appointment-detail-page-loading">
          <FaSpinner className="fa-spin" />
          <span>Đang tải thông tin lịch hẹn...</span>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="appointment-detail-page-container">
        <div className="appointment-detail-page-wrapper">
          <div className="appointment-detail-page-error">
            <FaTimesCircle />
            <h2>Không tìm thấy lịch hẹn</h2>
            <p>Lịch hẹn không tồn tại hoặc bạn không có quyền xem.</p>
            <button
              className="appointment-detail-page-btn-action btn-primary"
              onClick={() => navigate('/')}
            >
              <FaArrowLeft />
              Về trang chủ
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Lấy thông tin đã format
  const statusInfo = getStatusInfo(appointment.status);
  const paymentInfo = getPaymentStatusInfo(appointment.payment_status);
  
  // Check quyền
  const isPatient = user && user.role === 'patient';
  const isAdminOrDoctor = user && (user.role === 'admin' || user.role === 'doctor' || user.role === 'staff');
  const isOwner = isPatient && user.id === appointment.Patient?.user_id;

  return (
    <div className="appointment-detail-page-container">
      <div className="appointment-detail-page-wrapper">
        {/* Header */}
        <div className="appointment-detail-page-header">
          <div className="appointment-detail-page-header-left">
            <button className="appointment-detail-page-btn-back" onClick={() => navigate(-1)}>
              <FaArrowLeft />
              Quay lại
            </button>
            <h1 className="appointment-detail-page-title">
              Chi tiết lịch hẹn: {appointment.code}
            </h1>
          </div>
          <div className={`appointment-detail-page-status-badge ${statusInfo.class}`}>
            {statusInfo.icon}
            {statusInfo.text}
          </div>
        </div>

        {/* Content */}
        <div className="appointment-detail-page-content-grid">
          
          {/* CỘT BÊN TRÁI (Thông tin chính) */}
          <div className="appointment-detail-page-main-col">
          
            {/* Countdown Alert */}
            {timeUntilAppointment && (
              <div className="appointment-detail-page-alert alert-info">
                <FaClock />
                <span>
                  Lịch hẹn sẽ diễn ra sau: 
                  <strong> {timeUntilAppointment.days} ngày, {timeUntilAppointment.hours} giờ, {timeUntilAppointment.minutes} phút</strong>
                </span>
              </div>
            )}

            {/* Payment Warning */}
            {needPayment() && paymentTimeRemaining && (
              <div className="appointment-detail-page-alert alert-warning">
                <FaExclamationTriangle />
                <div>
                  <strong>Chưa thanh toán!</strong> Vui lòng thanh toán trong 
                  <strong> {paymentTimeRemaining.hours} giờ {paymentTimeRemaining.minutes} phút</strong> để giữ lịch.
                </div>
                <button 
                  className="appointment-detail-page-btn-action btn-payment-small"
                  onClick={handlePaymentClick}
                >
                  <FaCreditCard />
                  Thanh toán
                </button>
              </div>
            )}
            
            {/* Hủy lịch */}
            {appointment.status === 'cancelled' && (
              <div className="appointment-detail-page-alert alert-danger">
                <FaBan />
                <span>
                  Lịch đã hủy lúc: {formatDateTime(appointment.cancelled_at)}
                  {appointment.cancel_reason && (
                    <span className="appointment-detail-page-reason-text">Lý do: {appointment.cancel_reason}</span>
                  )}
                </span>
              </div>
            )}

            {/* Hoàn thành */}
            {appointment.status === 'completed' && (
              <div className="appointment-detail-page-alert alert-success">
                <FaCheckCircle />
                <span>
                  Lịch hẹn đã hoàn thành lúc: {formatDateTime(appointment.completed_at)}
                </span>
              </div>
            )}


            {/* Thông tin lịch hẹn */}
            <div className="appointment-detail-page-card">
              <h2 className="appointment-detail-page-card-title">
                <FaCalendarAlt />
                Thông tin lịch hẹn
              </h2>
              <div className="appointment-detail-page-info-grid">
                <div className="appointment-detail-page-info-item">
                  <div className="appointment-detail-page-info-label"><FaNotesMedical /> Dịch vụ</div>
                  <div className="appointment-detail-page-info-value">{appointment.Service?.name}</div>
                </div>
                <div className="appointment-detail-page-info-item">
                  <div className="appointment-detail-page-info-label"><FaHeart /> Chuyên khoa</div>
                  <div className="appointment-detail-page-info-value">{appointment.Specialty?.name || 'Đa khoa'}</div>
                </div>
                <div className="appointment-detail-page-info-item">
                  <div className="appointment-detail-page-info-label"><FaUserMd /> Bác sĩ</div>
                  <div className="appointment-detail-page-info-value">BS. {appointment.Doctor?.user?.full_name}</div>
                </div>
                <div className="appointment-detail-page-info-item">
                  <div className="appointment-detail-page-info-label"><FaHospital /> Hình thức</div>
                  <div className="appointment-detail-page-info-value">
                    {appointment.appointment_type === 'online' ? <FaVideo /> : <FaHospital />}
                    {appointment.appointment_type === 'online' ? ' Trực tuyến' : ' Trực tiếp'}
                  </div>
                </div>
                <div className="appointment-detail-page-info-item">
                  <div className="appointment-detail-page-info-label"><FaCalendarAlt /> Ngày khám</div>
                  <div className="appointment-detail-page-info-value">{formatDate(appointment.appointment_date)}</div>
                </div>
                <div className="appointment-detail-page-info-item">
                  <div className="appointment-detail-page-info-label"><FaClock /> Giờ khám</div>
                  <div className="appointment-detail-page-info-value">
                    {formatTime(appointment.appointment_start_time)} - {formatTime(appointment.appointment_end_time)}
                  </div>
                </div>
                
                {/* Hiển thị địa chỉ khám */}
                <div className="appointment-detail-page-info-item full-width">
                  <div className="appointment-detail-page-info-label"><FaMapMarkerAlt /> Địa chỉ khám</div>
                  <div className="appointment-detail-page-info-value">
                    {appointment.appointment_address || 'Tầng 1, Tòa nhà Clinic, 123 Đường Sức Khỏe, Quận 1, TP. HCM'}
                  </div>
                </div>

              </div>
              {appointment.reason && (
                <div className="appointment-detail-page-reason-box">
                  <strong>Lý do khám:</strong> {appointment.reason}
                </div>
              )}
            </div>

            {/* Thông tin bệnh nhân */}
            <div className="appointment-detail-page-card">
              <h2 className="appointment-detail-page-card-title">
                <FaUser />
                Thông tin bệnh nhân
              </h2>
              <div className="appointment-detail-page-info-grid">
                <div className="appointment-detail-page-info-item">
                  <div className="appointment-detail-page-info-label"><FaUser /> Họ tên</div>
                  <div className="appointment-detail-page-info-value">
                    {appointment.Patient?.user?.full_name || appointment.guest_name || 'N/A'}
                  </div>
                </div>
                <div className="appointment-detail-page-info-item">
                  <div className="appointment-detail-page-info-label"><FaEnvelope /> Email</div>
                  <div className="appointment-detail-page-info-value">
                    {appointment.Patient?.user?.email || appointment.guest_email || 'N/A'}
                  </div>
                </div>
                <div className="appointment-detail-page-info-item">
                  <div className="appointment-detail-page-info-label"><FaPhone /> Số điện thoại</div>
                  <div className="appointment-detail-page-info-value">
                    {appointment.Patient?.user?.phone || appointment.guest_phone || 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {/* Khung Kết quả khám (LOGIC MỚI) */}
            {appointment.status === 'completed' && (
              <div className="appointment-detail-page-card">
                <h2 className="appointment-detail-page-card-title">
                  <FaNotesMedical />
                  Kết quả khám
                </h2>
                
                {/* Nếu chưa có hồ sơ (MedicalRecord) */}
                {!appointment.MedicalRecord && (
                  <p className="appointment-detail-page-rating-text">
                    Bác sĩ đang cập nhật kết quả. Vui lòng quay lại sau.
                  </p>
                )}
                
                {/* Nếu ĐÃ CÓ hồ sơ */}
                {/* Luồng 3: Bệnh nhân (chỉ chủ sở hữu) */}
                {isOwner && appointment.MedicalRecord && (
                   <button 
                     className="appointment-detail-page-btn-action btn-primary"
                     onClick={handleViewMedicalRecord} // Mở modal
                   >
                     <FaShieldAlt /> Xem chi tiết hồ sơ y tế (Bảo mật)
                   </button>
                )}
                
                {/* Luồng 1 & 2: Bác sĩ/Admin */}
                {isAdminOrDoctor && appointment.MedicalRecord && (
                   <Link 
                     to={`/nhap-ket-qua/${appointment.code}?record_id=${appointment.MedicalRecord.id}`} 
                     className="appointment-detail-page-btn-action btn-primary"
                   >
                     <FaEdit /> Cập nhật kết quả khám
                   </Link>
                )}
                
                {/* Luồng 1 (Bổ sung): BS/Admin chưa nhập */}
                 {isAdminOrDoctor && !appointment.MedicalRecord && (
                   <Link 
                     to={`/nhap-ket-qua/${appointment.code}`} 
                     className="appointment-detail-page-btn-action btn-primary"
                   >
                     <FaNotesMedical /> Nhập kết quả khám
                   </Link>
                 )}
                
              </div>
            )}
            
          </div>
          
          {/* CỘT BÊN PHẢI (Thanh toán & Thao tác) */}
          <div className="appointment-detail-page-sidebar-col">
            
            {/* Thanh toán */}
            <div className="appointment-detail-page-card">
              <h2 className="appointment-detail-page-card-title">
                <FaMoneyBillWave />
                Thanh toán
              </h2>
              <div className="appointment-detail-page-info-grid payment-grid">
                <div className="appointment-detail-page-info-item">
                  <div className="appointment-detail-page-info-label">Giá dịch vụ</div>
                  <div className="appointment-detail-page-info-value price">
                    {appointment.Service?.price?.toLocaleString('vi-VN')} VNĐ
                  </div>
                </div>
                <div className="appointment-detail-page-info-item">
                  <div className="appointment-detail-page-info-label">Trạng thái</div>
                  <div className={`appointment-detail-page-payment-status ${paymentInfo.class}`}>
                    {paymentInfo.icon}
                    {paymentInfo.text}
                  </div>
                </div>
              </div>
              {needPayment() && (
                <button
                  className="appointment-detail-page-btn-action btn-payment"
                  onClick={handlePaymentClick}
                >
                  <FaCreditCard />
                  Thanh toán ngay
                </button>
              )}
            </div>

            {/* Thao tác (Chỉ chủ sở hữu hoặc guest mới thấy) */}
            {(isOwner || guestToken) && ['pending', 'confirmed'].includes(appointment.status) && (
              <div className="appointment-detail-page-card">
                <h2 className="appointment-detail-page-card-title">
                  <FaEdit />
                  Thao tác
                </h2>
                <div className="appointment-detail-page-action-buttons">
                  <button
                    className="appointment-detail-page-btn-action btn-reschedule"
                    onClick={handleRescheduleClick}
                    disabled={!canRescheduleAppointment()}
                    title={
                      !canRescheduleAppointment() 
                      ? "Chỉ có thể đổi lịch trước 24 tiếng và tối đa 3 lần" 
                      : "Đổi lịch hẹn (còn " + (3 - (appointment.reschedule_count || 0)) + " lần)"
                    }
                  >
                    <FaEdit />
                    Đổi lịch
                  </button>

                  <button
                    className="appointment-detail-page-btn-action btn-cancel"
                    onClick={handleCancelClick}
                    disabled={!canCancelAppointment()}
                    title={!canCancelAppointment() ? "Chỉ có thể hủy lịch trước 6 tiếng" : "Hủy lịch hẹn"}
                  >
                    <FaTimes />
                    Hủy lịch
                  </button>
                </div>
                <div className="appointment-detail-page-action-notes">
                  <p><FaInfoCircle /> Đổi lịch trước 24 tiếng (còn {3 - (appointment.reschedule_count || 0)}/3 lần)</p>
                  <p><FaInfoCircle /> Hủy lịch miễn phí trước 6 tiếng</p>
                </div>
              </div>
            )}
            
            {/* Nút đánh giá */}
            {isOwner && appointment.status === 'completed' && (
              <div className="appointment-detail-page-card">
                 <h2 className="appointment-detail-page-card-title">
                  <FaStar />
                  Đánh giá
                </h2>
                <p className="appointment-detail-page-rating-text">
                  Vui lòng chia sẻ cảm nhận của bạn để giúp chúng tôi cải thiện dịch vụ.
                </p>
                <button
                    className="appointment-detail-page-btn-action btn-rating"
                    onClick={() => toast.info('Chức năng đánh giá đang phát triển!')}
                  >
                    <FaStar />
                    Viết đánh giá
                </button>
              </div>
            )}

            {/* Khung quản lý */}
            {isAdminOrDoctor && (
              <div className="appointment-detail-page-card admin-card">
                <h2 className="appointment-detail-page-card-title">
                  <FaShieldAlt />
                  Quản lý (Admin/Bác sĩ)
                </h2>
                
                {/* Cập nhật trạng thái */}
                <div className="appointment-detail-page-form-group">
                  <label htmlFor="adminStatus">Cập nhật trạng thái</label>
                  <select 
                    id="adminStatus" 
                    className="appointment-detail-page-form-control"
                    value={adminStatus}
                    onChange={(e) => setAdminStatus(e.target.value)}
                  >
                    <option value="pending">Chờ xác nhận</option>
                    <option value="confirmed">Đã xác nhận</option>
                    <option value="in_progress">Đang khám</option>
                    <option value="completed">Đã hoàn thành</option>
                    <option value="cancelled">Hủy lịch</option>
                  </select>
                </div>
                
                {/* Lý do nếu hủy */}
                {adminStatus === 'cancelled' && (
                  <div className="appointment-detail-page-form-group">
                    <label htmlFor="adminCancelReason">Lý do hủy *</label>
                    <textarea 
                      id="adminCancelReason"
                      className="appointment-detail-page-form-control"
                      value={adminCancelReason}
                      onChange={(e) => setAdminCancelReason(e.target.value)}
                      placeholder="Nhập lý do hủy..."
                    />
                  </div>
                )}
                
                {/* Cập nhật địa chỉ */}
                <div className="appointment-detail-page-form-group">
                  <label htmlFor="adminAddress">Cập nhật địa chỉ khám</label>
                  <textarea 
                    id="adminAddress"
                    className="appointment-detail-page-form-control"
                    value={adminAddress}
                    onChange={(e) => setAdminAddress(e.target.value)}
                    placeholder="Nhập địa chỉ khám (nếu cần thay đổi)..."
                  />
                </div>
                
                <button
                    className="appointment-detail-page-btn-action btn-primary"
                    onClick={handleAdminUpdate}
                    disabled={submitting}
                  >
                    {submitting ? <FaSpinner className="fa-spin" /> : <FaCheckCircle />}
                    Cập nhật
                </button>
              </div>
            )}
            
          </div>
        </div>

      </div>
      
      {/* ===== MODALS ===== */}
      
      {/* CANCEL MODAL */}
      {showCancelModal && (
        <div className="appointment-detail-page-modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="appointment-detail-page-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="appointment-detail-page-modal-header">
              <h2><FaExclamationTriangle /> Xác nhận hủy lịch hẹn</h2>
              <button className="appointment-detail-page-btn-close" onClick={() => setShowCancelModal(false)}>
                <FaTimes />
              </button>
            </div>
            <div className="appointment-detail-page-modal-body">
              <p className="appointment-detail-page-modal-text">Bạn có chắc chắn muốn hủy lịch hẹn <strong>{appointment.code}</strong> không?</p>
              <div className="appointment-detail-page-form-group">
                <label htmlFor="cancelReason"><FaNotesMedical /> Lý do hủy *</label>
                <textarea
                  id="cancelReason"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="appointment-detail-page-form-control"
                  placeholder="Nhập lý do hủy lịch..."
                />
              </div>
            </div>
            <div className="appointment-detail-page-modal-footer">
              <button
                className="appointment-detail-page-btn-modal btn-secondary"
                onClick={() => setShowCancelModal(false)}
                disabled={submitting}
              >
                Đóng
              </button>
              <button
                className="appointment-detail-page-btn-modal btn-danger"
                onClick={handleCancelConfirm}
                disabled={submitting || !cancelReason.trim()}
              >
                {submitting ? <FaSpinner className="fa-spin" /> : <FaCheckCircle />}
                Xác nhận hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESCHEDULE MODAL */}
      {showRescheduleModal && (
        <div className="appointment-detail-page-modal-overlay" onClick={() => setShowRescheduleModal(false)}>
          <div className="appointment-detail-page-modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="appointment-detail-page-modal-header">
              <h2><FaEdit /> Đổi lịch hẹn</h2>
              <button className="appointment-detail-page-btn-close" onClick={() => setShowRescheduleModal(false)}>
                <FaTimes />
              </button>
            </div>
            <div className="appointment-detail-page-modal-body">
              <div className="appointment-detail-page-current-appointment">
                <strong>Lịch hiện tại:</strong> {formatDate(appointment.appointment_date)} lúc {formatTime(appointment.appointment_start_time)}
              </div>
              <div className="appointment-detail-page-form-grid">
                <div className="appointment-detail-page-form-group">
                  <label htmlFor="newDate"><FaCalendarAlt /> Chọn ngày mới *</label>
                  <input
                    type="date"
                    id="newDate"
                    value={newDate}
                    onChange={(e) => handleNewDateChange(e.target.value)}
                    min={new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                    className="appointment-detail-page-form-control"
                  />
                </div>
              </div>

              {newDate && (
                <div className="appointment-detail-page-form-group">
                  <label><FaClock /> Chọn giờ mới *</label>
                  {loadingSlots ? (
                    <div className="appointment-detail-page-loading-small">
                      <FaSpinner className="fa-spin" /> Đang tải lịch trống...
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="appointment-detail-page-empty-small">
                      <FaCalendarAlt />
                      <p>Không có lịch trống trong ngày này. Vui lòng chọn ngày khác.</p>
                    </div>
                  ) : (
                    <div className="appointment-detail-page-slot-grid">
                      {availableSlots.map(slot => (
                        <button
                          key={slot.time}
                          className={`appointment-detail-page-slot-button ${newTime === slot.time ? 'selected' : ''}`}
                          onClick={() => setNewTime(slot.time)}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="appointment-detail-page-modal-footer">
              <button
                className="appointment-detail-page-btn-modal btn-secondary"
                onClick={() => setShowRescheduleModal(false)}
                disabled={submitting}
              >
                Hủy
              </button>
              <button
                className="appointment-detail-page-btn-modal btn-primary"
                onClick={handleRescheduleConfirm}
                disabled={submitting || !newDate || !newTime}
              >
                {submitting ? <FaSpinner className="fa-spin" /> : <FaCheckCircle />}
                Xác nhận đổi lịch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xác thực Mật khẩu */}
      <PasswordConfirmModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onConfirm={handlePasswordConfirm}
      />

    </div>
  );
};

export default AppointmentDetailPage;