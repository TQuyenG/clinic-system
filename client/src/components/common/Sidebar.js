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
  const isStaffUser = user?.role === 'staff';
  const staffRank = user?.role_info?.rank || user?.staff?.rank;
  
  // Dropdown states
  const [isServiceMenuOpen, setServiceMenuOpen] = useState(false);
  const [isConsultationMenuOpen, setConsultationMenuOpen] = useState(false);
  const [isPaymentMenuOpen, setPaymentMenuOpen] = useState(false);
  const [isArticleMenuOpen, setArticleMenuOpen] = useState(false);
  const [isStaffMenuOpen, setStaffMenuOpen] = useState(false);
  const [isUserMenuOpen, setUserMenuOpen] = useState(false);
  
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

    const permissionRefreshInterval = setInterval(() => {
      refreshPermissions();
    }, 30000);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      clearInterval(permissionRefreshInterval);
    };
  }, [onToggle, refreshPermissions]);

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
    if (location.pathname.startsWith('/quan-ly-nhan-vien')) {
      setStaffMenuOpen(true);
    }
    if (location.pathname.startsWith('/quan-ly-nguoi-dung') || location.pathname.startsWith('/quan-ly-bac-si') || location.pathname.startsWith('/quan-ly-benh-nhan')) {
      setUserMenuOpen(true);
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

  // IDs that should appear in the top "General/Chung" section (visual grouping)
  // include both patient and staff saved-articles IDs so "Bài viết đã lưu" shows in Chung
  const topSectionIds = ['dashboard', 'profile', 'my_forum', 'saved_articles', 'saved_articles_staff'];
  const firstManagementIndex = menuItems.findIndex(i => !topSectionIds.includes(i.id));
  const firstMgmtIndexSafe = firstManagementIndex === -1 ? menuItems.length : firstManagementIndex;

  // Build menu items as structured data (top-level only). This mirrors the JSX below
  const buildMenu = () => {
    const items = [];

    const addIf = (condition, item) => {
      if (condition) items.push(item);
    };

    const addDropdown = (condition, item) => {
      if (condition) items.push(item);
    };

    // Common
    items.push({ id: 'dashboard', type: 'item', to: '/dashboard', icon: FaTachometerAlt, label: 'Tổng quan' });
    items.push({ id: 'profile', type: 'item', to: '/ho-so-nguoi-dung', icon: FaUserCircle, label: 'Tài khoản' });
    items.push({ id: 'my_forum', type: 'item', to: '/dien-dan-cua-toi', icon: FaRegComments, label: 'Diễn đàn của tôi' });
    

    // Patient giữ menu cố định theo vai trò
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
      // don't return early here so shared post-processing (e.g. moving saved-articles)
      // still runs and places 'Bài viết đã lưu' in the top 'Chung' section.
      // downstream checks (isAdminUser/isStaffUser) will be false for patient
      // so no other admin items will be appended.
    }
    const isAdminUser = isAdmin;
    const isDoctorUser = user?.role === 'doctor';
    const dept = user?.role_info?.department || user?.staff?.department;
    const rank = user?.role_info?.rank || user?.staff?.rank;

    if (isAdminUser || isStaffUser || isDoctorUser) {
      // Doctors should see appointment management and work schedule even if module flag is off
      addIf(canAccessModule('appointments') || isDoctorUser, { id: 'manage_appointments', type: 'item', to: '/quan-ly-lich-hen', icon: FaClipboardList, label: 'Quản lý lịch hẹn' });
      addIf(canAccessModule('appointments') || hasPermission('payments', 'pos'), { id: 'manage_reception', type: 'item', to: '/quay-tiep-don', icon: FaHeadset, label: 'Tiếp đón / Check-in' });
      // Allow doctors to access medical records menu even if module flag is off
      addIf(canAccessModule('medical_records') || isDoctorUser, { id: 'manage_medical_records', type: 'item', to: '/ho-so-benh-an', icon: FaFileMedicalAlt, label: 'Hồ sơ bệnh án' });
      addIf(canAccessModule('doctors') || canAccessModule('patients') || canAccessModule('staff_management') || isAdminUser, { id: 'manage_users', type: 'dropdown', icon: FaUsers, label: 'Quản lý người dùng' });
      // Show work schedule for doctors and staff even if work_shift module flag is off
      addIf(canAccessModule('work_shift') || isDoctorUser || isStaffUser, { id: 'work_schedule', type: 'item', to: '/quan-ly-lich-lam-viec', icon: FaCalendarCheck, label: 'Quản lý lịch làm việc' });
      addIf(canAccessModule('consultations') || canAccessModule('consultation_pricing') || canAccessModule('consultation_realtime') || canAccessModule('video_call'), { id: 'manage_consultations', type: 'dropdown', icon: FaRegComments, label: 'Quản lý Tư vấn' });
      addIf(canAccessModule('services') || canAccessModule('service_categories'), { id: 'manage_services', type: 'dropdown', icon: FaBriefcaseMedical, label: 'Quản lý Dịch vụ' });
      addIf(canAccessModule('articles'), { id: 'manage_articles', type: 'dropdownItems', icon: FaNewspaper, label: 'Quản lý Bài viết', items: [
        { to: '/quan-ly-bai-viet', label: 'Bài viết' },
        { to: '/quan-ly-thuoc', label: 'Thông tin thuốc' },
        { to: '/quan-ly-benh-ly', label: 'Thông tin bệnh lý' }
      ]});
      addIf(canAccessModule('forum'), { id: 'manage_forum', type: 'dropdownItems', icon: FaCommentDots, label: 'Quản lý Diễn đàn & Cộng đồng', items: [
        { to: '/quan-ly-dien-dan', label: 'Quản lý diễn đàn' },
        { to: '/quan-ly-nhom-cong-dong', label: 'Quản lý nhóm cộng đồng' }
      ]});
      addIf(canAccessModule('payments'), { id: 'manage_finance', type: 'dropdown', icon: FaMoneyBillWave, label: 'Quản lý Tài chính' });
      addIf(canAccessModule('system_settings'), { id: 'manage_system', type: 'item', to: '/quan-ly-he-thong', icon: FaCogs, label: 'Quản lý hệ thống' });
      addIf(canAccessModule('contact') || dept === 'support', { id: 'manage_contact', type: 'item', to: '/quan-ly-lien-he', icon: FaEnvelope, label: 'Quản lý liên hệ' });
      addIf(canAccessModule('articles') || canAccessModule('medicines') || canAccessModule('diseases'), { id: 'saved_articles_staff', type: 'item', to: '/bai-viet-da-luu', icon: FaBookmark, label: 'Bài viết đã lưu' });
    }

    if (isAdminUser) {
      addIf(true, { id: 'admin_stats', type: 'item', to: '/thong-ke', icon: FaChartPie, label: 'Thống kê' });
      addIf(true, { id: 'admin_specialties', type: 'item', to: '/quan-ly-chuyen-khoa', icon: FaStethoscope, label: 'Quản lý chuyên khoa' });
      addIf(true, { id: 'admin_categories', type: 'item', to: '/quan-ly-danh-muc', icon: FaThList, label: 'Quản lý danh mục' });
      addIf(true, { id: 'pharmacy_stock_admin', type: 'item', to: '/quan-ly-kho-thuoc', icon: FaWarehouse, label: 'Quản lý Kho Thuốc' });
      addIf(true, { id: 'manage_marketing', type: 'dropdownItems', icon: FaBullhorn, label: 'Quản lý Tiếp thị & Sự kiện', items: [
        { to: '/quan-ly-su-kien', label: 'Quản lý Sự kiện' },
        { to: '/quan-ly-khuyen-mai', label: 'Mã giảm giá & Game' }
      ]});
    }

    if (user && user.role === 'marketing') {
      items.push({ id: 'marketing_dashboard', type: 'item', to: '/marketing-dashboard', icon: FaBullhorn, label: 'Bảng điều khiển Marketing' });
      items.push({ id: 'event_management', type: 'item', to: '/quan-ly-su-kien', icon: FaGift, label: 'Quản lý sự kiện' });
      items.push({ id: 'promotion_management', type: 'item', to: '/quan-ly-khuyen-mai', icon: FaGamepad, label: 'Quản lý khuyến mãi' });
    }

    // Normalize/dedupe saved-articles items: treat saved_articles_staff as the same
    const hasSaved = items.some(i => i.id === 'saved_articles');
    const hasSavedStaff = items.some(i => i.id === 'saved_articles_staff');
    if (hasSavedStaff && !hasSaved) {
      // rename staff variant to canonical id
      items.forEach(i => {
        if (i.id === 'saved_articles_staff') i.id = 'saved_articles';
      });
    }
    if (hasSaved && hasSavedStaff) {
      // remove duplicate staff variant if both exist
      const seen = new Set();
      const deduped = [];
      for (const it of items) {
        if (it.id === 'saved_articles_staff') continue;
        if (!seen.has(it.id)) {
          deduped.push(it);
          seen.add(it.id);
        }
      }
      // replace items with deduped list
      while (items.length) items.pop();
      deduped.forEach(x => items.push(x));
    }

    // ensure saved-articles appear in top 'Chung' section (canonical id 'saved_articles')
    const savedItems = items.filter(i => i.id === 'saved_articles');
    if (savedItems.length) {
      const filtered = items.filter(i => i.id !== 'saved_articles');
      const insertAfterId = 'my_forum';
      const idxAfter = filtered.findIndex(i => i.id === insertAfterId);
      const insertPos = idxAfter === -1 ? Math.min(3, filtered.length) : idxAfter + 1;
      filtered.splice(insertPos, 0, ...savedItems);
      return filtered;
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
        // combine then ensure saved-articles are positioned after 'my_forum'
        const combined = [...ordered, ...remaining];
        const savedIds = ['saved_articles', 'saved_articles_staff'];
        const savedItems = combined.filter(i => savedIds.includes(i.id));
        if (savedItems.length) {
          const filtered = combined.filter(i => !savedIds.includes(i.id));
          const idxAfter = filtered.findIndex(i => i.id === 'my_forum');
          const insertPos = idxAfter === -1 ? Math.min(3, filtered.length) : idxAfter + 1;
          filtered.splice(insertPos, 0, ...savedItems);
          setMenuItems(filtered);
        } else {
          setMenuItems(combined);
        }
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
        {/* User header + small 'Chung' label to visually separate common items */}
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            <FaUserCircle />
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.full_name || user?.username || 'Người dùng'}</div>
            {/* Do not show role label for patients */}
            {user?.role && user.role !== 'patient' && <div className="sidebar-user-role">{user.role}</div>}
          </div>
        </div>
        <div className="sidebar-section-label">Chung</div>
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
              {/* Insert a management section label + divider when we reach the first non-top item */}
              {idx === firstMgmtIndexSafe && idx !== 0 && (
                <>
                  <div className="sidebar-divider" aria-hidden="true" />
                  <div className="sidebar-section-label sidebar-section-label-management">Quản lý</div>
                </>
              )}
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

                  {item.id === 'manage_users' && (canAccessModule('doctors') || canAccessModule('patients') || canAccessModule('staff_management') || isAdmin) && (
                    <MenuDropdown
                      icon={FaUsers}
                      label={item.label}
                      isOpen={isUserMenuOpen}
                      onToggle={() => setUserMenuOpen(!isUserMenuOpen)}
                    >
                      {(canAccessModule('staff_management') || isAdmin) && (
                        <Link to="/quan-ly-nguoi-dung" className={`sidebar-submenu-link ${location.pathname === '/quan-ly-nguoi-dung' ? 'sidebar-active' : ''}`}>
                          <span className="sidebar-submenu-dot">•</span> Danh sách người dùng
                        </Link>
                      )}
                      {(canAccessModule('staff_management') || (isStaffUser && staffRank === 'manager') || isAdmin) && (
                        <Link to="/quan-ly-nhan-vien" className={`sidebar-submenu-link ${location.pathname === '/quan-ly-nhan-vien' ? 'sidebar-active' : ''}`}>
                          <span className="sidebar-submenu-dot">•</span> Danh sách nhân viên
                        </Link>
                      )}
                      {canAccessModule('doctors') && (
                        <Link to="/quan-ly-bac-si" className={`sidebar-submenu-link ${location.pathname === '/quan-ly-bac-si' ? 'sidebar-active' : ''}`}>
                          <span className="sidebar-submenu-dot">•</span> Danh sách bác sĩ
                        </Link>
                      )}
                      {canAccessModule('patients') && (
                        <Link to="/quan-ly-benh-nhan" className={`sidebar-submenu-link ${location.pathname === '/quan-ly-benh-nhan' ? 'sidebar-active' : ''}`}>
                          <span className="sidebar-submenu-dot">•</span> Danh sách bệnh nhân
                        </Link>
                      )}
                    </MenuDropdown>
                  )}

                  {item.id === 'manage_staff' && (canAccessModule('staff_management') || (isStaffUser && staffRank === 'manager')) && (
                    <MenuDropdown
                      icon={FaUserTie}
                      label={item.label}
                      isOpen={isStaffMenuOpen}
                      onToggle={() => setStaffMenuOpen(!isStaffMenuOpen)}
                    >
                      <Link to="/quan-ly-nhan-vien" className={`sidebar-submenu-link ${location.pathname === '/quan-ly-nhan-vien' ? 'sidebar-active' : ''}`}>
                        <span className="sidebar-submenu-dot">•</span> Danh sách nhân viên
                      </Link>
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