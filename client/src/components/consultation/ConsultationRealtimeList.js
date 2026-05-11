// Path: client/src/components/consultation/ConsultationRealtimeList.js
// ✅ REALTIME LIST - COMPACT THEME & FIXED MODAL - NO EMOJI ICONS

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import consultationService from '../../services/consultationService';
import { 
  FaSearch, FaCheckCircle, FaTimesCircle, FaEye, FaMoneyBillWave,
  FaFileExport, FaSpinner, FaCalendarTimes, 
  FaClock, FaBan, FaCheck, FaHourglassHalf, FaStar, FaExclamationTriangle
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './ConsultationRealtimeList.css';

export const ConsultationRealtimeList = ({ initialType, doctorId, role }) => {
  const { user } = useAuth();
  const isSystemStaff = user?.department === 'system' || user?.staff?.department === 'system';
  const isStaff = ['staff', 'admin'].includes(user?.role);
  
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    doctor_id: '',
    service: '',
    paymentStatus: 'all',
    date: '',
    search: '',
    sortBy: 'newest',
    page: 1,
    limit: 20
  });
  const [pagination, setPagination] = useState(null);
  const navigate = useNavigate();

  // Modal State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [selectedConsultation, setSelectedConsultation] = useState(null);

  const getPatientName = (item) =>
    item?.patient?.full_name ||
    item?.Patient?.full_name ||
    item?.Patient?.User?.full_name ||
    item?.appointment?.patient?.full_name ||
    item?.appointment?.Patient?.full_name ||
    item?.appointment?.Patient?.User?.full_name ||
    item?.patient_name ||
    'N/A';

  const getPatientEmail = (item) =>
    item?.patient?.email ||
    item?.Patient?.email ||
    item?.Patient?.User?.email ||
    item?.appointment?.patient?.email ||
    item?.appointment?.Patient?.email ||
    item?.appointment?.Patient?.User?.email ||
    item?.patient_email ||
    'N/A';

  const getDoctorName = (item) =>
    item?.doctor?.full_name ||
    item?.Doctor?.full_name ||
    item?.Doctor?.user?.full_name ||
    item?.Doctor?.User?.full_name ||
    item?.appointment?.doctor?.full_name ||
    item?.appointment?.Doctor?.full_name ||
    item?.appointment?.Doctor?.user?.full_name ||
    item?.appointment?.Doctor?.User?.full_name ||
    item?.doctor_name ||
    user?.full_name ||
    user?.username ||
    'N/A';

  const getDoctorEmail = (item) =>
    item?.doctor?.email ||
    item?.Doctor?.email ||
    item?.Doctor?.user?.email ||
    item?.Doctor?.User?.email ||
    item?.appointment?.doctor?.email ||
    item?.appointment?.Doctor?.email ||
    item?.appointment?.Doctor?.user?.email ||
    item?.appointment?.Doctor?.User?.email ||
    item?.doctor_email ||
    user?.email ||
    'N/A';

  const getPaymentStatus = (item) => item?.payment_status || 'unpaid';

  const getServiceName = (item) =>
    item?.package?.name ||
    item?.consultation_pricing?.name ||
    item?.ConsultationPricing?.name ||
    item?.appointment?.Service?.name ||
    item?.service_name ||
    'Tư vấn trực tuyến';

  const fetchConsultations = useCallback(async () => {
    try {
      setLoading(true);
      const params = { 
        ...filters, 
        doctor_id: doctorId || filters.doctor_id 
      };

      let response;
      let dataList = [];
      let paginationData = null;

      if (role === 'patient' || user?.role === 'patient') {
        response = await consultationService.getMyConsultations(params);
        if (response.data.success) {
          dataList = response.data.data;
          paginationData = response.data.pagination;
        }
      } else if (user?.role === 'doctor') {
        response = await consultationService.getDoctorConsultations(params);
        if (response.data.success) {
          dataList = response.data.data;
          paginationData = response.data.pagination;
        }
      } else if (user?.role === 'staff') {
        response = await consultationService.getAllConsultationsRealtime(params);
        if (response.data.success) {
          dataList = response.data.data.consultations;
          paginationData = response.data.data.pagination;
        }
      } else {
        response = await consultationService.getAllConsultationsRealtime(params);
        if (response.data.success) {
          dataList = response.data.data.consultations;
          paginationData = response.data.data.pagination;
        }
      }

      setConsultations(Array.isArray(dataList) ? dataList : []);
      if (paginationData) setPagination(paginationData);

    } catch (error) {
      console.error('Error fetching consultations:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, doctorId, role, user]);

  useEffect(() => {
    if (initialType) {
      setFilters(prev => ({ ...prev, page: 1 }));
    }
  }, [initialType]);

  useEffect(() => {
    fetchConsultations();
  }, [fetchConsultations]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const getStatusBadge = (sOrObj) => {
    const status = (sOrObj && typeof sOrObj === 'object') ? sOrObj.status : sOrObj;
    const config = {
      pending:     { class: 'crl-badge-warn',    icon: <FaHourglassHalf />, text: 'Chờ xác nhận' },
      confirmed:   { class: 'crl-badge-info',    icon: <FaCheckCircle />,   text: 'Đã xác nhận' },
      in_progress: { class: 'crl-badge-success', icon: <FaSpinner className="spin" />, text: 'Đang diễn ra' },
      completed:   { class: 'crl-badge-success', icon: <FaCheck />,         text: 'Hoàn thành' },
      cancelled:   { class: 'crl-badge-danger',  icon: <FaTimesCircle />,   text: 'Đã hủy' },
      rejected:    { class: 'crl-badge-danger',  icon: <FaBan />,           text: 'Từ chối' },
      expired:     { class: 'crl-badge-muted',   icon: <FaClock />,         text: 'Hết hạn' },
    };
    const item = config[status] || config.pending;
    return (
      <span className={`crl-status-badge ${item.class}`}>
        {item.icon} {item.text}
      </span>
    );
  };

  const getPaymentBadge = (item) => {
    const map = {
      unpaid:        { text: 'Chưa thanh toán',     className: 'unpaid' },
      paid_online:   { text: 'Đã thanh toán',        className: 'paid' },
      paid_at_clinic:{ text: 'Thanh toán tại quầy', className: 'paid' },
      not_required:  { text: 'Miễn phí',             className: 'free' },
      refunded:      { text: 'Đã hoàn tiền',         className: 'refunded' },
    };
    const info = map[getPaymentStatus(item)] || map.unpaid;
    return <span className={`crl-payment-badge ${info.className}`}>{info.text}</span>;
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
      alert('Không thể hủy tư vấn còn dưới 24h.');
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
      alert('Cần nhập lý do cho tư vấn có phí.');
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

  const isPatientRole = role === 'patient' || user?.role === 'patient';
  const isAdminOrStaffRole = ['admin', 'staff'].includes(user?.role);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  const formatTime = (datetime) => {
    if (!datetime) return 'N/A';
    return new Date(datetime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const canJoinRoom = (item) => consultationService.canStartConsultation(item?.appointment_time);
  const canDoctorJoinRoom = (item) => item?.status === 'in_progress' || (item?.status === 'confirmed' && consultationService.canStartConsultation(item?.appointment_time));
  const canCancelByPatient = (item) => ['pending', 'pending_payment'].includes(item?.status);
  const canPayNow = (item) => item?.status === 'pending_payment';
  const isCompleted = (item) => item?.status === 'completed';

  const filteredConsultations = consultations
    .filter((item) => {
      if (filters.status !== 'all' && item.status !== filters.status) return false;
      if (initialType && item.consultation_type && item.consultation_type !== initialType) return false;
      if (filters.paymentStatus !== 'all' && getPaymentStatus(item) !== filters.paymentStatus) return false;
      if (filters.date && item.appointment_time) {
        const selected = new Date(filters.date).toLocaleDateString('en-CA');
        const actual = new Date(item.appointment_time).toLocaleDateString('en-CA');
        if (selected !== actual) return false;
      }
      if (filters.doctor_id && String(item.doctor_id || item.doctor?.id || '') !== String(filters.doctor_id)) return false;
      if (filters.service) {
        const serviceText = getServiceName(item).toLowerCase();
        if (!serviceText.includes(filters.service.toLowerCase())) return false;
      }
      if (filters.search) {
        const keyword = filters.search.toLowerCase();
        const haystack = [
          item.consultation_code,
          getPatientName(item),
          getPatientEmail(item),
          getDoctorName(item),
          getDoctorEmail(item),
          getServiceName(item),
          item.chief_complaint,
        ].join(' ').toLowerCase();
        if (!haystack.includes(keyword)) return false;
      }
      return true;
    })
    .sort((left, right) => {
      if (filters.sortBy === 'oldest') {
        return new Date(left.created_at || left.appointment_time) - new Date(right.created_at || right.appointment_time);
      }
      if (filters.sortBy === 'code') {
        return String(left.consultation_code || '').localeCompare(String(right.consultation_code || ''));
      }
      return new Date(right.created_at || right.appointment_time) - new Date(left.created_at || left.appointment_time);
    });

  return (
    <div className="crl-container">
      {/* Filters */}
      <div className="crl-filters">
        <div className="crl-filter-group">
          <select className="crl-select" value={filters.status} onChange={e => handleFilterChange('status', e.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            <option value="pending">Chờ xác nhận</option>
            <option value="confirmed">Đã xác nhận</option>
            <option value="in_progress">Đang diễn ra</option>
            <option value="completed">Hoàn thành</option>
            <option value="cancelled">Đã hủy</option>
          </select>
          <select className="crl-select" value={filters.paymentStatus} onChange={e => handleFilterChange('paymentStatus', e.target.value)}>
            <option value="all">Tất cả thanh toán</option>
            <option value="unpaid">Chưa thanh toán</option>
            <option value="paid_online">Đã thanh toán</option>
            <option value="paid_at_clinic">Tại quầy</option>
            <option value="not_required">Miễn phí</option>
            <option value="refunded">Đã hoàn tiền</option>
          </select>
          <input type="date" className="crl-input" value={filters.date} onChange={e => handleFilterChange('date', e.target.value)} />
          <select className="crl-select" value={filters.sortBy} onChange={e => handleFilterChange('sortBy', e.target.value)}>
            <option value="newest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
            <option value="code">Theo mã</option>
          </select>
        </div>
        <div className="crl-search-group">
          <div className="crl-search-box">
            <FaSearch className="crl-search-icon" />
            <input
              type="text"
              className="crl-search-input"
              placeholder="Tìm mã, bệnh nhân, bác sĩ..."
              value={filters.search}
              onChange={e => handleFilterChange('search', e.target.value)}
            />
          </div>
          <button className="crl-btn-export" title="Xuất dữ liệu">
            <FaFileExport />
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="crl-loading">
          <FaSpinner className="spin" style={{ marginRight: 6 }} /> Đang tải...
        </div>
      ) : (
        <>
          <div className="crl-table-wrapper">
            <table className="crl-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Mã</th>
                  <th>Bệnh nhân</th>
                  <th>Bác sĩ</th>
                  <th>Dịch vụ</th>
                  <th>Ngày &amp; Giờ</th>
                  <th>Trạng thái</th>
                  <th>Thanh toán</th>
                  {!isSystemStaff && <th className="text-right">Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {filteredConsultations.length === 0 ? (
                  <tr>
                    <td colSpan={isSystemStaff ? 8 : 9} className="text-center">
                      Không có dữ liệu
                    </td>
                  </tr>
                ) : (
                  filteredConsultations.map((item, index) => (
                    <tr key={item.id}>
                      <td><span className="crl-stt">{index + 1}</span></td>
                      <td><span className="crl-code">{item.consultation_code}</span></td>
                      <td>
                        <div className="crl-info-cell">
                          <strong>{getPatientName(item)}</strong>
                          <span>{getPatientEmail(item)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="crl-info-cell">
                          <strong>{getDoctorName(item)}</strong>
                          <span>{getDoctorEmail(item)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="crl-info-cell">
                          <strong>{getServiceName(item)}</strong>
                          <span className={`crl-mini-badge ${item.consultation_type}`}>
                            {item.consultation_type === 'video' ? 'Video call' : 'Chat realtime'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="crl-date-cell">
                          <strong>{formatDate(item.appointment_time)}</strong>
                          <span>{formatTime(item.appointment_time)}</span>
                        </div>
                      </td>
                      <td>{getStatusBadge(item.status)}</td>
                      <td>
                        <div className="crl-payment-cell">
                          {getPaymentBadge(item)}
                          {item.payment_method && (
                            <small style={{ fontSize: '10px', color: '#999' }}>
                              {item.payment_method.toUpperCase()}
                            </small>
                          )}
                        </div>
                      </td>
                      {!isSystemStaff && (
                        <td className="text-right">
                          <div className="crl-actions">
                            {actionLoading === item.consultation_code ? (
                              <FaSpinner className="spin" />
                            ) : (
                              <>
                                <button
                                  className="crl-btn-action view"
                                  onClick={() => navigate(`/tu-van/${item.id}`)}
                                  title="Xem chi tiết"
                                >
                                  <FaEye /> <span>Chi tiết</span>
                                </button>

                                {isPatientRole ? (
                                  <>
                                    {canJoinRoom(item) && (
                                      <button
                                        className="crl-btn-action success"
                                        onClick={() => navigate(item.consultation_type === 'video' ? `/tu-van/video/${item.id}` : `/tu-van/${item.id}/chat`)}
                                        title="Vào phòng"
                                      >
                                        <FaCheck /> <span>Vào phòng</span>
                                      </button>
                                    )}
                                    {canPayNow(item) && (
                                      <button
                                        className="crl-btn-action warning"
                                        onClick={() => navigate(`/thanh-toan/${item.id}`)}
                                        title="Thanh toán ngay"
                                      >
                                        <FaMoneyBillWave /> <span>Thanh toán</span>
                                      </button>
                                    )}
                                    {canCancelByPatient(item) && (
                                      <button
                                        className="crl-btn-action danger"
                                        onClick={() => handleCancelConfirmed(item)}
                                        title="Hủy lịch"
                                      >
                                        <FaCalendarTimes /> <span>Hủy</span>
                                      </button>
                                    )}
                                    {isCompleted(item) && (
                                      <button
                                        className="crl-btn-action info"
                                        onClick={() => navigate(`/tu-van/${item.id}`)}
                                        title={item.rating ? 'Xem đánh giá' : 'Đánh giá'}
                                      >
                                        <FaStar /> <span>{item.rating ? 'Xem đánh giá' : 'Đánh giá'}</span>
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    {item.status === 'pending' && isAdminOrStaffRole && (
                                      <>
                                        <button
                                          className="crl-btn-action success"
                                          onClick={() => handleApprove(item.consultation_code)}
                                          title="Duyệt"
                                        >
                                          <FaCheckCircle /> <span>Duyệt</span>
                                        </button>
                                        <button
                                          className="crl-btn-action danger"
                                          onClick={() => handleReject(item.consultation_code)}
                                          title="Từ chối"
                                        >
                                          <FaTimesCircle /> <span>Từ chối</span>
                                        </button>
                                      </>
                                    )}
                                    {canDoctorJoinRoom(item) && (
                                      <button
                                        className="crl-btn-action success"
                                        onClick={() => navigate(item.consultation_type === 'video' ? `/tu-van/video/${item.id}` : `/tu-van/${item.id}/chat`)}
                                        title="Vào phòng"
                                      >
                                        <FaCheck /> <span>Vào phòng</span>
                                      </button>
                                    )}
                                  </>
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
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                Trước
              </button>
              <span>{pagination.page} / {pagination.totalPages}</span>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
              >
                Sau
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal Hủy Lịch */}
      {isCancelModalOpen && selectedConsultation && (
        <div className="crl-modal-overlay">
          <div className="crl-modal">
            <div className="crl-modal-header danger">
              <FaCalendarTimes /> Hủy Tư Vấn
            </div>
            <div className="crl-modal-body">
              <p>
                Bạn muốn hủy tư vấn{' '}
                <strong>{selectedConsultation.consultation_code}</strong>?
              </p>
              {parseFloat(selectedConsultation.total_fee) > 0 && (
                <div className="crl-alert-warning">
                  <FaExclamationTriangle /> Lịch có phí. Bắt buộc nhập lý do.
                </div>
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
              <button
                className="crl-btn-modal sec"
                onClick={() => setIsCancelModalOpen(false)}
              >
                Đóng
              </button>
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