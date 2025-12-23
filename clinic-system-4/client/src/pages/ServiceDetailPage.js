// client/src/pages/ServiceDetailPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api'; // ✅ SỬA: Dùng api instance thay vì axios
import { toast } from 'react-toastify';
import { 
  FaTag, 
  FaClock, 
  FaUserMd, 
  FaArrowLeft,
  FaInfoCircle,
  FaMoneyBillWave,
  FaCalendarAlt,
  FaHospital,
  FaCheckCircle,
  FaStar
} from 'react-icons/fa';
import './ServiceDetailPage.css';

const ServiceDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchServiceDetail();
  }, [id]);

  /**
   * ✅ Fetch service detail từ API GET /api/services/:id
   * API này đã bao gồm danh sách doctors trong response
   */
  const fetchServiceDetail = async () => {
    try {
      console.log('[ServiceDetail] Fetching service:', id);
      setLoading(true);
      setError(null);
      
      // ✅ SỬA: Gọi API GET /services/:id bằng api instance
      const response = await api.get(`/services/${id}`);
      
      console.log('[ServiceDetail] API response:', response.data);
      
      if (response.data.success) {
        const serviceData = response.data.data;
        
        // API đã trả về serviceData với doctors array
        // Cấu trúc: { ...service, doctors: [...] }
        setService(serviceData);
        
        console.log('[ServiceDetail] ✅ Service loaded:', serviceData);
        console.log('[ServiceDetail] Doctors:', serviceData.doctors);
      } else {
        throw new Error(response.data.message || 'Không thể tải thông tin dịch vụ.');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message;
      setError(errorMessage);
      toast.error(`Lỗi: ${errorMessage}`);
      console.error('[ServiceDetail] ❌ Fetch service error:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
    } finally {
      setLoading(false);
      console.log('[ServiceDetail] Loading completed');
    }
  };

  const handleBookService = () => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (!token || !userStr) {
      toast.warning('Vui lòng đăng nhập để đặt lịch khám.');
      navigate('/login', { 
        state: { from: `/dat-lich-hen?service=${id}` } 
      });
      return;
    }

    try {
      const user = JSON.parse(userStr);
      
      if (user.role !== 'patient') {
        toast.error('Chỉ bệnh nhân mới có thể đặt lịch khám.');
        return;
      }

      console.log('[ServiceDetail] Navigating to booking page for service:', id);
      navigate(`/dat-lich-hen?service=${id}`);
      
    } catch (error) {
      console.error('[ServiceDetail] Error parse user data:', error);
      toast.error('Lỗi xác thực. Vui lòng đăng nhập lại.');
      navigate('/login');
    }
  };

  // Check if should show doctor info (only if exactly 1 doctor)
  const shouldShowDoctor = () => {
    return service?.doctors && Array.isArray(service.doctors) && service.doctors.length === 1;
  };

  const getDoctorInfo = () => {
    if (shouldShowDoctor()) {
      return service.doctors[0];
    }
    return null;
  };

  if (loading) {
    return (
      <div className="servicedetail-page">
        <div className="servicedetail-container">
          <div className="servicedetail-loading">
            <div className="servicedetail-spinner"></div>
            <p>Đang tải thông tin dịch vụ...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="servicedetail-page">
        <div className="servicedetail-container">
          <div className="servicedetail-error-container">
            <div className="servicedetail-error-icon">
              <FaInfoCircle />
            </div>
            <h2>Có lỗi xảy ra</h2>
            <p>{error}</p>
            <button 
              className="servicedetail-btn servicedetail-btn-primary" 
              onClick={() => navigate('/dich-vu')}
            >
              <FaArrowLeft />
              Quay lại danh sách dịch vụ
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="servicedetail-page">
        <div className="servicedetail-container">
          <div className="servicedetail-error-container">
            <div className="servicedetail-error-icon">
              <FaInfoCircle />
            </div>
            <h2>Không tìm thấy dịch vụ</h2>
            <p>Dịch vụ này không tồn tại hoặc đã bị xóa.</p>
            <button 
              className="servicedetail-btn servicedetail-btn-primary" 
              onClick={() => navigate('/dich-vu')}
            >
              Quay lại danh sách dịch vụ
            </button>
          </div>
        </div>
      </div>
    );
  }

  const doctor = getDoctorInfo();

  return (
    <div className="servicedetail-page">
      <div className="servicedetail-container">
        <div className="servicedetail-content">
          {/* Image Section */}
          <div className="servicedetail-image-section">
            {service.image_url ? (
              <img 
                src={service.image_url} 
                alt={service.name}
                className="servicedetail-image"
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/800x600?text=Dịch+vụ+y+tế';
                }}
              />
            ) : (
              <div className="servicedetail-placeholder">
                <FaHospital />
                <p>Chưa có hình ảnh</p>
              </div>
            )}
          </div>

          {/* Info Section */}
          <div className="servicedetail-info-section">
            <span className="servicedetail-category">
              <FaTag className="servicedetail-meta-icon" />
              {service.category?.name || 'Chưa phân loại'}
            </span>
            
            <h1 className="servicedetail-title">{service.name}</h1>
            
            {service.short_description && (
              <p className="servicedetail-description">{service.short_description}</p>
            )}
            
            <div className="servicedetail-meta">
              <div className="servicedetail-meta-item">
                <FaClock className="servicedetail-meta-icon" />
                <span className="servicedetail-meta-text">
                  Thời gian: <strong>{service.duration} phút</strong>
                </span>
              </div>

              {/* Show doctor only if exactly 1 doctor */}
              {doctor && (
                <div className="servicedetail-meta-item servicedetail-doctor-highlight">
                  <FaUserMd className="servicedetail-meta-icon" />
                  <div className="servicedetail-doctor-info">
                    <span className="servicedetail-meta-text">
                      Bác sĩ phụ trách: <strong>BS. {doctor.user?.full_name || 'N/A'}</strong>
                    </span>
                    {doctor.specialty?.name && (
                      <span className="servicedetail-doctor-specialty">
                        Chuyên khoa: {doctor.specialty.name}
                      </span>
                    )}
                    {doctor.experience_years && (
                      <span className="servicedetail-doctor-experience">
                        <FaStar /> {doctor.experience_years} năm kinh nghiệm
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* If multiple doctors, show general info */}
              {!doctor && service.doctors && Array.isArray(service.doctors) && service.doctors.length > 1 && (
                <div className="servicedetail-meta-item">
                  <FaUserMd className="servicedetail-meta-icon" />
                  <span className="servicedetail-meta-text">
                    Có <strong>{service.doctors.length} bác sĩ</strong> có thể thực hiện dịch vụ này
                  </span>
                </div>
              )}

              {service.category?.name && (
                <div className="servicedetail-meta-item">
                  <FaInfoCircle className="servicedetail-meta-icon" />
                  <span className="servicedetail-meta-text">
                    Danh mục: <strong>{service.category.name}</strong>
                  </span>
                </div>
              )}

              <div className="servicedetail-meta-item">
                <FaHospital className="servicedetail-meta-icon" />
                <span className="servicedetail-meta-text">
                  Trạng thái: <strong className="servicedetail-status-active">
                    {service.status === 'active' ? '✓ Đang hoạt động' : 'Tạm ngưng'}
                  </strong>
                </span>
              </div>
            </div>

            {/* Detailed Content */}
            {service.detailed_content && (
              <div className="servicedetail-detailed-content">
                <h3 className="servicedetail-content-title">
                  <FaInfoCircle />
                  Thông tin chi tiết
                </h3>
                <div 
                  className="servicedetail-content-text"
                  dangerouslySetInnerHTML={{ __html: service.detailed_content }}
                />
              </div>
            )}

            {/* Features */}
            <div className="servicedetail-features-section">
              <h3 className="servicedetail-features-title">
                <FaCheckCircle />
                Điểm nổi bật
              </h3>
              <ul className="servicedetail-features-list">
                <li>
                  <FaCheckCircle className="servicedetail-feature-icon" />
                  Đội ngũ bác sĩ chuyên khoa giàu kinh nghiệm
                </li>
                <li>
                  <FaCheckCircle className="servicedetail-feature-icon" />
                  Trang thiết bị hiện đại, đạt tiêu chuẩn quốc tế
                </li>
                <li>
                  <FaCheckCircle className="servicedetail-feature-icon" />
                  Quy trình khám chữa bệnh chuyên nghiệp
                </li>
                <li>
                  <FaCheckCircle className="servicedetail-feature-icon" />
                  Hỗ trợ đặt lịch linh hoạt, thuận tiện
                </li>
                {service.allow_doctor_choice && (
                  <li>
                    <FaCheckCircle className="servicedetail-feature-icon" />
                    Được tự do lựa chọn bác sĩ theo ý muốn
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* Booking Section */}
          <div className="servicedetail-booking-section">
            <div className="servicedetail-booking-card">
              <h3 className="servicedetail-booking-title">
                <FaCalendarAlt />
                Đặt lịch khám
              </h3>

              <div className="servicedetail-price-display">
                <p className="servicedetail-price-label">Giá dịch vụ</p>
                <p className="servicedetail-price-amount">
                  <FaMoneyBillWave className="servicedetail-price-icon" />
                  {service.price?.toLocaleString('vi-VN')} VNĐ
                </p>
              </div>

              <div className="servicedetail-booking-info">
                <div className="servicedetail-info-row">
                  <span className="servicedetail-info-label">
                    <FaClock />
                    Thời gian
                  </span>
                  <span className="servicedetail-info-value">{service.duration} phút</span>
                </div>

                {doctor && (
                  <div className="servicedetail-info-row">
                    <span className="servicedetail-info-label">
                      <FaUserMd />
                      Bác sĩ
                    </span>
                    <span className="servicedetail-info-value">
                      BS. {doctor.user?.full_name}
                    </span>
                  </div>
                )}

                {!doctor && service.doctors && Array.isArray(service.doctors) && service.doctors.length > 1 && (
                  <div className="servicedetail-info-row">
                    <span className="servicedetail-info-label">
                      <FaUserMd />
                      Bác sĩ
                    </span>
                    <span className="servicedetail-info-value">
                      Chọn khi đặt lịch
                    </span>
                  </div>
                )}

                <div className="servicedetail-info-row">
                  <span className="servicedetail-info-label">
                    <FaHospital />
                    Hình thức
                  </span>
                  <span className="servicedetail-info-value">Trực tiếp / Trực tuyến</span>
                </div>
              </div>

              <button 
                className="servicedetail-btn-book"
                onClick={handleBookService}
              >
                <FaCalendarAlt />
                Đặt lịch ngay
              </button>

              <div className="servicedetail-booking-note">
                <FaInfoCircle />
                <p>Vui lòng đăng nhập để đặt lịch khám. Bạn có thể chọn thời gian và bác sĩ phù hợp khi đặt lịch.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceDetailPage;