// client/src/pages/AppointmentBookingPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import serviceService from '../services/serviceService';
import {
  FaCalendarAlt, FaCheckCircle, FaSpinner, FaInfoCircle, FaSun, FaMoon, FaCloudSun,
  FaExclamationTriangle, FaWallet, FaCreditCard, FaTimes, FaComments, FaStethoscope, FaArrowLeft
} from 'react-icons/fa';
import './AppointmentBookingPage.css';
import { normalizeUserList } from '../utils/normalizeUser';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const formatTimeDiff = (milliseconds) => {
  if (milliseconds < 0) return "đã qua";
  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours} giờ ${minutes} phút`;
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
    specialtyFilter: '', // lọc chuyên khoa sau khi chọn dịch vụ
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
  const [allDoctors, setAllDoctors] = useState([]); // toàn bộ bác sĩ của dịch vụ
  const [doctors, setDoctors] = useState([]);        // bác sĩ sau khi lọc chuyên khoa
  const [specialtiesFromDoctors, setSpecialtiesFromDoctors] = useState([]); // chuyên khoa rút ra từ danh sách bác sĩ
  const [availableSlots, setAvailableSlots] = useState({ morning: [], afternoon: [], evening: [] });

  const [loading, setLoading] = useState({
    services: false, doctors: false, slots: false, submit: false,
  });

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [warningModal, setWarningModal] = useState({
    isOpen: false, type: 'warning', title: '', message: '', details: ''
  });

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
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 3; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date);
    }
    return days;
  };

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

    const queryName = searchParams.get('name');
    const queryPhone = searchParams.get('phone');
    const queryEmail = searchParams.get('email');
    const queryDate = searchParams.get('date');
    if (queryName || queryPhone || queryEmail || queryDate) {
      setFormData(prev => ({
        ...prev,
        name: queryName || prev.name,
        phone: queryPhone || prev.phone,
        email: queryEmail || prev.email,
        date: queryDate || prev.date,
      }));
    }

    const loadAllServices = async () => {
      try {
        setLoading(prev => ({ ...prev, services: true }));
        const response = await serviceService.getPublicServices({ limit: 1000 });
        if (response.data.success) {
          setServices(response.data.data || []);
          if (preSelectedServiceId) handleServiceChange(preSelectedServiceId, response.data.data);
          const queriedSpecialty = searchParams.get('specialty');
          if (queriedSpecialty) {
            const matchingService = response.data.data.find(s => s.specialty_id === parseInt(queriedSpecialty));
            if (matchingService) handleServiceChange(matchingService.id, response.data.data);
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
  }, [searchParams]);

  // Khi chọn dịch vụ: load bác sĩ → rút ra chuyên khoa từ bác sĩ
  const handleServiceChange = async (serviceId, serviceList = services) => {
    setFormData(prev => ({ ...prev, serviceId, specialtyFilter: '', doctorId: '', date: '', time: '' }));
    setErrors(prev => ({ ...prev, serviceId: null, doctorId: null }));
    setAllDoctors([]);
    setDoctors([]);
    setSpecialtiesFromDoctors([]);
    setAvailableSlots({ morning: [], afternoon: [], evening: [] });
    if (!serviceId) return;

    try {
      setLoading(prev => ({ ...prev, doctors: true }));
      const selectedService = serviceList.find(s => s.id === parseInt(serviceId));
      let doctorsData = [];
      if (selectedService && selectedService.allow_doctor_choice) {
        const response = await axios.get(`${API_URL}/services/${serviceId}/doctors`);
        if (response.data.success) doctorsData = response.data.doctors || [];
      } else if (selectedService && !selectedService.allow_doctor_choice) {
        toast.info('Dịch vụ này sẽ tự động phân công bác sĩ.');
      }
      const normalized = normalizeUserList(doctorsData, 'doctor');
      setAllDoctors(normalized);
      setDoctors(normalized);

      // Rút ra chuyên khoa duy nhất từ danh sách bác sĩ
      const specMap = new Map();
      normalized.forEach(d => {
        if (d.specialty?.id && d.specialty?.name) {
          specMap.set(d.specialty.id, { id: d.specialty.id, name: d.specialty.name });
        }
      });
      setSpecialtiesFromDoctors(Array.from(specMap.values()));
    } catch (error) {
      console.error('Load doctors error:', error);
      toast.error('Lỗi tải danh sách bác sĩ cho dịch vụ này.');
    } finally {
      setLoading(prev => ({ ...prev, doctors: false }));
    }
  };

  // Khi chọn/bỏ chuyên khoa: lọc danh sách bác sĩ
  const handleSpecialtyFilter = (specId) => {
    const newFilter = formData.specialtyFilter === specId ? '' : specId;
    setFormData(prev => ({ ...prev, specialtyFilter: newFilter, doctorId: '', date: '', time: '' }));
    setAvailableSlots({ morning: [], afternoon: [], evening: [] });
    if (newFilter) {
      setDoctors(allDoctors.filter(d => d.specialty?.id === newFilter));
    } else {
      setDoctors(allDoctors);
    }
  };

  useEffect(() => {
    const loadSlots = async () => {
      if (!formData.doctorId || !formData.date || !formData.serviceId) {
        setAvailableSlots({ morning: [], afternoon: [], evening: [] });
        return;
      }
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const selectedDate = new Date(formData.date); selectedDate.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        setAvailableSlots({ morning: [], afternoon: [], evening: [] });
        toast.error('Không thể chọn ngày trong quá khứ.');
        return;
      }
      try {
        setLoading(prev => ({ ...prev, slots: true }));
        const response = await axios.get(`${API_URL}/appointments/available-slots`, {
          params: { doctor_id: formData.doctorId, date: formData.date, service_id: formData.serviceId }
        });
        if (response.data.success) {
          const grouped = response.data.data.grouped || { morning: [], afternoon: [], evening: [] };
          const now = new Date();
          const isToday = (formData.date === formatDateISO(now));
          if (isToday) {
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            const filterSlots = (slots) => slots.map(slot => {
              const [h, m] = slot.time.split(':').map(Number);
              if ((h * 60 + m) <= currentMinutes && slot.status === 'available')
                return { ...slot, status: 'unavailable', reason: 'Đã qua giờ' };
              return slot;
            });
            grouped.morning = filterSlots(grouped.morning);
            grouped.afternoon = filterSlots(grouped.afternoon);
            grouped.evening = filterSlots(grouped.evening);
          }
          setAvailableSlots(grouped);
        } else {
          setAvailableSlots({ morning: [], afternoon: [], evening: [] });
          toast.info(response.data.message || 'Không có khung giờ trống');
        }
      } catch (error) {
        console.error('Load slots error:', error);
        setAvailableSlots({ morning: [], afternoon: [], evening: [] });
        toast.error(error.response?.data?.message || 'Lỗi tải khung giờ');
      } finally {
        setLoading(prev => ({ ...prev, slots: false }));
      }
    };
    loadSlots();
  }, [formData.doctorId, formData.date, formData.serviceId]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
    if (name === 'serviceId') handleServiceChange(value);
    if (name === 'doctorId' || name === 'date') {
      setFormData(prev => ({ ...prev, time: '' }));
      setErrors(prev => ({ ...prev, time: null }));
    }
    if (name === 'bookingFor') {
      if (value === 'self' && user) {
        setFormData(prev => ({
          ...prev, name: user.full_name || '', email: user.email || '',
          phone: user.phone || '', gender: user.gender || '',
          dob: user.dob ? user.dob.split('T')[0] : '',
        }));
      } else {
        setFormData(prev => ({ ...prev, name: '', email: '', phone: '', gender: '', dob: '' }));
      }
      setErrors(prev => ({ ...prev, name: null, email: null, phone: null, dob: null }));
    }
  };

  const handleTimeSelect = (timeSlot) => {
    const now = new Date();
    const isToday = (formData.date === formatDateISO(now));
    if (isToday) {
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const [h, m] = timeSlot.time.split(':').map(Number);
      if ((h * 60 + m) <= currentMinutes) {
        toast.warn('Không thể chọn giờ trong quá khứ.');
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

  const handleConfirmBooking = () => {
    if (!validateForm()) {
      toast.error('Vui lòng điền đầy đủ các trường bắt buộc.');
      return;
    }
    const now = new Date();
    const appointmentTime = new Date(`${formData.date}T${formData.time}:00`);
    const diffInMillis = appointmentTime.getTime() - now.getTime();
    const diffInHours = diffInMillis / (1000 * 60 * 60);
    const nowStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const apptDateStr = new Date(formData.date).toLocaleDateString('vi-VN');
    const apptStr = `${formData.time} ngày ${apptDateStr}`;
    const timeRemaining = formatTimeDiff(diffInMillis);

    if (diffInHours < 6) {
      setWarningModal({
        isOpen: true, type: 'danger', title: 'Cảnh báo quan trọng!',
        message: `Bạn đặt lịch vào lúc ${apptStr}. Hiện tại là ${nowStr} (chỉ còn ${timeRemaining}).`,
        details: 'Bạn sẽ KHÔNG THỂ HỦY LỊCH hoặc ĐỔI LỊCH. Nếu không đến, khoản thanh toán online (nếu có) sẽ không được hoàn lại. Bạn có chắc chắn muốn tiếp tục?'
      });
      return;
    }
    if (diffInHours < 24) {
      setWarningModal({
        isOpen: true, type: 'warning', title: 'Lưu ý đổi lịch!',
        message: `Bạn đặt lịch vào lúc ${apptStr}. Hiện tại là ${nowStr} (còn ${timeRemaining}).`,
        details: 'Theo quy định, bạn sẽ KHÔNG THỂ ĐỔI LỊCH (cần đổi trước 24 giờ). Bạn có chắc chắn muốn tiếp tục?'
      });
      return;
    }
    setShowConfirmModal(true);
  };

  const handleProceedFromWarning = () => {
    setWarningModal({ isOpen: false, type: '', message: '', details: '' });
    setShowConfirmModal(true);
  };

  const handleCloseWarning = () => {
    setWarningModal({ isOpen: false, type: '', message: '', details: '' });
  };

  const handleSubmitBooking = async (paymentMethod) => {
    if (!validateForm()) return;
    try {
      setLoading(prev => ({ ...prev, submit: true }));
      setShowConfirmModal(false);
      setShowPaymentModal(false);
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const payload = {
        service_id: formData.serviceId, doctor_id: formData.doctorId,
        appointment_date: formData.date, appointment_start_time: formData.time,
        appointment_type: formData.appointmentType, reason: formData.reason,
        payment_method: paymentMethod, guest_name: formData.name,
        guest_email: formData.email, guest_phone: formData.phone,
        guest_gender: formData.gender, guest_dob: formData.dob,
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
    } finally {
      setLoading(prev => ({ ...prev, submit: false }));
    }
  };

  const nextThreeDays = getNextThreeDays();
  const selectedService = services.find(s => s.id === parseInt(formData.serviceId));
  const selectedDoctor = doctors.find(d => d.id === parseInt(formData.doctorId));

  const renderError = (fieldName) => {
    if (errors[fieldName]) {
      return (
        <small className="abp-error-text">
          {errors[fieldName]}
        </small>
      );
    }
    return null;
  };

  return (
    <div className="abp-root">
      <div className="abp-container">

        {/* TOP BAR */}
        <div className="abp-topbar">
          <button className="abp-back-btn" onClick={() => navigate(-1)} title="Quay lại">
            <FaArrowLeft /> Quay lại
          </button>
          <button className="abp-switch-btn" onClick={() => navigate('/dat-lich-tu-van')} title="Đặt lịch tư vấn">
            <FaComments /> Tư vấn trực tuyến
          </button>
        </div>

        {/* CARD */}
        <div className="abp-card">

          {/* CARD HEADER */}
          <div className="abp-card-header">
            <div className="abp-card-header-icon"><FaCalendarAlt /></div>
            <div className="abp-card-header-text">
              <h1>Đặt Lịch Khám Bệnh</h1>
              <p>Vui lòng hoàn tất các thông tin dưới đây để đặt lịch</p>
            </div>
          </div>

          {/* CARD BODY — 2 CỘT */}
          <div className="abp-card-body">

            {/* === CỘT TRÁI === */}
            <div className="abp-left-col">
              <h2 className="abp-section-title">
                <FaStethoscope /> Nội dung chi tiết đặt hẹn
              </h2>

              {/* CHỌN DỊCH VỤ */}
              <div className="abp-form-group">
                <label className="abp-label">
                  Dịch vụ khám <span className="abp-required">*</span>
                </label>
                <select
                  name="serviceId"
                  className={`abp-select ${errors.serviceId ? 'error' : ''}`}
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

              {/* BỘ LỌC CHUYÊN KHOA — chỉ hiện sau khi đã chọn dịch vụ và có bác sĩ */}
              {formData.serviceId && specialtiesFromDoctors.length > 0 && (
                <div className="abp-form-group">
                  <label className="abp-label">Lọc theo chuyên khoa</label>
                  <div className="abp-specialty-list">
                    {specialtiesFromDoctors.map(spec => (
                      <button
                        key={spec.id}
                        type="button"
                        className={`abp-specialty-btn ${formData.specialtyFilter === spec.id ? 'active' : ''}`}
                        onClick={() => handleSpecialtyFilter(spec.id)}
                      >
                        <span className="abp-spec-name">{spec.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* CHỌN BÁC SĨ */}
              <div className="abp-form-group">
                <label className="abp-label">
                  Bác sĩ <span className="abp-required">*</span>
                </label>
                <select
                  name="doctorId"
                  className={`abp-select ${errors.doctorId ? 'error' : ''}`}
                  value={formData.doctorId}
                  onChange={handleFormChange}
                  disabled={!formData.serviceId || loading.doctors}
                >
                  <option value="">-- Chọn bác sĩ --</option>
                  {loading.doctors && <option>Đang tải bác sĩ...</option>}
                  {doctors.map(doctor => (
                    <option key={doctor.id} value={doctor.id}>
                      BS. {doctor.full_name}{doctor.specialty?.name ? ` (${doctor.specialty.name})` : ''}
                    </option>
                  ))}
                </select>
                {renderError('doctorId')}
                {!selectedService?.allow_doctor_choice && formData.serviceId && (
                  <small className="abp-info-text">
                    <FaInfoCircle /> Dịch vụ này sẽ được tự động phân công bác sĩ.
                  </small>
                )}
              </div>

              {/* CHỌN NGÀY */}
              <div className="abp-form-group">
                <label className="abp-label">
                  Thời gian khám <span className="abp-required">*</span>
                </label>
                <div className="abp-date-tabs">
                  {nextThreeDays.map(date => (
                    <button
                      key={date.toISOString()}
                      type="button"
                      className={`abp-date-btn ${formData.date === formatDateISO(date) ? 'active' : ''}`}
                      onClick={() => {
                        setFormData(prev => ({ ...prev, date: formatDateISO(date), time: '' }));
                        setErrors(prev => ({ ...prev, date: null }));
                      }}
                    >
                      <span className="abp-date-btn-day">{date.toLocaleDateString('vi-VN', { weekday: 'short' })}</span>
                      <strong className="abp-date-btn-num">{date.getDate()}/{date.getMonth() + 1}</strong>
                    </button>
                  ))}
                  <input
                    type="date"
                    className={`abp-date-picker-input ${errors.date ? 'error' : ''}`}
                    value={formData.date}
                    min={formatDateISO(new Date())}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, date: e.target.value, time: '' }));
                      setErrors(prev => ({ ...prev, date: null }));
                    }}
                  />
                </div>
                {renderError('date')}
              </div>

              {/* TIME SLOTS */}
              {formData.date && (
                <div className="abp-slots-area">
                  {loading.slots ? (
                    <div className="abp-loading-slots">
                      <FaSpinner className="abp-spin" /> Đang tải khung giờ...
                    </div>
                  ) : (
                    <>
                      {['morning', 'afternoon', 'evening'].map(pd => (
                        availableSlots[pd]?.length > 0 && (
                          <div key={pd} className="abp-slot-section">
                            <div className="abp-slot-section-label">
                              {pd === 'morning' ? <FaSun /> : pd === 'afternoon' ? <FaCloudSun /> : <FaMoon />}
                              {pd === 'morning' ? 'Buổi sáng' : pd === 'afternoon' ? 'Buổi chiều' : 'Buổi tối'}
                            </div>
                            <div className="abp-slot-grid">
                              {availableSlots[pd].map((slot) => (
                                <button
                                  key={slot.time}
                                  type="button"
                                  className={`abp-slot-btn ${formData.time === slot.time ? 'active' : ''} ${slot.status !== 'available' ? 'disabled' : ''}`}
                                  onClick={() => handleTimeSelect(slot)}
                                  disabled={slot.status !== 'available'}
                                  title={slot.reason}
                                >
                                  {slot.time}
                                </button>
                              ))}
                            </div>
                          </div>
                        )
                      ))}
                      {!availableSlots.morning.length && !availableSlots.afternoon.length && !availableSlots.evening.length && (
                        <div className="abp-no-slots">
                          <FaExclamationTriangle /> Không có lịch trống ngày này.
                        </div>
                      )}
                      {renderError('time')}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* === CỘT PHẢI === */}
            <div className="abp-right-col">
              <h2 className="abp-section-title">
                Thông tin khách hàng
              </h2>

              {/* ĐẶT LỊCH CHO */}
              {!isGuest && (
                <div className="abp-form-group">
                  <label className="abp-label">Đặt lịch cho</label>
                  <div className="abp-for-toggle">
                    <label className={`abp-for-option ${formData.bookingFor === 'self' ? 'active' : ''}`}>
                      <input type="radio" name="bookingFor" value="self" checked={formData.bookingFor === 'self'} onChange={handleFormChange} />
                      Bản thân
                    </label>
                    <label className={`abp-for-option ${formData.bookingFor === 'other' ? 'active' : ''}`}>
                      <input type="radio" name="bookingFor" value="other" checked={formData.bookingFor === 'other'} onChange={handleFormChange} />
                      Người thân
                    </label>
                  </div>
                </div>
              )}

              <div className="abp-row-2col">
                <div className="abp-form-group">
                  <label className="abp-label">Họ và tên <span className="abp-required">*</span></label>
                  <input
                    className={`abp-input ${errors.name ? 'error' : ''}`}
                    type="text" name="name" placeholder="Nguyễn Văn A"
                    value={formData.name} onChange={handleFormChange}
                  />
                  {renderError('name')}
                </div>
                <div className="abp-form-group">
                  <label className="abp-label">Giới tính</label>
                  <select className="abp-select" name="gender" value={formData.gender} onChange={handleFormChange}>
                    <option value="">-- Chọn --</option>
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                    <option value="other">Khác</option>
                  </select>
                </div>
              </div>

              <div className="abp-row-2col">
                <div className="abp-form-group">
                  <label className="abp-label">Ngày sinh <span className="abp-required">*</span></label>
                  <input
                    className={`abp-input ${errors.dob ? 'error' : ''}`}
                    type="date" name="dob" value={formData.dob} onChange={handleFormChange}
                  />
                  {renderError('dob')}
                </div>
                <div className="abp-form-group">
                  <label className="abp-label">Số điện thoại <span className="abp-required">*</span></label>
                  <input
                    className={`abp-input ${errors.phone ? 'error' : ''}`}
                    type="tel" name="phone" placeholder="0900 000 000"
                    value={formData.phone} onChange={handleFormChange}
                  />
                  {renderError('phone')}
                </div>
              </div>

              <div className="abp-form-group">
                <label className="abp-label">Email <span className="abp-required">*</span></label>
                <input
                  className={`abp-input ${errors.email ? 'error' : ''}`}
                  type="email" name="email" placeholder="example@email.com"
                  value={formData.email} onChange={handleFormChange}
                />
                {renderError('email')}
              </div>

              <div className="abp-form-group">
                <label className="abp-label">Lý do khám (Không bắt buộc)</label>
                <textarea
                  className="abp-textarea"
                  name="reason" placeholder="Nhập lý do khám..."
                  value={formData.reason} onChange={handleFormChange}
                />
              </div>

              <div className="abp-policy-row">
                <input type="checkbox" id="terms" defaultChecked />
                <span className="abp-policy-text">
                  Tôi đã đọc và đồng ý với{' '}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="abp-policy-link">
                    Chính sách bảo vệ dữ liệu cá nhân
                  </a>.
                </span>
              </div>

              <button
                type="button"
                className="abp-submit-btn"
                onClick={handleConfirmBooking}
                disabled={loading.submit}
              >
                {loading.submit ? <FaSpinner className="abp-spin" /> : <FaCheckCircle />}
                {loading.submit ? 'Đang xử lý...' : 'Xác nhận đặt lịch'}
              </button>
            </div>

          </div>
        </div>

        {/* MODAL XÁC NHẬN */}
        {showConfirmModal && (
          <div className="abp-modal-overlay" onClick={() => setShowConfirmModal(false)}>
            <div className="abp-modal" onClick={e => e.stopPropagation()}>
              <div className="abp-modal-header">
                <h3><FaCheckCircle style={{ color: '#3aaa6f' }} /> Xác nhận thông tin</h3>
                <button className="abp-modal-close-btn" onClick={() => setShowConfirmModal(false)}><FaTimes /></button>
              </div>
              <div className="abp-modal-body">
                <div className="abp-confirm-row"><span>Dịch vụ</span><strong>{selectedService?.name}</strong></div>
                <div className="abp-confirm-row"><span>Bác sĩ</span><strong>{selectedDoctor ? `BS. ${selectedDoctor.full_name}` : 'Sẽ được phân công'}</strong></div>
                <div className="abp-confirm-row"><span>Ngày khám</span><strong>{formData.date}</strong></div>
                <div className="abp-confirm-row"><span>Giờ khám</span><strong>{formData.time}</strong></div>
                <div className="abp-confirm-row"><span>Khách hàng</span><strong>{formData.name}</strong></div>
                <div className="abp-confirm-total">
                  <span>Tổng thanh toán</span>
                  <strong>{selectedService?.price?.toLocaleString('vi-VN')} VNĐ</strong>
                </div>
              </div>
              <div className="abp-modal-footer">
                <button className="abp-btn-secondary" onClick={() => setShowConfirmModal(false)}>Hủy</button>
                <button className="abp-btn-primary" onClick={() => setShowPaymentModal(true)}>Chọn thanh toán</button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL THANH TOÁN */}
        {showPaymentModal && (
          <div className="abp-modal-overlay" onClick={() => setShowPaymentModal(false)}>
            <div className="abp-modal" onClick={e => e.stopPropagation()}>
              <div className="abp-modal-header">
                <h3><FaWallet style={{ color: '#3aaa6f' }} /> Chọn phương thức thanh toán</h3>
              </div>
              <div className="abp-modal-body">
                <button className="abp-payment-item" onClick={() => handleSubmitBooking('cash')} disabled={loading.submit}>
                  <FaWallet /> Thanh toán tiền mặt
                  <small>Thanh toán khi đến khám</small>
                </button>
                <button className="abp-payment-item" onClick={() => handleSubmitBooking('online')} disabled={loading.submit}>
                  <FaCreditCard /> Thanh toán online
                  <small>VNPay, MoMo, ATM...</small>
                </button>
              </div>
              <div className="abp-modal-footer">
                <button className="abp-btn-secondary full" onClick={() => setShowPaymentModal(false)}>Quay lại</button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL CẢNH BÁO */}
        {warningModal.isOpen && (
          <div className="abp-modal-overlay" onClick={handleCloseWarning}>
            <div className={`abp-modal ${warningModal.type || ''}`} onClick={e => e.stopPropagation()}>
              <div className={`abp-modal-header ${warningModal.type || ''}`}>
                <h3>
                  <FaExclamationTriangle /> {warningModal.title}
                </h3>
                <button className="abp-modal-close-btn" onClick={handleCloseWarning}><FaTimes /></button>
              </div>
              <div className="abp-modal-body">
                <p className="abp-modal-message">{warningModal.message}</p>
                {warningModal.details && <small className="abp-modal-details">{warningModal.details}</small>}
              </div>
              <div className="abp-modal-footer">
                <button className="abp-btn-secondary" onClick={handleCloseWarning}>Chọn lại</button>
                <button
                  className={`abp-btn-primary ${warningModal.type === 'danger' ? 'btn-danger' : ''}`}
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