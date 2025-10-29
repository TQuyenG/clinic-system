// client/src/pages/ProfilePage.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  FaUser, 
  FaPhone, 
  FaMapMarkerAlt, 
  FaVenusMars, 
  FaCalendar, 
  FaEnvelope, 
  FaUserShield, 
  FaCheckCircle, 
  FaTimesCircle,
  FaLock,
  FaArrowLeft,
  FaEdit,
  FaKey,
  FaStethoscope,
  FaBriefcase,
  FaCertificate,
  FaFileAlt,
  FaIdCard,
  FaBuilding,
  FaUserMd,
  FaShieldAlt
} from 'react-icons/fa';
import './ProfilePage.css';

const ProfilePage = () => {
  const [user, setUser] = useState(null);
  const [roleInfo, setRoleInfo] = useState(null);
  const [specialties, setSpecialties] = useState([]);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    address: '',
    gender: '',
    dob: ''
  });
  const [doctorFormData, setDoctorFormData] = useState({
    specialty_id: '',
    experience_years: '',
    bio: ''
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
    fetchSpecialties();
  }, []);

  const fetchSpecialties = async () => {
    try {
      const res = await axios.get('http://localhost:3002/api/specialties');
      if (res.data.success) {
        setSpecialties(res.data.specialties);
      }
    } catch (error) {
      console.error('Error fetching specialties:', error);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await axios.get('http://localhost:3002/api/users/profile', axiosConfig);
      console.log('Profile response:', res.data);
      
      const userData = res.data.user || res.data;
      setUser(userData);
      
      setFormData({
        full_name: userData.full_name || '',
        phone: userData.phone || '',
        address: userData.address || '',
        gender: userData.gender || '',
        dob: userData.dob ? userData.dob.split('T')[0] : ''
      });

      // Lấy thông tin role (doctor, patient, staff, admin)
      await fetchRoleInfo(userData.id);

      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
      if (error.response?.status === 401) {
        navigate('/login');
      }
      setLoading(false);
    }
  };

  const fetchRoleInfo = async (userId) => {
    try {
      const res = await axios.get(`http://localhost:3002/api/users/${userId}`, axiosConfig);
      console.log('Role info response:', res.data);
      
      if (res.data.success && res.data.user.roleData) {
        const roleData = res.data.user.roleData;
        setRoleInfo(roleData);
        
        // Nếu là doctor, set doctor form data
        if (res.data.user.role === 'doctor') {
          setDoctorFormData({
            specialty_id: roleData.specialty_id || '',
            experience_years: roleData.experience_years || '',
            bio: roleData.bio || ''
          });
        }
      }
    } catch (error) {
      console.error('Error fetching role info:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDoctorChange = (e) => {
    setDoctorFormData({ ...doctorFormData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    try {
      // Validate và format dữ liệu
      const updateData = {
        full_name: formData.full_name || null,
        phone: formData.phone || null,
        address: formData.address || null,
        gender: formData.gender || null,
        dob: formData.dob && formData.dob !== 'Invalid date' ? formData.dob : null
      };

      console.log('Sending update data:', updateData);

      const res = await axios.put(
        'http://localhost:3002/api/users/profile',
        updateData,
        axiosConfig
      );

      if (res.data.success) {
        setMessage({ type: 'success', text: 'Cập nhật thông tin thành công!' });
        fetchProfile();
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      }
    } catch (error) {
      console.error('Update profile error:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Cập nhật thất bại' 
      });
    }
  };

  const handleUpdateDoctorInfo = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    try {
      const updateData = {
        full_name: formData.full_name || null,
        phone: formData.phone || null,
        address: formData.address || null,
        gender: formData.gender || null,
        dob: formData.dob && formData.dob !== 'Invalid date' ? formData.dob : null,
        role: 'doctor',
        specialty_id: doctorFormData.specialty_id || null,
        experience_years: doctorFormData.experience_years ? parseInt(doctorFormData.experience_years) : null,
        bio: doctorFormData.bio || null
      };

      console.log('Sending doctor update data:', updateData);

      const res = await axios.put(
        `http://localhost:3002/api/users/${user.id}`,
        updateData,
        axiosConfig
      );

      if (res.data.success) {
        setMessage({ type: 'success', text: 'Cập nhật thông tin bác sĩ thành công!' });
        fetchProfile();
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      }
    } catch (error) {
      console.error('Update doctor info error:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Cập nhật thông tin bác sĩ thất bại' 
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
        'http://localhost:3002/api/users/change-password',
        {
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        },
        axiosConfig
      );

      if (res.data.success) {
        setMessage({ type: 'success', text: 'Đổi mật khẩu thành công!' });
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      }
    } catch (error) {
      console.error('Change password error:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Đổi mật khẩu thất bại' 
      });
    }
  };

  const getRoleLabel = (role) => {
    const roles = {
      admin: 'Quản trị viên',
      staff: 'Nhân viên',
      doctor: 'Bác sĩ',
      patient: 'Bệnh nhân'
    };
    return roles[role] || role;
  };

  const getGenderLabel = (gender) => {
    const genders = {
      male: 'Nam',
      female: 'Nữ',
      other: 'Khác'
    };
    return genders[gender] || 'Chưa cập nhật';
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="profile-spinner"></div>
        <p>Đang tải thông tin...</p>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="profile-header-content">
          <h1><FaUser className="profile-header-icon" /> Thông tin tài khoản</h1>
          <p className="profile-header-subtitle">Quản lý thông tin cá nhân và bảo mật</p>
        </div>
        <button onClick={() => navigate('/dashboard')} className="profile-btn-back">
          <FaArrowLeft /> Quay lại
        </button>
      </div>

      {message.text && (
        <div className={`profile-message profile-message-${message.type}`}>
          {message.type === 'success' ? <FaCheckCircle /> : <FaTimesCircle />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="profile-content">
        <div className="profile-sidebar">
          {/* Avatar và thông tin cơ bản */}
          <div className="profile-avatar-card">
            <div className="profile-avatar">
              <FaUser className="profile-avatar-icon" />
            </div>
            <h2 className="profile-user-name">{user?.full_name || 'Chưa cập nhật'}</h2>
            <p className="profile-user-email">
              <FaEnvelope /> {user?.email}
            </p>
            <div className="profile-user-role">
              <FaUserShield className="profile-role-icon" />
              <span className={`profile-badge profile-badge-${user?.role}`}>
                {getRoleLabel(user?.role)}
              </span>
            </div>
            
            {/* Hiển thị mã theo role */}
            {roleInfo && (
              <div className={`profile-role-code profile-role-code-${user?.role}`}>
                {user?.role === 'doctor' && <><FaStethoscope /> Mã BS: {roleInfo.code}</>}
                {user?.role === 'patient' && <><FaIdCard /> Mã BN: {roleInfo.code}</>}
                {user?.role === 'staff' && <><FaBuilding /> Mã NV: {roleInfo.code}</>}
                {user?.role === 'admin' && <><FaShieldAlt /> Mã QTV: {roleInfo.code}</>}
              </div>
            )}
          </div>

          {/* Trạng thái tài khoản */}
          <div className="profile-status-card">
            <h3 className="profile-status-title">Trạng thái tài khoản</h3>
            <div className="profile-status-list">
              <div className="profile-status-item">
                <span className="profile-status-label">Hoạt động:</span>
                <span className={`profile-status-badge ${user?.is_active ? 'profile-status-active' : 'profile-status-inactive'}`}>
                  {user?.is_active ? <><FaCheckCircle /> Đang hoạt động</> : <><FaTimesCircle /> Bị khóa</>}
                </span>
              </div>
              <div className="profile-status-item">
                <span className="profile-status-label">Xác thực:</span>
                <span className={`profile-status-badge ${user?.is_verified ? 'profile-status-verified' : 'profile-status-unverified'}`}>
                  {user?.is_verified ? <><FaCheckCircle /> Đã xác thực</> : <><FaTimesCircle /> Chưa xác thực</>}
                </span>
              </div>
            </div>
          </div>

          {/* Thông tin chuyên khoa (chỉ hiển thị cho doctor) */}
          {user?.role === 'doctor' && roleInfo?.Specialty && (
            <div className="profile-specialty-card">
              <h3 className="profile-specialty-title">
                <FaStethoscope /> Chuyên khoa
              </h3>
              <div className="profile-specialty-info">
                <p className="profile-specialty-name">{roleInfo.Specialty.name}</p>
                {roleInfo.experience_years && (
                  <p className="profile-experience">
                    <FaBriefcase /> {roleInfo.experience_years} năm kinh nghiệm
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Thông tin phòng ban (staff) */}
          {user?.role === 'staff' && roleInfo?.department && (
            <div className="profile-specialty-card">
              <h3 className="profile-specialty-title">
                <FaBuilding /> Phòng ban
              </h3>
              <div className="profile-specialty-info">
                <p className="profile-specialty-name">{roleInfo.department}</p>
              </div>
            </div>
          )}
        </div>

        <div className="profile-main">
          {/* Form cập nhật thông tin */}
          <div className="profile-form-card">
            <div className="profile-card-header">
              <h2><FaEdit /> Cập nhật thông tin cá nhân</h2>
            </div>
            <form onSubmit={handleUpdateProfile} className="profile-form">
              <div className="profile-form-row">
                <div className="profile-form-group">
                  <label className="profile-form-label">
                    <FaUser /> Họ và tên
                  </label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    placeholder="Nguyễn Văn A"
                    className="profile-form-input"
                  />
                </div>

                <div className="profile-form-group">
                  <label className="profile-form-label">
                    <FaPhone /> Số điện thoại
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="0901234567"
                    className="profile-form-input"
                  />
                </div>
              </div>

              <div className="profile-form-group">
                <label className="profile-form-label">
                  <FaMapMarkerAlt /> Địa chỉ
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="123 Đường ABC, Quận XYZ"
                  className="profile-form-input"
                />
              </div>

              <div className="profile-form-row">
                <div className="profile-form-group">
                  <label className="profile-form-label">
                    <FaVenusMars /> Giới tính
                  </label>
                  <select 
                    name="gender" 
                    value={formData.gender} 
                    onChange={handleChange}
                    className="profile-form-select"
                  >
                    <option value="">Chọn giới tính</option>
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                    <option value="other">Khác</option>
                  </select>
                </div>

                <div className="profile-form-group">
                  <label className="profile-form-label">
                    <FaCalendar /> Ngày sinh
                  </label>
                  <input
                    type="date"
                    name="dob"
                    value={formData.dob}
                    onChange={handleChange}
                    className="profile-form-input"
                  />
                </div>
              </div>

              <button type="submit" className="profile-btn-submit">
                <FaCheckCircle /> Cập nhật thông tin
              </button>
            </form>
          </div>

          {/* Form thông tin bác sĩ (chỉ hiển thị khi role là doctor) */}
          {user?.role === 'doctor' && (
            <div className="profile-form-card">
              <div className="profile-card-header profile-card-header-doctor">
                <h2><FaStethoscope /> Thông tin chuyên môn</h2>
              </div>
              <form onSubmit={handleUpdateDoctorInfo} className="profile-form">
                <div className="profile-form-row">
                  <div className="profile-form-group">
                    <label className="profile-form-label">
                      <FaStethoscope /> Chuyên khoa
                    </label>
                    <select 
                      name="specialty_id" 
                      value={doctorFormData.specialty_id} 
                      onChange={handleDoctorChange}
                      className="profile-form-select"
                    >
                      <option value="">Chọn chuyên khoa</option>
                      {specialties.map(specialty => (
                        <option key={specialty.id} value={specialty.id}>
                          {specialty.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="profile-form-group">
                    <label className="profile-form-label">
                      <FaBriefcase /> Số năm kinh nghiệm
                    </label>
                    <input
                      type="number"
                      name="experience_years"
                      value={doctorFormData.experience_years}
                      onChange={handleDoctorChange}
                      placeholder="Ví dụ: 5"
                      min="0"
                      className="profile-form-input"
                    />
                  </div>
                </div>

                <div className="profile-form-group">
                  <label className="profile-form-label">
                    <FaFileAlt /> Tiểu sử / Giới thiệu
                  </label>
                  <textarea
                    name="bio"
                    value={doctorFormData.bio}
                    onChange={handleDoctorChange}
                    placeholder="Mô tả ngắn về bản thân, kinh nghiệm làm việc..."
                    rows="4"
                    className="profile-form-textarea"
                  />
                </div>

                <button type="submit" className="profile-btn-submit profile-btn-doctor">
                  <FaCheckCircle /> Cập nhật thông tin chuyên môn
                </button>
              </form>
            </div>
          )}

          {/* Form đổi mật khẩu */}
          <div className="profile-form-card">
            <div className="profile-card-header profile-card-header-password">
              <h2><FaKey /> Đổi mật khẩu</h2>
            </div>
            <form onSubmit={handleChangePassword} className="profile-form">
              <div className="profile-form-group">
                <label className="profile-form-label">
                  <FaLock /> Mật khẩu hiện tại
                </label>
                <input
                  type="password"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  placeholder="Nhập mật khẩu hiện tại"
                  className="profile-form-input"
                  required
                />
              </div>

              <div className="profile-form-row">
                <div className="profile-form-group">
                  <label className="profile-form-label">
                    <FaLock /> Mật khẩu mới
                  </label>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    placeholder="Ít nhất 6 ký tự"
                    className="profile-form-input"
                    required
                  />
                </div>

                <div className="profile-form-group">
                  <label className="profile-form-label">
                    <FaLock /> Xác nhận mật khẩu
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    placeholder="Nhập lại mật khẩu mới"
                    className="profile-form-input"
                    required
                  />
                </div>
              </div>

              <button type="submit" className="profile-btn-submit profile-btn-password">
                <FaKey /> Đổi mật khẩu
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;