import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { 
  FaPlus, FaEdit, FaTrash, FaEye, FaEyeSlash, FaSearch, FaTimes, 
  FaThumbsUp, FaShareAlt, FaFilter, FaSortAmountDown, FaSortAmountUp,
  FaCheck, FaBan, FaRedo, FaInfoCircle, FaExternalLinkAlt, FaClock,
  FaBookmark, FaNewspaper, FaPills, FaDisease, FaUser, FaCalendar,
  FaTag, FaLink, FaExclamationTriangle, FaCheckCircle, FaTimesCircle,
  FaSpinner, FaFileAlt, FaTable, FaFlask, FaHospital, FaCopy
} from 'react-icons/fa';
import './ArticleManagementPage.css';

const ArticleManagementPage = () => {
  const API_BASE_URL = 'http://localhost:3001';
  const editorRef = useRef(null);
  
  const [user, setUser] = useState({});
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [hideOnEdit, setHideOnEdit] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [uploadingImage, setUploadingImage] = useState(false);
  
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
    source: '',
    // Medical fields for medicines
    composition: '',
    uses: '',
    side_effects: '',
    manufacturer: '',
    // Medical fields for diseases
    symptoms: '',
    treatments: '',
    description: ''
  });

  const [pagination, setPagination] = useState({});
  const [stats, setStats] = useState({});
  const [tagInput, setTagInput] = useState('');
  const [suggestedTags, setSuggestedTags] = useState([]);
  const [selectedCategoryType, setSelectedCategoryType] = useState('');

  // CKEditor configuration with full features
  const editorConfig = {
    toolbar: {
      items: [
        'heading', '|',
        'bold', 'italic', 'underline', 'strikethrough', '|',
        'fontSize', 'fontFamily', 'fontColor', 'fontBackgroundColor', '|',
        'bulletedList', 'numberedList', '|',
        'outdent', 'indent', '|',
        'alignment', '|',
        'link', 'insertTable', 'blockQuote', 'code', 'codeBlock', '|',
        'undo', 'redo'
      ]
    },
    fontSize: {
      options: [9, 11, 13, 'default', 17, 19, 21, 23, 25, 27, 29]
    },
    fontFamily: {
      options: [
        'default',
        'Arial, Helvetica, sans-serif',
        'Courier New, Courier, monospace',
        'Georgia, serif',
        'Times New Roman, Times, serif',
        'Verdana, Geneva, sans-serif'
      ]
    },
    table: {
      contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells', 'tableProperties', 'tableCellProperties']
    },
    image: {
      toolbar: [
        'imageTextAlternative', 'imageStyle:inline', 'imageStyle:block', 
        'imageStyle:side', '|', 'toggleImageCaption', 'imageResize'
      ],
      upload: {
        types: ['jpeg', 'png', 'gif', 'bmp', 'webp', 'svg+xml']
      }
    },
    language: 'vi'
  };

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
        const cats = response.data.categories || [];
        setCategories(cats.filter(c => !c.parent_id));
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchSubcategories = async (parentId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/categories/${parentId}/subcategories`);
      if (response.data.success) {
        setSubcategories(response.data.subcategories || []);
      }
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      setSubcategories([]);
    }
  };

  const handleCategoryChange = (categoryId) => {
    const category = categories.find(c => c.id === parseInt(categoryId));
    if (category) {
      setSelectedCategoryType(category.category_type);
      fetchSubcategories(categoryId);
      setFormData(prev => ({ ...prev, category_id: categoryId }));
    } else {
      setSelectedCategoryType('');
      setSubcategories([]);
    }
  };

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      let queryFilters = { ...filters };

      if (activeTab === 'pending') queryFilters.status = 'pending';
      else if (activeTab === 'request_edit') queryFilters.status = 'request_edit';
      else if (activeTab === 'approved') queryFilters.status = 'approved';
      else if (activeTab === 'rejected') queryFilters.status = 'rejected';
      else if (activeTab === 'medicine') queryFilters.entity_type = 'medicine';
      else if (activeTab === 'disease') queryFilters.entity_type = 'disease';

      if (user.role === 'staff') {
        queryFilters.author_id = user.id;
      }

      const params = new URLSearchParams(
        Object.entries(queryFilters).filter(([_, v]) => v !== '')
      ).toString();

      const response = await axios.get(`${API_BASE_URL}/api/articles?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setArticles(response.data.articles || []);
        setPagination(response.data.pagination || {});
        setStats(response.data.stats || {});
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

  const handleSortChange = (field) => {
    setFilters(prev => ({
      ...prev,
      sort_by: field,
      sort_order: prev.sort_by === field && prev.sort_order === 'DESC' ? 'ASC' : 'DESC',
      page: 1
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const openModal = async (type, article = null) => {
    setModalType(type);
    setShowModal(true);
    setHideOnEdit(false);

    if (article) {
      const response = await axios.get(`${API_BASE_URL}/api/articles/${article.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.data.success) {
        const art = response.data.article;
        setSelectedArticle(art);
        setFormData({
          title: art.title,
          content: art.content,
          category_id: art.category_id,
          tags_json: art.tags_json || [],
          source: art.source,
          composition: art.medicine?.composition || '',
          uses: art.medicine?.uses || '',
          side_effects: art.medicine?.side_effects || '',
          manufacturer: art.medicine?.manufacturer || '',
          symptoms: art.disease?.symptoms || '',
          treatments: art.disease?.treatments || '',
          description: art.medicine?.description || art.disease?.description || ''
        });
        setSelectedCategoryType(art.Category?.category_type || '');
        if (art.category_id) fetchSubcategories(art.category_id);
      }
    } else {
      setSelectedArticle(null);
      setFormData({
        title: '',
        content: '',
        category_id: '',
        tags_json: [],
        source: '',
        composition: '',
        uses: '',
        side_effects: '',
        manufacturer: '',
        symptoms: '',
        treatments: '',
        description: ''
      });
      setSelectedCategoryType('');
      setSubcategories([]);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedArticle(null);
    setFormData({
      title: '',
      content: '',
      category_id: '',
      tags_json: [],
      source: '',
      composition: '',
      uses: '',
      side_effects: '',
      manufacturer: '',
      symptoms: '',
      treatments: '',
      description: ''
    });
    setTagInput('');
    setSuggestedTags([]);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleContentChange = (event, editor) => {
    const data = editor.getData();
    setFormData(prev => ({ ...prev, content: data }));
  };

  const addTag = (tag) => {
    if (tag && !formData.tags_json.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags_json: [...prev.tags_json, tag]
      }));
    }
    setTagInput('');
    setSuggestedTags([]);
  };

  const removeTag = (index) => {
    setFormData(prev => ({
      ...prev,
      tags_json: prev.tags_json.filter((_, i) => i !== index)
    }));
  };

  const fetchSuggestedTags = async (input) => {
    if (!input) {
      setSuggestedTags([]);
      return;
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/api/articles/tags/suggest?query=${input}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.data.success) {
        setSuggestedTags(response.data.tags || []);
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => fetchSuggestedTags(tagInput), 300);
    return () => clearTimeout(timeout);
  }, [tagInput]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const data = { ...formData, hideAfterEdit: hideOnEdit };

      let response;
      if (modalType === 'create') {
        response = await axios.post(`${API_BASE_URL}/api/articles`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else if (modalType === 'edit') {
        response = await axios.put(`${API_BASE_URL}/api/articles/${selectedArticle.id}`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      if (response.data.success) {
        closeModal();
        fetchArticles();
      }
    } catch (error) {
      console.error('Error submitting article:', error);
    }
  };

  const handleDeleteArticle = async (id) => {
    if (!window.confirm('Bạn chắc chắn muốn xóa bài viết này?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`${API_BASE_URL}/api/articles/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        fetchArticles();
      }
    } catch (error) {
      console.error('Error deleting article:', error);
    }
  };

  const handleHideArticle = async (id, hide) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_BASE_URL}/api/articles/${id}/hide`, { hide }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        fetchArticles();
      }
    } catch (error) {
      console.error('Error hiding article:', error);
    }
  };

  const handleReviewArticle = async (id, action, reason = '') => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_BASE_URL}/api/articles/${id}/review`, { action, reason }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        closeModal();
        fetchArticles();
      }
    } catch (error) {
      console.error('Error reviewing article:', error);
    }
  };

  const handleRequestEdit = async (id) => {
    const reason = prompt('Nhập lý do yêu cầu chỉnh sửa:');
    if (!reason) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_BASE_URL}/api/articles/${id}/request-edit`, { reason }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        fetchArticles();
      }
    } catch (error) {
      console.error('Error requesting edit:', error);
    }
  };

  const handleDuplicateArticle = async (id) => {
    if (!window.confirm('Bạn chắc chắn muốn nhân bản bài viết này?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_BASE_URL}/api/articles/${id}/duplicate`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        fetchArticles();
      }
    } catch (error) {
      console.error('Error duplicating article:', error);
    }
  };

  const handleAllowEdit = async (id) => {
    if (!window.confirm('Cho phép chỉnh sửa bài viết này?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_BASE_URL}/api/articles/${id}/allow-edit`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        fetchArticles();
      }
    } catch (error) {
      console.error('Error allowing edit:', error);
    }
  };
  
  // THÊM: Validation file size
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const handleFileUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // THÊM: Kiểm tra dung lượng
  if (file.size > MAX_FILE_SIZE) {
    alert(`File quá lớn! Vui lòng chọn file nhỏ hơn ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    e.target.value = ''; // Reset input
    return;
  }

  try {
    if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      setFormData(prev => ({ ...prev, content: result.value }));
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const html = XLSX.utils.sheet_to_html(worksheet);
      setFormData(prev => ({ ...prev, content: html }));
    }
  } catch (error) {
    console.error('Error uploading file:', error);
    alert('Lỗi khi xử lý file. Vui lòng thử lại.');
  }
};

  const getStatusBadge = (status) => {
    const badges = {
      draft: { color: 'gray', icon: FaFileAlt, label: 'Nháp' },
      pending: { color: 'blue', icon: FaClock, label: 'Chờ duyệt' },
      approved: { color: 'green', icon: FaCheckCircle, label: 'Đã duyệt' },
      rejected: { color: 'red', icon: FaTimesCircle, label: 'Từ chối' },
      hidden: { color: 'orange', icon: FaEyeSlash, label: 'Ẩn' },
      request_edit: { color: 'purple', icon: FaRedo, label: 'Yêu cầu sửa' },
      request_rewrite: { color: 'yellow', icon: FaExclamationTriangle, label: 'Yêu cầu viết lại' }
    };
    return badges[status] || { color: 'gray', icon: FaInfoCircle, label: status };
  };

  const StatusBadge = ({ status }) => {
    const { color, icon: Icon, label } = getStatusBadge(status);
    return (
      <span className={`status-badge status-${color}`}>
        <Icon /> {label}
      </span>
    );
  };

  const getCategoryIcon = (type) => {
    const icons = {
      thuoc: FaPills,
      benh_ly: FaDisease,
      tin_tuc: FaNewspaper
    };
    return icons[type] || FaFileAlt;
  };

  return (
    <div className="article-management">
      <div className="page-header">
        <div className="header-info">
          <h1>Quản lý bài viết</h1>
          <div className="quick-stats">
            <div className="stat-item">
              <span className="stat-label">Tổng bài viết</span>
              <span className="stat-value">{pagination.totalItems || 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Chờ duyệt</span>
              <span className="stat-value highlight">{stats.pending || 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Đã duyệt</span>
              <span className="stat-value success">{stats.approved || 0}</span>
            </div>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => openModal('create')}>
          <FaPlus /> Tạo bài viết mới
        </button>
      </div>

      <div className="tabs-container">
        {[
          { id: 'all', label: 'Tất cả', icon: FaNewspaper, count: pagination.totalItems },
          { id: 'pending', label: 'Chờ duyệt', icon: FaClock, count: stats.pending },
          { id: 'approved', label: 'Đã duyệt', icon: FaCheck, count: stats.approved },
          { id: 'rejected', label: 'Từ chối', icon: FaBan, count: stats.rejected },
          { id: 'request_edit', label: 'Yêu cầu sửa', icon: FaRedo, count: stats.request_edit },
          { id: 'medicine', label: 'Thuốc', icon: FaPills },
          { id: 'disease', label: 'Bệnh lý', icon: FaDisease }
        ].map(tab => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon className="tab-icon" />
            <span className="tab-label">{tab.label}</span>
            {tab.count > 0 && <span className="tab-badge">{tab.count}</span>}
          </button>
        ))}
      </div>

      <div className="filters-panel">
        <div className="filters-header">
          <h3><FaFilter /> Bộ lọc</h3>
          <button className="btn-clear" onClick={() => setFilters({
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
          })}>
            <FaTimes /> Xóa bộ lọc
          </button>
        </div>

        <div className="filters-grid">
          <div className="filter-group">
            <label>Tìm kiếm</label>
            <div className="input-group">
              <FaSearch />
              <input
                type="text"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Tìm theo tiêu đề hoặc nội dung..."
              />
            </div>
          </div>

          <div className="filter-group">
            <label>Trạng thái</label>
            <select name="status" value={filters.status} onChange={handleFilterChange}>
              <option value="">Tất cả</option>
              <option value="draft">Nháp</option>
              <option value="pending">Chờ duyệt</option>
              <option value="approved">Đã duyệt</option>
              <option value="rejected">Từ chối</option>
              <option value="hidden">Ẩn</option>
              <option value="request_edit">Yêu cầu sửa</option>
              <option value="request_rewrite">Yêu cầu viết lại</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Danh mục</label>
            <select name="category_id" value={filters.category_id} onChange={handleFilterChange}>
              <option value="">Tất cả</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Loại danh mục</label>
            <select name="category_type" value={filters.category_type} onChange={handleFilterChange}>
              <option value="">Tất cả</option>
              <option value="thuoc">Thuốc</option>
              <option value="benh_ly">Bệnh lý</option>
              <option value="tin_tuc">Bài viết</option>
            </select>
          </div>

          {user.role === 'admin' && (
            <div className="filter-group">
              <label>Tác giả</label>
              <input
                type="text"
                name="author_id"
                value={filters.author_id}
                onChange={handleFilterChange}
                placeholder="ID tác giả"
              />
            </div>
          )}

          <div className="filter-group">
            <label>Từ ngày</label>
            <input type="date" name="date_from" value={filters.date_from} onChange={handleFilterChange} />
          </div>

          <div className="filter-group">
            <label>Đến ngày</label>
            <input type="date" name="date_to" value={filters.date_to} onChange={handleFilterChange} />
          </div>

          <div className="filter-group">
            <label>Lượt xem tối thiểu</label>
            <input
              type="number"
              name="min_views"
              value={filters.min_views}
              onChange={handleFilterChange}
              placeholder="0"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <FaSpinner className="spinner" />
          <p>Đang tải dữ liệu...</p>
        </div>
      ) : articles.length === 0 ? (
        <div className="empty-state">
          <FaFileAlt size={64} color="#94a3b8" />
          <h3>Không có bài viết nào</h3>
          <p>Hãy tạo bài viết mới để bắt đầu.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="articles-table">
            <thead>
              <tr>
                <th onClick={() => handleSortChange('title')}>
                  Tiêu đề
                  {filters.sort_by === 'title' && (
                    filters.sort_order === 'DESC' ? <FaSortAmountDown /> : <FaSortAmountUp />
                  )}
                </th>
                <th onClick={() => handleSortChange('Category.name')}>
                  Danh mục
                  {filters.sort_by === 'Category.name' && (
                    filters.sort_order === 'DESC' ? <FaSortAmountDown /> : <FaSortAmountUp />
                  )}
                </th>
                <th onClick={() => handleSortChange('author.full_name')}>
                  Tác giả
                  {filters.sort_by === 'author.full_name' && (
                    filters.sort_order === 'DESC' ? <FaSortAmountDown /> : <FaSortAmountUp />
                  )}
                </th>
                <th onClick={() => handleSortChange('created_at')}>
                  Ngày tạo
                  {filters.sort_by === 'created_at' && (
                    filters.sort_order === 'DESC' ? <FaSortAmountDown /> : <FaSortAmountUp />
                  )}
                </th>
                <th onClick={() => handleSortChange('views')}>
                  Lượt xem
                  {filters.sort_by === 'views' && (
                    filters.sort_order === 'DESC' ? <FaSortAmountDown /> : <FaSortAmountUp />
                  )}
                </th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {articles.map(article => (
                <tr key={article.id}>
                  <td className="title-cell">
                    <div className="title-wrapper">
                      {article.entity_type === 'medicine' && <FaPills className="entity-icon medicine" />}
                      {article.entity_type === 'disease' && <FaDisease className="entity-icon disease" />}
                      {article.entity_type === 'article' && <FaNewspaper className="entity-icon article" />}
                      <span className="article-title-text">{article.title}</span>
                    </div>
                    {article.tags_json?.length > 0 && (
                      <div className="tags-list">
                        {article.tags_json.slice(0, 3).map((tag, idx) => (
                          <span key={idx} className="tag"><FaTag /> {tag}</span>
                        ))}
                        {article.tags_json.length > 3 && <span className="tag-more">+{article.tags_json.length - 3}</span>}
                      </div>
                    )}
                  </td>
                  <td>
                    {article.Category && (
                      <span className="category-badge">
                        <getCategoryIcon type={article.Category.category_type} />
                        {article.Category.name}
                      </span>
                    )}
                  </td>
                  <td>{article.author?.full_name}</td>
                  <td>{new Date(article.created_at).toLocaleDateString('vi-VN')}</td>
                  <td>
                    <div className="views-stats">
                      <span><FaEye /> {article.views}</span>
                      <span><FaThumbsUp /> {article.likes || 0}</span>
                      <span><FaShareAlt /> {article.shares || 0}</span>
                    </div>
                  </td>
                  <td><StatusBadge status={article.status} /></td>
                  <td className="actions-cell">
                    <div className="article-actions">
                      <button className="btn-action view" onClick={() => openModal('review', article)} title="Xem chi tiết">
                        <FaEye />
                      </button>
                      {(user.role !== 'staff' || article.author_id === user.id || article.status === 'request_edit') && (
                        <button className="btn-action edit" onClick={() => openModal('edit', article)} title="Chỉnh sửa">
                          <FaEdit />
                        </button>
                      )}
                      {user.role === 'admin' && (
                        <>
                          <button 
                            className="btn-action" 
                            onClick={() => handleHideArticle(article.id, article.status !== 'hidden')} 
                            title={article.status === 'hidden' ? 'Hiện bài viết' : 'Ẩn bài viết'}
                          >
                            {article.status === 'hidden' ? <FaEye /> : <FaEyeSlash />}
                          </button>
                          <button className="btn-action delete" onClick={() => handleDeleteArticle(article.id)} title="Xóa">
                            <FaTrash />
                          </button>
                        </>
                      )}
                      {user.role !== 'admin' && article.status === 'approved' && (
                        <button className="btn-action" onClick={() => handleRequestEdit(article.id)} title="Yêu cầu chỉnh sửa">
                          <FaRedo />
                        </button>
                      )}
                      <button className="btn-action" onClick={() => handleDuplicateArticle(article.id)} title="Nhân bản">
                        <FaCopy />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pagination">
            <button 
              className="btn-page" 
              disabled={pagination.currentPage === 1} 
              onClick={() => handlePageChange(1)}
            >
              «
            </button>
            <button 
              className="btn-page" 
              disabled={pagination.currentPage === 1} 
              onClick={() => handlePageChange(pagination.currentPage - 1)}
            >
              ‹
            </button>
            <div className="page-numbers">
              {[...Array(pagination.totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  className={`btn-page ${pagination.currentPage === i + 1 ? 'active' : ''}`}
                  onClick={() => handlePageChange(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button 
              className="btn-page" 
              disabled={pagination.currentPage === pagination.totalPages} 
              onClick={() => handlePageChange(pagination.currentPage + 1)}
            >
              ›
            </button>
            <button 
              className="btn-page" 
              disabled={pagination.currentPage === pagination.totalPages} 
              onClick={() => handlePageChange(pagination.totalPages)}
            >
              »
            </button>
          </div>
        </div>
      )}

      {showModal && (modalType === 'create' || modalType === 'edit') && (
  <div className="modal-overlay" onClick={closeModal}>
    {/* SỬA: Thêm class modal-split để chia 2 cột */}
    <div className="modal-dialog modal-split" onClick={e => e.stopPropagation()}>
      
      {/* Cột TRÁI: Form */}
      <div className="modal-form-side">
        <div className="modal-header">
          <h2>{modalType === 'create' ? 'Tạo bài viết mới' : 'Chỉnh sửa bài viết'}</h2>
          <button className="btn-close" onClick={closeModal}><FaTimes /></button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body compact-form">
          {/* Các form fields giữ nguyên */}
          
          {/* THÊM: Hiển thị giới hạn file */}
          <div className="form-group">
            <label>Tải lên file (Tối đa 10MB)</label>
            <input 
              type="file" 
              accept=".docx,.xlsx" 
              onChange={handleFileUpload} 
            />
            <small className="form-hint">Hỗ trợ: .docx, .xlsx (Max: 10MB)</small>
          </div>

          {/* Các fields khác giữ nguyên... */}
          
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={closeModal}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary">
              {modalType === 'create' ? 'Tạo bài viết' : 'Cập nhật'}
            </button>
          </div>
        </form>
      </div>

      {/* Cột PHẢI: Preview */}
      <div className="modal-preview-side">
        <div className="modal-header">
          <h2>Xem trước</h2>
        </div>
        <div className="modal-body">
          <article className="article-preview">
            <h1 className="article-title">{formData.title || 'Tiêu đề bài viết'}</h1>
            
            <div className="article-meta">
              <span className="meta-item">
                <FaUser /> {user.full_name}
              </span>
              <span className="meta-item">
                <FaCalendar /> {new Date().toLocaleDateString('vi-VN', { 
                  year: 'numeric', month: 'long', day: 'numeric' 
                })}
              </span>
              {formData.category_id && (
                <span className="meta-category">
                  {categories.find(c => c.id === parseInt(formData.category_id))?.name}
                </span>
              )}
            </div>

            {formData.tags_json.length > 0 && (
              <div className="article-tags">
                {formData.tags_json.map((tag, idx) => (
                  <span key={idx} className="preview-tag"><FaTag /> {tag}</span>
                ))}
              </div>
            )}

            <div 
              className="article-content" 
              dangerouslySetInnerHTML={{ 
                __html: formData.content || '<p>Nội dung bài viết sẽ hiển thị ở đây...</p>' 
              }} 
            />

            {/* THÊM: Preview medical fields */}
            {selectedCategoryType === 'thuoc' && (
              <div className="medicine-details">
                <h2>Thành phần</h2>
                <p>{formData.composition || 'Chưa có thông tin'}</p>
                <h2>Công dụng</h2>
                <p>{formData.uses || 'Chưa có thông tin'}</p>
                <h2>Tác dụng phụ</h2>
                <p>{formData.side_effects || 'Chưa có thông tin'}</p>
                <h2>Nhà sản xuất</h2>
                <p>{formData.manufacturer || 'Chưa có thông tin'}</p>
              </div>
            )}

            {selectedCategoryType === 'benh_ly' && (
              <div className="disease-details">
                <h2>Triệu chứng</h2>
                <p>{formData.symptoms || 'Chưa có thông tin'}</p>
                <h2>Điều trị</h2>
                <p>{formData.treatments || 'Chưa có thông tin'}</p>
                <h2>Mô tả</h2>
                <p>{formData.description || 'Chưa có thông tin'}</p>
              </div>
            )}

            {formData.source && (
              <div className="article-source">
                <FaLink />
                <span>Nguồn: </span>
                <a href={formData.source} target="_blank" rel="noopener noreferrer">
                  {formData.source}
                </a>
              </div>
            )}
          </article>
        </div>
      </div>
    </div>
  </div>
)}

      {showModal && modalType === 'review' && selectedArticle && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-dialog modal-preview" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Phê duyệt bài viết</h2>
              <button className="btn-close" onClick={closeModal}><FaTimes /></button>
            </div>

            <div className="modal-body">
              <article className="article-preview">
                <h1 className="article-title">{selectedArticle.title}</h1>
                
                <div className="article-meta">
                  <span className="meta-item"><FaUser /> {selectedArticle.author?.full_name}</span>
                  <span className="meta-item"><FaCalendar /> {new Date(selectedArticle.created_at).toLocaleDateString('vi-VN')}</span>
                  {selectedArticle.Category && <span className="meta-category">{selectedArticle.Category.name}</span>}
                </div>

                {selectedArticle.tags_json?.length > 0 && (
                  <div className="article-tags">
                    {selectedArticle.tags_json.map((tag, idx) => (
                      <span key={idx} className="preview-tag"><FaTag /> {tag}</span>
                    ))}
                  </div>
                )}

                <div className="article-content" dangerouslySetInnerHTML={{ __html: selectedArticle.content }} />

                {selectedArticle.medicine && (
                  <div className="medicine-details">
                    <h2>Thành phần</h2>
                    <p>{selectedArticle.medicine.composition}</p>
                    <h2>Công dụng</h2>
                    <p>{selectedArticle.medicine.uses}</p>
                    <h2>Tác dụng phụ</h2>
                    <p>{selectedArticle.medicine.side_effects}</p>
                    <h2>Nhà sản xuất</h2>
                    <p>{selectedArticle.medicine.manufacturer}</p>
                  </div>
                )}

                {selectedArticle.disease && (
                  <div className="disease-details">
                    <h2>Triệu chứng</h2>
                    <p>{selectedArticle.disease.symptoms}</p>
                    <h2>Điều trị</h2>
                    <p>{selectedArticle.disease.treatments}</p>
                    <h2>Mô tả</h2>
                    <p>{selectedArticle.disease.description}</p>
                  </div>
                )}

                {selectedArticle.source && (
                  <div className="article-source">
                    <FaLink />
                    <span>Nguồn: </span>
                    <a href={selectedArticle.source} target="_blank" rel="noopener noreferrer">{selectedArticle.source}</a>
                  </div>
                )}
              </article>

              {user.role === 'admin' && selectedArticle.status === 'pending' && (
                <div className="review-actions">
                  <h3>Phê duyệt bài viết</h3>
                  <div className="review-buttons">
                    <button onClick={() => handleReviewArticle(selectedArticle.id, 'approve')} className="btn btn-approve">
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArticleManagementPage;