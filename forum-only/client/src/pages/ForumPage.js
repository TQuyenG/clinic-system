// client/src/pages/ForumPage.js
import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import api from '../services/api';
import forumService from '../services/forumService';
import { FORUM_QUESTION_ROUTE } from '../utils/constants';
import './ForumPage.css';
import {
  FaSearch,
  FaQuestionCircle,
  FaComments,
  FaEye,
  FaTags,
  FaStar,
  FaArrowUp,
  FaArrowDown,
  FaPhoneAlt,
  FaUserMd,
  FaHospital,
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
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showAskModal, setShowAskModal] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [tagSearchTerm, setTagSearchTerm] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState('');
  const [overview, setOverview] = useState({
    totalQuestions: 0,
    totalAnswers: 0,
    specialtyCount: 0
  });
  
  // Form state
  const defaultQuestionForm = {
    title: '',
    content: '',
    specialtyId: '',
    tags: '',
    tagList: [],
    isAnonymous: false,
    images: [],
  };
  const [questionForm, setQuestionForm] = useState(defaultQuestionForm);
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
        setOverview({
          totalQuestions: pagination.total || fetchedQuestions.length,
          totalAnswers: fetchedQuestions.reduce(
            (sum, q) => sum + Number(q.answerCount || 0),
            0
          ),
          specialtyCount: new Set(
            fetchedQuestions
              .filter((q) => q.specialty && q.specialty.name)
              .map((q) => q.specialty.name)
          ).size
        });
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

  // Load specialties
  useEffect(() => {
    fetchSpecialties();
  }, [fetchSpecialties]);

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
      alert('Chỉ được upload tối đa 5 ảnh');
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
      alert('Có lỗi khi upload ảnh. Vui lòng thử lại!');
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

  const handleAskQuestion = async (e) => {
    e.preventDefault();
    
    if (!user) {
      alert('Vui lòng đăng nhập để đặt câu hỏi');
      navigate('/login');
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

      const specialtyId = questionForm.specialtyId
        ? Number(questionForm.specialtyId)
        : null;

      const response = await api.post(
        '/forum/questions',
        {
          title: questionForm.title,
          content: questionForm.content,
          specialtyId,
          tags: combinedTags,
          isAnonymous: questionForm.isAnonymous,
          images: questionForm.images,
        }
      );

      if (response.data.success) {
        alert('Câu hỏi của bạn đã được gửi và đang chờ duyệt!');
        setShowAskModal(false);
        setQuestionForm(defaultQuestionForm);
        setPreviewImages([]);
        setCurrentPage(1);
        await fetchQuestions({ page: 1 });
      }
    } catch (error) {
      console.error('Error creating question:', error);
      alert('Có lỗi xảy ra khi gửi câu hỏi. Vui lòng thử lại!');
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
      <header className="forum-header">
        <div className="forum-header__background" aria-hidden="true" />
        <div className="container forum-header__inner">
          <div className="forum-header__content">
            <div className="forum-header__identity">
              <div className="forum-header__icon">
                <FaComments />
              </div>
              <div className="forum-header__titles">
                <div className="forum-header__slug-row">
                  <span className="forum-header__slug">r/health-forum</span>
                  <span className="forum-header__quality">
                    <FaStar /> Cộng đồng đã kiểm duyệt
                  </span>
                </div>
                <h1>Diễn đàn sức khỏe</h1>
                <p>
                  Hỏi đáp cùng cộng đồng, kết nối bác sĩ – bệnh nhân và lan tỏa kiến thức y khoa một cách sống động mỗi ngày.
                </p>
              </div>
            </div>

            <div className="forum-header__stats">
              <div className="forum-header__stat-pill">
                <span className="value">{overview.totalQuestions}</span>
                <span className="label">chủ đề</span>
              </div>
              <div className="forum-header__stat-pill">
                <span className="value">{overview.totalAnswers}</span>
                <span className="label">bình luận</span>
              </div>
              <div className="forum-header__stat-pill">
                <span className="value">{overview.specialtyCount}</span>
                <span className="label">chuyên khoa</span>
              </div>
            </div>

            <div className="forum-header__contact">
              <div className="contact-card">
                <div className="contact-icon">
                  <FaPhoneAlt />
                </div>
                <div>
                  <span>Hotline hỗ trợ</span>
                  <strong>1900 6868</strong>
                </div>
              </div>
              <div className="contact-card">
                <div className="contact-icon">
                  <FaUserMd />
                </div>
                <div>
                  <span>Tư vấn bác sĩ</span>
                  <strong>Trực tuyến 24/7</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="forum-header__cta">
            <button className="btn-primary" onClick={() => setShowAskModal(true)}>
              <FaQuestionCircle /> Đăng câu hỏi
            </button>
            <span className="forum-header__cta-hint">Miễn phí - được phản hồi trong vài phút</span>

            <div className="forum-header__media">
              <div className="forum-header__media-illustration">
                <div className="media-icon">
                  <FaHospital />
                </div>
                <div>
                  <strong>Mạng lưới y khoa</strong>
                  <p>120+ bác sĩ & cơ sở đối tác đồng hành</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

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

      {(activeSearchTerm || selectedSpecialtyName || selectedTags.length > 0) && (
        <section className="active-filters container">
          <span className="filter-label">Đang áp dụng:</span>
          {activeSearchTerm && (
            <button type="button" className="filter-chip" onClick={handleClearSearch}>
              Từ khóa: {activeSearchTerm} ×
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
              {questions.map((question) => {
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

          <div className="sidebar-card sidebar-stats">
            <h3>Thống kê cộng đồng</h3>
            <ul>
              <li>
                <span>Chủ đề đang mở</span>
                <strong>{overview.totalQuestions}</strong>
              </li>
              <li>
                <span>Tổng bình luận</span>
                <strong>{overview.totalAnswers}</strong>
              </li>
              <li>
                <span>Chuyên khoa tham gia</span>
                <strong>{overview.specialtyCount}</strong>
              </li>
            </ul>
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
                  <div className="form-group">
                    <label>Chuyên khoa</label>
                    <select
                      value={questionForm.specialtyId}
                      onChange={(e) =>
                        setQuestionForm({ ...questionForm, specialtyId: e.target.value })
                      }
                    >
                      <option value="">Chọn chuyên khoa (tùy chọn)</option>
                      {specialties.map((specialty) => (
                        <option key={specialty.id} value={specialty.id}>
                          {specialty.name}
                        </option>
                      ))}
                    </select>
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

              <section className="form-section">
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
                </div>
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
    </div>
  );
};

export default ForumPage;
