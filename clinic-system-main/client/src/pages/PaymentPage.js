// client/src/pages/PaymentPage.js - MODERN PAYMENT SYSTEM WITH QR & UPLOAD
import { useLocation } from 'react-router-dom';
import consultationService from '../services/consultationService';
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import appointmentService from '../services/appointmentService';
import { toast } from 'react-toastify';
import { 
  FaCreditCard, FaMoneyBillWave, FaMobile, FaQrcode, 
  FaUpload, FaDownload, FaCopy, FaCheck, FaTimes,
  FaClock, FaExclamationTriangle, FaInfoCircle,
  FaShieldAlt, FaLock, FaCamera, FaImage,
  FaSpinner, FaCheckCircle, FaArrowLeft, FaPhone,
  FaGlobe, FaWallet, FaUniversity, FaPrint
} from 'react-icons/fa';
import './PaymentPage.css';

const PaymentPage = () => {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { consultation_id, type } = location.state || {};
  const fileInputRef = useRef(null);
  const qrCanvasRef = useRef(null);
  
  // States
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Payment states
  const [selectedMethod, setSelectedMethod] = useState('qr');
  const [qrCodeData, setQrCodeData] = useState('');
  const [transferInfo, setTransferInfo] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('pending'); // pending, processing, completed, failed
  
  // Timer states
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerExpired, setTimerExpired] = useState(false);
  
  // Upload states
  const [uploadedBill, setUploadedBill] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Current user
  const [currentUser, setCurrentUser] = useState(null);

  const paymentMethods = [
    {
      id: 'qr',
      title: 'Quét mã QR',
      description: 'Thanh toán nhanh qua VietQR, ZaloPay, MoMo',
      icon: <FaQrcode />,
      color: '#28a745',
      features: ['Nhanh chóng', 'An toàn', 'Không phí']
    },
    {
      id: 'transfer',
      title: 'Chuyển khoản ngân hàng',
      description: 'Chuyển khoản qua Internet Banking hoặc Mobile Banking',
      icon: <FaUniversity />,
      color: '#007bff',
      features: ['Uy tín', 'Bảo mật cao', 'Hỗ trợ mọi ngân hàng']
    },
    {
      id: 'card',
      title: 'Thẻ tín dụng/Ghi nợ',
      description: 'Thanh toán bằng Visa, MasterCard, JCB',
      icon: <FaCreditCard />,
      color: '#6f42c1',
      features: ['Quốc tế', 'Bảo vệ 3D Secure', 'Hoàn tiền nhanh']
    },
    {
      id: 'wallet',
      title: 'Ví điện tử',
      description: 'ZaloPay, MoMo, ViettelPay, ShopeePay',
      icon: <FaWallet />,
      color: '#fd7e14',
      features: ['Tiện lợi', 'Khuyến mãi', 'Tích điểm']
    }
  ];

  useEffect(() => {
    checkUserAuth();
    fetchAppointmentDetails();
  }, [appointmentId]);

  useEffect(() => {
    if (appointment && appointment.payment_hold_until) {
      const holdUntil = new Date(appointment.payment_hold_until);
      const now = new Date();
      const timeDiff = holdUntil.getTime() - now.getTime();
      
      if (timeDiff > 0) {
        setTimeLeft(Math.floor(timeDiff / 1000));
        
        const timer = setInterval(() => {
          setTimeLeft(prev => {
            if (prev <= 1) {
              setTimerExpired(true);
              clearInterval(timer);
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
  }, [appointment]);

  useEffect(() => {
    if (appointment && selectedMethod === 'qr') {
      generateQRCode();
    } else if (appointment && selectedMethod === 'transfer') {
      generateTransferInfo();
    }
  }, [appointment, selectedMethod]);

  const checkUserAuth = () => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (!token || !userStr) {
      toast.error('Vui lòng đăng nhập để tiếp tục');
      navigate('/login');
      return;
    }

    try {
      const user = JSON.parse(userStr);
      setCurrentUser(user);
    } catch (error) {
      toast.error('Lỗi xác thực. Vui lòng đăng nhập lại');
      navigate('/login');
    }
  };

  const fetchAppointmentDetails = async () => {
    try {
      setLoading(true);
      
      let response;
      let entity;

      if (type === 'consultation' && consultation_id) {
        // === LOGIC MỚI: TẢI BUỔI TƯ VẤN ===
        console.log(`Đang tải Consultation ID: ${consultation_id}`);
        response = await consultationService.getConsultationById(consultation_id);
        
        if (response.data.success) {
          entity = response.data.data;
          // Ánh xạ dữ liệu Consultation sang cấu trúc Appointment để hiển thị
          setAppointment({
            id: entity.id,
            code: entity.consultation_code,
            appointment_time: entity.appointment_time,
            Service: { // Tạo đối tượng Service giả
              name: `Tư vấn: ${entity.package.package_name}`,
              price: entity.total_fee // Lấy total_fee (đã bao gồm phí)
            },
            Doctor: entity.doctor ? { User: { full_name: entity.doctor.full_name } } : null,
            Payment: entity.payments ? entity.payments[0] : null, // (Giả sử payment đầu tiên)
            payment_status: entity.payment_status
          });
          
          if (entity.payment_status === 'paid') {
            setPaymentStatus('completed');
          }
        } else {
          throw new Error(response.data.message || 'Không thể tải thông tin tư vấn');
        }

      } else if (appointmentId) {
        // === LOGIC CŨ: TẢI LỊCH HẸN ===
        console.log(`Đang tải Appointment ID: ${appointmentId}`);
        response = await appointmentService.getAppointmentById(appointmentId);
        
        if (response.data.success) {
          entity = response.data.data;
          setAppointment(entity);
          
          if (entity.Payment?.status === 'completed') {
            setPaymentStatus('completed');
          }
        } else {
          throw new Error(response.data.message || 'Không thể tải thông tin lịch hẹn');
        }
      } else {
        throw new Error('Không tìm thấy ID lịch hẹn hoặc ID tư vấn.');
      }
      
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message;
      setError(errorMessage);
      toast.error(`Lỗi: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const generateQRCode = async () => {
    try {
      // Mock QR code data - trong thực tế sẽ tạo QR code thực
      const qrContent = `${window.location.origin}/payment/verify/${appointmentId}`;
      
      // Tạo SVG QR code đơn giản hoặc dùng dịch vụ bên ngoài
      const mockQrDataUrl = `data:image/svg+xml;base64,${btoa(`
        <svg width="256" height="256" xmlns="http://www.w3.org/2000/svg">
          <rect width="256" height="256" fill="white"/>
          <rect x="30" y="30" width="196" height="196" fill="black"/>
          <rect x="40" y="40" width="176" height="176" fill="white"/>
          <rect x="50" y="50" width="156" height="156" fill="black"/>
          <rect x="60" y="60" width="136" height="136" fill="white"/>
          <text x="128" y="140" text-anchor="middle" fill="black" font-size="16">QR Payment</text>
        </svg>
      `)}`;
      
      setQrCodeData(mockQrDataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error('Không thể tạo mã QR');
    }
  };

  const generateTransferInfo = () => {
    // Mock transfer info - trong thực tế sẽ lấy từ API
    const transferData = {
      bankName: 'Ngân hàng TMCP Á Châu (ACB)',
      accountNumber: '1234567890',
      accountName: 'CONG TY TNHH BENH VIEN ABC',
      amount: appointment.Service?.price || 0,
      transferContent: `Thanh toan lich hen ${appointment.code}`,
      qrBankCode: `00020101021238530010A000000727012600069704280113${appointment.code}0208QRIBFTTA5303704540${appointment.Service?.price}5802VN62${appointment.code.length.toString().padStart(2, '0')}${appointment.code}6304`
    };
    setTransferInfo(transferData);
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`Đã sao chép ${label}`);
    }).catch(() => {
      toast.error('Không thể sao chép');
    });
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Kích thước file không được vượt quá 10MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Chỉ chấp nhận file ảnh');
      return;
    }

    // Simulate upload progress
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 100);

    // Read file
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedBill({
        file,
        preview: e.target.result,
        name: file.name,
        size: file.size
      });
    };
    reader.readAsDataURL(file);
  };

  const removeUploadedBill = () => {
    setUploadedBill(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePaymentSubmit = async () => {
    if (selectedMethod === 'transfer' && !uploadedBill) {
      toast.error('Vui lòng upload ảnh chụp bill chuyển khoản');
      return;
    }

    try {
      setPaymentLoading(true);
      
      const paymentData = {
        appointment_id: appointmentId,
        payment_method: selectedMethod,
        amount: appointment.Service?.price || 0,
        bill_image: uploadedBill ? uploadedBill.preview : null
      };

      // Mock API call
      console.log('Submitting payment:', paymentData);
      
      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setPaymentStatus('processing');
      
      // Simulate completion
      setTimeout(() => {
        setPaymentStatus('completed');
        toast.success('Thanh toán thành công!');
      }, 3000);
      
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentStatus('failed');
      toast.error('Có lỗi xảy ra trong quá trình thanh toán');
    } finally {
      setPaymentLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateTotal = () => {
    let total = appointment?.Service?.price || 0;
    
    // Add any fees based on payment method
    if (selectedMethod === 'card') {
      total += total * 0.03; // 3% card fee
    }
    
    return total;
  };

  if (loading) {
    return (
      <div className="payment-page">
        <div className="loading-spinner">Đang tải thông tin thanh toán...</div>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="payment-page">
        <div className="payment-container">
          <div className="error-container">
            <h2>Không thể tải thông tin thanh toán</h2>
            <p>{error || 'Lịch hẹn không tồn tại hoặc đã được thanh toán.'}</p>
            <Link to="/lich-hen" className="btn btn-primary">
              <FaArrowLeft /> Quay lại danh sách lịch hẹn
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (paymentStatus === 'completed') {
    return (
      <div className="payment-page">
        <div className="payment-container">
          <div className="payment-success">
            <div className="success-icon">
              <FaCheckCircle />
            </div>
            <h2>Thanh toán thành công!</h2>
            <p>Cảm ơn bạn đã thanh toán. Lịch hẹn của bạn đã được xác nhận.</p>
            
            <div className="success-actions">
              <Link to={`/lich-hen/${appointmentId}`} className="btn btn-primary">
                Xem chi tiết lịch hẹn
              </Link>
              <Link to="/lich-hen" className="btn btn-secondary">
                Danh sách lịch hẹn
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-page">
      <div className="payment-container">
        {/* Progress Steps */}
        <div className="progress-steps">
          <div className="step completed">
            <div className="step-number"><FaCheck /></div>
            <span className="step-label">Đặt lịch</span>
          </div>
          <div className="step-line completed"></div>
          <div className="step active">
            <div className="step-number">2</div>
            <span className="step-label">Thanh toán</span>
          </div>
          <div className="step-line"></div>
          <div className="step">
            <div className="step-number">3</div>
            <span className="step-label">Hoàn thành</span>
          </div>
        </div>

        {/* Timer Warning */}
        {!timerExpired && timeLeft > 0 && (
          <div className={`timer-warning ${timeLeft < 300 ? 'urgent' : ''}`}>
            <FaClock />
            <span>Thời gian giữ chỗ còn lại:</span>
            <strong>{formatTime(timeLeft)}</strong>
            {timeLeft < 300 && (
              <span className="urgent-text">Vui lòng thanh toán ngay!</span>
            )}
          </div>
        )}

        {timerExpired && (
          <div className="timer-warning urgent">
            <FaExclamationTriangle />
            <span>Thời gian giữ chỗ đã hết. Lịch hẹn có thể bị hủy.</span>
          </div>
        )}

        <div className="payment-content">
          {/* Appointment Summary */}
          <div className="appointment-summary-card">
            <h2>Thông tin lịch hẹn</h2>
            
            <div className="summary-item">
              <span className="label">
                <FaInfoCircle />
                Mã lịch hẹn
              </span>
              <span className="value code">{appointment.code}</span>
            </div>

            <div className="summary-item">
              <span className="label">Dịch vụ</span>
              <span className="value">{appointment.Service?.name}</span>
            </div>

            <div className="summary-item">
              <span className="label">Ngày khám</span>
              <span className="value">
                {new Date(appointment.appointment_time).toLocaleDateString('vi-VN')}
              </span>
            </div>

            <div className="summary-item">
              <span className="label">Giờ khám</span>
              <span className="value">
                {new Date(appointment.appointment_time).toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>

            {appointment.Doctor && (
              <div className="summary-item">
                <span className="label">Bác sĩ</span>
                <span className="value">{appointment.Doctor.User?.full_name}</span>
              </div>
            )}

            <div className="summary-item">
              <span className="label">Chi phí dịch vụ</span>
              <span className="value price">
                {new Intl.NumberFormat('vi-VN').format(appointment.Service?.price || 0)} VNĐ
              </span>
            </div>

            {selectedMethod === 'card' && (
              <div className="summary-item">
                <span className="label">Phí xử lý thẻ (3%)</span>
                <span className="value price">
                  {new Intl.NumberFormat('vi-VN').format((appointment.Service?.price || 0) * 0.03)} VNĐ
                </span>
              </div>
            )}

            <div className="summary-item total">
              <span className="label">Tổng cộng</span>
              <span className="value">
                {new Intl.NumberFormat('vi-VN').format(calculateTotal())} VNĐ
              </span>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="payment-methods-card">
            <h2>Chọn phương thức thanh toán</h2>
            
            {/* Method Selection */}
            <div className="payment-methods-grid">
              {paymentMethods.map(method => (
                <div
                  key={method.id}
                  className={`payment-method ${selectedMethod === method.id ? 'selected' : ''}`}
                  onClick={() => setSelectedMethod(method.id)}
                >
                  <div className="method-header">
                    <input 
                      type="radio" 
                      name="paymentMethod" 
                      checked={selectedMethod === method.id}
                      onChange={() => setSelectedMethod(method.id)}
                    />
                    <div className="method-icon" style={{ color: method.color }}>
                      {method.icon}
                    </div>
                    <div className="method-info">
                      <h3>{method.title}</h3>
                      <p>{method.description}</p>
                    </div>
                  </div>
                  
                  <div className="method-features">
                    {method.features.map((feature, index) => (
                      <span key={index} className="feature-tag">{feature}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Method Details */}
            {selectedMethod === 'qr' && (
              <div className="method-details">
                <div className="qr-section">
                  <div className="qr-icon">
                    <FaQrcode />
                  </div>
                  <h3>Quét mã QR để thanh toán</h3>
                  
                  {qrCodeData && (
                    <div className="qr-code">
                      <img src={qrCodeData} alt="QR Code" />
                    </div>
                  )}
                  
                  <div className="qr-instructions">
                    <h4>Hướng dẫn thanh toán:</h4>
                    <ol>
                      <li>Mở ứng dụng Mobile Banking hoặc ví điện tử</li>
                      <li>Chọn chức năng quét mã QR</li>
                      <li>Quét mã QR trên màn hình</li>
                      <li>Xác nhận thông tin và hoàn tất thanh toán</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}

            {selectedMethod === 'transfer' && transferInfo && (
              <div className="method-details">
                <div className="bank-info">
                  <h3>Thông tin chuyển khoản</h3>
                  
                  <div className="info-row">
                    <span>Ngân hàng:</span>
                    <strong>{transferInfo.bankName}</strong>
                  </div>
                  
                  <div className="info-row">
                    <span>Số tài khoản:</span>
                    <strong>{transferInfo.accountNumber}</strong>
                    <button 
                      className="btn-copy"
                      onClick={() => copyToClipboard(transferInfo.accountNumber, 'số tài khoản')}
                    >
                      <FaCopy />
                    </button>
                  </div>
                  
                  <div className="info-row">
                    <span>Chủ tài khoản:</span>
                    <strong>{transferInfo.accountName}</strong>
                  </div>
                  
                  <div className="info-row">
                    <span>Số tiền:</span>
                    <strong>{new Intl.NumberFormat('vi-VN').format(transferInfo.amount)} VNĐ</strong>
                    <button 
                      className="btn-copy"
                      onClick={() => copyToClipboard(transferInfo.amount.toString(), 'số tiền')}
                    >
                      <FaCopy />
                    </button>
                  </div>
                  
                  <div className="info-row transfer-content">
                    <span>Nội dung chuyển khoản:</span>
                    <strong>{transferInfo.transferContent}</strong>
                    <button 
                      className="btn-copy"
                      onClick={() => copyToClipboard(transferInfo.transferContent, 'nội dung chuyển khoản')}
                    >
                      <FaCopy />
                    </button>
                  </div>
                </div>

                <div className="upload-section">
                  <h4>Upload ảnh chụp bill chuyển khoản</h4>
                  
                  {!uploadedBill ? (
                    <div className="upload-box" onClick={() => fileInputRef.current?.click()}>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                      />
                      <div className="upload-label">
                        <FaCamera />
                        <span>Chụp ảnh hoặc chọn file</span>
                        <small>Hỗ trợ JPG, PNG, tối đa 10MB</small>
                      </div>
                    </div>
                  ) : (
                    <div className="uploaded-bill">
                      <div className="bill-preview">
                        <img src={uploadedBill.preview} alt="Bill preview" />
                        <button 
                          className="btn-remove"
                          onClick={removeUploadedBill}
                        >
                          <FaTimes />
                        </button>
                      </div>
                      <div className="bill-info">
                        <h5>{uploadedBill.name}</h5>
                        <p>{(uploadedBill.size / 1024 / 1024).toFixed(2)} MB</p>
                        {uploadProgress < 100 && (
                          <div className="upload-progress">
                            <div 
                              className="progress-bar" 
                              style={{ width: `${uploadProgress}%` }}
                            ></div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedMethod === 'card' && (
              <div className="method-details">
                <div className="info-box">
                  <FaShieldAlt />
                  <div>
                    <strong>Bảo mật cao</strong>
                    <p>Thanh toán được bảo vệ bởi 3D Secure và mã hóa SSL 256-bit</p>
                  </div>
                </div>
                <div className="note-box">
                  <FaInfoCircle />
                  <div>
                    <strong>Lưu ý:</strong>
                    <ul>
                      <li>Phí xử lý thẻ: 3% trên tổng số tiền</li>
                      <li>Hỗ trợ thẻ Visa, MasterCard, JCB</li>
                      <li>Thời gian xử lý: 1-3 phút</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {selectedMethod === 'wallet' && (
              <div className="method-details">
                <div className="wallet-options">
                  <div className="wallet-option">
                    <img src="/logos/zalopay.png" alt="ZaloPay" />
                    <span>ZaloPay</span>
                  </div>
                  <div className="wallet-option">
                    <img src="/logos/momo.png" alt="MoMo" />
                    <span>MoMo</span>
                  </div>
                  <div className="wallet-option">
                    <img src="/logos/viettelpay.png" alt="ViettelPay" />
                    <span>ViettelPay</span>
                  </div>
                  <div className="wallet-option">
                    <img src="/logos/shopeepay.png" alt="ShopeePay" />
                    <span>ShopeePay</span>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Actions */}
            <div className="payment-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => navigate(-1)}
                disabled={paymentLoading}
              >
                <FaArrowLeft />
                Quay lại
              </button>
              
              <button 
                className="btn btn-primary"
                onClick={handlePaymentSubmit}
                disabled={
                  paymentLoading || 
                  (selectedMethod === 'transfer' && !uploadedBill) ||
                  timerExpired
                }
              >
                {paymentLoading ? (
                  <>
                    <FaSpinner className="spinning" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <FaLock />
                    Xác nhận thanh toán
                  </>
                )}
              </button>
            </div>

            {/* Support Info */}
            <div className="support-info">
              <h4>Cần hỗ trợ?</h4>
              <div className="support-options">
                <a href="tel:19001234" className="support-option">
                  <FaPhone />
                  <span>Hotline: 1900 1234</span>
                </a>
                <a href="mailto:support@hospital.com" className="support-option">
                  <FaGlobe />
                  <span>Email hỗ trợ</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;