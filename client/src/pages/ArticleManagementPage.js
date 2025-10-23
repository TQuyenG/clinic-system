// client/src/pages/ArticleManagementPage.js - OPTIMIZED VERSION
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
  FaInfoCircle
} from 'react-icons/fa';
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
  const [hideReason, setHideReason] = useState('');
  const [hidingArticle, setHidingArticle] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
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

  const [coverImage, setCoverImage] = useState(null); // URL ảnh bìa hiện tại
  const [uploadingCover, setUploadingCover] = useState(false); // Trạng thái đang upload ảnh bìa

  const [pagination, setPagination] = useState({});
  const [stats, setStats] = useState({});
  const [tagInput, setTagInput] = useState('');
  const [suggestedTags, setSuggestedTags] = useState([]);
  const [selectedCategoryType, setSelectedCategoryType] = useState('');

  // Toast notification system
  const [toasts, setToasts] = useState([]);

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

  // Confirm dialog
  const showConfirm = (title, message, onConfirm, confirmText = 'Xác nhận', type = 'warning', onCancelWithoutSave = null, cancelWithoutSaveText = 'Không lưu') => {
  setConfirmAction({
    title,
    message,
    onConfirm,
    confirmText,
    type,
    onCancelWithoutSave,
    cancelWithoutSaveText
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

  // Track unsaved changes
  useEffect(() => {
    if (showModal) {
      const hasData = formData.title || formData.content || formData.category_id;
      setHasUnsavedChanges(hasData);
    }
  }, [formData, showModal]);

  // Custom Upload Adapter cho CKEditor
class MyUploadAdapter {
  constructor(loader) {
    this.loader = loader;
  }

  upload() {
    return this.loader.file.then(file => new Promise((resolve, reject) => {
      if (!file) {
        console.error('DEBUG: No file selected for upload');
        return reject('Không có file được chọn');
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        console.error('DEBUG: Invalid file type', file.type);
        return reject('Chỉ hỗ trợ JPEG, PNG, GIF, WEBP');
      }

      if (file.size > 5 * 1024 * 1024) {
        console.error('DEBUG: File too large', file.size);
        return reject('File quá lớn, tối đa 5MB');
      }

      const formDataUpload = new FormData();
      //  SỬA: Thay 'upload' thành 'image' để khớp với backend
      formDataUpload.append('image', file);

      console.log('DEBUG: Uploading image to backend', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });

      //  SỬA: Đổi endpoint từ /api/upload/image sang /api/upload/image
      axios.post(`${API_BASE_URL}/api/upload/image`, formDataUpload, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data'
        }
      })
      .then(response => {
        console.log('DEBUG: Upload response:', response.data);
        //  SỬA: Backend trả về { success: true, url: "..." }
        if (response.data.success && response.data.url) {
          resolve({ default: response.data.url });
        } else {
          reject(response.data.message || 'Upload thất bại');
        }
      })
      .catch(error => {
        console.error('DEBUG: Upload error:', error.response?.data || error.message);
        reject(error.response?.data?.message || 'Lỗi server khi upload ảnh');
      });
    }));
  }

  abort() {
    console.log('DEBUG: Upload aborted');
  }
}

function MyCustomUploadAdapterPlugin(editor) {
  editor.plugins.get('FileRepository').createUploadAdapter = (loader) => {
    return new MyUploadAdapter(loader);
  };
}

// ============================================
// CKEDITOR CONFIG - DECOUPLED EDITOR
// ============================================
const editorConfig = {
  extraPlugins: [MyCustomUploadAdapterPlugin],
  
  toolbar: {
    items: [
      'heading', '|',
      'fontSize', 'fontFamily', 'fontColor', 'fontBackgroundColor', '|',
      'bold', 'italic', 'underline', 'strikethrough', '|',
      'alignment', '|',
      'numberedList', 'bulletedList', '|',
      'outdent', 'indent', '|',
      'link', 'imageUpload', 'insertTable', 'blockQuote', 'mediaEmbed', '|',
      'highlight', '|',
      'undo', 'redo'
    ],
    shouldNotGroupWhenFull: true
  },
  
  fontSize: {
    options: [9, 11, 13, 'default', 17, 19, 21, 24, 28, 32],
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
      'Verdana, Geneva, sans-serif',
      'Comic Sans MS, cursive'
    ],
    supportAllValues: true
  },
  
  fontColor: {
    columns: 6,
    documentColors: 12,
    colors: [
      {
        color: '#000000',
        label: 'Black'
      },
      {
        color: '#4d4d4d',
        label: 'Dim grey'
      },
      {
        color: '#999999',
        label: 'Grey'
      },
      {
        color: '#e6e6e6',
        label: 'Light grey'
      },
      {
        color: '#ffffff',
        label: 'White',
        hasBorder: true
      },
      {
        color: '#e74c3c',
        label: 'Red'
      },
      {
        color: '#e67e22',
        label: 'Orange'
      },
      {
        color: '#f39c12',
        label: 'Yellow'
      },
      {
        color: '#2ecc71',
        label: 'Light green'
      },
      {
        color: '#3498db',
        label: 'Blue'
      },
      {
        color: '#9b59b6',
        label: 'Purple'
      }
    ]
  },
  
  fontBackgroundColor: {
    columns: 6,
    documentColors: 12,
    colors: [
      {
        color: '#000000',
        label: 'Black'
      },
      {
        color: '#4d4d4d',
        label: 'Dim grey'
      },
      {
        color: '#999999',
        label: 'Grey'
      },
      {
        color: '#e6e6e6',
        label: 'Light grey'
      },
      {
        color: '#ffffff',
        label: 'White',
        hasBorder: true
      },
      {
        color: '#e74c3c',
        label: 'Red'
      },
      {
        color: '#e67e22',
        label: 'Orange'
      },
      {
        color: '#f39c12',
        label: 'Yellow'
      },
      {
        color: '#2ecc71',
        label: 'Light green'
      },
      {
        color: '#3498db',
        label: 'Blue'
      },
      {
        color: '#9b59b6',
        label: 'Purple'
      }
    ]
  },
  
  alignment: {
    options: ['left', 'center', 'right', 'justify']
  },
  
  highlight: {
    options: [
      {
        model: 'yellowMarker',
        class: 'marker-yellow',
        title: 'Yellow marker',
        color: 'var(--ck-highlight-marker-yellow)',
        type: 'marker'
      },
      {
        model: 'greenMarker',
        class: 'marker-green',
        title: 'Green marker',
        color: 'var(--ck-highlight-marker-green)',
        type: 'marker'
      },
      {
        model: 'pinkMarker',
        class: 'marker-pink',
        title: 'Pink marker',
        color: 'var(--ck-highlight-marker-pink)',
        type: 'marker'
      },
      {
        model: 'blueMarker',
        class: 'marker-blue',
        title: 'Blue marker',
        color: 'var(--ck-highlight-marker-blue)',
        type: 'marker'
      }
    ]
  },
  
  image: {
    toolbar: [
      'imageTextAlternative', '|',
      'imageStyle:inline',
      'imageStyle:block',
      'imageStyle:side', '|',
      'toggleImageCaption'
    ],
    styles: [
      'inline',
      'block',
      'side'
    ]
  },
  
  table: {
    contentToolbar: [
      'tableColumn',
      'tableRow',
      'mergeTableCells',
      'tableCellProperties',
      'tableProperties'
    ]
  },
  
  heading: {
    options: [
      { model: 'paragraph', title: 'Paragraph', class: 'ck-heading_paragraph' },
      { model: 'heading1', view: 'h1', title: 'Heading 1', class: 'ck-heading_heading1' },
      { model: 'heading2', view: 'h2', title: 'Heading 2', class: 'ck-heading_heading2' },
      { model: 'heading3', view: 'h3', title: 'Heading 3', class: 'ck-heading_heading3' },
      { model: 'heading4', view: 'h4', title: 'Heading 4', class: 'ck-heading_heading4' }
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
      showToast('Lỗi tải danh mục', 'error');
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

    // Phân quyền xem bài viết
    if (user.role === 'admin') {
      // Admin: Thấy tất cả bài viết TRỪKHI là tab draft thì chỉ thấy draft của mình
      if (activeTab === 'draft') {
        queryFilters.author_id = user.id; // Chỉ lấy draft của chính admin
      } else {
        queryFilters.exclude_drafts_of_others = true; // Loại bỏ draft của người khác trong tab 'all'
      }
    } else {
      queryFilters.author_id = user.id; // Tác giả chỉ thấy bài của mình
    }

    const params = new URLSearchParams(
      Object.entries(queryFilters).filter(([_, v]) => v !== '')
    ).toString();

    console.log(`DEBUG: Fetching articles with params: ${params}`); // Debug query params

    const response = await axios.get(`${API_BASE_URL}/api/articles?${params}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.data.success) {
      console.log(`DEBUG: Received ${response.data.articles.length} articles`, response.data.articles); // Debug response
      setArticles(response.data.articles || []);
      setPagination(response.data.pagination || {});
      setStats(response.data.stats || {});
    } else {
      console.error('DEBUG: API returned success: false', response.data);
      showToast('Lỗi tải danh sách bài viết', 'error');
    }
  } catch (error) {
    console.error('Error fetching articles:', error);
    showToast('Lỗi tải danh sách bài viết', 'error');
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

  const handleUnhideArticle = async (articleId) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.post(
      `${API_BASE_URL}/api/articles/${articleId}/unhide`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (response.data.success) {
      showToast('Đã hiện bài viết thành công', 'success');
      fetchArticles();
    } else {
      showToast('Lỗi khi hiện bài viết', 'error');
    }
  } catch (error) {
    console.error('Error unhiding article:', error);
    showToast('Lỗi khi hiện bài viết', 'error');
  }
};

  const handleHideArticle = async (e) => {
  e.preventDefault();
  if (!hideReason.trim()) return;

  try {
    setHidingArticle(true);
    const token = localStorage.getItem('token');
    const response = await axios.post(
      `${API_BASE_URL}/api/articles/${articleToHide.id}/hide`,
      { reason: hideReason },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (response.data.success) {
      showToast('Đã ẩn bài viết thành công', 'success');
      fetchArticles();
      setShowHidePopup(false);
      setArticleToHide(null);
      setHideReason('');
    } else {
      showToast('Lỗi khi ẩn bài viết', 'error');
    }
  } catch (error) {
    console.error('Error hiding article:', error);
    showToast('Lỗi khi ẩn bài viết', 'error');
  } finally {
    setHidingArticle(false);
  }
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
      
      // ✅ Set cover image
      setCoverImage(getFirstImageFromContent(art.content));
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
    
    // ✅ Reset cover image
    setCoverImage(null);
  }
  setHasUnsavedChanges(false);
};

  const closeModal = () => {
  if (hasUnsavedChanges) {
    showConfirm(
      'Xác nhận đóng',
      'Bạn có thay đổi chưa lưu. Bạn có muốn lưu nháp trước khi đóng?',
      async () => {
        await handleSubmit(null, true);
      },
      'Lưu nháp',
      'warning',
      () => {
        setShowModal(false);
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
        setTagInput('');
        setHasUnsavedChanges(false);
        setCoverImage(null); // ✅ Reset cover image
      }
    );
  } else {
    setShowModal(false);
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
    setTagInput('');
    setHasUnsavedChanges(false);
    setCoverImage(null); // ✅ Reset cover image
  }
};

  const resetForm = () => {
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
    setHasUnsavedChanges(false);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleContentChange = (event, editor) => {
    const data = editor.getData();
    setFormData(prev => ({ ...prev, content: data }));
  };

  // Hàm lấy ảnh đầu tiên từ content HTML
const getFirstImageFromContent = (htmlContent) => {
  if (!htmlContent) return null;
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const img = doc.querySelector('img');
  return img ? img.src : null;
};

// Tự động cập nhật cover image khi content thay đổi
useEffect(() => {
  const firstImg = getFirstImageFromContent(formData.content);
  if (firstImg && !coverImage) {
    setCoverImage(firstImg);
  }
}, [formData.content]);

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

  const handleSubmit = async (e, isDraft = false) => {
  if (e && typeof e.preventDefault === 'function') {
  e.preventDefault();
}
  console.log('DEBUG: handleSubmit - isDraft:', isDraft, 'formData:', formData); // Debug giá trị isDraft và formData

  if (!formData.title || !formData.content || !formData.category_id) {
    showToast('Vui lòng điền đầy đủ tiêu đề, nội dung và danh mục', 'error');
    return;
  }

  const token = localStorage.getItem('token');
  const payload = {
    ...formData,
    tags_json: formData.tags_json,
    isDraft // Đảm bảo gửi isDraft
  };

  try {
    let response;
    if (modalType === 'create') {
      response = await axios.post(`${API_BASE_URL}/api/articles`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } else if (modalType === 'edit' && selectedArticle) {
      response = await axios.put(`${API_BASE_URL}/api/articles/${selectedArticle.id}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
    }

    if (response.data.success) {
      showToast(isDraft ? 'Lưu nháp thành công' : 'Gửi phê duyệt thành công', 'success');
      setShowModal(false);
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
      setTagInput('');
      setHasUnsavedChanges(false);
      fetchArticles();
    }
  } catch (error) {
    console.error('Error submitting article:', error);
    showToast(error.response?.data?.message || 'Lỗi khi gửi bài viết', 'error');
  }
};

  const handleDeleteArticle = async (article) => {
    if (user.role !== 'admin' && article.status !== 'draft') {
      showToast('Bạn chỉ có thể xóa bài viết ở trạng thái nháp', 'error');
      return;
    }

    if (user.role !== 'admin' && article.author_id !== user.id) {
      showToast('Bạn không có quyền xóa bài viết này', 'error');
      return;
    }

    showConfirm(
      'Xác nhận xóa',
      `Bạn có chắc chắn muốn xóa bài viết "${article.title}" không? Hành động này không thể hoàn tác.`,
      async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await axios.delete(`${API_BASE_URL}/api/articles/${article.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (response.data.success) {
            showToast('Đã xóa bài viết thành công', 'success');
            fetchArticles();
          }
        } catch (error) {
          console.error('Error deleting article:', error);
          showToast('Lỗi: ' + (error.response?.data?.message || error.message), 'error');
        }
      },
      'Xóa',
      'danger'
    );
  };

  const handleDuplicateArticle = async (article) => {
    showConfirm(
      'Xác nhận nhân bản',
      `Bạn có muốn tạo bản sao của bài viết "${article.title}" không?`,
      async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await axios.post(
            `${API_BASE_URL}/api/articles/${article.id}/duplicate`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (response.data.success) {
            showToast('Đã nhân bản bài viết thành công', 'success');
            fetchArticles();
          }
        } catch (error) {
          console.error('Error duplicating article:', error);
          showToast('Lỗi: ' + (error.response?.data?.message || error.message), 'error');
        }
      },
      'Nhân bản',
      'info'
    );
  };

  const handleRequestEdit = async (article) => {
    const reason = prompt('Nhập lý do yêu cầu chỉnh sửa (max 500 ký tự):');
    if (!reason) return;

    showConfirm(
      'Gửi yêu cầu chỉnh sửa',
      'Bạn có chắc chắn muốn gửi yêu cầu chỉnh sửa đến admin không?',
      async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await axios.post(
            `${API_BASE_URL}/api/articles/${article.id}/request-edit`,
            { reason: reason.substring(0, 500) },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (response.data.success) {
            showToast('Đã gửi yêu cầu chỉnh sửa thành công', 'success');
            fetchArticles();
          }
        } catch (error) {
          console.error('Error requesting edit:', error);
          showToast('Lỗi: ' + (error.response?.data?.message || error.message), 'error');
        }
      },
      'Gửi yêu cầu',
      'warning'
    );
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      showToast(`File quá lớn! Vui lòng chọn file nhỏ hơn ${MAX_FILE_SIZE / 1024 / 1024}MB`, 'error');
      e.target.value = '';
      return;
    }

    try {
      if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setFormData(prev => ({ ...prev, content: result.value }));
        showToast('Đã import nội dung từ Word', 'success');
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const html = XLSX.utils.sheet_to_html(worksheet);
        setFormData(prev => ({ ...prev, content: html }));
        showToast('Đã import bảng từ Excel', 'success');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      showToast('Lỗi khi xử lý file. Vui lòng thử lại.', 'error');
    }
  };

  // Upload ảnh bìa
const handleCoverImageUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // Validate file
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    showToast('Chỉ hỗ trợ ảnh JPEG, PNG, GIF, WEBP', 'error');
    e.target.value = '';
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    showToast('Ảnh quá lớn! Tối đa 5MB', 'error');
    e.target.value = '';
    return;
  }

  try {
    setUploadingCover(true);
    const formDataUpload = new FormData();
    formDataUpload.append('image', file);

    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_BASE_URL}/api/upload/image`, formDataUpload, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    });

    if (response.data.success && response.data.url) {
      const imageUrl = response.data.url;
      
      // Cập nhật cover image
      setCoverImage(imageUrl);
      
      // Thêm ảnh vào cuối body text
      const imgHtml = `<figure class="image"><img src="${imageUrl}" alt="Cover Image"></figure>`;
      setFormData(prev => ({
        ...prev,
        content: prev.content + imgHtml
      }));
      
      showToast('Upload ảnh bìa thành công!', 'success');
    } else {
      showToast('Upload thất bại', 'error');
    }
  } catch (error) {
    console.error('Error uploading cover image:', error);
    showToast('Lỗi khi upload ảnh bìa', 'error');
  } finally {
    setUploadingCover(false);
    e.target.value = ''; // Reset input
  }
};

