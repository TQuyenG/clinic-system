// client/src/pages/MySchedulePage.js
// CẬP NHẬT: Thêm view controls đầy đủ (Hôm nay/Tuần/Tháng, Lịch/Bảng, Bộ lọc sự kiện)

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import CalendarView from '../components/schedule/CalendarView';
import ScheduleTableView from '../components/schedule/ScheduleTableView';
import LeaveRequestModal from '../components/schedule/LeaveRequestModal';
import MyLeaveTable from '../components/schedule/MyLeaveTable';
import ConfirmationModal from '../components/schedule/ConfirmationModal';
import FlexibleScheduleEditor from '../components/schedule/FlexibleScheduleEditor';
import OvertimeEditor from '../components/schedule/OvertimeEditor';

import './MySchedulePage.css';

// === IMPORT ICONS ===
import {
  FaCalendarAlt, FaEnvelopeOpenText, FaPlus, FaChevronLeft, FaChevronRight,
  FaTimes, FaSpinner, FaCheckCircle, FaTimesCircle, FaExclamationCircle,
  FaArchive, FaUserClock, FaClock, 
  FaCalendarDay, FaCalendarWeek, FaCalendarCheck, FaList, // MỚI
  FaBusinessTime // MỚI
} from 'react-icons/fa';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Helpers
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

