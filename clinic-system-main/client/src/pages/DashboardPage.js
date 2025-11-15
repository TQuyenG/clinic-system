// client/src/pages/DashboardPage.js
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
// Thêm icon cho placeholder
import { FaClinicMedical } from 'react-icons/fa'; 
import './DashboardPage.css';

const DashboardPage = () => {
  const { user, logout } = useAuth();
  
  // State mới cho đồng hồ
  const [currentTime, setCurrentTime] = useState(new Date());

  // Logic mới cho đồng hồ thời gian thực
  useEffect(() => {
    // Cập nhật thời gian mỗi giây
    const timerId = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Dọn dẹp interval khi component unmount
    return () => clearInterval(timerId);
  }, []); // Chạy 1 lần khi mount

  // LOGOUT SỬ DỤNG AUTHCONTEXT (Giữ nguyên)
  const handleLogout = () => {
    if (window.confirm('Bạn có chắc chắn muốn đăng xuất?')) {
      logout(); // Gọi logout từ AuthContext
    }
  };

  // Format ngày và giờ
  const formattedTime = currentTime.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  const formattedDate = currentTime.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  /* Không còn state loading hay stats, 
    vì user đã có sẵn từ AuthContext ngay khi vào trang này
  */

  return (
    <div className="dashboard-page-container">
      <header className="dashboard-page-header">
        <div className="dashboard-page-brand">
          {/* Bạn có thể đặt Logo ở đây */}
          <span>Bảng điều khiển</span>
        </div>
        <div className="dashboard-page-user-info">
          <span>{user?.full_name || user?.email}</span>
          <button onClick={handleLogout} className="dashboard-page-btn-logout">
            Đăng xuất
          </button>
        </div>
      </header>

      {/* Nội dung chính của Dashboard */}
      <div className="dashboard-page-main-content">
        
        {/* Lời chào */}
        <div className="dashboard-page-welcome">
          <h2>Chào mừng trở lại, {user?.full_name || user?.email}!</h2>
          <p>Chúc bạn một ngày làm việc vui vẻ.</p>
        </div>

        {/* Đồng hồ */}
        <div className="dashboard-page-clock-container">
          <div className="dashboard-page-clock-time">{formattedTime}</div>
          <div className="dashboard-page-clock-date">{formattedDate}</div>
        </div>

        {/* Ảnh Placeholder */}
        <div className="dashboard-page-image-placeholder">
          <FaClinicMedical className="dashboard-page-placeholder-icon" />
          <p>Hình ảnh chào mừng</p>
        </div>

      </div>

      {/* Đã xóa toàn bộ logic thống kê và các section theo role */}
    </div>
  );
};

export default DashboardPage;