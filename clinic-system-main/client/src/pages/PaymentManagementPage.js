// client/src/pages/PaymentManagementPage.js
import React, { useState, useEffect } from 'react';
import paymentService from '../services/paymentService';
import { toast } from 'react-toastify';
import { Modal, Button, Form } from 'react-bootstrap'; // Đảm bảo project có cài react-bootstrap
import './PaymentManagementPage.css';

const PaymentManagementPage = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter state
  const [filters, setFilters] = useState({
    status: 'all',
    method: 'all',
    page: 1,
    limit: 10
  });
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Modal state cho duyệt tay
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

  // --- 1. CHỨC NĂNG ĐỐI SOÁT (DÙNG CHO VNPAY) ---
  const handleCheckStatus = async (id) => {
    try {
      toast.info('Đang gửi yêu cầu đối soát sang VNPay...');
      const res = await paymentService.checkTransactionStatus(id);
      
      if (res.data.success) {
        // Nếu tìm thấy giao dịch
        if (res.data.isPaid) {
             toast.success(`✅ ĐỐI SOÁT THÀNH CÔNG! Giao dịch đã được thanh toán.`);
        } else {
             toast.warning(`⚠️ VNPay phản hồi: ${res.data.message} (Khách chưa trả tiền hoặc lỗi)`);
        }
        // Reload lại list để cập nhật trạng thái mới nhất
        fetchPayments();
      } else {
        toast.error(res.data.message);
      }
    } catch (error) {
      toast.error('Lỗi kết nối đối soát');
    }
  };

  // --- 2. CHỨC NĂNG DUYỆT TAY (DÙNG CHO BANK TRANSFER) ---
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

  // Render Badge
  const getStatusBadge = (status) => {
    const labels = {
      pending: 'Chờ xử lý',
      paid: 'Đã thanh toán',
      failed: 'Thất bại',
      refunded: 'Đã hoàn tiền'
    };
    return <span className={`badge-status ${status}`}>{labels[status] || status}</span>;
  };

  return (
    <div className="payment-management-container">
      <h2 className="mb-4 text-primary">💳 Quản Lý Giao Dịch & Đối Soát</h2>

      {/* FILTER BAR */}
      <div className="payment-filter-card">
        <div className="row g-3">
          <div className="col-md-3">
            <label className="form-label fw-bold">Trạng thái</label>
            <select 
              className="form-select"
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value, page: 1})}
            >
              <option value="all">Tất cả</option>
              <option value="pending">Chờ xử lý (Pending)</option>
              <option value="paid">Thành công (Paid)</option>
              <option value="failed">Thất bại (Failed)</option>
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label fw-bold">Phương thức</label>
            <select 
              className="form-select"
              value={filters.method}
              onChange={(e) => setFilters({...filters, method: e.target.value, page: 1})}
            >
              <option value="all">Tất cả</option>
              <option value="vnpay">VNPay</option>
              <option value="momo">MoMo</option>
              <option value="bank_transfer">Chuyển khoản NH</option>
              <option value="cash">Tiền mặt</option>
            </select>
          </div>
          <div className="col-md-6 d-flex align-items-end justify-content-end">
            <button className="btn btn-outline-secondary" onClick={fetchPayments}>
              🔄 Làm mới
            </button>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="payment-table-card">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="bg-light">
              <tr>
                <th>Mã GD</th>
                <th>Khách hàng</th>
                <th>Số tiền</th>
                <th>Phương thức</th>
                <th>Ngày tạo</th>
                <th>Trạng thái</th>
                <th className="text-end">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="text-center py-4">Đang tải dữ liệu...</td></tr>
              ) : payments.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-4">Chưa có giao dịch nào</td></tr>
              ) : (
                payments.map(payment => (
                  <tr key={payment.id}>
                    <td>
                      <div className="fw-bold text-primary">{payment.code}</div>
                      <small className="text-muted" style={{fontSize: '0.75rem'}}>
                        {payment.transaction_id || '(Chưa có TransID)'}
                      </small>
                    </td>
                    <td>
                      <div className="fw-bold text-dark">{payment.patientName}</div>
                      
                      {/* Hiển thị Mã đơn hàng */}
                      <div className="small text-muted mb-1">
                        {payment.type === 'Lịch hẹn' ? (
                            <><i className="bi bi-calendar-event me-1"></i> {payment.Appointment?.code}</>
                        ) : (
                            <><i className="bi bi-chat-dots me-1"></i> {payment.Consultation?.consultation_code || 'Tư vấn'}</>
                        )}
                      </div>

                      {/* Hiển thị Bác sĩ & Dịch vụ */}
                      <div className="small text-primary" style={{fontSize: '0.8rem', fontStyle: 'italic'}}>
                        <i className="bi bi-person-badge me-1"></i> BS: {payment.doctorName}
                      </div>
                      <div className="small text-secondary" style={{fontSize: '0.75rem'}}>
                         {payment.serviceName}
                      </div>
                    </td>
                    <td className="fw-bold text-danger">
                      {parseInt(payment.amount).toLocaleString('vi-VN')} đ
                    </td>
                    <td>
                      <span className={`badge-method ${payment.method}`}>
                        {payment.method === 'bank_transfer' ? 'Chuyển khoản' : payment.method}
                      </span>
                    </td>
                    <td>{new Date(payment.created_at).toLocaleString('vi-VN')}</td>
                    <td>{getStatusBadge(payment.status)}</td>
                    
                    <td className="text-end">
                      {/* LOGIC HIỂN THỊ NÚT HÀNH ĐỘNG */}
                      
                      {/* 1. Nút ĐỐI SOÁT: Chỉ hiện với VNPay/MoMo khi chưa thành công */}
                      {(payment.method === 'vnpay') && payment.status !== 'paid' && (
                        <button 
                          className="btn btn-sm btn-check-status me-2"
                          onClick={() => handleCheckStatus(payment.id)}
                          title="Kiểm tra trạng thái thực tế từ cổng thanh toán"
                        >
                          🔍 Đối soát
                        </button>
                      )}

                      {/* 2. Nút DUYỆT TAY: Hiện với Bank Transfer/Cash khi đang Pending */}
                      {['bank_transfer', 'cash'].includes(payment.method) && payment.status === 'pending' && (
                        <button 
                          className="btn btn-sm btn-success me-2"
                          onClick={() => openVerifyModal(payment)}
                        >
                          ✍️ Duyệt
                        </button>
                      )}

                      {/* 3. Nút Xem chi tiết (Có thể làm thêm modal view detail) */}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="d-flex justify-content-between align-items-center p-3 border-top">
          <span className="text-muted">Tổng: {pagination.total} giao dịch</span>
          <div>
             <button 
               className="btn btn-sm btn-outline-primary me-1"
               disabled={filters.page <= 1}
               onClick={() => setFilters({...filters, page: filters.page - 1})}
             > Trước
             </button>
             <span className="mx-2">Trang {filters.page} / {pagination.totalPages}</span>
             <button 
               className="btn btn-sm btn-outline-primary ms-1"
               disabled={filters.page >= pagination.totalPages}
               onClick={() => setFilters({...filters, page: filters.page + 1})}
             > Sau
             </button>
          </div>
        </div>
      </div>

      {/* MODAL DUYỆT TAY (Manual Verify) */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Xác nhận thanh toán thủ công</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Mã GD: <strong>{selectedPayment?.code}</strong></p>
          <p>Số tiền: <strong>{selectedPayment ? parseInt(selectedPayment.amount).toLocaleString() : 0} đ</strong></p>
          
          <Form.Group className="mb-3">
            <Form.Label>Hành động</Form.Label>
            <Form.Select 
              value={manualData.status}
              onChange={(e) => setManualData({...manualData, status: e.target.value})}
            >
              <option value="paid">✅ Xác nhận ĐÃ NHẬN TIỀN</option>
              <option value="failed">❌ Từ chối / Không nhận được</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Mã giao dịch ngân hàng (Nếu có)</Form.Label>
            <Form.Control 
              type="text" 
              placeholder="VD: FT23123456789"
              value={manualData.provider_ref}
              onChange={(e) => setManualData({...manualData, provider_ref: e.target.value})}
            />
            <Form.Text className="text-muted">Nhập mã tham chiếu từ App ngân hàng để dễ đối chiếu sau này.</Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Ghi chú Admin</Form.Label>
            <Form.Control 
              as="textarea" 
              rows={2}
              value={manualData.admin_note}
              onChange={(e) => setManualData({...manualData, admin_note: e.target.value})}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Đóng</Button>
          <Button variant="primary" onClick={handleManualVerify}>Lưu xác nhận</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default PaymentManagementPage;