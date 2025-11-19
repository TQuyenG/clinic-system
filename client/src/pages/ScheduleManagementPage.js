// client/src/pages/ScheduleManagementPage.js
// PHIÊN BẢN CẬP NHẬT HOÀN CHỈNH (Lần 8)
// 1. (FIX) Sửa logic đếm Badge để CHỈ đếm 'pending'
// 2. Thêm state và hàm riêng để tải số lượng 'pending'

import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import Select from 'react-select'; 

// Components chính
import CalendarView from '../components/schedule/CalendarView';
import ScheduleTableView from '../components/schedule/ScheduleTableView'; 

// Components cho Tab Phê duyệt
import PendingLeaveTable from '../components/schedule/PendingLeaveTable';
import LeaveDetailModal from '../components/schedule/LeaveDetailModal';
import ConfirmationModal from '../components/schedule/ConfirmationModal';
import ScheduleApprovalTable from '../components/schedule/ScheduleApprovalTable';
import OvertimeApprovalTable from '../components/schedule/OvertimeApprovalTable';
import OvertimeEditor from '../components/schedule/OvertimeEditor'; 

import './ScheduleManagementPage.css'; 

// === IMPORT ICONS ===
import { 
  FaCog, 
  FaUserMd, 
  FaCheck, 
  FaTimes, 
  FaChevronLeft, 
  FaChevronRight, 
  FaSpinner, 
  FaUserNurse, 
  FaUsers,
  FaTasks,
  FaCalendarDay, 
  FaCalendarWeek, 
  FaCalendarAlt, 
  FaList, 
  FaUserClock, 
  FaExclamationTriangle,
  FaBusinessTime,
  FaClock,
  FaArchive, 
  FaExclamationCircle, 
  FaCheckCircle, 
  FaTimesCircle,
  FaInfoCircle 
} from 'react-icons/fa';
import { MdOutlineErrorOutline } from "react-icons/md";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// (Helpers getWeekRange, getMonthRange, formatDateISO giữ nguyên)
const getWeekRange = (date) => {
  const start = new Date(date);
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1);
  start.setDate(diff);
  start.setHours(0,0,0,0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23,59,59,999);
  return { start, end };
};
const getMonthRange = (date) => {
   const start = new Date(date.getFullYear(), date.getMonth(), 1);
   const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
   end.setHours(23,59,59,999);
   return { start, end };
};
const formatDateISO = (date) => date.toISOString().split('T')[0];


