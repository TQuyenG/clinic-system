// client/src/pages/DashboardPage.js - PHIÊN BẢN CẢI THIỆN
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext'; // ✅ Sử dụng AuthContext
import axios from 'axios';
import './DashboardPage.css';

const DashboardPage = () => {
  const { user, logout } = useAuth(); // ✅ Lấy user và logout từ AuthContext
  
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, [user]); // Re-fetch khi user thay đổi

  const fetchUserData = async () => {
    try {
      // Nếu là admin, lấy thống kê
      if (user?.role === 'admin') {
        const token = localStorage.getItem('token');
        const statsRes = await axios.get('http://localhost:3001/api/users/stats', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStats(statsRes.data.stats);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
    }
  };

  // ✅ LOGOUT SỬ DỤNG AUTHCONTEXT
  const handleLogout = () => {
    if (window.confirm('Bạn có chắc chắn muốn đăng xuất?')) {
      logout(); // ✅ Gọi logout từ AuthContext
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Đang tải...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Dashboard - {user?.role?.toUpperCase()}</h1>
        <div className="user-info">
          <span>Xin chào, {user?.full_name || user?.email}</span>
          <button onClick={handleLogout} className="btn-logout">Đăng xuất</button>
        </div>
      </header>

      {user?.role === 'admin' && (
        <div className="admin-dashboard">
          <h2>Chào mừng, {user.full_name}</h2>
          <p>Chúc một ngày tốt lành.</p>
          
          {stats && (
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">👥</div>
                <div className="stat-info">
                  <h3>{stats.totalUsers || 0}</h3>
                  <p>Tổng người dùng</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">👨‍⚕️</div>
                <div className="stat-info">
                  <h3>{stats.totalDoctors || 0}</h3>
                  <p>Bác sĩ</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">👤</div>
                <div className="stat-info">
                  <h3>{stats.totalPatients || 0}</h3>
                  <p>Bệnh nhân</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">✅</div>
                <div className="stat-info">
                  <h3>{stats.verifiedUsers || 0}</h3>
                  <p>Đã xác thực</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {user?.role === 'doctor' && (
        <div className="doctor-dashboard">
          <h2>Chào mừng, Bác sĩ {user.full_name}</h2>
          <p>Lịch hẹn hôm nay và các tính năng của bạn.</p>
          
          <div className="dashboard-cards">
            <div className="dashboard-card">
              <h3>📅 Lịch hẹn hôm nay</h3>
              <p>Xem và quản lý lịch hẹn</p>
            </div>
            
            <div className="dashboard-card">
              <h3>👥 Bệnh nhân</h3>
              <p>Danh sách bệnh nhân của bạn</p>
            </div>
            
            <div className="dashboard-card">
              <h3>📝 Hồ sơ y tế</h3>
              <p>Quản lý hồ sơ bệnh nhân</p>
            </div>
          </div>
        </div>
      )}

      {user?.role === 'patient' && (
        <div className="patient-dashboard">
          <h2>Chào mừng, {user.full_name}</h2>
          <p>Đặt lịch khám và xem hồ sơ y tế của bạn.</p>
          
          <div className="dashboard-cards">
            <div className="dashboard-card">
              <h3>🏥 Đặt lịch khám</h3>
              <p>Đặt lịch hẹn với bác sĩ</p>
            </div>
            
            <div className="dashboard-card">
              <h3>📋 Lịch hẹn của tôi</h3>
              <p>Xem lịch hẹn đã đặt</p>
            </div>
            
            <div className="dashboard-card">
              <h3>📄 Hồ sơ y tế</h3>
              <p>Xem hồ sơ sức khỏe</p>
            </div>
          </div>
        </div>
      )}

      {user?.role === 'staff' && (
        <div className="staff-dashboard">
          <h2>Chào mừng, {user.full_name}</h2>
          <p>Quản lý lịch hẹn và bài viết.</p>
          
          <div className="dashboard-cards">
            <div className="dashboard-card">
              <h3>📅 Quản lý lịch hẹn</h3>
              <p>Xem và xử lý lịch hẹn</p>
            </div>
            
            <div className="dashboard-card">
              <h3>📝 Quản lý bài viết</h3>
              <p>Viết và chỉnh sửa bài viết</p>
            </div>
            
            <div className="dashboard-card">
              <h3>📊 Báo cáo</h3>
              <p>Xem thống kê và báo cáo</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;