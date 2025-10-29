import React, { useState } from 'react';
import { forgotPassword, verifyOTP, resetPassword } from '../../services/authService';
import '../css/auth.css';

const ForgotPasswordForm = ({ onSuccess, onBackToLogin }) => {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Step 1: Gửi email để nhận OTP
  const handleSendOTP = async (e) => {
    e.preventDefault();

    if (!email) {
      setErrors({ email: 'Email là bắt buộc' });
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setErrors({ email: 'Email không hợp lệ' });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const response = await forgotPassword(email);
      setResetToken(response.reset_token);
      setSuccessMessage('Mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.');
      setStep(2);
    } catch (error) {
      setErrors({ submit: error.message || 'Có lỗi xảy ra. Vui lòng thử lại.' });
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Xác nhận OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();

    if (!otp) {
      setErrors({ otp: 'Vui lòng nhập mã OTP' });
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      setErrors({ otp: 'Mã OTP phải có 6 chữ số' });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      await verifyOTP(resetToken, otp);
      setSuccessMessage('Mã OTP hợp lệ. Vui lòng nhập mật khẩu mới.');
      setStep(3);
    } catch (error) {
      setErrors({ submit: error.message || 'Mã OTP không hợp lệ hoặc đã hết hạn.' });
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Đặt lại mật khẩu mới
  const handleResetPassword = async (e) => {
    e.preventDefault();

    const newErrors = {};

    if (!newPassword) {
      newErrors.newPassword = 'Mật khẩu mới là bắt buộc';
    } else if (newPassword.length < 6) {
      newErrors.newPassword = 'Mật khẩu phải có ít nhất 6 ký tự';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      await resetPassword(resetToken, newPassword);
      setSuccessMessage('Đặt lại mật khẩu thành công! Bạn có thể đăng nhập với mật khẩu mới.');
      
      if (onSuccess) {
        onSuccess();
      }

      // Tự động chuyển về login sau 2 giây
      setTimeout(() => {
        if (onBackToLogin) {
          onBackToLogin();
        }
      }, 2000);

    } catch (error) {
      setErrors({ submit: error.message || 'Có lỗi xảy ra. Vui lòng thử lại.' });
    } finally {
      setLoading(false);
    }
  };

  // Gửi lại OTP
  const handleResendOTP = async () => {
    setLoading(true);
    setErrors({});
    setOtp('');

    try {
      const response = await forgotPassword(email);
      setResetToken(response.reset_token);
      setSuccessMessage('Mã OTP mới đã được gửi đến email của bạn.');
    } catch (error) {
      setErrors({ submit: error.message || 'Không thể gửi lại OTP. Vui lòng thử lại.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form-container">
      <div className="auth-form">
        <h2 className="auth-form-title">Quên mật khẩu</h2>

        {/* Progress indicator */}
        <div className="progress-steps">
          <div className={`step ${step >= 1 ? 'active' : ''}`}>
            <span className="step-number">1</span>
            <span className="step-label">Email</span>
          </div>
          <div className={`step ${step >= 2 ? 'active' : ''}`}>
            <span className="step-number">2</span>
            <span className="step-label">OTP</span>
          </div>
          <div className={`step ${step >= 3 ? 'active' : ''}`}>
            <span className="step-number">3</span>
            <span className="step-label">Mật khẩu mới</span>
          </div>
        </div>

        {successMessage && (
          <div className="alert alert-success">
            {successMessage}
          </div>
        )}

        {errors.submit && (
          <div className="alert alert-error">
            {errors.submit}
          </div>
        )}

        {/* Step 1: Nhập email */}
        {step === 1 && (
          <form onSubmit={handleSendOTP}>
            <p className="form-description">
              Nhập địa chỉ email đã đăng ký để nhận mã OTP đặt lại mật khẩu.
            </p>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors({});
                }}
                className={errors.email ? 'error' : ''}
                placeholder="Nhập email của bạn"
                disabled={loading}
                autoComplete="email"
              />
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>

            <button 
              type="submit" 
              className="btn btn-primary btn-block"
              disabled={loading}
            >
              {loading ? 'Đang gửi...' : 'Gửi mã OTP'}
            </button>

            <p className="auth-switch">
              <button
                type="button"
                onClick={onBackToLogin}
                className="link-button"
                disabled={loading}
              >
                ← Quay lại đăng nhập
              </button>
            </p>
          </form>
        )}

        {/* Step 2: Nhập OTP */}
        {step === 2 && (
          <form onSubmit={handleVerifyOTP}>
            <p className="form-description">
              Mã OTP đã được gửi đến <strong>{email}</strong>. Vui lòng kiểm tra hộp thư.
            </p>

            <div className="form-group">
              <label htmlFor="otp">Mã OTP (6 chữ số)</label>
              <input
                type="text"
                id="otp"
                name="otp"
                value={otp}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setOtp(value);
                  if (errors.otp) setErrors({});
                }}
                className={errors.otp ? 'error' : ''}
                placeholder="Nhập mã OTP"
                disabled={loading}
                maxLength="6"
                autoComplete="off"
              />
              {errors.otp && <span className="error-message">{errors.otp}</span>}
            </div>

            <button 
              type="submit" 
              className="btn btn-primary btn-block"
              disabled={loading}
            >
              {loading ? 'Đang xác nhận...' : 'Xác nhận OTP'}
            </button>

            <p className="auth-switch">
              Không nhận được mã?{' '}
              <button
                type="button"
                onClick={handleResendOTP}
                className="link-button"
                disabled={loading}
              >
                Gửi lại
              </button>
            </p>

            <p className="auth-switch">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="link-button"
                disabled={loading}
              >
                ← Thay đổi email
              </button>
            </p>
          </form>
        )}

        {/* Step 3: Nhập mật khẩu mới */}
        {step === 3 && (
          <form onSubmit={handleResetPassword}>
            <p className="form-description">
              Nhập mật khẩu mới cho tài khoản của bạn.
            </p>

            <div className="form-group">
              <label htmlFor="newPassword">Mật khẩu mới</label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (errors.newPassword) setErrors({});
                }}
                className={errors.newPassword ? 'error' : ''}
                placeholder="Nhập mật khẩu mới"
                disabled={loading}
                autoComplete="new-password"
              />
              {errors.newPassword && <span className="error-message">{errors.newPassword}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Xác nhận mật khẩu</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) setErrors({});
                }}
                className={errors.confirmPassword ? 'error' : ''}
                placeholder="Nhập lại mật khẩu mới"
                disabled={loading}
                autoComplete="new-password"
              />
              {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
            </div>

            <button 
              type="submit" 
              className="btn btn-primary btn-block"
              disabled={loading}
            >
              {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordForm;