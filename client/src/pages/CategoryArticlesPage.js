import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Breadcrumb from '../components/Breadcrumb';
import { FaEye, FaCalendar, FaUser, FaFolder } from 'react-icons/fa';
import './ArticlesListPage.css';

const CategoryArticlesPage = ({ category, categoryType }) => {
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);

  const API_BASE_URL = 'http://localhost:3001';

  useEffect(() => {
    if (category) {
      fetchArticles();
    }
  }, [category, page]);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_BASE_URL}/api/articles/public?category_id=${category.id}&page=${page}&limit=12`
      );

      if (response.data.success) {
        setArticles(response.data.articles || []);
        setPagination(response.data.pagination || {});
      }
    } catch (error) {
      console.error('Error fetching articles:', error);
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

  const getFirstImage = (html) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const img = doc.querySelector('img');
  return img ? img.src : null;
};

  const breadcrumbItems = [
    { label: 'Trang chủ', url: '/' },
    { label: 'Bài viết', url: '/bai-viet' },
    { 
      label: category?.category_type === 'tin_tuc' ? 'Tin tức' : 
             category?.category_type === 'thuoc' ? 'Thuốc' : 'Bệnh lý',
      url: `/${categoryType}`
    },
    { label: category?.name, url: null }
  ];

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Đang tải bài viết...</p>
      </div>
    );
  }

  return (
    <div className="articles-list-page">
      <Breadcrumb items={breadcrumbItems} />

      <div className="page-header">
        <h1><FaFolder /> {category.name}</h1>
        {category.description && (
          <p className="subtitle">{category.description}</p>
        )}
        <p className="article-count">{pagination.totalItems || 0} bài viết</p>
      </div>

      {articles.length === 0 ? (
        <div className="empty-state">
          <h3>Chưa có bài viết nào trong danh mục này</h3>
          <button onClick={() => navigate('/bai-viet')} className="btn btn-primary">
            Xem tất cả bài viết
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
                {/* THÊM PHẦN NÀY */}
                <div className="card-image">
                  <img 
                    src={getFirstImage(article.content) || '/placeholder.jpg'}
                    alt={article.title} 
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/placeholder.jpg';
                    }}
                  />
                  {!getFirstImage(article.content) && (
                    <div className="no-image-overlay">
                      Chưa có ảnh
                    </div>
                  )}
                </div>
                
                {/* THÊM CARD HEADER */}
                <div className="card-header">
                  <span className="category-name">{article.category?.name}</span>
                </div>

                <h3 className="card-title">{article.title}</h3>
                <p className="card-excerpt">{truncateContent(article.content)}</p>

                <div className="card-footer">
                  <div className="card-meta">
                    <span><FaUser /> {article.author?.full_name}</span>
                    <span><FaCalendar /> {new Date(article.created_at).toLocaleDateString('vi-VN')}</span>
                  </div>
                  <div className="card-stats">
                    <span><FaEye /> {article.views || 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button onClick={() => setPage(page - 1)} disabled={page === 1}>
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
              <button onClick={() => setPage(page + 1)} disabled={page === pagination.totalPages}>
                Sau
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CategoryArticlesPage;