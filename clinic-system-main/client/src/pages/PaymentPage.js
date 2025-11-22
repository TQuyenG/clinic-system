// client/src/pages/PaymentPage.js
// PHIÊN BẢN MỚI: TÍCH HỢP CẤU HÌNH ADMIN & MOMO DEVELOPER MODE

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  FaCreditCard, FaQrcode, FaUniversity, FaWallet, 
  FaCheckCircle, FaArrowLeft, FaSpinner, FaLock, 
  FaInfoCircle, FaCopy, FaCamera, FaTimes, FaCheck, 
  FaClock, FaExclamationTriangle, FaMoneyBillWave // <--- Đã thêm icon này vào cuối
} from 'react-icons/fa';

// Import Services
import appointmentService from '../services/appointmentService';
import consultationService from '../services/consultationService';
import paymentService from '../services/paymentService'; // QUAN TRỌNG: Để lấy cấu hình

import './PaymentPage.css';

const PaymentPage = () => {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { consultation_id, type } = location.state || {}; // Lấy type để biết là thanh toán lịch hẹn hay tư vấn

  // Refs
  const fileInputRef = useRef(null);

  // --- STATE QUẢN LÝ DỮ LIỆU ---
  const [appointment, setAppointment] = useState(null);
  const [config, setConfig] = useState(null); // State lưu cấu hình từ Admin
  
  // --- STATE UI/UX ---
  const [loading, setLoading] = useState(true); // Loading ban đầu
  const [processing, setProcessing] = useState(false); // Loading khi bấm thanh toán
  const [error, setError] = useState(null);
  
  // --- STATE THANH TOÁN ---
  const [selectedMethod, setSelectedMethod] = useState(''); // Phương thức đang chọn
  const [paymentStatus, setPaymentStatus] = useState('pending'); // pending, completed
  const [uploadedBill, setUploadedBill] = useState(null); // Ảnh bill (cho chuyển khoản/momo cá nhân)
  
  // --- STATE TIMER ---
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerExpired, setTimerExpired] = useState(false);

  // ==================================================================================
  // 1. KHỞI TẠO DỮ LIỆU
  // ==================================================================================
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        // Gọi song song 2 API: Lấy chi tiết đơn hàng & Lấy cấu hình thanh toán
        await Promise.all([
          fetchAppointmentDetails(),
          fetchPaymentConfig()
        ]);
      } catch (err) {
        console.error("Init error:", err);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, [appointmentId, consultation_id]);

  // Hàm đếm ngược thời gian giữ chỗ
  useEffect(() => {
    if (appointment && appointment.payment_hold_until && paymentStatus !== 'completed') {
      const holdUntil = new Date(appointment.payment_hold_until);
      const now = new Date();
      const diff = Math.floor((holdUntil - now) / 1000);

      if (diff > 0) {
        setTimeLeft(diff);
        const timer = setInterval(() => {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              setTimerExpired(true);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        return () => clearInterval(timer);
      } else {
        setTimerExpired(true);
      }
    }
  }, [appointment, paymentStatus]);

  // --- LOGIC TỰ ĐỘNG KIỂM TRA TRẠNG THÁI (POLLING - FIX CHO DỊCH VỤ) ---
  useEffect(() => {
    let intervalId;

    // Chỉ chạy khi người dùng đang chọn Bank Transfer và chưa hoàn thành
    if (selectedMethod === 'bank_transfer' && paymentStatus !== 'completed') {
      console.log('🔄 Đang chờ tiền về...');
      
      intervalId = setInterval(async () => {
        try {
            let isPaid = false;

            // 1. Kiểm tra cho TƯ VẤN
            if (type === 'consultation' && consultation_id) {
                const res = await consultationService.getConsultationById(consultation_id);
                if (res.data.success && res.data.data.payment_status === 'paid') {
                    isPaid = true;
                }
            } 
            // 2. Kiểm tra cho LỊCH HẸN (DỊCH VỤ)
            // Sửa logic: Thử kiểm tra cả theo ID và theo Code nếu cần
            // 2. Kiểm tra cho LỊCH HẸN (APPOINTMENT)
            else if (appointmentId) {
                const res = await appointmentService.getAppointmentById(appointmentId);
                
                if (res.data.success) {
                    const appt = res.data.data;
                    // console.log('🔍 Check AP status:', appt.payment_status, appt.Payment?.status); // Bật log để debug nếu cần
                    
                    // Logic chuyển trang:
                    // 1. Trạng thái Appointment là 'paid'
                    // 2. HOẶC Trạng thái Payment record là 'paid'
                    // 3. HOẶC Trạng thái Appointment là 'confirmed' (vì Webhook đã update)
                    if (
                        appt.payment_status === 'paid' || 
                        (appt.Payment && appt.Payment.status === 'paid') ||
                        appt.status === 'confirmed' 
                    ) {
                        isPaid = true;
                    }
                }
            }

            // 3. Nếu đã thanh toán -> Dừng kiểm tra và chuyển màn hình
            if (isPaid) {
                console.log('✅ PHÁT HIỆN ĐÃ THANH TOÁN THÀNH CÔNG!');
                setPaymentStatus('completed');
                toast.success('Đã nhận được tiền! Thanh toán thành công.');
                clearInterval(intervalId);
            }
        } catch (err) {
            // Lỗi mạng thì bỏ qua, đợi lần sau check tiếp
            // console.error('Polling error:', err);
        }
      }, 3000); // Kiểm tra mỗi 3 giây
    }

    // Dọn dẹp timer khi component bị hủy
    return () => {
        if (intervalId) clearInterval(intervalId);
    };
  }, [selectedMethod, paymentStatus, consultation_id, appointmentId, type]);


  // ==================================================================================
  // 2. CÁC HÀM GỌI API
  // ==================================================================================

  // Lấy cấu hình thanh toán từ Admin
  const fetchPaymentConfig = async () => {
    try {
      const res = await paymentService.getPaymentConfig();
      if (res.data.success) {
        const settings = res.data.data;
        setConfig(settings);
        
        // Tự động chọn phương thức đầu tiên được enable
        if (settings.bank?.enabled) setSelectedMethod('bank_transfer');
        else if (settings.vnpay?.enabled) setSelectedMethod('vnpay');
        else if (settings.momo?.enabled) setSelectedMethod('momo');
        else if (settings.cash?.enabled) setSelectedMethod('cash');
      }
    } catch (error) {
      console.error('Lỗi tải cấu hình thanh toán:', error);
      toast.error('Không thể tải cấu hình thanh toán.');
    }
  };

  // Lấy chi tiết Lịch hẹn hoặc Tư vấn
  const fetchAppointmentDetails = async () => {
    try {
      let res;
      let data;

      if (type === 'consultation' && consultation_id) {
        // Xử lý cho Tư vấn
        res = await consultationService.getConsultationById(consultation_id);
        if (res.data.success) {
          data = res.data.data;
          // Chuẩn hóa dữ liệu để dùng chung UI
          setAppointment({
            id: data.id,
            code: data.consultation_code,
            amount: data.total_fee,
            serviceName: `Tư vấn trực tuyến (${data.package?.name || 'Gói mặc định'})`,
            doctorName: data.doctor?.full_name,
            time: data.appointment_time,
            payment_status: data.payment_status,
            type: 'consultation' // Đánh dấu loại
          });
          if (data.payment_status === 'paid') setPaymentStatus('completed');
        }
      } else {
        // Xử lý cho Lịch hẹn khám bệnh (Mặc định)
        res = await appointmentService.getAppointmentById(appointmentId);
        if (res.data.success) {
          data = res.data.data;
          setAppointment({
            id: data.id,
            code: data.code,
            amount: data.Service?.price,
            serviceName: data.Service?.name,
            doctorName: data.Doctor?.User?.full_name,
            time: `${data.appointment_date} ${data.appointment_start_time}`,
            payment_status: data.payment_status,
            payment_hold_until: data.payment_hold_until,
            type: 'appointment'
          });
          if (data.payment_status === 'paid') setPaymentStatus('completed');
        }
      }
    } catch (err) {
      setError(err.message || 'Lỗi tải thông tin đơn hàng');
    }
  };

  // ==================================================================================
  // 3. XỬ LÝ THANH TOÁN
  // ==================================================================================

  const handlePayment = async () => {
    if (!selectedMethod) return toast.warning('Vui lòng chọn phương thức thanh toán');
    
    // Validate: Chỉ bắt buộc ảnh với MoMo Cá nhân, còn Bank Transfer thì KHÔNG CẦN (vì đã có auto check)
    if (selectedMethod === 'momo' && config?.momo?.mode === 'personal' && !uploadedBill) {
      return toast.warning('Vui lòng tải lên ảnh chụp màn hình giao dịch');
    }

    setProcessing(true);
    try {
      // Dữ liệu gửi lên server
      const payload = {
        payment_method: selectedMethod,
        // Nếu là chuyển khoản/momo cá nhân thì gửi kèm ảnh
        proof_image_url: uploadedBill ? uploadedBill.preview : null 
      };

      let res;
      
      // Gọi API tạo thanh toán tùy theo loại (Tư vấn hay Lịch hẹn)
      if (appointment.type === 'consultation') {
        payload.consultation_id = consultation_id;
        res = await paymentService.createConsultationPayment(payload);
      } else {
        payload.appointment_id = appointmentId;
        res = await paymentService.createPayment(payload);
      }

      // Xử lý kết quả trả về
      if (res.data.success) {
        const { paymentUrl } = res.data;

        // TRƯỜNG HỢP 1: Redirect (VNPay, MoMo Business có link thanh toán)
        if (paymentUrl) {
          window.location.href = paymentUrl;
        } 
        // TRƯỜNG HỢP 2: Xử lý thủ công hoặc Auto-check
        else {
          
          // --- LOGIC MỚI: PHÂN LOẠI CHUYỂN TRANG ---
          
          if (selectedMethod === 'bank_transfer') {
              // 🟢 Nếu là Ngân hàng (SePay):
              // Giữ nguyên màn hình hiện tại để người dùng quét QR và hệ thống tự check.
              // KHÔNG chuyển sang trang 'pending_approval'.
              toast.info('Đơn hàng đã được tạo. Vui lòng chuyển khoản để hệ thống tự động xác nhận.');
          } 
          else {
              // 🟡 Nếu là MoMo (Cá nhân) hoặc Tiền mặt:
              // Chuyển sang màn hình "Đang chờ xác nhận" để Admin duyệt tay.
              toast.success('Gửi yêu cầu thành công! Vui lòng chờ xác nhận.');
              setPaymentStatus('pending_approval');
          }
        }
      } else {
        toast.error(res.data.message);
      }

    } catch (error) {
      console.error('Payment Error:', error);
      toast.error('Có lỗi xảy ra khi tạo thanh toán.');
    } finally {
      setProcessing(false);
    }
  };

  // ==================================================================================
  // 4. CÁC HÀM TIỆN ÍCH (Helper)
  // ==================================================================================

  // Upload ảnh
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) return toast.error('Ảnh quá lớn (>5MB)');
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedBill({ file, preview: reader.result, name: file.name });
      };
      reader.readAsDataURL(file);
    }
  };

  // Copy text
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Đã sao chép!');
  };

  // Format tiền tệ
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Format thời gian đếm ngược
  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // ==================================================================================
  // 5. RENDER GIAO DIỆN
  // ==================================================================================

  if (loading) return <div className="text-center p-5"><FaSpinner className="spin" /> Đang tải dữ liệu...</div>;
  if (error) return <div className="alert alert-danger m-5">{error}</div>;

  // Giao diện khi đã thanh toán thành công
  if (paymentStatus === 'completed') {
    return (
      <div className="payment-success-container text-center p-5">
        <FaCheckCircle className="text-success display-1 mb-3" />
        <h2>Thanh toán thành công!</h2>
        <p>Lịch hẹn của bạn đã được xác nhận.</p>
        <div className="mt-4">
            <button className="btn btn-primary me-2" onClick={() => navigate('/lich-hen-cua-toi')}>Xem lịch hẹn</button>
            <button className="btn btn-outline-secondary" onClick={() => navigate('/')}>Về trang chủ</button>
        </div>
      </div>
    );
  }

  // Giao diện khi chờ duyệt (đối với chuyển khoản)
  if (paymentStatus === 'pending_approval') {
      return (
        <div className="payment-pending-container text-center p-5">
            <FaClock className="text-warning display-1 mb-3" />
            <h2>Đang chờ xác nhận...</h2>
            <p>Hệ thống đã ghi nhận yêu cầu thanh toán của bạn.</p>
            <p>Vui lòng chờ Admin kiểm tra và xác nhận trong ít phút.</p>
            <div className="mt-4">
                <button className="btn btn-primary" onClick={() => navigate('/lich-hen-cua-toi')}>Quay lại danh sách</button>
            </div>
        </div>
      );
  }

  

  return (
    <div className="payment-page-wrapper">
      <div className="container py-4">
        <div className="row">
          
          {/* --- CỘT TRÁI: PHƯƠNG THỨC THANH TOÁN --- */}
          <div className="col-lg-8">
            <div className="card shadow-sm mb-4">
              <div className="card-header bg-white py-3">
                <h4 className="mb-0 fw-bold text-primary"><FaWallet className="me-2"/>Chọn phương thức thanh toán</h4>
              </div>
              <div className="card-body">
                
                {/* LIST CÁC PHƯƠNG THỨC (Dựa trên config) */}
                <div className="payment-methods-list">
                    
                  {/* 1. NGÂN HÀNG (VietQR) */}
                  {config?.bank?.enabled && (
                    <div 
                        className={`payment-method-item ${selectedMethod === 'bank_transfer' ? 'active' : ''}`}
                        onClick={() => setSelectedMethod('bank_transfer')}
                    >
                        <div className="d-flex align-items-center">
                            <div className="icon-box bg-success-light text-success"><FaUniversity /></div>
                            <div className="ms-3">
                                <h6 className="mb-0 fw-bold">Chuyển khoản Ngân hàng (VietQR)</h6>
                                <small className="text-muted">Quét mã QR, tự động nhập nội dung</small>
                            </div>
                        </div>
                        {selectedMethod === 'bank_transfer' && <FaCheckCircle className="text-primary check-icon" />}
                    </div>
                  )}

                  {/* 2. VNPAY */}
                  {config?.vnpay?.enabled && (
                    <div 
                        className={`payment-method-item ${selectedMethod === 'vnpay' ? 'active' : ''}`}
                        onClick={() => setSelectedMethod('vnpay')}
                    >
                        <div className="d-flex align-items-center">
                            <div className="icon-box bg-blue-light text-primary fw-bold" style={{fontSize: '0.8rem'}}>VNPAY</div>
                            <div className="ms-3">
                                <h6 className="mb-0 fw-bold">Cổng thanh toán VNPAY</h6>
                                <small className="text-muted">Thẻ ATM, Visa, Master, QR Pay</small>
                            </div>
                        </div>
                        {selectedMethod === 'vnpay' && <FaCheckCircle className="text-primary check-icon" />}
                    </div>
                  )}

                  {/* 3. MOMO */}
                  {config?.momo?.enabled && (
                    <div 
                        className={`payment-method-item ${selectedMethod === 'momo' ? 'active' : ''}`}
                        onClick={() => setSelectedMethod('momo')}
                    >
                        <div className="d-flex align-items-center">
                            <div className="icon-box bg-pink-light text-danger"><FaQrcode /></div>
                            <div className="ms-3">
                                <h6 className="mb-0 fw-bold">Ví điện tử MoMo</h6>
                                <small className="text-muted">
                                    {config.momo.mode === 'personal' ? 'Quét mã chuyển tiền cá nhân (Test Mode)' : 'Thanh toán qua cổng MoMo'}
                                </small>
                            </div>
                        </div>
                        {selectedMethod === 'momo' && <FaCheckCircle className="text-primary check-icon" />}
                    </div>
                  )}

                  {/* 4. TIỀN MẶT */}
                  {config?.cash?.enabled && (
                    <div 
                        className={`payment-method-item ${selectedMethod === 'cash' ? 'active' : ''}`}
                        onClick={() => setSelectedMethod('cash')}
                    >
                        <div className="d-flex align-items-center">
                            <div className="icon-box bg-warning-light text-warning"><FaMoneyBillWave /></div>
                            <div className="ms-3">
                                <h6 className="mb-0 fw-bold">Thanh toán tại quầy</h6>
                                <small className="text-muted">Đến phòng khám để thanh toán</small>
                            </div>
                        </div>
                        {selectedMethod === 'cash' && <FaCheckCircle className="text-primary check-icon" />}
                    </div>
                  )}
                </div>

                <hr className="my-4"/>

                {/* --- KHU VỰC HIỂN THỊ CHI TIẾT THEO TỪNG PHƯƠNG THỨC --- */}
                
                {/* A. CHI TIẾT CHUYỂN KHOẢN NGÂN HÀNG */}
                {selectedMethod === 'bank_transfer' && config?.bank && (
                    <div className="method-detail-section animate-fade-in">
                        <div className="alert alert-info">
                            <FaInfoCircle className="me-2"/> Vui lòng chuyển khoản chính xác số tiền và nội dung bên dưới.
                        </div>
                        <div className="row">
                            <div className="col-md-5 text-center">
                                {/* Tạo QR VietQR động: https://img.vietqr.io/image/[BankID]-[AccountNo]-[Template].png?amount=...&addInfo=... */}
                                <img 
                                    // Lưu ý: Thay 'TKPQT2' bằng tiền tố thực tế của bạn nếu khác
                                    src={`https://img.vietqr.io/image/${config.bank.bank_name}-${config.bank.account_no}-compact.png?amount=${appointment.amount}&addInfo=TKPQT2 ${appointment.code}`}
                                    alt="VietQR" 
                                    className="img-fluid rounded border p-2"
                                    style={{maxHeight: '250px'}}
                                />
                                <p className="small text-muted mt-2">Quét mã bằng App Ngân hàng</p>
                            </div>
                            <div className="col-md-7">
                                <div className="bank-info-box p-3 bg-light rounded">
                                    <div className="mb-2 d-flex justify-content-between">
                                        <span className="text-muted">Ngân hàng:</span>
                                        <span className="fw-bold">{config.bank.bank_name}</span>
                                    </div>
                                    <div className="mb-2 d-flex justify-content-between">
                                        <span className="text-muted">Chủ tài khoản:</span>
                                        <span className="fw-bold">{config.bank.account_name}</span>
                                    </div>
                                    <div className="mb-2 d-flex justify-content-between align-items-center">
                                        <span className="text-muted">Số tài khoản:</span>
                                        <div>
                                            <span className="fw-bold me-2 text-primary">{config.bank.account_no}</span>
                                            <FaCopy className="cursor-pointer text-muted" onClick={() => copyToClipboard(config.bank.account_no)}/>
                                        </div>
                                    </div>
                                    <div className="mb-2 d-flex justify-content-between align-items-center">
                                        <span className="text-muted">Số tiền:</span>
                                        <span className="fw-bold text-danger">{formatCurrency(appointment.amount)}</span>
                                    </div>
                                    <div className="d-flex justify-content-between align-items-center bg-white p-2 rounded border mt-3">
                                    <span className="text-muted small">Nội dung CK:</span>
                                    <div>
                                        {/* Sửa chữ THANHTOAN thành tiền tố SePay của bạn (VD: TKPQT2) */}
                                        <strong className="text-danger me-2 fs-5">TKPQT2 {appointment.code}</strong>

                                        {/* Sửa cả trong nút Copy nữa */}
                                        <FaCopy className="cursor-pointer text-muted" onClick={() => copyToClipboard(`TKPQT2 ${appointment.code}`)}/>
                                    </div>
                                </div>
                                </div>

                                {/* Upload bằng chứng */}
                                {/* KHÔNG CẦN UPLOAD NỮA */}
                                <div className="mt-3 alert alert-success d-flex align-items-center">
                                    <FaSpinner className="spin me-2"/>
                                    <div>
                                        <strong>Hệ thống đang tự động kiểm tra...</strong>
                                        <div className="small">Bạn không cần gửi ảnh. Màn hình sẽ tự chuyển khi nhận được tiền.</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* B. CHI TIẾT MOMO */}
                {selectedMethod === 'momo' && config?.momo && (
                    <div className="method-detail-section animate-fade-in">
                        {config.momo.mode === 'personal' ? (
                            // --- MODE CÁ NHÂN (QR CODE) ---
                            <div className="row">
                                <div className="col-md-12">
                                    <div className="alert alert-warning">
                                        <FaExclamationTriangle className="me-2"/>
                                        Đây là chế độ <strong>Thử nghiệm (Developer)</strong>. Vui lòng quét mã QR bên dưới để chuyển tiền, sau đó tải ảnh biên lai lên.
                                    </div>
                                </div>
                                <div className="col-md-5 text-center">
                                    {/* Tạo QR MoMo Cá nhân: https://me.momo.vn/[SDT]/[SoTien] */}
                                    {/* Lưu ý: Link này sẽ mở app MoMo. Để tạo QR ảnh, ta dùng api tạo QR từ text */}
                                    <img 
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://me.momo.vn/${config.momo.phone_number || ''}/${appointment.amount}`} 
                                        alt="MoMo QR"
                                        className="img-fluid rounded border p-2"
                                    />
                                    <p className="mt-2 fw-bold text-pink-momo">MoMo: {config.momo.phone_number}</p>
                                </div>
                                <div className="col-md-7">
                                    <div className="upload-area border-dashed p-4 text-center rounded h-100 d-flex flex-column justify-content-center align-items-center" onClick={() => fileInputRef.current.click()}>
                                         {uploadedBill ? (
                                            <div className="position-relative">
                                                <img src={uploadedBill.preview} alt="Bill" style={{maxHeight: '150px', borderRadius: '8px'}} />
                                                <p className="small text-success mt-2"><FaCheck/> Đã chọn ảnh</p>
                                            </div>
                                        ) : (
                                            <>
                                                <FaCamera className="mb-3 text-muted" size={30}/>
                                                <h6>Tải lên biên lai MoMo</h6>
                                                <small className="text-muted">Bắt buộc để đối soát thủ công</small>
                                            </>
                                        )}
                                        <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileUpload} />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // --- MODE DOANH NGHIỆP ---
                            <div className="text-center p-4">
                                <img src="/assets/images/momo-logo.png" alt="MoMo" style={{height: '60px'}} className="mb-3"/>
                                <h5>Thanh toán qua Cổng MoMo an toàn</h5>
                                <p className="text-muted">Bạn sẽ được chuyển hướng đến ứng dụng MoMo để hoàn tất thanh toán.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* C. CHI TIẾT VNPAY */}
                {selectedMethod === 'vnpay' && (
                    <div className="text-center p-4 animate-fade-in">
                         <img src="https://vnpay.vn/s1/statics.vnpay.vn/2023/9/06ncktiwd6dc1694418196384.png" alt="VNPay" style={{height: '60px'}} className="mb-3"/>
                         <h5>Thanh toán qua Cổng VNPAY</h5>
                         <p className="text-muted">Hỗ trợ thẻ ATM nội địa, Thẻ quốc tế (Visa/Master), và Ứng dụng Ngân hàng (QR Pay).</p>
                    </div>
                )}

              </div>
              
              <div className="card-footer bg-white p-3 d-flex justify-content-between align-items-center">
                    <button className="btn btn-outline-secondary" onClick={() => navigate(-1)} disabled={processing}>
                        <FaArrowLeft className="me-2"/> Quay lại
                    </button>
                    <button 
                        className={`btn btn-lg px-5 ${processing ? 'btn-secondary' : 'btn-primary'}`}
                        onClick={handlePayment}
                        disabled={processing || !selectedMethod}
                    >
                        {processing ? <><FaSpinner className="spin me-2"/> Đang xử lý...</> : <><FaLock className="me-2"/> Thanh Toán Ngay</>}
                    </button>
              </div>
            </div>
          </div>

          {/* --- CỘT PHẢI: THÔNG TIN ĐƠN HÀNG --- */}
          <div className="col-lg-4">
             {/* CARD THÔNG TIN */}
             <div className="card shadow-sm mb-3">
                 <div className="card-header bg-primary text-white">
                     <h5 className="mb-0">Thông tin đơn hàng</h5>
                 </div>
                 <div className="card-body">
                     <div className="d-flex justify-content-between mb-2">
                         <span className="text-muted">Mã đơn:</span>
                         <span className="fw-bold">{appointment?.code}</span>
                     </div>
                     <div className="d-flex justify-content-between mb-2">
                         <span className="text-muted">Dịch vụ:</span>
                         <span className="fw-bold text-end" style={{maxWidth: '60%'}}>{appointment?.serviceName}</span>
                     </div>
                     <div className="d-flex justify-content-between mb-2">
                         <span className="text-muted">Bác sĩ:</span>
                         <span className="fw-bold">{appointment?.doctorName || 'Chưa chỉ định'}</span>
                     </div>
                     <div className="d-flex justify-content-between mb-2">
                         <span className="text-muted">Thời gian:</span>
                         <span className="fw-bold text-end">{new Date(appointment?.time).toLocaleString('vi-VN')}</span>
                     </div>
                     <hr/>
                     <div className="d-flex justify-content-between align-items-center">
                         <span className="h6 mb-0">Tổng cộng:</span>
                         <span className="h4 text-danger mb-0 fw-bold">{formatCurrency(appointment?.amount || 0)}</span>
                     </div>
                 </div>
             </div>

             {/* TIMER COUNTDOWN */}
             {!timerExpired && timeLeft > 0 && (
                 <div className="card bg-warning-light border-warning">
                     <div className="card-body text-center text-dark">
                         <FaClock className="mb-2 text-warning h4"/>
                         <p className="mb-1 fw-bold">Thời gian giữ chỗ còn lại</p>
                         <h3 className="fw-bold font-monospace">{formatTimer(timeLeft)}</h3>
                         <small>Vui lòng thanh toán trước khi hết giờ</small>
                     </div>
                 </div>
             )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default PaymentPage;