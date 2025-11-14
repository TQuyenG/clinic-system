/* 
 * File: AboutPage.js - PHIÊN BẢN HOÀN CHỈNH
 * Mô tả: Trang "Về chúng tôi" với 10 sections
 * API: /api/settings/about, /api/specialties, /api/users/doctors
 */

import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import * as FaIcons from 'react-icons/fa';
import './AboutPage.css';

const AboutPage = () => {
  const [specialties, setSpecialties] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [aboutData, setAboutData] = useState({
    banner: {},
    mission: {},
    vision: {},
    milestones: [],
    stats: [],
    values: [],
    leadership: [],
    achievements: [],
    facilities: []
  });
  const [isVisible, setIsVisible] = useState({});
  const [error, setError] = useState(null);
  
  // Timeline state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  
  const timelineRef = useRef(null);
  const autoPlayRef = useRef(null);

  const iconMap = { ...FaIcons };

  // Fetch data
  useEffect(() => {
    const fetchAboutData = async () => {
      try {
        const response = await axios.get('http://localhost:3001/api/settings/about');
        if (response.data) {
          setAboutData(response.data);
          setError(null);
        }
      } catch (error) {
        console.error('Lỗi khi lấy dữ liệu về:', error);
        setError('Không thể tải thông tin. Vui lòng thử lại sau.');
      }
    };

    const fetchSpecialties = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/specialties');
        const data = await response.json();
        if (data.success && data.specialties) {
          setSpecialties(data.specialties);
        }
      } catch (error) {
        console.error('Lỗi khi lấy dữ liệu chuyên khoa:', error);
      }
    };

    const fetchDoctors = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/users/doctors?limit=6&random=true');
        const data = await response.json();
        if (data.success && data.doctors) {
          setDoctors(data.doctors);
        }
      } catch (error) {
        console.error('Lỗi khi lấy dữ liệu bác sĩ:', error);
      }
    };

    fetchAboutData();
    fetchSpecialties();
    fetchDoctors();

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

    const sections = document.querySelectorAll('.aboutpage-animate-section');
    sections.forEach(section => observer.observe(section));

    return () => sections.forEach(section => observer.unobserve(section));
  }, []);

  // Auto-play timeline
  useEffect(() => {
    if (!aboutData.milestones || aboutData.milestones.length === 0) return;
    if (!isAutoPlay || isDragging) return;

    autoPlayRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % aboutData.milestones.length);
    }, 3000); // 3 giây mỗi milestone

    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
      }
    };
  }, [aboutData.milestones, isAutoPlay, isDragging]);

  // Scroll to milestone
  useEffect(() => {
    if (timelineRef.current && aboutData.milestones.length > 0) {
      const itemHeight = 350; // Chiều cao mỗi milestone item
      const targetScroll = currentIndex * itemHeight;
      
      timelineRef.current.scrollTo({
        top: targetScroll,
        behavior: 'smooth'
      });
    }
  }, [currentIndex, aboutData.milestones]);

  // Mouse drag handlers
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setIsAutoPlay(false);
    setStartY(e.pageY - timelineRef.current.offsetTop);
    setScrollTop(timelineRef.current.scrollTop);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const y = e.pageY - timelineRef.current.offsetTop;
    const walk = (y - startY) * 2;
    timelineRef.current.scrollTop = scrollTop - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    // Resume auto-play sau 3s
    setTimeout(() => {
      setIsAutoPlay(true);
    }, 3000);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  // Touch handlers (mobile)
  const handleTouchStart = (e) => {
    setIsDragging(true);
    setIsAutoPlay(false);
    setStartY(e.touches[0].pageY - timelineRef.current.offsetTop);
    setScrollTop(timelineRef.current.scrollTop);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const y = e.touches[0].pageY - timelineRef.current.offsetTop;
    const walk = (y - startY) * 2;
    timelineRef.current.scrollTop = scrollTop - walk;
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setTimeout(() => {
      setIsAutoPlay(true);
    }, 3000);
  };

  // Manual navigation
  const goToMilestone = (index) => {
    setCurrentIndex(index);
    setIsAutoPlay(false);
    setTimeout(() => {
      setIsAutoPlay(true);
    }, 5000);
  };

  const nextMilestone = () => {
    setCurrentIndex(prev => (prev + 1) % aboutData.milestones.length);
  };

  const prevMilestone = () => {
    setCurrentIndex(prev => (prev - 1 + aboutData.milestones.length) % aboutData.milestones.length);
  };

  if (error) {
    return (
      <div className="aboutpage-container">
        <section className="aboutpage-hero">
          <p className="aboutpage-error-text">{error}</p>
        </section>
      </div>
    );
  }

  return (
    <div className="aboutpage-container">
      {/* 1. Banner */}
      <section className="aboutpage-hero" 
        style={{ backgroundImage: `url(${aboutData.banner?.image || 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=1920&h=600&fit=crop'})` }}>
        <div className="aboutpage-hero-overlay"></div>
        <div className="aboutpage-hero-content">
          <div className="aboutpage-hero-badge">
            <FaIcons.FaHospital />
            <span>Về chúng tôi</span>
          </div>
          <h1 className="aboutpage-hero-title">{aboutData.banner?.title || 'Clinic System'}</h1>
          <h2 className="aboutpage-hero-subtitle">{aboutData.banner?.subtitle || 'Đồng hành cùng sức khỏe cộng đồng'}</h2>
          <p className="aboutpage-hero-description">
            {aboutData.banner?.description || 'Với hơn 15 năm kinh nghiệm, chúng tôi tự hào là đơn vị tiên phong...'}
          </p>
        </div>
      </section>

      {/* 2. Sứ mệnh & Tầm nhìn */}
      <section className="aboutpage-section-container aboutpage-mission-section aboutpage-animate-section" id="mission">
        <div className="aboutpage-section-content">
          <h2 className="aboutpage-section-title">Sứ mệnh & Tầm nhìn</h2>
          <div className="aboutpage-mission-grid">
            {/* Sứ mệnh */}
            {aboutData.mission && aboutData.mission.title && (
              <div className="aboutpage-mission-card">
                <div className="aboutpage-mission-image">
                  <img src={aboutData.mission.image || 'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=600&h=400&fit=crop'} 
                    alt={aboutData.mission.alt || 'Sứ mệnh'} />
                  <div className="aboutpage-mission-icon-overlay">
                    {iconMap[aboutData.mission.icon] ? React.createElement(iconMap[aboutData.mission.icon]) : <FaIcons.FaLeaf />}
                  </div>
                </div>
                <div className="aboutpage-mission-content">
                  <h3 className="aboutpage-mission-title">{aboutData.mission.title}</h3>
                  <p className="aboutpage-mission-text">{aboutData.mission.description}</p>
                </div>
              </div>
            )}
            
            {/* Tầm nhìn */}
            {aboutData.vision && aboutData.vision.title && (
              <div className="aboutpage-mission-card">
                <div className="aboutpage-mission-image">
                  <img src={aboutData.vision.image || 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&h=400&fit=crop'} 
                    alt={aboutData.vision.alt || 'Tầm nhìn'} />
                  <div className="aboutpage-mission-icon-overlay">
                    {iconMap[aboutData.vision.icon] ? React.createElement(iconMap[aboutData.vision.icon]) : <FaIcons.FaHeartbeat />}
                  </div>
                </div>
                <div className="aboutpage-mission-content">
                  <h3 className="aboutpage-mission-title">{aboutData.vision.title}</h3>
                  <p className="aboutpage-mission-text">{aboutData.vision.description}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 3. Lịch sử phát triển - Timeline Carousel */}
      {aboutData.milestones && aboutData.milestones.length > 0 && (
        <section className="aboutpage-section-container aboutpage-timeline-section aboutpage-animate-section" id="timeline">
          <div className="aboutpage-section-content">
            <h2 className="aboutpage-section-title">Lịch sử phát triển</h2>
            
            <div className="aboutpage-timeline-wrapper">
              {/* Navigation button - Up */}
              <button 
                className="aboutpage-timeline-nav aboutpage-nav-up" 
                onClick={prevMilestone}
                disabled={aboutData.milestones.length <= 1}
              >
                <FaIcons.FaChevronUp />
              </button>

              {/* Timeline container với scroll */}
              <div 
                className="aboutpage-timeline-container"
                ref={timelineRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
              >
                {/* Center line dọc */}
                <div className="aboutpage-timeline-line"></div>
                
                {/* Timeline track chứa các items */}
                <div className="aboutpage-timeline-track">
                  {aboutData.milestones.map((milestone, index) => {
                    const isActive = index === currentIndex;
                    const isPrev = index === currentIndex - 1;
                    const isNext = index === currentIndex + 1;
                    
                    return (
                      <div 
                        key={index} 
                        className={`aboutpage-timeline-item ${isActive ? 'active' : ''} ${isPrev || isNext ? 'adjacent' : ''}`}
                        onClick={() => goToMilestone(index)}
                      >
                        {/* Cột trái: Image (nếu lẻ) hoặc Content (nếu chẵn) */}
                        <div className="aboutpage-timeline-left">
                          {index % 2 === 0 ? (
                            // Chẵn: Content bên trái
                            <div className="aboutpage-timeline-content">
                              <h3 className="aboutpage-timeline-title">{milestone.title}</h3>
                              <p className="aboutpage-timeline-desc">{milestone.description}</p>
                              <div className="aboutpage-timeline-tags">
                                <span className="aboutpage-timeline-tag">Milestone</span>
                                <span className="aboutpage-timeline-tag">{milestone.year}</span>
                              </div>
                            </div>
                          ) : (
                            // Lẻ: Image bên trái
                            <div className="aboutpage-timeline-image-wrapper">
                              <div className="aboutpage-timeline-icon">
                                <FaIcons.FaTrophy />
                              </div>
                              <img src={milestone.image} alt={milestone.alt || milestone.title} />
                            </div>
                          )}
                        </div>

                        {/* Cột giữa: Year badge */}
                        <div className="aboutpage-timeline-center">
                          <div className="aboutpage-timeline-year">
                            {milestone.year}
                          </div>
                        </div>

                        {/* Cột phải: Content (nếu lẻ) hoặc Image (nếu chẵn) */}
                        <div className="aboutpage-timeline-right">
                          {index % 2 === 0 ? (
                            // Chẵn: Image bên phải
                            <div className="aboutpage-timeline-image-wrapper">
                              <div className="aboutpage-timeline-icon">
                                <FaIcons.FaTrophy />
                              </div>
                              <img src={milestone.image} alt={milestone.alt || milestone.title} />
                            </div>
                          ) : (
                            // Lẻ: Content bên phải
                            <div className="aboutpage-timeline-content">
                              <h3 className="aboutpage-timeline-title">{milestone.title}</h3>
                              <p className="aboutpage-timeline-desc">{milestone.description}</p>
                              <div className="aboutpage-timeline-tags">
                                <span className="aboutpage-timeline-tag">Milestone</span>
                                <span className="aboutpage-timeline-tag">{milestone.year}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Navigation button - Down */}
              <button 
                className="aboutpage-timeline-nav aboutpage-nav-down" 
                onClick={nextMilestone}
                disabled={aboutData.milestones.length <= 1}
              >
                <FaIcons.FaChevronDown />
              </button>

              {/* Dots indicator - Hiển thị năm */}
              <div className="aboutpage-timeline-dots">
                {aboutData.milestones.map((milestone, index) => (
                  <button
                    key={index}
                    className={`aboutpage-timeline-dot ${index === currentIndex ? 'active' : ''}`}
                    onClick={() => goToMilestone(index)}
                    aria-label={`Go to milestone ${index + 1}`}
                  >
                    <span>{milestone.year}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Thống kê - Hiển thị ở cuối timeline */}
            {aboutData.stats && aboutData.stats.length > 0 && (
              <div className="aboutpage-timeline-summary">
                <div className="aboutpage-summary-stats">
                  {aboutData.stats.map((stat, index) => (
                    <div key={index} className="aboutpage-summary-stat">
                      <h4>{stat.number}</h4>
                      <p>{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 5. Nguyên tắc hoạt động */}
      {aboutData.values && aboutData.values.length > 0 && (
        <section className="aboutpage-section-container aboutpage-values-section aboutpage-animate-section" id="values">
          <div className="aboutpage-section-content">
            <h2 className="aboutpage-section-title">Nguyên tắc hoạt động</h2>
            <div className="aboutpage-values-grid">
              {aboutData.values.map((value, index) => {
                const Icon = iconMap[value.icon] || iconMap.FaHeart;
                return (
                  <div key={index} className="aboutpage-value-card">
                    <div className="aboutpage-value-icon"><Icon /></div>
                    <h3 className="aboutpage-value-title">{value.title}</h3>
                    <p className="aboutpage-value-desc">{value.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 6. Đội ngũ điều hành */}
      {aboutData.leadership && aboutData.leadership.length > 0 && (
        <section className="aboutpage-section-container aboutpage-leadership-section aboutpage-animate-section" id="leadership">
          <div className="aboutpage-section-content">
            <h2 className="aboutpage-section-title">Đội ngũ điều hành</h2>
            <div className="aboutpage-leadership-grid">
              {aboutData.leadership.map((leader, index) => (
                <div key={index} className="aboutpage-leader-card">
                  <img src={leader.image} alt={leader.alt || leader.name} className="aboutpage-leader-image" />
                  <div className="aboutpage-leader-info">
                    <h3 className="aboutpage-leader-name">{leader.name}</h3>
                    <p className="aboutpage-leader-position">{leader.position}</p>
                    <p className="aboutpage-leader-desc">{leader.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 7. Giải thưởng & Chứng nhận */}
      {aboutData.achievements && aboutData.achievements.length > 0 && (
        <section className="aboutpage-section-container aboutpage-achievements-section aboutpage-animate-section" id="achievements">
          <div className="aboutpage-section-content">
            <h2 className="aboutpage-section-title">Giải thưởng & Chứng nhận</h2>
            <div className="aboutpage-achievements-grid">
              {aboutData.achievements.map((achievement, index) => {
                const Icon = iconMap[achievement.icon] || iconMap.FaTrophy;
                return (
                  <div key={index} className="aboutpage-achievement-card">
                    {achievement.image && (
                      <div className="aboutpage-achievement-image">
                        <img src={achievement.image} alt={achievement.alt || achievement.title} />
                      </div>
                    )}
                    <div className="aboutpage-achievement-content">
                      <div className="aboutpage-achievement-icon"><Icon /></div>
                      <h3 className="aboutpage-achievement-title">{achievement.title}</h3>
                      <span className="aboutpage-achievement-year">{achievement.year}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="aboutpage-section-footer">
              <Link to="/trang-thiet-bi" className="aboutpage-btn-outline">
                Xem tất cả trang thiết bị
                <FaIcons.FaArrowRight />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* 8. Trang thiết bị hiện đại */}
      {aboutData.facilities && aboutData.facilities.length > 0 && (
        <section className="aboutpage-section-container aboutpage-facilities-section aboutpage-animate-section" id="facilities">
          <div className="aboutpage-section-content">
            <h2 className="aboutpage-section-title">Trang thiết bị hiện đại</h2>
            <div className="aboutpage-facilities-grid">
              {aboutData.facilities.map((facility, index) => {
                const Icon = iconMap[facility.icon] || iconMap.FaBuilding;
                return (
                  <div key={index} className="aboutpage-facility-card">
                    {facility.image && (
                      <div className="aboutpage-facility-image">
                        <img src={facility.image} alt={facility.alt || facility.title} />
                      </div>
                    )}
                    <div className="aboutpage-facility-content">
                      <div className="aboutpage-facility-icon"><Icon /></div>
                      <h3 className="aboutpage-facility-title">{facility.title}</h3>
                      <p className="aboutpage-facility-desc">{facility.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="aboutpage-section-footer">
              <Link to="/trang-thiet-bi" className="aboutpage-btn-outline">
                Xem tất cả trang thiết bị
                <FaIcons.FaArrowRight />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* 9. Bác sĩ tiêu biểu */}
      <section className="aboutpage-section-container aboutpage-doctors-section aboutpage-animate-section" id="doctors">
        <div className="aboutpage-section-content">
          <h2 className="aboutpage-section-title">Bác sĩ tiêu biểu</h2>
          {doctors.length > 0 ? (
            <>
              <div className="aboutpage-doctors-grid">
                {doctors.map((doctor) => (
                  <div key={doctor.id} className="aboutpage-doctor-card">
                    <img 
                      src={doctor.avatar_url} 
                      alt={doctor.full_name} 
                      className="aboutpage-doctor-image"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f0f0f0" width="400" height="300"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="18" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3EDoctor%3C/text%3E%3C/svg%3E';
                      }}
                    />
                    <div className="aboutpage-doctor-info">
                      <h3 className="aboutpage-doctor-name">{doctor.full_name}</h3>
                      <p className="aboutpage-doctor-specialty">
                        <FaIcons.FaStethoscope />
                        {doctor.specialty_name}
                      </p>
                      <p className="aboutpage-doctor-experience">
                        <FaIcons.FaAward />
                        {doctor.experience_years} năm kinh nghiệm
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="aboutpage-section-footer">
                <Link to="/doctors" className="aboutpage-btn-outline">
                  Xem tất cả bác sĩ
                  <FaIcons.FaArrowRight />
                </Link>
              </div>
            </>
          ) : (
            <p className="aboutpage-loading-text">Đang cập nhật thông tin bác sĩ...</p>
          )}
        </div>
      </section>

      {/* 10. CTA */}
      <section className="aboutpage-section-container aboutpage-cta-section">
        <div className="aboutpage-cta-content">
          <h2 className="aboutpage-cta-title">Sẵn sàng chăm sóc sức khỏe của bạn?</h2>
          <p className="aboutpage-cta-text">
            Đặt lịch khám ngay hôm nay để được tư vấn và chăm sóc bởi đội ngũ y bác sĩ chuyên nghiệp
          </p>
          <div className="aboutpage-cta-buttons">
            <Link to="/book-appointment" className="aboutpage-btn-primary">
              <FaIcons.FaCalendarAlt />
              Đặt lịch khám
            </Link>
            <Link to="/contact" className="aboutpage-btn-secondary">
              Liên hệ tư vấn
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;