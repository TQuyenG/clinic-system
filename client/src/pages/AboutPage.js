/* 
 * File: AboutPage.js
 * Mô tả: Trang "Về chúng tôi" lấy dữ liệu động từ database thông qua API
 * API endpoint: /api/settings/about
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { 
  FaHospital, 
  FaAward, 
  FaUserMd, 
  FaStethoscope,
  FaCheckCircle,
  FaCalendarAlt,
  FaStar,
  FaArrowRight,
  FaChevronLeft,
  FaChevronRight
} from 'react-icons/fa';
import './AboutPage.css';

const AboutPage = () => {
  const [specialties, setSpecialties] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [isVisible, setIsVisible] = useState({});
  const [currentMilestone, setCurrentMilestone] = useState(0);
  const [aboutData, setAboutData] = useState({
    milestones: [],
    values: [],
    achievements: [],
    leadership: [],
    facilities: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAboutData = async () => {
      try {
        const response = await axios.get('http://localhost:3001/api/settings/about');
        if (response.data) {
          setAboutData(response.data);
        }
      } catch (error) {
        console.error('Error fetching about data:', error);
        setError('Không thể tải thông tin. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
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
        console.error('Error fetching specialties:', error);
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
        console.error('Error fetching doctors:', error);
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

    const sections = document.querySelectorAll('.animate-section');
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

  if (loading) {
    return (
      <div className="about-container">
        <section className="hero">
          <div className="hero-content">
            <h1 className="hero-title">Clinic System</h1>
            <p className="hero-subtitle">Đang tải thông tin...</p>
          </div>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="about-container">
        <section className="hero">
          <div className="hero-content">
            <h1 className="hero-title">Clinic System</h1>
            <p className="error-text">{error}</p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="about-container">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <div className="hero-badge">
            <FaHospital />
            <span>Về chúng tôi</span>
          </div>
          <h1 className="hero-title">Clinic System</h1>
          <h2 className="hero-subtitle">Đồng hành cùng sức khỏe cộng đồng từ 2009</h2>
          <p className="hero-description">
            Với hơn 15 năm kinh nghiệm, chúng tôi tự hào là đơn vị tiên phong trong việc 
            mang đến dịch vụ y tế chất lượng cao, kết hợp chuyên môn xuất sắc và công nghệ hiện đại.
          </p>
        </div>
      </section>

      {/* Mission & Vision Section */}
      <section className="mission-section animate-section" id="mission">
        <div className="section-content">
          <div className="mission-grid">
            {aboutData.values.slice(0, 2).map((value, index) => (
              <div key={index} className="mission-card">
                <div className="mission-image">
                  <img 
                    src={value.image || `https://images.unsplash.com/photo-${index === 0 ? '1631217868264-e5b90bb7e133' : '1576091160550-2173dba999ef'}?w=600&h=400&fit=crop`} 
                    alt={value.title} 
                  />
                  <div className="mission-icon-overlay">
                    {value.icon || <FaCheckCircle />}
                  </div>
                </div>
                <div className="mission-content">
                  <h3 className="mission-title">{value.title}</h3>
                  <p className="mission-text">{value.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      {aboutData.milestones.length > 0 && (
        <section className="timeline-section animate-section" id="timeline">
          <div className="section-content">
            <div className="section-header">
              <span className="section-badge">Hành trình</span>
              <h2 className="section-title">Lịch sử phát triển</h2>
            </div>

            <div className="timeline-slider">
              <button className="timeline-nav prev" onClick={prevMilestone}>
                <FaChevronLeft />
              </button>
              
              <div className="timeline-track">
                <div 
                  className="timeline-items"
                  style={{ transform: `translateX(-${currentMilestone * 100}%)` }}
                >
                  {aboutData.milestones.map((milestone, index) => (
                    <div key={index} className="timeline-slide">
                      <div className="timeline-card">
                        <div className="timeline-image">
                          <img src={milestone.image} alt={milestone.title} />
                          <div className="timeline-year-badge">{milestone.year}</div>
                        </div>
                        <div className="timeline-content">
                          <h3 className="timeline-title">{milestone.title}</h3>
                          <p className="timeline-desc">{milestone.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <button className="timeline-nav next" onClick={nextMilestone}>
                <FaChevronRight />
              </button>
            </div>

            <div className="timeline-dots">
              {aboutData.milestones.map((milestone, index) => (
                <button
                  key={index}
                  className={`timeline-dot ${index === currentMilestone ? 'active' : ''}`}
                  onClick={() => goToMilestone(index)}
                >
                  <span>{milestone.year}</span>
                </button>
              ))}
            </div>

            <div className="timeline-summary">
              <div className="summary-stats">
                <div className="summary-stat">
                  <h4>15+</h4>
                  <p>Năm phát triển</p>
                </div>
                <div className="summary-stat">
                  <h4>100K+</h4>
                  <p>Bệnh nhân/năm</p>
                </div>
                <div className="summary-stat">
                  <h4>50+</h4>
                  <p>Bác sĩ chuyên khoa</p>
                </div>
                <div className="summary-stat">
                  <h4>5</h4>
                  <p>Chi nhánh</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Values Section */}
      {aboutData.values.length > 0 && (
        <section className="values-section animate-section" id="values">
          <div className="section-content">
            <div className="section-header">
              <span className="section-badge">Giá trị cốt lõi</span>
              <h2 className="section-title">Nguyên tắc hoạt động</h2>
            </div>
            <div className="values-grid">
              {aboutData.values.map((value, index) => (
                <div key={index} className="value-card">
                  <div className="value-icon">{value.icon || <FaCheckCircle />}</div>
                  <h3 className="value-title">{value.title}</h3>
                  <p className="value-desc">{value.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Leadership Section */}
      {aboutData.leadership.length > 0 && (
        <section className="leadership-section animate-section" id="leadership">
          <div className="section-content">
            <div className="section-header">
              <span className="section-badge">Ban lãnh đạo</span>
              <h2 className="section-title">Đội ngũ điều hành</h2>
            </div>
            <div className="leadership-grid">
              {aboutData.leadership.map((leader, index) => (
                <div key={index} className="leader-card">
                  <img src={leader.image} alt={leader.name} className="leader-image" />
                  <div className="leader-info">
                    <h3 className="leader-name">{leader.name}</h3>
                    <p className="leader-position">{leader.position}</p>
                    <p className="leader-desc">{leader.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Achievements Section */}
      {aboutData.achievements.length > 0 && (
        <section className="achievements-section animate-section" id="achievements">
          <div className="section-content">
            <div className="section-header">
              <span className="section-badge">Thành tựu</span>
              <h2 className="section-title">Giải thưởng & Chứng nhận</h2>
            </div>
            <div className="achievements-grid">
              {aboutData.achievements.map((achievement, index) => (
                <div key={index} className="achievement-card">
                  <div className="achievement-icon">{achievement.icon || <FaAward />}</div>
                  <h3 className="achievement-title">{achievement.title}</h3>
                  <span className="achievement-year">{achievement.year}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Facilities Section */}
      {aboutData.facilities.length > 0 && (
        <section className="facilities-section animate-section" id="facilities">
          <div className="section-content">
            <div className="section-header">
              <span className="section-badge">Cơ sở vật chất</span>
              <h2 className="section-title">Trang thiết bị hiện đại</h2>
            </div>
            <div className="facilities-grid">
              {aboutData.facilities.map((facility, index) => (
                <div key={index} className="facility-card">
                  <div className="facility-icon">{facility.icon || <FaHospital />}</div>
                  <h3 className="facility-title">{facility.title}</h3>
                  <p className="facility-desc">{facility.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Doctors Section */}
      {doctors.length > 0 && (
        <section className="doctors-section animate-section" id="doctors">
          <div className="section-content">
            <div className="section-header">
              <span className="section-badge">Đội ngũ y bác sĩ</span>
              <h2 className="section-title">Bác sĩ tiêu biểu</h2>
              <p className="section-subtitle">
                Đội ngũ hơn 50 bác sĩ chuyên khoa giỏi, tận tâm với nghề
              </p>
            </div>
            <div className="doctors-grid">
              {doctors.map((doctor) => (
                <div key={doctor.id} className="doctor-card">
                  <img 
                    src={doctor.avatar_url} 
                    alt={doctor.full_name} 
                    className="doctor-image"
                    onError={(e) => e.target.src = 'https://via.placeholder.com/300?text=Doctor'}
                  />
                  <div className="doctor-info">
                    <h3 className="doctor-name">{doctor.full_name}</h3>
                    <p className="doctor-specialty">
                      <FaStethoscope />
                      {doctor.specialty_name}
                    </p>
                    <p className="doctor-experience">
                      <FaAward />
                      {doctor.experience_years} năm kinh nghiệm
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="section-footer">
              <Link to="/doctors" className="btn-outline">
                Xem tất cả bác sĩ
                <FaArrowRight />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2 className="cta-title">Sẵn sàng chăm sóc sức khỏe của bạn?</h2>
          <p className="cta-text">
            Đặt lịch khám ngay hôm nay để được tư vấn và chăm sóc bởi đội ngũ y bác sĩ chuyên nghiệp
          </p>
          <div className="cta-buttons">
            <Link to="/book-appointment" className="btn-primary">
              <FaCalendarAlt />
              Đặt lịch khám
            </Link>
            <Link to="/contact" className="btn-secondary">
              Liên hệ tư vấn
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;