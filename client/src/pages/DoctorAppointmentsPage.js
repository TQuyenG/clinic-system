// client/src/pages/DoctorAppointmentsPage.js - HOÀN CHỈNH
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import appointmentService from '../services/appointmentService';
import { toast } from 'react-toastify';
import {
  FaCalendarAlt,
  FaClock,
  FaUser,
  FaPhone,
  FaEnvelope,
  FaCheckCircle,
  FaTimesCircle,
  FaHourglassHalf,
  FaEye,
  FaEdit,
  FaFileAlt,
  FaNotesMedical,
  FaExclamationTriangle,
  FaFilter,
  FaSearch
} from 'react-icons/fa';
import './DoctorAppointmentsPage.css';

const DoctorAppointmentsPage = () => {
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal
  const [showChangeRequestModal, setShowChangeRequestModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [changeReason, setChangeReason] = useState('');
  const [changeNote, setChangeNote] = useState('');

  useEffect(() => {
    fetchDoctorAppointments();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filterStatus, filterDate, searchQuery, appointments]);

  const fetchDoctorAppointments = async () => {
    try {
      setLoading(true);
      const response = await appointmentService.getDoctorAppointments();
      
      if (response.data.success) {
        setAppointments(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Lỗi khi tải danh sách lịch hẹn');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...appointments];

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(apt => apt.status === filterStatus);
    }

    // Filter by date
    if (filterDate) {
      filtered = filtered.filter(apt => apt.appointment_date === filterDate);
    }

    // Search by patient name
    if (searchQuery) {
      filtered = filtered.filter(apt =>
        apt.Patient?.User?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredAppointments(filtered);
  };

  const handleRequestChange = (appointment) => {
    setSelectedAppointment(appointment);
    setShowChangeRequestModal(true);
  };

  const submitChangeRequest = async () => {
    if (!changeReason.trim()) {
      toast.warn('Vui lòng nhập lý do thay đổi');
      return;
    }

    try {
      const response = await appointmentService.requestAppointmentChange(
        selectedAppointment.id,
        {
          reason: changeReason,
          note: changeNote
        }
      );

      if (response.data.success) {
        toast.success('Đã gửi yêu cầu thay đổi lịch hẹn');
        fetchDoctorAppointments();
        setShowChangeRequestModal(false);
        setChangeReason('');
        setChangeNote('');
        setSelectedAppointment(null);
      }
    } catch (error) {
      console.error('Error requesting change:', error);
      toast.error(error.response?.data?.message || 'Lỗi khi gửi yêu cầu');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { 
        icon: <FaHourglassHalf />, 
        text: 'Chờ xác nhận', 
        class: 'status-pending' 
      },
      confirmed: { 
        icon: <FaCheckCircle />, 
        text: 'Đã xác nhận', 
        class: 'status-confirmed' 
      },
      completed: { 
        icon: <FaCheckCircle />, 
        text: 'Hoàn thành', 
        class: 'status-completed' 
      },
      cancelled: { 
        icon: <FaTimesCircle />, 
        text: 'Đã hủy', 
        class: 'status-cancelled' 
      },
      doctor_requested_change: {
        icon: <FaExclamationTriangle />,
        text: 'Yêu cầu thay đổi',
        class: 'status-change-requested'
      },
      awaiting_patient_response: {
        icon: <FaHourglassHalf />,
        text: 'Chờ bệnh nhân phản hồi',
        class: 'status-awaiting'
      }
    };

    const config = statusConfig[status] || statusConfig.pending;
    
    return (
      <span className={`status-badge ${config.class}`}>
        {config.icon} {config.text}
      </span>
    );
  };

  const getAppointmentStats = () => {
    const total = appointments.length;
    const today = new Date().toISOString().split('T')[0];
    const todayCount = appointments.filter(apt => apt.appointment_date === today).length;
    const pending = appointments.filter(apt => apt.status === 'pending' || apt.status === 'confirmed').length;
    const completed = appointments.filter(apt => apt.status === 'completed').length;

    return { total, today: todayCount, pending, completed };
  };

  const stats = getAppointmentStats();

  if (loading) {
    return (
      <div className="doctor-appointments-page">
        <div className="loading-spinner">Đang tải danh sách lịch hẹn...</div>
      </div>
    );
  }

  return (
    <div className="doctor-appointments-page">
      <div className="appointments-container">
        {/* Header */}
        <div className="page-header">
          <div className="header-content">
            <h1>Lịch Hẹn Khám Của Tôi</h1>
            <p>Quản lý lịch hẹn khám bệnh của bạn</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card total">
            <div className="stat-icon">
              <FaCalendarAlt />
            </div>
            <div className="stat-info">
              <p className="stat-label">Tổng lịch hẹn</p>
              <p className="stat-value">{stats.total}</p>
            </div>
          </div>

          <div className="stat-card today">
            <div className="stat-icon">
              <FaClock />
            </div>
            <div className="stat-info">
              <p className="stat-label">Hôm nay</p>
              <p className="stat-value">{stats.today}</p>
            </div>
          </div>

          <div className="stat-card pending">
            <div className="stat-icon">
              <FaHourglassHalf />
            </div>
            <div className="stat-info">
              <p className="stat-label">Sắp tới</p>
              <p className="stat-value">{stats.pending}</p>
            </div>
          </div>

          <div className="stat-card completed">
            <div className="stat-icon">
              <FaCheckCircle />
            </div>
            <div className="stat-info">
              <p className="stat-label">Hoàn thành</p>
              <p className="stat-value">{stats.completed}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-section">
          <div className="filter-group">
            <label><FaFilter /> Trạng thái:</label>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="all">Tất cả</option>
              <option value="pending">Chờ xác nhận</option>
              <option value="confirmed">Đã xác nhận</option>
              <option value="completed">Hoàn thành</option>
              <option value="cancelled">Đã hủy</option>
            </select>
          </div>

          <div className="filter-group">
            <label><FaCalendarAlt /> Ngày khám:</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="filter-input"
            />
          </div>

          <div className="filter-group search-group">
            <label><FaSearch /> Tìm bệnh nhân:</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nhập tên bệnh nhân..."
              className="filter-input"
            />
          </div>

          {(filterStatus !== 'all' || filterDate || searchQuery) && (
            <button
              className="btn-clear-filters"
              onClick={() => {
                setFilterStatus('all');
                setFilterDate('');
                setSearchQuery('');
              }}
            >
              Xóa bộ lọc
            </button>
          )}
        </div>

        {/* Appointments List */}
        <div className="appointments-list">
          {filteredAppointments.length > 0 ? (
            filteredAppointments.map(appointment => (
              <div key={appointment.id} className="appointment-card">
                <div className="appointment-header">
                  <div className="appointment-id">
                    <FaCalendarAlt />
                    Mã: #{appointment.id}
                  </div>
                  {getStatusBadge(appointment.status)}
                </div>

                <div className="appointment-body">
                  {/* Patient Info */}
                  <div className="patient-section">
                    <h3><FaUser /> Thông tin bệnh nhân</h3>
                    <div className="patient-info">
                      <div className="info-row">
                        <span className="label">Họ tên:</span>
                        <span className="value">{appointment.Patient?.User?.full_name || 'N/A'}</span>
                      </div>
                      {appointment.Patient?.User?.phone && (
                        <div className="info-row">
                          <FaPhone className="icon" />
                          <span className="value">{appointment.Patient.User.phone}</span>
                        </div>
                      )}
                      {appointment.Patient?.User?.email && (
                        <div className="info-row">
                          <FaEnvelope className="icon" />
                          <span className="value">{appointment.Patient.User.email}</span>
                        </div>
                      )}
                      {appointment.Patient?.User?.dob && (
                        <div className="info-row">
                          <span className="label">Ngày sinh:</span>
                          <span className="value">
                            {new Date(appointment.Patient.User.dob).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                      )}
                      {appointment.Patient?.User?.gender && (
                        <div className="info-row">
                          <span className="label">Giới tính:</span>
                          <span className="value">{appointment.Patient.User.gender}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Appointment Info */}
                  <div className="appointment-info">
                    <div className="info-row">
                      <FaCalendarAlt className="icon" />
                      <div>
                        <span className="label">Ngày khám:</span>
                        <span className="value">
                          {new Date(appointment.appointment_date).toLocaleDateString('vi-VN', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="info-row">
                      <FaClock className="icon" />
                      <div>
                        <span className="label">Giờ khám:</span>
                        <span className="value">{appointment.appointment_time}</span>
                      </div>
                    </div>

                    <div className="info-row">
                      <FaNotesMedical className="icon" />
                      <div>
                        <span className="label">Dịch vụ:</span>
                        <span className="value">{appointment.Service?.name || 'N/A'}</span>
                      </div>
                    </div>

                    {appointment.reason && (
                      <div className="reason-box">
                        <strong>Lý do khám:</strong>
                        <p>{appointment.reason}</p>
                      </div>
                    )}

                    {appointment.notes && (
                      <div className="notes-box">
                        <strong>Ghi chú:</strong>
                        <p>{appointment.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="appointment-actions">
                    <button
                      className="btn-action btn-view"
                      onClick={() => navigate(`/lich-hen/${appointment.id}`)}
                    >
                      <FaEye /> Chi tiết
                    </button>

                    {/* ✅ NHẬP KẾT QUẢ - CHỈ HIỆN KHI confirmed VÀ CHƯA CÓ MEDICAL RECORD */}
                    {appointment.status === 'confirmed' && !appointment.MedicalRecord && (
                      <button
                        className="btn-action btn-add-result"
                        onClick={() => navigate(`/nhap-ket-qua/${appointment.id}`)}
                      >
                        <FaFileAlt /> Nhập kết quả
                      </button>
                    )}

                    {/* ✅ XEM KẾT QUẢ - CHỈ HIỆN KHI ĐÃ CÓ MEDICAL RECORD */}
                    {appointment.MedicalRecord && (
                      <button
                        className="btn-action btn-view-result"
                        onClick={() => navigate(`/ket-qua-kham/${appointment.MedicalRecord.id}`)}
                      >
                        <FaFileAlt /> Xem kết quả
                      </button>
                    )}

                    {/* YÊU CẦU THAY ĐỔI */}
                    {(appointment.status === 'pending' || appointment.status === 'confirmed') && (
                      <button
                        className="btn-action btn-change"
                        onClick={() => handleRequestChange(appointment)}
                      >
                        <FaEdit /> Yêu cầu đổi lịch
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <FaCalendarAlt />
              <h3>Không có lịch hẹn nào</h3>
              <p>
                {filterStatus !== 'all' || filterDate || searchQuery
                  ? 'Không tìm thấy lịch hẹn phù hợp với bộ lọc'
                  : 'Bạn chưa có lịch hẹn nào'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Change Request Modal */}
      {showChangeRequestModal && selectedAppointment && (
        <div className="modal-overlay" onClick={() => setShowChangeRequestModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Yêu cầu thay đổi lịch hẹn</h2>
              <button
                className="btn-close"
                onClick={() => setShowChangeRequestModal(false)}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="appointment-summary">
                <p><strong>Bệnh nhân:</strong> {selectedAppointment.Patient?.User?.full_name}</p>
                <p><strong>Ngày:</strong> {new Date(selectedAppointment.appointment_date).toLocaleDateString('vi-VN')}</p>
                <p><strong>Giờ:</strong> {selectedAppointment.appointment_time}</p>
              </div>

              <div className="form-group">
                <label>Lý do thay đổi *</label>
                <textarea
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="VD: Có ca cấp cứu khẩn..."
                  rows="4"
                  required
                />
              </div>

              <div className="form-group">
                <label>Ghi chú thêm</label>
                <textarea
                  value={changeNote}
                  onChange={(e) => setChangeNote(e.target.value)}
                  placeholder="Các thông tin bổ sung..."
                  rows="3"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowChangeRequestModal(false)}
              >
                Hủy
              </button>
              <button
                className="btn btn-primary"
                onClick={submitChangeRequest}
              >
                <FaEdit /> Gửi yêu cầu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorAppointmentsPage;