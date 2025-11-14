// client/src/pages/MedicalRecordViewPage.js
// FILE MỚI - Trang xem chi tiết Hồ sơ Y tế (Read-only)

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import medicalRecordService from '../services/medicalRecordService';
import { useAuth } from '../contexts/AuthContext';

// Import CSS
import './MedicalRecordViewPage.css';

// Import Icons
import {
  FaUserInjured, FaUserMd, FaCalendarAlt, FaNotesMedical,
  FaFileMedical, FaFilePrescription, FaDownload, FaSpinner,
  FaFileImage, FaFilePdf, FaFileWord, FaStethoscope,
  FaCommentMedical, FaExclamationTriangle, FaArrowLeft, FaPrint
} from 'react-icons/fa';

// Lấy API URL từ .env để tạo link file an toàn
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const MedicalRecordViewPage = () => {
  const { record_id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth(); // Dùng để check quyền (nếu cần)

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Logic tải dữ liệu này sẽ thất bại nếu chưa qua bước xác thực
    // (như nhập mật khẩu hoặc tra cứu)
    // Nhưng vì user đã vào được đây, ta giả định họ đã được xác thực
    // (Backend đã check quyền cho route này)
    const loadRecord = async () => {
      try {
        setLoading(true);
        const response = await medicalRecordService.getMedicalRecordById(record_id);
        if (response.data.success) {
          setRecord(response.data.data);
        } else {
          toast.error('Không thể tải hồ sơ y tế.');
          navigate('/');
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

    if (record_id) {
      loadRecord();
    }
  }, [record_id, navigate]);

  // Helper render file
  const renderFileIcon = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return <FaFileImage />;
    if (ext === 'pdf') return <FaFilePdf />;
    if (['doc', 'docx'].includes(ext)) return <FaFileWord />;
    return <FaFileMedical />;
  };

  // Helper tạo link file an toàn
  const getFileUrl = (url) => {
    if (!url) return '#';
    // Đảm bảo URL bắt đầu bằng /
    const relativeUrl = url.startsWith('/') ? url : `/${url}`;
    // File của chúng ta được serve từ /uploads/medical-files
    // Backend lưu là /uploads/medical-files/filename.pdf
    // Nếu API_URL là http://localhost:3001, link sẽ là http://localhost:3001/uploads/medical-files/filename.pdf
    return `${API_URL}${relativeUrl}`;
  };

  // Helper format ngày
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="medical-record-view-page-container medical-record-view-page-loading">
        <FaSpinner className="medical-record-view-page-spin-icon" />
        <span>Đang tải hồ sơ y tế...</span>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="medical-record-view-page-container medical-record-view-page-error">
        <FaExclamationTriangle />
        <span>Không tìm thấy hồ sơ y tế.</span>
        <Link to="/" className="medical-record-view-page-btn-back">
          <FaArrowLeft /> Về trang chủ
        </Link>
      </div>
    );
  }

  // Lấy dữ liệu an toàn
  const { Appointment, Patient, Doctor } = record;
  const patientName = Patient?.user?.full_name || Appointment?.guest_name || 'N/A';
  const doctorName = Doctor?.user?.full_name || 'N/A';
  const appointmentCode = Appointment?.code || 'N/A';
  const appointmentDate = Appointment?.appointment_date || record.created_at;

  return (
    <div className="medical-record-view-page-container">
      <div className="medical-record-view-page-wrapper">

        {/* Header */}
        <div className="medical-record-view-page-header">
          <div className="medical-record-view-page-header-content">
            <h1>Hồ Sơ Y Tế</h1>
            <p>
              Kết quả khám cho lịch hẹn <strong>{appointmentCode}</strong>
              {' | '}Ngày: {formatDate(appointmentDate)}
            </p>
          </div>
          <div className="medical-record-view-page-header-actions">
            <button 
              className="medical-record-view-page-btn-secondary"
              onClick={() => navigate(-1)}
            >
              <FaArrowLeft /> Quay lại
            </button>
            <button 
              className="medical-record-view-page-btn-primary"
              onClick={() => window.print()}
            >
              <FaPrint /> In hồ sơ
            </button>
          </div>
        </div>

        {/* Thông tin Bệnh nhân & Bác sĩ */}
        <div className="medical-record-view-page-info-grid">
          <div className="medical-record-view-page-info-card">
            <FaUserInjured className="medical-record-view-page-info-icon" />
            <div className="medical-record-view-page-info-text">
              <label>Bệnh nhân</label>
              <span>{patientName}</span>
            </div>
          </div>
          <div className="medical-record-view-page-info-card">
            <FaUserMd className="medical-record-view-page-info-icon" />
            <div className="medical-record-view-page-info-text">
              <label>Bác sĩ phụ trách</label>
              <span>{doctorName}</span>
            </div>
          </div>
        </div>

        {/* Nội dung chính */}
        <div className="medical-record-view-page-main-grid">
          
          {/* Cột trái (Kết quả) */}
          <div className="medical-record-view-page-left-col">
            <div className="medical-record-view-page-card">
              {/* Chẩn đoán (Nổi bật) */}
              <div className="medical-record-view-page-diagnosis-box">
                <h2 className="medical-record-view-page-diagnosis-title">
                  <FaStethoscope /> Chẩn đoán
                </h2>
                <p className="medical-record-view-page-diagnosis-text">
                  {record.diagnosis || 'Không có chẩn đoán.'}
                </p>
              </div>

              {/* Các mục khác */}
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
                  <strong>Ngày tái khám (dự kiến):</strong> {formatDate(record.follow_up_date)}
                </div>
              )}
            </div>
          </div>

          {/* Cột phải (Đơn thuốc & Files) */}
          <div className="medical-record-view-page-right-col">
            
            {/* Đơn thuốc */}
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

            {/* Files đính kèm */}
            {(record.test_images_json?.length > 0 || record.report_files_json?.length > 0) && (
              <div className="medical-record-view-page-card">
                <h2 className="medical-record-view-page-card-title">
                  <FaFileMedical /> Tài liệu đính kèm
                </h2>
                
                {/* Ảnh XN */}
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
                
                {/* File Báo cáo */}
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

        {/* Footer (Cảnh báo bảo mật) */}
        <div className="medical-record-view-page-footer-alert">
          <FaExclamationTriangle />
          <p>
            <strong>Thông tin bảo mật:</strong> Đây là thông tin sức khỏe cá nhân. Không chia sẻ tài khoản hoặc mã tra cứu của bạn cho người khác.
          </p>
        </div>

      </div>
    </div>
  );
};

export default MedicalRecordViewPage;