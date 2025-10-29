// client/src/pages/ArticleReviewPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  FaArrowLeft, FaUser, FaCalendar, FaTag, FaLink, FaNewspaper,
  FaCheck, FaBan, FaRedo, FaHistory, FaClock, FaCheckCircle,
  FaTimesCircle, FaExclamationTriangle, FaPaperPlane, FaCommentDots,
  FaInfoCircle, FaSpinner, FaEyeSlash, FaEye, FaFileAlt, FaTrash,
  FaTimes
} from 'react-icons/fa';
import './ArticleReviewPage.css';

const ArticleReviewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const API_BASE_URL = 'http://localhost:3001';

  // States
  const [user, setUser] = useState(null);
  const [article, setArticle] = useState(null);
  const [reviewHistory, setReviewHistory] = useState([]);
  const [comments, setComments] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Form states
  const [submitting, setSubmitting] = useState(false);
  const [reviewAction, setReviewAction] = useState('approve');
  const [reviewReason, setReviewReason] = useState('');
  const [commentText, setCommentText] = useState('');
  
  // Popup states
  const [showHidePopup, setShowHidePopup] = useState(false);
  const [hideReason, setHideReason] = useState('');
  const [hidingArticle, setHidingArticle] = useState(false);

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

      // Fetch review history
      try {
        const historyRes = await axios.get(
          `${API_BASE_URL}/api/articles/${id}/review-history`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (historyRes.data.success) {
          setReviewHistory(historyRes.data.history || []);
        }
      } catch (err) {
        console.warn('Cannot load review history:', err);
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

    } catch (error) {
      console.error('Error fetching data:', error);
      if (error.response?.status === 404) {
        setError('Không tìm thấy bài viết');
      } else if (error.response?.status === 403) {
        setError('Bạn không có quyền xem bài viết này');
      } else {
        setError(error.response?.data?.message || 'Lỗi tải dữ liệu');
      }
    } finally {
      setLoading(false);
    }
  };

  // Review submission
  const handleSubmitReview = async () => {
    if (reviewAction !== 'approve' && !reviewReason.trim()) {
      alert('Vui lòng nhập lý do');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');

      const response = await axios.post(
        `${API_BASE_URL}/api/articles/${id}/review`,
        { action: reviewAction, reason: reviewReason.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert('Đã xử lý phê duyệt bài viết');
        navigate('/quan-ly-bai-viet');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Lỗi: ' + (error.response?.data?.message || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  // Edit request response
  const handleRespondEditRequest = async (allow) => {
    const reason = allow 
      ? prompt('Nhập lý do cho phép chỉnh sửa (tùy chọn):')
      : prompt('Nhập lý do từ chối yêu cầu:');
    
    if (!allow && !reason) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/api/articles/${id}/respond-edit`,
        { allow, reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert(allow ? 'Đã cho phép chỉnh sửa' : 'Đã từ chối yêu cầu');
        fetchAllData();
      }
    } catch (error) {
      console.error('Error responding to edit request:', error);
      alert('Lỗi: ' + (error.response?.data?.message || error.message));
    }
  };

  // Comment submission
  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) {
      alert('Vui lòng nhập nội dung comment');
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
        fetchAllData();
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
      alert('Lỗi: ' + (error.response?.data?.message || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Bạn chắc chắn muốn xóa comment này?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(
        `${API_BASE_URL}/api/articles/${id}/comments/${commentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        fetchAllData();
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Lỗi: ' + (error.response?.data?.message || error.message));
    }
  };

  // Hide article
  const handleHideArticle = async (e) => {
    e.preventDefault();
    if (!hideReason.trim()) {
      alert('Vui lòng nhập lý do ẩn bài viết');
      return;
    }

    try {
      setHidingArticle(true);
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/api/articles/${id}/hide`,
        { reason: hideReason.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert('Đã ẩn bài viết thành công');
        setShowHidePopup(false);
        fetchAllData();
      }
    } catch (error) {
      console.error('Error hiding article:', error);
      alert('Lỗi: ' + (error.response?.data?.message || error.message));
    } finally {
      setHidingArticle(false);
    }
  };

  // Unhide article
  const handleUnhideArticle = async () => {
    if (!window.confirm('Bạn chắc chắn muốn hiện lại bài viết này?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/api/articles/${id}/unhide`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert('Đã hiện lại bài viết');
        fetchAllData();
      }
    } catch (error) {
      console.error('Error unhiding article:', error);
      alert('Lỗi: ' + (error.response?.data?.message || error.message));
    }
  };

  // Helper functions
  const getStatusBadge = (status) => {
    const badges = {
      draft: { icon: FaNewspaper, label: 'Nháp', class: 'draft' },
      pending: { icon: FaClock, label: 'Chờ duyệt', class: 'pending' },
      approved: { icon: FaCheckCircle, label: 'Đã duyệt', class: 'approved' },
      rejected: { icon: FaTimesCircle, label: 'Từ chối', class: 'rejected' },
      request_edit: { icon: FaRedo, label: 'Yêu cầu sửa', class: 'request_edit' },
      request_rewrite: { icon: FaExclamationTriangle, label: 'Viết lại', class: 'request_rewrite' },
      hidden: { icon: FaEyeSlash, label: 'Ẩn', class: 'hidden' }
    };
    return badges[status] || { icon: FaInfoCircle, label: status, class: 'default' };
  };

  const getActionLabel = (action) => {
    const labels = {
      submit: 'Gửi bài',
      approve: 'Phê duyệt',
      reject: 'Từ chối',
      request_rewrite: 'Yêu cầu viết lại',
      resubmit: 'Gửi lại',
      request_edit: 'Yêu cầu chỉnh sửa',
      allow_edit: 'Cho phép sửa',
      deny_edit: 'Từ chối sửa',
      hide: 'Ẩn bài viết',
      unhide: 'Hiện bài viết'
    };
    return labels[action] || action;
  };

  const getActionIcon = (action) => {
    const icons = {
      submit: FaPaperPlane,
      approve: FaCheck,
      reject: FaBan,
      request_rewrite: FaRedo,
      resubmit: FaPaperPlane,
      request_edit: FaCommentDots,
      allow_edit: FaCheck,
      deny_edit: FaBan,
      hide: FaEyeSlash,
      unhide: FaEye
    };
    return icons[action] || FaInfoCircle;
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (hours < 1) return 'Vừa xong';
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleBadge = (role) => {
    const badges = {
      admin: { label: 'Admin', class: 'role-admin' },
      staff: { label: 'Nhân viên', class: 'role-staff' },
      doctor: { label: 'Bác sĩ', class: 'role-doctor' }
    };
    return badges[role] || { label: role, class: 'role-default' };
  };

  const quickHideReasons = [
    'Bài viết có nội dung sai sự thật',
    'Thiếu nguồn tham khảo đáng tin cậy',
    'Ngôn từ không phù hợp',
    'Vi phạm quy định cộng đồng',
    'Nhiều báo cáo từ người dùng'
  ];

  const StatusBadge = ({ status }) => {
    const { icon: Icon, label, class: className } = getStatusBadge(status);
    return (
      <span className={`status-badge ${className}`}>
        <Icon /> {label}
      </span>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="review-page-loading">
        <FaSpinner className="spinner" />
        <p>Đang tải dữ liệu...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="review-page-error">
        <FaTimesCircle />
        <h2>{error}</h2>
        <button onClick={() => navigate('/quan-ly-bai-viet')} className="btn-back">
          <FaArrowLeft /> Quay lại
        </button>
      </div>
    );
  }

  // Not found
  if (!article) {
    return (
      <div className="review-page-error">
        <FaTimesCircle />
        <h2>Không tìm thấy bài viết</h2>
        <button onClick={() => navigate('/quan-ly-bai-viet')} className="btn-back">
          <FaArrowLeft /> Quay lại
        </button>
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';
  const isAuthor = article.author_id === user?.id;

  return (
    <div className="article-review-page">
      {/* Header */}
      <div className="review-header">
        <button onClick={() => navigate('/quan-ly-bai-viet')} className="btn-back">
          <FaArrowLeft /> Quay lại
        </button>
        <div className="header-info">
          <h1 className="header-title">Phê Duyệt Bài Viết</h1>
          <StatusBadge status={article.status} />
        </div>
      </div>

      {/* Main Content - 2 Columns */}
      <div className="review-container">
        {/* LEFT: Article Preview */}
        <div className="review-left">
          <div className="article-preview">
            {/* Article Header */}
            <div className="preview-header">
              <h2 className="article-title">{article.title}</h2>
              
              <div className="article-meta">
                <div className="meta-item">
                  <FaUser />
                  <span>{article.author?.full_name || 'Ẩn danh'}</span>
                </div>
                <div className="meta-item">
                  <FaCalendar />
                  <span>{formatTime(article.created_at)}</span>
                </div>
                {article.category && (
                  <div className="meta-item">
                    <FaNewspaper />
                    <span>{article.category.name}</span>
                  </div>
                )}
              </div>

              {article.tags_json && article.tags_json.length > 0 && (
                <div className="article-tags">
                  <FaTag />
                  <div className="tags-list">
                    {article.tags_json.map((tag, index) => (
                      <span key={index} className="tag-item">{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {article.source && (
                <div className="article-source">
                  <FaLink />
                  <span>Nguồn:</span>
                  <a href={article.source} target="_blank" rel="noopener noreferrer">
                    {article.source}
                  </a>
                </div>
              )}
            </div>

            {/* Article Content */}
            <div className="preview-content">
              <div 
                className="content-html"
                dangerouslySetInnerHTML={{ __html: article.content }}
              />
            </div>

            {/* Debug log */}
            {console.log('Debug ArticleReviewPage:', {
              entity_type: article.entity_type,
              has_medicine: !!article.medicine,
              has_disease: !!article.disease,
              medicine_data: article.medicine,
              disease_data: article.disease
            })}

            {/* Medical Info Box - Kiểm tra theo entity_type */}
            {(article.entity_type === 'medicine' || article.entity_type === 'disease') && (article.medicine || article.disease) && (
              <div className="medical-info-box">
                <h3>Thông tin bổ sung</h3>
                
                {article.entity_type === 'medicine' && article.medicine && (
                  <>
                    <div className="info-item">
                      <strong>Tên thuốc:</strong>
                      <p>{article.medicine.name || article.title}</p>
                    </div>
                    
                    {article.medicine.composition && (
                      <div className="info-item">
                        <strong>Thành phần:</strong>
                        <p>{article.medicine.composition}</p>
                      </div>
                    )}
                    
                    {article.medicine.uses && (
                      <div className="info-item">
                        <strong>Công dụng:</strong>
                        <p>{article.medicine.uses}</p>
                      </div>
                    )}
                    
                    {article.medicine.side_effects && (
                      <div className="info-item">
                        <strong>Tác dụng phụ:</strong>
                        <p>{article.medicine.side_effects}</p>
                      </div>
                    )}
                    
                    {article.medicine.manufacturer && (
                      <div className="info-item">
                        <strong>Nhà sản xuất:</strong>
                        <p>{article.medicine.manufacturer}</p>
                      </div>
                    )}
                  </>
                )}

                {article.entity_type === 'disease' && article.disease && (
                  <>
                    <div className="info-item">
                      <strong>Tên bệnh:</strong>
                      <p>{article.disease.name || article.title}</p>
                    </div>
                    
                    {article.disease.symptoms && (
                      <div className="info-item">
                        <strong>Triệu chứng:</strong>
                        <p>{article.disease.symptoms}</p>
                      </div>
                    )}
                    
                    {article.disease.treatments && (
                      <div className="info-item">
                        <strong>Điều trị:</strong>
                        <p>{article.disease.treatments}</p>
                      </div>
                    )}
                    
                    {article.disease.description && (
                      <div className="info-item">
                        <strong>Mô tả:</strong>
                        <p>{article.disease.description}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Timeline + Forms + Comments */}
        <div className="review-right">
          {/* Review History Timeline */}
          <div className="review-section">
            <div className="section-header">
              <FaHistory />
              <h3>Lịch Sử Phê Duyệt ({reviewHistory.length})</h3>
            </div>

            <div className="timeline">
              {reviewHistory.length === 0 ? (
                <div className="timeline-empty">
                  <FaInfoCircle />
                  <p>Chưa có lịch sử phê duyệt</p>
                </div>
              ) : (
                reviewHistory.map((item, index) => {
                  const ActionIcon = getActionIcon(item.action);
                  return (
                    <div key={index} className="timeline-item">
                      <div className={`timeline-icon ${item.action}`}>
                        <ActionIcon />
                      </div>
                      <div className="timeline-content">
                        <div className="timeline-header">
                          <span className="action-label">
                            {getActionLabel(item.action)}
                          </span>
                          <span className="timeline-date">
                            {formatTime(item.created_at)}
                          </span>
                        </div>
                        <div className="timeline-user">
                          <FaUser />
                          <span>{item.reviewer?.full_name || item.action_by?.full_name || 'N/A'}</span>
                          <span className="user-role">({item.reviewer?.role || item.action_by?.role || 'N/A'})</span>
                        </div>
                        {item.reason && (
                          <div className="timeline-reason">
                            <FaCommentDots />
                            <p>{item.reason}</p>
                          </div>
                        )}
                        {item.previous_status && item.new_status && (
                          <div className="timeline-status-change">
                            <span className={`status-mini ${item.previous_status}`}>
                              {item.previous_status}
                            </span>
                            <span className="arrow">→</span>
                            <span className={`status-mini ${item.new_status}`}>
                              {item.new_status}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Review Form - Admin only & Pending */}
          {isAdmin && article.status === 'pending' && (
            <div className="review-section">
              <div className="section-header">
                <FaCheck />
                <h3>Phê Duyệt Bài Viết</h3>
              </div>

              <div className="form-content">
                <div className="form-group">
                  <label>Hành động *</label>
                  <select 
                    value={reviewAction} 
                    onChange={(e) => setReviewAction(e.target.value)}
                    className="form-select"
                  >
                    <option value="approve">✓ Phê duyệt</option>
                    <option value="reject">✗ Từ chối</option>
                    <option value="rewrite">↻ Yêu cầu viết lại</option>
                  </select>
                </div>

                {reviewAction !== 'approve' && (
                  <div className="form-group">
                    <label>Lý do *</label>
                    <textarea
                      value={reviewReason}
                      onChange={(e) => setReviewReason(e.target.value)}
                      placeholder="Nhập lý do (tối đa 500 ký tự)..."
                      maxLength={500}
                      rows={4}
                      className="form-textarea"
                    />
                    <small className="char-count">
                      {reviewReason.length}/500 ký tự
                    </small>
                  </div>
                )}

                <button
                  onClick={handleSubmitReview}
                  disabled={submitting}
                  className="btn-submit"
                >
                  {submitting ? (
                    <>
                      <FaSpinner className="spinner-icon" /> Đang xử lý...
                    </>
                  ) : (
                    <>
                      <FaPaperPlane /> Xác nhận
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Edit Request Form - Admin only */}
          {isAdmin && article.status === 'request_edit' && (
            <div className="review-section">
              <div className="section-header">
                <FaCommentDots />
                <h3>Xử Lý Yêu Cầu Chỉnh Sửa</h3>
              </div>

              <div className="form-content">
                {article.edit_request_reason && (
                  <div className="request-reason-box">
                    <strong>Lý do từ tác giả:</strong>
                    <p>{article.edit_request_reason}</p>
                  </div>
                )}

                <div className="form-actions-row">
                  <button
                    onClick={() => handleRespondEditRequest(true)}
                    className="btn-submit btn-allow"
                  >
                    <FaCheck /> Cho phép
                  </button>
                  <button
                    onClick={() => handleRespondEditRequest(false)}
                    className="btn-submit btn-deny"
                  >
                    <FaBan /> Từ chối
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Hide/Unhide Article - Admin only */}
          {isAdmin && (
            <div className="review-section">
              <div className="section-header">
                <FaEyeSlash />
                <h3>Quản Lý Hiển Thị</h3>
              </div>

              <div className="form-content">
                {article.status === 'hidden' ? (
                  <button
                    onClick={handleUnhideArticle}
                    className="btn-submit btn-unhide"
                  >
                    <FaEye /> Hiện lại bài viết
                  </button>
                ) : (
                  <button
                    onClick={() => setShowHidePopup(true)}
                    className="btn-submit btn-hide"
                  >
                    <FaEyeSlash /> Ẩn bài viết
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Reports List - Admin only */}
          {isAdmin && reports.length > 0 && (
            <div className="review-section">
              <div className="section-header">
                <FaExclamationTriangle />
                <h3>Báo Cáo Vi Phạm ({reports.length})</h3>
              </div>

              <div className="reports-list">
                {reports.map((report) => (
                  <div key={report.id} className="report-item">
                    <div className="report-user">
                      <div className="report-avatar">
                        {report.user?.avatar_url ? (
                          <img src={report.user.avatar_url} alt={report.user.full_name} />
                        ) : (
                          <FaUser />
                        )}
                      </div>
                      <div className="report-user-info">
                        <span className="report-user-name">
                          {report.user?.full_name || 'Ẩn danh'}
                        </span>
                        <span className="report-time">
                          <FaClock /> {formatTime(report.created_at)}
                        </span>
                      </div>
                    </div>
                    <div className="report-content">
                      <p className="report-reason">{report.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comment Section */}
          <div className="review-section">
            <div className="section-header">
              <FaCommentDots />
              <h3>Trao Đổi ({comments.length})</h3>
            </div>

            {/* Comment Form */}
            <form onSubmit={handleSubmitComment} className="comment-form">
              <div className="comment-form-body">
                <div className="comment-avatar">
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
                  className="comment-textarea"
                  rows={3}
                  disabled={submitting}
                />
              </div>
              <div className="comment-form-footer">
                <span className="char-count">{commentText.length} ký tự</span>
                <button
                  type="submit"
                  className="btn-submit btn-sm"
                  disabled={submitting || !commentText.trim()}
                >
                  {submitting ? (
                    <>
                      <FaSpinner className="spinner-icon" /> Đang gửi...
                    </>
                  ) : (
                    <>
                      <FaPaperPlane /> Gửi
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Comments List */}
            <div className="comments-list">
              {comments.length === 0 ? (
                <div className="comments-empty">
                  <p>Chưa có comment nào. Hãy là người đầu tiên trao đổi!</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="comment-item">
                    <div className="comment-avatar">
                      {comment.user?.avatar_url ? (
                        <img src={comment.user.avatar_url} alt={comment.user.full_name} />
                      ) : (
                        <FaUser />
                      )}
                    </div>
                    <div className="comment-content">
                      <div className="comment-header">
                        <div className="comment-user-info">
                          <span className="comment-user-name">
                            {comment.user?.full_name || 'Ẩn danh'}
                          </span>{comment.user?.role && (
                            <span className={`comment-role-badge ${getRoleBadge(comment.user.role).class}`}>
                              {getRoleBadge(comment.user.role).label}
                            </span>
                          )}
                        </div>
                        <span className="comment-time">{formatTime(comment.created_at)}</span>
                      </div>
                      <div className="comment-body">
                        <p>{comment.comment_text}</p>
                      </div>
                      {(user?.role === 'admin' || comment.user_id === user?.id) && (
                        <div className="comment-actions">
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="btn-delete-comment"
                            title="Xóa comment"
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

          {/* Info Box */}
          {article.status !== 'pending' && article.status !== 'request_edit' && (
            <div className="review-info-box">
              <FaInfoCircle />
              <p>
                Bài viết đã được xử lý. Trạng thái hiện tại: <StatusBadge status={article.status} />
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Hide Article Popup */}
      {showHidePopup && (
        <div className="popup-overlay" onClick={() => setShowHidePopup(false)}>
          <div className="popup" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <div className="popup-header-content">
                <FaEyeSlash className="popup-icon" />
                <h3>Ẩn bài viết</h3>
              </div>
              <button onClick={() => setShowHidePopup(false)} className="btn-close-popup">
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleHideArticle} className="popup-body">
              <div className="popup-warning">
                <FaExclamationTriangle />
                <div>
                  <p className="warning-title">Lưu ý quan trọng</p>
                  <p className="warning-text">
                    Bài viết sẽ bị ẩn khỏi danh sách công khai. Chỉ admin và tác giả có thể xem.
                  </p>
                </div>
              </div>

              <div className="popup-info">
                <label className="popup-label">Bài viết:</label>
                <p className="article-title-display">{article.title}</p>
              </div>

              <div className="popup-quick-reasons">
                <label className="popup-label">Lý do nhanh:</label>
                <div className="quick-reason-buttons">
                  {quickHideReasons.map((r, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setHideReason(r)}
                      className={`btn-quick-reason ${hideReason === r ? 'active' : ''}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="popup-form-group">
                <label className="popup-label">
                  Lý do chi tiết <span className="required">*</span>
                </label>
                <textarea
                  value={hideReason}
                  onChange={(e) => setHideReason(e.target.value)}
                  placeholder="Nhập lý do ẩn bài viết (tối đa 500 ký tự)..."
                  maxLength={500}
                  rows={5}
                  className="popup-textarea"
                  required
                />
                <small className="char-count">{hideReason.length}/500 ký tự</small>
              </div>

              <div className="popup-footer">
                <button
                  type="button"
                  onClick={() => setShowHidePopup(false)}
                  className="btn-cancel"
                  disabled={hidingArticle}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-submit btn-hide-confirm"
                  disabled={hidingArticle || !hideReason.trim()}
                >
                  {hidingArticle ? (
                    <>
                      <FaSpinner className="spinner-icon" /> Đang xử lý...
                    </>
                  ) : (
                    <>
                      <FaEyeSlash /> Xác nhận ẩn
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArticleReviewPage;