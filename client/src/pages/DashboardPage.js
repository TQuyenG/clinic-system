// client/src/pages/DashboardPage.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const DashboardPage = () => {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      // Lấy thông tin profile
      const profileRes = await axios.get('http://localhost:3001/api/users/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(profileRes.data.user);

      // Nếu là admin, lấy thống kê
      if (profileRes.data.user.role === 'admin') {
        const statsRes = await axios.get('http://localhost:3001/api/users/stats', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStats(statsRes.data.stats);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem('token');
        navigate('/login');
      }
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  if (loading) {
    return <div className="loading">Đang tải...</div>;
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

      <div className="dashboard-content">
        <div className="sidebar">
          <nav>
            <a href="/dashboard" className="active">Tổng quan</a>
            <a href="/profile">Tài khoản</a>
            
            {user?.role === 'admin' && (
              <>
                <a href="/users">Quản lý người dùng</a>
                <a href="/specialties">Quản lý chuyên khoa</a>
                <a href="/categories">Quản lý danh mục</a>
                <a href="/appointments">Quản lý lịch hẹn</a>
                <a href="/articles">Quản lý bài viết</a>
                <a href="/bai-viet-da-luu">Bài viết đã lưu</a>
                <a href="/statistics">Thống kê</a>
              </>
            )}
            
            {user?.role === 'doctor' && (
              <>
                <a href="/my-appointments">Lịch hẹn của tôi</a>
                <a href="/schedules">Lịch làm việc</a>
                <a href="/consultations">Tư vấn</a>
                <a href="/bai-viet-da-luu">Bài viết đã lưu</a>
              </>
            )}
            
            {user?.role === 'patient' && (
              <>
                <a href="/book-appointment">Đặt lịch hẹn</a>
                <a href="/my-appointments">Lịch hẹn của tôi</a>
                <a href="/medical-records">Hồ sơ y tế</a>
                <a href="/bai-viet-da-luu">Bài viết đã lưu</a>
              </>
            )}
            
            {user?.role === 'staff' && (
              <>
                <a href="/appointments">Quản lý lịch hẹn</a>
                <a href="/articles">Quản lý bài viết</a>
                <a href="/bai-viet-da-luu">Bài viết đã lưu</a>
              </>
            )}
          </nav>
        </div>

        <main className="main-content">
          {user?.role === 'admin' && stats && (
            <div className="admin-dashboard">
              <h2>Thống kê hệ thống</h2>
              <div className="stats-grid">
                <div className="stat-card">
                  <h3>Tổng người dùng</h3>
                  <p className="stat-number">{stats.total}</p>
                </div>
                <div className="stat-card">
                  <h3>Đang hoạt động</h3>
                  <p className="stat-number">{stats.active}</p>
                </div>
                <div className="stat-card">
                  <h3>Đã xác thực</h3>
                  <p className="stat-number">{stats.verified}</p>
                </div>
                <div className="stat-card">
                  <h3>Bị khóa</h3>
                  <p className="stat-number">{stats.inactive}</p>
                </div>
              </div>

              <div className="role-stats">
                <h3>Phân bố theo vai trò</h3>
                <ul>
                  <li>Admin: {stats.byRole?.admin || 0}</li>
                  <li>Staff: {stats.byRole?.staff || 0}</li>
                  <li>Doctor: {stats.byRole?.doctor || 0}</li>
                  <li>Patient: {stats.byRole?.patient || 0}</li>
                </ul>
              </div>
            </div>
          )}

          {user?.role === 'doctor' && (
            <div className="doctor-dashboard">
              <h2>Chào mừng, Bác sĩ {user.full_name}</h2>
              <p>Lịch hẹn hôm nay và các tính năng của bạn.</p>
            </div>
          )}

          {user?.role === 'patient' && (
            <div className="patient-dashboard">
              <h2>Chào mừng, {user.full_name}</h2>
              <p>Đặt lịch khám và xem hồ sơ y tế của bạn.</p>
            </div>
          )}

          {user?.role === 'staff' && (
            <div className="staff-dashboard">
              <h2>Chào mừng, {user.full_name}</h2>
              <p>Quản lý lịch hẹn và bài viết.</p>
            </div>
          )}
        </main>
      </div>

      <style jsx>{`
        .dashboard-container {
          min-height: 100vh;
          background: #f5f5f5;
        }
        .dashboard-header {
          background: #2c3e50;
          color: white;
          padding: 1rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .user-info {
          display: flex;
          gap: 1rem;
          align-items: center;
        }
        .btn-logout {
          background: #e74c3c;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
        }
        .dashboard-content {
          display: flex;
          min-height: calc(100vh - 70px);
        }
        .sidebar {
          width: 250px;
          background: white;
          padding: 2rem 0;
          box-shadow: 2px 0 5px rgba(0,0,0,0.1);
        }
        .sidebar nav {
          display: flex;
          flex-direction: column;
        }
        .sidebar a {
          padding: 1rem 2rem;
          color: #333;
          text-decoration: none;
          transition: all 0.3s;
        }
        .sidebar a:hover, .sidebar a.active {
          background: #3498db;
          color: white;
        }
        .main-content {
          flex: 1;
          padding: 2rem;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          margin: 2rem 0;
        }
        .stat-card {
          background: white;
          padding: 1.5rem;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .stat-card h3 {
          margin: 0 0 0.5rem 0;
          color: #666;
          font-size: 0.9rem;
        }
        .stat-number {
          font-size: 2rem;
          font-weight: bold;
          color: #3498db;
          margin: 0;
        }
        .role-stats {
          background: white;
          padding: 1.5rem;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          margin-top: 2rem;
        }
        .role-stats ul {
          list-style: none;
          padding: 0;
        }
        .role-stats li {
          padding: 0.5rem 0;
          border-bottom: 1px solid #eee;
        }
        .loading {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          font-size: 1.2rem;
        }
      `}</style>
    </div>
  );
};

export default DashboardPage;