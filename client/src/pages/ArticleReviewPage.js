// client/src/pages/ArticleReviewPage.js - VERSION 3.0 - ✅ ĐÃ CẬP NHẬT
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  FaArrowLeft, FaUser, FaCalendar, FaTag, FaLink, FaNewspaper,
  FaCheck, FaBan, FaRedo, FaClock, FaCheckCircle,
  FaTimesCircle, FaExclamationTriangle, FaPaperPlane, FaCommentDots,
  FaInfoCircle, FaSpinner, FaEyeSlash, FaEye, FaTrash, FaTimes,
  FaPills, FaDisease, FaImage, FaStethoscope  // ✅ THÊM FaStethoscope
} from 'react-icons/fa';
import './ArticleReviewPage.css';

// ✅ HÀM LẤY ẢNH ĐẦU TIÊN TỪ CONTENT
const getFirstImage = (html) => {
  if (!html) return null;
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const img = doc.querySelector('img');
  return img ? img.src : null;
};

const ArticleReviewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const API_BASE_URL = 'http://localhost:3001';

  // ==================== STATES ====================
  const [user, setUser] = useState(null);
  const [article, setArticle] = useState(null);
  const [comments, setComments] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toasts, setToasts] = useState([]);
  
  // Form states
  const [submitting, setSubmitting] = useState(false);
  const [commentText, setCommentText] = useState('');
  
  // Popup states
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [showReasonDialog, setShowReasonDialog] = useState(false);
  const [reasonDialogConfig, setReasonDialogConfig] = useState(null);
  const [reasonText, setReasonText] = useState('');
  const [showHidePopup, setShowHidePopup] = useState(false);
  const [hideReason, setHideReason] = useState('');
  const [hidingArticle, setHidingArticle] = useState(false);

  // ==================== COMPUTED VALUES ====================
  const isAdmin = user?.role === 'admin';
  const isAuthor = user?.id === article?.author_id;
  
  // ✅ LẤY ẢNH BÌA TỪ CONTENT
  const thumbnailUrl = article ? getFirstImage(article.content) : null;

  // ==================== EFFECTS ====================
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || 'null');
    setUser(userData);
    
    if (userData) {
      fetchAllData();
    } else {
      setError('Vui lòng đăng nhập');
      setLoading(false);
    }
  }, [id]);

  // ==================== API CALLS ====================
  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');

      // Fetch article
      const articleRes = await axios.get(
        `${API_BASE_URL}/api/articles/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (articleRes.data.success) {
        setArticle(articleRes.data.article);
      }

      // Fetch comments
      try {
        const commentsRes = await axios.get(
          `${API_BASE_URL}/api/articles/${id}/comments`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (commentsRes.data.success) {
          setComments(commentsRes.data.comments || []);
        }
      } catch (err) {
        console.warn('Cannot load comments:', err);
      }

      // Fetch reports (admin only)
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      if (userData.role === 'admin') {
        try {
          const reportsRes = await axios.get(
            `${API_BASE_URL}/api/articles/${id}/reports`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (reportsRes.data.success) {
            setReports(reportsRes.data.reports || []);
          }
        } catch (err) {
          console.warn('Cannot load reports:', err);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Không thể tải dữ liệu bài viết');
      setLoading(false);
    }
  };

  // ==================== TOAST NOTIFICATIONS ====================
  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // ==================== HANDLERS - REVIEW ACTIONS ====================
  
  /**
   * Phê duyệt bài viết
   */
  const handleApprove = () => {
    setConfirmAction({
      title: 'Xác nhận phê duyệt',
      message: `Bạn chắc chắn muốn phê duyệt bài viết "${article.title}"?`,
      confirmText: 'Phê duyệt',
      confirmClass: 'btn-approve',
      onConfirm: async () => {
        try {
          setSubmitting(true);
          const token = localStorage.getItem('token');

          const response = await axios.post(
            `${API_BASE_URL}/api/articles/${id}/review`,
            { action: 'approve', reason: '' },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (response.data.success) {
            showToast('Đã phê duyệt bài viết thành công', 'success');
            setTimeout(() => navigate('/quan-ly-bai-viet'), 1500);
          }
        } catch (error) {
          console.error('Error approving article:', error);
          showToast('Lỗi: ' + (error.response?.data?.message || error.message), 'error');
        } finally {
          setSubmitting(false);
        }
      }
    });
    setShowConfirmDialog(true);
  };

  /**
   * Từ chối bài viết
   */
  const handleReject = () => {
    setReasonDialogConfig({
      title: 'Từ chối bài viết',
      message: 'Vui lòng nhập lý do từ chối:',
      placeholder: 'Nhập lý do từ chối bài viết...',
      confirmText: 'Từ chối',
      confirmClass: 'btn-reject',
      required: true,
      onConfirm: async (reason) => {
        try {
          setSubmitting(true);
          const token = localStorage.getItem('token');

          const response = await axios.post(
            `${API_BASE_URL}/api/articles/${id}/review`,
            { action: 'reject', reason: reason.trim() },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (response.data.success) {
            showToast('Đã từ chối bài viết', 'success');
            setTimeout(() => navigate('/quan-ly-bai-viet'), 1500);
          }
        } catch (error) {
          console.error('Error rejecting article:', error);
          showToast('Lỗi: ' + (error.response?.data?.message || error.message), 'error');
        } finally {
          setSubmitting(false);
        }
      }
    });
    setReasonText('');
    setShowReasonDialog(true);
  };

  /**
   * Yêu cầu viết lại
   */
  const handleRequestRewrite = () => {
    setReasonDialogConfig({
      title: 'Yêu cầu viết lại',
      message: 'Vui lòng nhập lý do yêu cầu viết lại:',
      placeholder: 'Nhập lý do yêu cầu viết lại bài viết...',
      confirmText: 'Yêu cầu viết lại',
      confirmClass: 'btn-request-rewrite',
      required: true,
      onConfirm: async (reason) => {
        try {
          setSubmitting(true);
          const token = localStorage.getItem('token');

          const response = await axios.post(
            `${API_BASE_URL}/api/articles/${id}/review`,
            { action: 'rewrite', reason: reason.trim() },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (response.data.success) {
            showToast('Đã gửi yêu cầu viết lại', 'success');
            setTimeout(() => navigate('/quan-ly-bai-viet'), 1500);
          }
        } catch (error) {
          console.error('Error requesting rewrite:', error);
          showToast('Lỗi: ' + (error.response?.data?.message || error.message), 'error');
        } finally {
          setSubmitting(false);
        }
      }
    });
    setReasonText('');
    setShowReasonDialog(true);
  };

  /**
   * Ẩn bài viết
   */
  const handleHideArticle = async (e) => {
    e.preventDefault();
    
    try {
      setHidingArticle(true);
      const token = localStorage.getItem('token');

      const response = await axios.post(
        `${API_BASE_URL}/api/articles/${id}/hide`,
        { reason: hideReason.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        showToast('Đã ẩn bài viết', 'success');
        setShowHidePopup(false);
        setHideReason('');
        setTimeout(() => navigate('/quan-ly-bai-viet'), 1500);
      }
    } catch (error) {
      console.error('Error hiding article:', error);
      showToast('Lỗi: ' + (error.response?.data?.message || error.message), 'error');
    } finally {
      setHidingArticle(false);
    }
  };

  /**
   * Hiện lại bài viết đã ẩn
   */
  const handleUnhideArticle = async () => {
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');

      const response = await axios.post(
        `${API_BASE_URL}/api/articles/${id}/unhide`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        showToast('Đã hiện lại bài viết', 'success');
        setTimeout(() => navigate('/quan-ly-bai-viet'), 1500);
      }
    } catch (error) {
      console.error('Error unhiding article:', error);
      showToast('Lỗi: ' + (error.response?.data?.message || error.message), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ==================== HANDLERS - COMMENTS ====================
  
  /**
   * Gửi comment
   */
  const handleSubmitComment = async (e) => {
    e.preventDefault();
    
    if (!commentText.trim()) {
      showToast('Vui lòng nhập nội dung comment', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');

      const response = await axios.post(
        `${API_BASE_URL}/api/articles/${id}/comments`,
        { comment_text: commentText.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setCommentText('');
        showToast('Đã gửi comment', 'success');
        // Reload comments
        await fetchAllData();
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
      showToast('Lỗi: ' + (error.response?.data?.message || error.message), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Xóa comment
   */
  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Bạn chắc chắn muốn xóa comment này?')) return;

    try {
      const token = localStorage.getItem('token');

      const response = await axios.delete(
        `${API_BASE_URL}/api/articles/${id}/comments/${commentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        showToast('Đã xóa comment', 'success');
        // Reload comments
        await fetchAllData();
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      showToast('Lỗi: ' + (error.response?.data?.message || error.message), 'error');
    }
  };

  // ==================== UTILITY FUNCTIONS ====================
  
  /**
   * Lấy label trạng thái
   */
  const getStatusLabel = (status) => {
    const labels = {
      draft: 'Bản nháp',
      pending: 'Chờ duyệt',
      approved: 'Đã duyệt',
      rejected: 'Bị từ chối',
      hidden: 'Đã ẩn',
      request_rewrite: 'Yêu cầu viết lại'
    };
    return labels[status] || status;
  };

  /**
   * Format thời gian
   */
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 7) {
      return date.toLocaleDateString('vi-VN');
    } else if (days > 0) {
      return `${days} ngày trước`;
    } else if (hours > 0) {
      return `${hours} giờ trước`;
    } else if (minutes > 0) {
      return `${minutes} phút trước`;
    } else {
      return 'Vừa xong';
    }
  };

  // ==================== RENDER ====================
  
  if (loading) {
    return (
      <div className="review-article-loading">
        <FaSpinner className="review-article-spinner" />
        <p>Đang tải...</p>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="review-article-error">
        <FaTimesCircle />
        <h2>{error || 'Không tìm thấy bài viết'}</h2>
        <button onClick={() => navigate('/quan-ly-bai-viet')} className="review-article-btn-back">
          <FaArrowLeft /> Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="review-article-page">
      <div className="review-article-container">
        {/* HEADER */}
        <div className="review-article-header">
          <button onClick={() => navigate('/quan-ly-bai-viet')} className="review-article-btn-back">
            <FaArrowLeft /> Quay lại
          </button>
          <h1>Chi tiết bài viết</h1>
          <div className={`review-article-status-badge status-${article.status}`}>
            {getStatusLabel(article.status)}
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="review-article-body">
          {/* LEFT CONTENT */}
          <div className="review-article-main-content">
            {/* ARTICLE CONTENT */}
            <div className="review-article-content-section">
              <h2 className="review-article-title">{article.title}</h2>
              
              {/* META INFO */}
              <div className="review-article-meta">
                <div className="review-article-meta-item">
                  <FaUser />
                  <span>{article.author?.full_name || 'Ẩn danh'}</span>
                </div>
                <div className="review-article-meta-item">
                  <FaCalendar />
                  <span>{new Date(article.created_at).toLocaleDateString('vi-VN')}</span>
                </div>
                <div className="review-article-meta-item">
                  <FaNewspaper />
                  <span>{article.category?.name || 'Không có danh mục'}</span>
                </div>
              </div>

              {/* CONTENT HTML */}
              <div 
                className="review-article-content-html"
                dangerouslySetInnerHTML={{ __html: article.content }}
              />

              {/* TAGS */}
              {article.tags_json && article.tags_json.length > 0 && (
                <div className="review-article-tags-section">
                  <div className="review-article-tags-label">
                    <FaTag />
                    <span>Thẻ:</span>
                  </div>
                  <div className="review-article-tags-list">
                    {article.tags_json.map((tag, index) => (
                      <span key={index} className="review-article-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* SOURCE */}
              {article.source && (
                <div className="review-article-source">
                  <div className="review-article-source-label">
                    <FaLink />
                    <span>Nguồn:</span>
                  </div>
                  <a href={article.source} target="_blank" rel="noopener noreferrer">
                    {article.source}
                  </a>
                </div>
              )}
            </div>

            {/* DISCUSSION SECTION */}
            <div className="review-article-discussion-section">
              <div className="review-article-discussion-header">
                <FaCommentDots />
                <h3>Trao đổi ({comments.length})</h3>
              </div>

              {/* COMMENT FORM */}
              <form onSubmit={handleSubmitComment} className="review-article-comment-form">
                <div className="review-article-comment-input-wrapper">
                  <div className="review-article-comment-avatar">
                    {user?.avatar_url ? (
                      <img src={user.avatar_url} alt={user.full_name} />
                    ) : (
                      <FaUser />
                    )}
                  </div>
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Nhập nội dung trao đổi..."
                    className="review-article-comment-textarea"
                    rows={3}
                    disabled={submitting}
                  />
                </div>
                <div className="review-article-comment-form-footer">
                  <span className="review-article-char-count">{commentText.length} ký tự</span>
                  <button
                    type="submit"
                    className="review-article-btn-submit-comment"
                    disabled={submitting || !commentText.trim()}
                  >
                    {submitting ? (
                      <>
                        <FaSpinner className="review-article-spinner-icon" /> Đang gửi...
                      </>
                    ) : (
                      <>
                        <FaPaperPlane /> Gửi
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* COMMENTS LIST */}
              <div className="review-article-comments-list">
                {comments.length === 0 ? (
                  <div className="review-article-comments-empty">
                    <p>Chưa có comment nào. Hãy là người đầu tiên trao đổi!</p>
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="review-article-comment-item">
                      <div className="review-article-comment-avatar">
                        {comment.user?.avatar_url ? (
                          <img src={comment.user.avatar_url} alt={comment.user.full_name} />
                        ) : (
                          <FaUser />
                        )}
                      </div>
                      <div className="review-article-comment-content">
                        <div className="review-article-comment-header">
                          <span className="review-article-comment-author">
                            {comment.user?.full_name || 'Người dùng'}
                          </span>
                          <span className="review-article-comment-time">
                            {formatTime(comment.created_at)}
                          </span>
                        </div>
                        <p className="review-article-comment-text">{comment.comment_text}</p>
                        {(isAdmin || comment.user_id === user?.id) && (
                          <div className="review-article-comment-actions">
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="review-article-btn-delete-comment"
                            >
                              <FaTrash /> Xóa
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* ✅ RIGHT SIDEBAR - ĐÃ CẬP NHẬT */}
          <div className="review-article-right-sidebar">
            
            {/* ✅ THÔNG TIN THUỐC - NẾU CÓ */}
            {article.entity_type === 'medicine' && article.medicine && (
              <div className="review-article-info-card">
                <h3 className="review-article-info-title">
                  <FaPills /> Thông tin thuốc
                </h3>
                <div className="review-article-info-content">
                  {article.medicine.name && (
                    <div className="review-article-info-item">
                      <strong>Tên thuốc:</strong>
                      <span>{article.medicine.name}</span>
                    </div>
                  )}
                  {article.medicine.composition && (
                    <div className="review-article-info-item">
                      <strong>Thành phần:</strong>
                      <span>{article.medicine.composition}</span>
                    </div>
                  )}
                  {article.medicine.uses && (
                    <div className="review-article-info-item">
                      <strong>Công dụng:</strong>
                      <span>{article.medicine.uses}</span>
                    </div>
                  )}
                  {article.medicine.side_effects && (
                    <div className="review-article-info-item">
                      <strong>Tác dụng phụ:</strong>
                      <span>{article.medicine.side_effects}</span>
                    </div>
                  )}
                  {article.medicine.manufacturer && (
                    <div className="review-article-info-item">
                      <strong>Nhà sản xuất:</strong>
                      <span>{article.medicine.manufacturer}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ✅ THÔNG TIN BỆNH LÝ - NẾU CÓ */}
            {article.entity_type === 'disease' && article.disease && (
              <div className="review-article-info-card">
                <h3 className="review-article-info-title">
                  <FaStethoscope /> Thông tin bệnh lý
                </h3>
                <div className="review-article-info-content">
                  {article.disease.name && (
                    <div className="review-article-info-item">
                      <strong>Tên bệnh:</strong>
                      <span>{article.disease.name}</span>
                    </div>
                  )}
                  {article.disease.symptoms && (
                    <div className="review-article-info-item">
                      <strong>Triệu chứng:</strong>
                      <span>{article.disease.symptoms}</span>
                    </div>
                  )}
                  {article.disease.treatments && (
                    <div className="review-article-info-item">
                      <strong>Phương pháp điều trị:</strong>
                      <span>{article.disease.treatments}</span>
                    </div>
                  )}
                  {article.disease.description && (
                    <div className="review-article-info-item">
                      <strong>Mô tả:</strong>
                      <span>{article.disease.description}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ✅ ẢNH BÌA - LUÔN HIỂN THỊ */}
            <div className="review-article-info-card">
              <h3 className="review-article-info-title">
                <FaImage /> Ảnh bìa
              </h3>
              <div className="review-article-thumbnail-preview">
                {thumbnailUrl ? (
                  <img src={thumbnailUrl} alt="Ảnh bìa bài viết" />
                ) : (
                  <div className="review-article-no-thumbnail">
                    <FaImage />
                    <span>Chưa có ảnh bìa</span>
                  </div>
                )}
              </div>
            </div>

            {/* THỐNG KÊ */}
            <div className="review-article-stats-card">
              <h3 className="review-article-card-title">
                <FaInfoCircle /> Thống kê
              </h3>
              <div className="review-article-stats-grid">
                <div className="review-article-stat-item">
                  <span className="review-article-stat-label">Lượt xem</span>
                  <span className="review-article-stat-value">{article.views || 0}</span>
                </div>
                <div className="review-article-stat-item">
                  <span className="review-article-stat-label">Tác giả</span>
                  <span className="review-article-stat-value">{article.author?.full_name}</span>
                </div>
                <div className="review-article-stat-item">
                  <span className="review-article-stat-label">Ngày tạo</span>
                  <span className="review-article-stat-value">
                    {new Date(article.created_at).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              </div>
            </div>

            {/* REPORTS SECTION */}
            {isAdmin && reports.length > 0 && (
              <div className="review-article-reports-section">
                <div className="review-article-reports-header">
                  <FaExclamationTriangle />
                  <h3>Báo cáo vi phạm ({reports.length})</h3>
                </div>
                <div className="review-article-reports-list">
                  {reports.map((report, index) => (
                    <div key={index} className="review-article-report-item">
                      <div className="review-article-report-user">
                        <FaUser />
                        <span>{report.reporter?.full_name || 'Ẩn danh'}</span>
                      </div>
                      <p className="review-article-report-reason">{report.reason}</p>
                      <span className="review-article-report-time">
                        {formatTime(report.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ACTION BUTTONS - CHỈ ADMIN */}
            {isAdmin && (
              <div className="review-article-actions-section">
                <div className="review-article-actions-header">
                  <h3>Hành động</h3>
                </div>

                <div className="review-article-actions-buttons">
                  {/* PENDING STATUS */}
                  {article.status === 'pending' && (
                    <>
                      <button
                        onClick={handleApprove}
                        className="review-article-action-btn btn-approve"
                        disabled={submitting}
                      >
                        <FaCheck /> Phê duyệt
                      </button>
                      <button
                        onClick={handleReject}
                        className="review-article-action-btn btn-reject"
                        disabled={submitting}
                      >
                        <FaBan /> Từ chối
                      </button>
                      <button
                        onClick={handleRequestRewrite}
                        className="review-article-action-btn btn-request-rewrite"
                        disabled={submitting}
                      >
                        <FaRedo /> Yêu cầu viết lại
                      </button>
                    </>
                  )}

                  {/* HIDE/UNHIDE BUTTON */}
                  {article.status === 'hidden' ? (
                    <button
                      onClick={handleUnhideArticle}
                      className="review-article-action-btn btn-unhide"
                      disabled={submitting}
                    >
                      <FaEye /> Hiện lại
                    </button>
                  ) : (
                    article.status === 'approved' && (
                      <button
                        onClick={() => setShowHidePopup(true)}
                        className="review-article-action-btn btn-hide"
                        disabled={submitting}
                      >
                        <FaEyeSlash /> Ẩn bài viết
                      </button>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ==================== POPUPS ==================== */}

      {/* CONFIRM DIALOG */}
      {showConfirmDialog && confirmAction && (
        <div className="review-article-modal-overlay" onClick={() => setShowConfirmDialog(false)}>
          <div className="review-article-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="review-article-dialog-header">
              <h3>{confirmAction.title}</h3>
              <button onClick={() => setShowConfirmDialog(false)} className="review-article-btn-close">
                <FaTimes />
              </button>
            </div>
            <div className="review-article-dialog-body">
              <p>{confirmAction.message}</p>
            </div>
            <div className="review-article-dialog-footer">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="review-article-dialog-btn btn-cancel"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  setShowConfirmDialog(false);
                  confirmAction.onConfirm();
                }}
                className={`review-article-dialog-btn ${confirmAction.confirmClass}`}
              >
                {confirmAction.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REASON DIALOG */}
      {showReasonDialog && reasonDialogConfig && (
        <div className="review-article-modal-overlay" onClick={() => setShowReasonDialog(false)}>
          <div className="review-article-reason-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="review-article-dialog-header">
              <h3>{reasonDialogConfig.title}</h3>
              <button onClick={() => setShowReasonDialog(false)} className="review-article-btn-close">
                <FaTimes />
              </button>
            </div>
            <div className="review-article-dialog-body">
              <p>{reasonDialogConfig.message}</p>
              <textarea
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                placeholder={reasonDialogConfig.placeholder}
                className="review-article-reason-textarea"
                rows={4}
                autoFocus
              />
            </div>
            <div className="review-article-dialog-footer">
              <button
                onClick={() => setShowReasonDialog(false)}
                className="review-article-dialog-btn btn-cancel"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  if (reasonDialogConfig.required && !reasonText.trim()) {
                    showToast('Vui lòng nhập lý do', 'warning');
                    return;
                  }
                  setShowReasonDialog(false);
                  reasonDialogConfig.onConfirm(reasonText);
                }}
                className={`review-article-dialog-btn ${reasonDialogConfig.confirmClass}`}
                disabled={reasonDialogConfig.required && !reasonText.trim()}
              >
                {reasonDialogConfig.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HIDE POPUP */}
      {showHidePopup && (
        <div className="review-article-modal-overlay" onClick={() => setShowHidePopup(false)}>
          <div className="review-article-hide-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="review-article-dialog-header">
              <h3>Ẩn bài viết</h3>
              <button onClick={() => setShowHidePopup(false)} className="review-article-btn-close">
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleHideArticle}>
              <div className="review-article-dialog-body">
                <p>Vui lòng nhập lý do ẩn bài viết:</p>
                <textarea
                  value={hideReason}
                  onChange={(e) => setHideReason(e.target.value)}
                  placeholder="Nhập lý do ẩn bài viết..."
                  className="review-article-reason-textarea"
                  rows={4}
                  required
                  autoFocus
                />
              </div>
              <div className="review-article-dialog-footer">
                <button
                  type="button"
                  onClick={() => setShowHidePopup(false)}
                  className="review-article-dialog-btn btn-cancel"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="review-article-dialog-btn btn-hide"
                  disabled={hidingArticle || !hideReason.trim()}
                >
                  {hidingArticle ? (
                    <>
                      <FaSpinner className="review-article-spinner-icon" /> Đang xử lý...
                    </>
                  ) : (
                    <>
                      <FaEyeSlash /> Ẩn bài viết
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATIONS */}
      <div className="review-article-toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`review-article-toast toast-${toast.type}`}>
            <div className="review-article-toast-icon">
              {toast.type === 'success' && <FaCheckCircle />}
              {toast.type === 'error' && <FaTimesCircle />}
              {toast.type === 'warning' && <FaExclamationTriangle />}
              {toast.type === 'info' && <FaInfoCircle />}
            </div>
            <span className="review-article-toast-message">{toast.message}</span>
            <button
              className="review-article-toast-close"
              onClick={() => removeToast(toast.id)}
            >
              <FaTimes />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ArticleReviewPage;