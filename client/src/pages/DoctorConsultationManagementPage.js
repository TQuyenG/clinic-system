// client/src/pages/DoctorConsultationManagementPage.js
// ✅ TRANG QUẢN LÝ TƯ VẤN (BÁC SĨ/ADMIN) - COMPACT THEME

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import consultationService from '../services/consultationService';
import { 
  FaCalendarAlt, FaFilter, FaCheckCircle, FaTimesCircle,
  FaComments, FaEye, FaCalendarTimes, FaHistory, FaVideo,
  FaStar, FaUserInjured, FaStethoscope, FaSync
} from 'react-icons/fa';
import './DoctorConsultationManagementPage.css';

const DoctorConsultationManagementPage = ({ isAdminView = false }) => {
  const navigate = useNavigate();
  
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

  const fetchData = useCallback(async () => {
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
  }, [filters, isAdminView]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value, page: 1 }));
  };

  const handleConfirm = async (consultationId) => {
    if (!window.confirm('Xác nhận chấp nhận buổi tư vấn này?')) return;
    try {
      await consultationService.confirmConsultation(consultationId);
      fetchData();
    } catch (error) {
      alert('Lỗi xác nhận tư vấn');
    }
  };

  const handleReject = async (consultationId) => {
    const reason = prompt('Vui lòng nhập lý do từ chối:');
    if (!reason) return;
    try {
      await consultationService.cancelConsultation(consultationId, { reason, cancelled_by: 'doctor' });
      fetchData();
    } catch (error) {
      alert('Lỗi từ chối tư vấn');
    }
  };

  const handleStartConsultation = async (consultationId, consultationType) => {
    try {
      await consultationService.startConsultation(consultationId);
      if (consultationType === 'video') {
        navigate(`/tu-van/video/${consultationId}`);
      } else {
        navigate(`/tu-van/${consultationId}/chat`);
      }
    } catch (error) {
      alert('Lỗi bắt đầu tư vấn: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleCancelConfirmed = async (consultation) => {
    const now = new Date();
    const apptTime = new Date(consultation.appointment_time);
    if ((apptTime - now) / 36e5 < 24) {
      alert('Không thể hủy lịch hẹn còn dưới 24h.');
      return;
    }
    const reason = prompt('Lý do hủy lịch (bắt buộc):');
    if (!reason) return;

    try {
      await consultationService.cancelConsultation(consultation.id, { reason, cancelled_by: 'doctor' });
      alert('Đã hủy lịch hẹn.');
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi hủy lịch');
    }
  };

  // Render Action Buttons
  const getActionButtons = (consultation) => {
    return (
      <div className="dcm-actions">
        <button className="dcm-btn dcm-btn-icon info" onClick={() => navigate(`/tu-van/${consultation.id}`)} title="Xem chi tiết">
          <FaEye />
        </button>

        {consultation.status === 'pending' && (
          <>
            <button className="dcm-btn dcm-btn-icon success" onClick={() => handleConfirm(consultation.id)} title="Chấp nhận">
              <FaCheckCircle />
            </button>
            <button className="dcm-btn dcm-btn-icon danger" onClick={() => handleReject(consultation.id)} title="Từ chối">
              <FaTimesCircle />
            </button>
          </>
        )}

        {consultation.status === 'confirmed' && (
          <button className="dcm-btn dcm-btn-icon danger" onClick={() => handleCancelConfirmed(consultation)} title="Hủy lịch">
            <FaCalendarTimes />
          </button>
        )}

        {/* Nút Bắt đầu / Tham gia */}
        {consultation.status === 'confirmed' && consultationService.canStartConsultation(consultation.appointment_time) && (
          <button 
            className="dcm-btn dcm-btn-primary" 
            onClick={() => handleStartConsultation(consultation.id, consultation.consultation_type)}
          >
            <FaComments /> Bắt đầu
          </button>
        )}
        
        {consultation.status === 'in_progress' && (
          <button 
            className="dcm-btn dcm-btn-success"
            onClick={() => {
              if (consultation.consultation_type === 'video') navigate(`/tu-van/video/${consultation.id}`);
              else navigate(`/tu-van/${consultation.id}/chat`);
            }}
          >
            {consultation.consultation_type === 'video' ? <FaVideo/> : <FaComments/>} Tham gia
          </button>
        )}

        {consultation.status === 'completed' && (
          <button 
            className="dcm-btn dcm-btn-icon warning"
            onClick={() => navigate(consultation.consultation_type === 'video' ? `/tu-van/video/${consultation.id}` : `/tu-van/${consultation.id}/chat`)}
            title="Lịch sử"
          >
            <FaHistory />
          </button>
        )}
      </div>
    );
  };

  const getStatusBadge = (consultation) => {
    const status = consultationService.formatStatus(consultation);
    return (
      <span className={`dcm-badge ${status.color}`}>
        {status.icon} {status.text}
      </span>
    );
  };

  return (
    <div className="dcm-page">
      {/* Header */}
      <div className="dcm-header">
        <h1 className="dcm-title">
          <FaStethoscope /> {isAdminView ? 'Quản lý Tư vấn (Admin)' : 'Lịch Tư vấn của tôi'}
        </h1>
        <button className="dcm-btn dcm-btn-secondary" onClick={fetchData}><FaSync/> Làm mới</button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="dcm-stats-grid">
          <div className="dcm-stat-card">
            <div className="dcm-stat-icon blue"><FaCalendarAlt /></div>
            <div className="dcm-stat-info">
              <h3>{stats.total_consultations || 0}</h3>
              <p>Tổng lịch</p>
            </div>
          </div>
          <div className="dcm-stat-card">
            <div className="dcm-stat-icon green"><FaCheckCircle /></div>
            <div className="dcm-stat-info">
              <h3>{stats.completed || 0}</h3>
              <p>Hoàn thành</p>
            </div>
          </div>
          <div className="dcm-stat-card">
            <div className="dcm-stat-icon yellow"><FaStar /></div>
            <div className="dcm-stat-info">
              <h3>{parseFloat(stats.avg_rating || 0).toFixed(1)}</h3>
              <p>Đánh giá</p>
            </div>
          </div>
          {!isAdminView && stats.total_patients !== undefined && (
            <div className="dcm-stat-card">
              <div className="dcm-stat-icon purple"><FaUserInjured /></div>
              <div className="dcm-stat-info">
                <h3>{stats.total_patients || 0}</h3>
                <p>Bệnh nhân</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="dcm-filters">
        <div className="dcm-filter-group">
          <select className="dcm-select" value={filters.status} onChange={e => handleFilterChange('status', e.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            <option value="pending">Chờ xác nhận</option>
            <option value="confirmed">Đã xác nhận</option>
            <option value="in_progress">Đang diễn ra</option>
            <option value="completed">Hoàn thành</option>
            <option value="cancelled">Đã hủy</option>
          </select>
          
          <select className="dcm-select" value={filters.type} onChange={e => handleFilterChange('type', e.target.value)}>
            <option value="all">Tất cả loại hình</option>
            <option value="chat">Chat</option>
            <option value="video">Video Call</option>
            <option value="offline">Tại viện</option>
          </select>

          <input type="date" className="dcm-input" value={filters.date} onChange={e => handleFilterChange('date', e.target.value)} />
          
          <button 
            className="dcm-btn dcm-btn-secondary"
            onClick={() => setFilters({ status: 'all', type: 'all', date: '', page: 1, limit: 20 })}
          >
            Xóa lọc
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="dcm-table-wrapper">
        {loading ? (
          <div className="dcm-loading">Đang tải...</div>
        ) : consultations.length === 0 ? (
          <div className="dcm-empty"><FaCalendarAlt /> Chưa có lịch tư vấn nào</div>
        ) : (
          <table className="dcm-table">
            <thead>
              <tr>
                <th>Mã</th>
                <th>{isAdminView ? 'Bác sĩ / Bệnh nhân' : 'Bệnh nhân'}</th>
                <th>Loại hình</th>
                <th>Thời gian</th>
                <th>Trạng thái</th>
                <th>Triệu chứng</th>
                <th className="text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {consultations.map(item => (
                <tr key={item.id}>
                  <td><span className="dcm-code">{item.consultation_code}</span></td>
                  <td>
                    {isAdminView ? (
                      <div className="dcm-info-cell">
                        <strong>BS: {item.doctor?.full_name}</strong>
                        <span>BN: {item.patient?.full_name}</span>
                      </div>
                    ) : (
                      <div className="dcm-info-cell">
                        <strong>{item.patient?.full_name}</strong>
                        <span>{item.patient?.phone}</span>
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`dcm-type ${item.consultation_type}`}>
                      {item.consultation_type === 'chat' ? <FaComments/> : <FaVideo/>} 
                      {item.consultation_type === 'chat' ? ' Chat' : ' Video'}
                    </span>
                  </td>
                  <td>{consultationService.formatDateTime(item.appointment_time)}</td>
                  <td>{getStatusBadge(item)}</td>
                  <td><div className="dcm-complaint" title={item.chief_complaint}>{item.chief_complaint}</div></td>
                  <td className="text-right">{getActionButtons(item)}</td>
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