// Path: client/src/components/consultation/ConsultationRealtimeList.js
// ✅ REALTIME LIST - COMPACT THEME & FIXED MODAL

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import consultationService from '../../services/consultationService';
import { 
  FaSearch, FaCheckCircle, FaTimesCircle, FaEye, FaMoneyBillWave,
  FaEdit, FaFileExport, FaSpinner, FaCalendarTimes, 
  FaClock, FaBan, FaCheck
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './ConsultationRealtimeList.css'; // Đảm bảo import file CSS mới

export const ConsultationRealtimeList = ({ initialType, doctorId, role }) => { // ✅ Đã thêm prop role
  const { user } = useAuth();
  const isSystemStaff = user?.department === 'system' || user?.staff?.department === 'system';
  
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    type: initialType || 'chat',
    doctor_id: '',
    specialty_id: '',
    date_from: '',
    date_to: '',
    search: '',
    page: 1,
    limit: 20
  });
  const [pagination, setPagination] = useState(null);
  const navigate = useNavigate();

  // Modal State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [selectedConsultation, setSelectedConsultation] = useState(null);

  const fetchConsultations = useCallback(async () => {
    try {
      setLoading(true);
      const params = { 
        ...filters, 
        doctor_id: doctorId || filters.doctor_id 
      };

      console.log('🔍 Fetching data for role:', user?.role);

      let response;
      let dataList = [];
      let paginationData = null;

      // 1️⃣ TRƯỜNG HỢP: BỆNH NHÂN (Patient)
      if (role === 'patient' || user?.role === 'patient') {
        response = await consultationService.getMyConsultations(params);
        if (response.data.success) {
          // API Patient trả về mảng trực tiếp trong data.data
          dataList = response.data.data;
          paginationData = response.data.pagination;
        }
      } 
      // 2️⃣ TRƯỜNG HỢP: BÁC SĨ (Doctor)
      else if (user?.role === 'doctor') {
        response = await consultationService.getDoctorConsultations(params);
        if (response.data.success) {
          // API Doctor trả về mảng trực tiếp trong data.data
          dataList = response.data.data;
          paginationData = response.data.pagination;
        }
      }
      // 3️⃣ TRƯỜNG HỢP: NHÂN VIÊN (Staff) - Có thể dùng API quản lý riêng hoặc Admin
      else if (user?.role === 'staff') {
        // Staff thường dùng chung API Admin để quản lý realtime
        response = await consultationService.getAllConsultationsRealtime(params);
        if (response.data.success) {
          // API Admin/Staff trả về mảng trong data.data.consultations
          dataList = response.data.data.consultations;
          paginationData = response.data.data.pagination;
        }
      }
      // 4️⃣ TRƯỜNG HỢP: QUẢN TRỊ VIÊN (Admin)
      else {
        response = await consultationService.getAllConsultationsRealtime(params);
        if (response.data.success) {
          // API Admin trả về mảng trong data.data.consultations
          dataList = response.data.data.consultations;
          paginationData = response.data.data.pagination;
        }
      }

      // Cập nhật State an toàn (tránh lỗi undefined)
      setConsultations(Array.isArray(dataList) ? dataList : []);
      if (paginationData) setPagination(paginationData);

    } catch (error) {
      console.error('Error fetching consultations:', error);
      // Không alert lỗi để tránh làm phiền người dùng
    } finally {
      setLoading(false);
    }
  }, [filters, doctorId, role, user]); // ✅ Đầy đủ dependency

  useEffect(() => {
    if (initialType) {
      setFilters(prev => ({ ...prev, type: initialType, page: 1 }));
    }
  }, [initialType]);

  // ✅ THÊM ĐOẠN NÀY ĐỂ GỌI API KHI COMPONENT LOAD HOẶC FILTER THAY ĐỔI
  useEffect(() => {
    fetchConsultations();
  }, [fetchConsultations]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  // ✅ NO EMOJI - USE ICONS
  const getStatusBadge = (status) => {
    const config = {
      'pending': { class: 'crl-badge-warn', icon: <FaClock/>, text: 'Chờ duyệt' },
      'confirmed': { class: 'crl-badge-info', icon: <FaCheckCircle/>, text: 'Đã xác nhận' },
      'in_progress': { class: 'crl-badge-success', icon: <FaSpinner className="spin"/>, text: 'Đang diễn ra' },
      'completed': { class: 'crl-badge-success', icon: <FaCheck/>, text: 'Hoàn thành' },
      'cancelled': { class: 'crl-badge-danger', icon: <FaTimesCircle/>, text: 'Đã hủy' },
      'rejected': { class: 'crl-badge-danger', icon: <FaBan/>, text: 'Từ chối' },
      'expired': { class: 'crl-badge-muted', icon: <FaClock/>, text: 'Hết hạn' }
    };
    const item = config[status] || config['pending'];
    return (
      <span className={`crl-status-badge ${item.class}`}>
        {item.icon} {item.text}
      </span>
    );
  };

  // Actions
  const handleApprove = async (code) => {
    if (!window.confirm('Phê duyệt lịch tư vấn này?')) return;
    setActionLoading(code);
    try {
      await consultationService.adminApproveConsultation(code);
      fetchConsultations();
    } catch (error) { alert(error.message); } 
    finally { setActionLoading(null); }
  };

  const handleReject = async (code) => {
    const reason = window.prompt('Nhập lý do từ chối:');
    if (!reason) return;
    setActionLoading(code);
    try {
      await consultationService.adminRejectConsultation(code, { reason });
      fetchConsultations();
    } catch (error) { alert(error.message); } 
    finally { setActionLoading(null); }
  };

  const handleRefund = async (consultation) => {
    if (!window.confirm(`Hoàn tiền ${consultation.total_fee.toLocaleString()}đ?`)) return;
    const reason = window.prompt('Lý do hoàn tiền:');
    if (!reason) return;

    setActionLoading(consultation.consultation_code);
    try {
      await consultationService.processRefundAdmin(consultation.consultation_code, {
        refund_amount: consultation.total_fee,
        refund_reason: reason
      });
      fetchConsultations();
    } catch (error) { alert(error.message); } 
    finally { setActionLoading(null); }
  };

  const handleCancelConfirmed = (consultation) => {
    const now = new Date();
    const appt = new Date(consultation.appointment_time);
    if ((appt - now) / 36e5 < 24) {
      alert('Không thể hủy lịch hẹn còn dưới 24h.');
      return;
    }
    setSelectedConsultation(consultation);
    setIsCancelModalOpen(true);
    setCancelReason('');
  };

  const handleSubmitCancel = async () => {
    if (!selectedConsultation) return;
    const isPaid = parseFloat(selectedConsultation.total_fee) > 0;
    if (isPaid && !cancelReason.trim()) {
      alert('Cần nhập lý do cho lịch có phí.');
      return;
    }
    
    setActionLoading(selectedConsultation.consultation_code);
    setIsCancelModalOpen(false);

    try {
      await consultationService.adminCancelConfirmedConsultation(selectedConsultation.consultation_code, { 
        reason: cancelReason.trim() || 'Admin hủy' 
      });
      fetchConsultations();
    } catch (error) { alert(error.message); } 
    finally {
      setActionLoading(null);
      setSelectedConsultation(null);
    }
  };

  return (
    <div className="crl-container">
      {/* Filters - Compact Grid */}
      <div className="crl-filters">
        <div className="crl-filter-group">
          <select className="crl-select" value={filters.status} onChange={e => handleFilterChange('status', e.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            <option value="pending">Chờ duyệt</option>
            <option value="confirmed">Đã duyệt</option>
            <option value="in_progress">Đang diễn ra</option>
            <option value="completed">Hoàn thành</option>
            <option value="cancelled">Đã hủy</option>
          </select>
          <select className="crl-select" value={filters.type} onChange={e => handleFilterChange('type', e.target.value)}>
            <option value="all">Tất cả loại</option>
            <option value="chat">Chat</option>
            <option value="video">Video</option>
          </select>
          <input type="date" className="crl-input" value={filters.date_from} onChange={e => handleFilterChange('date_from', e.target.value)} />
          <input type="date" className="crl-input" value={filters.date_to} onChange={e => handleFilterChange('date_to', e.target.value)} />
        </div>
        <div className="crl-search-group">
          <div className="crl-search-box">
            <FaSearch className="crl-search-icon" />
            <input type="text" className="crl-search-input" placeholder="Tìm kiếm..." value={filters.search} onChange={e => handleFilterChange('search', e.target.value)} />
          </div>
          <button className="crl-btn-export"><FaFileExport /></button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="crl-loading">Đang tải...</div>
      ) : (
        <>
          <div className="crl-table-wrapper">
            <table className="crl-table">
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Bệnh nhân</th>
                  <th>Bác sĩ</th>
                  <th>Loại</th>
                  <th>Thời gian</th>
                  <th>Trạng thái</th>
                  <th>Phí</th>
                  {!isSystemStaff && <th className="text-right">Hành động</th>}
                </tr>
              </thead>
              <tbody>
                {consultations.length === 0 ? (
                  <tr><td colSpan="8" className="text-center">Không có dữ liệu</td></tr>
                ) : (
                  consultations.map((item) => (
                    <tr key={item.id}>
                      <td><span className="crl-code">{item.consultation_code}</span></td>
                      <td>
                        <div className="crl-info-cell">
                          <strong>{item.patient?.full_name}</strong>
                          <span>{item.patient?.phone}</span>
                        </div>
                      </td>
                      <td>
                        <div className="crl-info-cell">
                          <strong>{item.doctor?.full_name}</strong>
                          <span>{item.doctor?.Doctor?.specialty?.name}</span>
                        </div>
                      </td>
                      <td>
                         <span className={`crl-type ${item.consultation_type}`}>
                           {item.consultation_type === 'chat' && 'Chat'}
                           {item.consultation_type === 'video' && 'Video'}
                           {item.consultation_type === 'offline' && 'Offline'}
                         </span>
                      </td>
                      <td>{new Date(item.appointment_time).toLocaleString('vi-VN')}</td>
                      <td>{getStatusBadge(item.status)}</td>
                      <td className="crl-fee">
                        {item.total_fee ? parseFloat(item.total_fee).toLocaleString() : 0}đ
                      </td>
                      
                      {!isSystemStaff && (
                        <td className="text-right">
                          <div className="crl-actions">
                            {actionLoading === item.consultation_code ? (
                              <FaSpinner className="spin" />
                            ) : (
                              <>
                                <button className="crl-btn-icon info" onClick={() => navigate(`/tu-van/${item.id}`)} title="Xem"><FaEye /></button>
                                
                                {item.status === 'pending' && (
                                  <>
                                    <button className="crl-btn-icon success" onClick={() => handleApprove(item.consultation_code)} title="Duyệt"><FaCheckCircle /></button>
                                    <button className="crl-btn-icon danger" onClick={() => handleReject(item.consultation_code)} title="Từ chối"><FaTimesCircle /></button>
                                  </>
                                )}

                                {(item.status === 'cancelled' || item.status === 'rejected') && 
                                  parseFloat(item.total_fee) > 0 && 
                                  (item.payment_status === 'paid_online' || item.payment_status === 'paid_at_clinic') && (
                                  <button className="crl-btn-icon warning" onClick={() => handleRefund(item)} title="Hoàn tiền"><FaMoneyBillWave /></button>
                                )}
                                
                                {item.status === 'confirmed' && (
                                  <button className="crl-btn-icon danger" onClick={() => handleCancelConfirmed(item)} title="Hủy lịch"><FaCalendarTimes /></button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="crl-pagination">
              <button onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page === 1}>Trước</button>
              <span>{pagination.page} / {pagination.totalPages}</span>
              <button onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page === pagination.totalPages}>Sau</button>
            </div>
          )}
        </>
      )}

      {/* Modal Hủy Lịch */}
      {isCancelModalOpen && selectedConsultation && (
        <div className="crl-modal-overlay">
          <div className="crl-modal">
            <div className="crl-modal-header danger">
              <FaCalendarTimes /> Hủy Lịch Hẹn
            </div>
            <div className="crl-modal-body">
              <p>Bạn muốn hủy lịch <strong>{selectedConsultation.consultation_code}</strong>?</p>
              {parseFloat(selectedConsultation.total_fee) > 0 && (
                <div className="crl-alert-warning">⚠️ Lịch có phí. Bắt buộc nhập lý do.</div>
              )}
              <label className="crl-label">Lý do hủy:</label>
              <textarea 
                className="crl-textarea" 
                rows="3" 
                value={cancelReason} 
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Nhập lý do..."
              />
            </div>
            <div className="crl-modal-footer">
              <button className="crl-btn-modal sec" onClick={() => setIsCancelModalOpen(false)}>Đóng</button>
              <button 
                className="crl-btn-modal danger" 
                onClick={handleSubmitCancel}
                disabled={parseFloat(selectedConsultation.total_fee) > 0 && !cancelReason.trim()}
              >
                Xác nhận Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};