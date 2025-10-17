/* 
 * Tệp: AboutPage.js - PHIÊN BẢN MỚI
 * Mô tả: Trang "Về chúng tôi" với 10 sections theo yêu cầu mới
 * API: /api/settings/about, /api/specialties, /api/users/doctors
 */

import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import * as FaIcons from 'react-icons/fa';
import './AboutPage.css';

const AboutPage = () => {
  const [specialties, setSpecialties] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [currentMilestone, setCurrentMilestone] = useState(0);
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

  const iconMap = { ...FaIcons };

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

  const nextMilestone = () => {
    setCurrentMilestone((prev) => (prev + 1) % aboutData.milestones.length);
  };

  const prevMilestone = () => {
    setCurrentMilestone((prev) => (prev - 1 + aboutData.milestones.length) % aboutData.milestones.length);
  };

  const goToMilestone = (index) => {
    setCurrentMilestone(index);
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

      {/* 3. Lịch sử phát triển */}
      {aboutData.milestones && aboutData.milestones.length > 0 && (
        <section className="aboutpage-section-container aboutpage-timeline-section aboutpage-animate-section" id="timeline">
          <div className="aboutpage-section-content">
            <h2 className="aboutpage-section-title">Lịch sử phát triển</h2>
            <div className="aboutpage-timeline-slider">
              <button className="aboutpage-timeline-nav aboutpage-prev" onClick={prevMilestone}>
                <FaIcons.FaChevronLeft />
              </button>
              
              <div className="aboutpage-timeline-track">
                <div 
                  className="aboutpage-timeline-items"
                  style={{ transform: `translateX(-${currentMilestone * 100}%)` }}
                >
                  {aboutData.milestones.map((milestone, index) => (
                    <div key={index} className="aboutpage-timeline-slide">
                      <div className="aboutpage-timeline-card">
                        <div className="aboutpage-timeline-image">
                          <img src={milestone.image} alt={milestone.alt || milestone.title} />
                          <div className="aboutpage-timeline-year-badge">{milestone.year}</div>
                        </div>
                        <div className="aboutpage-timeline-content">
                          <h3 className="aboutpage-timeline-title">{milestone.title}</h3>
                          <p className="aboutpage-timeline-desc">{milestone.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <button className="aboutpage-timeline-nav aboutpage-next" onClick={nextMilestone}>
                <FaIcons.FaChevronRight />
              </button>
            </div>

            <div className="aboutpage-timeline-dots">
              {aboutData.milestones.map((_, index) => (
                <button
                  key={index}
                  className={`aboutpage-timeline-dot ${index === currentMilestone ? 'active' : ''}`}
                  onClick={() => goToMilestone(index)}
                >
                  <span>{aboutData.milestones[index].year}</span>
                </button>
              ))}
            </div>

            {/* 4. Thống kê - Hiển thị ở đây thay vì hardcode */}
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
                    <div className="aboutpage-achievement-icon"><Icon /></div>
                    <h3 className="aboutpage-achievement-title">{achievement.title}</h3>
                    <span className="aboutpage-achievement-year">{achievement.year}</span>
                  </div>
                );
              })}
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
                    <div className="aboutpage-facility-icon"><Icon /></div>
                    <h3 className="aboutpage-facility-title">{facility.title}</h3>
                    <p className="aboutpage-facility-desc">{facility.description}</p>
                  </div>
                );
              })}
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
                          e.target.onerror = null; // Ngăn loop vô hạn
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

      {/* 10. CTA - Hardcode theo yêu cầu */}
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