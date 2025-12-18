// client/src/pages/ForumPage.js
import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import api from '../services/api';
import forumService from '../services/forumService';
import { FORUM_QUESTION_ROUTE } from '../utils/constants';
import CustomAlert from '../components/CustomAlert'; // ✅ Import CustomAlert
import ForumBanner from '../components/ForumBanner';
import './ForumPage.css';
import {
  FaSearch,
  FaQuestionCircle,
  FaEye,
  FaTags,
  FaStar,
  FaComments,
  FaArrowUp,
  FaArrowDown,
  FaExclamationTriangle, // ✅ Thêm icon báo cáo
  FaTimes, // ✅ Thêm icon đóng modal
  FaBookmark, // ✅ Icon lưu
  FaHeart, // ✅ Icon thích
  FaRegBookmark, // ✅ Icon lưu (outline)
  FaRegHeart // ✅ Icon thích (outline)
} from 'react-icons/fa';

const ForumPage = () => {
  const authContext = useContext(AuthContext);
  const storedUser = (() => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.warn('Không thể parse user từ localStorage:', err);
      return null;
    }
  })();
  const user = authContext?.user || storedUser;
  const navigate = useNavigate();
  
  const [questions, setQuestions] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [topics, setTopics] = useState([]); // ✅ Thêm state topics
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [selectedTopic, setSelectedTopic] = useState(''); // ✅ Thêm filter topic
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showAskModal, setShowAskModal] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [tagSearchTerm, setTagSearchTerm] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState('');
  
  // ✅ Report modal states
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportTarget, setReportTarget] = useState({ type: '', id: null, title: '' });
  const [reportForm, setReportForm] = useState({ reason: '', description: '' });
  
  // ✅ CustomAlert state
  const [alert, setAlert] = useState({
    show: false,
    type: 'info',
    title: '',
    message: ''
  });
  
  // Form state
  const defaultQuestionForm = {
    title: '',
    content: '',
    topicId: '', // ✅ Chủ đề - BẮT BUỘC
    specialtyIds: [], // ✅ Chuyên khoa - Chọn nhiều, không bắt buộc
    tags: '',
    tagList: [],
    isAnonymous: false,
    images: [],
    attachments: [], // ✅ Files đính kèm - tối đa 5
  };
  const [questionForm, setQuestionForm] = useState(defaultQuestionForm);
  const [previewFiles, setPreviewFiles] = useState([]); // ✅ Preview files
  const fallbackTags = useMemo(
    () => [
      'Tổng quan',
      'Nội khoa',
      'Ngoại khoa',
      'Tim mạch',
      'Tiêu hoá',
      'Da liễu',
      'Nhi khoa',
      'Sản phụ khoa',
      'Thần kinh',
      'Dinh dưỡng',
      'Sức khỏe tinh thần',
      'Phòng bệnh',
      'Thuốc',
      'Xét nghiệm',
    ],
    []
  );

  const specialtyTagMap = useMemo(
    () => ({
      'Nội khoa': ['Nội khoa', 'Điều trị nội trú', 'Cao huyết áp', 'Đái tháo đường', 'Chăm sóc tổng quát'],
      'Ngoại khoa': ['Ngoại khoa', 'Phẫu thuật', 'Hậu phẫu', 'Chấn thương', 'Nội soi'],
      'Tim mạch': ['Tim mạch', 'Cao huyết áp', 'Nhồi máu cơ tim', 'Loạn nhịp', 'Thay van tim'],
      'Tiêu hoá': ['Tiêu hoá', 'Dạ dày', 'Gan mật', 'Đại tràng', 'Hội chứng ruột kích thích'],
      'Da liễu': ['Da liễu', 'Mụn', 'Viêm da', 'Thẩm mỹ da', 'Chăm sóc da'],
      'Nhi khoa': ['Nhi khoa', 'Tiêm chủng', 'Sốt ở trẻ', 'Dinh dưỡng trẻ', 'Phát triển trẻ nhỏ'],
      'Sản phụ khoa': ['Sản phụ khoa', 'Thai kỳ', 'Tiền sản', 'Kế hoạch gia đình', 'Phụ khoa'],
      'Thần kinh': ['Thần kinh', 'Đột quỵ', 'Đau đầu', 'Mất ngủ', 'Rối loạn thần kinh'],
      'Dinh dưỡng': ['Dinh dưỡng', 'Chế độ ăn', 'Thực đơn lành mạnh', 'Giảm cân', 'Tăng cân'],
      'Sức khỏe tinh thần': ['Sức khỏe tinh thần', 'Lo âu', 'Stress', 'Trầm cảm', 'Tư vấn tâm lý'],
      'Phòng bệnh': ['Phòng bệnh', 'Tiêm phòng', 'Khám định kỳ', 'Tư vấn sức khỏe', 'Dự phòng bệnh'],
      'Xét nghiệm': ['Xét nghiệm', 'Xét nghiệm máu', 'Xét nghiệm nước tiểu', 'Chẩn đoán hình ảnh', 'Theo dõi điều trị'],
    }),
    []
  );

  const [availableTags, setAvailableTags] = useState(fallbackTags);
  const [formTags, setFormTags] = useState(fallbackTags);
  const [uploading, setUploading] = useState(false);
  const [previewImages, setPreviewImages] = useState([]);
  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }
    const body = document.body;
    const html = document.documentElement;
    const originalOverflow = body.style.overflow;

    if (showAskModal) {
      body.style.overflow = 'hidden';
      body.classList.add('forum-modal-open');
      if (html) {
        html.classList.add('forum-modal-open');
      }
    } else {
      body.style.overflow = originalOverflow;
      body.classList.remove('forum-modal-open');
      if (html) {
        html.classList.remove('forum-modal-open');
      }
    }

    return () => {
      body.style.overflow = originalOverflow;
      body.classList.remove('forum-modal-open');
      if (html) {
        html.classList.remove('forum-modal-open');
      }
    };
  }, [showAskModal]);
  const selectedSpecialtyName = useMemo(() => {
    if (!selectedSpecialty) return '';
    const specialty = specialties.find(
      (item) => String(item.id) === String(selectedSpecialty)
    );
    return specialty ? specialty.name : '';
  }, [selectedSpecialty, specialties]);

  const fetchQuestions = useCallback(async ({
    page,
    specialty,
    search,
    tags
  } = {}) => {
    const targetPage = page ?? currentPage;
    const targetSpecialty = specialty ?? selectedSpecialty;
    const targetSearch = search ?? activeSearchTerm;
    const targetTags = Array.isArray(tags) ? tags : selectedTags;

    setLoading(true);
    try {
      const payload = await forumService.getPublicQuestions({
        page: targetPage,
        limit: 10,
        search: targetSearch,
        specialty: targetSpecialty,
        tags: targetTags,
      });

      if (payload.success) {
        const fetchedQuestions = payload.data?.questions || [];
        setQuestions(fetchedQuestions);
        const pagination = payload.data?.pagination || {};
        setTotalPages(pagination.totalPages || 1);
        if (typeof pagination.page === 'number' && pagination.page !== targetPage) {
          setCurrentPage(pagination.page);
        }
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, activeSearchTerm, selectedSpecialty, selectedTags]);

  const fetchSpecialties = useCallback(async () => {
    try {
      const response = await api.get('/specialties');
      if (response.data.success) {
        const fetched = response.data.specialties || [];
        setSpecialties(fetched);

        const derivedTags = fetched
          .map((spec) => specialtyTagMap[spec.name] || [])
          .flat()
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0);

        const uniqueTags = derivedTags.length > 0 ? Array.from(new Set(derivedTags)) : fallbackTags;
        setAvailableTags(uniqueTags);
        setFormTags(uniqueTags);
      }
    } catch (error) {
      console.error('Error fetching specialties:', error);
      setAvailableTags(fallbackTags);
      setFormTags(fallbackTags);
    }
  }, [fallbackTags, specialtyTagMap]);

  // ✅ Fetch topics
  const fetchTopics = useCallback(async () => {
    try {
      const response = await api.get('/forum/topics');
      if (response.data.success || response.data.data) {
        setTopics(response.data.data || response.data || []);
      }
    } catch (error) {
      console.error('Error fetching topics:', error);
    }
  }, []);

  // Load specialties and topics
  useEffect(() => {
    fetchSpecialties();
    fetchTopics();
  }, [fetchSpecialties, fetchTopics]);

  useEffect(() => {
    if (!questionForm.specialtyId) {
      setFormTags((prev) => (prev.length ? prev : fallbackTags));
      return;
    }

    const selected = specialties.find(
      (spec) => String(spec.id) === String(questionForm.specialtyId)
    );

    const tagsForSpecialty = selected ? specialtyTagMap[selected.name] : null;
    if (tagsForSpecialty && tagsForSpecialty.length > 0) {
      setFormTags(tagsForSpecialty);
      setQuestionForm((prev) => ({
        ...prev,
        tagList: prev.tagList.filter((tag) => tagsForSpecialty.includes(tag)),
      }));
    } else {
      setFormTags(fallbackTags);
    }
  }, [questionForm.specialtyId, specialties, specialtyTagMap, fallbackTags]);

  // Load questions
  useEffect(() => {
    fetchQuestions({
      page: currentPage,
      specialty: selectedSpecialty,
      search: activeSearchTerm,
      tags: selectedTags
    });
  }, [currentPage, selectedSpecialty, selectedTags, activeSearchTerm, fetchQuestions]);

  // Real-time updates from WebSocket (forum interactions)
  useEffect(() => {
    const handler = (e) => {
      const payload = e.detail || {};
      if (!payload || !payload.entity_type) return;

      if (payload.entity_type === 'question') {
        setQuestions((prev) =>
          prev.map((q) => {
            if (String(q.id) !== String(payload.entity_id)) return q;
            const updated = { ...q };
            if (typeof payload.likesCount === 'number') updated.likesCount = payload.likesCount;
            if (typeof payload.viewsCount === 'number') updated.viewsCount = payload.viewsCount;
            if (typeof payload.answersCount === 'number') updated.answerCount = payload.answersCount;
            return updated;
          })
        );

        // Note: Overview stats are now managed by ForumBanner component
        // No need to update local state
      }
    };

    window.addEventListener('forum:interaction', handler);
    return () => window.removeEventListener('forum:interaction', handler);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const keyword = searchTerm.trim();
    setCurrentPage(1);
    setActiveSearchTerm(keyword);
    fetchQuestions({ page: 1, search: keyword });
  };

  const filteredTagOptions = useMemo(() => {
    const keyword = tagSearchTerm.trim().toLowerCase();
    if (!keyword) {
      return availableTags;
    }
    return availableTags.filter((tag) =>
      tag.toLowerCase().includes(keyword)
    );
  }, [availableTags, tagSearchTerm]);

  const toggleFilterTag = (tag) => {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) {
        return prev.filter((item) => item !== tag);
      }
      return [...prev, tag];
    });
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedSpecialty('');
    setSelectedTopic(''); // ✅ Clear topic filter
    setSelectedTags([]);
    setTagSearchTerm('');
    setActiveSearchTerm('');
    setCurrentPage(1);
    fetchQuestions({
      page: 1,
      search: '',
      specialty: '',
      tags: []
    });
  };

  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
    setActiveSearchTerm('');
    setCurrentPage(1);
    fetchQuestions({
      page: 1,
      specialty: selectedSpecialty,
      search: '',
      tags: selectedTags,
    });
  }, [fetchQuestions, selectedSpecialty, selectedTags]);

  const handleClearSpecialty = useCallback(() => {
    setSelectedSpecialty('');
    setCurrentPage(1);
    fetchQuestions({
      page: 1,
      search: activeSearchTerm,
      specialty: '',
      tags: selectedTags,
    });
  }, [fetchQuestions, activeSearchTerm, selectedTags]);

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    if (previewImages.length + files.length > 5) {
      setAlert({
        show: true,
        type: 'warning',
        title: 'Giới hạn upload',
        message: 'Chỉ được upload tối đa 5 ảnh'
      });
      return;
    }

    setUploading(true);
    try {
      const uploadedUrls = [];

      for (const file of files) {
        const formData = new FormData();
        formData.append('image', file);

        const response = await api.post('/upload/image', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
        });

        if (response.data.success) {
          uploadedUrls.push(response.data.imageUrl);
        }
      }

      setPreviewImages([...previewImages, ...uploadedUrls]);
      setQuestionForm({
        ...questionForm,
        images: [...questionForm.images, ...uploadedUrls],
      });
    } catch (error) {
      console.error('Error uploading images:', error);
      setAlert({
        show: true,
        type: 'error',
        title: 'Lỗi upload',
        message: 'Có lỗi khi upload ảnh. Vui lòng thử lại!'
      });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index) => {
    const newImages = previewImages.filter((_, i) => i !== index);
    setPreviewImages(newImages);
    setQuestionForm({ ...questionForm, images: newImages });
  };

  const toggleTag = (tag) => {
    setQuestionForm((prev) => {
      const exists = prev.tagList.includes(tag);
      const newTags = exists
        ? prev.tagList.filter((t) => t !== tag)
        : [...prev.tagList, tag];
      return {
        ...prev,
        tagList: newTags,
        tags: newTags.join(', '),
      };
    });
  };

  // ✅ Toggle specialty (multi-select)
  const toggleSpecialty = (specialtyId) => {
    setQuestionForm((prev) => {
      const id = Number(specialtyId);
      const exists = prev.specialtyIds.includes(id);
      const newSpecialties = exists
        ? prev.specialtyIds.filter((s) => s !== id)
        : [...prev.specialtyIds, id];
      return {
        ...prev,
        specialtyIds: newSpecialties,
      };
    });
  };

  // ✅ Handle file upload (max 5 files) - Sử dụng lại API /upload/image
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    
    if (questionForm.attachments.length + files.length > 5) {
      setAlert({
        show: true,
        type: 'warning',
        title: 'Giới hạn files',
        message: 'Chỉ được upload tối đa 5 files!'
      });
      return;
    }

    try {
      setUploading(true);
      const uploadedUrls = [];
      const uploadedFileNames = [];

      for (const file of files) {
        const formData = new FormData();
        formData.append('image', file); // ✅ Dùng 'image' như route /upload/image yêu cầu
        
        const uploadRes = await api.post('/upload/image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        
        if (uploadRes.data.success && uploadRes.data.url) {
          uploadedUrls.push(uploadRes.data.url);
          uploadedFileNames.push(file.name);
        }
      }

      setQuestionForm(prev => ({
        ...prev,
        attachments: [...prev.attachments, ...uploadedUrls]
      }));
      setPreviewFiles(prev => [...prev, ...uploadedFileNames]);
    } catch (error) {
      console.error('Error uploading files:', error);
      setAlert({
        show: true,
        type: 'error',
        title: 'Lỗi upload',
        message: 'Không thể upload files. Vui lòng thử lại!'
      });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeFile = (index) => {
    const newAttachments = questionForm.attachments.filter((_, i) => i !== index);
    const newPreviewFiles = previewFiles.filter((_, i) => i !== index);
    setQuestionForm({ ...questionForm, attachments: newAttachments });
    setPreviewFiles(newPreviewFiles);
  };

  const handleAskQuestion = async (e) => {
    e.preventDefault();
    
    if (!user) {
      setAlert({
        show: true,
        type: 'warning',
        title: 'Yêu cầu đăng nhập',
        message: 'Vui lòng đăng nhập để đặt câu hỏi'
      });
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    // ✅ Validate topicId
    if (!questionForm.topicId) {
      setAlert({
        show: true,
        type: 'warning',
        title: 'Thiếu thông tin',
        message: 'Vui lòng chọn chủ đề (Topic) cho câu hỏi'
      });
      return;
    }

    try {
      const manualTags = questionForm.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag);
      const combinedTags = Array.from(
        new Set([...questionForm.tagList, ...manualTags])
      );

      const response = await api.post(
        '/forum/questions',
        {
          title: questionForm.title,
          content: questionForm.content,
          topicId: Number(questionForm.topicId), // ✅ Chủ đề - BẮT BUỘC
          specialtyIds: questionForm.specialtyIds, // ✅ Chuyên khoa - Array
          tags: combinedTags,
          isAnonymous: questionForm.isAnonymous,
          images: questionForm.images,
          attachments: questionForm.attachments, // ✅ Files đính kèm
        }
      );

      if (response.data.success) {
        const statusMsg = response.data.data?.status === 'pending' 
          ? 'Câu hỏi của bạn đã được gửi và đang chờ duyệt!'
          : 'Câu hỏi của bạn đã được đăng thành công!';
        setAlert({
          show: true,
          type: 'success',
          title: 'Thành công!',
          message: statusMsg
        });
        setShowAskModal(false);
        setQuestionForm(defaultQuestionForm);
        setPreviewImages([]);
        setPreviewFiles([]); // ✅ Reset files
        setCurrentPage(1);
        await fetchQuestions({ page: 1 });
      }
    } catch (error) {
      console.error('Error creating question:', error);
      setAlert({
        show: true,
        type: 'error',
        title: 'Lỗi',
        message: 'Có lỗi xảy ra khi gửi câu hỏi. Vui lòng thử lại!'
      });
    }
  };

  // ✅ Handle Report
  const handleOpenReport = (type, id, title) => {
    if (!user) {
      setAlert({
        show: true,
        type: 'warning',
        title: 'Yêu cầu đăng nhập',
        message: 'Bạn cần đăng nhập để báo cáo vi phạm'
      });
      setTimeout(() => navigate('/login'), 2000);
      return;
    }
    setReportTarget({ type, id, title });
    setReportForm({ reason: '', description: '' });
    setShowReportModal(true);
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    
    if (!reportForm.reason) {
      setAlert({
        show: true,
        type: 'warning',
        title: 'Thiếu thông tin',
        message: 'Vui lòng chọn lý do báo cáo'
      });
      return;
    }

    try {
      const response = await api.post('/forum/reports', {
        entityType: reportTarget.type,
        entityId: reportTarget.id,
        reason: reportForm.reason,
        description: reportForm.description
      });

      if (response.data.success) {
        setShowReportModal(false);
        setReportForm({ reason: '', description: '' });
        setAlert({
          show: true,
          type: 'success',
          title: 'Báo cáo thành công!',
          message: response.data.message || 'Báo cáo của bạn đã được gửi đến quản trị viên. Cảm ơn bạn đã góp phần giữ gìn cộng đồng lành mạnh!'
        });
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Có lỗi xảy ra khi gửi báo cáo';
      setAlert({
        show: true,
        type: 'error',
        title: 'Lỗi',
        message: errorMsg
      });
    }
  };

  // ✅ Handle Like Question
  const handleLikeQuestion = async (questionId, e) => {
    e.stopPropagation();
    
    if (!user) {
      setAlert({
        show: true,
        type: 'warning',
        title: 'Yêu cầu đăng nhập',
        message: 'Bạn cần đăng nhập để thích câu hỏi'
      });
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    try {
      const response = await api.post(`/forum/questions/${questionId}/like`);
      if (response.data.success) {
        // Cập nhật lại danh sách câu hỏi
        setQuestions(prev => prev.map(q => 
          q.id === questionId 
            ? { ...q, likesCount: response.data.data.likesCount, isLiked: response.data.data.liked }
            : q
        ));
        
        setAlert({
          show: true,
          type: 'success',
          title: response.data.data.liked ? 'Đã thích!' : 'Đã bỏ thích',
          message: response.data.data.liked ? 'Bạn đã thích câu hỏi này' : 'Đã bỏ thích câu hỏi'
        });
      }
    } catch (error) {
      setAlert({
        show: true,
        type: 'error',
        title: 'Lỗi',
        message: error.response?.data?.message || 'Không thể thực hiện'
      });
    }
  };

  // ✅ Handle Save Question
  const handleSaveQuestion = async (questionId, e) => {
    e.stopPropagation();
    
    if (!user) {
      setAlert({
        show: true,
        type: 'warning',
        title: 'Yêu cầu đăng nhập',
        message: 'Bạn cần đăng nhập để lưu câu hỏi'
      });
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    try {
      const response = await api.post(`/forum/questions/${questionId}/save`);
      if (response.data.success) {
        // Cập nhật lại danh sách câu hỏi
        setQuestions(prev => prev.map(q => 
          q.id === questionId 
            ? { ...q, savesCount: response.data.data.savesCount, isSaved: response.data.data.saved }
            : q
        ));
        
        setAlert({
          show: true,
          type: 'success',
          title: response.data.data.saved ? 'Đã lưu!' : 'Đã bỏ lưu',
          message: response.data.message || (response.data.data.saved ? 'Đã lưu câu hỏi vào danh sách của bạn' : 'Đã bỏ lưu câu hỏi')
        });
      }
    } catch (error) {
      setAlert({
        show: true,
        type: 'error',
        title: 'Lỗi',
        message: error.response?.data?.message || error.message || 'Có lỗi xảy ra khi lưu câu hỏi'
      });
    }
  };

  const handleQuestionClick = (questionId) => {
    navigate(`${FORUM_QUESTION_ROUTE}/${questionId}`);
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return 'Chưa cập nhật';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) {
      return 'Chưa cập nhật';
    }
    const now = new Date();
    const diffMs = now - date;
    if (diffMs < 0) {
      return date.toLocaleDateString('vi-VN');
    }
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  return (
    <div className="forum-page">
      {/* HEADER HERO */}
      <ForumBanner />

      {/* CTA Section - Đăng câu hỏi */}
      <div className="forum-cta-section">
        <div className="container">
          <button className="btn-primary btn-ask-question" onClick={() => setShowAskModal(true)}>
            <FaQuestionCircle /> Đăng câu hỏi
          </button>
          <span className="cta-hint">Miễn phí - được phản hồi trong vài phút</span>
        </div>
      </div>

      <section className="forum-toolbar container">
        <form className="toolbar-search" onSubmit={handleSearch}>
          <FaSearch />
          <input
            type="text"
            placeholder="Tìm kiếm bài viết, triệu chứng hoặc bác sĩ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </form>
        <div className="toolbar-actions">
          {/* ✅ Filter theo Topic */}
          <select
            value={selectedTopic}
            onChange={(e) => {
              setSelectedTopic(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">Tất cả chủ đề</option>
            {topics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.title}
              </option>
            ))}
          </select>
          
          <select
            value={selectedSpecialty}
            onChange={(e) => {
              setSelectedSpecialty(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">Tất cả chuyên khoa</option>
            {specialties.map((specialty) => (
              <option key={specialty.id} value={specialty.id}>
                {specialty.name}
              </option>
            ))}
          </select>
          <button type="button" onClick={clearFilters}>
            Làm mới
          </button>
        </div>
      </section>

      {(activeSearchTerm || selectedSpecialtyName || selectedTopic || selectedTags.length > 0) && (
        <section className="active-filters container">
          <span className="filter-label">Đang áp dụng:</span>
          {activeSearchTerm && (
            <button type="button" className="filter-chip" onClick={handleClearSearch}>
              Từ khóa: {activeSearchTerm} ×
            </button>
          )}
          {selectedTopic && (
            <button type="button" className="filter-chip" onClick={() => {
              setSelectedTopic('');
              setCurrentPage(1);
            }}>
              Chủ đề: {topics.find(t => t.id === Number(selectedTopic))?.title} ×
            </button>
          )}
          {selectedSpecialtyName && (
            <button type="button" className="filter-chip" onClick={handleClearSpecialty}>
              Chuyên khoa: {selectedSpecialtyName} ×
            </button>
          )}
          {selectedTags.map((tag) => (
            <button
              type="button"
              key={tag}
              className="filter-chip"
              onClick={() => toggleFilterTag(tag)}
            >
              #{tag} ×
            </button>
          ))}
        </section>
      )}

      <section className="forum-content container">
        <main className="forum-feed">
          <div className="create-card">
            <div className="create-card__icon">
              <FaQuestionCircle />
            </div>
            <button
              type="button"
              className="create-card__prompt"
              onClick={() => setShowAskModal(true)}
            >
              Chia sẻ điều bạn đang thắc mắc với cộng đồng...
            </button>
            <button
              type="button"
              className="create-card__submit"
              onClick={() => setShowAskModal(true)}
            >
              Đăng
            </button>
          </div>

          {loading ? (
            <div className="panel--loading">Đang tải dữ liệu...</div>
          ) : questions.length === 0 ? (
            <div className="empty-state">
              <FaQuestionCircle size={56} />
              <h3>Chưa có bài viết nào phù hợp</h3>
              <p>Hãy trở thành người đầu tiên chia sẻ câu hỏi về chủ đề này.</p>
              <button className="btn-outline" onClick={() => setShowAskModal(true)}>
                Tạo bài viết mới
              </button>
            </div>
          ) : (
            <div className="post-feed">
              {questions
                .filter(q => {
                  // ✅ Client-side filter theo selectedTopic
                  if (selectedTopic && q.topicId !== Number(selectedTopic)) {
                    return false;
                  }
                  return true;
                })
                .map((question) => {
                const rawContent = (question.content || '').trim();
                const preview =
                  rawContent.length > 260 ? `${rawContent.substring(0, 260)}...` : rawContent;
                const questionDate =
                  question.createdAt ||
                  question.created_at ||
                  question.approvedAt ||
                  question.approved_at;
                return (
                  <article
                    key={question.id}
                    className="post-card"
                    onClick={() => handleQuestionClick(question.id)}
                  >
                    <div className="post-card__vote" onClick={(e) => e.stopPropagation()}>
                      <button type="button" onClick={(e) => e.stopPropagation()}>
                        <FaArrowUp />
                      </button>
                      <span>{question.answerCount || 0}</span>
                      <button type="button" onClick={(e) => e.stopPropagation()}>
                        <FaArrowDown />
                      </button>
                    </div>

                    <div className="post-card__body">
                      <header className="post-card__meta">
                        <span className="post-card__community">r/health-forum</span>
                        <span className="dot">•</span>
                        <span className="post-card__author">
                          {question.isAnonymous ? 'Ẩn danh' : question.author?.fullName}
                        </span>
                        <span className="dot">•</span>
                        <span className="post-card__time">{formatDate(questionDate)}</span>
                        {question.isPinned && (
                          <span className="post-card__pinned">
                            <FaStar /> Nổi bật
                          </span>
                        )}
                      </header>

                      <h3 className="post-card__title">{question.title}</h3>

                      {preview && <p className="post-card__excerpt">{preview}</p>}

                      {Array.isArray(question.images) && question.images.length > 0 && (
                        <div className="post-card__gallery">
                          {question.images.slice(0, 3).map((img, idx) => (
                            <img key={idx} src={img} alt={`Minh họa ${idx + 1}`} />
                          ))}
                          {question.images.length > 3 && (
                            <span className="gallery-count">+{question.images.length - 3}</span>
                          )}
                        </div>
                      )}

                      <footer className="post-card__footer">
                        <span>
                          <FaComments /> {question.answerCount || 0} bình luận
                        </span>
                        <span>
                          <FaEye /> {question.viewsCount || 0} lượt xem
                        </span>
                        {question.specialty && (
                          <span className="post-card__specialty">{question.specialty.name}</span>
                        )}
                        
                        {/* ✅ Nút Like */}
                        <button
                          type="button"
                          className={`post-card__action-btn ${question.isLiked ? 'active' : ''}`}
                          onClick={(e) => handleLikeQuestion(question.id, e)}
                          title={question.isLiked ? 'Bỏ thích' : 'Thích'}
                        >
                          {question.isLiked ? <FaHeart /> : <FaRegHeart />}
                          <span>{question.likesCount || 0}</span>
                        </button>
                        
                        {/* ✅ Nút Save */}
                        <button
                          type="button"
                          className={`post-card__action-btn ${question.isSaved ? 'active' : ''}`}
                          onClick={(e) => handleSaveQuestion(question.id, e)}
                          title={question.isSaved ? 'Bỏ lưu' : 'Lưu'}
                        >
                          {question.isSaved ? <FaBookmark /> : <FaRegBookmark />}
                        </button>
                        
                        {/* ✅ Nút Report */}
                        <button
                          type="button"
                          className="post-card__report-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenReport('question', question.id, question.title);
                          }}
                          title="Báo cáo vi phạm"
                        >
                          <FaExclamationTriangle /> Báo cáo
                        </button>
                      </footer>

                      {Array.isArray(question.tags) && question.tags.length > 0 && (
                        <div className="post-card__tags">
                          {question.tags.map((tag, index) => (
                            <span key={index}>#{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {totalPages > 1 && !loading && (
            <div className="pagination">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Trang trước
              </button>
              <span>
                Trang {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Trang sau
              </button>
            </div>
          )}
        </main>

        <aside className="forum-sidebar">
          <div className="sidebar-card">
            <h3>Bộ lọc theo thẻ</h3>
            <p>Tìm nhanh chủ đề bạn quan tâm.</p>
            <div className="sidebar-search">
              <FaTags />
              <input
                type="text"
                placeholder="Tìm tag: tim mạch, dinh dưỡng..."
                value={tagSearchTerm}
                onChange={(e) => setTagSearchTerm(e.target.value)}
              />
            </div>
            <div className="sidebar-tags">
              {filteredTagOptions.length === 0 ? (
                <span className="sidebar-tags__empty">Không tìm thấy tag phù hợp</span>
              ) : (
                filteredTagOptions.slice(0, 18).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={`sidebar-tag ${selectedTags.includes(tag) ? 'active' : ''}`}
                    onClick={() => toggleFilterTag(tag)}
                  >
                    #{tag}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="sidebar-card sidebar-tips">
            <h3>Mẹo đăng bài hay</h3>
            <ul>
              <li>Nêu rõ triệu chứng, thời gian và mức độ ảnh hưởng.</li>
              <li>Chia sẻ xét nghiệm hoặc hình ảnh để bác sĩ dễ tư vấn.</li>
              <li>Chọn đúng chuyên khoa giúp câu hỏi được phản hồi nhanh.</li>
            </ul>
          </div>
        </aside>
      </section>

      {showAskModal && (
        <div className="forum-modal-overlay" onClick={() => setShowAskModal(false)}>
          <div className="forum-modal" onClick={(e) => e.stopPropagation()}>
            <div className="forum-modal__header">
              <h2>Đặt Câu Hỏi Mới</h2>
              <button className="forum-modal__close" onClick={() => setShowAskModal(false)}>
                ×
              </button>
            </div>
            
            <form className="forum-modal__form" onSubmit={handleAskQuestion}>
              <section className="form-section">
                <div className="form-grid form-grid--two">
                  <div className="form-group">
                    <label>Tiêu đề câu hỏi *</label>
                    <input
                      type="text"
                      placeholder="Nhập tiêu đề câu hỏi..."
                      value={questionForm.title}
                      onChange={(e) =>
                        setQuestionForm({ ...questionForm, title: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="form-group form-group--textarea">
                    <label>Nội dung chi tiết *</label>
                    <textarea
                      placeholder="Mô tả chi tiết vấn đề của bạn..."
                      value={questionForm.content}
                      onChange={(e) =>
                        setQuestionForm({ ...questionForm, content: e.target.value })
                      }
                      rows="6"
                      required
                    />
                  </div>
                </div>
              </section>

              <section className="form-section">
                <div className="form-grid form-grid--two">
                  {/* ✅ Thêm dropdown chọn Topic (BẮT BUỘC) */}
                  <div className="form-group">
                    <label>Chủ đề *</label>
                    <select
                      value={questionForm.topicId}
                      onChange={(e) =>
                        setQuestionForm({ ...questionForm, topicId: e.target.value })
                      }
                      required
                    >
                      <option value="">-- Chọn chủ đề --</option>
                      {topics.map((topic) => (
                        <option key={topic.id} value={topic.id}>
                          {topic.title}
                        </option>
                      ))}
                    </select>
                    <small style={{ color: '#666', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                      Chọn chủ đề phù hợp giúp câu hỏi được trả lời nhanh hơn
                    </small>
                  </div>
                  
                  {/* ✅ Chuyên khoa - Multi-select (không bắt buộc) */}
                  <div className="form-group">
                    <label>Chuyên khoa (không bắt buộc - có thể chọn nhiều)</label>
                    <div className="specialty-checkbox-grid">
                      {specialties.slice(0, 8).map((specialty) => {
                        const isSelected = questionForm.specialtyIds.includes(specialty.id);
                        return (
                          <label key={specialty.id} className="checkbox-option">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSpecialty(specialty.id)}
                            />
                            <span>{specialty.name}</span>
                          </label>
                        );
                      })}
                    </div>
                    <small style={{ color: '#666', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                      Chọn chuyên khoa giúp câu hỏi tiếp cận đúng chuyên gia
                    </small>
                  </div>

                  <div className="form-group">
                    <label>Chọn tag phổ biến</label>
                    <div className="tag-grid">
                      {formTags.map((tag) => {
                        const isSelected = questionForm.tagList.includes(tag);
                        return (
                          <button
                            type="button"
                            key={tag}
                            className={`tag-option ${isSelected ? 'selected' : ''}`}
                            onClick={() => toggleTag(tag)}
                          >
                            <FaTags /> {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>

              <section className="form-section">
                <div className="form-group">
                  <label>Thêm tag khác (phân cách bằng dấu phẩy)</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: đau đầu, mất ngủ, stress"
                    value={questionForm.tags}
                    onChange={(e) =>
                      setQuestionForm({ ...questionForm, tags: e.target.value })
                    }
                  />
                </div>
              </section>

              <section className="form-section">
                <div className="form-group">
                  <label>Hình ảnh minh họa (tối đa 5 ảnh)</label>
                  <div className="image-upload-container">
                    <input
                      type="file"
                      id="image-upload"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      style={{ display: 'none' }}
                      disabled={uploading || previewImages.length >= 5}
                    />
                    <label
                      htmlFor="image-upload"
                      className={`upload-button ${uploading || previewImages.length >= 5 ? 'disabled' : ''}`}
                    >
                      <FaComments /> {uploading ? 'Đang upload...' : 'Chọn ảnh'}
                    </label>

                    {previewImages.length > 0 && (
                      <div className="image-preview-grid">
                        {previewImages.map((url, index) => (
                          <div key={index} className="image-preview-item">
                            <img src={url} alt={`Preview ${index + 1}`} />
                            <button
                              type="button"
                              className="remove-image-btn"
                              onClick={() => removeImage(index)}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* ✅ Files đính kèm */}
              <section className="form-section">
                <div className="form-group">
                  <label>Files đính kèm (tối đa 5 files - PDF, DOC, XLS...)</label>
                  <div className="file-upload-container">
                    <input
                      type="file"
                      id="file-upload"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                      multiple
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                      disabled={uploading || questionForm.attachments.length >= 5}
                    />
                    <label
                      htmlFor="file-upload"
                      className={`upload-button ${uploading || questionForm.attachments.length >= 5 ? 'disabled' : ''}`}
                    >
                      📎 {uploading ? 'Đang upload...' : 'Chọn files'}
                    </label>
                    <small style={{ color: '#666', fontSize: '12px', marginLeft: '12px' }}>
                      ({questionForm.attachments.length}/5 files)
                    </small>

                    {previewFiles.length > 0 && (
                      <div className="file-preview-list">
                        {previewFiles.map((fileName, index) => (
                          <div key={index} className="file-preview-item">
                            <span>📄 {fileName}</span>
                            <button
                              type="button"
                              className="remove-file-btn"
                              onClick={() => removeFile(index)}
                              title="Xóa file"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* ✅ Anonymous checkbox - Chỉ hiện khi topic requiresApproval */}
              <section className="form-section">
                {questionForm.topicId && (() => {
                  const selectedTopic = topics.find(t => t.id === Number(questionForm.topicId));
                  return selectedTopic && selectedTopic.requiresApproval ? (
                    <div className="form-group checkbox-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={questionForm.isAnonymous}
                          onChange={(e) =>
                            setQuestionForm({ ...questionForm, isAnonymous: e.target.checked })
                          }
                        />
                        Đặt câu hỏi ẩn danh
                      </label>
                      <small style={{ color: '#666', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                        Chỉ admin và người quản lý chủ đề mới thấy tên bạn. User khác sẽ thấy "Người dùng ẩn danh".
                      </small>
                    </div>
                  ) : null;
                })()}
              </section>

              <footer className="forum-modal__actions">
                <button type="button" className="btn-muted" onClick={() => setShowAskModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn-primary">
                  Gửi Câu Hỏi
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ✅ MODAL BÁO CÁO VI PHẠM */}
      {/* ============================================================ */}
      {showReportModal && (
        <div className="forum-modal-overlay" onClick={() => setShowReportModal(false)}>
          <div className="forum-modal" onClick={(e) => e.stopPropagation()}>
            <header className="forum-modal__header">
              <h2 className="forum-modal__title">
                <FaExclamationTriangle /> Báo cáo vi phạm
              </h2>
              <button
                type="button"
                className="forum-modal__close"
                onClick={() => setShowReportModal(false)}
              >
                <FaTimes />
              </button>
            </header>

            <form onSubmit={handleSubmitReport} className="forum-modal__form">
              <section className="form-section">
                <div className="form-group">
                  <label className="form-label--info">
                    Bạn đang báo cáo: <strong>{reportTarget.title}</strong>
                  </label>
                </div>

                <div className="form-group">
                  <label htmlFor="report-reason">
                    Lý do báo cáo <span className="required">*</span>
                  </label>
                  <select
                    id="report-reason"
                    value={reportForm.reason}
                    onChange={(e) => setReportForm({ ...reportForm, reason: e.target.value })}
                    required
                  >
                    <option value="">-- Chọn lý do --</option>
                    <option value="spam">Spam / Quảng cáo</option>
                    <option value="inappropriate">Nội dung không phù hợp</option>
                    <option value="misleading">Thông tin sai lệch</option>
                    <option value="offensive">Xúc phạm / Thô tục</option>
                    <option value="other">Lý do khác</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="report-description">
                    Mô tả chi tiết (tùy chọn)
                  </label>
                  <textarea
                    id="report-description"
                    rows="4"
                    placeholder="Vui lòng mô tả rõ hơn về vấn đề bạn gặp phải..."
                    value={reportForm.description}
                    onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })}
                  />
                  <small className="form-text">
                    Thông tin chi tiết giúp quản trị viên xử lý nhanh hơn
                  </small>
                </div>
              </section>

              <footer className="forum-modal__actions">
                <button
                  type="button"
                  className="btn-muted"
                  onClick={() => setShowReportModal(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="btn-primary">
                  Gửi báo cáo
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
      
      {/* ============================================================ */}
      {/* ✅ CUSTOM ALERT POPUP */}
      {/* ============================================================ */}
      <CustomAlert
        show={alert.show}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        onClose={() => setAlert({ ...alert, show: false })}
        autoCloseDuration={5000}
      />
    </div>
  );
};

export default ForumPage;
