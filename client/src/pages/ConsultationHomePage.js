// client/src/pages/ConsultationHomePage.js
// ✅ REDESIGNED: Tập trung vào TƯ VẤN thay vì chỉ hiển thị bác sĩ
// - Bộ lọc theo PHƯƠNG THỨC TƯ VẤN (không phải chuyên khoa)
// - Danh sách bác sĩ với 2 nút: Đặt lịch Chat & Đặt lịch Video
// - Thiết kế rõ ràng, đầy đủ hơn

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import userService from '../services/userService';
import consultationService from '../services/consultationService';
import { 
  FaComments, 
  FaVideo, 
  FaArrowRight,
  FaStar,
  FaUserMd,
  FaShieldAlt,
  FaBolt,
  FaWallet,
  FaClock,
  FaSearch,      
  FaCheckCircle,
  FaFilter,
  FaSort
} from 'react-icons/fa';
import './ConsultationHomePage.css';

const ConsultationHomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [availableDoctors, setAvailableDoctors] = useState([]);
  const [topRatedDoctors, setTopRatedDoctors] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [selectedConsultationType, setSelectedConsultationType] = useState('all'); // all, quick-chat, chat, video
  const [selectedRating, setSelectedRating] = useState('');
  const [selectedPrice, setSelectedPrice] = useState('');
  const [selectedAvailability, setSelectedAvailability] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [bannerSettings, setBannerSettings] = useState(null);
  const [methodsSettings, setMethodsSettings] = useState([]);
  const [whyChooseSettings, setWhyChooseSettings] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Lấy danh sách bác sĩ có sẵn để tư vấn
      try {
        const doctorsResponse = await userService.getAllDoctorsPublic({
          limit: 12,
          is_online: true
        });
        console.log('Available doctors:', doctorsResponse.data);
        setAvailableDoctors(doctorsResponse.data.doctors || []);
      } catch (error) {
        console.error('Error fetching available doctors:', error);
        setAvailableDoctors([]);
      }

      // Lấy bác sĩ được đánh giá cao nhất
      try {
        const topDoctorsResponse = await userService.getAllDoctorsPublic({
          limit: 6,
          sort_by: 'rating',
          order: 'desc'
        });
        console.log('Top rated doctors:', topDoctorsResponse.data);
        setTopRatedDoctors(topDoctorsResponse.data.doctors || []);
      } catch (error) {
        console.error('Error fetching top rated doctors:', error);
        setTopRatedDoctors([]);
      }

      // Lấy thống kê (nếu đã đăng nhập)
      if (user) {
        try {
          if (user.role === 'patient') {
            const statsResponse = await consultationService.getPatientStats();
            setStats(statsResponse.data.stats);
          } else if (user.role === 'doctor') {
            const statsResponse = await consultationService.getDoctorStats();
            setStats(statsResponse.data.stats);
          }
        } catch (error) {
          console.error('Error fetching stats:', error);
        }
      }

      // Lấy cấu hình từ hệ thống (optional)
      try {
        const systemService = require('../services/systemService').default;
        const systemSettings = await systemService.getConsultationSettings();
        setBannerSettings(systemSettings.data.banner);
        setMethodsSettings(systemSettings.data.methods);
        setWhyChooseSettings(systemSettings.data.whyChoose);
      } catch (error) {
        console.log('Using default settings');
        setDefaultSettings();
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      setDefaultSettings();
    } finally {
      setLoading(false);
    }
  };

  const setDefaultSettings = () => {
    setBannerSettings({
      title: 'Tư Vấn Sức Khỏe Online',
      subtitle: 'Kết nối với bác sĩ chuyên khoa trong vài phút. Chat, video call - đơn giản và nhanh chóng!',
      badge_text: 'Nền Tảng Tư Vấn Y Tế #1',
      primary_color: '#667eea',
      secondary_color: '#764ba2'
    });

    setMethodsSettings([
      {
        id: 'quick-chat',
        name: 'Chat Nhanh',
        subtitle: 'Tư vấn tức thì',
        description: 'Kết nối ngay với bác sĩ đang online, không cần đặt lịch trước',
        icon: 'bolt',
        color: '#667eea',
        price: 50000,
        duration: 15,
        enabled: true,
        badge: 'Nhanh nhất',
        features: [
          'Phản hồi trong 2 phút',
          'Không cần đặt lịch',
          'Phí từ 50K/15 phút',
          'Phù hợp vấn đề đơn giản'
        ]
      },
      {
        id: 'chat',
        name: 'Tư Vấn Chat Real-time',
        subtitle: 'Đặt lịch trước',
        description: 'Đặt lịch và tư vấn chi tiết với bác sĩ chuyên khoa qua chat',
        icon: 'comments',
        color: '#4facfe',
        price: 100000,
        duration: 30,
        enabled: true,
        badge: 'Phổ biến',
        features: [
          'Chọn bác sĩ và thời gian',
          'Tư vấn chi tiết 30 phút',
          'Gửi ảnh, file đính kèm',
          'Phí từ 100K/30 phút'
        ]
      },
      {
        id: 'video',
        name: 'Video Call',
        subtitle: 'Gặp mặt trực tiếp',
        description: 'Tư vấn trực tiếp qua video HD với bác sĩ chuyên khoa',
        icon: 'video',
        color: '#f093fb',
        price: 300000,
        duration: 30,
        enabled: true,
        badge: 'Chuyên sâu',
        features: [
          'Video HD 1-1 với bác sĩ',
          'Khám và tư vấn chi tiết',
          'Chia sẻ màn hình, hình ảnh',
          'Phí từ 300K/30 phút'
        ]
      }
    ]);

    setWhyChooseSettings([
      {
        id: 'professional',
        icon: 'usermd',
        title: 'Đội Ngũ Chuyên Nghiệp',
        description: 'Hơn 100+ bác sĩ có chứng chỉ hành nghề, kinh nghiệm lâu năm',
        color: '#667eea'
      },
      {
        id: 'fast',
        icon: 'bolt',
        title: 'Phản Hồi Nhanh',
        description: 'Kết nối với bác sĩ trong vài phút, tư vấn 24/7',
        color: '#4facfe'
      },
      {
        id: 'secure',
        icon: 'shield',
        title: 'Bảo Mật Tuyệt Đối',
        description: 'Thông tin y tế được mã hóa và bảo vệ theo tiêu chuẩn quốc tế',
        color: '#4caf50'
      },
      {
        id: 'affordable',
        icon: 'wallet',
        title: 'Chi Phí Hợp Lý',
        description: 'Giá cả minh bạch, đa dạng gói tư vấn phù hợp mọi túi tiền',
        color: '#f093fb'
      }
    ]);
  };

  const handleConsultationType = (methodId) => {
    if (!user) {
      navigate('/login', { state: { from: '/tu-van' } });
      return;
    }
    navigate('/tu-van/chon-bac-si', { state: { consultationType: methodId } });
  };

  const handleQuickChat = () => {
    if (!user) {
      navigate('/login', { state: { from: '/tu-van' } });
      return;
    }
    if (window.openChatbot) {
      window.openChatbot();
    } else {
      setTimeout(() => {
        const chatbotButton = document.querySelector('.chatbot-button');
        if (chatbotButton) chatbotButton.click();
      }, 100);
    }
  };

  // Trong handleBookConsultation function:
const handleBookConsultation = (doctorId, type) => {
  if (!user) {
    navigate('/login', { state: { from: '/tu-van' } });
    return;
  }
  
  // ✅ ĐÚNG: Navigate sang trang đặt lịch
  navigate('/tu-van/dat-lich', { 
    state: { 
      doctorId: doctorId, 
      consultationType: type 
    } 
  });
};

  const handleViewDoctorProfile = (doctorId) => {
    navigate(`/bac-si/${doctorId}`);
  };

  const getIcon = (iconName) => {
    const icons = {
      'bolt': <FaBolt />,
      'comments': <FaComments />,
      'video': <FaVideo />,
      'usermd': <FaUserMd />,
      'shield': <FaShieldAlt />,
      'wallet': <FaWallet />,
      'clock': <FaClock />
    };
    return icons[iconName] || <FaCheckCircle />;
  };

  // Filter doctors based on selected filters
  const getFilteredDoctors = () => {
    let filtered = [...availableDoctors];

    // Filter by consultation type
    if (selectedConsultationType !== 'all') {
      // In real implementation, check if doctor supports this consultation type
      // For now, we show all doctors
    }

    // Filter by rating
    if (selectedRating) {
      const minRating = parseFloat(selectedRating);
      filtered = filtered.filter(doc => (doc.Doctor?.avg_rating || 0) >= minRating);
    }

    // Filter by price
    if (selectedPrice) {
      // In real implementation, filter by doctor's consultation prices
    }

    // Filter by availability
    if (selectedAvailability === 'online') {
      filtered = filtered.filter(doc => doc.is_online);
    }

    // Search by name or specialty
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(doc => 
        doc.full_name?.toLowerCase().includes(query) ||
        doc.Doctor?.Specialty?.name?.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const filteredDoctors = getFilteredDoctors();

  if (loading) {
    return (
      <div className="consultation-home-loading">
        <div className="modern-spinner"></div>
        <p>Đang tải dữ liệu...</p>
      </div>
    );
  }

  return (
    <div className="consultation-home-page modern-design">
      
      {/* Hero Banner */}
      <section 
        className="hero-banner modern-hero"
        style={{
          background: `linear-gradient(135deg, ${bannerSettings?.primary_color || '#667eea'} 0%, ${bannerSettings?.secondary_color || '#764ba2'} 100%)`
        }}
      >
        <div className="hero-background">
          <div className="floating-shape shape-1"></div>
          <div className="floating-shape shape-2"></div>
          <div className="floating-shape shape-3"></div>
        </div>
        
        <div className="container hero-container">
          <div className="hero-content">
            <div className="hero-badge">
              <FaCheckCircle /> {bannerSettings?.badge_text || 'Nền Tảng Tư Vấn Y Tế #1'}
            </div>
            <h1 className="hero-title">
              {bannerSettings?.title || 'Tư Vấn Sức Khỏe Online'}
            </h1>
            <p className="hero-description">
              {bannerSettings?.subtitle || 'Kết nối với bác sĩ chuyên khoa trong vài phút'}
            </p>
            
            {user && stats && (
              <div className="user-stats-modern">
                <div className="stat-card">
                  <FaComments className="stat-icon" />
                  <div className="stat-info">
                    <span className="stat-number">{stats.total_consultations || 0}</span>
                    <span className="stat-label">Buổi tư vấn</span>
                  </div>
                </div>
                {user.role === 'doctor' && (
                  <>
                    <div className="stat-card">
                      <FaStar className="stat-icon" />
                      <div className="stat-info">
                        <span className="stat-number">{stats.avg_rating || 0}⭐</span>
                        <span className="stat-label">Đánh giá TB</span>
                      </div>
                    </div>
                    <div className="stat-card">
                      <FaUserMd className="stat-icon" />
                      <div className="stat-info">
                        <span className="stat-number">{stats.total_patients || 0}</span>
                        <span className="stat-label">Bệnh nhân</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="hero-actions">
              <button className="btn-hero-primary" onClick={handleQuickChat}>
                <FaBolt /> Chat Nhanh Ngay
              </button>
              <button 
                className="btn-hero-secondary"
                onClick={() => navigate('/tu-van/chon-bac-si')}
              >
                <FaUserMd /> Chọn Bác Sĩ
              </button>
            </div>

            <div className="hero-features">
              <div className="hero-feature-item">
                <FaClock /> Phản hồi {'< 2 phút'}
              </div>
              <div className="hero-feature-item">
                <FaShieldAlt /> Bảo mật 100%
              </div>
              <div className="hero-feature-item">
                <FaCheckCircle /> {availableDoctors.length}+ bác sĩ sẵn sàng
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Consultation Methods */}
      <section className="consultation-methods">
        <div className="container">
          <div className="section-header-modern">
            <h2 className="section-title-modern">
              Chọn Phương Thức Tư Vấn
            </h2>
            <p className="section-subtitle">
              Lựa chọn hình thức tư vấn phù hợp với nhu cầu của bạn
            </p>
          </div>
          
          <div className="methods-grid-3">
            {methodsSettings.filter(method => method.enabled).map((method) => (
              <div 
                key={method.id} 
                className="method-card-v2"
                style={{ '--method-color': method.color }}
              >
                {method.badge && (
                  <div className="method-badge">{method.badge}</div>
                )}
                
                <div className="method-icon-wrapper">
                  <div className="method-icon">
                    {getIcon(method.icon)}
                  </div>
                </div>

                <h3 className="method-title">{method.name}</h3>
                <p className="method-subtitle">{method.subtitle}</p>
                <p className="method-description">{method.description}</p>

                <ul className="method-features">
                  {method.features.map((feature, index) => (
                    <li key={index}>
                      <FaCheckCircle className="feature-check" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button 
                  className="method-btn" 
                  onClick={() => handleConsultationType(method.id)}
                  style={{
                    background: `linear-gradient(135deg, ${method.color}, ${method.color}dd)`
                  }}
                >
                  {method.id === 'quick-chat' ? 'Chat ngay' : 'Đặt lịch ngay'}
                  <FaArrowRight className="btn-arrow" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FILTER SECTION - FOR CONSULTATION, NOT JUST DOCTORS */}
      <section className="consultation-filters-section">
        <div className="container">
          <div className="section-header-modern">
            <h2 className="section-title-modern">
              Tìm Bác Sĩ Tư Vấn
            </h2>
            <p className="section-subtitle">
              Lọc theo phương thức tư vấn, giá cả và đánh giá
            </p>
          </div>

          {/* Search Bar */}
          <div className="consultation-search-bar">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Tìm theo tên bác sĩ, chuyên khoa..."
              className="search-input-modern"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className="search-btn-modern">
              <FaSearch /> Tìm kiếm
            </button>
          </div>

          {/* Consultation Type Filter (Primary) */}
          <div className="consultation-type-filter">
            <div className="filter-label">
              <FaFilter /> Lọc theo phương thức tư vấn:
            </div>
            <div className="consultation-type-chips">
              <button 
                className={`type-chip ${selectedConsultationType === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedConsultationType('all')}
              >
                <FaCheckCircle /> Tất cả
              </button>
              <button 
                className={`type-chip ${selectedConsultationType === 'quick-chat' ? 'active' : ''}`}
                onClick={() => setSelectedConsultationType('quick-chat')}
              >
                <FaBolt /> Chat Nhanh
              </button>
              <button 
                className={`type-chip ${selectedConsultationType === 'chat' ? 'active' : ''}`}
                onClick={() => setSelectedConsultationType('chat')}
              >
                <FaComments /> Chat Real-time
              </button>
              <button 
                className={`type-chip ${selectedConsultationType === 'video' ? 'active' : ''}`}
                onClick={() => setSelectedConsultationType('video')}
              >
                <FaVideo /> Video Call
              </button>
            </div>
          </div>

          {/* Secondary Filters */}
          <div className="secondary-filters-row">
            <div className="filter-option-item">
              <label>
                <FaStar className="filter-icon" />
                Đánh giá
              </label>
              <select 
                className="filter-select"
                value={selectedRating}
                onChange={(e) => setSelectedRating(e.target.value)}
              >
                <option value="">Tất cả</option>
                <option value="5">5 sao</option>
                <option value="4">4 sao trở lên</option>
                <option value="3">3 sao trở lên</option>
              </select>
            </div>

            <div className="filter-option-item">
              <label>
                <FaWallet className="filter-icon" />
                Mức giá
              </label>
              <select 
                className="filter-select"
                value={selectedPrice}
                onChange={(e) => setSelectedPrice(e.target.value)}
              >
                <option value="">Tất cả</option>
                <option value="low">Dưới 100K</option>
                <option value="medium">100K - 300K</option>
                <option value="high">Trên 300K</option>
              </select>
            </div>

            <div className="filter-option-item">
              <label>
                <FaCheckCircle className="filter-icon" />
                Trạng thái
              </label>
              <select 
                className="filter-select"
                value={selectedAvailability}
                onChange={(e) => setSelectedAvailability(e.target.value)}
              >
                <option value="all">Tất cả</option>
                <option value="online">Đang online</option>
                <option value="available">Có lịch trống</option>
              </select>
            </div>

            <div className="filter-option-item">
              <label>
                <FaSort className="filter-icon" />
                Sắp xếp
              </label>
              <select className="filter-select">
                <option value="rating">Đánh giá cao nhất</option>
                <option value="experience">Kinh nghiệm nhiều</option>
                <option value="price-low">Giá thấp đến cao</option>
                <option value="price-high">Giá cao đến thấp</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* DOCTORS LIST - WITH BOOKING BUTTONS */}
      {filteredDoctors && filteredDoctors.length > 0 && (
        <section className="doctors-list-section">
          <div className="container">
            <div className="section-header-modern">
              <div>
                <h2 className="section-title-modern">
                  Bác Sĩ Sẵn Sàng Tư Vấn
                </h2>
                <p className="section-subtitle">
                  {filteredDoctors.length} bác sĩ phù hợp với lựa chọn của bạn
                </p>
              </div>
            </div>

            <div className="doctors-list-grid">
              {filteredDoctors.map((doctor) => (
                <div key={doctor.id} className="doctor-list-card">
                  <div className="doctor-card-header">
                    <div className="doctor-avatar-section">
                      <img 
                        src={doctor.avatar_url || '/default-avatar.png'} 
                        alt={doctor.full_name}
                        className="doctor-avatar-list"
                      />
                      {doctor.is_online && (
                        <span className="online-badge-list">
                          <span className="pulse-dot"></span>
                          Online
                        </span>
                      )}
                    </div>
                    
                    <div className="doctor-info-section">
                      <h3 className="doctor-name-list">{doctor.full_name}</h3>
                      <p className="doctor-specialty-list">
                        {doctor.Doctor?.Specialty?.name || 'Đa khoa'}
                      </p>
                      
                      <div className="doctor-meta-list">
                        <div className="meta-item">
                          <FaStar className="meta-icon star" />
                          <span>{doctor.Doctor?.avg_rating || 4.5}</span>
                          <span className="meta-light">({doctor.Doctor?.total_reviews || 0} đánh giá)</span>
                        </div>
                        <div className="meta-item">
                          <FaUserMd className="meta-icon" />
                          <span>{doctor.Doctor?.experience_years || 0}+ năm kinh nghiệm</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="doctor-pricing-section">
                    <div className="pricing-item">
                      <span className="pricing-label">Chat Real-time</span>
                      <span className="pricing-value">100K<span className="pricing-unit">/30 phút</span></span>
                    </div>
                    <div className="pricing-divider"></div>
                    <div className="pricing-item">
                      <span className="pricing-label">Video Call</span>
                      <span className="pricing-value">300K<span className="pricing-unit">/30 phút</span></span>
                    </div>
                  </div>

                  <div className="doctor-actions-section">
                    <button 
                      className="btn-view-profile-list"
                      onClick={() => handleViewDoctorProfile(doctor.id)}
                    >
                      Xem hồ sơ
                    </button>
                    <button 
                      className="btn-book-chat"
                      onClick={() => handleBookConsultation(doctor.id, 'chat')}
                    >
                      <FaComments /> Đặt lịch Chat
                    </button>
                    <button 
                      className="btn-book-video"
                      onClick={() => handleBookConsultation(doctor.id, 'video')}
                    >
                      <FaVideo /> Đặt lịch Video
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="load-more-section">
              <button className="btn-load-more">
                Xem thêm bác sĩ
                <FaArrowRight />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Top Rated Doctors */}
      {topRatedDoctors && topRatedDoctors.length > 0 && (
        <section className="top-rated-section-modern">
          <div className="container">
            <div className="section-header-modern">
              <h2 className="section-title-modern">
                Bác Sĩ Được Yêu Thích Nhất
              </h2>
              <p className="section-subtitle">
                Được đánh giá cao bởi hàng nghìn bệnh nhân
              </p>
            </div>

            <div className="top-doctors-grid">
              {topRatedDoctors.map((doctor, index) => (
                <div key={doctor.id} className="top-doctor-card">
                  <div className="top-doctor-rank">
                    #{index + 1}
                  </div>
                  
                  <div className="top-doctor-avatar-wrapper">
                    <img 
                      src={doctor.avatar_url || '/default-avatar.png'} 
                      alt={doctor.full_name}
                      className="top-doctor-avatar"
                    />
                    {index < 3 && (
                      <div className="top-star-badge">
                        <FaStar />
                      </div>
                    )}
                  </div>

                  <h4 className="top-doctor-name">{doctor.full_name}</h4>
                  <p className="top-doctor-specialty">
                    {doctor.Doctor?.Specialty?.name || 'Đa khoa'}
                  </p>
                  
                  <div className="top-doctor-rating">
                    <div className="rating-stars">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <FaStar 
                          key={i}
                          className={i < Math.round(doctor.Doctor?.avg_rating || 4.5) ? 'star-filled' : 'star-empty'}
                        />
                      ))}
                    </div>
                    <span className="rating-value">
                      {doctor.Doctor?.avg_rating || 4.5}/5
                    </span>
                    <span className="review-count">
                      ({doctor.Doctor?.total_reviews || 0} đánh giá)
                    </span>
                  </div>

                  <button 
                    className="btn-view-top-doctor"
                    onClick={() => handleViewDoctorProfile(doctor.id)}
                  >
                    Xem chi tiết
                    <FaArrowRight />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Why Choose Us */}
      <section className="why-choose-modern">
        <div className="container">
          <div className="section-header-modern">
            <h2 className="section-title-modern">
              Tại Sao Chọn Chúng Tôi?
            </h2>
            <p className="section-subtitle">
              Cam kết mang đến dịch vụ tư vấn y tế tốt nhất
            </p>
          </div>
          
          <div className="features-grid-modern">
            {whyChooseSettings.map((feature) => (
              <div key={feature.id} className="feature-card-modern">
                <div 
                  className="feature-icon-modern"
                  style={{
                    background: `linear-gradient(135deg, ${feature.color}, ${feature.color}dd)`
                  }}
                >
                  {getIcon(feature.icon)}
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section-modern">
        <div className="cta-background">
          <div className="cta-shape cta-shape-1"></div>
          <div className="cta-shape cta-shape-2"></div>
        </div>
        
        <div className="container">
          <div className="cta-content-modern">
            <h2 className="cta-title">
              Sẵn Sàng Bắt Đầu?
            </h2>
            <p className="cta-description">
              Đừng chần chừ! Kết nối ngay với bác sĩ chuyên khoa trong vài phút. 
              Sức khỏe của bạn là ưu tiên hàng đầu!
            </p>
            <div className="cta-buttons">
              <button 
                className="cta-btn cta-btn-primary"
                onClick={handleQuickChat}
              >
                <FaBolt /> Chat Nhanh Ngay
              </button>
              <button 
                className="cta-btn cta-btn-secondary"
                onClick={() => navigate('/tu-van/chon-bac-si')}
              >
                <FaUserMd /> Chọn Bác Sĩ
              </button>
            </div>
            <p className="cta-note">
              <FaCheckCircle /> Đã có hơn 50,000+ lượt tư vấn thành công
            </p>
          </div>
        </div>
      </section>

    </div>
  );
};

export default ConsultationHomePage;