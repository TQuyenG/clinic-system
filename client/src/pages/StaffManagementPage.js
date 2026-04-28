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
  FaMoneyCheckAlt, FaBoxes, FaList, FaStethoscope, FaGift
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
// === PERMISSIONS MODULES WITH DESCRIPTIONS ===
// === PERMISSIONS MODULES WITH DESCRIPTIONS ===
// === PERMISSIONS MODULES WITH DESCRIPTIONS ===
const PERMISSION_MODULES = {
  work_shift: {
    name: 'Lịch làm việc (Lịch của tôi)',
    icon: <FaCalendarAlt />,
    permissions: [
      { key: 'view_personal', label: 'Xem lịch làm việc cá nhân', description: 'Xem lịch làm việc cá nhân' },
      { key: 'view_doctors', label: 'Xem lịch làm việc của bác sĩ', description: 'Xem lịch làm việc của bác sĩ quản lý' },
      { key: 'register_shift', label: 'Đăng ký lịch làm việc', description: 'Đăng ký ca làm việc' },
      { key: 'register_leave', label: 'Đăng ký nghỉ phép', description: 'Tạo đơn xin nghỉ phép' },
      { key: 'register_overtime', label: 'Đăng kí tăng ca', description: 'Tạo đơn xin tăng ca' },
      { key: 'approve_shift', label: 'Phê duyệt lịch làm việc', description: 'Phê duyệt ca làm việc (Manager)', allowedRanks: ['manager', 'admin'] },
      { key: 'approve_leave', label: 'Phê duyệt nghỉ phép', description: 'Phê duyệt đơn nghỉ (Manager)', allowedRanks: ['manager', 'admin'] },
      { key: 'approve_overtime', label: 'Phê duyệt tăng ca', description: 'Phê duyệt đơn tăng ca (Manager)', allowedRanks: ['manager', 'admin'] }
    ]
  },
  appointments: {
    name: 'Quản lý lịch hẹn',
    icon: <FaClipboardList />,
    permissions: [
      { key: 'view', label: 'Xem lịch hẹn', description: 'Xem danh sách lịch hẹn' },
      { key: 'create', label: 'Tạo mới', description: 'Đặt lịch hẹn cho bệnh nhân' },
      { key: 'edit', label: 'Chỉnh sửa', description: 'Chỉnh sửa thông tin lịch hẹn' },
      { key: 'cancel', label: 'Huỷ lịch hẹn', description: 'Hủy lịch hẹn của bệnh nhân' },
      { key: 'reject', label: 'Từ chối lịch hẹn', description: 'Từ chối yêu cầu đặt lịch mới' },
      { key: 'approve', label: 'Xác nhận lịch hẹn', description: 'Xác nhận lịch hẹn hợp lệ' },
      { key: 'verify_payment', label: 'Xác nhận thanh toán tại quầy', description: 'Xác nhận tiền mặt tại quầy' },
      { key: 'update_status', label: 'Cập nhật trạng thái lịch hẹn', description: 'Đổi trạng thái check-in, khám xong' },
      { key: 'resend_code', label: 'Cấp lại mã tra cứu', description: 'Gửi lại mã tra cứu cho khách' },
      { key: 'view_reviews', label: 'Xem đánh giá', description: 'Xem feedback từ bệnh nhân' },
      { key: 'assign_doctor', label: 'Phân công bác sĩ', description: 'Chỉ định bác sĩ khám', allowedRanks: ['manager', 'admin'] }
    ]
  },
  doctors: {
    name: 'Quản lý bác sĩ',
    icon: <FaUserMd />,
    permissions: [
      { key: 'view', label: 'Xem', description: 'Xem danh sách bác sĩ' },
      { key: 'edit', label: 'Sửa', description: 'Chỉnh sửa thông tin bác sĩ' },
      { key: 'manage_schedule', label: 'Quản lý lịch', description: 'Quản lý lịch làm việc bác sĩ' },
      { key: 'assign', label: 'Phân công', description: 'Phân công bác sĩ cho ca khám', allowedRanks: ['manager', 'admin'] }
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
      { key: 'view', label: 'Xem hồ sơ', description: 'Xem hồ sơ bệnh án' },
      { key: 'edit', label: 'Cập nhật hồ sơ y tế', description: 'Sửa nội dung bệnh án' },
      { key: 'edit_vitals', label: 'Sửa chỉ số sinh tồn', description: 'Cập nhật HA, nhịp tim...' },
      { key: 'create', label: 'Tạo mới', description: 'Tạo hồ sơ bệnh án ban đầu' }
    ]
  },
  articles: {
    name: 'Quản lý bài viết',
    icon: <FaNewspaper />,
    permissions: [
      { key: 'view', label: 'Xem bài viết', description: 'Xem danh sách và chi tiết bài viết' },
      { key: 'save', label: 'Lưu bài viết', description: 'Lưu bài viết' },
      { key: 'share', label: 'Chia sẻ bài viết', description: 'Chia sẻ bài viết' },
      { key: 'report', label: 'Báo cáo bài viết', description: 'Báo cáo bài viết' },
      { key: 'view_related', label: 'Xem bài viết liên quan', description: 'Xem bài viết liên quan' },
      { key: 'create', label: 'Tạo bài viết', description: 'Tạo bài viết mới' },
      { key: 'edit', label: 'Chỉnh sửa bài viết', description: 'Chỉnh sửa nội dung bài viết' },
      { key: 'duplicate', label: 'Nhân bản bài viết', description: 'Nhân bản bài viết' },
      { key: 'delete', label: 'Xóa', description: 'Xóa bài viết', allowedRanks: ['manager', 'admin'] },
      { key: 'hide', label: 'Ẩn', description: 'Ẩn/Hiện bài viết', allowedRanks: ['manager', 'admin'] },
      { key: 'approve', label: 'Duyệt', description: 'Duyệt bài viết', allowedRanks: ['manager', 'admin'] },
      { key: 'reject', label: 'Từ chối', description: 'Từ chối bài viết', allowedRanks: ['manager', 'admin'] }
    ]
  },
  medicines: {
    name: 'Quản lý Thuốc',
    icon: <FaBoxes />,
    permissions: [
      { key: 'view', label: 'Xem thông tin thuốc', description: 'Xem thông tin thuốc' },
      { key: 'propose_create', label: 'Đề xuất thêm thuốc', description: 'Đề xuất thêm thông tin thuốc mới' },
      { key: 'propose_edit', label: 'Đề xuất sửa thuốc', description: 'Đề xuất sửa thông tin thuốc' },
      { key: 'create', label: 'Thêm mới', description: 'Thêm thuốc mới (Manager)', allowedRanks: ['manager', 'admin'] },
      { key: 'edit', label: 'Sửa', description: 'Sửa thông tin thuốc (Manager)', allowedRanks: ['manager', 'admin'] }
    ]
  },
  diseases: {
    name: 'Quản lý Bệnh lý',
    icon: <FaStethoscope />,
    permissions: [
      { key: 'view', label: 'Xem thông tin bệnh lý', description: 'Xem thông tin bệnh lý' },
      { key: 'propose_create', label: 'Đề xuất thêm bệnh lý', description: 'Đề xuất thêm thông tin bệnh lý mới' },
      { key: 'propose_edit', label: 'Đề xuất sửa bệnh lý', description: 'Đề xuất sửa thông tin bệnh lý' },
      { key: 'create', label: 'Thêm mới', description: 'Thêm bệnh lý mới (Manager)', allowedRanks: ['manager', 'admin'] },
      { key: 'edit', label: 'Sửa', description: 'Sửa thông tin bệnh lý (Manager)', allowedRanks: ['manager', 'admin'] }
    ]
  },
  events_vouchers: {
    name: 'Sự kiện & Voucher',
    icon: <FaGift />,
    permissions: [
      { key: 'create_event', label: 'Thêm mới sự kiện', description: 'Thêm sự kiện mới' },
      { key: 'export_report', label: 'Xuất báo cáo', description: 'Xuất báo cáo sự kiện/voucher' },
      { key: 'create_voucher', label: 'Tạo voucher', description: 'Tạo mã giảm giá mới' },
      { key: 'edit_voucher', label: 'Sửa voucher', description: 'Chỉnh sửa thông tin voucher' },
      { key: 'delete_voucher', label: 'Xóa voucher', description: 'Xóa voucher' },
      { key: 'create_game', label: 'Tạo vòng quay game', description: 'Tạo minigame vòng quay' },
      { key: 'config_reward_system', label: 'Cấu hình đổi thưởng', description: 'Cấu hình hệ thống đổi thưởng và điểm danh' }
    ]
  },
    forum: {
    name: 'Quản lý Diễn đàn',
    icon: <FaComments />,
    permissions: [
      { key: 'create_topic',     label: 'Tạo topic',          description: 'Tạo chủ đề mới trong tab Topic', allowedDepts: ['support', 'content'] },
      { key: 'edit_topic',       label: 'Chỉnh sửa topic',    description: 'Sửa nội dung chủ đề', allowedDepts: ['support', 'content'] },
      { key: 'hide_topic',       label: 'Ẩn topic',           description: 'Chuyển topic về trạng thái ẩn', allowedDepts: ['support', 'content'] },
      { key: 'delete_topic',     label: 'Xóa topic',          description: 'Xóa vĩnh viễn topic', allowedDepts: ['support', 'content'] },
      { key: 'approve_question', label: 'Duyệt câu hỏi',      description: 'Phê duyệt câu hỏi chờ duyệt', allowedDepts: ['support', 'content'] },
      { key: 'hide_question',    label: 'Ẩn câu hỏi',         description: 'Ẩn câu hỏi đang hiển thị', allowedDepts: ['support', 'content'] },
      { key: 'delete_question',  label: 'Xóa câu hỏi',        description: 'Xóa câu hỏi trong tab báo cáo', allowedDepts: ['support', 'content'] }
    ]
  },
  community: {
    name: 'Nhóm cộng đồng',
    icon: <FaUsers />,
    permissions: [
      { key: 'assign_staff', label: 'Phân staff quản lý diễn đàn', description: 'Phân công nhân sự quản lý nhóm cộng đồng', allowedDepts: ['support'] }
    ]
  },
  contact: {
    name: 'Quản lý Liên hệ',
    icon: <FaComments />,
    permissions: [
      { key: 'reply_message', label: 'Trả lời tin nhắn liên hệ', description: 'Trả lời tin nhắn từ khách hàng', allowedDepts: ['support'] }
    ]
  },
  consultations: {
    name: 'Tư vấn trực tuyến',
    icon: <FaLightbulb />,
    permissions: [
      { key: 'view', label: 'Xem danh sách tư vấn', description: 'Xem lịch sử và danh sách tư vấn' },
      { key: 'notify_time', label: 'Nhận thông báo đến giờ tư vấn', description: 'Nhận alert khi sắp tới ca' },
      { key: 'monitor', label: 'Giám sát tư vấn', description: 'Giám sát luồng hoạt động chat/video' },
      { key: 'create', label: 'Tạo lịch', description: 'Tạo lịch tư vấn mới' },
      { key: 'edit', label: 'Sửa lịch', description: 'Chỉnh sửa thông tin lịch tư vấn' },
      { key: 'cancel', label: 'Từ chối / Hủy lịch', description: 'Hủy lịch tư vấn của bệnh nhân' },
      { key: 'approve', label: 'Xác nhận lịch', description: 'Phê duyệt lịch tư vấn' },
      { key: 'assign', label: 'Phân công', description: 'Chỉ định bác sĩ tư vấn', allowedRanks: ['manager', 'admin'] },
      { key: 'close', label: 'Đóng phòng tư vấn', description: 'Kết thúc phiên tư vấn', allowedRanks: ['manager', 'admin'] },
      { key: 'reply', label: 'Trả lời tư vấn', description: 'Trả lời trực tiếp (CSKH)', allowedDepts: ['support'] }
    ]
  },
  payments: {
    name: 'Giao dịch & Đối soát',
    icon: <FaCreditCard />,
    permissions: [
      { key: 'view', label: 'Xem giao dịch', description: 'Xem danh sách giao dịch thanh toán' },
      { key: 'verify', label: 'Đối soát', description: 'Kiểm tra và đối soát giao dịch' }
    ] // Đã xóa quyền config_account
  },
  refund_requests: {
    name: 'Quản lý Hoàn tiền',
    icon: <FaMoneyCheckAlt />,
    permissions: [
      { key: 'view', label: 'Xem danh sách', description: 'Xem danh sách yêu cầu hoàn tiền' },
      { key: 'approve', label: 'Xử lý hoàn tiền', description: 'Duyệt hoặc từ chối hoàn tiền' },
      { key: 'config_refund', label: 'Cấu hình hoàn tiền', description: 'Thiết lập chính sách hoàn tiền' }
    ]
  },
  // Đã xóa block reports ở đây
  statistics: {
    name: 'Thống kê',
    icon: <FaChartBar />,
    permissions: [
      { key: 'view', label: 'Xem thống kê', description: 'Xem thống kê tổng quan' },
      { key: 'revenue', label: 'Thống kê doanh thu', description: 'Xem biểu đồ doanh thu' },
      { key: 'export', label: 'Xuất báo cáo', description: 'Xuất file báo cáo tài chính' } // Thêm quyền xuất báo cáo vào đây
    ]
  },
  system_settings: {
    name: 'Cài đặt hệ thống',
    icon: <FaCogs />,
    permissions: [
      { key: 'view', label: 'Xem', description: 'Xem cài đặt hệ thống' },
      { key: 'view_audit_logs', label: 'Xem lịch sử chỉnh sửa', description: 'Xem logs thay đổi nội dung trang web' },
      { key: 'edit_home', label: 'Quản lý Trang chủ', description: 'Chỉnh sửa nội dung trang chủ' },
      { key: 'edit_about', label: 'Quản lý Giới thiệu', description: 'Chỉnh sửa trang giới thiệu' },
      { key: 'edit_facilities', label: 'Quản lý Cơ sở vật chất', description: 'Quản lý thông tin cơ sở vật chất' },
      { key: 'edit_equipment', label: 'Quản lý Trang thiết bị', description: 'Quản lý thông tin thiết bị y tế' },
      { key: 'edit_header_footer', label: 'Quản lý Header/Footer/Navbar', description: 'Chỉnh sửa thanh điều hướng, logo, footer' },
      { key: 'edit_contact', label: 'Quản lý Liên hệ', description: 'Cập nhật thông tin liên hệ, địa chỉ, bản đồ' },
      { key: 'edit_privacy', label: 'Quản lý Chính sách bảo mật', description: 'Chỉnh sửa chính sách bảo mật' },
      { key: 'edit_terms', label: 'Quản lý Điều khoản', description: 'Chỉnh sửa điều khoản sử dụng' }
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
      { key: 'assign_department', label: 'Phân ban', description: 'Phân nhân viên vào các phòng ban' },
      { key: 'assign_permissions', label: 'Phân quyền hạn', description: 'Phân quyền hạn cho các ban' },
      { key: 'view_history', label: 'Xem lịch sử', description: 'Xem lịch sử thay đổi của quản lý nhân sự' }
    ]
  },
  consultation_realtime: {
    name: 'Giám sát Chat Realtime',
    icon: <FaTools />,
    permissions: [
      { key: 'monitor', label: 'Xem danh sách', description: 'Xem danh sách và hoạt động hệ thống chat realtime' },
      { key: 'resolve_errors', label: 'Xử lý sự cố', description: 'Quản lý và xử lý các sự cố chat' }
    ]
  },
  video_call: {
    name: 'Giám sát Video Call',
    icon: <FaHeadset />,
    permissions: [
      { key: 'monitor', label: 'Xem danh sách', description: 'Xem danh sách và hoạt động phòng video call' },
      { key: 'resolve_errors', label: 'Xử lý sự cố', description: 'Quản lý và xử lý các sự cố video call' }
    ]
  }
};