// Xóa ảnh bìa
const handleRemoveCoverImage = () => {
  setCoverImage(null);
};

  const getArticleLink = (article) => {
    const typeMap = {
      'tin_tuc': 'tin-tuc',
      'thuoc': 'thuoc',
      'benh_ly': 'benh-ly'
    };

    const categoryType = typeMap[article.category?.category_type] || 'tin-tuc';

    if (article.status === 'draft') {
      return null;
    }

    if (['pending', 'request_edit', 'hidden', 'request_rewrite'].includes(article.status)) {
      return `/phe-duyet-bai-viet/${article.id}`;
    }

    if (article.status === 'approved') {
      return `/${categoryType}/${article.slug}`;
    }

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

  const renderActions = (article) => {
    const isAuthor = article.author_id === user.id;
    const isAdmin = user.role === 'admin';

    return (
      <div className="article-mgmt-actions-cell">
        {/* NÚT XEM CHI TIẾT - Hiện với mọi bài viết trừ draft */}
        {article.status !== 'draft' && (
          <button
            className="article-mgmt-btn-action view"
            onClick={() => navigate(`/phe-duyet-bai-viet/${article.id}`)}
            title="Xem chi tiết"
          >
            <FaInfoCircle />
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

        {/* NÚT YÊU CẦU CHỈNH SỬA */}
        {isAuthor && !isAdmin && article.status === 'approved' && (
          <button
            className="article-mgmt-btn-action request"
            onClick={() => handleRequestEdit(article)}
            title="Yêu cầu chỉnh sửa"
          >
            <FaRedo />
          </button>
        )}

        {/* NÚT ẨN/HIỆN */}
        {isAdmin && article.status === 'approved' && (
        <button
          className="article-mgmt-btn-action visibility"
          onClick={() => {
            setArticleToHide(article);
            setShowHidePopup(true);
          }}
          title="Ẩn bài viết"
        >
          <FaEyeSlash />
        </button>
      )}
      {isAdmin && article.status === 'hidden' && (
        <button
          className="article-mgmt-btn-action visibility success"
          onClick={() => showConfirm(
            'Xác nhận hiện bài viết',
            'Bạn có chắc muốn hiện bài viết này?',
            () => handleUnhideArticle(article.id),
            'Hiện bài viết',
            'success'
          )}
          title="Hiện bài viết"
        >
          <FaEye />
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
          onClick={() => handleDuplicateArticle(article)}
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
                  
                  {activeTab === 'medicine' && (
                    <>
                      <th>Thành phần</th>
                      <th>Công dụng</th>
                      <th>Nhà SX</th>
                    </>
                  )}
                  
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
                  {/* ✅ THÊM PHẦN UPLOAD ẢNH BÌA */}
    <div className="article-mgmt-cover-image-section">
      <label className="article-mgmt-form-label">
        <FaFileAlt /> Ảnh bìa
      </label>
      
      <div className="article-mgmt-cover-preview-container">
        {coverImage ? (
          <div className="article-mgmt-cover-preview">
            <img src={coverImage} alt="Cover" />
            <div className="article-mgmt-cover-overlay">
              <label htmlFor="cover-upload" className="article-mgmt-btn-cover-change">
                <FaEdit /> Đổi ảnh
              </label>
              <button 
                type="button" 
                onClick={handleRemoveCoverImage}
                className="article-mgmt-btn-cover-remove"
              >
                <FaTimes /> Xóa
              </button>
            </div>
          </div>
        ) : (
          <div className="article-mgmt-cover-placeholder">
            <FaFileAlt className="placeholder-icon" />
            <p>Chưa có ảnh bìa</p>
            <label htmlFor="cover-upload" className="article-mgmt-btn-cover-upload">
              <FaPlus /> Upload ảnh bìa
            </label>
          </div>
        )}
        
        <input
          id="cover-upload"
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={handleCoverImageUpload}
          style={{ display: 'none' }}
          disabled={uploadingCover}
        />
        
        {uploadingCover && (
          <div className="article-mgmt-cover-uploading">
            <FaSpinner className="spinner" /> Đang upload...
          </div>
        )}
      </div>
      
      <small className="article-mgmt-form-hint">
        Ảnh sẽ tự động lấy từ ảnh đầu tiên trong nội dung. Hoặc upload ảnh mới (JPEG, PNG, GIF, WEBP - Max 5MB)
      </small>
    </div>

                  <div className="article-mgmt-form-row">
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
                  </div>

                  {selectedCategoryType === 'thuoc' && (
                    <div className="article-mgmt-medical-fields">
                      <h4>Thông tin thuốc</h4>
                      <div className="article-mgmt-form-row">
                        <div className="article-mgmt-form-group">
                          <label className="article-mgmt-form-label">Thành phần</label>
                          <textarea
                            name="composition"
                            value={formData.composition}
                            onChange={handleFormChange}
                            className="article-mgmt-form-textarea"
                            rows="2"
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
                      </div>
                      <div className="article-mgmt-form-row">
                        <div className="article-mgmt-form-group">
                          <label className="article-mgmt-form-label">Công dụng</label>
                          <textarea
                            name="uses"
                            value={formData.uses}
                            onChange={handleFormChange}
                            className="article-mgmt-form-textarea"
                            rows="2"
                          />
                        </div>
                        <div className="article-mgmt-form-group">
                          <label className="article-mgmt-form-label">Tác dụng phụ</label>
                          <textarea
                            name="side_effects"
                            value={formData.side_effects}
                            onChange={handleFormChange}
                            className="article-mgmt-form-textarea"
                            rows="2"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedCategoryType === 'benh_ly' && (
                    <div className="article-mgmt-medical-fields">
                      <h4>Thông tin bệnh lý</h4>
                      <div className="article-mgmt-form-row">
                        <div className="article-mgmt-form-group">
                          <label className="article-mgmt-form-label">Triệu chứng</label>
                          <textarea
                            name="symptoms"
                            value={formData.symptoms}
                            onChange={handleFormChange}
                            className="article-mgmt-form-textarea"
                            rows="2"
                          />
                        </div>
                        <div className="article-mgmt-form-group">
                          <label className="article-mgmt-form-label">Điều trị</label>
                          <textarea
                            name="treatments"
                            value={formData.treatments}
                            onChange={handleFormChange}
                            className="article-mgmt-form-textarea"
                            rows="2"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="article-mgmt-form-group">
  <label className="article-mgmt-form-label">
    <FaFileAlt /> Nội dung *
  </label>
  
  {/* ✅ TOOLBAR CONTAINER - Phải đặt TRƯỚC CKEditor */}
  <div id="toolbar-container" className="ckeditor-toolbar-container"></div>
  
  {/* ✅ CKEDITOR - Decoupled Editor */}
  <CKEditor
    editor={DecoupledEditor}
    config={editorConfig}
    data={formData.content}
    onReady={editor => {
      // Mount toolbar vào container
      const toolbarContainer = document.querySelector('#toolbar-container');
      if (toolbarContainer && editor.ui.view.toolbar.element) {
        toolbarContainer.innerHTML = ''; // Clear cũ (nếu có)
        toolbarContainer.appendChild(editor.ui.view.toolbar.element);
      }
    }}
    onChange={handleContentChange}
  />
</div>

                  <div className="article-mgmt-form-row">
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
                      <label className="article-mgmt-form-label" style={{marginTop: '1rem'}}>Import từ file</label>
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
                  </div>

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

        {/* Confirm Dialog */}
        {showConfirmDialog && confirmAction && (
          <div className="article-mgmt-confirm-overlay" onClick={closeConfirm}>
            <div className={`article-mgmt-confirm-dialog ${confirmAction.type}`} onClick={(e) => e.stopPropagation()}>
              <div className="article-mgmt-confirm-icon">
                {confirmAction.type === 'danger' && <FaExclamationTriangle />}
                {confirmAction.type === 'warning' && <FaExclamationTriangle />}
                {confirmAction.type === 'info' && <FaInfoCircle />}
              </div>
              <h3 className="article-mgmt-confirm-title">{confirmAction.title}</h3>
              <p className="article-mgmt-confirm-message">{confirmAction.message}</p>
              <div className="article-mgmt-confirm-actions">
              <button
                className={`article-mgmt-btn article-mgmt-btn-${confirmAction.type === 'danger' ? 'danger' : confirmAction.type === 'warning' ? 'warning' : 'primary'}`}
                onClick={handleConfirm}
              >
                {confirmAction.confirmText}
              </button>
              {confirmAction.onCancelWithoutSave && (
                <button
                  className="article-mgmt-btn article-mgmt-btn-danger"
                  onClick={() => {
                    confirmAction.onCancelWithoutSave();
                    closeConfirm();
                  }}
                >
                  {confirmAction.cancelWithoutSaveText}
                </button>
              )}
              <button
                className="article-mgmt-btn article-mgmt-btn-cancel"
                onClick={closeConfirm}
              >
                Quay lại
              </button>
            </div>
            </div>
          </div>
        )}

        {/* Toast Notifications */}
        <div className="article-mgmt-toast-container">
          {toasts.map(toast => (
            <div key={toast.id} className={`article-mgmt-toast ${toast.type}`}>
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

        {/* Popup ẩn bài viết */}
        {showHidePopup && articleToHide && (
        <div className="popup-overlay" onClick={() => setShowHidePopup(false)}>
          <div className="popup" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <div className="popup-header-content">
                <FaEyeSlash className="popup-icon" />
                <h3>Ẩn bài viết</h3>
              </div>
              <button onClick={() => setShowHidePopup(false)} className="btn-close-popup">
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleHideArticle} className="popup-body">
              <div className="popup-warning">
                <FaExclamationTriangle />
                <div>
                  <p className="warning-title">Lưu ý quan trọng</p>
                  <p className="warning-text">
                    Bài viết sẽ bị ẩn khỏi danh sách công khai. Chỉ admin và tác giả có thể xem.
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
                  Lý do chi tiết <span className="required">*</span>
                </label>
                <textarea
                  value={hideReason}
                  onChange={(e) => setHideReason(e.target.value)}
                  placeholder="Nhập lý do ẩn bài viết (tối đa 500 ký tự)..."
                  maxLength={500}
                  rows={5}
                  className="popup-textarea"
                  required
                />
                <small className="char-count">{hideReason.length}/500 ký tự</small>
              </div>
              <div className="popup-footer">
                <button
                  type="button"
                  onClick={() => setShowHidePopup(false)}
                  className="btn-cancel"
                  disabled={hidingArticle}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-submit btn-hide-confirm"
                  disabled={hidingArticle || !hideReason.trim()}
                >
                  {hidingArticle ? (
                    <>
                      <FaSpinner className="spinner-icon" /> Đang xử lý...
                    </>
                  ) : (
                    <>
                      <FaEyeSlash /> Xác nhận ẩn
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default ArticleManagementPage;