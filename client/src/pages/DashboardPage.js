// client/src/pages/DashboardPage.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Responsive, WidthProvider } from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import { useAuth } from '../contexts/AuthContext';
import usePermissions from '../hooks/usePermissions';
import appointmentService from '../services/appointmentService';
import paymentService from '../services/paymentService';
import { 
  FaClinicMedical, FaSignOutAlt, FaCalendarAlt, FaChevronLeft, 
  FaChevronRight, FaNewspaper, FaExclamationTriangle, FaCheckCircle, 
  FaClock, FaEyeSlash, FaHourglassHalf, FaCoins, FaEdit, FaSave, FaUndoAlt,
  FaUsers, FaComments, FaBusinessTime, FaUserCheck
} from 'react-icons/fa';
import './DashboardPage.css';

const ResponsiveGridLayout = WidthProvider(Responsive);
const DASHBOARD_LAYOUT_STORAGE_KEY = 'clinic-dashboard-layout-v4';

// Layout mặc định đã được thiết kế lại to, rõ, đẹp mắt cho lần đầu truy cập
const DEFAULT_LAYOUTS = {
  lg: [
    { i: 'articles', x: 0, y: 0, w: 4, h: 4, minW: 3, minH: 3 },
    { i: 'appointments', x: 4, y: 0, w: 4, h: 4, minW: 4, minH: 3 },
    { i: 'payments', x: 8, y: 0, w: 4, h: 4, minW: 3, minH: 3 },
    { i: 'schedules', x: 0, y: 4, w: 4, h: 4, minW: 3, minH: 3 },
    { i: 'forum', x: 4, y: 4, w: 4, h: 4, minW: 3, minH: 3 },
    { i: 'community', x: 8, y: 4, w: 4, h: 4, minW: 3, minH: 3 }
  ],
  md: [
    { i: 'articles', x: 0, y: 0, w: 4, h: 4 },
    { i: 'appointments', x: 4, y: 0, w: 4, h: 4 },
    { i: 'payments', x: 8, y: 0, w: 4, h: 4 },
    { i: 'schedules', x: 0, y: 4, w: 4, h: 4 },
    { i: 'forum', x: 4, y: 4, w: 4, h: 4 },
    { i: 'community', x: 8, y: 4, w: 4, h: 4 }
  ],
  sm: [
    { i: 'articles', x: 0, y: 0, w: 12, h: 4 },
    { i: 'appointments', x: 0, y: 4, w: 12, h: 4 },
    { i: 'payments', x: 0, y: 8, w: 12, h: 4 },
    { i: 'schedules', x: 0, y: 12, w: 12, h: 4 },
    { i: 'forum', x: 0, y: 16, w: 12, h: 4 },
    { i: 'community', x: 0, y: 20, w: 12, h: 4 }
  ],
  xs: [
    { i: 'articles', x: 0, y: 0, w: 1, h: 4 },
    { i: 'appointments', x: 0, y: 4, w: 1, h: 4 },
    { i: 'payments', x: 0, y: 8, w: 1, h: 4 },
    { i: 'schedules', x: 0, y: 12, w: 1, h: 4 },
    { i: 'forum', x: 0, y: 16, w: 1, h: 4 },
    { i: 'community', x: 0, y: 20, w: 1, h: 4 }
  ],
  xxs: [
    { i: 'articles', x: 0, y: 0, w: 1, h: 4 },
    { i: 'appointments', x: 0, y: 4, w: 1, h: 4 },
    { i: 'payments', x: 0, y: 8, w: 1, h: 4 },
    { i: 'schedules', x: 0, y: 12, w: 1, h: 4 },
    { i: 'forum', x: 0, y: 16, w: 1, h: 4 },
    { i: 'community', x: 0, y: 20, w: 1, h: 4 }
  ]
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isAdmin, hasAnyPermission, canAccessModule } = usePermissions();
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isBoardEditMode, setIsBoardEditMode] = useState(false);
  
  // Trạng thái layouts
  const [layouts, setLayouts] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_LAYOUTS;
    try {
      const saved = window.localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_LAYOUTS;
    } catch {
      return DEFAULT_LAYOUTS;
    }
  });

  const [articleStats, setArticleStats] = useState(null);
  const [loadingArticleStats, setLoadingArticleStats] = useState(false);
  const [appointmentStats, setAppointmentStats] = useState(null);
  const [loadingAppointmentStats, setLoadingAppointmentStats] = useState(false);
  const [paymentStats, setPaymentStats] = useState(null);
  const [loadingPaymentStats, setLoadingPaymentStats] = useState(false);
  const [scheduleStats, setScheduleStats] = useState(null);
  const [loadingScheduleStats, setLoadingScheduleStats] = useState(false);
  const [forumStats, setForumStats] = useState(null);
  const [loadingForumStats, setLoadingForumStats] = useState(false);
  const [communityStats, setCommunityStats] = useState(null);
  const [loadingCommunityStats, setLoadingCommunityStats] = useState(false);
  const [leaveStats, setLeaveStats] = useState(null);
  const [loadingLeaveStats, setLoadingLeaveStats] = useState(false);
  const [overtimeStats, setOvertimeStats] = useState(null);
  const [loadingOvertimeStats, setLoadingOvertimeStats] = useState(false);
  const [registrationStats, setRegistrationStats] = useState(null);
  const [loadingRegistrationStats, setLoadingRegistrationStats] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState(null);
  const [loadingCalendarEvents, setLoadingCalendarEvents] = useState(false);
  const [staffProfile, setStaffProfile] = useState(null);
  const [hoveredDay, setHoveredDay] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const canViewArticleWorkload = isAdmin || hasAnyPermission('articles', ['create', 'create_draft', 'edit', 'delete', 'hide', 'approve', 'approve_medicine', 'approve_disease']);
  const canViewAppointmentWorkload = isAdmin || canAccessModule('appointments');
  const canViewPaymentWorkload = isAdmin || canAccessModule('payments');
  
  // Kiểm tra quyền xem các widget mới
  const canViewScheduleWorkload = !!user?.role && user.role !== 'patient';
  const canViewForumWorkload = isAdmin || user?.role === 'staff' || user?.role === 'doctor' || hasAnyPermission('forum', ['create_topic', 'edit_topic', 'delete_topic', 'toggle_topic', 'assign_moderators']);
  const canViewCommunityWorkload = isAdmin || ['staff', 'doctor'].includes(user?.role);
  
  // Kiểm tra quyền phê duyệt theo permission thực tế
  const canApproveLeave = isAdmin || hasAnyPermission('work_shift', ['approve_leave']);
  const canApproveOvertime = isAdmin || hasAnyPermission('work_shift', ['approve_overtime']);
  const canApproveRegistration = isAdmin || hasAnyPermission('work_shift', ['approve_shift']);
  const canViewApprovalStats = canApproveLeave || canApproveOvertime || canApproveRegistration;

  useEffect(() => {
    const timerId = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);

  // Fetch Staff Profile (để biết rank)
  useEffect(() => {
    const fetchStaffProfile = async () => {
      if (user?.role !== 'staff' && !isAdmin) return;
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:3001/api/users/profile/role-info', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data?.success && response.data.user?.roleData) {
          setStaffProfile(response.data.user.roleData);
        }
      } catch (error) {
        console.error('Error fetching staff profile:', error);
      }
    };
    fetchStaffProfile();
  }, [user, isAdmin]);

  // Fetch Bài Viết
  useEffect(() => {
    const fetchArticleStats = async () => {
      if (!canViewArticleWorkload) return;
      try {
        setLoadingArticleStats(true);
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:3001/api/articles', {
          params: { page: 1, limit: 1, sort_by: 'created_at', sort_order: 'DESC' },
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data?.success) setArticleStats(response.data.stats || null);
      } catch (error) {
        console.error('Error fetching article stats:', error);
      } finally {
        setLoadingArticleStats(false);
      }
    };
    fetchArticleStats();
  }, [canViewArticleWorkload]);

  // Fetch Lịch Hẹn
  useEffect(() => {
    const fetchAppointmentStats = async () => {
      if (!canViewAppointmentWorkload) return;
      try {
        setLoadingAppointmentStats(true);
        const params = { page: 1, limit: 1, sort_by: 'appointment_date', sort_order: 'DESC' };
        const response = isAdmin ? await appointmentService.getAllAppointments(params)
          : user?.role === 'doctor' ? await appointmentService.getDoctorAppointments(params)
          : await appointmentService.getStaffManagedAppointments();

        if (response.data?.success) {
          const appointments = response.data.data || [];
          const statistics = Array.isArray(response.data.statistics) ? response.data.statistics : [];
          const statusCounts = statistics.length > 0
            ? statistics.reduce((acc, item) => { acc[item.status] = Number(item.count) || 0; return acc; }, {})
            : appointments.reduce((acc, appt) => {
                const status = appt?.status || 'unknown';
                acc[status] = (acc[status] || 0) + 1;
                return acc;
              }, {});
          const total = response.data.pagination?.totalItems ?? appointments.length;
          setAppointmentStats({ total, statusCounts });
        }
      } catch (error) {
        console.error('Error fetching appointment stats:', error);
      } finally {
        setLoadingAppointmentStats(false);
      }
    };
    fetchAppointmentStats();
  }, [canViewAppointmentWorkload, isAdmin, user?.role]);

  // Fetch Thanh Toán
  useEffect(() => {
    const fetchPaymentStats = async () => {
      if (!canViewPaymentWorkload) return;
      try {
        setLoadingPaymentStats(true);
        const statusList = ['pending', 'paid', 'failed', 'refunded'];
        const statusResults = await Promise.all(
          statusList.map(async (status) => {
            const response = await paymentService.getAllPayments({ page: 1, limit: 1, status });
            const total = response.data?.pagination?.total ?? response.data?.pagination?.totalItems ?? response.data?.data?.length ?? 0;
            return [status, Number(total) || 0];
          })
        );
        const allResponse = await paymentService.getAllPayments({ page: 1, limit: 1 });
        const total = allResponse.data?.pagination?.total ?? allResponse.data?.pagination?.totalItems ?? allResponse.data?.data?.length ?? 0;
        setPaymentStats({ total: Number(total) || 0, statusCounts: Object.fromEntries(statusResults) });
      } catch (error) {
        console.error('Error fetching payment stats:', error);
      } finally {
        setLoadingPaymentStats(false);
      }
    };
    fetchPaymentStats();
  }, [canViewPaymentWorkload]);

  // Fetch Lịch Làm Việc (chỉ của chính user nếu là admin)
  useEffect(() => {
    const fetchScheduleStats = async () => {
      if (!canViewScheduleWorkload) return;
      try {
        setLoadingScheduleStats(true);
        const token = localStorage.getItem('token');
        // Nếu là admin, chỉ lấy lịch của chính mình
        const params = isAdmin && user?.id ? { user_id: user.id } : {};
        const response = await axios.get('http://localhost:3001/api/schedules/stats', {
          headers: { Authorization: `Bearer ${token}` },
          params
        });
        if (response.data?.success) {
          setScheduleStats(response.data.data || {});
        }
      } catch (error) {
        console.error('Error fetching schedule stats:', error);
        setScheduleStats({});
      } finally {
        setLoadingScheduleStats(false);
      }
    };
    fetchScheduleStats();
  }, [canViewScheduleWorkload, isAdmin, user?.id]);

  // Fetch Diễn Đàn
  useEffect(() => {
    const fetchForumStats = async () => {
      if (!canViewForumWorkload) return;
      try {
        setLoadingForumStats(true);
        const response = await axios.get('http://localhost:3001/api/forum/stats/overview');
        if (response.data?.success) {
          setForumStats(response.data.data || {});
        }
      } catch (error) {
        console.error('Error fetching forum stats:', error);
        setForumStats({});
      } finally {
        setLoadingForumStats(false);
      }
    };
    fetchForumStats();
  }, [canViewForumWorkload]);

  // Fetch Nhóm Cộng Đồng
  useEffect(() => {
    const fetchCommunityStats = async () => {
      if (!canViewCommunityWorkload) return;
      try {
        setLoadingCommunityStats(true);
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:3001/api/community/groups', {
          params: { page: 1, limit: 10, status: 'approved' },
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data?.success) {
          const totalGroups = response.data.pagination?.total || response.data.data?.length || 0;
          setCommunityStats({
            totalGroups,
            pendingGroups: response.data.pendingCount || 0,
            activeMembers: response.data.totalMembers || 0
          });
        }
      } catch (error) {
        console.error('Error fetching community stats:', error);
        setCommunityStats({ totalGroups: 0, pendingGroups: 0, activeMembers: 0 });
      } finally {
        setLoadingCommunityStats(false);
      }
    };
    fetchCommunityStats();
  }, [canViewCommunityWorkload]);

  // Fetch Đơn Xin Nghỉ Phép (chỉ Admin/Manager)
  useEffect(() => {
    const fetchLeaveStats = async () => {
      if (!canViewApprovalStats) return;
      try {
        setLoadingLeaveStats(true);
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:3001/api/leave-requests/pending', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data?.success) {
          setLeaveStats({
            total: response.data.pagination?.total || response.data.data?.length || 0,
            data: response.data.data || []
          });
        }
      } catch (error) {
        console.error('Error fetching leave stats:', error);
        setLeaveStats({ total: 0, data: [] });
      } finally {
        setLoadingLeaveStats(false);
      }
    };
    fetchLeaveStats();
  }, [canViewApprovalStats]);

  // Fetch Đơn Tăng Ca (chỉ Admin/Manager)
  useEffect(() => {
    const fetchOvertimeStats = async () => {
      if (!canViewApprovalStats) return;
      try {
        setLoadingOvertimeStats(true);
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:3001/api/schedules/pending-overtimes', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data?.success) {
          setOvertimeStats({
            total: response.data.pagination?.total || response.data.data?.length || 0,
            data: response.data.data || []
          });
        }
      } catch (error) {
        console.error('Error fetching overtime stats:', error);
        setOvertimeStats({ total: 0, data: [] });
      } finally {
        setLoadingOvertimeStats(false);
      }
    };
    fetchOvertimeStats();
  }, [canViewApprovalStats]);

  // Fetch Đơn Đăng Ký Lịch (chỉ Admin/Manager)
  useEffect(() => {
    const fetchRegistrationStats = async () => {
      if (!canViewApprovalStats) return;
      try {
        setLoadingRegistrationStats(true);
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:3001/api/schedules/pending-registrations', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data?.success) {
          setRegistrationStats({
            total: response.data.pagination?.total || response.data.data?.length || 0,
            data: response.data.data || []
          });
        }
      } catch (error) {
        console.error('Error fetching registration stats:', error);
        setRegistrationStats({ total: 0, data: [] });
      } finally {
        setLoadingRegistrationStats(false);
      }
    };
    fetchRegistrationStats();
  }, [canViewApprovalStats]);

  // Fetch Calendar Events (Lịch Làm + Lịch Hẹn) - chỉ của chính user nếu là admin
  useEffect(() => {
    const fetchCalendarEvents = async () => {
      if (!canViewScheduleWorkload && !canViewAppointmentWorkload) return;
      try {
        setLoadingCalendarEvents(true);
        const token = localStorage.getItem('token');
        const formatDate = (date) => {
          const y = date.getFullYear();
          const m = String(date.getMonth() + 1).padStart(2, '0');
          const d = String(date.getDate()).padStart(2, '0');
          return `${y}-${m}-${d}`;
        };
        const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
        const dateFrom = formatDate(monthStart);
        const dateTo = formatDate(monthEnd);
        // Nếu là admin, chỉ lấy lịch của chính mình
        const params = {
          date_from: dateFrom,
          date_to: dateTo,
          types: 'schedules,appointments,leaves',
          ...(isAdmin && user?.id ? { user_id: user.id } : {})
        };
        const response = await axios.get('http://localhost:3001/api/calendar/view', {
          params,
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data?.success) {
          setCalendarEvents(response.data.data || {});
        }
      } catch (error) {
        console.error('Error fetching calendar events:', error);
        setCalendarEvents({});
      } finally {
        setLoadingCalendarEvents(false);
      }
    };
    fetchCalendarEvents();
  }, [canViewScheduleWorkload, canViewAppointmentWorkload, currentMonth, isAdmin, user?.id]);

  // Hàm xử lý lưu layout
  const handleLayoutChange = (currentLayout, allLayouts) => {
    setLayouts(allLayouts);
    window.localStorage.setItem(DASHBOARD_LAYOUT_STORAGE_KEY, JSON.stringify(allLayouts));
  };

  const handleLogout = () => {
    if (window.confirm('Bạn có chắc chắn muốn đăng xuất?')) logout();
  };

  // Logic Đồng hồ
  const hours = currentTime.getHours() % 12;
  const minutes = currentTime.getMinutes();
  const seconds = currentTime.getSeconds();
  const hourDeg = (hours * 30) + (minutes * 0.5);
  const minuteDeg = (minutes * 6) + (seconds * 0.1);
  const secondDeg = seconds * 6;

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  // Logic Lịch
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    return { daysInMonth: lastDay.getDate(), startingDayOfWeek: firstDay.getDay() };
  };
  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);
  const today = currentTime.getDate();
  const isCurrentMonth = currentMonth.getMonth() === currentTime.getMonth() && currentMonth.getFullYear() === currentTime.getFullYear();
  const monthName = currentMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });

  const previousMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  // Helper: Lấy events của một ngày từ calendarEvents
  const getEventsForDate = (day) => {
    if (!calendarEvents) return { schedules: [], appointments: [], leaves: [] };
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return {
      schedules: calendarEvents.schedules?.filter(e => e.date === dateStr) || [],
      appointments: calendarEvents.appointments?.filter(e => e.appointment_date?.startsWith(dateStr)) || [],
      leaves: calendarEvents.leaves?.filter(e => {
        const dateFrom = e.date_from?.split('T')[0];
        const dateTo = e.date_to?.split('T')[0];
        return dateStr >= dateFrom && dateStr <= dateTo;
      }) || []
    };
  };

  const getDisplayEventsForDate = (day) => {
    const events = getEventsForDate(day);
    const sortedAppointments = [...events.appointments].sort((a, b) => {
      const ta = a.appointment_start_time || '00:00';
      const tb = b.appointment_start_time || '00:00';
      return ta.localeCompare(tb);
    });
    const sortedSchedules = [...events.schedules].sort((a, b) => {
      const ta = a.start_time || '00:00';
      const tb = b.start_time || '00:00';
      return ta.localeCompare(tb);
    });

    // Ưu tiên hiển thị lịch hẹn: nếu có lịch hẹn thì ẩn danh sách lịch làm trong tooltip
    if (sortedAppointments.length > 0) {
      return {
        schedules: [],
        appointments: sortedAppointments,
        leaves: events.leaves
      };
    }

    return {
      schedules: sortedSchedules,
      appointments: [],
      leaves: events.leaves
    };
  };

  const getDateStringForDay = (day) => `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const handleCalendarDayClick = (day) => {
    const date = getDateStringForDay(day);
    const rawEvents = getEventsForDate(day);

    if (rawEvents.appointments.length > 0) {
      navigate(`/quan-ly-lich-hen?date=${date}`);
      return;
    }

    navigate(isAdmin ? `/quan-ly-lich-lam-viec?date=${date}` : `/lich-cua-toi?date=${date}`);
  };

  // Helper: Check xem ngày có events không
  const hasEventsOnDate = (day) => {
    const events = getDisplayEventsForDate(day);
    return events.schedules.length + events.appointments.length + events.leaves.length > 0;
  };

  // Helper: Get class để highlight ngày có events
  const getDateEventClass = (day) => {
    const events = getDisplayEventsForDate(day);
    if (events.appointments.length > 0) return 'has-appointment';
    if (events.schedules.length > 0) return 'has-schedule';
    if (events.leaves.length > 0) return 'has-leave';
    return '';
  };

  const openArticleManagement = (query = '') => navigate(`/quan-ly-bai-viet${query}`);
  const openAppointmentManagement = (query = '') => navigate(`/quan-ly-lich-hen${query}`);
  const getAppointmentCount = (status) => Number(appointmentStats?.statusCounts?.[status] || 0);
  const getPaymentCount = (status) => Number(paymentStats?.statusCounts?.[status] || 0);

  const boardWidgets = [
    {
      id: 'articles',
      visible: canViewArticleWorkload,
      title: 'Bài viết cần xử lý',
      loading: loadingArticleStats,
      totalValue: articleStats?.action_required || 0,
      totalIcon: FaNewspaper,
      stats: [
        { key: 'pending', label: 'Chờ duyệt', value: articleStats?.pending || 0, icon: FaClock, className: 'is-warning', action: () => openArticleManagement('?status=pending') },
        { key: 'pending_medical', label: 'Chờ BS', value: articleStats?.pending_medical || 0, icon: FaExclamationTriangle, className: 'is-info', action: () => openArticleManagement('?status=pending_medical') },
        { key: 'request_edit', label: 'Cần sửa', value: articleStats?.request_edit || 0, icon: FaEdit, className: 'is-amber', action: () => openArticleManagement('?status=request_edit') },
        { key: 'request_rewrite', label: 'Viết lại', value: articleStats?.request_rewrite || 0, icon: FaEyeSlash, className: 'is-purple', action: () => openArticleManagement('?status=request_rewrite') },
        { key: 'draft', label: 'Nháp', value: articleStats?.draft || 0, icon: FaEdit, className: 'is-muted', action: () => openArticleManagement('?status=draft') },
        { key: 'approved', label: 'Đã duyệt', value: articleStats?.approved || 0, icon: FaCheckCircle, className: 'is-success', action: () => openArticleManagement('?status=approved') },
        { key: 'hidden', label: 'Đã ẩn', value: articleStats?.hidden || 0, icon: FaEyeSlash, className: 'is-danger', action: () => openArticleManagement('?status=hidden') }
      ]
    },
    {
      id: 'appointments',
      visible: canViewAppointmentWorkload,
      title: 'Quản lý lịch hẹn',
      loading: loadingAppointmentStats,
      totalValue: appointmentStats?.total || 0,
      totalIcon: FaCalendarAlt,
      stats: [
        { key: 'pending', label: 'Chờ xác nhận', value: getAppointmentCount('pending'), icon: FaHourglassHalf, className: 'is-blue', action: () => openAppointmentManagement('?status=pending') },
        { key: 'confirmed', label: 'Đã xác nhận', value: getAppointmentCount('confirmed'), icon: FaCheckCircle, className: 'is-green', action: () => openAppointmentManagement('?status=confirmed') },
        { key: 'upcoming', label: 'Sắp tới', value: getAppointmentCount('upcoming'), icon: FaClock, className: 'is-cyan', action: () => openAppointmentManagement('?status=upcoming') },
        { key: 'waiting_pay', label: 'Chờ thanh toán', value: getAppointmentCount('waiting_pay'), icon: FaCoins, className: 'is-amber', action: () => openAppointmentManagement('?status=waiting_pay') },
        { key: 'waiting_exam', label: 'Chờ khám', value: getAppointmentCount('waiting_exam'), icon: FaClinicMedical, className: 'is-info', action: () => openAppointmentManagement('?status=waiting_exam') },
        { key: 'in_progress', label: 'Đang khám', value: getAppointmentCount('in_progress'), icon: FaExclamationTriangle, className: 'is-warning', action: () => openAppointmentManagement('?status=in_progress') },
        { key: 'completed', label: 'Hoàn thành', value: getAppointmentCount('completed'), icon: FaCheckCircle, className: 'is-success', action: () => openAppointmentManagement('?status=completed') },
        { key: 'cancelled', label: 'Đã hủy', value: getAppointmentCount('cancelled'), icon: FaEyeSlash, className: 'is-danger', action: () => openAppointmentManagement('?status=cancelled') }
      ]
    },
    {
      id: 'payments',
      visible: canViewPaymentWorkload,
      title: 'Thống kê thanh toán',
      loading: loadingPaymentStats,
      totalValue: paymentStats?.total || 0,
      totalIcon: FaCoins,
      stats: [
        { key: 'pending', label: 'Chờ xử lý', value: getPaymentCount('pending'), icon: FaHourglassHalf, className: 'is-warning', action: () => navigate('/quan-ly-thanh-toan/giao-dich?status=pending') },
        { key: 'paid', label: 'Đã thu', value: getPaymentCount('paid'), icon: FaCheckCircle, className: 'is-success', action: () => navigate('/quan-ly-thanh-toan/giao-dich?status=paid') },
        { key: 'failed', label: 'Thất bại', value: getPaymentCount('failed'), icon: FaEyeSlash, className: 'is-danger', action: () => navigate('/quan-ly-thanh-toan/giao-dich?status=failed') },
        { key: 'refunded', label: 'Hoàn tiền', value: getPaymentCount('refunded'), icon: FaUndoAlt, className: 'is-purple', action: () => navigate('/quan-ly-thanh-toan/hoan-tien?status=pending') }
      ]
    },
    {
      id: 'schedules',
      visible: canViewScheduleWorkload,
      title: 'Lịch làm việc',
      loading: false,
      totalValue: isAdmin ? '-' : (canViewApprovalStats ? (leaveStats?.total || 0) + (overtimeStats?.total || 0) + (registrationStats?.total || 0) : scheduleStats?.totalSchedules || 0),
      totalIcon: FaBusinessTime,
      stats: canViewApprovalStats
        ? [
            { key: 'leave', visible: canApproveLeave, label: 'Đơn nghỉ phép', value: leaveStats?.total || 0, icon: FaClock, className: 'is-warning', action: () => navigate('/quan-ly-nhan-vien') },
            { key: 'overtime', visible: canApproveOvertime, label: 'Đơn tăng ca', value: overtimeStats?.total || 0, icon: FaCoins, className: 'is-info', action: () => navigate('/quan-ly-lich-lam-viec') },
            { key: 'registration', visible: canApproveRegistration, label: 'Đơn đăng ký', value: registrationStats?.total || 0, icon: FaUserCheck, className: 'is-amber', action: () => navigate('/quan-ly-lich-lam-viec') }
          ]
        : [
            { key: 'pending', label: 'Chờ duyệt', value: scheduleStats?.pendingSchedules || 0, icon: FaClock, className: 'is-warning', action: () => navigate(isAdmin ? '/quan-ly-lich-lam-viec?status=pending' : '/lich-cua-toi?status=pending') },
            { key: 'registered', label: 'Đã đăng ký', value: scheduleStats?.registeredSchedules || 0, icon: FaUserCheck, className: 'is-info', action: () => navigate(isAdmin ? '/quan-ly-lich-lam-viec?status=approved' : '/lich-cua-toi?status=approved') },
            { key: 'completed', label: 'Hoàn thành', value: scheduleStats?.completedSchedules || 0, icon: FaCheckCircle, className: 'is-blue', action: () => navigate(isAdmin ? '/quan-ly-lich-lam-viec?status=completed' : '/lich-cua-toi?status=completed') }
          ]
    },
    {
      id: 'forum',
      visible: canViewForumWorkload,
      title: 'Diễn đàn',
      loading: loadingForumStats,
      totalValue: forumStats?.totalQuestions || 0,
      totalIcon: FaComments,
      stats: [
        { key: 'pending', label: 'Chờ duyệt', value: forumStats?.pendingQuestions || 0, icon: FaClock, className: 'is-warning', action: () => navigate(isAdmin ? '/quan-ly-dien-dan' : '/dien-dan-suc-khoe') },
        { key: 'answered', label: 'Đã trả lời', value: forumStats?.answeredQuestions || 0, icon: FaCheckCircle, className: 'is-success', action: () => navigate('/dien-dan-suc-khoe') },
        { key: 'unanswered', label: 'Chưa trả lời', value: forumStats?.unansweredQuestions || 0, icon: FaExclamationTriangle, className: 'is-info' },
        { key: 'reported', label: 'Đã báo cáo', value: forumStats?.reportedQuestions || 0, icon: FaEyeSlash, className: 'is-danger', action: () => navigate(isAdmin ? '/quan-ly-dien-dan' : '/dien-dan-suc-khoe') }
      ]
    },
    {
      id: 'community',
      visible: canViewCommunityWorkload,
      title: 'Nhóm cộng đồng',
      loading: loadingCommunityStats,
      totalValue: communityStats?.totalGroups || 0,
      totalIcon: FaUsers,
      stats: [
        { key: 'groups', label: 'Nhóm hoạt động', value: communityStats?.totalGroups || 0, icon: FaUsers, className: 'is-success', action: () => navigate('/quan-ly-nhom-cong-dong') },
        { key: 'pending', label: 'Nhóm chờ duyệt', value: communityStats?.pendingGroups || 0, icon: FaClock, className: 'is-warning', action: () => navigate(isAdmin ? '/quan-ly-nhom-cong-dong?status=pending' : '/quan-ly-nhom-cong-dong') },
        { key: 'members', label: 'Thành viên', value: communityStats?.activeMembers || 0, icon: FaCheckCircle, className: 'is-info' },
        { key: 'posts', label: 'Bài đăng', value: communityStats?.totalPosts || 0, icon: FaNewspaper, className: 'is-blue' }
      ]
    }
  ];

  const visibleWidgets = boardWidgets
    .map((widget) => ({
      ...widget,
      stats: (widget.stats || []).filter((stat) => stat.visible !== false)
    }))
    .filter((widget) => widget.visible && widget.stats.length > 0);

  return (
    <div className="dashboard-container">
      
      {/* Header Sticky (Đã sát lên Top: 0) */}
      <div className="dashboard-sticky-header">
        <div className="dashboard-user-greeting">
          <div className="dashboard-user-avatar">
            {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
          </div>
          <div>
            <h1 className="dashboard-greeting-title">
              {getGreeting()}, <span>{user?.full_name || 'Bạn'}</span>!
            </h1>
          </div>
        </div>

        <div className="dashboard-header-actions">
          <button 
            type="button" 
            className={`dashboard-action-btn ${isBoardEditMode ? 'is-active' : ''}`} 
            onClick={() => setIsBoardEditMode(!isBoardEditMode)}
          >
            {isBoardEditMode ? (
              <><FaSave /> <span>Lưu Layout</span></>
            ) : (
              <><FaEdit /> <span>Chỉnh sửa Dashboard</span></>
            )}
          </button>
          
          {isBoardEditMode && (
            <button 
              type="button" 
              className="dashboard-action-btn secondary" 
              onClick={() => {
                setLayouts(DEFAULT_LAYOUTS);
                window.localStorage.setItem(DASHBOARD_LAYOUT_STORAGE_KEY, JSON.stringify(DEFAULT_LAYOUTS));
              }}
              title="Khôi phục mặc định"
            >
              <FaUndoAlt /> <span>Khôi phục</span>
            </button>
          )}

          <button onClick={handleLogout} className="dashboard-btn-logout" title="Đăng xuất">
            <FaSignOutAlt />
          </button>
        </div>
      </div>

      {/* Main Layout gồm Grid và Sidebar */}
      <div className="dashboard-layout">
        <main className="dashboard-main">
          
          <ResponsiveGridLayout
            className="dashboard-grid-layout"
            layouts={layouts}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 12, sm: 12, xs: 1, xxs: 1 }}
            rowHeight={80}
            onLayoutChange={handleLayoutChange}
            isDraggable={isBoardEditMode}
            isResizable={isBoardEditMode}
            margin={[16, 16]}
            useCSSTransforms={true}
          >
            {visibleWidgets.map((widget) => {
              const WidgetIcon = widget.totalIcon;
              return (
                <div key={widget.id} className={`dashboard-widget-card ${isBoardEditMode ? 'is-editing' : ''}`}>
                  <div className="widget-header">
                    <h2><WidgetIcon className="widget-icon-title" /> {widget.title}</h2>
                    {!isBoardEditMode && (
                      <span className="widget-total-badge" title="Tổng số">{widget.totalValue}</span>
                    )}
                  </div>
                  
                  {widget.loading ? (
                    <div className="widget-loading">Đang tải dữ liệu...</div>
                  ) : (
                    <div className="widget-content">
                      <div className="widget-stat-grid">
                        {widget.stats.map(stat => {
                          const StatIcon = stat.icon;
                          return (
                            <div 
                              key={stat.key} 
                              className={`widget-stat-item ${stat.className} ${isBoardEditMode ? 'disabled-click' : ''}`}
                              onClick={!isBoardEditMode ? stat.action : undefined}
                            >
                              <div className="stat-icon-wrapper"><StatIcon /></div>
                              <div className="stat-info">
                                <span>{stat.label}</span>
                                <strong>{stat.value}</strong>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </ResponsiveGridLayout>
        </main>

        {/* Khôi phục Sidebar: Lịch và Đồng hồ */}
        <aside className="dashboard-sidebar">
          {/* Clock Widget */}
          <div className="dashboard-clock-widget">
            <div className="dashboard-clock">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="dashboard-clock-marker" style={{ transform: `rotate(${i * 30}deg)` }}>
                  <div className="dashboard-marker-line"></div>
                </div>
              ))}
              <div className="dashboard-clock-number dashboard-clock-12">12</div>
              <div className="dashboard-clock-number dashboard-clock-3">3</div>
              <div className="dashboard-clock-number dashboard-clock-6">6</div>
              <div className="dashboard-clock-number dashboard-clock-9">9</div>
              <div className="dashboard-clock-center"></div>
              <div className="dashboard-clock-hand dashboard-hour-hand" style={{ transform: `rotate(${hourDeg}deg)` }}></div>
              <div className="dashboard-clock-hand dashboard-minute-hand" style={{ transform: `rotate(${minuteDeg}deg)` }}></div>
              <div className="dashboard-clock-hand dashboard-second-hand" style={{ transform: `rotate(${secondDeg}deg)` }}></div>
            </div>
            <div className="dashboard-digital-time">
              {currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          </div>

          {/* Calendar Widget */}
          <div className="dashboard-calendar-widget">
            {/* Hiển thị lịch bình thường cho tất cả user, kể cả admin */}
            <div className="dashboard-calendar-header">
                  <button onClick={previousMonth} className="dashboard-calendar-nav"><FaChevronLeft /></button>
                  <div className="dashboard-calendar-title">
                    <FaCalendarAlt className="dashboard-calendar-icon" />
                    <span>{monthName}</span>
                  </div>
                  <button onClick={nextMonth} className="dashboard-calendar-nav"><FaChevronRight /></button>
                </div>
                <div className="dashboard-calendar-grid">
                  {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(day => (
                    <div key={day} className="dashboard-calendar-weekday">{day}</div>
                  ))}
                  {[...Array(startingDayOfWeek)].map((_, i) => (
                    <div key={`empty-${i}`} className="dashboard-calendar-day dashboard-calendar-empty"></div>
                  ))}
                  {[...Array(daysInMonth)].map((_, i) => {
                    const day = i + 1;
                    const isToday = isCurrentMonth && day === today;
                    const eventClass = getDateEventClass(day);
                    const dayEvents = getDisplayEventsForDate(day);
                    const hasEvents = hasEventsOnDate(day);
                    
                    return (
                      <div 
                        key={day} 
                        className={`dashboard-calendar-day ${isToday ? 'dashboard-calendar-today' : ''} ${eventClass}`}
                        onClick={() => handleCalendarDayClick(day)}
                        onMouseEnter={(e) => {
                          if (hasEvents) {
                            setHoveredDay(day);
                            const rect = e.currentTarget.getBoundingClientRect();
                            setTooltipPos({
                              x: rect.left + rect.width / 2,
                              y: rect.top
                            });
                          }
                        }}
                        onMouseLeave={() => setHoveredDay(null)}
                        title={hasEvents ? 'Nhấn để xem chi tiết theo ngày' : 'Nhấn để mở lịch theo ngày'}
                      >
                        <span className="dashboard-calendar-day-number">{day}</span>
                        {hasEvents && (
                          <div className="dashboard-calendar-day-indicators">
                            {dayEvents.schedules.length > 0 && <span className="indicator indicator-schedule" title="Lịch làm">•</span>}
                            {dayEvents.appointments.length > 0 && <span className="indicator indicator-appointment" title="Lịch hẹn">•</span>}
                            {dayEvents.leaves.length > 0 && <span className="indicator indicator-leave" title="Nghỉ phép">•</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Calendar Legend */}
                <div className="dashboard-calendar-legend">
                  <div className="legend-item">
                    <span className="legend-dot schedule-dot"></span>
                    <span className="legend-label">Lịch làm</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot appointment-dot"></span>
                    <span className="legend-label">Lịch hẹn</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot leave-dot"></span>
                    <span className="legend-label">Nghỉ phép</span>
                  </div>
                </div>

                {/* Tooltip */}
                {hoveredDay !== null && (
                  <div className="dashboard-calendar-tooltip" style={{
                    left: `${tooltipPos.x}px`,
                    top: `${tooltipPos.y - 10}px`,
                    transform: 'translate(-50%, -100%)'
                  }}>
                    {/* Tooltip content */}
                    {(() => {
                      const dayEvents = getDisplayEventsForDate(hoveredDay);
                      return (
                        <div className="tooltip-content">
                          <div className="tooltip-date">
                            {hoveredDay} {monthName}
                          </div>
                          {dayEvents.schedules.length > 0 && (() => {
                            // Lọc các ca làm duy nhất theo start_time + end_time
                            const uniqueShifts = [];
                            const seen = new Set();
                            dayEvents.schedules.forEach(sch => {
                              const key = `${sch.start_time}-${sch.end_time}`;
                              if (!seen.has(key)) {
                                seen.add(key);
                                uniqueShifts.push(sch);
                              }
                            });
                            return (
                              <div className="tooltip-section">
                                <div className="tooltip-section-title">
                                  <span className="indicator-badge schedule-badge"><FaBusinessTime /></span>
                                  Lịch làm ({uniqueShifts.length})
                                </div>
                                {uniqueShifts.map((sch, idx) => (
                                  <div key={idx} className="tooltip-item">
                                    {sch.name ? sch.name + ' - ' : ''}{sch.start_time?.substring(0, 5)} ~ {sch.end_time?.substring(0, 5)}
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                          {dayEvents.appointments.length > 0 && (
                            <div className="tooltip-section">
                              <div className="tooltip-section-title">
                                <span className="indicator-badge appointment-badge"><FaUserCheck /></span>
                                Lịch hẹn ({dayEvents.appointments.length})
                              </div>
                              {dayEvents.appointments.map((apt, idx) => (
                                <div key={idx} className="tooltip-item">
                                  {apt.appointment_start_time?.substring(0, 5)} - {apt.patient_name} - {apt.service_name}
                                </div>
                              ))}
                            </div>
                          )}
                          {dayEvents.leaves.length > 0 && (
                            <div className="tooltip-section">
                              <div className="tooltip-section-title">
                                <span className="indicator-badge leave-badge"><FaClock /></span>
                                Nghỉ phép ({dayEvents.leaves.length})
                              </div>
                              {dayEvents.leaves.slice(0, 2).map((leave, idx) => (
                                <div key={idx} className="tooltip-item">
                                  {leave.reason}
                                </div>
                              ))}
                              {dayEvents.leaves.length > 2 && <div className="tooltip-more">... và {dayEvents.leaves.length - 2} khác</div>}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
            {/* Tooltip and calendar content end */}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default DashboardPage;