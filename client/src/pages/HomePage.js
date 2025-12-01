/* 
 * Tệp: HomePage.js - PHIÊN BẢN MỚI
 * Mô tả: Trang chủ với 5 sections theo yêu cầu mới
 * API: /api/settings/home, /api/specialties, /api/users/doctors
 * 
 * ĐÃ SỬA: Banner slider tự động chuyển slide
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import * as FaIcons from 'react-icons/fa';
import './HomePage.css';

const HomePage = () => {
  const [specialties, setSpecialties] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [homeSettings, setHomeSettings] = useState({
    bannerSlides: [],
    features: [],
    aboutSection: {},
    testimonials: [],
    bookingSection: {}
  });
  const [formData, setFormData] = useState({
    email: '',
    specialty: '',
    date: '',
    name: '',
    phone: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVisible, setIsVisible] = useState({});
  const [error, setError] = useState(null);

  const iconMap = { ...FaIcons };

  // Fetch data chỉ chạy 1 lần khi component mount
  useEffect(() => {
    const fetchHomeSettings = async () => {
      try {
        const response = await axios.get('http://localhost:3001/api/settings/home');
        if (response.data) {
          setHomeSettings(response.data);
          setError(null);
        }
      } catch (error) {
        console.error('Lỗi khi lấy dữ liệu trang chủ:', error);
        setError('Không thể tải dữ liệu trang chủ. Vui lòng thử lại sau.');
      }
    };

    const fetchSpecialties = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/specialties');
        const data = await response.json();
        
        if (data.success && data.specialties) {
          const specialtiesWithIcons = data.specialties.map(spec => ({
            ...spec,
            icon: <FaIcons.FaStethoscope />
          }));
          setSpecialties(specialtiesWithIcons.slice(0, 6));
        }
      } catch (error) {
        console.error('Lỗi khi lấy dữ liệu chuyên khoa:', error);
      }
    };

    const fetchDoctors = async () => {
  try {
    const token = localStorage.getItem('token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    
    const response = await fetch('http://localhost:3001/api/users/doctors?limit=3&random=true', {
      headers
    });
    
    const data = await response.json();
    
    if (data.success && data.doctors) {
      setDoctors(data.doctors);
    } else {
      setDoctors([]);
    }
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu bác sĩ:', error);
    setDoctors([]);
  }
};

    fetchHomeSettings();
    fetchSpecialties();
    fetchDoctors();

    // IntersectionObserver cho animations
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsVisible(prev => ({ ...prev, [entry.target.id]: true }));
          }
        });
      },
      { threshold: 0.1 }
    );

    const sections = document.querySelectorAll('.homepage-animate-section');
    sections.forEach(section => observer.observe(section));

    return () => {
      sections.forEach(section => observer.unobserve(section));
    };
  }, []); // Chỉ chạy 1 lần khi mount

  // AUTO SLIDER - Interval riêng, chỉ chạy khi có bannerSlides
  useEffect(() => {
    // Kiểm tra có slides và có nhiều hơn 1 slide
    if (!homeSettings.bannerSlides || homeSettings.bannerSlides.length <= 1) {
      return; // Không chạy interval nếu chỉ có 1 hoặc 0 slide
    }

    console.log('🎬 Starting auto slider with', homeSettings.bannerSlides.length, 'slides');

    // Tạo interval để tự động chuyển slide
    const slideInterval = setInterval(() => {
      setCurrentSlide(prev => {
        const nextSlide = (prev + 1) % homeSettings.bannerSlides.length;
        console.log('🔄 Auto switching from slide', prev, 'to', nextSlide);
        return nextSlide;
      });
    }, 5000); // Chuyển slide mỗi 5 giây

    // Cleanup interval khi component unmount hoặc bannerSlides thay đổi
    return () => {
      console.log('🛑 Stopping auto slider');
      clearInterval(slideInterval);
    };
  }, [homeSettings.bannerSlides]); // Chỉ phụ thuộc vào bannerSlides

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        alert('Đặt lịch thành công! Kiểm tra email để xác nhận.');
        setFormData({ email: '', specialty: '', date: '', name: '', phone: '' });
      } else {
        alert('Có lỗi xảy ra. Vui lòng thử lại!');
      }
    } catch (error) {
      console.error('Lỗi khi gửi đặt lịch:', error);
      alert('Có lỗi xảy ra. Vui lòng thử lại!');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manual navigation - Reset interval khi user click
  const nextSlide = () => {
    setCurrentSlide((prev) => {
      const next = (prev + 1) % homeSettings.bannerSlides.length;
      console.log('➡️ Manual next: slide', prev, 'to', next);
      return next;
    });
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => {
      const previous = (prev - 1 + homeSettings.bannerSlides.length) % homeSettings.bannerSlides.length;
      console.log('⬅️ Manual prev: slide', prev, 'to', previous);
      return previous;
    });
  };

  const goToSlide = (index) => {
    console.log('🎯 Go to slide', index);
    setCurrentSlide(index);
  };

  if (error) {
    return (
      <main className="homepage-main">
        <section className="homepage-banner-slider">
          <p className="homepage-error-text">{error}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="homepage-main">
      {/* 1. Banner Slides */}
      <section className="homepage-banner-slider">
        {(homeSettings.bannerSlides || []).map((slide, index) => (
          <div
            key={index}
            className={`homepage-banner-slide ${index === currentSlide ? 'active' : ''}`}
            style={{ backgroundImage: `url(${slide.image})` }}
          >
            <div className="homepage-banner-overlay"></div>
            <div className="homepage-banner-content">
              <div className="homepage-banner-badge">
                <FaIcons.FaHeart className="homepage-badge-icon" />
                <span>Chăm sóc sức khỏe toàn diện</span>
              </div>
              <h1>{slide.title}</h1>
              <h2>{slide.subtitle}</h2>
              <p>{slide.description}</p>
              <div className="homepage-banner-buttons">
                <Link to={slide.buttonLink || '/book-appointment'} className="homepage-btn homepage-btn-primary" 
                  style={{ background: slide.buttonColor || '#10b981' }}>
                  {slide.buttonIcon && iconMap[slide.buttonIcon] && 
                    React.createElement(iconMap[slide.buttonIcon])}
                  {slide.buttonText || 'Đặt lịch ngay'}
                </Link>
                <Link to="/about" className="homepage-btn homepage-btn-secondary">
                  Tìm hiểu thêm
                  <FaIcons.FaArrowRight />
                </Link>
              </div>
            </div>
          </div>
        ))}
        
        {/* Chỉ hiển thị controls khi có nhiều hơn 1 slide */}
        {homeSettings.bannerSlides && homeSettings.bannerSlides.length > 1 && (
          <>
            <button className="homepage-slider-btn homepage-prev" onClick={prevSlide} aria-label="Previous slide">
              <FaIcons.FaChevronLeft />
            </button>
            <button className="homepage-slider-btn homepage-next" onClick={nextSlide} aria-label="Next slide">
              <FaIcons.FaChevronRight />
            </button>
            
            <div className="homepage-slider-dots">
              {homeSettings.bannerSlides.map((_, index) => (
                <button
                  key={index}
                  className={`homepage-dot ${index === currentSlide ? 'active' : ''}`}
                  onClick={() => goToSlide(index)}
                  aria-label={`Go to slide ${index + 1}`}
                ></button>
              ))}
            </div>
          </>
        )}
      </section>

      {/* 2. Tính năng nổi bật */}
      <section className="homepage-section-container homepage-features-section homepage-animate-section" id="features">
        <div className="homepage-container">
          <h2 className="homepage-section-title">Tính năng nổi bật</h2>
          <div className="homepage-features-grid">
            {(homeSettings.features || []).map((feature, index) => {
              const Icon = iconMap[feature.icon] || FaIcons.FaStethoscope;
              return (
                <div 
                  key={index} 
                  className={`homepage-feature-card ${isVisible.features ? 'fade-in' : ''}`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="homepage-feature-icon" style={{ backgroundColor: feature.iconBgColor || '#10b981' }}>
                    <Icon />
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. Về chúng tôi */}
      {homeSettings.aboutSection && homeSettings.aboutSection.title && (
        <section className="homepage-section-container homepage-intro-section homepage-animate-section" id="intro">
          <div className="homepage-container">
            <h2 className="homepage-section-title">{homeSettings.aboutSection.title}</h2>
            <div className="homepage-intro-content">
              <div className={`homepage-intro-image ${isVisible.intro ? 'slide-in-left' : ''}`}>
                <img src={homeSettings.aboutSection.image} alt={homeSettings.aboutSection.alt || 'Về chúng tôi'} />
                {homeSettings.aboutSection.yearsExperience && (
                  <div className="homepage-intro-badge">
                    <FaIcons.FaTrophy />
                    <div>
                      <h4>{homeSettings.aboutSection.yearsExperience}</h4>
                      <p>Năm kinh nghiệm</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className={`homepage-intro-text ${isVisible.intro ? 'slide-in-right' : ''}`}>
                {(homeSettings.aboutSection.highlights || []).map((highlight, index) => {
                  const Icon = iconMap[highlight.icon] || FaIcons.FaCheckCircle;
                  return (
                    <div key={index} className="homepage-intro-item">
                      <Icon className="homepage-check-icon" />
                      <div>
                        <h4>{highlight.title}</h4>
                        <p>{highlight.description}</p>
                      </div>
                    </div>
                  );
                })}
                <Link to={homeSettings.aboutSection.buttonLink || '/about'} className="homepage-btn homepage-btn-outline">
                  {homeSettings.aboutSection.buttonText || 'Xem thêm'}
                  <FaIcons.FaArrowRight />
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 4. Chuyên khoa nổi bật */}
      <section className="homepage-section-container homepage-specialties-section homepage-animate-section" id="specialties">
        <div className="homepage-container">
          <h2 className="homepage-section-title">Chuyên khoa nổi bật</h2>
          <div className="homepage-specialties-grid">
            {specialties.map((specialty, index) => (
              <div 
                key={specialty.id} 
                className={`homepage-specialty-card ${isVisible.specialties ? 'fade-in' : ''}`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="homepage-specialty-icon">
                  {specialty.icon || <FaIcons.FaStethoscope />}
                </div>
                <h3>{specialty.name}</h3>
                <p>{specialty.description}</p>
                <Link to={`/chuyen-khoa/${specialty.slug}`} className="homepage-specialty-link">
                  Xem chi tiết
                  <FaIcons.FaArrowRight />
                </Link>
              </div>
            ))}
          </div>

          {specialties.length > 6 && (
            <div className="homepage-section-footer">
              <Link to="/chuyen-khoa" className="homepage-btn homepage-btn-outline">
                Xem tất cả chuyên khoa
                <FaIcons.FaArrowRight />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* 5. Bác sĩ nổi bật */}
      <section className="homepage-section-container homepage-doctors-section homepage-animate-section" id="doctors">
        <div className="homepage-container">
          <h2 className="homepage-section-title">Bác sĩ nổi bật</h2>
          {doctors.length > 0 ? (
            <>
              <div className="homepage-doctors-grid">
                {doctors.map((doctor, index) => (
                  <div 
                    key={doctor.id} 
                    className={`homepage-doctor-card ${isVisible.doctors ? 'scale-in' : ''}`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="homepage-doctor-image-wrapper">
                      <img 
                        src={doctor.avatar_url} 
                        alt={doctor.full_name} 
                        className="homepage-doctor-image" 
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f0f0f0" width="400" height="300"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="18" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3EDoctor%3C/text%3E%3C/svg%3E';
                        }}
                      />
                      <div className="homepage-doctor-rating">
                        <FaIcons.FaStar />
                        <span>5.0</span>
                      </div>
                    </div>
                    <div className="homepage-doctor-info">
                      <h3>{doctor.full_name}</h3>
                      <p className="homepage-doctor-specialty">
                        <FaIcons.FaStethoscope />
                        {doctor.specialty_name}
                      </p>
                      <p className="homepage-doctor-experience">
                        <FaIcons.FaAward />
                        {doctor.experience_years} năm kinh nghiệm
                      </p>
                      <Link to={`/bac-si/${doctor.code}`} className="homepage-doctor-link">
                        Xem hồ sơ
                        <FaIcons.FaArrowRight />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              <div className="homepage-section-footer">
                <Link to="/bac-si" className="homepage-btn homepage-btn-outline">
                  Xem tất cả bác sĩ
                  <FaIcons.FaArrowRight />
                </Link>
              </div>
            </>
          ) : (
            <p className="homepage-loading-text">Đang tải dữ liệu bác sĩ...</p>
          )}
        </div>
      </section>

      {/* 6. Đánh giá từ bệnh nhân */}
      <section className="homepage-section-container homepage-testimonials-section homepage-animate-section" id="testimonials">
        <div className="homepage-container">
          <h2 className="homepage-section-title">Đánh giá từ bệnh nhân</h2>
          <div className="homepage-testimonials-grid">
            {(homeSettings.testimonials || []).map((testimonial, index) => (
              <div 
                key={index} 
                className={`homepage-testimonial-card ${isVisible.testimonials ? 'fade-in' : ''}`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <FaIcons.FaQuoteLeft className="homepage-quote-icon" />
                <p className="homepage-testimonial-text">{testimonial.comment}</p>
                <div className="homepage-testimonial-rating">
                  {[...Array(testimonial.rating || 5)].map((_, i) => (
                    <FaIcons.FaStar key={i} />
                  ))}
                </div>
                <div className="homepage-testimonial-author">
                  <img src={testimonial.avatar} alt={testimonial.alt || testimonial.name} />
                  <div>
                    <h4>{testimonial.name}</h4>
                    <p>{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Đặt lịch khám bệnh */}
      {homeSettings.bookingSection && homeSettings.bookingSection.title && (
        <section className="homepage-section-container homepage-booking-section homepage-animate-section" id="booking">
          <div className="homepage-container">
            <h2 className="homepage-section-title">{homeSettings.bookingSection.title}</h2>
            <div className={`homepage-booking-wrapper ${isVisible.booking ? 'fade-in' : ''}`}>
              <div className="homepage-booking-info">
                <span className="homepage-section-badge">Đặt lịch nhanh</span>
                <p>{homeSettings.bookingSection.description}</p>
                
                <div className="homepage-booking-features">
                  {(homeSettings.bookingSection.features || []).map((feature, index) => {
                    const Icon = iconMap[feature.icon] || FaIcons.FaCheckCircle;
                    return (
                      <div key={index} className="homepage-booking-feature">
                        <Icon />
                        <span>{feature.text}</span>
                      </div>
                    );
                  })}
                </div>
                
                <div className="homepage-contact-info">
                  {homeSettings.bookingSection.hotline && (
                    <div className="homepage-contact-item">
                      <FaIcons.FaPhone />
                      <div>
                        <h4>Hotline</h4>
                        <p>{homeSettings.bookingSection.hotline}</p>
                      </div>
                    </div>
                  )}
                  {homeSettings.bookingSection.email && (
                    <div className="homepage-contact-item">
                      <FaIcons.FaEnvelope />
                      <div>
                        <h4>Email</h4>
                        <p>{homeSettings.bookingSection.email}</p>
                      </div>
                    </div>
                  )}
                  {homeSettings.bookingSection.address && (
                    <div className="homepage-contact-item">
                      <FaIcons.FaMapMarkerAlt />
                      <div>
                        <h4>Địa chỉ</h4>
                        <p>{homeSettings.bookingSection.address}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <form className="homepage-booking-form" onSubmit={handleSubmit}>
                <div className="homepage-form-header">
                  <FaIcons.FaCalendarAlt />
                  <h3>Thông tin đặt lịch</h3>
                </div>

                <div className="homepage-form-group">
                  <label htmlFor="name">
                    Họ và tên
                    <span className="homepage-required">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="Nguyễn Văn A"
                  />
                </div>

                <div className="homepage-form-group">
                  <label htmlFor="phone">
                    Số điện thoại
                    <span className="homepage-required">*</span>
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    placeholder="0912345678"
                  />
                </div>

                <div className="homepage-form-group">
                  <label htmlFor="email">
                    Email của bạn
                    <span className="homepage-required">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    placeholder="example@email.com"
                  />
                </div>

                <div className="homepage-form-group">
                  <label htmlFor="specialty">
                    Chuyên khoa
                    <span className="homepage-required">*</span>
                  </label>
                  <select
                    id="specialty"
                    name="specialty"
                    value={formData.specialty}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">-- Chọn chuyên khoa --</option>
                    {specialties.map(specialty => (
                      <option key={specialty.id} value={specialty.id}>
                        {specialty.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="homepage-form-group">
                  <label htmlFor="date">
                    Ngày hẹn
                    <span className="homepage-required">*</span>
                  </label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <button 
                  type="submit" 
                  className="homepage-btn homepage-btn-primary homepage-btn-block"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="homepage-spinner-small"></div>
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <FaIcons.FaCalendarAlt />
                      Đặt lịch ngay
                    </>
                  )}
                </button>

                <p className="homepage-form-note">
                  <FaIcons.FaClock />
                  Chúng tôi sẽ liên hệ xác nhận trong vòng 24h
                </p>
              </form>
            </div>
          </div>
        </section>
      )}
    </main>
  );
};

export default HomePage;