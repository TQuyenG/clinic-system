// client/src/pages/ArticleReviewPage.js - SỬA LỖI FETCH
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import ArticleCommentSection from '../components/article/ArticleCommentSection';
import { HideArticlePopup } from '../components/article/ArticleReportComponents';
import { 
  FaArrowLeft, FaUser, FaCalendar, FaTag, FaLink, FaNewspaper,
  FaCheck, FaBan, FaRedo, FaHistory, FaClock, FaCheckCircle,
  FaTimesCircle, FaExclamationTriangle, FaPaperPlane, FaCommentDots,
  FaInfoCircle, FaSpinner, FaEyeSlash, FaEye, FaFileAlt
} from 'react-icons/fa';
import './ArticleReviewPage.css';

const ArticleReviewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [article, setArticle] = useState(null);
  const [reviewHistory, setReviewHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [reviewAction, setReviewAction] = useState('approve');
  const [reviewReason, setReviewReason] = useState('');
  const [showHidePopup, setShowHidePopup] = useState(false);

  const API_BASE_URL = 'http://localhost:3002';

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || 'null');
    setUser(userData);
    
    if (userData) {
      fetchArticleData();
    } else {
      setError('Vui lòng đăng nhập');
      setLoading(false);
    }
  }, [id]);

  const fetchArticleData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');

      if (!token) {
        setError('Vui lòng đăng nhập');
        setLoading(false);
        return;
      }

      console.log('Fetching article:', id);

      // Fetch article details
      const articleResponse = await axios.get(
        `${API_BASE_URL}/api/articles/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('Article response:', articleResponse.data);

      if (articleResponse.data.success) {
        setArticle(articleResponse.data.article);
      } else {
        throw new Error('Không thể tải bài viết');
      }

      // Fetch review history
      try {
        const historyResponse = await axios.get(
          `${API_BASE_URL}/api/articles/${id}/review-history`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        console.log('History response:', historyResponse.data);

        if (historyResponse.data.success) {
          setReviewHistory(historyResponse.data.history || []);
        }
      } catch (historyError) {
        console.warn('⚠️ Không thể tải lịch sử:', historyError);
        setReviewHistory([]);
      }

    } catch (error) {
      console.error('❌ Error fetching article data:', error);
      
      if (error.response?.status === 404) {
        setError('Không tìm thấy bài viết');
      } else if (error.response?.status === 403) {
        setError('Bạn không có quyền xem bài viết này');
      } else {
        setError(error.response?.data?.message || error.message || 'Lỗi khi tải dữ liệu');
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
        { 
          action: reviewAction, 
          reason: reviewReason.trim() 
        },
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
        fetchArticleData();
      }
    } catch (error) {
      console.error('Error responding to edit request:', error);
      alert('Lỗi: ' + (error.response?.data?.message || error.message));
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
        fetchArticleData();
      }
    } catch (error) {
      console.error('Error unhiding article:', error);
      alert('Lỗi: ' + (error.response?.data?.message || error.message));
    }
  };

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
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="review-page-loading">
        <FaSpinner className="spinner" />
        <p>Đang tải dữ liệu...</p>
      </div>
    );
  }

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

  if (!article) {
    return (
      <div className="review-page-error">
        <FaTimesCircle />
        <h2>Không tìm thấy bài viết</h2>
        <p>ID: {id}</p>
        <button onClick={() => navigate('/quan-ly-bai-viet')} className="btn-back">
          <FaArrowLeft /> Quay lại
        </button>
      </div>
    );
  }

  const StatusBadge = ({ status }) => {
    const { icon: Icon, label, class: className } = getStatusBadge(status);
    return (
      <span className={`status-badge ${className}`}>
        <Icon /> {label}
      </span>
    );
  };

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
        {/* Left Column - Article Preview */}
        <div className="review-left">
          <div className="article-preview">
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

            <div className="preview-content">
              <div 
                className="content-html"
                dangerouslySetInnerHTML={{ __html: article.content }}
              />
            </div>

            {/* Medical Info Box */}
            {(article.medicine || article.disease) && (
              <div className="medical-info-box">
                <h3>Thông tin bổ sung</h3>
                
                {article.medicine && (
                  <>
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

                {article.disease && (
                  <>
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
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Review History + Form + Comments */}
        <div className="review-right">
          {/* Review History Timeline */}
          <div className="review-history-section">
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

          {/* Review Form - Chỉ admin và khi pending */}
          {isAdmin && article.status === 'pending' && (
            <div className="review-form-section">
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
                    <label>Lý do {reviewAction !== 'approve' && '*'}</label>
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

                <div className="form-actions">
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
            </div>
          )}

          {/* Form xử lý yêu cầu chỉnh sửa - Admin */}
          {isAdmin && article.status === 'request_edit' && (
            <div className="review-form-section">
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

                <div className="form-actions">
                  <button
                    onClick={() => handleRespondEditRequest(true)}
                    className="btn-submit btn-allow"
                  >
                    <FaCheck /> Cho phép chỉnh sửa
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

          {/* Nút ẩn/hiện bài viết - Admin */}
          {isAdmin && (
            <div className="review-form-section">
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

          {/* Info Box */}
          {article.status !== 'pending' && article.status !== 'request_edit' && (
            <div className="review-info-box">
              <FaInfoCircle />
              <p>
                Bài viết đã được xử lý. Trạng thái hiện tại: <StatusBadge status={article.status} />
              </p>
            </div>
          )}

          {/* Comment Section - Trao đổi giữa Admin & Tác giả */}
          <ArticleCommentSection articleId={id} />
        </div>
      </div>

      {/* Popup ẩn bài viết */}
      {showHidePopup && (
        <HideArticlePopup
          articleId={article.id}
          articleTitle={article.title}
          onClose={() => setShowHidePopup(false)}
          onSuccess={() => {
            setShowHidePopup(false);
            fetchArticleData();
          }}
        />
      )}
    </div>
  );
};

export default ArticleReviewPage;