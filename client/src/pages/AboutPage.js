/* 
 * Tệp: AboutPage.js
 * Mô tả: Trang "Về chúng tôi" hiển thị thông tin về hệ thống phòng khám, bao gồm sứ mệnh, tầm nhìn, lịch sử phát triển, 
 * giá trị cốt lõi, đội ngũ lãnh đạo, thành tựu, cơ sở vật chất, và bác sĩ tiêu biểu.
 * Dữ liệu được lấy từ API /api/system/about, /api/specialties, và /api/users/doctors.
 * Nếu API thất bại, hiển thị thông báo lỗi.
 */

import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { 
  FaHospital, 
  FaAward, 
  FaUserMd, 
  FaHeart,
  FaStethoscope,
  FaMicroscope,
  FaAmbulance,
  FaShieldAlt,
  FaCheckCircle,
  FaCalendarAlt,
  FaBuilding,
  FaGraduationCap,
  FaHandshake,
  FaUsers,
  FaLeaf,
  FaStar,
  FaTrophy,
  FaArrowRight,
  FaQuoteLeft,
  FaHeartbeat,
  FaUserShield,
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
  const [error, setError] = useState(null); // Trạng thái lỗi
  const timelineRef = useRef(null);

  useEffect(() => {
    // Hàm lấy dữ liệu từ API /api/system/about
    const fetchAboutData = async () => {
      try {
        const response = await axios.get('http://localhost:3001/api/system/about');
        if (response.data) {
          setAboutData(response.data);
          setError(null); // Xóa lỗi nếu API thành công
        }
      } catch (error) {
        console.error('Lỗi khi lấy dữ liệu về:', error);
        setError('Không thể tải thông tin. Vui lòng thử lại sau.');
      }
    };

    // Hàm lấy dữ liệu chuyên khoa
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

    // Hàm lấy dữ liệu bác sĩ
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

    // Xử lý hiệu ứng xuất hiện khi cuộn
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

  // Hàm điều hướng timeline
  const nextMilestone = () => {
    setCurrentMilestone((prev) => (prev + 1) % aboutData.milestones.length);
  };

  const prevMilestone = () => {
    setCurrentMilestone((prev) => (prev - 1 + aboutData.milestones.length) % aboutData.milestones.length);
  };

  const goToMilestone = (index) => {
    setCurrentMilestone(index);
  };

  // Nếu có lỗi, hiển thị thông báo
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
      {/* Phần Hero */}
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

      {/* Phần Sứ mệnh & Tầm nhìn */}
      <section className="mission-section animate-section" id="mission">
        <div className="section-content">
          <div className="mission-grid">
            <div className="mission-card">
              <div className="mission-image">
                <img src="https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=600&h=400&fit=crop" alt="Mission" />
                <div className="mission-icon-overlay">
                  <FaLeaf />
                </div>
              </div>
              <div className="mission-content">
                <h3 className="mission-title">Sứ mệnh</h3>
                <p className="mission-text">
                  Nâng cao chất lượng cuộc sống của cộng đồng thông qua việc cung cấp 
                  dịch vụ y tế toàn diện, chất lượng cao với chi phí hợp lý. Chúng tôi 
                  cam kết đặt bệnh nhân làm trung tâm, không ngừng cải tiến và đổi mới 
                  để mang lại trải nghiệm tốt nhất.
                </p>
              </div>
            </div>
            
            <div className="mission-card">
              <div className="mission-image">
                <img src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&h=400&fit=crop" alt="Vision" />
                <div className="mission-icon-overlay">
                  <FaHeartbeat />
                </div>
              </div>
              <div className="mission-content">
                <h3 className="mission-title">Tầm nhìn</h3>
                <p className="mission-text">
                  Trở thành hệ thống y tế hàng đầu Việt Nam, dẫn dắt sự đổi mới 
                  trong chăm sóc sức khỏe, hợp tác quốc tế để mang đến dịch vụ 
                  y tế xuất sắc, dễ tiếp cận cho mọi người dân.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Phần Lịch sử phát triển */}
      <section className="timeline-section animate-section" id="timeline">
        <div className="section-content">
          <div className="section-header">
            <span className="section-badge">Hành trình</span>
            <h2 className="section-title">Lịch sử phát triển</h2>
          </div>

          {aboutData.milestones.length > 0 ? (
            <>
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
                {aboutData.milestones.map((_, index) => (
                  <button
                    key={index}
                    className={`timeline-dot ${index === currentMilestone ? 'active' : ''}`}
                    onClick={() => goToMilestone(index)}
                  >
                    <span>{aboutData.milestones[index].year}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="loading-text">Đang tải dữ liệu lịch sử phát triển...</p>
          )}

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

      {/* Phần Giá trị cốt lõi */}
      <section className="values-section animate-section" id="values">
        <div className="section-content">
          <div className="section-header">
            <span className="section-badge">Giá trị cốt lõi</span>
            <h2 className="section-title">Nguyên tắc hoạt động</h2>
          </div>
          <div className="values-grid">
            {aboutData.values.length > 0 ? (
              aboutData.values.map((value, index) => (
                <div key={index} className="value-card">
                  <div className="value-icon">{value.icon}</div>
                  <h3 className="value-title">{value.title}</h3>
                  <p className="value-desc">{value.description}</p>
                </div>
              ))
            ) : (
              <p className="loading-text">Đang tải dữ liệu giá trị cốt lõi...</p>
            )}
          </div>
        </div>
      </section>

      {/* Phần Đội ngũ lãnh đạo */}
      <section className="leadership-section animate-section" id="leadership">
        <div className="section-content">
          <div className="section-header">
            <span className="section-badge">Ban lãnh đạo</span>
            <h2 className="section-title">Đội ngũ điều hành</h2>
          </div>
          <div className="leadership-grid">
            {aboutData.leadership.length > 0 ? (
              aboutData.leadership.map((leader, index) => (
                <div key={index} className="leader-card">
                  <img src={leader.image} alt={leader.name} className="leader-image" />
                  <div className="leader-info">
                    <h3 className="leader-name">{leader.name}</h3>
                    <p className="leader-position">{leader.position}</p>
                    <p className="leader-desc">{leader.description}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="loading-text">Đang tải dữ liệu đội ngũ lãnh đạo...</p>
            )}
          </div>
        </div>
      </section>

      {/* Phần Thành tựu */}
      <section className="achievements-section animate-section" id="achievements">
        <div className="section-content">
          <div className="section-header">
            <span className="section-badge">Thành tựu</span>
            <h2 className="section-title">Giải thưởng & Chứng nhận</h2>
          </div>
          <div className="achievements-grid">
            {aboutData.achievements.length > 0 ? (
              aboutData.achievements.map((achievement, index) => (
                <div key={index} className="achievement-card">
                  <div className="achievement-icon">{achievement.icon}</div>
                  <h3 className="achievement-title">{achievement.title}</h3>
                  <span className="achievement-year">{achievement.year}</span>
                </div>
              ))
            ) : (
              <p className="loading-text">Đang tải dữ liệu thành tựu...</p>
            )}
          </div>
        </div>
      </section>

      {/* Phần Cơ sở vật chất */}
      <section className="facilities-section animate-section" id="facilities">
        <div className="section-content">
          <div className="section-header">
            <span className="section-badge">Cơ sở vật chất</span>
            <h2 className="section-title">Trang thiết bị hiện đại</h2>
          </div>
          <div className="facilities-grid">
            {aboutData.facilities.length > 0 ? (
              aboutData.facilities.map((facility, index) => (
                <div key={index} className="facility-card">
                  <div className="facility-icon">{facility.icon}</div>
                  <h3 className="facility-title">{facility.title}</h3>
                  <p className="facility-desc">{facility.description}</p>
                </div>
              ))
            ) : (
              <p className="loading-text">Đang tải dữ liệu cơ sở vật chất...</p>
            )}
          </div>
        </div>
      </section>

      {/* Phần Bác sĩ tiêu biểu */}
      <section className="doctors-section animate-section" id="doctors">
        <div className="section-content">
          <div className="section-header">
            <span className="section-badge">Đội ngũ y bác sĩ</span>
            <h2 className="section-title">Bác sĩ tiêu biểu</h2>
            <p className="section-subtitle">
              Đội ngũ hơn 50 bác sĩ chuyên khoa giỏi, tận tâm với nghề
            </p>
          </div>
          {doctors.length > 0 ? (
            <>
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
            </>
          ) : (
            <p className="loading-text">Đang cập nhật thông tin bác sĩ...</p>
          )}
        </div>
      </section>

      {/* Phần Kêu gọi hành động (CTA) */}
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