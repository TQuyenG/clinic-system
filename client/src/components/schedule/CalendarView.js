// client/src/components/schedule/CalendarView.js
// PHIÊN BẢN CẬP NHẬT HOÀN CHỈNH (Lần 8)
// 1. (FIX) Sửa logic conflict: Chỉ ẩn ca làm việc nếu 'start_time' nằm trong ca nghỉ.
// 2. (FIX) Giữ logic hiển thị đúng giờ nghỉ (theo ca/theo giờ).
// 3. (FIX) Thêm class màu cho các loại lịch (Tăng ca -> Tím).

import React, { useState, useEffect, useMemo } from 'react';
import './CalendarView.css';
import { FaExclamationTriangle, FaBusinessTime, FaUserClock, FaClock, FaUserCheck } from 'react-icons/fa';

// Bảng màu (Giữ nguyên)
const USER_COLORS = [
  { bg: '#dbeafe', border: '#93c5fd' }, // Xanh dương
  { bg: '#a0d9b5', border: '#81b997' }, // Xanh lá
  { bg: '#fde68a', border: '#f6d057' }, // Vàng
  { bg: '#ddd6fe', border: '#a78bfa' }, // Tím
  { bg: '#fbcfe8', border: '#f472b6' }, // Hồng
];

// Helper gán màu (giữ nguyên)
const getColorForUser = (userId, selectedUsers) => {
  if (!selectedUsers || selectedUsers.length === 0) {
    return null; 
  }
  const index = selectedUsers.findIndex(u => u.value === userId);
  if (index === -1) {
    const hash = String(userId).split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    return USER_COLORS[hash % USER_COLORS.length];
  }
  return USER_COLORS[index % USER_COLORS.length];
};


