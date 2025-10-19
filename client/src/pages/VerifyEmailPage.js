// client/src/pages/VerifyEmailPage.js - FIXED COMPLETELY
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(5);
  const navigate = useNavigate();

  useEffect(() => {
    verifyEmail();
  }, []);

  useEffect(() => {
    if (status === 'success' && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (status === 'success' && countdown === 0) {
      navigate('/login');
    }
  }, [status, countdown, navigate]);

  const verifyEmail = async () => {
    const token = searchParams.get('token');

    console.log('Token từ URL:', token);

    if (!token) {
      setStatus('error');
      setMessage('Token xác thực không hợp lệ. Vui lòng kiểm tra lại link trong email.');
      return;
    }

    try {
      console.log('Gửi request xác thực tới:', `http://localhost:3001/api/users/verify-email?token=${token}`);
      
      const res = await axios.get(
        `http://localhost:3001/api/users/verify-email?token=${token}`
      );

      console.log('Response nhận được:', {
        status: res.status,
        data: res.data
      });

      if (res.status === 200 && res.data.success === true) {
        setStatus('success');
        setMessage(res.data.message || 'Xác thực email thành công! Tài khoản đã được kích hoạt.');
      } else {
        setStatus('error');
        setMessage(res.data.message || 'Xác thực thất bại');
      }
      
    } catch (error) {
      console.error('Lỗi xác thực:', error);
      console.error('Error response:', error.response);
      
      setStatus('error');
      
      if (error.response) {
        const errorMsg = error.response.data?.message || 'Xác thực thất bại';
        setMessage(errorMsg);
        
        if (error.response.status === 400 && errorMsg.includes('đã được sử dụng')) {
          setStatus('success');
          setMessage('Tài khoản đã được xác thực trước đó. Bạn có thể đăng nhập ngay.');
        }
      } else if (error.request) {
        setMessage('Không thể kết nối đến server. Vui lòng kiểm tra kết nối internet.');
      } else {
        setMessage('Đã xảy ra lỗi. Vui lòng thử lại sau.');
      }
    }
  };

  const requestManualVerification = async () => {
    try {
      const token = searchParams.get('token');
      
      await axios.post('http://localhost:3001/api/notifications/request-manual-verification', {
        verification_token: token
      });
      
      alert('Đã gửi yêu cầu xác thực đến admin. Bạn sẽ nhận được thông báo khi tài khoản được kích hoạt.');
      navigate('/login');
      
    } catch (error) {
      console.error('Lỗi gửi yêu cầu:', error);
      alert('Không thể gửi yêu cầu. Vui lòng liên hệ admin qua email.');
    }
  };

  return (
    <div className="verify-container">
      <div className="verify-box">
        {status === 'verifying' && (
          <>
            <div className="spinner"></div>
            <h2>Đang xác thực email...</h2>
            <p>Vui lòng đợi trong giây lát</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="icon success">✓</div>
            <h2>Xác thực thành công!</h2>
            <p className="success-message">{message}</p>
            <div className="countdown-box">
              <p className="countdown-text">
                Tự động chuyển hướng sau <span className="countdown-number">{countdown}</span> giây...
              </p>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${(5 - countdown) * 20}%` }}
                ></div>
              </div>
            </div>
            <button onClick={() => navigate('/login')} className="btn-login">
              Đăng nhập ngay
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="icon error">✕</div>
            <h2>Xác thực thất bại</h2>
            <p className="error-message">{message}</p>
            
            <div className="error-actions">
              <button onClick={() => navigate('/register')} className="btn-register">
                Đăng ký lại
              </button>
              
              <button onClick={requestManualVerification} className="btn-help">
                Yêu cầu Admin xác thực
              </button>
              
              <button onClick={() => navigate('/login')} className="btn-login">
                Về trang đăng nhập
              </button>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .verify-container {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
        }
        .verify-box {
          background: white;
          padding: 3rem;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.15);
          text-align: center;
          max-width: 500px;
          width: 100%;
        }
        .spinner {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #667eea;
          border-radius: 50%;
          width: 50px;
          height: 50px;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .icon {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 3rem;
          margin: 0 auto 1.5rem;
          font-weight: bold;
        }
        .icon.success {
          background: #d4edda;
          color: #155724;
        }
        .icon.error {
          background: #f8d7da;
          color: #721c24;
        }
        .verify-box h2 {
          margin-bottom: 1rem;
          color: #333;
          font-size: 1.75rem;
        }
        .success-message {
          color: #155724;
          background: #d4edda;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
          font-weight: 500;
        }
        .error-message {
          color: #721c24;
          background: #f8d7da;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
          font-weight: 500;
        }
        .countdown-box {
          background: #f8f9fa;
          padding: 1.5rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
        }
        .countdown-text {
          color: #495057;
          font-size: 1rem;
          margin-bottom: 1rem;
        }
        .countdown-number {
          font-size: 1.5rem;
          font-weight: 700;
          color: #667eea;
        }
        .progress-bar {
          width: 100%;
          height: 8px;
          background: #e9ecef;
          border-radius: 4px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
          transition: width 1s linear;
        }
        .error-actions {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-top: 1.5rem;
        }
        .btn-login, .btn-register, .btn-help {
          background: #667eea;
          color: white;
          border: none;
          padding: 0.875rem 1.5rem;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 600;
          transition: all 0.3s ease;
        }
        .btn-login:hover, .btn-register:hover, .btn-help:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        .btn-register {
          background: #95a5a6;
        }
        .btn-register:hover {
          background: #7f8c8d;
        }
        .btn-help {
          background: #3498db;
        }
        .btn-help:hover {
          background: #2980b9;
        }
      `}</style>
    </div>
  );
};

export default VerifyEmailPage;