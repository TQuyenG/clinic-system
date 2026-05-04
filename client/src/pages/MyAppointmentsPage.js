// client/src/pages/MyAppointmentsPage.js
// PHIÊN BẢN PATIENT - GIAO DIỆN ĐỒNG BỘ 100% VỚI ADMIN

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import appointmentService from '../services/appointmentService';
import paymentService from '../services/paymentService';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';

import { 
  FaCalendarAlt, FaClock, FaUserMd, FaCheckCircle, FaTimesCircle, FaCheck,
  FaHourglassHalf, FaEye, FaBan, FaFilter, FaSearch, FaSpinner, FaTimes, 
  FaCalendarPlus, FaSyncAlt
} from 'react-icons/fa';

import './MyAppointmentsPage.css'; 

const MyAppointmentsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [filters, setFilters] = useState({
    status: 'all',
    date: '',
    search: '',
    sortBy: 'newest',
  });

  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionReason, setActionReason] = useState('');
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [refundBankInfo, setRefundBankInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchMyAppointments();
  }, []);

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, appointments]);

  const fetchMyAppointments = async () => {
    try {
      setLoading(true);
      const response = await appointmentService.getMyAppointments(); 
      if (response.data.success) {
        const sorted = (response.data.data || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setAppointments(sorted);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...appointments];
    if (filters.status !== 'all') filtered = filtered.filter(apt => apt.status === filters.status);
    if (filters.date) filtered = filtered.filter(apt => apt.appointment_date === filters.date);
    if (filters.search) {
      const s = filters.search.toLowerCase();
      filtered = filtered.filter(apt => 
        apt.code?.toLowerCase().includes(s) || 
        apt.Doctor?.user?.full_name?.toLowerCase().includes(s)
      );
    }
    if (filters.sortBy === 'newest') {
      filtered.sort((a, b) => new Date(`${b.appointment_date}T${b.appointment_start_time}`) - new Date(`${a.appointment_date}T${a.appointment_start_time}`));
    }
    setFilteredAppointments(filtered);
  };

  const handleFilterChange = (key, value) => setFilters({ ...filters, [key]: value });
  const resetFilters = () => setFilters({ status: 'all', date: '', search: '', sortBy: 'newest' });

  // Helpers
  const formatTime = (t) => t ? t.slice(0, 5) : '';
  const getStatusBadge = (status) => {
    let text, icon, cls;
    switch (status) {
      case 'pending': text = 'Chờ xác nhận'; icon = <FaHourglassHalf />; cls = 'status-pending'; break;
      case 'confirmed': text = 'Đã xác nhận'; icon = <FaCheckCircle />; cls = 'status-confirmed'; break;
      case 'upcoming': text = 'Sắp tới'; icon = <FaClock />; cls = 'status-upcoming'; break;
      case 'completed': text = 'Hoàn thành'; icon = <FaCheckCircle />; cls = 'status-completed'; break;
      case 'cancelled': text = 'Đã hủy'; icon = <FaTimesCircle />; cls = 'status-cancelled'; break;
      default: text = 'Khác'; icon = <FaTimes />; cls = 'status-cancelled'; break;
    }
    return <span className={`admin-appt-page-status-badge ${cls}`}>{icon} {text}</span>;
  };

  // Actions
  const openCancelModal = (apt) => { setSelectedAppointment(apt); setShowActionModal(true); };
  const closeActionModal = () => { setShowActionModal(false); setSelectedAppointment(null); setActionReason(''); };
  const openRefundModal = (apt) => { setSelectedAppointment(apt); setShowRefundModal(true); };
  const closeRefundModal = () => { setShowRefundModal(false); setSelectedAppointment(null); setRefundReason(''); setRefundBankInfo(''); };
  const handleConfirmCancel = async () => {
    if (!actionReason.trim()) return toast.warn('Nhập lý do hủy');
    try {
      setIsSubmitting(true);
      await appointmentService.cancelAppointment(selectedAppointment.code, actionReason);
      toast.success('Hủy thành công');
      fetchMyAppointments();
      closeActionModal();
    } catch (e) { toast.error('Lỗi khi hủy'); } finally { setIsSubmitting(false); }
  };
  const handleRefundSubmit = async () => {
    if (!refundReason.trim()) return toast.warn('Nhập lý do hoàn tiền');
    if (!refundBankInfo.trim()) return toast.warn('Nhập thông tin tài khoản nhận tiền');
    try {
      setIsSubmitting(true);
      await paymentService.requestRefund({
        appointment_id: selectedAppointment.id,
        reason: refundReason,
        bank_info: refundBankInfo
      });
      toast.success('Đã gửi yêu cầu hoàn tiền');
      closeRefundModal();
      fetchMyAppointments();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Lỗi khi gửi yêu cầu hoàn tiền');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stats
  const stats = {
    total: appointments.length,
    pending: filteredAppointments.filter(a => a.status === 'pending').length,
    confirmed: filteredAppointments.filter(a => a.status === 'confirmed' || a.status === 'upcoming').length,
    completed: filteredAppointments.filter(a => a.status === 'completed').length,
    cancelled: filteredAppointments.filter(a => a.status === 'cancelled').length
  };

  if (loading) return <div className="admin-appt-page-loading"><FaSpinner className="fa-spin" /> Đang tải...</div>;

  return (
    <div className="admin-appt-page-container">
      <div className="admin-appt-page-wrapper">
        
        {/* Header - Dùng class của Admin */}
        <div className="appointment-management-header">
          <div className="appointment-management-header-content">
            <h1>Lịch Hẹn Của Tôi</h1>
            <p>Theo dõi và quản lý lịch khám bệnh</p>
          </div>
          <button className="appointment-management-btn appointment-management-btn-add" onClick={() => navigate('/dat-lich-hen')}>
            <FaCalendarPlus /> Đặt lịch mới
          </button>
        </div>
        
        {/* Stats Grid - Dùng class của Admin */}
        <div className="appointment-management-stats-grid">
          <div className="appointment-management-stat-card">
            <div className="appointment-management-stat-icon appointment-management-icon-total"><FaCalendarAlt /></div>
            <div className="appointment-management-stat-info">
              <span className="appointment-management-stat-label">Tổng số</span>
              <span className="appointment-management-stat-value">{stats.total}</span>
            </div>
          </div>
          <div className="appointment-management-stat-card">
            <div className="appointment-management-stat-icon appointment-management-icon-pending"><FaHourglassHalf /></div>
            <div className="appointment-management-stat-info">
              <span className="appointment-management-stat-label">Chờ duyệt</span>
              <span className="appointment-management-stat-value">{stats.pending}</span>
            </div>
          </div>
          <div className="appointment-management-stat-card">
            <div className="appointment-management-stat-icon appointment-management-icon-confirmed"><FaCheckCircle /></div>
            <div className="appointment-management-stat-info">
              <span className="appointment-management-stat-label">Đã duyệt</span>
              <span className="appointment-management-stat-value">{stats.confirmed}</span>
            </div>
          </div>
          <div className="appointment-management-stat-card">
            <div className="appointment-management-stat-icon appointment-management-icon-completed"><FaCheck /></div>
            <div className="appointment-management-stat-info">
              <span className="appointment-management-stat-label">Hoàn thành</span>
              <span className="appointment-management-stat-value">{stats.completed}</span>
            </div>
          </div>
           <div className="appointment-management-stat-card">
            <div className="appointment-management-stat-icon appointment-management-icon-cancelled"><FaBan /></div>
            <div className="appointment-management-stat-info">
              <span className="appointment-management-stat-label">Đã hủy</span>
              <span className="appointment-management-stat-value">{stats.cancelled}</span>
            </div>
          </div>
        </div>

        {/* Filter Panel - Dùng class của Admin */}
        <div className="appointment-management-filter-panel">
           <div className="appointment-management-filter-grid">
              <div className="appointment-management-filter-group">
                 <label><FaSearch /> Tìm kiếm</label>
                 <input type="text" placeholder="Mã số, tên bác sĩ..." value={filters.search} onChange={(e) => handleFilterChange('search', e.target.value)} />
              </div>
              <div className="appointment-management-filter-group">
                 <label><FaCalendarAlt /> Ngày khám</label>
                 <input type="date" value={filters.date} onChange={(e) => handleFilterChange('date', e.target.value)} />
              </div>
              <div className="appointment-management-filter-group">
                 <label><FaFilter /> Trạng thái</label>
                 <select value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)}>
                    <option value="all">Tất cả</option>
                    <option value="pending">Chờ xác nhận</option>
                    <option value="confirmed">Đã xác nhận</option>
                    <option value="completed">Hoàn thành</option>
                    <option value="cancelled">Đã hủy</option>
                 </select>
              </div>
              <div className="appointment-management-filter-group">
                  <button className="appointment-management-btn appointment-management-btn-reset" onClick={resetFilters} style={{width: '100%', justifyContent: 'center'}}>
                    <FaSyncAlt /> Làm mới
                  </button>
              </div>
           </div>
        </div>

        {/* Table - Dùng class của Admin */}
        <div className="admin-appt-page-table-container">
          <table className="admin-appt-page-table">
            <thead>
              <tr>
                <th>Mã Lịch Hẹn</th>
                <th>Bác sĩ</th>
                <th>Dịch vụ</th>
                <th>Thời gian</th>
                <th>Trạng thái</th>
                <th>Thanh toán</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredAppointments.length > 0 ? (
                filteredAppointments.map(apt => (
                  <tr key={apt.id}>
                    <td className="fw-bold text-primary">{apt.code}</td>
                    <td>
                      <div className="admin-appt-page-doctor-info">
                         <span style={{fontWeight: 600}}>BS. {apt.Doctor?.user?.full_name || '...'}</span>
                      </div>
                    </td>
                    <td>{apt.Service?.name}</td>
                    <td>
                      <div className="admin-appt-page-datetime-info">
                        <span>{new Date(apt.appointment_date).toLocaleDateString('vi-VN')}</span>
                        <span className="text-primary">{formatTime(apt.appointment_start_time)}</span>
                      </div>
                    </td>
                    <td>{getStatusBadge(apt.status)}</td>
                    <td>
                       {(apt.payment_status === 'paid_online' || apt.payment_status === 'paid_at_clinic') ? 
                         <span className="payment-status-badge payment-paid"><FaCheckCircle/> Đã thanh toán</span> : 
                         <span className="payment-status-badge payment-unpaid"><FaClock/> Chưa thanh toán</span>
                       }
                    </td>
                    <td>
                      <div className="admin-appt-page-action-buttons">
                        <Link to={`/lich-hen/${apt.code}`} className="admin-appt-page-btn-action btn-view" title="Chi tiết">
                          <FaEye />
                        </Link>
                        {['pending', 'confirmed', 'upcoming'].includes(apt.status) && (
                          <button className="admin-appt-page-btn-action appointment-management-action-cancel" onClick={() => openCancelModal(apt)} title="Hủy">
                            <FaBan />
                          </button>
                        )}
                        {apt.status === 'cancelled' && (apt.payment_status === 'paid_online' || apt.payment_status === 'paid_at_clinic') && (
                          <button className="admin-appt-page-btn-action" onClick={() => openRefundModal(apt)} title="Yêu cầu hoàn tiền" style={{ background: '#f59e0b', color: '#fff' }}>
                            <FaCheckCircle />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="7" className="text-center" style={{padding: '30px'}}>Không có lịch hẹn nào.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cancel Modal */}
      {showActionModal && selectedAppointment && (
        <div className="admin-appt-page-modal-overlay">
          <div className="admin-appt-page-modal-content">
            <h3 style={{marginBottom: '15px'}}>Hủy Lịch Hẹn</h3>
            <p>Bạn có chắc muốn hủy lịch hẹn <strong>{selectedAppointment.code}</strong>?</p>
            <div className="admin-appt-page-form-group" style={{marginTop: '15px'}}>
               <textarea rows="3" placeholder="Nhập lý do hủy..." value={actionReason} onChange={(e) => setActionReason(e.target.value)} />
            </div>
            <div className="admin-appt-page-modal-footer">
               <button className="appointment-management-btn appointment-management-btn-reset" onClick={closeActionModal}>Đóng</button>
               <button className="appointment-management-btn" style={{background: '#e57373', color: 'white'}} onClick={handleConfirmCancel} disabled={isSubmitting}>
                 {isSubmitting ? <FaSpinner className="fa-spin"/> : 'Xác nhận hủy'}
               </button>
            </div>
          </div>
        </div>
      )}

      {showRefundModal && selectedAppointment && (
        <div className="admin-appt-page-modal-overlay">
          <div className="admin-appt-page-modal-content">
            <h3 style={{marginBottom: '15px'}}>Yêu Cầu Hoàn Tiền</h3>
            <p>Lịch hẹn <strong>{selectedAppointment.code}</strong> đã hủy và đủ điều kiện hoàn tiền sẽ được staff/admin xét duyệt.</p>
            <div className="admin-appt-page-form-group" style={{marginTop: '15px'}}>
               <label>Lý do hoàn tiền</label>
               <textarea rows="3" placeholder="Mô tả lý do và yêu cầu hoàn tiền..." value={refundReason} onChange={(e) => setRefundReason(e.target.value)} />
            </div>
            <div className="admin-appt-page-form-group" style={{marginTop: '15px'}}>
               <label>Thông tin tài khoản nhận tiền</label>
               <textarea rows="3" placeholder="Ngân hàng, số tài khoản, chủ tài khoản..." value={refundBankInfo} onChange={(e) => setRefundBankInfo(e.target.value)} />
            </div>
            <div className="admin-appt-page-modal-footer">
               <button className="appointment-management-btn appointment-management-btn-reset" onClick={closeRefundModal}>Đóng</button>
               <button className="appointment-management-btn" style={{background: '#f59e0b', color: 'white'}} onClick={handleRefundSubmit} disabled={isSubmitting}>
                 {isSubmitting ? <FaSpinner className="fa-spin"/> : 'Gửi yêu cầu hoàn tiền'}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyAppointmentsPage;