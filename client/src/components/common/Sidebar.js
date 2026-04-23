// client/src/components/common/Sidebar.js
// PHIÊN BẢN CẬP NHẬT:
// 1. Tất cả class có prefix sidebar- để tránh trùng lặp
// 2. Sidebar luôn hiện trên mọi kích thước màn hình
// 3. Collapsed chỉ thu nhỏ còn icon (không ẩn)
// 4. Tooltip hiện tên khi hover trong trạng thái collapsed
// 5.  THÊM MỚI: Kiểm tra permissions - Ẩn menu không có quyền

import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  FaTachometerAlt, 
  FaUserCircle, 
  FaUsers, 
  FaStethoscope, 
  FaUserMd,
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
  FaMoneyBillWave,
  FaGift,      // <--- THÊM MỚI (Icon quà tặng)
  FaBullhorn,  // <--- THÊM MỚI (Icon sự kiện/loa)
  FaGamepad,
  FaWarehouse,  // <--- KHO THUỐC
  FaEnvelope   // <-- THÊM ICON NÀY CHO TRANG LIÊN HỆ
} from 'react-icons/fa';
import usePermissions from '../../hooks/usePermissions';
import './Sidebar.css';

const Sidebar = ({ onToggle }) => {
  const [user, setUser] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isScrolled, setIsScrolled] = useState(false);
  
  //  THÊM: Hook kiểm tra permissions
  const { canAccessModule, isAdmin, hasPermission, refreshPermissions } = usePermissions(); // <--- THÊM refreshPermissions VÀO ĐÂY
  
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
        refreshPermissions();
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

  //  Debug: Log sau khi user và canAccessModule sẵn sàng
  useEffect(() => {
    if (user) {
      console.log('Sidebar - Can access services?', canAccessModule('services'));
      console.log('Sidebar - Can access consultation_pricing?', canAccessModule('consultation_pricing'));
      console.log('Sidebar - Can access consultations?', canAccessModule('consultations'));
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
  // --- Reorderable menu state & drag/drop handlers ---
  const [menuItems, setMenuItems] = useState([]);
  const dragItemIndex = useRef(null);
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [showToast, setShowToast] = useState(false);

  // Build menu items as structured data (top-level only). This mirrors the JSX below
  const buildMenu = () => {
    const items = [];

    // Common
    items.push({ id: 'dashboard', type: 'item', to: '/dashboard', icon: FaTachometerAlt, label: 'Tổng quan' });
    items.push({ id: 'profile', type: 'item', to: '/ho-so-nguoi-dung', icon: FaUserCircle, label: 'Tài khoản' });
    items.push({ id: 'my_forum', type: 'item', to: '/dien-dan-cua-toi', icon: FaRegComments, label: 'Diễn đàn của tôi' });
    

    // Patient
    if (user && user.role === 'patient') {
      items.push({ id: 'book', type: 'item', to: '/dat-lich-hen', icon: FaCalendarPlus, label: 'Đặt lịch hẹn' });
      items.push({ id: 'my_appointments', type: 'item', to: '/lich-hen-cua-toi', icon: FaCalendarAlt, label: 'Lịch hẹn của tôi' });
      items.push({ id: 'my_consultations', type: 'item', to: '/lich-tu-van-cua-toi', icon: FaRegComments, label: 'Lịch sử tư vấn' });
      items.push({ id: 'medical_record', type: 'item', to: '/ho-so-y-te', icon: FaFileMedicalAlt, label: 'Hồ sơ y tế' });
      items.push({ id: 'saved_articles', type: 'item', to: '/bai-viet-da-luu', icon: FaBookmark, label: 'Bài viết đã lưu' });

      // --- THÊM MỚI: Menu Ưu đãi cho bệnh nhân ---
      items.push({ 
        id: 'patient_promotions', 
        type: 'dropdownItems', 
        icon: FaGift, 
        label: 'Ưu đãi & Quà tặng', 
        items: [
          { to: '/khuyen-mai', label: 'Kho Voucher' },
          { to: '/su-kien', label: 'Sự kiện nổi bật' },
          { to: '/san-qua', label: 'Vòng quay may mắn' } // Game
        ]
      });
    }

    // Marketing
    if (user && user.role === 'marketing') {
      items.push({ id: 'marketing_dashboard', type: 'item', to: '/marketing-dashboard', icon: FaBullhorn, label: 'Bảng điều khiển Marketing' });
      items.push({ id: 'event_management', type: 'item', to: '/quan-ly-su-kien', icon: FaGift, label: 'Quản lý sự kiện' });
      items.push({ id: 'promotion_management', type: 'item', to: '/quan-ly-khuyen-mai', icon: FaGamepad, label: 'Quản lý khuyến mãi' });
    }

    // Doctor
    if (user && user.role === 'doctor') {
      items.push({ id: 'doctor_my_appointments', type: 'item', to: '/lich-hen-cua-toi', icon: FaCalendarAlt, label: 'Lịch hẹn của tôi' });
      items.push({ id: 'doctor_medical_records', type: 'item', to: '/ho-so-benh-an', icon: FaFileMedicalAlt, label: 'Hồ sơ bệnh nhân' });
      items.push({ id: 'doctor_consultations', type: 'dropdown', icon: FaRegComments, label: 'Quản lý Tư vấn' });
      items.push({ id: 'doctor_schedule', type: 'item', to: '/lich-cua-toi', icon: FaCalendarCheck, label: 'Lịch của tôi' });
      items.push({ id: 'doctor_community', type: 'item', to: '/quan-ly-nhom-cong-dong', icon: FaUsers, label: 'Nhóm cộng đồng' });
      items.push({ id: 'manage_articles_doctor', type: 'dropdownItems', icon: FaNewspaper, label: 'Quản lý Bài viết', items: [
        { to: '/quan-ly-bai-viet', label: 'Bài viết' },
        { to: '/quan-ly-thuoc', label: 'Thông tin thuốc' },
        { to: '/quan-ly-benh-ly', label: 'Thông tin bệnh lý' }
      ]});
      items.push({ id: 'pharmacy_stock_doctor', type: 'item', to: '/quan-ly-kho-thuoc', icon: FaWarehouse, label: 'Quản lý Kho Thuốc' });
      items.push({ id: 'saved_articles_2', type: 'item', to: '/bai-viet-da-luu', icon: FaBookmark, label: 'Bài viết đã lưu' });
    }

    // Staff
    if (user && user.role === 'staff') {
      const dept = user?.role_info?.department || user?.staff?.department;
      const rank = user?.role_info?.rank || user?.staff?.rank;

      // Lịch cá nhân — luôn hiện
      items.push({ id: 'staff_schedule', type: 'item', to: '/lich-cua-toi', icon: FaCalendarCheck, label: 'Lịch của tôi' });

      // Quản lý nhân viên — manager hoặc staff có quyền staff_management
      if (rank === 'manager' || canAccessModule('staff_management')) {
        items.push({ id: 'manage_staff', type: 'item', to: '/quan-ly-nhan-vien', icon: FaUserTie, label: 'Quản lý nhân viên' });
      }
      // === CLINICAL ===
      if (canAccessModule('patients')) {
        items.push({ id: 'manage_patients', type: 'item', to: '/quan-ly-benh-nhan', icon: FaUsers, label: 'Quản lý bệnh nhân' });
      }
      // Khóa vĩnh viễn menu Quản lý Bác sĩ đối với phòng Vận hành lâm sàng
      if (canAccessModule('doctors') && dept !== 'clinical') {
        items.push({ id: 'manage_doctors_staff', type: 'item', to: '/quan-ly-bac-si', icon: FaUserMd, label: 'Quản lý bác sĩ' });
      }
      if (canAccessModule('medical_records')) {
        items.push({ id: 'manage_medical_records', type: 'item', to: '/ho-so-benh-an', icon: FaFileMedicalAlt, label: 'Hồ sơ bệnh án' });
      }
      if (canAccessModule('appointments')) {
      items.push({ id: 'manage_appointments', type: 'item', to: '/quan-ly-lich-hen', icon: FaClipboardList, label: 'Quản lý lịch hẹn' });
      }
      // --- BẮT ĐẦU SỬA: CHỈ HIỆN "QUẢN LÝ LỊCH LÀM VIỆC" CHO MANAGER HOẶC NGƯỜI CÓ QUYỀN DUYỆT ---
      if (
        rank === 'manager' || 
        hasPermission('work_shift', 'approve_shift') || 
        hasPermission('work_shift', 'approve_leave') || 
        hasPermission('work_shift', 'approve_overtime')
      ) {
        items.push({ id: 'work_schedule', type: 'item', to: '/quan-ly-lich-lam-viec', icon: FaCalendarCheck, label: 'Quản lý lịch làm việc' });
      }
      // --- KẾT THÚC SỬA ---

      if (dept === 'clinical' && canAccessModule('pharmacy')) { // Giả sử module bạn đặt tên là pharmacy
        items.push({ id: 'pharmacy_stock_staff', type: 'item', to: '/quan-ly-kho-thuoc', icon: FaWarehouse, label: 'Quản lý Kho Thuốc' });
      }

      // === SUPPORT / FINANCE (Tư vấn & Giám sát sự cố) ===
      if (canAccessModule('consultations') || canAccessModule('consultation_pricing') || canAccessModule('consultation_realtime') || canAccessModule('video_call')) {
        items.push({ id: 'manage_consultations', type: 'dropdown', icon: FaRegComments, label: 'Quản lý Tư vấn' });
      }

      // === SYSTEM (Dịch vụ) ===
      if (canAccessModule('services') || canAccessModule('service_categories')) {
        items.push({ id: 'manage_services', type: 'dropdown', icon: FaBriefcaseMedical, label: 'Quản lý Dịch vụ' });
      }
      if (canAccessModule('system_settings')) {
        items.push({ id: 'manage_system', type: 'item', to: '/quan-ly-he-thong', icon: FaCogs, label: 'Quản lý hệ thống' });
      }

      // === CONTENT (Bài viết, Diễn đàn) ===
      if (canAccessModule('articles')) {
        items.push({ id: 'manage_articles', type: 'dropdownItems', icon: FaNewspaper, label: 'Quản lý Bài viết', items: [
          { to: '/quan-ly-bai-viet', label: 'Bài viết' },
          { to: '/quan-ly-thuoc', label: 'Thông tin thuốc' },
          { to: '/quan-ly-benh-ly', label: 'Thông tin bệnh lý' }
        ]});
      }
      if (canAccessModule('forum')) {
        items.push({ id: 'manage_forum', type: 'dropdownItems', icon: FaCommentDots, label: 'Diễn đàn & Cộng đồng', items: [
          { to: '/quan-ly-dien-dan', label: 'Quản lý diễn đàn' },
          { to: '/quan-ly-nhom-cong-dong', label: 'Quản lý nhóm cộng đồng' }
        ]});
      }
      
      // THÊM QUẢN LÝ LIÊN HỆ (Chỉ hiện đối với staff chăm sóc khách hàng)
      if (dept === 'support') {
        items.push({ id: 'manage_contact', type: 'item', to: '/quan-ly-lien-he', icon: FaEnvelope, label: 'Quản lý liên hệ' });
      }

      // === FINANCE (Thanh toán) ===
      if (canAccessModule('payments')) {
        items.push({ id: 'stats', type: 'item', to: '/thong-ke', icon: FaChartPie, label: 'Thống kê tổng quan' });
        items.push({ id: 'manage_finance', type: 'dropdown', icon: FaMoneyBillWave, label: 'Quản lý Tài chính' });
      }

      items.push({ id: 'saved_articles_staff', type: 'item', to: '/bai-viet-da-luu', icon: FaBookmark, label: 'Bài viết đã lưu' });
    }

      

    // Admin
    if (user && user.role === 'admin') {
      items.push({ id: 'admin_stats', type: 'item', to: '/thong-ke', icon: FaChartPie, label: 'Thống kê' });
      items.push({ id: 'admin_manage_appointments', type: 'item', to: '/quan-ly-lich-hen', icon: FaClipboardList, label: 'Quản lý lịch hẹn' });
      items.push({ id: 'admin_work_schedule', type: 'item', to: '/quan-ly-lich-lam-viec', icon: FaCalendarCheck, label: 'Quản lý lịch làm việc' });
      items.push({ id: 'admin_consultations', type: 'dropdown', icon: FaRegComments, label: 'Quản lý Tư vấn' });
      items.push({ id: 'admin_finance', type: 'dropdown', icon: FaMoneyBillWave, label: 'Quản lý Tài chính' });
      items.push({ id: 'admin_forum', type: 'dropdownItems', icon: FaCommentDots, label: 'Diễn đàn & Cộng đồng', items: [
        { to: '/quan-ly-dien-dan', label: 'Quản lý diễn đàn' },
        { to: '/quan-ly-nhom-cong-dong', label: 'Quản lý nhóm cộng đồng' }
      ]});
      items.push({ id: 'admin_contact', type: 'item', to: '/quan-ly-lien-he', icon: FaEnvelope, label: 'Quản lý liên hệ' }); // <-- THÊM DÒNG NÀY
      items.push({ id: 'admin_users', type: 'item', to: '/quan-ly-nguoi-dung', icon: FaUsers, label: 'Quản lý người dùng' });
      items.push({ id: 'admin_staff', type: 'item', to: '/quan-ly-nhan-vien', icon: FaUserTie, label: 'Quản lý nhân viên' });
      items.push({ id: 'admin_specialties', type: 'item', to: '/quan-ly-chuyen-khoa', icon: FaStethoscope, label: 'Quản lý chuyên khoa' });
      items.push({ id: 'admin_services_dropdown', type: 'dropdown', icon: FaBriefcaseMedical, label: 'Quản lý Dịch vụ' });
      items.push({ id: 'admin_articles', type: 'dropdownItems', icon: FaNewspaper, label: 'Quản lý Bài viết', items: [
        { to: '/quan-ly-bai-viet', label: 'Bài viết' },
        { to: '/quan-ly-thuoc', label: 'Thông tin thuốc' },
        { to: '/quan-ly-benh-ly', label: 'Thông tin bệnh lý' }
      ]});
      items.push({ id: 'admin_categories', type: 'item', to: '/quan-ly-danh-muc', icon: FaThList, label: 'Quản lý danh mục' });
      items.push({ 
        id: 'manage_marketing', 
        type: 'dropdownItems', 
        icon: FaBullhorn, 
        label: 'Tiếp thị & Sự kiện', 
        items: [
          { to: '/quan-ly-su-kien', label: 'Quản lý Sự kiện' },
          { to: '/quan-ly-khuyen-mai', label: 'Mã giảm giá & Game' }
        ]
      });
      items.push({ id: 'admin_system', type: 'item', to: '/quan-ly-he-thong', icon: FaCogs, label: 'Quản lý hệ thống' });
      items.push({ id: 'pharmacy_stock_admin', type: 'item', to: '/quan-ly-kho-thuoc', icon: FaWarehouse, label: 'Quản lý Kho Thuốc' });
      items.push({ id: 'admin_saved', type: 'item', to: '/bai-viet-da-luu', icon: FaBookmark, label: 'Bài viết đã lưu' });
    }

    return items;
  };

  // Initialize menu items and apply saved order
  useEffect(() => {
    // only build when user/permissions are ready
    const built = buildMenu();
    const saved = localStorage.getItem('sidebarOrder');
    if (saved) {
      try {
        const order = JSON.parse(saved);
        // reorder built by saved order, filter out any ids that no longer exist
        const ordered = order.map(id => built.find(i => i.id === id)).filter(Boolean);
        // append any new items not in saved order
        const remaining = built.filter(i => !order.includes(i.id));
        setMenuItems([...ordered, ...remaining]);
        return;
      } catch (e) {
        console.error('Unable to parse sidebarOrder', e);
      }
    }
    setMenuItems(built);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin, canAccessModule]);

  const saveOrder = (items) => {
    try {
      const ids = items.map(i => i.id);
      localStorage.setItem('sidebarOrder', JSON.stringify(ids));
    } catch (e) {
      console.error('Failed to save sidebar order', e);
    }
  };

  const onDragStart = (e, index) => {
    dragItemIndex.current = index;
    setDraggingIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // for firefox
    e.dataTransfer.setData('text/plain', 'drag');
  };

  const onDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const onDrop = (e, index) => {
    e.preventDefault();
    const from = dragItemIndex.current;
    const to = index;
    setDraggingIndex(null);
    setDragOverIndex(null);
    if (from === null || from === undefined) return;
    if (from === to) {
      dragItemIndex.current = null;
      return;
    }
    const updated = [...menuItems];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    dragItemIndex.current = null;
    setMenuItems(updated);
    saveOrder(updated);
    // show confirmation toast briefly
    setShowToast(true);
    setTimeout(() => setShowToast(false), 1800);
  };

  if (!user) {
    return null;
  }

  return (
    <div className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''} ${isMobile ? 'sidebar-mobile' : ''} ${isScrolled ? 'sidebar-scrolled' : ''} ${draggingIndex !== null ? 'sidebar-is-dragging' : ''}`}>
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
          {menuItems.map((item, idx) => (
            <div
              key={item.id}
              className={`sidebar-draggable ${draggingIndex === idx ? 'sidebar-dragging' : ''} ${dragOverIndex === idx ? 'sidebar-drop-target' : ''}`}
              draggable
              onDragStart={(e) => onDragStart(e, idx)}
              onDragOver={(e) => onDragOver(e, idx)}
              onDrop={(e) => onDrop(e, idx)}
            >
              {item.type === 'item' && (
                <MenuItem to={item.to} icon={item.icon} label={item.label} isActive={location.pathname === item.to} />
              )}

              {item.type === 'dropdownItems' && (
                <MenuDropdownItems
                  icon={item.icon}
                  label={item.label}
                  isOpen={isArticleMenuOpen}
                  onToggle={() => setArticleMenuOpen(!isArticleMenuOpen)}
                  items={item.items}
                />
              )}

              {item.type === 'dropdown' && (
                // Render specific dropdowns by id so we preserve the permission-based children
                <>
                  {item.id === 'manage_consultations' && (canAccessModule('consultations') || canAccessModule('consultation_pricing') || canAccessModule('consultation_realtime') || canAccessModule('video_call')) && (
                    <MenuDropdown
                      icon={FaRegComments}
                      label={item.label}
                      isOpen={isConsultationMenuOpen}
                      onToggle={() => setConsultationMenuOpen(!isConsultationMenuOpen)}
                    >
                      {(canAccessModule('consultations') || canAccessModule('consultation_realtime')) && (
                        <Link to="/quan-ly-tu-van/realtime" className={`sidebar-submenu-link ${location.pathname === '/quan-ly-tu-van/realtime' && !location.search.includes('video') ? 'sidebar-active' : ''}`}>
                          <span className="sidebar-submenu-dot">•</span> Quản lý Realtime
                        </Link>
                      )}
                      {(canAccessModule('consultations') || canAccessModule('video_call')) && (
                        <Link to="/quan-ly-tu-van/realtime?type=video" className={`sidebar-submenu-link ${location.pathname === '/quan-ly-tu-van/realtime' && location.search.includes('video') ? 'sidebar-active' : ''}`}>
                          <span className="sidebar-submenu-dot">•</span> Quản lý tư vấn video call
                        </Link>
                      )}
                      {(hasPermission('consultation_pricing', 'create') || hasPermission('consultation_pricing', 'edit') || hasPermission('consultation_pricing', 'delete') || hasPermission('consultation_pricing', 'hide') || hasPermission('consultation_pricing', 'set_price')) && (
                        <Link to="/quan-ly-tu-van/goi-dich-vu" className={`sidebar-submenu-link ${location.pathname === '/quan-ly-tu-van/goi-dich-vu' ? 'sidebar-active' : ''}`}>
                          <span className="sidebar-submenu-dot">•</span> Quản lý gói dịch vụ
                        </Link>
                      )}
                    </MenuDropdown>
                  )}

                  {item.id === 'manage_services' && (canAccessModule('services') || canAccessModule('service_categories')) && (
                    <MenuDropdown
                      icon={FaBriefcaseMedical}
                      label={item.label}
                      isOpen={isServiceMenuOpen}
                      onToggle={() => setServiceMenuOpen(!isServiceMenuOpen)}
                    >
                      {canAccessModule('service_categories') && <Link to="/quan-ly-danh-muc-dich-vu" className={`sidebar-submenu-link ${location.pathname.startsWith('/quan-ly-danh-muc-dich-vu') ? 'sidebar-active' : ''}`}><span className="sidebar-submenu-dot">•</span> Danh mục Dịch vụ</Link>}
                      {canAccessModule('services') && <Link to="/quan-ly-dich-vu" className={`sidebar-submenu-link ${location.pathname.startsWith('/quan-ly-dich-vu') ? 'sidebar-active' : ''}`}><span className="sidebar-submenu-dot">•</span> Dịch vụ</Link>}
                    </MenuDropdown>
                  )}

                  {(item.id === 'manage_finance' || item.id === 'admin_finance') && canAccessModule('payments') && (
                    <MenuDropdown icon={FaMoneyBillWave} label={item.label} isOpen={isPaymentMenuOpen} onToggle={() => setPaymentMenuOpen(!isPaymentMenuOpen)}>
                      {/* --- BẮT ĐẦU ĐOẠN THÊM MỚI --- */}
                      {/* Chỉ hiển thị Quầy Tiếp Đón nếu user có quyền 'pos' */}
                      {hasPermission('payments', 'pos') && (
                        <Link to="/quay-tiep-don" className={`sidebar-submenu-link ${location.pathname === '/quay-tiep-don' ? 'sidebar-active' : ''}`}>
                            <span className="sidebar-submenu-dot">•</span> Quầy Tiếp Đón (POS)
                        </Link>
                      )}
                      {/* --- KẾT THÚC ĐOẠN THÊM MỚI --- */}
                      <Link to="/quan-ly-thanh-toan/giao-dich" className={`sidebar-submenu-link ${location.pathname === '/quan-ly-thanh-toan/giao-dich' ? 'sidebar-active' : ''}`}><span className="sidebar-submenu-dot">•</span> Giao dịch & Đối soát</Link>
                      <Link to="/quan-ly-thanh-toan/hoan-tien" className={`sidebar-submenu-link ${location.pathname === '/quan-ly-thanh-toan/hoan-tien' ? 'sidebar-active' : ''}`}><span className="sidebar-submenu-dot">•</span> Danh sách Hoàn tiền</Link>
                      <Link to="/quan-ly-thanh-toan/chinh-sach" className={`sidebar-submenu-link ${location.pathname === '/quan-ly-thanh-toan/chinh-sach' ? 'sidebar-active' : ''}`}><span className="sidebar-submenu-dot">•</span> Cấu hình Hoàn tiền</Link>
                      {/* CHỈ ADMIN MỚI THẤY MENU CẤU HÌNH TÀI KHOẢN */}
                      {isAdmin && (
                        <Link to="/quan-ly-thanh-toan/cau-hinh" className={`sidebar-submenu-link ${location.pathname === '/quan-ly-thanh-toan/cau-hinh' ? 'sidebar-active' : ''}`}><span className="sidebar-submenu-dot">•</span> Cấu hình Tài khoản</Link>
                      )}
                    </MenuDropdown>
                  )}

                  {(item.id === 'admin_consultations') && (
                    <MenuDropdown icon={FaRegComments} label={item.label} isOpen={isConsultationMenuOpen} onToggle={() => setConsultationMenuOpen(!isConsultationMenuOpen)}>
                      <Link to="/quan-ly-tu-van/realtime" className={`sidebar-submenu-link ${location.pathname === '/quan-ly-tu-van/realtime' && !location.search.includes('video') ? 'sidebar-active' : ''}`}><span className="sidebar-submenu-dot">•</span> Quản lý Realtime</Link>
                      <Link to="/quan-ly-tu-van/realtime?type=video" className={`sidebar-submenu-link ${location.pathname === '/quan-ly-tu-van/realtime' && location.search.includes('video') ? 'sidebar-active' : ''}`}><span className="sidebar-submenu-dot">•</span> Quản lý tư vấn video call</Link>
                      <Link to="/quan-ly-tu-van/goi-dich-vu" className={`sidebar-submenu-link ${location.pathname === '/quan-ly-tu-van/goi-dich-vu' ? 'sidebar-active' : ''}`}><span className="sidebar-submenu-dot">•</span> Quản lý gói dịch vụ</Link>
                    </MenuDropdown>
                  )}

                  {(item.id === 'doctor_consultations') && (
                    <MenuDropdown icon={FaRegComments} label={item.label} isOpen={isConsultationMenuOpen} onToggle={() => setConsultationMenuOpen(!isConsultationMenuOpen)}>
                        {/* SỬA: Dùng link quản lý Realtime thay vì lịch sử đơn điệu */}
                        <Link to="/quan-ly-tu-van/realtime" className={`sidebar-submenu-link ${location.pathname === '/quan-ly-tu-van/realtime' && !location.search.includes('video') ? 'sidebar-active' : ''}`}><span className="sidebar-submenu-dot">•</span> Quản lý Realtime</Link>
                        <Link to="/quan-ly-tu-van/realtime?type=video" className={`sidebar-submenu-link ${location.pathname === '/quan-ly-tu-van/realtime' && location.search.includes('video') ? 'sidebar-active' : ''}`}><span className="sidebar-submenu-dot">•</span>Quản lý Tư vấn Video Call</Link>
                    </MenuDropdown>
                  )}

                  {(item.id === 'admin_services_dropdown') && (
                    <MenuDropdown icon={FaBriefcaseMedical} label={item.label} isOpen={isServiceMenuOpen} onToggle={() => setServiceMenuOpen(!isServiceMenuOpen)}>
                      <Link to="/quan-ly-danh-muc-dich-vu" className={`sidebar-submenu-link ${location.pathname.startsWith('/quan-ly-danh-muc-dich-vu') ? 'sidebar-active' : ''}`}><span className="sidebar-submenu-dot">•</span> Danh mục Dịch vụ</Link>
                      <Link to="/quan-ly-dich-vu" className={`sidebar-submenu-link ${location.pathname.startsWith('/quan-ly-dich-vu') ? 'sidebar-active' : ''}`}><span className="sidebar-submenu-dot">•</span> Dịch vụ</Link>
                    </MenuDropdown>
                  )}
                </>
              )}
            </div>
          ))}
          {showToast && (
            <div className="sidebar-toast" role="status">Đã cập nhật</div>
          )}
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;