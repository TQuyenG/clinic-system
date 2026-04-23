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
import Breadcrumb from '../components/Breadcrumb';
import ForumBanner from '../components/ForumBanner';
import { FORUM_ROUTE } from '../utils/constants';
import './QuestionDetailPage.css';
import {
  FaArrowLeft, FaHeart, FaRegHeart, FaComments, FaShare, FaFlag,
  FaUserMd, FaReply, FaEye, FaBookmark, FaRegBookmark,
  FaCheckCircle, FaTimesCircle, FaFileAlt, FaFilePdf, FaFileWord,
  FaFileExcel, FaImage, FaPaperclip
} from 'react-icons/fa';

const REPLY_PREFIX = /^\[@reply:(\d+)\]\s*/i;

// Helper: Ensure Array
const ensureArray = (value) => {
  if (Array.isArray(value)) return value;
  return [];
};

// Helper: Format Time
const formatRelativeTime = (dateValue) => {
  if (!dateValue) return 'Chưa cập nhật';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Chưa cập nhật';
  return date.toLocaleDateString('vi-VN');
};

const QuestionDetailPage = () => {
  const { id } = useParams();
  const authContext = useContext(AuthContext);
  const user = authContext?.user || JSON.parse(localStorage.getItem('user') || 'null');
  const navigate = useNavigate();

  // State
  const [question, setQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [answerContent, setAnswerContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [replySubmitting, setReplySubmitting] = useState({});
  const [activeReply, setActiveReply] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);

  // Report Data
  const [reportData, setReportData] = useState({
    entityType: 'question',
    entityId: null,
    reason: 'spam',
    description: '',
  });

  // Fetch Detail
  const fetchQuestionDetail = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const payload = await forumService.getQuestionDetail(id);
      if (payload.success) {
        setQuestion(payload.data);
        setAnswers(payload.data.answers || []);
      }
    } catch (error) {
      console.error('Error fetching detail:', error);
      navigate(FORUM_ROUTE);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    if (id) fetchQuestionDetail(true);
  }, [id, fetchQuestionDetail]);

  // Real-time updates (Giữ nguyên logic cũ của bạn)
  useEffect(() => {
    const handler = (e) => {
      const payload = e.detail || {};
      if (payload.entity_type === 'question' && String(payload.entity_id) === String(id)) {
        setQuestion(prev => prev ? { ...prev, ...payload } : prev);
        if (payload.interaction_type === 'comment') fetchQuestionDetail(false);
      }
    };
    window.addEventListener('forum:interaction', handler);
    return () => window.removeEventListener('forum:interaction', handler);
  }, [id, fetchQuestionDetail]);

  // Thread Logic
  const buildThread = (flatAnswers) => {
    const map = new Map();
    flatAnswers.forEach(a => map.set(a.id, { ...a, replies: [] }));
    const roots = [];
    flatAnswers.forEach(a => {
        // Parse reply prefix logic
        const match = a.content && a.content.match(REPLY_PREFIX);
        let parentId = null;
        if(match) parentId = Number(match[1]);
        
        if (parentId && map.has(parentId)) {
            map.get(parentId).replies.push(map.get(a.id));
        } else {
            roots.push(map.get(a.id));
        }
    });
    return roots;
  };

  const threadedAnswers = useMemo(() => buildThread(answers), [answers]);

  // Handlers
  const handleLike = async (targetType, targetId) => {
      if(!user) return alert("Vui lòng đăng nhập");
      const endpoint = targetType === 'question' ? `/forum/questions/${id}/like` : `/forum/answers/${targetId}/like`;
      try {
          const res = await api.post(endpoint);
          if(res.data.success) {
              if(targetType === 'question') {
                  setQuestion(prev => ({...prev, liked: res.data.data.liked, likesCount: res.data.data.likesCount}));
              } else {
                  // Update answer in flat array - threadedAnswers sẽ tự động rebuild từ useMemo
                  setAnswers(prev => prev.map(a => 
                      a.id === targetId 
                          ? {...a, liked: res.data.data.liked, likesCount: res.data.data.likesCount} 
                          : a
                  ));
              }
          }
      } catch(e) { console.error(e); }
  };

  const handleSave = async () => {
      if(!user) return alert("Vui lòng đăng nhập");
      try {
          const res = await api.post(`/forum/questions/${id}/save`);
          if(res.data.success) {
              setQuestion(prev => ({...prev, saved: res.data.data.saved}));
              alert(res.data.data.saved ? 'Đã lưu câu hỏi' : 'Đã bỏ lưu');
          }
      } catch(e) { 
          console.error(e);
          alert("Lỗi thao tác");
      }
  };

  const handleSubmitAnswer = async () => {
      if(!user) return alert("Vui lòng đăng nhập");
      if(!answerContent.trim()) return;
      setSubmitting(true);
      try {
          await api.post(`/forum/questions/${id}/answers`, { content: answerContent });
          setAnswerContent('');
          fetchQuestionDetail(false);
      } catch(e) { alert("Lỗi gửi câu trả lời"); }
      finally { setSubmitting(false); }
  };

  const handleSubmitReply = async (parentId) => {
      const draft = replyDrafts[parentId];
      if(!user) return alert("Vui lòng đăng nhập");
      if(!draft?.trim()) return;
      
      setReplySubmitting(prev => ({...prev, [parentId]: true}));
      try {
          await api.post(`/forum/questions/${id}/answers`, { content: `[@reply:${parentId}] ${draft}` });
          setReplyDrafts(prev => ({...prev, [parentId]: ''}));
          setActiveReply(null);
          fetchQuestionDetail(false);
      } catch(e) { alert("Lỗi gửi phản hồi"); }
      finally { setReplySubmitting(prev => ({...prev, [parentId]: false})); }
  };

  const handleReport = async () => {
      try {
          await api.post('/forum/reports', reportData);
          setShowReportModal(false);
          alert("Đã gửi báo cáo");
      } catch(e) { alert("Lỗi gửi báo cáo"); }
  }

  // Render Single Answer
  const renderAnswerCard = (answer, depth = 0) => {
    const isDeleted = answer.isDeleted;
    const isReplying = activeReply === answer.id;
    const contentDisplay = isDeleted ? <i>Bình luận đã bị xóa.</i> : answer.content.replace(REPLY_PREFIX, '');

    return (
      <div key={answer.id} className={`QuestionDetail-answer-card depth-${Math.min(depth, 2)} ${isDeleted ? 'deleted' : ''}`}>
        <div className="QuestionDetail-answer-header">
            <div className="QuestionDetail-user-box">
                <div className="QuestionDetail-user-avatar-sm">
                    {answer.author?.avatar_url ? (
                        <img src={answer.author.avatar_url} alt={answer.author.full_name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                        answer.author?.full_name?.charAt(0) || 'U'
                    )}
                </div>
                <div>
                    <div className="QuestionDetail-user-name">
                        {answer.author?.full_name || 'Người dùng'}
                        {answer.author?.role === 'doctor' && <span className="QuestionDetail-badge-doctor"><FaUserMd/> Bác sĩ</span>}
                    </div>
                    <div className="QuestionDetail-time">{formatRelativeTime(answer.createdAt)}</div>
                </div>
            </div>
        </div>
        <div className="QuestionDetail-answer-content">{contentDisplay}</div>
        
        {!isDeleted && (
            <div className="QuestionDetail-answer-actions">
                <button className={`QuestionDetail-link-btn ${answer.liked ? 'liked' : ''}`} onClick={() => handleLike('answer', answer.id)}>
                    {answer.liked ? <FaHeart/> : <FaRegHeart/>} {answer.likesCount || 0}
                </button>
                <button className="QuestionDetail-link-btn" onClick={() => setActiveReply(isReplying ? null : answer.id)}>
                    <FaReply/> Phản hồi
                </button>
                <button className="QuestionDetail-link-btn" onClick={() => { setReportData({entityType:'answer', entityId: answer.id, reason:'spam', description:''}); setShowReportModal(true); }}>
                    <FaFlag/>
                </button>
            </div>
        )}

        {isReplying && (
            <div className="QuestionDetail-reply-form">
                <textarea 
                    className="QuestionDetail-textarea" 
                    placeholder="Viết phản hồi..." 
                    value={replyDrafts[answer.id] || ''} 
                    onChange={e => setReplyDrafts({...replyDrafts, [answer.id]: e.target.value})}
                />
                <div style={{display:'flex', justifyContent:'flex-end', gap:10}}>
                    <button className="QuestionDetail-action-btn" onClick={() => setActiveReply(null)}>Hủy</button>
                    <button className="QuestionDetail-btn-submit" disabled={replySubmitting[answer.id]} onClick={() => handleSubmitReply(answer.id)}>
                        {replySubmitting[answer.id] ? 'Đang gửi...' : 'Gửi'}
                    </button>
                </div>
            </div>
        )}

        {answer.replies.map(reply => renderAnswerCard(reply, depth + 1))}
      </div>
    );
  };

  if (loading) return <div style={{textAlign:'center', padding:60}}>Đang tải nội dung...</div>;
  if (!question) return null;

  // Generate breadcrumb items
  const getBreadcrumbItems = () => {
    if (!question) return [];
    const items = [
      { label: 'Trang chủ', url: '/' },
      { label: 'Diễn đàn sức khỏe', url: '/dien-dan-suc-khoe' }
    ];
    if (question.topic) {
      items.push({ 
        label: question.topic.title, 
        url: `/dien-dan-suc-khoe?topic=${question.topic.id}` 
      });
    }
    if (question.specialty) {
      items.push({ 
        label: question.specialty.name, 
        url: `/dien-dan-suc-khoe?specialty=${question.specialty.id}` 
      });
    }
    items.push({ label: question.title, url: null });
    return items;
  };

  return (
    <div className="QuestionDetail-page">
      {/* HEADER HERO */}
      <ForumBanner />

      {/* BREADCRUMB */}
      <div className="QuestionDetail-container" style={{ marginTop: '20px' }}>
        <div className="detail-article-breadcrumb" style={{ marginBottom: '20px' }}>
          <Breadcrumb items={getBreadcrumbItems()} />
        </div>
      </div>

      {/* MAIN CONTAINER (2 COLUMNS) */}
      <div className="QuestionDetail-container">
        {/* LEFT COLUMN */}
        <div className="QuestionDetail-main">
            <div className="QuestionDetail-nav">
                <button className="QuestionDetail-btn-back" onClick={() => navigate(FORUM_ROUTE)}>
                    <FaArrowLeft/> Quay lại diễn đàn
                </button>
            </div>

            {/* Question Card */}
            <div className="QuestionDetail-card">
                <div className="QuestionDetail-meta">
                    <div className="QuestionDetail-avatar">
                        {question.isAnonymous ? (
                            'A'
                        ) : question.author?.avatar_url ? (
                            <img src={question.author.avatar_url} alt={question.author.full_name} />
                        ) : (
                            question.author?.full_name?.charAt(0) || 'U'
                        )}
                    </div>
                    <div className="QuestionDetail-author-info">
                        <span className="QuestionDetail-author-name">
                            {question.isAnonymous ? 'Ẩn danh' : (question.author?.full_name || 'Người dùng')}
                        </span>
                        <span className="QuestionDetail-time">{formatRelativeTime(question.createdAt)}</span>
                    </div>
                    {/* Hiển thị nhiều specialties */}
                    {question.specialties && question.specialties.length > 0 && (
                        <div className="QuestionDetail-specialties">
                            {question.specialties.map(spec => (
                                <span key={spec.id} className="QuestionDetail-badge">{spec.name}</span>
                            ))}
                        </div>
                    )}
                </div>

                <h1 className="QuestionDetail-title">{question.title}</h1>
                <div className="QuestionDetail-content">{question.content}</div>

                {ensureArray(question.images).length > 0 && (
                    <div className="QuestionDetail-gallery">
                        {ensureArray(question.images).map((img, i) => (
                            <img key={i} src={img} className="QuestionDetail-image" alt="illustration"/>
                        ))}
                    </div>
                )}

                {/* Hiển thị files đính kèm */}
                {question.attachments && question.attachments.length > 0 && (
                    <div className="QuestionDetail-attachments">
                        <div className="QuestionDetail-attachments-title">
                            <FaPaperclip /> Tài liệu đính kèm:
                        </div>
                        <div className="QuestionDetail-attachments-list">
                            {question.attachments.map((file, idx) => {
                                const fileName = file.split('/').pop();
                                const fileExt = fileName.split('.').pop().toLowerCase();
                                
                                // Chọn icon React phù hợp với loại file
                                let IconComponent = FaFileAlt;
                                let iconColor = '#666';
                                
                                if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileExt)) {
                                    IconComponent = FaImage;
                                    iconColor = '#FF6B6B';
                                } else if (['pdf'].includes(fileExt)) {
                                    IconComponent = FaFilePdf;
                                    iconColor = '#E74C3C';
                                } else if (['doc', 'docx'].includes(fileExt)) {
                                    IconComponent = FaFileWord;
                                    iconColor = '#2B579A';
                                } else if (['xls', 'xlsx'].includes(fileExt)) {
                                    IconComponent = FaFileExcel;
                                    iconColor = '#217346';
                                }
                                
                                return (
                                    <a 
                                        key={idx} 
                                        href={file} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="QuestionDetail-attachment-item"
                                    >
                                        <IconComponent className="attachment-icon" style={{ color: iconColor }} />
                                        <span className="attachment-name">{fileName}</span>
                                    </a>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="QuestionDetail-tags">
                    {ensureArray(question.tags).map(t => <span key={t} className="QuestionDetail-tag">#{t}</span>)}
                </div>

                <div className="QuestionDetail-actions">
                    <button className={`QuestionDetail-action-btn ${question.liked ? 'active' : ''}`} onClick={() => handleLike('question')}>
                        {question.liked ? <FaHeart/> : <FaRegHeart/>} {question.likesCount || 0} Thích
                    </button>
                    <button className={`QuestionDetail-action-btn ${question.saved ? 'active' : ''}`} onClick={handleSave}>
                        {question.saved ? <FaBookmark/> : <FaRegBookmark/>} Lưu
                    </button>
                    <button className="QuestionDetail-action-btn QuestionDetail-report-btn" onClick={() => { setReportData({entityType:'question', entityId:id, reason:'spam', description:''}); setShowReportModal(true); }}>
                        <FaFlag/> Báo cáo
                    </button>
                </div>
            </div>

            {/* Compose Answer */}
            <div className="QuestionDetail-compose">
                <div className="QuestionDetail-section-title"><FaComments/> Bình luận của bạn</div>
                <textarea 
                    className="QuestionDetail-textarea" 
                    rows={4}
                    placeholder="Chia sẻ ý kiến, kinh nghiệm hoặc lời khuyên..."
                    value={answerContent}
                    onChange={e => setAnswerContent(e.target.value)}
                />
                <button className="QuestionDetail-btn-submit" disabled={submitting} onClick={handleSubmitAnswer}>
                    {submitting ? 'Đang gửi...' : 'Gửi bình luận'}
                </button>
            </div>

            {/* Thread List */}
            <div className="QuestionDetail-answers-section">
                <div className="QuestionDetail-section-title">{answers.length} Thảo luận</div>
                {threadedAnswers.length === 0 ? (
                    <div style={{textAlign:'center', padding:20, color:'#999'}}>Chưa có bình luận nào.</div>
                ) : (
                    threadedAnswers.map(ans => renderAnswerCard(ans))
                )}
            </div>
        </div>

        {/* RIGHT COLUMN: SIDEBAR */}
        <div className="QuestionDetail-sidebar">
            <div className="QuestionDetail-widget">
                <h3>Thống kê bài viết</h3>
                <ul className="QuestionDetail-stat-list">
                    <li><span>Lượt xem</span><strong>{question.viewsCount || 0}</strong></li>
                    <li><span>Trả lời</span><strong>{question.answerCount || 0}</strong></li>
                    <li><span>Ngày đăng</span><strong>{question.createdAt ? new Date(question.createdAt).toLocaleDateString('vi-VN') : 'N/A'}</strong></li>
                </ul>
            </div>

            <div className="QuestionDetail-widget">
                <h3>Mẹo hỏi đáp</h3>
                <ul className="QuestionDetail-tips-list">
                    <li>Mô tả triệu chứng chi tiết.</li>
                    <li>Đính kèm hình ảnh nếu cần thiết.</li>
                    <li>Giữ thái độ lịch sự, tôn trọng.</li>
                    <li>Không chia sẻ thông tin cá nhân nhạy cảm.</li>
                </ul>
            </div>
        </div>
      </div>

      {/* Report Modal */}
      {showReportModal && (
          <div className="QuestionDetail-modal-overlay" onClick={() => setShowReportModal(false)}>
              <div className="QuestionDetail-modal" onClick={e => e.stopPropagation()}>
                  <h3>Báo cáo vi phạm</h3>
                  <select value={reportData.reason} onChange={e => setReportData({...reportData, reason: e.target.value})}>
                      <option value="spam">Spam / Quảng cáo</option>
                      <option value="offensive">Xúc phạm / Thô tục</option>
                      <option value="misleading">Thông tin sai lệch</option>
                      <option value="other">Lý do khác</option>
                  </select>
                  <textarea 
                    className="QuestionDetail-textarea" 
                    placeholder="Mô tả thêm chi tiết..." 
                    value={reportData.description} 
                    onChange={e => setReportData({...reportData, description: e.target.value})}
                  />
                  <div className="QuestionDetail-modal-actions">
                      <button className="QuestionDetail-action-btn" onClick={() => setShowReportModal(false)}>Hủy</button>
                      <button className="QuestionDetail-btn-submit" onClick={handleReport}>Gửi báo cáo</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default QuestionDetailPage;