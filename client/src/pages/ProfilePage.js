// client/src/pages/ProfilePage.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const ProfilePage = () => {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    address: '',
    gender: '',
    dob: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  const axiosConfig = {
    headers: { Authorization: `Bearer ${token}` }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/users/profile', axiosConfig);
      setUser(res.data.user);
      setFormData({
        full_name: res.data.user.full_name || '',
        phone: res.data.user.phone || '',
        address: res.data.user.address || '',
        gender: res.data.user.gender || '',
        dob: res.data.user.dob ? res.data.user.dob.split('T')[0] : ''
      });
      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
      if (error.response?.status === 401) {
        navigate('/login');
      }
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    try {
      const res = await axios.put(
        'http://localhost:3001/api/users/profile',
        formData,
        axiosConfig
      );

      if (res.data.success) {
        setMessage({ type: 'success', text: 'Cập nhật thông tin thành công!' });
        fetchProfile();
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Cập nhật thất bại' 
      });
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Mật khẩu mới không khớp' });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Mật khẩu phải có ít nhất 6 ký tự' });
      return;
    }

    try {
      const res = await axios.put(
        'http://localhost:3001/api/users/change-password',
        {
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        },
        axiosConfig
      );

      if (res.data.success) {
        setMessage({ type: 'success', text: 'Đổi mật khẩu thành công!' });
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Đổi mật khẩu thất bại' 
      });
    }
  };

  if (loading) {
    return <div className="loading">Đang tải...</div>;
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>Thông tin tài khoản</h1>
        <button onClick={() => navigate('/dashboard')} className="btn-back">
          Quay lại Dashboard
        </button>
      </div>

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="profile-content">
        {/* Thông tin cơ bản */}
        <div className="info-card">
          <h2>Thông tin cơ bản</h2>
          <div className="info-grid">
            <div className="info-item">
              <strong>Email:</strong>
              <span>{user?.email}</span>
            </div>
            <div className="info-item">
              <strong>Vai trò:</strong>
              <span className={`badge badge-${user?.role}`}>
                {user?.role}
              </span>
            </div>
            <div className="info-item">
              <strong>Trạng thái:</strong>
              <span className={`status ${user?.is_active ? 'active' : 'inactive'}`}>
                {user?.is_active ? 'Hoạt động' : 'Bị khóa'}
              </span>
            </div>
            <div className="info-item">
              <strong>Xác thực:</strong>
              <span className={`status ${user?.is_verified ? 'verified' : 'unverified'}`}>
                {user?.is_verified ? 'Đã xác thực' : 'Chưa xác thực'}
              </span>
            </div>
          </div>
        </div>

        {/* Form cập nhật thông tin */}
        <div className="form-card">
          <h2>Cập nhật thông tin</h2>
          <form onSubmit={handleUpdateProfile}>
            <div className="form-group">
              <label>Họ tên:</label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="Nguyễn Văn A"
              />
            </div>

            <div className="form-group">
              <label>Số điện thoại:</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="0901234567"
              />
            </div>

            <div className="form-group">
              <label>Địa chỉ:</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="123 Đường ABC"
              />
            </div>

            <div className="form-group">
              <label>Giới tính:</label>
              <select name="gender" value={formData.gender} onChange={handleChange}>
                <option value="">Chọn giới tính</option>
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
                <option value="other">Khác</option>
              </select>
            </div>

            <div className="form-group">
              <label>Ngày sinh:</label>
              <input
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
              />
            </div>

            <button type="submit" className="btn-submit">
              Cập nhật thông tin
            </button>
          </form>
        </div>

        {/* Form đổi mật khẩu */}
        <div className="form-card">
          <h2>Đổi mật khẩu</h2>
          <form onSubmit={handleChangePassword}>
            <div className="form-group">
              <label>Mật khẩu hiện tại:</label>
              <input
                type="password"
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                placeholder="******"
                required
              />
            </div>

            <div className="form-group">
              <label>Mật khẩu mới:</label>
              <input
                type="password"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                placeholder="Ít nhất 6 ký tự"
                required
              />
            </div>

            <div className="form-group">
              <label>Xác nhận mật khẩu mới:</label>
              <input
                type="password"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                placeholder="Nhập lại mật khẩu mới"
                required
              />
            </div>

            <button type="submit" className="btn-submit btn-password">
              Đổi mật khẩu
            </button>
          </form>
        </div>
      </div>

      <style jsx>{`
        .profile-container {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
          background: #f5f5f5;
          min-height: 100vh;
        }
        .profile-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }
        .btn-back {
          background: #95a5a6;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
        }
        .message {
          padding: 1rem;
          border-radius: 4px;
          margin-bottom: 1.5rem;
        }
        .message.success {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }
        .message.error {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }
        .profile-content {
          display: grid;
          gap: 1.5rem;
        }
        .info-card, .form-card {
          background: white;
          padding: 1.5rem;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .info-card h2, .form-card h2 {
          margin-bottom: 1rem;
          color: #333;
          border-bottom: 2px solid #3498db;
          padding-bottom: 0.5rem;
        }
        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
        }
        .info-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .info-item strong {
          color: #666;
          font-size: 0.9rem;
        }
        .badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 600;
          text-transform: uppercase;
        }
        .badge-admin { background: #e74c3c; color: white; }
        .badge-staff { background: #3498db; color: white; }
        .badge-doctor { background: #2ecc71; color: white; }
        .badge-patient { background: #95a5a6; color: white; }
        .status {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 600;
        }
        .status.active { background: #d4edda; color: #155724; }
        .status.inactive { background: #f8d7da; color: #721c24; }
        .status.verified { background: #d1ecf1; color: #0c5460; }
        .status.unverified { background: #fff3cd; color: #856404; }
        .form-group {
          margin-bottom: 1rem;
        }
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 600;
          color: #555;
        }
        .form-group input, .form-group select {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
        }
        .form-group input:focus, .form-group select:focus {
          outline: none;
          border-color: #3498db;
        }
        .btn-submit {
          background: #3498db;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1rem;
        }
        .btn-submit:hover {
          background: #2980b9;
        }
        .btn-password {
          background: #e67e22;
        }
        .btn-password:hover {
          background: #d35400;
        }
        .loading {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          font-size: 1.2rem;
        }
      `}</style>
    </div>
  );
};

export default ProfilePage;