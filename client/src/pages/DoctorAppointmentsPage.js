// client/src/pages/DoctorAppointmentsPage.js
// PHIÊN BẢN ĐỒNG BỘ GIAO DIỆN VỚI ADMIN

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import appointmentService from '../services/appointmentService';
import medicalRecordService from '../services/medicalRecordService'; 
import ConfirmModal from '../components/medical/ConfirmModal';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';

// Import Icons giống trang Admin
import { 
  FaCalendarAlt, FaClock, FaUserMd, FaCheckCircle, FaTimesCircle, 
  FaHourglassHalf, FaEye, FaBan, FaFilter, FaSearch, FaDownload, 
  FaPhone, FaEnvelope, FaSpinner, FaTimes,
  FaChevronRight, FaLock, FaSyncAlt, FaCheck,
  FaHospital, FaPlay
} from 'react-icons/fa';

// Import CSS đã đồng bộ
import './DoctorAppointmentsPage.css'; 

const DoctorAppointmentsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State bộ lọc
  const [filters, setFilters] = useState({
    status: 'all',
    date: '',
    search: '',
    sortBy: 'newest',
    service: '', 
    appointmentType: 'all', 
  });

  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState('');
  const [actionReason, setActionReason] = useState('');
  const [serviceIndicationText, setServiceIndicationText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State mở rộng hồ sơ và reset code
  const [expandedRow, setExpandedRow] = useState(null); 
  const [isResettingCode, setIsResettingCode] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState(null);

  useEffect(() => {
    fetchDoctorAppointments();
  }, []);

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, appointments]);

  // --- 1. LẤY DỮ LIỆU CỦA BÁC SĨ ---
  const fetchDoctorAppointments = async () => {
    try {
      setLoading(true);
      // Gọi API lấy lịch của chính bác sĩ đang đăng nhập
      const response = await appointmentService.getDoctorAppointments(); 
      
      if (response.data.success) {
        // Sắp xếp mặc định: Mới nhất trước
        const sortedAppointments = (response.data.data || []).sort((a, b) => {
          const dateA = new Date(`${a.appointment_date}T${a.appointment_start_time}`);
          const dateB = new Date(`${b.appointment_date}T${b.appointment_start_time}`);
          return dateB - dateA;
        });
        setAppointments(sortedAppointments);
      }
    } catch (error) {
      console.error('Error fetching doctor appointments:', error);
      toast.error('Lỗi khi tải danh sách lịch hẹn');
    } finally {
      setLoading(false);
    }
  };

  // --- 2. BỘ LỌC (GIỐNG ADMIN) ---
  const applyFilters = () => {
    let filtered = [...appointments];
    
    if (filters.status !== 'all') {
      filtered = filtered.filter(apt => apt.status === filters.status);
    }
    if (filters.date) {
      filtered = filtered.filter(apt => apt.appointment_date === filters.date);
    }
    if (filters.service) {
      filtered = filtered.filter(apt => 
        apt.Service?.name?.toLowerCase().includes(filters.service.toLowerCase())
      );
    }
    if (filters.appointmentType !== 'all') {
      filtered = filtered.filter(apt => apt.appointment_type === filters.appointmentType);
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(apt => 
        apt.code?.toLowerCase().includes(searchLower) ||
        (apt.Patient?.user?.full_name || apt.guest_name)?.toLowerCase().includes(searchLower) ||
        (apt.Patient?.user?.phone || apt.guest_phone)?.includes(filters.search)
      );
    }

    // Sắp xếp
    if (filters.sortBy === 'newest') {
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (filters.sortBy === 'oldest') {
      filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }

    setFilteredAppointments(filtered);
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
  };

  const resetFilters = () => {
    setFilters({ 
      status: 'all', 
      date: '', 
      search: '', 
      sortBy: 'newest',
      service: '',
      appointmentType: 'all'
    });
  };

  // --- Helper Functions ---
  const formatTime = (timeStr) => timeStr ? timeStr.slice(0, 5) : 'N/A';

  const getStatusBadge = (status) => {
    let text, icon, className;
    switch (status) {
      case 'pending': text = 'Chờ xác nhận'; icon = <FaHourglassHalf />; className = 'status-pending'; break;
      case 'confirmed': text = 'Đã xác nhận'; icon = <FaCheckCircle />; className = 'status-confirmed'; break;
      case 'upcoming': text = 'Sắp tới'; icon = <FaClock />; className = 'status-upcoming'; break;
      case 'in_progress': text = 'Đang khám'; icon = <FaClock />; className = 'status-in-progress'; break;
      case 'completed': text = 'Hoàn thành'; icon = <FaCheckCircle />; className = 'status-completed'; break;
      case 'passed': text = 'Đã qua'; icon = <FaTimesCircle />; className = 'status-passed'; break;
      case 'cancelled': text = 'Đã hủy'; icon = <FaTimesCircle />; className = 'status-cancelled'; break;
      default: text = 'Khác'; icon = <FaTimes />; className = 'status-cancelled'; break;
    }
    return <span className={`admin-appt-page-status-badge ${className}`}>{icon} {text}</span>;
  };

  // --- Modal & Actions ---
  const openActionModal = (appointment, type) => {
    setSelectedAppointment(appointment);
    setActionType(type);
    setActionReason('');
    setServiceIndicationText('');
    setShowActionModal(true);
  };

  const closeActionModal = () => {
    setShowActionModal(false);
    setSelectedAppointment(null);
    setActionType('');
    setActionReason('');
    setServiceIndicationText('');
  };

  const handleConfirmAction = async () => {
    if (!selectedAppointment) return;
    try {
      setIsSubmitting(true);
      if (actionType === 'confirm') {
        await appointmentService.confirmAppointment(selectedAppointment.code);
        toast.success('Đã xác nhận lịch hẹn');
      } else if (actionType === 'checkin') {
        await appointmentService.checkInAppointment(selectedAppointment.id, { override_queue: true });
        toast.success('Đã check-in bệnh nhân và cấp số ưu tiên');
      } else if (actionType === 'prioritize') {
        await appointmentService.prioritizeNow(selectedAppointment.id);
        toast.success('Đã ưu tiên bệnh nhân vào hàng khám');
      } else if (actionType === 'indications') {
        const indicationLines = serviceIndicationText
          .split(/\n|,/)
          .map(item => item.trim())
          .filter(Boolean);
        if (!indicationLines.length) {
          toast.warn('Vui lòng nhập ít nhất một chỉ định dịch vụ');
          setIsSubmitting(false);
          return;
        }
        const indications = indicationLines.map((serviceName, index) => ({
          service_name: serviceName,
          order_sequence: index + 1,
          dependencies: []
        }));
        await appointmentService.addServiceIndications(selectedAppointment.id, indications);
        toast.success('Đã lưu chỉ định dịch vụ');
      } else if (actionType === 'noshow') {
        if (!actionReason.trim()) {
          toast.warn('Vui lòng nhập lý do vắng mặt');
          setIsSubmitting(false);
          return;
        }
        await appointmentService.markNoShow(selectedAppointment.id, actionReason);
        toast.success('Đã đánh dấu vắng mặt');
      } else if (actionType === 'cancel') {
        if (!actionReason.trim()) {
           toast.warn('Vui lòng nhập lý do hủy');
           setIsSubmitting(false);
           return;
        }
        await appointmentService.cancelAppointment(selectedAppointment.code, actionReason);
        toast.success('Đã hủy lịch hẹn');
      }
      fetchDoctorAppointments();
      closeActionModal();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Thống kê ---
  const getStats = () => {
    const total = appointments.length;
    const filteredTotal = filteredAppointments.length;
    const filteredPending = filteredAppointments.filter(a => a.status === 'pending').length;
    const filteredConfirmed = filteredAppointments.filter(a => a.status === 'confirmed').length;
    const filteredUpcoming = filteredAppointments.filter(a => a.status === 'upcoming').length;
    const filteredCompleted = filteredAppointments.filter(a => a.status === 'completed').length;
    
    return { total, filteredTotal, filteredPending, filteredConfirmed, filteredUpcoming, filteredCompleted };
  };
  const stats = getStats();

  const exportToCSV = () => {
    const headers = ["Mã", "Bệnh nhân", "SĐT", "Dịch vụ", "Ngày", "Giờ", "Trạng thái"];
    const rows = filteredAppointments.map(apt => [
      apt.code,
      apt.Patient?.user?.full_name || apt.guest_name,
      apt.Patient?.user?.phone || apt.guest_phone,
      apt.Service?.name,
      apt.appointment_date,
      formatTime(apt.appointment_start_time),
      apt.status 
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `BS_LichHen_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) {
    return <div className="admin-appt-page-loading"><FaSpinner className="fa-spin" /> Đang tải lịch hẹn...</div>;
  }

  return (
    <div className="admin-appt-page-container">
      <div className="admin-appt-page-wrapper">
        
        {/* Header */}
        <div className="appointment-management-header">
          <div className="appointment-management-header-content">
            <h1>Lịch Hẹn Của Tôi</h1>
            <p>Quản lý danh sách khám bệnh cá nhân</p>
          </div>
          <div className="appointment-management-header-actions">
            <button className="appointment-management-btn appointment-management-btn-export" onClick={exportToCSV}>
              <FaDownload /> Xuất CSV
            </button>
          </div>
        </div>
        
        {/* Stats Grid */}
        <div className="appointment-management-stats-grid">
          <div className="appointment-management-stat-card">
            <div className="appointment-management-stat-icon appointment-management-icon-total"><FaCalendarAlt /></div>
            <div className="appointment-management-stat-info">
              <span className="appointment-management-stat-label">Tổng số</span>
              <span className="appointment-management-stat-value">{stats.filteredTotal}</span>
            </div>
          </div>
          <div className="appointment-management-stat-card">
            <div className="appointment-management-stat-icon appointment-management-icon-pending"><FaHourglassHalf /></div>
            <div className="appointment-management-stat-info">
              <span className="appointment-management-stat-label">Chờ Xác Nhận</span>
              <span className="appointment-management-stat-value">{stats.filteredPending}</span>
            </div>
          </div>
          <div className="appointment-management-stat-card">
            <div className="appointment-management-stat-icon appointment-management-icon-confirmed"><FaCheckCircle /></div>
            <div className="appointment-management-stat-info">
              <span className="appointment-management-stat-label">Đã Xác Nhận</span>
              <span className="appointment-management-stat-value">{stats.filteredConfirmed}</span>
            </div>
          </div>
          <div className="appointment-management-stat-card">
            <div className="appointment-management-stat-icon appointment-management-icon-upcoming"><FaClock /></div>
            <div className="appointment-management-stat-info">
              <span className="appointment-management-stat-label">Sắp Tới</span>
              <span className="appointment-management-stat-value">{stats.filteredUpcoming}</span>
            </div>
          </div>
          <div className="appointment-management-stat-card">
            <div className="appointment-management-stat-icon appointment-management-icon-completed"><FaCheck /></div>
            <div className="appointment-management-stat-info">
              <span className="appointment-management-stat-label">Hoàn Thành</span>
              <span className="appointment-management-stat-value">{stats.filteredCompleted}</span>
            </div>
          </div>
        </div>

        {/* Filter Panel */}
        <div className="appointment-management-filter-panel"> 
            <div className="appointment-management-filter-grid">
              <div className="appointment-management-filter-group">
                <label><FaFilter /> Trạng thái</label>
                <select value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)}>
                  <option value="all">Tất cả trạng thái</option>
                  <option value="pending">Chờ xác nhận</option>
                  <option value="confirmed">Đã xác nhận</option>
                  <option value="upcoming">Sắp tới</option>
                  <option value="in_progress">Đang khám</option>
                  <option value="completed">Đã hoàn thành</option>
                  <option value="cancelled">Đã hủy</option>
                </select>
              </div>
              <div className="appointment-management-filter-group">
                <label><FaCalendarAlt /> Ngày khám</label>
                <input type="date" value={filters.date} onChange={(e) => handleFilterChange('date', e.target.value)} />
              </div>
              <div className="appointment-management-filter-group">
                <label><FaUserMd /> Dịch vụ</label>
                <input type="text" placeholder="Tên dịch vụ..." value={filters.service} onChange={(e) => handleFilterChange('service', e.target.value)} />
              </div>
              <div className="appointment-management-filter-group">
                <label><FaSearch /> Tìm kiếm</label>
                <input type="text" placeholder="Mã/Tên/SĐT..." value={filters.search} onChange={(e) => handleFilterChange('search', e.target.value)} />
              </div>
            </div>
            <div className="appointment-management-filter-actions">
              <button className="appointment-management-btn appointment-management-btn-reset" onClick={resetFilters}>
                <FaSyncAlt /> Đặt lại
              </button>
            </div>
        </div>

        {/* Table */}
        <div className="admin-appt-page-table-container">
          <table className="admin-appt-page-table">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Bệnh nhân</th>
                <th>Dịch vụ</th>
                <th>Ngày & Giờ</th>
                <th>Trạng thái</th>
                <th>HSKB</th>
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
                      <tr className={isExpanded ? 'row-expanded' : ''}>
                        <td className="fw-bold">{apt.code}</td>
                        <td>
                          <div className="admin-appt-page-patient-info">
                            <span className="fw-bold">{apt.Patient?.user?.full_name || apt.guest_name}</span>
                            <small className="text-muted"><FaPhone size={10}/> {apt.Patient?.user?.phone || apt.guest_phone}</small>
                          </div>
                        </td>
                        <td>{apt.Service?.name}</td>
                        <td>
                          <div className="admin-appt-page-datetime-info">
                             <span>{new Date(apt.appointment_date).toLocaleDateString('vi-VN')}</span>
                             <span className="text-primary ms-2 fw-bold">{formatTime(apt.appointment_start_time)}</span>
                          </div>
                        </td>
                        <td>{getStatusBadge(apt.status)}</td>
                        <td>
                           {medicalRecord ? (
                             <span className="text-success fw-bold" style={{fontSize: '11px'}}><FaCheckCircle/> Có HSKB</span>
                           ) : <span className="text-muted" style={{fontSize: '11px'}}>--</span>}
                        </td>
                        <td>
                          <div className="admin-appt-page-action-buttons">
                            <Link to={`/lich-hen/${apt.code}`} className="admin-appt-page-btn-action btn-view" title="Xem chi tiết">
                              <FaEye />
                            </Link>
                            
                            {/* Nút Xác nhận (Cho phép bác sĩ xác nhận) */}
                            {apt.status === 'pending' && (
                              <button className="admin-appt-page-btn-action appointment-management-action-confirm" onClick={() => openActionModal(apt, 'confirm')} title="Xác nhận">
                                <FaCheckCircle />
                              </button>
                            )}

                            {/* Nút Check-in */}
                            {(apt.status === 'confirmed' || apt.status === 'upcoming') && (
                              <button className="admin-appt-page-btn-action appointment-management-action-confirm" onClick={() => openActionModal(apt, 'checkin')} title="Check-in">
                                <FaHospital />
                              </button>
                            )}

                            {/* Nút Chỉ định dịch vụ phụ */}
                            {(apt.status === 'confirmed' || apt.status === 'upcoming' || apt.status === 'in_progress') && (
                              <button className="admin-appt-page-btn-action appointment-management-action-complete" onClick={() => openActionModal(apt, 'indications')} title="Chỉ định dịch vụ">
                                <FaPlay />
                              </button>
                            )}

                            {/* Nút Ưu tiên khẩn */}
                            {(apt.status === 'confirmed' || apt.status === 'upcoming') && (
                              <button className="admin-appt-page-btn-action appointment-management-action-confirm" onClick={() => openActionModal(apt, 'prioritize')} title="Ưu tiên ngay">
                                <FaSyncAlt />
                              </button>
                            )}
                            
                            {/* Nút Khám (Nhập kết quả) */}
                            {(apt.status === 'confirmed' || apt.status === 'upcoming' || apt.status === 'in_progress') && (
                               <button className="admin-appt-page-btn-action appointment-management-action-complete" onClick={() => navigate(`/nhap-ket-qua/${apt.code}`)} title="Khám bệnh">
                                 <FaUserMd />
                               </button>
                            )}

                            {/* Nút Hủy */}
                            {(apt.status !== 'completed' && apt.status !== 'cancelled') && (
                              <button className="admin-appt-page-btn-action appointment-management-action-cancel" onClick={() => openActionModal(apt, 'cancel')} title="Hủy">
                                <FaBan />
                              </button>
                            )}

                            {/* Nút Vắng mặt */}
                            {(apt.status === 'confirmed' || apt.status === 'upcoming') && (
                              <button className="admin-appt-page-btn-action appointment-management-action-cancel" onClick={() => openActionModal(apt, 'noshow')} title="Vắng mặt">
                                <FaTimesCircle />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {/* Expanded Row for Medical Record */}
                      {isExpanded && medicalRecord && (
                        <tr className="admin-appt-page-expanded-row">
                          <td colSpan="7">
                            <div className="admin-appt-page-result-content">
                               <p><strong>Mã HS:</strong> {medicalRecord.record_code}</p>
                               <Link to={`/ho-so-kham-benh/${medicalRecord.record_code}`}>Xem hồ sơ chi tiết <FaChevronRight/></Link>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr><td colSpan="7" className="text-center py-4 text-muted">Không có lịch hẹn nào.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Modal Action */}
      {showActionModal && selectedAppointment && (
        <div className="admin-appt-page-modal-overlay">
          <div className="admin-appt-page-modal-content">
            <div className="admin-appt-page-modal-header">
              <h5>
                {actionType === 'confirm' ? 'Xác nhận lịch hẹn'
                  : actionType === 'checkin' ? 'Check-in bệnh nhân'
                  : actionType === 'indications' ? 'Chỉ định dịch vụ'
                  : actionType === 'prioritize' ? 'Ưu tiên khám ngay'
                  : actionType === 'noshow' ? 'Đánh dấu vắng mặt'
                  : 'Hủy lịch hẹn'}
              </h5>
              <button className="close-btn" onClick={closeActionModal}><FaTimes /></button>
            </div>
            <div className="admin-appt-page-modal-body">
              <p>Bạn đang thao tác với lịch hẹn: <strong>{selectedAppointment.code}</strong></p>
              {(actionType === 'cancel' || actionType === 'noshow') && (
                <div className="admin-appt-page-form-group">
                  <label>{actionType === 'cancel' ? 'Lý do hủy:' : 'Lý do vắng mặt:'}</label>
                  <textarea rows="3" value={actionReason} onChange={(e) => setActionReason(e.target.value)} placeholder="Nhập lý do..." />
                </div>
              )}
              {actionType === 'indications' && (
                <div className="admin-appt-page-form-group">
                  <label>Chỉ định dịch vụ phụ:</label>
                  <textarea
                    rows="4"
                    value={serviceIndicationText}
                    onChange={(e) => setServiceIndicationText(e.target.value)}
                    placeholder="Nhập mỗi dịch vụ trên một dòng hoặc ngăn cách bằng dấu phẩy. Ví dụ: Siêu âm bụng\nXét nghiệm máu"
                  />
                </div>
              )}
              {(actionType === 'checkin' || actionType === 'prioritize') && (
                <div className="admin-appt-page-form-group">
                  <label>Ghi chú nội bộ (không bắt buộc):</label>
                  <textarea rows="3" value={actionReason} onChange={(e) => setActionReason(e.target.value)} placeholder="Nhập ghi chú nếu cần..." />
                </div>
              )}
            </div>
            <div className="admin-appt-page-modal-footer">
              <button className="admin-appt-page-btn btn-secondary" onClick={closeActionModal}>Đóng</button>
              <button className={`admin-appt-page-btn ${actionType==='confirm' || actionType==='checkin' || actionType==='prioritize' || actionType==='indications' ? 'btn-primary' : 'btn-danger'}`} onClick={handleConfirmAction} disabled={isSubmitting}>
                {isSubmitting ? <FaSpinner className="fa-spin"/> : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorAppointmentsPage;