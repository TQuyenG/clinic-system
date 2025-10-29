// client/src/components/article/ArticleCommentSection.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaUser, FaPaperPlane, FaTrash, FaSpinner } from 'react-icons/fa';
import './ArticleCommentSection.css';

const ArticleCommentSection = ({ articleId }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [user, setUser] = useState(null);

  const API_BASE_URL = 'http://localhost:3002';

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(userData);
    fetchComments();
  }, [articleId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE_URL}/api/articles/${articleId}/comments`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setComments(response.data.comments || []);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
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
        `${API_BASE_URL}/api/articles/${articleId}/comments`,
        { comment_text: commentText.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setCommentText('');
        fetchComments();
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
        `${API_BASE_URL}/api/articles/${articleId}/comments/${commentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        fetchComments();
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Lỗi: ' + (error.response?.data?.message || error.message));
    }
  };

  const formatTime = (dateString) => {
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

  if (loading) {
    return (
      <div className="comment-section-loading">
        <FaSpinner className="spinner" />
        <p>Đang tải comment...</p>
      </div>
    );
  }

  return (
    <div className="article-comment-section">
      <div className="comment-section-header">
        <h3>Trao đổi ({comments.length})</h3>
        <p className="comment-hint">Chỉ admin và tác giả có thể comment</p>
      </div>

      {/* Form nhập comment */}
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
            className="btn-submit-comment"
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

      {/* Danh sách comment */}
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
                    <span className="comment-user-name">{comment.user?.full_name || 'Ẩn danh'}</span>
                    {comment.user?.role && (
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
  );
};

export default ArticleCommentSection;