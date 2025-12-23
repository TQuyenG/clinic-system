// client/src/pages/StaffManagementPage.js

import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import auditService from '../services/auditService';
import { 
  FaUserMd, FaSearch, FaFilter, FaUserTie, FaCheckCircle, 
  FaExclamationCircle, FaBuilding, FaEdit, FaTimes, FaCheck, 
  FaChartPie, FaChartBar, FaHospital, FaHeadset, FaMoneyBillWave, 
  FaPenFancy, FaCog, FaChevronDown, FaPlus, FaFileExport, FaSitemap,
  FaCalendarAlt, FaClipboardList, FaUmbrellaBeach, FaClock, FaExchangeAlt,
  FaUserNurse, FaBed, FaFileAlt, FaNewspaper, FaComments, FaLightbulb,
  FaCreditCard, FaCogs, FaTools, FaUsers, FaUserShield, FaChartLine, FaHistory,
  FaMoneyCheckAlt, FaBoxes, FaList, FaStethoscope
} from 'react-icons/fa';

import './StaffManagementPage.css';
import OrganizationChart from '../components/OrganizationChart';
import HistoryTab from '../components/HistoryTab';
import DepartmentAssignmentTab from '../components/DepartmentAssignmentTab';
import { useDepartmentColors } from '../contexts/DepartmentColorContext';

// ... (Giữ nguyên các CONFIGURATION const DEPARTMENTS, StatusBadge, RankBadge như cũ) ...
// Để tiết kiệm không gian, tôi chỉ liệt kê phần thay đổi chính trong các Component

const DEPARTMENTS = {
  BGD: { name: 'Ban Giám Đốc', icon: <FaUserShield /> },
  clinical: { name: 'Vận hành lâm sàng', icon: <FaHospital /> },
  system: { name: 'Hệ thống & IT', icon: <FaCog /> },
  support: { name: 'Chăm sóc KH', icon: <FaHeadset /> },
  finance: { name: 'Tài chính', icon: <FaMoneyBillWave /> },
  content: { name: 'Nội dung', icon: <FaPenFancy /> }
};

// === PERMISSIONS MODULES WITH DESCRIPTIONS ===
const PERMISSION_MODULES = {
  work_shift: {
    name: 'Quản lý lịch làm việc',
    icon: <FaCalendarAlt />,
    permissions: [
      { key: 'view_doctor_schedule', label: 'Xem lịch bác sĩ', description: 'Chỉ cho phép xem lịch làm việc của bác sĩ (CSKH)' },
      { key: 'approve_shift', label: 'Phê duyệt lịch làm việc', description: 'Phê duyệt, xác nhận lịch làm việc của nhân viên/phòng ban', onlyFor: ['admin', 'manager', 'clinical', 'system', 'finance'] },
      { key: 'approve_leave', label: 'Phê duyệt nghỉ phép', description: 'Phê duyệt, xác nhận đơn nghỉ phép của nhân viên', onlyFor: ['admin', 'manager', 'clinical', 'system', 'finance'] },
      { key: 'approve_overtime', label: 'Phê duyệt tăng ca', description: 'Phê duyệt, xác nhận đơn tăng ca của nhân viên', onlyFor: ['admin', 'manager', 'clinical', 'system', 'finance'] }
    ]
  },
  appointments: {
    name: 'Quản lý lịch hẹn',
    icon: <FaClipboardList />,
    permissions: [
      { key: 'view', label: 'Xem', description: 'Xem danh sách lịch hẹn' },
      { key: 'create', label: 'Tạo', description: 'Đặt lịch hẹn cho bệnh nhân' },
      { key: 'edit', label: 'Sửa', description: 'Chỉnh sửa thông tin lịch hẹn' },
      { key: 'cancel', label: 'Hủy', description: 'Hủy lịch hẹn' },
      { key: 'approve', label: 'Xác nhận', description: 'Xác nhận lịch hẹn' }
    ]
  },
  doctors: {
    name: 'Quản lý bác sĩ',
    icon: <FaUserMd />,
    permissions: [
      { key: 'view', label: 'Xem', description: 'Xem danh sách bác sĩ' },
      { key: 'edit', label: 'Sửa', description: 'Chỉnh sửa thông tin bác sĩ' },
      { key: 'assign', label: 'Phân công', description: 'Phân công bác sĩ cho ca khám' },
      { key: 'manage_schedule', label: 'Quản lý lịch', description: 'Quản lý lịch làm việc bác sĩ' }
    ]
  },
  patients: {
    name: 'Quản lý bệnh nhân',
    icon: <FaBed />,
    permissions: [
      { key: 'view', label: 'Xem', description: 'Xem thông tin bệnh nhân' },
      { key: 'edit', label: 'Sửa', description: 'Chỉnh sửa hồ sơ bệnh nhân' }
    ]
  },
  medical_records: {
    name: 'Hồ sơ bệnh án',
    icon: <FaFileAlt />,
    permissions: [
      { key: 'view', label: 'Xem', description: 'Xem hồ sơ bệnh án' },
      { key: 'edit', label: 'Sửa', description: 'Chỉnh sửa hồ sơ bệnh án' }
    ]
  },
  articles: {
    name: 'Quản lý bài viết',
    icon: <FaNewspaper />,
    permissions: [
      { key: 'view', label: 'Xem', description: 'Xem danh sách bài viết (Staff chỉ xem của mình, Manager xem tất cả)' },
      { key: 'create', label: 'Tạo', description: 'Viết bài mới' },
      { key: 'create_draft', label: 'Tạo nháp', description: 'Tạo bài viết nháp' },
      { key: 'edit', label: 'Sửa', description: 'Chỉnh sửa bài viết (của người khác nếu là Manager)' },
      { key: 'delete', label: 'Xóa', description: 'Xóa bài viết' },
      { key: 'hide', label: 'Ẩn', description: 'Ẩn/Hiện bài viết' },
      { key: 'approve', label: 'Duyệt', description: 'Duyệt bài viết + nhận thông báo bài pending' },
      { key: 'reject', label: 'Từ chối', description: 'Từ chối bài viết' },
      { key: 'suggest_medicine', label: 'Đề xuất thuốc', description: 'Đề xuất thêm thuốc mới vào hệ thống' },
      { key: 'approve_medicine', label: 'Duyệt thuốc', description: 'Phê duyệt đề xuất thuốc (Manager)' },
      { key: 'create_medicine', label: 'Tạo thuốc', description: 'Tạo thuốc mới trực tiếp (Manager)' },
      { key: 'suggest_disease', label: 'Đề xuất bệnh lý', description: 'Đề xuất thêm bệnh lý mới vào hệ thống' },
      { key: 'approve_disease', label: 'Duyệt bệnh lý', description: 'Phê duyệt đề xuất bệnh lý (Manager)' },
      { key: 'create_disease', label: 'Tạo bệnh lý', description: 'Tạo bệnh lý mới trực tiếp (Manager)' }
    ]
  },
  forum: {
    name: 'Diễn đàn',
    icon: <FaComments />,
    permissions: [
      { key: 'create_topic', label: 'Tạo topic', description: 'Tạo chủ đề mới trong diễn đàn - Manager Content/CSKH và Admin' },
      { key: 'edit_topic', label: 'Sửa topic', description: 'Chỉnh sửa thông tin topic (tên, mô tả, cấu hình) - Manager và Admin' },
      { key: 'toggle_topic', label: 'Ẩn/hiện topic', description: 'Thay đổi trạng thái hiển thị của topic - Manager và Admin' },
      { key: 'delete_topic', label: 'Xóa topic', description: 'Xóa topic (soft delete) - Chỉ Admin và Manager cấp cao' },
      { key: 'moderate_questions', label: 'Kiểm duyệt câu hỏi', description: 'Cho phép staff được phân công làm moderator để phê duyệt, ẩn, xóa câu hỏi và xử lý báo cáo trong các topic được chỉ định. Staff có quyền này sẽ xuất hiện trong danh sách khi Admin/Manager tạo topic và chọn moderator.' }
    ]
  },
  consultations: {
    name: 'Tư vấn trực tuyến',
    icon: <FaLightbulb />,
    permissions: [
      { key: 'view', label: 'Xem', description: 'Xem danh sách lịch tư vấn của bác sĩ' },
      { key: 'create', label: 'Tạo', description: 'Tạo lịch tư vấn mới cho bác sĩ' },
      { key: 'edit', label: 'Sửa', description: 'Chỉnh sửa thông tin lịch tư vấn' },
      { key: 'cancel', label: 'Hủy', description: 'Hủy lịch tư vấn' },
      { key: 'approve', label: 'Xác nhận', description: 'Xác nhận/Phê duyệt lịch tư vấn' }
    ]
  },
  payments: {
    name: 'Thanh toán',
    icon: <FaCreditCard />,
    permissions: [
      { key: 'view', label: 'Xem', description: 'Xem thông tin thanh toán' },
      { key: 'verify', label: 'Xác minh', description: 'Xác minh giao dịch' },
      { key: 'approve', label: 'Duyệt', description: 'Phê duyệt thanh toán' },
      { key: 'refund', label: 'Hoàn tiền', description: 'Xử lý hoàn tiền' }
    ]
  },
  system_settings: {
    name: 'Cài đặt hệ thống',
    icon: <FaCogs />,
    permissions: [
      { key: 'view', label: 'Xem', description: 'Xem cài đặt hệ thống' },
      { key: 'view_audit_logs', label: 'Xem lịch sử chỉnh sửa', description: 'Xem logs thay đổi nội dung trang web' },
      { key: 'edit_home', label: 'Quản lý Trang chủ', description: 'Chỉnh sửa nội dung trang chủ (Banner, Features, Statistics)' },
      { key: 'edit_about', label: 'Quản lý Giới thiệu', description: 'Chỉnh sửa trang giới thiệu (Mission, Vision, Team)' },
      { key: 'edit_facilities', label: 'Quản lý Cơ sở vật chất', description: 'Quản lý thông tin cơ sở vật chất' },
      { key: 'edit_equipment', label: 'Quản lý Trang thiết bị', description: 'Quản lý thông tin thiết bị y tế' },
      { key: 'edit_header_footer', label: 'Quản lý Header/Footer/Navbar', description: 'Chỉnh sửa thanh điều hướng, logo, footer' },
      { key: 'edit_contact', label: 'Quản lý Liên hệ', description: 'Cập nhật thông tin liên hệ, địa chỉ, bản đồ' },
      { key: 'edit_privacy', label: 'Quản lý Chính sách bảo mật', description: 'Chỉnh sửa chính sách bảo mật, thu thập dữ liệu' },
      { key: 'edit_terms', label: 'Quản lý Điều khoản', description: 'Chỉnh sửa điều khoản sử dụng, quy định' }
    ]
  },
  services: {
    name: 'Dịch vụ y tế',
    icon: <FaTools />,
    permissions: [
      { key: 'view', label: 'Xem dịch vụ', description: 'Xem danh sách dịch vụ y tế' },
      { key: 'create', label: 'Tạo dịch vụ', description: 'Thêm dịch vụ y tế mới' },
      { key: 'edit', label: 'Sửa dịch vụ', description: 'Chỉnh sửa thông tin dịch vụ' },
      { key: 'delete', label: 'Xóa dịch vụ', description: 'Xóa dịch vụ khỏi hệ thống' },
      { key: 'hide', label: 'Ẩn/Hiện dịch vụ', description: 'Ẩn hoặc hiện dịch vụ trên website' }
    ]
  },
  service_categories: {
    name: 'Danh mục dịch vụ',
    icon: <FaList />,
    permissions: [
      { key: 'view', label: 'Xem danh mục', description: 'Xem danh sách danh mục dịch vụ' },
      { key: 'create', label: 'Tạo danh mục', description: 'Thêm danh mục dịch vụ mới' },
      { key: 'edit', label: 'Sửa danh mục', description: 'Chỉnh sửa thông tin danh mục' },
      { key: 'delete', label: 'Xóa danh mục', description: 'Xóa danh mục khỏi hệ thống' },
      { key: 'hide', label: 'Ẩn/Hiện danh mục', description: 'Ẩn hoặc hiện danh mục trên website' }
    ]
  },
  consultation_pricing: {
    name: 'Gói tư vấn (Pricing)',
    icon: <FaMoneyCheckAlt />,
    permissions: [
      { key: 'create', label: 'Tạo gói', description: 'Thêm gói tư vấn mới' },
      { key: 'edit', label: 'Sửa gói', description: 'Chỉnh sửa thông tin gói tư vấn' },
      { key: 'delete', label: 'Xóa gói', description: 'Xóa gói tư vấn' },
      { key: 'hide', label: 'Ẩn/Hiện gói', description: 'Ẩn hoặc hiện gói trên website' },
      { key: 'set_price', label: 'Định giá', description: 'Thiết lập và thay đổi giá gói' }
    ]
  },
  staff_management: {
    name: 'Quản lý nhân sự',
    icon: <FaUsers />,
    permissions: [
      { key: 'view', label: 'Xem', description: 'Xem danh sách nhân viên' },
      { key: 'assign_permissions', label: 'Phân quyền', description: 'Phân quyền cho nhân viên' },
      { key: 'assign_categories', label: 'Phân danh mục', description: 'Phân công danh mục quản lý' }
    ]
  }
};

// === DEPARTMENT MODULE PERMISSIONS MAPPING ===
// Định nghĩa department nào được phép quản lý module nào
const DEPARTMENT_MODULE_ACCESS = {
  system: ['work_shift', 'system_settings', 'services', 'service_categories', 'consultation_pricing', 'staff_management'],
  clinical: ['work_shift', 'appointments', 'doctors', 'patients', 'medical_records', 'consultations'],
  support: ['work_shift', 'consultations', 'consultation_pricing', 'forum', 'appointments'],  // CSKH có quyền xem lịch bác sĩ
  finance: ['work_shift', 'payments', 'appointments'],
  content: ['work_shift', 'articles', 'forum'],
  BGD: [] // Admin có tất cả quyền, không cần kiểm tra
};

// --- StatusBadge & RankBadge Components ---
const StatusBadge = ({ status }) => {
  const getStatusStyle = () => {
    switch(status) {
      case 'active':
        return { backgroundColor: '#e8f5e9', color: '#2e7d32', border: '1px solid #81c784' };
      case 'inactive':
        return { backgroundColor: '#ffebee', color: '#c62828', border: '1px solid #ef5350' };
      default:
        return { backgroundColor: '#f5f5f5', color: '#666', border: '1px solid #e0e0e0' };
    }
  };

  return (
    <span style={{
      padding: '4px 12px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '500',
      display: 'inline-block',
      ...getStatusStyle()
    }}>
      {status === 'active' ? 'Hoạt động' : 'Đã khóa'}
    </span>
  );
};

const RankBadge = ({ rank }) => {
  const getRankStyle = () => {
    switch(rank) {
      case 'admin':
        return { backgroundColor: '#fff3e0', color: '#e65100', border: '1px solid #ffb74d' };
      case 'manager':
        return { backgroundColor: '#e3f2fd', color: '#1565c0', border: '1px solid #64b5f6' };
      case 'staff':
        return { backgroundColor: '#f5f5f5', color: '#616161', border: '1px solid #e0e0e0' };
      default:
        return { backgroundColor: '#f5f5f5', color: '#666', border: '1px solid #e0e0e0' };
    }
  };

  return (
    <span style={{
      padding: '4px 12px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '500',
      display: 'inline-block',
      ...getRankStyle()
    }}>
      {getRankLabel(rank)}
    </span>
  );
};

// Helper function để hiển thị rank
const getRankLabel = (rank) => {
  if (rank === 'admin') return 'Ban Giám Đốc';
  if (rank === 'manager') return 'Trưởng phòng';
  return 'Nhân viên';
};

// --- SUB-COMPONENTS ĐÃ ĐƯỢC TỐI ƯU ---

// 1. Overview Dashboard: Chia bố cục rõ ràng hơn
const OverviewDashboard = ({ departmentStats, DEPARTMENTS, onSelectDepartment, staffByDepartment, adminUsers, setActiveDepartment, setSelectedStaff, departmentColors }) => {
  const [hoveredDept, setHoveredDept] = useState(null);
  const [tooltipData, setTooltipData] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const totalStaff = departmentStats.reduce((sum, d) => sum + d.total_staff, 0);

  // Tính toán lại Pie Chart Data (Logic giữ nguyên)
  const pieData = departmentStats.map(stat => ({
    ...stat,
    dept: DEPARTMENTS[stat.code],
    angle: totalStaff > 0 ? (stat.total_staff / totalStaff) * 360 : 0
  }));
  
  let cumulativeAngle = 0;
  const slices = pieData.map(data => {
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + data.angle;
    cumulativeAngle = endAngle;
    
    // Logic vẽ hình rẻ quạt
    const x1 = 100 + 80 * Math.cos((startAngle - 90) * Math.PI / 180);
    const y1 = 100 + 80 * Math.sin((startAngle - 90) * Math.PI / 180);
    const x2 = 100 + 80 * Math.cos((endAngle - 90) * Math.PI / 180);
    const y2 = 100 + 80 * Math.sin((endAngle - 90) * Math.PI / 180);
    const largeArc = data.angle > 180 ? 1 : 0;
    
    return { 
        ...data, 
        pathData: `M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z` 
    };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', padding: '20px', overflowY: 'auto', height: '100%' }}>
      {/* Row 1: Sơ đồ cây + Stat boxes + Biểu đồ tròn */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '20px', minHeight: '650px' }}>
        {/* Cột trái: Sơ đồ cây tổ chức (chiếm phần lớn) */}
        <div className="dashboard-card" style={{ height: '650px' }}>
          <div className="card-header">
            <h3>Sơ đồ tổ chức</h3>
          </div>
          <div style={{ width: '100%', height: 'calc(100% - 60px)', background: '#f5f5f5', borderRadius: '8px', overflow: 'hidden' }}>
            <OrganizationChart 
              departmentStats={departmentStats}
              DEPARTMENTS={DEPARTMENTS}
              onSelectDepartment={onSelectDepartment}
              staffByDepartment={staffByDepartment}
              showDetail={false}
              adminUsers={adminUsers}
              departmentColors={departmentColors}
              onSelectStaff={(deptCode, staffId) => {
                setActiveDepartment(deptCode);
                setTimeout(() => {
                  const deptStaff = staffByDepartment[deptCode];
                  if (deptStaff) {
                    const staff = deptStaff.find(s => s.id === staffId);
                    if (staff) {
                      setSelectedStaff(staff);
                    }
                  }
                }, 800);
              }}
            />
          </div>
        </div>

        {/* Cột phải: Stat boxes + Biểu đồ tròn */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {/* Stat boxes - Ở trên cùng với icons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="stat-box" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
              <FaUsers style={{ fontSize: '24px', color: '#4CAF50' }} />
              <h3 style={{ margin: 0 }}>{totalStaff + adminUsers.length}</h3>
              <p style={{ margin: 0, fontSize: '11px' }}>TỔNG NHÂN VIÊN</p>
            </div>
            <div className="stat-box" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
              <FaBuilding style={{ fontSize: '24px', color: '#009688' }} />
              <h3 style={{ margin: 0 }}>{departmentStats.length + 1}</h3>
              <p style={{ margin: 0, fontSize: '11px' }}>PHÒNG BAN</p>
            </div>
            <div className="stat-box" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
              <FaCheckCircle style={{ fontSize: '24px', color: '#8BC34A' }} />
              <h3 style={{ margin: 0 }}>{departmentStats.reduce((s, d) => s + d.active_staff, 0) + adminUsers.length}</h3>
              <p style={{ margin: 0, fontSize: '11px' }}>HOẠT ĐỘNG</p>
            </div>
            <div className="stat-box" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
              <FaUserTie style={{ fontSize: '24px', color: '#FF9800' }} />
              <h3 style={{ margin: 0 }}>{departmentStats.reduce((s, d) => s + d.managers, 0)}</h3>
              <p style={{ margin: 0, fontSize: '11px' }}>QUẢN LÝ</p>
            </div>
          </div>

          {/* Biểu đồ tròn */}
          <div className="dashboard-card" style={{ position: 'relative', flex: 1 }}>
            <div className="card-header">
              <h3>Biểu đồ nhân sự</h3>
            </div>
            <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <svg 
                viewBox="0 0 200 200" 
                style={{ width: '180px', height: '180px', cursor: 'pointer' }}
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                }}
              >
                {slices.map((slice) => (
                  <path
                    key={slice.code}
                    d={slice.pathData}
                    fill={departmentColors[slice.code] || '#ccc'}
                    stroke="#fff" 
                    strokeWidth="2"
                    onClick={() => onSelectDepartment(slice.code)}
                    style={{ 
                      cursor: 'pointer', 
                      opacity: hoveredDept && hoveredDept !== slice.code ? 0.6 : 1,
                      transition: 'opacity 0.2s'
                    }}
                    onMouseEnter={() => {
                      setHoveredDept(slice.code);
                      const percentage = ((slice.total_staff / totalStaff) * 100).toFixed(1);
                      setTooltipData({
                        name: slice.dept?.name,
                        count: slice.total_staff,
                        percentage: percentage
                      });
                    }}
                    onMouseLeave={() => {
                      setHoveredDept(null);
                      setTooltipData(null);
                    }}
                  />
                ))}
                <circle cx="100" cy="100" r="35" fill="white" />
                <text x="100" y="105" textAnchor="middle" fontSize="20" fontWeight="bold">{totalStaff}</text>
              </svg>
              
              {/* Tooltip */}
              {tooltipData && (
                <div style={{
                  position: 'absolute',
                  left: `${mousePos.x + 10}px`,
                  top: `${mousePos.y + 10}px`,
                  background: 'rgba(0,0,0,0.85)',
                  color: 'white',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  pointerEvents: 'none',
                  zIndex: 1000,
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{tooltipData.name}</div>
                  <div>Nhân viên: {tooltipData.count}</div>
                  <div>Tỷ lệ: {tooltipData.percentage}%</div>
                </div>
              )}

              {/* Legend - style đẹp hơn */}
              <div style={{ width: '100%', marginTop: '15px' }}>
                {pieData.map(d => (
                  <div 
                    key={d.code} 
                    onClick={() => onSelectDepartment(d.code)}
                    onMouseEnter={() => setHoveredDept(d.code)}
                    onMouseLeave={() => setHoveredDept(null)}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      marginBottom: '6px',
                      background: hoveredDept === d.code ? '#f0f0f0' : 'transparent',
                      transition: 'background 0.2s',
                      fontSize: '13px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '3px',
                        background: departmentColors[d.code],
                        flexShrink: 0
                      }}></span>
                      <span style={{ fontWeight: '500' }}>{d.dept?.name}</span>
                    </div>
                    <span style={{ fontWeight: 'bold', color: departmentColors[d.code] }}>{d.total_staff}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Bảng danh sách Admin và Nhân viên - Khoảng cách lớn hơn */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        {/* Bảng Admin */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3><FaUserShield style={{ marginRight: '8px' }} />Ban Giám Đốc ({adminUsers.length})</h3>
          </div>
          <div style={{ padding: '15px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                  <th style={{ padding: '10px', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>Tên</th>
                  <th style={{ padding: '10px', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>Username</th>
                  <th style={{ padding: '10px', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>Email</th>
                </tr>
              </thead>
              <tbody>
                {adminUsers.map((admin, index) => (
                  <tr key={admin.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '12px 10px', fontSize: '13px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ 
                          width: '32px', 
                          height: '32px', 
                          borderRadius: '50%', 
                          background: '#FF9800',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: '12px'
                        }}>
                          {admin.full_name?.charAt(0) || 'A'}
                        </div>
                        <span style={{ fontWeight: '500' }}>{admin.full_name || 'N/A'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 10px', fontSize: '13px', color: '#666' }}>{admin.username}</td>
                    <td style={{ padding: '12px 10px', fontSize: '13px', color: '#666' }}>{admin.email || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bảng Nhân viên theo phòng ban */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3><FaUsers style={{ marginRight: '8px' }} />Nhân viên theo phòng ban</h3>
          </div>
          <div style={{ padding: '15px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                  <th style={{ padding: '10px', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>Phòng ban</th>
                  <th style={{ padding: '10px', textAlign: 'center', fontSize: '13px', fontWeight: '600' }}>Quản lý</th>
                  <th style={{ padding: '10px', textAlign: 'center', fontSize: '13px', fontWeight: '600' }}>Nhân viên</th>
                  <th style={{ padding: '10px', textAlign: 'center', fontSize: '13px', fontWeight: '600' }}>Tổng</th>
                  <th style={{ padding: '10px', textAlign: 'center', fontSize: '13px', fontWeight: '600' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {departmentStats.map((dept) => {
                  const deptInfo = DEPARTMENTS[dept.code];
                  return (
                    <tr key={dept.code} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '12px 10px', fontSize: '13px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '18px' }}>{deptInfo?.icon}</span>
                          <span style={{ fontWeight: '500' }}>{deptInfo?.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 10px', textAlign: 'center', fontSize: '13px' }}>
                        <span style={{ 
                          background: departmentColors[dept.code] + '20',
                          color: departmentColors[dept.code],
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontWeight: '600'
                        }}>
                          {dept.managers}
                        </span>
                      </td>
                      <td style={{ padding: '12px 10px', textAlign: 'center', fontSize: '13px', fontWeight: '600' }}>
                        {dept.total_staff - dept.managers}
                      </td>
                      <td style={{ padding: '12px 10px', textAlign: 'center', fontSize: '13px', fontWeight: 'bold' }}>
                        {dept.total_staff}
                      </td>
                      <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                        <button
                          onClick={() => onSelectDepartment(dept.code)}
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            background: departmentColors[dept.code],
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: '500'
                          }}
                        >
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};


// 2. Main Page Component
const StaffManagementPage = () => {
  // === DEPARTMENT COLORS CONTEXT ===
  const { departmentColors, getDepartmentColor } = useDepartmentColors();
  
  // === STATE MANAGEMENT ===
  const [user, setUser] = useState(null);
  const [currentStaff, setCurrentStaff] = useState(null);
  const [activeDepartment, setActiveDepartment] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRank, setFilterRank] = useState('all');
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // === DATA STATE ===
  const [departmentStats, setDepartmentStats] = useState([]);
  const [staffByDepartment, setStaffByDepartment] = useState({});
  const [allDoctors, setAllDoctors] = useState([]);
  const [allStaff, setAllStaff] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  
  // === PERMISSIONS & DOCTORS EDITING STATE ===
  const [editingPermissions, setEditingPermissions] = useState(false);
  const [tempPermissions, setTempPermissions] = useState({});
  const [editingDoctors, setEditingDoctors] = useState(false);
  const [editingJobDesc, setEditingJobDesc] = useState(false);
  const [jobDescDraft, setJobDescDraft] = useState('');
  const [selectedDoctorIds, setSelectedDoctorIds] = useState([]);

  // === INIT: Load user & data ===
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      window.location.href = '/login';
      return;
    }
    const userData = JSON.parse(userStr);
    setUser(userData);
    
    // Load admin users for organization chart
    loadAdminUsers();
    
    if (userData.role === 'staff') {
      loadCurrentStaffInfo();
    } else if (userData.role === 'admin') {
      loadDepartmentStats();
      loadAllStaff();
      Object.keys(DEPARTMENTS).forEach(dept => loadStaffByDepartment(dept));
      setActiveDepartment('overview');
    }
    
    loadAllDoctors();
  }, []);

  // Auto-select department for staff manager
  useEffect(() => {
    if (currentStaff && currentStaff.department) {
      setActiveDepartment(currentStaff.department);
    }
  }, [currentStaff]);

  // Load staff when department changes
  useEffect(() => {
    if (activeDepartment && activeDepartment !== 'overview') {
      loadStaffByDepartment(activeDepartment);
      setSelectedStaff(null);
    }
  }, [activeDepartment]);

  // Update temp permissions when selected staff changes
  useEffect(() => {
    if (selectedStaff) {
      let perms = selectedStaff.permissions || {};
      // Nếu là trưởng phòng CSKH/Content thì auto set đủ quyền forum
      if (
        selectedStaff.rank === 'manager' &&
        (selectedStaff.department === 'support' || selectedStaff.department === 'content')
      ) {
        // Lấy danh sách quyền forum chuẩn
        const forumModule = PERMISSION_MODULES['forum'];
        if (forumModule) {
          perms = {
            ...perms,
            forum: forumModule.permissions.map(p => p.key)
          };
        }
      }
      setTempPermissions(perms);
      if (selectedStaff.managed_doctors?.doctor_ids) {
        setSelectedDoctorIds(selectedStaff.managed_doctors.doctor_ids);
      } else {
        setSelectedDoctorIds([]);
      }
    }
  }, [selectedStaff]);

  // === API CALLS ===
  const loadCurrentStaffInfo = async () => {
    try {
      const response = await api.get('/staff/my-profile');
      if (response.data.success) {
        setCurrentStaff(response.data.data);
      }
    } catch (error) {
      console.error('Load current staff error:', error);
    }
  };

  const loadDepartmentStats = async () => {
    try {
      const response = await api.get('/staff/statistics/by-department');
      if (response.data.success) {
        setDepartmentStats(response.data.data);
      }
    } catch (error) {
      console.error('Load department stats error:', error);
    }
  };

  const loadAllStaff = async () => {
    try {
      const response = await api.get('/staff/all');
      if (response.data.success) {
        setAllStaff(response.data.data || []);
      }
    } catch (error) {
      console.error('Load all staff error:', error);
    }
  };

  const loadAdminUsers = async () => {
    try {
      const response = await api.get('/users/by-role?role=admin&limit=100');
      if (response.data.success) {
        setAdminUsers(response.data.users || []);
      }
    } catch (error) {
      console.error('Load admin users error:', error);
    }
  };

  const loadStaffByDepartment = async (deptCode) => {
    try {
      setLoading(true);
      const response = await api.get(`/staff/by-department/${deptCode}`);
      if (response.data.success) {
        setStaffByDepartment(prev => ({
          ...prev,
          [deptCode]: response.data.data
        }));
      }
    } catch (error) {
      console.error('Load staff by department error:', error);
      toast.error('Không thể tải danh sách nhân viên');
    } finally {
      setLoading(false);
    }
  };

  const loadAllDoctors = async () => {
    try {
      const response = await api.get('/users/by-role?role=doctor&limit=1000');
      if (response.data.success) {
        setAllDoctors(response.data.users || []);
        console.log('DEBUG allDoctors:', response.data.users);
      }
    } catch (error) {
      console.error('Load all doctors error:', error);
    }
  };

  const updateStaffPermissions = async (staffId, permissions) => {
    try {
      const response = await api.put(`/staff/${staffId}/permissions`, { permissions });
      if (response.data.success) {
        toast.success('Cập nhật quyền thành công');
        loadStaffByDepartment(activeDepartment);
        setEditingPermissions(false);
        // Reload selected staff
        const updatedStaff = staffByDepartment[activeDepartment]?.find(s => s.id === staffId);
        if (updatedStaff) setSelectedStaff({...updatedStaff, permissions});
      }
    } catch (error) {
      console.error('Update permissions error:', error);
      toast.error(error.response?.data?.message || 'Không thể cập nhật quyền');
    }
  };

  const updateStaffJobDescription = async (staffId, job_description) => {
    try {
      const res = await api.put(`/staff/${staffId}`, { job_description });
      if (res.data.success) {
        toast.success('Cập nhật mô tả công việc thành công');
        // Reload staff list for the department
        loadStaffByDepartment(activeDepartment);
        setEditingJobDesc(false);
        // Update selectedStaff locally
        setSelectedStaff(prev => ({ ...prev, job_description }));
      }
    } catch (error) {
      console.error('Update job description error:', error);
      toast.error(error.response?.data?.message || 'Không thể cập nhật mô tả công việc');
    }
  };

  const assignDoctorsToStaff = async (staffId, doctorIds) => {
    try {
      const response = await api.put(`/staff/${staffId}/assign-doctors`, { doctor_ids: doctorIds });
      if (response.data.success) {
        toast.success('Phân công bác sĩ thành công');
        loadStaffByDepartment(activeDepartment);
        setEditingDoctors(false);
        // Reload selected staff
        const updatedStaff = staffByDepartment[activeDepartment]?.find(s => s.id === staffId);
        if (updatedStaff) setSelectedStaff({...updatedStaff, managed_doctors: {doctor_ids: doctorIds}});
      }
    } catch (error) {
      console.error('Assign doctors error:', error);
      toast.error(error.response?.data?.message || 'Không thể phân công bác sĩ');
    }
  };

  // === COMPUTED VALUES ===
  const canManage = useMemo(() => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'staff' && currentStaff?.rank === 'manager') {
      return currentStaff.department === activeDepartment;
    }
    return false;
  }, [user, currentStaff, activeDepartment]);

  const currentDepartmentStaff = useMemo(() => {
    if (activeDepartment === 'overview') return [];
    
    // Tab BGD: hiển thị admin users với format giống staff
    if (activeDepartment === 'BGD') {
      const formattedAdmins = adminUsers.map(admin => ({
        id: admin.id,
        code: admin.username || `ADMIN${admin.id}`,
        username: admin.username,
        rank: 'admin',
        work_status: 'active',
        department: 'BGD',
        phone: admin.phone || 'N/A',
        hire_date: admin.created_at || null,
        User: {
          full_name: admin.full_name,
          email: admin.email,
          avatar_url: admin.avatar_url || null,
          phone: admin.phone || 'N/A'
        },
        // Admin có tất cả quyền mặc định
        permissions: Object.keys(PERMISSION_MODULES).reduce((acc, module) => {
          acc[module] = PERMISSION_MODULES[module].permissions.reduce((permAcc, perm) => {
            permAcc[perm.key] = true;
            return permAcc;
          }, {});
          return acc;
        }, {})
      })).filter(admin => {
        const matchSearch = searchTerm === '' || 
          admin.User?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          admin.code?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchSearch;
      });
      
      return formattedAdmins;
    }
    
    const staff = staffByDepartment[activeDepartment] || [];
    return staff.filter(s => {
      const matchSearch = searchTerm === '' || 
        s.User?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.code?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchRank = filterRank === 'all' || s.rank === filterRank;
      return matchSearch && matchRank;
    });
  }, [activeDepartment, staffByDepartment, searchTerm, filterRank, adminUsers, PERMISSION_MODULES]);

  const managers = useMemo(() => currentDepartmentStaff.filter(s => s.rank === 'manager'), [currentDepartmentStaff]);
  const normalStaff = useMemo(() => currentDepartmentStaff.filter(s => s.rank === 'staff'), [currentDepartmentStaff]);
  const adminStaff = useMemo(() => currentDepartmentStaff.filter(s => s.rank === 'admin'), [currentDepartmentStaff]);

  // === EXPORT REPORT FUNCTION ===
  const handleExportReport = () => {
    try {
      const reportData = {
        department: activeDepartment === 'overview' ? 'Tất cả' : DEPARTMENTS[activeDepartment]?.name,
        totalStaff: activeDepartment === 'overview' 
          ? departmentStats.reduce((sum, d) => sum + d.total_staff, 0)
          : currentDepartmentStaff.length,
        managers: activeDepartment === 'overview'
          ? departmentStats.reduce((sum, d) => sum + d.managers, 0)
          : managers.length,
        activeStaff: activeDepartment === 'overview'
          ? departmentStats.reduce((sum, d) => sum + d.active_staff, 0)
          : currentDepartmentStaff.filter(s => s.work_status === 'active').length,
        generatedAt: new Date().toLocaleString('vi-VN')
      };

      // Create CSV content
      let csvContent = "Báo cáo Nhân sự\n\n";
      csvContent += `Phòng ban:,${reportData.department}\n`;
      csvContent += `Tổng nhân viên:,${reportData.totalStaff}\n`;
      csvContent += `Quản lý:,${reportData.managers}\n`;
      csvContent += `Đang hoạt động:,${reportData.activeStaff}\n`;
      csvContent += `Ngày tạo:,${reportData.generatedAt}\n\n`;
      
      if (activeDepartment !== 'overview') {
        csvContent += "STT,Họ tên,Mã NV,Email,Chức vụ,Trạng thái\n";
        currentDepartmentStaff.forEach((staff, index) => {
          csvContent += `${index + 1},${staff.User?.full_name || staff.username},${staff.code},${staff.User?.email || 'N/A'},${getRankLabel(staff.rank)},${staff.work_status === 'active' ? 'Hoạt động' : 'Không hoạt động'}\n`;
        });
      }

      // Download file
      const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `BaoCao_NhanSu_${activeDepartment}_${Date.now()}.csv`);
      link.click();
      URL.revokeObjectURL(url);
      
      toast.success('Xuất báo cáo thành công');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Không thể xuất báo cáo');
    }
  };
  
  // === RENDER STAFF LIST WITH REAL DATA ===
  const renderStaffList = () => (
     <div className="smp-list-panel">
        <div className="smp-toolbar" style={{border: 'none', borderBottom: '1px solid #eee', borderRadius: 0}}>
           <div className="search-box-compact">
              <FaSearch color="#ccc"/>
              <input 
                placeholder="Tìm tên, mã NV..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
              />
           </div>
           <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
             <select 
               value={filterRank} 
               onChange={e => setFilterRank(e.target.value)}
               style={{padding: '4px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px'}}
             >
               <option value="all">Tất cả</option>
               <option value="manager">Manager</option>
               <option value="staff">Staff</option>
             </select>
           </div>
        </div>
        
        <div className="list-scroll-area">
           {loading ? (
             <div style={{padding: '20px', textAlign: 'center', color: '#999'}}>
               Đang tải...
             </div>
           ) : (
             <>
               {/* Admin Section (chỉ hiện ở tab BGD) */}
               {adminStaff.length > 0 && (
                 <>
                   <div className="smp-section-header" style={{background: '#FFF3E0', color: '#E65100'}}>
                     Giám đốc ({adminStaff.length})
                   </div>
                   {adminStaff.map(staff => (
                     <div 
                       key={staff.id} 
                       className={`smp-staff-item ${selectedStaff?.id === staff.id ? 'selected' : ''}`} 
                       onClick={() => setSelectedStaff(staff)}
                     >
                       <div className="staff-avatar" style={{background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)', color: 'white', fontWeight: 'bold'}}>
                         {staff.User?.avatar_url ? (
                           <img src={staff.User.avatar_url} alt={staff.User.full_name} />
                         ) : (
                           staff.User?.full_name?.charAt(0) || 'A'
                         )}
                       </div>
                       <div className="staff-info">
                         <strong>{staff.User?.full_name || staff.username}</strong>
                         <span>{staff.code} | Giám đốc</span>
                       </div>
                       <StatusBadge status={staff.work_status} />
                     </div>
                   ))}
                 </>
               )}

               {managers.length > 0 && (
                 <>
                   <div className="smp-section-header">Quản lý ({managers.length})</div>
                   {managers.map(staff => (
                     <div 
                       key={staff.id} 
                       className={`smp-staff-item ${selectedStaff?.id === staff.id ? 'selected' : ''}`} 
                       onClick={() => setSelectedStaff(staff)}
                     >
                       <div className="staff-avatar">
                         {staff.User?.avatar_url ? (
                           <img src={staff.User.avatar_url} alt={staff.User.full_name} />
                         ) : (
                           staff.User?.full_name?.charAt(0) || 'M'
                         )}
                       </div>
                       <div className="staff-info">
                         <strong>{staff.User?.full_name || staff.username}</strong>
                         <span>{staff.code} | Manager</span>
                       </div>
                       <StatusBadge status={staff.work_status} />
                     </div>
                   ))}
                 </>
               )}

               {normalStaff.length > 0 && (
                 <>
                   <div className="smp-section-header">Nhân viên ({normalStaff.length})</div>
                   {normalStaff.map(staff => (
                     <div 
                       key={staff.id} 
                       className={`smp-staff-item ${selectedStaff?.id === staff.id ? 'selected' : ''}`} 
                       onClick={() => setSelectedStaff(staff)}
                     >
                       <div className="staff-avatar" style={{color: '#666', background: '#f5f5f5'}}>
                         {staff.User?.avatar_url ? (
                           <img src={staff.User.avatar_url} alt={staff.User.full_name} />
                         ) : (
                           staff.User?.full_name?.charAt(0) || 'S'
                         )}
                       </div>
                       <div className="staff-info">
                         <strong>{staff.User?.full_name || staff.username}</strong>
                         <span>{staff.code} | Staff</span>
                       </div>
                       <StatusBadge status={staff.work_status} />
                     </div>
                   ))}
                 </>
               )}

               {currentDepartmentStaff.length === 0 && (
                 <div style={{padding: '40px 20px', textAlign: 'center', color: '#999'}}>
                   <FaUserMd size={32} style={{opacity: 0.3, marginBottom: '12px'}} />
                   <p>Chưa có nhân viên trong phòng ban này</p>
                 </div>
               )}
             </>
           )}
        </div>
     </div>
  );

  return (
    <div className="smp-container">
      {/* 1. Header cố định */}
      <div className="smp-header">
        <div className="header-left">
          <h1><FaUserMd /> Quản lý Nhân sự</h1>
        </div>
        <div className="header-actions">
           <button className="btn-secondary" onClick={handleExportReport}>
             <FaFileExport /> Xuất báo cáo
           </button>
        </div>
      </div>

      {/* 2. Tabs Bar - Chỉ hiển thị tab phòng ban của manager */}
      <div className="smp-tabs-bar">
        {user?.role === 'admin' && (
          <>
            <button 
                className={`dept-tab ${activeDepartment === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveDepartment('overview')}
            >
                <FaChartPie /> Tổng quan
            </button>
            <div style={{width: 1, height: 20, background: '#e0e0e0', margin: '0 8px'}}></div>
            {Object.entries(DEPARTMENTS).map(([key, dept]) => {
              const deptColor = departmentColors[key] || '#4CAF50';
              const isActive = activeDepartment === key;
              return (
                <button 
                    key={key}
                    className={`dept-tab ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveDepartment(key)}
                    data-dept={key}
                    style={isActive ? {
                      backgroundColor: `${deptColor}20`,
                      color: deptColor,
                      borderBottom: `3px solid ${deptColor}`,
                      fontWeight: 600
                    } : {}}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = `${deptColor}15`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                >
                    {dept.icon} {dept.name}
                </button>
              );
            })}
            <div style={{width: 1, height: 20, background: '#e0e0e0', margin: '0 8px'}}></div>
            <button 
                className={`dept-tab ${activeDepartment === 'assignment' ? 'active' : ''}`}
                onClick={() => setActiveDepartment('assignment')}
            >
                <FaExchangeAlt /> Phân ban
            </button>
            <button 
                className={`dept-tab ${activeDepartment === 'history' ? 'active' : ''}`}
                onClick={() => setActiveDepartment('history')}
            >
                <FaChartLine /> Lịch sử
            </button>
          </>
        )}
        
        {user?.role === 'staff' && currentStaff && (
          <button 
              className="dept-tab active"
              style={{
                cursor: 'default',
                backgroundColor: `${departmentColors[currentStaff.department] || '#4CAF50'}20`,
                color: departmentColors[currentStaff.department] || '#4CAF50',
                borderBottom: `3px solid ${departmentColors[currentStaff.department] || '#4CAF50'}`,
                fontWeight: 600
              }}
              data-dept={currentStaff.department}
          >
              {DEPARTMENTS[currentStaff.department]?.icon} {DEPARTMENTS[currentStaff.department]?.name}
          </button>
        )}
      </div>

      {/* 3. Main Body (Scrollable inside) */}
      <div className="smp-body">
        {activeDepartment === 'overview' ? (
            <OverviewDashboard 
                departmentStats={departmentStats} 
                DEPARTMENTS={DEPARTMENTS}
                onSelectDepartment={setActiveDepartment}
                staffByDepartment={staffByDepartment}
                adminUsers={adminUsers}
                setActiveDepartment={setActiveDepartment}
                setSelectedStaff={setSelectedStaff}
                departmentColors={departmentColors}
            />
        ) : activeDepartment === 'assignment' ? (
            /* Tab Phân ban */
            <DepartmentAssignmentTab 
                DEPARTMENTS={DEPARTMENTS}
                departmentColors={departmentColors}
            />
        ) : activeDepartment === 'history' ? (
            /* Tab Lịch sử */
            <HistoryTab />
        ) : (
            <div className="smp-split-view">{renderStaffList()}
                
                {/* Right Panel: Staff Detail với tabs */}
                <div className="smp-detail-panel">
                    {selectedStaff ? (
                        <>
                            {/* Detail Header */}
                            <div className="detail-header" style={{padding: '16px', borderBottom: '1px solid #eee', display:'flex', justifyContent:'space-between', alignItems: 'center'}}>
                                <div style={{display:'flex', gap:'12px', alignItems: 'center'}}>
                                    <div className="staff-avatar" style={{width: 48, height: 48, fontSize: 20}}>
                                      {selectedStaff.User?.avatar_url ? (
                                        <img src={selectedStaff.User.avatar_url} alt={selectedStaff.User.full_name} style={{width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover'}} />
                                      ) : (
                                        selectedStaff.User?.full_name?.charAt(0) || 'U'
                                      )}
                                    </div>
                                    <div>
                                        <h2 style={{margin:0, fontSize: 18}}>{selectedStaff.User?.full_name || selectedStaff.username}</h2>
                                        <p style={{margin:0, color:'#666', fontSize: 13}}>
                                          {getRankLabel(selectedStaff.rank)} | {DEPARTMENTS[activeDepartment]?.name}
                                        </p>
                                    </div>
                                </div>
                                <div className="header-actions">
                                    <StatusBadge status={selectedStaff.work_status} />
                                </div>
                            </div>

                            {/* Tabs for Info, Permissions, Doctors (chỉ clinical) */}
                            <div style={{borderBottom: '1px solid #eee', padding: '0 16px', display: 'flex', gap: '16px'}}>
                              <button 
                                className={`detail-tab ${!editingPermissions && !editingDoctors ? 'active' : ''}`}
                                onClick={() => { setEditingPermissions(false); setEditingDoctors(false); }}
                                style={{padding: '12px 0', border: 'none', background: 'none', cursor: 'pointer', borderBottom: !editingPermissions && !editingDoctors ? '2px solid #4CAF50' : '2px solid transparent', fontWeight: 500, fontSize: '13px'}}
                              >
                                Thông tin
                              </button>
                              {canManage && (
                                <>
                                  <button 
                                    className={`detail-tab ${editingPermissions ? 'active' : ''}`}
                                    onClick={() => { setEditingPermissions(true); setEditingDoctors(false); }}
                                    style={{padding: '12px 0', border: 'none', background: 'none', cursor: 'pointer', borderBottom: editingPermissions ? '2px solid #4CAF50' : '2px solid transparent', fontWeight: 500, fontSize: '13px'}}
                                  >
                                    Quyền hạn
                                  </button>
                                  {activeDepartment === 'clinical' && selectedStaff.rank !== 'manager' && (
                                    <button 
                                      className={`detail-tab ${editingDoctors ? 'active' : ''}`}
                                      onClick={() => { setEditingDoctors(true); setEditingPermissions(false); }}
                                      style={{padding: '12px 0', border: 'none', background: 'none', cursor: 'pointer', borderBottom: editingDoctors ? '2px solid #4CAF50' : '2px solid transparent', fontWeight: 500, fontSize: '13px'}}
                                    >
                                      Bác sĩ phụ trách
                                    </button>
                                  )}
                                </>
                              )}
                            </div>

                            {/* Tab Content */}
                            <div className="detail-scroll-area" style={{padding: '16px'}}>
                                {!editingPermissions && !editingDoctors && (
                                  // INFO TAB
                                  <div className="info-section">
                                    <h4 style={{marginBottom: '12px', fontSize: '14px', fontWeight: 600}}>Thông tin cá nhân</h4>
                                    <div style={{display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px', fontSize: '13px'}}>
                                      <div style={{color: '#666'}}>Email:</div>
                                      <div>{selectedStaff.User?.email || 'N/A'}</div>
                                      
                                      <div style={{color: '#666'}}>Số điện thoại:</div>
                                      <div>{selectedStaff.User?.phone || 'N/A'}</div>
                                      
                                      <div style={{color: '#666'}}>Mã nhân viên:</div>
                                      <div>{selectedStaff.code}</div>
                                      
                                      <div style={{color: '#666'}}>Chức vụ:</div>
                                      <div>{getRankLabel(selectedStaff.rank)}</div>
                                      
                                      <div style={{color: '#666'}}>Ngày tham gia:</div>
                                      <div>{new Date(selectedStaff.created_at).toLocaleDateString('vi-VN')}</div>
                                    </div>
                                    
                                    {selectedStaff.job_description && (
                                        <div style={{marginTop: '16px'}}>
                                          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                            <h4 style={{marginBottom: '8px', fontSize: '14px', fontWeight: 600}}>Mô tả công việc</h4>
                                            {canManage && !editingJobDesc && (
                                              <button className="btn-link" onClick={() => { setEditingJobDesc(true); setJobDescDraft(selectedStaff.job_description || ''); }}>Chỉnh sửa</button>
                                            )}
                                          </div>

                                          {!editingJobDesc && (
                                            <p style={{fontSize: '13px', color: '#555', lineHeight: 1.6}}>{selectedStaff.job_description}</p>
                                          )}

                                          {editingJobDesc && (
                                            <div>
                                              <textarea value={jobDescDraft} onChange={(e) => setJobDescDraft(e.target.value)} rows={4} style={{width: '100%', fontSize: '13px', padding: '8px'}} />
                                              <div style={{marginTop: '8px', display: 'flex', gap: '8px'}}>
                                                <button className="btn-primary btn-sm" onClick={() => updateStaffJobDescription(selectedStaff.id, jobDescDraft)}><FaCheck /> Lưu</button>
                                                <button className="btn-secondary btn-sm" onClick={() => { setEditingJobDesc(false); setJobDescDraft(''); }}><FaTimes /> Hủy</button>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                    )}
                                  </div>
                                )}

                                {editingPermissions && canManage && (
                                  // PERMISSIONS TAB - REDESIGNED WITH MODULES
                                  <div className="permissions-section">
                                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                                      <h4 style={{margin: 0, fontSize: '15px', fontWeight: 600}}>Cấu hình quyền hạn chi tiết</h4>
                                      <div style={{display: 'flex', gap: '8px'}}>
                                        <button 
                                          className="btn-secondary btn-sm"
                                          onClick={() => {
                                            setTempPermissions(selectedStaff.permissions || {});
                                            setEditingPermissions(false);
                                          }}
                                        >
                                          <FaTimes /> Hủy
                                        </button>
                                        <button 
                                          className="btn-primary btn-sm"
                                          onClick={() => updateStaffPermissions(selectedStaff.id, tempPermissions)}
                                        >
                                          <FaCheck /> Lưu thay đổi
                                        </button>
                                      </div>
                                    </div>
                                    
                                    {/* Thông báo cho admin */}
                                    {selectedStaff.rank === 'admin' && (
                                      <div style={{
                                        background: '#FFF3E0',
                                        border: '2px solid #FF9800',
                                        borderRadius: '8px',
                                        padding: '16px',
                                        marginBottom: '20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px'
                                      }}>
                                        <FaUserShield style={{ fontSize: '24px', color: '#FF9800' }} />
                                        <div>
                                          <div style={{ fontWeight: 'bold', color: '#E65100', marginBottom: '4px' }}>
                                            Thành viên Ban Giám Đốc
                                          </div>
                                          <div style={{ fontSize: '13px', color: '#666' }}>
                                            Người dùng này có toàn quyền quản lý hệ thống. Tất cả quyền hạn đã được cấp mặc định và không thể chỉnh sửa.
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* Permission Modules Grid */}
                                    <div style={{display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '500px', overflowY: 'auto', paddingRight: '8px'}}>
                                      {Object.entries(PERMISSION_MODULES).map(([moduleKey, module]) => {
                                        // Kiểm tra xem department này có được phép quản lý module này không
                                        const staffDepartment = selectedStaff.department;
                                        const allowedModules = DEPARTMENT_MODULE_ACCESS[staffDepartment] || [];
                                        
                                        // Admin có tất cả quyền, hoặc module phải nằm trong danh sách được phép của department
                                        if (selectedStaff.rank !== 'admin' && !allowedModules.includes(moduleKey)) {
                                          return null;
                                        }
                                        
                                        // Lấy permissions hiện tại của module
                                        const modulePermissions = tempPermissions[moduleKey];
                                        
                                        return (
                                          <div key={moduleKey} className="permission-module" style={{
                                            background: '#FAFAFA',
                                            border: '1px solid #E0E0E0',
                                            borderRadius: '8px',
                                            padding: '16px'
                                          }}>
                                            {/* Module Header + Check all */}
                                            <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', paddingBottom: '10px', borderBottom: '2px solid #E0E0E0'}}>
                                              <span style={{fontSize: '20px', color: '#4CAF50'}}>{module.icon}</span>
                                              <h5 style={{margin: 0, fontSize: '14px', fontWeight: 600, color: '#333'}}>{module.name}</h5>
                                              <label style={{marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 500, cursor: 'pointer'}}>
                                                <input
                                                  type="checkbox"
                                                  checked={Array.isArray(modulePermissions) && modulePermissions.length === module.permissions.length}
                                                  indeterminate={Array.isArray(modulePermissions) && modulePermissions.length > 0 && modulePermissions.length < module.permissions.length}
                                                  onChange={e => {
                                                    if (e.target.checked) {
                                                      setTempPermissions({
                                                        ...tempPermissions,
                                                        [moduleKey]: module.permissions.map(p => p.key)
                                                      });
                                                    } else {
                                                      setTempPermissions({
                                                        ...tempPermissions,
                                                        [moduleKey]: []
                                                      });
                                                    }
                                                  }}
                                                  style={{marginRight: 4}}
                                                />
                                                Bật/tắt tất cả
                                              </label>
                                            </div>
                                            
                                            {/* Thêm ghi chú đặc biệt cho module Forum */}
                                            {moduleKey === 'forum' && (
                                              <div style={{
                                                background: '#FFF3E0',
                                                border: '1px solid #FFB74D',
                                                borderRadius: '6px',
                                                padding: '10px',
                                                marginBottom: '12px',
                                                fontSize: '12px',
                                                color: '#E65100'
                                              }}>
                                                <strong>📌 Lưu ý về Diễn đàn:</strong>
                                                <ul style={{ margin: '6px 0 0 0', paddingLeft: '20px' }}>
                                                  <li>Chỉ phòng <strong>Content</strong> và <strong>CSKH</strong> quản lý diễn đàn (do thông tin y tế nhạy cảm)</li>
                                                  <li>Người có quyền <strong>assign_moderators</strong> sẽ chỉ định 2 moderator cho mỗi topic</li>
                                                  <li><strong>Moderator được chỉ định</strong> sẽ: duyệt bài đăng mới + xử lý báo cáo trong topic của họ</li>
                                                  <li>Có ít nhất 1 trong 5 quyền → truy cập được trang Quản lý diễn đàn</li>
                                                </ul>
                                              </div>
                                            )}
                                            
                                            {/* Permissions Grid */}
                                            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px'}}>
                                              {module.permissions.map(perm => {
                                                // Không auto-check cứng nữa, chỉ check nếu có trong modulePermissions
                                                const hasPermission = Array.isArray(modulePermissions) 
                                                  ? modulePermissions.includes(perm.key)
                                                  : false;
                                                
                                                return (
                                                  <div 
                                                    key={perm.key}
                                                    onClick={() => {
                                                      // Không cho chỉnh sửa nếu là admin
                                                      if (selectedStaff.rank === 'admin') return;
                                                      // Nếu module chưa có permissions array, khởi tạo mới
                                                      if (!modulePermissions || !Array.isArray(modulePermissions)) {
                                                        setTempPermissions({...tempPermissions, [moduleKey]: [perm.key]});
                                                      } else {
                                                        const newPerms = hasPermission
                                                          ? modulePermissions.filter(p => p !== perm.key)
                                                          : [...modulePermissions, perm.key];
                                                        setTempPermissions({...tempPermissions, [moduleKey]: newPerms});
                                                      }
                                                    }}
                                                    style={{
                                                      background: hasPermission ? '#E8F5E9' : 'white',
                                                      border: hasPermission ? '2px solid #4CAF50' : '1px solid #E0E0E0',
                                                      borderRadius: '6px',
                                                      padding: '12px',
                                                      cursor: (selectedStaff.rank === 'admin' || (moduleKey === 'forum' && selectedStaff.rank === 'manager' && (selectedStaff.department === 'support' || selectedStaff.department === 'content'))) ? 'not-allowed' : 'pointer',
                                                      transition: 'all 0.2s',
                                                      position: 'relative',
                                                      opacity: selectedStaff.rank === 'admin' ? 0.7 : 1
                                                    }}
                                                    className="permission-card"
                                                  >
                                                    {/* Checkbox Icon */}
                                                    <div style={{
                                                      position: 'absolute',
                                                      top: '8px',
                                                      right: '8px',
                                                      width: '18px',
                                                      height: '18px',
                                                      borderRadius: '4px',
                                                      border: hasPermission ? '2px solid #4CAF50' : '2px solid #CCC',
                                                      background: hasPermission ? '#4CAF50' : 'white',
                                                      display: 'flex',
                                                      alignItems: 'center',
                                                      justifyContent: 'center',
                                                      color: 'white',
                                                      fontSize: '12px'
                                                    }}>
                                                      {hasPermission && '✓'}
                                                    </div>
                                                    
                                                    <div style={{fontSize: '13px', fontWeight: 600, color: hasPermission ? '#2E7D32' : '#555', marginBottom: '4px'}}>
                                                      {perm.label}
                                                    </div>
                                                    <div style={{fontSize: '11px', color: hasPermission ? '#66BB6A' : '#999', lineHeight: 1.4}}>
                                                      {perm.description}
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {editingDoctors && canManage && selectedStaff.rank !== 'manager' && (
                                  // DOCTORS TAB
                                  <div className="doctors-section">
                                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
                                      <h4 style={{margin: 0, fontSize: '14px', fontWeight: 600}}>Phân công bác sĩ</h4>
                                      <div style={{display: 'flex', gap: '8px'}}>
                                        <button 
                                          className="btn-secondary btn-sm"
                                          onClick={() => {
                                            setSelectedDoctorIds(selectedStaff.managed_doctors?.doctor_ids || []);
                                            setEditingDoctors(false);
                                          }}
                                        >
                                          <FaTimes /> Hủy
                                        </button>
                                        <button 
                                          className="btn-primary btn-sm"
                                          onClick={() => assignDoctorsToStaff(selectedStaff.id, selectedDoctorIds)}
                                        >
                                          <FaCheck /> Lưu
                                        </button>
                                      </div>
                                    </div>
                                    
                                    <div style={{display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto'}}>
                                      {Object.entries(
                                        allDoctors.reduce((groups, doctor) => {
                                          const specialty = doctor.specialty?.name || doctor.Specialty?.name || 'Chưa phân loại';
                                          console.log('DEBUG doctor specialty:', doctor.id, doctor.specialty, specialty);
                                          if (!groups[specialty]) groups[specialty] = [];
                                          groups[specialty].push(doctor);
                                          return groups;
                                        }, {})
                                      ).map(([specialty, doctors]) => (
                                        <div key={specialty} style={{marginBottom: '16px'}}>
                                          <div style={{
                                            fontSize: '12px', 
                                            fontWeight: 600, 
                                            color: '#666', 
                                            marginBottom: '8px',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                          }}>
                                            <FaStethoscope size={14} /> {specialty}
                                          </div>
                                          <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
                                            {doctors.map(doctor => {
                                              const isSelected = selectedDoctorIds.includes(doctor.id);
                                              return (
                                                <div 
                                                  key={doctor.id} 
                                                  onClick={() => {
                                                    if (isSelected) {
                                                      setSelectedDoctorIds(selectedDoctorIds.filter(id => id !== doctor.id));
                                                    } else {
                                                      setSelectedDoctorIds([...selectedDoctorIds, doctor.id]);
                                                    }
                                                  }}
                                                  style={{
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    gap: '12px', 
                                                    padding: '10px', 
                                                    background: isSelected ? '#E8F5E9' : '#f9f9f9', 
                                                    borderRadius: '6px',
                                                    border: isSelected ? '1px solid #4CAF50' : '1px solid transparent',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    zIndex: 100
                                                  }}
                                                >
                                                  {isSelected && <FaCheck color="#4CAF50" />}
                                                  <div className="staff-avatar" style={{width: 32, height: 32, fontSize: 14}}>
                                                    {doctor.avatar_url ? (
                                                      <img src={doctor.avatar_url} alt={doctor.full_name} style={{width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover'}} />
                                                    ) : (
                                                      doctor.full_name?.charAt(0) || 'D'
                                                    )}
                                                  </div>
                                                  <div style={{flex: 1}}>
                                                    <div style={{fontSize: '13px', fontWeight: 500}}>{doctor.full_name}</div>
                                                    <div style={{fontSize: '12px', color: '#666'}}>{doctor.email}</div>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div style={{display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#999', flexDirection:'column'}}>
                            <FaUserMd size={48} style={{marginBottom: 16, opacity: 0.5}}/>
                            <p>Chọn nhân viên để xem chi tiết</p>
                        </div>
                    )}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default StaffManagementPage;
