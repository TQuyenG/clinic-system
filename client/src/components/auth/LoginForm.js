import React, { useState } from 'react';
import { login } from '../../services/authService';
import { useNavigate } from 'react-router-dom';
import '../css/auth.css';

const LoginForm = ({ onSuccess, onSwitchToRegister, onForgotPassword }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = 'Email là bắt buộc';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    if (!formData.password) {
      newErrors.password = 'Mật khẩu là bắt buộc';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const response = await login(formData);

      // Lưu remember me nếu user chọn
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      }

      // Callback success
      if (onSuccess) {
        onSuccess(response);
      }

      // Redirect theo role
      const role = response.user.role;
      switch (role) {
        case 'admin':
          navigate('/dashboard/admin');
          break;
        case 'doctor':
          navigate('/dashboard/doctor');
          break;
        case 'staff':
          navigate('/dashboard/staff');
          break;
        case 'patient':
        default:
          navigate('/dashboard/patient');
          break;
      }

    } catch (error) {
      if (error.needsVerification) {
        setErrors({ 
          submit: 'Vui lòng xác nhận email trước khi đăng nhập. Kiểm tra hộp thư của bạn.' 
        });
      } else {
        setErrors({ 
          submit: error.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.' 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2 className="auth-form-title">Đăng nhập</h2>

        {errors.submit && (
          <div className="alert alert-error">
            {errors.submit}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={errors.email ? 'error' : ''}
            placeholder="Nhập email của bạn"
            disabled={loading}
            autoComplete="email"
          />
          {errors.email && <span className="error-message">{errors.email}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="password">Mật khẩu</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className={errors.password ? 'error' : ''}
            placeholder="Nhập mật khẩu"
            disabled={loading}
            autoComplete="current-password"
          />
          {errors.password && <span className="error-message">{errors.password}</span>}
        </div>

        <div className="form-options">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={loading}
            />
            <span>Ghi nhớ đăng nhập</span>
          </label>

          <button
            type="button"
            onClick={onForgotPassword}
            className="link-button"
            disabled={loading}
          >
            Quên mật khẩu?
          </button>
        </div>

        <button 
          type="submit" 
          className="btn btn-primary btn-block"
          disabled={loading}
        >
          {loading ? 'Đang xử lý...' : 'Đăng nhập'}
        </button>

        <p className="auth-switch">
          Chưa có tài khoản?{' '}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="link-button"
            disabled={loading}
          >
            Đăng ký ngay
          </button>
        </p>
      </form>
    </div>
  );
};

export default LoginForm;