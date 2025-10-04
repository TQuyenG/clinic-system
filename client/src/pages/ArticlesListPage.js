// client/src/pages/ArticlesListPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaSearch, FaTimes, FaEye, FaCalendar, FaUser } from 'react-icons/fa';
import './ArticlesListPage.css';

const ArticlesListPage = () => {
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    category_id: '',
    category_type: '',
    page: 1,
    limit: 12
  });
  const [pagination, setPagination] = useState({});

  const API_BASE_URL = 'http://localhost:3001';

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [filters]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/articles/categories`);
      if (response.data.success) {
        setCategories(response.data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams(
        Object.entries(filters).filter(([_, v]) => v !== '')
      ).toString();

      const response = await axios.get(`${API_BASE_URL}/api/articles/public?${params}`);

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

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      category_id: '',
      category_type: '',
      page: 1,
      limit: 12
    });
  };

  const getCategoryTypeBadge = (type) => {
    const types = {
      tin_tuc: { text: 'Tin tức', color: '#3b82f6' },
      thuoc: { text: 'Thuốc', color: '#10b981' },
      benh_ly: { text: 'Bệnh lý', color: '#ef4444' }
    };
    const typeInfo = types[type] || { text: type, color: '#6b7280' };
    return (
      <span className="type-badge" style={{ backgroundColor: typeInfo.color }}>
        {typeInfo.text}
      </span>
    );
  };

  const truncateContent = (html, maxLength = 150) => {
    const text = html.replace(/<[^>]*>/g, '');
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <div className="articles-list-page">
      <div className="page-header">
        <h1>Bài viết</h1>
        <p className="subtitle">Khám phá kiến thức y tế và sức khỏe</p>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-box">
          <FaSearch />
          <input
            type="text"
            name="search"
            value={filters.search}
            onChange={handleFilterChange}
            placeholder="Tìm kiếm bài viết..."
          />
          {filters.search && (
            <button onClick={() => setFilters(prev => ({ ...prev, search: '', page: 1 }))}>
              <FaTimes />
            </button>
          )}
        </div>

        <select
          name="category_type"
          value={filters.category_type}
          onChange={handleFilterChange}
        >
          <option value="">Tất cả loại</option>
          <option value="tin_tuc">Tin tức</option>
          <option value="thuoc">Thuốc</option>
          <option value="benh_ly">Bệnh lý</option>
        </select>

        <select
          name="category_id"
          value={filters.category_id}
          onChange={handleFilterChange}
        >
          <option value="">Tất cả danh mục</option>
          {categories
            .filter(cat => !filters.category_type || cat.category_type === filters.category_type)
            .map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))
          }
        </select>

        {(filters.search || filters.category_id || filters.category_type) && (
          <button className="btn-clear" onClick={clearFilters}>
            <FaTimes /> Xóa lọc
          </button>
        )}
      </div>

      {/* Articles Grid */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Đang tải bài viết...</p>
        </div>
      ) : articles.length === 0 ? (
        <div className="empty-state">
          <h3>Không tìm thấy bài viết nào</h3>
          <p>Thử thay đổi bộ lọc hoặc tìm kiếm với từ khóa khác</p>
        </div>
      ) : (
        <>
          <div className="articles-grid">
            {articles.map(article => (
              <div 
                key={article.id} 
                className="article-card"
                onClick={() => navigate(`/articles/${article.slug}`)}
              >
                <div className="card-header">
                  {article.Category && getCategoryTypeBadge(article.Category.category_type)}
                  <span className="category-name">{article.Category?.name}</span>
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

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={filters.page === 1}
              >
                Trước
              </button>

              <div className="page-numbers">
                {[...Array(pagination.totalPages)].map((_, i) => (
                  <button
                    key={i + 1}
                    className={filters.page === i + 1 ? 'active' : ''}
                    onClick={() => setFilters(prev => ({ ...prev, page: i + 1 }))}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={filters.page === pagination.totalPages}
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

export default ArticlesListPage;