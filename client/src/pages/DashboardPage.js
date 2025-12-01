// client/src/pages/DashboardPage.js
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  FaClinicMedical, 
  FaSignOutAlt, 
  FaCalendarAlt,
  FaChevronLeft,
  FaChevronRight
} from 'react-icons/fa';
import './DashboardPage.css';

const DashboardPage = () => {
  const { user, logout } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    const timerId = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timerId);
  }, []);

  const handleLogout = () => {
    if (window.confirm('Bạn có chắc chắn muốn đăng xuất?')) {
      logout();
    }
  };

  // Tính góc cho kim đồng hồ
  const hours = currentTime.getHours() % 12;
  const minutes = currentTime.getMinutes();
  const seconds = currentTime.getSeconds();

  const hourDeg = (hours * 30) + (minutes * 0.5);
  const minuteDeg = (minutes * 6) + (seconds * 0.1);
  const secondDeg = seconds * 6;

  // Lời chào theo giờ
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  // Calendar logic
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek };
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);
  const today = currentTime.getDate();
  const isCurrentMonth = 
    currentMonth.getMonth() === currentTime.getMonth() &&
    currentMonth.getFullYear() === currentTime.getFullYear();

  const monthName = currentMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-brand">
          <FaClinicMedical className="dashboard-brand-icon" />
          <span>Clinic System</span>
        </div>
        <div className="dashboard-user-section">
          <div className="dashboard-user-avatar">
            {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
          </div>
          <button onClick={handleLogout} className="dashboard-btn-logout">
            <FaSignOutAlt />
            <span>Đăng xuất</span>
          </button>
        </div>
      </header>

      <div className="dashboard-layout">
        {/* Main Content - Center */}
        <main className="dashboard-main">
          <div className="dashboard-welcome">
            <h1 className="dashboard-greeting">
              {getGreeting()}, <span className="dashboard-username">{user?.full_name || 'Bạn'}</span>!
            </h1>
            <p className="dashboard-subtitle">
              Chúc bạn một ngày làm việc vui vẻ và hiệu quả
            </p>
          </div>
        </main>

        {/* Sidebar Right - Clock & Calendar */}
        <aside className="dashboard-sidebar">
          
          {/* Analog Clock */}
          <div className="dashboard-clock-widget">
            <div className="dashboard-clock">
              {/* Hour markers */}
              {[...Array(12)].map((_, i) => (
                <div 
                  key={i} 
                  className="dashboard-clock-marker"
                  style={{ transform: `rotate(${i * 30}deg)` }}
                >
                  <div className="dashboard-marker-line"></div>
                </div>
              ))}

              {/* Hour numbers */}
              <div className="dashboard-clock-number dashboard-clock-12">12</div>
              <div className="dashboard-clock-number dashboard-clock-3">3</div>
              <div className="dashboard-clock-number dashboard-clock-6">6</div>
              <div className="dashboard-clock-number dashboard-clock-9">9</div>

              {/* Center dot */}
              <div className="dashboard-clock-center"></div>

              {/* Clock hands */}
              <div 
                className="dashboard-clock-hand dashboard-hour-hand"
                style={{ transform: `rotate(${hourDeg}deg)` }}
              ></div>
              <div 
                className="dashboard-clock-hand dashboard-minute-hand"
                style={{ transform: `rotate(${minuteDeg}deg)` }}
              ></div>
              <div 
                className="dashboard-clock-hand dashboard-second-hand"
                style={{ transform: `rotate(${secondDeg}deg)` }}
              ></div>
            </div>

            {/* Digital time */}
            <div className="dashboard-digital-time">
              {currentTime.toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}
            </div>
          </div>

          {/* Calendar Widget */}
          <div className="dashboard-calendar-widget">
            <div className="dashboard-calendar-header">
              <button onClick={previousMonth} className="dashboard-calendar-nav">
                <FaChevronLeft />
              </button>
              <div className="dashboard-calendar-title">
                <FaCalendarAlt className="dashboard-calendar-icon" />
                <span>{monthName}</span>
              </div>
              <button onClick={nextMonth} className="dashboard-calendar-nav">
                <FaChevronRight />
              </button>
            </div>

            <div className="dashboard-calendar-grid">
              {/* Weekday headers */}
              {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(day => (
                <div key={day} className="dashboard-calendar-weekday">{day}</div>
              ))}

              {/* Empty cells for days before month starts */}
              {[...Array(startingDayOfWeek)].map((_, i) => (
                <div key={`empty-${i}`} className="dashboard-calendar-day dashboard-calendar-empty"></div>
              ))}

              {/* Days of month */}
              {[...Array(daysInMonth)].map((_, i) => {
                const day = i + 1;
                const isToday = isCurrentMonth && day === today;
                return (
                  <div 
                    key={day} 
                    className={`dashboard-calendar-day ${isToday ? 'dashboard-calendar-today' : ''}`}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
          </div>

        </aside>
      </div>
    </div>
  );
};

export default DashboardPage;