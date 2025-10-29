// client/src/pages/VerifyEmailPage.js
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    verifyEmail();
  }, []);

  const verifyEmail = async () => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('Token xác thực không hợp lệ');
      return;
    }

    try {
      const res = await axios.get(`http://localhost:3002/api/users/verify-email?token=${token}`);
      
      if (res.data.success) {
        setStatus('success');
        setMessage(res.data.message);
        setTimeout(() => navigate('/login'), 3000);
      }
    } catch (error) {
      setStatus('error');
      setMessage(error.response?.data?.message || 'Xác thực thất bại');
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
            <p>{message}</p>
            <p className="redirect">Đang chuyển hướng đến trang đăng nhập...</p>
            <button onClick={() => navigate('/login')} className="btn-login">
              Đăng nhập ngay
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="icon error">✕</div>
            <h2>Xác thực thất bại</h2>
            <p>{message}</p>
            <button onClick={() => navigate('/register')} className="btn-register">
              Đăng ký lại
            </button>
            <button onClick={() => navigate('/login')} className="btn-login">
              Về trang đăng nhập
            </button>
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
        }
        .verify-box {
          background: white;
          padding: 3rem;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          text-align: center;
          max-width: 400px;
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
          margin: 0 auto 1rem;
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
        }
        .verify-box p {
          color: #666;
          margin-bottom: 0.5rem;
        }
        .redirect {
          font-style: italic;
          color: #999;
        }
        .btn-login, .btn-register {
          background: #667eea;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 4px;
          cursor: pointer;
          margin: 0.5rem;
          font-size: 1rem;
        }
        .btn-login:hover, .btn-register:hover {
          background: #5568d3;
        }
        .btn-register {
          background: #95a5a6;
        }
        .btn-register:hover {
          background: #7f8c8d;
        }
      `}</style>
    </div>
  );
};

export default VerifyEmailPage;