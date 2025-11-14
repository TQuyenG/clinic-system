// client/src/components/schedule/ScheduleTableView.js
import React, { useMemo } from 'react';
import { FaSpinner } from 'react-icons/fa';
import './ScheduleTableView.css';

const ScheduleTableView = ({ 
  schedules = [], 
  overtimeSchedules = [],
  viewMode = 'week', 
  month, 
  year, 
  workShiftConfig = [],
  loading = false 
}) => {
  
  // ✅ BƯỚC 1: Gọi TẤT CẢ Hooks Ở ĐẦU (trước mọi return)
  
  // Xử lý dữ liệu lịch làm việc thường
  const processedSchedules = useMemo(() => {
    if (!schedules || schedules.length === 0) return [];
    
    return schedules.map(schedule => ({
      ...schedule,
      date: new Date(schedule.date),
      shiftInfo: workShiftConfig.find(s => s.shift_name === schedule.shift_name) || {}
    }));
  }, [schedules, workShiftConfig]);
  
  // Xử lý dữ liệu lịch tăng ca
  const processedOvertimes = useMemo(() => {
    if (!overtimeSchedules || overtimeSchedules.length === 0) return [];
    
    return overtimeSchedules.map(ot => ({
      ...ot,
      date: new Date(ot.date)
    }));
  }, [overtimeSchedules]);
  
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
    
    return grouped;
  }, [processedSchedules, processedOvertimes]);
  
  // Tạo danh sách ngày cho view (tuần hoặc tháng)
  const dateRange = useMemo(() => {
    const dates = [];
    
    if (viewMode === 'week') {
      // Logic tạo 7 ngày trong tuần
      const today = new Date();
      const startOfWeek = new Date(today);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        dates.push(date);
      }
    } else if (viewMode === 'month') {
      // Logic tạo tất cả ngày trong tháng
      const daysInMonth = new Date(year, month, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        dates.push(new Date(year, month - 1, i));
      }
    }
    
    return dates;
  }, [viewMode, month, year]);
  
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
        overtimes: dayData.overtimes
      };
    });
  }, [dateRange, groupedByDate]);
  
  // ✅ BƯỚC 2: Early returns SAU khi đã gọi tất cả Hooks
  
  if (loading) {
    return (
      <div className="schedule-table-view__loading">
        <FaSpinner className="fa-spin" /> Đang tải dữ liệu...
      </div>
    );
  }
  
  if (!workShiftConfig || workShiftConfig.length === 0) {
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
              <th>Lịch làm việc</th>
              <th>Tăng ca</th>
            </tr>
          </thead>
          <tbody>
            {tableData.length === 0 ? (
              <tr>
                <td colSpan="4" className="schedule-table-view__empty-row">
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
                  <td className="schedule-table-view__schedules">
                    {row.schedules.length === 0 ? (
                      <span className="schedule-table-view__no-data">-</span>
                    ) : (
                      <div className="schedule-table-view__shifts">
                        {row.schedules.map((schedule, idx) => (
                          <span 
                            key={idx} 
                            className="schedule-table-view__shift-badge schedule"
                            title={schedule.shift_name}
                          >
                            {schedule.shiftInfo.display_name || schedule.shift_name}
                            {schedule.shiftInfo.start_time && (
                              <small>
                                {' '}({schedule.shiftInfo.start_time?.slice(0,5)} - {schedule.shiftInfo.end_time?.slice(0,5)})
                              </small>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
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