// client/src/pages/PaymentManagementPage.js
import React, { useState, useEffect } from 'react';
import paymentService from '../services/paymentService';
import { toast } from 'react-toastify';
import { Modal, Button, Form } from 'react-bootstrap';
import { FaSyncAlt, FaSearch, FaCheckCircle, FaFilter, FaCalendarAlt, FaUserMd, FaUser, FaMoneyBillWave, FaEye, FaChevronLeft, FaChevronRight, FaCalendarDay, FaPrint } from 'react-icons/fa'; 
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
      || p.Consultation?.patient?.full_name 
      || p.Consultation?.Patient?.User?.full_name 
        || p.User?.full_name 
        || 'Khách vãng lai';
  };

  // Helper: Lấy tên bác sĩ an toàn
  const getDoctorName = (p) => {
    return p.doctorName 
        || p.Appointment?.Doctor?.User?.full_name 
      || p.Consultation?.doctor?.full_name 
      || p.Consultation?.Doctor?.User?.full_name 
        || 'Chưa chỉ định';
  };

  const getPaymentCode = (p) => {
    return p.Appointment?.code
      || p.Consultation?.consultation_code
      || p.code
      || '---';
  };

  const getPaymentDateTime = (p) => {
    return p.Appointment?.appointment_date
      || p.Consultation?.appointment_time
      || p.createdAt
      || p.created_at;
  };

  const getPaymentTypeLabel = (p) => {
    if (p.type === 'consultation' || p.Consultation) return 'Tư vấn online';
    if (p.type === 'appointment' || p.Appointment) return 'Khám bệnh';
    return 'Thanh toán';
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
            <FaMoneyBillWave className="pmp-me-2"/> Quản Lý Giao Dịch & Đối Soát
        </h5>
        <button className="payment-management-page-refresh-btn" onClick={fetchPayments}>
            <FaSyncAlt className={loading ? "pmp-spin-icon" : ""} /> Làm mới
        </button>
      </div>

      {/* FILTER SECTION */}
      <div className="payment-management-page-filter-card">
        <div className="pmp-filter-row">

          {/* Trạng thái */}
          <div className="pmp-filter-group">
            <label className="payment-management-page-label">
              <FaFilter className="pmp-me-1" /> Trạng thái
            </label>
            <select
              className="payment-management-page-select"
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value, page: 1})}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="pending">Chờ xử lý</option>
              <option value="paid">Đã thanh toán</option>
              <option value="failed">Thất bại</option>
            </select>
          </div>

          {/* Phương thức */}
          <div className="pmp-filter-group">
            <label className="payment-management-page-label">
              <FaMoneyBillWave className="pmp-me-1" /> Phương thức
            </label>
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

          {/* Ngày giao dịch */}
          <div className="pmp-filter-group pmp-filter-group--date">
            <label className="payment-management-page-label">
              <FaCalendarAlt className="pmp-me-1" /> Ngày giao dịch
            </label>
            <div className="pmp-date-navigator">
              <button className="pmp-date-nav-btn" onClick={handlePrevDay} title="Ngày trước">
                <FaChevronLeft />
              </button>
              <input
                type="date"
                className="pmp-date-input"
                value={filters.date}
                onChange={(e) => setFilters({...filters, date: e.target.value, page: 1})}
              />
              <button className="pmp-date-nav-btn" onClick={handleNextDay} title="Ngày sau">
                <FaChevronRight />
              </button>
              <button
                className={`pmp-date-all-btn${!filters.date ? ' pmp-date-all-btn--active' : ''}`}
                onClick={() => setFilters({...filters, date: '', page: 1})}
                title="Hiện toàn bộ lịch sử"
              >
                <FaCalendarDay className="pmp-me-1" /> Tất cả
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
                <th>STT</th>
                <th>Mã GD</th>
                <th>Khách hàng & Dịch vụ</th>
                <th>Số tiền</th>
                <th>Phương thức</th>
                <th>Ngày tạo</th>
                <th>Trạng thái</th>
                <th className="text-center">Xử lý</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="text-center py-5 pmp-text-muted">Đang tải dữ liệu...</td></tr>
              ) : payments.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-5 pmp-text-muted">Không có giao dịch nào</td></tr>
              ) : (
                payments.map((payment, index) => (
                  <tr key={payment.id}>
                    {/* [MỚI] Cột STT tính theo trang */}
                    {/* [ĐÃ SỬA] Ép kiểu số để tránh lỗi cộng chuỗi gây sai STT */}
                    <td data-label="STT" className="text-center pmp-fw-bold pmp-text-muted">
                        {(parseInt(filters.page || 1) - 1) * parseInt(filters.limit || 10) + index + 1}
                    </td>
                    {/* Cột 1: Mã GD */}
                    <td data-label="Mã GD">
                      <div className="payment-management-page-code">{payment.code}</div>
                      <div className="payment-management-page-sub-text" title={payment.transaction_id}>
                        {payment.transaction_id ? `#${payment.transaction_id.slice(-6)}` : '---'}
                      </div>
                    </td>

                    {/* Cột 2: Thông tin (Đã sửa logic hiển thị) */}
                    <td data-label="Khách hàng">
                      <div className="pmp-d-flex pmp-align-items-center pmp-mb-1">
                        <FaUser className="payment-management-page-icon-user pmp-me-1"/>
                        <span className="payment-management-page-text-bold">{getPatientName(payment)}</span>
                      </div>
                      
                      <div className="pmp-d-flex pmp-align-items-center payment-management-page-sub-text">
                         <FaUserMd className="pmp-me-1 pmp-text-success"/> BS: {getDoctorName(payment)}
                      </div>
                      
                      <div className="payment-management-page-service-tag mt-1">
                        {payment.serviceName || getPaymentTypeLabel(payment)}
                      </div>
                    </td>

                    {/* Cột 3: Số tiền (Nổi bật) */}
                    <td data-label="Số tiền">
                      <div className="payment-management-page-amount">
                        {parseInt(payment.amount).toLocaleString('vi-VN')} đ
                      </div>
                    </td>

                    {/* Cột 4: Phương thức */}
                    <td data-label="Phương thức">
                      <span className={`payment-management-page-badge-method method-${payment.method}`}>
                        {payment.method === 'bank_transfer' ? 'Chuyển khoản' : payment.method}
                      </span>
                    </td>

                    {/* Cột 5: Ngày tạo (Fix lỗi Invalid Date) */}
                    <td data-label="Ngày tạo">
                        <div className="pmp-d-flex pmp-align-items-center payment-management-page-date">
                            <FaCalendarAlt className="pmp-me-2 pmp-opacity-50"/>
                            {/* Ưu tiên createdAt, fallback sang created_at */}
                            {formatDate(payment.createdAt || payment.created_at)}
                        </div>
                    </td>

                    {/* Cột 6: Trạng thái */}
                    <td data-label="Trạng thái">
                      <span className={`payment-management-page-badge-status status-${payment.status}`}>
                        {payment.status === 'pending' ? 'Chờ duyệt' : 
                         payment.status === 'paid' ? 'Thành công' : 
                         payment.status === 'failed' ? 'Thất bại' : payment.status}
                      </span>
                    </td>
                    
                    {/* Cột 7: Hành động */}
                    <td className="text-center">
                      <div className="pmp-d-flex justify-content-center pmp-gap-1">
                        {/* Nút In Hóa Đơn */}
                          <button className="payment-management-page-action-btn pmp-btn-print"
                            onClick={() => handlePrintInvoice(payment)} title="In Hóa Đơn">
                            <FaPrint />
                            <span className="pmp-btn-label">In</span>
                          </button>
                          {/* Nút Xem Chi Tiết */}
                          <button className="payment-management-page-action-btn pmp-btn-view-detail"
                            onClick={() => handleViewDetail(payment)} title="Xem chi tiết">
                            <FaEye />
                            <span className="pmp-btn-label">Chi tiết</span>
                          </button>
                          </div>

                          {/* Các nút cũ giữ nguyên logic nhưng bọc trong div flex */}
                          {(payment.method === 'vnpay' || payment.method === 'momo') && payment.status !== 'paid' && (
                        <button 
                          className="payment-management-page-action-btn pmp-btn-check"
                          onClick={() => handleCheckStatus(payment.id)}
                          title="Đối soát VNPay/MoMo"
                        >
                          <FaSearch />
                          <span className="pmp-btn-label">Đối soát</span>
                        </button>
                      )}

                      {['bank_transfer', 'cash'].includes(payment.method) && payment.status === 'pending' && (
                        <button 
                          className="payment-management-page-action-btn pmp-btn-approve"
                          onClick={() => openVerifyModal(payment)}
                          title="Duyệt thủ công"
                        >
                          <FaCheckCircle />
                          <span className="pmp-btn-label">Duyệt</span>
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
          <small className="pmp-text-muted">Tổng: <b>{pagination.total}</b> bản ghi</small>
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
          <Modal.Title className="fs-6 pmp-fw-bold pmp-text-success">Xác nhận thanh toán</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-3">
          <div className="mb-2 text-center">
            <h5 className="pmp-text-danger pmp-fw-bold m-0">{selectedPayment ? parseInt(selectedPayment.amount).toLocaleString() : 0} đ</h5>
            <small className="pmp-text-muted">{selectedPayment?.code}</small>
          </div>
          
          <Form.Group className="mb-2">
            <Form.Label className="pmp-small pmp-fw-bold">Hành động</Form.Label>
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
            <Form.Label className="pmp-small pmp-fw-bold">Mã tham chiếu NH</Form.Label>
            <Form.Control 
              size="sm"
              type="text" 
              placeholder="FTxxxx..."
              value={manualData.provider_ref}
              onChange={(e) => setManualData({...manualData, provider_ref: e.target.value})}
            />
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label className="pmp-small pmp-fw-bold">Ghi chú</Form.Label>
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
        <Modal.Header closeButton className="bg-primary text-white py-2"><Modal.Title className="fs-6 pmp-fw-bold">Chi tiết thanh toán</Modal.Title></Modal.Header>
        <Modal.Body className="p-0">
            {detailData && (
                <div className="p-3">
                    <h6 className="pmp-fw-bold text-secondary border-bottom pb-2 mb-3">Thông tin bệnh nhân</h6>
                    <div className="row mb-3">
                        <div className="col-6"><small className="pmp-text-muted">Họ tên:</small> <strong>{getPatientName(detailData)}</strong></div>
                        <div className="col-6"><small className="pmp-text-muted">Mã hồ sơ:</small> <strong>{detailData.Appointment?.Patient?.User?.id || detailData.Consultation?.patient?.id || '---'}</strong></div>
                    </div>
                    <h6 className="pmp-fw-bold text-secondary border-bottom pb-2 mb-3 mt-4">Chi tiết dịch vụ</h6>
                    <table className="table table-bordered table-sm mb-0">
                        <thead className="table-light"><tr><th>Tên dịch vụ</th><th>Bác sĩ</th><th>Ngày khám</th><th className="text-end">Giá</th></tr></thead>
                        <tbody>
                            <tr>
                                <td><div className="pmp-fw-bold">{detailData.serviceName || detailData.Appointment?.Service?.name || (detailData.Consultation ? (detailData.Consultation.consultation_type === 'video' ? 'Tư vấn video' : 'Tư vấn online') : 'Dịch vụ thanh toán')}</div></td>
                                <td>{getDoctorName(detailData)}</td>
                                <td>{formatDate(getPaymentDateTime(detailData))}</td>
                                <td className="text-end pmp-fw-bold pmp-text-danger">{parseInt(detailData.amount).toLocaleString()} đ</td>
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
                    <h3 className="pmp-fw-bold m-0">PHÒNG KHÁM ĐA KHOA EASY MEDIFY</h3>
                    <p className="m-0 pmp-small">Địa chỉ: 123 Đường Nguyễn Văn Cừ, Quận 5, TP.HCM</p>
                    <p className="m-0 pmp-small">Hotline: 1900 1234 - Website: easymedify.vn</p>
                    <h4 className="pmp-fw-bold mt-3">HÓA ĐƠN THANH TOÁN</h4>
                    <small>Mã HĐ: {getPaymentCode(printData)}</small>
                </div>
                
                <div className="row mb-2">
                    <div className="col-6">Bệnh nhân: <strong>{getPatientName(printData)}</strong></div>
                    <div className="col-6 text-end">Ngày: {new Date().toLocaleDateString('vi-VN')}</div>
                </div>
                <div className="row mb-3">
                    <div className="col-12">Địa chỉ: {printData.Appointment?.Patient?.User?.address || printData.Consultation?.patient?.address || printData.Appointment?.appointment_address || '---'}</div>
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
                            <td colSpan="2" className="pmp-fw-bold text-end">Tổng cộng:</td>
                            <td className="pmp-fw-bold text-end">{parseInt(printData.amount).toLocaleString()} đ</td>
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
                    <p className="pmp-fw-bold mt-5">Thu ngân viên</p>
                </div>
                <div className="text-center mt-3 fst-italic pmp-small">
                    (Cảm ơn quý khách và hẹn gặp lại!)
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default PaymentManagementPage;