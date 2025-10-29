import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaBookmark, FaEye, FaCalendar, FaUser } from 'react-icons/fa';
import './ArticlesListPage.css';

const SavedArticlesPage = () => {
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);

  const API_BASE_URL = 'http://localhost:3002';

  useEffect(() => {
    fetchSavedArticles();
  }, [page]);

  const fetchSavedArticles = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get(
        `${API_BASE_URL}/api/articles/saved?page=${page}&limit=12`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setArticles(response.data.articles || []);
        setPagination(response.data.pagination || {});
      }
    } catch (error) {
      console.error('Error fetching saved articles:', error);
      if (error.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const getCategoryTypeUrl = (article) => {
    const typeMap = {
      'tin_tuc': 'tin-tuc',
      'thuoc': 'thuoc',
      'benh_ly': 'benh-ly'
    };
    return `/${typeMap[article.category?.category_type]}/${article.slug}`;
  };

  const truncateContent = (html, maxLength = 150) => {
    const text = html.replace(/<[^>]*>/g, '');
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Đang tải bài viết đã lưu...</p>
      </div>
    );
  }

  return (
    <div className="articles-list-page">
      <div className="page-header">
        <h1><FaBookmark /> Bài viết đã lưu</h1>
        <p className="subtitle">Danh sách bài viết bạn đã lưu</p>
      </div>

      {articles.length === 0 ? (
        <div className="empty-state">
          <FaBookmark size={64} color="#94a3b8" />
          <h3>Chưa có bài viết nào được lưu</h3>
          <p>Hãy lưu những bài viết yêu thích để xem lại sau</p>
          <button 
            className="btn btn-primary" 
            onClick={() => navigate('/bai-viet')}
          >
            Khám phá bài viết
          </button>
        </div>
      ) : (
        <>
          <div className="articles-grid">
            {articles.map(article => (
              <div 
                key={article.id} 
                className="article-card"
                onClick={() => navigate(getCategoryTypeUrl(article))}
              >
                <div className="card-header">
                  <span className="category-name">
                    {article.category?.name}
                  </span>
                </div>

                <h3 className="card-title">{article.title}</h3>

                <p className="card-excerpt">
                  {truncateContent(article.content)}
                </p>

                <div className="card-footer">
                  <div className="card-meta">
                    <span>
                      <FaUser /> {article.author?.full_name || 'Ẩn danh'}
                    </span>
                    <span>
                      <FaCalendar /> {new Date(article.created_at).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  <div className="card-stats">
                    <span>
                      <FaEye /> {article.views || 0}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                Trước
              </button>

              <div className="page-numbers">
                {[...Array(pagination.totalPages)].map((_, i) => (
                  <button
                    key={i + 1}
                    className={page === i + 1 ? 'active' : ''}
                    onClick={() => setPage(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setPage(page + 1)}
                disabled={page === pagination.totalPages}
              >
                Sau
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SavedArticlesPage;