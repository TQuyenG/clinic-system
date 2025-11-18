import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Breadcrumb from '../components/Breadcrumb';
import { 
  FaPhone, FaEnvelope, FaCalendarAlt, FaArrowLeft, FaMale, FaFemale
} from 'react-icons/fa';
import './DoctorProfilePage.css';

const DoctorProfilePage = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_BASE_URL = 'http://localhost:3001';

  useEffect(() => {
    fetchDoctorProfile();
  }, [code]);

  const fetchDoctorProfile = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/users/doctors/${code}`);
      
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
    { label: 'Bác sĩ', url: '/bac-si' },
    { label: doctor.full_name, url: null }
  ] : [];

  const getGenderIcon = (gender) => {
    if (gender === 'male') return <FaMale />;
    if (gender === 'female') return <FaFemale />;
    return null;
  };

  const getGenderText = (gender) => {
    if (gender === 'male') return 'Nam';
    if (gender === 'female') return 'Nữ';
    return 'Không xác định';
  };

  if (loading) {
    return (
      <div className="doctor-profile-page">
        <div className="doctor-profile-page__loading">
          <div className="doctor-profile-page__spinner"></div>
          <p className="doctor-profile-page__loading-text">Đang tải thông tin bác sĩ...</p>
        </div>
      </div>
    );
  }

  if (!doctor) {
    return null;
  }

  return (
    <div className="doctor-profile-page">
      <Breadcrumb items={breadcrumbItems} />

      <button onClick={() => navigate('/bac-si')} className="doctor-profile-page__btn-back">
        <FaArrowLeft /> Quay lại danh sách
      </button>

      <div className="doctor-profile-page__container">
        {/* SIDEBAR - Ảnh, Liên hệ, Nút đặt lịch */}
        <aside className="doctor-profile-page__sidebar">
          <div className="doctor-profile-page__avatar-section">
            <div className="doctor-profile-page__avatar-large">
              <img
                src={doctor.avatar_url}
                alt={doctor.full_name}
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/300?text=Doctor';
                }}
              />
            </div>

            <div className="doctor-profile-page__name-section">
              <h1>
                {doctor.full_name}
                {doctor.gender && (
                  <span className="doctor-profile-page__gender-badge">
                    {getGenderIcon(doctor.gender)}
                  </span>
                )}
              </h1>
              <span className="doctor-profile-page__code">Mã: {doctor.code}</span>
            </div>
          </div>

          <div className="doctor-profile-page__contact-info">
            {doctor.email && (
              <div className="doctor-profile-page__contact-item">
                <FaEnvelope />
                <div className="doctor-profile-page__contact-text">
                  <div className="doctor-profile-page__contact-label">Email</div>
                  <div className="doctor-profile-page__contact-value">
                    <a href={`mailto:${doctor.email}`}>{doctor.email}</a>
                  </div>
                </div>
              </div>
            )}

            {doctor.phone && (
              <div className="doctor-profile-page__contact-item">
                <FaPhone />
                <div className="doctor-profile-page__contact-text">
                  <div className="doctor-profile-page__contact-label">Số điện thoại</div>
                  <div className="doctor-profile-page__contact-value">
                    <a href={`tel:${doctor.phone}`}>{doctor.phone}</a>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button className="doctor-profile-page__btn-book">
            <FaCalendarAlt />
            Đặt lịch khám
          </button>
        </aside>

        {/* MAIN CONTENT - Profile chi tiết */}
        <main className="doctor-profile-page__main">
          {/* Header */}
          <div className="doctor-profile-page__header">
            <div className="doctor-profile-page__header-top">
              <div className="doctor-profile-page__header-info">
                <h2>{doctor.full_name}</h2>
                <div className="doctor-profile-page__header-meta">
                  {doctor.specialty?.name && `${doctor.specialty.name}`}
                  {doctor.experience_years > 0 && ` • ${doctor.experience_years} năm kinh nghiệm`}
                </div>
              </div>
            </div>
          </div>

          {/* Thông tin cơ bản */}
          <div className="doctor-profile-page__info-section">
            <h3 className="doctor-profile-page__section-title">Thông tin cơ bản</h3>
            <div className="doctor-profile-page__info-grid">
              <div className="doctor-profile-page__info-item">
                <div className="doctor-profile-page__info-label">Giới tính:</div>
                <div className="doctor-profile-page__info-value">
                  {getGenderText(doctor.gender)}
                </div>
              </div>

              {doctor.specialty && (
                <div className="doctor-profile-page__info-item">
                  <div className="doctor-profile-page__info-label">Chuyên khoa:</div>
                  <div className="doctor-profile-page__info-value">
                    {doctor.specialty.name}
                  </div>
                </div>
              )}

              {doctor.experience_years > 0 && (
                <div className="doctor-profile-page__info-item">
                  <div className="doctor-profile-page__info-label">Kinh nghiệm:</div>
                  <div className="doctor-profile-page__info-value">
                    {doctor.experience_years} năm
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Giới thiệu */}
          {doctor.bio && (
            <div className="doctor-profile-page__content-section">
              <h3 className="doctor-profile-page__content-title">Giới thiệu</h3>
              <p className="doctor-profile-page__content-text">{doctor.bio}</p>
            </div>
          )}

          {/* Quá trình đào tạo */}
          {doctor.certifications && doctor.certifications.length > 0 && (
            <div className="doctor-profile-page__content-section">
              <h3 className="doctor-profile-page__content-title">Quá trình đào tạo</h3>
              <ul className="doctor-profile-page__list">
                {doctor.certifications.map((cert, index) => (
                  <li key={index} className="doctor-profile-page__list-item">
                    {cert}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Kinh nghiệm làm việc */}
          {doctor.experience_years > 0 && (
            <div className="doctor-profile-page__content-section">
              <h3 className="doctor-profile-page__content-title">Kinh nghiệm làm việc</h3>
              <ul className="doctor-profile-page__list">
                <li className="doctor-profile-page__list-item">
                  {doctor.experience_years} năm kinh nghiệm trong lĩnh vực {doctor.specialty?.name || 'y khoa'}
                </li>
              </ul>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default DoctorProfilePage;