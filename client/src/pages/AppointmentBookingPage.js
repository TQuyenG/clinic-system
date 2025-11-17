// client/src/pages/AppointmentBookingPage.js
// NÂNG CẤP: Thêm logic cảnh báo khi đặt lịch quá gấp (< 24h và < 6h)

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import serviceService from '../services/serviceService';
import {
  FaCalendarAlt, FaCheckCircle, FaSpinner, FaInfoCircle, FaSun, FaMoon, FaCloudSun,
  FaExclamationTriangle, FaWallet, FaCreditCard, FaTimes
} from 'react-icons/fa';
// SỬA: Import CSS (đảm bảo file CSS của bạn vẫn được link)
import './AppointmentBookingPage.css'; 

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// MỚI: Hàm helper để format thời gian chênh lệch
const formatTimeDiff = (milliseconds) => {
  if (milliseconds < 0) return "đã qua";
  
  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours} giờ ${minutes} phút`;
  }
  return `${minutes} phút`;
};

const AppointmentBookingPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preSelectedServiceId = searchParams.get('service');

  const [user, setUser] = useState(null);
  const [isGuest, setIsGuest] = useState(true);
  
  const [formData, setFormData] = useState({
    serviceId: preSelectedServiceId ? parseInt(preSelectedServiceId) : '',
    doctorId: '',
    date: '',
    time: '',
    bookingFor: 'self',
    name: '',
    email: '',
    phone: '',
    gender: '',
    dob: '',
    reason: '',
    appointmentType: 'offline',
  });
  
  const [errors, setErrors] = useState({});

  const [services, setServices] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [availableSlots, setAvailableSlots] = useState({
    morning: [],
    afternoon: [],
    evening: [],
  });

  const [loading, setLoading] = useState({
    services: false,
    doctors: false,
    slots: false,
    submit: false,
  });

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  // MỚI: State cho modal cảnh báo
  const [warningModal, setWarningModal] = useState({
    isOpen: false,
    type: 'warning', // 'warning' (24h) hoặc 'danger' (6h)
    title: '',
    message: '',
    details: ''
  });

  // === HELPER FUNCTIONS ===
  
  const formatDateISO = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getNextThreeDays = () => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 3; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date);
    }
    return days;
  };

  // === KHỞI TẠO & TẢI DỮ LIỆU ===

  // 1. Tải thông tin user và danh sách dịch vụ
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
      try {
        const userData = JSON.parse(userStr);
        setUser(userData);
        setIsGuest(false);
        if (userData.role === 'patient') {
          setFormData(prev => ({
            ...prev,
            bookingFor: 'self',
            name: userData.full_name || '',
            email: userData.email || '',
            phone: userData.phone || '',
            gender: userData.gender || '',
            dob: userData.dob ? userData.dob.split('T')[0] : '',
          }));
        }
      } catch (error) { console.error('Parse user error:', error); }
    }

    const loadAllServices = async () => {
      try {
        setLoading(prev => ({ ...prev, services: true }));
        const response = await serviceService.getPublicServices({ limit: 1000 }); 
        if (response.data.success) {
          setServices(response.data.data || []);
          if (preSelectedServiceId) {
            handleServiceChange(preSelectedServiceId, response.data.data);
          }
        }
      } catch (error) {
        console.error('Load services error:', error);
        toast.error('Không thể tải danh sách dịch vụ');
      } finally {
        setLoading(prev => ({ ...prev, services: false }));
      }
    };
    
    loadAllServices();
  }, []); // Chỉ chạy 1 lần

  // 2. Tải bác sĩ khi dịch vụ thay đổi
  const handleServiceChange = async (serviceId, serviceList = services) => {
    setFormData(prev => ({
      ...prev,
      serviceId: serviceId,
      doctorId: '',
      date: '',
      time: '',
    }));
    setErrors(prev => ({ ...prev, serviceId: null, doctorId: null }));
    
    setDoctors([]);
    setAvailableSlots({ morning: [], afternoon: [], evening: [] });

    if (!serviceId) return;

    try {
      setLoading(prev => ({ ...prev, doctors: true }));
      const selectedService = serviceList.find(s => s.id === parseInt(serviceId));
      
      let doctorsData = [];
      if (selectedService && selectedService.allow_doctor_choice) {
        const response = await axios.get(`${API_URL}/services/${serviceId}/doctors`);
        if (response.data.success) {
          doctorsData = response.data.doctors || [];
        }
      } else if (selectedService && !selectedService.allow_doctor_choice) {
         toast.info('Dịch vụ này sẽ tự động phân công bác sĩ.');
      }
      
      setDoctors(doctorsData);

    } catch (error) {
      console.error('Load doctors error:', error);
      toast.error('Lỗi tải danh sách bác sĩ cho dịch vụ này.');
    } finally {
      setLoading(prev => ({ ...prev, doctors: false }));
    }
  };

  // 3. Tải lịch trống khi Bác sĩ hoặc Ngày thay đổi
  useEffect(() => {
    const loadSlots = async () => {
      if (!formData.doctorId || !formData.date || !formData.serviceId) {
        setAvailableSlots({ morning: [], afternoon: [], evening: [] });
        return;
      }
      
      // Kiểm tra ngày hợp lệ (Backend đã làm, nhưng frontend làm thêm cho chắc)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate()); // Cho phép đặt ngày hôm nay
      tomorrow.setHours(0, 0, 0, 0);
      if (new Date(formData.date) < tomorrow) {
        setAvailableSlots({ morning: [], afternoon: [], evening: [] });
        return;
      }

      try {
        setLoading(prev => ({ ...prev, slots: true }));
        const response = await axios.get(`${API_URL}/appointments/available-slots`, {
          params: {
            doctor_id: formData.doctorId,
            date: formData.date,
            service_id: formData.serviceId
          }
        });

        if (response.data.success) {
          const grouped = response.data.data.grouped || { morning: [], afternoon: [], evening: [] };
          
          // MỚI: Lọc bổ sung các slot đã qua giờ ở frontend
          const now = new Date();
          const isToday = (formData.date === formatDateISO(now));
          
          if (isToday) {
             const currentMinutes = now.getHours() * 60 + now.getMinutes();
             const filterSlots = (slots) => {
                return slots.map(slot => {
                  const [slotHour, slotMin] = slot.time.split(':').map(Number);
                  const slotMinutes = slotHour * 60 + slotMin;
                  if (slotMinutes < currentMinutes && slot.status === 'available') {
                     return { ...slot, status: 'unavailable', reason: 'Đã qua giờ' };
                  }
                  return slot;
                });
             };
             grouped.morning = filterSlots(grouped.morning);
             grouped.afternoon = filterSlots(grouped.afternoon);
             grouped.evening = filterSlots(grouped.evening);
          }

          setAvailableSlots(grouped);
          
          const allSlots = Object.values(grouped).flat();
          if (allSlots.length === 0) {
            toast.info('Bác sĩ không có lịch làm việc vào ngày này.');
          } else if (allSlots.every(s => s.status !== 'available')) {
             toast.info('Bác sĩ đã kín lịch hoặc nghỉ vào ngày này.');
          }
        } else {
          setAvailableSlots({ morning: [], afternoon: [], evening: [] });
          toast.info(response.data.message || 'Không có khung giờ trống');
        }
      } catch (error) {
        console.error('Load slots error:', error);
        setAvailableSlots({ morning: [], afternoon: [], evening: [] });
        const msg = error.response?.data?.message || 'Lỗi tải khung giờ';
        toast.error(msg);
      } finally {
        setLoading(prev => ({ ...prev, slots: false }));
      }
    };
    
    loadSlots();
  }, [formData.doctorId, formData.date, formData.serviceId]);

  // === HANDLERS ===
  
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
    
    if (name === 'serviceId') {
      handleServiceChange(value);
    }
    if (name === 'doctorId' || name === 'date') {
      setFormData(prev => ({ ...prev, time: '' }));
      setErrors(prev => ({ ...prev, time: null }));
    }
    
    if (name === 'bookingFor') {
      if (value === 'self' && user) {
        setFormData(prev => ({
          ...prev,
          name: user.full_name || '', 
          email: user.email || '',
          phone: user.phone || '', 
          gender: user.gender || '',
          dob: user.dob ? user.dob.split('T')[0] : '',
        }));
      } else {
         setFormData(prev => ({
          ...prev,
          name: '', email: '', phone: '', gender: '', dob: '',
        }));
      }
      setErrors(prev => ({ ...prev, name: null, email: null, phone: null, dob: null }));
    }
  };

  const handleTimeSelect = (timeSlot) => {
    // Backend đã lọc (isToday && slotStart < currentMinutes)
    // Frontend lọc lại lần nữa để đảm bảo
    const now = new Date();
    const isToday = (formData.date === formatDateISO(now));
    if (isToday) {
       const currentMinutes = now.getHours() * 60 + now.getMinutes();
       const [slotHour, slotMin] = timeSlot.time.split(':').map(Number);
       const slotMinutes = slotHour * 60 + slotMin;
       if (slotMinutes < currentMinutes) {
          toast.warn('Đã qua giờ. Vui lòng chọn giờ khác.');
          return;
       }
    }
  
    if (timeSlot.status === 'available') {
      setFormData(prev => ({ ...prev, time: timeSlot.time }));
      setErrors(prev => ({ ...prev, time: null }));
    } else {
      toast.warn(`Slot này không khả dụng: ${timeSlot.reason}`);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.serviceId) newErrors.serviceId = 'Vui lòng chọn dịch vụ.';
    if (!formData.doctorId) newErrors.doctorId = 'Vui lòng chọn bác sĩ.';
    if (!formData.date) newErrors.date = 'Vui lòng chọn ngày khám.';
    if (!formData.time) newErrors.time = 'Vui lòng chọn giờ khám.';
    if (!formData.name.trim()) newErrors.name = 'Vui lòng nhập họ tên.';
    if (!formData.email.trim()) newErrors.email = 'Vui lòng nhập email.';
    if (!formData.phone.trim()) newErrors.phone = 'Vui lòng nhập số điện thoại.';
    if (!formData.dob) newErrors.dob = 'Vui lòng chọn ngày sinh.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // SỬA: handleConfirmBooking (Thêm logic cảnh báo)
  const handleConfirmBooking = () => {
    if (!validateForm()) {
      toast.error('Vui lòng điền đầy đủ các trường bắt buộc.');
      return;
    }

    // === LOGIC CẢNH BÁO MỚI ===
    const now = new Date();
    // Đảm bảo múi giờ chính xác khi so sánh
    const appointmentTime = new Date(`${formData.date}T${formData.time}:00`);
    const diffInMillis = appointmentTime.getTime() - now.getTime();
    const diffInHours = diffInMillis / (1000 * 60 * 60);

    const nowStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const apptDateStr = new Date(formData.date).toLocaleDateString('vi-VN');
    const apptStr = `${formData.time} ngày ${apptDateStr}`;
    
    const timeRemaining = formatTimeDiff(diffInMillis);

    // Mốc 1: Dưới 6 tiếng
    if (diffInHours < 6) {
      setWarningModal({
        isOpen: true,
        type: 'danger',
        title: 'Cảnh báo quan trọng!',
        message: `Bạn đặt lịch vào lúc ${apptStr}. Hiện tại là ${nowStr} (chỉ còn ${timeRemaining}).`,
        details: 'Bạn sẽ KHÔNG THỂ HỦY LỊCH hoặc ĐỔI LỊCH. Nếu không đến, khoản thanh toán online (nếu có) sẽ không được hoàn lại. Bạn có chắc chắn muốn tiếp tục?'
      });
      return; // Dừng lại, chờ user xác nhận cảnh báo
    }
    
    // Mốc 2: Dưới 24 tiếng
    if (diffInHours < 24) {
      setWarningModal({
        isOpen: true,
        type: 'warning',
        title: 'Lưu ý đổi lịch!',
        message: `Bạn đặt lịch vào lúc ${apptStr}. Hiện tại là ${nowStr} (còn ${timeRemaining}).`,
        details: 'Theo quy định, bạn sẽ KHÔNG THỂ ĐỔI LỊCH (cần đổi trước 24 giờ). Bạn có chắc chắn muốn tiếp tục?'
      });
      return; // Dừng lại, chờ user xác nhận cảnh báo
    }

    // Nếu không có cảnh báo (hơn 24h)
    setShowConfirmModal(true);
  };
  
  // MỚI: Hàm xử lý khi user đồng ý với cảnh báo
  const handleProceedFromWarning = () => {
    setWarningModal({ isOpen: false, type: '', message: '', details: '' });
    setShowConfirmModal(true); // Mở modal xác nhận GỐC
  };
  
  // MỚI: Hàm đóng modal cảnh báo
  const handleCloseWarning = () => {
     setWarningModal({ isOpen: false, type: '', message: '', details: '' });
  };

  // handleSubmitBooking (Giữ nguyên logic)
  const handleSubmitBooking = async (paymentMethod) => {
    if (!validateForm()) {
      toast.error('Thông tin không hợp lệ, vui lòng kiểm tra lại.');
      setShowConfirmModal(false);
      return;
    }

    try {
      setLoading((prev) => ({ ...prev, submit: true }));
      setShowConfirmModal(false);
      setShowPaymentModal(false);

      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const payload = {
        service_id: formData.serviceId,
        doctor_id: formData.doctorId,
        appointment_date: formData.date,
        appointment_start_time: formData.time,
        appointment_type: formData.appointmentType,
        reason: formData.reason,
        payment_method: paymentMethod,
        guest_name: formData.name,
        guest_email: formData.email,
        guest_phone: formData.phone,
        guest_gender: formData.gender,
        guest_dob: formData.dob,
      };

      const response = await axios.post(`${API_URL}/appointments`, payload, { headers });

      if (response.data.success) {
        toast.success('Đặt lịch thành công!');
        const appointmentData = response.data.data;
        
        if (response.data.paymentRequired && response.data.paymentUrl) {
          window.location.href = response.data.paymentUrl;
        } else {
          navigate(`/lich-hen/${appointmentData.appointment.code}`);
        }
      }
    } catch (error) {
      console.error('Booking error:', error);
      const errorMsg = error.response?.data?.message || 'Đặt lịch thất bại';
      toast.error(errorMsg);
      if (error.response?.status === 400) {
        setErrors(prev => ({...prev, submit: errorMsg}));
      }
    } finally {
      setLoading((prev) => ({ ...prev, submit: false }));
    }
  };

  // Dữ liệu cho render
  const nextThreeDays = getNextThreeDays();
  const selectedService = services.find(s => s.id === parseInt(formData.serviceId));
  const selectedDoctor = doctors.find(d => d.id === parseInt(formData.doctorId));

  const renderError = (fieldName) => {
    if (errors[fieldName]) {
      return <small className="appointment-booking-error-text">{errors[fieldName]}</small>;
    }
    return null;
  };

  return (
    <div className="appointment-booking-page">
      <div className="appointment-booking-container">
        
        <div className="appointment-booking-page-header">
          <FaCalendarAlt />
          <h1>Đặt lịch khám bệnh</h1>
          <p>Vui lòng hoàn tất các thông tin dưới đây để đặt lịch</p>
        </div>

        <div className="appointment-booking-content">
          <div className="appointment-booking-form-wrapper">
            
            {/* === CỘT BÊN TRÁI: CHỌN LỊCH === */}
            <div className="appointment-booking-left-col">
              <h2>Nội dung chi tiết đặt hẹn</h2>

              {/* 1. Chọn Dịch vụ */}
              <div className="appointment-booking-form-group">
                <label>Dịch vụ khám *</label>
                <select 
                  name="serviceId" 
                  className={`appointment-booking-form-control ${errors.serviceId ? 'appointment-booking-input-error' : ''}`}
                  value={formData.serviceId}
                  onChange={handleFormChange}
                >
                  <option value="">-- Chọn dịch vụ --</option>
                  {services.map(service => (
                    <option key={service.id} value={service.id}>
                      {service.name} ({service.price?.toLocaleString('vi-VN')} VNĐ)
                    </option>
                  ))}
                </select>
                {renderError('serviceId')}
              </div>

              {/* 2. Chọn Bác sĩ */}
              <div className="appointment-booking-form-group">
                <label>Bác sĩ *</label>
                <select 
                  name="doctorId"
                  className={`appointment-booking-form-control ${errors.doctorId ? 'appointment-booking-input-error' : ''}`}
                  value={formData.doctorId}
                  onChange={handleFormChange}
                  disabled={!formData.serviceId || loading.doctors}
                >
                  <option value="">-- Chọn bác sĩ --</option>
                  {loading.doctors && <option>Đang tải bác sĩ...</option>}
                  {doctors.map(doctor => (
                    <option key={doctor.id} value={doctor.id}>
                      BS. {doctor.user?.full_name} ({doctor.specialty?.name})
                    </option>
                  ))}
                </select>
                {renderError('doctorId')}
                {!selectedService?.allow_doctor_choice && formData.serviceId && (
                  <small className="appointment-booking-info-text">
                    <FaInfoCircle /> Dịch vụ này sẽ được tự động phân công bác sĩ.
                  </small>
                )}
              </div>

              {/* 3. Chọn Ngày */}
              <div className="appointment-booking-form-group">
                <label>Thời gian khám *</label>
                <div className="appointment-booking-date-tabs">
                  {nextThreeDays.map(date => (
                     <button
                        key={date.toISOString()}
                        className={`appointment-booking-date-tab ${formData.date === formatDateISO(date) ? 'appointment-booking-active' : ''}`}
                        onClick={() => {
                          setFormData(prev => ({...prev, date: formatDateISO(date), time: ''}));
                          setErrors(prev => ({ ...prev, date: null }));
                        }}
                     >
                       <span>{date.toLocaleDateString('vi-VN', { weekday: 'long' })}</span>
                       <strong>{date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</strong>
                     </button>
                  ))}
                  <input 
                    type="date"
                    className={`appointment-booking-date-picker-btn ${errors.date ? 'appointment-booking-input-error' : ''}`}
                    value={formData.date}
                    min={formatDateISO(new Date())}
                    onChange={(e) => {
                      setFormData(prev => ({...prev, date: e.target.value, time: ''}));
                      setErrors(prev => ({ ...prev, date: null }));
                    }}
                  />
                </div>
                {renderError('date')}
              </div>

              {/* 4. Chọn Giờ */}
              {formData.date && (
                <div className="appointment-booking-time-picker">
                  {loading.slots ? (
                    <div className="appointment-booking-loading-spinner">
                      <FaSpinner className="fa-spin" /><p>Đang tải khung giờ...</p>
                    </div>
                  ) : (
                    <>
                      {availableSlots.morning.length > 0 && (
                        <div className="appointment-booking-time-period">
                          <h4><FaSun /> Buổi sáng</h4>
                          <div className="appointment-booking-time-slots-grid">
                            {availableSlots.morning.map((slot) => (
                              <button 
                                key={slot.time} 
                                className={`appointment-booking-time-slot ${formData.time === slot.time ? 'appointment-booking-active' : ''}`} 
                                onClick={() => handleTimeSelect(slot)}
                                disabled={slot.status !== 'available'}
                                title={slot.reason}
                              >
                                {slot.time}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {availableSlots.afternoon.length > 0 && (
                        <div className="appointment-booking-time-period">
                          <h4><FaCloudSun /> Buổi chiều</h4>
                          <div className="appointment-booking-time-slots-grid">
                            {availableSlots.afternoon.map((slot) => (
                              <button 
                                key={slot.time} 
                                className={`appointment-booking-time-slot ${formData.time === slot.time ? 'appointment-booking-active' : ''}`} 
                                onClick={() => handleTimeSelect(slot)}
                                disabled={slot.status !== 'available'}
                                title={slot.reason}
                              >
                                {slot.time}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {availableSlots.evening.length > 0 && (
                        <div className="appointment-booking-time-period">
                          <h4><FaMoon /> Buổi tối</h4>
                          <div className="appointment-booking-time-slots-grid">
                            {availableSlots.evening.map((slot) => (
                              <button 
                                key={slot.time} 
                                className={`appointment-booking-time-slot ${formData.time === slot.time ? 'appointment-booking-active' : ''}`} 
                                onClick={() => handleTimeSelect(slot)}
                                disabled={slot.status !== 'available'}
                                title={slot.reason}
                              >
                                {slot.time}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                       {!availableSlots.morning.length && !availableSlots.afternoon.length && !availableSlots.evening.length && (
                         <div className="appointment-booking-no-data-box">
                           <FaExclamationTriangle />
                           <h3>Không có lịch trống</h3>
                           <p>Bác sĩ đã kín lịch hoặc không làm việc vào ngày này. Vui lòng chọn ngày khác.</p>
                         </div>
                       )}
                       {renderError('time')}
                    </>
                  )}
                </div>
              )}
              
            </div>

            {/* === CỘT BÊN PHẢI: THÔNG TIN KHÁCH HÀNG === */}
            <div className="appointment-booking-right-col">
              <h2>Thông tin khách hàng</h2>
              
              {!isGuest && (
                <div className="appointment-booking-form-group">
                  <label>Đặt lịch cho</label>
                  <div className="appointment-booking-radio-group">
                    <label>
                      <input type="radio" name="bookingFor" value="self" checked={formData.bookingFor === 'self'} onChange={handleFormChange} />
                      Bản thân
                    </label>
                    <label>
                      <input type="radio" name="bookingFor" value="other" checked={formData.bookingFor === 'other'} onChange={handleFormChange} />
                      Người thân
                    </label>
                  </div>
                </div>
              )}

              <div className="appointment-booking-form-grid">
                <div className="appointment-booking-form-group">
                  <label>Họ và tên *</label>
                  <input type="text" name="name" placeholder="Nhập họ và tên" value={formData.name} onChange={handleFormChange} className={errors.name ? 'appointment-booking-input-error' : ''} />
                  {renderError('name')}
                </div>
                <div className="appointment-booking-form-group">
                  <label>Giới tính</label>
                  <select name="gender" value={formData.gender} onChange={handleFormChange}>
                    <option value="">-- Chọn --</option>
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                    <option value="other">Khác</option>
                  </select>
                </div>
                 <div className="appointment-booking-form-group">
                  <label>Ngày tháng năm sinh *</label>
                  <input type="date" name="dob" value={formData.dob} onChange={handleFormChange} className={errors.dob ? 'appointment-booking-input-error' : ''} />
                  {renderError('dob')}
                </div>
                <div className="appointment-booking-form-group">
                  <label>Số điện thoại *</label>
                  <input type="tel" name="phone" placeholder="Nhập số điện thoại" value={formData.phone} onChange={handleFormChange} className={errors.phone ? 'appointment-booking-input-error' : ''} />
                  {renderError('phone')}
                </div>
                <div className="appointment-booking-form-group full-width">
                  <label>Email *</label>
                  <input type="email" name="email" placeholder="Nhập email" value={formData.email} onChange={handleFormChange} className={errors.email ? 'appointment-booking-input-error' : ''} />
                  {renderError('email')}
                </div>
                <div className="appointment-booking-form-group full-width">
                  <label>Lý do khám (Không bắt buộc)</label>
                  <textarea name="reason" placeholder="Nhập lý do khám..." value={formData.reason} onChange={handleFormChange} />
                </div>
              </div>
              
              <div className="appointment-booking-terms">
                 <input type="checkbox" id="terms" defaultChecked />
                 <label htmlFor="terms">Tôi đã đọc và đồng ý với <a href="/terms" target="_blank" rel="noopener noreferrer">Chính sách bảo vệ dữ liệu cá nhân</a>.</label>
              </div>

              <button 
                className="appointment-booking-btn-confirm" 
                onClick={handleConfirmBooking}
                disabled={loading.submit}
              >
                {loading.submit ? <FaSpinner className="fa-spin" /> : <FaCheckCircle />}
                Gửi thông tin
              </button>
            </div>
          </div>
        </div>

        {/* Modal Xác nhận */}
        {showConfirmModal && (
          <div className="appointment-booking-modal-overlay" onClick={() => setShowConfirmModal(false)}>
            <div className="appointment-booking-modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Xác nhận thông tin đặt lịch</h2>
              <div className="appointment-booking-confirm-details">
                <p><strong>Dịch vụ:</strong> {selectedService?.name}</p>
                <p><strong>Bác sĩ:</strong> {selectedDoctor?.user?.full_name || 'Sẽ được phân công'}</p>
                <p><strong>Ngày khám:</strong> {formData.date}</p>
                <p><strong>Giờ khám:</strong> {formData.time}</p>
                <p><strong>Khách hàng:</strong> {formData.name}</p>
                <p><strong>Giá:</strong> {selectedService?.price?.toLocaleString('vi-VN')} VNĐ</p>
              </div>
              <div className="appointment-booking-modal-actions">
                <button className="appointment-booking-btn-cancel" onClick={() => setShowConfirmModal(false)}>Hủy</button>
                <button className="appointment-booking-btn-payment" onClick={() => setShowPaymentModal(true)}>Chọn hình thức thanh toán</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Thanh toán */}
        {showPaymentModal && (
          <div className="appointment-booking-modal-overlay" onClick={() => setShowPaymentModal(false)}>
            <div className="appointment-booking-modal-content appointment-booking-payment-modal" onClick={(e) => e.stopPropagation()}>
              <h2>Chọn hình thức thanh toán</h2>
              <div className="appointment-booking-payment-options">
                <button className="appointment-booking-payment-option" onClick={() => handleSubmitBooking('cash')} disabled={loading.submit}>
                  <FaWallet />
                  <span>Thanh toán tiền mặt</span>
                  <small>Thanh toán khi đến khám</small>
                </button>
                <button className="appointment-booking-payment-option" onClick={() => handleSubmitBooking('online')} disabled={loading.submit}>
                  <FaCreditCard />
                  <span>Thanh toán online</span>
                  <small>VNPay, MoMo, ATM...</small>
                </button>
              </div>
              {loading.submit && (
                <div className="appointment-booking-loading-spinner">
                  <FaSpinner className="fa-spin" />
                  <p>Đang xử lý...</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* MỚI: Modal Cảnh báo (Warning) */}
        {warningModal.isOpen && (
          <div className="appointment-booking-modal-overlay" onClick={handleCloseWarning}>
            <div 
              className={`appointment-booking-modal-content appointment-booking-warning-modal ${warningModal.type === 'danger' ? 'type-danger' : 'type-warning'}`} 
              onClick={(e) => e.stopPropagation()}
            >
              <div className="appointment-booking-modal-header">
                 <h2><FaExclamationTriangle /> {warningModal.title}</h2>
                 <button className="appointment-booking-modal-close-btn" onClick={handleCloseWarning}><FaTimes /></button>
              </div>
              <div className="appointment-booking-modal-body">
                <p className="appointment-booking-warning-message">{warningModal.message}</p>
                <p className="appointment-booking-warning-details">{warningModal.details}</p>
              </div>
              <div className="appointment-booking-modal-actions">
                <button className="appointment-booking-btn-cancel" onClick={handleCloseWarning}>
                  Chọn lại
                </button>
                <button 
                  className={`appointment-booking-btn-payment ${warningModal.type === 'danger' ? 'btn-danger' : 'btn-warning'}`} 
                  onClick={handleProceedFromWarning}
                >
                  Tôi hiểu, Tiếp tục
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AppointmentBookingPage;