const MySchedulePage = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('schedule'); 

  // Data
  const [workShiftConfig, setWorkShiftConfig] = useState([]);
  const [calendarData, setCalendarData] = useState({
    schedules: [],
    overtime_schedules: [],
    leaves: [],
    appointments: []
  });
  const [myLeaves, setMyLeaves] = useState([]);
  const [filteredLeaves, setFilteredLeaves] = useState([]);

  // MỚI: View Controls (giống Admin)
  const [viewMode, setViewMode] = useState('week'); // 'day' | 'week' | 'month'
  const [calendarDisplayMode, setCalendarDisplayMode] = useState('calendar'); // 'calendar' | 'table'
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // MỚI: Event Type Filters
  const [eventTypeFilters, setEventTypeFilters] = useState({
    schedules: true,
    overtime: true,
    leaves: true,
    appointments: true
  });

  // Old calendar state (for backward compatibility)
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // Filter state (Tab 2)
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal state
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [showDetailPopup, setShowDetailPopup] = useState(false);
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);
  const [showFlexibleEditor, setShowFlexibleEditor] = useState(false);
  const [showOvertimeEditor, setShowOvertimeEditor] = useState(false);

  // Loading
  const [loading, setLoading] = useState({
    config: false,
    leaves: false, 
    calendar: false,
    submit: false
  });

  // ========== INIT ==========
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (!token || !userStr) {
      toast.error('Vui lòng đăng nhập');
      window.location.href = '/login';
      return;
    }
    try {
      const userData = JSON.parse(userStr);
      if (userData.role !== 'doctor' && userData.role !== 'staff') {
        toast.error('Bạn không có quyền truy cập trang này');
        window.location.href = '/';
        return;
      }
      setUser(userData);
      
      loadWorkShiftConfig();
      loadMyLeaves();
      loadMyCalendarData(userData);
      
      // Xử lý link highlight từ thông báo
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      
      if (tab === 'register_schedule') {
        setActiveTab('register_schedule');
        setShowFlexibleEditor(true);
      }
      if (tab === 'overtime') {
        setActiveTab('overtime');
      }

    } catch (error) {
      console.error('Parse user error:', error);
      window.location.href = '/login';
    }
  }, []);

  // Tải lại dữ liệu khi đổi tab hoặc date/viewMode
  useEffect(() => {
    if (!user) return;
    
    if (activeTab === 'schedule') {
      loadMyCalendarData(user);
    }
    if (activeTab === 'leaves') {
      loadMyLeaves();
    }
    
  }, [user, activeTab, currentDate, viewMode]);

  // ========== LOAD DATA ==========
  
  const loadMyCalendarData = async (currentUser) => {
    if (!currentUser) return;
    try {
      setLoading(prev => ({ ...prev, calendar: true }));
      const token = localStorage.getItem('token');
      
      let range;
      if (viewMode === 'day') {
        range = { start: new Date(currentDate), end: new Date(currentDate) };
        range.end.setHours(23,59,59,999);
      } else if (viewMode === 'week') {
        range = getWeekRange(currentDate);
      } else {
        range = getMonthRange(currentDate);
      }

      const params = new URLSearchParams({
        user_ids: currentUser.id, 
        date_from: formatDateISO(range.start),
        date_to: formatDateISO(range.end),
        types: 'schedules,overtime,leaves,appointments'
      });

      const response = await axios.get(
        `${API_URL}/calendar/view?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setCalendarData(response.data.data);
      }
    } catch (error) {
      console.error('Load my calendar data error:', error);
      toast.error('Không thể tải dữ liệu lịch làm việc');
    } finally {
      setLoading(prev => ({ ...prev, calendar: false }));
    }
  };

  const loadWorkShiftConfig = async () => {
    try {
      setLoading(prev => ({ ...prev, config: true }));
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/work-shifts/config`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setWorkShiftConfig(response.data.data.filter(s => s.is_active));
      }
    } catch (error) {
      console.error('Load work shift config error:', error);
    } finally {
      setLoading(prev => ({ ...prev, config: false }));
    }
  };

  const loadMyLeaves = async () => {
    try {
      setLoading(prev => ({ ...prev, leaves: true }));
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/leave-requests/my-leaves`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        const sortedLeaves = response.data.data.sort((a, b) => new Date(b.requested_at) - new Date(a.requested_at));
        setMyLeaves(sortedLeaves);
        handleStatusFilterChange(statusFilter, sortedLeaves);
      }
    } catch (error) {
      console.error('Load my leaves error:', error);
      toast.error('Không thể tải danh sách đơn nghỉ');
    } finally {
      setLoading(prev => ({ ...prev, leaves: false }));
    }
  };

  // ========== HANDLERS ==========
  
  // MỚI: View Mode Handlers
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    if (mode === 'day') {
      setCurrentDate(new Date());
    } else if (mode === 'week') {
      setCurrentDate(new Date());
    } else if (mode === 'month') {
      setCurrentDate(new Date());
    }
  };

  const handleDateNavigation = (direction) => {
    const newDate = new Date(currentDate);
    
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    
    setCurrentDate(newDate);
  };

  const handleTodayClick = () => {
    setCurrentDate(new Date());
  };

  const handleEventTypeFilterToggle = (type) => {
    setEventTypeFilters(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  // Old handlers (for backward compatibility)
  const handleMonthChange = (direction) => {
    if (direction === 'prev') {
      if (currentMonth === 1) {
        setCurrentMonth(12);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    } else {
      if (currentMonth === 12) {
        setCurrentMonth(1);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    }
  };

  const handleStatusFilterChange = (status, leavesData = null) => {
    const dataToFilter = leavesData || myLeaves;
    setStatusFilter(status);
    if (status === 'all') {
      setFilteredLeaves(dataToFilter);
    } else {
      setFilteredLeaves(dataToFilter.filter(l => l.status === status));
    }
  };

  const handleViewLeaveDetail = (leave) => {
    setSelectedLeave(leave);
    setShowDetailPopup(true);
  };

  const handleCancelLeave = (leave) => {
    setSelectedLeave(leave);
    setShowCancelConfirmModal(true);
  };

  const confirmCancelLeave = async () => {
    if (!selectedLeave) return;
    try {
      setLoading(prev => ({ ...prev, submit: true }));
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/leave-requests/${selectedLeave.id}/cancel`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Đã hủy đơn xin nghỉ');
      setShowCancelConfirmModal(false);
      setSelectedLeave(null);
      loadMyLeaves();
      if (activeTab === 'schedule' && user) {
        loadMyCalendarData(user);
      }
    } catch (error) {
      console.error('Cancel leave error:', error);
      toast.error(error.response?.data?.message || 'Không thể hủy đơn');
    } finally {
      setLoading(prev => ({ ...prev, submit: false }));
    }
  };

  const handleLeaveModalClose = () => {
    setShowLeaveModal(false);
  };

  const handleLeaveSubmit = async (formData) => {
    try {
      setLoading(prev => ({ ...prev, submit: true }));
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/leave-requests`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Đã gửi đơn xin nghỉ. Vui lòng chờ duyệt.');
      setShowLeaveModal(false);
      loadMyLeaves();
      if (activeTab === 'schedule' && user) {
        loadMyCalendarData(user);
      }
    } catch (error) {
      console.error('Submit leave error:', error);
      toast.error(error.response?.data?.message || 'Không thể gửi đơn xin nghỉ');
    } finally {
      setLoading(prev => ({ ...prev, submit: false }));
    }
  };

  // Helper functions
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  };

  const getLeaveTypeText = (type) => {
    const types = {
      full_day: 'Nghỉ cả ngày',
      morning: 'Nghỉ buổi sáng',
      afternoon: 'Nghỉ buổi chiều',
      time_range: 'Nghỉ theo giờ'
    };
    return types[type] || type;
  };

  const getStatusText = (status) => {
    const statuses = {
      pending: 'Chờ duyệt',
      approved: 'Đã duyệt',
      rejected: 'Từ chối'
    };
    return statuses[status] || status;
  };

  const getStatusBadgeClass = (status) => {
    const classes = {
      pending: 'my-schedule-page__badge--warning',
      approved: 'my-schedule-page__badge--success',
      rejected: 'my-schedule-page__badge--danger'
    };
    return classes[status] || 'my-schedule-page__badge--secondary';
  };

  // MỚI: Render Navigation Label
  const renderNavigationLabel = () => {
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('vi-VN', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } else if (viewMode === 'week') {
      const range = getWeekRange(currentDate);
      return `Tuần từ ${range.start.toLocaleDateString('vi-VN')} - ${range.end.toLocaleDateString('vi-VN')}`;
    } else {
      return `Tháng ${currentDate.getMonth() + 1}/${currentDate.getFullYear()}`;
    }
  };

  // Filter calendar data
  const filteredCalendarData = {
    schedules: eventTypeFilters.schedules ? calendarData.schedules : [],
    overtime_schedules: eventTypeFilters.overtime ? calendarData.overtime_schedules : [],
    leaves: eventTypeFilters.leaves ? calendarData.leaves.filter(l => l.status === 'approved') : [],
    appointments: eventTypeFilters.appointments ? calendarData.appointments : []
  };

  if (!user) {
    return (
      <div className="my-schedule-page__loading-page">
        <FaSpinner className="fa-spin" /> Đang tải...
      </div>
    );
  }

  return (
    <div className="my-schedule-page__container">
      <div className="my-schedule-page__content-wrapper">
        
        {/* HEADER */}
        <div className="my-schedule-page__header">
          <h1 className="my-schedule-page__page-title">Lịch Làm Việc Của Tôi</h1>
          <button
            className="my-schedule-page__button my-schedule-page__button--primary"
            onClick={() => setShowLeaveModal(true)}
          >
            <FaPlus /> Tạo Đơn Nghỉ
          </button>
        </div>

        {/* TABS */}
        <div className="my-schedule-page__tabs">
          <button
            className={`my-schedule-page__tab ${activeTab === 'schedule' ? 'my-schedule-page__tab--active' : ''}`}
            onClick={() => setActiveTab('schedule')}
          >
            <FaCalendarAlt /> Lịch Tổng Quan
          </button>
          <button
            className={`my-schedule-page__tab ${activeTab === 'register_schedule' ? 'my-schedule-page__tab--active' : ''}`}
            onClick={() => setActiveTab('register_schedule')}
          >
            <FaUserClock /> Đăng ký Lịch
          </button>
          <button
            className={`my-schedule-page__tab ${activeTab === 'overtime' ? 'my-schedule-page__tab--active' : ''}`}
            onClick={() => setActiveTab('overtime')}
          >
            <FaClock /> Đăng ký Tăng ca
          </button>
          <button
            className={`my-schedule-page__tab ${activeTab === 'leaves' ? 'my-schedule-page__tab--active' : ''}`}
            onClick={() => setActiveTab('leaves')}
          >
            <FaEnvelopeOpenText /> Đơn Xin Nghỉ
          </button>
        </div>

        {/* TAB 1: LỊCH TỔNG QUAN (MỚI - với view controls) */}
        {activeTab === 'schedule' && (
          <div className="my-schedule-page__tab-content">
            
            {/* VIEW CONTROLS */}
            <div className="my-schedule-page__view-controls-header">
              
              {/* Left: View Mode Selector */}
              <div className="my-schedule-page__view-mode-group">
                <div className="my-schedule-page__view-switcher">
                  <button
                    className={`my-schedule-page__switch-btn ${viewMode === 'day' ? 'active' : ''}`}
                    onClick={() => handleViewModeChange('day')}
                  >
                    <FaCalendarDay /> Ngày
                  </button>
                  <button
                    className={`my-schedule-page__switch-btn ${viewMode === 'week' ? 'active' : ''}`}
                    onClick={() => handleViewModeChange('week')}
                  >
                    <FaCalendarWeek /> Tuần
                  </button>
                  <button
                    className={`my-schedule-page__switch-btn ${viewMode === 'month' ? 'active' : ''}`}
                    onClick={() => handleViewModeChange('month')}
                  >
                    <FaCalendarCheck /> Tháng
                  </button>
                </div>
                
                <div className="my-schedule-page__view-switcher">
                  <button
                    className={`my-schedule-page__switch-btn ${calendarDisplayMode === 'calendar' ? 'active' : ''}`}
                    onClick={() => setCalendarDisplayMode('calendar')}
                  >
                    <FaCalendarAlt /> Lịch
                  </button>
                  <button
                    className={`my-schedule-page__switch-btn ${calendarDisplayMode === 'table' ? 'active' : ''}`}
                    onClick={() => setCalendarDisplayMode('table')}
                  >
                    <FaList /> Bảng
                  </button>
                </div>
              </div>

              {/* Right: Today Button */}
              <button 
                className="my-schedule-page__today-button"
                onClick={handleTodayClick}
              >
                Hôm nay
              </button>
            </div>

            {/* EVENT TYPE FILTERS */}
            <div className="my-schedule-page__event-filters">
              <span>Hiển thị:</span>
              <button 
                className={`my-schedule-page__filter-btn filter-schedules ${eventTypeFilters.schedules ? 'active' : ''}`}
                onClick={() => handleEventTypeFilterToggle('schedules')}
              >
                Lịch làm việc
              </button>
              <button 
                className={`my-schedule-page__filter-btn filter-overtime ${eventTypeFilters.overtime ? 'active' : ''}`}
                onClick={() => handleEventTypeFilterToggle('overtime')}
              >
                <FaBusinessTime /> Tăng ca
              </button>
              <button 
                className={`my-schedule-page__filter-btn filter-appointments ${eventTypeFilters.appointments ? 'active' : ''}`}
                onClick={() => handleEventTypeFilterToggle('appointments')}
              >
                Lịch hẹn
              </button>
              <button 
                className={`my-schedule-page__filter-btn filter-leaves ${eventTypeFilters.leaves ? 'active' : ''}`}
                onClick={() => handleEventTypeFilterToggle('leaves')}
              >
                Lịch nghỉ
              </button>
            </div>

            {/* NAVIGATION */}
            <div className="my-schedule-page__month-navigation">
              <button 
                className="my-schedule-page__nav-button"
                onClick={() => handleDateNavigation('prev')}
              >
                <FaChevronLeft /> Trước
              </button>
              <h2>{renderNavigationLabel()}</h2>
              <button 
                className="my-schedule-page__nav-button"
                onClick={() => handleDateNavigation('next')}
              >
                Sau <FaChevronRight />
              </button>
            </div>
            
            {/* CALENDAR/TABLE VIEW */}
            {loading.calendar ? (
              <div className="my-schedule-page__loading">
                <FaSpinner className="fa-spin" /> Đang tải lịch...
              </div>
            ) : (
              <>
                {calendarDisplayMode === 'calendar' ? (
                  <CalendarView
                    viewMode={viewMode}
                    currentDate={currentDate}
                    month={currentDate.getMonth() + 1}
                    year={currentDate.getFullYear()}
                    workShiftConfig={workShiftConfig}
                    schedules={filteredCalendarData.schedules}
                    overtimeSchedules={filteredCalendarData.overtime_schedules}
                    leaveRequests={filteredCalendarData.leaves}
                    appointments={filteredCalendarData.appointments}
                    onDateClick={handleViewLeaveDetail}
                  />
                ) : (
                  <ScheduleTableView
                    schedules={filteredCalendarData.schedules}
                    overtimeSchedules={filteredCalendarData.overtime_schedules}
                    leaves={filteredCalendarData.leaves}
                    appointments={filteredCalendarData.appointments}
                    eventTypeFilters={eventTypeFilters}
                    viewMode={viewMode}
                    currentDate={currentDate}
                    month={currentDate.getMonth() + 1}
                    year={currentDate.getFullYear()}
                    workShiftConfig={workShiftConfig}
                    loading={loading.calendar}
                  />
                )}
              </>
            )}

            {/* Popup chi tiết đơn nghỉ */}
            {showDetailPopup && selectedLeave && (
              <div className="my-schedule-page__leave-detail-popup" onClick={() => setShowDetailPopup(false)}>
                <div className="my-schedule-page__popup-content" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="my-schedule-page__btn-close-popup"
                    onClick={() => setShowDetailPopup(false)}
                  >
                    <FaTimes />
                  </button>
                  <h3>Thông tin đơn nghỉ</h3>
                  <div className="my-schedule-page__detail-item">
                    <strong>Loại:</strong>
                    <span>{getLeaveTypeText(selectedLeave.leave_type)}</span>
                  </div>
                  <div className="my-schedule-page__detail-item">
                    <strong>Thời gian:</strong>
                    <span>
                      {formatDate(selectedLeave.date_from)}
                      {selectedLeave.date_to && ` - ${formatDate(selectedLeave.date_to)}`}
                    </span>
                  </div>
                   {selectedLeave.leave_type === 'time_range' && (
                     <div className="my-schedule-page__detail-item">
                        <strong>Khung giờ:</strong>
                        <span>{selectedLeave.time_from?.slice(0,5)} - {selectedLeave.time_to?.slice(0,5)}</span>
                      </div>
                   )}
                   <div className="my-schedule-page__detail-item">
                    <strong>Lý do:</strong>
                    <span>{selectedLeave.reason}</span>
                  </div>
                  <div className="my-schedule-page__detail-item">
                    <strong>Trạng thái:</strong>
                    <span>
                      <span className={`my-schedule-page__badge ${getStatusBadgeClass(selectedLeave.status)}`}>
                        {getStatusText(selectedLeave.status)}
                      </span>
                    </span>
                  </div>
                   {selectedLeave.status === 'rejected' && selectedLeave.reject_reason && (
                      <div className="my-schedule-page__detail-item">
                        <strong>Lý do từ chối:</strong>
                        <span>{selectedLeave.reject_reason}</span>
                      </div>
                    )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ĐƠN XIN NGHỈ (Giữ nguyên) */}
        {activeTab === 'leaves' && (
          <div className="my-schedule-page__tab-content">
            <div className="my-schedule-page__filter-section">
              <label>Lọc theo trạng thái:</label>
              <div className="my-schedule-page__filter-buttons">
                <button
                  className={`my-schedule-page__filter-btn ${statusFilter === 'all' ? 'my-schedule-page__filter-btn--active' : ''}`}
                  onClick={() => handleStatusFilterChange('all')}
                >
                  <FaArchive /> Tất cả ({myLeaves.length})
                </button>
                <button
                  className={`my-schedule-page__filter-btn ${statusFilter === 'pending' ? 'my-schedule-page__filter-btn--active' : ''}`}
                  onClick={() => handleStatusFilterChange('pending')}
                >
                  <FaExclamationCircle /> Chờ duyệt ({myLeaves.filter(l => l.status === 'pending').length})
                </button>
                 <button
                  className={`my-schedule-page__filter-btn ${statusFilter === 'approved' ? 'my-schedule-page__filter-btn--active' : ''}`}
                  onClick={() => handleStatusFilterChange('approved')}
                >
                  <FaCheckCircle /> Đã duyệt ({myLeaves.filter(l => l.status === 'approved').length})
                </button>
                <button
                  className={`my-schedule-page__filter-btn ${statusFilter === 'rejected' ? 'my-schedule-page__filter-btn--active' : ''}`}
                  onClick={() => handleStatusFilterChange('rejected')}
                >
                  <FaTimesCircle /> Từ chối ({myLeaves.filter(l => l.status === 'rejected').length})
                </button>
              </div>
            </div>
            {loading.leaves ? (
              <div className="my-schedule-page__loading">
                <FaSpinner className="fa-spin" /> Đang tải danh sách...
              </div>
            ) : (
              <MyLeaveTable
                leaves={filteredLeaves}
                onRowClick={handleViewLeaveDetail}
                onCancelClick={handleCancelLeave}
                loading={loading.submit}
              />
            )}
          </div>
        )}
        
        {/* TAB 3: ĐĂNG KÝ LỊCH */}
        {activeTab === 'register_schedule' && (
          <div className="my-schedule-page__tab-content">
             <div className="my-schedule-page__section-header">
                <h2>Đăng ký Lịch Làm Việc Hàng Tuần</h2>
                <p>
                  Đây là nơi bạn đăng ký lịch làm việc cố định (full-time) hoặc linh hoạt (part-time).
                  Lịch sau khi được duyệt sẽ tự động áp dụng cho các tuần tiếp theo.
                </p>
                <button
                  className="my-schedule-page__button my-schedule-page__button--primary"
                  onClick={() => setShowFlexibleEditor(true)}
                >
                  <FaUserClock /> Mở Form Đăng Ký / Cập Nhật
                </button>
             </div>
          </div>
        )}
        
        {/* TAB 4: ĐĂNG KÝ TĂNG CA */}
        {activeTab === 'overtime' && (
          <div className="my-schedule-page__tab-content">
             <div className="my-schedule-page__section-header">
                <h2>Đăng ký Tăng Ca (Overtime)</h2>
                <p>
                  Đăng ký các ca làm việc ngoài giờ hoặc bổ sung.
                  Lịch tăng ca chỉ có hiệu lực trong tuần bạn chọn và cần admin duyệt.
                </p>
                <button
                  className="my-schedule-page__button my-schedule-page__button--primary"
                  onClick={() => setShowOvertimeEditor(true)}
                >
                  <FaClock /> Mở Form Đăng Ký Tăng Ca
                </button>
             </div>
          </div>
        )}
        
      </div>

      {/* MODALS */}
      <LeaveRequestModal
        isOpen={showLeaveModal}
        onClose={handleLeaveModalClose}
        onSubmit={handleLeaveSubmit}
        loading={loading.submit}
      />
      <ConfirmationModal
        isOpen={showCancelConfirmModal}
        onClose={() => setShowCancelConfirmModal(false)}
        onConfirm={confirmCancelLeave}
        title="Xác nhận hủy đơn"
        message={`Bạn có chắc muốn HỦY đơn xin nghỉ (từ ${formatDate(selectedLeave?.date_from)})?`}
        loading={loading.submit}
      />
      <FlexibleScheduleEditor
        isOpen={showFlexibleEditor}
        onClose={() => setShowFlexibleEditor(false)}
        onSubmitted={() => {
          // Không cần làm gì, user phải chờ duyệt
        }}
      />
      <OvertimeEditor
        isOpen={showOvertimeEditor}
        onClose={() => setShowOvertimeEditor(false)}
        onSubmitted={() => {
          if (activeTab === 'schedule' && user) {
            loadMyCalendarData(user);
          }
        }}
        userRole={user?.role}
      />
      
    </div>
  );
};

export default MySchedulePage;