// ===================================================================
// === LOGIC CHO LỊCH THÁNG (MONTH VIEW) ===
// (ĐÃ SỬA: Lỗi logic nghỉ đè lên lịch làm việc)
// ===================================================================
const MonthView = ({ 
  month, 
  year, 
  workShiftConfig = [], 
  schedules = [],
  overtimeSchedules = [],
  leaveRequests = [], 
  appointments = [], 
  onDateClick 
}) => {
  
  const getDaysInMonth = (month, year) => new Date(year, month, 0).getDate();
  const getFirstDayOfMonth = (month, year) => new Date(year, month - 1, 1).getDay();

  // (Các hàm check helper)
  const isDateOnLeave = (dateObj) => {
    const checkTime = dateObj.getTime();
    return leaveRequests.some(leave => {
      const dateFrom = new Date(leave.date_from).setHours(0,0,0,0);
      const dateTo = leave.date_to ? new Date(leave.date_to).setHours(0,0,0,0) : dateFrom;
      return checkTime >= dateFrom && checkTime <= dateTo;
    });
  };
  
  const isDateWithAppointment = (dateObj) => {
    const checkTime = dateObj.getTime();
    return appointments.some(app => 
      new Date(app.appointment_date).setHours(0,0,0,0) === checkTime
    );
  };
  
  const hasWorkSchedule = (dateObj) => {
    const checkTime = dateObj.getTime();
    return schedules.some(s => new Date(s.date).setHours(0,0,0,0) === checkTime);
  };
  
  const hasOvertime = (dateObj) => {
    const checkTime = dateObj.getTime();
    return overtimeSchedules.some(s => new Date(s.date).setHours(0,0,0,0) === checkTime);
  };

  // (Render)
  const daysInMonth = getDaysInMonth(month, year);
  const firstDay = getFirstDayOfMonth(month, year);
  const days = [];
  const startDayIndex = firstDay === 0 ? 6 : firstDay - 1;

  for (let i = 0; i < startDayIndex; i++) { days.push(null); }
  for (let date = 1; date <= daysInMonth; date++) { days.push(date); }

  const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const today = new Date();
  today.setHours(0,0,0,0);

  return (
    <div className="calendar-view__container">
      <div className="calendar-view__grid">
        {weekDays.map(day => (
          <div key={day} className="calendar-view__day-header">
            {day}
          </div>
        ))}

        {days.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="calendar-view__day calendar-view__day--empty" />;
          }

          const dateObj = new Date(year, month - 1, date);
          const isLeave = isDateOnLeave(dateObj);
          // (SỬA FIX 2) Lịch làm việc chỉ hiện khi KHÔNG nghỉ
          const isWork = !isLeave && hasWorkSchedule(dateObj);
          const hasAppt = isDateWithAppointment(dateObj);
          // (SỬA FIX 2) Tăng ca chỉ hiện khi KHÔNG nghỉ
          const hasOT = !isLeave && hasOvertime(dateObj);
          
          let dayClass = 'calendar-view__day';
          if (isLeave) dayClass += ' calendar-view__day--on-leave';
          else if (isWork || hasOT) dayClass += ' calendar-view__day--working'; // Gộp cả 2
          else dayClass += ' calendar-view__day--other-month';
          
          if (dateObj.getTime() === today.getTime()) dayClass += ' calendar-view__day--today';
          
          const leaveInfo = isLeave ? leaveRequests.filter(l => {
             const dateFrom = new Date(l.date_from).setHours(0,0,0,0);
             const dateTo = l.date_to ? new Date(l.date_to).setHours(0,0,0,0) : dateFrom;
             return dateObj.getTime() >= dateFrom && dateObj.getTime() <= dateTo;
          }) : [];
          
          const appointmentInfo = hasAppt ? appointments.filter(app => 
             new Date(app.appointment_date).setHours(0,0,0,0) === dateObj.getTime()
          ) : [];

          return (
            <div
              key={date}
              className={dayClass}
              onClick={() => onDateClick && onDateClick(dateObj, leaveInfo, appointmentInfo)}
            >
              <span className="calendar-view__date-number">{date}</span>
              <div className="calendar-view__status-icons">
                {isWork && <FaBusinessTime className="calendar-view__icon-work" title="Lịch làm việc" />}
                {hasOT && <FaClock className="calendar-view__icon-overtime" title="Có tăng ca" />}
                {isLeave && <FaExclamationTriangle className="calendar-view__icon-leave" title="Nghỉ phép" />}
                {hasAppt && <FaUserClock className="calendar-view__icon-appointment" title={`Có ${appointmentInfo.length} lịch hẹn`} />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Chú thích (SỬA: Thêm Tăng ca) */}
      <div className="calendar-view__legend">
        <div className="calendar-view__legend-item">
          <span className="calendar-view__legend-color calendar-view__legend-color--work" />
          <span>Làm việc</span>
        </div>
        <div className="calendar-view__legend-item">
          <span className="calendar-view__legend-color calendar-view__legend-color--leave" />
          <span>Nghỉ phép</span>
        </div>
         <div className="calendar-view__legend-item">
          <span className="calendar-view__legend-color calendar-view__legend-color--appointment" />
          <span>Lịch hẹn</span>
        </div>
        {/* (SỬA FIX 2) Thêm chú thích tăng ca */}
        <div className="calendar-view__legend-item">
          <span className="calendar-view__legend-color calendar-view__legend-color--overtime" />
          <span>Tăng ca</span>
        </div>
      </div>
    </div>
  );
};

// ===================================================================
// === LOGIC CHO LỊCH TUẦN (WEEK VIEW) ===
// ===================================================================

// (Helpers: generateTimeSlots, getWeekDays, timeToMinutes - giữ nguyên)
const generateTimeSlots = () => {
  const slots = [];
  for (let h = 0; h < 24; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
    slots.push(`${String(h).padStart(2, '0')}:30`);
  }
  return slots;
};
const getWeekDays = (anchorDate) => {
  const date = new Date(anchorDate);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  const week = [];
  for (let i = 0; i < 7; i++) {
    const nextDay = new Date(monday);
    nextDay.setDate(monday.getDate() + i);
    week.push(nextDay);
  }
  return week;
};
const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [hours, minutes] = String(timeStr).split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};

// (Component con TimeSlotColumn - giữ nguyên)
const TimeSlotColumn = ({ dayOfWeek, timeSlots, workShiftConfig }) => {
  const isWorkingHour = (dayOfWeek, timeSlot, workShiftConfig) => {
    if (!workShiftConfig || workShiftConfig.length === 0) return false;
    const slotMinutes = timeToMinutes(timeSlot);
    return workShiftConfig.some(shift => {
      if (!shift.is_active || !shift.days_of_week.includes(dayOfWeek)) return false;
      const startMinutes = timeToMinutes(shift.start_time);
      const endMinutes = timeToMinutes(shift.end_time);
      return slotMinutes >= startMinutes && slotMinutes < endMinutes;
    });
  };
  return (
    <>
      {timeSlots.map(time => {
        const isWork = isWorkingHour(dayOfWeek, time, workShiftConfig);
        return (
          <div
            key={time}
            className={`week-calendar-view__time-slot ${isWork ? 'week-calendar-view__time-slot--working' : ''}`}
          ></div>
        );
      })}
    </>
  );
};


