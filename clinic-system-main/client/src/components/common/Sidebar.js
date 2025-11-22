// client/src/components/common/Sidebar.js
// PHIÊN BẢN HOÀN CHỈNH:
// 1. Sửa lỗi link "Quản lý nhân viên" của Admin
// 2. Xóa link "Lịch của tôi" bị trùng lặp của Staff

import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  FaTachometerAlt, 
  FaUser, 
  FaUsers, 
  FaStethoscope, 
  FaList, 
  FaNewspaper, 
  FaCalendarCheck, 
  FaCalendarAlt, 
  FaBookmark, 
  FaChartBar, 
  FaHistory, 
  FaCalendarPlus, 
  FaFileMedical, 
  FaChevronLeft, 
  FaChevronRight,
  FaCog,
  FaHandHoldingMedical,
  FaChevronDown,
  FaComments,
  FaVideo,
  FaClock,
  FaChartLine,
  FaMoneyBillWave, // <--- THÊM MỚI
  FaCreditCard     // <--- THÊM MỚI
} from 'react-icons/fa';
import './Sidebar.css';

const Sidebar = ({ onToggle }) => {
  const [user, setUser] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isScrolled, setIsScrolled] = useState(false);
  
  // Dropdown states
  const [isServiceMenuOpen, setServiceMenuOpen] = useState(false);
  const [isConsultationMenuOpen, setConsultationMenuOpen] = useState(false);
  const [isPaymentMenuOpen, setPaymentMenuOpen] = useState(false); // <--- THÊM MỚI
  
  const location = useLocation();

  useEffect(() => {
    // Lấy thông tin user từ localStorage
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        setUser(userData);
      } catch (error) {
        console.error('Error parsing user:', error);
      }
    }

    // Xử lý resize
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

    // Xử lý scroll
    const handleScroll = () => {
      const headerHeight = 38;
      setIsScrolled(window.scrollY > headerHeight);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll);
    handleResize();
    handleScroll();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [onToggle]);

  // Auto-open menu nếu đang ở trang con
  useEffect(() => {
    if (location.pathname.startsWith('/admin/tu-van')) {
      setConsultationMenuOpen(true);
    }
    if (location.pathname.startsWith('/quan-ly-dich-vu') || location.pathname.startsWith('/quan-ly-danh-muc-dich-vu')) {
      setServiceMenuOpen(true);
    }
    // --- THÊM MỚI TỪ ĐÂY ---
    if (location.pathname.startsWith('/quan-ly-thanh-toan')) {
      setPaymentMenuOpen(true);
    }
    // --- KẾT THÚC THÊM MỚI ---
  }, [location.pathname]);

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

  // Nếu không có user, không hiển thị sidebar
  if (!user) {
    return null;
  }

  return (
    <>
      {/* Overlay cho mobile */}
      {isMobile && !collapsed && (
        <div className="sidebar-overlay" onClick={closeSidebar}></div>
      )}
      
      <div className={`sidebar ${collapsed ? 'collapsed' : ''} ${isMobile ? 'mobile' : ''} ${isScrolled ? 'scrolled' : ''}`}>
        {/* Toggle button */}
        <button className="toggle-btn" onClick={toggleSidebar}>
          {collapsed ? <FaChevronRight /> : <FaChevronLeft />}
        </button>
        
        <nav>
          {/* ==================== MENU CHUNG ==================== */}
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

          {/* ==================== MENU PATIENT ==================== */}
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
              
              {/* SỬA: "Tư vấn trực tuyến" giờ sẽ trỏ đến trang Lịch sử */}
              <Link 
                to="/tu-van/lich-su"
                className={location.pathname.startsWith('/tu-van/lich-su') ? 'active' : ''} 
                onClick={closeSidebar}
              >
                <FaComments />
                {!collapsed && <span>Tư vấn trực tuyến</span>}
              </Link>
              
              {/* XÓA: Đã xóa khối <Link> của "Lịch sử tư vấn" */}
              
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

          {/* ==================== MENU DOCTOR ==================== */}
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
                to="/lich-cua-toi" 
                className={location.pathname === '/lich-cua-toi' ? 'active' : ''} 
                onClick={closeSidebar}
              >
                <FaCalendarCheck />
                {!collapsed && <span>Lịch của tôi</span>}
              </Link>
              
              {/* Dropdown: Quản lý Tư Vấn (DOCTOR) */}
              {!collapsed && (
                <div className="sidebar-menu-group">
                  <button
                    className={`menu-group-toggle ${isConsultationMenuOpen ? 'open' : ''}`}
                    onClick={() => setConsultationMenuOpen(!isConsultationMenuOpen)}
                  >
                    <div className="menu-group-title">
                      <FaComments />
                      <span>Quản lý Tư vấn</span>
                    </div>
                    <FaChevronDown className={`chevron-icon ${isConsultationMenuOpen ? 'rotated' : ''}`} />
                  </button>
                  {isConsultationMenuOpen && (
                    <div className="submenu">
                      {/* SỬA: Đổi tên và giữ nguyên link cho "chat" */}
                      <Link
                        to="/bac-si/tu-van"
                        className={location.pathname === '/bac-si/tu-van' ? 'active' : ''}
                        onClick={closeSidebar}
                      >
                        <span>•</span> Quản lý chat realtime
                      </Link>
                      
                      {/* THÊM: Link mới cho "video call" */}
                      <Link
                        to="/bac-si/tu-van/video"
                        className={location.pathname === '/bac-si/tu-van/video' ? 'active' : ''}
                        onClick={closeSidebar}
                      >
                        <span>•</span> Quản lý tư vấn video call
                      </Link>
                    </div>
                  )}
                </div>
              )}       
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

          {/* ==================== MENU STAFF ==================== */}
          {user.role === 'staff' && (
            <>
              <Link 
                to="/lich-cua-toi" 
                className={location.pathname === '/lich-cua-toi' ? 'active' : ''} 
                onClick={closeSidebar}
              >
                <FaCalendarCheck />
                {!collapsed && <span>Lịch của tôi</span>}
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

          {/* ==================== MENU ADMIN ==================== */}
          {user.role === 'admin' && (
            <>
              <Link 
                to="/thong-ke" 
                className={location.pathname === '/thong-ke' ? 'active' : ''} 
                onClick={closeSidebar}
              >
                <FaChartBar />
                {!collapsed && <span>Thống kê</span>}
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
                to="/quan-ly-lich-lam-viec" 
                className={location.pathname === '/quan-ly-lich-lam-viec' ? 'active' : ''} 
                onClick={closeSidebar}
              >
                <FaCalendarCheck />
                {!collapsed && <span>Quản lý lịch làm việc</span>}
              </Link>

              {/* Dropdown: Quản lý Tư vấn (ADMIN) */}
              {!collapsed && (
                <div className="sidebar-menu-group">
                  <button
                    className={`menu-group-toggle ${isConsultationMenuOpen ? 'open' : ''}`}
                    onClick={() => setConsultationMenuOpen(!isConsultationMenuOpen)}
                  >
                    <div className="menu-group-title">
                      <FaComments />
                      <span>Quản lý Tư vấn</span>
                    </div>
                    <FaChevronDown className={`chevron-icon ${isConsultationMenuOpen ? 'rotated' : ''}`} />
                  </button>
                  {isConsultationMenuOpen && (
                    <div className="submenu">
                      <Link
                        to="/admin/tu-van/realtime"
                        className={location.pathname === '/admin/tu-van/realtime' ? 'active' : ''}
                        onClick={closeSidebar}
                      >
                        <span>•</span> Quản lý Realtime
                      </Link>
                      <Link
                        to="/admin/tu-van/realtime?type=video" // <-- THÊM: Link mới lọc theo video
                        className={location.pathname === '/admin/tu-van/realtime' && location.search.includes('video') ? 'active' : ''}
                        onClick={closeSidebar}
                      >
                        <span>•</span> Quản lý tư vấn video call
                      </Link>
                      <Link
                        to="/admin/tu-van/packages"
                        className={location.pathname === '/admin/tu-van/packages' ? 'active' : ''}
                        onClick={closeSidebar}
                      >
                        <span>•</span> Quản lý gói dịch vụ
                      </Link>
                      <Link
                        to="/admin/tu-van/cau-hinh"
                        className={location.pathname === '/admin/tu-van/cau-hinh' ? 'active' : ''}
                        onClick={closeSidebar}
                      >
                        <span>•</span> Cấu hình hệ thống
                      </Link>

                      
                    </div>
                  )}
                </div>
              )}

              {/* --- THÊM MỚI: Dropdown Quản lý Thanh toán (ADMIN) --- */}
              {!collapsed && (
                <div className="sidebar-menu-group">
                  <button
                    className={`menu-group-toggle ${isPaymentMenuOpen ? 'open' : ''}`}
                    onClick={() => setPaymentMenuOpen(!isPaymentMenuOpen)}
                  >
                    <div className="menu-group-title">
                      <FaMoneyBillWave />
                      <span>Quản lý Tài chính</span>
                    </div>
                    <FaChevronDown className={`chevron-icon ${isPaymentMenuOpen ? 'rotated' : ''}`} />
                  </button>
                  {isPaymentMenuOpen && (
                    <div className="submenu">
                      <Link
                        to="/quan-ly-thanh-toan/giao-dich"
                        className={location.pathname === '/quan-ly-thanh-toan/giao-dich' ? 'active' : ''}
                        onClick={closeSidebar}
                      >
                        <span>•</span> Giao dịch & Đối soát
                      </Link>
                      <Link
                        to="/thong-ke" // Link này đã có sẵn route Thống kê
                        className={location.pathname === '/thong-ke' ? 'active' : ''}
                        onClick={closeSidebar}
                      >
                        <span>•</span> Thống kê Doanh thu
                      </Link>
                      <Link
                        to="/quan-ly-thanh-toan/cau-hinh"
                        className={location.pathname === '/quan-ly-thanh-toan/cau-hinh' ? 'active' : ''}
                        onClick={closeSidebar}
                      >
                        <span>•</span> Cấu hình Tài khoản
                      </Link>
                    </div>
                  )}
                </div>
              )}
              {/* --- KẾT THÚC PHẦN THÊM MỚI --- */}
              
              <Link 
                to="/quan-ly-dien-dan" 
                className={location.pathname === '/quan-ly-dien-dan' ? 'active' : ''} 
                onClick={closeSidebar}
              >
                <FaComments />
                {!collapsed && <span>Quản lý diễn đàn</span>}
              </Link>

              <Link 
                to="/quan-ly-nguoi-dung" 
                className={location.pathname === '/quan-ly-nguoi-dung' ? 'active' : ''} 
                onClick={closeSidebar}
              >
                <FaUsers />
                {!collapsed && <span>Quản lý người dùng</span>}
              </Link>
              
              {/* SỬA: Sửa link và class check cho Quản lý nhân viên */}
              <Link 
                to="/quan-ly-nhan-vien" 
                className={location.pathname === '/quan-ly-nhan-vien' ? 'active' : ''} 
                onClick={closeSidebar}
              >
                <FaUsers />
                {!collapsed && <span>Quản lý nhân viên</span>}
              </Link>
              
              <Link 
                to="/quan-ly-chuyen-khoa" 
                className={location.pathname === '/quan-ly-chuyen-khoa' ? 'active' : ''} 
                onClick={closeSidebar}
              >
                <FaStethoscope />
                {!collapsed && <span>Quản lý chuyên khoa</span>}
              </Link>
              
              {/* Dropdown: Quản lý Dịch vụ */}
              {!collapsed && (
                <div className="sidebar-menu-group">
                  <button
                    className={`menu-group-toggle ${isServiceMenuOpen ? 'open' : ''}`}
                    onClick={() => setServiceMenuOpen(!isServiceMenuOpen)}
                  >
                    <div className="menu-group-title">
                      <FaHandHoldingMedical />
                      <span>Quản lý Dịch vụ</span>
                    </div>
                    <FaChevronDown className={`chevron-icon ${isServiceMenuOpen ? 'rotated' : ''}`} />
                  </button>
                  {isServiceMenuOpen && (
                    <div className="submenu">
                      <Link
                        to="/quan-ly-danh-muc-dich-vu"
                        className={location.pathname.startsWith('/quan-ly-danh-muc-dich-vu') ? 'active' : ''}
                        onClick={closeSidebar}
                      >
                        <span>•</span> Danh mục Dịch vụ
                      </Link>
                      <Link
                        to="/quan-ly-dich-vu"
                        className={location.pathname.startsWith('/quan-ly-dich-vu') ? 'active' : ''}
                        onClick={closeSidebar}
                      >
                        <span>•</span> Dịch vụ
                      </Link>
                    </div>
                  )}
                </div>
              )}
              
              <Link 
                to="/quan-ly-bai-viet" 
                className={location.pathname === '/quan-ly-bai-viet' ? 'active' : ''} 
                onClick={closeSidebar}
              >
                <FaNewspaper />
                {!collapsed && <span>Quản lý bài viết</span>}
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
                to="/quan-ly-he-thong" 
                className={location.pathname === '/quan-ly-he-thong' ? 'active' : ''} 
                onClick={closeSidebar}
              >
                <FaCog />
                {!collapsed && <span>Quản lý hệ thống</span>}
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