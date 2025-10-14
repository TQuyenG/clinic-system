// client/src/pages/ArticleManagementPage.js - HOÀN CHỈNH
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { 
  FaPlus, FaEdit, FaTrash, FaEye, FaEyeSlash, FaSearch, FaTimes, 
  FaFilter, FaSortAmountDown, FaSortAmountUp, FaCheck, FaBan, FaRedo,
  FaNewspaper, FaPills, FaDisease, FaFileAlt, FaCopy, FaHistory,
  FaPaperPlane, FaSave, FaExternalLinkAlt, FaSpinner, FaClock,
  FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaUser
} from 'react-icons/fa';
import { HideArticlePopup } from '../components/article/ArticleReportComponents';
import './ArticleManagementPage.css';

const ArticleManagementPage = () => {
  const navigate = useNavigate();
  const API_BASE_URL = 'http://localhost:3001';
  
  const [user, setUser] = useState({});
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [showHidePopup, setShowHidePopup] = useState(false);
  const [articleToHide, setArticleToHide] = useState(null);
  
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    category_id: '',
    category_type: '',
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
        'fontSize', 'fontFamily', 'fontColor', 'fontBackgroundColor', '|',
        'bold', 'italic', 'underline', 'strikethrough', 'code', 'subscript', 'superscript', '|',
        'alignment', '|',
        'bulletedList', 'numberedList', 'todoList', '|',
        'outdent', 'indent', '|',
        'link', 'imageUpload', 'insertTable', 'mediaEmbed', 'blockQuote', 'codeBlock', 'horizontalLine', '|',
        'highlight', 'removeFormat', '|',
        'undo', 'redo', '|',
        'sourceEditing'
      ],
      shouldNotGroupWhenFull: true
    },
    fontSize: {
      options: [9, 11, 13, 'default', 17, 19, 21, 24, 28, 32, 36],
      supportAllValues: true
    },
    fontFamily: {
      options: [
        'default',
        'Arial, Helvetica, sans-serif',
        'Courier New, Courier, monospace',
        'Georgia, serif',
        'Lucida Sans Unicode, Lucida Grande, sans-serif',
        'Tahoma, Geneva, sans-serif',
        'Times New Roman, Times, serif',
        'Trebuchet MS, Helvetica, sans-serif',
        'Verdana, Geneva, sans-serif'
      ],
      supportAllValues: true
    },
    heading: {
      options: [
        { model: 'paragraph', title: 'Paragraph', class: 'ck-heading_paragraph' },
        { model: 'heading1', view: 'h1', title: 'Heading 1', class: 'ck-heading_heading1' },
        { model: 'heading2', view: 'h2', title: 'Heading 2', class: 'ck-heading_heading2' },
        { model: 'heading3', view: 'h3', title: 'Heading 3', class: 'ck-heading_heading3' },
        { model: 'heading4', view: 'h4', title: 'Heading 4', class: 'ck-heading_heading4' },
        { model: 'heading5', view: 'h5', title: 'Heading 5', class: 'ck-heading_heading5' },
        { model: 'heading6', view: 'h6', title: 'Heading 6', class: 'ck-heading_heading6' }
      ]
    },
    image: {
      toolbar: [
        'imageTextAlternative', 'toggleImageCaption', '|',
        'imageStyle:inline', 'imageStyle:block', 'imageStyle:side', '|',
        'linkImage'
      ],
      styles: ['full', 'side', 'alignLeft', 'alignCenter', 'alignRight']
    },
    table: {
      contentToolbar: [
        'tableColumn', 'tableRow', 'mergeTableCells',
        'tableCellProperties', 'tableProperties'
      ]
    },
    link: {
      decorators: {
        openInNewTab: {
          mode: 'manual',
          label: 'Open in a new tab',
          attributes: {
            target: '_blank',
            rel: 'noopener noreferrer'
          }
        }
      }
    },
    mediaEmbed: {
      previewsInData: true
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
      else if (activeTab === 'hidden') queryFilters.status = 'hidden';
      else if (activeTab === 'draft') queryFilters.status = 'draft';
      else if (activeTab === 'medicine') queryFilters.category_type = 'thuoc';
      else if (activeTab === 'disease') queryFilters.category_type = 'benh_ly';

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
        saveAsDraft
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

  const handleDeleteArticle = async (article) => {
    // Kiểm tra quyền xóa
    if (user.role !== 'admin' && article.status !== 'draft') {
      alert('Bạn chỉ có thể xóa bài viết ở trạng thái nháp');
      return;
    }

    if (user.role !== 'admin' && article.author_id !== user.id) {
      alert('Bạn không có quyền xóa bài viết này');
      return;
    }

    if (!window.confirm('Bạn chắc chắn muốn xóa bài viết này?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`${API_BASE_URL}/api/articles/${article.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        alert('Đã xóa bài viết');
        fetchArticles();
      }
    } catch (error) {
      console.error('Error deleting article:', error);
      alert('Lỗi: ' + (error.response?.data?.message || error.message));
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
      alert('Lỗi: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleRequestEdit = async (article) => {
    const reason = prompt('Nhập lý do yêu cầu chỉnh sửa (max 500 ký tự):');
    if (!reason) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/api/articles/${article.id}/request-edit`,
        { reason: reason.substring(0, 500) },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert('Đã gửi yêu cầu chỉnh sửa đến admin');
        fetchArticles();
      }
    } catch (error) {
      console.error('Error requesting edit:', error);
      alert('Lỗi: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const MAX_FILE_SIZE = 10 * 1024 * 1024;
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

  // Hàm lấy URL bài viết theo status
  const getArticleLink = (article) => {
    const typeMap = {
      'tin_tuc': 'tin-tuc',
      'thuoc': 'thuoc',
      'benh_ly': 'benh-ly'
    };

    const categoryType = typeMap[article.category?.category_type] || 'tin-tuc';

    // Draft: Mở popup chỉnh sửa
    if (article.status === 'draft') {
      return null; // Sẽ dùng onClick để mở modal
    }

    // Pending, request_edit, hidden: Đến trang review
    if (['pending', 'request_edit', 'hidden', 'request_rewrite'].includes(article.status)) {
      return `/phe-duyet-bai-viet/${article.id}`;
    }

    // Approved: Đến trang chi tiết public
    if (article.status === 'approved') {
      return `/${categoryType}/${article.slug}`;
    }

    // Rejected: Đến trang review
    if (article.status === 'rejected') {
      return `/phe-duyet-bai-viet/${article.id}`;
    }

    return null;
  };

  const handleTitleClick = (article) => {
    if (article.status === 'draft') {
      openModal('edit', article);
    } else {
      const link = getArticleLink(article);
      if (link) {
        if (link.startsWith('/phe-duyet-bai-viet')) {
          navigate(link);
        } else {
          window.open(link, '_blank');
        }
      }
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
    return badges[status] || { icon: FaFileAlt, label: status, class: 'default' };
  };

  const StatusBadge = ({ status }) => {
    const { icon: Icon, label, class: className } = getStatusBadge(status);
    return (
      <span className={`article-mgmt-badge ${className}`}>
        <Icon /> {label}
      </span>
    );
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
      year: 'numeric'
    });
  };

  // Render actions theo status & role
  const renderActions = (article) => {
    const isAuthor = article.author_id === user.id;
    const isAdmin = user.role === 'admin';

    return (
      <div className="article-mgmt-actions-cell">
        {/* NÚT XEM CHI TIẾT */}
        {['pending', 'request_edit', 'hidden', 'rejected', 'request_rewrite'].includes(article.status) && (
          <button
            className="article-mgmt-btn-action view"
            onClick={() => navigate(`/phe-duyet-bai-viet/${article.id}`)}
            title="Xem chi tiết"
          >
            <FaEye />
          </button>
        )}

        {/* NÚT CHỈNH SỬA */}
        {(isAdmin || (isAuthor && ['draft', 'request_edit', 'request_rewrite'].includes(article.status))) && (
          <button
            className="article-mgmt-btn-action edit"
            onClick={() => openModal('edit', article)}
            title="Chỉnh sửa"
          >
            <FaEdit />
          </button>
        )}

        {/* NÚT PHÊ DUYỆT (Admin + Pending) */}
        {isAdmin && article.status === 'pending' && (
          <button
            className="article-mgmt-btn-action review"
            onClick={() => navigate(`/phe-duyet-bai-viet/${article.id}`)}
            title="Phê duyệt"
          >
            <FaCheck />
          </button>
        )}

        {/* NÚT YÊU CẦU CHỈNH SỬA (Tác giả + Approved) */}
        {isAuthor && !isAdmin && article.status === 'approved' && (
          <button
            className="article-mgmt-btn-action request"
            onClick={() => handleRequestEdit(article)}
            title="Yêu cầu chỉnh sửa"
          >
            <FaRedo />
          </button>
        )}

        {/* NÚT ẨN/HIỆN (Admin) */}
        {isAdmin && article.status === 'approved' && (
          <button
            className="article-mgmt-btn-action visibility"
            onClick={() => {
              setArticleToHide(article);
              setShowHidePopup(true);
            }}
            title={article.status === 'hidden' ? 'Đã ẩn' : 'Ẩn bài viết'}
          >
            {article.status === 'hidden' ? <FaEye /> : <FaEyeSlash />}
          </button>
        )}

        {/* NÚT XÓA */}
        {(isAdmin || (isAuthor && article.status === 'draft')) && (
          <button
            className="article-mgmt-btn-action delete"
            onClick={() => handleDeleteArticle(article)}
            title="Xóa"
          >
            <FaTrash />
          </button>
        )}

        {/* NÚT NHÂN BẢN */}
        <button
          className="article-mgmt-btn-action duplicate"
          onClick={() => handleDuplicateArticle(article.id)}
          title="Nhân bản"
        >
          <FaCopy />
        </button>
      </div>
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
            { id: 'draft', label: 'Nháp', icon: FaFileAlt, count: stats.draft },
            { id: 'pending', label: 'Chờ duyệt', icon: FaClock, count: stats.pending },
            { id: 'approved', label: 'Đã duyệt', icon: FaCheck, count: stats.approved },
            { id: 'rejected', label: 'Từ chối', icon: FaBan, count: stats.rejected },
            { id: 'request_edit', label: 'Yêu cầu sửa', icon: FaRedo, count: stats.request_edit },
            { id: 'hidden', label: 'Ẩn', icon: FaEyeSlash, count: stats.hidden || 0 },
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
              page: 1, limit: 10, sort_by: 'created_at', sort_order: 'DESC'
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
          </div>
        </div>

        {/* Articles Table */}
        <div className="article-mgmt-table-wrapper">
          <div className="article-mgmt-table-container">
            <table className="article-mgmt-table">
              <thead>
                <tr>
                  <th onClick={() => handleSortChange('id')} className="sortable">
                    ID {filters.sort_by === 'id' && (filters.sort_order === 'DESC' ? <FaSortAmountDown /> : <FaSortAmountUp />)}
                  </th>
                  <th onClick={() => handleSortChange('title')} className="sortable">
                    Tiêu đề {filters.sort_by === 'title' && (filters.sort_order === 'DESC' ? <FaSortAmountDown /> : <FaSortAmountUp />)}
                  </th>
                  <th>Danh mục</th>
                  <th>Trạng thái</th>
                  <th>Tác giả</th>
                  
                  {/* Cột đặc biệt cho Medicine */}
                  {activeTab === 'medicine' && (
                    <>
                      <th>Thành phần</th>
                      <th>Công dụng</th>
                      <th>Nhà SX</th>
                    </>
                  )}
                  
                  {/* Cột đặc biệt cho Disease */}
                  {activeTab === 'disease' && (
                    <>
                      <th>Triệu chứng</th>
                      <th>Điều trị</th>
                    </>
                  )}
                  
                  <th onClick={() => handleSortChange('created_at')} className="sortable">
                    Ngày tạo {filters.sort_by === 'created_at' && (filters.sort_order === 'DESC' ? <FaSortAmountDown /> : <FaSortAmountUp />)}
                  </th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {articles.length === 0 ? (
                  <tr>
                    <td colSpan="20" className="article-mgmt-empty">
                      <FaFileAlt className="article-mgmt-empty-icon" />
                      <p>Không có bài viết nào</p>
                    </td>
                  </tr>
                ) : (
                  articles.map(article => (
                    <tr key={article.id}>
                      <td>{article.id}</td>
                      <td className="article-mgmt-title-cell">
                        <button
                          onClick={() => handleTitleClick(article)}
                          className="article-title-link"
                          title={article.status === 'draft' ? 'Mở popup chỉnh sửa' : 
                                 ['pending', 'request_edit', 'hidden', 'rejected', 'request_rewrite'].includes(article.status) ? 'Đến trang review' : 
                                 'Xem bài viết'}
                        >
                          {article.title}
                        </button>
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
                      
                      {/* Data cho Medicine */}
                      {activeTab === 'medicine' && (
                        <>
                          <td className="article-mgmt-cell-truncate">
                            {article.medicine?.composition?.substring(0, 50) || 'N/A'}
                            {article.medicine?.composition?.length > 50 && '...'}
                          </td>
                          <td className="article-mgmt-cell-truncate">
                            {article.medicine?.uses?.substring(0, 50) || 'N/A'}
                            {article.medicine?.uses?.length > 50 && '...'}
                          </td>
                          <td>{article.medicine?.manufacturer || 'N/A'}</td>
                        </>
                      )}
                      
                      {/* Data cho Disease */}
                      {activeTab === 'disease' && (
                        <>
                          <td className="article-mgmt-cell-truncate">
                            {article.disease?.symptoms?.substring(0, 50) || 'N/A'}
                            {article.disease?.symptoms?.length > 50 && '...'}
                          </td>
                          <td className="article-mgmt-cell-truncate">
                            {article.disease?.treatments?.substring(0, 50) || 'N/A'}
                            {article.disease?.treatments?.length > 50 && '...'}
                          </td>
                        </>
                      )}
                      
                      <td>{formatDate(article.created_at)}</td>
                      <td>{renderActions(article)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="article-mgmt-pagination">
            <button
              className="article-mgmt-btn-page"
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
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
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.totalPages}
            >
              Sau
            </button>
          </div>
        )}

        {/* Modal Form */}
        {showModal && (
          <div className="article-mgmt-modal-overlay" onClick={closeModal}>
            <div className="article-mgmt-modal" onClick={(e) => e.stopPropagation()}>
              <div className="article-mgmt-modal-header">
                <h2 className="article-mgmt-modal-title">
                  {modalType === 'create' && 'Tạo bài viết mới'}
                  {modalType === 'edit' && 'Chỉnh sửa bài viết'}
                </h2>
                <button className="article-mgmt-modal-close" onClick={closeModal}>
                  <FaTimes />
                </button>
              </div>

              <div className="article-mgmt-modal-body">
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
                    />
                  </div>

                  {/* Danh mục */}
                  <div className="article-mgmt-form-group">
                    <label className="article-mgmt-form-label">Danh mục *</label>
                    <select
                      name="category_id"
                      value={formData.category_id}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="article-mgmt-form-select"
                      required
                    >
                      <option value="">Chọn danh mục</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Các trường cho Medicine */}
                  {selectedCategoryType === 'thuoc' && (
                    <div className="article-mgmt-medical-fields">
                      <h4>Thông tin thuốc</h4>
                      <div className="article-mgmt-form-group">
                        <label className="article-mgmt-form-label">Thành phần</label>
                        <textarea
                          name="composition"
                          value={formData.composition}
                          onChange={handleFormChange}
                          className="article-mgmt-form-textarea"
                          rows="3"
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
                        />
                      </div>
                    </div>
                  )}

                  {/* Các trường cho Disease */}
                  {selectedCategoryType === 'benh_ly' && (
                    <div className="article-mgmt-medical-fields">
                      <h4>Thông tin bệnh lý</h4>
                      <div className="article-mgmt-form-group">
                        <label className="article-mgmt-form-label">Triệu chứng</label>
                        <textarea
                          name="symptoms"
                          value={formData.symptoms}
                          onChange={handleFormChange}
                          className="article-mgmt-form-textarea"
                          rows="3"
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
                        />
                      </div>
                    </div>
                  )}

                  {/* Nội dung */}
                  <div className="article-mgmt-form-group">
                    <label className="article-mgmt-form-label">
                      <FaFileAlt /> Nội dung *
                    </label>
                    <CKEditor
                      editor={ClassicEditor}
                      config={editorConfig}
                      data={formData.content}
                      onChange={handleContentChange}
                    />
                  </div>

                  {/* Tags */}
                  <div className="article-mgmt-form-group">
                    <label className="article-mgmt-form-label">Tags</label>
                    <div className="article-mgmt-tags-container">
                      {formData.tags_json.map((tag, index) => (
                        <span key={index} className="article-mgmt-tag-item">
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(index)}
                            className="article-mgmt-tag-remove"
                          >
                            <FaTimes />
                          </button>
                        </span>
                      ))}
                    </div>
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
                        <div className="article-mgmt-tags-suggest">
                          {suggestedTags.map((tag, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => addTag(tag)}
                              className="article-mgmt-tag-suggest-item"
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Nguồn */}
                  <div className="article-mgmt-form-group">
                    <label className="article-mgmt-form-label">Nguồn</label>
                    <input
                      type="text"
                      name="source"
                      value={formData.source}
                      onChange={handleFormChange}
                      className="article-mgmt-form-input"
                      placeholder="https://..."
                    />
                  </div>

                  {/* Import File */}
                  <div className="article-mgmt-form-group">
                    <label className="article-mgmt-form-label">Import từ file</label>
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

                  {/* Form Actions */}
                  <div className="article-mgmt-form-actions">
                    <button
                      type="submit"
                      className="article-mgmt-btn article-mgmt-btn-primary"
                      onClick={(e) => handleSubmit(e, false)}
                    >
                      <FaPaperPlane /> Gửi phê duyệt
                    </button>
                    <button
                      type="button"
                      className="article-mgmt-btn article-mgmt-btn-secondary"
                      onClick={(e) => handleSubmit(e, true)}
                    >
                      <FaSave /> Lưu nháp
                    </button>
                    <button
                      type="button"
                      className="article-mgmt-btn article-mgmt-btn-cancel"
                      onClick={closeModal}
                    >
                      <FaTimes /> Đóng
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Popup ẩn bài viết */}
        {showHidePopup && articleToHide && (
          <HideArticlePopup
            articleId={articleToHide.id}
            articleTitle={articleToHide.title}
            onClose={() => {
              setShowHidePopup(false);
              setArticleToHide(null);
            }}
            onSuccess={() => {
              setShowHidePopup(false);
              setArticleToHide(null);
              fetchArticles();
            }}
          />
        )}
      </div>
    </div>
  );
};

export default ArticleManagementPage;