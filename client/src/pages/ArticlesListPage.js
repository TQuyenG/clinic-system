import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Breadcrumb from '../components/Breadcrumb';
import { FaSearch, FaTimes, FaEye, FaCalendar, FaUser } from 'react-icons/fa';
import './ArticlesListPage.css';

const ArticlesListPage = ({ type }) => {
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    category_id: '',
    category_type: type || '',
    page: 1,
    limit: 12
  });
  const [pagination, setPagination] = useState({});

  const API_BASE_URL = 'http://localhost:3001';

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    setFilters(prev => ({ ...prev, category_type: type || '', page: 1 }));
  }, [type]);

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
      category_type: type || '',
      page: 1,
      limit: 12
    });
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

  const getBreadcrumbItems = () => {
    const items = [
      { label: 'Trang chủ', url: '/' },
      { label: 'Bài viết', url: '/bai-viet' }
    ];

    if (type) {
      const typeLabels = {
        'tin_tuc': 'Tin tức',
        'thuoc': 'Thuốc',
        'benh_ly': 'Bệnh lý'
      };
      items.push({ label: typeLabels[type], url: null });
    }

    return items;
  };

  return (
    <div className="articles-list-page">
      {type && <Breadcrumb items={getBreadcrumbItems()} />}

      <div className="page-header">
        <h1>
          {type === 'tin_tuc' && 'Tin tức sức khỏe'}
          {type === 'thuoc' && 'Cẩm nang thuốc'}
          {type === 'benh_ly' && 'Bệnh lý'}
          {!type && 'Tất cả bài viết'}
        </h1>
        <p className="subtitle">Khám phá kiến thức y tế và sức khỏe</p>
      </div>

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

        {!type && (
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
        )}

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

        {(filters.search || filters.category_id || (!type && filters.category_type)) && (
          <button className="btn-clear" onClick={clearFilters}>
            <FaTimes /> Xóa lọc
          </button>
        )}
      </div>

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
                onClick={() => navigate(getCategoryTypeUrl(article))}
              >
                <div className="card-header">
                  <span className="category-name">{article.category?.name}</span>
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