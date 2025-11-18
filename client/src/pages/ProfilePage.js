// client/src/pages/ProfilePage.js
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
// BƯỚC 1: Import Toastify
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
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
  FaFileAlt,
  FaIdCard,
  FaBuilding,
  FaShieldAlt,
  FaCamera,
  FaTrash
} from 'react-icons/fa';
import './ProfilePage.css';

const ProfilePage = () => {
  // State quản lý dữ liệu
  const [user, setUser] = useState(null);
  const [roleInfo, setRoleInfo] = useState(null);
  const [specialties, setSpecialties] = useState([]);
  
  // State cho form cơ bản
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    address: '',
    gender: '',
    dob: ''
  });
  
  // State cho form bác sĩ
  const [doctorFormData, setDoctorFormData] = useState({
    specialty_id: '',
    experience_years: '',
    bio: '',
    certifications: []
  });
  
  // State cho thêm chứng chỉ
  const [newCertification, setNewCertification] = useState('');
  
  // State cho đổi mật khẩu
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // State cho avatar
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  // State khác
  const [loading, setLoading] = useState(true);
  // BƯỚC 2: Thêm State cho lỗi (thay thế cho 'message')
  const [errors, setErrors] = useState({});
  
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const token = localStorage.getItem('token');
  const axiosConfig = {
    headers: { Authorization: `Bearer ${token}` }
  };

  // UseEffect chạy khi component mount
  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchProfile();
    fetchSpecialties();
  }, []);

  // Lấy danh sách chuyên khoa
  const fetchSpecialties = async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/specialties');
      if (res.data.success) {
        setSpecialties(res.data.specialties);
      }
    } catch (error) {
      console.error('Error fetching specialties:', error);
    }
  };

  // Lấy thông tin profile
  const fetchProfile = async () => {
    try {
      const profileRes = await axios.get('http://localhost:3001/api/users/profile', axiosConfig);
      const userData = profileRes.data.user || profileRes.data;
      
      setUser(userData);
      
      if (userData.avatar_url) {
        setAvatarPreview(userData.avatar_url);
      }
      
      setFormData({
        full_name: userData.full_name || '',
        phone: userData.phone || '',
        address: userData.address || '',
        gender: userData.gender || '',
        dob: userData.dob ? userData.dob.split('T')[0] : ''
      });

      await fetchRoleInfo();
      setLoading(false);
    } catch (error) {
      console.error('Error fetching profile:', error);
      if (error.response?.status === 401) {
        navigate('/login');
      }
      setLoading(false);
    }
  };

  // Lấy thông tin role của user
  const fetchRoleInfo = async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/users/my-role-info', axiosConfig);
      
      if (res.data.success && res.data.user.roleData) {
        const roleData = res.data.user.roleData;
        setRoleInfo(roleData);
        
        if (res.data.user.role === 'doctor') {
          setDoctorFormData({
            specialty_id: roleData.specialty_id || '',
            experience_years: roleData.experience_years || '',
            bio: roleData.bio || '',
            certifications: roleData.certifications || []
          });
        }
      }
    } catch (error) {
      console.error('Error fetching role info:', error);
      // BƯỚC 3: Thay thế showMessage bằng toast.error
      toast.error('Không thể lấy thông tin chi tiết. Vui lòng thử lại.');
    }
  };

  // BƯỚC 4: Xóa hàm showMessage
  // const showMessage = (type, text) => { ... }

  // BƯỚC 5: Cập nhật hàm handle change để xóa lỗi khi gõ
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    // Xóa lỗi khi người dùng bắt đầu gõ
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleDoctorChange = (e) => {
    setDoctorFormData({ ...doctorFormData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData({ ...passwordData, [name]: value });
    // Xóa lỗi khi người dùng bắt đầu gõ
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    // Nếu gõ vào ô mật khẩu mới, cũng xóa lỗi ở ô xác nhận
    if (name === 'newPassword' && errors.confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: '' }));
    }
  };

  // Xử lý chọn file avatar
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Chỉ chấp nhận file ảnh (JPEG, PNG, GIF, WEBP)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Kích thước file không được vượt quá 10MB');
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Upload avatar
  const handleUploadAvatar = async () => {
    if (!avatarFile) {
      toast.error('Vui lòng chọn ảnh để tải lên');
      return;
    }

    setUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append('image', avatarFile);
      if (user.avatar_url) {
        formData.append('oldImage', user.avatar_url);
      }

      const uploadRes = await axios.post('http://localhost:3001/api/upload/image', formData, {
        headers: { ...axiosConfig.headers, 'Content-Type': 'multipart/form-data' }
      });

      if (uploadRes.data.success) {
        const avatarUrl = uploadRes.data.url;
        const updateRes = await axios.put(
          'http://localhost:3001/api/users/profile',
          { avatar_url: avatarUrl },
          axiosConfig
        );

        if (updateRes.data.success) {
          toast.success('Cập nhật ảnh đại diện thành công!');
          setAvatarFile(null);
          
          const userFromStorage = JSON.parse(localStorage.getItem('user'));
          userFromStorage.avatar_url = avatarUrl;
          localStorage.setItem('user', JSON.stringify(userFromStorage));
          
          fetchProfile(); // Refresh profile
        }
      }
    } catch (error) {
      console.error('Upload avatar error:', error);
      toast.error(error.response?.data?.message || 'Tải ảnh lên thất bại');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Xóa avatar
  const handleRemoveAvatar = async () => {
    if (!window.confirm('Bạn có chắc muốn xóa ảnh đại diện?')) return;

    try {
      const res = await axios.put(
        'http://localhost:3001/api/users/profile',
        { avatar_url: null },
        axiosConfig
      );

      if (res.data.success) {
        toast.success('Đã xóa ảnh đại diện');
        setAvatarPreview(null);
        setAvatarFile(null);
        
        const userFromStorage = JSON.parse(localStorage.getItem('user'));
        userFromStorage.avatar_url = null;
        localStorage.setItem('user', JSON.stringify(userFromStorage));
        
        fetchProfile();
      }
    } catch (error) {
      console.error('Remove avatar error:', error);
      toast.error('Xóa ảnh đại diện thất bại');
    }
  };

  // Xử lý thêm chứng chỉ
  const handleAddCertification = () => {
    if (!newCertification.trim()) {
      toast.warning('Vui lòng nhập nội dung chứng chỉ');
      return;
    }
    setDoctorFormData({
      ...doctorFormData,
      certifications: [...doctorFormData.certifications, newCertification.trim()]
    });
    setNewCertification('');
    toast.success('Đã thêm chứng chỉ');
  };

  // Xử lý xóa chứng chỉ
  const handleRemoveCertification = (index) => {
    setDoctorFormData({
      ...doctorFormData,
      certifications: doctorFormData.certifications.filter((_, i) => i !== index)
    });
    toast.success('Đã xóa chứng chỉ');
  };

  // Cập nhật thông tin cơ bản
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setErrors({}); // Xóa lỗi cũ
    
    // BƯỚC 6: Thêm logic xác thực phía client (ví dụ cho SĐT)
    const newErrors = {};
    const phoneRegex = /^(0[3|5|7|8|9])+([0-9]{8})\b$/;
    if (formData.phone && !phoneRegex.test(formData.phone)) {
      newErrors.phone = 'Số điện thoại không hợp lệ (10 số, bắt đầu 03/05/07/08/09)';
    }
    // ... (Thêm các validation khác như họ tên không được trống...)

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors); // Hiển thị lỗi
      return; // Dừng lại
    }

    try {
      const updateData = {
        full_name: formData.full_name || null,
        phone: formData.phone || null,
        address: formData.address || null,
        gender: formData.gender || null,
        dob: formData.dob && formData.dob !== 'Invalid date' ? formData.dob : null
      };

      const res = await axios.put(
        'http://localhost:3001/api/users/profile',
        updateData,
        axiosConfig
      );

      if (res.data.success) {
        toast.success('Cập nhật thông tin thành công!');
        
        const userFromStorage = JSON.parse(localStorage.getItem('user'));
        userFromStorage.full_name = updateData.full_name;
        localStorage.setItem('user', JSON.stringify(userFromStorage));
        
        fetchProfile();
      }
    } catch (error) {
      console.error('Update profile error:', error);
      toast.error(error.response?.data?.message || 'Cập nhật thất bại');
    }
  };

  // Cập nhật thông tin bác sĩ
  const handleUpdateDoctorInfo = async (e) => {
    e.preventDefault();
    // (Tương tự, bạn có thể thêm validation cho form bác sĩ ở đây)
    
    try {
      const updateData = {
        full_name: formData.full_name || null,
        phone: formData.phone || null,
        address: formData.address || null,
        gender: formData.gender || null,
        dob: formData.dob && formData.dob !== 'Invalid date' ? formData.dob : null,
        specialty_id: doctorFormData.specialty_id || null,
        experience_years: doctorFormData.experience_years ? parseInt(doctorFormData.experience_years) : null,
        bio: doctorFormData.bio || null,
        certifications: doctorFormData.certifications || []
      };

      const res = await axios.put(
        'http://localhost:3001/api/users/profile',
        updateData,
        axiosConfig
      );

      if (res.data.success) {
        toast.success('Cập nhật thông tin bác sĩ thành công!');
        fetchProfile();
      }
    } catch (error) {
      console.error('Update doctor info error:', error);
      toast.error(error.response?.data?.message || 'Cập nhật thông tin bác sĩ thất bại');
    }
  };

  // Đổi mật khẩu
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setErrors({}); // Xóa lỗi cũ
    
    // BƯỚC 7: Xử lý lỗi inline cho form mật khẩu
    if (!passwordData.currentPassword) {
      setErrors(prev => ({ ...prev, currentPassword: 'Vui lòng nhập mật khẩu hiện tại' }));
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      setErrors(prev => ({ ...prev, newPassword: 'Mật khẩu phải có ít nhất 6 ký tự' }));
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: 'Mật khẩu mới không khớp' }));
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
        toast.success('Đổi mật khẩu thành công!');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (error) {
      console.error('Change password error:', error);
      // BƯỚC 8: Gán lỗi từ server vào đúng trường
      const errorMsg = error.response?.data?.message || 'Đổi mật khẩu thất bại';
      if (errorMsg.includes('Mật khẩu hiện tại không đúng')) {
        setErrors({ currentPassword: 'Mật khẩu hiện tại không đúng' });
      } else {
        toast.error(errorMsg);
      }
    }
  };

  // Hàm helper (Không thay đổi)
  const getRoleLabel = (role) => {
    const roles = {
      admin: 'Quản trị viên',
      staff: 'Nhân viên',
      doctor: 'Bác sĩ',
      patient: 'Bệnh nhân'
    };
    return roles[role] || role;
  };

  // Hàm helper (Không thay đổi)
  const getGenderLabel = (gender) => {
    const genders = {
      male: 'Nam',
      female: 'Nữ',
      other: 'Khác'
    };
    return genders[gender] || 'Chưa cập nhật';
  };

  // Loading state
  if (loading) {
    return (
      <div className="profile-page-loading">
        <div className="profile-page-spinner"></div>
        <p>Đang tải thông tin...</p>
      </div>
    );
  }

  // Main render
  return (
    <div className="profile-page-container">
      {/* BƯỚC 9: Thêm ToastContainer ở đây */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />

      {/* Header */}
      <div className="profile-page-header">
        <div className="profile-page-header-content">
          <h1><FaUser className="profile-page-header-icon" /> Thông tin tài khoản</h1>
          <p className="profile-page-header-subtitle">Quản lý thông tin cá nhân và bảo mật</p>
        </div>
        <button onClick={() => navigate('/dashboard')} className="profile-page-btn-back">
          <FaArrowLeft /> Quay lại
        </button>
      </div>

      {/* BƯỚC 10: Xóa khối message cũ */}
      {/* {message.text && ( ... )} */}

      <div className="profile-page-content">
        {/* Sidebar */}
        <div className="profile-page-sidebar">
          {/* Avatar Card */}
          <div className="profile-page-avatar-card">
            <div className="profile-page-avatar-wrapper">
              <div className="profile-page-avatar">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="profile-page-avatar-image" />
                ) : (
                  <FaUser className="profile-page-avatar-icon" />
                )}
              </div>
              <div className="profile-page-avatar-actions">
                <button 
                  className="profile-page-avatar-btn profile-page-avatar-btn-upload"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  title="Chọn ảnh"
                >
                  <FaCamera />
                </button>
                {(avatarPreview || user?.avatar_url) && (
                  <button 
                    className="profile-page-avatar-btn profile-page-avatar-btn-remove"
                    onClick={handleRemoveAvatar}
                    disabled={uploadingAvatar}
                    title="Xóa ảnh"
                  >
                    <FaTrash />
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ display: 'none' }}
              />
            </div>

            {avatarFile && (
              <button 
                className="profile-page-btn-save-avatar"
                onClick={handleUploadAvatar}
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? 'Đang tải lên...' : 'Lưu ảnh đại diện'}
              </button>
            )}

            <h2 className="profile-page-user-name">{user?.full_name || 'Chưa cập nhật'}</h2>
            <p className="profile-page-user-email">
              <FaEnvelope /> {user?.email}
            </p>
            <div className="profile-page-user-role">
              <FaUserShield className="profile-page-role-icon" />
              <span className={`profile-page-badge profile-page-badge-${user?.role}`}>
                {getRoleLabel(user?.role)}
              </span>
            </div>
            
            {roleInfo && roleInfo.code && (
              <div className={`profile-page-role-code profile-page-role-code-${user?.role}`}>
                {user?.role === 'doctor' && <><FaStethoscope /> Mã BS: {roleInfo.code}</>}
                {user?.role === 'patient' && <><FaIdCard /> Mã BN: {roleInfo.code}</>}
                {user?.role === 'staff' && <><FaBuilding /> Mã NV: {roleInfo.code}</>}
                {user?.role === 'admin' && <><FaShieldAlt /> Mã QTV: {roleInfo.code}</>}
              </div>
            )}
          </div>

          {/* Trạng thái tài khoản */}
          <div className="profile-page-status-card">
            <h3 className="profile-page-status-title">Trạng thái tài khoản</h3>
            <div className="profile-page-status-list">
              <div className="profile-page-status-item">
                <span className="profile-page-status-label">Hoạt động:</span>
                <span className={`profile-page-status-badge ${user?.is_active ? 'profile-page-status-active' : 'profile-page-status-inactive'}`}>
                  {user?.is_active ? <><FaCheckCircle /> Đang hoạt động</> : <><FaTimesCircle /> Bị khóa</>}
                </span>
              </div>
              <div className="profile-page-status-item">
                <span className="profile-page-status-label">Xác thực:</span>
                <span className={`profile-page-status-badge ${user?.is_verified ? 'profile-page-status-verified' : 'profile-page-status-unverified'}`}>
                  {user?.is_verified ? <><FaCheckCircle /> Đã xác thực</> : <><FaTimesCircle /> Chưa xác thực</>}
                </span>
              </div>
            </div>
          </div>

          {/* ... (Các card sidebar khác không đổi) ... */}
          {user?.role === 'doctor' && roleInfo?.Specialty && (
            <div className="profile-page-specialty-card">
              <h3 className="profile-page-specialty-title">
                <FaStethoscope /> Chuyên khoa
              </h3>
              <div className="profile-page-specialty-info">
                <p className="profile-page-specialty-name">{roleInfo.Specialty.name}</p>
                {roleInfo.experience_years && (
                  <p className="profile-page-experience">
                    <FaBriefcase /> {roleInfo.experience_years} năm kinh nghiệm
                  </p>
                )}
              </div>
            </div>
          )}
          {user?.role === 'staff' && roleInfo?.department && (
            <div className="profile-page-specialty-card">
              <h3 className="profile-page-specialty-title">
                <FaBuilding /> Phòng ban
              </h3>
              <div className="profile-page-specialty-info">
                <p className="profile-page-specialty-name">{roleInfo.department}</p>
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="profile-page-main">
          {/* Form cập nhật thông tin cơ bản */}
          <div className="profile-page-form-card">
            <div className="profile-page-card-header">
              <h2><FaEdit /> Cập nhật thông tin cá nhân</h2>
            </div>
            <form onSubmit={handleUpdateProfile} className="profile-page-form">
              <div className="profile-page-form-row">
                <div className="profile-page-form-group">
                  <label className="profile-page-form-label">
                    <FaUser /> Họ và tên
                  </label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    placeholder="Nguyễn Văn A"
                    // BƯỚC 11: Thêm class lỗi và hiển thị lỗi
                    className={`profile-page-form-input ${errors.full_name ? 'profile-page-form-input-error' : ''}`}
                  />
                  {errors.full_name && <small className="profile-page-form-error">{errors.full_name}</small>}
                </div>

                <div className="profile-page-form-group">
                  <label className="profile-page-form-label">
                    <FaPhone /> Số điện thoại
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="0901234567"
                    className={`profile-page-form-input ${errors.phone ? 'profile-page-form-input-error' : ''}`}
                  />
                  {errors.phone && <small className="profile-page-form-error">{errors.phone}</small>}
                </div>
              </div>

              <div className="profile-page-form-group">
                <label className="profile-page-form-label">
                  <FaMapMarkerAlt /> Địa chỉ
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="123 Đường ABC, Quận XYZ"
                  className={`profile-page-form-input ${errors.address ? 'profile-page-form-input-error' : ''}`}
                />
                {errors.address && <small className="profile-page-form-error">{errors.address}</small>}
              </div>

              <div className="profile-page-form-row">
                <div className="profile-page-form-group">
                  <label className="profile-page-form-label">
                    <FaVenusMars /> Giới tính
                  </label>
                  <select 
                    name="gender" 
                    value={formData.gender} 
                    onChange={handleChange}
                    className="profile-page-form-select"
                  >
                    <option value="">Chọn giới tính</option>
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                    <option value="other">Khác</option>
                  </select>
                </div>

                <div className="profile-page-form-group">
                  <label className="profile-page-form-label">
                    <FaCalendar /> Ngày sinh
                  </label>
                  <input
                    type="date"
                    name="dob"
                    value={formData.dob}
                    onChange={handleChange}
                    className="profile-page-form-input"
                  />
                </div>
              </div>

              <button type="submit" className="profile-page-btn-submit">
                <FaCheckCircle /> Cập nhật thông tin
              </button>
            </form>
          </div>

          {/* Form thông tin bác sĩ (chỉ hiển thị khi role là doctor) */}
          {user?.role === 'doctor' && (
            <div className="profile-page-form-card">
              <div className="profile-page-card-header profile-page-card-header-doctor">
                <h2><FaStethoscope /> Thông tin chuyên môn</h2>
              </div>
              <form onSubmit={handleUpdateDoctorInfo} className="profile-page-form">
                <div className="profile-page-form-row">
                  <div className="profile-page-form-group">
                    <label className="profile-page-form-label">
                      <FaStethoscope /> Chuyên khoa
                    </label>
                    <select 
                      name="specialty_id" 
                      value={doctorFormData.specialty_id} 
                      onChange={handleDoctorChange}
                      className="profile-page-form-select"
                    >
                      <option value="">Chọn chuyên khoa</option>
                      {specialties.map(specialty => (
                        <option key={specialty.id} value={specialty.id}>
                          {specialty.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="profile-page-form-group">
                    <label className="profile-page-form-label">
                      <FaBriefcase /> Số năm kinh nghiệm
                    </label>
                    <input
                      type="number"
                      name="experience_years"
                      value={doctorFormData.experience_years}
                      onChange={handleDoctorChange}
                      placeholder="Ví dụ: 5"
                      min="0"
                      className="profile-page-form-input"
                    />
                  </div>
                </div>

                <div className="profile-page-form-group">
                  <label className="profile-page-form-label">
                    <FaFileAlt /> Tiểu sử / Giới thiệu
                  </label>
                  <textarea
                    name="bio"
                    value={doctorFormData.bio}
                    onChange={handleDoctorChange}
                    placeholder="Mô tả ngắn về bản thân, kinh nghiệm làm việc..."
                    rows="4"
                    className="profile-page-form-textarea"
                  />
                </div>

                {/* Quản lý chứng chỉ */}
                <div className="profile-page-form-group">
                  <label className="profile-page-form-label">
                    <FaIdCard /> Chứng chỉ & Bằng cấp
                  </label>
                  
                  {/* Danh sách chứng chỉ hiện tại */}
                  {doctorFormData.certifications.length > 0 && (
                    <div className="profile-page-certifications-list">
                      {doctorFormData.certifications.map((cert, index) => (
                        <div key={index} className="profile-page-certification-item">
                          <span className="profile-page-certification-text">{cert}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCertification(index)}
                            className="profile-page-certification-remove"
                            title="Xóa chứng chỉ"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Form thêm chứng chỉ mới */}
                  <div className="profile-page-certification-add">
                    <input
                      type="text"
                      value={newCertification}
                      onChange={(e) => setNewCertification(e.target.value)}
                      placeholder="Nhập chứng chỉ mới (Ví dụ: Bác sĩ Đa khoa - Đại học Y Hà Nội 2010)"
                      className="profile-page-form-input"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCertification();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddCertification}
                      className="profile-page-btn-add-certification"
                    >
                      <FaCheckCircle /> Thêm
                    </button>
                  </div>
                </div>

                <button type="submit" className="profile-page-btn-submit profile-page-btn-doctor">
                  <FaCheckCircle /> Cập nhật thông tin chuyên môn
                </button>
              </form>
            </div>
          )}

          {/* Form đổi mật khẩu */}
          <div className="profile-page-form-card">
            <div className="profile-page-card-header profile-page-card-header-password">
              <h2><FaKey /> Đổi mật khẩu</h2>
            </div>

            {/* Khối quên mật khẩu (Giữ nguyên) */}
            <div style={{ 
              marginBottom: '1rem', 
              padding: '0.875rem', 
              background: '#e0f7e9', 
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '0.9rem', color: '#666' }}>
                Quên mật khẩu hiện tại?
              </span>
              <button
                type="button"
                onClick={() => navigate('/dat-lai-mat-khau')}
                style={{
                  background: 'linear-gradient(135deg, #66bb6a, #4caf50)',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
              >
                Đặt lại mật khẩu
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="profile-page-form">
              <div className="profile-page-form-group">
                <label className="profile-page-form-label">
                  <FaLock /> Mật khẩu hiện tại
                </label>
                <input
                  type="password"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  placeholder="Nhập mật khẩu hiện tại"
                  className={`profile-page-form-input ${errors.currentPassword ? 'profile-page-form-input-error' : ''}`}
                  required
                />
                {errors.currentPassword && <small className="profile-page-form-error">{errors.currentPassword}</small>}
              </div>

              <div className="profile-page-form-row">
                <div className="profile-page-form-group">
                  <label className="profile-page-form-label">
                    <FaLock /> Mật khẩu mới
                  </label>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    placeholder="Ít nhất 6 ký tự"
                    className={`profile-page-form-input ${errors.newPassword ? 'profile-page-form-input-error' : ''}`}
                    required
                  />
                  {errors.newPassword && <small className="profile-page-form-error">{errors.newPassword}</small>}
                </div>

                <div className="profile-page-form-group">
                  <label className="profile-page-form-label">
                    <FaLock /> Xác nhận mật khẩu
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    placeholder="Nhập lại mật khẩu mới"
                    className={`profile-page-form-input ${errors.confirmPassword ? 'profile-page-form-input-error' : ''}`}
                    required
                  />
                  {errors.confirmPassword && <small className="profile-page-form-error">{errors.confirmPassword}</small>}
                </div>
              </div>

              <button type="submit" className="profile-page-btn-submit profile-page-btn-password">
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