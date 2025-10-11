// ArticleManagementPage.js - COMPLETE VERSION
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
  FaPaperPlane, FaCommentDots, FaExclamationTriangle, FaSave,
  FaExternalLinkAlt
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
  const [activeModalTab, setActiveModalTab] = useState('form');
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

    abort() {}
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
        'bold', 'italic', 'underline', '|',
        'bulletedList', 'numberedList', '|',
        'link', 'imageUpload', 'insertTable', '|',
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
      contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells']
    }
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

      // PHÂN QUYỀN: Staff chỉ thấy bài viết của mình
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
        console.log('Review history fetched:', response.data.history);
        setReviewHistory(response.data.history || []);
      }
    } catch (error) {
      console.error('Error fetching review history:', error);
      setReviewHistory([]);
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
    setReviewHistory([]);

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

        // Fetch review history cho tất cả modal
        await fetchReviewHistory(art.id);
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

  const handleSubmit = async (e, saveAsDraft = false) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const data = { 
        ...formData, 
        hideAfterEdit: hideOnEdit,
        status: saveAsDraft ? 'draft' : undefined
      };

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
        alert(saveAsDraft ? 'Đã lưu nháp' : response.data.message);
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
    const reason = prompt('Nhập lý do yêu cầu chỉnh sửa (max 500 ký tự):');
    if (!reason) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/api/articles/${id}/request-edit`,
        { reason: reason.substring(0, 500) },
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
      draft: { icon: FaFileAlt, label: 'Nháp', class: 'draft' },
      pending: { icon: FaClock, label: 'Chờ duyệt', class: 'pending' },
      approved: { icon: FaCheckCircle, label: 'Đã duyệt', class: 'approved' },
      rejected: { icon: FaTimesCircle, label: 'Từ chối', class: 'rejected' },
      hidden: { icon: FaEyeSlash, label: 'Ẩn', class: 'hidden' },
      request_edit: { icon: FaRedo, label: 'Yêu cầu sửa', class: 'request_edit' },
      request_rewrite: { icon: FaExclamationTriangle, label: 'Viết lại', class: 'request_rewrite' }
    };
    return badges[status] || { icon: FaInfoCircle, label: status, class: 'default' };
  };

  const StatusBadge = ({ status }) => {
    const { icon: Icon, label, class: className } = getStatusBadge(status);
    return (
      <span className={`article-mgmt-badge ${className}`}>
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
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (hours < 1) return 'Vừa xong';
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;
    return date.toLocaleDateString('vi-VN', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getArticleUrl = (article) => {
    return `${window.location.origin}/articles/${article.id}`;
  };

  // Render các cột cho bảng Medicine
  const renderMedicineColumns = () => {
    return (
      <>
        <th>Thành phần</th>
        <th>Công dụng</th>
        <th>Tác dụng phụ</th>
        <th>Nhà SX</th>
      </>
    );
  };

  // Render các cột cho bảng Disease  
  const renderDiseaseColumns = () => {
    return (
      <>
        <th>Triệu chứng</th>
        <th>Điều trị</th>
        <th>Mô tả</th>
      </>
    );
  };

  // Render data cho Medicine
  const renderMedicineData = (article) => {
    return (
      <>
        <td className="article-mgmt-cell-truncate">
          {article.medicine?.composition?.substring(0, 50) || 'N/A'}
          {article.medicine?.composition?.length > 50 && '...'}
        </td>
        <td className="article-mgmt-cell-truncate">
          {article.medicine?.uses?.substring(0, 50) || 'N/A'}
          {article.medicine?.uses?.length > 50 && '...'}
        </td>
        <td className="article-mgmt-cell-truncate">
          {article.medicine?.side_effects?.substring(0, 50) || 'N/A'}
          {article.medicine?.side_effects?.length > 50 && '...'}
        </td>
        <td>{article.medicine?.manufacturer || 'N/A'}</td>
      </>
    );
  };

  // Render data cho Disease
  const renderDiseaseData = (article) => {
    return (
      <>
        <td className="article-mgmt-cell-truncate">
          {article.disease?.symptoms?.substring(0, 50) || 'N/A'}
          {article.disease?.symptoms?.length > 50 && '...'}
        </td>
        <td className="article-mgmt-cell-truncate">
          {article.disease?.treatments?.substring(0, 50) || 'N/A'}
          {article.disease?.treatments?.length > 50 && '...'}
        </td>
        <td className="article-mgmt-cell-truncate">
          {article.disease?.description?.substring(0, 50) || 'N/A'}
          {article.disease?.description?.length > 50 && '...'}
        </td>
      </>
    );
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
                  <span className="article-mgmt-stat-label">Tổng</span>
                  <span className="article-mgmt-stat-value">{pagination.totalItems || 0}</span>
                </div>
                <div className="article-mgmt-stat-item">
                  <span className="article-mgmt-stat-label">Chờ</span>
                  <span className="article-mgmt-stat-value">{stats.pending || 0}</span>
                </div>
                <div className="article-mgmt-stat-item">
                  <span className="article-mgmt-stat-label">Duyệt</span>
                  <span className="article-mgmt-stat-value">{stats.approved || 0}</span>
                </div>
              </div>
            </div>
            <button className="article-mgmt-btn article-mgmt-btn-primary" onClick={() => openModal('create')}>
              <FaPlus /> Tạo bài viết
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
              <FaTimes /> Xóa
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
                <option value="request_rewrite">Viết lại</option>
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
              <label>Từ ngày</label>
              <input
                type="date"
                name="date_from"
                value={filters.date_from}
                onChange={handleFilterChange}
                className="article-mgmt-filter-input"
              />
            </div>

            <div className="article-mgmt-filter-item">
              <label>Đến ngày</label>
              <input
                type="date"
                name="date_to"
                value={filters.date_to}
                onChange={handleFilterChange}
                className="article-mgmt-filter-input"
              />
            </div>
          </div>
        </div>

        {/* Articles Table */}
        <div className="article-mgmt-table-wrapper">
          <table className="article-mgmt-table">
            <thead>
              <tr>
                <th onClick={() => handleSortChange('id')}>
                  ID {filters.sort_by === 'id' && (filters.sort_order === 'DESC' ? <FaSortAmountDown /> : <FaSortAmountUp />)}
                </th>
                <th onClick={() => handleSortChange('title')}>
                  Tiêu đề {filters.sort_by === 'title' && (filters.sort_order === 'DESC' ? <FaSortAmountDown /> : <FaSortAmountUp />)}
                </th>
                <th>Danh mục</th>
                <th>Trạng thái</th>
                <th>Tác giả</th>
                
                {/* Hiển thị cột đặc biệt cho tab Medicine */}
                {activeTab === 'medicine' && renderMedicineColumns()}
                
                {/* Hiển thị cột đặc biệt cho tab Disease */}
                {activeTab === 'disease' && renderDiseaseColumns()}
                
                <th onClick={() => handleSortChange('created_at')}>
                  Ngày tạo {filters.sort_by === 'created_at' && (filters.sort_order === 'DESC' ? <FaSortAmountDown /> : <FaSortAmountUp />)}
                </th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {articles.length === 0 ? (
                <tr>
                  <td colSpan="20" className="article-mgmt-empty">
                    <FaInfoCircle /> Không có bài viết nào
                  </td>
                </tr>
              ) : (
                articles.map(article => (
                  <tr key={article.id}>
                    <td>{article.id}</td>
                    <td className="article-mgmt-title-cell">
                      <div className="article-mgmt-title-content">
                        <span className="article-mgmt-title-text">{article.title}</span>
                        <a 
                          href={getArticleUrl(article)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="article-mgmt-link-icon"
                          title="Xem bài viết"
                        >
                          <FaExternalLinkAlt />
                        </a>
                      </div>
                    </td>
                    <td>
                      <span className="article-mgmt-category-badge">
                        {article.category?.name || 'N/A'}
                      </span>
                    </td>
                    <td><StatusBadge status={article.status} /></td>
                    <td>
                      <div className="article-mgmt-author">
                        <FaUser /> {article.author?.full_name || 'N/A'}
                      </div>
                    </td>
                    
                    {/* Render dữ liệu Medicine */}
                    {activeTab === 'medicine' && renderMedicineData(article)}
                    
                    {/* Render dữ liệu Disease */}
                    {activeTab === 'disease' && renderDiseaseData(article)}
                    
                    <td>{formatDate(article.created_at)}</td>
                    <td>
                      <div className="article-mgmt-actions">
                        <button
                          className="article-mgmt-action-btn article-mgmt-action-view"
                          onClick={() => openModal('view', article)}
                          title="Xem"
                        >
                          <FaEye />
                        </button>
                        
                        {(user.role === 'admin' || article.author_id === user.id) && (
                          <button
                            className="article-mgmt-action-btn article-mgmt-action-edit"
                            onClick={() => openModal('edit', article)}
                            title="Sửa"
                          >
                            <FaEdit />
                          </button>
                        )}
                        
                        {user.role === 'admin' && (
                          <>
                            <button
                              className="article-mgmt-action-btn article-mgmt-action-review"
                              onClick={() => openModal('review', article)}
                              title="Phê duyệt"
                            >
                              <FaCheck />
                            </button>
                            <button
                              className="article-mgmt-action-btn article-mgmt-action-hide"
                              onClick={() => handleHideArticle(article.id, !article.is_hidden)}
                              title={article.is_hidden ? 'Hiện' : 'Ẩn'}
                            >
                              {article.is_hidden ? <FaEye /> : <FaEyeSlash />}
                            </button>
                          </>
                        )}
                        
                        {(user.role === 'admin' || article.author_id === user.id) && (
                          <button
                            className="article-mgmt-action-btn article-mgmt-action-delete"
                            onClick={() => handleDeleteArticle(article.id)}
                            title="Xóa"
                          >
                            <FaTrash />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="article-mgmt-pagination">
            <button
              className="article-mgmt-pagination-btn"
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
            >
              Trước
            </button>
            <span className="article-mgmt-pagination-info">
              Trang {pagination.currentPage} / {pagination.totalPages}
            </span>
            <button
              className="article-mgmt-pagination-btn"
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.totalPages}
            >
              Sau
            </button>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="article-mgmt-modal-overlay" onClick={(e) => {
            // Chặn đóng modal khi click overlay
            e.stopPropagation();
          }}>
            <div className="article-mgmt-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="article-mgmt-modal-header">
                <h2 className="article-mgmt-modal-title">
                  {modalType === 'create' && 'Tạo bài viết mới'}
                  {modalType === 'edit' && 'Chỉnh sửa bài viết'}
                  {modalType === 'view' && 'Chi tiết bài viết'}
                  {modalType === 'review' && 'Phê duyệt bài viết'}
                </h2>
                <button className="article-mgmt-modal-close" onClick={closeModal}>
                  <FaTimes />
                </button>
              </div>

              {/* Modal Tabs */}
              {(modalType === 'view' || modalType === 'review' || modalType === 'edit') && (
                <div className="article-mgmt-modal-tabs">
                  <button
                    className={`article-mgmt-modal-tab ${activeModalTab === 'form' ? 'active' : ''}`}
                    onClick={() => setActiveModalTab('form')}
                  >
                    <FaFileAlt /> Nội dung
                  </button>
                  <button
                    className={`article-mgmt-modal-tab ${activeModalTab === 'history' ? 'active' : ''}`}
                    onClick={() => setActiveModalTab('history')}
                  >
                    <FaHistory /> Lịch sử ({reviewHistory.length})
                  </button>
                </div>
              )}

              <div className="article-mgmt-modal-body">
                {activeModalTab === 'form' ? (
                  <form onSubmit={handleSubmit} className="article-mgmt-form">
                    {/* Tiêu đề */}
                    <div className="article-mgmt-form-group">
                      <label className="article-mgmt-form-label">
                        <FaNewspaper /> Tiêu đề *
                      </label>
                      <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleFormChange}
                        className="article-mgmt-form-input"
                        required
                        disabled={modalType === 'view' || modalType === 'review'}
                      />
                    </div>

                    {/* Danh mục */}
                    <div className="article-mgmt-form-group">
                      <label className="article-mgmt-form-label">
                        <FaTag /> Danh mục *
                      </label>
                      <select
                        name="category_id"
                        value={formData.category_id}
                        onChange={(e) => handleCategoryChange(e.target.value)}
                        className="article-mgmt-form-select"
                        required
                        disabled={modalType === 'view' || modalType === 'review'}
                      >
                        <option value="">Chọn danh mục</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Các trường cho Medicine */}
                    {selectedCategoryType === 'thuoc' && (
                      <>
                        <div className="article-mgmt-form-group">
                          <label className="article-mgmt-form-label">Thành phần</label>
                          <textarea
                            name="composition"
                            value={formData.composition}
                            onChange={handleFormChange}
                            className="article-mgmt-form-textarea"
                            rows="3"
                            disabled={modalType === 'view' || modalType === 'review'}
                          />
                        </div>

                        <div className="article-mgmt-form-group">
                          <label className="article-mgmt-form-label">Công dụng</label>
                          <textarea
                            name="uses"
                            value={formData.uses}
                            onChange={handleFormChange}
                            className="article-mgmt-form-textarea"
                            rows="3"
                            disabled={modalType === 'view' || modalType === 'review'}
                          />
                        </div>

                        <div className="article-mgmt-form-group">
                          <label className="article-mgmt-form-label">Tác dụng phụ</label>
                          <textarea
                            name="side_effects"
                            value={formData.side_effects}
                            onChange={handleFormChange}
                            className="article-mgmt-form-textarea"
                            rows="3"
                            disabled={modalType === 'view' || modalType === 'review'}
                          />
                        </div>

                        <div className="article-mgmt-form-group">
                          <label className="article-mgmt-form-label">Nhà sản xuất</label>
                          <input
                            type="text"
                            name="manufacturer"
                            value={formData.manufacturer}
                            onChange={handleFormChange}
                            className="article-mgmt-form-input"
                            disabled={modalType === 'view' || modalType === 'review'}
                          />
                        </div>

                        <div className="article-mgmt-form-group">
                          <label className="article-mgmt-form-label">Mô tả</label>
                          <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleFormChange}
                            className="article-mgmt-form-textarea"
                            rows="3"
                            disabled={modalType === 'view' || modalType === 'review'}
                          />
                        </div>
                      </>
                    )}

                    {/* Các trường cho Disease */}
                    {selectedCategoryType === 'benh_ly' && (
                      <>
                        <div className="article-mgmt-form-group">
                          <label className="article-mgmt-form-label">Triệu chứng</label>
                          <textarea
                            name="symptoms"
                            value={formData.symptoms}
                            onChange={handleFormChange}
                            className="article-mgmt-form-textarea"
                            rows="3"
                            disabled={modalType === 'view' || modalType === 'review'}
                          />
                        </div>

                        <div className="article-mgmt-form-group">
                          <label className="article-mgmt-form-label">Điều trị</label>
                          <textarea
                            name="treatments"
                            value={formData.treatments}
                            onChange={handleFormChange}
                            className="article-mgmt-form-textarea"
                            rows="3"
                            disabled={modalType === 'view' || modalType === 'review'}
                          />
                        </div>

                        <div className="article-mgmt-form-group">
                          <label className="article-mgmt-form-label">Mô tả</label>
                          <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleFormChange}
                            className="article-mgmt-form-textarea"
                            rows="3"
                            disabled={modalType === 'view' || modalType === 'review'}
                          />
                        </div>
                      </>
                    )}

                    {/* Nội dung */}
                    <div className="article-mgmt-form-group">
                      <label className="article-mgmt-form-label">
                        <FaFileAlt /> Nội dung *
                      </label>
                      {modalType === 'view' || modalType === 'review' ? (
                        <div 
                          className="article-mgmt-content-preview"
                          dangerouslySetInnerHTML={{ __html: formData.content }}
                        />
                      ) : (
                        <CKEditor
                          editor={ClassicEditor}
                          config={editorConfig}
                          data={formData.content}
                          onChange={handleContentChange}
                        />
                      )}
                    </div>

                    {/* Tags */}
                    <div className="article-mgmt-form-group">
                      <label className="article-mgmt-form-label">
                        <FaTag /> Tags
                      </label>
                      <div className="article-mgmt-tags-container">
                        {formData.tags_json.map((tag, index) => (
                          <span key={index} className="article-mgmt-tag">
                            {tag}
                            {modalType !== 'view' && modalType !== 'review' && (
                              <button
                                type="button"
                                onClick={() => removeTag(index)}
                                className="article-mgmt-tag-remove"
                              >
                                <FaTimes />
                              </button>
                            )}
                          </span>
                        ))}
                      </div>
                      {modalType !== 'view' && modalType !== 'review' && (
                        <div className="article-mgmt-tag-input-wrapper">
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
                            className="article-mgmt-form-input"
                            placeholder="Nhập tag và nhấn Enter"
                          />
                          {suggestedTags.length > 0 && (
                            <div className="article-mgmt-tag-suggestions">
                              {suggestedTags.map((tag, index) => (
                                <button
                                  key={index}
                                  type="button"
                                  onClick={() => addTag(tag)}
                                  className="article-mgmt-tag-suggestion"
                                >
                                  {tag}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Nguồn */}
                    <div className="article-mgmt-form-group">
                      <label className="article-mgmt-form-label">
                        <FaLink /> Nguồn
                      </label>
                      <input
                        type="text"
                        name="source"
                        value={formData.source}
                        onChange={handleFormChange}
                        className="article-mgmt-form-input"
                        disabled={modalType === 'view' || modalType === 'review'}
                      />
                    </div>

                    {/* Import File */}
                    {(modalType === 'create' || modalType === 'edit') && (
                      <div className="article-mgmt-form-group">
                        <label className="article-mgmt-form-label">
                          <FaFileAlt /> Import từ file
                        </label>
                        <input
                          type="file"
                          accept=".docx,.xlsx"
                          onChange={handleFileUpload}
                          className="article-mgmt-form-file"
                        />
                        <small className="article-mgmt-form-hint">
                          Hỗ trợ: .docx, .xlsx (Max 10MB)
                        </small>
                      </div>
                    )}

                    {/* Ẩn sau khi sửa */}
                    {modalType === 'edit' && selectedArticle?.status === 'approved' && (
                      <div className="article-mgmt-form-group">
                        <label className="article-mgmt-form-checkbox">
                          <input
                            type="checkbox"
                            checked={hideOnEdit}
                            onChange={(e) => setHideOnEdit(e.target.checked)}
                          />
                          <span>Ẩn bài viết sau khi chỉnh sửa</span>
                        </label>
                      </div>
                    )}

                    {/* Form Actions */}
                    <div className="article-mgmt-form-actions">
                      {modalType === 'review' && user.role === 'admin' && (
                        <>
                          <button
                            type="button"
                            className="article-mgmt-btn article-mgmt-btn-success"
                            onClick={() => handleReviewArticle(selectedArticle.id, 'approve')}
                          >
                            <FaCheck /> Phê duyệt
                          </button>
                          <button
                            type="button"
                            className="article-mgmt-btn article-mgmt-btn-danger"
                            onClick={() => {
                              const reason = prompt('Lý do từ chối:');
                              if (reason) handleReviewArticle(selectedArticle.id, 'reject', reason);
                            }}
                          >
                            <FaBan /> Từ chối
                          </button>
                          <button
                            type="button"
                            className="article-mgmt-btn article-mgmt-btn-warning"
                            onClick={() => {
                              const reason = prompt('Lý do yêu cầu viết lại:');
                              if (reason) handleReviewArticle(selectedArticle.id, 'request_rewrite', reason);
                            }}
                          >
                            <FaRedo /> Viết lại
                          </button>
                        </>
                      )}

                      {(modalType === 'create' || modalType === 'edit') && (
                        <>
                          <button
                            type="submit"
                            className="article-mgmt-btn article-mgmt-btn-primary"
                          >
                            <FaPaperPlane /> {modalType === 'create' ? 'Tạo bài viết' : 'Cập nhật'}
                          </button>
                          <button
                            type="button"
                            className="article-mgmt-btn article-mgmt-btn-secondary"
                            onClick={(e) => handleSubmit(e, true)}
                          >
                            <FaSave /> Lưu nháp
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        className="article-mgmt-btn article-mgmt-btn-secondary"
                        onClick={closeModal}
                      >
                        <FaTimes /> Đóng
                      </button>
                    </div>
                  </form>
                ) : (
                  // Review History Tab
                  <div className="article-mgmt-history">
                    <h3 className="article-mgmt-history-title">
                      <FaHistory /> Lịch sử phê duyệt
                    </h3>
                    {reviewHistory.length === 0 ? (
                      <div className="article-mgmt-history-empty">
                        <FaInfoCircle />
                        <p>Chưa có lịch sử phê duyệt</p>
                      </div>
                    ) : (
                      <div className="article-mgmt-history-timeline">
                        {reviewHistory.map((item, index) => (
                          <div key={index} className="article-mgmt-history-item">
                            <div className="article-mgmt-history-marker">
                              <div className="article-mgmt-history-dot"></div>
                              {index < reviewHistory.length - 1 && (
                                <div className="article-mgmt-history-line"></div>
                              )}
                            </div>
                            <div className="article-mgmt-history-content">
                              <div className="article-mgmt-history-header">
                                <span className={`article-mgmt-history-action ${item.action}`}>
                                  {getActionLabel(item.action)}
                                </span>
                                <span className="article-mgmt-history-date">
                                  {formatDate(item.created_at)}
                                </span>
                              </div>
                              <div className="article-mgmt-history-body">
                                <div className="article-mgmt-history-reviewer">
                                  <FaUser /> 
                                  <strong>{item.reviewer?.full_name || 'N/A'}</strong>
                                  <span className="article-mgmt-history-role">
                                    ({item.reviewer?.role || 'N/A'})
                                  </span>
                                </div>
                                {item.reason && (
                                  <div className="article-mgmt-history-reason">
                                    <FaCommentDots /> 
                                    <p>{item.reason}</p>
                                  </div>
                                )}
                                {item.notes && (
                                  <div className="article-mgmt-history-notes">
                                    <FaInfoCircle /> 
                                    <p>{item.notes}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArticleManagementPage;