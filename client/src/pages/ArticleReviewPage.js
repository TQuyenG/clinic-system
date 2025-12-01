// client/src/pages/ArticleReviewPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  FaArrowLeft, FaUser, FaCalendar, FaTag, FaLink, FaNewspaper,
  FaCheck, FaBan, FaRedo, FaHistory, FaClock, FaCheckCircle,
  FaTimesCircle, FaExclamationTriangle, FaPaperPlane, FaCommentDots,
  FaInfoCircle, FaSpinner, FaEyeSlash, FaEye, FaTrash, FaTimes
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

      const articleRes = await axios.get(
        `${API_BASE_URL}/api/articles/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (articleRes.data.success) {
        setArticle(articleRes.data.article);
      }

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
      admin: { label: 'Admin', class: 'review-article-role-admin' },
      editor: { label: 'Biên tập', class: 'review-article-role-editor' },
      author: { label: 'Tác giả', class: 'review-article-role-author' }
    };
    return badges[role] || { label: role, class: '' };
  };

  const quickHideReasons = [
    'Bài viết có nội dung sai sự thật',
    'Thiếu nguồn tham khảo đáng tin cậy',
    'Ngôn từ không phù hợp',
    'Vi phạm quy định cộng đồng',
    'Nhiều báo cáo từ người dùng'
  ];

  if (loading) {
    return (
      <div className="review-article-page">
        <div className="review-article-container">
          <div className="review-article-loading">
            <div className="review-article-spinner"></div>
            <p>Đang tải dữ liệu...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="review-article-page">
        <div className="review-article-container">
          <div className="review-article-error-box">
            <FaTimesCircle />
            <h2>{error || 'Không tìm thấy bài viết'}</h2>
            <button onClick={() => navigate('/quan-ly-bai-viet')} className="review-article-back-button">
              <FaArrowLeft /> Quay lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';
  const isAuthor = article.author_id === user?.id;

  return (
    <div className="review-article-page">
      <div className="review-article-container">
        {/* HEADER */}
        <div className="review-article-header">
          <button onClick={() => navigate('/quan-ly-bai-viet')} className="review-article-back-button">
            <FaArrowLeft /> Quay lại
          </button>
          <h1 className="review-article-title">Phê duyệt bài viết</h1>
          <div className={`review-article-status-badge review-article-status-${article.status}`}>
            {article.status === 'pending' && <><FaClock /> Chờ duyệt</>}
            {article.status === 'approved' && <><FaCheckCircle /> Đã duyệt</>}
            {article.status === 'rejected' && <><FaTimesCircle /> Từ chối</>}
            {article.status === 'request_edit' && <><FaRedo /> Yêu cầu sửa</>}
            {article.status === 'hidden' && <><FaEyeSlash /> Ẩn</>}
          </div>
        </div>

        {/* MAIN LAYOUT - 2 CỘT */}
        <div className="review-article-layout">
          {/* LEFT COLUMN - ARTICLE + DISCUSSION */}
          <div className="review-article-main-content">
            {/* ARTICLE CARD */}
            <div className="review-article-card">
              {/* ACTION BAR - 1 HÀNG NGANG Ở ĐẦU */}
              {isAdmin && (
                <div className="review-article-actions-bar">
                  {article.status === 'pending' && (
                    <>
                      <button
                        onClick={() => { setReviewAction('approve'); handleSubmitReview(); }}
                        className="review-article-action-button review-article-btn-approve"
                      >
                        <FaCheck /> Phê duyệt
                      </button>
                      <button
                        onClick={() => setReviewAction('reject')}
                        className="review-article-action-button review-article-btn-reject"
                      >
                        <FaBan /> Từ chối
                      </button>
                      <button
                        onClick={() => setReviewAction('rewrite')}
                        className="review-article-action-button review-article-btn-request-edit"
                      >
                        <FaRedo /> Yêu cầu viết lại
                      </button>
                    </>
                  )}
                  
                  {article.status === 'request_edit' && (
                    <>
                      <button
                        onClick={() => handleRespondEditRequest(true)}
                        className="review-article-action-button review-article-btn-approve"
                      >
                        <FaCheck /> Cho phép sửa
                      </button>
                      <button
                        onClick={() => handleRespondEditRequest(false)}
                        className="review-article-action-button review-article-btn-reject"
                      >
                        <FaBan /> Từ chối sửa
                      </button>
                    </>
                  )}

                  {article.status === 'hidden' ? (
                    <button
                      onClick={handleUnhideArticle}
                      className="review-article-action-button review-article-btn-approve"
                    >
                      <FaEye /> Hiện lại
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowHidePopup(true)}
                      className="review-article-action-button review-article-btn-hide"
                    >
                      <FaEyeSlash /> Ẩn bài viết
                    </button>
                  )}
                </div>
              )}

              {/* ARTICLE INFO */}
              <div className="review-article-info">
                <h2 className="review-article-article-title">{article.title}</h2>
                
                <div className="review-article-meta">
                  <span className="review-article-meta-item">
                    <FaUser />
                    {article.author?.full_name || 'Ẩn danh'}
                  </span>
                  <span className="review-article-meta-item">
                    <FaCalendar />
                    {formatTime(article.created_at)}
                  </span>
                  {article.category && (
                    <span className="review-article-meta-item">
                      <FaNewspaper />
                      {article.category.name}
                    </span>
                  )}
                </div>

                {/* EDIT REQUEST INFO */}
                {article.status === 'request_edit' && article.edit_request_reason && (
                  <div className="review-article-edit-request">
                    <div className="review-article-edit-request-header">
                      <span className="review-article-edit-request-title">
                        <FaExclamationTriangle /> Yêu cầu chỉnh sửa
                      </span>
                    </div>
                    <p className="review-article-edit-request-reason">
                      {article.edit_request_reason}
                    </p>
                  </div>
                )}
              </div>

              {/* ARTICLE CONTENT */}
              <div className="review-article-content">
                <div dangerouslySetInnerHTML={{ __html: article.content }} />
              </div>

              {/* TAGS */}
              {article.tags_json && article.tags_json.length > 0 && (
                <div className="review-article-tags">
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

              {article.source && (
                <div className="review-article-tags">
                  <div className="review-article-tags-label">
                    <FaLink />
                    <span>Nguồn:</span>
                  </div>
                  <a href={article.source} target="_blank" rel="noopener noreferrer" 
                     style={{ color: '#4ade80', textDecoration: 'none' }}>
                    {article.source}
                  </a>
                </div>
              )}
            </div>

            {/* TRAO ĐỔI SECTION - DƯỚI BÀI VIẾT */}
            <div className="review-article-discussion-section">
              <div className="review-article-discussion-header">
                <FaCommentDots />
                <h3>Trao đổi ({comments.length})</h3>
              </div>

              {/* COMMENT FORM - GIỐNG BÌNH LUẬN */}
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
                          <div className="review-article-comment-user-info">
                            <span className="review-article-comment-user-name">
                              {comment.user?.full_name || 'Ẩn danh'}
                            </span>
                            {comment.user?.role && (
                              <span className={`review-article-comment-role-badge ${getRoleBadge(comment.user.role).class}`}>
                                {getRoleBadge(comment.user.role).label}
                              </span>
                            )}
                          </div>
                          <span className="review-article-comment-time">{formatTime(comment.created_at)}</span>
                        </div>
                        <div className="review-article-comment-body">
                          <p>{comment.comment_text}</p>
                        </div>
                        {(user?.role === 'admin' || comment.user_id === user?.id) && (
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

          {/* RIGHT SIDEBAR */}
          <div className="review-article-sidebar">
            {/* REVIEW HISTORY */}
            <div className="review-article-history-section">
              <div className="review-article-history-header">
                <FaHistory />
                <h3>Lịch sử phê duyệt ({reviewHistory.length})</h3>
              </div>

              <div className="review-article-history-list">
                {reviewHistory.length === 0 ? (
                  <div className="review-article-history-empty">
                    <p>Chưa có lịch sử phê duyệt</p>
                  </div>
                ) : (
                  reviewHistory.map((item, index) => (
                    <div 
                      key={index} 
                      className={`review-article-history-item review-article-action-${item.action}`}
                    >
                      <div className="review-article-history-header-info">
                        <span className="review-article-history-reviewer">
                          <FaUser />
                          {item.reviewer?.full_name || item.action_by?.full_name || 'N/A'}
                        </span>
                        <span className="review-article-history-time">
                          <FaClock />
                          {formatTime(item.created_at)}
                        </span>
                      </div>
                      {item.reason && (
                        <p className="review-article-history-reason">
                          {item.reason}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* MEDICAL INFO */}
            {((article.entity_type === 'medicine' && article.medicine) || 
              (article.entity_type === 'disease' && article.disease)) && (
              <div className="review-article-medical-info">
                {article.entity_type === 'medicine' && article.medicine && (
                  <>
                    <h3>Thông tin thuốc: {article.medicine.name || article.title}</h3>
                    
                    {article.medicine.composition && (
                      <div className="review-article-info-section">
                        <h4>Thành phần</h4>
                        <p>{article.medicine.composition}</p>
                      </div>
                    )}

                    {article.medicine.uses && (
                      <div className="review-article-info-section">
                        <h4>Công dụng</h4>
                        <p>{article.medicine.uses}</p>
                      </div>
                    )}

                    {article.medicine.side_effects && (
                      <div className="review-article-info-section">
                        <h4>Tác dụng phụ</h4>
                        <p>{article.medicine.side_effects}</p>
                      </div>
                    )}

                    {article.medicine.manufacturer && (
                      <div className="review-article-info-section">
                        <h4>Nhà sản xuất</h4>
                        <p>{article.medicine.manufacturer}</p>
                      </div>
                    )}
                  </>
                )}

                {article.entity_type === 'disease' && article.disease && (
                  <>
                    <h3>Thông tin bệnh lý: {article.disease.name || article.title}</h3>
                    
                    {article.disease.symptoms && (
                      <div className="review-article-info-section">
                        <h4>Triệu chứng</h4>
                        <p>{article.disease.symptoms}</p>
                      </div>
                    )}

                    {article.disease.treatments && (
                      <div className="review-article-info-section">
                        <h4>Điều trị</h4>
                        <p>{article.disease.treatments}</p>
                      </div>
                    )}

                    {article.disease.description && (
                      <div className="review-article-info-section">
                        <h4>Mô tả</h4>
                        <p>{article.disease.description}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* REPORTS SECTION */}
            {isAdmin && reports.length > 0 && (
              <div className="review-article-reports-section">
                <div className="review-article-reports-header">
                  <FaExclamationTriangle />
                  <h3>Báo cáo vi phạm</h3>
                  <span className="review-article-report-badge">{reports.length}</span>
                </div>

                <div className="review-article-reports-list">
                  {reports.map((report) => (
                    <div key={report.id} className="review-article-report-item">
                      <div className="review-article-report-user">
                        <div className="review-article-report-avatar">
                          {report.user?.avatar_url ? (
                            <img src={report.user.avatar_url} alt={report.user.full_name} />
                          ) : (
                            <FaUser />
                          )}
                        </div>
                        <div className="review-article-report-user-info">
                          <span className="review-article-report-user-name">
                            {report.user?.full_name || 'Ẩn danh'}
                          </span>
                          <span className="review-article-report-time">
                            <FaClock /> {formatTime(report.created_at)}
                          </span>
                        </div>
                      </div>
                      <div className="review-article-report-content">
                        <p className="review-article-report-reason">{report.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* HIDE POPUP */}
        {showHidePopup && (
          <div className="review-article-popup-overlay" onClick={() => setShowHidePopup(false)}>
            <div className="review-article-popup" onClick={(e) => e.stopPropagation()}>
              <div className="review-article-popup-header">
                <div className="review-article-popup-header-content">
                  <FaEyeSlash className="review-article-popup-icon" />
                  <h3>Ẩn bài viết</h3>
                </div>
                <button onClick={() => setShowHidePopup(false)} className="review-article-btn-close-popup">
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleHideArticle} className="review-article-popup-body">
                <div className="review-article-popup-warning">
                  <FaExclamationTriangle />
                  <div>
                    <p className="review-article-warning-title">Lưu ý quan trọng</p>
                    <p className="review-article-warning-text">
                      Bài viết sẽ bị ẩn khỏi danh sách công khai. Chỉ admin và tác giả có thể xem.
                    </p>
                  </div>
                </div>

                <div className="review-article-popup-info">
                  <label className="review-article-popup-label">Bài viết:</label>
                  <p className="review-article-article-title-display">{article.title}</p>
                </div>

                <div className="review-article-popup-quick-reasons">
                  <label className="review-article-popup-label">Lý do nhanh:</label>
                  <div className="review-article-quick-reason-buttons">
                    {quickHideReasons.map((r, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setHideReason(r)}
                        className={`review-article-btn-quick-reason ${hideReason === r ? 'active' : ''}`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="review-article-popup-form-group">
                  <label className="review-article-popup-label">
                    Lý do chi tiết <span className="review-article-required">*</span>
                  </label>
                  <textarea
                    value={hideReason}
                    onChange={(e) => setHideReason(e.target.value)}
                    placeholder="Nhập lý do ẩn bài viết (tối đa 500 ký tự)..."
                    maxLength={500}
                    rows={5}
                    className="review-article-popup-textarea"
                    required
                  />
                  <small className="review-article-char-count">{hideReason.length}/500 ký tự</small>
                </div>

                <div className="review-article-popup-footer">
                  <button
                    type="button"
                    onClick={() => setShowHidePopup(false)}
                    className="review-article-btn-cancel"
                    disabled={hidingArticle}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="review-article-action-button review-article-btn-hide-confirm"
                    disabled={hidingArticle || !hideReason.trim()}
                  >
                    {hidingArticle ? (
                      <>
                        <FaSpinner className="review-article-spinner-icon" /> Đang xử lý...
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

        {/* INFO BOX */}
        {article.status !== 'pending' && article.status !== 'request_edit' && (
          <div className="review-article-info-box">
            <FaInfoCircle />
            <p>
              Bài viết đã được xử lý. Trạng thái hiện tại: 
              <strong> {article.status === 'approved' ? 'Đã duyệt' : article.status === 'rejected' ? 'Từ chối' : article.status === 'hidden' ? 'Ẩn' : article.status}</strong>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArticleReviewPage;