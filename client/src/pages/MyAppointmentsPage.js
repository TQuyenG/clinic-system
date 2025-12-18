// client/src/pages/AppointmentManagementPage.js
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import appointmentService from '../services/appointmentService';
import medicalRecordService from '../services/medicalRecordService'; 
import ConfirmModal from '../components/medical/ConfirmModal';
import { toast } from 'react-toastify';

import { 
  FaCalendarAlt, FaClock, FaUserMd, FaCheckCircle, FaTimesCircle, 
  FaHourglassHalf, FaEye, FaBan, FaSearch, FaDownload, 
  FaPhone, FaSpinner, FaTimes, FaLock, FaSyncAlt,
  FaHospital, FaMoneyBillWave, FaCreditCard, FaExchangeAlt, FaSortAmountDown
} from 'react-icons/fa';
import './AppointmentManagementPage.css'; 

const AppointmentManagementPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth(); 
  const [assignedDoctors, setAssignedDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');

  // 1. Lấy danh sách bác sĩ (nếu là staff)
  useEffect(() => {
    const fetchAssignedDoctors = async () => {
      if (user && user.role === 'staff') {
        try {
          const token = localStorage.getItem('token');
          const profileRes = await axios.get('http://localhost:3001/api/staff/my-profile', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (profileRes.data.success) {
            const staffId = profileRes.data.data.id;
            const doctorsRes = await axios.get(`http://localhost:3001/api/staff/${staffId}/doctors`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (doctorsRes.data.success) {
              setAssignedDoctors(doctorsRes.data.data || []);
            }
          }
        } catch (error) {
          console.error("Lỗi lấy danh sách bác sĩ:", error);
        }
      }
    };
    fetchAssignedDoctors();
  }, [user]);

  // Fetch lại khi đổi bác sĩ
  useEffect(() => {
    fetchAllAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDoctorId]); 
  
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State Filter bao gồm cả sortOption
  const [filters, setFilters] = useState({
    status: 'all',
    date: '',
    doctor: '',
    search: '',
    sortOption: 'newest' // Mặc định mới nhất
  });

  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState('');
  const [actionReason, setActionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isResettingCode, setIsResettingCode] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState(null);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState({
    payment_method: 'cash',
    paid_at: new Date().toISOString().slice(0, 16)
  });

  useEffect(() => {
    fetchAllAppointments();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, appointments]);

  const fetchAllAppointments = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedDoctorId) params.doctor_id = selectedDoctorId;
      
      const response = await appointmentService.getAllAppointments(params); 
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

  const applyFiltersAndSort = () => {
    let result = [...appointments];

    // LỌC
    if (filters.status !== 'all') {
      result = result.filter(apt => apt.status === filters.status);
    }
    if (filters.date) {
      result = result.filter(apt => apt.appointment_date === filters.date);
    }
    if (filters.doctor) {
      result = result.filter(apt => 
        apt.Doctor?.user?.full_name?.toLowerCase().includes(filters.doctor.toLowerCase())
      );
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(apt => 
        apt.code?.toLowerCase().includes(searchLower) ||
        (apt.Patient?.user?.full_name || apt.guest_name)?.toLowerCase().includes(searchLower) ||
        (apt.Patient?.user?.email || apt.guest_email)?.toLowerCase().includes(searchLower) ||
        (apt.Patient?.user?.phone || apt.guest_phone)?.includes(filters.search)
      );
    }

    // SẮP XẾP
    result.sort((a, b) => {
      const dateA = new Date(`${a.appointment_date}T${a.appointment_start_time}`).getTime();
      const dateB = new Date(`${b.appointment_date}T${b.appointment_start_time}`).getTime();
      
      switch (filters.sortOption) {
        case 'newest': return dateB - dateA;
        case 'oldest': return dateA - dateB;
        case 'status': return a.status.localeCompare(b.status);
        default: return dateB - dateA;
      }
    });

    setFilteredAppointments(result);
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
  };

  const resetFilters = () => {
    setFilters({ status: 'all', date: '', doctor: '', search: '', sortOption: 'newest' });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    return timeStr.slice(0, 5);
  };

  // --- Helper Icons & Badges ---
  const getStatusBadge = (status) => {
    let text, icon, className;
    switch (status) {
      case 'pending': text = 'Chờ xác nhận'; icon = <FaHourglassHalf />; className = 'badge-status-pending'; break;
      case 'confirmed': text = 'Đã xác nhận'; icon = <FaCheckCircle />; className = 'badge-status-confirmed'; break;
      case 'upcoming': text = 'Sắp tới'; icon = <FaClock />; className = 'badge-status-confirmed'; break;
      case 'in_progress': text = 'Đang khám'; icon = <FaClock />; className = 'badge-status-pending'; break;
      case 'completed': text = 'Hoàn thành'; icon = <FaCheckCircle />; className = 'badge-status-completed'; break;
      case 'cancelled': text = 'Đã hủy'; icon = <FaTimesCircle />; className = 'badge-status-cancelled'; break;
      default: text = 'Khác'; icon = <FaTimes />; className = 'badge-status-other'; break;
    }
    return <span className={`admin-appt-page-badge ${className}`}>{icon} {text}</span>;
  };

  const getPaymentStatusBadge = (paymentStatus) => {
    if (paymentStatus === 'paid_online' || paymentStatus === 'paid_at_clinic') {
      return <span className="admin-appt-page-payment-badge payment-paid"><FaCheckCircle /> Đã thanh toán</span>;
    }
    return <span className="admin-appt-page-payment-badge payment-unpaid"><FaClock /> Chưa thanh toán</span>;
  };

  // --- Modal Logics ---
  const openActionModal = (appointment, type) => {
    setSelectedAppointment(appointment);
    setActionType(type);
    setShowActionModal(true);
  };
  const closeActionModal = () => {
    setShowActionModal(false);
    setSelectedAppointment(null);
    setActionReason('');
  };
  const handleConfirmAction = async () => {
    if (!selectedAppointment) return;
    try {
      setIsSubmitting(true);
      if (actionType === 'confirm') {
        await appointmentService.confirmAppointment(selectedAppointment.code);
        toast.success('Xác nhận thành công');
      } else if (actionType === 'cancel') {
        if (!actionReason.trim()) {
            toast.warn('Nhập lý do hủy'); setIsSubmitting(false); return; 
        }
        await appointmentService.cancelAppointment(selectedAppointment.code, actionReason);
        toast.success('Đã hủy lịch hẹn');
      }
      fetchAllAppointments();
      closeActionModal();
    } catch (error) {
      toast.error('Lỗi thực hiện thao tác');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Stats Logic ---
  const getStats = () => {
    const total = appointments.length;
    const filteredTotal = filteredAppointments.length;
    const filteredPending = filteredAppointments.filter(a => a.status === 'pending').length;
    const filteredConfirmed = filteredAppointments.filter(a => a.status === 'confirmed').length;
    const filteredCompleted = filteredAppointments.filter(a => a.status === 'completed').length;
    const filteredCancelled = filteredAppointments.filter(a => a.status === 'cancelled').length;
    return { total, filteredTotal, filteredPending, filteredConfirmed, filteredCompleted, filteredCancelled };
  };
  const stats = getStats();

  const exportToCSV = () => {
    // Logic export đơn giản
    const headers = ["Mã", "Bệnh nhân", "SDT", "Dịch vụ", "Ngày", "Giờ", "Trạng thái"];
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
    link.download = `appt_export.csv`;
    link.click();
  };

  // Payment Handlers
  const openPaymentModal = (apt) => { setSelectedAppointment(apt); setShowPaymentModal(true); };
  const closePaymentModal = () => { setShowPaymentModal(false); setSelectedAppointment(null); };
  const handleConfirmPayment = async () => {
    if(!selectedAppointment) return;
    try {
        setIsSubmitting(true);
        const token = localStorage.getItem('token');
        await axios.put(`http://localhost:3001/api/appointments/${selectedAppointment.id}/payment`, paymentData, {headers: {Authorization: `Bearer ${token}`}});
        toast.success('Thanh toán thành công');
        fetchAllAppointments();
        closePaymentModal();
    } catch(e) { toast.error('Lỗi thanh toán'); } 
    finally { setIsSubmitting(false); }
  };

  // Reset Code Handlers
  const handleResetCodeClick = (id) => { setSelectedRecordId(id); setShowConfirmModal(true); };
  const handleConfirmReset = async () => {
      try {
          setIsResettingCode(true);
          await medicalRecordService.resetLookupCodeByAdmin(selectedRecordId);
          toast.success('Reset mã thành công');
          fetchAllAppointments();
      } catch(e) { toast.error('Lỗi reset mã'); }
      finally { setIsResettingCode(false); setShowConfirmModal(false); }
  };

  if (loading) return <div className="admin-appt-page-container"><div className="text-center p-5"><FaSpinner className="fa-spin"/> Đang tải...</div></div>;

  return (
    <div className="admin-appt-page-container">
      <div className="admin-appt-page-wrapper">
        
        {/* 1. Header & Stats */}
        <div className="admin-appt-page-header-group">
          <div className="admin-appt-page-title-row">
            <h2 className="admin-appt-page-title"><FaCalendarAlt /> Quản lý Lịch hẹn</h2>
            <button className="admin-appt-page-btn admin-appt-page-btn-primary" onClick={exportToCSV}>
              <FaDownload /> Xuất CSV
            </button>
          </div>
          
          <div className="admin-appt-page-stats-bar">
             <div className="admin-appt-page-stat-item total">
                <span className="admin-appt-page-stat-label">Tổng số</span>
                <span className="admin-appt-page-stat-value">{stats.filteredTotal}</span>
             </div>
             <div className="admin-appt-page-stat-item pending">
                <span className="admin-appt-page-stat-label">Chờ xác nhận</span>
                <span className="admin-appt-page-stat-value">{stats.filteredPending}</span>
             </div>
             <div className="admin-appt-page-stat-item confirmed">
                <span className="admin-appt-page-stat-label">Đã xác nhận</span>
                <span className="admin-appt-page-stat-value">{stats.filteredConfirmed}</span>
             </div>
             <div className="admin-appt-page-stat-item completed">
                <span className="admin-appt-page-stat-label">Hoàn thành</span>
                <span className="admin-appt-page-stat-value">{stats.filteredCompleted}</span>
             </div>
             <div className="admin-appt-page-stat-item cancelled">
                <span className="admin-appt-page-stat-label">Đã hủy</span>
                <span className="admin-appt-page-stat-value">{stats.filteredCancelled}</span>
             </div>
          </div>
        </div>

        {/* 2. Filter Bar (Always Visible) */}
        <div className="admin-appt-page-filter-bar">
          <div className="admin-appt-page-filter-item">
            <FaSearch className="admin-appt-page-filter-icon"/>
            <input 
              type="text" className="admin-appt-page-filter-input"
              placeholder="Tìm tên, mã, sđt..."
              value={filters.search} onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>

          <div className="admin-appt-page-filter-item">
             <FaCalendarAlt className="admin-appt-page-filter-icon"/>
             <input 
                type="date" className="admin-appt-page-filter-input"
                value={filters.date} onChange={(e) => handleFilterChange('date', e.target.value)}
             />
          </div>

          <div className="admin-appt-page-filter-item">
            <FaUserMd className="admin-appt-page-filter-icon"/>
            {user && user.role === 'staff' ? (
                <select className="admin-appt-page-filter-select" value={selectedDoctorId} onChange={(e) => setSelectedDoctorId(e.target.value)}>
                    <option value="">-- Tất cả Bác sĩ --</option>
                    {assignedDoctors.map(d => <option key={d.id} value={d.id}>{d.user.full_name}</option>)}
                </select>
            ) : (
                <input type="text" className="admin-appt-page-filter-input" placeholder="Tên bác sĩ..." value={filters.doctor} onChange={(e) => handleFilterChange('doctor', e.target.value)} />
            )}
          </div>

          <div className="admin-appt-page-filter-item">
             <FaSortAmountDown className="admin-appt-page-filter-icon"/>
             <select className="admin-appt-page-filter-select" value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)}>
                <option value="all">Tất cả trạng thái</option>
                <option value="pending">Chờ xác nhận</option>
                <option value="confirmed">Đã xác nhận</option>
                <option value="completed">Hoàn thành</option>
                <option value="cancelled">Đã hủy</option>
             </select>
          </div>

          <div className="admin-appt-page-filter-item">
             <FaSortAmountDown className="admin-appt-page-filter-icon"/>
             <select className="admin-appt-page-filter-select" value={filters.sortOption} onChange={(e) => handleFilterChange('sortOption', e.target.value)}>
                <option value="newest">Mới nhất trước</option>
                <option value="oldest">Cũ nhất trước</option>
             </select>
          </div>

          <button className="admin-appt-page-btn admin-appt-page-btn-secondary" onClick={resetFilters}>
             <FaSyncAlt />
          </button>
        </div>

        {/* 3. Table Responsive */}
        <div className="admin-appt-page-table-container">
           <table className="admin-appt-page-table">
              <thead>
                <tr>
                  <th style={{width: '90px'}}>Mã</th>
                  <th>Bệnh nhân</th>
                  <th>Dịch vụ</th>
                  <th>Bác sĩ</th>
                  <th>Thời gian</th>
                  <th>Trạng thái</th>
                  <th>Thanh toán</th>
                  <th style={{width: '120px'}}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.length > 0 ? (
                  filteredAppointments.map(apt => {
                    const isPaid = apt.payment_status === 'paid_online' || apt.payment_status === 'paid_at_clinic';
                    return (
                      <tr key={apt.id}>
                        <td className="admin-appt-page-cell-code">{apt.code}</td>
                        
                        <td className="admin-appt-page-cell-patient">
                          <span className="fw-bold">{apt.Patient?.user?.full_name || apt.guest_name}</span>
                          <span className="admin-appt-page-cell-sub">
                             <FaPhone size={10}/> {apt.Patient?.user?.phone || apt.guest_phone || '-'}
                          </span>
                        </td>
                        
                        <td>{apt.Service?.name || '-'}</td>
                        <td>{apt.Doctor?.user?.full_name || '-'}</td>
                        
                        <td>
                          <div className="admin-appt-page-cell-patient">
                            <span className="admin-appt-page-cell-date">{new Date(apt.appointment_date).toLocaleDateString('vi-VN')}</span>
                            <span className="admin-appt-page-cell-time">{formatTime(apt.appointment_start_time)}</span>
                          </div>
                        </td>
                        
                        <td>{getStatusBadge(apt.status)}</td>
                        
                        <td>
                           <div className="admin-appt-page-cell-patient">
                              {getPaymentStatusBadge(apt.payment_status)}
                              {apt.payment_method && (
                                <span className="admin-appt-page-cell-sub">
                                   {apt.payment_method === 'cash' ? <FaMoneyBillWave/> : <FaCreditCard/>} 
                                   {apt.payment_method === 'cash' ? 'Tiền mặt' : 'Thẻ/CK'}
                                </span>
                              )}
                           </div>
                        </td>

                        <td>
                          <div className="admin-appt-page-actions">
                             <Link to={`/lich-hen/${apt.code}`} className="admin-appt-page-btn-icon btn-view" title="Chi tiết"><FaEye /></Link>
                             
                             {apt.status === 'pending' && (
                               <button className="admin-appt-page-btn-icon btn-confirm" onClick={() => openActionModal(apt, 'confirm')} title="Xác nhận"><FaCheckCircle /></button>
                             )}
                             
                             {apt.payment_status === 'unpaid' && (apt.status === 'pending' || apt.status === 'confirmed') && (
                               <button className="admin-appt-page-btn-icon btn-pay" onClick={() => openPaymentModal(apt)} title="Thanh toán"><FaMoneyBillWave /></button>
                             )}
                             
                             {(apt.status === 'confirmed' || (apt.status === 'pending' && isPaid)) && (
                               <button className="admin-appt-page-btn-icon btn-complete" onClick={() => navigate(`/nhap-ket-qua/${apt.code}`)} title="Khám"><FaUserMd /></button>
                             )}
                             
                             {['completed', 'cancelled'].indexOf(apt.status) === -1 && (
                               <button className="admin-appt-page-btn-icon btn-cancel" onClick={() => openActionModal(apt, 'cancel')} title="Hủy"><FaBan /></button>
                             )}
                             
                             {apt.MedicalRecord && (
                               <button className="admin-appt-page-btn-icon btn-reset" onClick={() => handleResetCodeClick(apt.MedicalRecord.id)} title="Reset Code"><FaLock /></button>
                             )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan="8" style={{textAlign: 'center', padding: '20px', color: '#999'}}>Không tìm thấy lịch hẹn.</td></tr>
                )}
              </tbody>
           </table>
        </div>
      </div>

      {/* MODAL ACTION */}
      {showActionModal && selectedAppointment && (
        <div className="admin-appt-page-modal-overlay">
          <div className="admin-appt-page-modal-content">
             <div className="admin-appt-page-modal-header">
                <span className="admin-appt-page-modal-title">{actionType === 'confirm' ? 'Xác nhận Lịch Hẹn' : 'Hủy Lịch Hẹn'}</span>
                <button className="admin-appt-page-modal-close" onClick={closeActionModal}><FaTimes/></button>
             </div>
             <div className="admin-appt-page-modal-body">
                <p><strong>{selectedAppointment.code}</strong> - {selectedAppointment.Patient?.user?.full_name || selectedAppointment.guest_name}</p>
                {actionType === 'cancel' && (
                   <div className="admin-appt-page-info-row">
                      <label>Lý do hủy:</label>
                      <textarea className="admin-appt-page-textarea" rows="3" value={actionReason} onChange={(e) => setActionReason(e.target.value)} placeholder="Nhập lý do..."></textarea>
                   </div>
                )}
                {actionType === 'confirm' && <p className="text-success">Bạn có chắc muốn xác nhận?</p>}
             </div>
             <div className="admin-appt-page-modal-footer">
                <button className="admin-appt-page-btn admin-appt-page-btn-secondary" onClick={closeActionModal}>Đóng</button>
                <button className={`admin-appt-page-btn ${actionType === 'confirm' ? 'admin-appt-page-btn-primary' : 'btn-cancel'}`} onClick={handleConfirmAction} disabled={isSubmitting}>
                  {isSubmitting ? <FaSpinner className="fa-spin"/> : 'Xác nhận'}
                </button>
             </div>
          </div>
        </div>
      )}

      {/* MODAL PAYMENT */}
      {showPaymentModal && selectedAppointment && (
        <div className="admin-appt-page-modal-overlay">
          <div className="admin-appt-page-modal-content">
             <div className="admin-appt-page-modal-header">
                <span className="admin-appt-page-modal-title">Thanh toán tại quầy</span>
                <button className="admin-appt-page-modal-close" onClick={closePaymentModal}><FaTimes/></button>
             </div>
             <div className="admin-appt-page-modal-body">
                <div className="admin-appt-page-info-row">
                   <span><strong>Dịch vụ:</strong> {selectedAppointment.Service?.name}</span>
                   <span style={{color: '#2e7d32', fontWeight: 'bold'}}>Giá: {selectedAppointment.Service?.price?.toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="admin-appt-page-info-row">
                   <label>Phương thức:</label>
                   <select className="admin-appt-page-filter-select" value={paymentData.payment_method} onChange={(e) => setPaymentData({...paymentData, payment_method: e.target.value})}>
                      <option value="cash">Tiền mặt</option>
                      <option value="card">Thẻ / Chuyển khoản</option>
                   </select>
                </div>
             </div>
             <div className="admin-appt-page-modal-footer">
                <button className="admin-appt-page-btn admin-appt-page-btn-secondary" onClick={closePaymentModal}>Đóng</button>
                <button className="admin-appt-page-btn admin-appt-page-btn-primary" onClick={handleConfirmPayment} disabled={isSubmitting}>
                  {isSubmitting ? <FaSpinner className="fa-spin"/> : 'Thanh toán'}
                </button>
             </div>
          </div>
        </div>
      )}
      
      {/* Modal Reset (giữ nguyên component) */}
      <ConfirmModal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} onConfirm={handleConfirmReset} title="Reset Mã Tra Cứu" message="Tạo mã mới và gửi email cho bệnh nhân?" isLoading={isResettingCode} />
    </div>
  );
};

export default AppointmentManagementPage;