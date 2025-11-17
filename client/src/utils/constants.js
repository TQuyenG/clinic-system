// client/src/utils/constants.js - COMPLETE

// ========================================
// WORK SHIFTS - Ca làm việc
// ========================================
export const FORUM_ROUTE = '/dien-dan-suc-khoe';
export const FORUM_QUESTION_ROUTE = `${FORUM_ROUTE}/cau-hoi`;

export const WORK_SHIFTS = {
  MORNING: {
    label: 'Ca sáng',
    start: '07:00',
    end: '11:00',
    icon: '☀️'
  },
  AFTERNOON: {
    label: 'Ca chiều',
    start: '13:00',
    end: '17:00',
    icon: '🌤️'
  },
  EVENING: {
    label: 'Ca tối',
    start: '18:00',
    end: '20:00',
    icon: '🌙'
  }
};

// ========================================
// TIME SLOTS - Các khung giờ
// ========================================
export const TIME_SLOTS = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'
];

// ========================================
// LEAVE REASONS - Lý do nghỉ phép
// ========================================
export const LEAVE_REASONS = [
  'Việc gia đình',
  'Bệnh tật',
  'Nghỉ phép năm',
  'Thai sản',
  'Tang lễ',
  'Cưới hỏi',
  'Học tập',
  'Công tác',
  'Khác'
];

// ========================================
// SCHEDULE STATUS - Trạng thái lịch
// ========================================
export const SCHEDULE_STATUS = {
  AVAILABLE: {
    value: 'available',
    label: 'Còn trống',
    color: '#10b981',
    icon: '✓',
    bgColor: '#d1fae5'
  },
  BOOKED: {
    value: 'booked',
    label: 'Đã đặt',
    color: '#667eea',
    icon: '📅',
    bgColor: '#e0e7ff'
  },
  PENDING: {
    value: 'pending',
    label: 'Chờ duyệt',
    color: '#f59e0b',
    icon: '⏳',
    bgColor: '#fef3c7'
  },
  APPROVED: {
    value: 'approved',
    label: 'Đã duyệt',
    color: '#3b82f6',
    icon: '✅',
    bgColor: '#dbeafe'
  },
  REJECTED: {
    value: 'rejected',
    label: 'Từ chối',
    color: '#ef4444',
    icon: '❌',
    bgColor: '#fee2e2'
  },
  CANCELLED: {
    value: 'cancelled',
    label: 'Đã hủy',
    color: '#6b7280',
    icon: '🚫',
    bgColor: '#f3f4f6'
  }
};

// ========================================
// SCHEDULE TYPES - Loại lịch
// ========================================
export const SCHEDULE_TYPES = {
  FIXED: {
    value: 'fixed',
    label: 'Lịch cố định',
    color: '#10b981',
    icon: '📅'
  },
  OVERTIME: {
    value: 'overtime',
    label: 'Tăng ca',
    color: '#f59e0b',
    icon: '⚡'
  },
  LEAVE: {
    value: 'leave',
    label: 'Nghỉ phép',
    color: '#ef4444',
    icon: '🖐️'
  }
};

// ========================================
// WEEKDAYS - Các ngày trong tuần
// ========================================
export const WEEKDAYS = [
  { value: 1, label: 'T2', fullLabel: 'Thứ 2' },
  { value: 2, label: 'T3', fullLabel: 'Thứ 3' },
  { value: 3, label: 'T4', fullLabel: 'Thứ 4' },
  { value: 4, label: 'T5', fullLabel: 'Thứ 5' },
  { value: 5, label: 'T6', fullLabel: 'Thứ 6' },
  { value: 6, label: 'T7', fullLabel: 'Thứ 7' },
  { value: 0, label: 'CN', fullLabel: 'Chủ nhật' }
];

// ========================================
// API ENDPOINTS
// ========================================
export const API_ENDPOINTS = {
  SCHEDULES: '/api/schedules',
  NOTIFICATIONS: '/api/notifications',
  USERS: '/api/users'
};