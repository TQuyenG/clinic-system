// client/src/pages/DashboardPage.js (modified)
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './DashboardPage.css';

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

      {user?.role === 'admin' && stats && (
        <div className="admin-dashboard">
          <h2>Chào mừng, {user.full_name}</h2>
          <p>Chúc một ngày tốt lành.</p>
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
    </div>
  );
};

export default DashboardPage;