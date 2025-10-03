// client/src/pages/ForgotPasswordPage.js
// Trang quên mật khẩu - gửi OTP qua email

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Hàm xử lý submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!email) {
      setMessage({ type: 'error', text: 'Vui lòng nhập email' });
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post('http://localhost:3001/api/users/forgot-password', {
        email
      });

      setMessage({ 
        type: 'success', 
        text: response.data.message || 'Mã OTP đã được gửi đến email của bạn!' 
      });

      // Chuyển sang trang reset password sau 2 giây
      setTimeout(() => {
        navigate('/reset-password', { state: { email } });
      }, 2000);

    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Gửi OTP thất bại. Vui lòng thử lại.' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.formWrapper}>
        <h2 style={styles.title}>Quên mật khẩu</h2>
        <p style={styles.description}>
          Nhập email của bạn để nhận mã OTP đặt lại mật khẩu
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
              placeholder="Nhập email đã đăng ký"
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
            {loading ? 'Đang gửi...' : 'Gửi mã OTP'}
          </button>
        </form>

        <div style={styles.footer}>
          <p><a href="/login" style={styles.link}>Quay lại đăng nhập</a></p>
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
    maxWidth: '400px',
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

export default ForgotPasswordPage;