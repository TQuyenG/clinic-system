// client/src/pages/ConsultationHistoryPage.js
// ✅ PHIÊN BẢN ĐỒNG BỘ: Sử dụng giao diện Admin (CRM Theme) cho Patient
// Giải quyết vấn đề: Trùng lặp tiêu đề, thiếu tab chức năng Realtime/Video

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import consultationService from '../services/consultationService';
import { 
  FaCalendarAlt, FaComments, FaVideo, FaSync, FaList, FaPlusCircle 
} from 'react-icons/fa';

// ⚠️ QUAN TRỌNG: Import CSS của trang Admin để giao diện giống hệt
import './ConsultationRealtimeManagementPage.css'; 

// Import các components con (Tái sử dụng)
import { ConsultationRealtimeList } from '../components/consultation/ConsultationRealtimeList';

const ConsultationHistoryPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // State quản lý Tab đang chọn: 'list' | 'chat' | 'video'
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(location.search);
    const type = params.get('type');
    if (type === 'video') return 'video';
    if (type === 'chat') return 'chat';
    return 'list'; // Mặc định hiển thị danh sách tổng hợp
  });

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  // Lấy thống kê cho Patient
  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await consultationService.getPatientStats();
      if (res.data.success) {
        setStats(res.data.data.stats);
      }
    } catch (error) {
      console.error("Lỗi tải thống kê:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Xử lý khi chuyển Tab
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Cập nhật URL để reload không bị mất tab (Optional)
    const url = tab === 'list' 
      ? '/lich-tu-van-cua-toi' 
      : `/lich-tu-van-cua-toi?type=${tab}`;
    window.history.replaceState(null, '', url);
  };

  return (
    <div className="crm-page">
      {/* 1. Header (Dùng chung style crm-header của Admin) */}
      <div className="crm-header">
        <div className="crm-header-info">
          <h1>
            {activeTab === 'video' ? <FaVideo className="crm-header-icon" /> : 
             activeTab === 'chat' ? <FaComments className="crm-header-icon" /> :
             <FaCalendarAlt className="crm-header-icon" />}
            <span>Quản lý Lịch Tư vấn cá nhân</span>
          </h1>
          <p className="crm-subtitle">
            Theo dõi lịch sử, tham gia tư vấn trực tuyến và video call
          </p>
        </div>
        
        <div className="crm-header-actions">
          <button className="crm-btn cpm-btn-primary" onClick={() => navigate('/dich-vu?tab=consultation')}>
            <FaPlusCircle /> <span>Đặt lịch mới</span>
          </button>
          <button className="crm-btn" style={{background: '#fff', border: '1px solid #ddd'}} onClick={fetchStats}>
            <FaSync />
          </button>
        </div>
      </div>

      {/* 2. Stats Cards (Tái sử dụng style Admin) */}
      {stats && (
        <div className="crm-stats-grid">
          <div className="crm-stat-card">
            <div className="crm-stat-icon-box crm-bg-primary">
              <FaCalendarAlt />
            </div>
            <div className="crm-stat-content">
              <h3>{stats.total_consultations || 0}</h3>
              <p>Tổng lịch hẹn</p>
            </div>
          </div>
          <div className="crm-stat-card">
            <div className="crm-stat-icon-box crm-bg-success">
              <FaComments />
            </div>
            <div className="crm-stat-content">
              <h3>{stats.completed || 0}</h3>
              <p>Đã hoàn thành</p>
            </div>
          </div>
          <div className="crm-stat-card">
            <div className="crm-stat-icon-box crm-bg-warning">
              <FaVideo />
            </div>
            <div className="crm-stat-content">
              <h3>{stats.total_video || 0}</h3>
              <p>Cuộc gọi Video</p>
            </div>
          </div>
        </div>
      )}

      {/* 3. Navigation Tabs (Giống Admin) */}
      <div className="crm-tabs-wrapper">
        <div className="crm-tabs">
          <button
            className={`crm-tab ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => handleTabChange('list')}
          >
            <FaList /> Tất cả lịch sử
          </button>
          
          <button
            className={`crm-tab ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => handleTabChange('chat')}
          >
            <FaComments /> Tư vấn Chat
            <span className="crm-tab-badge" style={{marginLeft: 5}}>Realtime</span>
          </button>
          
          <button
            className={`crm-tab ${activeTab === 'video' ? 'active' : ''}`}
            onClick={() => handleTabChange('video')}
          >
            <FaVideo /> Video Call
          </button>
        </div>
      </div>

      {/* 4. Content Area */}
      <div className="crm-content-area">
        {activeTab === 'list' && (
           /* Truyền prop type=all để lấy tất cả */
           <ConsultationRealtimeList initialType="all" role="patient" />
        )}

        {activeTab === 'chat' && (
          <ConsultationRealtimeList initialType="chat" role="patient" />
        )}

        {activeTab === 'video' && (
          <ConsultationRealtimeList initialType="video" role="patient" />
        )}
      </div>
    </div>
  );
};

export default ConsultationHistoryPage;