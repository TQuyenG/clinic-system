// client/src/pages/MyMedicalRecordsPage.js
// FILE MỚI - Trang "Hồ sơ y tế của tôi" (Cho Patient)

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import medicalRecordService from '../services/medicalRecordService';
import PasswordConfirmModal from '../components/auth/PasswordConfirmModal';

// Import CSS
import './MyMedicalRecordsPage.css';

// Import Icons
import {
  FaFileMedicalAlt,
  FaSpinner,
  FaArrowRight,
  FaUserMd,
  FaCalendarAlt,
  FaHashtag,
  FaExclamationTriangle,
  FaShieldAlt
} from 'react-icons/fa';

const MyMedicalRecordsPage = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State cho modal bảo mật
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState(null);

  useEffect(() => {
    const loadMyRecords = async () => {
      try {
        setLoading(true);
        // 1. Gọi API chúng ta vừa tạo trong service
        const response = await medicalRecordService.getMyMedicalRecords();
        
        if (response.data.success) {
          setRecords(response.data.data);
        } else {
          toast.error(response.data.message || 'Không thể tải hồ sơ');
        }
      } catch (error) {
        console.error('Error loading medical records:', error);
        toast.error(error.response?.data?.message || 'Lỗi khi tải hồ sơ y tế');
      } finally {
        setLoading(false);
      }
    };

    loadMyRecords();
  }, []);

  // 2. Mở modal khi nhấn "Xem chi tiết"
  const handleViewClick = (recordId) => {
    setSelectedRecordId(recordId);
    setShowPasswordModal(true);
  };

  // 3. Xử lý khi mật khẩu được xác nhận thành công
  const handlePasswordConfirm = () => {
    setShowPasswordModal(false);
    if (selectedRecordId) {
      // Chuyển hướng đến trang xem chi tiết
      navigate(`/ket-qua-kham/${selectedRecordId}`);
    }
    setSelectedRecordId(null);
  };

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
      <div className="my-medical-records-page-container my-medical-records-page-loading">
        <FaSpinner className="my-medical-records-page-spin-icon" />
        <span>Đang tải hồ sơ y tế của bạn...</span>
      </div>
    );
  }

  return (
    <>
      <div className="my-medical-records-page-container">
        <div className="my-medical-records-page-wrapper">
          
          {/* Header */}
          <div className="my-medical-records-page-header">
            <FaFileMedicalAlt />
            <h1>Hồ sơ Y tế của tôi</h1>
            <p>Nơi lưu trữ tất cả kết quả khám bệnh của bạn tại Clinic System.</p>
          </div>

          {/* Danh sách hồ sơ */}
          <div className="my-medical-records-page-records-list">
            {records.length === 0 ? (
              <div className="my-medical-records-page-empty-state">
                <FaExclamationTriangle />
                <h3>Không tìm thấy hồ sơ</h3>
                <p>Bạn chưa có bất kỳ hồ sơ khám bệnh nào được lưu trữ.</p>
              </div>
            ) : (
              records.map(record => (
                <div key={record.id} className="my-medical-records-page-record-card">
                  <div className="my-medical-records-page-card-header">
                    <div className="my-medical-records-page-card-code">
                      <FaHashtag />
                      {record.Appointment?.code || 'N/A'}
                    </div>
                  </div>
                  
                  <div className="my-medical-records-page-card-body">
                    <div className="my-medical-records-page-info-item">
                      <FaCalendarAlt />
                      <span><strong>Ngày khám:</strong> {formatDate(record.Appointment?.appointment_date || record.created_at)}</span>
                    </div>
                    <div className="my-medical-records-page-info-item">
                      <FaUserMd />
                      <span><strong>Bác sĩ:</strong> {record.Doctor?.user?.full_name || 'N/A'}</span>
                    </div>
                  </div>
                  
                  <div className="my-medical-records-page-card-footer">
                    <button 
                      className="my-medical-records-page-btn-view"
                      onClick={() => handleViewClick(record.id)}
                    >
                      <FaShieldAlt />
                      Xem chi tiết (Bảo mật)
                      <FaArrowRight />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 4. Render Modal xác thực */}
      <PasswordConfirmModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onConfirm={handlePasswordConfirm}
      />
    </>
  );
};

export default MyMedicalRecordsPage;