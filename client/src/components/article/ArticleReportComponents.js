// client/src/components/article/ArticleReportComponents.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FaTimes, FaExclamationTriangle, FaPaperPlane, FaSpinner, 
  FaUser, FaClock, FaEyeSlash, FaEye 
} from 'react-icons/fa';
import './ArticleReportComponents.css';

const API_BASE_URL = 'http://localhost:3002';

// ============================================
// 1. ARTICLE REPORT POPUP
// ============================================
export const ArticleReportPopup = ({ articleId, onClose, onSuccess }) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reportReasons = [
    'Nội dung không chính xác',
    'Thông tin gây hiểu lầm',
    'Thiếu nguồn tham khảo',
    'Ngôn từ không phù hợp',
    'Spam hoặc quảng cáo',
    'Vi phạm bản quyền',
    'Lý do khác'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      alert('Vui lòng nhập lý do báo cáo');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        `${API_BASE_URL}/api/articles/${articleId}/report`,
        { reason: reason.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert('Đã gửi báo cáo. Admin sẽ xem xét.');
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Error reporting article:', error);
      alert('Lỗi: ' + (error.response?.data?.message || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="report-popup-overlay" onClick={onClose}>
      <div className="report-popup" onClick={(e) => e.stopPropagation()}>
        <div className="report-popup-header">
          <div className="report-header-content">
            <FaExclamationTriangle className="report-icon" />
            <h3>Báo cáo bài viết</h3>
          </div>
          <button onClick={onClose} className="btn-close-popup">
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="report-popup-body">
          <div className="report-info">
            <p>Vui lòng cho chúng tôi biết lý do báo cáo bài viết này. Admin sẽ xem xét và xử lý.</p>
          </div>

          <div className="report-quick-reasons">
            <label className="report-label">Lý do thường gặp:</label>
            <div className="quick-reason-buttons">
              {reportReasons.map((r, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`btn-quick-reason ${reason === r ? 'active' : ''}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="report-form-group">
            <label className="report-label">
              Chi tiết lý do <span className="required">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Nhập chi tiết lý do báo cáo (tối đa 500 ký tự)..."
              maxLength={500}
              rows={5}
              className="report-textarea"
              required
            />
            <small className="char-count">{reason.length}/500 ký tự</small>
          </div>

          <div className="report-popup-footer">
            <button
              type="button"
              onClick={onClose}
              className="btn-cancel"
              disabled={submitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="btn-submit-report"
              disabled={submitting || !reason.trim()}
            >
              {submitting ? (
                <>
                  <FaSpinner className="spinner-icon" /> Đang gửi...
                </>
              ) : (
                <>
                  <FaPaperPlane /> Gửi báo cáo
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================
// 2. ARTICLE REPORTS LIST
// ============================================
export const ArticleReportsList = ({ articleId, onHideArticle }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(userData);
    
    if (userData.role === 'admin') {
      fetchReports();
    } else {
      setLoading(false);
    }
  }, [articleId]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE_URL}/api/articles/${articleId}/reports`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setReports(response.data.reports || []);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleHideArticle = async () => {
    const reason = prompt('Nhập lý do ẩn bài viết (max 500 ký tự):');
    if (!reason) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/api/articles/${articleId}/hide`,
        { reason: reason.substring(0, 500) },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert('Đã ẩn bài viết');
        if (onHideArticle) onHideArticle();
      }
    } catch (error) {
      console.error('Error hiding article:', error);
      alert('Lỗi: ' + (error.response?.data?.message || error.message));
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (user?.role !== 'admin') {
    return null;
  }

  if (loading) {
    return (
      <div className="reports-list-loading">
        <FaSpinner className="spinner" />
        <p>Đang tải báo cáo...</p>
      </div>
    );
  }

  if (reports.length === 0) {
    return null;
  }

  return (
    <div className="article-reports-list">
      <div className="reports-header">
        <div className="reports-title">
          <FaExclamationTriangle className="reports-icon" />
          <h3>Báo cáo vi phạm ({reports.length})</h3>
        </div>
        <button onClick={handleHideArticle} className="btn-hide-article">
          <FaEyeSlash /> Ẩn bài viết
        </button>
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
  );
};

// ============================================
// 3. HIDE ARTICLE POPUP
// ============================================
export const HideArticlePopup = ({ articleId, articleTitle, onClose, onSuccess }) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const quickReasons = [
    'Bài viết có nội dung sai sự thật',
    'Thiếu nguồn tham khảo đáng tin cậy',
    'Ngôn từ không phù hợp',
    'Vi phạm quy định cộng đồng',
    'Nhiều báo cáo từ người dùng'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      alert('Vui lòng nhập lý do ẩn bài viết');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        `${API_BASE_URL}/api/articles/${articleId}/hide`,
        { reason: reason.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert('Đã ẩn bài viết thành công');
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Error hiding article:', error);
      alert('Lỗi: ' + (error.response?.data?.message || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="hide-popup-overlay" onClick={onClose}>
      <div className="hide-popup" onClick={(e) => e.stopPropagation()}>
        <div className="hide-popup-header">
          <div className="hide-header-content">
            <FaEyeSlash className="hide-icon" />
            <h3>Ẩn bài viết</h3>
          </div>
          <button onClick={onClose} className="btn-close-popup">
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="hide-popup-body">
          <div className="hide-warning">
            <FaExclamationTriangle />
            <div>
              <p className="hide-warning-title">Lưu ý quan trọng</p>
              <p className="hide-warning-text">
                Bài viết sẽ bị ẩn khỏi danh sách công khai. Chỉ admin và tác giả có thể xem.
              </p>
            </div>
          </div>

          <div className="hide-article-info">
            <label className="hide-label">Bài viết:</label>
            <p className="article-title-display">{articleTitle}</p>
          </div>

          <div className="hide-quick-reasons">
            <label className="hide-label">Lý do nhanh:</label>
            <div className="quick-reason-buttons">
              {quickReasons.map((r, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`btn-quick-reason ${reason === r ? 'active' : ''}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="hide-form-group">
            <label className="hide-label">
              Lý do chi tiết <span className="required">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Nhập lý do ẩn bài viết (tối đa 500 ký tự)..."
              maxLength={500}
              rows={5}
              className="hide-textarea"
              required
            />
            <small className="char-count">{reason.length}/500 ký tự</small>
          </div>

          <div className="hide-popup-footer">
            <button
              type="button"
              onClick={onClose}
              className="btn-cancel"
              disabled={submitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="btn-submit-hide"
              disabled={submitting || !reason.trim()}
            >
              {submitting ? (
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
  );
};

export default { ArticleReportPopup, ArticleReportsList, HideArticlePopup };