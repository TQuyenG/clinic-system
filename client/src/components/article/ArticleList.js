// client/src/components/article/ArticleList.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const ArticleList = () => {
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({
    status: '',
    category_id: '',
    search: '',
    page: 1,
    limit: 10
  });
  const [pagination, setPagination] = useState({});
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setUserRole(user.role);
    fetchCategories();
    fetchArticles();
  }, [filters]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/articles/categories');
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams(filters).toString();
      const response = await axios.get(`/api/articles?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setArticles(response.data.articles);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
      page: 1
    });
  };

  const handlePageChange = (newPage) => {
    setFilters({ ...filters, page: newPage });
  };

  const handleRequestEdit = async (articleId) => {
    const reason = prompt('Nhập lý do muốn chỉnh sửa:');
    if (!reason) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/articles/${articleId}/request-edit`, 
        { reason },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      alert('Đã gửi yêu cầu chỉnh sửa đến admin');
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi gửi yêu cầu');
    }
  };

  const handleRequestDelete = async (articleId) => {
    const reason = prompt('Nhập lý do muốn xóa:');
    if (!reason) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/articles/${articleId}/request-delete`, 
        { reason },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      alert('Đã gửi yêu cầu xóa đến admin');
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi gửi yêu cầu');
    }
  };

  const handleReport = async (articleId) => {
    const reason = prompt('Nhập lý do báo cáo:');
    if (!reason) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/articles/${articleId}/report`, 
        { reason },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      alert('Đã gửi báo cáo bài viết');
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi báo cáo');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: { text: 'Nháp', class: 'badge-draft' },
      pending: { text: 'Chờ duyệt', class: 'badge-pending' },
      approved: { text: 'Đã duyệt', class: 'badge-approved' },
      rejected: { text: 'Từ chối', class: 'badge-rejected' },
      hidden: { text: 'Đã ẩn', class: 'badge-hidden' }
    };
    const badge = badges[status] || { text: status, class: '' };
    return <span className={`badge ${badge.class}`}>{badge.text}</span>;
  };

  if (loading) {
    return <div className="loading-spinner">Đang tải...</div>;
  }

  return (
    <div className="article-list-container">
      <div className="list-header">
        <h2>Quản lý bài viết</h2>
        {['staff', 'doctor'].includes(userRole) && (
          <button 
            onClick={() => navigate('/articles/create')}
            className="btn btn-primary"
          >
            + Tạo bài viết mới
          </button>
        )}
      </div>

      <div className="filters">
        <input
          type="text"
          name="search"
          value={filters.search}
          onChange={handleFilterChange}
          placeholder="Tìm kiếm tiêu đề..."
          className="search-input"
        />

        <select
          name="category_id"
          value={filters.category_id}
          onChange={handleFilterChange}
          className="filter-select"
        >
          <option value="">Tất cả danh mục</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>

        {userRole === 'admin' && (
          <select
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            className="filter-select"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="draft">Nháp</option>
            <option value="pending">Chờ duyệt</option>
            <option value="approved">Đã duyệt</option>
            <option value="rejected">Từ chối</option>
            <option value="hidden">Đã ẩn</option>
          </select>
        )}
      </div>

      <div className="articles-table">
        <table>
          <thead>
            <tr>
              <th>Tiêu đề</th>
              <th>Danh mục</th>
              {userRole === 'admin' && <th>Tác giả</th>}
              <th>Trạng thái</th>
              <th>Lượt xem</th>
              <th>Ngày tạo</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {articles.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center">
                  Không có bài viết nào
                </td>
              </tr>
            ) : (
              articles.map(article => (
                <tr key={article.id}>
                  <td>
                    <a href={`/articles/${article.id}`}>
                      {article.title}
                    </a>
                  </td>
                  <td>{article.Category?.name || 'N/A'}</td>
                  {userRole === 'admin' && (
                    <td>{article.author?.full_name}</td>
                  )}
                  <td>{getStatusBadge(article.status)}</td>
                  <td>{article.views}</td>
                  <td>{new Date(article.created_at).toLocaleDateString('vi-VN')}</td>
                  <td className="actions">
                    {/* Staff/Doctor actions */}
                    {['staff', 'doctor'].includes(userRole) && (
                      <>
                        {article.status === 'draft' && (
                          <button
                            onClick={() => navigate(`/articles/edit/${article.id}`)}
                            className="btn-sm btn-primary"
                          >
                            Sửa
                          </button>
                        )}
                        {['approved', 'hidden'].includes(article.status) && (
                          <button
                            onClick={() => handleRequestEdit(article.id)}
                            className="btn-sm btn-warning"
                          >
                            Yêu cầu sửa
                          </button>
                        )}
                        {article.status !== 'pending' && (
                          <button
                            onClick={() => handleRequestDelete(article.id)}
                            className="btn-sm btn-danger"
                          >
                            Yêu cầu xóa
                          </button>
                        )}
                      </>
                    )}

                    {/* Admin actions */}
                    {userRole === 'admin' && (
                      <>
                        {article.status === 'pending' && (
                          <button
                            onClick={() => navigate(`/articles/review/${article.id}`)}
                            className="btn-sm btn-primary"
                          >
                            Duyệt
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/articles/edit/${article.id}`)}
                          className="btn-sm btn-secondary"
                        >
                          Sửa
                        </button>
                      </>
                    )}

                    {/* All users can report approved articles */}
                    {article.status === 'approved' && (
                      <button
                        onClick={() => handleReport(article.id)}
                        className="btn-sm btn-report"
                      >
                        Báo cáo
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => handlePageChange(filters.page - 1)}
            disabled={filters.page === 1}
            className="btn-page"
          >
            ‹ Trước
          </button>
          
          <span className="page-info">
            Trang {filters.page} / {pagination.totalPages}
          </span>

          <button
            onClick={() => handlePageChange(filters.page + 1)}
            disabled={filters.page === pagination.totalPages}
            className="btn-page"
          >
            Sau ›
          </button>
        </div>
      )}
    </div>
  );
};

export default ArticleList;