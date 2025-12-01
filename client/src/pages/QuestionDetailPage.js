// client/src/pages/QuestionDetailPage.js
import React, {
  useState,
  useEffect,
  useContext,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import api from '../services/api';
import forumService from '../services/forumService';
import { FORUM_ROUTE } from '../utils/constants';
import './QuestionDetailPage.css';
import {
  FaArrowLeft,
  FaEye,
  FaClock,
  FaTags,
  FaComments,
  FaStar,
  FaCheckCircle,
  FaTimesCircle,
  FaUserMd,
  FaUser,
  FaFlag,
  FaHeart,
  FaRegHeart,
  FaReply,
} from 'react-icons/fa';

const REPLY_PREFIX = /^\[@reply:(\d+)\]\s*/i;

const ensureArray = (value) => {
  if (Array.isArray(value)) {
    return value;
  }
  if (value === null || value === undefined) {
    return [];
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      if (parsed && typeof parsed === 'object') {
        return Object.values(parsed);
      }
      return [trimmed];
    } catch (error) {
      return [trimmed];
    }
  }
  if (typeof value === 'object') {
    return Object.values(value);
  }
  return [];
};

const notify = (message, type = 'info') => {
  if (typeof window !== 'undefined' && typeof window.showNotification === 'function') {
    window.showNotification(message, type);
  } else {
    window.alert(message);
  }
};

const formatRelativeTime = (dateValue) => {
  if (!dateValue) return 'Chưa cập nhật';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return 'Chưa cập nhật';
  }
  const now = new Date();
  const diffMs = now - date;
  if (diffMs < 0) return date.toLocaleDateString('vi-VN');

  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 7) return `${diffDays} ngày trước`;
  if (diffWeeks < 4) return `${diffWeeks} tuần trước`;
  return date.toLocaleDateString('vi-VN');
};

const sanitizeAnswer = (answer, order) => {
  const rawContent = answer.content || '';
  const match = rawContent.match(REPLY_PREFIX);
  let parentAnswerId = null;
  let displayContent = rawContent;

  if (match) {
    parentAnswerId = Number(match[1]);
    displayContent = rawContent.replace(REPLY_PREFIX, '').trim();
  }

  return {
    ...answer,
    order,
    parentAnswerId: Number.isFinite(parentAnswerId) ? parentAnswerId : null,
    content: displayContent,
    createdAt: answer.createdAt || answer.created_at || null,
    likesCount: Number(answer.likesCount || answer.likes_count || 0),
    isDeleted: Boolean(answer.isDeleted ?? answer.is_deleted ?? false),
    replies: [],
  };
};

const buildThread = (flatAnswers) => {
  const map = new Map();
  flatAnswers.forEach((answer) => {
    map.set(answer.id, { ...answer, replies: [] });
  });

  const roots = [];
  map.forEach((answer) => {
    if (answer.parentAnswerId && map.has(answer.parentAnswerId)) {
      map.get(answer.parentAnswerId).replies.push(answer);
    } else {
      roots.push(answer);
    }
  });

  const sortByOrder = (list) => {
    list.sort((a, b) => a.order - b.order);
    list.forEach((item) => sortByOrder(item.replies));
  };
  sortByOrder(roots);
  return roots;
};

const QuestionDetailPage = () => {
  const { id } = useParams();
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

  const [question, setQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [answerContent, setAnswerContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [replySubmitting, setReplySubmitting] = useState({});
  const [activeReply, setActiveReply] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const lastFetchedQuestionIdRef = useRef(null);
  const [reportData, setReportData] = useState({
    entityType: 'question',
    entityId: null,
    reason: 'spam',
    description: '',
  });
  const reportReasonOptions = useMemo(
    () => [
      { value: 'spam', label: 'Spam / Quảng cáo' },
      { value: 'misleading', label: 'Thông tin sai lệch' },
      { value: 'offensive', label: 'Ngôn từ/Thái độ gây xúc phạm' },
      { value: 'inappropriate', label: 'Nội dung không phù hợp' },
      { value: 'other', label: 'Khác' },
    ],
    []
  );
  const handleReportReasonChange = useCallback((value) => {
    setReportData((prev) => ({
      ...prev,
      reason: value,
      description: value === 'other' ? prev.description : '',
    }));
  }, []);
  const requiresReportDescription = reportData.reason === 'other';

  const fetchQuestionDetail = useCallback(
    async (showSpinner = true) => {
      if (showSpinner) {
        setLoading(true);
      }
      try {
        const payload = await forumService.getQuestionDetail(id);
        if (payload.success) {
          const questionData = payload.data || {};
          const sanitizedQuestion = {
            ...questionData,
            likesCount: Number(questionData.likesCount || questionData.likes_count || 0),
            viewsCount: Number(questionData.viewsCount || questionData.views || 0),
          };
          const normalizedAnswers = Array.isArray(questionData.answers)
            ? questionData.answers.map((answer, index) => sanitizeAnswer(answer, index))
            : [];

          setQuestion(sanitizedQuestion);
          setAnswers(normalizedAnswers);
        } else {
          throw new Error(payload.message || 'Không lấy được dữ liệu câu hỏi');
        }
      } catch (error) {
        console.error('Error fetching question detail:', error);
        notify('Không tìm thấy câu hỏi hoặc câu hỏi chưa được duyệt', 'error');
        navigate(FORUM_ROUTE);
      } finally {
        if (showSpinner) {
          setLoading(false);
        }
      }
    },
    [id, navigate]
  );

  useEffect(() => {
    if (!id) {
      return;
    }
    if (lastFetchedQuestionIdRef.current === id) {
      return;
    }
    lastFetchedQuestionIdRef.current = id;
    fetchQuestionDetail(true);
  }, [id, fetchQuestionDetail]);

  // Listen to real-time forum interaction events
  useEffect(() => {
    const handler = (e) => {
      const payload = e.detail || {};
      if (!payload || !payload.entity_type) return;

      // question-level updates
      if (payload.entity_type === 'question' && String(payload.entity_id) === String(id)) {
        // update counts
        setQuestion((prev) => {
          if (!prev) return prev;
          const updated = { ...prev };
          if (typeof payload.likesCount === 'number') updated.likesCount = payload.likesCount;
          if (typeof payload.viewsCount === 'number') updated.viewsCount = payload.viewsCount;
          if (typeof payload.answersCount === 'number') updated.answersCount = payload.answersCount;
          return updated;
        });

        // if new comment posted, append it (if provided) or refetch
        if (payload.interaction_type === 'comment') {
          if (payload.answer) {
            // convert to local answer shape
            const a = payload.answer;
            const sanitized = sanitizeAnswer({
              id: a.id,
              content: a.content,
              author: a.author,
              createdAt: a.created_at || a.createdAt
            }, answers.length);
            setAnswers((prev) => [...prev, sanitized]);
          } else {
            // fallback: refresh
            fetchQuestionDetail(false);
          }
        }
      }

      // answer-level like updates
      if (payload.entity_type === 'answer') {
        setAnswers((prev) =>
          prev.map((ans) =>
            String(ans.id) === String(payload.entity_id)
              ? { ...ans, likesCount: payload.likesCount ?? ans.likesCount }
              : ans
          )
        );
      }
    };

    window.addEventListener('forum:interaction', handler);
    return () => window.removeEventListener('forum:interaction', handler);
  }, [id, answers.length, fetchQuestionDetail]);

  const threadedAnswers = useMemo(() => buildThread(answers), [answers]);
  const topLevelAnswerCount = useMemo(
    () => answers.filter((answer) => !answer.parentAnswerId).length,
    [answers]
  );

  const handleSubmitAnswer = async (e) => {
    e.preventDefault();

    if (!user) {
      notify('Vui lòng đăng nhập để trả lời câu hỏi', 'warning');
      navigate('/login');
      return;
    }

    const content = answerContent.trim();
    if (!content) {
      notify('Vui lòng nhập nội dung câu trả lời', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post(`/forum/questions/${id}/answers`, {
        content,
      });

      if (response.data.success) {
        setAnswerContent('');
        notify('Câu trả lời đã được đăng thành công!', 'success');
        await fetchQuestionDetail(false);
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      const message =
        error.response?.data?.message ||
        'Có lỗi xảy ra khi gửi câu trả lời. Vui lòng thử lại!';
      notify(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplyChange = (answerId, value) => {
    setReplyDrafts((prev) => ({
      ...prev,
      [answerId]: value,
    }));
  };

  const handleToggleReply = (answerId) => {
    setActiveReply((prev) => (prev === answerId ? null : answerId));
  };

  const handleSubmitReply = async (parentAnswerId) => {
    if (!user) {
      notify('Vui lòng đăng nhập để trả lời', 'warning');
      navigate('/login');
      return;
    }

    const draft = replyDrafts[parentAnswerId]?.trim();
    if (!draft) {
      notify('Vui lòng nhập nội dung phản hồi', 'warning');
      return;
    }

    setReplySubmitting((prev) => ({ ...prev, [parentAnswerId]: true }));
    try {
      const payloadContent = `[@reply:${parentAnswerId}] ${draft}`;
      const response = await api.post(`/forum/questions/${id}/answers`, {
        content: payloadContent,
      });

      if (response.data.success) {
        notify('Đã gửi phản hồi!', 'success');
        setReplyDrafts((prev) => ({ ...prev, [parentAnswerId]: '' }));
        setActiveReply(null);
        await fetchQuestionDetail(false);
      }
    } catch (error) {
      console.error('Error submitting reply:', error);
      const message =
        error.response?.data?.message ||
        'Có lỗi xảy ra khi gửi phản hồi. Vui lòng thử lại!';
      notify(message, 'error');
    } finally {
      setReplySubmitting((prev) => ({ ...prev, [parentAnswerId]: false }));
    }
  };

  const handleLikeQuestion = async () => {
    if (!user) {
      notify('Vui lòng đăng nhập để thích câu hỏi', 'warning');
      navigate('/login');
      return;
    }

    try {
      const response = await api.post(`/forum/questions/${id}/like`);
      if (response.data.success) {
        const likesValue = Number(response.data.data.likesCount || 0);
        setQuestion((prev) =>
          prev
            ? {
                ...prev,
                likesCount: likesValue,
                liked: response.data.data.liked,
              }
            : prev
        );
      }
    } catch (error) {
      console.error('Error liking question:', error);
    }
  };

  const handleLikeAnswer = async (answerId) => {
    if (!user) {
      notify('Vui lòng đăng nhập để thích câu trả lời', 'warning');
      navigate('/login');
      return;
    }

    try {
      const response = await api.post(`/forum/answers/${answerId}/like`);

      if (response.data.success) {
        setAnswers((prev) =>
          prev.map((answer) =>
            answer.id === answerId
              ? {
                  ...answer,
                  likesCount: Number(response.data.data.likesCount || 0),
                  liked: response.data.data.liked,
                }
              : answer
          )
        );
      }
    } catch (error) {
      console.error('Error liking answer:', error);
    }
  };

  const handleOpenReportModal = (entityType, entityId) => {
    if (!user) {
      notify('Vui lòng đăng nhập để báo cáo', 'warning');
      navigate('/login');
      return;
    }

    setReportData({
      entityType,
      entityId,
      reason: 'spam',
      description: '',
    });
    setShowReportModal(true);
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();

    if (reportData.reason === 'other' && !reportData.description.trim()) {
      notify('Vui lòng mô tả chi tiết cho lý do báo cáo "Khác"', 'warning');
      return;
    }

    try {
      const response = await api.post(`/forum/reports`, reportData);

      if (response.data.success) {
        notify('Báo cáo của bạn đã được gửi thành công!', 'success');
        setShowReportModal(false);
        setReportData({
          entityType: 'question',
          entityId: null,
          reason: 'spam',
          description: '',
        });
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      notify(error.response?.data?.message || 'Có lỗi xảy ra khi gửi báo cáo', 'error');
    }
  };

  const renderAnswerCard = (answer, depth = 0) => {
    const replyDraft = replyDrafts[answer.id] || '';
    const isReplying = activeReply === answer.id;
    const isDeleted = Boolean(answer.isDeleted);
    const cardClasses = [
      'answer-card',
      `depth-${Math.min(depth, 3)}`,
      isDeleted ? 'answer-card--deleted' : null,
    ]
      .filter(Boolean)
      .join(' ');
    const contentToDisplay = isDeleted
      ? 'Bình luận đã bị xoá do vi phạm tiêu chuẩn cộng đồng.'
      : answer.content;
    const avatarContent = isDeleted
      ? <FaTimesCircle />
      : (answer.author?.fullName || answer.author?.name || 'U')
          .trim()
          .charAt(0)
          .toUpperCase();

    return (
      <article key={answer.id} className={cardClasses}>
        <div className="answer-card__meta">
          <div className="answer-card__avatar">{avatarContent}</div>
          <div className="answer-card__meta-info">
            <div className="answer-card__meta-top">
              <span className="answer-card__author">
                {answer.author?.fullName || answer.author?.name || 'Người dùng'}
              </span>
              <span className="dot">•</span>
              <span className="answer-card__time">{formatRelativeTime(answer.createdAt)}</span>
              {answer.author?.role === 'doctor' && (
                <span className="answer-card__badge">
                  <FaUserMd /> Bác sĩ
                </span>
              )}
              {answer.isVerified && (
                <span className="answer-card__badge answer-card__badge--verified">
                  <FaCheckCircle /> Đã xác thực
                </span>
              )}
              {answer.isPinned && (
                <span className="answer-card__badge answer-card__badge--pinned">
                  <FaStar /> Nổi bật
                </span>
              )}
              {isDeleted && (
                <span className="answer-card__badge answer-card__badge--deleted">
                  <FaTimesCircle /> Đã xoá
                </span>
              )}
            </div>
            {answer.author?.doctor?.specialty?.name && (
              <div className="answer-card__subtitle">
                {answer.author.doctor.specialty.name}
                {answer.author.doctor.experience
                  ? ` • ${answer.author.doctor.experience} năm kinh nghiệm`
                  : ''}
              </div>
            )}
          </div>
        </div>

        <div
          className={`answer-card__content ${
            isDeleted ? 'answer-card__content--deleted' : ''
          }`}
        >
          {contentToDisplay}
        </div>

        {!isDeleted && (
          <div className="answer-card__actions">
            <button
              type="button"
              className={`answer-like ${answer.liked ? 'liked' : ''}`}
              onClick={() => handleLikeAnswer(answer.id)}
            >
              {answer.liked ? <FaHeart /> : <FaRegHeart />}
              <span>{answer.likesCount ?? 0}</span>
            </button>
            <button
              type="button"
              className="answer-reply"
              onClick={() => handleToggleReply(answer.id)}
            >
              <FaReply /> Phản hồi
            </button>
            <button
              type="button"
              className="answer-report"
              onClick={() => handleOpenReportModal('answer', answer.id)}
            >
              <FaFlag />
            </button>
          </div>
        )}

        {isReplying && !isDeleted && (
          <div className="reply-form">
            <textarea
              placeholder="Viết phản hồi của bạn..."
              value={replyDraft}
              onChange={(event) => handleReplyChange(answer.id, event.target.value)}
              rows="3"
            />
            <div className="reply-form__actions">
              <button type="button" className="btn-muted" onClick={() => setActiveReply(null)}>
                Hủy
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => handleSubmitReply(answer.id)}
                disabled={replySubmitting[answer.id]}
              >
                {replySubmitting[answer.id] ? 'Đang gửi...' : 'Gửi phản hồi'}
              </button>
            </div>
          </div>
        )}

        {answer.replies.length > 0 && (
          <div className="answer-card__children">
            {answer.replies.map((reply) => renderAnswerCard(reply, depth + 1))}
          </div>
        )}
      </article>
    );
  };

  if (loading) {
    return <div className="loading-container">Đang tải nội dung...</div>;
  }

  if (!question) {
    return null;
  }

  const questionTags = ensureArray(question.tags);
  const questionImages = ensureArray(question.images);

  return (
    <div className="question-detail-page">
      <div className="question-container">
        <button type="button" className="back-link" onClick={() => navigate(FORUM_ROUTE)}>
          <FaArrowLeft /> Quay lại diễn đàn
        </button>

        <section className="question-hero">
          <header className="question-hero__header">
            <div className="question-hero__identity">
              <div className="question-hero__icon">
                {(question.isAnonymous
                  ? 'Ẩ'
                  : (question.author?.fullName || question.author?.name || 'H')
                )
                  .trim()
                  .charAt(0)
                  .toUpperCase()}
              </div>
              <div>
                <span className="question-hero__community">r/health-forum</span>
                <h1>{question.title}</h1>
                <div className="question-hero__meta">
                  <span>
                    {question.isAnonymous
                      ? 'Ẩn danh'
                      : question.author?.fullName || question.author?.name || 'Người dùng'}
                  </span>
                  <span className="dot">•</span>
                  <span>{formatRelativeTime(question.createdAt || question.created_at)}</span>
                  {question.isPinned && (
                    <>
                      <span className="dot">•</span>
                      <span className="question-hero__badge">
                        <FaStar /> Đang nổi bật
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <button type="button" className="btn-outline" onClick={() => window.print()}>
              Lưu bản PDF
            </button>
          </header>

          <div className="question-hero__body">
            {question.specialty && (
              <div className="question-hero__specialty">
                <strong>Chuyên khoa:</strong> {question.specialty.name}
              </div>
            )}
            <p className="question-hero__content">{question.content}</p>

            {questionImages.length > 0 && (
              <div className="question-hero__gallery">
                {questionImages.map((image, index) => (
                  <img src={image} alt={`question-attachment-${index}`} key={image || index} />
                ))}
              </div>
            )}

            {questionTags.length > 0 && (
              <div className="question-hero__tags">
                <FaTags />
                {questionTags.map((tag, index) => (
                  <span key={`${tag}-${index}`}>#{tag}</span>
                ))}
              </div>
            )}
          </div>

          <footer className="question-hero__footer">
            <div className="question-hero__stats">
              <span>
                <FaComments /> {answers.length} bình luận
              </span>
              <span>
                <FaEye /> {question.viewsCount} lượt xem
              </span>
            </div>
            <div className="question-hero__actions">
              <button
                type="button"
                className={`question-like ${question.liked ? 'liked' : ''}`}
                onClick={handleLikeQuestion}
              >
                {question.liked ? <FaHeart /> : <FaRegHeart />}
                <span>{question.likesCount || 0}</span>
              </button>
              <button
                type="button"
                className="question-report"
                onClick={() => handleOpenReportModal('question', question.id)}
              >
                <FaFlag /> Báo cáo
              </button>
            </div>
          </footer>
        </section>

        {user ? (
          <section className="answer-compose">
            <h2>Chia sẻ góc nhìn của bạn</h2>
            <form onSubmit={handleSubmitAnswer}>
              <textarea
                placeholder="Nhập câu trả lời chi tiết, thông tin hữu ích sẽ giúp cộng đồng nhiều hơn..."
                value={answerContent}
                onChange={(event) => setAnswerContent(event.target.value)}
                rows="6"
                required
              />
              <div className="answer-compose__actions">
                <span>
                  <strong>Lưu ý:</strong> Không chia sẻ thông tin cá nhân nhạy cảm. Mọi phản hồi sẽ
                  được kiểm duyệt.
                </span>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Đang gửi...' : 'Gửi câu trả lời'}
                </button>
              </div>
            </form>
          </section>
        ) : (
          <section className="answer-login">
            <p>
              Bạn cần <a href="/login">đăng nhập</a> để tham gia trao đổi. Đăng nhập giúp theo dõi
              phản hồi và nhận thông báo nhanh chóng.
            </p>
          </section>
        )}

        <section className="answer-thread">
          <header>
            <h2>
              <FaComments /> {topLevelAnswerCount} thảo luận chính
            </h2>
            <span>{answers.length} phản hồi tổng cộng</span>
          </header>

          {threadedAnswers.length === 0 ? (
            <div className="answer-empty">
              Chưa có phản hồi nào. Hãy là người đầu tiên chia sẻ kinh nghiệm của bạn!
            </div>
          ) : (
            <div className="answer-thread__list">
              {threadedAnswers.map((answer) => renderAnswerCard(answer))}
            </div>
          )}
        </section>
      </div>

      {showReportModal && (
        <div className="modal-overlay" onClick={() => setShowReportModal(false)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <h3>Báo cáo nội dung không phù hợp</h3>
            <form onSubmit={handleSubmitReport}>
              <div className="form-group">
                <label>Lý do báo cáo:</label>
                <select
                  value={reportData.reason}
                  onChange={(event) => handleReportReasonChange(event.target.value)}
                >
                  {reportReasonOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {requiresReportDescription && (
                <div className="form-group">
                  <label>Mô tả chi tiết *</label>
                  <textarea
                    rows="4"
                    value={reportData.description}
                    onChange={(event) =>
                      setReportData({ ...reportData, description: event.target.value })
                    }
                    placeholder="Vui lòng mô tả ngắn gọn lý do bạn báo cáo nội dung này..."
                    required
                  />
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn-muted" onClick={() => setShowReportModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn-primary">
                  Gửi báo cáo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionDetailPage;
