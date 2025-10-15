import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { 
  FaStethoscope, 
  FaHeart, 
  FaUserMd, 
  FaAward,
  FaCalendarAlt,
  FaClock,
  FaCheckCircle,
  FaArrowRight,
  FaStar,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaChevronLeft,
  FaChevronRight,
  FaQuoteLeft,
  FaTrophy
} from 'react-icons/fa';
import './HomePage.css';

const HomePage = () => {
  const [specialties, setSpecialties] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [homeSettings, setHomeSettings] = useState({
    bannerSlides: [],
    features: [],
    stats: [],
    testimonials: []
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

  useEffect(() => {
    const fetchHomeSettings = async () => {
      try {
        const response = await axios.get('http://localhost:3001/api/settings/home');
        if (response.data) {
          setHomeSettings(response.data);
        }
      } catch (error) {
        console.error('Error fetching home settings:', error);
      }
    };
    const fetchSpecialties = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/specialties');
        const data = await response.json();
        
        if (data.success && data.specialties) {
          const specialtiesWithIcons = data.specialties.map(spec => ({
            ...spec,
            icon: <FaStethoscope />
          }));
          setSpecialties(specialtiesWithIcons.slice(0, 6));
        }
      } catch (error) {
        console.error('Error fetching specialties:', error);
      }
    };

    const fetchDoctors = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/users/doctors?limit=3&random=true');
        const data = await response.json();
        
        if (data.success && data.doctors) {
          setDoctors(data.doctors);
        } else {
          setDoctors([]);
        }
      } catch (error) {
        console.error('Error fetching doctors:', error);
        setDoctors([]);
      }
    };

    fetchHomeSettings();
    fetchSpecialties();
    fetchDoctors();

    const slideInterval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % homeSettings.bannerSlides.length);
    }, 5000);

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

    const sections = document.querySelectorAll('.animate-section');
    sections.forEach(section => observer.observe(section));

    return () => {
      clearInterval(slideInterval);
      sections.forEach(section => observer.unobserve(section));
    };
  }, [homeSettings.bannerSlides.length]);

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
      console.error('Error submitting appointment:', error);
      alert('Có lỗi xảy ra. Vui lòng thử lại!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % homeSettings.bannerSlides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + homeSettings.bannerSlides.length) % homeSettings.bannerSlides.length);
  };

  return (
    <main className="home-main">
      {/* Banner Slider Section */}
      <section className="banner-slider">
        {homeSettings.bannerSlides.map((slide, index) => (
          <div
            key={index}
            className={`banner-slide ${index === currentSlide ? 'active' : ''}`}
            style={{ backgroundImage: `url(${slide.image})` }}
          >
            <div className="banner-overlay"></div>
            <div className="banner-content">
              <div className="banner-badge">
                <FaHeart className="badge-icon" />
                <span>Chăm sóc sức khỏe toàn diện</span>
              </div>
              <h1>{slide.title}</h1>
              <h2>{slide.subtitle}</h2>
              <p>{slide.description}</p>
              <div className="banner-buttons">
                <Link to="/book-appointment" className="btn btn-primary">
                  <FaCalendarAlt />
                  Đặt lịch ngay
                </Link>
                <Link to="/about" className="btn btn-secondary">
                  Tìm hiểu thêm
                  <FaArrowRight />
                </Link>
              </div>
            </div>
          </div>
        ))}
        
        <button className="slider-btn prev" onClick={prevSlide} aria-label="Previous slide">
          <FaChevronLeft />
        </button>
        <button className="slider-btn next" onClick={nextSlide} aria-label="Next slide">
          <FaChevronRight />
        </button>
        
        <div className="slider-dots">
          {homeSettings.bannerSlides.map((_, index) => (
            <button
              key={index}
              className={`dot ${index === currentSlide ? 'active' : ''}`}
              onClick={() => setCurrentSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            ></button>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section animate-section" id="features">
        <div className="container">
          <div className="features-grid">
            {homeSettings.features.map((feature, index) => (
              <div 
                key={index} 
                className={`feature-card ${isVisible.features ? 'fade-in' : ''}`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="feature-icon" style={{ backgroundColor: feature.color }}>
                  {feature.icon}
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section animate-section" id="stats">
        <div className="container">
          <div className="stats-grid">
            {homeSettings.stats.map((stat, index) => (
              <div 
                key={index} 
                className={`stat-card ${isVisible.stats ? 'scale-in' : ''}`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="stat-icon" style={{ color: stat.color }}>
                  {stat.icon}
                </div>
                <h3 className="stat-number">{stat.number}</h3>
                <p className="stat-label">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Intro Section */}
      <section className="intro-section animate-section" id="intro">
        <div className="container">
          <div className={`section-header ${isVisible.intro ? 'fade-in' : ''}`}>
            <span className="section-badge">Về chúng tôi</span>
            <h2>Clinic System - Đồng hành cùng sức khỏe</h2>
            <p className="section-subtitle">
              Chúng tôi cam kết mang đến trải nghiệm y tế tốt nhất với đội ngũ chuyên gia 
              hàng đầu và công nghệ hiện đại
            </p>
          </div>
          
          <div className="intro-content">
            <div className={`intro-image ${isVisible.intro ? 'slide-in-left' : ''}`}>
              <img src="https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=600&h=700&fit=crop" alt="Clinic" />
              <div className="intro-badge">
                <FaTrophy />
                <div>
                  <h4>15+</h4>
                  <p>Năm kinh nghiệm</p>
                </div>
              </div>
            </div>
            
            <div className={`intro-text ${isVisible.intro ? 'slide-in-right' : ''}`}>
              <div className="intro-item">
                <FaCheckCircle className="check-icon" />
                <div>
                  <h4>Đội ngũ bác sĩ giàu kinh nghiệm</h4>
                  <p>Các chuyên gia y tế được đào tạo bài bản, tận tâm với nghề</p>
                </div>
              </div>
              <div className="intro-item">
                <FaCheckCircle className="check-icon" />
                <div>
                  <h4>Trang thiết bị hiện đại</h4>
                  <p>Công nghệ y tế tiên tiến nhất, đảm bảo chẩn đoán chính xác</p>
                </div>
              </div>
              <div className="intro-item">
                <FaCheckCircle className="check-icon" />
                <div>
                  <h4>Dịch vụ chăm sóc tận tâm</h4>
                  <p>Luôn lắng nghe và đồng hành cùng bệnh nhân</p>
                </div>
              </div>
              <div className="intro-item">
                <FaCheckCircle className="check-icon" />
                <div>
                  <h4>Quy trình chuẩn quốc tế</h4>
                  <p>Đảm bảo an toàn và hiệu quả trong điều trị</p>
                </div>
              </div>
              <Link to="/about" className="btn btn-outline">
                Xem thêm
                <FaArrowRight />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Specialties Section */}
      <section className="specialties-section animate-section" id="specialties">
        <div className="container">
          <div className={`section-header ${isVisible.specialties ? 'fade-in' : ''}`}>
            <span className="section-badge">Chuyên khoa</span>
            <h2>Các chuyên khoa nổi bật</h2>
            <p className="section-subtitle">
              Đa dạng chuyên khoa với đội ngũ bác sĩ chuyên môn cao
            </p>
          </div>

          <div className="specialties-grid">
            {specialties.slice(0, 6).map((specialty, index) => (
              <div 
                key={specialty.id} 
                className={`specialty-card ${isVisible.specialties ? 'fade-in' : ''}`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="specialty-icon">
                  {specialty.icon || <FaStethoscope />}
                </div>
                <h3>{specialty.name}</h3>
                <p>{specialty.description}</p>
                <Link to={`/chuyen-khoa/${specialty.slug}`} className="specialty-link">
                  Xem chi tiết
                  <FaArrowRight />
                </Link>
              </div>
            ))}
          </div>

          {specialties.length > 6 && (
            <div className="section-footer">
              <Link to="/chuyen-khoa" className="btn btn-outline">
                Xem tất cả chuyên khoa
                <FaArrowRight />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Doctors Section */}
      <section className="doctors-section animate-section" id="doctors">
        <div className="container">
          <div className={`section-header ${isVisible.doctors ? 'fade-in' : ''}`}>
            <span className="section-badge">Đội ngũ y tế</span>
            <h2>Bác sĩ nổi bật</h2>
            <p className="section-subtitle">
              Gặp gỡ những bác sĩ xuất sắc của chúng tôi
            </p>
          </div>

          {doctors.length > 0 ? (
            <>
              <div className="doctors-grid">
                {doctors.map((doctor, index) => (
                  <div 
                    key={doctor.id} 
                    className={`doctor-card ${isVisible.doctors ? 'scale-in' : ''}`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="doctor-image-wrapper">
                      <img 
                        src={doctor.avatar_url} 
                        alt={doctor.full_name} 
                        className="doctor-image" 
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/400?text=Doctor';
                        }}
                      />
                      <div className="doctor-rating">
                        <FaStar />
                        <span>5.0</span>
                      </div>
                    </div>
                    <div className="doctor-info">
                      <h3>{doctor.full_name}</h3>
                      <p className="doctor-specialty">
                        <FaStethoscope />
                        {doctor.specialty_name}
                      </p>
                      <p className="doctor-experience">
                        <FaAward />
                        {doctor.experience_years} năm kinh nghiệm
                      </p>
                      <Link to={`/bac-si/${doctor.code}`} className="doctor-link">
                        Xem hồ sơ
                        <FaArrowRight />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              <div className="section-footer">
                <Link to="/bac-si" className="btn btn-outline">
                  Xem tất cả bác sĩ
                  <FaArrowRight />
                </Link>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <FaUserMd className="empty-icon" />
              <p>Hiện chưa có bác sĩ nào trong hệ thống</p>
              <p className="empty-subtext">Vui lòng quay lại sau</p>
            </div>
          )}
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials-section animate-section" id="testimonials">
        <div className="container">
          <div className={`section-header ${isVisible.testimonials ? 'fade-in' : ''}`}>
            <span className="section-badge">Đánh giá</span>
            <h2>Bệnh nhân nói gì về chúng tôi</h2>
            <p className="section-subtitle">
              Những phản hồi chân thực từ bệnh nhân
            </p>
          </div>

          <div className="testimonials-grid">
            {homeSettings.testimonials.map((testimonial, index) => (
              <div 
                key={index} 
                className={`testimonial-card ${isVisible.testimonials ? 'fade-in' : ''}`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <FaQuoteLeft className="quote-icon" />
                <p className="testimonial-text">{testimonial.comment}</p>
                <div className="testimonial-rating">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <FaStar key={i} />
                  ))}
                </div>
                <div className="testimonial-author">
                  <img src={testimonial.avatar} alt={testimonial.name} />
                  <h4>{testimonial.name}</h4>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Booking Section */}
      <section className="booking-section animate-section" id="booking">
        <div className="container">
          <div className={`booking-wrapper ${isVisible.booking ? 'fade-in' : ''}`}>
            <div className="booking-info">
              <span className="section-badge">Đặt lịch nhanh</span>
              <h2>Đặt lịch khám bệnh</h2>
              <p>
                Đặt lịch nhanh chóng và tiện lợi. Chúng tôi sẽ liên hệ xác nhận 
                trong thời gian sớm nhất.
              </p>
              <div className="booking-features">
                <div className="booking-feature">
                  <FaCheckCircle />
                  <span>Xác nhận nhanh qua email</span>
                </div>
                <div className="booking-feature">
                  <FaCheckCircle />
                  <span>Chọn bác sĩ theo ý muốn</span>
                </div>
                <div className="booking-feature">
                  <FaCheckCircle />
                  <span>Linh hoạt thời gian khám</span>
                </div>
              </div>
              
              <div className="contact-info">
                <div className="contact-item">
                  <FaPhone />
                  <div>
                    <h4>Hotline</h4>
                    <p>1900 xxxx</p>
                  </div>
                </div>
                <div className="contact-item">
                  <FaEnvelope />
                  <div>
                    <h4>Email</h4>
                    <p>contact@clinic.com</p>
                  </div>
                </div>
                <div className="contact-item">
                  <FaMapMarkerAlt />
                  <div>
                    <h4>Địa chỉ</h4>
                    <p>123 Đường ABC, TP.HCM</p>
                  </div>
                </div>
              </div>
            </div>

            <form className="booking-form" onSubmit={handleSubmit}>
              <div className="form-header">
                <FaCalendarAlt />
                <h3>Thông tin đặt lịch</h3>
              </div>

              <div className="form-group">
                <label htmlFor="name">
                  Họ và tên
                  <span className="required">*</span>
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

              <div className="form-group">
                <label htmlFor="phone">
                  Số điện thoại
                  <span className="required">*</span>
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

              <div className="form-group">
                <label htmlFor="email">
                  Email của bạn
                  <span className="required">*</span>
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

              <div className="form-group">
                <label htmlFor="specialty">
                  Chuyên khoa
                  <span className="required">*</span>
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

              <div className="form-group">
                <label htmlFor="date">
                  Ngày hẹn
                  <span className="required">*</span>
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
                className="btn btn-primary btn-block"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="spinner-small"></div>
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <FaCalendarAlt />
                    Đặt lịch ngay
                  </>
                )}
              </button>

              <p className="form-note">
                <FaClock />
                Chúng tôi sẽ liên hệ xác nhận trong vòng 24h
              </p>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
};

export default HomePage;