// client/src/pages/ConsultationRealtimeManagementPage.js
// ✅ Trang quản lý tư vấn realtime cho Admin - COMPLETE

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom'; // <-- THÊM DÒNG NÀY
import { useAuth } from '../contexts/AuthContext';
import consultationService from '../services/consultationService';
import { 
  FaCalendarAlt,
  FaFilter,
  FaChartBar,
  FaComments,
  FaDollarSign,
  FaStar,
  FaCog,
  FaBell,
  FaEye,
  FaSync
} from 'react-icons/fa';
import './ConsultationRealtimeManagementPage.css';

// Import components - ✅ SỬA: Dùng named imports
import { ConsultationRealtimeList } from '../components/consultation/ConsultationRealtimeList';
import { ConsultationRealtimeMonitor } from '../components/consultation/ConsultationRealtimeMonitor';
import { RefundManagement } from '../components/consultation/RefundManagement';
import { ConsultationPackageManagement } from '../components/consultation/ConsultationPackageManagement';
import { ConsultationFeedbackManagement } from '../components/consultation/ConsultationFeedbackManagement';
import { ConsultationStatistics } from '../components/consultation/ConsultationStatistics';

const ConsultationRealtimeManagementPage = () => {
  const { user } = useAuth();
  const location = useLocation(); // <-- THÊM DÒNG NÀY

  // ========== BẮT ĐẦU SỬA LỖI (KHAI BÁO BIẾN BỊ THIẾU) ==========
  // SỬA: Khởi tạo state bằng cách đọc URL ngay lập tức
  const [currentType, setCurrentType] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('type') === 'video' ? 'video' : 'chat';
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const typeFromUrl = params.get('type');
    if (typeFromUrl === 'video') {
      setCurrentType('video');
    } else {
      setCurrentType('chat');
    }
  }, [location.search]); // Chạy lại khi URL thay đổi
  // ========== KẾT THÚC SỬA LỖI ==========
  
  // State quản lý tab hiện tại
  const [activeTab, setActiveTab] = useState('list'); // list, monitor, refunds, packages, feedbacks, statistics
  
  // State loading và error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State cho dashboard overview
  const [dashboardStats, setDashboardStats] = useState(null);

  useEffect(() => {
    if (user && user.role === 'admin') {
      // SỬA: Truyền currentType
      fetchDashboardStats(currentType);
    }
  }, [user, currentType]); // SỬA: Thêm currentType

  // Lấy thống kê tổng quan
  // SỬA: Thêm (type)
  const fetchDashboardStats = async (type) => {
    try {
      setLoading(true);
      // SỬA: Gửi 'type' làm params
      const response = await consultationService.getAdminRealtimeStatisticsOverview({ type: type });
      
      if (response.data.success) {
        setDashboardStats(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError('Không thể tải dữ liệu thống kê');
    } finally {
      setLoading(false);
    }
  };

  // Xử lý refresh data
  const handleRefresh = () => {
    // SỬA: Truyền currentType
    fetchDashboardStats(currentType);
    // Trigger refresh cho component con đang active
    switch(activeTab) {
      case 'list':
      case 'monitor':
      case 'refunds':
      case 'packages':
      case 'feedbacks':
      case 'statistics':
        // Component con sẽ tự refresh khi nhận được signal
        break;
      default:
        break;
    }
  };

  // Kiểm tra quyền
  if (!user || user.role !== 'admin') {
    return (
      <div className="access-denied">
        <h2>⛔ Không có quyền truy cập</h2>
        <p>Chỉ Admin mới có thể truy cập trang này</p>
      </div>
    );
  }

  return (
    <div className="consultation-realtime-management-page">
      {/* Header */}
      <div className="page-header-realtime">
        <div className="header-left">
          <h1>
            <FaComments className="header-icon" />
            {/* SỬA: Đổi tiêu đề động */}
            {currentType === 'video' ? 'Quản Lý Tư Vấn Video Call' : 'Quản Lý Tư Vấn Realtime'}
          </h1>
          <p className="header-subtitle">
            Giám sát và quản lý toàn bộ hệ thống tư vấn trực tuyến
          </p>
        </div>
        
        <div className="header-actions">
          <button 
            className="btn-refresh"
            onClick={handleRefresh}
            title="Làm mới dữ liệu"
          >
            <FaSync /> Làm mới
          </button>
          
          <button 
            className="btn-notifications"
            title="Thông báo hệ thống"
          >
            <FaBell />
            <span className="notification-badge">3</span>
          </button>
        </div>
      </div>

      {/* Dashboard Stats Cards */}
      {dashboardStats && (
        <div className="dashboard-stats-grid">
          <div className="stat-card-realtime stat-primary">
            <div className="stat-icon">
              <FaCalendarAlt />
            </div>
            <div className="stat-content">
              <h3>{dashboardStats.total_consultations || 0}</h3>
              <p>Tổng tư vấn</p>
              <span className="stat-change positive">
                +{dashboardStats.consultations_today || 0} hôm nay
              </span>
            </div>
          </div>

          <div className="stat-card-realtime stat-success">
            <div className="stat-icon">
              <FaComments />
            </div>
            <div className="stat-content">
              <h3>{dashboardStats.active_consultations || 0}</h3>
              <p>Đang hoạt động</p>
              <span className="stat-change">Realtime</span>
            </div>
          </div>

          <div className="stat-card-realtime stat-warning">
            <div className="stat-icon">
              <FaDollarSign />
            </div>
            <div className="stat-content">
              <h3>{dashboardStats.total_revenue?.toLocaleString() || 0}đ</h3>
              <p>Doanh thu</p>
              <span className="stat-change">
                Hoàn tiền: {dashboardStats.refund_rate || 0}%
              </span>
            </div>
          </div>

          <div className="stat-card-realtime stat-info">
            <div className="stat-icon">
              <FaStar />
            </div>
            <div className="stat-content">
              <h3>{dashboardStats.avg_rating || 0}⭐</h3>
              <p>Đánh giá TB</p>
              <span className="stat-change">
                {dashboardStats.total_reviews || 0} đánh giá
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="realtime-nav-tabs">
        <button
          className={`nav-tab ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          <FaCalendarAlt /> Danh sách tư vấn
        </button>
        
        <button
          className={`nav-tab ${activeTab === 'monitor' ? 'active' : ''}`}
          onClick={() => setActiveTab('monitor')}
        >
          <FaEye /> 
          {/* SỬA: Đổi tên tab động */}
          {currentType === 'video' ? 'Giám sát Video Call' : 'Giám sát Realtime'}
          {dashboardStats?.active_consultations > 0 && (
            <span className="tab-badge">{dashboardStats.active_consultations}</span>
          )}
        </button>
        
        <button
          className={`nav-tab ${activeTab === 'refunds' ? 'active' : ''}`}
          onClick={() => setActiveTab('refunds')}
        >
          <FaDollarSign /> Hoàn tiền
        </button>
        
        
        <button
          className={`nav-tab ${activeTab === 'feedbacks' ? 'active' : ''}`}
          onClick={() => setActiveTab('feedbacks')}
        >
          <FaStar /> Đánh giá
        </button>
        
        <button
          className={`nav-tab ${activeTab === 'statistics' ? 'active' : ''}`}
          onClick={() => setActiveTab('statistics')}
        >
          <FaChartBar /> Thống kê
        </button>
      </div>

      {/* Content Area */}
      <div className="realtime-content-area">
        {loading && activeTab !== 'list' && (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <p>Đang tải dữ liệu...</p>
          </div>
        )}

        {error && (
          <div className="error-message">
            <p>{error}</p>
            <button onClick={handleRefresh}>Thử lại</button>
          </div>
        )}

        {/* Render component tương ứng với tab */}
        {activeTab === 'list' && (
          <ConsultationRealtimeList initialType={currentType} />
        )}

        {activeTab === 'monitor' && (
          <ConsultationRealtimeMonitor 
            activeCount={dashboardStats?.active_consultations || 0}
          />
        )}

        {activeTab === 'refunds' && (
          <RefundManagement />
        )}

        {activeTab === 'feedbacks' && (
          <ConsultationFeedbackManagement initialType={currentType} />
        )}

        {activeTab === 'statistics' && (
          <ConsultationStatistics />
        )}
      </div>
    </div>
  );
};

export default ConsultationRealtimeManagementPage;