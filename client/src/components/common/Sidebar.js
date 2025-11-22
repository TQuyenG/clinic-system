// client/src/components/common/Sidebar.js
// PHIÊN BẢN CẬP NHẬT:
// 1. Tất cả class có prefix sidebar- để tránh trùng lặp
// 2. Sidebar luôn hiện trên mọi kích thước màn hình
// 3. Collapsed chỉ thu nhỏ còn icon (không ẩn)
// 4. Tooltip hiện tên khi hover trong trạng thái collapsed

import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  FaTachometerAlt, 
  FaUserCircle, 
  FaUsers, 
  FaStethoscope, 
  FaThList, 
  FaNewspaper, 
  FaCalendarCheck, 
  FaCalendarAlt, 
  FaBookmark, 
  FaChartPie, 
  FaCalendarPlus, 
  FaFileMedicalAlt, 
  FaChevronLeft, 
  FaChevronRight,
  FaCogs,
  FaChevronDown,
  FaCommentDots,
  FaUserTie,
  FaClipboardList,
  FaBriefcaseMedical,
  FaNotesMedical,
  FaRegComments,
  FaHeadset,
  FaMoneyBillWave
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
  const [isPaymentMenuOpen, setPaymentMenuOpen] = useState(false);
  
  const location = useLocation();

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        setUser(userData);
      } catch (error) {
        console.error('Error parsing user:', error);
      }
    }

    const handleResize = () => {
      const width = window.innerWidth;
      const mobile = width < 768;
      
      setIsMobile(mobile);
      
      // Mobile: tự động collapsed nhưng vẫn hiện icon
      if (mobile) {
        setCollapsed(true);
        onToggle(true);
      }
    };

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
    if (location.pathname.startsWith('/admin/tu-van') || location.pathname.startsWith('/bac-si/tu-van')) {
      setConsultationMenuOpen(true);
    }
    if (location.pathname.startsWith('/quan-ly-dich-vu') || location.pathname.startsWith('/quan-ly-danh-muc-dich-vu')) {
      setServiceMenuOpen(true);
    }
    if (location.pathname.startsWith('/quan-ly-thanh-toan')) {
      setPaymentMenuOpen(true);
    }
  }, [location.pathname]);

  const toggleSidebar = () => {
    const newCollapsed = !collapsed;
    setCollapsed(newCollapsed);
    onToggle(newCollapsed);
  };

  // Component cho menu item với tooltip
  const MenuItem = ({ to, icon: Icon, label, isActive }) => (
    <Link 
      to={to} 
      className={`sidebar-link ${isActive ? 'sidebar-active' : ''}`}
      title={collapsed ? label : ''}
    >
      <Icon />
      <span className="sidebar-menu-label">{label}</span>
    </Link>
  );

  // Component cho dropdown menu
  const MenuDropdown = ({ icon: Icon, label, isOpen, onToggle: onDropdownToggle, children }) => {
    const handleClick = () => {
      if (!collapsed) {
        onDropdownToggle();
      }
    };

    return (
      <div className="sidebar-menu-group">
        <button
          className={`sidebar-menu-toggle ${isOpen && !collapsed ? 'sidebar-open' : ''}`}
          onClick={handleClick}
          title={collapsed ? label : ''}
        >
          <div className="sidebar-menu-title">
            <Icon />
            <span className="sidebar-menu-label">{label}</span>
          </div>
          {!collapsed && <FaChevronDown className={`sidebar-chevron-icon ${isOpen ? 'sidebar-rotated' : ''}`} />}
        </button>
        {isOpen && !collapsed && (
          <div className="sidebar-submenu">
            {children}
          </div>
        )}
      </div>
    );
  };

  if (!user) {
    return null;
  }

  return (
    <div className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''} ${isMobile ? 'sidebar-mobile' : ''} ${isScrolled ? 'sidebar-scrolled' : ''}`}>
      {/* Toggle button - nằm giữa cạnh phải */}
      <button 
        className="sidebar-toggle-btn" 
        onClick={toggleSidebar} 
        title={collapsed ? 'Mở menu' : 'Đóng menu'}
      >
        {collapsed ? <FaChevronRight /> : <FaChevronLeft />}
      </button>
      
      {/* Wrapper cho scroll */}
      <div className="sidebar-scroll-wrapper">
        <nav className="sidebar-nav">
          {/* ==================== MENU CHUNG ==================== */}
          <MenuItem 
            to="/dashboard" 
            icon={FaTachometerAlt} 
            label="Tổng quan"
            isActive={location.pathname === '/dashboard'}
          />
          
          <MenuItem 
            to="/ho-so-nguoi-dung" 
            icon={FaUserCircle} 
            label="Tài khoản"
            isActive={location.pathname === '/ho-so-nguoi-dung'}
          />

          {/* ==================== MENU PATIENT ==================== */}
          {user.role === 'patient' && (
            <>
              <MenuItem 
                to="/dat-lich-hen" 
                icon={FaCalendarPlus} 
                label="Đặt lịch hẹn"
                isActive={location.pathname === '/dat-lich-hen'}
              />
              
              <MenuItem 
                to="/lich-hen-cua-toi" 
                icon={FaCalendarAlt} 
                label="Lịch hẹn của tôi"
                isActive={location.pathname === '/lich-hen-cua-toi'}
              />
              
              <MenuItem 
                to="/tu-van/lich-su" 
                icon={FaHeadset} 
                label="Tư vấn trực tuyến"
                isActive={location.pathname.startsWith('/tu-van/lich-su')}
              />
              
              <MenuItem 
                to="/ho-so-y-te" 
                icon={FaFileMedicalAlt} 
                label="Hồ sơ y tế"
                isActive={location.pathname === '/ho-so-y-te'}
              />
              
              <MenuItem 
                to="/bai-viet-da-luu" 
                icon={FaBookmark} 
                label="Bài viết đã lưu"
                isActive={location.pathname === '/bai-viet-da-luu'}
              />
            </>
          )}

          {/* ==================== MENU DOCTOR ==================== */}
          {user.role === 'doctor' && (
            <>
              <MenuItem 
                to="/lich-hen-cua-toi" 
                icon={FaCalendarAlt} 
                label="Lịch hẹn của tôi"
                isActive={location.pathname === '/lich-hen-cua-toi'}
              />
              
              <MenuItem 
                to="/lich-cua-toi" 
                icon={FaCalendarCheck} 
                label="Lịch của tôi"
                isActive={location.pathname === '/lich-cua-toi'}
              />
              
              {/* Dropdown: Quản lý Tư Vấn (DOCTOR) */}
              <MenuDropdown
                icon={FaCommentDots}
                label="Quản lý Tư vấn"
                isOpen={isConsultationMenuOpen}
                onToggle={() => setConsultationMenuOpen(!isConsultationMenuOpen)}
              >
                <Link
                  to="/bac-si/tu-van"
                  className={`sidebar-submenu-link ${location.pathname === '/bac-si/tu-van' ? 'sidebar-active' : ''}`}
                >
                  <span className="sidebar-submenu-dot">•</span> Quản lý chat realtime
                </Link>
                <Link
                  to="/bac-si/tu-van/video"
                  className={`sidebar-submenu-link ${location.pathname === '/bac-si/tu-van/video' ? 'sidebar-active' : ''}`}
                >
                  <span className="sidebar-submenu-dot">•</span> Quản lý tư vấn video call
                </Link>
              </MenuDropdown>

              <MenuItem 
                to="/quan-ly-bai-viet" 
                icon={FaNewspaper} 
                label="Quản lý bài viết"
                isActive={location.pathname === '/quan-ly-bai-viet'}
              />
              
              <MenuItem 
                to="/bai-viet-da-luu" 
                icon={FaBookmark} 
                label="Bài viết đã lưu"
                isActive={location.pathname === '/bai-viet-da-luu'}
              />
            </>
          )}

          {/* ==================== MENU STAFF ==================== */}
          {user.role === 'staff' && (
            <>
              <MenuItem 
                to="/lich-cua-toi" 
                icon={FaCalendarCheck} 
                label="Lịch của tôi"
                isActive={location.pathname === '/lich-cua-toi'}
              />
              
              <MenuItem 
                to="/quan-ly-lich-hen" 
                icon={FaClipboardList} 
                label="Quản lý lịch hẹn"
                isActive={location.pathname === '/quan-ly-lich-hen'}
              />
              
              <MenuItem 
                to="/quan-ly-bai-viet" 
                icon={FaNewspaper} 
                label="Quản lý bài viết"
                isActive={location.pathname === '/quan-ly-bai-viet'}
              />
              
              <MenuItem 
                to="/bai-viet-da-luu" 
                icon={FaBookmark} 
                label="Bài viết đã lưu"
                isActive={location.pathname === '/bai-viet-da-luu'}
              />
            </>
          )}

          {/* ==================== MENU ADMIN ==================== */}
          {user.role === 'admin' && (
            <>
              <MenuItem 
                to="/thong-ke" 
                icon={FaChartPie} 
                label="Thống kê"
                isActive={location.pathname === '/thong-ke'}
              />
              
              <MenuItem 
                to="/quan-ly-lich-hen" 
                icon={FaClipboardList} 
                label="Quản lý lịch hẹn"
                isActive={location.pathname === '/quan-ly-lich-hen'}
              />

              <MenuItem 
                to="/quan-ly-lich-lam-viec" 
                icon={FaCalendarCheck} 
                label="Quản lý lịch làm việc"
                isActive={location.pathname === '/quan-ly-lich-lam-viec'}
              />

              {/* Dropdown: Quản lý Tư vấn (ADMIN) */}
              <MenuDropdown
                icon={FaRegComments}
                label="Quản lý Tư vấn"
                isOpen={isConsultationMenuOpen}
                onToggle={() => setConsultationMenuOpen(!isConsultationMenuOpen)}
              >
                <Link
                  to="/admin/tu-van/realtime"
                  className={`sidebar-submenu-link ${location.pathname === '/admin/tu-van/realtime' ? 'sidebar-active' : ''}`}
                >
                  <span className="sidebar-submenu-dot">•</span> Quản lý Realtime
                </Link>
                <Link
                  to="/admin/tu-van/realtime?type=video"
                  className={`sidebar-submenu-link ${location.pathname === '/admin/tu-van/realtime' && location.search.includes('video') ? 'sidebar-active' : ''}`}
                >
                  <span className="sidebar-submenu-dot">•</span> Quản lý tư vấn video call
                </Link>
                <Link
                  to="/admin/tu-van/packages"
                  className={`sidebar-submenu-link ${location.pathname === '/admin/tu-van/packages' ? 'sidebar-active' : ''}`}
                >
                  <span className="sidebar-submenu-dot">•</span> Quản lý gói dịch vụ
                </Link>
                <Link
                  to="/admin/tu-van/cau-hinh"
                  className={`sidebar-submenu-link ${location.pathname === '/admin/tu-van/cau-hinh' ? 'sidebar-active' : ''}`}
                >
                  <span className="sidebar-submenu-dot">•</span> Cấu hình hệ thống
                </Link>
              </MenuDropdown>

              {/* Dropdown: Quản lý Tài chính (ADMIN) */}
              <MenuDropdown
                icon={FaMoneyBillWave}
                label="Quản lý Tài chính"
                isOpen={isPaymentMenuOpen}
                onToggle={() => setPaymentMenuOpen(!isPaymentMenuOpen)}
              >
                <Link
                  to="/quan-ly-thanh-toan/giao-dich"
                  className={`sidebar-submenu-link ${location.pathname === '/quan-ly-thanh-toan/giao-dich' ? 'sidebar-active' : ''}`}
                >
                  <span className="sidebar-submenu-dot">•</span> Giao dịch & Đối soát
                </Link>
                <Link
                  to="/thong-ke"
                  className={`sidebar-submenu-link ${location.pathname === '/thong-ke' ? 'sidebar-active' : ''}`}
                >
                  <span className="sidebar-submenu-dot">•</span> Thống kê Doanh thu
                </Link>
                <Link
                  to="/quan-ly-thanh-toan/cau-hinh"
                  className={`sidebar-submenu-link ${location.pathname === '/quan-ly-thanh-toan/cau-hinh' ? 'sidebar-active' : ''}`}
                >
                  <span className="sidebar-submenu-dot">•</span> Cấu hình Tài khoản
                </Link>
              </MenuDropdown>
              
              <MenuItem 
                to="/quan-ly-dien-dan" 
                icon={FaCommentDots} 
                label="Quản lý diễn đàn"
                isActive={location.pathname === '/quan-ly-dien-dan'}
              />

              <MenuItem 
                to="/quan-ly-nguoi-dung" 
                icon={FaUsers} 
                label="Quản lý người dùng"
                isActive={location.pathname === '/quan-ly-nguoi-dung'}
              />
              
              <MenuItem 
                to="/quan-ly-nhan-vien" 
                icon={FaUserTie} 
                label="Quản lý nhân viên"
                isActive={location.pathname === '/quan-ly-nhan-vien'}
              />
              
              <MenuItem 
                to="/quan-ly-chuyen-khoa" 
                icon={FaStethoscope} 
                label="Quản lý chuyên khoa"
                isActive={location.pathname === '/quan-ly-chuyen-khoa'}
              />
              
              {/* Dropdown: Quản lý Dịch vụ */}
              <MenuDropdown
                icon={FaBriefcaseMedical}
                label="Quản lý Dịch vụ"
                isOpen={isServiceMenuOpen}
                onToggle={() => setServiceMenuOpen(!isServiceMenuOpen)}
              >
                <Link
                  to="/quan-ly-danh-muc-dich-vu"
                  className={`sidebar-submenu-link ${location.pathname.startsWith('/quan-ly-danh-muc-dich-vu') ? 'sidebar-active' : ''}`}
                >
                  <span className="sidebar-submenu-dot">•</span> Danh mục Dịch vụ
                </Link>
                <Link
                  to="/quan-ly-dich-vu"
                  className={`sidebar-submenu-link ${location.pathname.startsWith('/quan-ly-dich-vu') ? 'sidebar-active' : ''}`}
                >
                  <span className="sidebar-submenu-dot">•</span> Dịch vụ
                </Link>
              </MenuDropdown>
              
              <MenuItem 
                to="/quan-ly-bai-viet" 
                icon={FaNotesMedical} 
                label="Quản lý bài viết"
                isActive={location.pathname === '/quan-ly-bai-viet'}
              />

              <MenuItem 
                to="/quan-ly-danh-muc" 
                icon={FaThList} 
                label="Quản lý danh mục"
                isActive={location.pathname === '/quan-ly-danh-muc'}
              />
              
              <MenuItem 
                to="/quan-ly-he-thong" 
                icon={FaCogs} 
                label="Quản lý hệ thống"
                isActive={location.pathname === '/quan-ly-he-thong'}
              />
              
              <MenuItem 
                to="/bai-viet-da-luu" 
                icon={FaBookmark} 
                label="Bài viết đã lưu"
                isActive={location.pathname === '/bai-viet-da-luu'}
              />
            </>
          )}
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;