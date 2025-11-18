// client/src/pages/ProfilePage.js
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
// 1. Import 'api' thay vì 'axios'
import api from '../services/api'; // Giả sử file api.js nằm ở 'src/services/api.js'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { 
  FaUser, FaPhone, FaMapMarkerAlt, FaVenusMars, FaCalendar, 
  FaEnvelope, FaUserShield, FaCheckCircle, FaTimesCircle,
  FaLock, FaArrowLeft, FaEdit, FaKey,
  FaBriefcase, FaFileAlt, FaIdCard,
  FaCamera, FaTrash, FaGraduationCap, FaCertificate, FaAward,
  FaFlask, FaPlus, FaLink
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
    title: '',
    position: '',
    education: [],
    certifications: [],
    work_experience: [],
    research: [],
    achievements: []
  });
  
  // States cho form phức tạp
  const [showEducationForm, setShowEducationForm] = useState(false);
  const [showCertificationForm, setShowCertificationForm] = useState(false);
  const [showWorkExpForm, setShowWorkExpForm] = useState(false);
  const [showResearchForm, setShowResearchForm] = useState(false);
  const [showAchievementForm, setShowAchievementForm] = useState(false);
  
  const [educationForm, setEducationForm] = useState({
    degree: '',
    institution: '',
    year: '',
    description: ''
  });
  
  const [certificationForm, setCertificationForm] = useState({
    name: '',
    link: ''
  });
  
  const [workExpForm, setWorkExpForm] = useState({
    position: '',
    hospital: '',
    department: '',
    period: '',
    description: ''
  });
  
  const [researchForm, setResearchForm] = useState({
    title: '',
    authors: '',
    journal: '',
    year: '',
    link: ''
  });
  
  const [achievementForm, setAchievementForm] = useState({
    title: '',
    link: ''
  });
  
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
  const [errors, setErrors] = useState({});
  
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // 2. Bỏ 'token' và 'axiosConfig'. File 'api.js' sẽ tự động xử lý

  // UseEffect
  useEffect(() => {
    // Chỉ cần kiểm tra token, không cần lưu trữ
    if (!localStorage.getItem('token')) {
      navigate('/login');
      return;
    }
    fetchProfile();
    fetchSpecialties();
  }, [navigate]); // Thêm navigate vào dependency array

  // Lấy danh sách chuyên khoa
  const fetchSpecialties = async () => {
    try {
      // 3. Dùng 'api' và đường dẫn tương đối
      const res = await api.get('/specialties');
      if (res.data.success) {
        setSpecialties(res.data.specialties);
      }
    } catch (error) {
      console.error('Error fetching specialties:', error);
      // 'api.js' sẽ tự động hiển thị toast lỗi nếu có
    }
  };

  // Lấy thông tin profile
  const fetchProfile = async () => {
    try {
      // 4. Dùng 'api' (token được tự động đính kèm)
      const profileRes = await api.get('/users/profile');
      const userData = profileRes.data.user || profileRes.data;
      
      console.log('📊 User data:', userData);
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
      console.error(' Error fetching profile:', error);
      // 'api.js' sẽ tự động xử lý lỗi 401 và điều hướng nếu cần
      setLoading(false);
    }
  };

  // Lấy thông tin role của user
  const fetchRoleInfo = async () => {
    try {
      // 5. Dùng 'api'
      const res = await api.get('/users/my-role-info');
      
      console.log('📊 Role info response:', res.data);
      
      if (res.data.success && res.data.user.roleData) {
        const roleData = res.data.user.roleData;
        setRoleInfo(roleData);
        
        console.log('👨‍⚕️ Role data:', roleData);
        
        if (res.data.user.role === 'doctor') {
          setDoctorFormData({
            specialty_id: roleData.specialty_id || '',
            experience_years: roleData.experience_years || '',
            bio: roleData.bio || '',
            title: roleData.title || '',
            position: roleData.position || '',
            education: Array.isArray(roleData.education) ? roleData.education : [],
            certifications: Array.isArray(roleData.certifications) ? roleData.certifications : [],
            work_experience: Array.isArray(roleData.work_experience) ? roleData.work_experience : [],
            research: Array.isArray(roleData.research) ? roleData.research : [],
            achievements: Array.isArray(roleData.achievements) ? roleData.achievements : []
          });
          
          console.log(' Doctor form data set:', {
            education: roleData.education?.length || 0,
            certifications: roleData.certifications?.length || 0,
            work_experience: roleData.work_experience?.length || 0,
            research: roleData.research?.length || 0,
            achievements: roleData.achievements?.length || 0
          });
        }
      }
    } catch (error)
    {
      console.error(' Error fetching role info:', error);
      // Hiển thị toast lỗi cụ thể thay vì toast chung từ 'api.js'
      toast.error('Không thể lấy thông tin chi tiết chuyên môn. Vui lòng thử lại.');
    }
  };

  // Handle change cho form cơ bản
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  // Handle change cho form bác sĩ
  const handleDoctorChange = (e) => {
    const { name, value } = e.target;
    setDoctorFormData({ ...doctorFormData, [name]: value });
  };

  // Handle change cho form đổi mật khẩu
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData({ ...passwordData, [name]: value });
  };

  // Submit form thông tin cơ bản
  const handleBasicInfoSubmit = async (e) => {
    e.preventDefault();
    
    //  SỬA LỖI DOB: Chuyển chuỗi rỗng thành 'null'
    const dataToSend = {
      ...formData,
      dob: formData.dob || null,
      gender: formData.gender || null
    };

    console.log(' Submitting basic info:', dataToSend);
    
    try {
      // 6. Dùng 'api', đúng đường dẫn, không cần config
      const res = await api.put(
        '/users/profile',
        dataToSend
      );
      
      console.log(' Basic info update response:', res.data);
      
      if (res.data.success) {
        toast.success('Cập nhật thông tin thành công!');
        await fetchProfile();
      }
    } catch (error) {
      console.error(' Error updating profile:', error);
      // Hiển thị lỗi cụ thể từ server nếu có
      toast.error(error.response?.data?.message || 'Cập nhật thất bại!');
    }
  };

  // Submit form đổi mật khẩu
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Mật khẩu mới không khớp!');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự!');
      return;
    }

    try {
      // 7. Dùng 'api'
      const res = await api.put(
        '/users/profile/change-password',
        {
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        }
      );
      
      if (res.data.success) {
        toast.success('Đổi mật khẩu thành công!');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      }
    } catch (error) {
      console.error(' Error changing password:', error);
      toast.error(error.response?.data?.message || 'Đổi mật khẩu thất bại!');
    }
  };

  // Submit form thông tin bác sĩ
  const handleDoctorInfoSubmit = async (e) => {
    e.preventDefault();
    console.log(' Submitting doctor info:', doctorFormData);
    
    try {
      // 8. Dùng 'api' và SỬA ĐÚNG ENDPOINT
      const res = await api.put(
        '/users/profile', // Bỏ '/update'
        doctorFormData
      );
      
      console.log(' Doctor info update response:', res.data);
      
      if (res.data.success) {
        toast.success('Cập nhật thông tin chuyên môn thành công!');
        await fetchRoleInfo();
      }
    } catch (error) {
      console.error(' Error updating doctor info:', error);
      toast.error(error.response?.data?.message || 'Cập nhật thất bại!');
    }
  };

  // Xử lý avatar
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Kích thước ảnh không được vượt quá 5MB!');
        return;
      }
      
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadAvatar = async () => {
    if (!avatarFile) {
      toast.error('Vui lòng chọn ảnh trước!');
      return;
    }

    const formData = new FormData();
    // 1. DÙNG KEY 'image' (không phải 'avatar') để khớp với uploadRoutes.js
    formData.append('image', avatarFile);

    setUploadingAvatar(true);
    try {
      // 2. GỌI ĐÚNG ROUTE UPLOAD CÓ SẴN
      const uploadRes = await api.post(
        '/upload/image', //
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      // Kiểm tra response từ uploadRoutes.js
      if (uploadRes.data.success && uploadRes.data.url) {
        const newAvatarUrl = uploadRes.data.url;
        
        // 3. GỌI HÀM UPDATE PROFILE để lưu URL vào CSDL
        await api.put('/users/profile', {
          avatar_url: newAvatarUrl //
        });

        toast.success('Cập nhật ảnh đại diện thành công!');
        setAvatarFile(null);
        // Tải lại profile để hiển thị ảnh mới
        await fetchProfile(); 
      } else {
        throw new Error(uploadRes.data.message || 'Upload file thất bại');
      }
    } catch (error) {
      console.error(' Error uploading avatar:', error);
      toast.error(error.response?.data?.message || error.message || 'Upload ảnh thất bại!');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const removeAvatar = async () => {
    if (!window.confirm('Bạn có chắc muốn xóa ảnh đại diện?')) return;

    try {
      // 1. GỌI HÀM UPDATE PROFILE để set avatar_url = null
      await api.put('/users/profile', {
        avatar_url: null //
      });

      toast.success('Đã xóa ảnh đại diện!');
      setAvatarPreview(null);
      setAvatarFile(null);
      // Tải lại profile để xác nhận
      await fetchProfile(); 
      
    } catch (error) {
      console.error(' Error removing avatar:', error);
      toast.error(error.response?.data?.message || 'Xóa ảnh thất bại!');
    }
  };

  // ========================================
  // XỬ LÝ EDUCATION
  // ========================================
  const addEducation = () => {
    if (!educationForm.degree || !educationForm.institution) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc!');
      return;
    }
    
    const newEducation = [...doctorFormData.education, educationForm];
    console.log('➕ Adding education:', educationForm);
    console.log('📋 New education array:', newEducation);
    
    setDoctorFormData({
      ...doctorFormData,
      education: newEducation
    });
    
    setEducationForm({ degree: '', institution: '', year: '', description: '' });
    setShowEducationForm(false);
    toast.success('Đã thêm học vấn! Nhớ click "Cập nhật thông tin chuyên môn" để lưu.');
  };

  const removeEducation = (index) => {
    const newEducation = doctorFormData.education.filter((_, i) => i !== index);
    console.log('🗑️ Removing education at index:', index);
    setDoctorFormData({ ...doctorFormData, education: newEducation });
    toast.info('Đã xóa học vấn! Nhớ click "Cập nhật thông tin chuyên môn" để lưu.');
  };

  // ========================================
  // XỬ LÝ CERTIFICATIONS
  // ========================================
  const addCertification = () => {
    if (!certificationForm.name.trim()) {
      toast.error('Vui lòng nhập tên chứng chỉ!');
      return;
    }
    
    const newCertifications = [...doctorFormData.certifications, certificationForm];
    console.log('➕ Adding certification:', certificationForm);
    
    setDoctorFormData({
      ...doctorFormData,
      certifications: newCertifications
    });
    
    setCertificationForm({ name: '', link: '' });
    setShowCertificationForm(false);
    toast.success('Đã thêm chứng chỉ! Nhớ click "Cập nhật thông tin chuyên môn" để lưu.');
  };

  const removeCertification = (index) => {
    const newCertifications = doctorFormData.certifications.filter((_, i) => i !== index);
    console.log('🗑️ Removing certification at index:', index);
    setDoctorFormData({ ...doctorFormData, certifications: newCertifications });
    toast.info('Đã xóa chứng chỉ! Nhớ click "Cập nhật thông tin chuyên môn" để lưu.');
  };

  // ========================================
  // XỬ LÝ WORK EXPERIENCE
  // ========================================
  const addWorkExp = () => {
    if (!workExpForm.position || !workExpForm.hospital) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc!');
      return;
    }
    
    const newWorkExp = [...doctorFormData.work_experience, workExpForm];
    console.log('➕ Adding work experience:', workExpForm);
    
    setDoctorFormData({
      ...doctorFormData,
      work_experience: newWorkExp
    });
    
    setWorkExpForm({ position: '', hospital: '', department: '', period: '', description: '' });
    setShowWorkExpForm(false);
    toast.success('Đã thêm kinh nghiệm! Nhớ click "Cập nhật thông tin chuyên môn" để lưu.');
  };

  const removeWorkExp = (index) => {
    const newWorkExp = doctorFormData.work_experience.filter((_, i) => i !== index);
    console.log('🗑️ Removing work experience at index:', index);
    setDoctorFormData({ ...doctorFormData, work_experience: newWorkExp });
    toast.info('Đã xóa kinh nghiệm! Nhớ click "Cập nhật thông tin chuyên môn" để lưu.');
  };

  // ========================================
  // XỬ LÝ RESEARCH
  // ========================================
  const addResearch = () => {
    if (!researchForm.title.trim()) {
      toast.error('Vui lòng nhập tiêu đề nghiên cứu!');
      return;
    }
    
    const newResearch = [...doctorFormData.research, researchForm];
    console.log('➕ Adding research:', researchForm);
    
    setDoctorFormData({
      ...doctorFormData,
      research: newResearch
    });
    
    setResearchForm({ title: '', authors: '', journal: '', year: '', link: '' });
    setShowResearchForm(false);
    toast.success('Đã thêm nghiên cứu! Nhớ click "Cập nhật thông tin chuyên môn" để lưu.');
  };

  const removeResearch = (index) => {
    const newResearch = doctorFormData.research.filter((_, i) => i !== index);
    console.log('🗑️ Removing research at index:', index);
    setDoctorFormData({ ...doctorFormData, research: newResearch });
    toast.info('Đã xóa nghiên cứu! Nhớ click "Cập nhật thông tin chuyên môn" để lưu.');
  };

  // ========================================
  // XỬ LÝ ACHIEVEMENTS
  // ========================================
  const addAchievement = () => {
    if (!achievementForm.title.trim()) {
      toast.error('Vui lòng nhập tên thành tích!');
      return;
    }
    
    const newAchievements = [...doctorFormData.achievements, achievementForm];
    console.log('➕ Adding achievement:', achievementForm);
    
    setDoctorFormData({
      ...doctorFormData,
      achievements: newAchievements
    });
    
    setAchievementForm({ title: '', link: '' });
    setShowAchievementForm(false);
    toast.success('Đã thêm thành tích! Nhớ click "Cập nhật thông tin chuyên môn" để lưu.');
  };

  const removeAchievement = (index) => {
    const newAchievements = doctorFormData.achievements.filter((_, i) => i !== index);
    console.log('🗑️ Removing achievement at index:', index);
    setDoctorFormData({ ...doctorFormData, achievements: newAchievements });
    toast.info('Đã xóa thành tích! Nhớ click "Cập nhật thông tin chuyên môn" để lưu.');
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

  if (!user) {
    return (
      <div className="profile-page-loading">
        <p>Không tìm thấy thông tin người dùng</p>
      </div>
    );
  }

  return (
    <div className="profile-page-container">
      {/* Toast ở góc dưới bên phải */}
      <ToastContainer 
        position="bottom-right" 
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />

      {/* Header */}
      <div className="profile-page-header">
        <button onClick={() => navigate(-1)} className="profile-page-btn-back">
          <FaArrowLeft /> Quay lại
        </button>
        <h1 className="profile-page-title">
          <FaUser /> Thông tin cá nhân
        </h1>
      </div>

      {/* Content Layout */}
      <div className="profile-page-content">
        {/* Avatar Card */}
        <div className="profile-page-avatar-card">
          <div className="profile-page-avatar-wrapper">
            <div className="profile-page-avatar">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" />
              ) : (
                <FaUser className="profile-page-avatar-placeholder" size={60} />
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarChange}
              accept="image/*"
              style={{ display: 'none' }}
            />

            {!avatarFile ? (
              <button
                onClick={() => fileInputRef.current.click()}
                className="profile-page-btn-change-avatar"
              >
                <FaCamera /> Chọn ảnh mới
              </button>
            ) : (
              <button
                onClick={uploadAvatar}
                disabled={uploadingAvatar}
                className="profile-page-btn-upload"
              >
                <FaCheckCircle /> {uploadingAvatar ? 'Đang tải...' : 'Upload ảnh'}
              </button>
            )}

            {user.avatar_url && !avatarFile && (
              <button onClick={removeAvatar} className="profile-page-btn-remove-avatar">
                <FaTrash /> Xóa ảnh
              </button>
            )}
          </div>

          <div className="profile-page-user-basic">
            <h2>{user.full_name || user.username}</h2>
            <span className="profile-page-user-email">{user.email}</span>
            <div className={`profile-page-role-badge profile-page-role-${user.role}`}>
              {user.role === 'admin' && 'Quản trị viên'}
              {user.role === 'doctor' && 'Bác sĩ'}
              {user.role ==="staff" && 'Nhân viên'}
              {user.role === 'patient' && 'Bệnh nhân'}
            </div>
            {user.is_verified ? (
              <p className="profile-page-verified">
                <FaCheckCircle /> Đã xác thực
              </p>
            ) : (
              <p className="profile-page-not-verified">
                <FaTimesCircle /> Chưa xác thực
              </p>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="profile-page-main-content">
          {/* Grid 2 cột: Thông tin cá nhân & Đổi mật khẩu */}
          <div className="profile-page-main-forms">
            {/* Form Thông tin cá nhân */}
            <div className="profile-page-form-card">
              <div className="profile-page-card-header">
                <h2><FaEdit /> Thông tin cá nhân</h2>
              </div>
              <form onSubmit={handleBasicInfoSubmit} className="profile-page-form">
                <div className="profile-page-form-group">
                  <label className="profile-page-form-label">
                    <FaUser /> Họ và tên
                  </label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    placeholder="Nhập họ và tên đầy đủ (VD: Nguyễn Văn An)"
                    className="profile-page-form-input"
                  />
                </div>

                <div className="profile-page-form-row">
                  <div className="profile-page-form-group">
                    <label className="profile-page-form-label">
                      <FaPhone /> Số điện thoại
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="Số điện thoại (VD: 0912345678)"
                      className="profile-page-form-input"
                    />
                  </div>

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
                      <option value="">-- Chọn giới tính --</option>
                      <option value="male">Nam</option>
                      <option value="female">Nữ</option>
                      <option value="other">Khác</option>
                    </select>
                  </div>
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

                <div className="profile-page-form-group">
                  <label className="profile-page-form-label">
                    <FaMapMarkerAlt /> Địa chỉ
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Địa chỉ chi tiết (VD: 123 Lê Lợi, Phường Bến Thành, Quận 1, TP.HCM)"
                    rows="3"
                    className="profile-page-form-textarea"
                  />
                </div>

                <button type="submit" className="profile-page-btn-submit">
                  <FaCheckCircle /> Cập nhật thông tin
                </button>
              </form>
            </div>

            {/* Form Đổi mật khẩu */}
            <div className="profile-page-form-card">
              <div className="profile-page-card-header profile-page-card-header-password">
                <h2><FaLock /> Đổi mật khẩu</h2>
              </div>
              <form onSubmit={handlePasswordSubmit} className="profile-page-form">
                <div className="profile-page-form-group">
                  <label className="profile-page-form-label">
                    <FaKey /> Mật khẩu hiện tại
                  </label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    placeholder="Nhập mật khẩu hiện tại"
                    className="profile-page-form-input"
                    required
                  />
                </div>

                <div className="profile-page-form-group">
                  <label className="profile-page-form-label">
                    <FaLock /> Mật khẩu mới
                  </label>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                    className="profile-page-form-input"
                    required
                  />
                </div>

                <div className="profile-page-form-group">
                  <label className="profile-page-form-label">
                    <FaLock /> Xác nhận mật khẩu mới
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    placeholder="Nhập lại mật khẩu mới"
                    className="profile-page-form-input"
                    required
                  />
                </div>

                <button type="submit" className="profile-page-btn-submit">
                  <FaCheckCircle /> Đổi mật khẩu
                </button>

                {/* Link quên mật khẩu */}
                <div className="profile-page-forgot-password">
                  <Link to="/quen-mat-khau" className="profile-page-forgot-link">
                    Quên mật khẩu?
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Form thông tin bác sĩ (nếu là doctor) */}
      {user.role === 'doctor' && roleInfo && (
        <div className="profile-page-doctor-container">
          <div className="profile-page-form-card">
            <div className="profile-page-card-header profile-page-card-header-doctor">
              <h2><FaIdCard /> Thông tin chuyên môn</h2>
            </div>

            <form onSubmit={handleDoctorInfoSubmit} className="profile-page-form">
              {/* SECTION 1: Thông tin cơ bản */}
              <div className="profile-page-doctor-section">
                <h3 className="profile-page-section-title">
                  <FaIdCard /> Thông tin cơ bản
                </h3>

                <div className="profile-page-form-row">
                  <div className="profile-page-form-group">
                    <label className="profile-page-form-label">
                      <FaGraduationCap /> Học hàm, học vị
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={doctorFormData.title}
                      onChange={handleDoctorChange}
                      placeholder="VD: Giáo sư, Tiến sĩ, Thạc sĩ, Bác sĩ Chuyên khoa II"
                      className="profile-page-form-input"
                    />
                  </div>

                  <div className="profile-page-form-group">
                    <label className="profile-page-form-label">
                      <FaBriefcase /> Chức vụ
                    </label>
                    <input
                      type="text"
                      name="position"
                      value={doctorFormData.position}
                      onChange={handleDoctorChange}
                      placeholder="VD: Trưởng khoa Tim mạch, Phó Giám đốc Bệnh viện"
                      className="profile-page-form-input"
                    />
                  </div>
                </div>

                <div className="profile-page-form-row">
                  <div className="profile-page-form-group">
                    <label className="profile-page-form-label">
                      <FaIdCard /> Chuyên khoa
                    </label>
                    <select
                      name="specialty_id"
                      value={doctorFormData.specialty_id}
                      onChange={handleDoctorChange}
                      className="profile-page-form-select"
                    >
                      <option value="">-- Chọn chuyên khoa --</option>
                      {specialties.map(spec => (
                        <option key={spec.id} value={spec.id}>
                          {spec.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="profile-page-form-group">
                    <label className="profile-page-form-label">
                      <FaCalendar /> Số năm kinh nghiệm
                    </label>
                    <input
                      type="number"
                      name="experience_years"
                      value={doctorFormData.experience_years}
                      onChange={handleDoctorChange}
                      placeholder="Nhập số năm (VD: 15)"
                      min="0"
                      className="profile-page-form-input"
                    />
                  </div>
                </div>

                <div className="profile-page-form-group">
                  <label className="profile-page-form-label">
                    <FaFileAlt /> Giới thiệu bản thân
                  </label>
                  <textarea
                    name="bio"
                    value={doctorFormData.bio}
                    onChange={handleDoctorChange}
                    placeholder="Giới thiệu ngắn về bản thân, chuyên môn và kinh nghiệm (VD: Tôi có hơn 15 năm kinh nghiệm...)"
                    rows="4"
                    className="profile-page-form-textarea"
                  />
                </div>
              </div>

              {/* SECTION 2: Học vấn */}
              <div className="profile-page-doctor-section">
                <h3 className="profile-page-section-title">
                  <FaGraduationCap /> Học vấn & Đào tạo
                </h3>

                {doctorFormData.education.length > 0 && doctorFormData.education.map((edu, index) => (
                  <div key={index} className="profile-page-list-item">
                    <div className="profile-page-list-content">
                      <strong>{edu.degree}</strong>
                      <p className="profile-page-list-desc">{edu.institution}</p>
                      {edu.year && <span className="profile-page-list-year">Năm: {edu.year}</span>}
                      {edu.description && <p className="profile-page-list-desc">{edu.description}</p>}
                    </div>
                    <button 
                      type="button" 
                      onClick={() => removeEducation(index)} 
                      className="profile-page-btn-remove-item"
                    >
                      <FaTrash />
                    </button>
                  </div>
                ))}

                {!showEducationForm ? (
                  <button 
                    type="button" 
                    onClick={() => setShowEducationForm(true)} 
                    className="profile-page-btn-add"
                  >
                    <FaPlus /> Thêm học vấn
                  </button>
                ) : (
                  <div className="profile-page-add-form">
                    <input
                      type="text"
                      value={educationForm.degree}
                      onChange={(e) => setEducationForm({...educationForm, degree: e.target.value})}
                      placeholder="Bằng cấp * (VD: Bác sĩ Đa khoa, Thạc sĩ Y học)"
                      className="profile-page-form-input"
                    />
                    <input
                      type="text"
                      value={educationForm.institution}
                      onChange={(e) => setEducationForm({...educationForm, institution: e.target.value})}
                      placeholder="Trường/Cơ sở đào tạo * (VD: Đại học Y Dược TP.HCM)"
                      className="profile-page-form-input"
                    />
                    <div className="profile-page-form-row">
                      <input
                        type="text"
                        value={educationForm.year}
                        onChange={(e) => setEducationForm({...educationForm, year: e.target.value})}
                        placeholder="Năm tốt nghiệp (VD: 2010)"
                        className="profile-page-form-input"
                      />
                      <input
                        type="text"
                        value={educationForm.description}
                        onChange={(e) => setEducationForm({...educationForm, description: e.target.value})}
                        placeholder="Mô tả thêm (tùy chọn)"
                        className="profile-page-form-input"
                      />
                    </div>
                    <div className="profile-page-form-actions">
                      <button type="button" onClick={addEducation} className="profile-page-btn-save">
                        <FaCheckCircle /> Lưu
                      </button>
                      <button type="button" onClick={() => setShowEducationForm(false)} className="profile-page-btn-cancel">
                        Hủy
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 3: Chứng chỉ */}
              <div className="profile-page-doctor-section">
                <h3 className="profile-page-section-title">
                  <FaCertificate /> Chứng chỉ & Bằng cấp
                </h3>

                {doctorFormData.certifications.length > 0 && doctorFormData.certifications.map((cert, index) => (
                  <div key={index} className="profile-page-list-item">
                    <div className="profile-page-list-content">
                      <strong>{cert.name}</strong>
                      {cert.link && (
                        <a href={cert.link} target="_blank" rel="noopener noreferrer" className="profile-page-list-link">
                          <FaLink /> Xem chứng chỉ
                        </a>
                      )}
                    </div>
                    <button 
                      type="button" 
                      onClick={() => removeCertification(index)} 
                      className="profile-page-btn-remove-item"
                    >
                      <FaTrash />
                    </button>
                  </div>
                ))}

                {!showCertificationForm ? (
                  <button 
                    type="button" 
                    onClick={() => setShowCertificationForm(true)} 
                    className="profile-page-btn-add"
                  >
                    <FaPlus /> Thêm chứng chỉ
                  </button>
                ) : (
                  <div className="profile-page-add-form">
                    <input
                      type="text"
                      value={certificationForm.name}
                      onChange={(e) => setCertificationForm({...certificationForm, name: e.target.value})}
                      placeholder="Tên chứng chỉ * (VD: Chứng chỉ Nội soi Tiêu hóa)"
                      className="profile-page-form-input"
                    />
                    <input
                      type="url"
                      value={certificationForm.link}
                      onChange={(e) => setCertificationForm({...certificationForm, link: e.target.value})}
                      placeholder="Link xem chứng chỉ (tùy chọn) - VD: https://drive.google.com/..."
                      className="profile-page-form-input"
                    />
                    <div className="profile-page-form-actions">
                      <button type="button" onClick={addCertification} className="profile-page-btn-save">
                        <FaCheckCircle /> Lưu
                      </button>
                      <button type="button" onClick={() => setShowCertificationForm(false)} className="profile-page-btn-cancel">
                        Hủy
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 4: Kinh nghiệm làm việc */}
              <div className="profile-page-doctor-section">
                <h3 className="profile-page-section-title">
                  <FaBriefcase /> Kinh nghiệm làm việc
                </h3>

                {doctorFormData.work_experience.length > 0 && doctorFormData.work_experience.map((work, index) => (
                  <div key={index} className="profile-page-list-item">
                    <div className="profile-page-list-content">
                      <strong>{work.position} - {work.hospital}</strong>
                      {work.department && <p className="profile-page-list-desc">Khoa: {work.department}</p>}
                      {work.period && <p className="profile-page-list-period">Thời gian: {work.period}</p>}
                      {work.description && <p className="profile-page-list-desc">{work.description}</p>}
                    </div>
                    <button 
                      type="button" 
                      onClick={() => removeWorkExp(index)} 
                      className="profile-page-btn-remove-item"
                    >
                      <FaTrash />
                    </button>
                  </div>
                ))}

                {!showWorkExpForm ? (
                  <button 
                    type="button" 
                    onClick={() => setShowWorkExpForm(true)} 
                    className="profile-page-btn-add"
                  >
                    <FaPlus /> Thêm kinh nghiệm
                  </button>
                ) : (
                  <div className="profile-page-add-form">
                    <div className="profile-page-form-row">
                      <input
                        type="text"
                        value={workExpForm.position}
                        onChange={(e) => setWorkExpForm({...workExpForm, position: e.target.value})}
                        placeholder="Vị trí * (VD: Bác sĩ điều trị)"
                        className="profile-page-form-input"
                      />
                      <input
                        type="text"
                        value={workExpForm.hospital}
                        onChange={(e) => setWorkExpForm({...workExpForm, hospital: e.target.value})}
                        placeholder="Bệnh viện/Cơ sở * (VD: Bệnh viện Chợ Rẫy)"
                        className="profile-page-form-input"
                      />
                    </div>
                    <div className="profile-page-form-row">
                      <input
                        type="text"
                        value={workExpForm.department}
                        onChange={(e) => setWorkExpForm({...workExpForm, department: e.target.value})}
                        placeholder="Khoa/Phòng (VD: Khoa Tim mạch)"
                        className="profile-page-form-input"
                      />
                      <input
                        type="text"
                        value={workExpForm.period}
                        onChange={(e) => setWorkExpForm({...workExpForm, period: e.target.value})}
                        placeholder="Thời gian (VD: 2010 - 2015)"
                        className="profile-page-form-input"
                      />
                    </div>
                    <textarea
                      value={workExpForm.description}
                      onChange={(e) => setWorkExpForm({...workExpForm, description: e.target.value})}
                      placeholder="Mô tả công việc (tùy chọn)"
                      rows="2"
                      className="profile-page-form-textarea"
                    />
                    <div className="profile-page-form-actions">
                      <button type="button" onClick={addWorkExp} className="profile-page-btn-save">
                        <FaCheckCircle /> Lưu
                      </button>
                      <button type="button" onClick={() => setShowWorkExpForm(false)} className="profile-page-btn-cancel">
                        Hủy
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 5: Nghiên cứu */}
              <div className="profile-page-doctor-section">
                <h3 className="profile-page-section-title">
                  <FaFlask /> Nghiên cứu & Công bố khoa học
                </h3>

                {doctorFormData.research.length > 0 && doctorFormData.research.map((res, index) => (
                  <div key={index} className="profile-page-list-item">
                    <div className="profile-page-list-content">
                      <strong>{res.title}</strong>
                      {res.authors && <p className="profile-page-list-authors">Tác giả: {res.authors}</p>}
                      {res.journal && <p className="profile-page-list-journal">{res.journal}</p>}
                      {res.year && <span className="profile-page-list-year">Năm: {res.year}</span>}
                      {res.link && (
                        <a href={res.link} target="_blank" rel="noopener noreferrer" className="profile-page-list-link">
                          <FaLink /> Xem chi tiết
                        </a>
                      )}
                    </div>
                    <button 
                      type="button" 
                      onClick={() => removeResearch(index)} 
                      className="profile-page-btn-remove-item"
                    >
                      <FaTrash />
                    </button>
                  </div>
                ))}

                {!showResearchForm ? (
                  <button 
                    type="button" 
                    onClick={() => setShowResearchForm(true)} 
                    className="profile-page-btn-add"
                  >
                    <FaPlus /> Thêm nghiên cứu
                  </button>
                ) : (
                  <div className="profile-page-add-form">
                    <input
                      type="text"
                      value={researchForm.title}
                      onChange={(e) => setResearchForm({...researchForm, title: e.target.value})}
                      placeholder="Tiêu đề nghiên cứu * (VD: Ứng dụng AI trong chẩn đoán)"
                      className="profile-page-form-input"
                    />
                    <div className="profile-page-form-row">
                      <input
                        type="text"
                        value={researchForm.authors}
                        onChange={(e) => setResearchForm({...researchForm, authors: e.target.value})}
                        placeholder="Tác giả (VD: Nguyễn Văn A, Trần Thị B)"
                        className="profile-page-form-input"
                      />
                      <input
                        type="text"
                        value={researchForm.journal}
                        onChange={(e) => setResearchForm({...researchForm, journal: e.target.value})}
                        placeholder="Tạp chí/Hội nghị"
                        className="profile-page-form-input"
                      />
                    </div>
                    <div className="profile-page-form-row">
                      <input
                        type="text"
                        value={researchForm.year}
                        onChange={(e) => setResearchForm({...researchForm, year: e.target.value})}
                        placeholder="Năm xuất bản (VD: 2023)"
                        className="profile-page-form-input"
                      />
                      <input
                        type="url"
                        value={researchForm.link}
                        onChange={(e) => setResearchForm({...researchForm, link: e.target.value})}
                        placeholder="Link bài báo (tùy chọn) - VD: https://..."
                        className="profile-page-form-input"
                      />
                    </div>
                    <div className="profile-page-form-actions">
                      <button type="button" onClick={addResearch} className="profile-page-btn-save">
                        <FaCheckCircle /> Lưu
                      </button>
                      <button type="button" onClick={() => setShowResearchForm(false)} className="profile-page-btn-cancel">
                        Hủy
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 6: Thành tích */}
              <div className="profile-page-doctor-section">
                <h3 className="profile-page-section-title">
                  <FaAward /> Thành tích & Giải thưởng
                </h3>

                {doctorFormData.achievements.length > 0 && doctorFormData.achievements.map((achievement, index) => (
                  <div key={index} className="profile-page-list-item">
                    <div className="profile-page-list-content">
                      <strong>{achievement.title || achievement}</strong>
                      {achievement.link && (
                        <a href={achievement.link} target="_blank" rel="noopener noreferrer" className="profile-page-list-link">
                          <FaLink /> Xem chi tiết
                        </a>
                      )}
                    </div>
                    <button 
                      type="button" 
                      onClick={() => removeAchievement(index)} 
                      className="profile-page-btn-remove-item"
                    >
                      <FaTrash />
                    </button>
                  </div>
                ))}

                {!showAchievementForm ? (
                  <button 
                    type="button" 
                    onClick={() => setShowAchievementForm(true)} 
                    className="profile-page-btn-add"
                  >
                    <FaPlus /> Thêm thành tích
                  </button>
                ) : (
                  <div className="profile-page-add-form">
                    <input
                      type="text"
                      value={achievementForm.title}
                      onChange={(e) => setAchievementForm({...achievementForm, title: e.target.value})}
                      placeholder="Tên thành tích * (VD: Bác sĩ trẻ xuất sắc 2023)"
                      className="profile-page-form-input"
                    />
                    <input
                      type="url"
                      value={achievementForm.link}
                      onChange={(e) => setAchievementForm({...achievementForm, link: e.target.value})}
                      placeholder="Link thông tin (tùy chọn) - VD: https://..."
                      className="profile-page-form-input"
                    />
                    <div className="profile-page-form-actions">
                      <button type="button" onClick={addAchievement} className="profile-page-btn-save">
                        <FaCheckCircle /> Lưu
                      </button>
                      <button type="button" onClick={() => setShowAchievementForm(false)} className="profile-page-btn-cancel">
                        Hủy
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button type="submit" className="profile-page-btn-submit profile-page-btn-doctor">
                <FaCheckCircle /> Cập nhật thông tin chuyên môn
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;