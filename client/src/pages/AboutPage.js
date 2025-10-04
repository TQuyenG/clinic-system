import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
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
  const timelineRef = useRef(null);

  const milestones = [
    { 
      year: '2009', 
      title: 'Thành lập', 
      description: 'Clinic System được thành lập bởi PGS.TS.BS Trần Văn Minh với tầm nhìn mang đến dịch vụ y tế chất lượng cao cho cộng đồng.',
      image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600&h=400&fit=crop'
    },
    { 
      year: '2012', 
      title: 'Mở rộng cơ sở', 
      description: 'Khánh thành tòa nhà mới với 100 giường bệnh và trang thiết bị hiện đại nhất khu vực.',
      image: 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=600&h=400&fit=crop'
    },
    { 
      year: '2015', 
      title: 'Chứng nhận ISO', 
      description: 'Đạt chứng nhận ISO 9001:2015 về hệ thống quản lý chất lượng dịch vụ y tế.',
      image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&h=400&fit=crop'
    },
    { 
      year: '2018', 
      title: 'Trung tâm nghiên cứu', 
      description: 'Thành lập Trung tâm Nghiên cứu và Đào tạo Y khoa, hợp tác với các trường đại học hàng đầu.',
      image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=600&h=400&fit=crop'
    },
    { 
      year: '2021', 
      title: 'Chuyển đổi số', 
      description: 'Triển khai hệ thống quản lý bệnh viện điện tử toàn diện, ứng dụng AI trong chẩn đoán.',
      image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&h=400&fit=crop'
    },
    { 
      year: '2024', 
      title: 'Mở rộng mạng lưới', 
      description: 'Phát triển 5 chi nhánh tại các thành phố lớn, phục vụ hơn 100,000 bệnh nhân mỗi năm.',
      image: 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=600&h=400&fit=crop'
    }
  ];

  const values = [
    {
      icon: <FaHeart />,
      title: 'Tận tâm',
      description: 'Đặt sức khỏe và hạnh phúc của bệnh nhân lên hàng đầu trong mọi quyết định.'
    },
    {
      icon: <FaShieldAlt />,
      title: 'Chuyên nghiệp',
      description: 'Tuân thủ nghiêm ngặt các tiêu chuẩn quốc tế về chất lượng và an toàn.'
    },
    {
      icon: <FaMicroscope />,
      title: 'Đổi mới',
      description: 'Không ngừng cập nhật công nghệ và phương pháp điều trị tiên tiến nhất.'
    },
    {
      icon: <FaHandshake />,
      title: 'Tôn trọng',
      description: 'Lắng nghe và tôn trọng mọi ý kiến, quyền lợi của bệnh nhân và gia đình.'
    }
  ];

  const achievements = [
    { icon: <FaTrophy />, title: 'Top 10 Bệnh viện tư nhân uy tín', year: '2023' },
    { icon: <FaAward />, title: 'Giải thưởng Chất lượng Dịch vụ Y tế', year: '2022' },
    { icon: <FaStar />, title: 'Chứng nhận JCI (Joint Commission International)', year: '2021' },
    { icon: <FaGraduationCap />, title: 'Bệnh viện đào tạo xuất sắc', year: '2023' }
  ];

  const leadership = [
    {
      name: 'PGS.TS.BS Trần Văn Minh',
      position: 'Giám đốc điều hành & Sáng lập',
      image: 'https://i.pravatar.cc/300?img=12',
      description: 'Hơn 30 năm kinh nghiệm trong lĩnh vực y khoa, tốt nghiệp Đại học Y khoa Paris, từng công tác tại nhiều bệnh viện lớn trên thế giới.'
    },
    {
      name: 'TS.BS Nguyễn Thị Hương',
      position: 'Phó Giám đốc Y khoa',
      image: 'https://i.pravatar.cc/300?img=5',
      description: 'Chuyên gia hàng đầu về Tim mạch, tốt nghiệp Johns Hopkins University, đã thực hiện hơn 2,000 ca phẫu thuật tim thành công.'
    },
    {
      name: 'ThS.BS Lê Văn Đức',
      position: 'Trưởng khoa Ngoại',
      image: 'https://i.pravatar.cc/300?img=33',
      description: '15 năm kinh nghiệm phẫu thuật nội soi, đào tạo tại Nhật Bản, tiên phong trong áp dụng kỹ thuật phẫu thuật robot.'
    }
  ];

  const facilities = [
    { icon: <FaBuilding />, title: 'Tòa nhà 12 tầng', description: '150 phòng bệnh tiêu chuẩn quốc tế' },
    { icon: <FaAmbulance />, title: 'Xe cấp cứu hiện đại', description: 'Đội xe cấp cứu 24/7 với trang thiết bị đầy đủ' },
    { icon: <FaMicroscope />, title: 'Phòng Lab tiên tiến', description: 'Xét nghiệm với công nghệ tự động hóa cao' },
    { icon: <FaHeartbeat />, title: 'Phòng mổ vô trùng', description: '8 phòng mổ đạt tiêu chuẩn quốc tế' }
  ];

  useEffect(() => {
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
    setCurrentMilestone((prev) => (prev + 1) % milestones.length);
  };

  const prevMilestone = () => {
    setCurrentMilestone((prev) => (prev - 1 + milestones.length) % milestones.length);
  };

  const goToMilestone = (index) => {
    setCurrentMilestone(index);
  };

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

      {/* Mission & Vision with Images */}
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
                <div className="mission-icon-overlay vision-icon">
                  <FaUserShield />
                </div>
              </div>
              <div className="mission-content">
                <h3 className="mission-title">Tầm nhìn</h3>
                <p className="mission-text">
                  Trở thành hệ thống y tế hàng đầu Việt Nam, được công nhận khu vực 
                  châu Á về chất lượng dịch vụ, đổi mới công nghệ và đào tạo nhân lực 
                  y tế. Đến năm 2030, phát triển mạng lưới 20 cơ sở với 500+ bác sĩ 
                  chuyên khoa.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline - Horizontal Slider */}
      <section className="timeline-section animate-section" id="timeline">
        <div className="section-content">
          <div className="section-header">
            <span className="section-badge">Hành trình phát triển</span>
            <h2 className="section-title">Các mốc quan trọng</h2>
          </div>
          
          <div className="timeline-slider" ref={timelineRef}>
            <button className="timeline-nav prev" onClick={prevMilestone}>
              <FaChevronLeft />
            </button>
            
            <div className="timeline-track">
              <div 
                className="timeline-items"
                style={{ transform: `translateX(-${currentMilestone * 100}%)` }}
              >
                {milestones.map((milestone, index) => (
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
            {milestones.map((_, index) => (
              <button
                key={index}
                className={`timeline-dot ${index === currentMilestone ? 'active' : ''}`}
                onClick={() => goToMilestone(index)}
              >
                <span>{milestones[index].year}</span>
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

      {/* Core Values */}
      <section className="values-section animate-section" id="values">
        <div className="section-content">
          <div className="section-header">
            <span className="section-badge">Giá trị cốt lõi</span>
            <h2 className="section-title">Nguyên tắc hoạt động</h2>
          </div>
          <div className="values-grid">
            {values.map((value, index) => (
              <div key={index} className="value-card">
                <div className="value-icon">{value.icon}</div>
                <h3 className="value-title">{value.title}</h3>
                <p className="value-desc">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Leadership Team */}
      <section className="leadership-section animate-section" id="leadership">
        <div className="section-content">
          <div className="section-header">
            <span className="section-badge">Ban lãnh đạo</span>
            <h2 className="section-title">Đội ngũ điều hành</h2>
          </div>
          <div className="leadership-grid">
            {leadership.map((leader, index) => (
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

      {/* Achievements */}
      <section className="achievements-section animate-section" id="achievements">
        <div className="section-content">
          <div className="section-header">
            <span className="section-badge">Thành tựu</span>
            <h2 className="section-title">Giải thưởng & Chứng nhận</h2>
          </div>
          <div className="achievements-grid">
            {achievements.map((achievement, index) => (
              <div key={index} className="achievement-card">
                <div className="achievement-icon">{achievement.icon}</div>
                <h3 className="achievement-title">{achievement.title}</h3>
                <span className="achievement-year">{achievement.year}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Facilities */}
      <section className="facilities-section animate-section" id="facilities">
        <div className="section-content">
          <div className="section-header">
            <span className="section-badge">Cơ sở vật chất</span>
            <h2 className="section-title">Trang thiết bị hiện đại</h2>
          </div>
          <div className="facilities-grid">
            {facilities.map((facility, index) => (
              <div key={index} className="facility-card">
                <div className="facility-icon">{facility.icon}</div>
                <h3 className="facility-title">{facility.title}</h3>
                <p className="facility-desc">{facility.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Doctors Showcase */}
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