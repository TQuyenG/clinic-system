import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  FaTachometerAlt, FaUser, FaUsers, FaStethoscope, FaList, FaNewspaper, 
  FaCalendarCheck, FaCalendarAlt, FaBookmark, FaChartBar, FaHistory, 
  FaCalendarPlus, FaFileMedical, FaChevronLeft, FaChevronRight 
} from 'react-icons/fa';
import './Sidebar.css';

const Sidebar = ({ onToggle }) => {
  const [user, setUser] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (error) {
        console.error('Error parsing user:', error);
      }
    }

    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setCollapsed(true);
      } else {
        setCollapsed(false);
      }
      onToggle(mobile ? true : false);
    };

    const handleScroll = () => {
      // Khi scroll qua header (khoảng 38px), sidebar sẽ dính theo navbar
      const headerHeight = 38;
      setIsScrolled(window.scrollY > headerHeight);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll);
    handleResize();
    handleScroll(); // Kiểm tra vị trí scroll ban đầu

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [onToggle]);

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
    onToggle(!collapsed);
  };

  const closeSidebar = () => {
    if (isMobile) {
      setCollapsed(true);
      onToggle(true);
    }
  };

  if (!user) return null;

  return (
    <>
      {isMobile && !collapsed && (
        <div className="sidebar-overlay" onClick={closeSidebar}></div>
      )}
      <div className={`sidebar ${collapsed ? 'collapsed' : ''} ${isMobile ? 'mobile' : ''} ${isScrolled ? 'scrolled' : ''}`}>
        <button className="toggle-btn" onClick={toggleSidebar}>
          {collapsed ? <FaChevronRight /> : <FaChevronLeft />}
        </button>
        <nav>
          <Link 
            to="/dashboard" 
            className={location.pathname === '/dashboard' ? 'active' : ''} 
            onClick={closeSidebar}
          >
            <FaTachometerAlt />
            {!collapsed && <span>Tổng quan</span>}
          </Link>
          <Link 
            to="/ho-so-nguoi-dung" 
            className={location.pathname === '/ho-so-nguoi-dung' ? 'active' : ''} 
            onClick={closeSidebar}
          >
            <FaUser />
            {!collapsed && <span>Tài khoản</span>}
          </Link>
          
          {user.role === 'admin' && (
            <>
              <Link 
                to="/quan-ly-nguoi-dung" 
                className={location.pathname === '/quan-ly-nguoi-dung' ? 'active' : ''} 
                onClick={closeSidebar}
              >
                <FaUsers />
                {!collapsed && <span>Quản lý người dùng</span>}
              </Link>
              <Link 
                to="/quan-ly-chuyen-khoa" 
                className={location.pathname === '/quan-ly-chuyen-khoa' ? 'active' : ''} 
                onClick={closeSidebar}
              >
                <FaStethoscope />
                {!collapsed && <span>Quản lý chuyên khoa</span>}
              </Link>
              <Link 
                to="/quan-ly-danh-muc" 
                className={location.pathname === '/quan-ly-danh-muc' ? 'active' : ''} 
                onClick={closeSidebar}
              >
                <FaList />
                {!collapsed && <span>Quản lý danh mục</span>}
              </Link>
              <Link 
                to="/quan-ly-bai-viet" 
                className={location.pathname === '/quan-ly-bai-viet' ? 'active' : ''} 
                onClick={closeSidebar}
              >
                <FaNewspaper />
                {!collapsed && <span>Quản lý bài viết</span>}
              </Link>
              <Link 
                to="/quan-ly-lich-lam-viec" 
                className={location.pathname === '/quan-ly-lich-lam-viec' ? 'active' : ''} 
                onClick={closeSidebar}
              >
                <FaCalendarCheck />
                {!collapsed && <span>Quản lý lịch làm việc</span>}
              </Link>
              <Link 
                to="/quan-ly-lich-hen" 
                className={location.pathname === '/quan-ly-lich-hen' ? 'active' : ''} 
                onClick={closeSidebar}
              >
                <FaCalendarAlt />
                {!collapsed && <span>Quản lý lịch hẹn</span>}
              </Link>
              <Link 
                to="/bai-viet-da-luu" 
                className={location.pathname === '/bai-viet-da-luu' ? 'active' : ''} 
                onClick={closeSidebar}
              >
                <FaBookmark />
                {!collapsed && <span>Bài viết đã lưu</span>}
              </Link>
              <Link 
                to="/thong-ke" 
                className={location.pathname === '/thong-ke' ? 'active' : ''} 
                onClick={closeSidebar}
              >
                <FaChartBar />
                {!collapsed && <span>Thống kê</span>}
              </Link>
            </>
          )}
          
          {user.role === 'doctor' && (
            <>
              <Link 
                to="/lich-hen-cua-toi" 
                className={location.pathname === '/lich-hen-cua-toi' ? 'active' : ''} 
                onClick={closeSidebar}
              >
                <FaCalendarAlt />
                {!collapsed && <span>Lịch hẹn của tôi</span>}
              </Link>
              <Link 
                to="/quan-ly-lich-lam-viec" 
                className={location.pathname === '/quan-ly-lich-lam-viec' ? 'active' : ''} 
                onClick={closeSidebar}
              >
                <FaCalendarCheck />
                {!collapsed && <span>Quản lý lịch làm việc</span>}
              </Link>
              <Link 
                to="/quan-ly-bai-viet" 
                className={location.pathname === '/quan-ly-bai-viet' ? 'active' : ''} 
                onClick={closeSidebar}
              >
                <FaNewspaper />
                {!collapsed && <span>Quản lý bài viết</span>}
              </Link>
              <Link 
                to="/lich-su-tu-van" 
                className={location.pathname === '/lich-su-tu-van' ? 'active' : ''} 
                onClick={closeSidebar}
              >
                <FaHistory />
                {!collapsed && <span>Lịch sử tư vấn</span>}
              </Link>
              <Link 
                to="/bai-viet-da-luu" 
                className={location.pathname === '/bai-viet-da-luu' ? 'active' : ''} 
                onClick={closeSidebar}
              >
                <FaBookmark />
                {!collapsed && <span>Bài viết đã lưu</span>}
              </Link>
            </>
          )}
          
          {user.role === 'patient' && (
            <>
              <Link 
                to="/dat-lich-hen" 
                className={location.pathname === '/dat-lich-hen' ? 'active' : ''} 
                onClick={closeSidebar}
              >
                <FaCalendarPlus />
                {!collapsed && <span>Đặt lịch hẹn</span>}
              </Link>
              <Link 
                to="/lich-hen-cua-toi" 
                className={location.pathname === '/lich-hen-cua-toi' ? 'active' : ''} 
                onClick={closeSidebar}
              >
                <FaCalendarAlt />
                {!collapsed && <span>Lịch hẹn của tôi</span>}
              </Link>
              <Link 
                to="/ho-so-y-te" 
                className={location.pathname === '/ho-so-y-te' ? 'active' : ''} 
                onClick={closeSidebar}
              >
                <FaFileMedical />
                {!collapsed && <span>Hồ sơ y tế</span>}
              </Link>
              <Link 
                to="/bai-viet-da-luu" 
                className={location.pathname === '/bai-viet-da-luu' ? 'active' : ''} 
                onClick={closeSidebar}
              >
                <FaBookmark />
                {!collapsed && <span>Bài viết đã lưu</span>}
              </Link>
            </>
          )}
          
          {user.role === 'staff' && (
            <>
              <Link 
                to="/quan-ly-lich-hen" 
                className={location.pathname === '/quan-ly-lich-hen' ? 'active' : ''} 
                onClick={closeSidebar}
              >
                <FaCalendarAlt />
                {!collapsed && <span>Quản lý lịch hẹn</span>}
              </Link>
              <Link 
                to="/quan-ly-bai-viet" 
                className={location.pathname === '/quan-ly-bai-viet' ? 'active' : ''} 
                onClick={closeSidebar}
              >
                <FaNewspaper />
                {!collapsed && <span>Quản lý bài viết</span>}
              </Link>
              <Link 
                to="/bai-viet-da-luu" 
                className={location.pathname === '/bai-viet-da-luu' ? 'active' : ''} 
                onClick={closeSidebar}
              >
                <FaBookmark />
                {!collapsed && <span>Bài viết đã lưu</span>}
              </Link>
            </>
          )}
        </nav>
      </div>
    </>
  );
};

export default Sidebar;