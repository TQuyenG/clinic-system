// client/src/pages/ConsultationHistoryPage.js
// ✅ LỊCH SỬ TƯ VẤN - COMPACT THEME

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import consultationService from '../services/consultationService';
import { 
  FaCalendarAlt, FaFilter, FaEye, FaStar, FaCommentDots, 
  FaVideo, FaBan, FaCalendarCheck, FaMoneyBillWave, FaClock, FaTimesCircle
} from 'react-icons/fa';
import ReviewModal from '../components/consultation/ReviewModal';
import './ConsultationHistoryPage.css';

const ConsultationHistoryPage = () => {
  const navigate = useNavigate();
  const [consultations, setConsultations] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'chat',
    page: 1,
    limit: 10
  });
  
  const [activeTab, setActiveTab] = useState('chat');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [modalMode, setModalMode] = useState('submit');

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [listRes, statsRes] = await Promise.all([
        consultationService.getMyConsultations(filters),
        consultationService.getPatientStats()
      ]);
      if (listRes.data.success) setConsultations(listRes.data.data);
      if (statsRes.data.success) setStats(statsRes.data.data.stats);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (type) => {
    setActiveTab(type);
    setFilters(prev => ({ ...prev, type, page: 1 }));
  };

  const handleCancel = async (id) => {
    if (window.confirm('Bạn có chắc muốn hủy lịch hẹn này?')) {
      try {
        await consultationService.cancelConsultation(id, { reason: 'Bệnh nhân hủy' });
        fetchData();
      } catch (e) { alert('Lỗi hủy lịch'); }
    }
  };

  return (
    <div className="chp-page">
      {/* Header */}
      <div className="chp-header">
        <h1 className="chp-title"><FaCalendarAlt /> Lịch sử tư vấn</h1>
        <button className="chp-btn-new" onClick={() => navigate('/dich-vu?tab=consultation')}>
           + Đặt lịch mới
        </button>
      </div>

      {/* Stats Cards - Compact */}
      {stats && (
        <div className="chp-stats-grid">
          <div className="chp-stat-card">
            <div className="chp-stat-icon blue"><FaCalendarAlt /></div>
            <div className="chp-stat-info">
              <h3>{stats.total_consultations || 0}</h3>
              <p>Tổng ca</p>
            </div>
          </div>
          <div className="chp-stat-card">
            <div className="chp-stat-icon green"><FaCalendarCheck /></div>
            <div className="chp-stat-info">
              <h3>{stats.completed || 0}</h3>
              <p>Hoàn thành</p>
            </div>
          </div>
          <div className="chp-stat-card">
            <div className="chp-stat-icon red"><FaTimesCircle /></div>
            <div className="chp-stat-info">
              <h3>{stats.cancelled || 0}</h3>
              <p>Đã hủy</p>
            </div>
          </div>
          <div className="chp-stat-card">
             <div className="chp-stat-icon yellow"><FaMoneyBillWave /></div>
             <div className="chp-stat-info">
                <h3>{parseInt(stats.total_spent || 0).toLocaleString()}đ</h3>
                <p>Chi tiêu</p>
             </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="chp-tabs">
        <button className={`chp-tab ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => handleTabChange('chat')}>
          <FaCommentDots /> Tư vấn Chat
        </button>
        <button className={`chp-tab ${activeTab === 'video' ? 'active' : ''}`} onClick={() => handleTabChange('video')}>
          <FaVideo /> Video Call
        </button>
      </div>

      {/* Filter Bar */}
      <div className="chp-filters">
        <div className="chp-filter-wrapper">
          <FaFilter className="chp-filter-icon"/>
          <select 
            className="chp-select"
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="pending">Chờ xác nhận</option>
            <option value="confirmed">Đã xác nhận</option>
            <option value="in_progress">Đang diễn ra</option>
            <option value="completed">Hoàn thành</option>
            <option value="cancelled">Đã hủy</option>
          </select>
        </div>
      </div>

      {/* List */}
      <div className="chp-list">
        {loading ? (
          <div className="chp-loading">Đang tải...</div>
        ) : consultations.length === 0 ? (
          <div className="chp-empty">
             <FaCalendarAlt /> <p>Chưa có dữ liệu tư vấn</p>
          </div>
        ) : (
          consultations.map(item => (
            <div key={item.id} className="chp-card">
              <div className="chp-card-left">
                <div className="chp-card-status">
                  <span className={`chp-badge ${item.status}`}>
                    {item.status === 'confirmed' ? 'Đã xác nhận' :
                     item.status === 'pending' ? 'Chờ duyệt' :
                     item.status === 'completed' ? 'Hoàn thành' : 
                     item.status === 'in_progress' ? 'Đang diễn ra' : 'Đã hủy'}
                  </span>
                  <span className="chp-code">{item.consultation_code}</span>
                </div>
                <div className="chp-time">
                  <FaClock /> {new Date(item.appointment_time).toLocaleString('vi-VN')}
                </div>
                <div className="chp-doctor">
                  <img src={item.doctor?.avatar_url || '/default-avatar.png'} alt="Doc" />
                  <div>
                    <strong>BS. {item.doctor?.full_name}</strong>
                    <span>{item.doctor?.Doctor?.Specialty?.name}</span>
                  </div>
                </div>
              </div>
              
              <div className="chp-card-right">
                <div className="chp-fee">
                  {parseInt(item.total_fee).toLocaleString()}đ
                </div>
                <div className="chp-actions">
                  <button className="chp-btn info" onClick={() => navigate(`/tu-van/${item.id}`)}><FaEye /> Chi tiết</button>
                  
                  {['pending', 'confirmed'].includes(item.status) && (
                    <button className="chp-btn danger" onClick={() => handleCancel(item.id)}><FaBan /> Hủy</button>
                  )}

                  {item.status === 'confirmed' && (
                    <button className="chp-btn primary" onClick={() => navigate(`/tu-van/${item.id}/${item.consultation_type}`)}>
                      {item.consultation_type === 'video' ? <FaVideo /> : <FaCommentDots />} Bắt đầu
                    </button>
                  )}

                  {item.status === 'completed' && !item.rating && (
                    <button className="chp-btn warning" onClick={() => {
                      setSelectedReview(item);
                      setModalMode('submit');
                      setShowReviewModal(true);
                    }}>
                      <FaStar /> Đánh giá
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      <ReviewModal 
        show={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        mode={modalMode}
        consultation={selectedReview}
        onSubmit={async (data) => {
          try {
            await consultationService.rateConsultation(selectedReview.id, data);
            setShowReviewModal(false);
            fetchData();
          } catch(e) { alert('Lỗi'); }
        }}
      />
    </div>
  );
};

export default ConsultationHistoryPage;