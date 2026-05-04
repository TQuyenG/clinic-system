// client/src/components/schedule/ScheduleTableView.js
import React, { useMemo } from 'react';
import { FaSpinner } from 'react-icons/fa';
import './ScheduleTableView.css';

const ScheduleTableView = ({ 
  schedules = [], 
  overtimeSchedules = [],
  leaveRequests = [],
  appointments = [],
  viewMode = 'week', 
  month, 
  year, 
  currentDate,
  workShiftConfig = [],
  showWorkSchedules = true,
  loading = false 
}) => {
  
  // ✅ BƯỚC 1: Gọi TẤT CẢ Hooks Ở ĐẦU (trước mọi return)
  
  // Xử lý dữ liệu lịch làm việc thường
  const processedSchedules = useMemo(() => {
    if (!schedules || schedules.length === 0) return [];

    const seen = new Set();
    const normalized = [];

    schedules.forEach((schedule) => {
      const key = [
        schedule.user_id || 'u',
        schedule.date || 'd',
        schedule.shift_name || 'shift',
        schedule.start_time || 'st',
        schedule.end_time || 'et'
      ].join('|');

      if (seen.has(key)) return;
      seen.add(key);

      normalized.push({
        ...schedule,
        date: new Date(schedule.date),
        shiftInfo: workShiftConfig.find(s => s.shift_name === schedule.shift_name) || {}
      });
    });

    return normalized;
  }, [schedules, workShiftConfig]);
  
  // Xử lý dữ liệu lịch tăng ca
  const processedOvertimes = useMemo(() => {
    if (!overtimeSchedules || overtimeSchedules.length === 0) return [];
    
    return overtimeSchedules.map(ot => ({
      ...ot,
      date: new Date(ot.date)
    }));
  }, [overtimeSchedules]);

  // Xử lý dữ liệu lịch hẹn
  const processedAppointments = useMemo(() => {
    if (!appointments || appointments.length === 0) return [];

    return appointments.map(appointment => ({
      ...appointment,
      date: new Date(appointment.date || appointment.appointment_date)
    }));
  }, [appointments]);

  // Xử lý dữ liệu lịch nghỉ
  const processedLeaves = useMemo(() => {
    if (!leaveRequests || leaveRequests.length === 0) return [];

    const items = [];
    leaveRequests.forEach(leave => {
      const startDate = new Date(leave.date_from);
      const endDate = new Date(leave.date_to || leave.date_from);
      const cursor = new Date(startDate);
      cursor.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);

      while (cursor.getTime() <= endDate.getTime()) {
        items.push({
          ...leave,
          date: new Date(cursor)
        });
        cursor.setDate(cursor.getDate() + 1);
      }
    });

    return items;
  }, [leaveRequests]);
  
  // Gộp và nhóm dữ liệu theo ngày
  const groupedByDate = useMemo(() => {
    const grouped = {};
    
    // Nhóm lịch thường
    processedSchedules.forEach(schedule => {
      const dateKey = schedule.date.toISOString().split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = { schedules: [], overtimes: [] };
      }
      grouped[dateKey].schedules.push(schedule);
    });
    
    // Nhóm lịch tăng ca
    processedOvertimes.forEach(ot => {
      const dateKey = ot.date.toISOString().split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = { schedules: [], overtimes: [] };
      }
      grouped[dateKey].overtimes.push(ot);
    });

    processedAppointments.forEach(app => {
      const dateKey = app.date.toISOString().split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = { schedules: [], overtimes: [], appointments: [], leaves: [] };
      }
      if (!grouped[dateKey].appointments) grouped[dateKey].appointments = [];
      grouped[dateKey].appointments.push(app);
    });

    processedLeaves.forEach(leave => {
      const dateKey = leave.date.toISOString().split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = { schedules: [], overtimes: [], appointments: [], leaves: [] };
      }
      if (!grouped[dateKey].leaves) grouped[dateKey].leaves = [];
      grouped[dateKey].leaves.push(leave);
    });
    
    return grouped;
  }, [processedSchedules, processedOvertimes, processedAppointments, processedLeaves]);
  
  // Tạo danh sách ngày cho view (tuần hoặc tháng)
  const dateRange = useMemo(() => {
    const dates = [];
    const effectiveViewMode = viewMode || 'week';

    if (effectiveViewMode === 'week') {
      // Use provided currentDate when available, otherwise fallback to today
      const base = (typeof currentDate !== 'undefined' && currentDate) ? new Date(currentDate) : new Date();
      const startOfWeek = new Date(base);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);

      for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        dates.push(date);
      }
    } else if (effectiveViewMode === 'month') {
      // Logic tạo tất cả ngày trong tháng
      const daysInMonth = new Date(year, month, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        dates.push(new Date(year, month - 1, i));
      }
    }
    
    return dates;
  }, [viewMode, month, year, currentDate]);
  
  // Dữ liệu cho bảng
  const tableData = useMemo(() => {
    return dateRange.map(date => {
      const dateKey = date.toISOString().split('T')[0];
      const dayData = groupedByDate[dateKey] || { schedules: [], overtimes: [] };
      
      return {
        date,
        dateKey,
        dayName: date.toLocaleDateString('vi-VN', { weekday: 'short' }),
        dayNumber: date.getDate(),
        schedules: dayData.schedules,
        overtimes: dayData.overtimes,
        appointments: dayData.appointments || [],
        leaves: dayData.leaves || []
      };
    });
  }, [dateRange, groupedByDate]);

  const formatLeaveLabel = (leave) => {
    if (leave.leave_type === 'time_range' && leave.time_from && leave.time_to) {
      return `${leave.time_from.slice(0, 5)} - ${leave.time_to.slice(0, 5)}`;
    }
    if (leave.leave_type === 'single_shift') {
      return leave.shift_name || 'Nghỉ theo ca';
    }
    return 'Cả ngày';
  };

  const formatScheduleLabel = (schedule) => {
    const displayName = schedule.shiftInfo?.display_name || schedule.shift_name;
    const timeRange = schedule.shiftInfo?.start_time && schedule.shiftInfo?.end_time
      ? `${schedule.shiftInfo.start_time.slice(0, 5)} - ${schedule.shiftInfo.end_time.slice(0, 5)}`
      : (schedule.start_time && schedule.end_time ? `${schedule.start_time.slice(0, 5)} - ${schedule.end_time.slice(0, 5)}` : '');

    if (displayName && timeRange) return `${displayName} (${timeRange})`;
    if (displayName) return displayName;
    if (timeRange) return timeRange;
    return 'Lịch làm việc';
  };
  
  // ✅ BƯỚC 2: Early returns SAU khi đã gọi tất cả Hooks
  
  if (loading) {
    return (
      <div className="schedule-table-view__loading">
        <FaSpinner className="fa-spin" /> Đang tải dữ liệu...
      </div>
    );
  }
  
  if (showWorkSchedules && (!workShiftConfig || workShiftConfig.length === 0)) {
    return (
      <div className="schedule-table-view__empty">
        Chưa có cấu hình ca làm việc
      </div>
    );
  }
  
  // ✅ BƯỚC 3: Render chính
  
  return (
    <div className="schedule-table-view">
      <div className="schedule-table-view__wrapper">
        <table className="schedule-table-view__table">
          <thead>
            <tr>
              <th>Ngày</th>
              <th>Thứ</th>
              {showWorkSchedules && <th>Lịch làm việc</th>}
              <th>Tăng ca</th>
              <th>Lịch hẹn</th>
              <th>Lịch nghỉ</th>
            </tr>
          </thead>
          <tbody>
            {tableData.length === 0 ? (
              <tr>
                <td colSpan={showWorkSchedules ? 6 : 5} className="schedule-table-view__empty-row">
                  Không có dữ liệu lịch làm việc
                </td>
              </tr>
            ) : (
              tableData.map((row, index) => (
                <tr key={index} className="schedule-table-view__row">
                  <td className="schedule-table-view__date">
                    <strong>{row.dayNumber}</strong>
                    <span>/{row.date.getMonth() + 1}</span>
                  </td>
                  <td className="schedule-table-view__day">
                    {row.dayName}
                  </td>
                  {showWorkSchedules && (
                    <td className="schedule-table-view__schedules">
                      {row.schedules.length === 0 ? (
                        <span className="schedule-table-view__no-data">-</span>
                      ) : (
                        <div className="schedule-table-view__shifts">
                          {row.schedules.map((schedule, idx) => (
                            <span 
                              key={idx} 
                              className="schedule-table-view__shift-badge schedule"
                              title={formatScheduleLabel(schedule)}
                            >
                                {formatScheduleLabel(schedule)}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  )}
                  <td className="schedule-table-view__overtimes">
                    {row.overtimes.length === 0 ? (
                      <span className="schedule-table-view__no-data">-</span>
                    ) : (
                      <div className="schedule-table-view__shifts">
                        {row.overtimes.map((ot, idx) => (
                          <span 
                            key={idx} 
                            className="schedule-table-view__shift-badge overtime"
                            title="Ca tăng ca"
                          >
                            Tăng ca
                            {ot.start_time && (
                              <small>
                                {' '}({ot.start_time?.slice(0,5)} - {ot.end_time?.slice(0,5)})
                              </small>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="schedule-table-view__appointments">
                    {row.appointments.length === 0 ? (
                      <span className="schedule-table-view__no-data">-</span>
                    ) : (
                      <div className="schedule-table-view__shifts">
                        {row.appointments.slice(0, 3).map((appointment, idx) => (
                          <span
                            key={idx}
                            className="schedule-table-view__shift-badge appointment"
                            title={appointment.code || appointment.appointment_code || 'Lịch hẹn'}
                          >
                            {appointment.appointment_start_time ? appointment.appointment_start_time.slice(0, 5) : '--:--'}
                            {appointment.Patient?.User?.full_name || appointment.guest_name ? (
                              <small>{' '}({appointment.Patient?.User?.full_name || appointment.guest_name})</small>
                            ) : null}
                          </span>
                        ))}
                        {row.appointments.length > 3 && (
                          <span className="schedule-table-view__shift-badge appointment">
                            +{row.appointments.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="schedule-table-view__leaves">
                    {row.leaves.length === 0 ? (
                      <span className="schedule-table-view__no-data">-</span>
                    ) : (
                      <div className="schedule-table-view__shifts">
                        {row.leaves.slice(0, 3).map((leave, idx) => (
                          <span
                            key={idx}
                            className="schedule-table-view__shift-badge leave"
                            title={leave.reason || 'Lịch nghỉ'}
                          >
                            Nghỉ
                            <small>{' '}({formatLeaveLabel(leave)})</small>
                          </span>
                        ))}
                        {row.leaves.length > 3 && (
                          <span className="schedule-table-view__shift-badge leave">
                            +{row.leaves.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ScheduleTableView;