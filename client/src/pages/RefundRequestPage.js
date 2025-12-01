// client/src/pages/RefundRequestPage.js
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import systemService from '../services/systemService'; // Đảm bảo service này đã có các hàm getRefundRequests...
import { FaSearch, FaCheckCircle, FaTimesCircle, FaEye, FaFileUpload, FaHistory, FaMoneyBillWave } from 'react-icons/fa';
import { Modal, Button, Form, Tab, Tabs, Badge } from 'react-bootstrap';

const RefundRequestPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('pending'); // pending, completed, rejected
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);
  const [processData, setProcessData] = useState({
    refund_ref: '', // Mã giao dịch ngân hàng
    admin_note: '',
    proof_file: null // File ảnh
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [filterStatus]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      // Giả sử API hỗ trợ filter params
      const res = await systemService.getRefundRequests({ status: filterStatus });
      if (res.success) {
        setRequests(res.data);
      }
    } catch (error) {
      console.error(error);
      // Mock data nếu chưa có API chạy thật để test giao diện
      setRequests([]); 
    } finally {
      setLoading(false);
    }
  };

  const handleOpenProcess = (req) => {
    setSelectedReq(req);
    setProcessData({ refund_ref: '', admin_note: '', proof_file: null });
    setShowModal(true);
  };

  const handleProcessSubmit = async (status) => {
    if (status === 'completed' && !processData.refund_ref) {
      return toast.warning('Vui lòng nhập mã tham chiếu ngân hàng (Ref No)');
    }
    
    setSubmitting(true);
    try {
      // Gọi API duyệt (Cần implement trong systemService sau)
      const payload = {
        status,
        refund_ref: processData.refund_ref,
        admin_note: processData.admin_note,
        // proof_file xử lý upload riêng hoặc gửi formData
      };
      
      await systemService.processRefund(selectedReq.id, payload);
      toast.success(status === 'completed' ? 'Đã xác nhận hoàn tiền!' : 'Đã từ chối yêu cầu');
      setShowModal(false);
      fetchRequests();
    } catch (error) {
      toast.error('Lỗi khi xử lý');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

  return (
    <div className="container-fluid p-4">
      <h3 className="mb-4 text-primary fw-bold"><FaMoneyBillWave /> Quản Lý Yêu Cầu Hoàn Tiền</h3>

      <div className="card shadow-sm">
        <div className="card-header bg-white">
          <Tabs
            activeKey={filterStatus}
            onSelect={(k) => setFilterStatus(k)}
            className="mb-0"
          >
            <Tab eventKey="pending" title="⏳ Chờ xử lý" />
            <Tab eventKey="completed" title="✅ Đã hoàn tất" />
            <Tab eventKey="rejected" title="❌ Đã từ chối" />
          </Tabs>
        </div>
        
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light">
                <tr>
                  <th>Mã đơn</th>
                  <th>Khách hàng</th>
                  <th>Số tiền hoàn</th>
                  <th>Ngân hàng nhận</th>
                  <th>Lý do hủy</th>
                  <th>Ngày yêu cầu</th>
                  <th className="text-end">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" className="text-center py-4">Đang tải dữ liệu...</td></tr>
                ) : requests.length === 0 ? (
                  <tr><td colSpan="7" className="text-center py-4 text-muted">Không có dữ liệu</td></tr>
                ) : (
                  requests.map(req => (
                    <tr key={req.id}>
                      <td>#{req.id}</td>
                      <td>
                        <div className="fw-bold">{req.User?.full_name}</div>
                        <small className="text-muted">{req.User?.phone}</small>
                      </td>
                      <td>
                        <div className="text-danger fw-bold">{formatCurrency(req.refund_amount)}</div>
                        <small className="text-muted text-decoration-line-through">{formatCurrency(req.amount_original)}</small>
                      </td>
                      <td>
                        <div className="small">
                          <strong>{req.bank_info_snapshot?.bank_name}</strong><br/>
                          {req.bank_info_snapshot?.account_no}<br/>
                          {req.bank_info_snapshot?.account_name}
                        </div>
                      </td>
                      <td><small>{req.reason}</small></td>
                      <td>{new Date(req.created_at).toLocaleDateString('vi-VN')}</td>
                      <td className="text-end">
                        {filterStatus === 'pending' ? (
                          <Button variant="primary" size="sm" onClick={() => handleOpenProcess(req)}>
                            Xử lý
                          </Button>
                        ) : (
                          <Button variant="outline-secondary" size="sm">
                            <FaEye /> Chi tiết
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL XỬ LÝ */}
      <Modal show={showModal} onHide={() => setShowModal(false)} backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>Xử lý hoàn tiền #{selectedReq?.id}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="alert alert-info">
            <strong>Thông tin chuyển khoản:</strong><br/>
            Ngân hàng: {selectedReq?.bank_info_snapshot?.bank_name}<br/>
            STK: <span className="user-select-all fw-bold">{selectedReq?.bank_info_snapshot?.account_no}</span><br/>
            Tên: {selectedReq?.bank_info_snapshot?.account_name}<br/>
            Số tiền cần chuyển: <strong className="text-danger fs-5">{selectedReq && formatCurrency(selectedReq.refund_amount)}</strong>
          </div>

          <Form.Group className="mb-3">
            <Form.Label>Mã giao dịch ngân hàng (Ref No)</Form.Label>
            <Form.Control 
              type="text" 
              placeholder="VD: FT2332..." 
              value={processData.refund_ref}
              onChange={(e) => setProcessData({...processData, refund_ref: e.target.value})}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Ảnh biên lai (Tùy chọn)</Form.Label>
            <Form.Control type="file" size="sm" />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Ghi chú nội bộ</Form.Label>
            <Form.Control 
              as="textarea" rows={2}
              value={processData.admin_note}
              onChange={(e) => setProcessData({...processData, admin_note: e.target.value})}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="danger" disabled={submitting} onClick={() => handleProcessSubmit('rejected')}>
            Từ chối hoàn
          </Button>
          <Button variant="success" disabled={submitting} onClick={() => handleProcessSubmit('completed')}>
            <FaCheckCircle /> Xác nhận đã chuyển
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default RefundRequestPage;