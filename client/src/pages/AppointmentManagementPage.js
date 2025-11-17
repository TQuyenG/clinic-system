// client/src/pages/AppointmentManagementPage.js
// PHIÊN BẢN CẬP NHẬT HOÀN CHỈNH
// 1. Thêm cột "Kết quả khám" (expandable)
// 2. XÓA BỎ Modal Admin, nhấn là reset và hiển thị luôn

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import appointmentService from '../services/appointmentService';
import medicalRecordService from '../services/medicalRecordService'; 
import ConfirmModal from '../components/medical/ConfirmModal';
import { toast } from 'react-toastify';
// XÓA: Import modal admin
// import AdminPasswordModal from '../components/auth/AdminPasswordModal'; 

import { 
  FaCalendarAlt, FaClock, FaUserMd, FaUser, FaCheckCircle, FaTimesCircle, 
  FaHourglassHalf, FaEye, FaBan, FaFilter, FaSearch, FaDownload, 
  FaPhone, FaEnvelope, FaSpinner, FaTimes,
  FaChevronDown, FaChevronRight, FaLock, FaSyncAlt // BỔ SUNG: Icon Reset
} from 'react-icons/fa';
import './AppointmentManagementPage.css'; 

const AppointmentManagementPage = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [filters, setFilters] = useState({
    status: 'all',
    date: '',
    doctor: '',
    search: ''
  });

  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState('');
  const [actionReason, setActionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State cho hàng mở rộng
  const [expandedRow, setExpandedRow] = useState(null); 
  
  // State cho nút reset code (để chống click nhiều lần)
  const [isResettingCode, setIsResettingCode] = useState(false);
  
  // SỬA: State cho modal confirm (thay vì modal admin)
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState(null);


  useEffect(() => {
    fetchAllAppointments();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, appointments]);

  const fetchAllAppointments = async () => {
    try {
      setLoading(true);
      const response = await appointmentService.getAllAppointments(); 
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
    if (filters.status !== 'all') {
      filtered = filtered.filter(apt => apt.status === filters.status);
    }
    if (filters.date) {
      filtered = filtered.filter(apt => apt.appointment_date === filters.date);
    }
    if (filters.doctor) {
      filtered = filtered.filter(apt => 
        apt.Doctor?.user?.full_name?.toLowerCase().includes(filters.doctor.toLowerCase())
      );
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(apt => 
        apt.code?.toLowerCase().includes(searchLower) ||
        (apt.Patient?.user?.full_name || apt.guest_name)?.toLowerCase().includes(searchLower) ||
        (apt.Patient?.user?.email || apt.guest_email)?.toLowerCase().includes(searchLower) ||
        (apt.Patient?.user?.phone || apt.guest_phone)?.includes(filters.search)
      );
    }
    setFilteredAppointments(filtered);
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
  };

  const resetFilters = () => {
    setFilters({ status: 'all', date: '', doctor: '', search: '' });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return 'N/A';
    return timeStr.slice(0, 5);
  };
  
  const formatFullDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return 'N/A';
    return new Date(dateTimeStr).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // --- Logic Modal (Giữ nguyên) ---
  const openActionModal = (appointment, type) => {
    setSelectedAppointment(appointment);
    setActionType(type);
    setShowActionModal(true);
  };
  const closeActionModal = () => {
    setShowActionModal(false);
    setSelectedAppointment(null);
    setActionType('');
    setActionReason('');
  };
  const handleConfirmAction = async () => {
    if (!selectedAppointment) return;
    const appointmentCode = selectedAppointment.code;
    try {
      setIsSubmitting(true);
      switch (actionType) {
        case 'confirm':
          await appointmentService.confirmAppointment(appointmentCode);
          toast.success('Xác nhận lịch hẹn thành công');
          break;
        case 'complete':
          navigate(`/nhap-ket-qua/${appointmentCode}`);
          return; 
        case 'cancel':
          if (!actionReason.trim()) {
            toast.warn('Vui lòng nhập lý do hủy lịch');
            setIsSubmitting(false);
            return;
          }
          await appointmentService.cancelAppointment(
            appointmentCode, 
            actionReason
          );
          toast.success('Hủy lịch hẹn thành công');
          break;
        default:
          break;
      }
      fetchAllAppointments();
      closeActionModal();
    } catch (error) {
      console.error('Error performing action:', error);
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setIsSubmitting(false);
    }
  };
  // --- Kết thúc Logic Modal ---


  // --- SỬA: Logic cho Cột Kết Quả ---
  
  // Mở/đóng hàng chi tiết kết quả
  const toggleResultRow = (recordId) => {
    if (expandedRow === recordId) {
      setExpandedRow(null); // Đóng lại
    } else {
      setExpandedRow(recordId); // Mở ra
    }
  };

  // SỬA: Bước 1: Mở Modal Confirm
  const handleResetCodeClick = (recordId) => {
    if (isResettingCode) return;
    
    // Lưu record ID lại
    setSelectedRecordId(recordId);
    // Mở modal
    setShowConfirmModal(true); 
  };
  
  // SỬA: Bước 2: Hàm này được gọi khi Admin nhấn "Xác nhận" trên Modal
  const handleConfirmReset = async () => {
    if (!selectedRecordId) return;

    try {
      setIsResettingCode(true); // Disable nút
      
      const response = await medicalRecordService.resetLookupCodeByAdmin(selectedRecordId);

      if (response.data.success) {
        toast.success(
          <div>
            <strong>{response.data.message}</strong><br /> 
            Mã mới (để báo cho BN nếu cần):<br />
            <strong style={{ color: '#D9534F', fontSize: '1.1rem' }}>{response.data.newLookupCode}</strong>
          </div>,
          { autoClose: 10000 }
        );
        fetchAllAppointments();
      }
    } catch (error) {
      console.error('Reset code error:', error);
      toast.error(error.response?.data?.message || 'Lỗi khi reset mã');
    } finally {
      setIsResettingCode(false);
      setShowConfirmModal(false); // Đóng modal
      setSelectedRecordId(null);
    }
  };
  // --- Kết thúc Sửa ---


  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { icon: <FaHourglassHalf />, text: 'Chờ xác nhận', class: 'status-pending' },
      confirmed: { icon: <FaCheckCircle />, text: 'Đã xác nhận', class: 'status-confirmed' },
      in_progress: { icon: <FaSpinner className="fa-spin"/>, text: 'Đang khám', class: 'status-in-progress' },
      completed: { icon: <FaCheckCircle />, text: 'Hoàn thành', class: 'status-completed' },
      cancelled: { icon: <FaTimesCircle />, text: 'Đã hủy', class: 'status-cancelled' }
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`admin-appt-page-status-badge ${config.class}`}>
        {config.icon} {config.text}
      </span>
    );
  };

  const getStats = () => {
    const total = appointments.length;
    const pending = appointments.filter(a => a.status === 'pending').length;
    const confirmed = appointments.filter(a => a.status === 'confirmed').length;
    const completed = appointments.filter(a => a.status === 'completed').length;
    const cancelled = appointments.filter(a => a.status === 'cancelled').length;
    return { total, pending, confirmed, completed, cancelled };
  };

  const exportToCSV = () => {
    const headers = ['MaLichHen', 'BenhNhan', 'Email', 'SDT', 'DichVu', 'BacSi', 'Ngay', 'Gio', 'TrangThai'];
    const rows = filteredAppointments.map(apt => [
      apt.code,
      (apt.Patient?.user?.full_name || apt.guest_name || 'N/A').replace(/,/g, ''),
      (apt.Patient?.user?.email || apt.guest_email || 'N/A'),
      (apt.Patient?.user?.phone || apt.guest_phone || 'N/A'),
      (apt.Service?.name || 'N/A').replace(/,/g, ''),
      (apt.Doctor?.user?.full_name || 'N/A').replace(/,/g, ''),
      apt.appointment_date,
      apt.appointment_start_time,
      apt.status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `appointments_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const stats = getStats();

  if (loading) {
    return (
      <div className="admin-appt-page-container">
        <div className="admin-appt-page-loading">
          <FaSpinner className="fa-spin" />
          <span>Đang tải danh sách lịch hẹn...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="admin-appt-page-container">
        <div className="admin-appt-page-wrapper">
          {/* Header */}
          <div className="admin-appt-page-header">
            <div className="admin-appt-page-header-content">
              <h1>Quản lý lịch hẹn</h1>
              <p>Quản lý và theo dõi tất cả lịch hẹn của bệnh nhân</p>
            </div>
            <div className="admin-appt-page-header-actions">
              <button 
                className="admin-appt-page-btn btn-secondary"
                onClick={() => setShowFilterPanel(!showFilterPanel)}
              >
                <FaFilter /> {showFilterPanel ? 'Ẩn' : 'Hiện'} bộ lọc
              </button>
              <button 
                className="admin-appt-page-btn btn-primary"
                onClick={exportToCSV}
              >
                <FaDownload /> Xuất dữ liệu
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="admin-appt-page-stats-grid">
             <div className="admin-appt-page-stat-card">
              <div className="admin-appt-page-stat-icon icon-total">
                <FaCalendarAlt />
              </div>
              <div className="admin-appt-page-stat-info">
                <span className="admin-appt-page-stat-label">Tổng lịch hẹn</span>
                <span className="admin-appt-page-stat-value">{stats.total}</span>
              </div>
            </div>
            <div className="admin-appt-page-stat-card">
              <div className="admin-appt-page-stat-icon icon-pending">
                <FaHourglassHalf />
              </div>
              <div className="admin-appt-page-stat-info">
                <span className="admin-appt-page-stat-label">Chờ xác nhận</span>
                <span className="admin-appt-page-stat-value">{stats.pending}</span>
              </div>
            </div>
            <div className="admin-appt-page-stat-card">
              <div className="admin-appt-page-stat-icon icon-confirmed">
                <FaCheckCircle />
              </div>
              <div className="admin-appt-page-stat-info">
                <span className="admin-appt-page-stat-label">Đã xác nhận</span>
                <span className="admin-appt-page-stat-value">{stats.confirmed}</span>
              </div>
            </div>
            <div className="admin-appt-page-stat-card">
              <div className="admin-appt-page-stat-icon icon-completed">
                <FaCheckCircle />
              </div>
              <div className="admin-appt-page-stat-info">
                <span className="admin-appt-page-stat-label">Hoàn thành</span>
                <span className="admin-appt-page-stat-value">{stats.completed}</span>
              </div>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilterPanel && (
            <div className="admin-appt-page-filter-panel">
              <div className="admin-appt-page-filter-grid">
                <div className="admin-appt-page-filter-group">
                  <label>Tìm kiếm</label>
                  <div className="admin-appt-page-search-input">
                    <FaSearch />
                    <input 
                      type="text"
                      placeholder="Mã, Tên, Email, SĐT..."
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                    />
                  </div>
                </div>
                <div className="admin-appt-page-filter-group">
                  <label>Trạng thái</label>
                  <select 
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                  >
                    <option value="all">Tất cả</option>
                    <option value="pending">Chờ xác nhận</option>
                    <option value="confirmed">Đã xác nhận</option>
                    <option value="in_progress">Đang khám</option>
                    <option value="completed">Hoàn thành</option>
                    <option value="cancelled">Đã hủy</option>
                  </select>
                </div>
                <div className="admin-appt-page-filter-group">
                  <label>Ngày khám</label>
                  <input 
                    type="date"
                    value={filters.date}
                    onChange={(e) => handleFilterChange('date', e.target.value)}
                  />
                </div>
                <div className="admin-appt-page-filter-group">
                  <label>Bác sĩ</label>
                  <input 
                    type="text"
                    placeholder="Tên bác sĩ..."
                    value={filters.doctor}
                    onChange={(e) => handleFilterChange('doctor', e.target.value)}
                  />
                </div>
              </div>
              <div className="admin-appt-page-filter-actions">
                <button className="admin-appt-page-btn btn-secondary" onClick={resetFilters}>
                  Đặt lại
                </button>
                <span className="admin-appt-page-filter-result">
                  Hiển thị {filteredAppointments.length} / {appointments.length} lịch hẹn
                </span>
              </div>
            </div>
          )}

          {/* Appointments Table */}
          <div className="admin-appt-page-table-container">
            <table className="admin-appt-page-table">
              <thead>
                <tr>
                  <th>Mã Lịch Hẹn</th>
                  <th>Bệnh nhân</th>
                  <th>Dịch vụ</th>
                  <th>Bác sĩ</th>
                  <th>Ngày & Giờ</th>
                  <th>Trạng thái</th>
                  <th className="th-result">Kết quả khám</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.length > 0 ? (
                  filteredAppointments.map(apt => {
                    const medicalRecord = apt.MedicalRecord;
                    const isExpanded = expandedRow === medicalRecord?.id;

                    return (
                      <React.Fragment key={apt.id}>
                        {/* HÀNG CHÍNH */}
                        <tr className={isExpanded ? 'row-expanded' : ''}>
                          <td data-label="Mã">{apt.code}</td>
                          <td data-label="Bệnh nhân">
                            <div className="admin-appt-page-patient-info">
                              <strong>{apt.Patient?.user?.full_name || apt.guest_name || 'N/A'}</strong>
                              <div className="admin-appt-page-contact-info">
                                {apt.Patient?.user?.phone || apt.guest_phone ? (
                                  <span><FaPhone /> {apt.Patient?.user?.phone || apt.guest_phone}</span>
                                ) : null}
                                {apt.Patient?.user?.email || apt.guest_email ? (
                                  <span><FaEnvelope /> {apt.Patient?.user?.email || apt.guest_email}</span>
                                ) : null}
                              </div>
                            </div>
                          </td>
                          <td data-label="Dịch vụ">{apt.Service?.name || 'N/A'}</td>
                          <td data-label="Bác sĩ">
                            {apt.Doctor?.user?.full_name || 'Chưa phân công'}
                          </td>
                          <td data-label="Ngày & Giờ">
                            <div className="admin-appt-page-datetime-info">
                              <span><FaCalendarAlt /> {new Date(apt.appointment_date).toLocaleDateString('vi-VN')}</span>
                              <span><FaClock /> {formatTime(apt.appointment_start_time)}</span>
                            </div>
                          </td>
                          <td data-label="Trạng thái">
                            {getStatusBadge(apt.status)}
                          </td>
                          
                          <td data-label="Kết quả" className="admin-appt-page-result-cell">
                            {medicalRecord ? (
                              <button 
                                className={`admin-appt-page-result-toggle ${isExpanded ? 'open' : ''}`}
                                onClick={() => toggleResultRow(medicalRecord.id)}
                                title="Xem chi tiết kết quả"
                              >
                                <FaCheckCircle className="icon-success" />
                                <span>Đã có</span>
                                {isExpanded ? <FaChevronDown /> : <FaChevronRight />}
                              </button>
                            ) : (
                              <span className="admin-appt-page-result-empty">
                                <FaTimesCircle className="icon-empty" />
                                <span>Chưa có</span>
                              </span>
                            )}
                          </td>
                          
                          <td data-label="Thao tác">
                            <div className="admin-appt-page-action-buttons">
                              
                              <Link 
                                to={`/lich-hen/${apt.code}`}
                                className="admin-appt-page-btn-action btn-view"
                                title="Xem chi tiết"
                              >
                                <FaEye />
                              </Link>

                              {apt.status === 'pending' && (
                                <button 
                                  className="admin-appt-page-btn-action btn-confirm"
                                  onClick={() => openActionModal(apt, 'confirm')}
                                  title="Xác nhận"
                                >
                                  <FaCheckCircle />
                                </button>
                              )}

                              {(apt.status === 'confirmed' || apt.status === 'in_progress') && (
                                <button 
                                  className="admin-appt-page-btn-action btn-complete"
                                  onClick={() => navigate(`/nhap-ket-qua/${apt.code}`)} 
                                  title="Hoàn thành & Nhập kết quả"
                                >
                                  <FaCheckCircle />
                                </button>
                              )}

                              {(apt.status === 'pending' || apt.status === 'confirmed') && (
                                <button 
                                  className="admin-appt-page-btn-action btn-cancel"
                                  onClick={() => openActionModal(apt, 'cancel')}
                                  title="Hủy lịch"
                                >
                                  <FaBan />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        
                        {/* HÀNG MỞ RỘNG (3 CỘT CON) */}
                        {isExpanded && medicalRecord && (
                          <tr className="admin-appt-page-expanded-row">
                            <td colSpan="8"> {/* Gộp 8 cột */}
                              <div className="admin-appt-page-expanded-content">
                                <strong>Chi tiết kết quả (ID: {medicalRecord.id}):</strong>
                                
                                {/* 1. Mã tra cứu (SỬA) */}
                                <div className="admin-appt-page-expanded-item">
                                  <label>Mã tra cứu (Reset):</label>
                                  <button 
                                    className="admin-appt-page-btn-reveal-code"
                                    onClick={() => handleResetCodeClick(medicalRecord.id)}
                                    title="Nhấn để reset và xem mã tra cứu mới"
                                    disabled={isResettingCode} // Disable khi đang reset
                                  >
                                    {isResettingCode ? <FaSpinner className="fa-spin" /> : <FaSyncAlt />}
                                    <span>{isResettingCode ? 'Đang reset...' : 'Reset & Xem Mã'}</span>
                                  </button>
                                </div>
                                
                                {/* 2. Thời gian tạo */}
                                <div className="admin-appt-page-expanded-item">
                                  <label>Thời gian tạo:</label>
                                  <span>{formatFullDateTime(medicalRecord.created_at)}</span>
                                </div>
                                
                                {/* 3. Cập nhật */}
                                <div className="admin-appt-page-expanded-item">
                                  <label>Cập nhật lần cuối:</label>
                                  <span>{formatFullDateTime(medicalRecord.updated_at)}</span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="8" className="admin-appt-page-no-data"> {/* Sửa: colSpan="8" */}
                      Không có lịch hẹn nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Modal */}
        {showActionModal && (
          <div className="admin-appt-page-modal-overlay" onClick={closeActionModal}>
            <div className="admin-appt-page-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="admin-appt-page-modal-header">
                <h2>
                  {actionType === 'confirm' && 'Xác nhận lịch hẹn'}
                  {actionType === 'cancel' && 'Hủy lịch hẹn'}
                </h2>
                <button className="admin-appt-page-btn-close" onClick={closeActionModal}>
                  <FaTimes />
                </button>
              </div>
              <div className="admin-appt-page-modal-body">
                {selectedAppointment && (
                  <div className="admin-appt-page-appointment-summary">
                    <p><strong>Mã:</strong> {selectedAppointment.code}</p>
                    <p><strong>Bệnh nhân:</strong> {selectedAppointment.Patient?.user?.full_name || selectedAppointment.guest_name}</p>
                    <p><strong>Dịch vụ:</strong> {selectedAppointment.Service?.name}</p>
                    <p><strong>Ngày:</strong> {new Date(selectedAppointment.appointment_date).toLocaleDateString('vi-VN')}</p>
                    <p><strong>Giờ:</strong> {formatTime(selectedAppointment.appointment_start_time)}</p>
                  </div>
                )}
                {actionType === 'confirm' && (
                  <p className="admin-appt-page-confirmation-text">
                    Xác nhận lịch hẹn này? Bệnh nhân sẽ nhận được thông báo.
                  </p>
                )}
                {actionType === 'cancel' && (
                  <div className="admin-appt-page-form-group">
                    <label htmlFor="cancelReason">Lý do hủy lịch *</label>
                    <textarea 
                      id="cancelReason"
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      placeholder="Nhập lý do hủy lịch..."
                      rows="4"
                      required
                    />
                  </div>
                )}
              </div>
              <div className="admin-appt-page-modal-footer">
                <button className="admin-appt-page-btn btn-secondary" onClick={closeActionModal} disabled={isSubmitting}>
                  Đóng
                </button>
                <button 
                  className={`admin-appt-page-btn ${actionType === 'cancel' ? 'btn-danger' : 'btn-primary'}`}
                  onClick={handleConfirmAction}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <FaSpinner className="fa-spin" /> : (actionType === 'confirm' ? 'Xác nhận' : 'Hủy lịch')}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* BỔ SUNG: Modal Xác nhận (Thay thế AdminPasswordModal) */}
        <ConfirmModal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={handleConfirmReset} // Gọi hàm reset
          title="Xác nhận Reset Mã Tra Cứu"
          message={
            'Bạn có chắc chắn muốn reset mã tra cứu cho hồ sơ này?\n' +
            'Mã cũ sẽ bị vô hiệu hóa và một mã MỚI sẽ được tạo, đồng thời gửi đến email của bệnh nhân.'
          }
          isLoading={isResettingCode}
        />
        
      </div>
    </>
  );
};

export default AppointmentManagementPage;