const DEPARTMENT_MODULE_ACCESS = {
  system: ['system_settings', 'staff_management', 'consultation_realtime', 'video_call'],
  clinical: ['work_shift', 'appointments', 'medical_records', 'consultations', 'schedule', 'medicines', 'diseases'],
  support: ['forum', 'community', 'contact'],
  finance: ['payments', 'refund_requests', 'statistics'],
  content: ['articles', 'medicines', 'diseases', 'events_vouchers'],
  BGD: [] 
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
  // Audit logs for selected staff
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

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
      // Nếu staff có quyền staff_management → load thêm data phòng ban của mình
      const perms = userData?.role_info?.permissions ||
                    userData?.staff?.permissions ||
                    userData?.roleData?.permissions || {};
      const staffMgmt = perms['staff_management'];
      const hasStaffMgmt = Array.isArray(staffMgmt)
        ? staffMgmt.includes('view') || staffMgmt.includes('assign_permissions')
        : staffMgmt?.view === true || staffMgmt?.assign_permissions === true;
      if (hasStaffMgmt) {
        loadDepartmentStats();
        // Load phòng ban của staff (sẽ được set sau khi currentStaff load xong)
        const dept = userData?.role_info?.department ||
                     userData?.staff?.department ||
                     userData?.roleData?.department;
        if (dept) loadStaffByDepartment(dept);
      }
    } else if (userData.role === 'admin') {
      loadDepartmentStats();
      loadAllStaff();
      Object.keys(DEPARTMENTS).forEach(dept => loadStaffByDepartment(dept));
      setActiveDepartment('overview');
    }
    
    loadAllDoctors();
  }, []);

  // Auto-select department for staff manager / staff có quyền staff_management
  useEffect(() => {
    if (currentStaff && currentStaff.department) {
      setActiveDepartment(currentStaff.department);
      // Load staff của phòng ban nếu chưa có
      if (!staffByDepartment[currentStaff.department] ||
          staffByDepartment[currentStaff.department].length === 0) {
        loadStaffByDepartment(currentStaff.department);
      }
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
      // Load recent audit logs for this staff
      loadAuditLogs(selectedStaff.id);
    }
  }, [selectedStaff]);

  const loadAuditLogs = async (staffId) => {
    if (!staffId) return;
    try {
      setAuditLoading(true);
      const res = await auditService.getAuditLogs({ user_id: staffId, limit: 20 });
      if (res && res.success) {
        setAuditLogs(res.data || []);
      } else if (res && res.data) {
        setAuditLogs(res.data || []);
      } else {
        setAuditLogs([]);
      }
    } catch (error) {
      console.error('Load audit logs error:', error);
      setAuditLogs([]);
    } finally {
      setAuditLoading(false);
    }
  };

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
        // Refresh audit logs after permissions update
        loadAuditLogs(staffId);
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
    if (user.role === 'staff') {
      const perms = user?.role_info?.permissions ||
                    user?.staff?.permissions ||
                    user?.roleData?.permissions || {};
      const staffMgmt = perms['staff_management'];
      const hasAssignPerm = Array.isArray(staffMgmt)
        ? staffMgmt.includes('assign_permissions')
        : staffMgmt?.assign_permissions === true;
        
      // BẮT ĐẦU SỬA: Nếu có quyền IT, cho phép quản lý mọi phòng ban!
      if (hasAssignPerm) {
        return true;
      }

      // Nếu không có quyền IT, phải là Manager của đúng phòng ban
      if (currentStaff?.rank === 'manager' && currentStaff.department === activeDepartment) {
        return true;
      }
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
                        {/* Sửa dòng dưới để hiện vai trò nếu là Tài chính */}
                        <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                           {staff.code} | 
                           {staff.department === 'finance' && staff.job_description ? (
                             <span style={{color: '#2e7d32', fontWeight: '500'}}>{staff.job_description}</span>
                           ) : (
                             'Staff'
                           )}
                        </span>
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

      {/* 2. Tabs Bar - Hiển thị tất cả tab nếu có quyền IT */}
      <div className="smp-tabs-bar">
        {/* Kiểm tra nhanh nếu là Admin HOẶC Staff có quyền quản lý nhân sự (canManage = true) */}
        {(user?.role === 'admin' || canManage) ? (
          <>
            <button 
                className={`dept-tab ${activeDepartment === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveDepartment('overview')}
            >
                <FaChartPie /> Tổng quan
            </button>
            <div style={{width: 1, height: 20, background: '#e0e0e0', margin: '0 8px'}}></div>
            {Object.entries(DEPARTMENTS).map(([key, dept]) => {
                const isActive = activeDepartment === key;
                const deptColor = departmentColors[key] || '#4CAF50'; 

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
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = `${deptColor}15`; }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
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
        ) : (
          // Dành cho Staff bình thường (không có quyền phân quyền) chỉ thấy phòng ban mình
          user?.role === 'staff' && currentStaff && (
          <>
            <button 
                className={`dept-tab ${activeDepartment === currentStaff.department ? 'active' : ''}`}
                onClick={() => setActiveDepartment(currentStaff.department)}
                style={activeDepartment === currentStaff.department ? {
                  backgroundColor: `${departmentColors[currentStaff.department] || '#4CAF50'}20`,
                  color: departmentColors[currentStaff.department] || '#4CAF50',
                  borderBottom: `3px solid ${departmentColors[currentStaff.department] || '#4CAF50'}`,
                  fontWeight: 600
                } : {}}
            >
                {DEPARTMENTS[currentStaff.department]?.icon} {DEPARTMENTS[currentStaff.department]?.name}
            </button>
            <div style={{width: 1, height: 20, background: '#e0e0e0', margin: '0 8px'}}></div>
            <button 
                className={`dept-tab ${activeDepartment === 'history' ? 'active' : ''}`}
                onClick={() => setActiveDepartment('history')}
            >
                <FaChartLine /> Lịch sử
            </button>
          </>
          )
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
                                        {/* --- SỬA ĐOẠN NÀY --- */}
                                    <p style={{margin:0, color:'#666', fontSize: 13, display: 'flex', alignItems: 'center', gap: '6px'}}>
                                        {/* Nếu là tài chính thì ưu tiên hiện Job Description (Vai trò) */}
                                        {selectedStaff.department === 'finance' && selectedStaff.job_description ? (
                                            <span style={{fontWeight: 'bold', color: '#2e7d32'}}>{selectedStaff.job_description}</span>
                                        ) : (
                                            getRankLabel(selectedStaff.rank)
                                        )}
                                        <span>|</span>
                                        <span>{DEPARTMENTS[activeDepartment]?.name}</span>
                                    </p>
                                    {/* ------------------- */}
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
                                    
                                    {/* Permission Modules Grid — Group theo phòng ban liên quan */}
                                    <div style={{display: 'flex', flexDirection: 'column', gap: '28px', maxHeight: '500px', overflowY: 'auto', paddingRight: '8px'}}>
                                      
                                      {/* Định nghĩa group: phòng ban nào chứa module nào */}
                                      {(() => {
                                        const MODULE_GROUPS = [
                                          {
                                            dept: 'clinical',
                                            label: 'Vận hành lâm sàng',
                                            // ĐÃ XÓA 'patients' khỏi mảng này
                                            modules: ['appointments', 'medical_records', 'consultations', 'schedule', 'work_shift']
                                          },
                                          {
                                            dept: 'system',
                                            label: 'Hệ thống & IT',
                                            modules: ['system_settings', 'staff_management', 'consultation_realtime', 'video_call']
                                          },
                                          {
                                            dept: 'support',
                                            label: 'Chăm sóc khách hàng',
                                            modules: ['forum', 'community', 'contact']
                                          },
                                          {
                                            dept: 'finance',
                                            label: 'Tài chính kế toán',
                                            modules: ['payments', 'refund_requests', 'statistics'] // Xóa 'reports'
                                          },
                                          {
                                            dept: 'content',
                                            label: 'Nội dung & Truyền thông',
                                            modules: ['articles', 'medicines', 'diseases', 'events_vouchers']
                                          }
                                        ];

                                        // Chỉ hiển thị group thuộc phòng ban của nhân viên + group 'all'
                                        // Chỉ hiển thị đúng group của phòng ban nhân viên
                                        const staffDept = selectedStaff?.department;
                                        const filteredGroups = MODULE_GROUPS.filter(
                                          g => g.dept === staffDept
                                        );

                                        return filteredGroups.map(group => (
                                          <div key={group.dept}>
                                            {/* Group Header */}
                                            <div style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '8px',
                                              marginBottom: '12px',
                                              paddingBottom: '8px',
                                              borderBottom: '2px solid #E8F5E9'
                                            }}>
                                              <span style={{
                                                background: '#4CAF50',
                                                color: 'white',
                                                fontSize: '11px',
                                                fontWeight: 700,
                                                padding: '3px 10px',
                                                borderRadius: '12px',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px'
                                              }}>
                                                {group.label}
                                              </span>
                                            </div>

                                            {/* Modules trong group này */}
                                            <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                                              {group.modules.map(moduleKey => {
                                                const module = PERMISSION_MODULES[moduleKey];
                                                if (!module) return null;

                                                // Lấy permissions hiện tại của module
                                                const modulePermissions = tempPermissions[moduleKey];

                                                // Xác định đây có phải module "chính" của phòng ban nhân viên không
                                                // Xác định đây có phải module "chính" của phòng ban nhân viên không
                                                // Xác định đây có phải module "chính" của phòng ban nhân viên không
                                                const staffDepartment = selectedStaff.department;
                                                const allowedModules = DEPARTMENT_MODULE_ACCESS[staffDepartment] || [];
                                                const isPrimary = selectedStaff.rank === 'admin' || allowedModules.includes(moduleKey);

                                                // --- LỌC QUYỀN TRƯỚC KHI RENDER ---
                                                const visiblePermissions = module.permissions.filter(perm => {
                                                  // 1. Loại bỏ quyền không thuộc phòng ban (Ví dụ: Trả lời tư vấn chỉ cho CSKH)
                                                  if (perm.allowedDepts && !perm.allowedDepts.includes(selectedStaff.department)) return false;
                                                  // 2. Loại bỏ quyền của Quản lý nếu nhân viên chỉ là Staff (Phê duyệt, phân công)
                                                  if (perm.allowedRanks && !perm.allowedRanks.includes(selectedStaff.rank)) return false;
                                                  return true;
                                                });

                                                // Ẩn module nếu không có quyền nào hiển thị cho nhân viên này
                                                if (visiblePermissions.length === 0) return null;

                                                // Kiểm tra trạng thái "Check All" dựa trên các quyền ĐANG HIỂN THỊ
                                                const isAllChecked = Array.isArray(modulePermissions) && 
                                                  visiblePermissions.length > 0 &&
                                                  visiblePermissions.every(p => modulePermissions.includes(p.key));

                                                return (
                                                  <div key={moduleKey} className="permission-module" style={{
                                                    background: isPrimary ? '#FAFAFA' : '#F5F5F5',
                                                    border: isPrimary ? '1px solid #E0E0E0' : '1px dashed #BDBDBD',
                                                    borderRadius: '8px',
                                                    padding: '16px',
                                                    opacity: isPrimary ? 1 : 0.6
                                                  }}>
                                                    {/* Module Header + Check all */}
                                                    <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', paddingBottom: '10px', borderBottom: '2px solid #E0E0E0'}}>
                                                      <span style={{fontSize: '20px', color: isPrimary ? '#4CAF50' : '#BDBDBD'}}>{module.icon}</span>
                                                      <h5 style={{margin: 0, fontSize: '14px', fontWeight: 600, color: isPrimary ? '#333' : '#999'}}>{module.name}</h5>
                                                      {!isPrimary && (
                                                        <span style={{fontSize: '11px', color: '#BDBDBD', marginLeft: '4px'}}>
                                                          (không thuộc phòng ban này)
                                                        </span>
                                                      )}
                                                      <label style={{marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 500, cursor: selectedStaff.rank === 'admin' ? 'not-allowed' : 'pointer'}}>
                                                        <input
                                                          type="checkbox"
                                                          disabled={selectedStaff.rank === 'admin'}
                                                          checked={isAllChecked}
                                                          onChange={e => {
                                                            if (e.target.checked) {
                                                              const currentPerms = Array.isArray(tempPermissions[moduleKey]) ? tempPermissions[moduleKey] : [];
                                                              const keysToAdd = visiblePermissions.map(p => p.key);
                                                              const newPerms = [...new Set([...currentPerms, ...keysToAdd])];
                                                              setTempPermissions({ ...tempPermissions, [moduleKey]: newPerms });
                                                            } else {
                                                              const currentPerms = Array.isArray(tempPermissions[moduleKey]) ? tempPermissions[moduleKey] : [];
                                                              const keysToRemove = visiblePermissions.map(p => p.key);
                                                              const newPerms = currentPerms.filter(k => !keysToRemove.includes(k));
                                                              setTempPermissions({ ...tempPermissions, [moduleKey]: newPerms });
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
                                                          <li>Chỉ phòng <strong>Content</strong> và <strong>CSKH</strong> quản lý diễn đàn</li>
                                                          <li>Người có quyền <strong>moderate_questions</strong> sẽ làm moderator cho topic được chỉ định</li>
                                                        </ul>
                                                      </div>
                                                    )}

                                                    {/* Permissions Grid */}
                                                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px'}}>
                                                      {visiblePermissions.map(perm => {
                                                        const hasPermission = Array.isArray(modulePermissions)
                                                          ? modulePermissions.includes(perm.key)
                                                          : false;

                                                        return (
                                                          <div
                                                            key={perm.key}
                                                            onClick={() => {
                                                              if (selectedStaff.rank === 'admin') return;
                                                              const currentPerms = Array.isArray(tempPermissions[moduleKey]) ? tempPermissions[moduleKey] : [];
                                                              let newPerms;
                                                              if (hasPermission) {
                                                                newPerms = currentPerms.filter(p => p !== perm.key);
                                                              } else {
                                                                newPerms = [...currentPerms, perm.key];
                                                              }
                                                              setTempPermissions({...tempPermissions, [moduleKey]: newPerms});
                                                            }}
                                                            style={{
                                                              background: hasPermission ? '#E8F5E9' : 'white',
                                                              border: hasPermission ? '2px solid #4CAF50' : '1px solid #E0E0E0',
                                                              borderRadius: '6px',
                                                              padding: '12px',
                                                              cursor: selectedStaff.rank === 'admin' ? 'not-allowed' : 'pointer',
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
                                        ));
                                      })()}

                                      {/* Audit history for this staff (recent) */}
                                      <div style={{ marginTop: 20, borderTop: '1px dashed #eee', paddingTop: 12 }}>
                                        <h5 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Lịch sử thay đổi (Audit)</h5>
                                        {auditLoading ? (
                                          <div style={{ color: '#666', marginTop: 8 }}>Đang tải lịch sử...</div>
                                        ) : (
                                          <div style={{ marginTop: 8, maxHeight: 220, overflowY: 'auto' }}>
                                            {(!auditLogs || auditLogs.length === 0) ? (
                                              <div style={{ color: '#777' }}>Chưa có lịch sử thay đổi</div>
                                            ) : (
                                              auditLogs.map(log => (
                                                <div key={log.id} style={{ padding: '8px 10px', borderRadius: 8, background: '#fafafa', marginBottom: 8, border: '1px solid #f0f0f0' }}>
                                                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                                    <div style={{ fontSize: 13, fontWeight: 600 }}>{auditService.formatActionType(log.action_type)}</div>
                                                    <div style={{ fontSize: 12, color: '#999' }}>{new Date(log.created_at).toLocaleString('vi-VN')}</div>
                                                  </div>
                                                  <div style={{ fontSize: 13, color: '#444', marginTop: 6 }}>{log.details ? (typeof log.details === 'string' ? log.details : JSON.stringify(log.details)) : ''}</div>
                                                  <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>Thực hiện bởi: {log.user?.full_name || log.user?.email || 'Hệ thống'}</div>
                                                </div>
                                              ))
                                            )}
                                          </div>
                                        )}
                                      </div>

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
