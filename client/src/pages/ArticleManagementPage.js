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
    created_at: true,     // Cột Ngày tạo
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
  const [showRejectPopup, setShowRejectPopup] = useState(false);
  const [articleToReject, setArticleToReject] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  // State cho popup cảnh báo admin sửa bài đã duyệt
const [showAdminEditWarning, setShowAdminEditWarning] = useState(false);
const [editingApprovedArticle, setEditingApprovedArticle] = useState(null);

// State cho popup xác nhận gửi phê duyệt
const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
const [pendingSubmitData, setPendingSubmitData] = useState(null);

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
  }, [filters]);

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
    if (user.role === 'admin' && !params.status) {
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
  // LOGIC HIỂN THỊ BUTTON THEO ROLE VÀ STATUS
  // ============================================

  /**
   * Hàm kiểm tra quyền hiển thị button
   * @param {string} action - Tên action: 'edit', 'delete', 'hide', 'approve', 'reject', 'history', 'duplicate', 'request_edit', 'request_rewrite', 'approve_edit'
   * @param {object} article - Bài viết
   * @param {object} user - User hiện tại
   * @returns {boolean} - true nếu được phép hiển thị
   */
  const canShowButton = (action, article, user) => {
    const isAuthor = article.author_id === user.id;
    const isAdmin = user.role === 'admin';
    const status = article.status;

    switch (action) {
      // ===== EDIT BUTTON =====
      case 'edit':
        if (isAdmin) {
          // Admin: Có thể edit tất cả bài viết (trừ draft của người khác - nhưng không thấy nên không cần check)
          return true;
        } else {
          // Staff/Doctor: Chỉ edit được draft, rejected, request_edit của mình
          return isAuthor && ['draft', 'rejected', 'request_edit'].includes(status);
        }

      // ===== DELETE BUTTON =====
      case 'delete':
        if (isAdmin) {
          // Admin: Có thể xóa tất cả (trừ draft của người khác)
          return true;
        } else {
          // Staff/Doctor: Chỉ xóa được draft của mình
          return isAuthor && status === 'draft';
        }

      // ===== HIDE/SHOW BUTTON =====
      case 'hide':
        // Chỉ admin mới có quyền ẩn/hiện bài viết
        return isAdmin;

      // ===== APPROVE BUTTON (trong review) =====
      case 'approve':
        // Chỉ admin mới có quyền phê duyệt
        // Hiển thị với bài viết pending hoặc rejected
        return isAdmin && ['pending', 'rejected'].includes(status);

      // ===== REJECT BUTTON (trong review) =====
      case 'reject':
        // Chỉ admin mới có quyền từ chối
        // Hiển thị với bài viết pending
        return isAdmin && status === 'pending';

      // ===== HISTORY BUTTON =====
      case 'history':
        // Tất cả role đều có thể xem lịch sử phê duyệt
        return true;

      // ===== DUPLICATE BUTTON =====
      case 'duplicate':
        // Tất cả role đều có thể nhân bản
        return true;

      // ===== REQUEST EDIT BUTTON =====
      case 'request_edit':
        // Staff/Doctor: Gửi yêu cầu chỉnh sửa khi bài viết đã approved
        // Admin: Không cần (admin edit trực tiếp)
        return !isAdmin && isAuthor && status === 'approved';

      // ===== REQUEST REWRITE BUTTON =====
      case 'request_rewrite':
        // Admin: Yêu cầu viết lại bài viết đã ẩn
        return isAdmin && status === 'hidden';

      // ===== APPROVE EDIT REQUEST BUTTON =====
      case 'approve_edit':
        // Admin: Đồng ý cho chỉnh sửa khi có request_edit
        return isAdmin && status === 'request_edit';

      // ===== REJECT EDIT REQUEST BUTTON =====
      case 'reject_edit':
        // Admin: Từ chối yêu cầu chỉnh sửa
        return isAdmin && status === 'request_edit';

      default:
        return false;
    }
  };

  /**
   * Hàm lấy tooltip cho button
   */
  const getButtonTooltip = (action, article) => {
    const status = article.status;
    
    switch (action) {
      case 'edit':
        if (status === 'approved') return 'Chỉnh sửa bài viết';
        if (status === 'draft') return 'Chỉnh sửa nháp';
        if (status === 'rejected') return 'Chỉnh sửa và gửi lại';
        if (status === 'request_edit') return 'Chỉnh sửa bài viết';
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
        
      case 'request_edit':
        return 'Yêu cầu chỉnh sửa';
        
      case 'request_rewrite':
        return 'Yêu cầu viết lại';
        
      case 'approve_edit':
        return 'Đồng ý cho chỉnh sửa';
        
      case 'reject_edit':
        return 'Từ chối yêu cầu';
        
      default:
        return '';
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

  // ============================================
// HÀM handleSubmit MỚI - THAY THẾ HOÀN TOÀN
// Vị trí: Dòng 812-925 trong ArticleManagementPage.js
// ============================================

const handleSubmit = async (e, isDraft = false, isAdminDirectPublish = false, skipConfirm = false) => {
  if (e) e.preventDefault();

  // ===== VALIDATION CƠ BẢN =====
  if (!formData.title.trim()) {
    showToast('Vui lòng nhập tiêu đề', 'warning');
    return;
  }

  if (!formData.content.trim()) {
    showToast('Vui lòng nhập nội dung', 'warning');
    return;
  }

  if (!formData.category_id) {
    showToast('Vui lòng chọn danh mục', 'warning');
    return;
  }

  // Validate cho thuốc: Phải có tên thuốc
  if (selectedCategoryType === 'thuoc' && !formData.name.trim()) {
    showToast('Vui lòng nhập tên thuốc', 'warning');
    return;
  }

  // Validate cho bệnh lý: Phải có tên bệnh (dùng title)
  if (selectedCategoryType === 'benh_ly' && !formData.title.trim()) {
    showToast('Vui lòng nhập tên bệnh lý', 'warning');
    return;
  }

  // ===== XỬ LÝ ẢNH BÌA TỰ ĐỘNG =====
  
  // Hàm helper: Extract ảnh đầu tiên từ HTML content
  const extractFirstImageFromContent = (htmlContent) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const img = doc.querySelector('img');
    return img ? img.src : null;
  };

  // Lấy ảnh đầu tiên từ content
  const firstImageInContent = extractFirstImageFromContent(formData.content);
  
  // Xác định ảnh bìa: Ưu tiên ảnh upload, không thì lấy ảnh từ content
  let finalCoverImage = coverImage || tempImageUrl || formData.image_url;
  
  // Nếu không có ảnh upload nhưng có ảnh trong content → dùng ảnh đó
  if (!finalCoverImage && firstImageInContent) {
    finalCoverImage = firstImageInContent;
    // Cập nhật state để hiển thị preview
    setCoverImage(firstImageInContent);
    setFormData(prev => ({ ...prev, image_url: firstImageInContent }));
  }
  
  // ===== VALIDATION ẢNH BÌA =====
  // Nếu vẫn không có ảnh bìa → hiện cảnh báo
  if (!finalCoverImage) {
    showToast('⚠️ Bài viết chưa có ảnh bìa! Vui lòng thêm ảnh vào nội dung hoặc upload ảnh bìa.', 'error');
    return;
  }

  // ===== THÊM ẢNH VÀO CUỐI CONTENT =====
  let finalContent = formData.content;
  
  // Kiểm tra xem content đã có ảnh bìa này chưa
  const contentHasCoverImage = finalContent.includes(finalCoverImage);
  
  if (!contentHasCoverImage) {
    // Thêm ảnh vào CUỐI content (không phải đầu)
    const imageHtml = `<figure class="image image-style-side"><img src="${finalCoverImage}" alt="${formData.title}"></figure>`;
    finalContent = finalContent + imageHtml;
  }

  // ===== NẾU ADMIN GỬI PHÊ DUYỆT - HIỂN THỊ POPUP CHỌN CÁCH ĐĂNG =====
  // Admin luôn được hỏi: Đăng ngay hay gửi phê duyệt cho admin khác?
  if (user.role === 'admin' && !isDraft && !isAdminDirectPublish) {
    setShowAdminPublishChoice(true);
    document.body.classList.add('modal-open');
    return;
  }

  // Chỉ hiển thị popup confirm cho non-admin (và chưa được xác nhận)
  if (!isDraft && !isAdminDirectPublish && user.role !== 'admin' && !skipConfirm) {
    setPendingSubmitData({ isDraft: false, isAdminDirectPublish: false });
    setShowSubmitConfirm(true);
    return;
  }

  // ===== CHUẨN BỊ DATA GỬI LÊN SERVER =====
  try {
    const submitData = {
      title: formData.title,
      content: finalContent,  // ← Sử dụng content đã thêm ảnh
      category_id: formData.category_id,
      tags_json: formData.tags_json,
      source: formData.source,
      isDraft: isDraft,
      isAdminDirectPublish: isAdminDirectPublish
    };

    // // Admin publish trực tiếp
    // if (isAdminDirectPublish) {
    //   submitData.status = 'approved';
    //   submitData.isDraft = false;
    // }

    // ===== THÊM DỮ LIỆU THUỐC =====
    if (selectedCategoryType === 'thuoc') {
      submitData.name = formData.name || formData.title;
      submitData.composition = formData.composition;
      submitData.uses = formData.uses;
      submitData.side_effects = formData.side_effects;
      submitData.image_url = finalCoverImage;  // ← Lưu ảnh bìa vào DB
      submitData.manufacturer = formData.manufacturer;
      submitData.description = formData.description;
      submitData.excellent_review_percent = formData.excellent_review_percent || 0;
      submitData.average_review_percent = formData.average_review_percent || 0;
      submitData.poor_review_percent = formData.poor_review_percent || 0;
    }

    // ===== THÊM DỮ LIỆU BỆNH LÝ =====
    if (selectedCategoryType === 'benh_ly') {
      submitData.name = formData.title;
      submitData.symptoms = formData.symptoms;
      submitData.treatments = formData.treatments;
      submitData.description = formData.description;
      submitData.image_url = finalCoverImage;  // ← Lưu ảnh bìa vào DB (nếu cần)
    }

    console.log('Submitting data:', submitData);  // Debug

    // ===== GỬI REQUEST =====
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

    // ===== XỬ LÝ RESPONSE =====
    if (response.data.success) {
  // Nếu admin sửa bài viết của người khác → gửi thông báo
  if (user.role === 'admin' && modalType === 'edit' && selectedArticle.author_id !== user.id) {
    try {
      await axios.post(
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

// ============================================
// GHI CHÚ:
// ============================================
// 1. Tự động lấy ảnh đầu tiên từ content làm ảnh bìa
// 2. Nếu không có ảnh → bắt buộc upload ảnh bìa
// 3. Ảnh bìa được thêm vào CUỐI content
// 4. Ảnh bìa được lưu vào field image_url của Medicine/Disease
// ============================================

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

  /**
 * Xử lý EDIT bài viết - CÓ POPUP CẢNH BÁO CHO ADMIN
 */
const handleEditArticle = async (article) => {
  const isAuthor = article.author_id === user.id;
  const isAdmin = user.role === 'admin';
  const status = article.status;

  // ✅ ADMIN sửa bài đã duyệt → Hiện popup cảnh báo
  if (isAdmin && status === 'approved') {
    setEditingApprovedArticle(article);
    setShowAdminEditWarning(true);
    return;
  }

  // ADMIN: Edit trực tiếp các bài khác
  if (isAdmin) {
    openEditModal(article);
    return;
  }

  // STAFF/DOCTOR: Kiểm tra điều kiện
  if (isAuthor) {
    if (['draft', 'rejected', 'request_edit'].includes(status)) {
      openEditModal(article);
    } else if (status === 'approved') {
      showToast('Bài viết đã được phê duyệt. Vui lòng gửi yêu cầu chỉnh sửa.', 'warning');
    } else {
      showToast('Bạn không có quyền chỉnh sửa bài viết này', 'error');
    }
  } else {
    showToast('Bạn không có quyền chỉnh sửa bài viết này', 'error');
  }
};

/**
 * Xử lý lựa chọn của admin khi sửa bài đã duyệt
 */
const handleAdminEditChoice = async (choice) => {
  const article = editingApprovedArticle;
  
  if (choice === 'hide-first') {
    // Lựa chọn 1: Ẩn bài viết trước
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE_URL}/api/articles/${article.id}/hide`,
        { reason: 'Admin đang chỉnh sửa bài viết' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      showToast('Đã ẩn bài viết. Bạn có thể chỉnh sửa an toàn.', 'success');
      await fetchArticles();
      
      // Sau đó mở form edit
      setTimeout(() => {
        openEditModal(article);
      }, 500);
      
    } catch (error) {
      showToast('Lỗi khi ẩn bài viết: ' + (error.response?.data?.message || error.message), 'error');
    }
  } else if (choice === 'direct') {
    // Lựa chọn 2: Sửa trực tiếp
    openEditModal(article);
  }
  
  setShowAdminEditWarning(false);
  setEditingApprovedArticle(null);
};

/**
 * Xử lý YÊU CẦU CHỈNH SỬA (Staff/Doctor với bài approved)
 */
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
          fetchStats();
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

/**
 * Xử lý ĐỒNG Ý YÊU CẦU CHỈNH SỬA (Admin)
 */
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
          fetchStats();
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

/**
 * Xử lý từ chối yêu cầu chỉnh sửa (gửi API)
 */
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

/**
 * Xử lý YÊU CẦU VIẾT LẠI (Admin với bài hidden)
 */
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
          fetchStats();
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

/**
 * Xử lý PHÊ DUYỆT bài viết (Admin)
 */
const handleApproveArticle = async (articleId) => {
  showConfirm(
    'Phê duyệt bài viết',
    'Bạn có chắc chắn muốn phê duyệt bài viết này?',
    async () => {
      try {
        const response = await axios.post(
          `${API_BASE_URL}/api/articles/${articleId}/approve`,
          {},
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );

        if (response.data.success) {
          showToast('Đã phê duyệt bài viết', 'success');
          fetchArticles();
          fetchStats();
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

/**
 * Xử lý TỪ CHỐI bài viết (Admin)
 */
const handleRejectArticle = async (article) => {
  // Sử dụng popup có input lý do
  const reason = prompt(`Nhập lý do từ chối bài viết "${article.title}":`);
  
  if (!reason || !reason.trim()) {
    showToast('Vui lòng nhập lý do từ chối', 'warning');
    return;
  }

  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/articles/${article.id}/reject`,
      { reason: reason.trim() },
      { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
    );

    if (response.data.success) {
      showToast('Đã từ chối bài viết', 'success');
      fetchArticles();
      fetchStats();
    }
  } catch (error) {
    console.error('Lỗi khi từ chối:', error);
    showToast(
      error.response?.data?.message || 'Có lỗi xảy ra',
      'error'
    );
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

            {/* Bộ lọc Trạng thái - THÊM MỚI */}
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

            {/* THÊM: Số bài viết/trang */}
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
                              <span key={idx} className="article-mgmt-tag-badge">{tag}</span>
                            ))
                          ) : (
                            <span className="article-mgmt-text-muted">-</span>
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
                        <span className={`article-mgmt-status-badge ${getStatusClass(article.status)}`}>
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
                    {/* // ============================================
                    // GHI CHÚ LOGIC:
                    // ============================================
                    // 
                    // ADMIN:
                    // - Draft: Edit, Delete, Duplicate, History
                    // - Pending: Edit, Approve, Reject, Hide, Delete, Duplicate, History
                    // - Approved: Edit, Hide, Delete, Duplicate, History
                    // - Rejected: Edit, Approve, Delete, Duplicate, History
                    // - Hidden: Edit, Delete, Request Rewrite, Duplicate, History
                    // - Request Edit: Edit, Approve Edit, Reject Edit, Delete, Duplicate, History
                    //
                    // STAFF/DOCTOR:
                    // - Draft (của mình): Edit, Delete, Duplicate, History
                    // - Pending (của mình): Duplicate, History (chờ admin)
                    // - Approved (của mình): Request Edit, Duplicate, History
                    // - Rejected (của mình): Edit, Delete, Duplicate, History
                    // - Hidden (của mình): Không thấy
                    // - Request Edit (của mình): Edit, Duplicate, History (chờ admin approve)
                    //
                    // ============================================ */}
                    {/* Actions Column */}
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

                        {/* APPROVE EDIT REQUEST (Admin only - request_edit status) */}
                        {canShowButton('approve_edit', article, user) && (
                          <button
                            className="article-mgmt-btn-action article-mgmt-btn-approve-edit"
                            onClick={() => handleApproveEditRequest(article.id)}
                            title={getButtonTooltip('approve_edit', article)}
                          >
                            <FaCheckCircle />
                          </button>
                        )}

                        {/* REJECT EDIT REQUEST (Admin only - request_edit status) */}
                        {canShowButton('reject_edit', article, user) && (
                          <button
                            onClick={() => {
                              setArticleToReject(article);
                              setRejectReason('');
                              setShowRejectPopup(true);
                            }}
                            className="article-mgmt-btn-reject"
                            title="Từ chối yêu cầu chỉnh sửa"
                          >
                            <FaBan /> Từ chối
                          </button>
                        )}

                        {/* REQUEST EDIT BUTTON (Staff/Doctor - approved) */}
                        {canShowButton('request_edit', article, user) && (
                          <button
                            className="article-mgmt-btn-action article-mgmt-btn-request-edit"
                            onClick={() => handleRequestEdit(article)}
                            title={getButtonTooltip('request_edit', article)}
                          >
                            <FaRedo />
                          </button>
                        )}

                        {/* REQUEST REWRITE BUTTON (Admin - hidden) */}
                        {canShowButton('request_rewrite', article, user) && (
                          <button
                            className="article-mgmt-btn-action article-mgmt-btn-request-rewrite"
                            onClick={() => handleRequestRewrite(article)}
                            title={getButtonTooltip('request_rewrite', article)}
                          >
                            <FaPaperPlane />
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
                <button className="article-mgmt-btn-close-modal" onClick={closeModal}>
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

                  {/* BUTTONS - Di chuyển lên đây */}
                  <div className="article-mgmt-form-actions-sidebar">
                    <button
                      type="button"
                      className="article-mgmt-btn-submit article-mgmt-btn-primary btn-full"
                      onClick={(e) => handleSubmit(e, false)}
                    >
                      <FaPaperPlane /> Gửi phê duyệt
                    </button>
                    
                    <div className="article-mgmt-form-actions-row">
                      <button
                        type="button"
                        className="article-mgmt-btn-submit btn-secondary"
                        onClick={(e) => handleSubmit(e, true)}
                      >
                        <FaSave /> Lưu nháp
                      </button>
                      <button
                        type="button"
                        className="article-mgmt-btn-submit btn-cancel"
                        onClick={closeModal}
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

                  {/* HÀNG 2: Loại bài viết, Danh mục, Tags - chung 1 hàng, Tag dài hơn */}
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

                    {/* Tags - rộng hơn 2 mục kia (tỷ lệ 1:1:2) */}
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
                        <CKEditor
                          editor={DecoupledEditor}
                          data={formData.content}
                          onReady={(editor) => {
                            const toolbarContainer = document.querySelector('#toolbar-container');
                            if (toolbarContainer && editor.ui.view.toolbar.element) {
                              // ✅ XÓA SẠCH trước khi thêm mới
                              while (toolbarContainer.firstChild) {
                                toolbarContainer.removeChild(toolbarContainer.firstChild);
                              }
                              toolbarContainer.appendChild(editor.ui.view.toolbar.element);
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
                      </div>
                    </div>

                    {/* THÔNG TIN BỔ SUNG - THUỐC */}
                    {selectedCategoryType === 'thuoc' && (
                      <div className="article-mgmt-additional-fields medicine-fields">
                        <h3 className="article-mgmt-section-title">
                          <FaPills /> Thông tin thuốc
                        </h3>
                        
                        {/* Hàng 1: Tên thuốc + Nhà sản xuất */}
                        <div className="article-mgmt-form-row form-row-2">
                          <div className="article-mgmt-form-group">
                            <label className="article-mgmt-form-label required">Tên thuốc</label>
                            <input
                              type="text"
                              name="name"
                              value={formData.name}
                              onChange={handleFormChange}
                              placeholder="Tên thuốc..."
                              className="article-mgmt-form-input"
                              required
                            />
                          </div>

                          <div className="article-mgmt-form-group">
                            <label className="article-mgmt-form-label">Nhà sản xuất</label>
                            <input
                              type="text"
                              name="manufacturer"
                              value={formData.manufacturer}
                              onChange={handleFormChange}
                              placeholder="Nhà sản xuất..."
                              className="article-mgmt-form-input"
                            />
                          </div>
                        </div>

                        {/* Hàng 2: Thành phần + Công dụng */}
                        <div className="article-mgmt-form-row form-row-2">
                          <div className="article-mgmt-form-group">
                            <label className="article-mgmt-form-label">Thành phần</label>
                            <textarea
                              name="composition"
                              value={formData.composition}
                              onChange={handleFormChange}
                              placeholder="Thành phần thuốc..."
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
                              placeholder="Công dụng..."
                              className="article-mgmt-form-textarea"
                              rows="3"
                            />
                          </div>
                        </div>

                        {/* Hàng 3: Tác dụng phụ + Cách dùng */}
                        <div className="article-mgmt-form-row form-row-2">
                          <div className="article-mgmt-form-group">
                            <label className="article-mgmt-form-label">Tác dụng phụ</label>
                            <textarea
                              name="side_effects"
                              value={formData.side_effects}
                              onChange={handleFormChange}
                              placeholder="Tác dụng phụ..."
                              className="article-mgmt-form-textarea"
                              rows="3"
                            />
                          </div>

                          <div className="article-mgmt-form-group">
                            <label className="article-mgmt-form-label">Cách dùng</label>
                            <textarea
                              name="medicine_usage"
                              value={formData.medicine_usage}
                              onChange={handleFormChange}
                              placeholder="Cách sử dụng..."
                              className="article-mgmt-form-textarea"
                              rows="3"
                            />
                          </div>
                        </div>

                        {/* Hàng 4: % Đánh giá */}
                        <div className="article-mgmt-form-row form-row-3">
                          <div className="article-mgmt-form-group">
                            <label className="article-mgmt-form-label">% Xuất sắc</label>
                            <input
                              type="number"
                              name="excellent_review_percent"
                              value={formData.excellent_review_percent}
                              onChange={handleFormChange}
                              min="0"
                              max="100"
                              step="0.01"
                              className="article-mgmt-form-input"
                            />
                          </div>

                          <div className="article-mgmt-form-group">
                            <label className="article-mgmt-form-label">% Trung bình</label>
                            <input
                              type="number"
                              name="average_review_percent"
                              value={formData.average_review_percent}
                              onChange={handleFormChange}
                              min="0"
                              max="100"
                              step="0.01"
                              className="article-mgmt-form-input"
                            />
                          </div>

                          <div className="article-mgmt-form-group">
                            <label className="article-mgmt-form-label">% Kém</label>
                            <input
                              type="number"
                              name="poor_review_percent"
                              value={formData.poor_review_percent}
                              onChange={handleFormChange}
                              min="0"
                              max="100"
                              step="0.01"
                              className="article-mgmt-form-input"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* THÔNG TIN BỔ SUNG - BỆNH LÝ */}
                    {selectedCategoryType === 'benh_ly' && (
                      <div className="article-mgmt-additional-fields disease-fields">
                        <h3 className="article-mgmt-section-title">
                          <FaDisease /> Thông tin bệnh lý
                        </h3>
                        
                        {/* Hàng 1: Triệu chứng + Điều trị */}
                        <div className="article-mgmt-form-row form-row-2">
                          <div className="article-mgmt-form-group">
                            <label className="article-mgmt-form-label">Triệu chứng</label>
                            <textarea
                              name="symptoms"
                              value={formData.symptoms}
                              onChange={handleFormChange}
                              placeholder="Các triệu chứng điển hình..."
                              className="article-mgmt-form-textarea"
                              rows="4"
                            />
                          </div>

                          <div className="article-mgmt-form-group">
                            <label className="article-mgmt-form-label">Điều trị</label>
                            <textarea
                              name="treatments"
                              value={formData.treatments}
                              onChange={handleFormChange}
                              placeholder="Phương pháp điều trị..."
                              className="article-mgmt-form-textarea"
                              rows="4"
                            />
                          </div>
                        </div>

                        {/* Mô tả thêm */}
                        <div className="article-mgmt-form-group">
                          <label className="article-mgmt-form-label">Mô tả thêm</label>
                          <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleFormChange}
                            placeholder="Thông tin bổ sung..."
                            className="article-mgmt-form-textarea"
                            rows="3"
                          />
                        </div>
                      </div>
                    )}

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
                    className="article-mgmt-btn-submit article-mgmt-btn-hide-confirm"
                    disabled={hidingArticle || !hideReason.trim() || (articleToHide?.status !== 'hidden' && countdownSeconds > 0)}
                  >
                    {hidingArticle ? (
                      <>
                        <FaSpinner className="article-mgmt-spinner-icon" /> Đang xử lý...
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

        {/* ==================== POPUP CẢNH BÁO ADMIN SỬA BÀI ĐÃ DUYỆT ==================== */}
{showAdminEditWarning && (
        <div 
          className="article-mgmt-modal-overlay" 
          onClick={(e) => {
            // Không cho click outside để đóng popup
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
                className="btn btn-secondary"
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

      {/* ==================== POPUP XÁC NHẬN GỬI PHÊ DUYỆT ==================== */}
      {showSubmitConfirm && (
        <div 
          className="article-mgmt-modal-overlay" 
          onClick={(e) => {
            // Không cho click outside
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
                className="btn btn-secondary"
                onClick={() => {
                  setShowSubmitConfirm(false);
                  document.body.classList.remove('modal-open');
                }}
              >
                <FaTimes /> Hủy
              </button>
              <button 
                className="btn btn-primary"
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