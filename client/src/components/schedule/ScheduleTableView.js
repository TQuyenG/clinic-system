// client/src/components/schedule/ScheduleTableView.js
import React, { useMemo } from 'react';
import { FaSpinner, FaBriefcaseMedical, FaClock, FaCalendarCheck, FaUmbrellaBeach, FaBusinessTime } from 'react-icons/fa';
import './ScheduleTableView.css';

const ScheduleTableView = ({ 
  schedules = [], 
  overtimeSchedules = [],
  leaves = [],
  appointments = [],
  eventTypeFilters = {
    schedules: true,
    overtime: true,
    leaves: true,
    appointments: true
  },
  viewMode = 'week', 
  currentDate = new Date(),
  month, 
  year, 
  workShiftConfig = [],
  loading = false 
}) => {
  
  // ✅ Helper: Format thời gian
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    return timeStr.slice(0, 5); // "09:00:00" -> "09:00"
  };
  
  // Xử lý dữ liệu lịch làm việc thường (phân biệt cố định/linh hoạt)
  const processedSchedules = useMemo(() => {
    if (!schedules || schedules.length === 0) return [];
    
    return schedules.map(schedule => {
      const shiftInfo = workShiftConfig.find(s => s.shift_name === schedule.shift_name) || {};
      return {
        ...schedule,
        date: new Date(schedule.date),
        shiftInfo,
        type: schedule.schedule_type === 'flexible' ? 'flexible' : 'fixed'
      };
    });
  }, [schedules, workShiftConfig]);
  
  // Xử lý dữ liệu lịch tăng ca
  const processedOvertimes = useMemo(() => {
    if (!overtimeSchedules || overtimeSchedules.length === 0) return [];
    
    return overtimeSchedules.map(ot => ({
      ...ot,
      date: new Date(ot.date)
    }));
  }, [overtimeSchedules]);
  
  // Xử lý dữ liệu lịch nghỉ
  const processedLeaves = useMemo(() => {
    if (!leaves || leaves.length === 0) return [];
    
    return leaves.map(leave => ({
      ...leave,
      date_from: new Date(leave.date_from),
      date_to: leave.date_to ? new Date(leave.date_to) : null
    }));
  }, [leaves]);
  
  // Xử lý dữ liệu lịch hẹn
  const processedAppointments = useMemo(() => {
    if (!appointments || appointments.length === 0) return [];
    
    return appointments.map(apt => ({
      ...apt,
      date: new Date(apt.appointment_date)
    }));
  }, [appointments]);
  
  // Gộp và nhóm dữ liệu theo ngày
  const groupedByDate = useMemo(() => {
    const grouped = {};
    
    // Nhóm lịch thường (phân biệt fixed/flexible)
    processedSchedules.forEach(schedule => {
      const dateKey = schedule.date.toISOString().split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = { 
          schedules_fixed: [], 
          schedules_flexible: [],
          overtimes: [], 
          leaves: [], 
          appointments: [] 
        };
      }
      
      if (schedule.type === 'flexible') {
        grouped[dateKey].schedules_flexible.push(schedule);
      } else {
        grouped[dateKey].schedules_fixed.push(schedule);
      }
    });
    
    // Nhóm lịch tăng ca
    processedOvertimes.forEach(ot => {
      const dateKey = ot.date.toISOString().split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = { 
          schedules_fixed: [], 
          schedules_flexible: [],
          overtimes: [], 
          leaves: [], 
          appointments: [] 
        };
      }
      grouped[dateKey].overtimes.push(ot);
    });
    
    // Nhóm lịch nghỉ
    processedLeaves.forEach(leave => {
      const startDate = leave.date_from;
      const endDate = leave.date_to || leave.date_from;
      
      const currentDateLoop = new Date(startDate);
      while (currentDateLoop <= endDate) {
        const dateKey = currentDateLoop.toISOString().split('T')[0];
        if (!grouped[dateKey]) {
          grouped[dateKey] = { 
            schedules_fixed: [], 
            schedules_flexible: [],
            overtimes: [], 
            leaves: [], 
            appointments: [] 
          };
        }
        grouped[dateKey].leaves.push(leave);
        currentDateLoop.setDate(currentDateLoop.getDate() + 1);
      }
    });
    
    // Nhóm lịch hẹn
    processedAppointments.forEach(apt => {
      const dateKey = apt.date.toISOString().split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = { 
          schedules_fixed: [], 
          schedules_flexible: [],
          overtimes: [], 
          leaves: [], 
          appointments: [] 
        };
      }
      grouped[dateKey].appointments.push(apt);
    });
    
    return grouped;
  }, [processedSchedules, processedOvertimes, processedLeaves, processedAppointments]);
  
  // Tạo danh sách ngày
  const dateRange = useMemo(() => {
    const dates = [];
    
    if (viewMode === 'day') {
      dates.push(new Date(currentDate));
    } else if (viewMode === 'week') {
      const startOfWeek = new Date(currentDate);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        dates.push(date);
      }
    } else if (viewMode === 'month') {
      const daysInMonth = new Date(year, month, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        dates.push(new Date(year, month - 1, i));
      }
    }
    
    return dates;
  }, [viewMode, currentDate, month, year]);
  
  // Dữ liệu cho bảng
  const tableData = useMemo(() => {
    return dateRange.map(date => {
      const dateKey = date.toISOString().split('T')[0];
      const dayData = groupedByDate[dateKey] || { 
        schedules_fixed: [], 
        schedules_flexible: [],
        overtimes: [], 
        leaves: [], 
        appointments: [] 
      };
      
      return {
        date,
        dateKey,
        dayName: date.toLocaleDateString('vi-VN', { weekday: 'short' }),
        dayNumber: date.getDate(),
        schedules_fixed: dayData.schedules_fixed,
        schedules_flexible: dayData.schedules_flexible,
        overtimes: dayData.overtimes,
        leaves: dayData.leaves,
        appointments: dayData.appointments
      };
    });
  }, [dateRange, groupedByDate]);
  
  // Xác định cột nào được hiển thị
  const visibleColumns = useMemo(() => {
    const cols = [];
    if (eventTypeFilters.schedules) cols.push('schedules');
    if (eventTypeFilters.overtime) cols.push('overtime');
    if (eventTypeFilters.appointments) cols.push('appointments');
    if (eventTypeFilters.leaves) cols.push('leaves');
    return cols;
  }, [eventTypeFilters]);
  
  // Early returns
  if (loading) {
    return (
      <div className="schedule-table-view__loading">
        <FaSpinner className="fa-spin" /> Đang tải dữ liệu...
      </div>
    );
  }
  
  if (!workShiftConfig || workShiftConfig.length === 0) {
    return (
      <div className="schedule-table-view__empty-state">
        Chưa có cấu hình ca làm việc
      </div>
    );
  }
  
  // ✅ FIX: Render badges cho lịch làm việc
  const renderScheduleBadges = (schedulesFixed, schedulesFlexible) => {
    const hasFixed = schedulesFixed.length > 0;
    const hasFlexible = schedulesFlexible.length > 0;
    
    if (!hasFixed && !hasFlexible) {
      return <span className="schedule-table-view__no-data">-</span>;
    }
    
    return (
      <div className="schedule-table-view__time-badges">
        {/* Lịch CỐ ĐỊNH */}
        {schedulesFixed.map((schedule, idx) => {
          const shiftInfo = schedule.shiftInfo || {};
          
          // ✅ FIX: Ưu tiên lấy từ schedule trước, nếu không có mới lấy từ shiftInfo
          let timeDisplay;
          if (schedule.start_time && schedule.end_time) {
            timeDisplay = `${formatTime(schedule.start_time)} - ${formatTime(schedule.end_time)}`;
          } else if (shiftInfo.start_time && shiftInfo.end_time) {
            timeDisplay = `${formatTime(shiftInfo.start_time)} - ${formatTime(shiftInfo.end_time)}`;
          } else {
            timeDisplay = shiftInfo.display_name || schedule.shift_name || 'Làm việc';
          }
          
          return (
            <span 
              key={`fixed-${idx}`}
              className="schedule-table-view__time-badge schedule-table-view__time-badge--schedule-fixed"
              title="Lịch làm việc cố định"
            >
              <FaBriefcaseMedical />
              {timeDisplay}
            </span>
          );
        })}
        
        {/* Lịch LINH HOẠT */}
        {schedulesFlexible.map((schedule, idx) => {
          // ✅ FIX: Lịch linh hoạt LUÔN có start_time/end_time trong object
          const timeDisplay = schedule.start_time && schedule.end_time
            ? `${formatTime(schedule.start_time)} - ${formatTime(schedule.end_time)}`
            : 'Linh hoạt';
          
          return (
            <span 
              key={`flexible-${idx}`}
              className="schedule-table-view__time-badge schedule-table-view__time-badge--schedule-flexible"
              title="Lịch làm việc linh hoạt"
            >
              <FaBusinessTime />
              {timeDisplay}
            </span>
          );
        })}
      </div>
    );
  };
  
  // ✅ Render badges cho tăng ca
  const renderOvertimeBadges = (overtimeList) => {
    if (overtimeList.length === 0) {
      return <span className="schedule-table-view__no-data">-</span>;
    }
    
    return (
      <div className="schedule-table-view__time-badges">
        {overtimeList.map((ot, idx) => {
          const timeDisplay = ot.start_time && ot.end_time
            ? `${formatTime(ot.start_time)} - ${formatTime(ot.end_time)}`
            : 'Tăng ca';
          
          return (
            <span 
              key={idx} 
              className="schedule-table-view__time-badge schedule-table-view__time-badge--overtime"
              title="Ca tăng ca"
            >
              <FaClock />
              {timeDisplay}
            </span>
          );
        })}
      </div>
    );
  };
  
  // ✅ Render badges cho lịch hẹn
  const renderAppointmentBadges = (appointmentList) => {
    if (appointmentList.length === 0) {
      return <span className="schedule-table-view__no-data">-</span>;
    }
    
    return (
      <div className="schedule-table-view__time-badges">
        {appointmentList.map((apt, idx) => {
          // ✅ FIX: Lấy từ appointment_start_time và appointment_end_time
          const timeDisplay = apt.appointment_start_time && apt.appointment_end_time
            ? `${formatTime(apt.appointment_start_time)} - ${formatTime(apt.appointment_end_time)}`
            : (apt.appointment_time ? formatTime(apt.appointment_time) : 'Lịch hẹn');
          
          return (
            <span 
              key={idx} 
              className="schedule-table-view__time-badge schedule-table-view__time-badge--appointment"
              title={`Lịch hẹn: ${apt.patient_name || apt.guest_name || 'Bệnh nhân'}`}
            >
              <FaCalendarCheck />
              {timeDisplay}
            </span>
          );
        })}
      </div>
    );
  };
  
  // ✅ Render badges cho lịch nghỉ
  const renderLeaveBadges = (leaveList) => {
    if (leaveList.length === 0) {
      return <span className="schedule-table-view__no-data">-</span>;
    }
    
    return (
      <div className="schedule-table-view__time-badges">
        {leaveList.map((leave, idx) => {
          let timeDisplay = 'Nghỉ';
          
          if (leave.leave_type === 'single_shift') {
            const shift = workShiftConfig.find(s => s.shift_name === leave.shift_name);
            if (shift && shift.start_time && shift.end_time) {
              timeDisplay = `${formatTime(shift.start_time)} - ${formatTime(shift.end_time)}`;
            } else {
              timeDisplay = `Ca ${leave.shift_name || ''}`;
            }
          } else if (leave.leave_type === 'time_range') {
            timeDisplay = `${formatTime(leave.time_from)} - ${formatTime(leave.time_to)}`;
          } else if (leave.leave_type === 'full_day') {
            timeDisplay = 'Cả ngày';
          } else if (leave.leave_type === 'multiple_days') {
            timeDisplay = 'Nghỉ dài';
          }
          
          return (
            <span 
              key={idx} 
              className="schedule-table-view__time-badge schedule-table-view__time-badge--leave"
              title={`Nghỉ: ${leave.reason || ''}`}
            >
              <FaUmbrellaBeach />
              {timeDisplay}
            </span>
          );
        })}
      </div>
    );
  };
  
  // Render chính
  return (
    <div className="schedule-table-view__container">
      <div className="schedule-table-view__table-wrapper">
        <table className="schedule-table-view__table">
          <thead>
            <tr>
              <th>Ngày</th>
              <th>Thứ</th>
              {visibleColumns.includes('schedules') && <th>Lịch làm việc</th>}
              {visibleColumns.includes('overtime') && <th>Tăng ca</th>}
              {visibleColumns.includes('appointments') && <th>Lịch hẹn</th>}
              {visibleColumns.includes('leaves') && <th>Lịch nghỉ</th>}
            </tr>
          </thead>
          <tbody>
            {tableData.length === 0 ? (
              <tr>
                <td colSpan={2 + visibleColumns.length} className="schedule-table-view__empty-state">
                  Không có dữ liệu lịch làm việc
                </td>
              </tr>
            ) : (
              tableData.map((row, index) => (
                <tr key={index}>
                  <td className="schedule-table-view__date-cell">
                    <strong>{row.dayNumber}</strong>
                    <span>/{row.date.getMonth() + 1}</span>
                  </td>
                  <td className="schedule-table-view__day-cell">
                    {row.dayName}
                  </td>
                  {visibleColumns.includes('schedules') && (
                    <td className="schedule-table-view__data-cell">
                      {renderScheduleBadges(row.schedules_fixed, row.schedules_flexible)}
                    </td>
                  )}
                  {visibleColumns.includes('overtime') && (
                    <td className="schedule-table-view__data-cell">
                      {renderOvertimeBadges(row.overtimes)}
                    </td>
                  )}
                  {visibleColumns.includes('appointments') && (
                    <td className="schedule-table-view__data-cell">
                      {renderAppointmentBadges(row.appointments)}
                    </td>
                  )}
                  {visibleColumns.includes('leaves') && (
                    <td className="schedule-table-view__data-cell">
                      {renderLeaveBadges(row.leaves)}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Chú thích màu sắc */}
      <div className="schedule-table-view__legend">
        {eventTypeFilters.schedules && (
          <>
            <div className="schedule-table-view__legend-item">
              <span className="schedule-table-view__legend-color schedule-table-view__legend-color--schedule-fixed" />
              <span>Lịch làm việc (Cố định)</span>
            </div>
            <div className="schedule-table-view__legend-item">
              <span className="schedule-table-view__legend-color schedule-table-view__legend-color--schedule-flexible" />
              <span>Lịch linh hoạt</span>
            </div>
          </>
        )}
        {eventTypeFilters.overtime && (
          <div className="schedule-table-view__legend-item">
            <span className="schedule-table-view__legend-color schedule-table-view__legend-color--overtime" />
            <span>Tăng ca</span>
          </div>
        )}
        {eventTypeFilters.appointments && (
          <div className="schedule-table-view__legend-item">
            <span className="schedule-table-view__legend-color schedule-table-view__legend-color--appointment" />
            <span>Lịch hẹn</span>
          </div>
        )}
        {eventTypeFilters.leaves && (
          <div className="schedule-table-view__legend-item">
            <span className="schedule-table-view__legend-color schedule-table-view__legend-color--leave" />
            <span>Nghỉ phép</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScheduleTableView;