import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Breadcrumb from '../components/Breadcrumb';
import { 
  FaUserMd, FaAward, FaStethoscope, FaPhone, FaEnvelope, 
  FaCalendarAlt, FaArrowLeft, FaCertificate, FaMale, FaFemale
} from 'react-icons/fa';
import './DoctorProfilePage.css';

const DoctorProfilePage = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_BASE_URL = 'http://localhost:3002';

  useEffect(() => {
    fetchDoctorProfile();
  }, [code]);

  const fetchDoctorProfile = async () => {
    try {
      setLoading(true);
      console.log('Fetching doctor with code:', code);
      
      // SỬA: Sử dụng endpoint đúng theo userController
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

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Đang tải thông tin bác sĩ...</p>
      </div>
    );
  }

  if (!doctor) {
    return null;
  }

  return (
    <div className="doctor-profile-page">
      <Breadcrumb items={breadcrumbItems} />

      <button onClick={() => navigate('/bac-si')} className="btn-back">
        <FaArrowLeft /> Quay lại
      </button>

      <div className="profile-container">
        <div className="profile-header">
          <div className="doctor-avatar-large">
            <img
              src={doctor.avatar_url}
              alt={doctor.full_name}
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/300?text=Doctor';
              }}
            />
          </div>

          <div className="doctor-details">
            <div className="doctor-title">
              <h1>{doctor.full_name}</h1>
              {doctor.gender && (
                <span className="gender-badge">{getGenderIcon(doctor.gender)}</span>
              )}
            </div>
            
            <p className="doctor-code">Mã bác sĩ: {doctor.code}</p>

            {doctor.specialty && (
              <div className="specialty-info">
                <FaStethoscope />
                <span>{doctor.specialty.name}</span>
              </div>
            )}

            {doctor.experience_years > 0 && (
              <div className="experience-info">
                <FaAward />
                <span>{doctor.experience_years} năm kinh nghiệm</span>
              </div>
            )}

            <div className="contact-info">
              {doctor.email && (
                <div className="contact-item">
                  <FaEnvelope />
                  <a href={`mailto:${doctor.email}`}>{doctor.email}</a>
                </div>
              )}
              {doctor.phone && (
                <div className="contact-item">
                  <FaPhone />
                  <a href={`tel:${doctor.phone}`}>{doctor.phone}</a>
                </div>
              )}
            </div>

            <button className="btn-book-appointment">
              <FaCalendarAlt /> Đặt lịch khám với bác sĩ
            </button>
          </div>
        </div>

        <div className="profile-content">
          {doctor.bio && (
            <div className="profile-section">
              <h2>Tiểu sử</h2>
              <p>{doctor.bio}</p>
            </div>
          )}

          {doctor.specialty?.description && (
            <div className="profile-section">
              <h2>Về chuyên khoa {doctor.specialty.name}</h2>
              <p>{doctor.specialty.description}</p>
            </div>
          )}

          {doctor.certifications && doctor.certifications.length > 0 && (
            <div className="profile-section">
              <h2>
                <FaCertificate /> Chứng chỉ & Bằng cấp
              </h2>
              <ul className="certifications-list">
                {doctor.certifications.map((cert, index) => (
                  <li key={index}>{cert}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DoctorProfilePage;