// (Helper tính toán xếp chồng - calculateOverlaps - giữ nguyên)
const calculateOverlaps = (events) => {
  const sortedEvents = events.map(e => ({
    ...e,
    start: e.startTime ? timeToMinutes(e.startTime) : 0,
    end: e.endTime ? timeToMinutes(e.endTime) : 1440,
  })).sort((a, b) => a.start - b.start); 

  const clusters = [];
  let currentCluster = [];
  
  for (const event of sortedEvents) {
    if (currentCluster.length > 0 && event.start >= currentCluster[currentCluster.length - 1].end) {
      clusters.push(currentCluster);
      currentCluster = [event];
    } else {
      currentCluster.push(event);
      currentCluster.sort((a, b) => a.end - b.end);
    }
  }
  clusters.push(currentCluster);
  
  const eventsWithLayout = [];
  for (const cluster of clusters.filter(c => c.length > 0)) {
    const columns = [[]]; 
    for (const event of cluster) {
      let placed = false;
      for (const col of columns) {
        if (col.length === 0 || event.start >= col[col.length - 1].end) {
          col.push(event);
          event.stackIndex = columns.indexOf(col);
          placed = true;
          break;
        }
      }
      if (!placed) {
        event.stackIndex = columns.length;
        columns.push([event]);
      }
    }
    
    const totalCols = columns.length;
    for (const col of columns) {
      for (const event of col) {
        event.totalInStack = totalCols;
        eventsWithLayout.push(event);
      }
    }
  }
  
  return eventsWithLayout;
};


