// client/src/pages/LoginPage.js
// ====================================================================
// PHIÊN BẢN ĐÃ FIX: Sử dụng AuthContext để đồng bộ login
// ====================================================================

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // ✅ FIX: Import useAuth
import './LoginPage.css';

const LoginPage = () => {
  // ✅ FIX: Sử dụng login từ AuthContext thay vì axios trực tiếp
  const { login } = useAuth();
  
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // ✅ FIX: Gọi login từ AuthContext
      // Hàm này sẽ tự động:
      // 1. Lưu token và user vào localStorage
      // 2. Cập nhật state trong AuthContext
      // 3. Dispatch event authStateChanged
      // 4. Navigate về /dashboard
      await login(formData.email, formData.password);
      
      // Không cần navigate ở đây vì AuthContext đã xử lý
      // Không cần alert vì UX tốt hơn là chuyển trang ngay
    } catch (err) {
      console.error('Lỗi đăng nhập:', err);
      // Hiển thị thông báo lỗi chi tiết hơn
      const errorMessage = err.response?.data?.message || 
                          err.message || 
                          'Đăng nhập thất bại. Vui lòng kiểm tra lại email và mật khẩu.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="auth-header">
          <div className="logo-circle">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.5 2v8.5H3c0 4.7 3.8 8.5 8.5 8.5s8.5-3.8 8.5-8.5S16.2 2 11.5 2zm1 14.5c-3.6 0-6.5-2.9-6.5-6.5h6.5V3.5c3.6 0 6.5 2.9 6.5 6.5s-2.9 6.5-6.5 6.5z"/>
            </svg>
          </div>
          <h2>Đăng nhập</h2>
          <p className="subtitle">Chào mừng bạn trở lại</p>
        </div>

        {/* Hiển thị thông báo lỗi nếu có */}
        {error && (
          <div className="error-message">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
              <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
            </svg>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="your@email.com"
              disabled={loading}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label>Mật khẩu</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Nhập mật khẩu"
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
                disabled={loading}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner-small"></span>
                Đang đăng nhập...
              </>
            ) : 'Đăng nhập'}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/dat-lai-mat-khau" className="link-primary">Quên mật khẩu?</Link>
          <div className="divider">
            <span>hoặc</span>
          </div>
          <Link to="/register" className="link-secondary">Chưa có tài khoản? Đăng ký ngay</Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;