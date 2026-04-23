// client/src/pages/ArticleManagementPage.js - VERSION 4.4 - ĐÃ ĐỒNG BỘ CSS
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import DecoupledEditor from '@ckeditor/ckeditor5-build-decoupled-document';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { 
  FaPlus, FaEdit, FaTrash, FaEye, FaEyeSlash, FaSearch, FaTimes, 
  FaFilter, FaSortAmountDown, FaSortAmountUp, FaCheck, FaBan, FaRedo,
  FaNewspaper, FaPills, FaDisease, FaFileAlt, FaCopy, FaHistory,
  FaPaperPlane, FaSave, FaExternalLinkAlt, FaSpinner, FaClock,
  FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaUser,
  FaInfoCircle, FaImage, FaUpload, FaLink, FaTags, FaCog, FaFileImport,
  FaFileExcel, FaFileCsv, FaFileDownload
} from 'react-icons/fa';
import usePermissions from '../hooks/usePermissions';
import './ArticleManagementPage.css';

// ============================================
// HELPER FUNCTIONS BÊN NGOÀI COMPONENT
// ============================================

/**
 * Helper: Lấy tên cột hiển thị
 */
function getColumnName(key) {
  const names = {
    id: 'ID',
    title: 'Tiêu đề',
    tags: 'Tags',
    category: 'Danh mục',
    status: 'Trạng thái',
    author: 'Tác giả',
    created_at: 'Ngày tạo',
    views: 'Lượt xem',
    composition: 'Thành phần',
    uses: 'Công dụng',
    manufacturer: 'Nhà sản xuất',
    symptoms: 'Triệu chứng',
    treatments: 'Điều trị'
  };
  return names[key] || key;
}

const ArticleManagementPage = () => {
  const navigate = useNavigate();
  const API_BASE_URL = 'http://localhost:3001';
  
  // 🔐 HOOK KIỂM TRA QUYỀN
  const { user: authUser, canAccessModule, hasPermission, isAdmin } = usePermissions();
  
  // ============================================
  // QUẢN LÝ STATE
  // ============================================

  const [user, setUser] = useState({});
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [showHidePopup, setShowHidePopup] = useState(false);
  const [articleToHide, setArticleToHide] = useState(null);
  const [hideReason, setHideReason] = useState('');
  const [hidingArticle, setHidingArticle] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const [filters, setFilters] = useState({
    search: '', status: '', category_id: '', category_type: '', page: 1, limit: 10,
    sort_by: 'created_at', sort_order: 'DESC'
  });

  const initialFormData = useMemo(() => ({
    title: '', content: '', category_id: '', tags_json: [], source: '',
    name: '', unit: '',
    composition: '', uses: '', side_effects: '', image_url: '', manufacturer: '', 

    excellent_review_percent: 0, average_review_percent: 0, poor_review_percent: 0, 
    components: '', medicine_usage: '', symptoms: '', treatments: '', description: '',
    entity_id: null, entity_type: null
  }), []);
  
  const [formData, setFormData] = useState(initialFormData);

  const [coverImage, setCoverImage] = useState(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [imageUploadMethod, setImageUploadMethod] = useState('file');
  const [tempImageUrl, setTempImageUrl] = useState('');

  const [pagination, setPagination] = useState({});
  const [stats, setStats] = useState({
    total: 0, draft: 0, pending: 0, approved: 0, rejected: 0, hidden: 0
  });

  const [tagInput, setTagInput] = useState('');
  const [suggestedTags, setSuggestedTags] = useState([]);
  const [selectedCategoryType, setSelectedCategoryType] = useState('');

  const [visibleColumns, setVisibleColumns] = useState({
    id: true, title: true, tags: true, category: true, status: true, author: true,
    created_at: true, views: false, composition: false, uses: false, manufacturer: false,
    symptoms: false, treatments: false
  });
  const [showColumnSelector, setShowColumnSelector] = useState(false);

  const [showAdminPublishChoice, setShowAdminPublishChoice] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const [deleteArticleId, setDeleteArticleId] = useState(null);
  const [showRejectPopup, setShowRejectPopup] = useState(false);
  const [articleToReject, setArticleToReject] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [showAdminEditWarning, setShowAdminEditWarning] = useState(false);
  const [editingApprovedArticle, setEditingApprovedArticle] = useState(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState(null);

  const [toasts, setToasts] = useState([]);

  const [entitySearch, setEntitySearch] = useState('');
  const [entitySearchResults, setEntitySearchResults] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [searchingEntity, setSearchingEntity] = useState(false);

  const DELETE_COUNTDOWN = 5;
  const HIDE_COUNTDOWN = 5;


  // ============================================
  // HÀM LẤY ẢNH BÌA TỪ CONTENT
  // ============================================
  const getFirstImageFromContent = useCallback((htmlContent) => {
    if (!htmlContent) return null;
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      const img = doc.querySelector('img');
      const src = img ? img.getAttribute('src') : null;
      if (src && (src.startsWith('http') || src.startsWith('/uploads'))) {
        return src.startsWith('/uploads') ? `${API_BASE_URL}${src}` : src;
      }
      return null;
    } catch (error) {
      console.error('Error parsing HTML for image:', error);
      return null;
    }
  }, [API_BASE_URL]);

  // ============================================
  // CÁC HÀM HELPER CHO JSX (FIX LỖI no-undef)
  // ============================================
  
  /**
   * Lấy text hiển thị cho status
   */
  const getStatusText = (status) => {
    const statusMap = {
      draft: 'Nháp', pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối',
      hidden: 'Đã ẩn', request_edit: 'Yêu cầu sửa', request_rewrite: 'Yêu cầu viết lại'
    };
    return statusMap[status] || status;
  };

  /**
   * Lấy class CSS cho status badge (ĐÃ SỬA ĐỂ KHỚP VỚI CSS)
   */
  const getStatusClass = (status) => {
    // Dựa trên ArticleManagementPage.css
    const classMap = {
      draft: 'article-mgmt-status-draft', 
      pending: 'article-mgmt-status-pending',
      approved: 'article-mgmt-status-approved', 
      rejected: 'article-mgmt-status-rejected',
      hidden: 'article-mgmt-status-hidden', 
      request_edit: 'status-request-edit',
      request_rewrite: 'status-request-rewrite'
    };
    return classMap[status] || '';
  };
  
  /**
   * Lấy icon cho loại danh mục
   */
  const getCategoryIcon = (categoryType) => {
    const iconMap = {
      tin_tuc: <FaNewspaper />, thuoc: <FaPills />, benh_ly: <FaDisease />
    };
    return iconMap[categoryType] || <FaFileAlt />;
  };

  /**
   * Toggle hiển thị cột
   */
  const toggleColumn = (columnName) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnName]: !prev[columnName]
    }));
  };
  
  /**
   * Lấy URL cho bài viết đã duyệt
   */
  const getCategoryTypeUrl = (article) => {
    const typeMap = {
      'tin_tuc': 'tin-tuc', 'thuoc': 'thuoc', 'benh_ly': 'benh-ly'
    };
    const categoryType = typeMap[article.category?.category_type] || 'tin-tuc';
    return `/${categoryType}/${article.slug}`;
  };

  // ============================================
  // TOAST & CONFIRM MANAGEMENT
  // ============================================

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const showConfirm = (title, message, onConfirm, confirmText = 'Xác nhận', type = 'warning', onCancelWithoutSave = null, cancelWithoutSaveText = 'Không lưu') => {
    setConfirmAction({
      title, message, onConfirm, confirmText, type,
      onCancelWithoutSave, cancelWithoutSaveText
    });
    setShowConfirmDialog(true);
  };

  const closeConfirm = () => {
    setShowConfirmDialog(false);
    setConfirmAction(null);
  };

  const handleConfirm = () => {
    if (confirmAction?.onConfirm) {
      confirmAction.onConfirm();
    }
    closeConfirm();
  };
  
  // ============================================
  // CKEDITOR - UPLOAD ADAPTER
  // ============================================
  
  class MyUploadAdapter {
    constructor(loader) {
      this.loader = loader;
    }

    upload() {
      return this.loader.file.then(file => new Promise((resolve, reject) => {
        if (!file) return reject('Không có file được chọn');

        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
          return reject('Chỉ hỗ trợ JPEG, PNG, GIF, WEBP');
        }

        if (file.size > 5 * 1024 * 1024) {
          return reject('File quá lớn, tối đa 5MB');
        }

        const formDataUpload = new FormData();
        formDataUpload.append('upload', file); 

        axios.post(`${API_BASE_URL}/api/upload/ckeditor-image`, formDataUpload, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'multipart/form-data'
          }
        })
        .then(response => {
          if (response.data.uploaded && response.data.url) {
            resolve({ default: response.data.url }); 
          } else {
            reject(response.data.message || 'Upload thất bại (Server trả về format sai)');
          }
        })
        .catch(error => {
          reject(error.response?.data?.error?.message || error.response?.data?.message || 'Lỗi server khi upload ảnh');
        });
      }));
    }

    abort() {}
  }

  function MyCustomUploadAdapterPlugin(editor) {
    // 🔧 NULL CHECK: Đảm bảo editor và plugins đã sẵn sàng
    if (!editor || !editor.plugins) {
      console.warn('⚠️ CKEditor chưa khởi tạo đầy đủ - plugins null');
      return;
    }
    
    try {
      // Đảm bảo FileRepository được lấy chính xác
      const fileRepository = editor.plugins.get('FileRepository');
      if (fileRepository) {
        fileRepository.createUploadAdapter = (loader) => {
          return new MyUploadAdapter(loader);
        };
      } else {
        // Cảnh báo nếu không tìm thấy, nhưng không gây lỗi crash
        console.warn('CKEditor FileRepository plugin not found or not initialized.');
      }
    } catch (error) {
      console.error('⚠️ Lỗi khi khởi tạo upload adapter:', error);
    }
  }

  // ============================================
  // LIFECYCLE & FETCH DATA
  // ============================================
  
  // 🔐 KIỂM TRA QUYỀN TRUY CẬP
  useEffect(() => {
    // Chỉ check khi authUser đã load
    if (!authUser) return;
    
    // Admin hoặc có quyền articles → OK
    if (isAdmin || canAccessModule('articles')) {
      return;
    }
    
    // Không có quyền → Redirect
    console.warn('⚠️ User không có quyền truy cập Quản lý bài viết');
    navigate('/404');
  }, [authUser, isAdmin]); // Bỏ canAccessModule khỏi dependencies

  useEffect(() => {
    fetchUserInfo();
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [filters]);

  useEffect(() => {
    // Lock/Unlock scroll
    if (showModal || showHidePopup || showRejectPopup || showAdminEditWarning || showSubmitConfirm || showAdminPublishChoice) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('modal-open');
    } else {
      document.body.style.overflow = 'unset';
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.style.overflow = 'unset';
      document.body.classList.remove('modal-open');
    };
  }, [showModal, showHidePopup, showRejectPopup, showAdminEditWarning, showSubmitConfirm, showAdminPublishChoice]);

  useEffect(() => {
    if (countdownSeconds > 0) {
      const timer = setTimeout(() => {
        setCountdownSeconds(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdownSeconds]);

  const fetchUserInfo = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/users/profile`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.data.success) {
        setUser(response.data.user);
      }
    } catch (error) {
      console.error('Lỗi khi lấy thông tin user:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/articles/categories`);
      if (response.data.success) {
        setCategories(response.data.categories || []);
      }
    } catch (error) {
      console.error('Lỗi khi lấy danh mục:', error);
      showToast('Không thể tải danh sách danh mục', 'error');
    }
  };

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const params = { ...filters };
      
      const response = await axios.get(`${API_BASE_URL}/api/articles`, {
        params,
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.data.success) {
        setArticles(response.data.articles || []);
        setPagination(response.data.pagination || {});
        
        if (response.data.stats) {
          setStats(response.data.stats);
        }
      }
    } catch (error) {
      console.error('Lỗi khi lấy bài viết:', error);
      showToast('Không thể tải danh sách bài viết', 'error');
    } finally {
      setLoading(false);
    }
  };


  // ============================================
  // ENTITY MANAGEMENT
  // ============================================
  
  const handleEntitySearch = async (searchTerm) => {
    setEntitySearch(searchTerm);
    
    if (!searchTerm || searchTerm.trim().length < 2) {
      setEntitySearchResults([]);
      return;
    }

    const categoryType = selectedCategoryType;
    let entityType = null;
    
    if (categoryType === 'thuoc') {
      entityType = 'medicine';
    } else if (categoryType === 'benh_ly') {
      entityType = 'disease';
    } else {
      return;
    }

    try {
      setSearchingEntity(true);
      const token = localStorage.getItem('token');
      const endpoint = entityType === 'medicine' 
        ? `/api/articles/medicines?search=${encodeURIComponent(searchTerm)}&limit=10&hidden=false`
        : `/api/articles/diseases?search=${encodeURIComponent(searchTerm)}&limit=10&hidden=false`;

      const response = await axios.get(
        `${API_BASE_URL}${endpoint}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        const results = response.data.medicines || response.data.diseases || [];
        setEntitySearchResults(results);
      }
    } catch (error) {
      console.error('Lỗi khi tìm kiếm entity:', error);
      setEntitySearchResults([]);
    } finally {
      setSearchingEntity(false);
    }
  };

  const handleSelectEntity = (entity) => {
    setSelectedEntity(entity);
    
    setFormData(prev => ({
      ...prev,
      entity_id: entity.id,
      entity_type: selectedCategoryType === 'thuoc' ? 'medicine' : 'disease',
      
      title: prev.title || `Thông tin về ${entity.name}`,
      
      tags_json: prev.tags_json.length === 0 
        ? [entity.name, entity.Category?.name || ''].filter(Boolean)
        : prev.tags_json
    }));
    
    setEntitySearch('');
    setEntitySearchResults([]);
    setHasUnsavedChanges(true);
    
    showToast(`Đã liên kết với ${entity.name}`, 'success');
  };

  const handleClearEntity = () => {
    setSelectedEntity(null);
    setFormData(prev => ({
      ...prev,
      entity_id: null,
      entity_type: null
    }));
    setEntitySearch('');
    setEntitySearchResults([]);
    setHasUnsavedChanges(true);
  };

  // ============================================
  // BỘ LỌC VÀ PHÂN TRANG
  // ============================================

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      search: '', status: '', category_id: '', category_type: '', page: 1, limit: 10,
      sort_by: 'created_at', sort_order: 'DESC'
    });
  };

  // ============================================
  // MODAL & FORM HANDLERS
  // ============================================
  
  const openCreateModal = () => {
    // Reset Entity
    setEntitySearch('');
    setEntitySearchResults([]);
    setSelectedEntity(null);
    setFormData(initialFormData);
    setSelectedCategoryType('');
    setCoverImage(null);
    setTempImageUrl('');
    setImageUploadMethod('file');

    setModalType('create');
    setSelectedArticle(null);
    setHasUnsavedChanges(false);
    setShowModal(true);
  };

  const handleOpenModal = (type, article = null) => {
    // Reset Entity
    setEntitySearch('');
    setEntitySearchResults([]);
    setSelectedEntity(null);

    setModalType(type);
    setShowModal(true);
    setHasUnsavedChanges(false);

    if (type === 'create') {
      openCreateModal();
      return;
    } 
    
    if (type === 'edit' && article) {
      // Admin Warning
      if (article.status === 'approved' && user.role === 'admin') {
        setEditingApprovedArticle(article);
        setShowAdminEditWarning(true);
        return;
      }
      
      // Fetch detail and populate form
      const articleToEdit = articles.find(a => a.id === article.id);
      if (!articleToEdit) {
        showToast('Không tìm thấy bài viết để sửa', 'error');
        return;
      }
      
      setSelectedArticle(articleToEdit);
      
      let linkedEntity = null;
      if (articleToEdit.entity_type === 'medicine' && articleToEdit.medicine) {
        linkedEntity = articleToEdit.medicine;
      } else if (articleToEdit.entity_type === 'disease' && articleToEdit.disease) {
        linkedEntity = articleToEdit.disease;
      }
      setSelectedEntity(linkedEntity);

      const category = categories.find(c => c.id === articleToEdit.category_id);
      const categoryType = category?.category_type || '';
      setSelectedCategoryType(categoryType);
      
      setFormData({
        title: articleToEdit.title || '',
        content: articleToEdit.content || '',
        category_id: articleToEdit.category_id || '',
        tags_json: articleToEdit.tags_json || [],
        source: articleToEdit.source || '',
        name: articleToEdit.name || linkedEntity?.name || '',
        unit: linkedEntity?.unit || 'Hộp',
        composition: linkedEntity?.composition || '',
        uses: linkedEntity?.uses || '',
        side_effects: linkedEntity?.side_effects || '',
        image_url: articleToEdit.image_url || linkedEntity?.image_url || '',
        manufacturer: linkedEntity?.manufacturer || '',
        excellent_review_percent: linkedEntity?.excellent_review_percent || 0,
        average_review_percent: linkedEntity?.average_review_percent || 0,
        poor_review_percent: linkedEntity?.poor_review_percent || 0,
        components: linkedEntity?.components || '',
        medicine_usage: linkedEntity?.medicine_usage || '',
        symptoms: linkedEntity?.symptoms || '',
        treatments: linkedEntity?.treatments || '',
        description: linkedEntity?.description || '',
        entity_id: articleToEdit.entity_id || null,
        entity_type: articleToEdit.entity_type || null
      });

      const finalCoverImage = articleToEdit.image_url || linkedEntity?.image_url || null;
      setCoverImage(finalCoverImage);
      setTempImageUrl(finalCoverImage || '');
      setImageUploadMethod(finalCoverImage ? (finalCoverImage.startsWith('http') ? 'url' : 'file') : 'file');
    }
  };

  const handleCloseModal = () => {
    if (hasUnsavedChanges) {
      if (!window.confirm('Bạn có thay đổi chưa lưu. Bạn có chắc muốn đóng?')) {
        return;
      }
    }

    setShowModal(false);
    setModalType('');
    setSelectedArticle(null);
    setHasUnsavedChanges(false);
    
    // Reset entity state
    setEntitySearch('');
    setEntitySearchResults([]);
    setSelectedEntity(null);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setHasUnsavedChanges(true);
  };

  const handleCategoryChange = (e) => {
    const categoryId = e.target.value;
    
    setFormData(prev => ({ 
      ...prev, 
      category_id: categoryId,
      entity_id: null,
      entity_type: null
    }));
    
    setSelectedEntity(null);
    setEntitySearch('');
    setEntitySearchResults([]);
    setHasUnsavedChanges(true);
  };

  const handleCategoryTypeChange = (e) => {
    const type = e.target.value;
    setSelectedCategoryType(type);
    
    setFormData(prev => ({
      ...prev,
      category_id: '',
      entity_id: null,
      entity_type: null
    }));
    
    setSelectedEntity(null);
    setEntitySearch('');
    setEntitySearchResults([]);
    setHasUnsavedChanges(true);
  };

  /**
   * Xử lý upload ảnh bìa
   */
  const handleCoverImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showToast('Chỉ hỗ trợ JPEG, PNG, GIF, WEBP', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('File quá lớn, tối đa 5MB', 'error');
      return;
    }

    try {
      setUploadingCover(true);
      const formDataUpload = new FormData();
      formDataUpload.append('image', file);

      const response = await axios.post(`${API_BASE_URL}/api/upload/image`, formDataUpload, {
          headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setCoverImage(response.data.url);
        setFormData(prev => ({ ...prev, image_url: response.data.url }));
        setTempImageUrl(response.data.url);
        showToast('Upload ảnh thành công', 'success');
        setHasUnsavedChanges(true);
      }
    } catch (error) {
      console.error('Lỗi upload ảnh:', error);
      showToast('Upload ảnh thất bại', 'error');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleImageUrlSubmit = () => {
    if (!tempImageUrl.trim()) {
      showToast('Vui lòng nhập URL ảnh', 'error');
      return;
    }
    
    try {
      new URL(tempImageUrl);
      setCoverImage(tempImageUrl);
      setFormData(prev => ({ ...prev, image_url: tempImageUrl }));
      showToast('Đã thêm ảnh từ URL', 'success');
      setHasUnsavedChanges(true);
    } catch {
      showToast('URL không hợp lệ', 'error');
    }
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (!tag || formData.tags_json.includes(tag)) {
      if(formData.tags_json.includes(tag)) showToast('Tag đã tồn tại', 'warning');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      tags_json: [...prev.tags_json, tag]
    }));
    setTagInput('');
    setHasUnsavedChanges(true);
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags_json: prev.tags_json.filter(t => t !== tagToRemove)
    }));
    setHasUnsavedChanges(true);
  };

  const handleFileImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      if (file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setFormData(prev => ({ ...prev, content: result.value }));
        showToast('Đã import nội dung từ Word', 'success');
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const html = XLSX.utils.sheet_to_html(firstSheet);
        setFormData(prev => ({ ...prev, content: html }));
        showToast('Đã import nội dung từ Excel', 'success');
      } else {
        showToast('Chỉ hỗ trợ file .docx, .doc, .xlsx, .xls', 'error');
      }
    } catch (error) {
      console.error('Lỗi khi import file:', error);
      showToast('Import file thất bại', 'error');
    }
  };

  // ============================================
  // HÀM handleSubmit (ĐÃ FIX LỖI POST/PUT)
  // ============================================

  const handleSubmit = async (e, isDraft = false, isAdminDirectPublish = false, skipConfirm = false) => {
    if (e) e.preventDefault();

    // ===== VALIDATION CƠ BẢN =====
    if (!formData.title.trim()) {
      showToast('Vui lòng nhập tiêu đề', 'warning');
      return;
    }

    if (!formData.content.trim() && !isDraft) {
      showToast('Vui lòng nhập nội dung (Không thể gửi phê duyệt nội dung trống)', 'warning');
      return;
    }

    if (!formData.category_id) {
      showToast('Vui lòng chọn danh mục', 'warning');
      return;
    }

    if ((selectedCategoryType === 'thuoc' || selectedCategoryType === 'benh_ly') 
        && !formData.entity_id) {
      showToast(
        `Vui lòng liên kết với ${selectedCategoryType === 'thuoc' ? 'thuốc' : 'bệnh lý'}`, 
        'error'
      );
      return;
    }

    // ===== XỬ LÝ ẢNH BÌA TỰ ĐỘNG =====
    
    const firstImageInContent = getFirstImageFromContent(formData.content);
    
    let finalCoverImage = coverImage || tempImageUrl || formData.image_url;
    
    // Nếu không có ảnh upload/URL nhưng có ảnh trong content → dùng ảnh đó
    if (!finalCoverImage && firstImageInContent) {
      finalCoverImage = firstImageInContent;
      setCoverImage(firstImageInContent);
      setFormData(prev => ({ ...prev, image_url: firstImageInContent }));
      showToast('Đã lấy ảnh bìa tự động từ nội dung bài viết.', 'info');
    }
    
    // ===== VALIDATION ẢNH BÌA CUỐI CÙNG (Chỉ chặn nếu là gửi duyệt/publish) =====
    if (!finalCoverImage && !isDraft) {
      showToast('⚠️ Bài viết chưa có ảnh bìa! Vui lòng thêm ảnh để gửi phê duyệt/đăng bài.', 'error');
      return;
    }
    
    // ===== THÊM ẢNH BÌA VÀO CUỐI CONTENT (nếu chưa có) =====
    let finalContent = formData.content;
    
    if (finalCoverImage && !finalContent.includes(finalCoverImage)) {
      const imageHtml = `<figure class="image image-style-side"><img src="${finalCoverImage}" alt="${formData.title}"></figure>`;
      finalContent = finalContent + imageHtml;
    }
    
    // ===== XỬ LÝ CONFIRM & CHỌN CÁCH ĐĂNG =====
    if (!isDraft && user.role === 'admin' && !isAdminDirectPublish) {
      setShowAdminPublishChoice(true);
      return;
    }

    if (!isDraft && user.role !== 'admin' && !skipConfirm) {
      setPendingSubmitData({ isDraft: false, isAdminDirectPublish: false });
      setShowSubmitConfirm(true);
      return;
    }

    // ===== CHUẨN BỊ DATA GỬI LÊN SERVER =====
    try {
      const submitData = {
        title: formData.title,
        content: finalContent,
        category_id: formData.category_id,
        tags_json: formData.tags_json,
        source: formData.source,
        isDraft: isDraft,
        isAdminDirectPublish: isAdminDirectPublish,
        entity_id: formData.entity_id,
        entity_type: formData.entity_type
      };

      setLoading(true);
      let response;

      // ✅ FIX LỖI QUAN TRỌNG: Dùng POST cho CREATE, PUT cho UPDATE
      if (modalType === 'create') {
        response = await axios.post(`${API_BASE_URL}/api/articles`, submitData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      } else {
        response = await axios.put(`${API_BASE_URL}/api/articles/${selectedArticle.id}`, submitData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      }

      // ===== XỬ LÝ RESPONSE =====
      if (response.data.success) {
        if (user.role === 'admin' && modalType === 'edit' && selectedArticle.author_id !== user.id) {
          try {
            await axios.put(
              `${API_BASE_URL}/api/notifications`,
              {
                user_id: selectedArticle.author_id,
                type: 'article_edited_by_admin',
                title: 'Bài viết của bạn đã được Admin cập nhật',
                message: `Admin ${user.full_name} vừa cập nhật bài viết "${formData.title}" của bạn.`,
                reference_type: 'article',
                reference_id: selectedArticle.id
              },
              { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            );
          } catch (notifError) {
            console.error('Lỗi khi gửi thông báo:', notifError);
          }
        }

        const message = isDraft 
          ? 'Đã lưu bài viết dưới dạng nháp' 
          : isAdminDirectPublish
            ? 'Đã đăng bài viết công khai'
            : modalType === 'create' 
              ? 'Tạo bài viết thành công' 
              : 'Cập nhật bài viết thành công';
            
        showToast(message, 'success');
        setShowModal(false);
        setShowAdminPublishChoice(false);
        setHasUnsavedChanges(false);
        fetchArticles();
      }
    } catch (error) {
      console.error('Lỗi khi lưu bài viết:', error);
      showToast(
        error.response?.data?.message || 'Có lỗi xảy ra khi lưu bài viết',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Xử lý xóa bài viết
   */
  const handleDelete = async (articleId) => {
    setDeleteArticleId(articleId);
    setCountdownSeconds(DELETE_COUNTDOWN);
    
    showConfirm(
      'Xác nhận xóa',
      `Bạn có chắc chắn muốn xóa bài viết này? Hành động này không thể hoàn tác.`,
      () => performDelete(articleId),
      'Xóa',
      'danger'
    );
  };

  /**
   * Thực hiện xóa bài viết
   */
  const performDelete = async (articleId) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/api/articles/${articleId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.data.success) {
        showToast('Đã xóa bài viết', 'success');
        fetchArticles();
        setStats(prev => ({ ...prev, total: prev.total - 1 }));
      }
    } catch (error) {
      console.error('Lỗi khi xóa bài viết:', error);
      showToast('Không thể xóa bài viết', 'error');
    } finally {
      setDeleteArticleId(null);
      setCountdownSeconds(0);
    }
  };

  /**
   * Mở popup ẩn/hiện bài viết (Admin only)
   */
  const openHidePopup = (article) => {
    setArticleToHide(article);
    setHideReason('');
    setCountdownSeconds(article.status === 'hidden' ? 0 : HIDE_COUNTDOWN);
    setShowHidePopup(true);
  };

  /**
   * Xử lý ẩn/hiện bài viết
   */
  const handleHideArticle = async (e) => {
    e.preventDefault();
    
    if (!hideReason.trim()) {
      showToast('Vui lòng nhập lý do', 'error');
      return;
    }

    if (countdownSeconds > 0) {
      return; // Chưa hết countdown
    }

    try {
      setHidingArticle(true);
      const endpoint = articleToHide.status === 'hidden' ? 'unhide' : 'hide';
      
      const response = await axios.post(
        `${API_BASE_URL}/api/articles/${articleToHide.id}/${endpoint}`,
        { reason: hideReason },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      if (response.data.success) {
        showToast(
          `Đã ${articleToHide.status === 'hidden' ? 'hiện' : 'ẩn'} bài viết`,
          'success'
        );
        setShowHidePopup(false);
        setArticleToHide(null);
        setHideReason('');
        setCountdownSeconds(0);
        fetchArticles();
      }
    } catch (error) {
      console.error('Lỗi khi ẩn/hiện bài viết:', error);
      showToast('Có lỗi xảy ra', 'error');
    } finally {
      setHidingArticle(false);
    }
  };

  /**
   * Xử lý duplicate bài viết
   */
  const handleDuplicate = async (article) => {
    showConfirm(
      'Nhân bản bài viết',
      `Bạn có muốn nhân bản bài viết "${article.title}"?\n\nBài viết mới sẽ có tên "${article.title} (Copy)" và ở trạng thái Nháp.`,
      async () => {
        try {
          const response = await axios.post(
            `${API_BASE_URL}/api/articles/${article.id}/duplicate`,
            {},
            { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
          );

          if (response.data.success) {
            showToast('Đã nhân bản bài viết', 'success');
            fetchArticles();
          }
        } catch (error) {
          console.error('Lỗi khi nhân bản bài viết:', error);
          showToast('Không thể nhân bản bài viết', 'error');
        }
      },
      'Nhân bản',
      'info'
    );
  };

  const handleSortColumn = (column) => {
    setFilters(prev => ({
      ...prev,
      sort_by: column,
      sort_order: prev.sort_by === column && prev.sort_order === 'DESC' ? 'ASC' : 'DESC'
    }));
  };
  
  const handleEditArticle = async (article) => {
    const isAdmin = user.role === 'admin';
    const status = article.status;

    if (isAdmin && status === 'approved') {
      setEditingApprovedArticle(article);
      setShowAdminEditWarning(true);
      return;
    }
    
    handleOpenModal('edit', article);
  };

  const handleAdminEditChoice = async (choice) => {
    const article = editingApprovedArticle;
    
    if (choice === 'hide-first') {
      try {
        const token = localStorage.getItem('token');
        await axios.post(
          `${API_BASE_URL}/api/articles/${article.id}/hide`,
          { reason: 'Admin đang chỉnh sửa bài viết' },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        showToast('Đã ẩn bài viết. Bạn có thể chỉnh sửa an toàn.', 'success');
        await fetchArticles();
        
        setTimeout(() => {
          handleOpenModal('edit', article);
        }, 500);
        
      } catch (error) {
        showToast('Lỗi khi ẩn bài viết: ' + (error.response?.data?.message || error.message), 'error');
      }
    } else if (choice === 'direct') {
      handleOpenModal('edit', article);
    }
    
    setShowAdminEditWarning(false);
    setEditingApprovedArticle(null);
  };

  const handleRequestRewrite = async (article) => {
    showConfirm(
      'Yêu cầu viết lại',
      `Bạn muốn yêu cầu tác giả viết lại bài viết "${article.title}"?`,
      async () => {
        try {
          const response = await axios.post(
            `${API_BASE_URL}/api/articles/${article.id}/request-rewrite`,
            {},
            { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
          );

          if (response.data.success) {
            showToast('Đã gửi yêu cầu viết lại đến tác giả', 'success');
            fetchArticles();
          }
        } catch (error) {
          console.error('Lỗi khi gửi yêu cầu viết lại:', error);
          showToast(
            error.response?.data?.message || 'Có lỗi xảy ra',
            'error'
          );
        }
      },
      'Gửi yêu cầu',
      'warning'
    );
  };

  // const viewArticle = (article) => { /* Logic đã chuyển vào hàm riêng */ };

  // const viewHistory = (articleId) => { /* Logic đã chuyển vào hàm riêng */ };

  const handleRequestEdit = async (article) => {
    showConfirm(
      'Yêu cầu chỉnh sửa',
      `Bạn muốn gửi yêu cầu chỉnh sửa bài viết "${article.title}"? Admin sẽ xem xét và phê duyệt.`,
      async () => {
        try {
          const response = await axios.post(
            `${API_BASE_URL}/api/articles/${article.id}/request-edit`,
            {},
            { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
          );

          if (response.data.success) {
            showToast('Đã gửi yêu cầu chỉnh sửa đến Admin', 'success');
            fetchArticles();
          }
        } catch (error) {
          console.error('Lỗi khi gửi yêu cầu chỉnh sửa:', error);
          showToast(
            error.response?.data?.message || 'Có lỗi xảy ra',
            'error'
          );
        }
      },
      'Gửi yêu cầu',
      'info'
    );
  };
  
  const handleApproveEditRequest = async (articleId) => {
    showConfirm(
      'Đồng ý cho chỉnh sửa',
      'Bạn có chắc chắn muốn cho phép tác giả chỉnh sửa bài viết này?',
      async () => {
        try {
          const response = await axios.post(
            `${API_BASE_URL}/api/articles/${articleId}/approve-edit-request`,
            {},
            { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
          );
  
          if (response.data.success) {
            showToast('Đã cho phép tác giả chỉnh sửa', 'success');
            fetchArticles();
          }
        } catch (error) {
          console.error('Lỗi khi phê duyệt yêu cầu:', error);
          showToast(
            error.response?.data?.message || 'Có lỗi xảy ra',
            'error'
          );
        }
      },
      'Đồng ý',
      'info'
    );
  };
  
  const handleRejectEditRequest = async (e) => {
    if (e) e.preventDefault();
  
    if (!rejectReason.trim()) {
      showToast('Vui lòng nhập lý do từ chối', 'warning');
      return;
    }
  
    setRejecting(true);
  
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/articles/${articleToReject.id}/reject-edit-request`,
        { reason: rejectReason },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
  
      if (response.data.success) {
        showToast('Đã từ chối yêu cầu chỉnh sửa', 'success');
        fetchArticles();
        setShowRejectPopup(false);
        setRejectReason('');
        setArticleToReject(null);
      } else {
        showToast(response.data.message || 'Lỗi khi từ chối', 'error');
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Lỗi server', 'error');
    } finally {
      setRejecting(false);
    }
  };

  const handleApproveArticle = async (articleId) => {
    showConfirm(
      'Phê duyệt bài viết',
      'Bạn có chắc chắn muốn phê duyệt bài viết này?',
      async () => {
        try {
          const response = await axios.post(
            `${API_BASE_URL}/api/articles/${articleId}/review`,
            { action: 'approve' },
            { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
          );
  
          if (response.data.success) {
            showToast('Đã phê duyệt bài viết', 'success');
            fetchArticles();
          }
        } catch (error) {
          console.error('Lỗi khi phê duyệt:', error);
          showToast(
            error.response?.data?.message || 'Có lỗi xảy ra',
            'error'
          );
        }
      },
      'Phê duyệt',
      'info'
    );
  };
  
  const handleRejectArticle = async (article) => {
    const reason = prompt(`Nhập lý do từ chối bài viết "${article.title}":`);
    
    if (!reason || !reason.trim()) {
      showToast('Vui lòng nhập lý do từ chối', 'warning');
      return;
    }
  
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/articles/${article.id}/review`,
        { action: 'reject', reason: reason.trim() },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
  
      if (response.data.success) {
        showToast('Đã từ chối bài viết', 'success');
        fetchArticles();
      }
    } catch (error) {
      console.error('Lỗi khi từ chối:', error);
      showToast(
        error.response?.data?.message || 'Có lỗi xảy ra',
        'error'
      );
    }
  };
  
  const canShowButton = (action, article, user) => {
    const isAuthor = article.author_id === user.id;
    const isAdmin = user.role === 'admin';
    const status = article.status;

    // Helper: Check if user is Manager Content
    const isManagerContent = user.role === 'staff' && 
                            user.staff?.department === 'content' && 
                            user.staff?.rank === 'manager';

    switch (action) {
      case 'edit':
        // Admin: luôn được sửa
        // Manager Content: có thể sửa bài của người khác nếu có quyền 'edit'
        // Staff: chỉ sửa bài của mình
        if (isAdmin) return true;
        if (isAuthor) return true;
        if (isManagerContent && hasPermission('articles', 'edit')) return true;
        if (hasPermission('articles', 'edit')) return true; // Staff có quyền edit
        return false;

      case 'delete':
        // Admin: luôn xóa được
        // Manager/Staff: Cần có quyền 'delete' + (là tác giả hoặc là manager)
        if (isAdmin) return true;
        if (hasPermission('articles', 'delete')) {
          if (isManagerContent) return true; // Manager xóa được mọi bài
          if (isAuthor && status === 'draft') return true; // Staff xóa draft của mình
        }
        return false;

      case 'hide':
        // Admin: luôn ẩn được
        // Manager/Staff: Cần có quyền 'hide'
        if (isAdmin) return true;
        return hasPermission('articles', 'hide');

      case 'approve':
        // CHỈ HIỆN Ở TRANG PHÊ DUYỆT (ArticleReviewPage)
        // Không hiện ở ArticleManagementPage
        return false;

      case 'reject':
        // CHỈ HIỆN Ở TRANG PHÊ DUYỆT (ArticleReviewPage)
        // Không hiện ở ArticleManagementPage
        return false;
        
      case 'history':
        // Ai cũng xem được lịch sử
        return true;

      case 'duplicate':
        // Ai cũng nhân bản được
        return true;

      case 'request_rewrite':
        // Admin hoặc Manager có quyền approve
        if (isAdmin) return status === 'hidden';
        if (hasPermission('articles', 'approve')) return status === 'hidden';
        return false;
      
      case 'request_edit_author':
        return isAuthor && status === 'approved';
      
      case 'approve_edit_admin':
        if (isAdmin) return status === 'request_edit';
        if (hasPermission('articles', 'approve')) return status === 'request_edit';
        return false;
      
      case 'reject_edit_admin':
        if (isAdmin) return status === 'request_edit';
        if (hasPermission('articles', 'approve')) return status === 'request_edit';
        return false;

      default:
        return false;
    }
  };

  const getButtonTooltip = (action, article) => {
    const status = article.status;
    
    switch (action) {
      case 'edit':
        if (status === 'approved') return 'Chỉnh sửa bài viết';
        if (status === 'draft') return 'Chỉnh sửa nháp';
        if (status === 'rejected') return 'Chỉnh sửa và gửi lại';
        if (status === 'request_rewrite') return 'Chỉnh sửa theo yêu cầu';
        return 'Chỉnh sửa';
        
      case 'delete':
        return 'Xóa bài viết';
        
      case 'hide':
        return status === 'hidden' ? 'Hiện bài viết' : 'Ẩn bài viết';
        
      case 'approve':
        return 'Phê duyệt';
        
      case 'reject':
        return 'Từ chối';
        
      case 'history':
        return 'Xem lịch sử phê duyệt';
        
      case 'duplicate':
        return 'Nhân bản bài viết';
        
      case 'request_rewrite':
        return 'Yêu cầu viết lại';
        
      default:
        return '';
    }
  };

  const exportToCSV = () => {
    try {
      const csvData = articles.map(article => ({
        'ID': article.id,
        'Tiêu đề': article.title,
        'Tags': Array.isArray(article.tags_json) ? article.tags_json.join(', ') : '',
        'Danh mục': article.category?.name || '',
        'Loại': article.category?.category_type || '',
        'Trạng thái': getStatusText(article.status),
        'Tác giả': article.author?.full_name || '',
        'Lượt xem': article.views || 0,
        'Ngày tạo': new Date(article.created_at).toLocaleDateString('vi-VN')
      }));

      const headers = Object.keys(csvData[0]);
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => headers.map(h => `"${row[h]}"`).join(','))
      ].join('\n');

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `bai-viet-${new Date().getTime()}.csv`;
      link.click();
      
      showToast('Đã xuất file CSV', 'success');
    } catch (error) {
      console.error('Lỗi khi xuất CSV:', error);
      showToast('Không thể xuất file CSV', 'error');
    }
  };

  const exportToExcel = () => {
    try {
      const excelData = articles.map(article => ({
        'ID': article.id,
        'Tiêu đề': article.title,
        'Tags': Array.isArray(article.tags_json) ? article.tags_json.join(', ') : '',
        'Danh mục': article.category?.name || '',
        'Loại': article.category?.category_type || '',
        'Trạng thái': getStatusText(article.status),
        'Tác giả': article.author?.full_name || '',
        'Lượt xem': article.views || 0,
        'Ngày tạo': new Date(article.created_at).toLocaleDateString('vi-VN')
      }));

      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Bài viết');

      XLSX.writeFile(wb, `bai-viet-${new Date().getTime()}.xlsx`);
      
      showToast('Đã xuất file Excel', 'success');
    } catch (error) {
      console.error('Lỗi khi xuất Excel:', error);
      showToast('Không thể xuất file Excel', 'error');
    }
  };

  const viewArticle = (article) => {
    if (article.status === 'approved') {
      const typeMap = {
        'tin_tuc': 'tin-tuc',
        'thuoc': 'thuoc',
        'benh_ly': 'benh-ly'
      };
      const categoryType = typeMap[article.category?.category_type] || 'bai-viet';
      navigate(`/${categoryType}/${article.slug}`);
    } else {
      showToast('Bài viết chưa được duyệt', 'warning');
    }
  };

  const viewHistory = (articleId) => {
    navigate(`/phe-duyet-bai-viet/${articleId}`);
  };


  // ============================================
  // RENDER SECTIONS
  // ============================================

  const renderEntitySearchSection = () => {
    if ((selectedCategoryType !== 'thuoc' && selectedCategoryType !== 'benh_ly') || !formData.category_id) {
      return null;
    }

    return (
    <div className="article-mgmt-form-group article-mgmt-form-group-full">
        <label className="article-mgmt-form-label">
          <FaLink />
          Liên kết với {selectedCategoryType === 'thuoc' ? 'Thuốc' : 'Bệnh lý'} (Tùy chọn)
        </label>

        {selectedEntity ? (
          <div className="article-mgmt-selected-entity">
            <div className="article-mgmt-entity-info">
              <h4>{selectedEntity.name}</h4>
              {selectedEntity.Category && (
                <span className="article-mgmt-entity-category">
                  {selectedEntity.Category.name}
                </span>
              )}
              {selectedCategoryType === 'thuoc' && (
                <div className="article-mgmt-entity-details">
                  {selectedEntity.composition && (
                    <p><strong>Thành phần:</strong> {selectedEntity.composition.substring(0, 120)}...</p>
                  )}
                  {selectedEntity.uses && (
                    <p><strong>Công dụng:</strong> {selectedEntity.uses.substring(0, 120)}...</p>
                  )}
                </div>
              )}
              {selectedCategoryType === 'benh_ly' && (
                <div className="article-mgmt-entity-details">
                  {selectedEntity.symptoms && (
                    <p><strong>Triệu chứng:</strong> {selectedEntity.symptoms.substring(0, 120)}...</p>
                  )}
                  {selectedEntity.treatments && (
                    <p><strong>Điều trị:</strong> {selectedEntity.treatments.substring(0, 120)}...</p>
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              className="article-mgmt-btn-clear-entity"
              onClick={handleClearEntity}
            >
              <FaTimes /> Hủy liên kết
            </button>
          </div>
        ) : (
          <div className="article-mgmt-entity-search-box">
            <FaSearch />
            <input
              type="text"
              placeholder={`Tìm kiếm ${selectedCategoryType === 'thuoc' ? 'thuốc' : 'bệnh lý'}...`}
              value={entitySearch}
              onChange={(e) => handleEntitySearch(e.target.value)}
            />
            {searchingEntity && <FaSpinner className="article-mgmt-spinner-icon" />}

            {entitySearchResults.length > 0 && (
              <div className="article-mgmt-entity-dropdown">
                {entitySearchResults.map(entity => (
                  <div
                    key={entity.id}
                    className="article-mgmt-entity-item"
                    onClick={() => handleSelectEntity(entity)}
                  >
                    <h5>{entity.name}</h5>
                    {entity.Category && (
                      <span className="article-mgmt-entity-item-category">
                        {entity.Category.name}
                      </span>
                    )}
                    {selectedCategoryType === 'thuoc' && entity.composition && (
                      <p>{entity.composition.substring(0, 60)}...</p>
                    )}
                    {selectedCategoryType === 'benh_ly' && entity.symptoms && (
                      <p>{entity.symptoms.substring(0, 60)}...</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {entitySearch.trim().length >= 2 && !searchingEntity && entitySearchResults.length === 0 && (
              <div className="article-mgmt-entity-no-result">
                Không tìm thấy kết quả. Bạn có thể đề xuất thêm mới tại trang{' '}
                <a 
                  href={selectedCategoryType === 'thuoc' ? '/quan-ly-thuoc' : '/quan-ly-benh-ly'} 
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Quản lý {selectedCategoryType === 'thuoc' ? 'Thuốc' : 'Bệnh lý'}
                </a>
              </div>
            )}
          </div>
        )}

        <small className="article-mgmt-form-hint">
          {selectedCategoryType === 'thuoc' 
            ? 'Liên kết bài viết với thông tin thuốc để hiển thị thông tin chuyên sâu trong chi tiết bài viết'
            : 'Liên kết bài viết với bệnh lý để hiển thị thông tin triệu chứng, điều trị trong chi tiết bài viết'
          }
        </small>
      </div>
    );
  };
  
  // ============================================
  // RENDER
  // ============================================
  
  return (
    <div className="article-mgmt-page">
      <div className="article-mgmt-container">
        
        {/* HEADER */}
        <div className="article-mgmt-header">
        <div className="article-mgmt-header-content">
          <div className="article-mgmt-title-section">
            <h1 className="article-mgmt-main-title">
              <FaNewspaper /> Quản lý bài viết
            </h1>
            
            {/* Thống kê inline */}
            <div className="article-mgmt-stats-inline">
              <div className="article-mgmt-stat-item">
                Tổng: <strong>{stats.total}</strong>
              </div>
              <div className="article-mgmt-stat-item article-mgmt-stat-pending">
                Chờ duyệt: <strong>{stats.pending}</strong>
              </div>
            </div>
          </div>

          {/* Nút tạo bài viết */}
          <button className="article-mgmt-btn-create" onClick={openCreateModal}>
            <FaPlus /> Tạo bài viết
          </button>
        </div>
      </div>

        {/* FILTERS */}
        <div className="article-mgmt-filters">
          <div className="article-mgmt-filters-row">
            {/* Search */}
            <div className="article-mgmt-filter-search">
              <FaSearch />
              <input
                type="text"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Tìm kiếm theo tiêu đề..."
              />
              {filters.search && (
                <button onClick={() => setFilters(prev => ({ ...prev, search: '', page: 1 }))}>
                  <FaTimes />
                </button>
              )}
            </div>

            {/* Category Type */}
            <select
              name="category_type"
              value={filters.category_type}
              onChange={handleFilterChange}
              className="article-mgmt-filter-select"
            >
              <option value="">Tất cả loại</option>
              <option value="tin_tuc">Tin tức</option>
              <option value="thuoc">Thuốc</option>
              <option value="benh_ly">Bệnh lý</option>
            </select>

            {/* Category */}
            <select
              name="category_id"
              value={filters.category_id}
              onChange={handleFilterChange}
              className="article-mgmt-filter-select"
            >
              <option value="">Tất cả danh mục</option>
              {categories
                .filter(cat => !filters.category_type || cat.category_type === filters.category_type)
                .map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))
              }
            </select>

            {/* Bộ lọc Trạng thái */}
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="article-mgmt-filter-select"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="draft">Nháp</option>
              <option value="pending">Chờ duyệt</option>
              <option value="approved">Đã duyệt</option>
              <option value="rejected">Từ chối</option>
              <option value="hidden">Đã ẩn</option>
              <option value="request_edit">Yêu cầu sửa</option>
              <option value="request_rewrite">Yêu cầu viết lại</option>
            </select>

            {/* Số bài viết/trang */}
            <select
              name="limit"
              value={filters.limit}
              onChange={handleFilterChange}
              className="article-mgmt-filter-select article-mgmt-filter-limit"
            >
              <option value="10">10 bài/trang</option>
              <option value="20">20 bài/trang</option>
              <option value="50">50 bài/trang</option>
              <option value="100">100 bài/trang</option>
            </select>

            {/* Clear filters */}
            {(filters.search || filters.category_type || filters.category_id) && (
              <button className="article-mgmt-btn-clear-filters" onClick={clearFilters}>
                <FaTimes /> Xóa lọc
              </button>
            )}

            {/* Export buttons */}
            <button className="article-mgmt-btn-export article-mgmt-btn-export-csv" onClick={exportToCSV} title="Xuất CSV">
              <FaFileCsv /> CSV
            </button>
            
            <button className="article-mgmt-btn-export article-mgmt-btn-export-excel" onClick={exportToExcel} title="Xuất Excel">
              <FaFileExcel /> Excel
            </button>

            {/* Column selector */}
            <div className="article-mgmt-column-selector-wrapper">
              <button
                className="article-mgmt-btn-column-selector"
                onClick={() => setShowColumnSelector(!showColumnSelector)}
              >
                <FaCog /> Tùy chỉnh cột
              </button>
              
              {showColumnSelector && (
                <div className="article-mgmt-column-selector-dropdown">
                  <div className="article-mgmt-column-selector-header">
                    <strong>Hiển thị cột</strong>
                    <button onClick={() => setShowColumnSelector(false)}>
                      <FaTimes />
                    </button>
                  </div>
                  <div className="article-mgmt-column-selector-body">
                    {Object.entries(visibleColumns)
                      .filter(([key]) => !['id', 'title'].includes(key))
                      .map(([key, value]) => (
                        <label key={key} className="article-mgmt-column-checkbox">
                          <input
                            type="checkbox"
                            checked={value}
                            onChange={() => toggleColumn(key)}
                          />
                          <span>{getColumnName(key)}</span>
                        </label>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* TABLE */}
        <div className="article-mgmt-table-wrapper">
          <table className="article-mgmt-table">
            <thead>
              <tr>
                
                <th 
                  className="col-fixed col-title col-sortable" 
                  onClick={() => handleSortColumn('title')}
                >
                  Tiêu đề {filters.sort_by === 'title' && (filters.sort_order === 'DESC' ? '↓' : '↑')}
                </th>
                {visibleColumns.tags && (
                  <th 
                    className="col-scrollable col-sortable" 
                    onClick={() => handleSortColumn('tags_json')}
                  >
                    Tags
                  </th>
                )}
                {visibleColumns.category && <th className="col-scrollable">Danh mục</th>}
                {visibleColumns.status && <th className="col-scrollable">Trạng thái</th>}
                {visibleColumns.author && <th className="col-scrollable">Tác giả</th>}
                {visibleColumns.created_at && (
                  <th 
                    className="col-scrollable col-sortable" 
                    onClick={() => handleSortColumn('created_at')}
                  >
                    Ngày tạo {filters.sort_by === 'created_at' && (filters.sort_order === 'DESC' ? '↓' : '↑')}
                  </th>
                )}
                {visibleColumns.views && (
                  <th 
                    className="col-scrollable col-sortable" 
                    onClick={() => handleSortColumn('views')}
                  >
                    Lượt xem {filters.sort_by === 'views' && (filters.sort_order === 'DESC' ? '↓' : '↑')}
                  </th>
                )}
                {visibleColumns.composition && <th className="col-scrollable">Thành phần</th>}
                {visibleColumns.uses && <th className="col-scrollable">Công dụng</th>}
                {visibleColumns.manufacturer && <th className="col-scrollable">Nhà SX</th>}
                {visibleColumns.symptoms && <th className="col-scrollable">Triệu chứng</th>}
                {visibleColumns.treatments && <th className="col-scrollable">Điều trị</th>}
                <th className="col-fixed col-actions">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="20" className="article-mgmt-text-center">
                    <div className="article-mgmt-loading-spinner">
                      <FaSpinner className="article-mgmt-spin" /> Đang tải...
                    </div>
                  </td>
                </tr>
              ) : articles.length === 0 ? (
                <tr>
                  <td colSpan="20" className="article-mgmt-text-center">
                    <div className="article-mgmt-empty-state">
                      <FaFileAlt />
                      <p>Không có bài viết nào</p>
                    </div>
                  </td>
                </tr>
              ) : (
                articles.map(article => (
                  <tr key={article.id}>
                    {/* CỘT TIÊU ĐỀ */}
                    <td className="col-fixed col-title">
                      <div className="article-title-cell">
                        {getCategoryIcon(article.category?.category_type)}
                        {article.status === 'approved' ? (
                          <a 
                            href={getCategoryTypeUrl(article)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="article-title-link"
                            title={article.title}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {article.title}
                          </a>
                        ) : (
                          <span className="article-title-text" title={article.title}>
                            {article.title}
                          </span>
                        )}
                      </div>
                    </td>
                    
                    {/* CỘT TAGS */}
                    {visibleColumns.tags && (
                      <td className="col-scrollable">
                        <div className="tags-cell">
                          {article.tags_json && Array.isArray(article.tags_json) && article.tags_json.length > 0 ? (
                            article.tags_json.map((tag, idx) => (
                              <span key={idx} className="article-mgmt-tag-badge">{tag}</span>
                            ))
                          ) : (
                            <span className="article-mgmt-text-muted">-</span>
                          )}
                        </div>
                      </td>
                    )}
                    
                    {/* CỘT DANH MỤC */}
                    {visibleColumns.category && (
                      <td className="col-scrollable">
                        <span className="category-badge">
                          {article.category?.name || '-'}
                        </span>
                      </td>
                    )}
                    
                    {/* CỘT TRẠNG THÁI */}
                    {visibleColumns.status && (
                      <td className="col-scrollable">
                        <span className={`article-mgmt-status-badge ${getStatusClass(article.status)}`}>
                          {getStatusText(article.status)}
                        </span>
                      </td>
                    )}
                    
                    {/* CỘT TÁC GIẢ */}
                    {visibleColumns.author && (
                      <td className="col-scrollable">
                        <div className="author-cell">
                          <FaUser />
                          <span>{article.author?.full_name || '-'}</span>
                        </div>
                      </td>
                    )}
                    
                    {/* CỘT NGÀY TẠO */}
                    {visibleColumns.created_at && (
                      <td className="col-scrollable">
                        {new Date(article.created_at).toLocaleDateString('vi-VN')}
                      </td>
                    )}
                    
                    {/* CỘT LƯỢT XEM */}
                    {visibleColumns.views && (
                      <td className="col-scrollable">
                        <div className="views-cell">
                          <FaEye /> {article.views || 0}
                        </div>
                      </td>
                    )}
                    
                    {/* CỘT THÀNH PHẦN (Thuốc) */}
                    {visibleColumns.composition && (
                      <td className="col-scrollable">
                        {article.entity_type === 'medicine' && article.medicine?.composition ? (
                          <span title={article.medicine.composition}>
                            {article.medicine.composition.substring(0, 50)}...
                          </span>
                        ) : '-'}
                      </td>
                    )}
                    
                    {/* CỘT CÔNG DỤNG (Thuốc) */}
                    {visibleColumns.uses && (
                      <td className="col-scrollable">
                        {article.entity_type === 'medicine' && article.medicine?.uses ? (
                          <span title={article.medicine.uses}>
                            {article.medicine.uses.substring(0, 50)}...
                          </span>
                        ) : '-'}
                      </td>
                    )}
                    
                    {/* CỘT NHÀ SẢN XUẤT (Thuốc) */}
                    {visibleColumns.manufacturer && (
                      <td className="col-scrollable">
                        {article.entity_type === 'medicine' ? article.medicine?.manufacturer || '-' : '-'}
                      </td>
                    )}
                    
                    {/* CỘT TRIỆU CHỨNG (Bệnh lý) */}
                    {visibleColumns.symptoms && (
                      <td className="col-scrollable">
                        {article.entity_type === 'disease' && article.disease?.symptoms ? (
                          <span title={article.disease.symptoms}>
                            {article.disease.symptoms.substring(0, 50)}...
                          </span>
                        ) : '-'}
                      </td>
                    )}
                    
                    {/* CỘT ĐIỀU TRỊ (Bệnh lý) */}
                    {visibleColumns.treatments && (
                      <td className="col-scrollable">
                        {article.entity_type === 'disease' && article.disease?.treatments ? (
                          <span title={article.disease.treatments}>
                            {article.disease.treatments.substring(0, 50)}...
                          </span>
                        ) : '-'}
                      </td>
                    )}
                    
                    {/* CỘT THAO TÁC */}
                    <td className="col-fixed col-actions">
                      <div className="action-buttons">
                        
                        {/* EDIT BUTTON */}
                        {canShowButton('edit', article, user) && (
                          <button
                            className="article-mgmt-btn-action article-mgmt-btn-edit"
                            onClick={() => handleEditArticle(article)}
                            title={getButtonTooltip('edit', article)}
                          >
                            <FaEdit />
                          </button>
                        )}

                        {/* APPROVE BUTTON (Admin - Pending) */}
                        {canShowButton('approve', article, user) && (
                          <button
                            className="article-mgmt-btn-action article-mgmt-btn-approve"
                            onClick={() => handleApproveArticle(article.id)}
                            title={getButtonTooltip('approve', article)}
                          >
                            <FaCheck />
                          </button>
                        )}
                        
                        {/* REJECT BUTTON (Admin - Pending) */}
                        {canShowButton('reject', article, user) && (
                          <button
                            className="article-mgmt-btn-action article-mgmt-btn-reject"
                            onClick={() => handleRejectArticle(article)}
                            title={getButtonTooltip('reject', article)}
                          >
                            <FaBan />
                          </button>
                        )}

                        {/* DUPLICATE BUTTON */}
                        {canShowButton('duplicate', article, user) && (
                          <button
                            className="article-mgmt-btn-action article-mgmt-btn-duplicate"
                            onClick={() => handleDuplicate(article)}
                            title={getButtonTooltip('duplicate', article)}
                          >
                            <FaCopy />
                          </button>
                        )}

                        {/* HISTORY BUTTON */}
                        {canShowButton('history', article, user) && (
                          <button
                            className="article-mgmt-btn-action article-mgmt-btn-history"
                            onClick={() => viewHistory(article.id)}
                            title={getButtonTooltip('history', article)}
                          >
                            <FaHistory />
                          </button>
                        )}

                        {/* REQUEST REWRITE BUTTON (Admin - hidden) */}
                        {canShowButton('request_rewrite', article, user) && (
                          <button
                            className="article-mgmt-btn-action article-mgmt-btn-request-rewrite"
                            onClick={() => handleRequestRewrite(article)}
                            title={getButtonTooltip('request_rewrite', article)}
                          >
                            <FaRedo />
                          </button>
                        )}

                        {/* HIDE/SHOW BUTTON (Admin only) */}
                        {canShowButton('hide', article, user) && (
                          <button
                            className="article-mgmt-btn-action article-mgmt-btn-hide"
                            onClick={() => openHidePopup(article)}
                            title={getButtonTooltip('hide', article)}
                          >
                            {article.status === 'hidden' ? <FaEye /> : <FaEyeSlash />}
                          </button>
                        )}

                        {/* DELETE BUTTON */}
                        {canShowButton('delete', article, user) && (
                          <button
                            className="article-mgmt-btn-action btn-delete"
                            onClick={() => handleDelete(article.id)}
                            title={getButtonTooltip('delete', article)}
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

        {/* PAGINATION */}
        {pagination.totalPages > 1 && (
          <div className="article-mgmt-pagination">
            <button
              onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={filters.page === 1}
              className="article-mgmt-btn-page"
            >
              Trước
            </button>
            
            <div className="article-mgmt-page-numbers">
              {[...Array(pagination.totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  className={`article-mgmt-btn-page ${filters.page === i + 1 ? 'active' : ''}`}
                  onClick={() => setFilters(prev => ({ ...prev, page: i + 1 }))}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <button
              onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={filters.page === pagination.totalPages}
              className="article-mgmt-btn-page"
            >
              Sau
            </button>
          </div>
        )}

        {/* MODAL TẠO/SỬA BÀI VIẾT */}
        {showModal && (
          <div className="article-mgmt-form-overlay">
            <div className="article-mgmt-form-container">
              <div className="article-mgmt-form-header">
                <h2>
                  {modalType === 'create' ? <><FaPlus /> Tạo bài viết mới</> : <><FaEdit /> Sửa bài viết</>}
                </h2>
                <button className="article-mgmt-btn-close-modal" onClick={handleCloseModal}>
                  <FaTimes />
                </button>
              </div>

              <form className="article-mgmt-form-body">
                <div className="article-mgmt-form-content">
  
                {/* SIDEBAR - Ảnh bìa + BUTTONS */}
                <div className="article-mgmt-form-sidebar">
                  {/* Ảnh bìa */}
                  <div className="article-mgmt-cover-image-section">
                    <label className="article-mgmt-section-label">
                      <FaImage /> Ảnh bìa
                    </label>
                    
                    {/* Tabs: File vs URL */}
                    <div className="article-mgmt-image-upload-tabs">
                      <button
                        type="button"
                        className={`article-mgmt-tab-btn ${imageUploadMethod === 'file' ? 'active' : ''}`}
                        onClick={() => setImageUploadMethod('file')}
                      >
                        <FaUpload /> Upload
                      </button>
                      <button
                        type="button"
                        className={`article-mgmt-tab-btn ${imageUploadMethod === 'url' ? 'active' : ''}`}
                        onClick={() => setImageUploadMethod('url')}
                      >
                        <FaLink /> URL
                      </button>
                    </div>

                    {/* Preview ảnh */}
                    {(coverImage || tempImageUrl) && (
                      <div className="article-mgmt-image-preview">
                        <img src={coverImage || tempImageUrl} alt="Cover" />
                        <button
                          type="button"
                          className="article-mgmt-btn-remove-image"
                          onClick={() => {
                            setCoverImage(null);
                            setTempImageUrl('');
                            setFormData(prev => ({ ...prev, image_url: '' }));
                          }}
                        >
                          <FaTimes />
                        </button>
                      </div>
                    )}

                    {/* Upload method */}
                    {imageUploadMethod === 'file' ? (
                      <div className="article-mgmt-upload-area">
                        <input
                          type="file"
                          id="cover-upload"
                          accept="image/*"
                          onChange={handleCoverImageUpload}
                          style={{ display: 'none' }}
                        />
                        <label htmlFor="cover-upload" className="article-mgmt-upload-label">
                          {uploadingCover ? (
                            <><FaSpinner className="article-mgmt-spin" /> Đang tải...</>
                          ) : (
                            <><FaUpload /> Chọn ảnh</>
                          )}
                        </label>
                      </div>
                    ) : (
                      <div className="article-mgmt-url-input-group">
                        <input
                          type="text"
                          value={tempImageUrl}
                          onChange={(e) => setTempImageUrl(e.target.value)}
                          placeholder="https://example.com/image.jpg"
                          className="article-mgmt-url-input"
                        />
                        <button
                          type="button"
                          className="article-mgmt-btn-add-url"
                          onClick={handleImageUrlSubmit}
                        >
                          Thêm
                        </button>
                      </div>
                    )}
                  </div>

                  {/* BUTTONS */}
                  <div className="article-mgmt-form-actions-sidebar">
                    <button
                      type="button"
                      className="article-mgmt-btn-submit article-mgmt-btn-primary btn-full"
                      onClick={(e) => handleSubmit(e, false)}
                      disabled={loading}
                    >
                      {loading ? <><FaSpinner className="article-mgmt-spin" /> Đang gửi...</> : <><FaPaperPlane /> Gửi phê duyệt</>}
                    </button>
                    
                    <div className="article-mgmt-form-actions-row">
                      <button
                        type="button"
                        className="article-mgmt-btn-submit article-mgmt-btn-secondary"
                        onClick={(e) => handleSubmit(e, true)}
                        disabled={loading}
                      >
                        <FaSave /> Lưu nháp
                      </button>
                      <button
                        type="button"
                        className="article-mgmt-btn-submit article-mgmt-btn-cancel"
                        onClick={handleCloseModal}
                        disabled={loading}
                      >
                        <FaTimes /> Hủy
                      </button>
                    </div>
                  </div>
                </div>

                  {/* MAIN FORM */}
                <div className="article-mgmt-form-main">
                  
                  {/* HÀNG 1: Tiêu đề - Full width */}
                  <div className="article-mgmt-form-row">
                    <div className="article-mgmt-form-group">
                      <label className="article-mgmt-form-label required">Tiêu đề</label>
                      <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleFormChange}
                        placeholder="Nhập tiêu đề bài viết..."
                        className="article-mgmt-form-input"
                        required
                      />
                    </div>
                  </div>

                  {/* HÀNG 2: Loại bài viết, Danh mục, Tags */}
                  <div className="article-mgmt-form-row form-row-type-category-tags">
                    <div className="article-mgmt-form-group">
                      <label className="article-mgmt-form-label required">Loại bài viết</label>
                      <select
                        value={selectedCategoryType}
                        onChange={handleCategoryTypeChange}
                        className="article-mgmt-form-select"
                        required
                      >
                        <option value="">Chọn loại</option>
                        <option value="tin_tuc">Tin tức</option>
                        <option value="thuoc">Thuốc</option>
                        <option value="benh_ly">Bệnh lý</option>
                      </select>
                    </div>

                    <div className="article-mgmt-form-group">
                      <label className="article-mgmt-form-label required">Danh mục</label>
                      <select
                        name="category_id"
                        value={formData.category_id}
                        onChange={handleCategoryChange}
                        className="article-mgmt-form-select"
                        required
                        disabled={!selectedCategoryType}
                      >
                        <option value="">Chọn danh mục</option>
                        {categories
                          .filter(cat => cat.category_type === selectedCategoryType)
                          .map(cat => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))
                        }
                      </select>
                    </div>

                    {/* Tags */}
                    <div className="article-mgmt-form-group article-mgmt-form-group-tags">
                      <label className="article-mgmt-form-label">
                        <FaTags /> Tags
                      </label>
                      <div className="article-mgmt-tags-input-wrapper">
                        <div className="article-mgmt-tags-display">
                          {formData.tags_json.map((tag, idx) => (
                            <span key={idx} className="article-mgmt-tag-item">
                              {tag}
                              <button
                                type="button"
                                onClick={() => handleRemoveTag(tag)}
                                className="article-mgmt-btn-remove-tag"
                              >
                                <FaTimes />
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="article-mgmt-tags-input-group">
                          <input
                            type="text"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddTag();
                              }
                            }}
                            placeholder="Thêm tag..."
                            className="article-mgmt-tags-input"
                          />
                          <button
                            type="button"
                            onClick={handleAddTag}
                            className="article-mgmt-btn-add-tag"
                          >
                            Thêm
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* LIÊN KẾT ENTITY */}
                  {renderEntitySearchSection()}

                  {/* [MỚI] CHỈ HIỆN KHI LÀ THUỐC - ĐƠN VỊ TÍNH & NHÀ SX */}
                  {selectedCategoryType === 'thuoc' && (
                    <div className="article-mgmt-form-row">
                       <div className="article-mgmt-form-group">
                          <label className="article-mgmt-form-label">Đơn vị tính</label>
                          <select
                            name="unit"
                            value={formData.unit}
                            onChange={handleFormChange}
                            className="article-mgmt-form-select"
                          >
                            <option value="Hộp">Hộp</option>
                            <option value="Vỉ">Vỉ</option>
                            <option value="Lọ">Lọ</option>
                            <option value="Chai">Chai</option>
                            <option value="Viên">Viên</option>
                            <option value="Tuýp">Tuýp</option>
                            <option value="Gói">Gói</option>
                          </select>
                       </div>
                       <div className="article-mgmt-form-group">
                          <label className="article-mgmt-form-label">Nhà sản xuất</label>
                          <input 
                            type="text"
                            name="manufacturer" 
                            value={formData.manufacturer}
                            onChange={handleFormChange}
                            className="article-mgmt-form-input"
                            placeholder="VD: Dược Hậu Giang..."
                          />
                       </div>
                    </div>
                  )}

                  {/* HÀNG 3: Import file */}
                  <div className="article-mgmt-form-row">
                    {/* Import file */}
                    <div className="article-mgmt-form-group">
                      <label className="article-mgmt-form-label">
                        <FaFileImport /> Import nội dung
                      </label>
                      <input
                        type="file"
                        accept=".doc,.docx,.xls,.xlsx"
                        onChange={handleFileImport}
                        className="article-mgmt-file-input"
                      />
                      <small className="article-mgmt-form-hint">
                        Hỗ trợ: .docx, .doc, .xlsx, .xls
                      </small>
                    </div>
                  </div>

                    {/* Nội dung */}
                    <div className="article-mgmt-form-group">
                      <label className="article-mgmt-form-label required">Nội dung</label>
                      <div id="toolbar-container" className="editor-toolbar"></div>
                      <div className="article-mgmt-editor-wrapper">
                        {DecoupledEditor ? (
                          <CKEditor
                            editor={DecoupledEditor}
                            data={formData.content}
                            onReady={(editor) => {
                              // 🔧 NULL CHECK: Đảm bảo editor và toolbar đã sẵn sàng
                              if (!editor || !editor.ui || !editor.ui.view || !editor.ui.view.toolbar) {
                                console.warn('⚠️ CKEditor chưa khởi tạo đầy đủ');
                                return;
                              }
                              
                              const toolbarContainer = document.querySelector('#toolbar-container');
                              const toolbarElement = editor.ui.view.toolbar.element;
                              
                              if (toolbarContainer && toolbarElement) {
                                while (toolbarContainer.firstChild) {
                                toolbarContainer.removeChild(toolbarContainer.firstChild);
                              }
                              toolbarContainer.appendChild(toolbarElement);
                            }
                          }}
                          onChange={(event, editor) => {
                            const data = editor.getData();
                            setFormData(prev => ({ ...prev, content: data }));
                            setHasUnsavedChanges(true);
                          }}
                          config={{
                            extraPlugins: [MyCustomUploadAdapterPlugin],
                            toolbar: [
                              'heading', '|',
                              'bold', 'italic', 'underline', 'strikethrough', '|',
                              'fontSize', 'fontColor', 'fontBackgroundColor', '|',
                              'link', 'imageUpload', 'blockQuote', '|',
                              'alignment', 'bulletedList', 'numberedList', '|',
                              'insertTable', 'tableColumn', 'tableRow', 'mergeTableCells', '|',
                              'undo', 'redo'
                            ],
                            image: {
                              toolbar: [
                                'imageTextAlternative', '|',
                                'imageStyle:alignLeft', 'imageStyle:full', 'imageStyle:alignRight'
                              ],
                              styles: ['full', 'alignLeft', 'alignRight']
                            },
                            table: {
                              contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells']
                            }
                          }}
                        />
                        ) : (
                          <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                            Đang tải trình soạn thảo...
                          </div>
                        )}
                      </div>
                    </div>

                    
                    {/* Nguồn */}
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
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* CONFIRM DIALOG */}
        {showConfirmDialog && confirmAction && (
          <div className="article-mgmt-confirm-overlay">
            <div className={`article-mgmt-confirm-dialog ${confirmAction.type}`}>
              <div className="article-mgmt-confirm-icon">
                {confirmAction.type === 'danger' && <FaExclamationTriangle />}
                {confirmAction.type === 'warning' && <FaExclamationTriangle />}
                {confirmAction.type === 'info' && <FaInfoCircle />}
              </div>
              <h3 className="article-mgmt-confirm-title">{confirmAction.title}</h3>
              <p className="article-mgmt-confirm-message">{confirmAction.message}</p>
              
              {/* THÊM COUNTDOWN */}
              {deleteArticleId && countdownSeconds > 0 && (
                <div className="countdown-timer">
                  <FaClock />
                  <span>Vui lòng chờ {countdownSeconds} giây để xác nhận...</span>
                </div>
              )}
              
              <div className="article-mgmt-confirm-actions">
                <button
                  className={`btn-confirm btn-${confirmAction.type === 'danger' ? 'danger' : confirmAction.type === 'warning' ? 'warning' : 'primary'}`}
                  onClick={handleConfirm}
                  disabled={deleteArticleId && countdownSeconds > 0}
                >
                  {deleteArticleId && countdownSeconds > 0 ? (
                    `Xác nhận (${countdownSeconds}s)`
                  ) : (
                    confirmAction.confirmText
                  )}
                </button>
                {confirmAction.onCancelWithoutSave && (
                  <button
                    className="btn-confirm btn-danger"
                    onClick={() => {
                      confirmAction.onCancelWithoutSave();
                      closeConfirm();
                    }}
                  >
                    {confirmAction.cancelWithoutSaveText}
                  </button>
                )}
                <button
                  className="btn-confirm article-mgmt-btn-cancel"
                  onClick={closeConfirm}
                >
                  Quay lại
                </button>
              </div>
            </div>
          </div>
        )}

        {/* HIDE POPUP */}
        {showHidePopup && articleToHide && (
          <div className="article-mgmt-popup-overlay">
            <div className="article-mgmt-popup">
              <div className="article-mgmt-popup-header">
                <div className="article-mgmt-popup-header-content">
                  {articleToHide.status === 'hidden' ? <FaEye className="article-mgmt-popup-icon" /> : <FaEyeSlash className="article-mgmt-popup-icon" />}
                  <h3>{articleToHide.status === 'hidden' ? 'Hiện bài viết' : 'Ẩn bài viết'}</h3>
                </div>
                <button onClick={() => setShowHidePopup(false)} className="article-mgmt-btn-close-popup">
                  <FaTimes />
                </button>
              </div>
              <form onSubmit={handleHideArticle} className="article-mgmt-popup-body">
                <div className="article-mgmt-popup-warning">
                  <FaExclamationTriangle />
                  <div>
                    <p className="article-mgmt-warning-title">Lưu ý</p>
                    <p className="article-mgmt-warning-text">
                      {articleToHide.status === 'hidden' 
                        ? 'Bài viết sẽ được hiển thị công khai.'
                        : 'Bài viết sẽ bị ẩn khỏi danh sách công khai.'
                      }
                    </p>
                  </div>
                </div>
                <div className="article-mgmt-popup-info">
                  <label className="article-mgmt-popup-label">Bài viết:</label>
                  <p className="article-mgmt-article-title-display">{articleToHide.title}</p>
                </div>
                <div className="article-mgmt-popup-quick-reasons">
                  <label className="article-mgmt-popup-label">Lý do nhanh:</label>
                  <div className="article-mgmt-quick-reason-buttons">
                    {['Nội dung không phù hợp', 'Vi phạm chính sách', 'Thông tin sai lệch', 'Yêu cầu từ tác giả'].map((r, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setHideReason(r)}
                        className={`btn-quick-reason ${hideReason === r ? 'active' : ''}`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="article-mgmt-popup-form-group">
                  <label className="article-mgmt-popup-label">
                    Lý do <span className="article-mgmt-required">*</span>
                  </label>
                  <textarea
                    value={hideReason}
                    onChange={(e) => setHideReason(e.target.value)}
                    placeholder={`Nhập lý do ${articleToHide.status === 'hidden' ? 'hiện' : 'ẩn'} bài viết...`}
                    maxLength={500}
                    rows={5}
                    className="article-mgmt-popup-textarea"
                    required
                  />
                  <small className="article-mgmt-char-count">{hideReason.length}/500</small>
                </div>

                <div className="article-mgmt-popup-footer">
                  {/* THÊM COUNTDOWN */}
                  {articleToHide?.status !== 'hidden' && countdownSeconds > 0 && (
                    <div className="countdown-notice">
                      <FaClock />
                      <span>Vui lòng chờ {countdownSeconds} giây để xác nhận...</span>
                    </div>
                  )}
                  
                  <button
                    type="button"
                    onClick={() => {
                      setShowHidePopup(false);
                      setCountdownSeconds(0);
                    }}
                    className="article-mgmt-btn-cancel"
                    disabled={hidingArticle}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="article-mgmt-btn-submit btn-hide-confirm"
                    disabled={hidingArticle || !hideReason.trim() || (articleToHide?.status !== 'hidden' && countdownSeconds > 0)}
                  >
                    {hidingArticle ? (
                      <>
                        <FaSpinner className="article-mgmt-spin" /> Đang xử lý...
                      </>
                    ) : countdownSeconds > 0 ? (
                      <>
                        <FaEyeSlash /> Xác nhận ({countdownSeconds}s)
                      </>
                    ) : (
                      <>
                        {articleToHide?.status === 'hidden' ? <FaEye /> : <FaEyeSlash />}
                        {' '}Xác nhận {articleToHide?.status === 'hidden' ? 'hiện' : 'ẩn'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ADMIN PUBLISH CHOICE POPUP */}
        {showAdminPublishChoice && (
          <div 
            className="article-mgmt-modal-overlay" 
            onClick={(e) => e.stopPropagation()}
            style={{ pointerEvents: 'all' }}
          >
            <div className="article-mgmt-confirm-submit-modal" onClick={(e) => e.stopPropagation()}>
              <div className="article-mgmt-modal-header">
                <h2>
                  <FaCheckCircle style={{ color: '#10b981' }} />
                  Chọn cách đăng bài
                </h2>
                <button 
                  className="article-mgmt-modal-close"
                  onClick={() => {
                    setShowAdminPublishChoice(false);
                    document.body.classList.remove('modal-open');
                  }}
                >
                  <FaTimes />
                </button>
              </div>

              <div className="article-mgmt-modal-body">
                <p style={{ marginBottom: '0.75rem' }}>
                  Bạn là <strong>Admin</strong>, bạn có muốn:
                </p>

                <div className="article-mgmt-admin-edit-choices">
                  <button
                    className="article-mgmt-choice-btn"
                    style={{ borderColor: '#10b981' }}
                    onClick={(e) => {
                      setShowAdminPublishChoice(false);
                      document.body.classList.remove('modal-open');
                      handleSubmit(null, false, true); // Publish trực tiếp
                    }}
                  >
                    <FaCheckCircle style={{ color: '#10b981', fontSize: '1.5rem' }} />
                    <div>
                      <span>Đăng bài ngay</span>
                      <small>Bài viết sẽ hiển thị công khai ngay lập tức</small>
                    </div>
                  </button>

                  <button
                    className="article-mgmt-choice-btn"
                    style={{ borderColor: '#3b82f6' }}
                    onClick={(e) => {
                      setShowAdminPublishChoice(false);
                      document.body.classList.remove('modal-open');
                      handleSubmit(null, false, false); // Gửi phê duyệt cho admin khác
                    }}
                  >
                    <FaPaperPlane style={{ color: '#3b82f6', fontSize: '1.5rem' }} />
                    <div>
                      <span>Gửi phê duyệt</span>
                      <small>Gửi cho Admin khác xem xét và phê duyệt</small>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* POPUP TỪ CHỐI YÊU CẦU CHỈNH SỬA */}
        {showRejectPopup && articleToReject && (
          <div className="article-mgmt-popup-overlay">
            <div className="article-mgmt-popup">
              <div className="article-mgmt-popup-header">
                <div className="article-mgmt-popup-header-content">
                  <FaBan className="article-mgmt-popup-icon" />
                  <h3>Từ chối yêu cầu chỉnh sửa</h3>
                </div>
                <button onClick={() => setShowRejectPopup(false)} className="article-mgmt-btn-close-popup">
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleRejectEditRequest} className="article-mgmt-popup-body">
                <div className="article-mgmt-popup-warning">
                  <FaExclamationTriangle />
                  <div>
                    <p className="article-mgmt-warning-title">Cảnh báo</p>
                    <p className="article-mgmt-warning-text">
                      Yêu cầu chỉnh sửa sẽ bị từ chối. Tác giả sẽ nhận thông báo.
                    </p>
                  </div>
                </div>

                <div className="article-mgmt-popup-info">
                  <label className="article-mgmt-popup-label">Bài viết:</label>
                  <p className="article-mgmt-article-title-display">{articleToReject.title}</p>
                </div>

                <div className="article-mgmt-popup-quick-reasons">
                  <label className="article-mgmt-popup-label">Lý do nhanh:</label>
                  <div className="article-mgmt-quick-reason-buttons">
                    {['Không cần thiết', 'Thông tin chưa đủ', 'Vi phạm quy định', 'Khác'].map((r, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setRejectReason(r)}
                        className={`btn-quick-reason ${rejectReason === r ? 'active' : ''}`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="article-mgmt-popup-form-group">
                  <label className="article-mgmt-popup-label">
                    Lý do chi tiết <span className="article-mgmt-required">*</span>
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Nhập lý do từ chối..."
                    maxLength={500}
                    rows={5}
                    className="article-mgmt-popup-textarea"
                    required
                  />
                  <small className="article-mgmt-char-count">{rejectReason.length}/500</small>
                </div>

                <div className="article-mgmt-popup-footer">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRejectPopup(false);
                      setRejectReason('');
                    }}
                    className="article-mgmt-btn-cancel"
                    disabled={rejecting}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="article-mgmt-btn-submit btn-reject-confirm"
                    disabled={rejecting || !rejectReason.trim()}
                  >
                    {rejecting ? (
                      <>
                        <FaSpinner className="article-mgmt-spinner-icon" /> Đang xử lý...
                      </>
                    ) : (
                      <>
                        <FaBan /> Xác nhận từ chối
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* POPUP CẢNH BÁO ADMIN SỬA BÀI ĐÃ DUYỆT */}
        {showAdminEditWarning && (
                <div 
                  className="article-mgmt-modal-overlay" 
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  style={{ pointerEvents: 'all' }}
                >
                  <div className="article-mgmt-warning-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="article-mgmt-modal-header">
                      <h2>
                        <FaExclamationTriangle style={{ color: '#f59e0b' }} />
                        Cảnh báo: Sửa bài đã duyệt
                      </h2>
                      <button 
                        className="article-mgmt-modal-close" 
                        onClick={() => {
                          setShowAdminEditWarning(false);
                          document.body.classList.remove('modal-open');
                        }}
                      >
                        <FaTimes />
                      </button>
                    </div>
                    
                    <div className="article-mgmt-modal-body">
                      <p>
                        Bài viết <strong>"{editingApprovedArticle?.title}"</strong> đang{' '}
                        <strong style={{ color: '#10b981' }}>hiển thị công khai</strong>. Bạn muốn:
                      </p>
                      
                      <div className="article-mgmt-admin-edit-choices">
                        <button 
                          className="article-mgmt-choice-btn article-mgmt-hide-first-btn"
                          onClick={() => {
                            handleAdminEditChoice('hide-first');
                            document.body.classList.remove('modal-open');
                          }}
                        >
                          <FaEyeSlash />
                          <div>
                            <span>Ẩn bài viết trước, sau đó sửa</span>
                            <small>Khuyến nghị: Người dùng không thấy bài trong khi bạn sửa</small>
                          </div>
                        </button>
                        
                        <button 
                          className="article-mgmt-choice-btn article-mgmt-direct-edit-btn"
                          onClick={() => {
                            handleAdminEditChoice('direct');
                            document.body.classList.remove('modal-open');
                          }}
                        >
                          <FaEdit />
                          <div>
                            <span>Sửa trực tiếp (không ẩn)</span>
                            <small>Lưu ý: Thay đổi sẽ hiển thị ngay cho người dùng</small>
                          </div>
                        </button>
                      </div>
                    </div>
                    
                    <div className="article-mgmt-modal-footer">
                      <button 
                        className="btn article-mgmt-btn-secondary"
                        onClick={() => {
                          setShowAdminEditWarning(false);
                          document.body.classList.remove('modal-open');
                        }}
                      >
                        <FaTimes /> Hủy
                      </button>
                    </div>
                  </div>
                </div>
              )}

        {/* POPUP XÁC NHẬN GỬI PHÊ DUYỆT */}
        {showSubmitConfirm && (
          <div 
            className="article-mgmt-modal-overlay" 
            onClick={(e) => {
              e.stopPropagation();
            }}
            style={{ pointerEvents: 'all' }}
          >
            <div className="article-mgmt-confirm-submit-modal" onClick={(e) => e.stopPropagation()}>
              <div className="article-mgmt-modal-header">
                <h2>
                  <FaCheckCircle style={{ color: '#10b981' }} />
                  Xác nhận gửi phê duyệt
                </h2>
                <button 
                  className="article-mgmt-modal-close" 
                  onClick={() => {
                    setShowSubmitConfirm(false);
                    document.body.classList.remove('modal-open');
                  }}
                >
                  <FaTimes />
                </button>
              </div>
              
              <div className="article-mgmt-modal-body">
                <p>
                  Bạn chắc chắn muốn <strong>gửi bài viết này để phê duyệt</strong>?
                </p>
                <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>
                  Sau khi gửi, bạn sẽ không thể chỉnh sửa cho đến khi admin phản hồi.
                </p>
              </div>
              
              <div className="article-mgmt-modal-footer">
                <button 
                  className="btn article-mgmt-btn-secondary"
                  onClick={() => {
                    setShowSubmitConfirm(false);
                    document.body.classList.remove('modal-open');
                  }}
                >
                  <FaTimes /> Hủy
                </button>
                <button 
                  className="btn article-mgmt-btn-primary"
                  onClick={() => {
                    setShowSubmitConfirm(false);
                    document.body.classList.remove('modal-open');
                    // Gọi lại handleSubmit với skipConfirm=true để bỏ qua popup
                    handleSubmit(null, false, false, true);
                  }}
                >
                  <FaPaperPlane /> Xác nhận gửi
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TOAST NOTIFICATIONS */}
        <div className="article-mgmt-toast-container">
          {toasts.map(toast => (
            <div key={toast.id} className={`article-mgmt-toast toast-${toast.type}`}>
              <div className="article-mgmt-toast-icon">
                {toast.type === 'success' && <FaCheckCircle />}
                {toast.type === 'error' && <FaTimesCircle />}
                {toast.type === 'warning' && <FaExclamationTriangle />}
                {toast.type === 'info' && <FaInfoCircle />}
              </div>
              <span className="article-mgmt-toast-message">{toast.message}</span>
              <button
                className="article-mgmt-toast-close"
                onClick={() => removeToast(toast.id)}
              >
                <FaTimes />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
    
  );
};

export default ArticleManagementPage;