const WeekView = ({
  currentDate,
  schedules = [], 
  overtimeSchedules = [], 
  leaveRequests = [],
  appointments = [],
  workShiftConfig = [],
  selectedUsers = [], 
  onEventClick
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);
  const timeSlots = useMemo(() => generateTimeSlots(), []);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // (SỬA) Xử lý dữ liệu event (FIX 2 & 3)
  const processedEventsByDay = useMemo(() => {
    const eventMap = new Map();
    
    // (FIX 2) TẠO LOOKUP SETS CHO LỊCH NGHỈ TRƯỚC
    const fullDayLeaveSet = new Set(); // Key: "YYYY-MM-DD_UserID"
    const partialLeaveMap = new Map(); // Key: "YYYY-MM-DD_UserID" -> [{ start: 420, end: 720 }]

    leaveRequests.forEach(event => {
        const dateFrom = new Date(event.date_from).setHours(0,0,0,0);
        const dateTo = event.date_to ? new Date(event.date_to).setHours(0,0,0,0) : dateFrom;
        let d = new Date(dateFrom);

        while (d.getTime() <= dateTo) {
            const dayStr = d.toISOString().split('T')[0];
            const key = `${dayStr}_${event.user_id}`;
            
            if (event.leave_type === 'full_day' || event.leave_type === 'multiple_days') {
                fullDayLeaveSet.add(key); // Thêm vào set nghỉ cả ngày
            } else {
                // (FIX 3) Xử lý nghỉ một phần (theo ca hoặc theo giờ)
                let startTime = null, endTime = null;
                if (event.leave_type === 'time_range') {
                    startTime = event.time_from;
                    endTime = event.time_to;
                } else if (event.leave_type === 'single_shift') {
                    // Dùng workShiftConfig để tìm giờ
                    const shift = workShiftConfig.find(s => s.shift_name === event.shift_name);
                    if (shift) {
                        startTime = shift.start_time;
                        endTime = shift.end_time;
                    }
                }
                
                if (startTime && endTime) {
                    const interval = { start: timeToMinutes(startTime), end: timeToMinutes(endTime) };
                    if (!partialLeaveMap.has(key)) partialLeaveMap.set(key, []);
                    partialLeaveMap.get(key).push(interval);
                }
            }
            d.setDate(d.getDate() + 1);
        }
    });

    // === BƯỚC 1: Lịch nghỉ (Luôn hiển thị) ===
    leaveRequests.forEach(event => {
        // (FIX 3) Lấy đúng giờ nghỉ
        let startTime = null, endTime = null, title = 'Nghỉ phép';
        switch (event.leave_type) {
            case 'time_range': startTime = event.time_from; endTime = event.time_to; title = 'Nghỉ (theo giờ)'; break;
            case 'single_shift':
                const shift = workShiftConfig.find(s => s.shift_name === event.shift_name);
                if (shift) { startTime = shift.start_time; endTime = shift.end_time; title = `Nghỉ ${shift.display_name}`; }
                break;
            // Mặc định (full_day, multiple_days) thì startTime/endTime là null (cả ngày)
        }
        
        const e = { id: `leave-${event.id}`, type: 'leave', startTime, endTime, title, subtitle: event.reason, icon: <FaExclamationTriangle />, user: event.user, raw: event };
        
        const dateFrom = new Date(event.date_from).setHours(0,0,0,0);
        const dateTo = event.date_to ? new Date(event.date_to).setHours(0,0,0,0) : dateFrom;
        let d = new Date(dateFrom);
        while (d.getTime() <= dateTo) {
            const dayKey = d.getTime();
            if (!eventMap.has(dayKey)) eventMap.set(dayKey, []);
            eventMap.get(dayKey).push(e);
            d.setDate(d.getDate() + 1);
        }
    });

    // === BƯỚC 2: Lịch làm việc (Fixed/Flexible) (KIỂM TRA CONFLICT) ===
    schedules.forEach(event => {
        const dayStr = new Date(event.date).toISOString().split('T')[0];
        const key = `${dayStr}_${event.user_id}`;
        
        // 1. Kiểm tra nghỉ cả ngày
        if (fullDayLeaveSet.has(key)) return; // Bỏ qua

        // 2. (SỬA LẠI LOGIC) Kiểm tra nghỉ một phần
        if (partialLeaveMap.has(key)) {
            const workStart = timeToMinutes(event.start_time);
            // const workEnd = timeToMinutes(event.end_time); // Không cần workEnd
            const partialLeaves = partialLeaveMap.get(key);
            
            // (SỬA) Logic: Chỉ ẩn nếu GIỜ BẮT ĐẦU (workStart) nằm TRONG khoảng nghỉ
            // (workStart >= leave.start VÀ workStart < leave.end)
            const isConflicting = partialLeaves.some(leave => 
                workStart >= leave.start && workStart < leave.end 
            );
            if (isConflicting) return; // Bỏ qua
        }

        // Nếu không conflict, thêm event
        const e = { id: event.id, type: event.schedule_type === 'flexible' ? 'flexible' : 'schedule', startTime: event.start_time, endTime: event.end_time, title: 'Làm việc', subtitle: event.schedule_type === 'flexible' ? 'Linh hoạt' : 'Cố định', icon: <FaBusinessTime />, user: event.user, raw: event };
        const dayKey = new Date(event.date).setHours(0,0,0,0);
        if (!eventMap.has(dayKey)) eventMap.set(dayKey, []);
        eventMap.get(dayKey).push(e);
    });

    // === BƯỚC 3: Lịch tăng ca (KIỂM TRA CONFLICT) ===
    overtimeSchedules.forEach(event => {
        const dayStr = new Date(event.date).toISOString().split('T')[0];
        const key = `${dayStr}_${event.user_id}`;
        
        // 1. Kiểm tra nghỉ cả ngày
        if (fullDayLeaveSet.has(key)) return; // Bỏ qua

        // 2. (SỬA LẠI LOGIC) Kiểm tra nghỉ một phần
        if (partialLeaveMap.has(key)) {
            const workStart = timeToMinutes(event.start_time);
            const partialLeaves = partialLeaveMap.get(key);
            // (SỬA) Logic: Chỉ ẩn nếu GIỜ BẮT ĐẦU (workStart) nằm TRONG khoảng nghỉ
            const isConflicting = partialLeaves.some(leave => 
                workStart >= leave.start && workStart < leave.end
            );
            if (isConflicting) return; // Bỏ qua
        }

        // Nếu không conflict, thêm event
        const e = { id: `ot-${event.id}`, type: 'overtime', startTime: event.start_time, endTime: event.end_time, title: 'Tăng ca', subtitle: event.reason, icon: <FaClock />, user: event.user, raw: event };
        const dayKey = new Date(event.date).setHours(0,0,0,0);
        if (!eventMap.has(dayKey)) eventMap.set(dayKey, []);
        eventMap.get(dayKey).push(e);
    });
        
    // === BƯỚC 4: Lịch hẹn (Luôn hiển thị) ===
    appointments.forEach(event => {
        const e = { id: `app-${event.id}`, type: 'appointment', startTime: event.appointment_start_time, endTime: event.appointment_end_time, title: 'Lịch hẹn', subtitle: event.guest_name || event.Patient?.full_name || 'Bệnh nhân', icon: <FaUserClock />, user: event.user, raw: event };
        const dayKey = new Date(event.appointment_date).setHours(0,0,0,0);
        if (!eventMap.has(dayKey)) eventMap.set(dayKey, []);
        eventMap.get(dayKey).push(e);
    });
    
    // 5. Tính toán layout
    const layoutMap = new Map();
    for (const [dayKey, events] of eventMap.entries()) {
       layoutMap.set(dayKey, calculateOverlaps(events));
    }
    
    return layoutMap;

  }, [schedules, overtimeSchedules, leaveRequests, appointments, weekDays, workShiftConfig]); 
  
  // (Hàm renderEventsForDay - giữ nguyên)
  const renderEventsForDay = (day) => {
    const dayStart = day.getTime();
    const totalDayMinutes = 1440;
    const eventsWithLayout = processedEventsByDay.get(dayStart) || [];

    return (
      <>
        {eventsWithLayout.map(event => {
          let top = 0, height = 100;
          if (event.startTime && event.endTime) {
             top = (event.start / totalDayMinutes) * 100;
             height = ((event.end - event.start) / totalDayMinutes) * 100;
             if (height < 0) height = 0;
          }
          const userColor = getColorForUser(event.user?.id, selectedUsers);
          const totalCols = event.totalInStack || 1;
          const colIndex = event.stackIndex || 0;
          const itemWidth = 100 / totalCols;
          const itemLeft = itemWidth * colIndex;
          
          const style = {
             top: `${top}%`, 
             height: `${height}%`,
             left: `calc(${itemLeft}% + 2px)`,
             width: `calc(${itemWidth}% - 4px)`,
             '--event-color': userColor ? userColor.bg : `var(--color-event)`,
             '--event-border': userColor ? userColor.border : `var(--color-event-border)`,
          };
          
          // (FIX 1) Thêm class cho các loại mới
          let typeClass = `week-calendar-view__event--${event.type}`;
          if (userColor) {
             typeClass += ' week-calendar-view__event--custom-color';
          }
          
          return (
            <div
              key={event.id}
              className={`week-calendar-view__event ${typeClass}`}
              style={style}
              onClick={() => onEventClick && onEventClick(event.raw)}
              title={event.subtitle ? `${event.title}: ${event.subtitle}` : event.title}
            >
              {event.user && (
                 <div className="week-calendar-view__event-user">
                   <img 
                     src={event.user.avatar_url || 'https://placehold.co/20x20/EBF4FF/76A9FA?text=U'} 
                     alt={event.user.full_name} 
                   />
                   <span>{event.user.full_name}</span>
                 </div>
              )}
              <span className="week-calendar-view__event-title">
                 {event.icon} {event.title}
              </span>
              <span className="week-calendar-view__event-time">
                {event.subtitle && height > 40 ? event.subtitle.substring(0, 50) : (event.startTime ? `${event.startTime.slice(0, 5)} - ${event.endTime.slice(0, 5)}` : 'Cả ngày')}
              </span>
            </div>
          );
        })}
      </>
    );
  };
  
  // (Hàm renderCurrentTimeLine - giữ nguyên)
  const renderCurrentTimeLine = (day, showMarker = true) => {
    if (day.getTime() !== today.getTime()) return null;
    const minutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    const topPercent = (minutes / 1440) * 100;
    return (
      <div className="week-calendar-view__current-time-line" style={{ top: `${topPercent}%` }}>
         {showMarker && (
            <div className="week-calendar-view__current-time-marker">
              {currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </div>
         )}
      </div>
    );
  };

  // (SỬA FIX 1) Hàm renderLegend (Thêm các loại mới)
  const renderLegend = () => {
    if (selectedUsers.length > 0) {
       return selectedUsers.map((user, index) => {
        const color = USER_COLORS[index % USER_COLORS.length];
        return (
          <div key={user.value} className="week-calendar-view__legend-item">
            <span 
               className="week-calendar-view__legend-color" 
               style={{ backgroundColor: color.bg, borderColor: color.border, border: '1px solid' }} 
            />
            <span>{user.label}</span>
          </div>
        );
      });
    }
    // Chú thích mặc định (SỬA LẠI CHO ĐÚNG)
    return (
        <>
          <div className="week-calendar-view__legend-item">
            <span className="week-calendar-view__legend-color week-calendar-view__legend-color--work" />
            <span>Giờ làm việc (Nền)</span>
          </div>
          <div className="week-calendar-view__legend-item">
            <span className="week-calendar-view__legend-color week-calendar-view__legend-color--event-schedule" />
            <span>Lịch làm việc (CĐ)</span>
          </div>
          <div className="week-calendar-view__legend-item">
            <span className="week-calendar-view__legend-color week-calendar-view__legend-color--event-flexible" />
            <span>Lịch linh hoạt</span>
          </div>
          <div className="week-calendar-view__legend-item">
            <span className="week-calendar-view__legend-color week-calendar-view__legend-color--event-overtime" />
            <span>Tăng ca</span>
          </div>
          <div className="week-calendar-view__legend-item">
            <span className="week-calendar-view__legend-color week-calendar-view__legend-color--event-appointment" />
            <span>Lịch hẹn</span>
          </div>
          <div className="week-calendar-view__legend-item">
            <span className="week-calendar-view__legend-color week-calendar-view__legend-color--event-leave" />
            <span>Nghỉ phép</span>
          </div>
        </>
     );
  };

  return (
    <div className="week-calendar-view__container">
      <div className="week-calendar-view__scroll-wrapper">
        <div className="week-calendar-view__grid-wrapper">
          
          {/* (Header Row (T2, T3...) giữ nguyên) */}
          <div className="week-calendar-view__header-row week-calendar-view__header-row--days">
            <div className="week-calendar-view__time-axis-header"></div>
            {weekDays.map(day => {
              const isToday = day.getTime() === today.getTime();
              return (
                  <div key={day.toISOString()} className={`week-calendar-view__day-header ${isToday ? 'week-calendar-view__day-header--today' : ''}`}>
                    <span className="week-calendar-view__day-name">
                      {day.toLocaleDateString('vi-VN', { weekday: 'short' })}
                    </span>
                    <span className="week-calendar-view__day-number">
                      {day.getDate()}
                    </span>
                  </div>
                );
            })}
          </div>

          {/* (Body Row (Time + Slots) giữ nguyên) */}
          <div className="week-calendar-view__body-row">
            <div className="week-calendar-view__time-axis">
              {timeSlots.map(time => (
                (time.endsWith(':00')) ? (
                  <div key={time} className="week-calendar-view__time-label">
                    {time}
                  </div>
                ) : null
              ))}
            </div>
            
            {weekDays.map(day => {
              const isToday = day.getTime() === today.getTime();
              const dayOfWeek = day.getDay();
              return (
                <div 
                  key={day.toISOString()} 
                  className={`week-calendar-view__day-column ${isToday ? 'week-calendar-view__day-column--today' : ''}`}
                >
                  <TimeSlotColumn dayOfWeek={dayOfWeek} timeSlots={timeSlots} workShiftConfig={workShiftConfig} />
                  {renderEventsForDay(day)}
                  {renderCurrentTimeLine(day, true)}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Chú thích */}
      <div className="week-calendar-view__legend">
        {renderLegend()}
      </div>
    </div>
  );
};

// ===================================================================
// === COMPONENT CHÍNH (Router) ===
// ===================================================================
const CalendarView = (props) => {
  const { 
    viewMode = 'month', 
    schedules = [], 
    overtimeSchedules = [], 
    leaveRequests = [], 
    appointments = [] 
  } = props;

  if (viewMode === 'week') {
    // Chuyển props của Lịch Tuần
    return <WeekView 
      currentDate={props.currentDate}
      schedules={schedules}
      overtimeSchedules={overtimeSchedules} 
      leaveRequests={leaveRequests}
      appointments={appointments}
      workShiftConfig={props.workShiftConfig}
      selectedUsers={props.selectedUsers}
      onEventClick={props.onEventClick}
    />;
  }

  // Mặc định là Lịch Tháng
  return <MonthView 
    month={props.month}
    year={props.year}
    workShiftConfig={props.workShiftConfig}
    schedules={schedules} 
    overtimeSchedules={overtimeSchedules} 
    leaveRequests={leaveRequests}
    appointments={appointments}
    onDateClick={props.onDateClick}
  />;
};

export default CalendarView;