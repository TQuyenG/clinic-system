// client/src/pages/PaymentManagementPage.js
import React, { useState, useEffect } from 'react';
import paymentService from '../services/paymentService';
import { toast } from 'react-toastify';
import { Modal, Button, Form } from 'react-bootstrap';
import { FaSyncAlt, FaSearch, FaCheckCircle, FaTimesCircle, FaCalendarAlt, FaUserMd, FaUser, FaMoneyBillWave } from 'react-icons/fa';
import './PaymentManagementPage.css';

const PaymentManagementPage = () => {
  // --- KHÔNG ĐỔI LOGIC STATE/EFFECT ---
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [filters, setFilters] = useState({
    status: 'all',
    method: 'all',
    page: 1,
    limit: 10
  });
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const [showModal, setShowModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [manualData, setManualData] = useState({ status: 'paid', admin_note: '', provider_ref: '' });

  useEffect(() => {
    fetchPayments();
  }, [filters]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await paymentService.getAllPayments(filters);
      if (res.data.success) {
        setPayments(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (error) {
      toast.error('Lỗi tải danh sách thanh toán');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckStatus = async (id) => {
    try {
      toast.info('Đang gửi yêu cầu đối soát sang VNPay...');
      const res = await paymentService.checkTransactionStatus(id);
      if (res.data.success) {
        if (res.data.isPaid) {
             toast.success(`✅ ĐỐI SOÁT THÀNH CÔNG! Giao dịch đã được thanh toán.`);
        } else {
             toast.warning(`⚠️ VNPay phản hồi: ${res.data.message}`);
        }
        fetchPayments();
      } else {
        toast.error(res.data.message);
      }
    } catch (error) {
      toast.error('Lỗi kết nối đối soát');
    }
  };

  const openVerifyModal = (payment) => {
    setSelectedPayment(payment);
    setManualData({ status: 'paid', admin_note: '', provider_ref: '' });
    setShowModal(true);
  };

  const handleManualVerify = async () => {
    try {
      const res = await paymentService.verifyManualPayment(selectedPayment.id, manualData);
      if (res.data.success) {
        toast.success('Đã cập nhật trạng thái thủ công');
        setShowModal(false);
        fetchPayments();
      }
    } catch (error) {
      toast.error('Lỗi cập nhật');
    }
  };

  // --- HÀM HELPER ĐỂ HIỂN THỊ (FIX LỖI HIỂN THỊ TẠI ĐÂY) ---
  
  // Helper: Lấy tên khách hàng an toàn (Fix lỗi mất tên)
  const getPatientName = (p) => {
    return p.patientName 
        || p.Appointment?.Patient?.User?.full_name 
        || p.Consultation?.Patient?.User?.full_name 
        || p.User?.full_name 
        || 'Khách vãng lai';
  };

  // Helper: Lấy tên bác sĩ an toàn
  const getDoctorName = (p) => {
    return p.doctorName 
        || p.Appointment?.Doctor?.User?.full_name 
        || p.Consultation?.Doctor?.User?.full_name 
        || 'Chưa chỉ định';
  };

  // Helper: Format ngày tháng (Fix lỗi Invalid Date)
  const formatDate = (dateString) => {
    if (!dateString) return '---';
    try {
        return new Date(dateString).toLocaleString('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    } catch (e) { return 'Lỗi ngày'; }
  };

  // --- RENDER GIAO DIỆN MỚI ---
  return (
    <div className="payment-management-page-container">
      
      {/* HEADER COMPACT */}
      <div className="payment-management-page-header">
        <h5 className="payment-management-page-title">
            <FaMoneyBillWave className="me-2"/> Quản Lý Giao Dịch & Đối Soát
        </h5>
        <button className="payment-management-page-refresh-btn" onClick={fetchPayments}>
            <FaSyncAlt className={loading ? "spin-icon" : ""} /> Làm mới
        </button>
      </div>

      {/* FILTER SECTION (NHỎ GỌN) */}
      <div className="payment-management-page-filter-card">
        <div className="row g-2 align-items-end">
          <div className="col-md-3 col-6">
            <label className="payment-management-page-label">Trạng thái</label>
            <select 
              className="payment-management-page-select"
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value, page: 1})}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="pending">⏳ Chờ xử lý</option>
              <option value="paid">✅ Đã thanh toán</option>
              <option value="failed">❌ Thất bại</option>
            </select>
          </div>
          <div className="col-md-3 col-6">
            <label className="payment-management-page-label">Phương thức</label>
            <select 
              className="payment-management-page-select"
              value={filters.method}
              onChange={(e) => setFilters({...filters, method: e.target.value, page: 1})}
            >
              <option value="all">Tất cả phương thức</option>
              <option value="vnpay">VNPay</option>
              <option value="momo">MoMo</option>
              <option value="bank_transfer">Chuyển khoản NH</option>
              <option value="cash">Tiền mặt</option>
            </select>
          </div>
          <div className="col-md-6">
             {/* Khoảng trống dự phòng cho search box sau này */}
          </div>
        </div>
      </div>

      {/* TABLE SECTION (COMPACT) */}
      <div className="payment-management-page-table-wrapper">
        <table className="payment-management-page-table">
            <thead>
              <tr>
                <th style={{width: '12%'}}>Mã GD</th>
                <th style={{width: '25%'}}>Thông tin Khách hàng & Dịch vụ</th>
                <th style={{width: '15%'}}>Số tiền</th>
                <th style={{width: '13%'}}>Phương thức</th>
                <th style={{width: '15%'}}>Ngày tạo</th>
                <th style={{width: '10%'}}>Trạng thái</th>
                <th style={{width: '10%'}} className="text-center">Xử lý</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="text-center py-5 text-muted">Đang tải dữ liệu...</td></tr>
              ) : payments.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-5 text-muted">Không có giao dịch nào</td></tr>
              ) : (
                payments.map(payment => (
                  <tr key={payment.id}>
                    {/* Cột 1: Mã GD */}
                    <td>
                      <div className="payment-management-page-code">{payment.code}</div>
                      <div className="payment-management-page-sub-text" title={payment.transaction_id}>
                        {payment.transaction_id ? `#${payment.transaction_id.slice(-6)}` : '---'}
                      </div>
                    </td>

                    {/* Cột 2: Thông tin (Đã sửa logic hiển thị) */}
                    <td>
                      <div className="d-flex align-items-center mb-1">
                        <FaUser className="payment-management-page-icon-user me-1"/>
                        <span className="payment-management-page-text-bold">{getPatientName(payment)}</span>
                      </div>
                      
                      <div className="d-flex align-items-center payment-management-page-sub-text">
                         <FaUserMd className="me-1 text-success"/> BS: {getDoctorName(payment)}
                      </div>
                      
                      <div className="payment-management-page-service-tag mt-1">
                        {payment.serviceName || (payment.type === 'Consultation' ? 'Tư vấn online' : 'Khám bệnh')}
                      </div>
                    </td>

                    {/* Cột 3: Số tiền (Nổi bật) */}
                    <td>
                      <div className="payment-management-page-amount">
                        {parseInt(payment.amount).toLocaleString('vi-VN')} đ
                      </div>
                    </td>

                    {/* Cột 4: Phương thức */}
                    <td>
                      <span className={`payment-management-page-badge-method method-${payment.method}`}>
                        {payment.method === 'bank_transfer' ? 'Chuyển khoản' : payment.method}
                      </span>
                    </td>

                    {/* Cột 5: Ngày tạo (Fix lỗi Invalid Date) */}
                    <td>
                        <div className="d-flex align-items-center payment-management-page-date">
                            <FaCalendarAlt className="me-2 opacity-50"/>
                            {/* Ưu tiên createdAt, fallback sang created_at */}
                            {formatDate(payment.createdAt || payment.created_at)}
                        </div>
                    </td>

                    {/* Cột 6: Trạng thái */}
                    <td>
                      <span className={`payment-management-page-badge-status status-${payment.status}`}>
                        {payment.status === 'pending' ? 'Chờ duyệt' : 
                         payment.status === 'paid' ? 'Thành công' : 
                         payment.status === 'failed' ? 'Thất bại' : payment.status}
                      </span>
                    </td>
                    
                    {/* Cột 7: Hành động */}
                    <td className="text-center">
                      {/* Logic nút bấm giữ nguyên, chỉ thay class */}
                      {(payment.method === 'vnpay' || payment.method === 'momo') && payment.status !== 'paid' && (
                        <button 
                          className="payment-management-page-action-btn btn-check"
                          onClick={() => handleCheckStatus(payment.id)}
                          title="Đối soát"
                        >
                          <FaSearch />
                        </button>
                      )}

                      {['bank_transfer', 'cash'].includes(payment.method) && payment.status === 'pending' && (
                        <button 
                          className="payment-management-page-action-btn btn-approve"
                          onClick={() => openVerifyModal(payment)}
                          title="Duyệt tay"
                        >
                          <FaCheckCircle />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
        </table>
        
        {/* PAGINATION COMPACT */}
        <div className="payment-management-page-pagination">
          <small className="text-muted">Tổng: <b>{pagination.total}</b> bản ghi</small>
          <div className="payment-management-page-pagination-controls">
             <button 
               disabled={filters.page <= 1}
               onClick={() => setFilters({...filters, page: filters.page - 1})}
             > &lt;
             </button>
             <span>{filters.page} / {pagination.totalPages}</span>
             <button 
               disabled={filters.page >= pagination.totalPages}
               onClick={() => setFilters({...filters, page: filters.page + 1})}
             > &gt;
             </button>
          </div>
        </div>
      </div>

      {/* MODAL DUYỆT TAY (Giữ logic, chỉ chỉnh lại class Bootstrap có sẵn) */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="sm" centered>
        <Modal.Header closeButton className="bg-light py-2">
          <Modal.Title className="fs-6 fw-bold text-success">Xác nhận thanh toán</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-3">
          <div className="mb-2 text-center">
            <h5 className="text-danger fw-bold m-0">{selectedPayment ? parseInt(selectedPayment.amount).toLocaleString() : 0} đ</h5>
            <small className="text-muted">{selectedPayment?.code}</small>
          </div>
          
          <Form.Group className="mb-2">
            <Form.Label className="small fw-bold">Hành động</Form.Label>
            <Form.Select 
              size="sm"
              value={manualData.status}
              onChange={(e) => setManualData({...manualData, status: e.target.value})}
            >
              <option value="paid">✅ Đã nhận tiền</option>
              <option value="failed">❌ Từ chối</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label className="small fw-bold">Mã tham chiếu NH</Form.Label>
            <Form.Control 
              size="sm"
              type="text" 
              placeholder="FTxxxx..."
              value={manualData.provider_ref}
              onChange={(e) => setManualData({...manualData, provider_ref: e.target.value})}
            />
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label className="small fw-bold">Ghi chú</Form.Label>
            <Form.Control 
              size="sm"
              as="textarea" 
              rows={2}
              value={manualData.admin_note}
              onChange={(e) => setManualData({...manualData, admin_note: e.target.value})}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className="py-1">
          <Button variant="secondary" size="sm" onClick={() => setShowModal(false)}>Đóng</Button>
          <Button variant="success" size="sm" onClick={handleManualVerify}>Lưu</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default PaymentManagementPage;