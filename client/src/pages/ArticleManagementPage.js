import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FaPlus, FaEdit, FaTrash, FaEye, FaEyeSlash, FaSearch, FaTimes, 
  FaThumbsUp, FaShareAlt, FaFilter, FaSortAmountDown, FaSortAmountUp,
  FaCheck, FaBan, FaRedo, FaInfoCircle, FaExternalLinkAlt, FaClock,
  FaBookmark, FaNewspaper, FaPills, FaDisease, FaUser, FaCalendar,
  FaTag, FaLink, FaExclamationTriangle, FaCheckCircle, FaTimesCircle,
  FaSpinner, FaFileAlt, FaTable
} from 'react-icons/fa';
import './ArticleManagementPage.css';

const ArticleManagementPage = () => {
  const API_BASE_URL = 'http://localhost:3001';
  const [user, setUser] = useState({});
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [hideOnEdit, setHideOnEdit] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [showPreview, setShowPreview] = useState(false);
  
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    category_id: '',
    category_type: '',
    author_id: '',
    date_from: '',
    date_to: '',
    min_views: '',
    page: 1,
    limit: 10,
    sort_by: 'created_at',
    sort_order: 'DESC'
  });

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category_id: '',
    tags_json: [],
    source: ''
  });

  const [pagination, setPagination] = useState({});
  const [stats, setStats] = useState({});
  const [tagInput, setTagInput] = useState('');
  const [suggestedTags, setSuggestedTags] = useState([]);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(userData);
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [filters, activeTab]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/categories`);
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
      const token = localStorage.getItem('token');
      
      let queryFilters = { ...filters };

      if (activeTab === 'pending') {
        queryFilters.status = 'pending';
      } else if (activeTab === 'request_edit') {
        queryFilters.status = 'request_edit';
      } else if (activeTab === 'approved') {
        queryFilters.status = 'approved';
      } else if (activeTab === 'rejected') {
        queryFilters.status = 'rejected';
      } else if (activeTab === 'medicine') {
        queryFilters.category_type = 'thuoc';
      } else if (activeTab === 'disease') {
        queryFilters.category_type = 'benh_ly';
      }

      if (user.role === 'staff') {
        queryFilters.author_id = user.id;
      }

      const params = new URLSearchParams(
        Object.entries(queryFilters).filter(([_, v]) => v !== '')
      ).toString();

      const response = await axios.get(`${API_BASE_URL}/api/articles?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const articlesData = response.data.success 
        ? response.data.articles 
        : (response.data.articles || response.data);

      setArticles(Array.isArray(articlesData) ? articlesData : []);
      setPagination(response.data.pagination || {});
      setStats(response.data.stats || {});
    } catch (error) {
      console.error('Error fetching articles:', error);
      alert(error.response?.data?.message || 'Lỗi tải danh sách bài viết');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestedTags = async (query) => {
    if (query.length < 2) {
      setSuggestedTags([]);
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE_URL}/api/articles/tags/suggest?q=${query}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuggestedTags(response.data.tags || []);
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const handleTagInputChange = (e) => {
    const value = e.target.value;
    setTagInput(value);
    
    const lastWord = value.split(',').pop().trim();
    if (lastWord) {
      fetchSuggestedTags(lastWord);
    } else {
      setSuggestedTags([]);
    }
  };

  const addTag = (tag) => {
    if (!formData.tags_json.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags_json: [...prev.tags_json, tag]
      }));
    }
    setTagInput('');
    setSuggestedTags([]);
  };

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags_json: prev.tags_json.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      category_id: '',
      category_type: '',
      author_id: '',
      date_from: '',
      date_to: '',
      min_views: '',
      page: 1,
      limit: 10,
      sort_by: 'created_at',
      sort_order: 'DESC'
    });
  };

  const toggleSort = (field) => {
    setFilters(prev => ({
      ...prev,
      sort_by: field,
      sort_order: prev.sort_by === field && prev.sort_order === 'ASC' ? 'DESC' : 'ASC'
    }));
  };

  const openModal = (type, article = null) => {
    setModalType(type);
    setSelectedArticle(article);
    setHideOnEdit(false);

    if (type === 'create') {
      setFormData({ title: '', content: '', category_id: '', tags_json: [], source: '' });
    } else if (type === 'edit' && article) {
      setFormData({
        title: article.title,
        content: article.content,
        category_id: article.category_id || '',
        tags_json: article.tags_json || [],
        source: article.source || ''
      });
    } else if (type === 'review' && article) {
      setShowPreview(true);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalType('');
    setSelectedArticle(null);
    setShowPreview(false);
    setFormData({ title: '', content: '', category_id: '', tags_json: [], source: '' });
    setHideOnEdit(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.content) {
      alert('Vui lòng nhập đầy đủ tiêu đề và nội dung');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      if (modalType === 'create') {
        await axios.post(`${API_BASE_URL}/api/articles`, formData, config);
        alert('Tạo bài viết thành công!');
      } else if (modalType === 'edit') {
        const updateData = hideOnEdit 
          ? { ...formData, status: 'hidden' }
          : formData;
          
        await axios.put(`${API_BASE_URL}/api/articles/${selectedArticle.id}`, updateData, config);
        alert(hideOnEdit ? 'Cập nhật và ẩn bài viết thành công!' : 'Cập nhật bài viết thành công!');
      }

      closeModal();
      fetchArticles();
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi xử lý bài viết');
    }
  };

  const handleReviewArticle = async (articleId, action, reason = '') => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/api/articles/${articleId}/review`,
        { action, rejection_reason: reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const messages = {
        approve: 'Phê duyệt bài viết thành công!',
        reject: 'Từ chối bài viết thành công!',
        rewrite: 'Đã gửi yêu cầu viết lại!'
      };
      
      alert(messages[action]);
      closeModal();
      fetchArticles();
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi xử lý phê duyệt');
    }
  };

  const handleDelete = async (articleId, title) => {
    if (!window.confirm(`Bạn có chắc muốn xóa bài viết "${title}"?`)) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/api/articles/${articleId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Xóa bài viết thành công!');
      fetchArticles();
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi xóa bài viết');
    }
  };

  const handleToggleVisibility = async (articleId, currentStatus) => {
    const hide = currentStatus !== 'hidden';

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/api/articles/${articleId}/hide`,
        { hide },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(hide ? 'Đã ẩn bài viết!' : 'Đã hiện bài viết!');
      fetchArticles();
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi thay đổi trạng thái');
    }
  };

  const handleRequestEdit = async (articleId) => {
    const reason = prompt('Nhập lý do muốn chỉnh sửa:');
    if (!reason) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/api/articles/${articleId}/request-edit`,
        { reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Đã gửi yêu cầu chỉnh sửa đến admin');
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi gửi yêu cầu');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: { text: 'Nháp', class: 'badge-draft', icon: FaFileAlt },
      pending: { text: 'Chờ duyệt', class: 'badge-pending', icon: FaClock },
      approved: { text: 'Đã duyệt', class: 'badge-approved', icon: FaCheckCircle },
      rejected: { text: 'Từ chối', class: 'badge-rejected', icon: FaTimesCircle },
      hidden: { text: 'Đã ẩn', class: 'badge-hidden', icon: FaEyeSlash },
      request_edit: { text: 'Yêu cầu sửa', class: 'badge-request', icon: FaExclamationTriangle }
    };
    const badge = badges[status] || { text: status, class: 'badge-draft', icon: FaInfoCircle };
    const Icon = badge.icon;
    return (
      <span className={`badge ${badge.class}`}>
        <Icon className="badge-icon" />
        {badge.text}
      </span>
    );
  };

  const tabs = [
    { id: 'all', label: 'Tất cả bài viết', icon: FaNewspaper, count: stats.total || 0 },
    { id: 'pending', label: 'Chờ duyệt', icon: FaClock, count: stats.pending || 0 },
    { id: 'request_edit', label: 'Yêu cầu chỉnh sửa', icon: FaEdit, count: 0 },
    { id: 'approved', label: 'Đã duyệt', icon: FaCheck, count: stats.approved || 0 },
    { id: 'rejected', label: 'Từ chối', icon: FaBan, count: stats.rejected || 0 },
    { id: 'medicine', label: 'Thuốc', icon: FaPills, count: 0 },
    { id: 'disease', label: 'Bệnh lý', icon: FaDisease, count: 0 }
  ];

  if (loading && articles.length === 0) {
    return (
      <div className="loading-container">
        <FaSpinner className="spinner" />
        <p>Đang tải dữ liệu...</p>
      </div>
    );
  }

  return (
    <div className="article-management">
      <div className="page-header">
        <div className="header-info">
          <h1>Quản lý Bài viết</h1>
          <div className="quick-stats">
            <div className="stat-item">
              <span className="stat-label">Tổng bài viết:</span>
              <span className="stat-value">{stats.total || 0}</span>
            </div>
            {user.role === 'admin' && (
              <>
                <div className="stat-item">
                  <span className="stat-label">Chờ duyệt:</span>
                  <span className="stat-value highlight">{stats.pending || 0}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Đã duyệt:</span>
                  <span className="stat-value success">{stats.approved || 0}</span>
                </div>
              </>
            )}
          </div>
        </div>
        {['admin', 'staff', 'doctor'].includes(user.role) && (
          <button className="btn btn-primary" onClick={() => openModal('create')}>
            <FaPlus /> Tạo bài viết mới
          </button>
        )}
      </div>

      <div className="tabs-container">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            >
              <Icon className="tab-icon" />
              <span className="tab-label">{tab.label}</span>
              {tab.count > 0 && (
                <span className="tab-badge">{tab.count}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="filters-panel">
        <div className="filters-header">
          <h3>
            <FaFilter /> Bộ lọc nâng cao
          </h3>
          <button className="btn-clear" onClick={clearFilters}>
            <FaTimes /> Xóa lọc
          </button>
        </div>

        <div className="filters-grid">
          <div className="filter-item">
            <label>Tìm kiếm</label>
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Tìm theo tiêu đề, nội dung..."
              />
            </div>
          </div>

          <div className="filter-item">
            <label>Danh mục</label>
            <select
              name="category_id"
              value={filters.category_id}
              onChange={handleFilterChange}
            >
              <option value="">Tất cả danh mục</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="filter-item">
            <label>Từ ngày</label>
            <input
              type="date"
              name="date_from"
              value={filters.date_from}
              onChange={handleFilterChange}
            />
          </div>

          <div className="filter-item">
            <label>Đến ngày</label>
            <input
              type="date"
              name="date_to"
              value={filters.date_to}
              onChange={handleFilterChange}
            />
          </div>

          <div className="filter-item">
            <label>Lượt xem tối thiểu</label>
            <input
              type="number"
              name="min_views"
              value={filters.min_views}
              onChange={handleFilterChange}
              placeholder="0"
              min="0"
            />
          </div>

          <div className="filter-item">
            <label>Số bài/trang</label>
            <select name="limit" value={filters.limit} onChange={handleFilterChange}>
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>
      </div>

      <div className="table-container">
        <table className="articles-table">
          <thead>
            <tr>
              <th onClick={() => toggleSort('id')} className="sortable">
                ID {filters.sort_by === 'id' && (filters.sort_order === 'ASC' ? <FaSortAmountUp /> : <FaSortAmountDown />)}
              </th>
              <th onClick={() => toggleSort('title')} className="sortable">
                Tiêu đề {filters.sort_by === 'title' && (filters.sort_order === 'ASC' ? <FaSortAmountUp /> : <FaSortAmountDown />)}
              </th>
              <th>Danh mục</th>
              {user.role === 'admin' && <th>Tác giả</th>}
              <th>Trạng thái</th>
              <th onClick={() => toggleSort('views')} className="sortable">
                Thống kê {filters.sort_by === 'views' && (filters.sort_order === 'ASC' ? <FaSortAmountUp /> : <FaSortAmountDown />)}
              </th>
              <th onClick={() => toggleSort('created_at')} className="sortable">
                Ngày tạo {filters.sort_by === 'created_at' && (filters.sort_order === 'ASC' ? <FaSortAmountUp /> : <FaSortAmountDown />)}
              </th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {articles.length === 0 ? (
              <tr>
                <td colSpan="8" className="empty-state">
                  <FaInfoCircle /> Không có bài viết nào
                </td>
              </tr>
            ) : (
              articles.map(article => (
                <tr key={article.id}>
                  <td>{article.id}</td>
                  <td className="title-cell">
                    <a
                      href={`/articles/${article.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="article-link"
                    >
                      <strong>{article.title}</strong>
                      <FaExternalLinkAlt className="link-icon" />
                    </a>
                  </td>
                  <td>{article.Category?.name || '-'}</td>
                  {user.role === 'admin' && (
                    <td>{article.author?.full_name || '-'}</td>
                  )}
                  <td>{getStatusBadge(article.status)}</td>
                  <td>
                    <div className="stats-cell">
                      <span><FaEye /> {article.views || 0}</span>
                      <span><FaThumbsUp /> {article.likes || 0}</span>
                      <span><FaShareAlt /> {article.shares || 0}</span>
                    </div>
                  </td>
                  <td>{new Date(article.created_at).toLocaleDateString('vi-VN')}</td>
                  <td>
                    <div className="actions-cell">
                      {user.role === 'admin' && (
                        <>
                          {article.status === 'pending' && (
                            <button
                              onClick={() => openModal('review', article)}
                              className="btn-action btn-approve"
                              title="Phê duyệt"
                            >
                              <FaCheck />
                            </button>
                          )}
                          <button
                            onClick={() => openModal('edit', article)}
                            className="btn-action btn-edit"
                            title="Chỉnh sửa"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => handleToggleVisibility(article.id, article.status)}
                            className="btn-action btn-visibility"
                            title={article.status === 'hidden' ? 'Hiện' : 'Ẩn'}
                          >
                            {article.status === 'hidden' ? <FaEye /> : <FaEyeSlash />}
                          </button>
                          <button
                            onClick={() => handleDelete(article.id, article.title)}
                            className="btn-action btn-delete"
                            title="Xóa"
                          >
                            <FaTrash />
                          </button>
                        </>
                      )}

                      {user.role === 'staff' && (
                        <>
                          {article.status === 'draft' && (
                            <button
                              onClick={() => openModal('edit', article)}
                              className="btn-action btn-edit"
                              title="Sửa"
                            >
                              <FaEdit />
                            </button>
                          )}
                          {['approved', 'hidden'].includes(article.status) && (
                            <button
                              onClick={() => handleRequestEdit(article.id)}
                              className="btn-action btn-request"
                              title="Yêu cầu sửa"
                            >
                              <FaInfoCircle />
                            </button>
                          )}
                        </>
                      )}
                    </div>
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
            className="btn-page"
            onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
            disabled={filters.page === 1}
          >
            Trước
          </button>

          <div className="page-numbers">
            {[...Array(pagination.totalPages)].map((_, i) => (
              <button
                key={i + 1}
                className={`btn-page ${filters.page === i + 1 ? 'active' : ''}`}
                onClick={() => setFilters(prev => ({ ...prev, page: i + 1 }))}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button
            className="btn-page"
            onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
            disabled={filters.page === pagination.totalPages}
          >
            Sau
          </button>
        </div>
      )}

      {showModal && !showPreview && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modalType === 'create' ? 'Tạo bài viết mới' : 'Chỉnh sửa bài viết'}</h2>
              <button className="btn-close" onClick={closeModal}>
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-group">
                <label>
                  <FaFileAlt /> Tiêu đề <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Nhập tiêu đề bài viết"
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  <FaTable /> Danh mục
                </label>
                <select
                  value={formData.category_id}
                  onChange={e => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
                >
                  <option value="">-- Chọn danh mục --</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      [{cat.category_type}] {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>
                  <FaEdit /> Nội dung <span className="required">*</span>
                </label>
                <textarea
                  value={formData.content}
                  onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  rows="15"
                  required
                  placeholder="Nhập nội dung bài viết (hỗ trợ HTML)"
                />
                <small className="form-hint">
                  <FaInfoCircle /> Hỗ trợ các thẻ HTML: h1-h6, p, strong, em, u, ul, ol, li, a, img, table, etc.
                </small>
              </div>

              <div className="form-group">
                <label>
                  <FaTag /> Tags
                </label>
                <div className="tags-container">
                  {formData.tags_json.map((tag, idx) => (
                    <span key={idx} className="tag-item">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="tag-remove"
                      >
                        <FaTimes />
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  value={tagInput}
                  onChange={handleTagInputChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && tagInput.trim()) {
                      e.preventDefault();
                      addTag(tagInput.trim());
                    }
                  }}
                  placeholder="Nhập tag và nhấn Enter..."
                />
                {suggestedTags.length > 0 && (
                  <div className="tags-suggest">
                    <small>Gợi ý:</small>
                    {suggestedTags.map((tag, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => addTag(tag)}
                        className="tag-suggest-item"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>
                  <FaLink /> Nguồn (nếu có)
                </label>
                <input
                  type="text"
                  value={formData.source}
                  onChange={e => setFormData(prev => ({ ...prev, source: e.target.value }))}
                  placeholder="https://example.com/article"
                />
              </div>

              {user.role === 'admin' && modalType === 'edit' && (
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={hideOnEdit}
                      onChange={e => setHideOnEdit(e.target.checked)}
                    />
                    <span>Ẩn bài viết sau khi cập nhật</span>
                  </label>
                </div>
              )}

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreview(true)}
                  className="btn btn-preview"
                >
                  <FaEye /> Xem trước
                </button>
                <button type="submit" className="btn btn-primary">
                  {modalType === 'create' ? 'Tạo bài viết' : 'Cập nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPreview && (
        <div className="modal-overlay" onClick={() => modalType === 'review' ? closeModal() : setShowPreview(false)}>
          <div className="modal-dialog modal-preview" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Xem trước bài viết</h2>
              <button className="btn-close" onClick={() => modalType === 'review' ? closeModal() : setShowPreview(false)}>
                <FaTimes />
              </button>
            </div>

            <div className="modal-body">
              <article className="article-preview">
                <h1 className="article-title">
                  {modalType === 'review' ? selectedArticle?.title : formData.title}
                </h1>
                
                <div className="article-meta">
                  <span className="meta-item">
                    <FaUser />
                    {modalType === 'review' ? selectedArticle?.author?.full_name : user.full_name}
                  </span>
                  <span className="meta-item">
                    <FaCalendar />
                    {new Date().toLocaleDateString('vi-VN', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </span>
                  {(modalType === 'review' ? selectedArticle?.Category : categories.find(c => c.id === parseInt(formData.category_id))) && (
                    <span className="meta-category">
                      {modalType === 'review' ? selectedArticle?.Category?.name : categories.find(c => c.id === parseInt(formData.category_id))?.name}
                    </span>
                  )}
                </div>

                {((modalType === 'review' ? selectedArticle?.tags_json : formData.tags_json) || []).length > 0 && (
                  <div className="article-tags">
                    {(modalType === 'review' ? selectedArticle?.tags_json : formData.tags_json).map((tag, idx) => (
                      <span key={idx} className="preview-tag">
                        <FaTag /> {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div 
                  className="article-content"
                  dangerouslySetInnerHTML={{ 
                    __html: modalType === 'review' ? selectedArticle?.content : formData.content 
                  }}
                />

                {(modalType === 'review' ? selectedArticle?.source : formData.source) && (
                  <div className="article-source">
                    <FaLink />
                    <span>Nguồn: </span>
                    <a 
                      href={modalType === 'review' ? selectedArticle?.source : formData.source}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {modalType === 'review' ? selectedArticle?.source : formData.source}
                    </a>
                  </div>
                )}

                <div className="article-actions">
                  <button className="action-btn action-like">
                    <FaThumbsUp /> Thích
                  </button>
                  <button className="action-btn action-share">
                    <FaShareAlt /> Chia sẻ
                  </button>
                  <button className="action-btn action-save">
                    <FaBookmark /> Lưu
                  </button>
                </div>
              </article>

              {modalType === 'review' && user.role === 'admin' && selectedArticle?.status === 'pending' && (
                <div className="review-actions">
                  <h3>Phê duyệt bài viết</h3>
                  <div className="review-buttons">
                    <button
                      onClick={() => handleReviewArticle(selectedArticle.id, 'approve')}
                      className="btn btn-approve"
                    >
                      <FaCheck /> Phê duyệt
                    </button>
                    <button
                      onClick={() => {
                        const reason = prompt('Nhập lý do yêu cầu viết lại:');
                        if (reason) handleReviewArticle(selectedArticle.id, 'rewrite', reason);
                      }}
                      className="btn btn-rewrite"
                    >
                      <FaRedo /> Yêu cầu viết lại
                    </button>
                    <button
                      onClick={() => {
                        const reason = prompt('Nhập lý do từ chối:');
                        if (reason) handleReviewArticle(selectedArticle.id, 'reject', reason);
                      }}
                      className="btn btn-reject"
                    >
                      <FaBan /> Từ chối
                    </button>
                  </div>
                </div>
              )}

              {modalType !== 'review' && (
                <div className="modal-footer">
                  <button
                    onClick={() => setShowPreview(false)}
                    className="btn btn-secondary"
                  >
                    Đóng xem trước
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArticleManagementPage;