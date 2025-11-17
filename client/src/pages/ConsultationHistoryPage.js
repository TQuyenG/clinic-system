// client/src/pages/ConsultationHistoryPage.js
// Trang quản lý tư vấn của bệnh nhân (Thiết kế lại)

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import consultationService from '../services/consultationService';
import { 
  FaCalendarAlt,
  FaFilter,
  FaEye,
  FaStar,
  FaCommentDots, // Icon cho Chat
  FaVideo,       // Icon cho Video
  FaBan,         // Icon cho Hủy
  FaStarHalfAlt, // Icon cho Đánh giá
  FaHistory,
  FaNotesMedical,
  FaEnvelope
} from 'react-icons/fa';
// Import file CSS mới
import './ConsultationHistoryPage.css';

import ReviewModal from '../components/consultation/ReviewModal';

const ConsultationHistoryPage = () => {
  const navigate = useNavigate();
  
  const [consultations, setConsultations] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // State cho bộ lọc
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'chat', // Mặc định mở tab 'chat'
    page: 1,
    limit: 10
  });
  
  // State cho tab
  const [activeTab, setActiveTab] = useState('chat');

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedConsultationForReview, setSelectedConsultationForReview] = useState(null);
  const [modalMode, setModalMode] = useState('submit');

  // Hook fetchData giữ nguyên, sẽ tự động chạy khi 'filters' thay đổi
  useEffect(() => {
    fetchData();
  }, [filters]);

  // Hàm fetchData giữ nguyên
  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [consultationsRes, statsRes] = await Promise.all([
        consultationService.getMyConsultations(filters),
        consultationService.getPatientStats()
      ]);
      
      if (consultationsRes.data.success) {
        setConsultations(consultationsRes.data.data);
      }
      
      if (statsRes.data.success) {
        setStats(statsRes.data.data.stats);
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Hàm handleFilterChange giữ nguyên
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
      page: 1
    }));
  };

  // Hàm mới: Xử lý chuyển tab
  const handleTabChange = (tabType) => {
    setActiveTab(tabType);
    // Tái sử dụng logic filter để tải lại dữ liệu cho tab mới
    handleFilterChange('type', tabType);
  };
  
  // Hàm mới: Xử lý Hủy lịch hẹn
  const handleCancel = async (consultation) => {
    // Kiểm tra thời gian (ví dụ: chỉ cho hủy trước 6 tiếng)
    const hoursBefore = (new Date(consultation.appointment_time) - new Date()) / 3600000;
    if (hoursBefore < 6) {
      alert('Bạn không thể hủy lịch hẹn đã quá gần (ít hơn 6 tiếng).');
      return;
    }
    
    if (window.confirm('Bạn có chắc chắn muốn hủy buổi tư vấn này?')) {
      try {
        await consultationService.cancelConsultation(consultation.id, { 
          reason: 'Bệnh nhân hủy' 
        });
        alert('Hủy lịch hẹn thành công.');
        fetchData(); // Tải lại danh sách
      } catch (error) {
        console.error('Lỗi khi hủy lịch hẹn:', error);
        alert('Đã xảy ra lỗi khi hủy lịch hẹn.');
      }
    }
  };

  // Hàm mới: Xử lý Đánh giá (SỬA LẠI ĐỂ MỞ MODAL)
  const handleReview = (consultation) => {
    setSelectedConsultationForReview(consultation);
    setModalMode('submit'); // <-- Đặt chế độ 'submit'
    setShowReviewModal(true);
  };

  // HÀM MỚI: Xử lý khi Submit Modal
  const handleSubmitReview = async ({ rating, review }) => {
    if (!selectedConsultationForReview) return;

    try {
      await consultationService.rateConsultation(selectedConsultationForReview.id, { 
        rating: parseInt(rating), 
        review: review || '' 
      });
      alert('Cảm ơn bạn đã đánh giá!');
      setShowReviewModal(false); // Đóng modal
      setSelectedConsultationForReview(null); // Xóa ID
      fetchData(); // Tải lại danh sách để cập nhật nút
    } catch (error) {
      console.error('Lỗi khi gửi đánh giá:', error);
      alert('Đã xảy ra lỗi khi gửi đánh giá.');
    }
  };

  // Hàm render sao (từ file JS cũ)
  const renderRatingStars = (rating) => {
    return [1, 2, 3, 4, 5].map(star => (
      <FaStar
        key={star}
        className={star <= rating 
          ? 'consultation-history-page-star-filled' 
          : 'consultation-history-page-star-empty'
        }
      />
    ));
  };

  return (
    <div className="consultation-history-page-container">
      {/* Header */}
      <div className="consultation-history-page-header">
        <h1>
          <FaCalendarAlt /> Quản Lí Tư Vấn Trực Tuyến
        </h1>
        <button 
          className="consultation-history-page-book-new-button"
          onClick={() => navigate('/tu-van')}
        >
          + Đặt lịch mới
        </button>
      </div>

      {/* Stats Cards (Giữ nguyên) */}
      {stats && (
        <div className="consultation-history-page-stats-container">
          <div className="consultation-history-page-stat-card">
            <div className="consultation-history-page-stat-icon" style={{ background: '#3498db' }}>
              <FaCalendarAlt />
            </div>
            <div className="consultation-history-page-stat-info">
              <h3>{stats.total_consultations || 0}</h3>
              <p>Tổng số tư vấn</p>
            </div>
          </div>
          
          <div className="consultation-history-page-stat-card">
            <div className="consultation-history-page-stat-icon" style={{ background: '#2ecc71' }}>
              ✅
            </div>
            <div className="consultation-history-page-stat-info">
              <h3>{stats.completed || 0}</h3>
              <p>Đã hoàn thành</p>
            </div>
          </div>
          
          <div className="consultation-history-page-stat-card">
            <div className="consultation-history-page-stat-icon" style={{ background: '#e74c3c' }}>
              ❌
            </div>
            <div className="consultation-history-page-stat-info">
              <h3>{stats.cancelled || 0}</h3>
              <p>Đã hủy</p>
            </div>
          </div>
          
          <div className="consultation-history-page-stat-card">
            <div className="consultation-history-page-stat-icon" style={{ background: '#f39c12' }}>
              💰
            </div>
            <div className="consultation-history-page-stat-info">
              <h3>{consultationService.formatCurrency(stats.total_spent || 0)}</h3>
              <p>Tổng chi phí</p>
            </div>
          </div>
        </div>
      )}

      {/* === TABS === */}
      <div className="consultation-history-page-tabs-container">
        <button
          className={`consultation-history-page-tab-button ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => handleTabChange('chat')}
        >
          <FaCommentDots /> Quản lý Realtime (Chat)
        </button>
        <button
          className={`consultation-history-page-tab-button ${activeTab === 'video' ? 'active' : ''}`}
          onClick={() => handleTabChange('video')}
        >
          <FaVideo /> Quản lý Video Call
        </button>
      </div>

      {/* Filters (Bỏ filter loại) */}
      <div className="consultation-history-page-filters-container">
        <div className="consultation-history-page-filter-group">
          <label><FaFilter /> Trạng thái:</label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="consultation-history-page-filter-select"
          >
            <option value="all">Tất cả</option>
            <option value="pending">Chờ xác nhận</option>
            <option value="confirmed">Đã xác nhận</option>
            <option value="in_progress">Đang diễn ra</option>
            <option value="completed">Hoàn thành</option>
            <option value="cancelled">Đã hủy</option>
          </select>
        </div>

        <button 
          className="consultation-history-page-reset-filter-button"
          onClick={() => setFilters({
            ...filters,
            status: 'all',
            page: 1,
            // Giữ nguyên type của tab hiện tại
          })}
        >
          Xóa bộ lọc
        </button>
      </div>

      {/* Consultations List */}
      <div className="consultation-history-page-list-container">
        {loading ? (
          <div className="consultation-history-page-loading">Đang tải...</div>
        ) : consultations.length === 0 ? (
          <div className="consultation-history-page-no-data">
            <FaCalendarAlt />
            <p>Bạn chưa có buổi tư vấn nào trong mục này</p>
            <button 
              className="consultation-history-page-book-now-button"
              onClick={() => navigate('/tu-van')}
            >
              Đặt lịch ngay
            </button>
          </div>
        ) : (
          consultations.map(consultation => {
            // SỬA: Lấy status động ngay từ đầu
            const dynamicStatus = consultationService.formatStatus(consultation);

            return (
            <div key={consultation.id} className="consultation-history-page-card">
              <div className="consultation-history-page-card-header">
                <div className="consultation-history-page-card-meta">
                  <span className="consultation-history-page-code">
                    {consultation.consultation_code}
                  </span>
                  
                  {/* SỬA: Dùng dynamicStatus.color */}
                  <span 
                    className={`
                      consultation-history-page-status-badge 
                      consultation-history-page-status-badge-${dynamicStatus.color}
                    `}
                  >
                    {dynamicStatus.icon} {dynamicStatus.text}
                  </span>
                </div>
                {/* Ẩn type-badge vì đã lọc theo tab */}
              </div>

              {/* THÊM MỚI: Hiển thị lý do hủy nếu có */}
              {dynamicStatus.color === 'danger' && consultation.cancel_reason && (
                <div className="consultation-history-page-cancel-reason">
                  <strong>Lý do hủy:</strong> {consultation.cancel_reason}
                </div>
              )}

              <div className="consultation-history-page-card-body">
                <div className="consultation-history-page-doctor-info">
                  <img 
                    src={consultation.doctor?.avatar_url || '/default-avatar.png'}
                    alt={consultation.doctor?.full_name}
                    className="consultation-history-page-doctor-avatar"
                  />
                  <div>
                    <h4>{consultation.doctor?.full_name}</h4>
                    {consultation.doctor?.Doctor?.Specialty && (
                      <p className="consultation-history-page-doctor-specialty">
                        {consultation.doctor.Doctor.Specialty.name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="consultation-history-page-info-grid">
                  <div className="consultation-history-page-info-item">
                    <label>Thời gian:</label>
                    <p className="consultation-history-page-info-highlight">
                      {consultationService.formatDateTime(consultation.appointment_time)}
                    </p>
                  </div>

                  <div className="consultation-history-page-info-item">
                    <label>Triệu chứng:</label>
                    <p className="consultation-history-page-info-complaint">
                      {consultation.chief_complaint?.substring(0, 80)}...
                    </p>
                  </div>

                  {consultation.status === 'completed' && consultation.diagnosis && (
                    <div className="consultation-history-page-info-item consultation-history-page-info-diagnosis">
                      <label>Chẩn đoán:</label>
                      <p>{consultation.diagnosis?.substring(0, 100)}...</p>
                    </div>
                  )}

                  {consultation.status === 'completed' && consultation.rating && (
                    <div className="consultation-history-page-info-item">
                      <label>Đánh giá của tôi:</label>
                      <div className="consultation-history-page-rating-stars">
                        {renderRatingStars(consultation.rating)}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="consultation-history-page-card-footer">
                <div className="consultation-history-page-fee-info">
                  <span className="consultation-history-page-fee-label">Tổng phí:</span>
                  <span className="consultation-history-page-fee-amount">
                    {consultationService.formatCurrency(consultation.total_fee)}
                  </span>
                </div>

                {/* === CÁC NÚT HÀNH ĐỘNG MỚI === */}
                <div className="consultation-history-page-action-buttons">
                  <button 
                    className="consultation-history-page-action-button consultation-history-page-action-button-detail"
                    onClick={() => navigate(`/tu-van/${consultation.id}`)}
                  >
                    <FaEye /> Chi tiết
                  </button>

                  {/* THÊM LOGIC NÚT BẮT ĐẦU (START) */}
                  {consultation.status === 'confirmed' && 
                   consultationService.canStartConsultation(consultation.appointment_time) && (
                    <button 
                      className="consultation-history-page-action-button consultation-history-page-action-button-start"
                      onClick={async () => {
                        try {
                          await consultationService.startConsultation(consultation.id);
                          
                          if (consultation.consultation_type === 'video') {
                            navigate(`/tu-van/video/${consultation.id}`);
                          } else {
                            navigate(`/tu-van/${consultation.id}/chat`);
                          }
                        } catch (error) {
                          console.error('Lỗi khi bắt đầu tư vấn:', error);
                          alert('Không thể bắt đầu tư vấn. Vui lòng thử lại.');
                        }
                      }}
                    >
                      {consultation.consultation_type === 'video' ? <FaVideo /> : <FaCommentDots />}
                      Bắt đầu
                    </button>
                  )}

                  {/* ✅ THÊM MỚI: NÚT THAM GIA KHI ĐANG DIỄN RA */}
                  {consultation.status === 'in_progress' && (
                    <button 
                      className="consultation-history-page-action-button consultation-history-page-action-button-join"
                      onClick={() => {
                        // Không cần gọi startConsultation nữa, trực tiếp vào phòng
                        if (consultation.consultation_type === 'video') {
                          navigate(`/tu-van/video/${consultation.id}`);
                        } else {
                          navigate(`/tu-van/${consultation.id}/chat`);
                        }
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #2ecc71, #27ae60)',
                        animation: 'pulse 2s infinite'
                      }}
                    >
                      {consultation.consultation_type === 'video' ? '📹 Tham gia Video' : '💬 Vào phòng Chat'}
                    </button>
                  )}

                  {/* ===================== THÊM NÚT GỬI LẠI OTP ===================== */}
                  {/* ===================== THÊM NÚT GỬI LẠI OTP ===================== */}
                  {consultation.status === 'confirmed' && consultation.consultation_type === 'chat' && (
                    <button 
                      className="consultation-history-page-action-button consultation-history-page-action-button-resend-otp" // (Bạn có thể thêm style mới cho nút này)
                      onClick={async (e) => {
                          e.stopPropagation(); // Ngăn click vào thẻ cha
                          if (!window.confirm('Bạn có chắc muốn gửi lại OTP cho ca này? Email sẽ được gửi cho cả bạn và bác sĩ.')) return;

                          try {
                              await consultationService.resendChatOTP(consultation.id);
                              alert('Đã gửi lại mã OTP. Vui lòng kiểm tra email.');
                          } catch (error) {
                              console.error('Lỗi gửi lại OTP:', error);
                              alert('Lỗi: ' + (error.response?.data?.message || 'Không thể gửi lại OTP.'));
                          }
                      }}
                    >
                      <FaEnvelope /> Gửi lại OTP
                    </button>
                  )}
                  
                  {/* === THÊM NÚT NÀY === */}
                  {/* Nút Lịch sử chat: Chỉ hiển thị khi 'hoàn thành' */}
                  {consultation.status === 'completed' && (
                    <button 
                      className="consultation-history-page-action-button consultation-history-page-action-button-history"
                      // SỬA: Điều hướng dựa trên loại tư vấn
                      onClick={() => navigate(
                        consultation.consultation_type === 'video' 
                          ? `/tu-van-video/${consultation.id}` // <-- Route mới cho Video
                          : `/tu-van/${consultation.id}/chat` // Route cũ cho Chat
                      )}
                    >
                      {/* SỬA: Hiển thị icon động */}
                      {consultation.consultation_type === 'video' ? <FaVideo /> : <FaHistory />}
                      {consultation.consultation_type === 'video' ? 'Xem lại Video' : 'Lịch sử chat'}
                    </button>
                  )}
                  {/* === KẾT THÚC THÊM === */}

                  {/* Nút Xem Ghi Chú: Chỉ hiển thị khi 'hoàn thành' */}
                  {consultation.status === 'completed' && (
                    <button 
                      className="consultation-history-page-action-button consultation-history-page-action-button-notes" // (Bạn có thể thêm style mới cho nút này)
                      onClick={() => alert(
                        `Ghi chú của Bác sĩ:\n\nChẩn đoán:\n${consultation.diagnosis || 'Không có'}\n\nKế hoạch điều trị:\n${consultation.treatment_plan || 'Không có'}`
                      )}
                    >
                      <FaNotesMedical /> Xem Ghi Chú
                    </button>
                  )}

                  {/* Nút Hủy: Chỉ hiển thị khi 'chờ' hoặc 'đã xác nhận' */}
                  {['pending', 'confirmed'].includes(consultation.status) && (
                    <button 
                      className="consultation-history-page-action-button consultation-history-page-action-button-cancel"
                      onClick={() => handleCancel(consultation)}
                    >
                      <FaBan /> Hủy lịch
                    </button>
                  )}
                  
                  {/* === SỬA LẠI LOGIC NÚT ĐÁNH GIÁ === */}
                  
                  {/* === SỬA LẠI LOGIC NÚT ĐÁNH GIÁ === */}
                  
                  {/* Nút Đánh giá: Chỉ hiển thị khi 'hoàn thành' và 'chưa đánh giá' */}
                  {consultation.status === 'completed' && !consultation.rating && (
                    <button 
                      className="consultation-history-page-action-button consultation-history-page-action-button-review"
                      onClick={() => handleReview(consultation)} // Sửa: truyền cả object
                    >
                      <FaStarHalfAlt /> Đánh giá
                    </button>
                  )}
                  
                  {/* Nút Xem Đánh giá: Chỉ hiển thị khi 'hoàn thành' và 'ĐÃ đánh giá' */}
                  {consultation.status === 'completed' && consultation.rating && (
                    <button 
                      className="consultation-history-page-action-button consultation-history-page-action-button-view-review" // (Bạn có thể thêm style cho nút này)
                      onClick={() => {
                        setSelectedConsultationForReview(consultation);
                        setModalMode('view'); // <-- Đặt chế độ 'view'
                        setShowReviewModal(true);
                      }}
                    >
                      <FaStar /> Xem đánh giá
                    </button>
                  )}
                  {/* === KẾT THÚC SỬA LOGIC === */}
                </div>

              </div>

            </div>
            ) // Đóng return
          }) // Đóng .map()
        )}
      </div>

      {/* Pagination (Giữ nguyên) */}
      {consultations.length > 0 && (
        <div className="consultation-history-page-pagination">
          <button
            onClick={() => handleFilterChange('page', filters.page - 1)}
            disabled={filters.page === 1}
            className="consultation-history-page-pagination-button"
          >
            ← Trước
          </button>
          <span className="consultation-history-page-page-info">Trang {filters.page}</span>
          <button
            onClick={() => handleFilterChange('page', filters.page + 1)}
            disabled={consultations.length < filters.limit}
            className="consultation-history-page-pagination-button"
          >
            Sau →
          </button>
        </div>
      )}
{/* ========== THÊM/SỬA MODAL ĐÁNH GIÁ VÀO ĐÂY ========== */}
      <ReviewModal 
        show={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        onSubmit={handleSubmitReview}
        mode={modalMode} // <-- Truyền mode
        consultation={selectedConsultationForReview} // <-- Truyền dữ liệu
      />
    </div>
  );
};

export default ConsultationHistoryPage;