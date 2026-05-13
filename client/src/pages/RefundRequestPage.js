// client/src/pages/RefundRequestPage.js
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import systemService from '../services/systemService';
import { 
  FaSearch, FaFilter, FaMoneyBillWave, FaEye, FaCheck, FaTimes, 
  FaQrcode, FaFileUpload, FaPaperPlane, FaUserCheck 
} from 'react-icons/fa';
import './RefundRequestPage.css'; // Import CSS mới

const RefundRequestPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [filterStatus, setFilterStatus] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);
  const [step, setStep] = useState(1); // 1: Review/QR, 2: Upload Proof
  
  // Process Data
  const [processData, setProcessData] = useState({
    refund_ref: '',
    admin_note: '',
    proof_file: null
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [filterStatus]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await systemService.getRefundRequests({ status: filterStatus });
      setRequests(res.success && Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error(error);
      toast.error('Lỗi tải dữ liệu');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter Logic
  const getRequestCode = (req) => {
    return req.Payment?.Appointment?.code
      || req.Payment?.Consultation?.consultation_code
      || req.Appointment?.code
      || req.Consultation?.consultation_code
      || req.id.toString();
  };

  const filteredRequests = requests.filter(req => {
    const term = searchTerm.toLowerCase();
    const code = getRequestCode(req);
    const user = req.User?.full_name?.toLowerCase() || '';
    return code.toLowerCase().includes(term) || user.includes(term);
  });

  // Action Handlers
  const handleOpenProcess = (req) => {
    setSelectedReq(req);
    setStep(1); // Reset về bước 1
    setProcessData({ refund_ref: '', admin_note: '', proof_file: null });
    setShowModal(true);
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setProcessData({ ...processData, proof_file: e.target.files[0] });
    }
  };

  const handleSubmit = async (action) => {
    if (action === 'completed') {
      if (!processData.refund_ref) return toast.warning('Vui lòng nhập mã giao dịch tham chiếu!');
      if (!processData.proof_file) return toast.warning('Vui lòng tải lên ảnh biên lai chuyển tiền!');
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('status', action);
      formData.append('admin_note', processData.admin_note);
      if (action === 'completed') {
        formData.append('refund_ref', processData.refund_ref);
        formData.append('proof_image', processData.proof_file);
      }

      // Gọi API xử lý (sẽ viết ở phần Backend)
      await systemService.processRefund(selectedReq.id, formData);
      
      toast.success(action === 'completed' ? '✅ Đã hoàn tiền & gửi mail cho khách!' : '🚫 Đã từ chối yêu cầu');
      setShowModal(false);
      fetchRequests();
    } catch (error) {
      console.error(error);
      toast.error('Lỗi khi xử lý yêu cầu');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper: Tạo link QR VietQR
  const getQRLink = (req) => {
    if (!req?.bank_info_snapshot) return null;
    let { bank_name, account_no, account_name } = req.bank_info_snapshot;
    
    // Fallback: Parse từ raw_text nếu là object
    if (!account_no && req.bank_info_snapshot.raw_text) {
       // Logic parse tạm thời hoặc trả về null để user tự nhập
       return null; 
    }
    
    // Note: Cần mapping Bank Name sang BIN code chuẩn VietQR. 
    // Ở đây dùng tên ngân hàng làm placeholder, hệ thống VietQR có thể tự nhận diện hoặc cần Bin code chính xác.
    // Tốt nhất là dùng Bin Code. Nếu không có, hiển thị thông tin text.
    // Demo link (cần BinID chính xác để hoạt động hoàn hảo):
    const binId = '970436'; // VD: VCB. Thực tế cần map từ bank_name
    const amount = req.refund_amount;
    const desc = `Hoan tien don ${getRequestCode(req)}`;
    return `https://img.vietqr.io/image/${binId}-${account_no}-compact.png?amount=${amount}&addInfo=${encodeURIComponent(desc)}&accountName=${encodeURIComponent(account_name)}`;
  };

  const formatCurrency = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  const formatDate = (date) => new Date(date).toLocaleDateString('vi-VN') + ' ' + new Date(date).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'});

  return (
    <div className="refund-request-page-container">
      <div className="refund-request-page-header">
        <div className="refund-request-page-title"><FaMoneyBillWave /> Quản Lý Yêu Cầu Hoàn Tiền</div>
        <div className="refund-request-page-filter-bar" style={{margin:0}}>
           {/* Quick Status Tabs */}
           {['pending', 'completed', 'rejected'].map(status => (
             <button 
               key={status}
               className={`refund-request-page-btn-filter ${filterStatus === status ? 'active' : ''}`}
               onClick={() => setFilterStatus(status)}
             >
               {status === 'pending' ? '⏳ Chờ xử lý' : status === 'completed' ? '✅ Đã hoàn tất' : '❌ Đã từ chối'}
             </button>
           ))}
        </div>
      </div>

      <div className="refund-request-page-filter-bar">
        <FaSearch className="text-muted" />
        <input 
          type="text" 
          placeholder="Tìm theo mã đơn, tên khách..." 
          className="refund-request-page-input" 
          style={{width: '250px'}}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div style={{flex:1}}></div>
        <span className="text-muted" style={{fontSize:'12px'}}>Hiển thị: <b>{filteredRequests.length}</b> yêu cầu</span>
      </div>

      <div className="refund-request-page-table-wrapper">
        <table className="refund-request-page-table">
          <thead>
            <tr>
              <th>Mã đơn</th>
              <th>Khách hàng</th>
              <th>Số tiền hoàn</th>
              <th>Ngân hàng nhận</th>
              <th>Lý do hủy</th>
              <th>Người duyệt</th>
              <th>Ngày tạo / Xử lý</th>
              <th className="text-end">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" className="text-center py-5">Đang tải dữ liệu...</td></tr>
            ) : filteredRequests.length === 0 ? (
              <tr><td colSpan="8" className="text-center py-5 text-muted">Không tìm thấy dữ liệu phù hợp</td></tr>
            ) : (
              filteredRequests.map(req => (
                <tr key={req.id}>
                  <td>
                      <span style={{fontWeight:'bold', color:'#3b82f6'}}>#{getRequestCode(req)}</span>
                  </td>
                  <td>
                    <div style={{fontWeight:600}}>{req.User?.full_name}</div>
                    <div style={{fontSize:'11px', color:'#666'}}>{req.User?.email}</div>
                  </td>
                  <td>
                    <div className="refund-request-page-amount">{formatCurrency(req.refund_amount)}</div>
                    {req.penalty_fee > 0 && <div style={{fontSize:'11px', color:'#ef4444'}}>Phí phạt: -{formatCurrency(req.penalty_fee)}</div>}
                  </td>
                  <td>
                    <div style={{fontSize:'12px', lineHeight:'1.4'}}>
                      <b>{req.bank_info_snapshot?.bank_name || 'N/A'}</b><br/>
                      {req.bank_info_snapshot?.account_no}<br/>
                      <span style={{textTransform:'uppercase'}}>{req.bank_info_snapshot?.account_name}</span>
                    </div>
                  </td>
                  <td style={{maxWidth:'200px'}}>
                    <div style={{fontSize:'12px', color:'#4b5563', maxHeight:'40px', overflow:'hidden'}} title={req.reason}>
                      {req.reason}
                    </div>
                  </td>
                  <td>
                    {req.processed_by ? (
                       <div style={{display:'flex', alignItems:'center', gap:'4px'}}>
                         <FaUserCheck color="#10b981"/> <span>Admin {req.processed_by}</span>
                       </div>
                    ) : '-'}
                  </td>
                  <td>
                    <div style={{fontSize:'11px'}}>Tạo: {formatDate(req.created_at)}</div>
                    {req.updated_at !== req.created_at && (
                      <div style={{fontSize:'11px', color:'#059669'}}>Xử lý: {formatDate(req.updated_at)}</div>
                    )}
                  </td>
                  <td className="text-end">
                    {req.status === 'pending' ? (
                      <button className="refund-request-page-btn-action btn-process" onClick={() => handleOpenProcess(req)}>
                        <FaMoneyBillWave /> Xử lý
                      </button>
                    ) : (
                      <button className="refund-request-page-btn-action btn-view" onClick={() => handleOpenProcess(req)}>
                        <FaEye /> Chi tiết
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL XỬ LÝ HOÀN TIỀN */}
      {showModal && selectedReq && (
        <div className="refund-request-page-modal-overlay">
          <div className="refund-request-page-modal">
            <div className="refund-request-page-modal-header">
              <div className="refund-request-page-modal-title">
                {selectedReq.status === 'pending' ? '⚡ Xử Lý Hoàn Tiền' : 'ℹ️ Chi Tiết Yêu Cầu'} #{selectedReq.id}
              </div>
              <button className="refund-request-page-modal-close" onClick={() => setShowModal(false)}><FaTimes/></button>
            </div>
            
            <div className="refund-request-page-modal-body">
              {/* Thông tin chuyển khoản & QR */}
              {selectedReq.status === 'pending' && (
                <div className="refund-request-page-qr-section">
                   {/* Placeholder QR - Thực tế cần tích hợp API VietQR chính xác */}
                   <div style={{textAlign:'center'}}>
                      <div className="refund-request-page-qr-img" style={{display:'flex', alignItems:'center', justifyContent:'center', background:'#fff'}}>
                         <FaQrcode size={40} color="#cbd5e1"/>
                         <div style={{fontSize:'10px', marginTop:'5px'}}>Quét mã chuyển khoản</div>
                      </div>
                   </div>
                   <div style={{flex:1}}>
                      <h4 style={{margin:'0 0 10px 0', fontSize:'14px', color:'#1e40af'}}>Thông tin chuyển khoản:</h4>
                      <div className="refund-request-page-info-grid">
                        <div>
                          <div className="refund-request-page-info-label">Ngân hàng</div>
                          <div className="refund-request-page-info-val">{selectedReq.bank_info_snapshot?.bank_name || selectedReq.bank_info_snapshot?.raw_text}</div>
                        </div>
                        <div>
                          <div className="refund-request-page-info-label">Số tiền hoàn</div>
                          <div className="refund-request-page-info-val" style={{color:'#ef4444', fontSize:'15px'}}>{formatCurrency(selectedReq.refund_amount)}</div>
                        </div>
                        <div>
                          <div className="refund-request-page-info-label">Số tài khoản</div>
                          <div className="refund-request-page-info-val text-primary" style={{fontSize:'14px'}}>{selectedReq.bank_info_snapshot?.account_no || '---'}</div>
                        </div>
                        <div>
                          <div className="refund-request-page-info-label">Chủ tài khoản</div>
                          <div className="refund-request-page-info-val text-uppercase">{selectedReq.bank_info_snapshot?.account_name || '---'}</div>
                        </div>
                      </div>
                      <div style={{fontSize:'11px', color:'#64748b', fontStyle:'italic'}}>
                        * Vui lòng kiểm tra kỹ thông tin trước khi chuyển khoản.
                      </div>
                   </div>
                </div>
              )}

              {/* Form xử lý */}
              {selectedReq.status === 'pending' ? (
                <>
                  <div className="refund-request-page-form-group">
                    <label className="refund-request-page-info-label">Mã giao dịch ngân hàng (Ref No) <span className="text-danger">*</span></label>
                    <input 
                      type="text" 
                      className="refund-request-page-input" 
                      style={{width:'100%'}}
                      placeholder="Nhập mã tham chiếu giao dịch..."
                      value={processData.refund_ref}
                      onChange={e => setProcessData({...processData, refund_ref: e.target.value})}
                    />
                  </div>

                  <div className="refund-request-page-form-group">
                     <label className="refund-request-page-info-label">Ảnh biên lai giao dịch <span className="text-danger">*</span></label>
                     <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                        <label className="refund-request-page-btn-action btn-view" style={{cursor:'pointer'}}>
                           <FaFileUpload /> Chọn ảnh
                           <input type="file" hidden accept="image/*" onChange={handleFileChange}/>
                        </label>
                        {processData.proof_file && <span style={{fontSize:'12px', color:'#059669'}}><FaCheck/> {processData.proof_file.name}</span>}
                     </div>
                  </div>

                  <div className="refund-request-page-form-group">
                    <label className="refund-request-page-info-label">Ghi chú xử lý (Tùy chọn)</label>
                    <textarea 
                      className="refund-request-page-input refund-request-page-textarea"
                      placeholder="Nhập lý do từ chối hoặc ghi chú thêm..."
                      value={processData.admin_note}
                      onChange={e => setProcessData({...processData, admin_note: e.target.value})}
                    ></textarea>
                  </div>
                </>
              ) : (
                /* View Details Mode */
                <div className="refund-request-page-info-grid">
                   <div>
                      <div className="refund-request-page-info-label">Trạng thái</div>
                      <div className={`refund-request-page-badge ${selectedReq.status}`}>
                        {selectedReq.status === 'completed' ? 'Đã hoàn tất' : 'Đã từ chối'}
                      </div>
                   </div>
                   <div>
                      <div className="refund-request-page-info-label">Mã giao dịch Ref</div>
                      <div className="refund-request-page-info-val">{selectedReq.refund_ref || '---'}</div>
                   </div>
                   <div style={{gridColumn:'1/-1'}}>
                      <div className="refund-request-page-info-label">Ghi chú Admin</div>
                      <div className="refund-request-page-info-val" style={{fontWeight:400}}>{selectedReq.admin_note || 'Không có ghi chú'}</div>
                   </div>
                   {selectedReq.proof_images && (
                     <div style={{gridColumn:'1/-1'}}>
                        <div className="refund-request-page-info-label">Biên lai chuyển tiền</div>
                        {/* Demo hiển thị ảnh nếu có URL */}
                        <div style={{padding:'10px', background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:'6px', marginTop:'5px'}}>
                           <a href={JSON.parse(selectedReq.proof_images)[0]} target="_blank" rel="noreferrer" style={{fontSize:'12px', color:'#3b82f6'}}>
                             Xem ảnh biên lai
                           </a>
                        </div>
                     </div>
                   )}
                </div>
              )}

            </div>
            
            <div className="refund-request-page-modal-footer">
              <button className="refund-request-page-btn-action btn-cancel" onClick={() => setShowModal(false)}>
                Đóng
              </button>
              
              {selectedReq.status === 'pending' && (
                <>
                  <button 
                    className="refund-request-page-btn-action btn-reject" 
                    onClick={() => handleSubmit('rejected')}
                    disabled={submitting}
                  >
                    Từ chối hoàn
                  </button>
                  <button 
                    className="refund-request-page-btn-action btn-complete" 
                    onClick={() => handleSubmit('completed')}
                    disabled={submitting}
                  >
                     {submitting ? 'Đang xử lý...' : <><FaPaperPlane /> Hoàn thành & Gửi mail</>}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RefundRequestPage;