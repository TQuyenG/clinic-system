// client/src/pages/MyAppointmentsPage.js
// PHIÊN BẢN FINAL: FIX STATUS THANH TOÁN & THÊM CẬP NHẬT HỒ SƠ Y TẾ

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import appointmentService from '../services/appointmentService';
import userService from '../services/userService'; // ✅ Import service mới
import './MyAppointmentsPage.css'; 

// Import Icons
import {
  FaCalendarAlt, FaClock, FaCheckCircle, FaTimesCircle, FaHourglassHalf,
  FaSpinner, FaArrowRight, FaPlus, FaUserMd, FaVideo, FaHospital,
  FaExclamationTriangle, FaCalendarCheck, FaUser, FaEdit, FaSave, FaTimes, FaNotesMedical
} from 'react-icons/fa';

const MyAppointmentsPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  
  // ✅ State mới cho Hồ sơ sức khỏe
  const [missingProfile, setMissingProfile] = useState(false);
  const [missingFields, setMissingFields] = useState([]);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [healthData, setHealthData] = useState({
    blood_type: '', height: '', weight: '', health_insurance: '',
    allergies: '', chronic_diseases: '', emergency_contact: ''
  });

  // ========== INIT ==========
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      toast.error('Vui lòng đăng nhập');
      navigate('/login');
      return;
    }

    const userData = JSON.parse(userStr);
    setUser(userData);
    
    // 1. Tải danh sách lịch hẹn
    loadMyAppointments();

    // 2. Kiểm tra hồ sơ y tế (Nếu là bệnh nhân)
    if (userData.role === 'patient') {
        checkProfileStatus();
    }

  }, [navigate]);

  // ========== API CALLS ==========
  
  const loadMyAppointments = async () => {
    try {
      setLoading(true);
      const response = await appointmentService.getMyAppointments();
      if (response.data.success) {
        const sorted = (response.data.data || []).sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date));
        setAppointments(sorted);
        setFilteredAppointments(sorted);
      }
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Hàm kiểm tra hồ sơ thiếu
  const checkProfileStatus = async () => {
      try {
          const res = await userService.getMyRoleInfo();
          if (res.data.success) {
              const { missing_profile, missing_fields, roleData } = res.data.user;
              setMissingProfile(missing_profile);
              setMissingFields(missing_fields || []);
              
              // Fill dữ liệu cũ vào form nếu có
              if (roleData && roleData.medical_history) {
                  setHealthData(prev => ({ ...prev, ...roleData.medical_history }));
              }
          }
      } catch (e) { console.error(e); }
  };

  // ✅ Hàm cập nhật hồ sơ
  const handleUpdateHealthProfile = async (e) => {
      e.preventDefault();
      try {
          const res = await userService.updatePatientHealthInfo(healthData);
          if (res.data.success) {
              toast.success('Cập nhật hồ sơ sức khỏe thành công!');
              setShowHealthModal(false);
              checkProfileStatus(); // Check lại để ẩn cảnh báo
          }
      } catch (e) {
          toast.error('Lỗi cập nhật hồ sơ');
      }
  };

  // ========== HELPERS (FIX LOGIC HIỂN THỊ STATUS) ==========
  
  const getStatusInfo = (appointment) => {
    const status = appointment.status;
    // Kiểm tra thanh toán: Ưu tiên Payment record, sau đó đến payment_status
    const isPaid = (appointment.Payment && appointment.Payment.status === 'paid') || appointment.payment_status === 'paid';

    // ✅ LOGIC QUAN TRỌNG: Nếu Đã thanh toán -> Luôn hiển thị Đã xác nhận (trừ khi đã xong/hủy)
    if (isPaid && (status === 'pending' || status === 'confirmed')) {
       return { text: 'Đã xác nhận', class: 'status-confirmed', icon: <FaCheckCircle /> };
    }

    const info = {
      pending: { text: 'Chờ xác nhận', class: 'status-pending', icon: <FaHourglassHalf /> },
      confirmed: { text: 'Đã xác nhận', class: 'status-confirmed', icon: <FaCheckCircle /> },
      in_progress: { text: 'Đang khám', class: 'status-in-progress', icon: <FaSpinner className="fa-spin" /> },
      completed: { text: 'Hoàn thành', class: 'status-completed', icon: <FaCheckCircle /> },
      cancelled: { text: 'Đã hủy', class: 'status-cancelled', icon: <FaTimesCircle /> }
    };
    return info[status] || info.pending;
  };

  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('vi-VN', { weekday: 'short', year: 'numeric', month: 'numeric', day: 'numeric' });
  const formatTime = (timeStr) => timeStr ? timeStr.slice(0, 5) : 'N/A';

  // Filter handlers
  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
    if (status === 'all') setFilteredAppointments(appointments);
    else setFilteredAppointments(appointments.filter(apt => apt.status === status));
  };

  // ========== RENDER ==========
  if (loading) return <div className="my-appointments-page-loading"><FaSpinner className="fa-spin"/> Loading...</div>;

  return (
    <div className="my-appointments-page-container">
      <div className="my-appointments-page-wrapper">
        
        {/* ✅ THANH CẢNH BÁO HỒ SƠ THIẾU (TÍNH NĂNG MỚI) */}
        {missingProfile && (
            <div className="profile-warning-banner animate-pulse">
                <div className="warning-content">
                    <FaExclamationTriangle className="warning-icon"/>
                    <div>
                        <strong>Hồ sơ y tế chưa hoàn thiện!</strong>
                        <p>Vui lòng cập nhật: {missingFields.join(', ')} để bác sĩ nắm rõ tình trạng.</p>
                    </div>
                </div>
                <button className="btn-update-profile" onClick={() => setShowHealthModal(true)}>
                    Cập nhật ngay
                </button>
            </div>
        )}

        <div className="my-appointments-page-header">
          <h1 className="my-appointments-page-title">Lịch hẹn của tôi</h1>
          <button className="my-appointments-page-btn-book-new" onClick={() => navigate('/dat-lich-hen')}>
            <FaPlus /> Đặt lịch mới
          </button>
        </div>

        {/* Tabs Filter */}
        <div className="my-appointments-page-filter-tabs">
          {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map(st => (
             <button 
                key={st}
                className={`my-appointments-page-tab ${statusFilter === st ? 'active' : ''}`}
                onClick={() => handleStatusFilterChange(st)}
             >
                {st === 'all' ? 'Tất cả' : 
                 st === 'pending' ? 'Chờ xác nhận' : 
                 st === 'confirmed' ? 'Đã xác nhận' :
                 st === 'completed' ? 'Hoàn thành' : 'Đã hủy'}
             </button>
          ))}
        </div>

        {/* LIST */}
        <div className="my-appointments-page-list">
            {filteredAppointments.map(appointment => {
              const statusInfo = getStatusInfo(appointment); // Gọi hàm fix logic
              const isPaid = (appointment.Payment && appointment.Payment.status === 'paid') || appointment.payment_status === 'paid';

              return (
                <div key={appointment.id} className="my-appointments-page-card" onClick={() => navigate(`/lich-hen/${appointment.code}`)}>
                  <div className="my-appointments-page-card-header">
                    <div className="my-appointments-page-card-code">Mã: <span>{appointment.code}</span></div>
                    <span className={`my-appointments-page-status-badge ${statusInfo.class}`}>
                      {statusInfo.icon} {statusInfo.text}
                    </span>
                  </div>

                  <div className="my-appointments-page-card-body">
                    <div className="my-appointments-page-card-service">{appointment.Service?.name}</div>
                    <div className="my-appointments-page-card-doctor">
                        <FaUserMd /> BS. {appointment.Doctor?.user?.full_name}
                    </div>

                    <div className="my-appointments-page-card-datetime">
                      <div className="my-appointments-page-datetime-item"><FaCalendarAlt /> {formatDate(appointment.appointment_date)}</div>
                      <div className="my-appointments-page-datetime-item"><FaClock /> {formatTime(appointment.appointment_start_time)}</div>
                      <div className="my-appointments-page-datetime-item">{appointment.appointment_type === 'online' ? <FaVideo/> : <FaHospital/>} {appointment.appointment_type === 'online' ? 'Online' : 'Tại viện'}</div>
                    </div>

                    {/* TRẠNG THÁI THANH TOÁN (Đã fix) */}
                    <div style={{marginTop: '10px'}}>
                        {isPaid ? (
                            <span className="badge-payment-success"><FaCheckCircle/> Đã thanh toán</span>
                        ) : (
                            appointment.status !== 'cancelled' && <span className="badge-payment-warning"><FaExclamationTriangle/> Chưa thanh toán</span>
                        )}
                    </div>
                  </div>
                  
                  <div className="my-appointments-page-card-footer">
                    <span className="my-appointments-page-view-detail">Xem chi tiết <FaArrowRight /></span>
                  </div>
                </div>
              );
            })}
            {filteredAppointments.length === 0 && <p className="text-center text-muted py-5">Không có lịch hẹn nào.</p>}
        </div>
      </div>

      {/* ✅ MODAL CẬP NHẬT HỒ SƠ Y TẾ */}
      {showHealthModal && (
        <div className="health-modal-overlay">
            <div className="health-modal-content">
                <div className="health-modal-header">
                    <h3><FaNotesMedical/> Cập nhật Hồ sơ Y tế</h3>
                    <button onClick={() => setShowHealthModal(false)}><FaTimes/></button>
                </div>
                <form onSubmit={handleUpdateHealthProfile}>
                    <div className="health-modal-body">
                        <div className="form-row">
                            <div className="form-group half">
                                <label>Chiều cao (cm)</label>
                                <input type="number" value={healthData.height} onChange={e => setHealthData({...healthData, height: e.target.value})} placeholder="VD: 170" />
                            </div>
                            <div className="form-group half">
                                <label>Cân nặng (kg)</label>
                                <input type="number" value={healthData.weight} onChange={e => setHealthData({...healthData, weight: e.target.value})} placeholder="VD: 65" />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group half">
                                <label>Nhóm máu</label>
                                <select value={healthData.blood_type} onChange={e => setHealthData({...healthData, blood_type: e.target.value})}>
                                    <option value="">-- Chọn --</option>
                                    <option value="A">A</option><option value="B">B</option><option value="AB">AB</option><option value="O">O</option>
                                </select>
                            </div>
                            <div className="form-group half">
                                <label>Số BHYT</label>
                                <input type="text" value={healthData.health_insurance} onChange={e => setHealthData({...healthData, health_insurance: e.target.value})} placeholder="Nhập số thẻ..." />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Tiền sử dị ứng (Thuốc, thức ăn...)</label>
                            <textarea rows="2" value={healthData.allergies} onChange={e => setHealthData({...healthData, allergies: e.target.value})} placeholder="Không có thì để trống..."></textarea>
                        </div>
                        <div className="form-group">
                            <label>Bệnh lý nền / Mạn tính</label>
                            <textarea rows="2" value={healthData.chronic_diseases} onChange={e => setHealthData({...healthData, chronic_diseases: e.target.value})} placeholder="Tiểu đường, huyết áp..."></textarea>
                        </div>
                        <div className="form-group">
                            <label>Liên hệ khẩn cấp (Tên + SĐT)</label>
                            <input type="text" value={healthData.emergency_contact} onChange={e => setHealthData({...healthData, emergency_contact: e.target.value})} placeholder="VD: Nguyễn Văn A - 09xxxx" />
                        </div>
                    </div>
                    <div className="health-modal-footer">
                        <button type="submit" className="btn-save"><FaSave/> Lưu hồ sơ</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* CSS INLINE (Giữ nguyên để đảm bảo hiển thị đúng mà không cần sửa file CSS) */}
      <style>{`
        .profile-warning-banner {
            background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px;
            padding: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;
        }
        .warning-content { display: flex; gap: 15px; align-items: center; color: #991B1B; }
        .warning-icon { font-size: 24px; color: #EF4444; }
        .btn-update-profile {
            background: #EF4444; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600;
        }
        .badge-payment-success { background: #dcfce7; color: #166534; padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; display: inline-flex; align-items: center; gap: 5px; }
        .badge-payment-warning { background: #fef9c3; color: #854d0e; padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; display: inline-flex; align-items: center; gap: 5px; }
        
        .health-modal-overlay {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 2000;
            display: flex; justify-content: center; align-items: center;
        }
        .health-modal-content {
            background: white; width: 90%; max-width: 600px; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        }
        .health-modal-header { background: #F0FDF4; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #DCFCE7; }
        .health-modal-header h3 { margin: 0; color: #166534; display: flex; align-items: center; gap: 10px; }
        .health-modal-body { padding: 20px; }
        .form-row { display: flex; gap: 15px; margin-bottom: 15px; }
        .form-group { margin-bottom: 15px; }
        .form-group.half { flex: 1; }
        .form-group label { display: block; margin-bottom: 5px; font-weight: 600; font-size: 0.9rem; color: #374151; }
        .form-group input, .form-group select, .form-group textarea {
            width: 100%; padding: 10px; border: 1px solid #D1D5DB; border-radius: 6px; font-size: 0.95rem;
        }
        .health-modal-footer { padding: 15px 20px; background: #F9FAFB; text-align: right; border-top: 1px solid #E5E7EB; }
        .btn-save { background: #22C55E; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; }
        .btn-save:hover { background: #16A34A; }
      `}</style>
    </div>
  );
};

export default MyAppointmentsPage;