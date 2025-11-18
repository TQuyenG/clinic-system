import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Breadcrumb from '../components/Breadcrumb';
import { 
  FaPhone, FaEnvelope, FaCalendarAlt, FaArrowLeft,
  FaGraduationCap, FaBriefcase, FaAward, FaFlask, FaCertificate, FaLink,
  FaMapMarkerAlt, FaStethoscope, FaUserMd
} from 'react-icons/fa';
import './DoctorProfilePage.css';

const DoctorProfilePage = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

  useEffect(() => {
    fetchDoctorProfile();
  }, [code]);

  const fetchDoctorProfile = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/users/doctors/${code}`);
      if (response.data.success) {
        setDoctor(response.data.doctor);
      }
    } catch (error) {
      console.error('Error fetching doctor:', error);
      if (error.response?.status === 404) {
        navigate('/404');
      }
    } finally {
      setLoading(false);
    }
  };

  const breadcrumbItems = doctor ? [
    { label: 'Trang chủ', url: '/' },
    { label: 'Đội ngũ bác sĩ', url: '/bac-si' },
    { label: doctor.full_name, url: null }
  ] : [];

  if (loading) return (
    <div className="doctor-profile-page-loading">
      <div className="doctor-profile-page-spinner"></div>
      <p>Đang tải thông tin...</p>
    </div>
  );
  
  if (!doctor) return null;

  return (
    <div className="doctor-profile-page-wrapper">
      <div className="doctor-profile-page-container">
        <div className="doctor-profile-page-top-nav">
          <Breadcrumb items={breadcrumbItems} />
          <button onClick={() => navigate('/bac-si')} className="doctor-profile-page-btn-back">
            <FaArrowLeft /> Quay lại
          </button>
        </div>

        <div className="doctor-profile-page-layout">
          {/* LEFT SIDEBAR */}
          <aside className="doctor-profile-page-sidebar">
            <div className="doctor-profile-page-sidebar-card">
              <div className="doctor-profile-page-avatar-wrapper">
                <img 
                  src={doctor.avatar_url} 
                  alt={doctor.full_name} 
                  onError={(e) => e.target.src = 'https://via.placeholder.com/300?text=Doctor'} 
                />
                {doctor.experience_years > 0 && (
                  <div className="doctor-profile-page-exp-badge">
                    <span className="doctor-profile-page-exp-number">{doctor.experience_years}+</span>
                    <span className="doctor-profile-page-exp-text">Năm</span>
                  </div>
                )}
              </div>

              <div className="doctor-profile-page-main-info">
                <div className="doctor-profile-page-title-upper">
                  {doctor.title || 'Bác sĩ'}
                </div>
                <h1 className="doctor-profile-page-name-main">
                  {doctor.full_name}
                </h1>
                
                <div className="doctor-profile-page-badges">
                  <span className="doctor-profile-page-badge doctor-profile-page-code-badge">Mã: {doctor.code}</span>
                </div>

                {doctor.specialty?.name && (
                  <div className="doctor-profile-page-specialty-tag">
                    <FaStethoscope /> {doctor.specialty.name}
                  </div>
                )}
              </div>

              <div className="doctor-profile-page-contact-list">
                {/* EMAIL */}
                {doctor.email && (
                  <div className="doctor-profile-page-contact-item">
                    <div className="doctor-profile-page-contact-icon"><FaEnvelope /></div>
                    <div className="doctor-profile-page-contact-detail">
                      <span className="doctor-profile-page-label">Email</span>
                      <a href={`mailto:${doctor.email}`} className="doctor-profile-page-value">{doctor.email}</a>
                    </div>
                  </div>
                )}

                {/* SỐ ĐIỆN THOẠI */}
                {doctor.phone && (
                  <div className="doctor-profile-page-contact-item">
                    <div className="doctor-profile-page-contact-icon"><FaPhone /></div>
                    <div className="doctor-profile-page-contact-detail">
                      <span className="doctor-profile-page-label">Số điện thoại</span>
                      <a href={`tel:${doctor.phone}`} className="doctor-profile-page-value">{doctor.phone}</a>
                    </div>
                  </div>
                )}

                {/* CHỨC VỤ */}
                {doctor.position && (
                  <div className="doctor-profile-page-contact-item">
                    <div className="doctor-profile-page-contact-icon"><FaUserMd /></div>
                    <div className="doctor-profile-page-contact-detail">
                      <span className="doctor-profile-page-label">Chức vụ</span>
                      <span className="doctor-profile-page-value">{doctor.position}</span>
                    </div>
                  </div>
                )}
              </div>

              <button className="doctor-profile-page-btn-book">
                <FaCalendarAlt /> Đặt lịch khám
              </button>
            </div>
          </aside>

          {/* RIGHT MAIN CONTENT */}
          <main className="doctor-profile-page-content">
            
            {/* 1. GIỚI THIỆU */}
            <section className="doctor-profile-page-content-card">
              <div className="doctor-profile-page-card-header">
                <h2 className="doctor-profile-page-card-title"><FaUserMd /> Giới thiệu</h2>
              </div>
              <div className="doctor-profile-page-card-body">
                <p className="doctor-profile-page-bio-text">
                  {doctor.bio || `Bác sĩ ${doctor.full_name} là một chuyên gia trong lĩnh vực ${doctor.specialty?.name || 'y khoa'}, luôn tận tâm với nghề và hết lòng vì người bệnh.`}
                </p>
              </div>
            </section>

            {/* 2. QUÁ TRÌNH ĐÀO TẠO (TIMELINE) */}
            {doctor.education && doctor.education.length > 0 && (
              <section className="doctor-profile-page-content-card">
                <div className="doctor-profile-page-card-header">
                  <h2 className="doctor-profile-page-card-title"><FaGraduationCap /> Quá trình đào tạo</h2>
                </div>
                <div className="doctor-profile-page-card-body">
                  <div className="doctor-profile-page-timeline">
                    {doctor.education.map((edu, index) => (
                      <div key={index} className="doctor-profile-page-timeline-item">
                        <div className="doctor-profile-page-timeline-marker"></div>
                        <div className="doctor-profile-page-timeline-content">
                          <span className="doctor-profile-page-timeline-year">{edu.year}</span>
                          <h3 className="doctor-profile-page-timeline-title">{edu.degree}</h3>
                          <p className="doctor-profile-page-timeline-subtitle">{edu.institution}</p>
                          {edu.description && <p className="doctor-profile-page-timeline-desc">{edu.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* 3. KINH NGHIỆM LÀM VIỆC (TIMELINE) */}
            {doctor.work_experience && doctor.work_experience.length > 0 && (
              <section className="doctor-profile-page-content-card">
                <div className="doctor-profile-page-card-header">
                  <h2 className="doctor-profile-page-card-title"><FaBriefcase /> Kinh nghiệm làm việc</h2>
                </div>
                <div className="doctor-profile-page-card-body">
                  <div className="doctor-profile-page-timeline">
                    {doctor.work_experience.map((work, index) => (
                      <div key={index} className="doctor-profile-page-timeline-item">
                        <div className="doctor-profile-page-timeline-marker work"></div>
                        <div className="doctor-profile-page-timeline-content">
                          <span className="doctor-profile-page-timeline-year">{work.period}</span>
                          <h3 className="doctor-profile-page-timeline-title">{work.position}</h3>
                          <p className="doctor-profile-page-timeline-subtitle">
                            <FaMapMarkerAlt style={{marginRight: '4px'}}/>
                            {work.hospital} {work.department ? `- ${work.department}` : ''}
                          </p>
                          {work.description && <p className="doctor-profile-page-timeline-desc">{work.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* 4. GRID: CHỨNG CHỈ & THÀNH TÍCH */}
            {(doctor.certifications?.length > 0 || doctor.achievements?.length > 0) && (
              <div className="doctor-profile-page-grid-two-cols">
                {/* CHỨNG CHỈ */}
                {doctor.certifications?.length > 0 && (
                  <section className="doctor-profile-page-content-card h-full">
                    <div className="doctor-profile-page-card-header">
                      <h2 className="doctor-profile-page-card-title"><FaCertificate /> Chứng chỉ</h2>
                    </div>
                    <div className="doctor-profile-page-card-body">
                      <ul className="doctor-profile-page-compact-list">
                        {doctor.certifications.map((cert, index) => (
                          <li key={index}>
                            <span className="doctor-profile-page-list-bullet"></span>
                            <span className="doctor-profile-page-list-text">{cert.name}</span>
                            {cert.link && <a href={cert.link} target="_blank" rel="noreferrer" className="doctor-profile-page-link-btn"><FaLink /></a>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </section>
                )}

                {/* THÀNH TÍCH */}
                {doctor.achievements?.length > 0 && (
                  <section className="doctor-profile-page-content-card h-full">
                    <div className="doctor-profile-page-card-header">
                      <h2 className="doctor-profile-page-card-title"><FaAward /> Thành tích</h2>
                    </div>
                    <div className="doctor-profile-page-card-body">
                      <ul className="doctor-profile-page-compact-list gold">
                        {doctor.achievements.map((ach, index) => (
                          <li key={index}>
                            <span className="doctor-profile-page-list-icon-mini"><FaAward /></span>
                            <span className="doctor-profile-page-list-text">{ach.title}</span>
                            {ach.link && <a href={ach.link} target="_blank" rel="noreferrer" className="doctor-profile-page-link-btn"><FaLink /></a>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </section>
                )}
              </div>
            )}

            {/* 5. NGHIÊN CỨU */}
            {doctor.research && doctor.research.length > 0 && (
              <section className="doctor-profile-page-content-card">
                <div className="doctor-profile-page-card-header">
                  <h2 className="doctor-profile-page-card-title"><FaFlask /> Nghiên cứu khoa học</h2>
                </div>
                <div className="doctor-profile-page-card-body">
                  <div className="doctor-profile-page-research-list">
                    {doctor.research.map((res, index) => (
                      <div key={index} className="doctor-profile-page-research-item">
                        <div className="doctor-profile-page-research-icon"><FaFlask /></div>
                        <div className="doctor-profile-page-research-info">
                          <h4>{res.title}</h4>
                          <p>
                            <span className="res-journal">{res.journal}</span>
                            <span className="res-separator">•</span>
                            <span className="res-year">{res.year}</span>
                          </p>
                          {res.authors && <p className="res-authors">TG: {res.authors}</p>}
                        </div>
                        {res.link && <a href={res.link} target="_blank" rel="noreferrer" className="doctor-profile-page-research-link">Xem</a>}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

          </main>
        </div>
      </div>
    </div>
  );
};

export default DoctorProfilePage;