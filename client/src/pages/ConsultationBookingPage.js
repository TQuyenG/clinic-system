// client/src/pages/ConsultationBookingPage.js
// ✅ GIAO DIỆN ĐÃ ĐƯỢC CẬP NHẬT
// ✅ ĐÃ ĐỔI TÊN CLASS THEO YÊU CẦU

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
//import { useAuth } from '../contexts/AuthContext';
import consultationService from '../services/consultationService';
import userService from '../services/userService';
// import paymentService from '../services/paymentService'; // Không được sử dụng
import {
  FaCalendarAlt,
  FaClock,
  FaUser,
  FaStethoscope,
  FaComments,
  FaVideo,
  FaFileAlt,
  FaPaperclip,
  // FaCheckCircle, // Không được sử dụng
  FaExclamationTriangle,
  FaMoneyBillWave,
  FaArrowLeft,
  FaArrowRight
} from 'react-icons/fa';
import './ConsultationBookingPage.css'; // Import file CSS mới

const ConsultationBookingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  //const { user } = useAuth();
  
  const { doctorId, consultationType } = location.state || {}; // <-- SỬA LẠI
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form data (Giữ nguyên)
  const [formData, setFormData] = useState({
    doctor_id: doctorId || '',
    specialty_id: '',
    consultation_pricing_id: null,
    appointment_time: '',
    chief_complaint: '',
    medical_history: '',
    current_medications: '',
    symptom_duration: '',
    attachments: [],
    notes: ''
  });
  
  // Options (Giữ nguyên)
  const [specialties, setSpecialties] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [allPackages, setAllPackages] = useState([]);
  const [packageFilterType, setPackageFilterType] = useState(consultationType || 'chat');
  const [availableSlots, setAvailableSlots] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  
  // Errors (Giữ nguyên)
  const [errors, setErrors] = useState({});
  
  // (Bỏ packagePrices vì đã fetch từ API)

  // ==================== FETCH DATA (ĐÃ SỬA LỖI ESLINT) ====================
  
  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const specialtiesRes = await userService.getAllSpecialties();
      setSpecialties(specialtiesRes.data.specialties || []);
      
      if (doctorId) {
        // Giả sử các hàm fetchDoctorDetails và fetchDoctorPricing được định nghĩa BÊN DƯỚI
        // eslint-disable-next-line no-use-before-define
        await fetchDoctorDetails(doctorId); 
        // eslint-disable-next-line no-use-before-define
        await fetchDoctorPricing(doctorId); 
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setLoading(false);
    }
  }, [doctorId]); // <-- THÊM dependency cho useCallback

  // Block useEffect (Giữ nguyên)
  useEffect(() => {
    fetchInitialData();
    }, [fetchInitialData]); // <-- SỬA LẠI: Thêm dependency

  // ========== BẮT ĐẦU THÊM MỚI (SỬA LỖI WARNING) ==========
  useEffect(() => {
    if (formData.specialty_id) {
      // eslint-disable-next-line no-use-before-define
      fetchDoctorsBySpecialty(formData.specialty_id);
    }
  }, [formData.specialty_id]);

  useEffect(() => {
    if (formData.doctor_id) {
      // eslint-disable-next-line no-use-before-define
      fetchDoctorDetails(formData.doctor_id);
      // eslint-disable-next-line no-use-before-define
      fetchDoctorPricing(formData.doctor_id);
    }
  }, [formData.doctor_id]);
  // ========== KẾT THÚC THÊM MỚI ==========
  
  useEffect(() => {
if (formData.doctor_id) {
      fetchAvailableSlots(
        formData.doctor_id,
        selectedDate,
        formData.consultation_pricing_id
      );
    }
  }, [formData.doctor_id, selectedDate, formData.consultation_pricing_id]); // <-- THÊM dependency

  // (Các hàm fetchDoctorsBySpecialty, fetchDoctorDetails, fetchDoctorPricing giữ nguyên)
  
  const fetchDoctorsBySpecialty = async (specialtyId) => {
    try {
      const response = await userService.getDoctorsBySpecialty(specialtyId);
      setDoctors(response.data.doctors || []);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };
  
  const fetchDoctorDetails = async (doctorId) => {
    try {
      const response = await userService.getUserById(doctorId);
      setSelectedDoctor(response.data.user);
      if (response.data.user?.roleData?.specialty?.id) {
        setFormData(prev => ({ 
          ...prev, 
          specialty_id: response.data.user.roleData.specialty.id 
        }));
      }
    } catch (error) {
      console.error('Error fetching doctor details:', error);
    }
  };
  
  const fetchDoctorPricing = async (doctorId) => {
    try {
      const response = await consultationService.getDoctorPricing(doctorId);
      setAllPackages(response.data.data || []);
    } catch (error) {
      console.error('Error fetching pricing:', error);
    }
  };
  
  const fetchAvailableSlots = async (doctorId, date, pricingId) => {
  if (!doctorId || !date || !pricingId) return;

  try {
    setAvailableSlots(null); // Bắt đầu tải
    const response = await consultationService.getAvailableSlots(doctorId, date, pricingId);
    if (response.data.success) {
      setAvailableSlots(response.data.data.availableSlots || []);
    } else {
      setAvailableSlots([]); // Lỗi thì trả mảng rỗng
    }
  } catch (error) {
    console.error('Error fetching slots:', error);
    alert(error.response?.data?.message || 'Lỗi khi tải khung giờ');
    setAvailableSlots([]); // Lỗi thì trả mảng rỗng
  }
};
  // ==================== HANDLE FORM (Giữ nguyên) ====================
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'appointment_time') {
    const datePart = value.split('T')[0];
    if (datePart !== selectedDate) {
      setSelectedDate(datePart);
      setAvailableSlots(null); // Xóa slot cũ khi đổi ngày
    }
  }
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };
  
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        alert('File không được vượt quá 10MB');
        return;
      }
    }
    
    try {
      setLoading(true);
      const uploadedFiles = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        
        // Giả sử service này tồn tại và hoạt động
        // const response = await consultationService.uploadFile(formData); 
        // Mock response để tránh lỗi
        const response = { data: { success: true, file_url: `/uploads/mock/${file.name}` } };
        
        if (response.data.success) {
          uploadedFiles.push({
            name: file.name,
            url: response.data.file_url,
            size: file.size,
            type: file.type
          });
        }
      }
      setFormData(prev => ({
        ...prev,
        attachments: [...prev.attachments, ...uploadedFiles]
      }));
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Lỗi upload file. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleRemoveFile = (index) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  // ==================== VALIDATION (Giữ nguyên) ====================
  
  const validateStep1 = () => {
    const newErrors = {};
    if (!formData.specialty_id) newErrors.specialty_id = 'Vui lòng chọn chuyên khoa';
    if (!formData.doctor_id) newErrors.doctor_id = 'Vui lòng chọn bác sĩ';
    if (!formData.consultation_pricing_id) newErrors.consultation_pricing_id = 'Vui lòng chọn một gói tư vấn';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const validateStep2 = () => {
    const newErrors = {};
    if (!formData.appointment_time) {
      newErrors.appointment_time = 'Vui lòng chọn ngày & giờ hẹn';
    } else {
      const appointmentDate = new Date(formData.appointment_time);
      const now = new Date();
      if (appointmentDate < now) {
        newErrors.appointment_time = 'Thời gian hẹn phải sau thời điểm hiện tại';
      }
    }
    if (!formData.chief_complaint || formData.chief_complaint.trim().length < 10) {
      newErrors.chief_complaint = 'Vui lòng mô tả triệu chứng (ít nhất 10 ký tự)';
    }
    if (!formData.symptom_duration) {
      newErrors.symptom_duration = 'Vui lòng chọn thời gian xuất hiện triệu chứng';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ==================== NAVIGATION (Giữ nguyên) ====================
  
  const handleNextStep = () => {
    let isValid = false;
    if (currentStep === 1) isValid = validateStep1();
    else if (currentStep === 2) isValid = validateStep2();
    if (isValid) setCurrentStep(prev => prev + 1);
  };
  
  const handlePrevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  // ==================== SUBMIT (Giữ nguyên) ====================
  
  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      
      const consultationData = {
        doctor_id: formData.doctor_id,
        specialty_id: formData.specialty_id,
        consultation_pricing_id: formData.consultation_pricing_id,
        appointment_time: formData.appointment_time,
        chief_complaint: formData.chief_complaint,
        medical_history: formData.medical_history,
        current_medications: formData.current_medications,
        symptom_duration: formData.symptom_duration,
        attachments: JSON.stringify(formData.attachments), // Giữ nguyên JSON.stringify
        notes: formData.notes
      };
      
      const response = await consultationService.createConsultation(consultationData);
      
      if (response.data.success) {
        const consultation = response.data.data;

        if (consultation.total_fee <= 0) {
        alert('Đặt lịch miễn phí thành công! Chờ Admin phê duyệt.');
        navigate('/tu-van/lich-su'); // ✅ Chuyển về lịch sử, KHÔNG vào chi tiết
      } else {
        // ✅ Chuyển sang thanh toán
        navigate(`/thanh-toan/${consultation.id}`, { 
          state: {
            consultation_id: consultation.id,
            amount: consultation.total_fee,
            type: 'consultation'
          }
        });
      }
      }
      
    } catch (error) {
      console.error('Error creating consultation:', error);
      // Hiển thị lỗi từ backend (lỗi 400 của bạn)
      alert(error.response?.data?.message || 'Lỗi đặt lịch tư vấn. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  // ==================== RENDER (Cập nhật JSX) ====================

  const formatCurrency = (amount) => {
    // Chuyển đổi amount (có thể là string) sang số
    let numericAmount = parseFloat(amount);
    
    // Nếu không phải là số hợp lệ (isNaN), thì mới set về 0
    if (isNaN(numericAmount)) {
        numericAmount = 0;
    }
    
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(numericAmount);
  };

  if (loading && !specialties.length) {
    return (
      <div className="consultation-booking-page-loading">
        <div className="spinner"></div>
        <p>Đang tải dữ liệu...</p>
      </div>
    );
  }

  return (
    <div className="consultation-booking-page">
      <div className="consultation-booking-page-container">
        
        {/* Header */}
        <div className="consultation-booking-page-header">
          <button className="consultation-booking-page-btn-back" onClick={() => navigate('/tu-van')}>
            <FaArrowLeft /> Quay lại
          </button>
          <div>
            <h1>Đặt Lịch Tư Vấn Real-time</h1>
            <p>Hoàn tất 3 bước để đặt lịch tư vấn với bác sĩ</p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="consultation-booking-page-progress">
          <div className={`consultation-booking-page-progress-step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
            <div className="consultation-booking-page-step-number">{currentStep > 1 ? '✓' : '1'}</div>
            <div className="consultation-booking-page-step-label">Chọn bác sĩ</div>
          </div>
          
          <div className="consultation-booking-page-progress-line"></div>
          
          <div className={`consultation-booking-page-progress-step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
            <div className="consultation-booking-page-step-number">{currentStep > 2 ? '✓' : '2'}</div>
            <div className="consultation-booking-page-step-label">Thông tin</div>
          </div>
          
          <div className="consultation-booking-page-progress-line"></div>
          
          <div className={`consultation-booking-page-progress-step ${currentStep >= 3 ? 'active' : ''}`}>
            <div className="consultation-booking-page-step-number">3</div>
            <div className="consultation-booking-page-step-label">Xác nhận</div>
          </div>
        </div>

        {/* Form Content */}
        <div className="consultation-booking-page-content-wrapper">
          
          {/* STEP 1: Chọn bác sĩ & loại tư vấn */}
          {currentStep === 1 && (
            <div className="consultation-booking-page-step consultation-booking-page-step-1">
              <h2>Bước 1: Chọn Bác sĩ & Loại Tư vấn</h2>
              
              <div className="consultation-booking-page-form-group">
                <label>
                  <FaStethoscope /> Chuyên khoa <span className="consultation-booking-page-required">*</span>
                </label>
                <select
                  name="specialty_id"
                  value={formData.specialty_id}
                  onChange={handleInputChange}
                  className={`consultation-booking-page-select ${errors.specialty_id ? 'error' : ''}`}
                  disabled={!!doctorId}
                >
                  <option value="">-- Chọn chuyên khoa --</option>
                  {specialties.map(specialty => (
                    <option key={specialty.id} value={specialty.id}>
                      {specialty.name}
                    </option>
                  ))}
                </select>
                {errors.specialty_id && (
                  <span className="consultation-booking-page-error-message">{errors.specialty_id}</span>
                )}
              </div>

              <div className="consultation-booking-page-form-group">
                <label>
                  <FaUser /> Bác sĩ <span className="consultation-booking-page-required">*</span>
                </label>
                <select
                  name="doctor_id"
                  value={formData.doctor_id}
                  onChange={handleInputChange}
                  className={`consultation-booking-page-select ${errors.doctor_id ? 'error' : ''}`}
                  disabled={!!doctorId || !formData.specialty_id}
                >
                  <option value="">-- Chọn bác sĩ --</option>
                  {doctors.map(doctor => (
                    <option key={doctor.id} value={doctor.user_id}> 
                      BS. {doctor.user.full_name} - {doctor.experience_years || 0} năm kinh nghiệm
                    </option>
                  ))}
                </select>
                {errors.doctor_id && (
                  <span className="consultation-booking-page-error-message">{errors.doctor_id}</span>
                )}
                
                {selectedDoctor && (
                  <div className="consultation-booking-page-doctor-preview">
                    <img src={selectedDoctor.avatar_url || '/default-avatar.png'} alt={selectedDoctor.full_name} />
                    <div className="consultation-booking-page-doctor-info">
                      <h4>BS. {selectedDoctor.full_name}</h4>
                      <p>{selectedDoctor.roleData?.specialty?.name}</p>
                      <p>⭐ {selectedDoctor.roleData?.avg_rating || 4.5} ({selectedDoctor.roleData?.total_reviews || 0} đánh giá)</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="consultation-booking-page-form-group">
                <label>
                  Loại tư vấn <span className="consultation-booking-page-required">*</span>
                </label>
                
                <div className="consultation-booking-page-package-filter">
                  <button
                    type="button"
                    className={`consultation-booking-page-btn-filter ${packageFilterType === 'chat' ? 'active' : ''}`}
                    onClick={() => setPackageFilterType('chat')}
                  >
                    <FaComments /> Chat Real-time
                  </button>
                  <button
                    type="button"
                    className={`consultation-booking-page-btn-filter ${packageFilterType === 'video' ? 'active' : ''}`}
                    onClick={() => setPackageFilterType('video')}
                  >
                    <FaVideo /> Video Call
                  </button>
                </div>
                
                <div className="consultation-booking-page-package-list">
                  {allPackages.length === 0 && (
                    <div className="consultation-booking-page-package-loading">
                      Đang tải các gói dịch vụ...
                    </div>
                  )}

                  {allPackages
                    .filter(pkg => pkg.package_type === packageFilterType)
                    .map(pkg => (
                      <label 
                        key={pkg.id} 
                        className={`consultation-booking-page-package-option ${formData.consultation_pricing_id === pkg.id ? 'selected' : ''}`}
                      >
                        <input
                          type="radio"
                          name="consultation_pricing_id"
                          value={pkg.id}
                          checked={formData.consultation_pricing_id === pkg.id}
                          onChange={() => {
                            setFormData(prev => ({ ...prev, consultation_pricing_id: pkg.id }));
                            setErrors(prev => ({ ...prev, consultation_pricing_id: null }));
                          }}
                        />
                        <div className="consultation-booking-page-package-info">
                          <h4>{pkg.package_name || `Gói ${pkg.package_type} ${pkg.duration_minutes} phút`}</h4>
                          <p>{pkg.description || `Tư vấn 1-1 với bác sĩ`}</p>
                        </div>
                        <span className="consultation-booking-page-package-price">{formatCurrency(pkg.price)}</span>
                      </label>
                    ))
                  }
                  
                  {errors.consultation_pricing_id && (
                    <span className="consultation-booking-page-error-message">{errors.consultation_pricing_id}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Thông tin tư vấn */}
          {currentStep === 2 && (
            <div className="consultation-booking-page-step consultation-booking-page-step-2">
              <h2>Bước 2: Thông Tin Tư Vấn</h2>
              
              <div className="consultation-booking-page-form-group">
                <label>
                  <FaCalendarAlt /> Ngày & giờ hẹn <span className="consultation-booking-page-required">*</span>
                </label>
                <input
                  type="datetime-local"
                  name="appointment_time"
                  value={formData.appointment_time}
                  onChange={handleInputChange}
                  min={new Date().toISOString().slice(0, 16)}
                  className={`consultation-booking-page-input ${errors.appointment_time ? 'error' : ''}`}
                />
                {errors.appointment_time && (
                  <span className="consultation-booking-page-error-message">{errors.appointment_time}</span>
                )}
                {/* Đây là nơi hiển thị các slot (lấy từ mock data) */}
                {/* Sửa lại tên class và logic render */}
                <div className="consultation-booking-page-slots-container">
                  {availableSlots === null && selectedDate && (
                    <div className="consultation-booking-page-slots-loading">Đang tải khung giờ...</div>
                  )}
                  {availableSlots && availableSlots.length === 0 && selectedDate && (
                    <div className="consultation-booking-page-slots-empty">Không có khung giờ trống cho ngày này.</div>
                  )}
                  {availableSlots && availableSlots.length > 0 && (
                    availableSlots.map(slot => (
                      <button 
                        key={slot.time} 
                        type="button"
                        className={`
                          consultation-booking-page-slot-btn 
                          ${formData.appointment_time.endsWith(slot.time) ? 'active' : ''}
                          ${slot.isBusy ? 'busy' : ''}
                        `}
                        onClick={() => {
                          if (slot.isBusy) return; // Không cho chọn
                          handleInputChange({ target: { name: 'appointment_time', value: `${selectedDate}T${slot.time}` } });
                        }}
                        disabled={slot.isBusy}
                        title={slot.isBusy ? 'Khung giờ này đã có lịch' : `Chọn ${slot.time}`}
                      >
                        {slot.time}
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="consultation-booking-page-form-group">
                <label>
                  <FaFileAlt /> Triệu chứng chính <span className="consultation-booking-page-required">*</span>
                </label>
                <textarea
                  name="chief_complaint"
                  value={formData.chief_complaint}
                  onChange={handleInputChange}
                  rows="4"
                  placeholder="Mô tả triệu chứng của bạn (đau đầu, sốt, ho...)"
                  className={`consultation-booking-page-textarea ${errors.chief_complaint ? 'error' : ''}`}
                />
                {errors.chief_complaint && (
                  <span className="consultation-booking-page-error-message">{errors.chief_complaint}</span>
                )}
              </div>

              <div className="consultation-booking-page-form-group">
                <label>
                  <FaClock /> Thời gian xuất hiện triệu chứng <span className="consultation-booking-page-required">*</span>
                </label>
                <select
                  name="symptom_duration"
                  value={formData.symptom_duration}
                  onChange={handleInputChange}
                  className={`consultation-booking-page-select ${errors.symptom_duration ? 'error' : ''}`}
                >
                  <option value="">-- Chọn thời gian --</option>
                  <option value="today">Hôm nay</option>
                  <option value="2-3days">2-3 ngày</option>
                  <option value="1week">Khoảng 1 tuần</option>
                  <option value="1month">Khoảng 1 tháng</option>
                  <option value="longer">Hơn 1 tháng</option>
                </select>
                {errors.symptom_duration && (
                  <span className="consultation-booking-page-error-message">{errors.symptom_duration}</span>
                )}
              </div>

              <div className="consultation-booking-page-form-group">
                <label>Tiền sử bệnh</label>
                <textarea
                  name="medical_history"
                  value={formData.medical_history}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Tiểu đường, cao huyết áp, dị ứng... (nếu có)"
                  className="consultation-booking-page-textarea"
                />
              </div>

              <div className="consultation-booking-page-form-group">
                <label>Thuốc đang sử dụng</label>
                <textarea
                  name="current_medications"
                  value={formData.current_medications}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Các loại thuốc đang dùng (nếu có)"
                  className="consultation-booking-page-textarea"
                />
              </div>

              <div className="consultation-booking-page-form-group">
                <label>
                  <FaPaperclip /> Tệp đính kèm (Hồ sơ, Ảnh, Kết quả xét nghiệm...)
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                  id="file-upload"
                  className="consultation-booking-page-input"
                />
                <button
                  type="button"
                  className="consultation-booking-page-file-upload-btn"
                  onClick={() => document.getElementById('file-upload').click()}
                >
                  <FaPaperclip /> Chọn file
                </button>
                
                {formData.attachments.length > 0 && (
                  <div className="consultation-booking-page-attachments-list">
                    {formData.attachments.map((file, index) => (
                      <div key={index} className="consultation-booking-page-attachment-item">
                        <span>{file.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(index)}
                          className="consultation-booking-page-btn-remove"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="consultation-booking-page-form-group">
                <label>Ghi chú thêm</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Các thông tin bổ sung..."
                  className="consultation-booking-page-textarea"
                />
              </div>
            </div>
          )}

          {/* STEP 3: Xác nhận & Thanh toán */}
          {currentStep === 3 && (
            <div className="consultation-booking-page-step consultation-booking-page-step-3">
              <h2>Bước 3: Xác Nhận & Thanh Toán</h2>
              
              <div className="consultation-booking-page-confirmation-summary">
                {(() => {
                  const selectedPackage = allPackages.find(pkg => pkg.id === formData.consultation_pricing_id);
                  
                  if (!selectedPackage) {
                    return <p>Lỗi: Không tìm thấy gói đã chọn. Vui lòng quay lại Bước 1.</p>;
                  }
                  
                  const baseFee = parseFloat(selectedPackage.price);
                  const platformFee = Math.round(baseFee * 0.1);
                  const totalFee = baseFee + platformFee;

                  return (
                    <>
                      <div className="consultation-booking-page-summary-section">
                        <h3>Thông tin tư vấn</h3>
                        <div className="consultation-booking-page-summary-row">
                          <span>Gói dịch vụ:</span>
                          <strong>{selectedPackage.package_name}</strong>
                        </div>
                        <div className="consultation-booking-page-summary-row">
                          <span>Hình thức:</span>
                          <strong>{selectedPackage.package_type === 'chat' ? 'Chat Real-time' : 'Video Call'}</strong>
                        </div>
                        <div className="consultation-booking-page-summary-row">
                          <span>Thời lượng:</span>
                          <strong>{selectedPackage.duration_minutes} phút</strong>
                        </div>
                        <div className="consultation-booking-page-summary-row">
                          <span>Thời gian:</span>
                          <strong>{new Date(formData.appointment_time).toLocaleString('vi-VN')}</strong>
                        </div>
                        <div className="consultation-booking-page-summary-row">
                          <span>Triệu chứng:</span>
                          <strong>{formData.chief_complaint?.substring(0, 50)}...</strong>
                        </div>
                      </div>

                      <div className="consultation-booking-page-summary-section pricing-summary">
                        <h3>Chi phí</h3>
                        <div className="consultation-booking-page-summary-row">
                          <span>Phí tư vấn:</span>
                          <strong>{formatCurrency(baseFee)}</strong>
                        </div>
                        <div className="consultation-booking-page-summary-row">
                          <span>Phí nền tảng (10%):</span>
                          <strong>{formatCurrency(platformFee)}</strong>
                        </div>
                        <div className="consultation-booking-page-summary-row total">
                          <span>Tổng cộng:</span>
                          <strong>{formatCurrency(totalFee)}</strong>
                        </div>
                      </div>
                    </>
                  );
                })()}

                <div className="consultation-booking-page-terms-section">
                  <label className="consultation-booking-page-checkbox-label">
                    <input type="checkbox" required />
                    <span>
                      Tôi đồng ý với <a href="/dieu-khoan" target="_blank">Điều khoản sử dụng</a> và{' '}
                      <a href="/chinh-sach-bao-mat" target="_blank">Chính sách bảo mật</a>
                    </span>
                  </label>
                </div>

                <div className="consultation-booking-page-alert">
                  <FaExclamationTriangle />
                  <div>
                    <strong>Lưu ý quan trọng:</strong>
                    <ul>
                      <li>Sau khi thanh toán, lịch tư vấn sẽ chuyển sang trạng thái "Chờ bác sĩ phê duyệt"</li>
                      <li>Nếu bác sĩ từ chối, bạn sẽ được hoàn tiền 100%</li>
                      <li>Vui lòng có mặt đúng giờ để không bị mất phí</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="consultation-booking-page-actions">
          <button
            type="button"
            className="consultation-booking-page-btn consultation-booking-page-btn-secondary"
            onClick={handlePrevStep}
            disabled={submitting || currentStep === 1}
            style={{ visibility: currentStep === 1 ? 'hidden' : 'visible' }}
          >
            <FaArrowLeft /> Quay lại
          </button>
          
          {currentStep < 3 && (
            <button
              type="button"
              className="consultation-booking-page-btn consultation-booking-page-btn-primary"
              onClick={handleNextStep}
            >
              Tiếp tục <FaArrowRight />
            </button>
          )}
          
          {currentStep === 3 && (
            <button
              type="button"
              className="consultation-booking-page-btn consultation-booking-page-btn-success"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <div className="consultation-booking-page-spinner-small"></div>
                  Đang xử lý...
                </>
              ) : (
                <>
                  <FaMoneyBillWave /> Đặt lịch và thanh toán
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default ConsultationBookingPage;