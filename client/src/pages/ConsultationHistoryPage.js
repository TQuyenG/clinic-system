// client/src/pages/ConsultationHistoryPage.js
// Trang lịch sử tư vấn của bệnh nhân

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import consultationService from '../services/consultationService';
import { 
  FaCalendarAlt,
  FaFilter,
  FaChartLine,
  FaEye,
  FaStar
} from 'react-icons/fa';
import './ConsultationHistoryPage.css';

const ConsultationHistoryPage = () => {
  const navigate = useNavigate();
  
  const [consultations, setConsultations] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    page: 1,
    limit: 10
  });

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [consultationsRes, statsRes] = await Promise.all([
        consultationService.getMyConsultations(filters),
        consultationService.getPatientStats()
      ]);
      
      if (consultationsRes.data.success) {
        setConsultations(consultationsRes.data.data);
      }
      
      if (statsRes.data.success) {
        setStats(statsRes.data.data.stats);
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
      page: 1
    }));
  };

  return (
    <div className="consultation-history-page">
      {/* Header */}
      <div className="page-header">
        <h1>
          <FaCalendarAlt /> Lịch sử tư vấn của tôi
        </h1>
        <button 
          className="btn-book-new"
          onClick={() => navigate('/tu-van')}
        >
          + Đặt lịch mới
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="stats-cards">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#3498db' }}>
              <FaCalendarAlt />
            </div>
            <div className="stat-info">
              <h3>{stats.total_consultations || 0}</h3>
              <p>Tổng số tư vấn</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#2ecc71' }}>
              ✅
            </div>
            <div className="stat-info">
              <h3>{stats.completed || 0}</h3>
              <p>Đã hoàn thành</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#e74c3c' }}>
              ❌
            </div>
            <div className="stat-info">
              <h3>{stats.cancelled || 0}</h3>
              <p>Đã hủy</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#f39c12' }}>
              💰
            </div>
            <div className="stat-info">
              <h3>{consultationService.formatCurrency(stats.total_spent || 0)}</h3>
              <p>Tổng chi phí</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label><FaFilter /> Trạng thái:</label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="filter-select"
          >
            <option value="all">Tất cả</option>
            <option value="pending">Chờ xác nhận</option>
            <option value="confirmed">Đã xác nhận</option>
            <option value="in_progress">Đang diễn ra</option>
            <option value="completed">Hoàn thành</option>
            <option value="cancelled">Đã hủy</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Loại tư vấn:</label>
          <select
            value={filters.type}
            onChange={(e) => handleFilterChange('type', e.target.value)}
            className="filter-select"
          >
            <option value="all">Tất cả</option>
            <option value="chat">Chat</option>
            <option value="video">Video Call</option>
            <option value="offline">Tại bệnh viện</option>
          </select>
        </div>

        <button 
          className="btn-reset-filter"
          onClick={() => setFilters({
            status: 'all',
            type: 'all',
            page: 1,
            limit: 10
          })}
        >
          Xóa bộ lọc
        </button>
      </div>

      {/* Consultations List */}
      <div className="consultations-list">
        {loading ? (
          <div className="loading">Đang tải...</div>
        ) : consultations.length === 0 ? (
          <div className="no-data">
            <FaCalendarAlt />
            <p>Bạn chưa có buổi tư vấn nào</p>
            <button 
              className="btn-book-now"
              onClick={() => navigate('/tu-van')}
            >
              Đặt lịch ngay
            </button>
          </div>
        ) : (
          consultations.map(consultation => (
            <div key={consultation.id} className="consultation-card">
              <div className="card-header">
                <div className="card-meta">
                  <span className="consultation-code">
                    {consultation.consultation_code}
                  </span>
                  <span className={`status-badge status-${consultationService.formatStatus(consultation.status).color}`}>
                    {consultationService.formatStatus(consultation.status).icon}
                    {' '}
                    {consultationService.formatStatus(consultation.status).text}
                  </span>
                </div>
                <span className={`type-badge type-${consultation.consultation_type}`}>
                  {consultationService.formatConsultationType(consultation.consultation_type).icon}
                  {' '}
                  {consultationService.formatConsultationType(consultation.consultation_type).text}
                </span>
              </div>

              <div className="card-body">
                <div className="doctor-info">
                  <img 
                    src={consultation.doctor?.avatar_url || '/default-avatar.png'}
                    alt={consultation.doctor?.full_name}
                    className="doctor-avatar"
                  />
                  <div>
                    <h4>{consultation.doctor?.full_name}</h4>
                    {consultation.doctor?.Doctor?.Specialty && (
                      <p className="specialty">{consultation.doctor.Doctor.Specialty.name}</p>
                    )}
                  </div>
                </div>

                <div className="consultation-info">
                  <div className="info-item">
                    <label>Thời gian:</label>
                    <p>{consultationService.formatDateTime(consultation.appointment_time)}</p>
                  </div>

                  <div className="info-item">
                    <label>Triệu chứng:</label>
                    <p className="complaint-text">
                      {consultation.chief_complaint?.substring(0, 80)}...
                    </p>
                  </div>

                  {consultation.status === 'completed' && consultation.diagnosis && (
                    <div className="info-item diagnosis">
                      <label>Chẩn đoán:</label>
                      <p>{consultation.diagnosis?.substring(0, 100)}...</p>
                    </div>
                  )}

                  {consultation.status === 'completed' && consultation.rating && (
                    <div className="info-item rating">
                      <label>Đánh giá của tôi:</label>
                      <div className="rating-stars">
                        {[1, 2, 3, 4, 5].map(star => (
                          <FaStar
                            key={star}
                            className={star <= consultation.rating ? 'star-filled' : 'star-empty'}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="card-footer">
                <div className="fee-info">
                  <span className="fee-label">Tổng phí:</span>
                  <span className="fee-amount">
                    {consultationService.formatCurrency(consultation.total_fee)}
                  </span>
                </div>

                <button 
                  className="btn-view-detail"
                  onClick={() => navigate(`/tu-van/${consultation.id}`)}
                >
                  <FaEye /> Xem chi tiết
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {consultations.length > 0 && (
        <div className="pagination">
          <button
            onClick={() => handleFilterChange('page', filters.page - 1)}
            disabled={filters.page === 1}
            className="btn-pagination"
          >
            ← Trước
          </button>
          <span className="page-info">Trang {filters.page}</span>
          <button
            onClick={() => handleFilterChange('page', filters.page + 1)}
            disabled={consultations.length < filters.limit}
            className="btn-pagination"
          >
            Sau →
          </button>
        </div>
      )}
    </div>
  );
};

export default ConsultationHistoryPage;