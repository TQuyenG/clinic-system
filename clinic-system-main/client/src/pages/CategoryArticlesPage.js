// client/src/pages/CategoryArticlesPage.js
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
  const [letterFilter, setLetterFilter] = useState('');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  const API_BASE_URL = 'http://localhost:3001';

  useEffect(() => {
    if (category) {
      fetchArticles();
    }
  }, [category, page, letterFilter]);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const params = {
        category_id: category.id,
        page,
        limit: 12
      };
      
      if (letterFilter) {
        params.letter = letterFilter;
      }
      
      const response = await axios.get(
        `${API_BASE_URL}/api/articles/public`,
        { params }
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
      <div className="article-list-loading-state">
        <div className="article-list-spinner"></div>
        <p>Đang tải bài viết...</p>
      </div>
    );
  }

  return (
    <div className="article-list-page">
      <Breadcrumb items={breadcrumbItems} />

      {(categoryType === 'thuoc' || categoryType === 'benh-ly') && (
        <div className="article-list-alphabet-filter">
          <button
            className={`article-list-alphabet-btn ${!letterFilter ? 'article-list-active' : ''}`}
            onClick={() => setLetterFilter('')}
          >
            Tất cả
          </button>
          {alphabet.map(letter => (
            <button
              key={letter}
              className={`article-list-alphabet-btn ${letterFilter === letter ? 'article-list-active' : ''}`}
              onClick={() => setLetterFilter(letter)}
            >
              {letter}
            </button>
          ))}
        </div>
      )}

      <div className="article-list-page-header">
        <h1><FaFolder /> {category.name}</h1>
        {category.description && (
          <p className="article-list-subtitle">{category.description}</p>
        )}
        <p className="article-list-article-count">{pagination.totalItems || 0} bài viết</p>
      </div>

      {articles.length === 0 ? (
        <div className="article-list-empty-state">
          <h3>Chưa có bài viết nào trong danh mục này</h3>
          <button onClick={() => navigate('/bai-viet')} className="article-list-btn article-list-btn-primary">
            Xem tất cả bài viết
          </button>
        </div>
      ) : (
        <>
          <div className="article-list-articles-grid">
            {articles.map(article => (
              <div 
                key={article.id} 
                className="article-list-article-card"
                onClick={() => navigate(getCategoryTypeUrl(article))}
              >
                <div className="article-list-card-image">
                  <img 
                    src={getFirstImage(article.content) || '/placeholder.jpg'}
                    alt={article.title} 
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/placeholder.jpg';
                    }}
                  />
                  {!getFirstImage(article.content) && (
                    <div className="article-list-no-image-overlay">
                      Chưa có ảnh
                    </div>
                  )}
                </div>
                
                <div className="article-list-card-header">
                  <span className="article-list-category-name">{article.category?.name}</span>
                </div>

                <h3 className="article-list-card-title">{article.title}</h3>
                <p className="article-list-card-excerpt">{truncateContent(article.content)}</p>

                <div className="article-list-card-footer">
                  <div className="article-list-card-meta">
                    <span><FaUser /> {article.author?.full_name}</span>
                    <span><FaCalendar /> {new Date(article.created_at).toLocaleDateString('vi-VN')}</span>
                  </div>
                  <div className="article-list-card-stats">
                    <span><FaEye /> {article.views || 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className="article-list-pagination">
              <button onClick={() => setPage(page - 1)} disabled={page === 1}>
                Trước
              </button>
              <div className="article-list-page-numbers">
                {[...Array(pagination.totalPages)].map((_, i) => (
                  <button
                    key={i + 1}
                    className={page === i + 1 ? 'article-list-active' : ''}
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