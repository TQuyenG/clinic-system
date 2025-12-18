// client/src/components/common/Sidebar.js
// PHIÊN BẢN CẬP NHẬT:
// 1. Tất cả class có prefix sidebar- để tránh trùng lặp
// 2. Sidebar luôn hiện trên mọi kích thước màn hình
// 3. Collapsed chỉ thu nhỏ còn icon (không ẩn)
// 4. Tooltip hiện tên khi hover trong trạng thái collapsed
// 5. ✅ THÊM MỚI: Kiểm tra permissions - Ẩn menu không có quyền

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
  FaRegComments,
  FaHeadset,
  FaMoneyBillWave
} from 'react-icons/fa';
import usePermissions from '../../hooks/usePermissions'; // ✅ THÊM: Import hook kiểm tra quyền
import './Sidebar.css';

const Sidebar = ({ onToggle }) => {
  const [user, setUser] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isScrolled, setIsScrolled] = useState(false);
  
  // ✅ THÊM: Hook kiểm tra permissions
  const { canAccessModule, isAdmin, hasPermission } = usePermissions();
  
  // Dropdown states
  const [isServiceMenuOpen, setServiceMenuOpen] = useState(false);
  const [isConsultationMenuOpen, setConsultationMenuOpen] = useState(false);
  const [isPaymentMenuOpen, setPaymentMenuOpen] = useState(false);
  const [isArticleMenuOpen, setArticleMenuOpen] = useState(false);
  
  const location = useLocation();

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        setUser(userData);
        console.log('👤 Sidebar - User loaded:', userData.username);
        console.log('🔐 Sidebar - Permissions:', userData.role_info?.permissions);
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

  // ✅ Debug: Log sau khi user và canAccessModule sẵn sàng
  useEffect(() => {
    if (user) {
      console.log('📋 Sidebar - Can access services?', canAccessModule('services'));
      console.log('📋 Sidebar - Can access consultation_pricing?', canAccessModule('consultation_pricing'));
      console.log('📋 Sidebar - Can access consultations?', canAccessModule('consultations'));
    }
  }, [user, canAccessModule]);

  // Auto-open menu nếu đang ở trang con
  useEffect(() => {
    if (location.pathname.startsWith('/quan-ly-tu-van') || location.pathname.startsWith('/admin/tu-van')) {
      setConsultationMenuOpen(true);
    }
    if (location.pathname.startsWith('/quan-ly-dich-vu') || location.pathname.startsWith('/quan-ly-danh-muc-dich-vu')) {
      setServiceMenuOpen(true);
    }
    if (location.pathname.startsWith('/quan-ly-thanh-toan')) {
      setPaymentMenuOpen(true);
    }
    if (location.pathname === '/quan-ly-bai-viet' || location.pathname === '/medicines' || location.pathname === '/diseases') {
      setArticleMenuOpen(true);
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

  // Component cho dropdown menu - PHIÊN BẢN CỦA BẠN
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

  // Component cho dropdown menu với items array - PHIÊN BẢN ITEMS
  const MenuDropdownItems = ({ icon: Icon, label, isOpen, onToggle: onDropdownToggle, items }) => {
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
            {items.map((item, index) => (
              <Link
                key={index}
                to={item.to}
                className={`sidebar-submenu-link ${location.pathname === item.to ? 'sidebar-active' : ''}`}
              >
                <span className="sidebar-submenu-dot">•</span>
                <span className="sidebar-menu-label">{item.label}</span>
              </Link>
            ))}
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
          
          {/* ✅ DIỄN ĐÀN CỦA TÔI - Tất cả user đăng nhập */}
          <MenuItem 
            to="/dien-dan-cua-toi" 
            icon={FaRegComments} 
            label="Diễn đàn của tôi"
            isActive={location.pathname === '/dien-dan-cua-toi'}
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

              {/* Dropdown Quản lý bài viết (DOCTOR) */}
              <MenuDropdownItems
                icon={FaNewspaper}
                label="Quản lý Bài viết"
                isOpen={isArticleMenuOpen}
                onToggle={() => setArticleMenuOpen(!isArticleMenuOpen)}
                items={[
                  { to: '/quan-ly-bai-viet', label: 'Bài viết' },
                  { to: '/quan-ly-thuoc', label: 'Thông tin thuốc' },
                  { to: '/quan-ly-benh-ly', label: 'Thông tin bệnh lý' }
                ]}
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
              {/* 1. LỊCH CỦA TÔI (Ai cũng thấy - không cần check quyền) */}
              <MenuItem 
                to="/lich-cua-toi" 
                icon={FaCalendarCheck} 
                label="Lịch của tôi"
                isActive={location.pathname === '/lich-cua-toi'}
              />
              
              {/* 1.5 QUẢN LÝ NHÂN VIÊN - CHỈ CHO MANAGER hoặc ADMIN */}
              {(isAdmin || (user.staff && user.staff.rank === 'manager')) && (
                <MenuItem 
                  to="/quan-ly-nhan-vien" 
                  icon={FaUserTie} 
                  label="Quản lý nhân viên"
                  isActive={location.pathname === '/quan-ly-nhan-vien'}
                />
              )}
              
              {/* ========================================== */}
              {/* 🔐 QUẢN LÝ LỊCH HẸN - Yêu cầu quyền 'appointments' */}
              {/* ========================================== */}
              {canAccessModule('appointments') && (
                <MenuItem 
                  to="/quan-ly-lich-hen" 
                  icon={FaClipboardList} 
                  label="Quản lý lịch hẹn"
                  isActive={location.pathname === '/quan-ly-lich-hen'}
                />
              )}

              {/* ========================================== */}
              {/* 🔐 QUẢN LÝ TƯ VẤN - Yêu cầu quyền 'consultations' hoặc 'consultation_pricing' */}
              {/* ========================================== */}
              {(canAccessModule('consultations') || canAccessModule('consultation_pricing')) && (
                <MenuDropdown
                  icon={FaRegComments}
                  label="Quản lý Tư vấn"
                  isOpen={isConsultationMenuOpen}
                  onToggle={() => setConsultationMenuOpen(!isConsultationMenuOpen)}
                >
                  {canAccessModule('consultations') && (
                    <>
                      <Link
                        to="/quan-ly-tu-van/realtime"
                        className={`sidebar-submenu-link ${location.pathname === '/quan-ly-tu-van/realtime' && !location.search.includes('video') ? 'sidebar-active' : ''}`}
                      >
                        <span className="sidebar-submenu-dot">•</span> Quản lý Realtime
                      </Link>
                      <Link
                        to="/quan-ly-tu-van/realtime?type=video"
                        className={`sidebar-submenu-link ${location.pathname === '/quan-ly-tu-van/realtime' && location.search.includes('video') ? 'sidebar-active' : ''}`}
                      >
                        <span className="sidebar-submenu-dot">•</span> Quản lý tư vấn video call
                      </Link>
                    </>
                  )}
                  {(hasPermission('consultation_pricing', 'create') || 
                    hasPermission('consultation_pricing', 'edit') || 
                    hasPermission('consultation_pricing', 'delete') || 
                    hasPermission('consultation_pricing', 'hide') || 
                    hasPermission('consultation_pricing', 'set_price')) && (
                    <Link
                      to="/quan-ly-tu-van/goi-dich-vu"
                      className={`sidebar-submenu-link ${location.pathname === '/quan-ly-tu-van/goi-dich-vu' ? 'sidebar-active' : ''}`}
                    >
                      <span className="sidebar-submenu-dot">•</span> Quản lý gói dịch vụ
                    </Link>
                  )}
                </MenuDropdown>
              )}

              {/* ========================================== */}
              {/* 🔐 QUẢN LÝ DỊCH VỤ - Kiểm tra quyền riêng từng module */}
              {/* ========================================== */}
              {(canAccessModule('services') || canAccessModule('service_categories')) && (
                <MenuDropdown
                  icon={FaBriefcaseMedical}
                  label="Quản lý Dịch vụ"
                  isOpen={isServiceMenuOpen}
                  onToggle={() => setServiceMenuOpen(!isServiceMenuOpen)}
                >
                  {canAccessModule('service_categories') && (
                    <Link
                      to="/quan-ly-danh-muc-dich-vu"
                      className={`sidebar-submenu-link ${location.pathname.startsWith('/quan-ly-danh-muc-dich-vu') ? 'sidebar-active' : ''}`}
                    >
                      <span className="sidebar-submenu-dot">•</span> Danh mục Dịch vụ
                    </Link>
                  )}
                  {canAccessModule('services') && (
                    <Link
                      to="/quan-ly-dich-vu"
                      className={`sidebar-submenu-link ${location.pathname.startsWith('/quan-ly-dich-vu') ? 'sidebar-active' : ''}`}
                    >
                      <span className="sidebar-submenu-dot">•</span> Dịch vụ
                    </Link>
                  )}
                </MenuDropdown>
              )}

              {/* ========================================== */}
              {/* 🔐 QUẢN LÝ BÀI VIẾT - Yêu cầu quyền 'articles' */}
              {/* ========================================== */}
              {canAccessModule('articles') && (
                <>
                  <MenuDropdownItems
                    icon={FaNewspaper}
                    label="Quản lý Bài viết"
                    isOpen={isArticleMenuOpen}
                    onToggle={() => setArticleMenuOpen(!isArticleMenuOpen)}
                    items={[
                      { to: '/quan-ly-bai-viet', label: 'Bài viết' },
                      { to: '/quan-ly-thuoc', label: 'Thông tin thuốc' },
                      { to: '/quan-ly-benh-ly', label: 'Thông tin bệnh lý' }
                    ]}
                  />
                </>
              )}
                  
              {/* ========================================== */}
              {/* 🔐 QUẢN LÝ DIỄN ĐÀN - Yêu cầu quyền 'forum' */}
              {/* ========================================== */}
              {canAccessModule('forum') && (
                <MenuItem 
                  to="/quan-ly-dien-dan" 
                  icon={FaCommentDots} 
                  label="Quản lý diễn đàn"
                  isActive={location.pathname === '/quan-ly-dien-dan'}
                />
              )}

              {/* ========================================== */}
              {/* 🔐 QUẢN LÝ HỆ THỐNG - Yêu cầu quyền 'system_settings' */}
              {/* ========================================== */}
              {canAccessModule('system_settings') && (
                <MenuItem 
                  to="/quan-ly-he-thong" 
                  icon={FaCogs} 
                  label="Quản lý hệ thống"
                  isActive={location.pathname === '/quan-ly-he-thong'}
                />
              )}

              {/* ========================================== */}
              {/* 🔐 QUẢN LÝ TÀI CHÍNH - Yêu cầu quyền 'payments' */}
              {/* ========================================== */}
              {canAccessModule('payments') && (
                <>
                  <MenuItem 
                    to="/thong-ke" 
                    icon={FaChartPie} 
                    label="Thống kê tổng quan"
                    isActive={location.pathname === '/thong-ke'}
                  />

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
                      to="/quan-ly-thanh-toan/hoan-tien"
                      className={`sidebar-submenu-link ${location.pathname === '/quan-ly-thanh-toan/hoan-tien' ? 'sidebar-active' : ''}`}
                    >
                      <span className="sidebar-submenu-dot">•</span> Danh sách Hoàn tiền
                    </Link>
                    <Link
                      to="/quan-ly-thanh-toan/chinh-sach"
                      className={`sidebar-submenu-link ${location.pathname === '/quan-ly-thanh-toan/chinh-sach' ? 'sidebar-active' : ''}`}
                    >
                      <span className="sidebar-submenu-dot">•</span> Cấu hình Hoàn tiền
                    </Link>
                    <Link
                      to="/quan-ly-thanh-toan/cau-hinh"
                      className={`sidebar-submenu-link ${location.pathname === '/quan-ly-thanh-toan/cau-hinh' ? 'sidebar-active' : ''}`}
                    >
                      <span className="sidebar-submenu-dot">•</span> Cấu hình Tài khoản
                    </Link>
                  </MenuDropdown>
                </>
              )}
              
              {/* 4. BÀI VIẾT ĐÃ LƯU (Ai cũng thấy - không cần check quyền) */}
              <MenuItem 
                to="/bai-viet-da-luu" 
                icon={FaBookmark} 
                label="Bài viết đã lưu"
                isActive={location.pathname === '/bai-viet-da-luu'}
              />
              
              {/* Quản lý lịch làm việc (Admin + Trưởng phòng + CSKH) */}
              {(user.role === 'admin' || user.role === 'staff' || user.role === 'support') && (
                <MenuItem 
                  to="/quan-ly-lich-lam-viec" 
                  icon={FaCalendarCheck} 
                  label="Quản lý lịch làm việc"
                  isActive={location.pathname === '/quan-ly-lich-lam-viec'}
                />
              )}
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
                  to="/quan-ly-tu-van/realtime"
                  className={`sidebar-submenu-link ${location.pathname === '/quan-ly-tu-van/realtime' && !location.search.includes('video') ? 'sidebar-active' : ''}`}
                >
                  <span className="sidebar-submenu-dot">•</span> Quản lý Realtime
                </Link>
                <Link
                  to="/quan-ly-tu-van/realtime?type=video"
                  className={`sidebar-submenu-link ${location.pathname === '/quan-ly-tu-van/realtime' && location.search.includes('video') ? 'sidebar-active' : ''}`}
                >
                  <span className="sidebar-submenu-dot">•</span> Quản lý tư vấn video call
                </Link>
                <Link
                  to="/quan-ly-tu-van/goi-dich-vu"
                  className={`sidebar-submenu-link ${location.pathname === '/quan-ly-tu-van/goi-dich-vu' ? 'sidebar-active' : ''}`}
                >
                  <span className="sidebar-submenu-dot">•</span> Quản lý gói dịch vụ
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
                {/* --- BẮT ĐẦU THÊM MỚI --- */}
                <Link
                  to="/quan-ly-thanh-toan/hoan-tien"
                  className={`sidebar-submenu-link ${location.pathname === '/quan-ly-thanh-toan/hoan-tien' ? 'sidebar-active' : ''}`}
                >
                  <span className="sidebar-submenu-dot">•</span> Danh sách Hoàn tiền
                </Link>
                <Link
                  to="/quan-ly-thanh-toan/chinh-sach"
                  className={`sidebar-submenu-link ${location.pathname === '/quan-ly-thanh-toan/chinh-sach' ? 'sidebar-active' : ''}`}
                >
                  <span className="sidebar-submenu-dot">•</span> Cấu hình Hoàn tiền
                </Link>
                {/* --- KẾT THÚC THÊM MỚI --- */}
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
              
              {/* Dropdown Quản lý bài viết (ADMIN) */}
              <MenuDropdownItems
                icon={FaNewspaper}
                label="Quản lý Bài viết"
                isOpen={isArticleMenuOpen}
                onToggle={() => setArticleMenuOpen(!isArticleMenuOpen)}
                items={[
                  { to: '/quan-ly-bai-viet', label: 'Bài viết' },
                  { to: '/quan-ly-thuoc', label: 'Thông tin thuốc' },
                  { to: '/quan-ly-benh-ly', label: 'Thông tin bệnh lý' }
                ]}
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