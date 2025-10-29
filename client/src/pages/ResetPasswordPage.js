// client/src/pages/ResetPasswordPage.js
// Trang nhập OTP và đặt lại mật khẩu mới

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const emailFromState = location.state?.email || '';

  const [formData, setFormData] = useState({
    email: emailFromState,
    otp: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Hàm xử lý thay đổi input
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Hàm xử lý submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    // Validate
    if (!formData.email || !formData.otp || !formData.newPassword) {
      setMessage({ type: 'error', text: 'Vui lòng điền đầy đủ thông tin' });
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setMessage({ type: 'error', text: 'Mật khẩu xác nhận không khớp' });
      return;
    }

    if (formData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Mật khẩu phải có ít nhất 6 ký tự' });
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post('http://localhost:3002/api/users/reset-password', {
        email: formData.email,
        otp: formData.otp,
        newPassword: formData.newPassword
      });

      setMessage({ 
        type: 'success', 
        text: response.data.message || 'Đặt lại mật khẩu thành công!' 
      });

      // Chuyển về trang đăng nhập sau 2 giây
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Đặt lại mật khẩu thất bại. Vui lòng thử lại.' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.formWrapper}>
        <h2 style={styles.title}>Đặt lại mật khẩu</h2>
        <p style={styles.description}>
          Nhập mã OTP đã được gửi đến email và mật khẩu mới
        </p>
        
        {message.text && (
          <div style={{
            ...styles.message,
            backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
            color: message.type === 'success' ? '#155724' : '#721c24',
            border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`
          }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              style={styles.input}
              placeholder="Nhập email"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Mã OTP</label>
            <input
              type="text"
              name="otp"
              value={formData.otp}
              onChange={handleChange}
              required
              maxLength="6"
              style={styles.input}
              placeholder="Nhập mã OTP 6 số"
            />
            <small style={styles.hint}>Mã OTP có hiệu lực trong 10 phút</small>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Mật khẩu mới</label>
            <input
              type="password"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              required
              minLength="6"
              style={styles.input}
              placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Xác nhận mật khẩu</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              style={styles.input}
              placeholder="Nhập lại mật khẩu mới"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{
              ...styles.button,
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
          </button>
        </form>

        <div style={styles.footer}>
          <p>
            <a href="/forgot-password" style={styles.link}>Gửi lại mã OTP</a>
          </p>
          <p>
            <a href="/login" style={styles.link}>Quay lại đăng nhập</a>
          </p>
        </div>
      </div>
    </div>
  );
};

// Styles
const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: '20px'
  },
  formWrapper: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    maxWidth: '450px',
    width: '100%'
  },
  title: {
    textAlign: 'center',
    marginBottom: '10px',
    color: '#333'
  },
  description: {
    textAlign: 'center',
    marginBottom: '30px',
    color: '#666',
    fontSize: '14px'
  },
  message: {
    padding: '12px',
    borderRadius: '4px',
    marginBottom: '20px',
    textAlign: 'center'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column'
  },
  label: {
    marginBottom: '5px',
    fontWeight: '500',
    color: '#555'
  },
  input: {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px'
  },
  hint: {
    marginTop: '5px',
    fontSize: '12px',
    color: '#999'
  },
  button: {
    padding: '12px',
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    fontWeight: '500',
    marginTop: '10px'
  },
  footer: {
    marginTop: '20px',
    textAlign: 'center'
  },
  link: {
    color: '#2196F3',
    textDecoration: 'none',
    fontWeight: '500'
  }
};

export default ResetPasswordPage;