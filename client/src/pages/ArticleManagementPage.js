// ArticleManagementPage.js - Complete Enhanced Version
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { 
  FaPlus, FaEdit, FaTrash, FaEye, FaEyeSlash, FaSearch, FaTimes, 
  FaFilter, FaSortAmountDown, FaSortAmountUp,
  FaCheck, FaBan, FaRedo, FaClock,
  FaNewspaper, FaPills, FaDisease, FaUser, FaCalendar,
  FaTag, FaLink, FaCheckCircle, FaTimesCircle,
  FaFileAlt, FaCopy, FaInfoCircle, FaHistory,
  FaPaperPlane, FaCommentDots, FaExclamationTriangle
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
  const [activeModalTab, setActiveModalTab] = useState('form'); // 'form' hoặc 'preview'
  const [reviewHistory, setReviewHistory] = useState([]);
  
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    category_id: '',
    category_type: '',
    author_id: '',
    date_from: '',
    date_to: '',
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
    composition: '',
    uses: '',
    side_effects: '',
    manufacturer: '',
    symptoms: '',
    treatments: '',
    description: ''
  });

  const [pagination, setPagination] = useState({});
  const [stats, setStats] = useState({});
  const [tagInput, setTagInput] = useState('');
  const [suggestedTags, setSuggestedTags] = useState([]);
  const [selectedCategoryType, setSelectedCategoryType] = useState('');

  // Custom Upload Adapter cho CKEditor
  class MyUploadAdapter {
    constructor(loader) {
      this.loader = loader;
    }

    upload() {
      return this.loader.file.then(file => new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('upload', file);

        axios.post(`${API_BASE_URL}/api/upload/image`, formData, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'multipart/form-data'
          }
        })
        .then(response => {
          if (response.data.uploaded) {
            resolve({ default: response.data.url });
          } else {
            reject(response.data.error?.message || 'Upload failed');
          }
        })
        .catch(error => {
          reject(error.response?.data?.error?.message || error.message);
        });
      }));
    }

    abort() {
      // Hủy upload nếu cần
    }
  }

  function MyCustomUploadAdapterPlugin(editor) {
    editor.plugins.get('FileRepository').createUploadAdapter = (loader) => {
      return new MyUploadAdapter(loader);
    };
  }

  const editorConfig = {
    extraPlugins: [MyCustomUploadAdapterPlugin],
    toolbar: {
      items: [
        'heading', '|',
        'bold', 'italic', 'underline', 'strikethrough', '|',
        'fontSize', 'fontColor', 'fontBackgroundColor', '|',
        'bulletedList', 'numberedList', '|',
        'outdent', 'indent', '|',
        'alignment', '|',
        'link', 'imageUpload', 'insertTable', 'blockQuote', '|',
        'undo', 'redo'
      ]
    },
    image: {
      toolbar: [
        'imageStyle:inline',
        'imageStyle:block',
        'imageStyle:side',
        '|',
        'toggleImageCaption',
        'imageTextAlternative'
      ]
    },
    table: {
      contentToolbar: [
        'tableColumn', 'tableRow', 'mergeTableCells',
        'tableProperties', 'tableCellProperties'
      ]
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
      const token = localStorage.getItem('token');
      
      let queryFilters = { ...filters };

      if (activeTab === 'pending') queryFilters.status = 'pending';
      else if (activeTab === 'request_edit') queryFilters.status = 'request_edit';
      else if (activeTab === 'approved') queryFilters.status = 'approved';
      else if (activeTab === 'rejected') queryFilters.status = 'rejected';
      else if (activeTab === 'medicine') queryFilters.category_type = 'thuoc';
      else if (activeTab === 'disease') queryFilters.category_type = 'benh_ly';

      if (user.role === 'staff' || user.role === 'doctor') {
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

  const fetchReviewHistory = async (articleId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE_URL}/api/articles/${articleId}/review-history`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setReviewHistory(response.data.history || []);
      }
    } catch (error) {
      console.error('Error fetching review history:', error);
    }
  };

  const handleCategoryChange = (categoryId) => {
    const category = categories.find(c => c.id === parseInt(categoryId));
    if (category) {
      setSelectedCategoryType(category.category_type);
      setFormData(prev => ({ ...prev, category_id: categoryId }));
    } else {
      setSelectedCategoryType('');
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
    setActiveModalTab('form');

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
          source: art.source || '',
          composition: art.medicine?.composition || '',
          uses: art.medicine?.uses || '',
          side_effects: art.medicine?.side_effects || '',
          manufacturer: art.medicine?.manufacturer || '',
          symptoms: art.disease?.symptoms || '',
          treatments: art.disease?.treatments || '',
          description: art.medicine?.description || art.disease?.description || ''
        });
        setSelectedCategoryType(art.category?.category_type || '');

        // Fetch review history nếu là review modal
        if (type === 'review') {
          await fetchReviewHistory(art.id);
        }
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
      setReviewHistory([]);
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
    setReviewHistory([]);
    setActiveModalTab('form');
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

  const fetchSuggestedTags = useCallback(async (input) => {
    if (!input) {
      setSuggestedTags([]);
      return;
    }

    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/articles/tags/suggest?query=${input}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      if (response.data.success) {
        setSuggestedTags(response.data.tags || []);
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => fetchSuggestedTags(tagInput), 300);
    return () => clearTimeout(timeout);
  }, [tagInput, fetchSuggestedTags]);

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
        response = await axios.put(
          `${API_BASE_URL}/api/articles/${selectedArticle.id}`,
          data,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      if (response.data.success) {
        alert(response.data.message);
        closeModal();
        fetchArticles();
      }
    } catch (error) {
      console.error('Error submitting article:', error);
      alert('Lỗi: ' + (error.response?.data?.message || error.message));
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
        alert('Đã xóa bài viết');
        fetchArticles();
      }
    } catch (error) {
      console.error('Error deleting article:', error);
    }
  };

  const handleHideArticle = async (id, hide) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/api/articles/${id}/hide`,
        { hide },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert(response.data.message);
        fetchArticles();
      }
    } catch (error) {
      console.error('Error hiding article:', error);
    }
  };

  const handleReviewArticle = async (id, action, reason = '') => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/api/articles/${id}/review`,
        { action, reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert('Đã xử lý bài viết');
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
      const response = await axios.post(
        `${API_BASE_URL}/api/articles/${id}/request-edit`,
        { reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert('Đã gửi yêu cầu chỉnh sửa');
        fetchArticles();
      }
    } catch (error) {
      console.error('Error requesting edit:', error);
    }
  };

  const handleRespondEditRequest = async (id, allow) => {
    const reason = allow 
      ? prompt('Nhập lý do cho phép chỉnh sửa (tùy chọn):')
      : prompt('Nhập lý do từ chối yêu cầu:');
    
    if (!allow && !reason) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/api/articles/${id}/respond-edit`,
        { allow, reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert(response.data.message);
        closeModal();
        fetchArticles();
      }
    } catch (error) {
      console.error('Error responding to edit request:', error);
    }
  };

  const handleResubmit = async (id) => {
    const changes = prompt('Mô tả những gì bạn đã thay đổi:');
    if (!changes) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/api/articles/${id}/resubmit`,
        { changes },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert('Đã gửi lại bài viết để phê duyệt');
        closeModal();
        fetchArticles();
      }
    } catch (error) {
      console.error('Error resubmitting article:', error);
    }
  };

  const handleDuplicateArticle = async (id) => {
    if (!window.confirm('Bạn chắc chắn muốn nhân bản bài viết này?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/api/articles/${id}/duplicate`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert('Đã nhân bản bài viết');
        fetchArticles();
      }
    } catch (error) {
      console.error('Error duplicating article:', error);
    }
  };

  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      alert(`File quá lớn! Vui lòng chọn file nhỏ hơn ${MAX_FILE_SIZE / 1024 / 1024}MB`);
      e.target.value = '';
      return;
    }

    try {
      if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setFormData(prev => ({ ...prev, content: result.value }));
        alert('Đã import nội dung từ Word');
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const html = XLSX.utils.sheet_to_html(worksheet);
        setFormData(prev => ({ ...prev, content: html }));
        alert('Đã import bảng từ Excel');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Lỗi khi xử lý file. Vui lòng thử lại.');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: { icon: FaFileAlt, label: 'Nháp' },
      pending: { icon: FaClock, label: 'Chờ duyệt' },
      approved: { icon: FaCheckCircle, label: 'Đã duyệt' },
      rejected: { icon: FaTimesCircle, label: 'Từ chối' },
      hidden: { icon: FaEyeSlash, label: 'Ẩn' },
      request_edit: { icon: FaRedo, label: 'Yêu cầu sửa' },
      request_rewrite: { icon: FaExclamationTriangle, label: 'Yêu cầu viết lại' }
    };
    return badges[status] || { icon: FaInfoCircle, label: status };
  };

  const StatusBadge = ({ status }) => {
    const { icon: Icon, label } = getStatusBadge(status);
    return (
      <span className={`article-mgmt-badge ${status}`}>
        <Icon /> {label}
      </span>
    );
  };

  const getActionLabel = (action) => {
    const labels = {
      submit: 'Gửi bài',
      approve: 'Phê duyệt',
      reject: 'Từ chối',
      request_rewrite: 'Yêu cầu viết lại',
      resubmit: 'Gửi lại',
      request_edit: 'Yêu cầu chỉnh sửa',
      allow_edit: 'Cho phép sửa',
      deny_edit: 'Từ chối sửa'
    };
    return labels[action] || action;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (hours < 1) return 'Vừa xong';
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  if (loading) {
    return (
      <div className="article-mgmt-page">
        <div className="article-mgmt-container">
          <div className="article-mgmt-loading">
            <div className="article-mgmt-spinner"></div>
            <p>Đang tải dữ liệu...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="article-mgmt-page">
      <div className="article-mgmt-container">
        {/* Header */}
        <div className="article-mgmt-header">
          <div className="article-mgmt-header-content">
            <div>
              <h1 className="article-mgmt-title">Quản lý Bài viết</h1>
              <div className="article-mgmt-quick-stats">
                <div className="article-mgmt-stat-item">
                  <span className="article-mgmt-stat-label">Tổng bài viết</span>
                  <span className="article-mgmt-stat-value">{pagination.totalItems || 0}</span>
                </div>
                <div className="article-mgmt-stat-item">
                  <span className="article-mgmt-stat-label">Chờ duyệt</span>
                  <span className="article-mgmt-stat-value">{stats.pending || 0}</span>
                </div>
                <div className="article-mgmt-stat-item">
                  <span className="article-mgmt-stat-label">Đã duyệt</span>
                  <span className="article-mgmt-stat-value">{stats.approved || 0}</span>
                </div>
              </div>
            </div>
            <button className="article-mgmt-btn article-mgmt-btn-primary" onClick={() => openModal('create')}>
              <FaPlus /> Tạo bài viết mới
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="article-mgmt-tabs">
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
              className={`article-mgmt-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon />
              <span>{tab.label}</span>
              {tab.count > 0 && <span className="article-mgmt-tab-badge">{tab.count}</span>}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="article-mgmt-filters">
          <div className="article-mgmt-filters-header">
            <h3 className="article-mgmt-filters-title">
              <FaFilter /> Bộ lọc
            </h3>
            <button className="article-mgmt-filters-clear" onClick={() => setFilters({
              search: '', status: '', category_id: '', category_type: '',
              author_id: '', date_from: '', date_to: '', page: 1, limit: 10,
              sort_by: 'created_at', sort_order: 'DESC'
            })}>
              <FaTimes /> Xóa bộ lọc
            </button>
          </div>

          <div className="article-mgmt-filters-grid">
            <div className="article-mgmt-filter-item">
              <label>Tìm kiếm</label>
              <div className="article-mgmt-search-wrapper">
                <FaSearch className="article-mgmt-search-icon" />
                <input
                  type="text"
                  name="search"
                  value={filters.search}
                  onChange={handleFilterChange}
                  placeholder="Tìm theo tiêu đề..."
                  className="article-mgmt-filter-input"
                />
              </div>
            </div>

            <div className="article-mgmt-filter-item">
              <label>Trạng thái</label>
              <select name="status" value={filters.status} onChange={handleFilterChange} className="article-mgmt-filter-select">
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

            <div className="article-mgmt-filter-item">
              <label>Danh mục</label>
              <select name="category_id" value={filters.category_id} onChange={handleFilterChange} className="article-mgmt-filter-select">
                <option value="">Tất cả</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="article-mgmt-filter-item">
              <label>Loại danh mục</label>
              <select name="category_type" value={filters.category_type} onChange={handleFilterChange} className="article-mgmt-filter-select">
                <option value="">Tất cả</option>
                <option value="thuoc">Thuốc</option>
                <option value="benh_ly">Bệnh lý</option>
                <option value="tin_tuc">Bài viết</option>
              </select>
            </div>

            <div className="article-mgmt-filter-item">
              <label>Từ ngày</label>
              <input type="date" name="date_from" value={filters.date_from} onChange={handleFilterChange} className="article-mgmt-filter-input" />
            </div>

            <div className="article-mgmt-filter-item">
              <label>Đến ngày</label>
              <input type="date" name="date_to" value={filters.date_to} onChange={handleFilterChange} className="article-mgmt-filter-input" />
            </div>
          </div>
        </div>

        {/* Table */}
        {articles.length === 0 ? (
          <div className="article-mgmt-empty">
            <FaFileAlt className="article-mgmt-empty-icon" />
            <h3>Không có bài viết nào</h3>
            <p>Hãy tạo bài viết mới để bắt đầu.</p>
          </div>
        ) : (
          <>
            <div className="article-mgmt-table-wrapper">
              <div className="article-mgmt-table-container">
                <table className="article-mgmt-table">
                  <thead>
                    <tr>
                      <th className="sortable" onClick={() => handleSortChange('title')}>
                        Tiêu đề
                        {filters.sort_by === 'title' && (
                          filters.sort_order === 'DESC' ? <FaSortAmountDown /> : <FaSortAmountUp />
                        )}
                      </th>
                      <th>Danh mục</th>
                      <th>Tác giả</th>
                      <th className="sortable" onClick={() => handleSortChange('created_at')}>
                        Ngày tạo
                        {filters.sort_by === 'created_at' && (
                          filters.sort_order === 'DESC' ? <FaSortAmountDown /> : <FaSortAmountUp />
                        )}
                      </th>
                      <th className="sortable" onClick={() => handleSortChange('views')}>
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
                        <td className="article-mgmt-title-cell">
                          <strong>{article.title}</strong>
                        </td>
                        <td>{article.category?.name}</td>
                        <td>{article.author?.full_name}</td>
                        <td>{new Date(article.created_at).toLocaleDateString('vi-VN')}</td>
                        <td><FaEye /> {article.views || 0}</td>
                        <td><StatusBadge status={article.status} /></td>
                        <td className="article-mgmt-actions-cell">
                          <button className="article-mgmt-btn-action view" onClick={() => openModal('review', article)} title="Xem">
                            <FaEye />
                          </button>
                          
                          {/* Logic phân quyền Edit */}
                          {(user.role === 'admin' || 
                            (article.author_id === user.id && 
                             (article.status === 'pending' || article.status === 'request_edit' || article.status === 'request_rewrite'))) && (
                            <button className="article-mgmt-btn-action edit" onClick={() => openModal('edit', article)} title="Sửa">
                              <FaEdit />
                            </button>
                          )}

                          {user.role === 'admin' && (
                            <>
                              <button 
                                className="article-mgmt-btn-action visibility" 
                                onClick={() => handleHideArticle(article.id, article.status !== 'hidden')} 
                                title={article.status === 'hidden' ? 'Hiện' : 'Ẩn'}
                              >
                                {article.status === 'hidden' ? <FaEye /> : <FaEyeSlash />}
                              </button>
                              <button className="article-mgmt-btn-action delete" onClick={() => handleDeleteArticle(article.id)} title="Xóa">
                                <FaTrash />
                              </button>
                            </>
                          )}

                          {/* Staff yêu cầu sửa bài đã duyệt */}
                          {user.role !== 'admin' && article.status === 'approved' && article.author_id === user.id && (
                            <button className="article-mgmt-btn-action edit" onClick={() => handleRequestEdit(article.id)} title="Yêu cầu sửa">
                              <FaRedo />
                            </button>
                          )}

                          <button className="article-mgmt-btn-action duplicate" onClick={() => handleDuplicateArticle(article.id)} title="Nhân bản">
                            <FaCopy />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="article-mgmt-pagination">
                <button 
                  className="article-mgmt-btn-page" 
                  disabled={pagination.currentPage === 1} 
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                >
                  Trước
                </button>
                <div className="article-mgmt-page-numbers">
                  {[...Array(pagination.totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      className={`article-mgmt-btn-page ${pagination.currentPage === i + 1 ? 'active' : ''}`}
                      onClick={() => handlePageChange(i + 1)}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button 
                  className="article-mgmt-btn-page" 
                  disabled={pagination.currentPage === pagination.totalPages} 
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                >
                  Sau
                </button>
              </div>
            )}
          </>
        )}

        {/* Modal Create/Edit */}
        {showModal && (modalType === 'create' || modalType === 'edit') && (
          <div className="article-mgmt-modal-overlay" onClick={closeModal}>
            <div className="article-mgmt-modal article-mgmt-modal-split tab-mode" onClick={e => e.stopPropagation()}>
              
              {/* Tabs cho mobile */}
              <div className="article-mgmt-modal-tabs">
                <div className="article-mgmt-modal-tab-btns">
                  <button
                    className={`article-mgmt-modal-tab-btn ${activeModalTab === 'form' ? 'active' : ''}`}
                    onClick={() => setActiveModalTab('form')}
                  >
                    <FaEdit /> Chỉnh sửa
                  </button>
                  <button
                    className={`article-mgmt-modal-tab-btn ${activeModalTab === 'preview' ? 'active' : ''}`}
                    onClick={() => setActiveModalTab('preview')}
                  >
                    <FaEye /> Xem trước
                  </button>
                </div>
              </div>

              {/* Form Side */}
              <div className={`article-mgmt-modal-form-side article-mgmt-modal-tab-content ${activeModalTab === 'form' ? 'active' : ''}`}>
                <div className="article-mgmt-modal-header">
                  <h2 className="article-mgmt-modal-title">
                    {modalType === 'create' ? 'Tạo bài viết mới' : 'Chỉnh sửa bài viết'}
                  </h2>
                  <button className="article-mgmt-modal-close" onClick={closeModal}>
                    <FaTimes />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="article-mgmt-modal-body">
                  <div className="article-mgmt-form-group">
                    <label className="article-mgmt-form-label">
                      Tiêu đề <span className="article-mgmt-form-required">*</span>
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleFormChange}
                      required
                      placeholder="Nhập tiêu đề bài viết..."
                      className="article-mgmt-form-input"
                    />
                  </div>

                  <div className="article-mgmt-form-group">
                    <label className="article-mgmt-form-label">
                      Danh mục <span className="article-mgmt-form-required">*</span>
                    </label>
                    <select
                      name="category_id"
                      value={formData.category_id}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      required
                      className="article-mgmt-form-select"
                    >
                      <option value="">Chọn danh mục</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="article-mgmt-form-group">
                    <label className="article-mgmt-form-label">
                      Nội dung <span className="article-mgmt-form-required">*</span>
                    </label>
                    <CKEditor
                      editor={ClassicEditor}
                      config={editorConfig}
                      data={formData.content}
                      onChange={handleContentChange}
                    />
                  </div>

                  <div className="article-mgmt-form-group">
                    <label className="article-mgmt-form-label">Tải lên file (Max 10MB)</label>
                    <input 
                      type="file" 
                      accept=".docx,.xlsx" 
                      onChange={handleFileUpload}
                      className="article-mgmt-form-input"
                    />
                    <small className="article-mgmt-form-hint">Hỗ trợ: .docx, .xlsx (Max: 10MB)</small>
                  </div>

                  <div className="article-mgmt-form-group">
                    <label className="article-mgmt-form-label">Tags</label>
                    <div className="article-mgmt-tags-container">
                      {formData.tags_json.map((tag, idx) => (
                        <span key={idx} className="article-mgmt-tag-item">
                          {tag}
                          <button type="button" className="article-mgmt-tag-remove" onClick={() => removeTag(idx)}>
                            <FaTimes />
                          </button>
                        </span>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag(tagInput);
                        }
                      }}
                      placeholder="Nhập tag và nhấn Enter..."
                      className="article-mgmt-form-input"
                    />
                    {suggestedTags.length > 0 && (
                      <div className="article-mgmt-tags-suggest">
                        <small>Gợi ý:</small>
                        {suggestedTags.map((tag, idx) => (
                          <span key={idx} className="article-mgmt-tag-suggest-item" onClick={() => addTag(tag)}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="article-mgmt-form-group">
                    <label className="article-mgmt-form-label">Nguồn</label>
                    <input
                      type="url"
                      name="source"
                      value={formData.source}
                      onChange={handleFormChange}
                      placeholder="https://..."
                      className="article-mgmt-form-input"
                    />
                  </div>

                  {selectedCategoryType === 'thuoc' && (
                    <div className="article-mgmt-medical-fields">
                      <h4><FaPills /> Thông tin thuốc</h4>
                      
                      <div className="article-mgmt-form-group">
                        <label className="article-mgmt-form-label">Thành phần</label>
                        <textarea
                          name="composition"
                          value={formData.composition}
                          onChange={handleFormChange}
                          rows="3"
                          placeholder="Nhập thành phần thuốc..."
                          className="article-mgmt-form-textarea"
                        />
                      </div>

                      <div className="article-mgmt-form-group">
                        <label className="article-mgmt-form-label">Công dụng</label>
                        <textarea
                          name="uses"
                          value={formData.uses}
                          onChange={handleFormChange}
                          rows="3"
                          placeholder="Nhập công dụng..."
                          className="article-mgmt-form-textarea"
                        />
                      </div>

                      <div className="article-mgmt-form-group">
                        <label className="article-mgmt-form-label">Tác dụng phụ</label>
                        <textarea
                          name="side_effects"
                          value={formData.side_effects}
                          onChange={handleFormChange}
                          rows="3"
                          placeholder="Nhập tác dụng phụ..."
                          className="article-mgmt-form-textarea"
                        />
                      </div>

                      <div className="article-mgmt-form-group">
                        <label className="article-mgmt-form-label">Nhà sản xuất</label>
                        <input
                          type="text"
                          name="manufacturer"
                          value={formData.manufacturer}
                          onChange={handleFormChange}
                          placeholder="Nhập tên nhà sản xuất..."
                          className="article-mgmt-form-input"
                        />
                      </div>
                    </div>
                  )}

                  {selectedCategoryType === 'benh_ly' && (
                    <div className="article-mgmt-medical-fields">
                      <h4><FaDisease /> Thông tin bệnh lý</h4>
                      
                      <div className="article-mgmt-form-group">
                        <label className="article-mgmt-form-label">Triệu chứng</label>
                        <textarea
                          name="symptoms"
                          value={formData.symptoms}
                          onChange={handleFormChange}
                          rows="3"
                          placeholder="Nhập triệu chứng..."
                          className="article-mgmt-form-textarea"
                        />
                      </div>

                      <div className="article-mgmt-form-group">
                        <label className="article-mgmt-form-label">Điều trị</label>
                        <textarea
                          name="treatments"
                          value={formData.treatments}
                          onChange={handleFormChange}
                          rows="3"
                          placeholder="Nhập phương pháp điều trị..."
                          className="article-mgmt-form-textarea"
                        />
                      </div>

                      <div className="article-mgmt-form-group">
                        <label className="article-mgmt-form-label">Mô tả</label>
                        <textarea
                          name="description"
                          value={formData.description}
                          onChange={handleFormChange}
                          rows="3"
                          placeholder="Nhập mô tả chi tiết..."
                          className="article-mgmt-form-textarea"
                        />
                      </div>
                    </div>
                  )}

                  <div className="article-mgmt-modal-footer">
                    <button type="button" className="article-mgmt-btn article-mgmt-btn-secondary" onClick={closeModal}>
                      Hủy
                    </button>
                    <button type="submit" className="article-mgmt-btn article-mgmt-btn-primary">
                      {modalType === 'create' ? 'Tạo bài viết' : 'Cập nhật'}
                    </button>
                  </div>
                </form>
              </div>
              
              {/* Preview Side */}
              <div className={`article-mgmt-modal-preview-side article-mgmt-modal-tab-content ${activeModalTab === 'preview' ? 'active' : ''}`}>
                <div className="article-mgmt-modal-header">
                  <h2 className="article-mgmt-modal-title">Xem trước</h2>
                </div>
                <div className="article-mgmt-modal-body">
                  <article className="article-mgmt-preview">
                    <h1 className="article-mgmt-preview-title">{formData.title || 'Tiêu đề bài viết'}</h1>
                    
                    <div className="article-mgmt-preview-meta">
                      <span className="article-mgmt-meta-item">
                        <FaUser /> {user.full_name}
                      </span>
                      <span className="article-mgmt-meta-item">
                        <FaCalendar /> {new Date().toLocaleDateString('vi-VN')}
                      </span>
                    </div>

                    {formData.tags_json.length > 0 && (
                      <div className="article-mgmt-preview-meta">
                        {formData.tags_json.map((tag, idx) => (
                          <span key={idx} className="article-mgmt-meta-item">
                            <FaTag /> {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div 
                      className="article-mgmt-preview-content" 
                      dangerouslySetInnerHTML={{ 
                        __html: formData.content || '<p>Nội dung bài viết sẽ hiển thị ở đây...</p>' 
                      }} 
                    />

                    {selectedCategoryType === 'thuoc' && formData.composition && (
                      <div className="article-mgmt-medical-fields">
                        <h4>Thông tin thuốc</h4>
                        {formData.composition && <p><strong>Thành phần:</strong> {formData.composition}</p>}
                        {formData.uses && <p><strong>Công dụng:</strong> {formData.uses}</p>}
                        {formData.side_effects && <p><strong>Tác dụng phụ:</strong> {formData.side_effects}</p>}
                        {formData.manufacturer && <p><strong>Nhà sản xuất:</strong> {formData.manufacturer}</p>}
                      </div>
                    )}

                    {selectedCategoryType === 'benh_ly' && formData.symptoms && (
                      <div className="article-mgmt-medical-fields">
                        <h4>Thông tin bệnh lý</h4>
                        {formData.symptoms && <p><strong>Triệu chứng:</strong> {formData.symptoms}</p>}
                        {formData.treatments && <p><strong>Điều trị:</strong> {formData.treatments}</p>}
                        {formData.description && <p><strong>Mô tả:</strong> {formData.description}</p>}
                      </div>
                    )}

                    {formData.source && (
                      <div className="article-mgmt-preview-meta">
                        <span className="article-mgmt-meta-item">
                          <FaLink /> <a href={formData.source} target="_blank" rel="noopener noreferrer">{formData.source}</a>
                        </span>
                      </div>
                    )}
                  </article>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Review với Timeline */}
        {showModal && modalType === 'review' && selectedArticle && (
          <div className="article-mgmt-modal-overlay" onClick={closeModal}>
            <div className="article-mgmt-modal" style={{maxWidth: '1600px', display: 'flex', flexDirection: 'row'}} onClick={e => e.stopPropagation()}>
              
              {/* Preview Content */}
              <div style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
                <div className="article-mgmt-modal-header">
                  <h2 className="article-mgmt-modal-title">Phê duyệt bài viết</h2>
                  <button className="article-mgmt-modal-close" onClick={closeModal}>
                    <FaTimes />
                  </button>
                </div>

                <div className="article-mgmt-modal-body">
                  <article className="article-mgmt-preview">
                    <h1 className="article-mgmt-preview-title">{selectedArticle.title}</h1>
                    
                    <div className="article-mgmt-preview-meta">
                      <span className="article-mgmt-meta-item">
                        <FaUser /> {selectedArticle.author?.full_name}
                      </span>
                      <span className="article-mgmt-meta-item">
                        <FaCalendar /> {new Date(selectedArticle.created_at).toLocaleDateString('vi-VN')}
                      </span>
                      <StatusBadge status={selectedArticle.status} />
                    </div>

                    {selectedArticle.tags_json?.length > 0 && (
                      <div className="article-mgmt-preview-meta">
                        {selectedArticle.tags_json.map((tag, idx) => (
                          <span key={idx} className="article-mgmt-meta-item">
                            <FaTag /> {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div 
                      className="article-mgmt-preview-content" 
                      dangerouslySetInnerHTML={{ __html: selectedArticle.content }} 
                    />

                    {selectedArticle.medicine && (
                      <div className="article-mgmt-medical-fields">
                        <h4>Thông tin thuốc</h4>
                        <p><strong>Thành phần:</strong> {selectedArticle.medicine.composition}</p>
                        <p><strong>Công dụng:</strong> {selectedArticle.medicine.uses}</p>
                        <p><strong>Tác dụng phụ:</strong> {selectedArticle.medicine.side_effects}</p>
                        <p><strong>Nhà sản xuất:</strong> {selectedArticle.medicine.manufacturer}</p>
                      </div>
                    )}

                    {selectedArticle.disease && (
                      <div className="article-mgmt-medical-fields">
                        <h4>Thông tin bệnh lý</h4>
                        <p><strong>Triệu chứng:</strong> {selectedArticle.disease.symptoms}</p>
                        <p><strong>Điều trị:</strong> {selectedArticle.disease.treatments}</p>
                        <p><strong>Mô tả:</strong> {selectedArticle.disease.description}</p>
                      </div>
                    )}

                    {selectedArticle.source && (
                      <div className="article-mgmt-preview-meta">
                        <span className="article-mgmt-meta-item">
                          <FaLink /> <a href={selectedArticle.source} target="_blank" rel="noopener noreferrer">{selectedArticle.source}</a>
                        </span>
                      </div>
                    )}
                  </article>

                  {/* Review Actions cho Admin */}
                  {user.role === 'admin' && selectedArticle.status === 'pending' && (
                    <div style={{marginTop: '2rem', paddingTop: '2rem', borderTop: '2px solid var(--border)'}}>
                      <h3 style={{marginBottom: '1rem'}}>Phê duyệt bài viết</h3>
                      <div style={{display: 'flex', gap: '1rem', flexWrap: 'wrap'}}>
                        <button 
                          onClick={() => handleReviewArticle(selectedArticle.id, 'approve')} 
                          className="article-mgmt-btn article-mgmt-btn-success"
                        >
                          <FaCheck /> Phê duyệt
                        </button>
                        <button
                          onClick={() => {
                            const reason = prompt('Nhập lý do yêu cầu viết lại (max 500 ký tự):');
                            if (reason) handleReviewArticle(selectedArticle.id, 'rewrite', reason);
                          }}
                          className="article-mgmt-btn article-mgmt-btn-primary"
                        >
                          <FaRedo /> Yêu cầu viết lại
                        </button>
                        <button
                          onClick={() => {
                            const reason = prompt('Nhập lý do từ chối (max 500 ký tự):');
                            if (reason) handleReviewArticle(selectedArticle.id, 'reject', reason);
                          }}
                          className="article-mgmt-btn article-mgmt-btn-danger"
                        >
                          <FaBan /> Từ chối
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Admin phản hồi yêu cầu chỉnh sửa */}
                  {user.role === 'admin' && selectedArticle.status === 'request_edit' && (
                    <div style={{marginTop: '2rem', paddingTop: '2rem', borderTop: '2px solid var(--border)'}}>
                      <h3 style={{marginBottom: '1rem'}}>Phản hồi yêu cầu chỉnh sửa</h3>
                      <div style={{display: 'flex', gap: '1rem', flexWrap: 'wrap'}}>
                        <button 
                          onClick={() => handleRespondEditRequest(selectedArticle.id, true)} 
                          className="article-mgmt-btn article-mgmt-btn-success"
                        >
                          <FaCheck /> Cho phép chỉnh sửa
                        </button>
                        <button
                          onClick={() => handleRespondEditRequest(selectedArticle.id, false)}
                          className="article-mgmt-btn article-mgmt-btn-danger"
                        >
                          <FaBan /> Từ chối yêu cầu
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Staff gửi lại sau khi viết lại */}
                  {(user.role === 'staff' || user.role === 'doctor') && 
                   selectedArticle.status === 'request_rewrite' && 
                   selectedArticle.author_id === user.id && (
                    <div style={{marginTop: '2rem', paddingTop: '2rem', borderTop: '2px solid var(--border)'}}>
                      <h3 style={{marginBottom: '1rem'}}>Gửi lại bài viết</h3>
                      <button 
                        onClick={() => handleResubmit(selectedArticle.id)} 
                        className="article-mgmt-btn article-mgmt-btn-primary"
                      >
                        <FaPaperPlane /> Gửi lại để phê duyệt
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Review History Sidebar */}
              <div className="article-mgmt-review-sidebar">
                <div className="article-mgmt-modal-header">
                  <h3 className="article-mgmt-modal-title" style={{fontSize: '1rem'}}>
                    <FaHistory /> Lịch sử phê duyệt
                  </h3>
                </div>
                <div className="article-mgmt-review-timeline">
                  {reviewHistory.length === 0 ? (
                    <p style={{textAlign: 'center', color: 'var(--text-tertiary)', padding: '2rem'}}>
                      Chưa có lịch sử
                    </p>
                  ) : (
                    reviewHistory.map((item, index) => (
                      <div key={index} className="article-mgmt-timeline-item">
                        <div className={`article-mgmt-timeline-icon ${item.action}`}>
                          {item.action === 'submit' && <FaPaperPlane />}
                          {item.action === 'approve' && <FaCheck />}
                          {item.action === 'reject' && <FaBan />}
                          {item.action === 'request_rewrite' && <FaRedo />}
                          {item.action === 'resubmit' && <FaPaperPlane />}
                          {item.action === 'request_edit' && <FaEdit />}
                          {item.action === 'allow_edit' && <FaCheck />}
                          {item.action === 'deny_edit' && <FaBan />}
                        </div>
                        <div className="article-mgmt-timeline-content">
                          <div className="article-mgmt-timeline-action">
                            {getActionLabel(item.action)}
                          </div>
                          <div className="article-mgmt-timeline-user">
                            {item.reviewer?.full_name || item.author?.full_name}
                            {item.reviewer?.role && ` (${item.reviewer.role})`}
                          </div>
                          {item.reason && (
                            <div className="article-mgmt-timeline-reason">
                              <FaCommentDots /> {item.reason}
                            </div>
                          )}
                          {item.metadata_json?.changes && (
                            <div className="article-mgmt-timeline-reason">
                              <FaInfoCircle /> Thay đổi: {item.metadata_json.changes}
                            </div>
                          )}
                          <div className="article-mgmt-timeline-time">
                            {formatDate(item.created_at)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArticleManagementPage;