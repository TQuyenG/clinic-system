// client/src/pages/PaymentManagementPage.js
import React, { useState, useEffect } from 'react';
import paymentService from '../services/paymentService';
import { toast } from 'react-toastify';
import { Modal, Button, Form } from 'react-bootstrap';
import { FaSyncAlt, FaSearch, FaCheckCircle, FaTimesCircle, FaCalendarAlt, FaUserMd, FaUser, FaMoneyBillWave, FaEye, FaChevronLeft, FaChevronRight, FaCalendarDay, FaPrint } from 'react-icons/fa'; // Đã thêm FaPrint
import './PaymentManagementPage.css';

const PaymentManagementPage = () => {
  // --- KHÔNG ĐỔI LOGIC STATE/EFFECT ---
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // [ĐÃ SỬA] Hàm lấy ngày hôm nay
  const getToday = () => new Date().toISOString().split('T')[0];

  // [ĐÃ SỬA] Thêm trường date mặc định là hôm nay
  const [filters, setFilters] = useState({
    status: 'all',
    method: 'all',
    date: getToday(), 
    page: 1,
    limit: 10
  });

  // [MỚI] State cho in hóa đơn
  const [printData, setPrintData] = useState(null);

  // Hàm xử lý in
  const handlePrintInvoice = (payment) => {
    setPrintData(payment);
    // Đợi 1 chút để dữ liệu render vào khung in rồi mới gọi lệnh in
    setTimeout(() => {
        window.print();
    }, 500);
  };

  // [MỚI] State cho Modal chi tiết
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailData, setDetailData] = useState(null);
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

  // [MỚI] Xử lý nút mũi tên lùi ngày
  const handlePrevDay = () => {
    const current = new Date(filters.date || getToday());
    current.setDate(current.getDate() - 1);
    setFilters({ ...filters, date: current.toISOString().split('T')[0], page: 1 });
  };

  // [MỚI] Xử lý nút mũi tên tiến ngày
  const handleNextDay = () => {
    const current = new Date(filters.date || getToday());
    current.setDate(current.getDate() + 1);
    setFilters({ ...filters, date: current.toISOString().split('T')[0], page: 1 });
  };

  // [MỚI] Hàm mở xem chi tiết
  const handleViewDetail = (payment) => {
    setDetailData(payment);
    setShowDetailModal(true);
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
            <label className="payment-management-page-label">Ngày giao dịch</label>
            <div className="d-flex gap-2">
                <div className="input-group input-group-sm" style={{maxWidth: '300px'}}>
                    <button className="btn btn-outline-secondary" onClick={handlePrevDay} title="Ngày trước"><FaChevronLeft /></button>
                    <div className="position-relative flex-grow-1">
                        <input type="date" className="form-control form-control-sm text-center fw-bold"
                            value={filters.date}
                            onChange={(e) => setFilters({...filters, date: e.target.value, page: 1})} />
                    </div>
                    <button className="btn btn-outline-secondary" onClick={handleNextDay} title="Ngày sau"><FaChevronRight /></button>
                </div>
                <button className={`btn btn-sm ${!filters.date ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setFilters({...filters, date: '', page: 1})} title="Hiện toàn bộ lịch sử">
                    <FaCalendarDay /> Tất cả
                </button>
            </div>
          </div>
        </div>
      </div>

      {/* TABLE SECTION (COMPACT) */}
      <div className="payment-management-page-table-wrapper">
        <table className="payment-management-page-table">
            <thead>
              <tr>
                <th style={{width: '5%'}}>STT</th> {/* [MỚI] */}
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
                payments.map((payment, index) => (
                  <tr key={payment.id}>
                    {/* [MỚI] Cột STT tính theo trang */}
                    {/* [ĐÃ SỬA] Ép kiểu số để tránh lỗi cộng chuỗi gây sai STT */}
                    <td className="text-center fw-bold text-muted">
                        {(parseInt(filters.page || 1) - 1) * parseInt(filters.limit || 10) + index + 1}
                    </td>
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
                      <div className="d-flex justify-content-center gap-1">
                        {/* [MỚI] Nút In Hóa Đơn */}
                          <button className="payment-management-page-action-btn btn-print"
                            onClick={() => handlePrintInvoice(payment)} title="In Hóa Đơn">
                            <FaPrint />
                          </button>
                          {/* [MỚI] Nút Xem Chi Tiết */}
                          <button className="payment-management-page-action-btn btn-info text-white"
                            onClick={() => handleViewDetail(payment)} title="Xem chi tiết">
                            <FaEye />
                          </button>
                          </div>

                          {/* Các nút cũ giữ nguyên logic nhưng bọc trong div flex */}
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
      {/* [MỚI] MODAL CHI TIẾT */}
      <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="lg" centered>
        <Modal.Header closeButton className="bg-primary text-white py-2"><Modal.Title className="fs-6 fw-bold">Chi tiết thanh toán</Modal.Title></Modal.Header>
        <Modal.Body className="p-0">
            {detailData && (
                <div className="p-3">
                    <h6 className="fw-bold text-secondary border-bottom pb-2 mb-3">Thông tin bệnh nhân</h6>
                    <div className="row mb-3">
                        <div className="col-6"><small className="text-muted">Họ tên:</small> <strong>{getPatientName(detailData)}</strong></div>
                        <div className="col-6"><small className="text-muted">Mã hồ sơ:</small> <strong>{detailData.Appointment?.Patient?.User?.id || '---'}</strong></div>
                    </div>
                    <h6 className="fw-bold text-secondary border-bottom pb-2 mb-3 mt-4">Chi tiết dịch vụ</h6>
                    <table className="table table-bordered table-sm mb-0">
                        <thead className="table-light"><tr><th>Tên dịch vụ</th><th>Bác sĩ</th><th>Ngày khám</th><th className="text-end">Giá</th></tr></thead>
                        <tbody>
                            <tr>
                                <td><div className="fw-bold">{detailData.serviceName || detailData.Appointment?.Service?.name}</div></td>
                                <td>{getDoctorName(detailData)}</td>
                                <td>{formatDate(detailData.Appointment?.appointment_date)}</td>
                                <td className="text-end fw-bold text-danger">{parseInt(detailData.amount).toLocaleString()} đ</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}
        </Modal.Body>
        <Modal.Footer className="py-1"><Button variant="secondary" size="sm" onClick={() => setShowDetailModal(false)}>Đóng</Button></Modal.Footer>
      </Modal>
      {/* KHUNG IN HÓA ĐƠN (Chỉ hiện khi in) */}
      <div id="invoice-print-area" className="d-none d-print-block">
        {printData && (
            <div className="invoice-container p-4">
                <div className="text-center border-bottom pb-3 mb-3">
                    <h3 className="fw-bold m-0">PHÒNG KHÁM ĐA KHOA CLINIC SYSTEM</h3>
                    <p className="m-0 small">Địa chỉ: 123 Đường Nguyễn Văn Cừ, Quận 5, TP.HCM</p>
                    <p className="m-0 small">Hotline: 1900 1234 - Website: clinic-system.vn</p>
                    <h4 className="fw-bold mt-3">HÓA ĐƠN THANH TOÁN</h4>
                    <small>Mã HĐ: {printData.code}</small>
                </div>
                
                <div className="row mb-2">
                    <div className="col-6">Bệnh nhân: <strong>{getPatientName(printData)}</strong></div>
                    <div className="col-6 text-end">Ngày: {new Date().toLocaleDateString('vi-VN')}</div>
                </div>
                <div className="row mb-3">
                    <div className="col-12">Địa chỉ: {printData.Appointment?.Patient?.User?.address || printData.Appointment?.appointment_address || '---'}</div>
                    <div className="col-12">Bác sĩ: {getDoctorName(printData)}</div>
                </div>

                <table className="table table-bordered border-dark mb-3">
                    <thead>
                        <tr className="bg-light">
                            <th>Dịch vụ / Thuốc</th>
                            <th className="text-center">SL</th>
                            <th className="text-end">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>{printData.serviceName || 'Dịch vụ khám chữa bệnh'}</td>
                            <td className="text-center">1</td>
                            <td className="text-end">{parseInt(printData.amount).toLocaleString()} đ</td>
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan="2" className="fw-bold text-end">Tổng cộng:</td>
                            <td className="fw-bold text-end">{parseInt(printData.amount).toLocaleString()} đ</td>
                        </tr>
                        <tr>
                            <td colSpan="2" className="text-end">Thanh toán ({printData.method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'}):</td>
                            <td className="text-end">{parseInt(printData.amount).toLocaleString()} đ</td>
                        </tr>
                        <tr>
                            <td colSpan="2" className="text-end">Tiền thừa:</td>
                            <td className="text-end">0 đ</td>
                        </tr>
                    </tfoot>
                </table>

                <div className="text-center mt-5">
                    <p className="mb-5">Người lập phiếu</p>
                    <p className="fw-bold mt-5">Thu ngân viên</p>
                </div>
                <div className="text-center mt-3 fst-italic small">
                    (Cảm ơn quý khách và hẹn gặp lại!)
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default PaymentManagementPage;