import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Breadcrumb from '../components/Breadcrumb';
import { FaStethoscope, FaAward, FaUser } from 'react-icons/fa';
import './SpecialtyDetailPage.css';

const SpecialtyDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [specialty, setSpecialty] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_BASE_URL = 'http://localhost:3002';

  useEffect(() => {
    fetchSpecialtyDetail();
  }, [slug]);

  const fetchSpecialtyDetail = async () => {
    try {
      setLoading(true);
      console.log('Fetching specialty with slug:', slug);
      
      // SỬA: Đổi từ categories sang specialties
      const response = await axios.get(`${API_BASE_URL}/api/specialties/slug/${slug}`);
      
      if (response.data.success) {
        // Backend trả về specialty và doctors riêng biệt
        setSpecialty(response.data.specialty);
        setDoctors(response.data.doctors || []);
      }
    } catch (error) {
      console.error('Error fetching specialty:', error);
      if (error.response?.status === 404) {
        navigate('/404');
      }
    } finally {
      setLoading(false);
    }
  };

  const breadcrumbItems = specialty ? [
    { label: 'Trang chủ', url: '/' },
    { label: 'Chuyên khoa', url: '/chuyen-khoa' },
    { label: specialty.name, url: null }
  ] : [];

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Đang tải thông tin chuyên khoa...</p>
      </div>
    );
  }

  if (!specialty) {
    return null;
  }

  return (
    <div className="specialty-detail-page">
      <Breadcrumb items={breadcrumbItems} />

      <div className="specialty-header">
        <div className="specialty-icon-large">
          <FaStethoscope />
        </div>
        <div className="specialty-info">
          <h1>{specialty.name}</h1>
          {specialty.description && <p>{specialty.description}</p>}
          <div className="specialty-meta">
            <span><FaUser /> {specialty.doctor_count || doctors.length} bác sĩ</span>
          </div>
        </div>
      </div>

      <div className="doctors-section">
        <h2>Đội ngũ bác sĩ chuyên khoa</h2>

        {doctors.length === 0 ? (
          <div className="empty-state">
            <p>Chưa có bác sĩ nào trong chuyên khoa này</p>
          </div>
        ) : (
          <div className="doctors-grid">
            {doctors.map(doctor => (
              <div
                key={doctor.id}
                className="doctor-card"
                onClick={() => navigate(`/bac-si/${doctor.code}`)}
              >
                <div className="doctor-avatar">
                  <img
                    src={doctor.avatar_url}
                    alt={doctor.full_name}
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/200?text=Doctor';
                    }}
                  />
                </div>
                <div className="doctor-info">
                  <h3>{doctor.full_name}</h3>
                  <p className="doctor-code">Mã BS: {doctor.code}</p>
                  {doctor.experience_years > 0 && (
                    <p className="doctor-experience">
                      <FaAward /> {doctor.experience_years} năm kinh nghiệm
                    </p>
                  )}
                  {doctor.bio && (
                    <p className="doctor-bio">{doctor.bio.substring(0, 100)}...</p>
                  )}
                  <button className="btn-view-profile">Xem hồ sơ</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SpecialtyDetailPage;