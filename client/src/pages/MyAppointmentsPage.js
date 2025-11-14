// client/src/pages/MyAppointmentsPage.js
// SỬA LỖI: Gộp logic cho Bệnh nhân (Patient) và Bác sĩ (Doctor)
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
// SỬA: Import appointmentService để gọi API
import appointmentService from '../services/appointmentService'; 
import './MyAppointmentsPage.css'; 

// Import Icons
import {
  FaCalendarAlt, FaClock, FaCheckCircle, FaTimesCircle, FaHourglassHalf,
  FaSpinner, FaArrowRight, FaPlus, FaUserMd, FaVideo, FaHospital,
  FaExclamationTriangle, FaCalendarCheck, FaUser // Thêm FaUser
} from 'react-icons/fa';

const MyAppointmentsPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  
  // SỬA: Thêm tiêu đề động
  const [pageTitle, setPageTitle] = useState('Lịch hẹn của tôi');

  // ========== INIT (Sửa logic) ==========
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      toast.error('Vui lòng đăng nhập');
      navigate('/login');
      return;
    }

    try {
      const userData = JSON.parse(userStr);
      
      // SỬA: Xóa logic chặn Bác sĩ
      // if (userData.role !== 'patient') { ... }
      
      setUser(userData);
      
      // SỬA: Tải dữ liệu dựa trên role
      if (userData.role === 'patient') {
        setPageTitle('Lịch hẹn của tôi');
        loadMyAppointments();
      } else if (userData.role === 'doctor') {
        setPageTitle('Lịch hẹn của Bác sĩ');
        loadDoctorAppointments();
      } else {
        // Nếu role khác (ví dụ admin vô tình vào)
        toast.error('Trang này chỉ dành cho Bệnh nhân và Bác sĩ');
        navigate('/dashboard');
      }
      
    } catch (error) {
      console.error('Parse user error:', error);
      navigate('/login');
    }
  }, [navigate]);

  // ========== LOAD DATA (Sửa logic) ==========
  
  // 1. Dành cho Patient
  const loadMyAppointments = async () => {
    try {
      setLoading(true);
      const response = await appointmentService.getMyAppointments(); // Dùng service
      if (response.data.success) {
        // Sắp xếp (giữ nguyên)
        const sortedAppointments = (response.data.data || []).sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date));
        setAppointments(sortedAppointments);
        setFilteredAppointments(sortedAppointments);
      }
    } catch (error) {
      console.error('Load appointments error:', error);
      toast.error('Không thể tải danh sách lịch hẹn');
    } finally {
      setLoading(false);
    }
  };
  
  // 2. Dành cho Doctor (MỚI)
  const loadDoctorAppointments = async () => {
    try {
      setLoading(true);
      const response = await appointmentService.getDoctorAppointments(); // API của bác sĩ
      if (response.data.success) {
        const sortedAppointments = (response.data.data || []).sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date));
        setAppointments(sortedAppointments);
        setFilteredAppointments(sortedAppointments);
      }
    } catch (error) {
      console.error('Load doctor appointments error:', error);
      toast.error('Không thể tải danh sách lịch hẹn của bác sĩ');
    } finally {
      setLoading(false);
    }
  };

  // ========== HANDLERS (Giữ nguyên) ==========
  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
    if (status === 'all') {
      setFilteredAppointments(appointments);
    } else {
      setFilteredAppointments(appointments.filter(apt => apt.status === status));
    }
  };

  const handleAppointmentClick = (appointment) => {
    navigate(`/lich-hen/${appointment.code}`);
  };

  const handleBookNewAppointment = () => {
    navigate('/dat-lich-hen');
  };

  // ========== HELPERS (Sửa đổi) ==========
  const getStatusInfo = (status) => {
    const info = {
      pending: { text: 'Chờ xác nhận', class: 'status-pending', icon: <FaHourglassHalf /> },
      confirmed: { text: 'Đã xác nhận', class: 'status-confirmed', icon: <FaCheckCircle /> },
      in_progress: { text: 'Đang khám', class: 'status-in-progress', icon: <FaSpinner className="fa-spin" /> },
      completed: { text: 'Hoàn thành', class: 'status-completed', icon: <FaCheckCircle /> },
      cancelled: { text: 'Đã hủy', class: 'status-cancelled', icon: <FaTimesCircle /> }
    };
    return info[status] || info.pending;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', { 
      weekday: 'short',
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTime = (timeStr) => timeStr ? timeStr.slice(0, 5) : 'N/A';

  const isPastAppointment = (date, time) => {
    const appointmentDateTime = new Date(`${date} ${time}`);
    return appointmentDateTime < new Date();
  };
  
  const getStats = () => {
    const total = appointments.length;
    // Sửa: Logic 'upcoming' phải bao gồm cả 'pending'
    const upcoming = appointments.filter(a => ['pending', 'confirmed', 'in_progress'].includes(a.status) && !isPastAppointment(a.appointment_date, a.appointment_start_time)).length;
    const completed = appointments.filter(a => a.status === 'completed').length;
    const cancelled = appointments.filter(a => a.status === 'cancelled').length;
    return { total, upcoming, completed, cancelled };
  };

  const stats = getStats();

  // ========== RENDER ==========
  if (loading) {
    return (
      <div className="my-appointments-page-container">
        <div className="my-appointments-page-loading">
          <FaSpinner className="fa-spin" />
          <span>Đang tải danh sách lịch hẹn...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="my-appointments-page-container">
      <div className="my-appointments-page-wrapper">
        <div className="my-appointments-page-header">
          {/* SỬA: Dùng tiêu đề động */}
          <h1 className="my-appointments-page-title">{pageTitle}</h1>
          {/* SỬA: Chỉ hiện nút Đặt lịch cho Bệnh nhân */}
          {user && user.role === 'patient' && (
            <button className="my-appointments-page-btn-book-new" onClick={handleBookNewAppointment}>
              <FaPlus /> Đặt lịch mới
            </button>
          )}
        </div>

        {/* STATS GRID (Giữ nguyên) */}
        <div className="my-appointments-page-stats-grid">
          <div className="my-appointments-page-stat-card">
            <div className="my-appointments-page-stat-icon icon-total">
              <FaCalendarCheck />
            </div>
            <div className="my-appointments-page-stat-info">
              <span className="my-appointments-page-stat-label">Tổng lịch hẹn</span>
              <span className="my-appointments-page-stat-value">{stats.total}</span>
            </div>
          </div>
          <div className="my-appointments-page-stat-card">
            <div className="my-appointments-page-stat-icon icon-upcoming">
              <FaClock />
            </div>
            <div className="my-appointments-page-stat-info">
              <span className="my-appointments-page-stat-label">Sắp tới</span>
              <span className="my-appointments-page-stat-value">{stats.upcoming}</span>
            </div>
          </div>
          <div className="my-appointments-page-stat-card">
            <div className="my-appointments-page-stat-icon icon-completed">
              <FaCheckCircle />
            </div>
            <div className="my-appointments-page-stat-info">
              <span className="my-appointments-page-stat-label">Hoàn thành</span>
              <span className="my-appointments-page-stat-value">{stats.completed}</span>
            </div>
          </div>
          <div className="my-appointments-page-stat-card">
            <div className="my-appointments-page-stat-icon icon-cancelled">
              <FaTimesCircle />
            </div>
            <div className="my-appointments-page-stat-info">
              <span className="my-appointments-page-stat-label">Đã hủy</span>
              <span className="my-appointments-page-stat-value">{stats.cancelled}</span>
            </div>
          </div>
        </div>

        {/* FILTERS (Giữ nguyên) */}
        <div className="my-appointments-page-filter-tabs">
          <button
            className={`my-appointments-page-tab ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => handleStatusFilterChange('all')}
          >
            Tất cả ({appointments.length})
          </button>
          <button
            className={`my-appointments-page-tab ${statusFilter === 'pending' ? 'active' : ''}`}
            onClick={() => handleStatusFilterChange('pending')}
          >
            Chờ xác nhận ({appointments.filter(a => a.status === 'pending').length})
          </button>
          <button
            className={`my-appointments-page-tab ${statusFilter === 'confirmed' ? 'active' : ''}`}
            onClick={() => handleStatusFilterChange('confirmed')}
          >
            Đã xác nhận ({appointments.filter(a => a.status === 'confirmed').length})
          </button>
          <button
            className={`my-appointments-page-tab ${statusFilter === 'completed' ? 'active' : ''}`}
            onClick={() => handleStatusFilterChange('completed')}
          >
            Hoàn thành ({appointments.filter(a => a.status === 'completed').length})
          </button>
          <button
            className={`my-appointments-page-tab ${statusFilter === 'cancelled' ? 'active' : ''}`}
            onClick={() => handleStatusFilterChange('cancelled')}
          >
            Đã hủy ({appointments.filter(a => a.status === 'cancelled').length})
          </button>
        </div>

        {/* APPOINTMENTS LIST */}
        {filteredAppointments.length === 0 ? (
          <div className="my-appointments-page-empty-state">
            <FaCalendarCheck className="my-appointments-page-empty-icon" />
            <h3>Chưa có lịch hẹn nào</h3>
            <p>
              {user?.role === 'patient' 
                ? 'Đặt lịch khám bệnh ngay để được tư vấn và chăm sóc sức khỏe'
                : 'Bạn không có lịch hẹn nào.'
              }
            </p>
            {user?.role === 'patient' && (
              <button className="my-appointments-page-btn-book-new" onClick={handleBookNewAppointment}>
                <FaPlus /> Đặt lịch ngay
              </button>
            )}
          </div>
        ) : (
          <div className="my-appointments-page-list">
            {filteredAppointments.map(appointment => {
              const statusInfo = getStatusInfo(appointment.status);
              return (
                <div
                  key={appointment.id}
                  className="my-appointments-page-card"
                  onClick={() => handleAppointmentClick(appointment)}
                >
                  <div className="my-appointments-page-card-header">
                    <div className="my-appointments-page-card-code">
                      Mã: <span>{appointment.code}</span>
                    </div>
                    <span className={`my-appointments-page-status-badge ${statusInfo.class}`}>
                      {statusInfo.icon}
                      {statusInfo.text}
                    </span>
                  </div>

                  <div className="my-appointments-page-card-body">
                    <div className="my-appointments-page-card-service">
                      {appointment.Service?.name}
                    </div>

                    {/* SỬA: Hiển thị Bác sĩ (cho Patient) hoặc Bệnh nhân (cho Doctor) */}
                    {user?.role === 'patient' ? (
                      <div className="my-appointments-page-card-doctor">
                        <FaUserMd />
                        BS. {appointment.Doctor?.user?.full_name}
                        {appointment.Doctor?.specialty?.name && (
                          <span className="my-appointments-page-specialty"> - {appointment.Doctor.specialty.name}</span>
                        )}
                      </div>
                    ) : (
                      <div className="my-appointments-page-card-doctor">
                        <FaUser />
                        BN. {appointment.Patient?.user?.full_name || appointment.guest_name}
                        {appointment.Patient?.user?.phone || appointment.guest_phone && (
                           <span className="my-appointments-page-specialty"> - {appointment.Patient?.user?.phone || appointment.guest_phone}</span>
                        )}
                      </div>
                    )}

                    <div className="my-appointments-page-card-datetime">
                      <div className="my-appointments-page-datetime-item">
                        <FaCalendarAlt />
                        <span>{formatDate(appointment.appointment_date)}</span>
                      </div>
                      <div className="my-appointments-page-datetime-item">
                        <FaClock />
                        <span>{formatTime(appointment.appointment_start_time)}</span>
                      </div>
                      <div className="my-appointments-page-datetime-item">
                        {appointment.appointment_type === 'online' ? <FaVideo /> : <FaHospital />}
                        <span>
                          {appointment.appointment_type === 'online' ? 'Trực tuyến' : 'Trực tiếp'}
                        </span>
                      </div>
                    </div>

                    {appointment.payment_status === 'pending' && appointment.status !== 'cancelled' && (
                      <div className="my-appointments-page-payment-warning">
                        <FaExclamationTriangle /> Chưa thanh toán
                      </div>
                    )}

                    {isPastAppointment(appointment.appointment_date, appointment.appointment_start_time) && 
                     appointment.status !== 'completed' && 
                     appointment.status !== 'cancelled' && (
                      <div className="my-appointments-page-past-indicator">
                        Đã quá giờ hẹn
                      </div>
                    )}
                  </div>

                  <div className="my-appointments-page-card-footer">
                    <span className="my-appointments-page-view-detail">
                      Xem chi tiết <FaArrowRight />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyAppointmentsPage;