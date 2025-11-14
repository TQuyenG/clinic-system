// client/src/pages/DoctorConsultationManagementPage.js
// Trang quản lý tư vấn của bác sĩ - Bác sĩ xem và quản lý lịch tư vấn

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import consultationService from '../services/consultationService';
import { 
  FaCalendarAlt,
  FaFilter,
  FaCheckCircle,
  FaTimesCircle,
  FaComments,
  FaEye,
  FaSearch,
  FaChartBar
} from 'react-icons/fa';
import './DoctorConsultationManagementPage.css';

const DoctorConsultationManagementPage = ({ isAdminView = false }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [consultations, setConsultations] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    date: '',
    page: 1,
    limit: 20
  });

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const consultationsPromise = isAdminView
        ? consultationService.getAllConsultations(filters)
        : consultationService.getDoctorConsultations(filters);
      
      const statsPromise = isAdminView
        ? consultationService.getSystemStats()
        : consultationService.getDoctorStats();
      
      const [consultationsRes, statsRes] = await Promise.all([
        consultationsPromise,
        statsPromise
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
      page: 1 // Reset về trang 1 khi filter
    }));
  };

  const handleConfirm = async (consultationId) => {
    if (!window.confirm('Xác nhận chấp nhận buổi tư vấn này?')) return;
    
    try {
      await consultationService.confirmConsultation(consultationId);
      alert('Đã xác nhận buổi tư vấn');
      fetchData();
    } catch (error) {
      console.error('Error confirming consultation:', error);
      alert('Lỗi xác nhận tư vấn');
    }
  };

  const handleReject = async (consultationId) => {
    const reason = prompt('Vui lòng nhập lý do từ chối:');
    if (!reason) return;
    
    try {
      await consultationService.cancelConsultation(consultationId, { 
        reason,
        cancelled_by: 'doctor'
      });
      alert('Đã từ chối buổi tư vấn');
      fetchData();
    } catch (error) {
      console.error('Error rejecting consultation:', error);
      alert('Lỗi từ chối tư vấn');
    }
  };

  const handleStartConsultation = async (consultationId) => {
    try {
      await consultationService.startConsultation(consultationId);
      navigate(`/tu-van/${consultationId}/chat`);
    } catch (error) {
      console.error('Error starting consultation:', error);
      alert('Lỗi bắt đầu tư vấn: ' + (error.response?.data?.message || error.message));
    }
  };

  const getActionButtons = (consultation) => {
    const buttons = [];
    
    // Xem chi tiết - luôn hiển thị
    buttons.push(
      <button
        key="view"
        className="btn-action btn-view"
        onClick={() => navigate(`/tu-van/${consultation.id}`)}
        title="Xem chi tiết"
      >
        <FaEye /> Xem
      </button>
    );
    
    // Chấp nhận - chỉ khi pending
    if (consultation.status === 'pending') {
      buttons.push(
        <button
          key="confirm"
          className="btn-action btn-confirm"
          onClick={() => handleConfirm(consultation.id)}
          title="Chấp nhận"
        >
          <FaCheckCircle /> Chấp nhận
        </button>
      );
      
      buttons.push(
        <button
          key="reject"
          className="btn-action btn-reject"
          onClick={() => handleReject(consultation.id)}
          title="Từ chối"
        >
          <FaTimesCircle /> Từ chối
        </button>
      );
    }
    
    // Bắt đầu tư vấn - khi confirmed và đến giờ
    if (consultation.status === 'confirmed' && 
        consultationService.canStartConsultation(consultation.appointment_time)) {
      buttons.push(
        <button
          key="start"
          className="btn-action btn-start"
          onClick={() => handleStartConsultation(consultation.id)}
          title="Bắt đầu tư vấn"
        >
          <FaComments /> Bắt đầu
        </button>
      );
    }
    
    return buttons;
  };

  return (
    <div className="doctor-consultation-management-page">
      {/* Header */}
      <div className="page-header">
        <h1>
          <FaCalendarAlt /> {isAdminView ? 'Quản lý tư vấn (Admin)' : 'Quản lý tư vấn của tôi'}
        </h1>
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
              <FaCheckCircle />
            </div>
            <div className="stat-info">
              <h3>{stats.completed || 0}</h3>
              <p>Đã hoàn thành</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#f39c12' }}>
              ⭐
            </div>
            <div className="stat-info">
              <h3>{parseFloat(stats.avg_rating || 0).toFixed(1)}</h3>
              <p>Đánh giá trung bình</p>
            </div>
          </div>
          
          {!isAdminView && stats.total_patients !== undefined && (
            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#9b59b6' }}>
                👥
              </div>
              <div className="stat-info">
                <h3>{stats.total_patients || 0}</h3>
                <p>Bệnh nhân</p>
              </div>
            </div>
          )}
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

        <div className="filter-group">
          <label><FaCalendarAlt /> Ngày:</label>
          <input
            type="date"
            value={filters.date}
            onChange={(e) => handleFilterChange('date', e.target.value)}
            className="filter-input"
          />
        </div>

        <button 
          className="btn-reset-filter"
          onClick={() => setFilters({
            status: 'all',
            type: 'all',
            date: '',
            page: 1,
            limit: 20
          })}
        >
          Xóa bộ lọc
        </button>
      </div>

      {/* Consultations Table */}
      <div className="consultations-table-container">
        {loading ? (
          <div className="loading">Đang tải...</div>
        ) : consultations.length === 0 ? (
          <div className="no-data">
            <FaCalendarAlt />
            <p>Không có buổi tư vấn nào</p>
          </div>
        ) : (
          <table className="consultations-table">
            <thead>
              <tr>
                <th>Mã</th>
                <th>{isAdminView ? 'Bác sĩ / Bệnh nhân' : 'Bệnh nhân'}</th>
                <th>Loại</th>
                <th>Thời gian</th>
                <th>Trạng thái</th>
                <th>Triệu chứng</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {consultations.map(consultation => (
                <tr key={consultation.id}>
                  <td className="code-cell">{consultation.consultation_code}</td>
                  
                  <td className="patient-cell">
                    {isAdminView ? (
                      <>
                        <div><strong>BS:</strong> {consultation.doctor?.full_name}</div>
                        <div><strong>BN:</strong> {consultation.patient?.full_name}</div>
                      </>
                    ) : (
                      <>
                        <div>{consultation.patient?.full_name}</div>
                        <div className="text-muted">{consultation.patient?.phone}</div>
                      </>
                    )}
                  </td>
                  
                  <td>
                    <span className={`type-badge type-${consultation.consultation_type}`}>
                      {consultationService.formatConsultationType(consultation.consultation_type).icon}
                      {' '}
                      {consultationService.formatConsultationType(consultation.consultation_type).text}
                    </span>
                  </td>
                  
                  <td className="time-cell">
                    {consultationService.formatDateTime(consultation.appointment_time)}
                  </td>
                  
                  <td>
                    <span className={`status-badge status-${consultationService.formatStatus(consultation.status).color}`}>
                      {consultationService.formatStatus(consultation.status).icon}
                      {' '}
                      {consultationService.formatStatus(consultation.status).text}
                    </span>
                  </td>
                  
                  <td className="complaint-cell">
                    {consultation.chief_complaint?.substring(0, 50)}...
                  </td>
                  
                  <td className="actions-cell">
                    <div className="action-buttons">
                      {getActionButtons(consultation)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default DoctorConsultationManagementPage;