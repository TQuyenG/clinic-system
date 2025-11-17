// Path: client/src/components/consultation/ConsultationRealtimeList.js
// ============================================================================
// ✅ ĐÃ CẬP NHẬT HOÀN CHỈNH VỚI LOGIC HÀNH ĐỘNG

import React, { useState, useEffect, useCallback } from 'react';// <-- Thêm useState
import consultationService from '../../services/consultationService';
import { 
  FaSearch, 
  FaCheckCircle, 
  FaTimesCircle,
  FaEye,
  FaMoneyBillWave,
  FaEdit,
  FaFileExport,
  FaSpinner,
  FaCalendarTimes // <-- Thêm icon loading
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

export const ConsultationRealtimeList = ({ initialType }) => {
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // <-- State cho loading của nút
  const [filters, setFilters] = useState({
    status: 'all',
    type: initialType || 'chat', // SỬA: Lấy type từ prop ngay khi khởi tạo
    doctor_id: '',
    specialty_id: '',
    date_from: '',
    date_to: '',
    search: '',
    page: 1,
    limit: 20
  });
  const [pagination, setPagination] = useState(null);
  const navigate = useNavigate(); // <-- Dòng 36

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [selectedConsultation, setSelectedConsultation] = useState(null);

  const fetchConsultations = useCallback(async () => { // <-- Dòng 39 (Chuyển lên)
    try {
      setLoading(true);
      const response = await consultationService.getAllConsultationsRealtime(filters);
      
      if (response.data.success) {
        setConsultations(response.data.data.consultations);
        setPagination(response.data.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching consultations:', error);
      // TODO: Thêm thông báo lỗi cho người dùng
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { // <-- Dòng 57 (Chuyển xuống)
    fetchConsultations();
  }, [fetchConsultations]);

  // THÊM MỚI: Tự động cập nhật filter 'type' khi prop từ URL thay đổi
  useEffect(() => {
    if (initialType) {
      setFilters(prev => ({ ...prev, type: initialType, page: 1 }));
    }
  }, [initialType]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
      page: 1 // Reset về trang 1
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const getStatusBadge = (status) => {
    const config = {
      'pending': { class: 'warning', icon: '⏳', text: 'Chờ phê duyệt' },
      'confirmed': { class: 'info', icon: '✅', text: 'Đã xác nhận' }, // <-- SỬA LỖI TEXT
      'in_progress': { class: 'success', icon: '💬', text: 'Đang diễn ra' },
      'completed': { class: 'success', icon: '✔️', text: 'Hoàn thành' },
      'cancelled': { class: 'danger', icon: '❌', text: 'Đã hủy' },
      'rejected': { class: 'danger', icon: '🚫', text: 'Bị từ chối' }, // <-- Thêm
      'expired': { class: 'muted', icon: '⌛', text: 'Hết hạn' }   // <-- Thêm
    };
    const item = config[status] || config['pending'];
    return (
      <span className={`status-badge status-${item.class}`}>
        {item.icon} {item.text}
      </span>
    );
  };

  // ========== START: HÀM XỬ LÝ HÀNH ĐỘNG ==========

  /**
   * Phê duyệt lịch tư vấn
   */
  const handleApprove = async (consultationId) => {
    if (!window.confirm('Bạn có chắc muốn PHÊ DUYỆT lịch tư vấn này?')) return;

    setActionLoading(consultationId); // Bắt đầu loading
    try {
      await consultationService.adminApproveConsultation(consultationId);
      alert('Phê duyệt thành công!'); // Thay bằng Toast
      fetchConsultations(); // Tải lại danh sách
    } catch (error) {
      console.error('Error approving consultation:', error);
      alert(error.response?.data?.message || 'Có lỗi xảy ra khi phê duyệt'); // Thay bằng Toast
    } finally {
      setActionLoading(null); // Dừng loading
    }
  };

  /**
   * Từ chối lịch tư vấn
   */
  const handleReject = async (consultationId) => {
    const reason = window.prompt('Vui lòng nhập LÝ DO TỪ CHỐI (bắt buộc):');
    if (!reason) {
      alert('Bạn phải nhập lý do để từ chối.'); // Thay bằng Toast
      return;
    }

    setActionLoading(consultationId);
    try {
      await consultationService.adminRejectConsultation(consultationId, { reason });
      alert('Đã từ chối lịch tư vấn.'); // Thay bằng Toast
      fetchConsultations(); // Tải lại danh sách
    } catch (error) {
      console.error('Error rejecting consultation:', error);
      alert(error.response?.data?.message || 'Có lỗi xảy ra khi từ chối'); // Thay bằng Toast
    } finally {
      setActionLoading(null);
    }
  };

  /**
   * Xử lý hoàn tiền
   */
  const handleRefund = async (consultation) => {
    const amountToRefund = consultation.total_fee;
    const confirmMessage = `Bạn có chắc muốn HOÀN SỐ TIỀN ${amountToRefund.toLocaleString()}đ cho tư vấn [${consultation.consultation_code}]? \n\nHành động này sẽ gọi API thanh toán và không thể đảo ngược.`;

    if (!window.confirm(confirmMessage)) return;

    const reason = window.prompt(`Vui lòng nhập LÝ DO HOÀN TIỀN (ví dụ: Admin từ chối, BN hủy...)`);
    if (!reason) {
      alert('Bạn phải nhập lý do để hoàn tiền.'); // Thay bằng Toast
      return;
    }

    setActionLoading(consultation.consultation_code); // Sửa: Dùng consultation_code
    try {
      // Sửa: Dùng consultation_code
      await consultationService.processRefundAdmin(consultation.consultation_code, {
        refund_amount: amountToRefund,
        refund_reason: reason
      });
      alert('Hoàn tiền thành công!'); // Thay bằng Toast
      fetchConsultations(); // Tải lại danh sách
    } catch (error) {
      console.error('Error processing refund:', error);
      alert(error.response?.data?.message || 'Có lỗi xảy ra khi hoàn tiền'); // Thay bằng Toast
    } finally {
      setActionLoading(null);
    }
  };

  /**
   * Xem chi tiết (Tạm thời alert, bạn nên điều hướng sang trang chi tiết)
   */
  const handleViewDetails = (consultationId) => {
  // Điều hướng đến trang chi tiết /tu-van/:id đã có sẵn
  navigate(`/tu-van/${consultationId}`);
};

  /**
   * Xem kết quả (Tạm thời alert, bạn nên mở modal hiển thị kết quả)
   */
  const handleViewResult = (consultation) => {
    alert(`Chức năng "Xem kết quả" cho ID: ${consultation.id} \n(Bạn nên mở Modal hiển thị chẩn đoán của bác sĩ)`);
    // console.log(consultation.diagnosis, consultation.treatment_plan);
  };

  /**
   * Hủy lịch hẹn đã xác nhận - VIẾT LẠI
   */
  const handleCancelConfirmed = (consultation) => {
    // 1. Kiểm tra điều kiện thời gian (còn hơn 24 giờ)
    const now = new Date();
    const appointmentTime = new Date(consultation.appointment_time);
    const hoursDifference = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursDifference < 24) {
      alert('Lỗi: Không thể hủy lịch hẹn cận giờ (ít hơn 24 giờ).');
      return;
    }
    
    // 2. Mở modal thay vì dùng prompt
    setSelectedConsultation(consultation);
    setIsCancelModalOpen(true);
    setCancelReason(''); // Xóa lý do cũ
  };
  
  // THÊM MỚI: Hàm xử lý submit từ modal
  const handleSubmitCancel = async () => {
    if (!selectedConsultation) return;

    // Kiểm tra lý do (bắt buộc cho lịch có phí)
    const isPaid = parseFloat(selectedConsultation.total_fee) > 0;
    if (isPaid && !cancelReason.trim()) {
      alert('Bạn phải nhập lý do hủy cho lịch hẹn có phí.');
      return;
    }
    
    const reasonToSubmit = cancelReason.trim() || 'Admin hủy lịch hẹn (miễn phí)';

    setActionLoading(selectedConsultation.consultation_code); // Sửa: dùng code
    setIsCancelModalOpen(false); // Đóng modal

    try {
      // Sửa: Dùng consultation_code
      await consultationService.adminCancelConfirmedConsultation(selectedConsultation.consultation_code, { 
        reason: reasonToSubmit 
      });
      alert('Đã hủy lịch hẹn thành công! \nNếu lịch có phí, nút Hoàn tiền sẽ xuất hiện sau khi tải lại.');
      fetchConsultations(); // Tải lại danh sách
    } catch (error) {
      console.error('Error cancelling consultation:', error);
      alert(error.response?.data?.message || 'Có lỗi xảy ra khi hủy lịch');
    } finally {
      setActionLoading(null);
      setSelectedConsultation(null);
      setCancelReason('');
    }
  };
  
  
  // ========== END: HÀM XỬ LÝ HÀNH ĐỘNG ==========

  return (
    <div className="consultation-realtime-list">
      {/* Filters */}
      <div className="filters-section-realtime">
        <div className="filters-row">
          <div className="filter-item">
            <label>Trạng thái</label>
            <select 
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="all">Tất cả</option>
              <option value="pending">Chờ duyệt</option>
              <option value="confirmed">Đã duyệt</option>
              <option value="in_progress">Đang diễn ra</option>
              <option value="completed">Hoàn thành</option>
              <option value="cancelled">Đã hủy</option>
              <option value="rejected">Bị từ chối</option>
              <option value="expired">Hết hạn</option>
            </select>
          </div>
          {/* ... các filter khác ... */}
          <div className="filter-item">
            <label>Loại tư vấn</label>
            <select 
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
            >
              <option value="all">Tất cả</option>
              <option value="chat">Chat</option>
              <option value="video">Video</option>
              <option value="offline">Trực tiếp</option>
            </select>
          </div>

          <div className="filter-item">
            <label>Từ ngày</label>
            <input 
              type="date"
              value={filters.date_from}
              onChange={(e) => handleFilterChange('date_from', e.target.value)}
            />
          </div>

          <div className="filter-item">
            <label>Đến ngày</label>
            <input 
              type="date"
              value={filters.date_to}
              onChange={(e) => handleFilterChange('date_to', e.target.value)}
            />
          </div>
        </div>

        <div className="search-row">
          <div className="search-box-realtime">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Tìm theo mã tư vấn, tên bệnh nhân..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>
          
          <button className="btn-export">
            <FaFileExport /> Export Excel
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="loading-state">Đang tải...</div>
      ) : (
        <>
          <div className="table-container-realtime">
            <table className="realtime-table">
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Bệnh nhân</th>
                  <th>Bác sĩ</th>
                  <th>Gói</th>
                  <th>Thời gian</th>
                  <th>Trạng thái</th>
                  <th>Phí</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {consultations.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center' }}>Không tìm thấy dữ liệu.</td>
                  </tr>
                ) : (
                  consultations.map((consultation) => (
                    <tr key={consultation.id}>
                      <td className="code-cell">{consultation.consultation_code}</td>
                      <td>
                        <div className="patient-info">
                          <strong>{consultation.patient?.full_name}</strong>
                          <span>{consultation.patient?.phone}</span>
                        </div>
                      </td>
                      <td>
                        <div className="doctor-info">
                          <strong>{consultation.doctor?.full_name}</strong>
                          {/* Sửa lại: Lấy specialty name từ đường dẫn đúng */}
                          <span>{consultation.doctor?.Doctor?.specialty?.name || 'N/A'}</span>
                        </div>
                      </td>
                      <td>
                        <span className="type-badge">
                          {consultation.consultation_type === 'chat' ? '💬 Chat' : ''}
                          {consultation.consultation_type === 'video' ? '📹 Video' : ''}
                          {consultation.consultation_type === 'offline' ? '🏥 Offline' : ''}
                        </span>
                      </td>
                      <td>{new Date(consultation.appointment_time).toLocaleString('vi-VN')}</td>
                      <td>{getStatusBadge(consultation.status)}</td>
                      
                      {/* SỬA LỖI HIỂN THỊ PHÍ */}
                      <td className="fee-cell">
                        {consultation.total_fee != null ? `${parseFloat(consultation.total_fee).toLocaleString()}đ` : '0đ'}
                      </td>
                      
                      {/* SỬA LỖI LOGIC HÀNH ĐỘNG */}
                      <td>
                        <div className="action-buttons">
                          {/* Sửa: So sánh với consultation_code thay vì id */}
                          {actionLoading === consultation.consultation_code ? (
                            <FaSpinner className="spinner" />
                          ) : (
                            <>
                              <button 
                                className="btn-icon" 
                                title="Xem chi tiết"
                                onClick={() => handleViewDetails(consultation.id)}
                              >
                                <FaEye />
                              </button>


                              {consultation.status === 'pending' && (
                                <>
                                  <button 
                                    className="btn-icon btn-success" 
                                    title="Phê duyệt"
                                    onClick={() => handleApprove(consultation.consultation_code)}
                                  >
                                    <FaCheckCircle />
                                  </button>
                                  <button 
                                    className="btn-icon btn-danger" 
                                    title="Từ chối"
                                    onClick={() => handleReject(consultation.consultation_code)}
                                  >
                                    <FaTimesCircle />
                                  </button>
                                </>
                              )}
                              
                              {(consultation.status === 'cancelled' || consultation.status === 'rejected') && 
                                parseFloat(consultation.total_fee) > 0 && 
                                consultation.payment_status === 'paid' && // <-- Chỉ hoàn tiền khi đã thanh toán
                              (
                                <button 
                                  className="btn-icon btn-warning" 
                                  title="Hoàn tiền"
                                  onClick={() => handleRefund(consultation)}
                                >
                                  <FaMoneyBillWave />
                                </button>
                              )}
                              
                              {consultation.status === 'completed' && (
                                <button 
                                  className="btn-icon btn-info" 
                                  title="Xem kết quả"
                                  onClick={() => handleViewResult(consultation)}
                                >
                                  <FaEdit />
                                </button>
                              )}
                              {consultation.status === 'confirmed' && (
                                    <button 
                                      className="btn-icon btn-danger" 
                                      title="Hủy lịch hẹn"
                                      onClick={() => handleCancelConfirmed(consultation)}
                                    >
                                      <FaCalendarTimes />
                                    </button>
                                  )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="pagination-realtime">
              <button 
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                Trước
              </button>
              <span>Trang {pagination.page} / {pagination.totalPages}</span>
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
      {/* ======================================== */}
      {/* THÊM MỚI: MODAL HỦY LỊCH               */}
      {/* ======================================== */}
      {isCancelModalOpen && selectedConsultation && (
        <div className="consultation-realtime-list-modal-overlay">
          <div className="consultation-realtime-list-modal-container">
            <div className="consultation-realtime-list-modal-header">
              <FaCalendarTimes />
              <h3 className="consultation-realtime-list-modal-title">
                Xác nhận Hủy Lịch hẹn
              </h3>
            </div>
            
            <div className="consultation-realtime-list-modal-body">
              <p className="consultation-realtime-list-modal-intro">
                Bạn sắp hủy lịch hẹn <strong>{selectedConsultation.consultation_code}</strong> 
                của bệnh nhân <strong>{selectedConsultation.patient?.full_name}</strong>.
              </p>
              
              {parseFloat(selectedConsultation.total_fee) > 0 && (
                <p className="consultation-realtime-list-modal-warning">
                  ⚠️ Đây là lịch hẹn <strong>có phí</strong>. Vui lòng nhập lý do hủy (bắt buộc).
                </p>
              )}
              
              <div className="consultation-realtime-list-modal-form-group">
                <label 
                  htmlFor="cancelReason" 
                  className="consultation-realtime-list-modal-label"
                >
                  Lý do hủy
                  {parseFloat(selectedConsultation.total_fee) > 0 ? 
                    <span className="consultation-realtime-list-modal-required"> *</span> : 
                    ' (Không bắt buộc)'
                  }
                </label>
                <textarea
                  id="cancelReason"
                  className="consultation-realtime-list-modal-textarea"
                  rows="4"
                  placeholder="Nhập lý do hủy..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
              </div>
            </div>
            
            <div className="consultation-realtime-list-modal-actions">
              <button
                type="button"
                className="consultation-realtime-list-modal-btn consultation-realtime-list-modal-btn-secondary"
                onClick={() => setIsCancelModalOpen(false)}
              >
                Đóng lại
              </button>
              <button
                type="button"
                className="consultation-realtime-list-modal-btn consultation-realtime-list-modal-btn-danger"
                onClick={handleSubmitCancel}
                // Sửa: Logic disable nút
                disabled={parseFloat(selectedConsultation.total_fee) > 0 && !cancelReason.trim()}
              >
                Xác nhận Hủy
              </button>
            </div>
            
          </div>
        </div>
      )}

      {/* ======================================== */}
      {/* THÊM MỚI: MODAL HỦY LỊCH               */}
      {/* ======================================== */}
      {isCancelModalOpen && selectedConsultation && (
        <div className="consultation-realtime-list-modal-overlay">
          <div className="consultation-realtime-list-modal-container">
            <div className="consultation-realtime-list-modal-header">
              <FaCalendarTimes />
              <h3 className="consultation-realtime-list-modal-title">
                Xác nhận Hủy Lịch hẹn
              </h3>
            </div>
            
            <div className="consultation-realtime-list-modal-body">
              <p className="consultation-realtime-list-modal-intro">
                Bạn sắp hủy lịch hẹn <strong>{selectedConsultation.consultation_code}</strong> 
                của bệnh nhân <strong>{selectedConsultation.patient?.full_name}</strong>.
              </p>
              
              {parseFloat(selectedConsultation.total_fee) > 0 && (
                <p className="consultation-realtime-list-modal-warning">
                  ⚠️ Đây là lịch hẹn <strong>có phí</strong>. Vui lòng nhập lý do hủy (bắt buộc).
                </p>
              )}
              
              <div className="consultation-realtime-list-modal-form-group">
                <label 
                  htmlFor="cancelReason" 
                  className="consultation-realtime-list-modal-label"
                >
                  Lý do hủy
                  {parseFloat(selectedConsultation.total_fee) > 0 ? 
                    <span className="consultation-realtime-list-modal-required"> *</span> : 
                    ' (Không bắt buộc)'
                  }
                </label>
                <textarea
                  id="cancelReason"
                  className="consultation-realtime-list-modal-textarea"
                  rows="4"
                  placeholder="Nhập lý do hủy..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
              </div>
            </div>
            
            <div className="consultation-realtime-list-modal-actions">
              <button
                type="button"
                className="consultation-realtime-list-modal-btn consultation-realtime-list-modal-btn-secondary"
                onClick={() => setIsCancelModalOpen(false)}
              >
                Đóng lại
              </button>
              <button
                type="button"
                className="consultation-realtime-list-modal-btn consultation-realtime-list-modal-btn-danger"
                onClick={handleSubmitCancel}
                // Sửa: Logic disable nút
                disabled={parseFloat(selectedConsultation.total_fee) > 0 && !cancelReason.trim()}
              >
                Xác nhận Hủy
              </button>
            </div>
            
          </div>
        </div>
      )}
      {/* KẾT THÚC THÊM MỚI MODAL */}

    </div>
  );
};