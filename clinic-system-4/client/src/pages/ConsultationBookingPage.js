// client/src/pages/ConsultationBookingPage.js
//  GIAO DIỆN ĐỒNG BỘ 100% VỚI APPOINTMENT BOOKING (SINGLE FORM)
//  FIX LỖI: specialties.map, logic lọc nhanh

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // Bỏ comment nếu dùng thật
import consultationService from '../services/consultationService';
import { toast } from 'react-toastify';
import userService from '../services/userService';
import specialtyService from '../services/specialtyService';
import {
  FaCalendarAlt, FaClock, FaUser, FaStethoscope, FaComments, FaVideo,
  FaFileAlt, FaPaperclip, FaCheckCircle, FaUserMd,
  FaMoneyBillWave, FaArrowLeft, FaSun, FaMoon, FaCloudSun,
  FaWallet, FaCreditCard, FaTimes, FaExclamationTriangle, FaInfoCircle
} from 'react-icons/fa';
import './ConsultationBookingPage.css';
import { normalizeUserList } from '../utils/normalizeUser';

// Helper format thời gian cảnh báo
const formatTimeDiff = (milliseconds) => {
    if (milliseconds < 0) return "đã qua";
    const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));
    const hours = Math.floor((milliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) return `${days} ngày ${hours} giờ`;
    if (hours > 0) return `${hours} giờ ${minutes} phút`;
    return `${minutes} phút`;
};

const ConsultationBookingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth(); // Sử dụng user từ context
  
  // Nhận state từ trang Dịch vụ
  const { doctorId, consultationType } = location.state || {}; 
  
  const [loading, setLoading] = useState({ init: true, doctor: false, slots: false, submit: false });
  
  // Form data
  const [formData, setFormData] = useState({
    doctor_id: doctorId || '',
    specialty_id: '',
    consultation_pricing_id: null,
    appointment_time: '',
    date: '', 
    time: '',
    chief_complaint: '',
    medical_history: '',
    current_medications: '',
    symptom_duration: '',
    attachments: [], // Lưu file
    bookingFor: 'self',
    name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    dob: user?.dob ? user.dob.split('T')[0] : '',
    gender: user?.gender || ''
  });
  
  // Data Options
  const [specialties, setSpecialties] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [allPackages, setAllPackages] = useState([]);
  const [availableSlots, setAvailableSlots] = useState({ morning: [], afternoon: [], evening: [] });
  
  // Filter Type (Chat/Video) - Dùng để lọc gói dịch vụ
  const [filterType, setFilterType] = useState(consultationType || 'chat');
  
  // UI States
  const [errors, setErrors] = useState({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [warningModal, setWarningModal] = useState({ isOpen: false, type: '', title: '', message: '', details: '' });

  // Format tiền
  const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

  // 3 ngày tiếp theo
  const getNextThreeDays = () => {
    const days = [];
    const today = new Date();
    today.setHours(0,0,0,0);
    for (let i = 0; i < 3; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      days.push(d);
    }
    return days;
  };
  const nextThreeDays = getNextThreeDays();

  // === 1. FETCH DATA BAN ĐẦU ===
  useEffect(() => {
    const initData = async () => {
      setLoading(prev => ({ ...prev, init: true }));
      try {
        // 1. Lấy chuyên khoa (Xử lý an toàn mảng)
        const specRes = await specialtyService.getPublicSpecialties();
        let specData = [];
        
        // API trả về: { success: true, count: X, specialties: [...] }
        if (specRes?.data?.specialties && Array.isArray(specRes.data.specialties)) {
          specData = specRes.data.specialties;
        } else if (specRes?.data && Array.isArray(specRes.data)) {
          specData = specRes.data;
        } else if (specRes?.specialties && Array.isArray(specRes.specialties)) {
          specData = specRes.specialties;
        } else if (Array.isArray(specRes)) {
          specData = specRes;
        }
        
        setSpecialties(specData || []);
        console.log(' Chuyên khoa loaded:', specData);

        // 2. Nếu có doctorId -> Load thông tin chi tiết bác sĩ & Gói
        if (doctorId) {
          await loadDoctorDetails(doctorId);
        }
      } catch (error) {
        console.error(" Init Error:", error);
        setSpecialties([]);
      } finally {
        setLoading(prev => ({ ...prev, init: false }));
      }
    };
    initData();
  }, [doctorId]);

  // Hàm load chi tiết bác sĩ riêng để tái sử dụng
  const loadDoctorDetails = async (id) => {
    setLoading(prev => ({ ...prev, doctor: true }));
    try {
      const docRes = await userService.getUserById(id);
      const docData = docRes?.data?.user;
      setSelectedDoctor(docData);
      
      // Auto-set chuyên khoa
      if (docData?.roleData?.specialty?.id) {
        // ✅ FIX: Ép chọn luôn doctor_id và specialty_id vào form data
        setFormData(prev => ({ 
            ...prev, 
            specialty_id: docData.roleData.specialty.id,
            doctor_id: id // Đảm bảo ID bác sĩ được chọn trong select box
        }));
        
        // Load các bác sĩ cùng khoa (để user đổi nếu muốn)
        const docsInSpec = await userService.getDoctorsBySpecialty(docData.roleData.specialty.id);
    const doctorsInSpecData = docsInSpec?.data?.data || [];
    setDoctors(normalizeUserList(Array.isArray(doctorsInSpecData) ? doctorsInSpecData : [], 'doctor'));
      }

      // Load gói dịch vụ
      const pkgRes = await consultationService.getDoctorPricing(id);
      // API trả về: { success: true, data: [...] }
      const pkgData = pkgRes?.data?.data || pkgRes?.data || [];
      setAllPackages(Array.isArray(pkgData) ? pkgData : []);
      
      console.log(' Doctor details & packages loaded:', { doctor: docData, packages: pkgData });
    } catch (e) {
      console.error(' Load doctor error:', e);
      setAllPackages([]);
    } finally {
      setLoading(prev => ({ ...prev, doctor: false }));
    }
  };

  // === 2. KHI CHỌN CHUYÊN KHOA -> LOAD BÁC SĨ ===
  useEffect(() => {
    if (formData.specialty_id && !doctorId) { 
      const loadDoctors = async () => {
        try {
          const res = await userService.getDoctorsBySpecialty(formData.specialty_id);
          // API trả về: { success: true, data: [...], total: X }
          const doctorsData = res?.data?.data || [];
          setDoctors(normalizeUserList(Array.isArray(doctorsData) ? doctorsData : [], 'doctor'));
          console.log(' Doctors by specialty:', doctorsData);
        } catch (e) { 
          console.error(' Load doctors error:', e);
          setDoctors([]);
        }
      };
      loadDoctors();
    }
  }, [formData.specialty_id, doctorId]);

  // === 3. LOAD SLOT KHI ĐỦ THÔNG TIN ===
  useEffect(() => {
    if (formData.doctor_id && formData.date && formData.consultation_pricing_id) {
      const loadSlots = async () => {
        setLoading(prev => ({ ...prev, slots: true }));
        try {
          const res = await consultationService.getAvailableSlots(
            formData.doctor_id, 
            formData.date, 
            formData.consultation_pricing_id
          );
          if (res?.data?.success) {
                        const slots = res.data.data?.availableSlots || [];
                             // Chuẩn hoá nhiều dạng response (isBusy / isAvailable / is_available / status)
                             const normalized = (Array.isArray(slots) ? slots : []).map(s => {
                                 let isAvailable = true;
                                 if (Object.prototype.hasOwnProperty.call(s, 'isBusy')) {
                                     isAvailable = !s.isBusy;
                                 } else if (Object.prototype.hasOwnProperty.call(s, 'isAvailable')) {
                                     isAvailable = !!s.isAvailable;
                                 } else if (Object.prototype.hasOwnProperty.call(s, 'is_available')) {
                                     isAvailable = !!s.is_available;
                                 } else if (Object.prototype.hasOwnProperty.call(s, 'status')) {
                                     // status could be 'available' / 'unavailable'
                                     isAvailable = s.status === 'available';
                                 } else if (Object.prototype.hasOwnProperty.call(s, 'available')) {
                                     isAvailable = !!s.available;
                                 }
                                 return { ...s, isAvailable };
                             });

                             const grouped = { morning: [], afternoon: [], evening: [] };
                             normalized.forEach(s => {
                                 const hour = parseInt((s.time || '').split(':')[0]);
                                 if (Number.isFinite(hour)) {
                                     if (hour < 12) grouped.morning.push(s);
                                     else if (hour < 17) grouped.afternoon.push(s);
                                     else grouped.evening.push(s);
                                 }
                             });
                             setAvailableSlots(grouped);
                             console.log(' Slots loaded (normalized):', grouped);
          }
        } catch (e) { 
          console.error(' Load slots error:', e);
          setAvailableSlots({ morning: [], afternoon: [], evening: [] });
        } finally {
          setLoading(prev => ({ ...prev, slots: false }));
        }
      };
      loadSlots();
    }
  }, [formData.doctor_id, formData.date, formData.consultation_pricing_id]);

  // === HANDLERS ===
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    
    // Nếu đổi BookingFor -> Reset/Fill info
    if (name === 'bookingFor') {
        if (value === 'self' && user) {
            setFormData(prev => ({
                ...prev, bookingFor: 'self',
                name: user.full_name, email: user.email, phone: user.phone,
                gender: user.gender, dob: user.dob ? user.dob.split('T')[0] : ''
            }));
        } else {
            setFormData(prev => ({ ...prev, bookingFor: 'other', name: '', email: '', phone: '', gender: '', dob: '' }));
        }
    }
  };

  const handleDoctorSelect = (e) => {
    const newId = e.target.value;
    setFormData(prev => ({ ...prev, doctor_id: newId, consultation_pricing_id: null, date: '', time: '' }));
    if (newId) loadDoctorDetails(newId);
    else {
        setSelectedDoctor(null);
        setAllPackages([]);
    }
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.specialty_id) errs.specialty_id = 'Vui lòng chọn chuyên khoa';
    if (!formData.doctor_id) errs.doctor_id = 'Vui lòng chọn bác sĩ';
    if (!formData.consultation_pricing_id) errs.consultation_pricing_id = 'Vui lòng chọn gói tư vấn';
    if (!formData.date) errs.date = 'Vui lòng chọn ngày';
    if (!formData.time) errs.time = 'Vui lòng chọn giờ';
    if (!formData.chief_complaint || formData.chief_complaint.trim() === '') errs.chief_complaint = 'Vui lòng nhập lý do khám/triệu chứng';
    if (!formData.name) errs.name = 'Nhập họ tên';
    if (!formData.phone) errs.phone = 'Nhập số điện thoại';
    
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
        // Show first validation error as popup
        const firstKey = Object.keys(errs)[0];
        const firstMsg = errs[firstKey];
        setWarningModal({
            isOpen: true,
            type: 'warning',
            title: 'Thông tin chưa đầy đủ',
            message: firstMsg,
            details: 'Vui lòng điền đầy đủ thông tin bắt buộc trước khi tiếp tục.'
        });
        return false;
    }
    return true;
  };

  const handlePreSubmit = () => {
    if (!validateForm()) return;

    // Kiểm tra xem gói có miễn phí không
    const selectedPackage = allPackages.find(p => p.id === formData.consultation_pricing_id);
    const isFree = selectedPackage && parseFloat(selectedPackage.price) === 0;

    // Nếu miễn phí, bỏ qua modal thanh toán và tạo trực tiếp
    if (isFree) {
        handleFinalSubmit('free'); // Gọi trực tiếp với method='free'
        return;
    }

    // Logic cảnh báo thời gian (giống AppointmentBooking)
    const now = new Date();
    const apptTime = new Date(`${formData.date}T${formData.time}:00`);
    const diffHours = (apptTime - now) / 36e5;

    if (diffHours < 6) {
        setWarningModal({
            isOpen: true, type: 'danger', title: 'Cảnh báo gấp!',
            message: `Lịch hẹn chỉ còn ${formatTimeDiff(apptTime - now)}.`,
            details: 'Bạn sẽ KHÔNG THỂ HỦY hoặc HOÀN TIỀN. Tiếp tục?'
        });
        return;
    }
    setShowConfirmModal(true);
  };

  const handleFinalSubmit = async (method) => {
    try {
        setLoading(prev => ({ ...prev, submit: true }));
        // Build appointment_time from date + time if not already set
        const appointment_time = formData.appointment_time || (formData.date && formData.time ? `${formData.date}T${formData.time}:00` : null);

        const payload = {
            ...formData,
            appointment_time,
            payment_method: method,
            attachments: JSON.stringify(formData.attachments || [])
        };
        
        // Debug: Log payload để kiểm tra
        console.log('📤 Payload gửi đi:', {
            doctor_id: payload.doctor_id,
            consultation_pricing_id: payload.consultation_pricing_id,
            appointment_time: payload.appointment_time,
            chief_complaint: payload.chief_complaint,
            specialty_id: payload.specialty_id
        });
        
        const res = await consultationService.createConsultation(payload);
        if (res.data.success) {
            // Consultation is saved in its own model/table. Navigate to consultation detail page.
            setWarningModal({
                isOpen: true,
                type: 'success',
                title: 'Đặt lịch thành công',
                message: 'Bạn đã đặt lịch tư vấn thành công!',
                details: 'Bạn sẽ được chuyển đến trang chi tiết tư vấn.',
                onConfirm: () => navigate(`/tu-van/${res.data.data.id}`)
            });
        }
    } catch (e) {
        // Always show errors as popup
        const serverMsg = e.response?.data?.message || e.message || 'Lỗi đặt lịch';
        const status = e.response?.status;
        
        console.error('❌ Lỗi đặt lịch:', {
            status,
            message: serverMsg,
            response: e.response?.data
        });
        
        setWarningModal({
            isOpen: true,
            type: 'danger',
            title: status >= 500 ? 'Lỗi hệ thống' : 'Không thể đặt lịch',
            message: serverMsg,
            details: status >= 500 
                ? 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau.' 
                : 'Vui lòng kiểm tra lại thông tin và thử lại.'
        });
    } finally {
        setLoading(prev => ({ ...prev, submit: false }));
        setShowConfirmModal(false);
        setShowPaymentModal(false);
    }
  };

  return (
    <div className="cbp-page">
      <div className="cbp-container">
        
        {/* Header */}
        <div className="cbp-header">
          <div className="cbp-header-top">
            <button className="cbp-back-btn" onClick={() => navigate(-1)} title="Quay lại">
              <FaArrowLeft /> Quay lại
            </button>
            <button className="cbp-switch-btn" onClick={() => navigate('/dat-lich-hen')} title="Đặt lịch hẹn dịch vụ thường">
              <FaCalendarAlt /> Dịch vụ thường
            </button>
          </div>
          <h1><FaComments /> Đặt Lịch Tư Vấn Trực Tuyến</h1>
          <p>Vui lòng hoàn tất các thông tin dưới đây để đặt lịch</p>
        </div>

        <div className="cbp-main-content">
            {/* === LEFT COL: CHI TIẾT ĐẶT HẸN === */}
            <div className="cbp-left-col">
                <h2>Nội dung chi tiết đặt hẹn</h2>
                
                {/* 3 Items Responsive Grid: Specialty, Doctor, Type */}
                <div className="cbp-top-3-grid">
                    {/* 1. Chuyên khoa */}
                    <div className="cbp-form-group">
                        <label>Chuyên khoa <span className="req">*</span></label>
                        <select 
                            name="specialty_id" 
                            value={formData.specialty_id} 
                            onChange={handleInputChange}
                            className={`cbp-input ${errors.specialty_id ? 'error' : ''}`}
                        >
                            <option value="">-- Chọn chuyên khoa --</option>
                            {Array.isArray(specialties) && specialties.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                        {errors.specialty_id && <span className="cbp-err">{errors.specialty_id}</span>}
                    </div>

                    {/* 2. Bác sĩ */}
                    <div className="cbp-form-group">
                        <label>Bác sĩ <span className="req">*</span></label>
                        <select 
                            name="doctor_id" 
                            value={formData.doctor_id} 
                            onChange={handleDoctorSelect}
                            className={`cbp-input ${errors.doctor_id ? 'error' : ''}`}
                            disabled={!formData.specialty_id}
                        >
                            <option value="">-- Chọn bác sĩ --</option>
                            {doctors.map(d => (
                                <option key={d.id} value={d.user_id}>
                                    BS. {d.user?.full_name || 'Không tên'}
                                </option>
                            ))}
                        </select>
                        {errors.doctor_id && <span className="cbp-err">{errors.doctor_id}</span>}
                    </div>

                    {/* 3. Loại Tư vấn (Filter) */}
                    <div className="cbp-form-group">
                        <label>Hình thức tư vấn <span className="req">*</span></label>
                        <div className="cbp-type-tabs">
                            <button 
                                className={`cbp-type-btn ${filterType === 'chat' ? 'active' : ''}`}
                                onClick={() => setFilterType('chat')}
                            >
                                <FaComments/> Chat
                            </button>
                            <button 
                                className={`cbp-type-btn ${filterType === 'video' ? 'active' : ''}`}
                                onClick={() => setFilterType('video')}
                            >
                                <FaVideo/> Video Call
                            </button>
                        </div>
                    </div>
                </div>

                {/* Doctor Preview Small */}
                {selectedDoctor && (
                    <div className="cbp-doc-preview">
                        <img src={selectedDoctor.avatar_url || '/default-avatar.png'} alt="avt" />
                        <div>
                            <strong>BS. {selectedDoctor.full_name}</strong>
                            <span>{selectedDoctor.roleData?.specialty?.name}</span>
                        </div>
                    </div>
                )}

                {/* 4. Gói Dịch vụ */}
                <div className="cbp-form-group">
                    <label>Gói dịch vụ <span className="req">*</span></label>
                    <div className="cbp-pkg-list">
                        {allPackages.filter(p => p.package_type === filterType).length === 0 ? (
                            <div className="cbp-empty-pkg">Bác sĩ chưa có gói dịch vụ loại này.</div>
                        ) : (
                            allPackages.filter(p => p.package_type === filterType).map(pkg => (
                                <label key={pkg.id} className={`cbp-pkg-item ${formData.consultation_pricing_id === pkg.id ? 'selected' : ''}`}>
                                    <input 
                                        type="radio" name="pkg" 
                                        checked={formData.consultation_pricing_id === pkg.id}
                                        onChange={() => {
                                            setFormData(prev => ({...prev, consultation_pricing_id: pkg.id}));
                                            setErrors(prev => ({...prev, consultation_pricing_id: ''}));
                                        }}
                                    />
                                    <div className="cbp-pkg-info">
                                        <strong>{pkg.package_name}</strong>
                                        <span>{pkg.duration_minutes} phút</span>
                                    </div>
                                    <div className="cbp-pkg-price">{formatCurrency(pkg.price)}</div>
                                </label>
                            ))
                        )}
                    </div>
                    {errors.consultation_pricing_id && <span className="cbp-err">{errors.consultation_pricing_id}</span>}
                </div>

                {/* 5. Ngày & Giờ */}
                <div className="cbp-form-group">
                    <label>Thời gian khám <span className="req">*</span></label>
                    <div className="cbp-date-tabs">
                        {nextThreeDays.map(d => {
                            // Fix: Sử dụng local date string thay vì ISO để tránh lệch timezone
                            const year = d.getFullYear();
                            const month = String(d.getMonth() + 1).padStart(2, '0');
                            const day = String(d.getDate()).padStart(2, '0');
                            const dStr = `${year}-${month}-${day}`;
                            return (
                                <button key={dStr} 
                                    className={`cbp-date-btn ${formData.date === dStr ? 'active' : ''}`}
                                    onClick={() => setFormData(prev => ({...prev, date: dStr, time: ''}))}
                                >
                                    <span>{d.toLocaleDateString('vi-VN', {weekday: 'short'})}</span>
                                    <strong>{d.getDate()}/{d.getMonth()+1}</strong>
                                </button>
                            )
                        })}
                        <input type="date" className="cbp-date-picker" min={(() => {
                            const today = new Date();
                            const year = today.getFullYear();
                            const month = String(today.getMonth() + 1).padStart(2, '0');
                            const day = String(today.getDate()).padStart(2, '0');
                            return `${year}-${month}-${day}`;
                        })()} 
                            onChange={e => setFormData(prev => ({...prev, date: e.target.value, time: ''}))} 
                        />
                    </div>
                    
                    {/* Time Slots */}
                    {formData.date && (
                        <div className="cbp-slots-area">
                            {loading.slots ? <div className="cbp-mini-load"><FaSun className="spin"/> Đang tải lịch...</div> : (
                                ['morning', 'afternoon', 'evening'].map(pd => (
                                    availableSlots[pd]?.length > 0 && (
                                        <div key={pd} className="cbp-slot-row">
                                            <span>
                                                {pd === 'morning' ? <FaSun/> : pd === 'afternoon' ? <FaCloudSun/> : <FaMoon/>} 
                                                {pd === 'morning' ? 'Sáng' : pd === 'afternoon' ? 'Chiều' : 'Tối'}
                                            </span>
                                            <div className="cbp-slot-grid">
                                                {availableSlots[pd].map(s => {
                                                    const slotDateTime = new Date(`${formData.date}T${s.time}:00`);
                                                    const isPast = slotDateTime.getTime() <= Date.now();
                                                    const disabled = !s.isAvailable || isPast;
                                                    return (
                                                        <button key={s.time}
                                                            className={`cbp-slot ${formData.time === s.time ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
                                                            onClick={() => !disabled && setFormData(prev => ({...prev, time: s.time}))}
                                                            disabled={disabled}
                                                        >
                                                            {s.time}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )
                                ))
                            )}
                            {!availableSlots.morning.length && !availableSlots.afternoon.length && !availableSlots.evening.length && 
                                <div className="cbp-no-slots"><FaExclamationTriangle/> Không có lịch trống ngày này.</div>
                            }
                        </div>
                    )}
                    {errors.time && <span className="cbp-err">{errors.time}</span>}
                </div>

                {/* 6. Triệu chứng */}
                <div className="cbp-form-group">
                    <label>Lý do khám / Triệu chứng <span className="req">*</span></label>
                    <textarea 
                        className="cbp-textarea" rows="3" name="chief_complaint"
                        value={formData.chief_complaint} onChange={handleInputChange}
                        placeholder="Mô tả các triệu chứng hiện tại..."
                    />
                    {errors.chief_complaint && <span className="cbp-err">{errors.chief_complaint}</span>}
                </div>
            </div>

            {/* === RIGHT COL: THÔNG TIN KHÁCH HÀNG === */}
            <div className="cbp-right-col">
                <h2>Thông tin khách hàng</h2>
                
                <div className="cbp-form-group">
                    <label>Đặt lịch cho</label>
                    <div className="cbp-radio-group">
                        <label><input type="radio" name="bookingFor" value="self" checked={formData.bookingFor === 'self'} onChange={handleInputChange} /> Bản thân</label>
                        <label><input type="radio" name="bookingFor" value="other" checked={formData.bookingFor === 'other'} onChange={handleInputChange} /> Người thân</label>
                    </div>
                </div>

                <div className="cbp-row">
                    <div className="cbp-form-group">
                        <label>Họ và tên <span className="req">*</span></label>
                        <input className="cbp-input" name="name" value={formData.name} onChange={handleInputChange} />
                        {errors.name && <span className="cbp-err">{errors.name}</span>}
                    </div>
                    <div className="cbp-form-group">
                        <label>Giới tính</label>
                        <select className="cbp-input" name="gender" value={formData.gender} onChange={handleInputChange}>
                            <option value="">-- Chọn --</option>
                            <option value="male">Nam</option>
                            <option value="female">Nữ</option>
                        </select>
                    </div>
                </div>

                <div className="cbp-row">
                    <div className="cbp-form-group">
                        <label>Ngày sinh</label>
                        <input type="date" className="cbp-input" name="dob" value={formData.dob} onChange={handleInputChange} />
                    </div>
                    <div className="cbp-form-group">
                        <label>SĐT <span className="req">*</span></label>
                        <input className="cbp-input" name="phone" value={formData.phone} onChange={handleInputChange} />
                        {errors.phone && <span className="cbp-err">{errors.phone}</span>}
                    </div>
                </div>

                <div className="cbp-form-group">
                    <label>Email (Nhận kết quả)</label>
                    <input className="cbp-input" name="email" value={formData.email} onChange={handleInputChange} />
                </div>

                <div className="cbp-form-group">
                    <label>Tệp đính kèm (Hình ảnh/KQ XN)</label>
                    <label className="cbp-file-btn">
                        <FaPaperclip /> Chọn file
                        <input type="file" hidden multiple />
                    </label>
                </div>

                <div className="cbp-policy">
                    <input type="checkbox" defaultChecked /> 
                    <span>Tôi đồng ý với <a href="#">chính sách bảo mật</a>.</span>
                </div>

                <button className="cbp-submit-btn" onClick={handlePreSubmit} disabled={loading.submit}>
                    {loading.submit ? 'Đang xử lý...' : 'GỬI THÔNG TIN'} <FaCheckCircle/>
                </button>
            </div>
        </div>

        {/* MODAL CONFIRM */}
        {showConfirmModal && (
            <div className="cbp-modal-overlay">
                <div className="cbp-modal">
                    <div className="cbp-modal-header">
                        <h3>Xác nhận thông tin</h3>
                        <button onClick={() => setShowConfirmModal(false)}><FaTimes/></button>
                    </div>
                    <div className="cbp-modal-body">
                        <div className="cbp-info-row"><span>Bác sĩ:</span> <strong>{selectedDoctor?.full_name}</strong></div>
                        <div className="cbp-info-row"><span>Gói khám:</span> <strong>{allPackages.find(p=>p.id===formData.consultation_pricing_id)?.package_name}</strong></div>
                        <div className="cbp-info-row"><span>Thời gian:</span> <strong>{formData.time} - {formData.date}</strong></div>
                        <div className="cbp-info-row total"><span>Tổng tiền:</span> <strong>{formatCurrency(allPackages.find(p=>p.id===formData.consultation_pricing_id)?.price)}</strong></div>
                    </div>
                    <div className="cbp-modal-footer">
                        <button className="cbp-btn-sec" onClick={() => setShowConfirmModal(false)}>Hủy</button>
                        <button className="cbp-btn-pri" onClick={() => setShowPaymentModal(true)}>Thanh toán</button>
                    </div>
                </div>
            </div>
        )}

        {/* MODAL PAYMENT */}
        {showPaymentModal && (
            <div className="cbp-modal-overlay">
                <div className="cbp-modal">
                    <div className="cbp-modal-header"><h3>Chọn phương thức thanh toán</h3></div>
                    <div className="cbp-modal-body">
                        <button className="cbp-pay-item" onClick={() => handleFinalSubmit('vnpay')}><FaCreditCard/> VNPay / ATM</button>
                        <button className="cbp-pay-item" onClick={() => handleFinalSubmit('momo')}><FaWallet/> Ví MoMo</button>
                    </div>
                    <div className="cbp-modal-footer">
                        <button className="cbp-btn-sec full" onClick={() => setShowPaymentModal(false)}>Quay lại</button>
                    </div>
                </div>
            </div>
        )}

        {/* MODAL WARNING */}
        {warningModal.isOpen && (
            <div className="cbp-modal-overlay">
                <div className={`cbp-modal warning ${warningModal.type || ''}`}>
                    <div className={`cbp-modal-header warning ${warningModal.type || ''}`}>
                        <h3>
                            {warningModal.type === 'success' ? <FaCheckCircle/> : <FaExclamationTriangle/>}
                            {' '}{warningModal.title}
                        </h3>
                    </div>
                    <div className="cbp-modal-body">
                        <p>{warningModal.message}</p>
                        {warningModal.details && <small>{warningModal.details}</small>}
                    </div>
                    <div className="cbp-modal-footer">
                        {warningModal.onConfirm ? (
                            // Custom callback for success case
                            <button className="cbp-btn-pri full" onClick={() => {
                                setWarningModal({isOpen:false});
                                warningModal.onConfirm();
                            }}>OK</button>
                        ) : warningModal.redirectBack ? (
                            // If redirectBack is set, show a single button to go back to previous page
                            <button className="cbp-btn-pri full" onClick={() => { 
                                setWarningModal({isOpen:false}); 
                                navigate(-1); 
                            }}>Về trang dịch vụ</button>
                        ) : warningModal.type === 'warning' || warningModal.type === 'danger' ? (
                            // Error/warning with only dismiss button
                            <button className="cbp-btn-pri full" onClick={() => setWarningModal({isOpen:false})}>Đóng</button>
                        ) : (
                            // Time warning with cancel/continue
                            <>
                                <button className="cbp-btn-sec" onClick={() => setWarningModal({isOpen:false})}>Hủy</button>
                                <button className="cbp-btn-danger" onClick={() => { 
                                    setWarningModal({isOpen:false}); 
                                    setShowConfirmModal(true); 
                                }}>Tiếp tục</button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default ConsultationBookingPage;