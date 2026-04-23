// client/src/pages/ConsultationRealtimeManagementPage.js
// ✅ Trang quản lý tư vấn realtime - COMPACT MEDICAL THEME

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import chatService from '../services/chatService';
import consultationService from '../services/consultationService';
import axios from 'axios';
import { 
  FaCalendarAlt, FaChartBar, FaComments, FaDollarSign, 
  FaStar, FaEye, FaSync, FaVideo, FaUserMd, FaExclamationTriangle 
} from 'react-icons/fa';
import './ConsultationRealtimeManagementPage.css';

// Import components
import { ConsultationRealtimeList } from '../components/consultation/ConsultationRealtimeList';
import { ConsultationRealtimeMonitor } from '../components/consultation/ConsultationRealtimeMonitor';
import { RefundManagement } from '../components/consultation/RefundManagement';
import { ConsultationFeedbackManagement } from '../components/consultation/ConsultationFeedbackManagement';
import { ConsultationStatistics } from '../components/consultation/ConsultationStatistics';

const ConsultationRealtimeManagementPage = () => {
  const { user } = useAuth();
  const isSystemStaff = user?.role === 'staff' && (
    user?.department === 'system' ||
    user?.staff?.department === 'system' ||
    user?.role_info?.department === 'system' ||
    user?.roleData?.department === 'system'
  );
  const isAdmin = user?.role === 'admin';
  const location = useLocation();

  const [currentType, setCurrentType] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('type') === 'video' ? 'video' : 'chat';
  });

  const [assignedDoctors, setAssignedDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(location.search);
    const tabFromUrl = params.get('tab');
    if (tabFromUrl) return tabFromUrl;
    // BẮT ĐẦU SỬA: Cho phép tất cả (bao gồm IT) mặc định thấy tab Danh sách
    return 'list';
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardStats, setDashboardStats] = useState(null);

  // --- Lấy danh sách bác sĩ (Cho Staff) ---
  useEffect(() => {
    const fetchAssignedDoctors = async () => {
      if (user && user.role === 'staff') {
        try {
          const token = localStorage.getItem('token');
          const profileRes = await axios.get('http://localhost:3001/api/staff/my-profile', {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (profileRes.data.success) {
            const staffId = profileRes.data.data.id;
            const doctorsRes = await axios.get(`http://localhost:3001/api/staff/${staffId}/doctors`, {
              headers: { Authorization: `Bearer ${token}` }
            });

            if (doctorsRes.data.success) {
              setAssignedDoctors(doctorsRes.data.data || []);
            }
          }
        } catch (error) {
          console.error("Lỗi lấy danh sách bác sĩ:", error);
        }
      }
    };
    fetchAssignedDoctors();
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const typeFromUrl = params.get('type');
    if (typeFromUrl === 'video') {
      setCurrentType('video');
    } else {
      setCurrentType('chat');
    }
  }, [location.search]);

  // --- Lấy thống kê ---
  useEffect(() => {
    if (['admin', 'staff'].includes(user.role)) {
      fetchDashboardStats(currentType);
    } else {
      // ✅ FIX: Nếu là bác sĩ (hoặc role khác), tắt loading ngay lập tức
      setLoading(false);
    }
  }, [user, currentType, selectedDoctorId]);

  const fetchDashboardStats = async (type) => {
    try {
      setLoading(true);
      const params = { type: type };
      if (selectedDoctorId) params.doctor_id = selectedDoctorId;

      const response = await consultationService.getAdminRealtimeStatisticsOverview(params);
      
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

  const handleRefresh = () => {
    fetchDashboardStats(currentType);
    // Logic refresh cho con (nếu cần trigger event global hoặc context)
  };

  // --- Xử lý sự cố IT ---
  const handleFixIssue = async (type, consultationId) => {
    let confirmMessage = '';
    let action = '';

    if (type === 'chat') {
      confirmMessage = 'Xác nhận: BUỘC KẾT NỐI LẠI (Force Reconnect)?';
      action = 'force_reconnect';
    } else if (type === 'video') {
      confirmMessage = 'Xác nhận: KHỞI ĐỘNG LẠI VIDEO (Restart Signaling)?';
      action = 'restart_signaling';
    } else if (type === 'history') {
      confirmMessage = 'Xác nhận: Tải lại lịch sử chat?';
      action = 'reload_history';
    }

    if (!window.confirm(confirmMessage)) return;

    try {
      chatService.adminSendAction(action, consultationId);
      alert(`Đã gửi lệnh "${action}" thành công!`);
    } catch (err) {
      console.error('Lỗi khi gửi lệnh sửa lỗi:', err);
      alert('Gửi lệnh thất bại.');
    }
  };

  if (!user || !['admin', 'staff', 'doctor'].includes(user.role)) {
    return (
      <div className="crm-access-denied">
        <FaExclamationTriangle size={40} />
        <h2>Không có quyền truy cập</h2>
      </div>
    );
  }

  return (
    <div className="crm-page">
      {/* Header */}
      <div className="crm-header">
        <div className="crm-header-info">
          <h1>
            {currentType === 'video' ? <FaVideo className="crm-header-icon" /> : <FaComments className="crm-header-icon" />}
            <span>{currentType === 'video' ? 'Quản lý Video Call' : 'Quản lý Chat Realtime'}</span>
          </h1>
          <p className="crm-subtitle">
            Giám sát hoạt động tư vấn trực tuyến
          </p>
        </div>
        
        <div className="crm-header-actions">
          {user.role === 'staff' && !isSystemStaff && (
            <div className="crm-select-wrapper">
              <FaUserMd className="crm-select-icon"/>
              <select
                className="crm-select"
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
              >
                <option value="">Tất cả bác sĩ</option>
                {assignedDoctors.map(doc => (
                  <option key={doc.id} value={doc.user_id || doc.id}>
                    BS. {doc.user?.full_name || doc.full_name}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <button className="crm-btn cpm-btn-primary" onClick={handleRefresh}>
            <FaSync /> <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* BẮT ĐẦU SỬA: Hiển thị đầy đủ thống kê cho cả phòng IT */}
      {dashboardStats && (
        <div className="crm-stats-grid">
          <div className="crm-stat-card">
            <div className="crm-stat-icon-box crm-bg-primary">
              <FaCalendarAlt />
            </div>
            <div className="crm-stat-content">
              <h3>{dashboardStats.total_consultations || 0}</h3>
              <p>Tổng ca tư vấn</p>
            </div>
          </div>

          <div className="crm-stat-card">
            <div className="crm-stat-icon-box crm-bg-success">
              <FaComments />
            </div>
            <div className="crm-stat-content">
              <h3>{dashboardStats.active_consultations || 0}</h3>
              <p>Đang hoạt động</p>
            </div>
          </div>

          <div className="crm-stat-card">
            <div className="crm-stat-icon-box crm-bg-warning">
              <FaDollarSign />
            </div>
            <div className="crm-stat-content">
              <h3>{dashboardStats.total_revenue?.toLocaleString() || 0}đ</h3>
              <p>Doanh thu</p>
            </div>
          </div>

          <div className="crm-stat-card">
            <div className="crm-stat-icon-box crm-bg-info">
              <FaStar />
            </div>
            <div className="crm-stat-content">
              <h3>{dashboardStats.avg_rating || 0} / 5</h3>
              <p>Đánh giá TB</p>
            </div>
          </div>
        </div>
      )}
      {/* KẾT THÚC SỬA */}

      {/* Navigation Tabs */}
      <div className="crm-tabs-wrapper">
        <div className="crm-tabs">
          {/* BẮT ĐẦU SỬA: Mở tab Danh sách cho IT */}
          <button
            className={`crm-tab ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => setActiveTab('list')}
          >
            <FaCalendarAlt /> Danh sách
          </button>
          
          <button
            className={`crm-tab ${activeTab === 'monitor' ? 'active' : ''}`}
            onClick={() => setActiveTab('monitor')}
          >
            <FaEye /> Hệ thống & Sự cố
            {dashboardStats?.active_consultations > 0 && (
              <span className="crm-tab-badge">{dashboardStats.active_consultations}</span>
            )}
          </button>
          {/* KẾT THÚC SỬA */}
          
          {isAdmin && (
            <button
              className={`crm-tab ${activeTab === 'refunds' ? 'active' : ''}`}
              onClick={() => setActiveTab('refunds')}
            >
              <FaDollarSign /> Hoàn tiền
            </button>
          )}

          {!isSystemStaff && (
            <button
              className={`crm-tab ${activeTab === 'feedbacks' ? 'active' : ''}`}
              onClick={() => setActiveTab('feedbacks')}
            >
              <FaStar /> Đánh giá
            </button>
          )}
          
          {!isSystemStaff && (
            <button
              className={`crm-tab ${activeTab === 'statistics' ? 'active' : ''}`}
              onClick={() => setActiveTab('statistics')}
            >
              <FaChartBar /> Thống kê
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="crm-content-area">
        {loading && activeTab !== 'list' && (
          <div className="crm-loading-overlay">
            <div className="crm-spinner"></div>
            <p>Đang tải dữ liệu...</p>
          </div>
        )}

        {error && (
          <div className="crm-error">
            <p>{error}</p>
            <button className="crm-btn cpm-btn-primary" onClick={handleRefresh}>Thử lại</button>
          </div>
        )}

        {/* BẮT ĐẦU SỬA: Xóa thông báo chặn để IT có thể tải danh sách bình thường */}
        {activeTab === 'list' && (
          <ConsultationRealtimeList 
            initialType={currentType} 
            doctorId={selectedDoctorId} 
          />
        )}
        {/* KẾT THÚC SỬA */}

        {activeTab === 'monitor' && (
          <ConsultationRealtimeMonitor 
            activeCount={dashboardStats?.active_consultations || 0}
            onFixIssue={handleFixIssue}
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