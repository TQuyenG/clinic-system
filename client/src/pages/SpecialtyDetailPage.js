import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Breadcrumb from '../components/Breadcrumb';
import { FaStethoscope, FaAward, FaUser, FaArrowLeft, FaEye } from 'react-icons/fa';
import './SpecialtyDetailPage.css';

const SpecialtyDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [specialty, setSpecialty] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_BASE_URL = 'http://localhost:3001';

  useEffect(() => {
    fetchSpecialtyDetail();
  }, [slug]);

  const fetchSpecialtyDetail = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/specialties/slug/${slug}`);
      
      if (response.data.success) {
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
      <div className="specialty-detail-page">
        <div className="specialty-detail-page__loading">
          <div className="specialty-detail-page__spinner"></div>
          <p className="specialty-detail-page__loading-text">Đang tải thông tin chuyên khoa...</p>
        </div>
      </div>
    );
  }

  if (!specialty) {
    return null;
  }

  return (
    <div className="specialty-detail-page">
      <Breadcrumb items={breadcrumbItems} />

      <button onClick={() => navigate('/chuyen-khoa')} className="specialty-detail-page__btn-back">
        <FaArrowLeft /> Quay lại danh sách
      </button>

      {/* SPECIALTY HEADER */}
      <div className="specialty-detail-page__header">
        <div className="specialty-detail-page__icon-large">
          <FaStethoscope />
        </div>
        
        <div className="specialty-detail-page__info">
          <h1 className="specialty-detail-page__name">{specialty.name}</h1>
          
          {specialty.description && (
            <p className="specialty-detail-page__description">{specialty.description}</p>
          )}
          
          <div className="specialty-detail-page__meta">
            <FaUser />
            <span>{specialty.doctor_count || doctors.length} bác sĩ</span>
          </div>
        </div>
      </div>

      {/* DOCTORS SECTION */}
      <div className="specialty-detail-page__doctors-section">
        <h2 className="specialty-detail-page__doctors-title">Đội ngũ bác sĩ chuyên khoa</h2>

        {doctors.length === 0 ? (
          <div className="specialty-detail-page__empty">
            <FaStethoscope size={48} color="#cbd5e1" />
            <h3 className="specialty-detail-page__empty-title">Chưa có bác sĩ nào</h3>
            <p className="specialty-detail-page__empty-text">Chuyên khoa này chưa có bác sĩ</p>
          </div>
        ) : (
          <div className="specialty-detail-page__doctors-grid">
            {doctors.map(doctor => (
              <div
                key={doctor.id}
                className="specialty-detail-page__doctor-card"
                onClick={() => navigate(`/bac-si/${doctor.code}`)}
              >
                <div className="specialty-detail-page__doctor-avatar">
                  <img
                    src={doctor.avatar_url}
                    alt={doctor.full_name}
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/200?text=Doctor';
                    }}
                  />
                </div>

                <div className="specialty-detail-page__doctor-info">
                  <h3 className="specialty-detail-page__doctor-name">{doctor.full_name}</h3>
                  <span className="specialty-detail-page__doctor-code">Mã BS: {doctor.code}</span>
                  
                  {doctor.experience_years > 0 && (
                    <div className="specialty-detail-page__doctor-experience">
                      <FaAward />
                      <span>{doctor.experience_years} năm kinh nghiệm</span>
                    </div>
                  )}
                  
                  {doctor.bio && (
                    <p className="specialty-detail-page__doctor-bio">{doctor.bio}</p>
                  )}

                  <button 
                    className="specialty-detail-page__btn-view"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/bac-si/${doctor.code}`);
                    }}
                  >
                    <FaEye /> Xem hồ sơ
                  </button>
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