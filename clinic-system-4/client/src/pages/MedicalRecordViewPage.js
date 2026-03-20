// client/src/pages/MedicalRecordViewPage.js
// Trang Hồ sơ Y tế với 2 tabs: Hồ sơ khám bệnh + Hồ sơ sức khỏe cá nhân

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import medicalRecordService from '../services/medicalRecordService';
import userService from '../services/userService';
import { useAuth } from '../contexts/AuthContext';
import './MedicalRecordViewPage.css';

import {
  FaUserInjured, FaUserMd, FaCalendarAlt, FaNotesMedical,
  FaFileMedical, FaFilePrescription, FaDownload, FaSpinner,
  FaFileImage, FaFilePdf, FaFileWord, FaStethoscope,
  FaArrowLeft, FaPrint, FaWeight, FaRuler, FaTint, FaIdCard, 
  FaAllergies, FaHeartbeat, FaPhone, FaSave, FaEdit, FaCheckCircle,
  FaCalculator, FaHistory, FaInfoCircle, FaClipboardList, FaUser,
  FaExclamationTriangle
} from 'react-icons/fa';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const MedicalRecordViewPage = () => {
  const { record_id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') || (record_id ? 'records' : 'health-profile');
  const [activeTab, setActiveTab] = useState(initialTab);

  // Medical Records states
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  // Health Profile states
  const [editing, setEditing] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileStatus, setProfileStatus] = useState({
    complete: false,
    completionRate: 0,
    missingFields: []
  });

  const [healthData, setHealthData] = useState({
    height: '',
    weight: '',
    blood_type: '',
    health_insurance: '',
    allergies: '',
    chronic_diseases: '',
    emergency_contact: '',
    family_history: '',
    current_medications: '',
    vaccination_history: '',
    smoking_status: 'no',
    alcohol_consumption: 'no',
    exercise_frequency: 'rarely'
  });

  const [bmi, setBmi] = useState(null);

  useEffect(() => {
    if (activeTab === 'records' && record_id) {
      loadMedicalRecord();
    } else if (activeTab === 'health-profile') {
      loadHealthProfile();
    }
  }, [record_id, activeTab]);

  useEffect(() => {
    calculateBMI();
  }, [healthData.height, healthData.weight]);

  // Load Medical Record (Tab 1)
  const loadMedicalRecord = async () => {
    try {
      setLoading(true);
      const response = await medicalRecordService.getMedicalRecordById(record_id);
      if (response.data.success) {
        setRecord(response.data.data);
      } else {
        toast.error('Không thể tải hồ sơ y tế.');
      }
    } catch (error) {
      console.error('Error loading medical record:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        toast.error('Bạn không có quyền xem hồ sơ này.');
        navigate('/login');
      } else {
        toast.error('Lỗi khi tải dữ liệu.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Load Health Profile (Tab 2)
  const loadHealthProfile = async () => {
    setProfileLoading(true);
    try {
      const res = await userService.getMyRoleInfo();
      if (res.data.success) {
        const { missing_profile, missing_fields, roleData } = res.data.user;
        
        if (roleData?.medical_history) {
          let medHistory = {};
          try {
            // Thử parse JSON, nếu backend trả về text "Không có" thì sẽ nhảy vào catch
            medHistory = typeof roleData.medical_history === 'string' 
              ? JSON.parse(roleData.medical_history) 
              : roleData.medical_history;
          } catch (error) {
            console.warn("Dữ liệu sức khỏe không đúng định dạng JSON:", roleData.medical_history);
            // Nếu lỗi parse (ví dụ chuỗi là "Không có"), ta gán bằng rỗng để không crash trang
            medHistory = {}; 
          }
          
          // Kiểm tra nếu medHistory là null sau khi parse thì gán lại object rỗng
          if (!medHistory) medHistory = {};

          setHealthData(prev => ({ ...prev, ...medHistory }));
        }

        const filledFields = Object.values(healthData).filter(v => v && v.toString().trim() !== '').length;
        const rate = Math.round((filledFields / Object.keys(healthData).length) * 100);

        setProfileStatus({
          complete: !missing_profile,
          completionRate: rate,
          missingFields: missing_fields || []
        });
      }
    } catch (error) {
      console.error('Load error:', error);
      toast.error('Không thể tải hồ sơ sức khỏe');
    } finally {
      setProfileLoading(false);
    }
  };

  const calculateBMI = () => {
    const h = parseFloat(healthData.height);
    const w = parseFloat(healthData.weight);
    if (h > 0 && w > 0) {
      const heightInMeters = h / 100;
      const bmiValue = (w / (heightInMeters * heightInMeters)).toFixed(1);
      setBmi(bmiValue);
    } else {
      setBmi(null);
    }
  };

  const getBMIStatus = () => {
    if (!bmi) return null;
    const value = parseFloat(bmi);
    if (value < 18.5) return { label: 'Thiếu cân', color: '#fbbf24', icon: FaExclamationTriangle };
    if (value < 25) return { label: 'Bình thường', color: '#22c55e', icon: FaCheckCircle };
    if (value < 30) return { label: 'Thừa cân', color: '#f97316', icon: FaExclamationTriangle };
    return { label: 'Béo phì', color: '#ef4444', icon: FaExclamationTriangle };
  };

  const handleSubmitHealthProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await userService.updatePatientHealthInfo(healthData);
      if (res.data.success) {
        toast.success('Cập nhật hồ sơ sức khỏe thành công!');
        setEditing(false);
        loadHealthProfile();
      }
    } catch (error) {
      toast.error('Lỗi cập nhật hồ sơ');
    }
  };

  const handleInputChange = (field, value) => {
    setHealthData(prev => ({ ...prev, [field]: value }));
  };

  // Helpers for Medical Record
  const renderFileIcon = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return <FaFileImage />;
    if (ext === 'pdf') return <FaFilePdf />;
    if (['doc', 'docx'].includes(ext)) return <FaFileWord />;
    return <FaFileMedical />;
  };

  const getFileUrl = (url) => {
    if (!url) return '#';
    const relativeUrl = url.startsWith('/') ? url : `/${url}`;
    return `${API_URL}${relativeUrl}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const bmiStatus = getBMIStatus();

  return (
    <div className="medical-record-view-page-container">
      <div className="medical-record-view-page-wrapper">
        
        {/* Header */}
        <div className="medical-record-view-page-header">
          <div className="medical-record-view-page-header-content">
            <h1><FaNotesMedical /> Hồ Sơ Y Tế</h1>
            <p>Quản lý hồ sơ khám bệnh và thông tin sức khỏe cá nhân</p>
          </div>
          <div className="medical-record-view-page-header-actions">
            <button 
              className="medical-record-view-page-btn-secondary"
              onClick={() => navigate(-1)}
            >
              <FaArrowLeft /> Quay lại
            </button>
            {activeTab === 'records' && record && (
              <button 
                className="medical-record-view-page-btn-primary"
                onClick={() => window.print()}
              >
                <FaPrint /> In hồ sơ
              </button>
            )}
            {activeTab === 'health-profile' && !editing && (
              <button 
                className="medical-record-view-page-btn-primary"
                onClick={() => setEditing(true)}
              >
                <FaEdit /> Chỉnh sửa
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="medical-record-tabs">
          <button
            className={`tab-btn ${activeTab === 'records' ? 'active' : ''}`}
            onClick={() => setActiveTab('records')}
            disabled={!record_id}
          >
            <FaClipboardList /> Hồ sơ y tế khám bệnh
          </button>
          <button
            className={`tab-btn ${activeTab === 'health-profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('health-profile')}
          >
            <FaUser /> Hồ sơ sức khỏe cá nhân
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'records' ? (
          // TAB 1: HỒ SƠ KHÁM BỆNH
          !record_id ? (
            <div className="medical-record-view-page-error">
              <FaExclamationTriangle />
              <span>Vui lòng chọn một hồ sơ khám bệnh để xem chi tiết.</span>
              <button 
                className="medical-record-view-page-btn-primary"
                onClick={() => navigate('/danh-sach-ho-so')}
                style={{ marginTop: '1rem' }}
              >
                Xem danh sách hồ sơ
              </button>
            </div>
          ) : loading ? (
            <div className="medical-record-view-page-loading">
              <FaSpinner className="medical-record-view-page-spin-icon" />
              <span>Đang tải hồ sơ y tế...</span>
            </div>
          ) : !record ? (
            <div className="medical-record-view-page-error">
              <FaExclamationTriangle />
              <span>Không tìm thấy hồ sơ y tế.</span>
            </div>
          ) : (
            <>
              {/* Info Grid */}
              <div className="medical-record-view-page-info-grid">
                <div className="medical-record-view-page-info-card">
                  <FaUserInjured className="medical-record-view-page-info-icon" />
                  <div className="medical-record-view-page-info-text">
                    <label>Bệnh nhân</label>
                    <span>{record.Patient?.user?.full_name || record.Appointment?.guest_name || 'N/A'}</span>
                  </div>
                </div>
                <div className="medical-record-view-page-info-card">
                  <FaUserMd className="medical-record-view-page-info-icon" />
                  <div className="medical-record-view-page-info-text">
                    <label>Bác sĩ phụ trách</label>
                    <span>{record.Doctor?.user?.full_name || 'N/A'}</span>
                  </div>
                </div>
                <div className="medical-record-view-page-info-card">
                  <FaCalendarAlt className="medical-record-view-page-info-icon" />
                  <div className="medical-record-view-page-info-text">
                    <label>Ngày khám</label>
                    <span>{formatDate(record.Appointment?.appointment_date || record.created_at)}</span>
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div className="medical-record-view-page-main-grid">
                <div className="medical-record-view-page-left-col">
                  <div className="medical-record-view-page-card">
                    <div className="medical-record-view-page-diagnosis-box">
                      <h2 className="medical-record-view-page-diagnosis-title">
                        <FaStethoscope /> Chẩn đoán
                      </h2>
                      <p className="medical-record-view-page-diagnosis-text">
                        {record.diagnosis || 'Không có chẩn đoán.'}
                      </p>
                    </div>

                    <div className="medical-record-view-page-section">
                      <h3 className="medical-record-view-page-section-title">Triệu chứng</h3>
                      <p>{record.symptoms || 'Không có thông tin.'}</p>
                    </div>

                    <div className="medical-record-view-page-section">
                      <h3 className="medical-record-view-page-section-title">Kế hoạch điều trị</h3>
                      <p>{record.treatment_plan || 'Không có thông tin.'}</p>
                    </div>

                    <div className="medical-record-view-page-section">
                      <h3 className="medical-record-view-page-section-title">Lời khuyên của Bác sĩ</h3>
                      <p>{record.advice || 'Không có thông tin.'}</p>
                    </div>

                    {record.follow_up_date && (
                      <div className="medical-record-view-page-section medical-record-view-page-follow-up">
                        <FaCalendarAlt />
                        <strong>Ngày tái khám:</strong> {formatDate(record.follow_up_date)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="medical-record-view-page-right-col">
                  {record.prescription_json && record.prescription_json.length > 0 && (
                    <div className="medical-record-view-page-card">
                      <h2 className="medical-record-view-page-card-title">
                        <FaFilePrescription /> Đơn thuốc
                      </h2>
                      <table className="medical-record-view-page-prescription-table">
                        <thead>
                          <tr>
                            <th>Tên thuốc</th>
                            <th>SL</th>
                            <th>Liều dùng</th>
                            <th>Hướng dẫn</th>
                          </tr>
                        </thead>
                        <tbody>
                          {record.prescription_json.map((item, index) => (
                            <tr key={index}>
                              <td data-label="Thuốc">{item.name}</td>
                              <td data-label="SL">{item.quantity}</td>
                              <td data-label="Liều">{item.dosage}</td>
                              <td data-label="HD">{item.instructions}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {(record.test_images_json?.length > 0 || record.report_files_json?.length > 0) && (
                    <div className="medical-record-view-page-card">
                      <h2 className="medical-record-view-page-card-title">
                        <FaFileMedical /> Tài liệu đính kèm
                      </h2>

                      {record.test_images_json?.length > 0 && (
                        <div className="medical-record-view-page-file-group">
                          <h4 className="medical-record-view-page-file-group-title">
                            <FaFileImage /> Ảnh xét nghiệm
                          </h4>
                          <div className="medical-record-view-page-file-list">
                            {record.test_images_json.map((file, index) => (
                              <a
                                key={index}
                                href={getFileUrl(file.url)}
                                className="medical-record-view-page-file-item"
                                target="_blank"
                                rel="noopener noreferrer"
                                download={file.originalname}
                              >
                                {renderFileIcon(file.originalname)}
                                <span className="medical-record-view-page-file-name" title={file.originalname}>
                                  {file.originalname}
                                </span>
                                <FaDownload className="medical-record-view-page-file-download-icon" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {record.report_files_json?.length > 0 && (
                        <div className="medical-record-view-page-file-group">
                          <h4 className="medical-record-view-page-file-group-title">
                            <FaFilePdf /> File Báo cáo
                          </h4>
                          <div className="medical-record-view-page-file-list">
                            {record.report_files_json.map((file, index) => (
                              <a
                                key={index}
                                href={getFileUrl(file.url)}
                                className="medical-record-view-page-file-item"
                                target="_blank"
                                rel="noopener noreferrer"
                                download={file.originalname}
                              >
                                {renderFileIcon(file.originalname)}
                                <span className="medical-record-view-page-file-name" title={file.originalname}>
                                  {file.originalname}
                                </span>
                                <FaDownload className="medical-record-view-page-file-download-icon" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )
        ) : (
          // TAB 2: HỒ SƠ SỨC KHỎE CÁ NHÂN
          profileLoading ? (
            <div className="medical-record-view-page-loading">
              <FaSpinner className="medical-record-view-page-spin-icon" />
              <span>Đang tải hồ sơ sức khỏe...</span>
            </div>
          ) : (
            <form onSubmit={handleSubmitHealthProfile}>
              {/* Completion Status */}
              <div className="profile-completion-card">
                <div className="completion-header">
                  <h3>Độ hoàn thiện hồ sơ</h3>
                  <span className={`completion-badge ${profileStatus.complete ? 'complete' : 'incomplete'}`}>
                    {profileStatus.completionRate}%
                  </span>
                </div>
                <div className="completion-bar">
                  <div
                    className="completion-fill"
                    style={{ width: `${profileStatus.completionRate}%` }}
                  ></div>
                </div>
                {profileStatus.missingFields.length > 0 && (
                  <p className="missing-fields-note">
                    <FaInfoCircle /> Còn thiếu: {profileStatus.missingFields.join(', ')}
                  </p>
                )}
              </div>

              {/* Thông tin cơ bản */}
              <div className="health-section">
                <div className="section-header">
                  <h2><FaUserMd /> Thông tin cơ bản</h2>
                </div>
                <div className="section-content">
                  <div className="form-row">
                    <div className="form-group">
                      <label><FaRuler /> Chiều cao (cm) <span className="required">*</span></label>
                      <input
                        type="number"
                        value={healthData.height}
                        onChange={(e) => handleInputChange('height', e.target.value)}
                        placeholder="VD: 170"
                        disabled={!editing}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label><FaWeight /> Cân nặng (kg) <span className="required">*</span></label>
                      <input
                        type="number"
                        value={healthData.weight}
                        onChange={(e) => handleInputChange('weight', e.target.value)}
                        placeholder="VD: 65"
                        disabled={!editing}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label><FaTint /> Nhóm máu</label>
                      <select
                        value={healthData.blood_type}
                        onChange={(e) => handleInputChange('blood_type', e.target.value)}
                        disabled={!editing}
                      >
                        <option value="">-- Chọn --</option>
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="AB">AB</option>
                        <option value="O">O</option>
                      </select>
                    </div>
                  </div>

                  {bmi && bmiStatus && (
                    <div className="bmi-display" style={{ borderColor: bmiStatus.color }}>
                      <div className="bmi-icon" style={{ color: bmiStatus.color }}>
                        <FaCalculator />
                      </div>
                      <div className="bmi-info">
                        <div className="bmi-label">Chỉ số BMI</div>
                        <div className="bmi-value" style={{ color: bmiStatus.color }}>
                          {bmi}
                        </div>
                      </div>
                      <div className="bmi-status" style={{ color: bmiStatus.color }}>
                        <bmiStatus.icon />
                        <span>{bmiStatus.label}</span>
                      </div>
                    </div>
                  )}

                  <div className="form-row">
                    <div className="form-group full">
                      <label><FaIdCard /> Số thẻ BHYT</label>
                      <input
                        type="text"
                        value={healthData.health_insurance}
                        onChange={(e) => handleInputChange('health_insurance', e.target.value)}
                        placeholder="VD: SV1234567890..."
                        disabled={!editing}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Tiền sử bệnh */}
              <div className="health-section">
                <div className="section-header">
                  <h2><FaHistory /> Tiền sử bệnh lý</h2>
                </div>
                <div className="section-content">
                  <div className="form-group full">
                    <label><FaAllergies /> Tiền sử dị ứng</label>
                    <textarea
                      rows="3"
                      value={healthData.allergies}
                      onChange={(e) => handleInputChange('allergies', e.target.value)}
                      placeholder="VD: Dị ứng penicillin, hải sản..."
                      disabled={!editing}
                    />
                  </div>

                  <div className="form-group full">
                    <label><FaHeartbeat /> Bệnh lý nền / Mạn tính</label>
                    <textarea
                      rows="3"
                      value={healthData.chronic_diseases}
                      onChange={(e) => handleInputChange('chronic_diseases', e.target.value)}
                      placeholder="VD: Tiểu đường type 2, cao huyết áp..."
                      disabled={!editing}
                    />
                  </div>

                  <div className="form-group full">
                    <label><FaNotesMedical /> Tiền sử gia đình</label>
                    <textarea
                      rows="3"
                      value={healthData.family_history}
                      onChange={(e) => handleInputChange('family_history', e.target.value)}
                      placeholder="VD: Gia đình có người bị ung thư, tim mạch..."
                      disabled={!editing}
                    />
                  </div>

                  <div className="form-group full">
                    <label><FaNotesMedical /> Thuốc đang dùng</label>
                    <textarea
                      rows="3"
                      value={healthData.current_medications}
                      onChange={(e) => handleInputChange('current_medications', e.target.value)}
                      placeholder="VD: Metformin 500mg (2 lần/ngày)..."
                      disabled={!editing}
                    />
                  </div>

                  <div className="form-group full">
                    <label><FaNotesMedical /> Lịch sử tiêm chủng</label>
                    <textarea
                      rows="2"
                      value={healthData.vaccination_history}
                      onChange={(e) => handleInputChange('vaccination_history', e.target.value)}
                      placeholder="VD: Đã tiêm COVID-19 (3 mũi), cúm (hàng năm)..."
                      disabled={!editing}
                    />
                  </div>
                </div>
              </div>

              {/* Lối sống */}
              <div className="health-section">
                <div className="section-header">
                  <h2><FaHeartbeat /> Thói quen sinh hoạt</h2>
                </div>
                <div className="section-content">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Tình trạng hút thuốc</label>
                      <select
                        value={healthData.smoking_status}
                        onChange={(e) => handleInputChange('smoking_status', e.target.value)}
                        disabled={!editing}
                      >
                        <option value="no">Không hút</option>
                        <option value="former">Đã bỏ</option>
                        <option value="occasional">Thỉnh thoảng</option>
                        <option value="regular">Thường xuyên</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Uống rượu/bia</label>
                      <select
                        value={healthData.alcohol_consumption}
                        onChange={(e) => handleInputChange('alcohol_consumption', e.target.value)}
                        disabled={!editing}
                      >
                        <option value="no">Không uống</option>
                        <option value="occasional">Thỉnh thoảng</option>
                        <option value="moderate">Vừa phải</option>
                        <option value="frequent">Thường xuyên</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Tần suất tập luyện</label>
                      <select
                        value={healthData.exercise_frequency}
                        onChange={(e) => handleInputChange('exercise_frequency', e.target.value)}
                        disabled={!editing}
                      >
                        <option value="rarely">Hiếm khi</option>
                        <option value="1-2">1-2 lần/tuần</option>
                        <option value="3-4">3-4 lần/tuần</option>
                        <option value="daily">Hàng ngày</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Liên hệ khẩn cấp */}
              <div className="health-section">
                <div className="section-header">
                  <h2><FaPhone /> Liên hệ khẩn cấp</h2>
                </div>
                <div className="section-content">
                  <div className="form-group full">
                    <label>Người thân (Họ tên - SĐT)</label>
                    <input
                      type="text"
                      value={healthData.emergency_contact}
                      onChange={(e) => handleInputChange('emergency_contact', e.target.value)}
                      placeholder="VD: Nguyễn Văn A - 0912345678"
                      disabled={!editing}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              {editing && (
                <div className="health-profile-actions">
                  <button type="button" className="btn-cancel" onClick={() => {
                    setEditing(false);
                    loadHealthProfile();
                  }}>
                    Hủy
                  </button>
                  <button type="submit" className="btn-save">
                    <FaSave /> Lưu hồ sơ
                  </button>
                </div>
              )}
            </form>
          )
        )}
      </div>
    </div>
  );
};

export default MedicalRecordViewPage;