// client/src/pages/PaymentSettingsPage.js
import React, { useState, useEffect } from 'react';
import paymentService from '../services/paymentService';
import { toast } from 'react-toastify';
import { FaUniversity, FaCreditCard, FaMoneyBillWave, FaMobileAlt, FaSave, FaCheckCircle, FaInfoCircle } from 'react-icons/fa';
import './PaymentSettingsPage.css';

const PaymentSettingsPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // State cấu hình mặc định
  const [config, setConfig] = useState({
    bank: { 
      enabled: true, 
      bank_name: '', 
      account_no: '', 
      account_name: '', 
      template: 'compact' 
    },
    vnpay: { 
      enabled: false, 
      tmn_code: '', 
      hash_secret: '', 
      url: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html' 
    },
    momo: { 
      enabled: false, 
      mode: 'personal', // 'personal' (Dev/Test) hoặc 'business' (Doanh nghiệp)
      phone_number: '', // Cho mode personal
      partner_code: '', // Cho mode business
      access_key: '',
      secret_key: ''
    },
    cash: { 
      enabled: true 
    }
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await paymentService.getPaymentConfig();
      if (res.data.success) {
        // Merge dữ liệu server với default để tránh lỗi undefined
        setConfig(prev => ({
          ...prev,
          ...res.data.data,
          // Đảm bảo các field con luôn tồn tại nếu DB chưa có
          bank: { ...prev.bank, ...(res.data.data.bank || {}) },
          vnpay: { ...prev.vnpay, ...(res.data.data.vnpay || {}) },
          momo: { ...prev.momo, ...(res.data.data.momo || {}) },
          cash: { ...prev.cash, ...(res.data.data.cash || {}) }
        }));
      }
    } catch (error) {
      toast.error('Không thể tải cấu hình thanh toán');
    } finally {
      setLoading(false);
    }
  };

  // Hàm xử lý thay đổi giá trị input
  const handleChange = (section, field, value) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  // Hàm xử lý Bật/Tắt (Switch)
  const handleToggle = (section) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        enabled: !prev[section].enabled
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await paymentService.updatePaymentConfig(config);
      if (res.data.success) {
        toast.success('Đã lưu cấu hình thanh toán!');
      } else {
        toast.error(res.data.message);
      }
    } catch (error) {
      toast.error('Lỗi khi lưu cấu hình');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center p-5">Đang tải cấu hình...</div>;

  return (
    <div className="payment-settings-container">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold text-primary mb-1">⚙️ Cấu hình Cổng Thanh Toán</h2>
          <p className="text-muted mb-0">Quản lý các phương thức thanh toán và tài khoản nhận tiền.</p>
        </div>
        <button 
            className="btn btn-success btn-lg px-4 d-flex align-items-center" 
            onClick={handleSubmit}
            disabled={saving}
        >
            {saving ? 'Đang lưu...' : <><FaSave className="me-2"/> Lưu Thay Đổi</>}
        </button>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="row g-4">
          
          {/* --- 1. CHUYỂN KHOẢN NGÂN HÀNG (VIETQR) --- */}
          <div className="col-lg-6">
            <div className={`card setting-card h-100 ${config.bank.enabled ? 'border-success' : ''}`}>
              <div className="card-header d-flex justify-content-between align-items-center bg-success-subtle text-success-emphasis">
                <div className="d-flex align-items-center">
                  <FaUniversity className="me-2 fs-5"/>
                  <h5 className="mb-0 fw-bold">Ngân hàng (VietQR)</h5>
                </div>
                <div className="form-check form-switch">
                  <input 
                    className="form-check-input" 
                    type="checkbox" 
                    checked={config.bank.enabled}
                    onChange={() => handleToggle('bank')}
                    style={{cursor: 'pointer', width: '3em', height: '1.5em'}}
                  />
                </div>
              </div>
              <div className={`card-body ${!config.bank.enabled ? 'opacity-50' : ''}`}>
                <div className="alert alert-light border mb-3 small">
                  <FaInfoCircle className="me-1 text-info"/> 
                  Hệ thống sẽ tự động tạo mã VietQR cho khách hàng quét.
                </div>
                <div className="mb-3">
                  <label className="form-label fw-bold">Tên Ngân hàng</label>
                  <input 
                    type="text" className="form-control" placeholder="VD: MBBank, Vietcombank"
                    value={config.bank.bank_name}
                    onChange={(e) => handleChange('bank', 'bank_name', e.target.value)}
                    disabled={!config.bank.enabled}
                  />
                </div>
                <div className="row">
                  <div className="col-md-8 mb-3">
                    <label className="form-label fw-bold">Số tài khoản</label>
                    <input 
                      type="text" className="form-control font-monospace" placeholder="000..."
                      value={config.bank.account_no}
                      onChange={(e) => handleChange('bank', 'account_no', e.target.value)}
                      disabled={!config.bank.enabled}
                    />
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label fw-bold">Mẫu QR</label>
                    <select 
                      className="form-select"
                      value={config.bank.template}
                      onChange={(e) => handleChange('bank', 'template', e.target.value)}
                      disabled={!config.bank.enabled}
                    >
                      <option value="compact">Compact</option>
                      <option value="qr_only">QR Only</option>
                    </select>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-bold">Tên chủ tài khoản (Viết hoa)</label>
                  <input 
                    type="text" className="form-control text-uppercase" placeholder="NGUYEN VAN A"
                    value={config.bank.account_name}
                    onChange={(e) => handleChange('bank', 'account_name', e.target.value)}
                    disabled={!config.bank.enabled}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* --- 2. VÍ MOMO (Đã thêm Mode Developer) --- */}
          <div className="col-lg-6">
            <div className={`card setting-card h-100 ${config.momo.enabled ? 'border-pink' : ''}`}>
              <div className="card-header d-flex justify-content-between align-items-center bg-pink-subtle text-pink-emphasis">
                <div className="d-flex align-items-center">
                  <FaMobileAlt className="me-2 fs-5"/>
                  <h5 className="mb-0 fw-bold">Ví MoMo</h5>
                </div>
                <div className="form-check form-switch">
                  <input 
                    className="form-check-input" 
                    type="checkbox" 
                    checked={config.momo.enabled}
                    onChange={() => handleToggle('momo')}
                    style={{cursor: 'pointer', width: '3em', height: '1.5em'}}
                  />
                </div>
              </div>
              <div className={`card-body ${!config.momo.enabled ? 'opacity-50' : ''}`}>
                
                {/* SELECT MODE */}
                <div className="mb-3">
                    <label className="form-label fw-bold">Chế độ tích hợp</label>
                    <select 
                        className="form-select border-pink"
                        value={config.momo.mode}
                        onChange={(e) => handleChange('momo', 'mode', e.target.value)}
                        disabled={!config.momo.enabled}
                    >
                        <option value="personal">👤 Cá nhân / Developer (Chuyển tiền qua SĐT)</option>
                        <option value="business">🏢 Doanh nghiệp (Cổng thanh toán API)</option>
                    </select>
                </div>

                {config.momo.mode === 'personal' ? (
                    // --- FORM CÁ NHÂN ---
                    <div className="animate-fade-in p-3 bg-light rounded border border-dashed">
                        <div className="mb-2 text-success small"><FaCheckCircle/> Dành cho Dev test hoặc nhận tiền vào ví cá nhân. Không cần giấy phép KD.</div>
                        <div className="mb-3">
                            <label className="form-label fw-bold">Số điện thoại MoMo nhận tiền</label>
                            <input 
                                type="text" className="form-control" placeholder="09xxx..."
                                value={config.momo.phone_number}
                                onChange={(e) => handleChange('momo', 'phone_number', e.target.value)}
                                disabled={!config.momo.enabled}
                            />
                        </div>
                    </div>
                ) : (
                    // --- FORM DOANH NGHIỆP ---
                    <div className="animate-fade-in">
                        <div className="mb-3">
                            <label className="form-label fw-bold">Partner Code</label>
                            <input 
                                type="text" className="form-control"
                                value={config.momo.partner_code}
                                onChange={(e) => handleChange('momo', 'partner_code', e.target.value)}
                                disabled={!config.momo.enabled}
                            />
                        </div>
                        <div className="row">
                             <div className="col-md-6 mb-3">
                                <label className="form-label fw-bold">Access Key</label>
                                <input 
                                    type="password" className="form-control"
                                    value={config.momo.access_key}
                                    onChange={(e) => handleChange('momo', 'access_key', e.target.value)}
                                    disabled={!config.momo.enabled}
                                />
                             </div>
                             <div className="col-md-6 mb-3">
                                <label className="form-label fw-bold">Secret Key</label>
                                <input 
                                    type="password" className="form-control"
                                    value={config.momo.secret_key}
                                    onChange={(e) => handleChange('momo', 'secret_key', e.target.value)}
                                    disabled={!config.momo.enabled}
                                />
                             </div>
                        </div>
                    </div>
                )}
              </div>
            </div>
          </div>

          {/* --- 3. CỔNG VNPAY --- */}
          <div className="col-lg-6">
            <div className={`card setting-card h-100 ${config.vnpay.enabled ? 'border-primary' : ''}`}>
              <div className="card-header d-flex justify-content-between align-items-center bg-primary-subtle text-primary-emphasis">
                <div className="d-flex align-items-center">
                  <FaCreditCard className="me-2 fs-5"/>
                  <h5 className="mb-0 fw-bold">Cổng VNPay</h5>
                </div>
                <div className="form-check form-switch">
                  <input 
                    className="form-check-input" 
                    type="checkbox" 
                    checked={config.vnpay.enabled}
                    onChange={() => handleToggle('vnpay')}
                    style={{cursor: 'pointer', width: '3em', height: '1.5em'}}
                  />
                </div>
              </div>
              <div className={`card-body ${!config.vnpay.enabled ? 'opacity-50' : ''}`}>
                <div className="mb-3">
                  <label className="form-label fw-bold">TmnCode (Mã Website)</label>
                  <input 
                    type="text" className="form-control"
                    value={config.vnpay.tmn_code}
                    onChange={(e) => handleChange('vnpay', 'tmn_code', e.target.value)}
                    disabled={!config.vnpay.enabled}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-bold">HashSecret (Chuỗi bí mật)</label>
                  <input 
                    type="password" className="form-control"
                    value={config.vnpay.hash_secret}
                    onChange={(e) => handleChange('vnpay', 'hash_secret', e.target.value)}
                    disabled={!config.vnpay.enabled}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-bold">VNPay URL</label>
                  <input 
                    type="text" className="form-control"
                    value={config.vnpay.url}
                    onChange={(e) => handleChange('vnpay', 'url', e.target.value)}
                    disabled={!config.vnpay.enabled}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* --- 4. TIỀN MẶT --- */}
          <div className="col-lg-6">
            <div className={`card setting-card h-100 ${config.cash.enabled ? 'border-warning' : ''}`}>
              <div className="card-header d-flex justify-content-between align-items-center bg-warning-subtle text-warning-emphasis">
                <div className="d-flex align-items-center">
                  <FaMoneyBillWave className="me-2 fs-5"/>
                  <h5 className="mb-0 fw-bold">Thanh toán Tiền mặt</h5>
                </div>
                <div className="form-check form-switch">
                  <input 
                    className="form-check-input" 
                    type="checkbox" 
                    checked={config.cash.enabled}
                    onChange={() => handleToggle('cash')}
                    style={{cursor: 'pointer', width: '3em', height: '1.5em'}}
                  />
                </div>
              </div>
              <div className={`card-body ${!config.cash.enabled ? 'opacity-50' : ''}`}>
                <p className="mb-0">
                    Cho phép bệnh nhân chọn phương thức <strong>"Thanh toán tại quầy"</strong> khi đặt lịch.
                    <br/>
                    <small className="text-muted">Nhân viên sẽ thu tiền và xác nhận thủ công trên hệ thống.</small>
                </p>
              </div>
            </div>
          </div>

        </div>
      </form>
    </div>
  );
};

export default PaymentSettingsPage;