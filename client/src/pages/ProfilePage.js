// client/src/pages/ProfilePage.js
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api'; // Sử dụng api instance đã cấu hình
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { 
  FaUser, FaPhone, FaMapMarkerAlt, FaVenusMars, FaCalendar, 
  FaCheckCircle, FaTimesCircle, FaLock, FaArrowLeft, FaEdit, FaKey,
  FaBriefcase, FaFileAlt, FaIdCard, FaCamera, FaTrash, 
  FaGraduationCap, FaCertificate, FaAward, FaFlask, FaPlus, FaLink
} from 'react-icons/fa';
import './ProfilePage.css';

const ProfilePage = () => {
  // ==================== STATE MANAGEMENT ====================
  const [user, setUser] = useState(null);
  const [roleInfo, setRoleInfo] = useState(null); // Chứa thông tin role (bao gồm CODE)
  const [specialties, setSpecialties] = useState([]);
  
  // Form thông tin cơ bản
  const [formData, setFormData] = useState({
    full_name: '', phone: '', address: '', gender: '', dob: ''
  });
  
  // Form thông tin bác sĩ
  const [doctorFormData, setDoctorFormData] = useState({
    specialty_id: '', experience_years: '', bio: '', title: '', position: '',
    education: [], certifications: [], work_experience: [], research: [], achievements: []
  });

  // States hiển thị form con
  const [showEducationForm, setShowEducationForm] = useState(false);
  const [showCertificationForm, setShowCertificationForm] = useState(false);
  const [showWorkExpForm, setShowWorkExpForm] = useState(false);
  const [showResearchForm, setShowResearchForm] = useState(false);
  const [showAchievementForm, setShowAchievementForm] = useState(false);

  // States dữ liệu form con
  const [educationForm, setEducationForm] = useState({ degree: '', institution: '', year: '', description: '' });
  const [certificationForm, setCertificationForm] = useState({ name: '', link: '' });
  const [workExpForm, setWorkExpForm] = useState({ position: '', hospital: '', department: '', period: '', description: '' });
  const [researchForm, setResearchForm] = useState({ title: '', authors: '', journal: '', year: '', link: '' });
  const [achievementForm, setAchievementForm] = useState({ title: '', link: '' });

  // State đổi mật khẩu
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  
  // State avatar
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // ==================== EFFECTS & DATA FETCHING ====================

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/login');
      return;
    }
    fetchProfile();
    fetchSpecialties();
  }, [navigate]);

  const fetchSpecialties = async () => {
    try {
      const res = await api.get('/specialties');
      if (res.data.success) setSpecialties(res.data.specialties);
    } catch (error) { console.error('Error fetching specialties:', error); }
  };

  const fetchProfile = async () => {
    try {
      const profileRes = await api.get('/users/profile');
      const userData = profileRes.data.user || profileRes.data;
      
      setUser(userData);
      if (userData.avatar_url) setAvatarPreview(userData.avatar_url);
      
      setFormData({
        full_name: userData.full_name || '',
        phone: userData.phone || '',
        address: userData.address || '',
        gender: userData.gender || '',
        dob: userData.dob ? userData.dob.split('T')[0] : ''
      });

      // Sau khi có user, lấy role info để lấy CODE
      await fetchRoleInfo();
      setLoading(false);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setLoading(false);
    }
  };

  const fetchRoleInfo = async () => {
    try {
      const res = await api.get('/users/my-role-info');
      if (res.data.success && res.data.user.roleData) {
        const roleData = res.data.user.roleData;
        setRoleInfo(roleData); // Lưu roleData để hiển thị CODE
        
        // Nếu là bác sĩ, map dữ liệu vào form
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
        }
      }
    } catch (error) {
      console.error('Error fetching role info:', error);
    }
  };

  // ==================== HANDLERS ====================

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: '' });
  };

  const handleDoctorChange = (e) => {
    const { name, value } = e.target;
    setDoctorFormData({ ...doctorFormData, [name]: value });
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData({ ...passwordData, [name]: value });
  };

  // --- SUBMIT INFO (Fix: Gender/DOB null) ---
  const handleBasicInfoSubmit = async (e) => {
    e.preventDefault();
    
    const dataToSend = { 
      ...formData, 
      dob: formData.dob || null, 
      gender: formData.gender || null 
    };

    try {
      const res = await api.put('/users/profile', dataToSend);
      if (res.data.success) {
        toast.success('Cập nhật thông tin thành công!');
        await fetchProfile();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Cập nhật thất bại!');
    }
  };

  // --- SUBMIT PASSWORD (Fix: Route path) ---
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
      // Gọi /users/change-password thay vì /users/profile/change-password
      const res = await api.put('/users/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      if (res.data.success) {
        toast.success('Đổi mật khẩu thành công!');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Đổi mật khẩu thất bại!');
    }
  };

  // --- SUBMIT DOCTOR INFO ---
  const handleDoctorInfoSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put('/users/profile', doctorFormData);
      if (res.data.success) {
        toast.success('Cập nhật thông tin chuyên môn thành công!');
        await fetchRoleInfo();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Cập nhật thất bại!');
    }
  };

  // --- AVATAR HANDLERS (Fix: Upload logic) ---
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Kích thước ảnh không được vượt quá 5MB!');
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const uploadAvatar = async () => {
    if (!avatarFile) { toast.error('Vui lòng chọn ảnh trước!'); return; }
    
    const formData = new FormData();
    formData.append('image', avatarFile); // Key 'image' khớp với uploadRoutes.js

    setUploadingAvatar(true);
    try {
      // Bước 1: Upload ảnh lấy URL (dùng route của ArticleManagementPage)
      const uploadRes = await api.post('/upload/image', formData, { 
        headers: { 'Content-Type': 'multipart/form-data' } 
      });

      if (uploadRes.data.success && uploadRes.data.url) {
        // Bước 2: Lưu URL vào User profile
        await api.put('/users/profile', { avatar_url: uploadRes.data.url });
        
        toast.success('Cập nhật ảnh đại diện thành công!');
        setAvatarFile(null);
        await fetchProfile(); 
      } else { 
        throw new Error(uploadRes.data.message || 'Upload file thất bại'); 
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Upload ảnh thất bại!');
    } finally { 
      setUploadingAvatar(false); 
    }
  };

  const removeAvatar = async () => {
    if (!window.confirm('Bạn có chắc muốn xóa ảnh đại diện?')) return;
    try {
      // Set avatar_url thành null
      await api.put('/users/profile', { avatar_url: null });
      toast.success('Đã xóa ảnh đại diện!');
      setAvatarPreview(null);
      setAvatarFile(null);
      await fetchProfile(); 
    } catch (error) {
      toast.error(error.response?.data?.message || 'Xóa ảnh thất bại!');
    }
  };

  // --- DOCTOR FORM ARRAY HANDLERS ---
  const addEducation = () => {
    if (!educationForm.degree || !educationForm.institution) { toast.error('Vui lòng nhập đủ thông tin!'); return; }
    setDoctorFormData({ ...doctorFormData, education: [...doctorFormData.education, educationForm] });
    setEducationForm({ degree: '', institution: '', year: '', description: '' });
    setShowEducationForm(false);
  };
  const removeEducation = (index) => setDoctorFormData({ ...doctorFormData, education: doctorFormData.education.filter((_, i) => i !== index) });

  const addCertification = () => {
    if (!certificationForm.name) { toast.error('Vui lòng nhập tên chứng chỉ!'); return; }
    setDoctorFormData({ ...doctorFormData, certifications: [...doctorFormData.certifications, certificationForm] });
    setCertificationForm({ name: '', link: '' });
    setShowCertificationForm(false);
  };
  const removeCertification = (index) => setDoctorFormData({ ...doctorFormData, certifications: doctorFormData.certifications.filter((_, i) => i !== index) });

  const addWorkExp = () => {
    if (!workExpForm.position) { toast.error('Vui lòng nhập vị trí!'); return; }
    setDoctorFormData({ ...doctorFormData, work_experience: [...doctorFormData.work_experience, workExpForm] });
    setWorkExpForm({ position: '', hospital: '', department: '', period: '', description: '' });
    setShowWorkExpForm(false);
  };
  const removeWorkExp = (index) => setDoctorFormData({ ...doctorFormData, work_experience: doctorFormData.work_experience.filter((_, i) => i !== index) });

  const addResearch = () => {
    if (!researchForm.title) { toast.error('Vui lòng nhập tiêu đề!'); return; }
    setDoctorFormData({ ...doctorFormData, research: [...doctorFormData.research, researchForm] });
    setResearchForm({ title: '', authors: '', journal: '', year: '', link: '' });
    setShowResearchForm(false);
  };
  const removeResearch = (index) => setDoctorFormData({ ...doctorFormData, research: doctorFormData.research.filter((_, i) => i !== index) });

  const addAchievement = () => {
    if (!achievementForm.title) { toast.error('Vui lòng nhập tên thành tích!'); return; }
    setDoctorFormData({ ...doctorFormData, achievements: [...doctorFormData.achievements, achievementForm] });
    setAchievementForm({ title: '', link: '' });
    setShowAchievementForm(false);
  };
  const removeAchievement = (index) => setDoctorFormData({ ...doctorFormData, achievements: doctorFormData.achievements.filter((_, i) => i !== index) });

  // ==================== RENDER ====================
  if (loading) return <div className="profile-page-loading"><div className="profile-page-spinner"></div><p>Đang tải thông tin...</p></div>;
  if (!user) return <div className="profile-page-loading"><p>Không tìm thấy thông tin người dùng</p></div>;

  return (
    <div className="profile-page-container">
      <ToastContainer position="bottom-right" autoClose={3000} />
      <div className="profile-page-header">
        <button onClick={() => navigate(-1)} className="profile-page-btn-back"><FaArrowLeft /> Quay lại</button>
        <h1 className="profile-page-title"><FaUser /> Thông tin cá nhân</h1>
      </div>

      <div className="profile-page-content">
        {/* AVATAR CARD */}
        <div className="profile-page-avatar-card">
          <div className="profile-page-avatar-wrapper">
            <div className="profile-page-avatar">
              {avatarPreview ? <img src={avatarPreview} alt="Avatar" /> : <FaUser className="profile-page-avatar-placeholder" size={60} />}
            </div>
            <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" style={{ display: 'none' }} />
            {!avatarFile ? (
              <button onClick={() => fileInputRef.current.click()} className="profile-page-btn-change-avatar"><FaCamera /> Chọn ảnh mới</button>
            ) : (
              <button onClick={uploadAvatar} disabled={uploadingAvatar} className="profile-page-btn-upload"><FaCheckCircle /> {uploadingAvatar ? 'Đang tải...' : 'Upload ảnh'}</button>
            )}
            {user.avatar_url && !avatarFile && <button onClick={removeAvatar} className="profile-page-btn-remove-avatar"><FaTrash /> Xóa ảnh</button>}
          </div>

          <div className="profile-page-user-basic">
            <h2>{user.full_name || user.username}</h2>
            <span className="profile-page-user-email">{user.email}</span>
            
            {/* 1. TRẠNG THÁI XÁC THỰC (Đã chuyển lên trên) */}
            {user.is_verified ? (
              <p className="profile-page-verified"><FaCheckCircle /> Đã xác thực</p>
            ) : (
              <p className="profile-page-not-verified"><FaTimesCircle /> Chưa xác thực</p>
            )}

            {/* 2. ROLE BADGE (Hiển thị Mã Code: PTxxxx, DRxxxx...) */}
            <div className={`profile-page-role-badge profile-page-role-${user.role}`}>
              {/* roleInfo.code được lấy từ bảng patients/doctors/admins/staff */}
              {roleInfo?.code || user.role.toUpperCase()}
            </div>
          </div>
        </div>

        {/* MAIN CONTENT FORMS */}
        <div className="profile-page-main-content">
          <div className="profile-page-main-forms">
            {/* FORM THÔNG TIN CÁ NHÂN */}
            <div className="profile-page-form-card">
              <div className="profile-page-card-header"><h2><FaEdit /> Thông tin cá nhân</h2></div>
              <form onSubmit={handleBasicInfoSubmit} className="profile-page-form">
                <div className="profile-page-form-group">
                  <label className="profile-page-form-label"><FaUser /> Họ và tên</label>
                  <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} placeholder="Nhập họ tên" className="profile-page-form-input" />
                </div>
                <div className="profile-page-form-row">
                  <div className="profile-page-form-group">
                    <label className="profile-page-form-label"><FaPhone /> Số điện thoại</label>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="09xxxxxxxx" className="profile-page-form-input" />
                  </div>
                  <div className="profile-page-form-group">
                    <label className="profile-page-form-label"><FaVenusMars /> Giới tính</label>
                    <select name="gender" value={formData.gender} onChange={handleChange} className="profile-page-form-select">
                      <option value="">-- Chọn --</option>
                      <option value="male">Nam</option>
                      <option value="female">Nữ</option>
                      <option value="other">Khác</option>
                    </select>
                  </div>
                </div>
                <div className="profile-page-form-group">
                  <label className="profile-page-form-label"><FaCalendar /> Ngày sinh</label>
                  <input type="date" name="dob" value={formData.dob} onChange={handleChange} className="profile-page-form-input" />
                </div>
                <div className="profile-page-form-group">
                  <label className="profile-page-form-label"><FaMapMarkerAlt /> Địa chỉ</label>
                  <textarea name="address" value={formData.address} onChange={handleChange} placeholder="Địa chỉ chi tiết" rows="3" className="profile-page-form-textarea" />
                </div>
                <button type="submit" className="profile-page-btn-submit"><FaCheckCircle /> Cập nhật thông tin</button>
              </form>
            </div>

            {/* FORM ĐỔI MẬT KHẨU */}
            <div className="profile-page-form-card">
              <div className="profile-page-card-header profile-page-card-header-password"><h2><FaLock /> Đổi mật khẩu</h2></div>
              <form onSubmit={handlePasswordSubmit} className="profile-page-form">
                <div className="profile-page-form-group">
                  <label className="profile-page-form-label"><FaKey /> Mật khẩu hiện tại</label>
                  <input type="password" name="currentPassword" value={passwordData.currentPassword} onChange={handlePasswordChange} placeholder="••••••" className="profile-page-form-input" required />
                </div>
                <div className="profile-page-form-group">
                  <label className="profile-page-form-label"><FaLock /> Mật khẩu mới</label>
                  <input type="password" name="newPassword" value={passwordData.newPassword} onChange={handlePasswordChange} placeholder="Tối thiểu 6 ký tự" className="profile-page-form-input" required />
                </div>
                <div className="profile-page-form-group">
                  <label className="profile-page-form-label"><FaLock /> Xác nhận mật khẩu</label>
                  <input type="password" name="confirmPassword" value={passwordData.confirmPassword} onChange={handlePasswordChange} placeholder="Nhập lại mật khẩu mới" className="profile-page-form-input" required />
                </div>
                <button type="submit" className="profile-page-btn-submit"><FaCheckCircle /> Đổi mật khẩu</button>
                <div className="profile-page-forgot-password">
                  <Link to="/quen-mat-khau" className="profile-page-forgot-link">Quên mật khẩu?</Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* DOCTOR INFO SECTION */}
      {user.role === 'doctor' && roleInfo && (
        <div className="profile-page-doctor-container">
          <div className="profile-page-form-card">
            <div className="profile-page-card-header profile-page-card-header-doctor"><h2><FaIdCard /> Thông tin chuyên môn</h2></div>
            <form onSubmit={handleDoctorInfoSubmit} className="profile-page-form">
              {/* 1. Cơ bản */}
              <div className="profile-page-doctor-section">
                <h3 className="profile-page-section-title"><FaIdCard /> Thông tin cơ bản</h3>
                <div className="profile-page-form-row">
                  <div className="profile-page-form-group">
                    <label className="profile-page-form-label"><FaGraduationCap /> Học hàm/Học vị</label>
                    <input type="text" name="title" value={doctorFormData.title} onChange={handleDoctorChange} placeholder="VD: Thạc sĩ, Bác sĩ" className="profile-page-form-input" />
                  </div>
                  <div className="profile-page-form-group">
                    <label className="profile-page-form-label"><FaBriefcase /> Chức vụ</label>
                    <input type="text" name="position" value={doctorFormData.position} onChange={handleDoctorChange} placeholder="VD: Trưởng khoa" className="profile-page-form-input" />
                  </div>
                </div>
                <div className="profile-page-form-row">
                  <div className="profile-page-form-group">
                    <label className="profile-page-form-label"><FaIdCard /> Chuyên khoa</label>
                    <select name="specialty_id" value={doctorFormData.specialty_id} onChange={handleDoctorChange} className="profile-page-form-select">
                      <option value="">-- Chọn chuyên khoa --</option>
                      {specialties.map(spec => <option key={spec.id} value={spec.id}>{spec.name}</option>)}
                    </select>
                  </div>
                  <div className="profile-page-form-group">
                    <label className="profile-page-form-label"><FaCalendar /> Kinh nghiệm (năm)</label>
                    <input type="number" name="experience_years" value={doctorFormData.experience_years} onChange={handleDoctorChange} className="profile-page-form-input" />
                  </div>
                </div>
                <div className="profile-page-form-group">
                  <label className="profile-page-form-label"><FaFileAlt /> Giới thiệu</label>
                  <textarea name="bio" value={doctorFormData.bio} onChange={handleDoctorChange} rows="4" className="profile-page-form-textarea" />
                </div>
              </div>

              {/* 2. Học vấn */}
              <div className="profile-page-doctor-section">
                <h3 className="profile-page-section-title"><FaGraduationCap /> Học vấn</h3>
                {doctorFormData.education.map((edu, index) => (
                  <div key={index} className="profile-page-list-item">
                    <div className="profile-page-list-content"><strong>{edu.degree}</strong><p className="profile-page-list-desc">{edu.institution}</p></div>
                    <button type="button" onClick={() => removeEducation(index)} className="profile-page-btn-remove-item"><FaTrash /></button>
                  </div>
                ))}
                {!showEducationForm ? <button type="button" onClick={() => setShowEducationForm(true)} className="profile-page-btn-add"><FaPlus /> Thêm học vấn</button> : (
                  <div className="profile-page-add-form">
                    <input type="text" value={educationForm.degree} onChange={(e) => setEducationForm({...educationForm, degree: e.target.value})} placeholder="Bằng cấp (VD: Bác sĩ đa khoa)" className="profile-page-form-input" />
                    <input type="text" value={educationForm.institution} onChange={(e) => setEducationForm({...educationForm, institution: e.target.value})} placeholder="Trường đào tạo" className="profile-page-form-input" />
                    <div className="profile-page-form-row">
                      <input type="text" value={educationForm.year} onChange={(e) => setEducationForm({...educationForm, year: e.target.value})} placeholder="Năm" className="profile-page-form-input" />
                      <input type="text" value={educationForm.description} onChange={(e) => setEducationForm({...educationForm, description: e.target.value})} placeholder="Mô tả" className="profile-page-form-input" />
                    </div>
                    <div className="profile-page-form-actions"><button type="button" onClick={addEducation} className="profile-page-btn-save">Lưu</button><button type="button" onClick={() => setShowEducationForm(false)} className="profile-page-btn-cancel">Hủy</button></div>
                  </div>
                )}
              </div>

              {/* 3. Chứng chỉ */}
              <div className="profile-page-doctor-section">
                <h3 className="profile-page-section-title"><FaCertificate /> Chứng chỉ</h3>
                {doctorFormData.certifications.map((cert, index) => (
                  <div key={index} className="profile-page-list-item">
                    <div className="profile-page-list-content"><strong>{cert.name}</strong>{cert.link && <a href={cert.link} className="profile-page-list-link" target="_blank" rel="noreferrer"><FaLink /> Link</a>}</div>
                    <button type="button" onClick={() => removeCertification(index)} className="profile-page-btn-remove-item"><FaTrash /></button>
                  </div>
                ))}
                {!showCertificationForm ? <button type="button" onClick={() => setShowCertificationForm(true)} className="profile-page-btn-add"><FaPlus /> Thêm chứng chỉ</button> : (
                  <div className="profile-page-add-form">
                    <input type="text" value={certificationForm.name} onChange={(e) => setCertificationForm({...certificationForm, name: e.target.value})} placeholder="Tên chứng chỉ" className="profile-page-form-input" />
                    <input type="url" value={certificationForm.link} onChange={(e) => setCertificationForm({...certificationForm, link: e.target.value})} placeholder="Link (nếu có)" className="profile-page-form-input" />
                    <div className="profile-page-form-actions"><button type="button" onClick={addCertification} className="profile-page-btn-save">Lưu</button><button type="button" onClick={() => setShowCertificationForm(false)} className="profile-page-btn-cancel">Hủy</button></div>
                  </div>
                )}
              </div>

              {/* 4. Kinh nghiệm làm việc */}
              <div className="profile-page-doctor-section">
                <h3 className="profile-page-section-title"><FaBriefcase /> Kinh nghiệm</h3>
                {doctorFormData.work_experience.map((work, index) => (
                  <div key={index} className="profile-page-list-item">
                    <div className="profile-page-list-content"><strong>{work.position} - {work.hospital}</strong><p className="profile-page-list-desc">{work.period}</p></div>
                    <button type="button" onClick={() => removeWorkExp(index)} className="profile-page-btn-remove-item"><FaTrash /></button>
                  </div>
                ))}
                {!showWorkExpForm ? <button type="button" onClick={() => setShowWorkExpForm(true)} className="profile-page-btn-add"><FaPlus /> Thêm kinh nghiệm</button> : (
                  <div className="profile-page-add-form">
                    <input type="text" value={workExpForm.position} onChange={(e) => setWorkExpForm({...workExpForm, position: e.target.value})} placeholder="Vị trí" className="profile-page-form-input" />
                    <input type="text" value={workExpForm.hospital} onChange={(e) => setWorkExpForm({...workExpForm, hospital: e.target.value})} placeholder="Nơi làm việc" className="profile-page-form-input" />
                    <div className="profile-page-form-row">
                      <input type="text" value={workExpForm.period} onChange={(e) => setWorkExpForm({...workExpForm, period: e.target.value})} placeholder="Thời gian" className="profile-page-form-input" />
                      <input type="text" value={workExpForm.department} onChange={(e) => setWorkExpForm({...workExpForm, department: e.target.value})} placeholder="Phòng ban" className="profile-page-form-input" />
                    </div>
                    <textarea value={workExpForm.description} onChange={(e) => setWorkExpForm({...workExpForm, description: e.target.value})} placeholder="Mô tả" className="profile-page-form-textarea" />
                    <div className="profile-page-form-actions"><button type="button" onClick={addWorkExp} className="profile-page-btn-save">Lưu</button><button type="button" onClick={() => setShowWorkExpForm(false)} className="profile-page-btn-cancel">Hủy</button></div>
                  </div>
                )}
              </div>

              {/* 5. Nghiên cứu */}
              <div className="profile-page-doctor-section">
                <h3 className="profile-page-section-title"><FaFlask /> Nghiên cứu</h3>
                {doctorFormData.research.map((res, index) => (
                  <div key={index} className="profile-page-list-item">
                    <div className="profile-page-list-content"><strong>{res.title}</strong><p className="profile-page-list-desc">{res.year} - {res.journal}</p></div>
                    <button type="button" onClick={() => removeResearch(index)} className="profile-page-btn-remove-item"><FaTrash /></button>
                  </div>
                ))}
                {!showResearchForm ? <button type="button" onClick={() => setShowResearchForm(true)} className="profile-page-btn-add"><FaPlus /> Thêm nghiên cứu</button> : (
                  <div className="profile-page-add-form">
                    <input type="text" value={researchForm.title} onChange={(e) => setResearchForm({...researchForm, title: e.target.value})} placeholder="Tiêu đề" className="profile-page-form-input" />
                    <div className="profile-page-form-row">
                      <input type="text" value={researchForm.authors} onChange={(e) => setResearchForm({...researchForm, authors: e.target.value})} placeholder="Tác giả" className="profile-page-form-input" />
                      <input type="text" value={researchForm.year} onChange={(e) => setResearchForm({...researchForm, year: e.target.value})} placeholder="Năm" className="profile-page-form-input" />
                    </div>
                    <input type="text" value={researchForm.journal} onChange={(e) => setResearchForm({...researchForm, journal: e.target.value})} placeholder="Tạp chí" className="profile-page-form-input" />
                    <input type="url" value={researchForm.link} onChange={(e) => setResearchForm({...researchForm, link: e.target.value})} placeholder="Link" className="profile-page-form-input" />
                    <div className="profile-page-form-actions"><button type="button" onClick={addResearch} className="profile-page-btn-save">Lưu</button><button type="button" onClick={() => setShowResearchForm(false)} className="profile-page-btn-cancel">Hủy</button></div>
                  </div>
                )}
              </div>

              {/* 6. Thành tích */}
              <div className="profile-page-doctor-section">
                <h3 className="profile-page-section-title"><FaAward /> Thành tích</h3>
                {doctorFormData.achievements.map((ach, index) => (
                  <div key={index} className="profile-page-list-item">
                    <div className="profile-page-list-content"><strong>{ach.title}</strong>{ach.link && <a href={ach.link} className="profile-page-list-link" target="_blank" rel="noreferrer"><FaLink /> Link</a>}</div>
                    <button type="button" onClick={() => removeAchievement(index)} className="profile-page-btn-remove-item"><FaTrash /></button>
                  </div>
                ))}
                {!showAchievementForm ? <button type="button" onClick={() => setShowAchievementForm(true)} className="profile-page-btn-add"><FaPlus /> Thêm thành tích</button> : (
                  <div className="profile-page-add-form">
                    <input type="text" value={achievementForm.title} onChange={(e) => setAchievementForm({...achievementForm, title: e.target.value})} placeholder="Tên thành tích" className="profile-page-form-input" />
                    <input type="url" value={achievementForm.link} onChange={(e) => setAchievementForm({...achievementForm, link: e.target.value})} placeholder="Link" className="profile-page-form-input" />
                    <div className="profile-page-form-actions"><button type="button" onClick={addAchievement} className="profile-page-btn-save">Lưu</button><button type="button" onClick={() => setShowAchievementForm(false)} className="profile-page-btn-cancel">Hủy</button></div>
                  </div>
                )}
              </div>

              <button type="submit" className="profile-page-btn-submit profile-page-btn-doctor" style={{marginTop: '1rem'}}><FaCheckCircle /> Cập nhật thông tin chuyên môn</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;