const ScheduleManagementPage = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('doctor-schedule');
  const [workShiftConfig, setWorkShiftConfig] = useState([]); 
  
  // State cho danh sách
  const [doctors, setDoctors] = useState([]);
  const [staffList, setStaffList] = useState([]); 
  const [allUsers, setAllUsers] = useState([]); 
  
  // State cho lịch (Quản lý đa lựa chọn)
  const [selectedUsers, setSelectedUsers] = useState([]); 
  const [allCalendarData, setAllCalendarData] = useState({
    schedules: [],
    overtime_schedules: [],
    leaves: [],
    appointments: []
  }); 

  const [eventTypeFilters, setEventTypeFilters] = useState({
    schedules: true,
    overtime: true,
    leaves: true,
    appointments: true
  });

  // State quản lý hiển thị lịch
  const [viewMode, setViewMode] = useState('week'); 
  const [calendarDisplayMode, setCalendarDisplayMode] = useState('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());

  // State cho Tab 4 (Quản lý đơn)
  const [activeSubTab, setActiveSubTab] = useState('leaves'); 
  const [leaveRequests, setLeaveRequests] = useState([]); 
  const [pendingRegistrations, setPendingRegistrations] = useState([]); 
  const [pendingOvertimes, setPendingOvertimes] = useState([]); 
  
  // (MỚI) State riêng cho đếm badge
  const [pendingLeaveCount, setPendingLeaveCount] = useState(0);
  const [pendingRegCount, setPendingRegCount] = useState(0);
  const [pendingOvertimeCount, setPendingOvertimeCount] = useState(0);

  // State cho Filter (Dùng chung cho cả 3 tab con)
  const [userTypeFilter, setUserTypeFilter] = useState('all'); 
  const [approvalStatusFilter, setApprovalStatusFilter] = useState('pending');
  
  // State cho Tìm kiếm
  const [leaveSearch, setLeaveSearch] = useState(''); 
  const [flexibleSearch, setFlexibleSearch] = useState(''); 
  const [overtimeSearch, setOvertimeSearch] = useState(''); 

  // (State Modal Đơn Nghỉ)
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  
  // (State Modal Tăng Ca)
  const [showOvertimeEditor, setShowOvertimeEditor] = useState(false);
  const [selectedUserForOvertime, setSelectedUserForOvertime] = useState(null);

  const [loading, setLoading] = useState({
    config: false,
    users: false, 
    leaves: false, 
    registrations: false, 
    overtimes: false, 
    schedules: false, 
    submit: false
  });

  // ========== INIT ==========
  useEffect(() => {
    // (Load user)
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (!token || !userStr) { toast.error('Vui lòng đăng nhập'); return; }
    try {
      const userData = JSON.parse(userStr);
      if (userData.role !== 'admin' && userData.role !== 'staff') { toast.error('Bạn không có quyền truy cập trang này'); return; }
      setUser(userData);
      
      // Tải dữ liệu
      loadWorkShiftConfig();
      loadUsersByRole('doctor', setDoctors);
      loadUsersByRole('staff', setStaffList);
      
      // (Xử lý link highlight từ thông báo)
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'manage-registrations') {
        setActiveTab('manage-registrations');
        const subTab = params.get('sub_tab');
        if (subTab) setActiveSubTab(subTab);
      }
      
    } catch (error) { console.error('Parse user error:', error); }
  }, []);
  
  // (Gộp doctors và staff)
  useEffect(() => {
    // Tạo danh sách đầy đủ cho Admin chọn
    const all = [
      ...doctors.map(d => ({ ...d, label: `(BS) ${d.full_name}` })),
      ...staffList.map(s => ({ ...s, label: `(NV) ${s.full_name}` }))
    ];
    setAllUsers(all);
  }, [doctors, staffList]);

  // ========== LOAD DATA ==========
  
  // Tải cấu hình ca làm việc
  const loadWorkShiftConfig = async () => {
    setLoading(prev => ({ ...prev, config: true }));
    
    const defaultShifts = [
      {
        shift_name: 'morning',
        display_name: 'Ca sáng',
        start_time: '07:00:00',
        end_time: '12:00:00',
        days_of_week: [1, 2, 3, 4, 5, 6], 
        is_active: false
      },
      {
        shift_name: 'afternoon',
        display_name: 'Ca chiều',
        start_time: '13:00:00',
        end_time: '17:00:00',
        days_of_week: [1, 2, 3, 4, 5, 6], 
        is_active: false
      },
      {
        shift_name: 'evening',
        display_name: 'Ca tối',
        start_time: '17:00:00',
        end_time: '21:00:00',
        days_of_week: [1, 2, 3, 4, 5],
        is_active: false
      }
    ];

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/work-shifts/config`, {
         headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        if (response.data.data && response.data.data.length > 0) {
          setWorkShiftConfig(response.data.data);
        } else {
          setWorkShiftConfig(defaultShifts);
          toast.info('Chưa có cấu hình ca. Hiển thị 3 ca mặc định để tạo mới.');
        }
      } else {
        setWorkShiftConfig(defaultShifts);
      }
    } catch (error) {
      console.error('Load work shift config error:', error);
      setWorkShiftConfig(defaultShifts);
    } finally {
      setLoading(prev => ({ ...prev, config: false }));
    }
  };

  // Tải Bác sĩ / Nhân viên
  const loadUsersByRole = async (role, setter) => {
    setLoading(prev => ({ ...prev, users: true }));
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/users/by-role?role=${role}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        setter(response.data.users || []);
      }
    } catch (error) {
      console.error(`Load ${role} error:`, error);
      toast.error(`Không thể tải danh sách ${role}`);
    } finally {
      setLoading(prev => ({ ...prev, users: false }));
    }
  };

  // Tải Lịch (API Hợp Nhất Mới)
  const loadUserCalendarData = async () => {
    setLoading(prev => ({ ...prev, schedules: true }));
    try {
      const token = localStorage.getItem('token');
      const range = (viewMode === 'week' || calendarDisplayMode === 'table')
        ? getWeekRange(currentDate) 
        : getMonthRange(currentDate);

      const params = new URLSearchParams({
        date_from: formatDateISO(range.start),
        date_to: formatDateISO(range.end)
      });
      
      if (user.role === 'admin') {
         if(selectedUsers.length > 0) {
            params.append('user_ids', selectedUsers.map(u => u.value).join(','));
         }
      } else {
         params.append('user_ids', user.id);
      }
      
      params.append('types', 'schedules,overtime,leaves,appointments');
      
      const response = await axios.get(
        `${API_URL}/calendar/view?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setAllCalendarData(response.data.data); 
      } else {
        setAllCalendarData({ schedules: [], overtime_schedules: [], leaves: [], appointments: [] });
      }

    } catch (error) {
      console.error('Load user calendar data error:', error);
      toast.error('Không thể tải dữ liệu lịch');
      setAllCalendarData({ schedules: [], overtime_schedules: [], leaves: [], appointments: [] });
    } finally {
      setLoading(prev => ({ ...prev, schedules: false }));
    }
  };
  
  // Tải lại dữ liệu lịch
  useEffect(() => {
    if (user && (activeTab === 'doctor-schedule' || activeTab === 'staff-schedule')) {
      loadUserCalendarData();
    }
  }, [selectedUsers, currentDate, viewMode, calendarDisplayMode, activeTab, user]);


  // Tải dữ liệu cho Tab 4 (Quản lý đơn)
  const loadPendingLeaves = async () => {
    setLoading(prev => ({ ...prev, leaves: true }));
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (userTypeFilter !== 'all') params.append('user_type', userTypeFilter);
      params.append('status', approvalStatusFilter); 

      const response = await axios.get(
        `${API_URL}/leave-requests/pending?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        setLeaveRequests(response.data.data || []);
      }
    } catch (error) {
      console.error('Load leave requests error:', error);
      toast.error('Không thể tải danh sách đơn nghỉ.');
    } finally {
      setLoading(prev => ({ ...prev, leaves: false }));
    }
  };
  
  // Tải đăng ký lịch chờ duyệt
  const loadPendingRegistrations = async () => {
    setLoading(prev => ({ ...prev, registrations: true }));
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      params.append('status', approvalStatusFilter); 

      const response = await axios.get(`${API_URL}/schedules/pending-registrations?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setPendingRegistrations(response.data.data || []);
      }
    } catch (error) {
      console.error('Load pending registrations error:', error);
    } finally {
      setLoading(prev => ({ ...prev, registrations: false }));
    }
  };
  
  // Tải tăng ca chờ duyệt
  const loadPendingOvertimes = async () => {
    setLoading(prev => ({ ...prev, overtimes: true }));
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      params.append('status', approvalStatusFilter); 

      const response = await axios.get(`${API_URL}/schedules/pending-overtimes?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setPendingOvertimes(response.data.data || []);
      }
    } catch (error) {
      console.error('Load pending overtimes error:', error);
    } finally {
      setLoading(prev => ({ ...prev, overtimes: false }));
    }
  };
  
  // (MỚI) Hàm tải SỐ LƯỢNG CHỜ DUYỆT (cho badge)
  const loadAllPendingCounts = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const headers = { headers: { Authorization: `Bearer ${token}` } };
    
    try {
      const [leavesRes, regRes, otRes] = await Promise.all([
        // Luôn fetch status=pending cho count
        axios.get(`${API_URL}/leave-requests/pending?status=pending`, headers),
        axios.get(`${API_URL}/schedules/pending-registrations?status=pending`, headers),
        axios.get(`${API_URL}/schedules/pending-overtimes?status=pending`, headers)
      ]);
      
      // API Đơn nghỉ (leaveRequestController) trả về .count
      setPendingLeaveCount(leavesRes.data.count || 0); 
      // API Đăng ký (scheduleController) trả về .data (mảng)
      setPendingRegCount(regRes.data.data.length || 0); 
      setPendingOvertimeCount(otRes.data.data.length || 0);
      
    } catch (error) {
      console.error("Lỗi khi tải tổng số chờ duyệt:", error);
      setPendingLeaveCount(0);
      setPendingRegCount(0);
      setPendingOvertimeCount(0);
    }
  };

  // useEffect cho Tab 4 (Load dữ liệu bảng)
  useEffect(() => {
    if (user && activeTab === 'manage-registrations') {
      // Tải data cho bảng (dựa trên filter)
      if (activeSubTab === 'leaves') {
        loadPendingLeaves();
      }
      if (activeSubTab === 'flexible') {
        loadPendingRegistrations();
      }
      if (activeSubTab === 'overtime') {
        loadPendingOvertimes();
      }
    }
  }, [user, userTypeFilter, approvalStatusFilter, activeTab, activeSubTab]); 

  
  // (MỚI) useEffect riêng cho Badge Count (chỉ chạy 1 lần khi vào tab)
  useEffect(() => {
     if (user && activeTab === 'manage-registrations') {
         // Tải (hoặc tải lại) tổng số pending
         loadAllPendingCounts();
     }
  }, [user, activeTab]); // Chỉ chạy khi vào tab
  
  
  // Lọc dữ liệu ở Frontend
  const filteredData = useMemo(() => {
    const { schedules, overtime_schedules, leaves, appointments } = allCalendarData;
    
    return {
      schedules: eventTypeFilters.schedules ? schedules : [],
      overtime_schedules: eventTypeFilters.overtime ? overtime_schedules : [],
      leaves: eventTypeFilters.leaves ? leaves : [],
      appointments: eventTypeFilters.appointments ? appointments : []
    };
  }, [allCalendarData, eventTypeFilters]);

  // Lọc danh sách phê duyệt
  const filteredLeaves = useMemo(() => {
    const query = leaveSearch.toLowerCase();
    return leaveRequests.filter(leave => {
      const matchesSearch = !leaveSearch || 
        leave.user?.full_name?.toLowerCase().includes(query) ||
        leave.reason?.toLowerCase().includes(query);
      const matchesType = userTypeFilter === 'all' || leave.user_type === userTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [leaveRequests, leaveSearch, userTypeFilter]);

  const filteredRegistrations = useMemo(() => {
    const query = flexibleSearch.toLowerCase();
    return pendingRegistrations.filter(reg => {
      const matchesSearch = !flexibleSearch || reg.user?.full_name?.toLowerCase().includes(query);
      const matchesType = userTypeFilter === 'all' || reg.user?.role === userTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [pendingRegistrations, flexibleSearch, userTypeFilter]); 

  const filteredOvertimes = useMemo(() => {
    const query = overtimeSearch.toLowerCase();
    return pendingOvertimes.filter(ot => {
      const matchesSearch = !overtimeSearch || 
        ot.user?.full_name?.toLowerCase().includes(query) ||
        ot.reason?.toLowerCase().includes(query);
      const matchesType = userTypeFilter === 'all' || ot.user?.role === userTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [pendingOvertimes, overtimeSearch, userTypeFilter]); 

  // ✅ NEW: Filter data by user for table view
  const filterDataByUser = (userId) => {
    return {
      schedules: filteredData.schedules.filter(s => s.user_id === userId),
      overtime_schedules: filteredData.overtime_schedules.filter(o => o.user_id === userId),
      leaves: filteredData.leaves.filter(l => l.user_id === userId),
      appointments: filteredData.appointments.filter(a => a.doctor_id === userId)
    };
  };

  // ✅ NEW: Render table view content
  const renderTableViewContent = () => {
    if (selectedUsers.length === 0) {
      return (
        <div className="schedule-management-page__empty-state">
          <FaUsers style={{ fontSize: '3rem', color: 'var(--color-text-secondary)' }} />
          <h3>Chưa chọn user nào</h3>
          <p>Vui lòng chọn bác sĩ hoặc nhân viên từ danh sách bên trên để xem chi tiết lịch làm việc</p>
          <small>💡 Bạn có thể chọn nhiều users để so sánh lịch của họ</small>
        </div>
      );
    }
    
    // Hiển thị bảng cho từng user
    return (
      <div className="schedule-management-page__multi-user-table-view">
        {selectedUsers.map((selectedUser, index) => {
          const userId = selectedUser.value || selectedUser.id;
          const userData = filterDataByUser(userId);
          const userInfo = allUsers.find(u => u.id === userId);
          
          return (
            <div key={userId} className="schedule-management-page__user-table-section">
              <div className="schedule-management-page__user-table-header">
                <div className="schedule-management-page__user-info">
                  <img 
                    src={userInfo?.avatar_url || 'https://placehold.co/40x40/EBF4FF/76A9FA?text=U'} 
                    alt={userInfo?.full_name || 'User'}
                    className="schedule-management-page__user-avatar"
                  />
                  <div>
                    <h3>{userInfo?.label || userInfo?.full_name || 'Unknown User'}</h3>
                    <span className="schedule-management-page__user-role">
                      {userInfo?.userType === 'doctor' ? 'Bác sĩ' : 'Nhân viên'}
                    </span>
                  </div>
                </div>
                <div className="schedule-management-page__user-stats">
                  <span className="stat-item">
                    <FaBusinessTime /> {userData.schedules.length} ca làm
                  </span>
                  <span className="stat-item">
                    <FaClock /> {userData.overtime_schedules.length} tăng ca
                  </span>
                  <span className="stat-item">
                    <FaUserClock /> {userData.appointments.length} lịch hẹn
                  </span>
                  <span className="stat-item">
                    <FaExclamationTriangle /> {userData.leaves.length} nghỉ phép
                  </span>
                </div>
              </div>
              
              <ScheduleTableView
                schedules={userData.schedules}
                overtimeSchedules={userData.overtime_schedules}
                leaves={userData.leaves}
                appointments={userData.appointments}
                eventTypeFilters={eventTypeFilters}
                viewMode="week"
                currentDate={currentDate}
                workShiftConfig={workShiftConfig.filter(s => s?.is_active)}
                loading={false}
              />
              
              {index < selectedUsers.length - 1 && (
                <div className="schedule-management-page__user-separator"></div>
              )}
            </div>
          );
        })}
      </div>
    );
  };


  // ========== HANDLERS ==========
  
  // (Handler Tab Config: handleConfigChange, handleDayToggle, handleSaveConfig - Giữ nguyên)
  const handleConfigChange = (shiftName, field, value) => {
    setWorkShiftConfig(prev => prev.map(shift =>
      shift.shift_name === shiftName
        ? { ...shift, [field]: value }
        : shift
    ));
  };
  const handleDayToggle = (shiftName, day) => {
    setWorkShiftConfig(prev => prev.map(shift => {
      if (shift.shift_name === shiftName) {
        const currentDays = shift.days_of_week || [];
        const newDays = currentDays.includes(day)
          ? currentDays.filter(d => d !== day)
          : [...currentDays, day].sort((a, b) => a - b);
        return { ...shift, days_of_week: newDays };
      }
      return shift;
    }));
  };
  const handleSaveConfig = async () => {
    setLoading(prev => ({ ...prev, submit: true }));
    try {
      const token = localStorage.getItem('token');
      const shifts = workShiftConfig.map(shift => ({
        ...shift,
        start_time: shift.start_time.length === 5 ? `${shift.start_time}:00` : shift.start_time,
        end_time: shift.end_time.length === 5 ? `${shift.end_time}:00` : shift.end_time
      }));
      const response = await axios.put(
        `${API_URL}/work-shifts/config`,
        { shifts },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        toast.success('Cập nhật cấu hình thành công');
        loadWorkShiftConfig();
      }
    } catch (error) {
      console.error('Save config error:', error);
      toast.error(error.response?.data?.message || 'Lỗi khi lưu cấu hình');
    } finally {
      setLoading(prev => ({ ...prev, submit: false }));
    }
  };


  // Handler chọn Tab
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'doctor-schedule' || tab === 'staff-schedule') {
      setSelectedUsers([]); 
      setAllCalendarData({ schedules: [], overtime_schedules: [], leaves: [], appointments: [] });
    }
  };

  // (Handler chọn User: handleUserChange - Giữ nguyên)
  const handleUserChange = (selectedOptions) => {
    if (user.role === 'admin' && selectedOptions.length > 5) {
      toast.warn('Chỉ được phép xem tối đa 5 người dùng cùng lúc');
      return;
    }
    if (user.role === 'admin') {
      setSelectedUsers(selectedOptions);
    } else {
      setSelectedUsers(selectedOptions ? [selectedOptions] : []);
    }
  };
  
  // (Handler toggle lọc sự kiện: handleEventTypeToggle - Giữ nguyên)
  const handleEventTypeToggle = (type) => {
    setEventTypeFilters(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  // (Handler Lịch: handleDateChange, goToToday - Giữ nguyên)
  const handleDateChange = (direction) => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week' || calendarDisplayMode === 'table') {
      newDate.setDate(newDate.getDate() + (direction === 'prev' ? -7 : 7));
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === 'prev' ? -1 : 1));
    }
    setCurrentDate(newDate);
  };
  const goToToday = () => {
    setCurrentDate(new Date());
  };
  
  // (Handlers Modal Đơn nghỉ: ... - SỬA)
  const handleOpenDetailModal = (leave) => {
    setSelectedLeave(leave);
    setShowDetailModal(true);
  };
  const handleOpenConfirmModal = () => {
    setShowDetailModal(false); 
    setShowConfirmModal(true);
  };
  const handleOpenRejectModal = () => {
    setShowDetailModal(false);
    setRejectReason('');
    setShowRejectModal(true);
  };
  const handleApproveLeave = async () => {
    if (!selectedLeave) return;
    setLoading(prev => ({ ...prev, submit: true }));
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${API_URL}/leave-requests/${selectedLeave.id}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        toast.success('Đã duyệt đơn');
        loadPendingLeaves(); 
        loadAllPendingCounts(); // (SỬA) Tải lại count
        setShowConfirmModal(false);
        setSelectedLeave(null);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi duyệt đơn');
    } finally {
      setLoading(prev => ({ ...prev, submit: false }));
    }
  };
  const handleRejectLeave = async () => {
    if (!rejectReason.trim()) {
      toast.error('Vui lòng nhập lý do');
      return;
    }
    if (!selectedLeave) return;
    setLoading(prev => ({ ...prev, submit: true }));
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${API_URL}/leave-requests/${selectedLeave.id}/reject`,
        { reject_reason: rejectReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        toast.success('Đã từ chối đơn');
        setShowRejectModal(false);
        setRejectReason('');
        loadPendingLeaves(); 
        loadAllPendingCounts(); // (SỬA) Tải lại count
        setSelectedLeave(null);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi từ chối');
    } finally {
      setLoading(prev => ({ ...prev, submit: false }));
    }
  };

  // (Helpers, weekDays, check user - Giữ nguyên)
  const weekDays = [
    { value: 1, label: 'T2' }, { value: 2, label: 'T3' },
    { value: 3, label: 'T4' }, { value: 4, label: 'T5' },
    { value: 5, label: 'T6' }, { value: 6, label: 'T7' },
    { value: 0, label: 'CN' }
  ];
  if (!user) {
    return (
      <div className="schedule-management-page__loading">
        <FaSpinner className="fa-spin" /> Đang tải...
      </div>
    );
  }

  // ========== RENDER ==========
  
  // (SỬA) Tách JSX của bộ lọc (Phê duyệt) ra
  const renderRoleFilters = () => (
    <div className="schedule-management-page__filter-buttons" style={{ marginBottom: '1.5rem', justifyContent: 'flex-start' }}>
      <button
        className={`schedule-management-page__filter-btn ${userTypeFilter === 'all' ? 'schedule-management-page__filter-btn--active' : ''}`}
        onClick={() => setUserTypeFilter('all')}
      ><FaUsers /> Tất cả</button>
      <button
        className={`schedule-management-page__filter-btn ${userTypeFilter === 'doctor' ? 'schedule-management-page__filter-btn--active' : ''}`}
        onClick={() => setUserTypeFilter('doctor')}
      ><FaUserMd /> Bác sĩ</button>
      <button
        className={`schedule-management-page__filter-btn ${userTypeFilter === 'staff' ? 'schedule-management-page__filter-btn--active' : ''}`}
        onClick={() => setUserTypeFilter('staff')}
      ><FaUserNurse /> Nhân viên</button>
    </div>
  );
  
  const renderStatusFilters = () => (
     <div className="schedule-management-page__filter-buttons" style={{ marginBottom: '1.5rem', justifyContent: 'flex-start' }}>
        <button
          className={`schedule-management-page__filter-btn ${approvalStatusFilter === 'all' ? 'schedule-management-page__filter-btn--active' : ''}`}
          onClick={() => setApprovalStatusFilter('all')}
        ><FaArchive /> Tất cả</button>
        <button
          className={`schedule-management-page__filter-btn ${approvalStatusFilter === 'pending' ? 'schedule-management-page__filter-btn--active' : ''}`}
          onClick={() => setApprovalStatusFilter('pending')}
        ><FaExclamationCircle /> Chờ duyệt</button>
        <button
          className={`schedule-management-page__filter-btn ${approvalStatusFilter === 'approved' ? 'schedule-management-page__filter-btn--active' : ''}`}
          onClick={() => setApprovalStatusFilter('approved')}
        ><FaCheckCircle /> Đã duyệt</button>
        <button
          className={`schedule-management-page__filter-btn ${approvalStatusFilter === 'rejected' ? 'schedule-management-page__filter-btn--active' : ''}`}
          onClick={() => setApprovalStatusFilter('rejected')}
        ><FaTimesCircle /> Từ chối</button>
      </div>
  );


  // Tách JSX của bộ lọc lịch ra
  const renderCalendarControls = (userList) => {
    const userOptions = userList.map(u => ({
      value: u.id,
      label: u.full_name,
      avatar: u.avatar_url
    }));
    const formatOptionLabel = ({ label, avatar }) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <img 
          src={avatar || 'https://placehold.co/24x24/EBF4FF/76A9FA?text=U'} 
          alt={label}
          style={{ width: 24, height: 24, borderRadius: '50%' }}
        />
        <span>{label}</span>
      </div>
    );

    // Check if table view is available
    const canShowTableView = selectedUsers.length > 0;
    const hasWarning = selectedUsers.length > 5;
    
    return (
    <>
      <div className="schedule-management-page__doctor-header">
        {/* React-Select (Giữ nguyên) */}
        <div className="schedule-management-page__form-group" style={{ flexBasis: '400px', zIndex: 10 }}>
          <Select
            isMulti={user.role === 'admin'} 
            options={userOptions}
            value={selectedUsers}
            onChange={handleUserChange}
            formatOptionLabel={formatOptionLabel}
            placeholder={`-- Chọn ${activeTab === 'doctor-schedule' ? 'bác sĩ' : 'nhân viên'} --`}
            styles={{ control: (base) => ({ ...base, minHeight: '45px' }) }}
            isClearable
          />
        </div>
        
        {/* Nút chuyển Tuần/Tháng/Hôm nay (Giữ nguyên) */}
        <div className="schedule-management-page__view-controls">
          <button 
            className="schedule-management-page__nav-button"
            onClick={goToToday}
          >
            <FaCalendarDay /> Hôm nay
          </button>
          <div className="schedule-management-page__view-switcher">
            <button
              className={`schedule-management-page__switch-btn ${calendarDisplayMode === 'calendar' ? 'active' : ''}`}
              onClick={() => setCalendarDisplayMode('calendar')}
            > <FaCalendarAlt /> Lịch </button>
            <button
              className={`schedule-management-page__switch-btn ${calendarDisplayMode === 'table' ? 'active' : ''}`}
              onClick={() => {
                if (!canShowTableView) {
                  toast.info('Vui lòng chọn ít nhất 1 user để xem bảng chi tiết', {
                    icon: <FaInfoCircle />
                  });
                  return;
                }
                setCalendarDisplayMode('table');
              }}
              disabled={!canShowTableView}
            > <FaList /> Bảng </button>
          </div>
          {calendarDisplayMode === 'calendar' && (
            <div className="schedule-management-page__view-switcher">
              <button
                className={`schedule-management-page__switch-btn ${viewMode === 'week' ? 'active' : ''}`}
                onClick={() => setViewMode('week')}
              > <FaCalendarWeek /> Tuần </button>
              <button
                className={`schedule-management-page__switch-btn ${viewMode === 'month' ? 'active' : ''}`}
                onClick={() => setViewMode('month')}
              > <FaCalendarAlt /> Tháng </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Bộ lọc loại sự kiện (Giữ nguyên) */}
      { (user.role === 'admin' || selectedUsers.length > 0) && (
        <div className="schedule-management-page__event-type-filters">
          <span>Hiển thị:</span>
          <button
            className={`schedule-management-page__filter-btn ${eventTypeFilters.schedules ? 'active' : ''} filter-schedules`}
            onClick={() => handleEventTypeToggle('schedules')}
          >
            <FaBusinessTime /> Lịch làm việc
          </button>
           <button
            className={`schedule-management-page__filter-btn ${eventTypeFilters.overtime ? 'active' : ''} filter-overtime`}
            onClick={() => handleEventTypeToggle('overtime')}
          >
            <FaClock /> Tăng ca
          </button>
          <button
            className={`schedule-management-page__filter-btn ${eventTypeFilters.appointments ? 'active' : ''} filter-appointments`}
            onClick={() => handleEventTypeToggle('appointments')}
          >
            <FaUserClock /> Lịch hẹn
          </button>
           <button
            className={`schedule-management-page__filter-btn ${eventTypeFilters.leaves ? 'active' : ''} filter-leaves`}
            onClick={() => handleEventTypeToggle('leaves')}
          >
            <FaExclamationTriangle /> Lịch nghỉ
          </button>
        </div>
      )}

      {/* Warning khi chọn quá nhiều users trong table view */}
      {hasWarning && calendarDisplayMode === 'table' && (
        <div className="schedule-management-page__warning-message">
          <FaInfoCircle /> Bạn đang chọn {selectedUsers.length} users. Để xem bảng tốt nhất, nên chọn tối đa 5 users.
        </div>
      )}

      {/* Hiển thị lịch (Giữ nguyên) */}
      { (user.role === 'admin' || selectedUsers.length > 0) ? (
        <>
          {/* Navigation (Giữ nguyên) */}
          <div className="schedule-management-page__month-navigation">
            <button className="schedule-management-page__nav-button" onClick={() => handleDateChange('prev')}>
              <FaChevronLeft /> {(viewMode === 'week' || calendarDisplayMode === 'table') ? 'Tuần trước' : 'Tháng trước'}
            </button>
            <h3>
              {(viewMode === 'week' || calendarDisplayMode === 'table')
                ? `Tuần: ${formatDateISO(getWeekRange(currentDate).start)} - ${formatDateISO(getWeekRange(currentDate).end)}`
                : currentDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
              }
            </h3>
            <button className="schedule-management-page__nav-button" onClick={() => handleDateChange('next')}>
              {(viewMode === 'week' || calendarDisplayMode === 'table') ? 'Tuần sau' : 'Tháng sau'} <FaChevronRight />
            </button>
          </div>
          
          {/* Render Lịch hoặc Bảng */}
          {loading.schedules ? (
             <div className="schedule-management-page__loading"><FaSpinner className="fa-spin"/></div>
          ) : (
            calendarDisplayMode === 'calendar' ? (
              // Chế độ Lịch
              <CalendarView
                schedules={filteredData.schedules}
                overtimeSchedules={filteredData.overtime_schedules} 
                leaveRequests={filteredData.leaves}
                appointments={filteredData.appointments}
                
                workShiftConfig={workShiftConfig.filter(s => s?.is_active)}
                viewMode={viewMode}
                currentDate={currentDate}
                selectedUsers={selectedUsers} 
                
                onEventClick={(event) => toast.info(`Sự kiện: ${event.id || event.reason}`)}
                month={currentDate.getMonth() + 1}
                year={currentDate.getFullYear()}
                onDateClick={(date, leaves) => leaves.length > 0 && toast.info(`Nghỉ phép: ${leaves[0].reason}`)}
              />
            ) : (
              // Chế độ Bảng
              renderTableViewContent()
            )
          )}
        </>
      ) : (
         <div className="schedule-management-page__empty-state">
           <MdOutlineErrorOutline />
           <p>Vui lòng chọn {activeTab === 'doctor-schedule' ? 'bác sĩ' : 'nhân viên'} để xem lịch</p>
           {user.role === 'admin' && (
             <small>(Admin có thể chọn nhiều users để so sánh lịch)</small>
           )}
         </div>
      )}
    </>
  );
  }


  return (
    <div className="schedule-management-page__container">
      <div className="schedule-management-page__management-container">
        <h1 className="schedule-management-page__page-title">Quản lý lịch làm việc</h1>

        {/* TABS (SỬA LOGIC BADGE) */}
        <div className="schedule-management-page__tabs">
          {user.role === 'admin' && (
            <button
              className={`schedule-management-page__tab ${activeTab === 'config' ? 'schedule-management-page__tab--active' : ''}`}
              onClick={() => handleTabChange('config')}
            >
              <FaCog /> Cấu hình ca
            </button>
          )}
          <button
            className={`schedule-management-page__tab ${activeTab === 'doctor-schedule' ? 'schedule-management-page__tab--active' : ''}`}
            onClick={() => handleTabChange('doctor-schedule')}
          >
            <FaUserMd /> Lịch bác sĩ
          </button>
          <button
            className={`schedule-management-page__tab ${activeTab === 'staff-schedule' ? 'schedule-management-page__tab--active' : ''}`}
            onClick={() => handleTabChange('staff-schedule')}
          >
            <FaUserNurse /> Lịch nhân viên
          </button>
          <button
            className={`schedule-management-page__tab ${activeTab === 'manage-registrations' ? 'schedule-management-page__tab--active' : ''}`}
            onClick={() => handleTabChange('manage-registrations')}
          >
            <FaTasks /> Phê duyệt
            {/* (SỬA) Dùng state đếm 'pending' */}
            {(pendingLeaveCount + pendingRegCount + pendingOvertimeCount) > 0 && (
              <span className="schedule-management-page__badge-count">
                {pendingLeaveCount + pendingRegCount + pendingOvertimeCount}
              </span>
            )}
          </button>
          {/* {user.role === 'admin' && (
             <button
                className="schedule-management-page__button schedule-management-page__button--primary"
                style={{marginLeft: 'auto', alignSelf: 'center'}}
                onClick={() => setShowOvertimeEditor(true)}
              >
                <FaClock /> Đăng ký Tăng ca
              </button>
          )} */}
        </div>

        {/* TAB 1: CONFIG (Giữ nguyên) */}
        {activeTab === 'config' && user.role === 'admin' && (
          <div className="schedule-management-page__tab-content">
            <div className="schedule-management-page__config-section">
              <h2 className="schedule-management-page__section-title">Cấu hình ca làm việc</h2>
              <p className="schedule-management-page__section-description">Thiết lập khung giờ làm việc trong tuần</p>
              {workShiftConfig.map((shift, index) => (
                shift ? (
                  <div key={shift.shift_name || index} className="schedule-management-page__shift-config-card">
                    <div className="schedule-management-page__shift-header">
                      <h3>{shift.display_name}</h3>
                      <label className="schedule-management-page__switch">
                        <input
                          type="checkbox"
                          checked={!!shift.is_active}
                          onChange={(e) => handleConfigChange(shift.shift_name, 'is_active', e.target.checked)}
                        />
                        <span className="schedule-management-page__switch-slider"></span>
                      </label>
                    </div>
                    {shift.is_active && (
                      <div className="schedule-management-page__shift-body">
                        <div className="schedule-management-page__form-row">
                          <div className="schedule-management-page__form-group">
                            <label>Bắt đầu</label>
                            <input
                              type="time"
                              className="schedule-management-page__form-control"
                              value={shift.start_time || ''}
                              onChange={(e) => handleConfigChange(shift.shift_name, 'start_time', e.target.value)}
                            />
                          </div>
                          <div className="schedule-management-page__form-group">
                            <label>Kết thúc</label>
                            <input
                              type="time"
                              className="schedule-management-page__form-control"
                              value={shift.end_time || ''}
                              onChange={(e) => handleConfigChange(shift.shift_name, 'end_time', e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="schedule-management-page__form-group">
                          <label>Ngày làm việc</label>
                          <div className="schedule-management-page__day-checkboxes">
                            {weekDays.map(day => (
                              <label key={day.value} className="schedule-management-page__checkbox-label">
                                <input
                                  type="checkbox"
                                  checked={(shift.days_of_week || []).includes(day.value)}
                                  onChange={() => handleDayToggle(shift.shift_name, day.value)}
                                />
                                <span>{day.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null
              ))}
              <button
                className="schedule-management-page__button schedule-management-page__button--primary"
                onClick={handleSaveConfig}
                disabled={loading.submit}
              >
                {loading.submit ? <FaSpinner className="fa-spin" /> : <FaCheck />} Lưu cấu hình
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: LỊCH BÁC SĨ (Giữ nguyên) */}
        {activeTab === 'doctor-schedule' && (
          <div className="schedule-management-page__tab-content">
             {renderCalendarControls(doctors)}
          </div>
        )}
        
        {/* TAB 3: LỊCH NHÂN VIÊN (Giữ nguyên) */}
        {activeTab === 'staff-schedule' && (
          <div className="schedule-management-page__tab-content">
             {renderCalendarControls(staffList)}
          </div>
        )}

        {/* (SỬA) TAB 4: PHÊ DUYỆT (Gộp 3 loại) */}
        {activeTab === 'manage-registrations' && (
          <div className="schedule-management-page__tab-content">
            <h2 className="schedule-management-page__section-title">Danh sách chờ phê duyệt</h2>
            
            {/* Sub-tabs (Giữ nguyên) */}
            <div className="schedule-management-page__filter-buttons" style={{marginBottom: '2rem'}}>
               <button
                  className={`schedule-management-page__filter-btn ${activeSubTab === 'leaves' ? 'schedule-management-page__filter-btn--active' : ''}`}
                  onClick={() => setActiveSubTab('leaves')}
                >
                  Đơn Nghỉ Phép
                </button>
                <button
                  className={`schedule-management-page__filter-btn ${activeSubTab === 'flexible' ? 'schedule-management-page__filter-btn--active' : ''}`}
                  onClick={() => setActiveSubTab('flexible')}
                >
                  Đăng Ký Lịch
                </button>
                <button
                  className={`schedule-management-page__filter-btn ${activeSubTab === 'overtime' ? 'schedule-management-page__filter-btn--active' : ''}`}
                  onClick={() => setActiveSubTab('overtime')}
                >
                  Đăng Ký Tăng Ca
                </button>
            </div>
            
            {/* 1. Đơn Nghỉ Phép (SỬA) */}
            {activeSubTab === 'leaves' && (
              <div className="schedule-management-page__pending-leaves-section">
                
                {/* (SỬA) Container cho 3 bộ lọc */}
                <div className="schedule-management-page__filters-container">
                  {/* Filter 1: Search */}
                  <div className="schedule-management-page__filter-section schedule-management-page__filter-section--search">
                    <input
                      type="text"
                      placeholder="Tìm theo tên hoặc lý do..."
                      className="schedule-management-page__form-control"
                      value={leaveSearch}
                      onChange={(e) => setLeaveSearch(e.target.value)}
                    />
                  </div>
                  {/* Filter 2: Roles */}
                  {renderRoleFilters()}
                  {/* Filter 3: Status */}
                  {renderStatusFilters()}
                </div>
                
                <PendingLeaveTable
                  leaves={filteredLeaves} 
                  loading={loading.leaves}
                  onRowClick={handleOpenDetailModal}
                  // (SỬA) Tải lại cả bảng VÀ count
                  onActionComplete={() => {
                    loadPendingLeaves();
                    loadAllPendingCounts();
                  }}
                />
              </div>
            )}
            
            {/* 2. Đăng Ký Lịch Linh Hoạt (SỬA) */}
            {activeSubTab === 'flexible' && (
              <>
                {/* (SỬA) Container cho 3 bộ lọc */}
                <div className="schedule-management-page__filters-container">
                  {/* Filter 1: Search */}
                  <div className="schedule-management-page__filter-section schedule-management-page__filter-section--search">
                    <input
                      type="text"
                      placeholder="Tìm theo tên nhân viên..."
                      className="schedule-management-page__form-control"
                      value={flexibleSearch}
                      onChange={(e) => setFlexibleSearch(e.target.value)}
                    />
                  </div>
                  {/* Filter 2: Roles */}
                  {renderRoleFilters()}
                  {/* Filter 3: Status */}
                  {renderStatusFilters()}
                </div>
                
                <ScheduleApprovalTable
                  registrations={filteredRegistrations} 
                  loading={loading.registrations}
                  // (SỬA) Tải lại cả bảng VÀ count
                  onActionComplete={() => {
                    loadPendingRegistrations();
                    loadAllPendingCounts();
                  }}
                  workShiftConfig={workShiftConfig}
                />
              </>
            )}
            
            {/* 3. Đăng Ký Tăng Ca (SỬA) */}
            {activeSubTab === 'overtime' && (
              <>
                {/* (SỬA) Container cho 3 bộ lọc */}
                <div className="schedule-management-page__filters-container">
                  {/* Filter 1: Search */}
                  <div className="schedule-management-page__filter-section schedule-management-page__filter-section--search">
                    <input
                      type="text"
                      placeholder="Tìm theo tên hoặc lý do..."
                      className="schedule-management-page__form-control"
                      value={overtimeSearch}
                      onChange={(e) => setOvertimeSearch(e.target.value)}
                    />
                  </div>
                  {/* Filter 2: Roles */}
                  {renderRoleFilters()}
                  {/* Filter 3: Status */}
                  {renderStatusFilters()}
                </div>
                
                <OvertimeApprovalTable
                  overtimes={filteredOvertimes} 
                  loading={loading.overtimes}
                  // (SỬA) Tải lại cả bảng VÀ count
                  onActionComplete={() => {
                    loadPendingOvertimes();
                    loadAllPendingCounts();
                  }}
                />
              </>
            )}
            
          </div>
        )}
      </div>

      {/* (Các Modal Đơn nghỉ - giữ nguyên) */}
      {showRejectModal && (
        <div className="schedule-management-page__modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="schedule-management-page__modal-content" onClick={e => e.stopPropagation()}>
            <h2>Lý do từ chối đơn nghỉ</h2>
            <div className="schedule-management-page__form-group">
               <label>Lý do từ chối *</label>
               <textarea
                 className="schedule-management-page__form-control"
                 rows="4"
                 placeholder="Lý do từ chối..."
                 value={rejectReason}
                 onChange={e => setRejectReason(e.target.value)}
               />
            </div>
            <div className="schedule-management-page__modal-footer">
              <button 
                 className="schedule-management-page__button schedule-management-page__button--secondary" 
                 onClick={() => setShowRejectModal(false)}
                 disabled={loading.submit}
              > Hủy </button>
              <button 
                 className="schedule-management-page__button schedule-management-page__button--danger" 
                 onClick={handleRejectLeave} 
                 disabled={loading.submit || !rejectReason.trim()}
              > {loading.submit ? <FaSpinner className="fa-spin"/> : 'Xác nhận từ chối'} </button>
            </div>
          </div>
        </div>
      )}
      <LeaveDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        leave={selectedLeave}
        workShiftConfig={workShiftConfig.filter(s => s?.is_active)}
        onApprove={handleOpenConfirmModal}
        onReject={handleOpenRejectModal}
        loading={loading.submit}
      />
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleApproveLeave}
        title="Xác nhận duyệt đơn"
        message={`Bạn có chắc muốn DUYỆT đơn xin nghỉ của ${selectedLeave?.user?.full_name}?`}
        loading={loading.submit}
      />
      
      {/* (Modal Tăng Ca (cho Admin) - giữ nguyên) */}
      <OvertimeEditor
        isOpen={showOvertimeEditor}
        onClose={() => setShowOvertimeEditor(false)}
        onSubmitted={() => {
          // Tải lại lịch nếu đang xem
          if(activeTab === 'doctor-schedule' || activeTab === 'staff-schedule') {
            loadUserCalendarData();
          }
          // Tải lại count
          if(activeTab === 'manage-registrations') {
            loadAllPendingCounts();
          }
        }}
        userRole={user.role}
        adminProps={{
          userList: allUsers.map(u => ({ id: u.id, full_name: u.label })), 
          selectedUserId: selectedUserForOvertime,
          onUserChange: setSelectedUserForOvertime
        }}
      />
    </div>
  );
};

export default ScheduleManagementPage;