// client/src/pages/ConsultationBookingPage.js
// ✅ TRANG ĐẶT LỊCH TƯ VẤN REAL-TIME - HOÀN CHỈNH

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import consultationService from '../services/consultationService';
import userService from '../services/userService';
import paymentService from '../services/paymentService';
import {
  FaCalendarAlt,
  FaClock,
  FaUser,
  FaStethoscope,
  FaComments,
  FaVideo,
  FaFileAlt,
  FaPaperclip,
  FaCheckCircle,
  FaExclamationTriangle,
  FaMoneyBillWave,
  FaArrowLeft,
  FaArrowRight
} from 'react-icons/fa';
import './ConsultationBookingPage.css';

const ConsultationBookingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  // Lấy thông tin từ navigation state
  const { doctorId, consultationType } = location.state || {};
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    doctor_id: doctorId || '',
    specialty_id: '',
    consultation_type: consultationType || 'chat',
    appointment_time: '',
    chief_complaint: '',
    medical_history: '',
    current_medications: '',
    symptom_duration: '',
    attachments: [],
    notes: ''
  });
  
  // Options
  const [specialties, setSpecialties] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [pricing, setPricing] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  
  // Errors
  const [errors, setErrors] = useState({});
  
  // Package prices
  const packagePrices = {
    chat: { price: 100000, duration: 30, label: 'Chat Real-time - 30 phút' },
    video: { price: 300000, duration: 30, label: 'Video Call - 30 phút' },
    offline: { price: 500000, duration: 60, label: 'Tại bệnh viện - 60 phút' }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);
  
  useEffect(() => {
    if (formData.specialty_id) {
      fetchDoctorsBySpecialty(formData.specialty_id);
    }
  }, [formData.specialty_id]);
  
  useEffect(() => {
    if (formData.doctor_id) {
      fetchDoctorDetails(formData.doctor_id);
      fetchDoctorPricing(formData.doctor_id);
    }
  }, [formData.doctor_id]);
  
  useEffect(() => {
    if (formData.doctor_id && formData.appointment_time) {
      const date = formData.appointment_time.split('T')[0];
      fetchAvailableSlots(formData.doctor_id, date);
    }
  }, [formData.doctor_id, formData.appointment_time]);

  // ==================== FETCH DATA ====================
  
  const fetchInitialData = async () => {
    try {
      setLoading(true);
      
      // Fetch specialties
      const specialtiesRes = await userService.getAllSpecialties();
      setSpecialties(specialtiesRes.data.specialties || []);
      
      // Nếu đã có doctor_id từ props, fetch luôn
      if (doctorId) {
        await fetchDoctorDetails(doctorId);
        await fetchDoctorPricing(doctorId);
      }
      
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setLoading(false);
    }
  };
  
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
    } catch (error) {
      console.error('Error fetching doctor details:', error);
    }
  };
  
  const fetchDoctorPricing = async (doctorId) => {
    try {
      const response = await consultationService.getDoctorPricing(doctorId);
      setPricing(response.data);
    } catch (error) {
      console.error('Error fetching pricing:', error);
    }
  };
  
  const fetchAvailableSlots = async (doctorId, date) => {
    try {
      // Mock available slots (thực tế gọi API)
      const slots = [
        '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
        '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
        '16:00', '16:30', '17:00', '17:30'
      ];
      setAvailableSlots(slots);
    } catch (error) {
      console.error('Error fetching slots:', error);
    }
  };

  // ==================== HANDLE FORM ====================
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user types
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
    
    // Validate files
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        alert('File không được vượt quá 10MB');
        return;
      }
    }
    
    try {
      setLoading(true);
      
      // Upload files
      const uploadedFiles = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await consultationService.uploadFile(formData);
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

  // ==================== VALIDATION ====================
  
  const validateStep1 = () => {
    const newErrors = {};
    
    if (!formData.specialty_id) {
      newErrors.specialty_id = 'Vui lòng chọn chuyên khoa';
    }
    
    if (!formData.doctor_id) {
      newErrors.doctor_id = 'Vui lòng chọn bác sĩ';
    }
    
    if (!formData.consultation_type) {
      newErrors.consultation_type = 'Vui lòng chọn loại tư vấn';
    }
    
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

  // ==================== NAVIGATION ====================
  
  const handleNextStep = () => {
    let isValid = false;
    
    if (currentStep === 1) {
      isValid = validateStep1();
    } else if (currentStep === 2) {
      isValid = validateStep2();
    }
    
    if (isValid) {
      setCurrentStep(prev => prev + 1);
    }
  };
  
  const handlePrevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  // ==================== SUBMIT ====================
  
  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      
      // Tạo consultation
      const consultationData = {
        doctor_id: formData.doctor_id,
        consultation_type: formData.consultation_type,
        appointment_time: formData.appointment_time,
        chief_complaint: formData.chief_complaint,
        medical_history: formData.medical_history,
        current_medications: formData.current_medications,
        symptom_duration: formData.symptom_duration,
        attachments: JSON.stringify(formData.attachments),
        notes: formData.notes
      };
      
      const response = await consultationService.createConsultation(consultationData);
      
      if (response.data.success) {
        const consultation = response.data.data;
        
        // Chuyển sang trang thanh toán
        navigate('/thanh-toan', {
          state: {
            consultation_id: consultation.id,
            amount: consultation.total_fee,
            type: 'consultation'
          }
        });
      }
      
    } catch (error) {
      console.error('Error creating consultation:', error);
      alert('Lỗi đặt lịch tư vấn. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  // ==================== RENDER ====================
  
  const getCurrentPrice = () => {
    if (pricing && formData.consultation_type) {
      const typeMap = {
        'chat': pricing.chat_fee,
        'video': pricing.video_fee,
        'offline': pricing.offline_fee
      };
      return typeMap[formData.consultation_type] || packagePrices[formData.consultation_type].price;
    }
    return packagePrices[formData.consultation_type]?.price || 0;
  };
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  if (loading && !specialties.length) {
    return (
      <div className="consultation-booking-loading">
        <div className="spinner"></div>
        <p>Đang tải dữ liệu...</p>
      </div>
    );
  }

  return (
    <div className="consultation-booking-page">
      <div className="container">
        
        {/* Header */}
        <div className="booking-header">
          <button className="btn-back" onClick={() => navigate('/tu-van')}>
            <FaArrowLeft /> Quay lại
          </button>
          <h1>Đặt Lịch Tư Vấn Real-time</h1>
          <p>Hoàn tất 3 bước để đặt lịch tư vấn với bác sĩ</p>
        </div>

        {/* Progress Steps */}
        <div className="booking-progress">
          <div className={`progress-step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
            <div className="step-number">1</div>
            <div className="step-label">Chọn bác sĩ</div>
          </div>
          
          <div className="progress-line"></div>
          
          <div className={`progress-step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
            <div className="step-number">2</div>
            <div className="step-label">Thông tin</div>
          </div>
          
          <div className="progress-line"></div>
          
          <div className={`progress-step ${currentStep >= 3 ? 'active' : ''}`}>
            <div className="step-number">3</div>
            <div className="step-label">Xác nhận</div>
          </div>
        </div>

        {/* Form Content */}
        <div className="booking-content">
          
          {/* STEP 1: Chọn bác sĩ & loại tư vấn */}
          {currentStep === 1 && (
            <div className="booking-step step-1">
              <h2>Bước 1: Chọn Bác sĩ & Loại Tư vấn</h2>
              
              {/* Chuyên khoa */}
              <div className="form-group">
                <label>
                  <FaStethoscope /> Chuyên khoa <span className="required">*</span>
                </label>
                <select
                  name="specialty_id"
                  value={formData.specialty_id}
                  onChange={handleInputChange}
                  className={errors.specialty_id ? 'error' : ''}
                >
                  <option value="">-- Chọn chuyên khoa --</option>
                  {specialties.map(specialty => (
                    <option key={specialty.id} value={specialty.id}>
                      {specialty.name}
                    </option>
                  ))}
                </select>
                {errors.specialty_id && (
                  <span className="error-message">{errors.specialty_id}</span>
                )}
              </div>

              {/* Bác sĩ */}
              <div className="form-group">
                <label>
                  <FaUser /> Bác sĩ <span className="required">*</span>
                </label>
                <select
                  name="doctor_id"
                  value={formData.doctor_id}
                  onChange={handleInputChange}
                  className={errors.doctor_id ? 'error' : ''}
                  disabled={!formData.specialty_id}
                >
                  <option value="">-- Chọn bác sĩ --</option>
                  {doctors.map(doctor => (
                    <option key={doctor.id} value={doctor.id}>
                      BS. {doctor.full_name} - {doctor.Doctor?.experience_years || 0} năm kinh nghiệm
                    </option>
                  ))}
                </select>
                {errors.doctor_id && (
                  <span className="error-message">{errors.doctor_id}</span>
                )}
                
                {selectedDoctor && (
                  <div className="doctor-preview">
                    <img src={selectedDoctor.avatar_url || '/default-avatar.png'} alt={selectedDoctor.full_name} />
                    <div className="doctor-info">
                      <h4>BS. {selectedDoctor.full_name}</h4>
                      <p>{selectedDoctor.Doctor?.Specialty?.name}</p>
                      <p>⭐ {selectedDoctor.Doctor?.avg_rating || 4.5} ({selectedDoctor.Doctor?.total_reviews || 0} đánh giá)</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Loại tư vấn */}
              <div className="form-group">
                <label>
                  Loại tư vấn <span className="required">*</span>
                </label>
                <div className="consultation-type-options">
                  <label className={`type-option ${formData.consultation_type === 'chat' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="consultation_type"
                      value="chat"
                      checked={formData.consultation_type === 'chat'}
                      onChange={handleInputChange}
                    />
                    <div className="type-content">
                      <FaComments className="type-icon" />
                      <div className="type-info">
                        <h4>Chat Real-time</h4>
                        <p>Tư vấn qua chat trong 30 phút</p>
                        <span className="type-price">{formatCurrency(getCurrentPrice())}</span>
                      </div>
                    </div>
                  </label>
                  
                  <label className={`type-option ${formData.consultation_type === 'video' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="consultation_type"
                      value="video"
                      checked={formData.consultation_type === 'video'}
                      onChange={handleInputChange}
                    />
                    <div className="type-content">
                      <FaVideo className="type-icon" />
                      <div className="type-info">
                        <h4>Video Call</h4>
                        <p>Gặp mặt bác sĩ qua video HD</p>
                        <span className="type-price">{formatCurrency(getCurrentPrice())}</span>
                      </div>
                    </div>
                  </label>
                </div>
                {errors.consultation_type && (
                  <span className="error-message">{errors.consultation_type}</span>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: Thông tin tư vấn */}
          {currentStep === 2 && (
            <div className="booking-step step-2">
              <h2>Bước 2: Thông Tin Tư Vấn</h2>
              
              {/* Ngày & giờ hẹn */}
              <div className="form-group">
                <label>
                  <FaCalendarAlt /> Ngày & giờ hẹn <span className="required">*</span>
                </label>
                <input
                  type="datetime-local"
                  name="appointment_time"
                  value={formData.appointment_time}
                  onChange={handleInputChange}
                  min={new Date().toISOString().slice(0, 16)}
                  className={errors.appointment_time ? 'error' : ''}
                />
                {errors.appointment_time && (
                  <span className="error-message">{errors.appointment_time}</span>
                )}
              </div>

              {/* Triệu chứng */}
              <div className="form-group">
                <label>
                  <FaFileAlt /> Triệu chứng chính <span className="required">*</span>
                </label>
                <textarea
                  name="chief_complaint"
                  value={formData.chief_complaint}
                  onChange={handleInputChange}
                  rows="4"
                  placeholder="Mô tả triệu chứng của bạn (đau đầu, sốt, ho...)"
                  className={errors.chief_complaint ? 'error' : ''}
                />
                {errors.chief_complaint && (
                  <span className="error-message">{errors.chief_complaint}</span>
                )}
              </div>

              {/* Thời gian xuất hiện */}
              <div className="form-group">
                <label>
                  <FaClock /> Thời gian xuất hiện triệu chứng <span className="required">*</span>
                </label>
                <select
                  name="symptom_duration"
                  value={formData.symptom_duration}
                  onChange={handleInputChange}
                  className={errors.symptom_duration ? 'error' : ''}
                >
                  <option value="">-- Chọn thời gian --</option>
                  <option value="today">Hôm nay</option>
                  <option value="2-3days">2-3 ngày</option>
                  <option value="1week">Khoảng 1 tuần</option>
                  <option value="1month">Khoảng 1 tháng</option>
                  <option value="longer">Hơn 1 tháng</option>
                </select>
                {errors.symptom_duration && (
                  <span className="error-message">{errors.symptom_duration}</span>
                )}
              </div>

              {/* Tiền sử bệnh */}
              <div className="form-group">
                <label>Tiền sử bệnh</label>
                <textarea
                  name="medical_history"
                  value={formData.medical_history}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Tiểu đường, cao huyết áp, dị ứng... (nếu có)"
                />
              </div>

              {/* Thuốc đang dùng */}
              <div className="form-group">
                <label>Thuốc đang sử dụng</label>
                <textarea
                  name="current_medications"
                  value={formData.current_medications}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Các loại thuốc đang dùng (nếu có)"
                />
              </div>

              {/* File đính kèm */}
              <div className="form-group">
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
                />
                <button
                  type="button"
                  className="btn-upload"
                  onClick={() => document.getElementById('file-upload').click()}
                >
                  <FaPaperclip /> Chọn file
                </button>
                
                {formData.attachments.length > 0 && (
                  <div className="attachments-list">
                    {formData.attachments.map((file, index) => (
                      <div key={index} className="attachment-item">
                        <span>{file.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(index)}
                          className="btn-remove"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Ghi chú */}
              <div className="form-group">
                <label>Ghi chú thêm</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Các thông tin bổ sung..."
                />
              </div>
            </div>
          )}

          {/* STEP 3: Xác nhận & Thanh toán */}
          {currentStep === 3 && (
            <div className="booking-step step-3">
              <h2>Bước 3: Xác Nhận & Thanh Toán</h2>
              
              <div className="confirmation-summary">
                <div className="summary-section">
                  <h3>Thông tin bác sĩ</h3>
                  {selectedDoctor && (
                    <div className="doctor-summary">
                      <img src={selectedDoctor.avatar_url || '/default-avatar.png'} alt={selectedDoctor.full_name} />
                      <div>
                        <p><strong>BS. {selectedDoctor.full_name}</strong></p>
                        <p>{selectedDoctor.Doctor?.Specialty?.name}</p>
                        <p>⭐ {selectedDoctor.Doctor?.avg_rating || 4.5}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="summary-section">
                  <h3>Thông tin tư vấn</h3>
                  <div className="summary-row">
                    <span>Loại tư vấn:</span>
                    <strong>{packagePrices[formData.consultation_type]?.label}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Thời gian:</span>
                    <strong>{new Date(formData.appointment_time).toLocaleString('vi-VN')}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Triệu chứng:</span>
                    <strong>{formData.chief_complaint?.substring(0, 50)}...</strong>
                  </div>
                </div>

                <div className="summary-section pricing-summary">
                  <h3>Chi phí</h3>
                  <div className="summary-row">
                    <span>Phí tư vấn:</span>
                    <strong>{formatCurrency(getCurrentPrice())}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Phí nền tảng (10%):</span>
                    <strong>{formatCurrency(getCurrentPrice() * 0.1)}</strong>
                  </div>
                  <div className="summary-row total">
                    <span>Tổng cộng:</span>
                    <strong>{formatCurrency(getCurrentPrice() * 1.1)}</strong>
                  </div>
                </div>

                <div className="terms-section">
                  <label className="checkbox-label">
                    <input type="checkbox" required />
                    <span>
                      Tôi đồng ý với <a href="/dieu-khoan" target="_blank">Điều khoản sử dụng</a> và{' '}
                      <a href="/chinh-sach-bao-mat" target="_blank">Chính sách bảo mật</a>
                    </span>
                  </label>
                </div>

                <div className="alert alert-info">
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
        <div className="booking-actions">
          {currentStep > 1 && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handlePrevStep}
              disabled={submitting}
            >
              <FaArrowLeft /> Quay lại
            </button>
          )}
          
          {currentStep < 3 && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleNextStep}
            >
              Tiếp tục <FaArrowRight />
            </button>
          )}
          
          {currentStep === 3 && (
            <button
              type="button"
              className="btn btn-success"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <div className="spinner-small"></div>
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