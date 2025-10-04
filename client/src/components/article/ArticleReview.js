// client/src/components/article/ArticleReview.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const ArticleReview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchArticle();
  }, [id]);

  const fetchArticle = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/articles/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setArticle(response.data.article);
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi tải bài viết');
      navigate('/articles/manage');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async () => {
    if (!action) {
      alert('Vui lòng chọn hành động');
      return;
    }

    if ((action === 'reject' || action === 'rewrite') && !rejectionReason.trim()) {
      alert('Vui lòng nhập lý do');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `/api/articles/${id}/review`,
        { action, rejection_reason: rejectionReason },
        { headers: { Authorization: `Bearer ${token}` }}
      );

      const messages = {
        approve: 'Đã duyệt bài viết',
        reject: 'Đã từ chối bài viết',
        rewrite: 'Đã yêu cầu tác giả viết lại'
      };

      alert(messages[action]);
      navigate('/articles/manage');
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi xử lý');
    }
  };

  const handleHide = async () => {
    const reason = prompt('Nhập lý do ẩn bài viết:');
    if (!reason) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `/api/articles/${id}/hide`,
        { reason },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      alert('Đã ẩn bài viết');
      fetchArticle();
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi ẩn bài');
    }
  };

  const handleAllowEdit = async () => {
    if (!confirm('Cho phép tác giả chỉnh sửa bài viết này?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `/api/articles/${id}/allow-edit`,
        {},
        { headers: { Authorization: `Bearer ${token}` }}
      );
      alert('Đã cho phép tác giả chỉnh sửa');
      fetchArticle();
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi xử lý');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Xác nhận xóa bài viết này?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/articles/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Đã xóa bài viết');
      navigate('/articles/manage');
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi xóa bài');
    }
  };

  if (loading) {
    return <div className="loading-spinner">Đang tải...</div>;
  }

  if (!article) {
    return <div>Không tìm thấy bài viết</div>;
  }

  return (
    <div className="article-review-container">
      <div className="review-header">
        <h2>Duyệt bài viết</h2>
        <button onClick={() => navigate('/articles/manage')} className="btn-back">
          ← Quay lại
        </button>
      </div>

      <div className="article-info">
        <div className="info-row">
          <strong>Tác giả:</strong> {article.author?.full_name}
        </div>
        <div className="info-row">
          <strong>Trạng thái:</strong> 
          <span className={`badge badge-${article.status}`}>
            {article.status}
          </span>
        </div>
        <div className="info-row">
          <strong>Danh mục:</strong> {article.Category?.name || 'Không có'}
        </div>
        <div className="info-row">
          <strong>Tags:</strong> 
          {article.tags_json?.map((tag, idx) => (
            <span key={idx} className="tag">{tag}</span>
          ))}
        </div>
        {article.rejection_reason && (
          <div className="info-row rejection-reason">
            <strong>Lý do từ chối/viết lại:</strong>
            <p>{article.rejection_reason}</p>
          </div>
        )}
      </div>

      <div className="article-content">
        <h3>{article.title}</h3>
        <div className="content" dangerouslySetInnerHTML={{ __html: article.content }} />
      </div>

      <div className="review-actions">
        <h4>Hành động duyệt</h4>

        {article.status === 'pending' && (
          <div className="action-buttons">
            <button
              onClick={() => { setAction('approve'); setShowModal(true); }}
              className="btn btn-success"
            >
              Chấp nhận
            </button>
            <button
              onClick={() => { setAction('reject'); setShowModal(true); }}
              className="btn btn-danger"
            >
              Từ chối
            </button>
            <button
              onClick={() => { setAction('rewrite'); setShowModal(true); }}
              className="btn btn-warning"
            >
              Yêu cầu viết lại
            </button>
          </div>
        )}

        <div className="additional-actions">
          <button onClick={handleAllowEdit} className="btn btn-secondary">
            Cho phép sửa
          </button>
          <button onClick={handleHide} className="btn btn-secondary">
            Ẩn bài viết
          </button>
          <button onClick={handleDelete} className="btn btn-danger">
            Xóa bài viết
          </button>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>
              {action === 'approve' ? 'Xác nhận duyệt bài' :
               action === 'reject' ? 'Từ chối bài viết' :
               'Yêu cầu viết lại'}
            </h3>

            {action !== 'approve' && (
              <div className="form-group">
                <label>Lý do *</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Nhập lý do từ chối hoặc yêu cầu viết lại..."
                  rows="5"
                  required
                />
              </div>
            )}

            <div className="modal-actions">
              <button onClick={handleReview} className="btn btn-primary">
                Xác nhận
              </button>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary">
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArticleReview;