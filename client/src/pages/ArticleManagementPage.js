// client/src/pages/ArticleManagementPage.js - VERSION 4.0 - HOÀN CHỈNH
import React, { useState, useEffect, useCallback } from 'react';
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
import './ArticleManagementPage.css';

const ArticleManagementPage = () => {
  const navigate = useNavigate();
  const API_BASE_URL = 'http://localhost:3001';
  
  // ============================================
  // QUẢN LÝ STATE
  // ============================================
  
  // State người dùng hiện tại
  const [user, setUser] = useState({});
  
  // State danh sách bài viết
  const [articles, setArticles] = useState([]);
  
  // State danh sách danh mục
  const [categories, setCategories] = useState([]);
  
  // State loading
  const [loading, setLoading] = useState(true);
  
  // State hiển thị modal tạo/sửa bài viết
  const [showModal, setShowModal] = useState(false);
  
  // Loại modal: 'create' hoặc 'edit'
  const [modalType, setModalType] = useState('');
  
  // Bài viết đang được chọn để sửa/xóa
  const [selectedArticle, setSelectedArticle] = useState(null);
  
  // Tab hiện tại: 'all', 'draft', 'pending', 'approved', 'rejected', 'hidden'
  const [activeTab, setActiveTab] = useState('all');
  
  // State popup ẩn/hiện bài viết
  const [showHidePopup, setShowHidePopup] = useState(false);
  const [articleToHide, setArticleToHide] = useState(null);
  const [hideReason, setHideReason] = useState('');
  const [hidingArticle, setHidingArticle] = useState(false);
  
  // State confirm dialog
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  
  // State theo dõi thay đổi chưa lưu
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // ============================================
  // BỘ LỌC TÌM KIẾM
  // ============================================
  const [filters, setFilters] = useState({
    search: '',           // Tìm kiếm theo tiêu đề/nội dung
    status: '',           // Lọc theo trạng thái
    category_id: '',      // Lọc theo danh mục
    category_type: '',    // Lọc theo loại danh mục
    page: 1,              // Trang hiện tại
    limit: 10,            // Số bài viết mỗi trang
    sort_by: 'created_at', // Sắp xếp theo trường
    sort_order: 'DESC'    // Thứ tự sắp xếp
  });

  // ============================================
  // DỮ LIỆU FORM TẠO/SỬA BÀI VIẾT
  // ============================================
  const [formData, setFormData] = useState({
    // Thông tin chung
    title: '',              // Tiêu đề bài viết
    content: '',            // Nội dung HTML
    category_id: '',        // ID danh mục
    tags_json: [],          // Mảng tags
    source: '',             // Nguồn bài viết
    
    // Thông tin thuốc (Medicine)
    name: '',                         // Tên thuốc - BẮT BUỘC
    composition: '',                  // Thành phần
    uses: '',                         // Công dụng
    side_effects: '',                 // Tác dụng phụ
    image_url: '',                    // URL hình ảnh thuốc
    manufacturer: '',                 // Nhà sản xuất
    excellent_review_percent: 0,      // % đánh giá xuất sắc
    average_review_percent: 0,        // % đánh giá trung bình
    poor_review_percent: 0,           // % đánh giá kém
    components: '',                   // Thành phần (cũ)
    medicine_usage: '',               // Cách dùng
    
    // Thông tin bệnh lý (Disease)
    symptoms: '',           // Triệu chứng
    treatments: '',         // Điều trị
    description: ''         // Mô tả
  });

  // ============================================
  // XỬ LÝ ẢNH BÌA
  // ============================================
  const [coverImage, setCoverImage] = useState(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [imageUploadMethod, setImageUploadMethod] = useState('file'); // 'file' hoặc 'url'
  const [tempImageUrl, setTempImageUrl] = useState('');

  // ============================================
  // PHÂN TRANG VÀ THỐNG KÊ
  // ============================================
  const [pagination, setPagination] = useState({});
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    hidden: 0
  });

  // ============================================
  // TAGS
  // ============================================
  const [tagInput, setTagInput] = useState('');
  const [suggestedTags, setSuggestedTags] = useState([]);
  
  // Loại danh mục được chọn
  const [selectedCategoryType, setSelectedCategoryType] = useState('');

  // ============================================
  // HIỂN THỊ CỘT - CHỈ GIỮ 2 CỘT CỐ ĐỊNH: ID, TIÊU ĐỀ VÀ CỘT THAO TÁC
  // ============================================
  const [visibleColumns, setVisibleColumns] = useState({
    id: true,              // Cột ID - CỐ ĐỊNH
    title: true,           // Cột Tiêu đề - CỐ ĐỊNH
    tags: true,            // Cột Tags
    category: true,        // Cột Danh mục
    status: true,          // Cột Trạng thái
    author: true,          // Cột Tác giả
    created_at: false,     // Cột Ngày tạo
    views: false,          // Cột Lượt xem
    composition: false,    // Cột Thành phần (thuốc)
    uses: false,           // Cột Công dụng (thuốc)
    manufacturer: false,   // Cột Nhà sản xuất (thuốc)
    symptoms: false,       // Cột Triệu chứng (bệnh)
    treatments: false      // Cột Điều trị (bệnh)
  });
  const [showColumnSelector, setShowColumnSelector] = useState(false);

  const [showAdminPublishChoice, setShowAdminPublishChoice] = useState(false); // Popup chọn publish ngay hay gửi duyệt
  const [countdownSeconds, setCountdownSeconds] = useState(0); // Đếm ngược cho delete/hide
  const [deleteArticleId, setDeleteArticleId] = useState(null); // ID bài viết đang xóa
  const [hideArticleData, setHideArticleData] = useState(null); // Data bài viết đang ẩn

  // Constants cho countdown
  const DELETE_COUNTDOWN = 5;
  const HIDE_COUNTDOWN = 5;

  // ============================================
  // TOAST NOTIFICATIONS
  // ============================================
  const [toasts, setToasts] = useState([]);

  /**
   * Hiển thị toast notification
   * @param {string} message - Nội dung thông báo
   * @param {string} type - Loại: 'success', 'error', 'warning', 'info'
   */
  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  /**
   * Xóa toast theo ID
   */
  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  /**
   * Hiển thị confirm dialog
   * @param {string} title - Tiêu đề
   * @param {string} message - Nội dung
   * @param {function} onConfirm - Hàm callback khi xác nhận
   * @param {string} confirmText - Text nút xác nhận
   * @param {string} type - Loại: 'warning', 'danger', 'info'
   * @param {function} onCancelWithoutSave - Hàm callback khi không lưu
   * @param {string} cancelWithoutSaveText - Text nút không lưu
   */
  const showConfirm = (title, message, onConfirm, confirmText = 'Xác nhận', type = 'warning', onCancelWithoutSave = null, cancelWithoutSaveText = 'Không lưu') => {
    setConfirmAction({
      title, message, onConfirm, confirmText, type,
      onCancelWithoutSave, cancelWithoutSaveText
    });
    setShowConfirmDialog(true);
  };

  /**
   * Đóng confirm dialog
   */
  const closeConfirm = () => {
    setShowConfirmDialog(false);
    setConfirmAction(null);
  };

  /**
   * Xử lý khi xác nhận trong dialog
   */
  const handleConfirm = () => {
    if (confirmAction?.onConfirm) {
      confirmAction.onConfirm();
    }
    closeConfirm();
  };

  /**
   * Theo dõi thay đổi chưa lưu trong form
   */
  useEffect(() => {
    if (showModal) {
      const hasData = formData.title || formData.content || formData.category_id;
      setHasUnsavedChanges(hasData);
    }
  }, [formData, showModal]);

  /**
   * Khóa scroll khi mở modal để không cuộn được màn hình bên ngoài
   */
  useEffect(() => {
    if (showModal || showHidePopup) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showModal, showHidePopup]);

  

  // ============================================
  // CKEDITOR - UPLOAD ADAPTER
  // ============================================
  
  /**
   * Custom upload adapter cho CKEditor
   * Xử lý upload ảnh lên server
   */
  class MyUploadAdapter {
    constructor(loader) {
      this.loader = loader;
    }

    upload() {
      return this.loader.file.then(file => new Promise((resolve, reject) => {
        if (!file) return reject('Không có file được chọn');

        // Kiểm tra định dạng file
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
          return reject('Chỉ hỗ trợ JPEG, PNG, GIF, WEBP');
        }

        // Kiểm tra kích thước file (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          return reject('File quá lớn, tối đa 5MB');
        }

        const formDataUpload = new FormData();
        formDataUpload.append('image', file);

        axios.post(`${API_BASE_URL}/api/upload/image`, formDataUpload, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'multipart/form-data'
          }
        })
        .then(response => {
          if (response.data.success && response.data.url) {
            resolve({ default: response.data.url });
          } else {
            reject(response.data.message || 'Upload thất bại');
          }
        })
        .catch(error => {
          reject(error.response?.data?.message || 'Lỗi server khi upload ảnh');
        });
      }));
    }

    abort() {}
  }

  /**
   * Plugin để thêm upload adapter vào CKEditor
   */
  function MyCustomUploadAdapterPlugin(editor) {
    editor.plugins.get('FileRepository').createUploadAdapter = (loader) => {
      return new MyUploadAdapter(loader);
    };
  }

  // ============================================
  // LIFECYCLE - LOAD DỮ LIỆU BAN ĐẦU
  // ============================================
  
  useEffect(() => {
    fetchUserInfo();
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchArticles();
    fetchStats();
  }, [filters, activeTab]);

  // THÊM SAU CÁC useEffect HIỆN CÓ:

useEffect(() => {
  if (countdownSeconds > 0) {
    const timer = setTimeout(() => {
      setCountdownSeconds(prev => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }
}, [countdownSeconds]);



  /**
   * Lấy thông tin user hiện tại
   */
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

  /**
   * Lấy danh sách categories
   */
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

  /**
   * Lấy danh sách bài viết theo bộ lọc
   */
  // THAY THẾ HÀM fetchArticles HOÀN TOÀN:

const fetchArticles = async () => {
  try {
    setLoading(true);
    const params = { ...filters };
    
    // Nếu đang ở tab cụ thể, set filter status
    if (activeTab !== 'all') {
      params.status = activeTab;
    } else if (user.role === 'admin') {
      // Admin ở tab "Tất cả": Loại bỏ draft của người khác
      params.exclude_drafts_of_others = 'true';
    }

    const response = await axios.get(`${API_BASE_URL}/api/articles`, {
      params,
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });

    if (response.data.success) {
      setArticles(response.data.articles || []);
      setPagination(response.data.pagination || {});
      
      // Cập nhật stats - KHÔNG thống kê tổng draft
      if (response.data.stats) {
        setStats({
          total: response.data.stats.total || 0,
          draft: response.data.stats.draft || 0, // Chỉ draft của chính user
          pending: response.data.stats.pending || 0,
          approved: response.data.stats.approved || 0,
          rejected: response.data.stats.rejected || 0,
          hidden: response.data.stats.hidden || 0
        });
      }
    }
  } catch (error) {
    console.error('Lỗi khi lấy bài viết:', error);
    showToast('Không thể tải danh sách bài viết', 'error');
  } finally {
    setLoading(false);
  }
};

  /**
   * Lấy thống kê số lượng bài viết theo trạng thái
   */
  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/articles`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.data.success) {
        const articles = response.data.articles || [];
        const statsData = {
          total: articles.length,
          draft: articles.filter(a => a.status === 'draft').length,
          pending: articles.filter(a => a.status === 'pending').length,
          approved: articles.filter(a => a.status === 'approved').length,
          rejected: articles.filter(a => a.status === 'rejected').length,
          hidden: articles.filter(a => a.status === 'hidden').length
        };
        setStats(statsData);
      }
    } catch (error) {
      console.error('Lỗi khi lấy thống kê:', error);
    }
  };

  // ============================================
  // XỬ LÝ BỘ LỌC VÀ TÌM KIẾM
  // ============================================
  
  /**
   * Xử lý thay đổi bộ lọc
   */
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value, page: 1 }));
  };

  /**
   * Xóa tất cả bộ lọc
   */
  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      category_id: '',
      category_type: '',
      page: 1,
      limit: 10,
      sort_by: 'created_at',
      sort_order: 'DESC'
    });
  };

  /**
   * Thay đổi tab hiện tại
   */
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setFilters(prev => ({ ...prev, page: 1 }));
  };

  // ============================================
  // XỬ LÝ MODAL TẠO/SỬA BÀI VIẾT
  // ============================================
  
  /**
   * Mở modal tạo bài viết mới
   */
  const openCreateModal = () => {
    setModalType('create');
    setSelectedArticle(null);
    setFormData({
      title: '',
      content: '',
      category_id: '',
      tags_json: [],
      source: '',
      name: '',
      composition: '',
      uses: '',
      side_effects: '',
      image_url: '',
      manufacturer: '',
      excellent_review_percent: 0,
      average_review_percent: 0,
      poor_review_percent: 0,
      components: '',
      medicine_usage: '',
      symptoms: '',
      treatments: '',
      description: ''
    });
    setCoverImage(null);
    setTempImageUrl('');
    setImageUploadMethod('file');
    setSelectedCategoryType('');
    setShowModal(true);
  };

  /**
   * Mở modal sửa bài viết
   */
  const openEditModal = async (article) => {
    try {
      // Lấy chi tiết bài viết từ server
      const response = await axios.get(`${API_BASE_URL}/api/articles/${article.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.data.success) {
        const articleData = response.data.article;
        setModalType('edit');
        setSelectedArticle(articleData);
        
        // Xác định category type
        const category = categories.find(c => c.id === articleData.category_id);
        const categoryType = category?.category_type || '';
        setSelectedCategoryType(categoryType);

        // Set dữ liệu form
        setFormData({
          title: articleData.title || '',
          content: articleData.content || '',
          category_id: articleData.category_id || '',
          tags_json: articleData.tags_json || [],
          source: articleData.source || '',
          
          // Medicine fields
          name: articleData.medicine?.name || articleData.name || '',
          composition: articleData.medicine?.composition || '',
          uses: articleData.medicine?.uses || '',
          side_effects: articleData.medicine?.side_effects || '',
          image_url: articleData.medicine?.image_url || '',
          manufacturer: articleData.medicine?.manufacturer || '',
          excellent_review_percent: articleData.medicine?.excellent_review_percent || 0,
          average_review_percent: articleData.medicine?.average_review_percent || 0,
          poor_review_percent: articleData.medicine?.poor_review_percent || 0,
          components: articleData.medicine?.components || '',
          medicine_usage: articleData.medicine?.medicine_usage || '',
          
          // Disease fields
          symptoms: articleData.disease?.symptoms || '',
          treatments: articleData.disease?.treatments || '',
          description: articleData.disease?.description || ''
        });

        // Set ảnh nếu có
        if (articleData.medicine?.image_url) {
          setTempImageUrl(articleData.medicine.image_url);
          setImageUploadMethod('url');
        }

        setShowModal(true);
      }
    } catch (error) {
      console.error('Lỗi khi lấy chi tiết bài viết:', error);
      showToast('Không thể tải thông tin bài viết', 'error');
    }
  };

  /**
   * Đóng modal
   */
  const closeModal = () => {
    if (hasUnsavedChanges) {
      showConfirm(
        'Có thay đổi chưa lưu',
        'Bạn có muốn lưu thay đổi trước khi đóng?',
        () => {
          handleSubmit(null, true); // Lưu nháp
        },
        'Lưu',
        'warning',
        () => {
          setShowModal(false);
          setHasUnsavedChanges(false);
        },
        'Không lưu'
      );
    } else {
      setShowModal(false);
    }
  };

  /**
   * Xử lý thay đổi trong form
   */
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  /**
   * Xử lý thay đổi danh mục
   * Khi chọn danh mục thuốc/bệnh lý, hiển thị thêm các trường bổ sung
   */
  // THAY THẾ HÀM handleCategoryChange:

const handleCategoryChange = (e) => {
  const categoryId = e.target.value;
  const category = categories.find(c => c.id === parseInt(categoryId));
  const categoryType = category?.category_type || '';
  
  setSelectedCategoryType(categoryType);
  setFormData(prev => ({ 
    ...prev, 
    category_id: categoryId,
    // Reset các trường entity khi đổi category
    name: categoryType === 'thuoc' ? prev.name : '',
    composition: '',
    uses: '',
    side_effects: '',
    manufacturer: '',
    symptoms: '',
    treatments: '',
    description: ''
  }));
};

// THÊM HÀM MỚI SAU handleCategoryChange:

const handleCategoryTypeChange = (e) => {
  const type = e.target.value;
  setSelectedCategoryType(type);
  
  // Reset category_id khi đổi type
  setFormData(prev => ({
    ...prev,
    category_id: '',
    // Reset entity fields
    name: '',
    composition: '',
    uses: '',
    side_effects: '',
    manufacturer: '',
    symptoms: '',
    treatments: '',
    description: ''
  }));
};

  /**
   * Xử lý upload ảnh bìa
   */
  const handleCoverImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Kiểm tra định dạng
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showToast('Chỉ hỗ trợ JPEG, PNG, GIF, WEBP', 'error');
      return;
    }

    // Kiểm tra kích thước
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
        showToast('Upload ảnh thành công', 'success');
      }
    } catch (error) {
      console.error('Lỗi upload ảnh:', error);
      showToast('Upload ảnh thất bại', 'error');
    } finally {
      setUploadingCover(false);
    }
  };

  /**
   * Xử lý nhập URL ảnh
   */
  const handleImageUrlSubmit = () => {
    if (!tempImageUrl.trim()) {
      showToast('Vui lòng nhập URL ảnh', 'error');
      return;
    }
    
    // Validate URL
    try {
      new URL(tempImageUrl);
      setCoverImage(tempImageUrl);
      setFormData(prev => ({ ...prev, image_url: tempImageUrl }));
      showToast('Đã thêm ảnh từ URL', 'success');
    } catch {
      showToast('URL không hợp lệ', 'error');
    }
  };

  /**
   * Xử lý thêm tag
   */
  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (!tag) return;
    
    if (formData.tags_json.includes(tag)) {
      showToast('Tag đã tồn tại', 'warning');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      tags_json: [...prev.tags_json, tag]
    }));
    setTagInput('');
  };

  /**
   * Xử lý xóa tag
   */
  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags_json: prev.tags_json.filter(t => t !== tagToRemove)
    }));
  };

  /**
   * Lấy gợi ý tags
   */
  const fetchSuggestedTags = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/articles/tags/suggest`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.data.success) {
        setSuggestedTags(response.data.tags || []);
      }
    } catch (error) {
      console.error('Lỗi khi lấy gợi ý tags:', error);
    }
  };

  /**
   * Upload file Word/Excel
   */
  const handleFileImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      if (file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
        // Đọc file Word
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setFormData(prev => ({ ...prev, content: result.value }));
        showToast('Đã import nội dung từ Word', 'success');
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // Đọc file Excel
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

  /**
   * Xử lý submit form tạo/sửa bài viết
   * @param {Event} e - Event
   * @param {boolean} isDraft - Lưu nháp hay gửi phê duyệt
   */
  // THAY THẾ HÀM handleSubmit HOÀN TOÀN:

const handleSubmit = async (e, isDraft = false, isAdminDirectPublish = false) => {
  if (e) e.preventDefault();

  // Validate
  if (!formData.title.trim()) {
    showToast('Vui lòng nhập tiêu đề', 'error');
    return;
  }

  if (!formData.content.trim()) {
    showToast('Vui lòng nhập nội dung', 'error');
    return;
  }

  if (!formData.category_id) {
    showToast('Vui lòng chọn danh mục', 'error');
    return;
  }

  // Validate cho thuốc: Phải có tên thuốc
  if (selectedCategoryType === 'thuoc' && !formData.name.trim()) {
    showToast('Vui lòng nhập tên thuốc', 'error');
    return;
  }

  // Validate cho bệnh lý: Phải có tên bệnh (dùng title)
  if (selectedCategoryType === 'benh_ly' && !formData.title.trim()) {
    showToast('Vui lòng nhập tên bệnh lý', 'error');
    return;
  }

  // Nếu admin gửi phê duyệt (không phải draft), hiện popup chọn
  if (user.role === 'admin' && !isDraft && !isAdminDirectPublish && modalType === 'create') {
    setShowAdminPublishChoice(true);
    return;
  }

  try {
    const submitData = {
      title: formData.title,
      content: formData.content,
      category_id: formData.category_id,
      tags_json: formData.tags_json,
      source: formData.source,
      isDraft: isDraft
    };

    // Admin publish trực tiếp
    if (isAdminDirectPublish) {
      submitData.status = 'approved';
      submitData.isDraft = false;
    }

    // Thêm dữ liệu thuốc nếu category là thuốc
    if (selectedCategoryType === 'thuoc') {
      submitData.medicineData = {
        name: formData.name || formData.title,
        composition: formData.composition,
        uses: formData.uses,
        side_effects: formData.side_effects,
        image_url: formData.image_url || coverImage,
        manufacturer: formData.manufacturer,
        excellent_review_percent: formData.excellent_review_percent,
        average_review_percent: formData.average_review_percent,
        poor_review_percent: formData.poor_review_percent,
        components: formData.components,
        medicine_usage: formData.medicine_usage
      };
    }

    // Thêm dữ liệu bệnh lý nếu category là bệnh lý
    if (selectedCategoryType === 'benh_ly') {
      submitData.diseaseData = {
        name: formData.title, // Tên bệnh chính là title
        symptoms: formData.symptoms,
        treatments: formData.treatments,
        description: formData.description
      };
    }

    let response;
    if (modalType === 'create') {
      response = await axios.post(`${API_BASE_URL}/api/articles`, submitData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
    } else {
      response = await axios.put(`${API_BASE_URL}/api/articles/${selectedArticle.id}`, submitData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
    }

    if (response.data.success) {
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
      fetchStats();
    }
  } catch (error) {
    console.error('Lỗi khi lưu bài viết:', error);
    showToast(
      error.response?.data?.message || 'Có lỗi xảy ra khi lưu bài viết',
      'error'
    );
  }
};

  /**
   * Xử lý xóa bài viết
   */
  // THAY THẾ HÀM handleDelete:

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

// THÊM HÀM MỚI:
const performDelete = async (articleId) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/api/articles/${articleId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });

    if (response.data.success) {
      showToast('Đã xóa bài viết', 'success');
      fetchArticles();
      fetchStats();
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
  // THAY THẾ HÀM openHidePopup:

const openHidePopup = (article) => {
  setArticleToHide(article);
  setHideReason('');
  setCountdownSeconds(article.status === 'hidden' ? 0 : HIDE_COUNTDOWN);
  setShowHidePopup(true);
};

  /**
   * Xử lý ẩn/hiện bài viết
   */
  // THAY THẾ HÀM handleHideArticle:

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
      fetchStats();
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
  // THAY THẾ HÀM handleDuplicate:

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
          fetchStats();
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

// THÊM HÀM MỚI SAU handleDuplicate:

const handleSortColumn = (column) => {
  setFilters(prev => ({
    ...prev,
    sort_by: column,
    sort_order: prev.sort_by === column && prev.sort_order === 'DESC' ? 'ASC' : 'DESC'
  }));
};

  /**
   * Xem chi tiết bài viết
   */
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

  /**
   * Xem lịch sử phê duyệt
   */
  const viewHistory = (articleId) => {
    navigate(`/phe-duyet-bai-viet/${articleId}`);
  };

  // THÊM/SỬA HÀM getCategoryTypeUrl:

const getCategoryTypeUrl = (article) => {
  const typeMap = {
    'tin_tuc': 'tin-tuc',
    'thuoc': 'thuoc',
    'benh_ly': 'benh-ly'
  };
  const categoryType = typeMap[article.category?.category_type] || 'tin-tuc';
  return `/${categoryType}/${article.slug}`;
};

  // ============================================
  // XỬ LÝ XUẤT FILE CSV/EXCEL
  // ============================================
  
  /**
   * Xuất danh sách bài viết ra file CSV
   */
  const exportToCSV = () => {
    try {
      // Chuẩn bị dữ liệu
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

      // Tạo CSV content
      const headers = Object.keys(csvData[0]);
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => headers.map(h => `"${row[h]}"`).join(','))
      ].join('\n');

      // Download file
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

  /**
   * Xuất danh sách bài viết ra file Excel
   */
  const exportToExcel = () => {
    try {
      // Chuẩn bị dữ liệu
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

      // Tạo workbook và worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Bài viết');

      // Download file
      XLSX.writeFile(wb, `bai-viet-${new Date().getTime()}.xlsx`);
      
      showToast('Đã xuất file Excel', 'success');
    } catch (error) {
      console.error('Lỗi khi xuất Excel:', error);
      showToast('Không thể xuất file Excel', 'error');
    }
  };

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  
  /**
   * Lấy text hiển thị cho status
   */
  const getStatusText = (status) => {
    const statusMap = {
      draft: 'Nháp',
      pending: 'Chờ duyệt',
      approved: 'Đã duyệt',
      rejected: 'Từ chối',
      hidden: 'Đã ẩn',
      request_edit: 'Yêu cầu sửa',
      request_rewrite: 'Yêu cầu viết lại'
    };
    return statusMap[status] || status;
  };

  /**
   * Lấy class CSS cho status badge
   */
  const getStatusClass = (status) => {
    const classMap = {
      draft: 'status-draft',
      pending: 'status-pending',
      approved: 'status-approved',
      rejected: 'status-rejected',
      hidden: 'status-hidden',
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
      tin_tuc: <FaNewspaper />,
      thuoc: <FaPills />,
      benh_ly: <FaDisease />
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
              <div className="stat-item">
                Tổng: <strong>{stats.total}</strong>
              </div>
              <div className="stat-item stat-pending">
                Chờ duyệt: <strong>{stats.pending}</strong>
              </div>
              <div className="stat-item stat-info">
                <FaInfoCircle /> 
                <span className="stat-note">Nháp: Chỉ của bạn ({stats.draft})</span>
              </div>
            </div>
          </div>

          {/* Nút tạo bài viết */}
          <button className="btn-create-article" onClick={openCreateModal}>
            <FaPlus /> Tạo bài viết
          </button>
        </div>
      </div>

        {/* TABS */}
        <div className="article-mgmt-tabs">
          {[
            { key: 'all', label: 'Tất cả', count: stats.total },
            { key: 'draft', label: 'Nháp', count: stats.draft },
            { key: 'pending', label: 'Chờ duyệt', count: stats.pending },
            { key: 'approved', label: 'Đã duyệt', count: stats.approved },
            { key: 'rejected', label: 'Từ chối', count: stats.rejected },
            { key: 'hidden', label: 'Đã ẩn', count: stats.hidden }
          ].map(tab => (
            <button
              key={tab.key}
              className={`tab-button ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => handleTabChange(tab.key)}
            >
              {tab.label} <span className="tab-count">{tab.count}</span>
            </button>
          ))}
        </div>

        {/* FILTERS */}
        <div className="article-mgmt-filters">
          <div className="filters-row">
            {/* Search */}
            <div className="filter-search">
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
              className="filter-select"
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
              className="filter-select"
            >
              <option value="">Tất cả danh mục</option>
              {categories
                .filter(cat => !filters.category_type || cat.category_type === filters.category_type)
                .map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))
              }
            </select>

            {/* THÊM: Số bài viết/trang */}
            <select
              name="limit"
              value={filters.limit}
              onChange={handleFilterChange}
              className="filter-select filter-limit"
            >
              <option value="10">10 bài/trang</option>
              <option value="20">20 bài/trang</option>
              <option value="50">50 bài/trang</option>
              <option value="100">100 bài/trang</option>
            </select>

            {/* Clear filters */}
            {(filters.search || filters.category_type || filters.category_id) && (
              <button className="btn-clear-filters" onClick={clearFilters}>
                <FaTimes /> Xóa lọc
              </button>
            )}

            {/* Export buttons */}
            <button className="btn-export btn-export-csv" onClick={exportToCSV} title="Xuất CSV">
              <FaFileCsv /> CSV
            </button>
            
            <button className="btn-export btn-export-excel" onClick={exportToExcel} title="Xuất Excel">
              <FaFileExcel /> Excel
            </button>

            {/* Column selector */}
            <div className="column-selector-wrapper">
              <button
                className="btn-column-selector"
                onClick={() => setShowColumnSelector(!showColumnSelector)}
              >
                <FaCog /> Tùy chỉnh cột
              </button>
              
              {showColumnSelector && (
                <div className="column-selector-dropdown">
                  <div className="column-selector-header">
                    <strong>Hiển thị cột</strong>
                    <button onClick={() => setShowColumnSelector(false)}>
                      <FaTimes />
                    </button>
                  </div>
                  <div className="column-selector-body">
                    {Object.entries(visibleColumns)
                      .filter(([key]) => !['id', 'title'].includes(key))
                      .map(([key, value]) => (
                        <label key={key} className="column-checkbox">
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
                  className="col-fixed col-id col-sortable" 
                  onClick={() => handleSortColumn('id')}
                >
                  ID {filters.sort_by === 'id' && (filters.sort_order === 'DESC' ? '↓' : '↑')}
                </th>
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
                  <td colSpan="20" className="text-center">
                    <div className="loading-spinner">
                      <FaSpinner className="spin" /> Đang tải...
                    </div>
                  </td>
                </tr>
              ) : articles.length === 0 ? (
                <tr>
                  <td colSpan="20" className="text-center">
                    <div className="empty-state">
                      <FaFileAlt />
                      <p>Không có bài viết nào</p>
                    </div>
                  </td>
                </tr>
              ) : (
                articles.map(article => (
                  <tr key={article.id}>
                    <td className="col-fixed col-id">{article.id}</td>
                    {/* Title - Thêm link */}
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
                    {visibleColumns.tags && (
                      <td className="col-scrollable">
                        <div className="tags-cell">
                          {article.tags_json && Array.isArray(article.tags_json) && article.tags_json.length > 0 ? (
                            article.tags_json.map((tag, idx) => (
                              <span key={idx} className="tag-badge">{tag}</span>
                            ))
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </div>
                      </td>
                    )}
                    {visibleColumns.category && (
                      <td className="col-scrollable">
                        <span className="category-badge">
                          {article.category?.name || '-'}
                        </span>
                      </td>
                    )}
                    {visibleColumns.status && (
                      <td className="col-scrollable">
                        <span className={`status-badge ${getStatusClass(article.status)}`}>
                          {getStatusText(article.status)}
                        </span>
                      </td>
                    )}
                    {visibleColumns.author && (
                      <td className="col-scrollable">
                        <div className="author-cell">
                          <FaUser />
                          <span>{article.author?.full_name || '-'}</span>
                        </div>
                      </td>
                    )}
                    {visibleColumns.created_at && (
                      <td className="col-scrollable">
                        {new Date(article.created_at).toLocaleDateString('vi-VN')}
                      </td>
                    )}
                    {visibleColumns.views && (
                      <td className="col-scrollable">
                        <div className="views-cell">
                          <FaEye /> {article.views || 0}
                        </div>
                      </td>
                    )}
                    {visibleColumns.composition && (
                      <td className="col-scrollable">
                        {article.medicine?.composition ? (
                          <span title={article.medicine.composition}>
                            {article.medicine.composition.substring(0, 50)}...
                          </span>
                        ) : '-'}
                      </td>
                    )}
                    {visibleColumns.uses && (
                      <td className="col-scrollable">
                        {article.medicine?.uses ? (
                          <span title={article.medicine.uses}>
                            {article.medicine.uses.substring(0, 50)}...
                          </span>
                        ) : '-'}
                      </td>
                    )}
                    {visibleColumns.manufacturer && (
                      <td className="col-scrollable">
                        {article.medicine?.manufacturer || '-'}
                      </td>
                    )}
                    {visibleColumns.symptoms && (
                      <td className="col-scrollable">
                        {article.disease?.symptoms ? (
                          <span title={article.disease.symptoms}>
                            {article.disease.symptoms.substring(0, 50)}...
                          </span>
                        ) : '-'}
                      </td>
                    )}
                    {visibleColumns.treatments && (
                      <td className="col-scrollable">
                        {article.disease?.treatments ? (
                          <span title={article.disease.treatments}>
                            {article.disease.treatments.substring(0, 50)}...
                          </span>
                        ) : '-'}
                      </td>
                    )}
                    {/* Actions - BỎ btn-view, thêm màu icon */}
                    <td className="col-fixed col-actions">
                      <div className="action-buttons">
                        <button
                          className="btn-action btn-edit"
                          onClick={() => openEditModal(article)}
                          title="Sửa"
                        >
                          <FaEdit />
                        </button>
                        <button
                          className="btn-action btn-duplicate"
                          onClick={() => handleDuplicate(article)}
                          title="Nhân bản"
                        >
                          <FaCopy />
                        </button>
                        <button
                          className="btn-action btn-history"
                          onClick={() => viewHistory(article.id)}
                          title="Lịch sử"
                        >
                          <FaHistory />
                        </button>
                        {user.role === 'admin' && (
                          <button
                            className="btn-action btn-hide"
                            onClick={() => openHidePopup(article)}
                            title={article.status === 'hidden' ? 'Hiện' : 'Ẩn'}
                          >
                            {article.status === 'hidden' ? <FaEye /> : <FaEyeSlash />}
                          </button>
                        )}
                        <button
                          className="btn-action btn-delete"
                          onClick={() => handleDelete(article.id)}
                          title="Xóa"
                        >
                          <FaTrash />
                        </button>
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
              className="btn-page"
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
              onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={filters.page === pagination.totalPages}
              className="btn-page"
            >
              Sau
            </button>
          </div>
        )}

        {/* MODAL TẠO/SỬA BÀI VIẾT */}
        {showModal && (
          <div className="article-modal-overlay">
            <div className="article-modal-container">
              <div className="article-modal-header">
                <h2>
                  {modalType === 'create' ? <><FaPlus /> Tạo bài viết mới</> : <><FaEdit /> Sửa bài viết</>}
                </h2>
                <button className="btn-close-modal" onClick={closeModal}>
                  <FaTimes />
                </button>
              </div>

              <form className="article-modal-body">
                <div className="article-modal-content">
  
                {/* SIDEBAR - Ảnh bìa + BUTTONS */}
                <div className="article-modal-sidebar">
                  {/* Ảnh bìa */}
                  <div className="cover-image-section">
                    <label className="section-label">
                      <FaImage /> Ảnh bìa
                    </label>
                    
                    {/* Tabs: File vs URL */}
                    <div className="image-upload-tabs">
                      <button
                        type="button"
                        className={`tab-btn ${imageUploadMethod === 'file' ? 'active' : ''}`}
                        onClick={() => setImageUploadMethod('file')}
                      >
                        <FaUpload /> Upload
                      </button>
                      <button
                        type="button"
                        className={`tab-btn ${imageUploadMethod === 'url' ? 'active' : ''}`}
                        onClick={() => setImageUploadMethod('url')}
                      >
                        <FaLink /> URL
                      </button>
                    </div>

                    {/* Preview ảnh */}
                    {(coverImage || tempImageUrl) && (
                      <div className="image-preview">
                        <img src={coverImage || tempImageUrl} alt="Cover" />
                        <button
                          type="button"
                          className="btn-remove-image"
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
                      <div className="upload-area">
                        <input
                          type="file"
                          id="cover-upload"
                          accept="image/*"
                          onChange={handleCoverImageUpload}
                          style={{ display: 'none' }}
                        />
                        <label htmlFor="cover-upload" className="upload-label">
                          {uploadingCover ? (
                            <><FaSpinner className="spin" /> Đang tải...</>
                          ) : (
                            <><FaUpload /> Chọn ảnh</>
                          )}
                        </label>
                      </div>
                    ) : (
                      <div className="url-input-group">
                        <input
                          type="text"
                          value={tempImageUrl}
                          onChange={(e) => setTempImageUrl(e.target.value)}
                          placeholder="https://example.com/image.jpg"
                          className="url-input"
                        />
                        <button
                          type="button"
                          className="btn-add-url"
                          onClick={handleImageUrlSubmit}
                        >
                          Thêm
                        </button>
                      </div>
                    )}
                  </div>

                  {/* BUTTONS - Di chuyển lên đây */}
                  <div className="form-actions-sidebar">
                    <button
                      type="button"
                      className="btn-submit btn-primary btn-full"
                      onClick={(e) => handleSubmit(e, false)}
                    >
                      <FaPaperPlane /> Gửi phê duyệt
                    </button>
                    
                    <div className="form-actions-row">
                      <button
                        type="button"
                        className="btn-submit btn-secondary"
                        onClick={(e) => handleSubmit(e, true)}
                      >
                        <FaSave /> Lưu nháp
                      </button>
                      <button
                        type="button"
                        className="btn-submit btn-cancel"
                        onClick={closeModal}
                      >
                        <FaTimes /> Hủy
                      </button>
                    </div>
                  </div>
                </div>

                  {/* MAIN FORM */}
                <div className="article-modal-main">
                  
                  {/* HÀNG 1: Tiêu đề, Loại, Danh mục */}
                  <div className="form-row form-row-3">
                    <div className="form-group">
                      <label className="form-label required">Tiêu đề</label>
                      <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleFormChange}
                        placeholder="Nhập tiêu đề bài viết..."
                        className="form-input"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label required">Loại bài viết</label>
                      <select
                        value={selectedCategoryType}
                        onChange={handleCategoryTypeChange}
                        className="form-select"
                        required
                      >
                        <option value="">Chọn loại</option>
                        <option value="tin_tuc">Tin tức</option>
                        <option value="thuoc">Thuốc</option>
                        <option value="benh_ly">Bệnh lý</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label required">Danh mục</label>
                      <select
                        name="category_id"
                        value={formData.category_id}
                        onChange={handleCategoryChange}
                        className="form-select"
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
                  </div>

                  {/* HÀNG 2: Tags và Import nội dung */}
                  <div className="form-row form-row-2">
                    {/* Tags */}
                    <div className="form-group">
                      <label className="form-label">
                        <FaTags /> Tags
                      </label>
                      <div className="tags-input-wrapper">
                        <div className="tags-display">
                          {formData.tags_json.map((tag, idx) => (
                            <span key={idx} className="tag-item">
                              {tag}
                              <button
                                type="button"
                                onClick={() => handleRemoveTag(tag)}
                                className="btn-remove-tag"
                              >
                                <FaTimes />
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="tags-input-group">
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
                            className="tags-input"
                          />
                          <button
                            type="button"
                            onClick={handleAddTag}
                            className="btn-add-tag"
                          >
                            Thêm
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Import file */}
                    <div className="form-group">
                      <label className="form-label">
                        <FaFileImport /> Import nội dung
                      </label>
                      <input
                        type="file"
                        accept=".doc,.docx,.xls,.xlsx"
                        onChange={handleFileImport}
                        className="file-input"
                      />
                      <small className="form-hint">
                        Hỗ trợ: .docx, .doc, .xlsx, .xls
                      </small>
                    </div>
                  </div>

                    {/* Nội dung */}
                    <div className="form-group">
                      <label className="form-label required">Nội dung</label>
                      <div className="editor-wrapper">
                        <CKEditor
                          editor={DecoupledEditor}
                          data={formData.content}
                          onReady={editor => {
                            const toolbarContainer = document.querySelector('.editor-wrapper .ck-toolbar');
                            const editableElement = editor.ui.getEditableElement();
                            if (toolbarContainer && editableElement) {
                              toolbarContainer.appendChild(editor.ui.view.toolbar.element);
                            } else if (editableElement && editableElement.parentElement) {
                              editableElement.parentElement.insertBefore(
                                editor.ui.view.toolbar.element,
                                editableElement
                              );
                            }
                          }}
                          onChange={(event, editor) => {
                            const data = editor.getData();
                            setFormData(prev => ({ ...prev, content: data }));
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
                      </div>
                    </div>

                    {/* THÔNG TIN BỔ SUNG - THUỐC */}
                    {selectedCategoryType === 'thuoc' && (
                      <div className="additional-fields medicine-fields">
                        <h3 className="section-title">
                          <FaPills /> Thông tin thuốc
                        </h3>
                        
                        {/* Hàng 1: Tên thuốc + Nhà sản xuất */}
                        <div className="form-row form-row-2">
                          <div className="form-group">
                            <label className="form-label required">Tên thuốc</label>
                            <input
                              type="text"
                              name="name"
                              value={formData.name}
                              onChange={handleFormChange}
                              placeholder="Tên thuốc..."
                              className="form-input"
                              required
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label">Nhà sản xuất</label>
                            <input
                              type="text"
                              name="manufacturer"
                              value={formData.manufacturer}
                              onChange={handleFormChange}
                              placeholder="Nhà sản xuất..."
                              className="form-input"
                            />
                          </div>
                        </div>

                        {/* Hàng 2: Thành phần + Công dụng */}
                        <div className="form-row form-row-2">
                          <div className="form-group">
                            <label className="form-label">Thành phần</label>
                            <textarea
                              name="composition"
                              value={formData.composition}
                              onChange={handleFormChange}
                              placeholder="Thành phần thuốc..."
                              className="form-textarea"
                              rows="3"
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label">Công dụng</label>
                            <textarea
                              name="uses"
                              value={formData.uses}
                              onChange={handleFormChange}
                              placeholder="Công dụng..."
                              className="form-textarea"
                              rows="3"
                            />
                          </div>
                        </div>

                        {/* Hàng 3: Tác dụng phụ + Cách dùng */}
                        <div className="form-row form-row-2">
                          <div className="form-group">
                            <label className="form-label">Tác dụng phụ</label>
                            <textarea
                              name="side_effects"
                              value={formData.side_effects}
                              onChange={handleFormChange}
                              placeholder="Tác dụng phụ..."
                              className="form-textarea"
                              rows="3"
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label">Cách dùng</label>
                            <textarea
                              name="medicine_usage"
                              value={formData.medicine_usage}
                              onChange={handleFormChange}
                              placeholder="Cách sử dụng..."
                              className="form-textarea"
                              rows="3"
                            />
                          </div>
                        </div>

                        {/* Hàng 4: % Đánh giá */}
                        <div className="form-row form-row-3">
                          <div className="form-group">
                            <label className="form-label">% Xuất sắc</label>
                            <input
                              type="number"
                              name="excellent_review_percent"
                              value={formData.excellent_review_percent}
                              onChange={handleFormChange}
                              min="0"
                              max="100"
                              step="0.01"
                              className="form-input"
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label">% Trung bình</label>
                            <input
                              type="number"
                              name="average_review_percent"
                              value={formData.average_review_percent}
                              onChange={handleFormChange}
                              min="0"
                              max="100"
                              step="0.01"
                              className="form-input"
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label">% Kém</label>
                            <input
                              type="number"
                              name="poor_review_percent"
                              value={formData.poor_review_percent}
                              onChange={handleFormChange}
                              min="0"
                              max="100"
                              step="0.01"
                              className="form-input"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* THÔNG TIN BỔ SUNG - BỆNH LÝ */}
                    {selectedCategoryType === 'benh_ly' && (
                      <div className="additional-fields disease-fields">
                        <h3 className="section-title">
                          <FaDisease /> Thông tin bệnh lý
                        </h3>
                        
                        {/* Hàng 1: Triệu chứng + Điều trị */}
                        <div className="form-row form-row-2">
                          <div className="form-group">
                            <label className="form-label">Triệu chứng</label>
                            <textarea
                              name="symptoms"
                              value={formData.symptoms}
                              onChange={handleFormChange}
                              placeholder="Các triệu chứng điển hình..."
                              className="form-textarea"
                              rows="4"
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label">Điều trị</label>
                            <textarea
                              name="treatments"
                              value={formData.treatments}
                              onChange={handleFormChange}
                              placeholder="Phương pháp điều trị..."
                              className="form-textarea"
                              rows="4"
                            />
                          </div>
                        </div>

                        {/* Mô tả thêm */}
                        <div className="form-group">
                          <label className="form-label">Mô tả thêm</label>
                          <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleFormChange}
                            placeholder="Thông tin bổ sung..."
                            className="form-textarea"
                            rows="3"
                          />
                        </div>
                      </div>
                    )}

                    {/* Nguồn */}
                    <div className="form-group">
                      <label className="form-label">Nguồn</label>
                      <input
                        type="url"
                        name="source"
                        value={formData.source}
                        onChange={handleFormChange}
                        placeholder="https://..."
                        className="form-input"
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
          <div className="confirm-overlay">
            <div className={`confirm-dialog ${confirmAction.type}`}>
              <div className="confirm-icon">
                {confirmAction.type === 'danger' && <FaExclamationTriangle />}
                {confirmAction.type === 'warning' && <FaExclamationTriangle />}
                {confirmAction.type === 'info' && <FaInfoCircle />}
              </div>
              <h3 className="confirm-title">{confirmAction.title}</h3>
              <p className="confirm-message">{confirmAction.message}</p>
              
              {/* THÊM COUNTDOWN */}
              {deleteArticleId && countdownSeconds > 0 && (
                <div className="countdown-timer">
                  <FaClock />
                  <span>Vui lòng chờ {countdownSeconds} giây để xác nhận...</span>
                </div>
              )}
              
              <div className="confirm-actions">
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
                  className="btn-confirm btn-cancel"
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
          <div className="popup-overlay">
            <div className="popup">
              <div className="popup-header">
                <div className="popup-header-content">
                  {articleToHide.status === 'hidden' ? <FaEye className="popup-icon" /> : <FaEyeSlash className="popup-icon" />}
                  <h3>{articleToHide.status === 'hidden' ? 'Hiện bài viết' : 'Ẩn bài viết'}</h3>
                </div>
                <button onClick={() => setShowHidePopup(false)} className="btn-close-popup">
                  <FaTimes />
                </button>
              </div>
              <form onSubmit={handleHideArticle} className="popup-body">
                <div className="popup-warning">
                  <FaExclamationTriangle />
                  <div>
                    <p className="warning-title">Lưu ý</p>
                    <p className="warning-text">
                      {articleToHide.status === 'hidden' 
                        ? 'Bài viết sẽ được hiển thị công khai.'
                        : 'Bài viết sẽ bị ẩn khỏi danh sách công khai.'
                      }
                    </p>
                  </div>
                </div>
                <div className="popup-info">
                  <label className="popup-label">Bài viết:</label>
                  <p className="article-title-display">{articleToHide.title}</p>
                </div>
                <div className="popup-quick-reasons">
                  <label className="popup-label">Lý do nhanh:</label>
                  <div className="quick-reason-buttons">
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
                <div className="popup-form-group">
                  <label className="popup-label">
                    Lý do <span className="required">*</span>
                  </label>
                  <textarea
                    value={hideReason}
                    onChange={(e) => setHideReason(e.target.value)}
                    placeholder={`Nhập lý do ${articleToHide.status === 'hidden' ? 'hiện' : 'ẩn'} bài viết...`}
                    maxLength={500}
                    rows={5}
                    className="popup-textarea"
                    required
                  />
                  <small className="char-count">{hideReason.length}/500</small>
                </div>

                <div className="popup-footer">
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
                    className="btn-cancel"
                    disabled={hidingArticle}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="btn-submit btn-hide-confirm"
                    disabled={hidingArticle || !hideReason.trim() || (articleToHide?.status !== 'hidden' && countdownSeconds > 0)}
                  >
                    {hidingArticle ? (
                      <>
                        <FaSpinner className="spinner-icon" /> Đang xử lý...
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
          <div className="popup-overlay" onClick={() => setShowAdminPublishChoice(false)}>
            <div className="popup admin-choice-popup" onClick={(e) => e.stopPropagation()}>
              <div className="popup-header">
                <div className="popup-header-content">
                  <FaCheckCircle className="popup-icon" />
                  <h3>Chọn cách đăng bài</h3>
                </div>
                <button onClick={() => setShowAdminPublishChoice(false)} className="btn-close-popup">
                  <FaTimes />
                </button>
              </div>

              <div className="popup-body">
                <div className="popup-info">
                  <p className="popup-label">Bạn là Admin, bạn có muốn:</p>
                </div>

                <div className="admin-choice-buttons">
                  <button
                    className="btn-admin-choice btn-publish-now"
                    onClick={(e) => {
                      setShowAdminPublishChoice(false);
                      handleSubmit(null, false, true); // Publish trực tiếp
                    }}
                  >
                    <FaCheckCircle />
                    <span>Đăng bài ngay</span>
                    <small>Bài viết sẽ hiển thị công khai ngay lập tức</small>
                  </button>

                  <button
                    className="btn-admin-choice btn-send-review"
                    onClick={(e) => {
                      setShowAdminPublishChoice(false);
                      handleSubmit(null, false, false); // Gửi phê duyệt cho admin khác
                    }}
                  >
                    <FaPaperPlane />
                    <span>Gửi phê duyệt</span>
                    <small>Gửi cho Admin khác xem xét và phê duyệt</small>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TOAST NOTIFICATIONS */}
        <div className="toast-container">
          {toasts.map(toast => (
            <div key={toast.id} className={`toast toast-${toast.type}`}>
              <div className="toast-icon">
                {toast.type === 'success' && <FaCheckCircle />}
                {toast.type === 'error' && <FaTimesCircle />}
                {toast.type === 'warning' && <FaExclamationTriangle />}
                {toast.type === 'info' && <FaInfoCircle />}
              </div>
              <span className="toast-message">{toast.message}</span>
              <button
                className="toast-close"
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

export default ArticleManagementPage;