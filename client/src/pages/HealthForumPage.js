// client/src/pages/HealthForumPage.js
// ĐÃ TÍCH HỢP: Tab "Nhóm cộng đồng" bên cạnh Diễn đàn Q&A
// - Tab "Diễn đàn": giữ nguyên 100% logic cũ
// - Tab "Nhóm cộng đồng": tìm nhóm, xem nhóm, tham gia nhóm
// - Tab "Nhóm của tôi": danh sách nhóm đã tham gia (cần đăng nhập)
// - Doctor/Staff/Admin: hiện nút "Tạo nhóm mới"
// - Patient: KHÔNG thấy nút tạo nhóm

import React, { useState, useMemo, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import {
  FaUser, FaClock, FaComment, FaSearch, FaFilter, FaTrophy,
  FaTag, FaUsers, FaFire, FaStar, FaHeart, FaRegHeart, FaMedal,
  FaThumbsUp, FaSortAmountDown, FaSortAmountUp, FaPlus, FaLock,
  FaGlobe, FaUserMd, FaCheck, FaChevronRight
} from 'react-icons/fa';
import './HealthForumPage.css';
import forumService from '../services/forumService';
import communityService from '../services/communityService';
import { FORUM_QUESTION_ROUTE } from '../utils/constants';

// ─────────────────────────────────────────────────────────
// SUB-COMPONENT: Card nhóm cộng đồng
// ─────────────────────────────────────────────────────────
const GroupCard = ({ group, onJoin, onView, isMember }) => {
  const privacyIcon = group.privacy === 'public'
    ? <FaGlobe style={{ color: '#4CAF50' }} />
    : <FaLock style={{ color: '#FF9800' }} />;

  const privacyLabel = group.privacy === 'public' ? 'Công khai'
    : group.privacy === 'private' ? 'Riêng tư' : 'Chỉ mời';

  return (
    <div className="hf-group-card">
      {/* Cover image hoặc gradient mặc định */}
      <div
        className="hf-group-cover"
        style={{ background: group.cover_image ? `url(${group.cover_image}) center/cover` : 'linear-gradient(135deg,#2fbf71,#1a8f52)' }}
      >
        <span className="hf-group-icon-big">{group.icon || '👥'}</span>
        {group.type === 'official' && (
          <span className="hf-group-official-badge">✓ Chính thống</span>
        )}
      </div>

      <div className="hf-group-body">
        <h4 className="hf-group-name">{group.name}</h4>
        <p className="hf-group-desc">{group.description || 'Nhóm cộng đồng sức khỏe'}</p>

        {/* Bác sĩ phụ trách */}
        {group.doctor?.user && (
          <div className="hf-group-doctor">
            <FaUserMd style={{ color: '#2fbf71', marginRight: 4 }} />
            <span>BS. {group.doctor.user.full_name}</span>
          </div>
        )}

        <div className="hf-group-meta">
          <span>{privacyIcon} {privacyLabel}</span>
          <span><FaUsers /> {group.members_count || 0} thành viên</span>
          <span>📝 {group.posts_count || 0} bài</span>
        </div>

        {/* Disclaimer */}
        <p className="hf-group-disclaimer">
          Nội dung mang tính tham khảo — không thay thế chỉ định bác sĩ
        </p>

        <div className="hf-group-actions">
          <button className="hf-btn-outline" onClick={() => onView(group)}>
            Xem nhóm
          </button>
          {!isMember && group.privacy !== 'invite_only' && (
            <button className="hf-btn-primary" onClick={() => onJoin(group)}>
              {group.privacy === 'public' ? 'Tham gia' : 'Gửi yêu cầu'}
            </button>
          )}
          {isMember && (
            <span className="hf-joined-badge"><FaCheck /> Đã tham gia</span>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// MODAL TẠO NHÓM — Chỉ Doctor/Staff/Admin thấy
// ─────────────────────────────────────────────────────────
const CreateGroupModal = ({ onClose, onCreated, doctors }) => {
  const [form, setForm] = useState({
    name: '', description: '', privacy: 'public',
    doctor_id: '', icon: '👥', requires_post_approval: true
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!form.name.trim()) return setError('Tên nhóm không được trống');
    if (!form.doctor_id) return setError('Vui lòng chọn bác sĩ phụ trách');
    setSubmitting(true);
    setError('');
    try {
      await communityService.createGroup({
        ...form,
        doctor_id: parseInt(form.doctor_id)
      });
      onCreated();
    } catch (e) {
      setError(e?.response?.data?.message || 'Tạo nhóm thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const ICONS = ['👥','❤️','🧠','💪','🩺','🥗','🌿','🏃','🦷','👶','🧬','💊'];

  return (
    <div className="hf-modal-overlay" onClick={onClose}>
      <div className="hf-modal" onClick={e => e.stopPropagation()}>
        <div className="hf-modal-header">
          <h3>Tạo nhóm cộng đồng mới</h3>
          <button className="hf-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="hf-modal-body">
          {error && <div className="hf-error-msg">{error}</div>}

          <label className="hf-label">Tên nhóm *</label>
          <input
            className="hf-input"
            placeholder="VD: Hội bệnh nhân tiểu đường"
            value={form.name}
            onChange={e => setForm({...form, name: e.target.value})}
          />

          <label className="hf-label">Mô tả</label>
          <textarea
            className="hf-textarea"
            placeholder="Mô tả mục đích và đối tượng của nhóm..."
            rows={3}
            value={form.description}
            onChange={e => setForm({...form, description: e.target.value})}
          />

          <label className="hf-label">Icon nhóm</label>
          <div className="hf-icon-picker">
            {ICONS.map(ic => (
              <button
                key={ic}
                className={`hf-icon-btn ${form.icon === ic ? 'selected' : ''}`}
                onClick={() => setForm({...form, icon: ic})}
              >{ic}</button>
            ))}
          </div>

          <label className="hf-label">Bác sĩ phụ trách *</label>
          <select
            className="hf-select"
            value={form.doctor_id}
            onChange={e => setForm({...form, doctor_id: e.target.value})}
          >
            <option value="">-- Chọn bác sĩ phụ trách --</option>
            {doctors.map(d => (
              <option key={d.id} value={d.id}>
                BS. {d.user?.full_name || d.full_name || d.username || 'Ẩn danh'} — {d.specialty?.name || d.specialty || 'Đa khoa'}
              </option>
            ))}
          </select>

          <label className="hf-label">Quyền riêng tư</label>
          <select
            className="hf-select"
            value={form.privacy}
            onChange={e => setForm({...form, privacy: e.target.value})}
          >
            <option value="public">Công khai — Ai cũng join được</option>
            <option value="private">Riêng tư — Cần duyệt khi join</option>
            <option value="invite_only">Chỉ mời — Chỉ qua lời mời</option>
          </select>

          <label className="hf-label hf-checkbox-label">
            <input
              type="checkbox"
              checked={form.requires_post_approval}
              onChange={e => setForm({...form, requires_post_approval: e.target.checked})}
            />
            &nbsp;Yêu cầu duyệt bài trước khi đăng
          </label>

          <p className="hf-modal-note">
            Nhóm sẽ được gửi Admin duyệt trước khi hiển thị công khai.
          </p>
        </div>

        <div className="hf-modal-footer">
          <button className="hf-btn-outline" onClick={onClose}>Hủy</button>
          <button className="hf-btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Đang tạo...' : 'Tạo nhóm'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// COMPONENT CHÍNH
// ─────────────────────────────────────────────────────────
const HealthForumPage = () => {
  // ── TAB STATE ────────────────────────────────────────────
  // 'forum' | 'community' | 'my_groups'
  const [activeTab, setActiveTab] = useState('forum');

  // ── FORUM (Q&A) STATE — giữ nguyên logic cũ ─────────────
  const [newPost, setNewPost] = useState({ title: '', content: '', tags: [], group: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedTags, setSelectedTags] = useState([]);
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [topContributors, setTopContributors] = useState([]);
  const [forumStats, setForumStats] = useState({ members: 0, posts: 0, comments: 0 });
  const [fallbackStats, setFallbackStats] = useState({ members: 0, posts: 0, comments: 0 });
  const [fallbackContributors, setFallbackContributors] = useState([]);

  // ── COMMUNITY STATE ──────────────────────────────────────
  const [groups, setGroups] = useState([]);
  const [myGroups, setMyGroups] = useState([]);
  const [groupSearch, setGroupSearch] = useState('');
  const [groupLoading, setGroupLoading] = useState(false);
  const [membershipMap, setMembershipMap] = useState({}); // groupId → true/false
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [availableDoctors, setAvailableDoctors] = useState([]);
  const [groupFilter, setGroupFilter] = useState('all'); // 'all'|'official'|'community'
  const [topics, setTopics] = useState([]);

  const navigate = useNavigate();
  const location = useLocation(); 
  const authContext = useContext(AuthContext);

  // 1. Khai báo user và quyền (canCreateGroup) TRƯỚC
  const storedUser = (() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); }
    catch { return null; }
  })();
  const user = authContext?.user || storedUser;

  const userRole = typeof user?.role === 'object' ? user?.role?.name?.toLowerCase() : user?.role?.toLowerCase();
  const canCreateGroup = user && userRole && ['doctor', 'staff', 'admin'].includes(userRole);

  // 2. Dùng useEffect SAU khi đã có canCreateGroup
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
      window.history.replaceState({}, document.title);
    }
    if (location.state?.openCreateModal && canCreateGroup) {
      setShowCreateModal(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, canCreateGroup]);

  // ── LEGACY GROUPS (sidebar filter cũ) ───────────────────
  const topicGroups = [
    { id: 'all', name: 'Tất cả', icon: '🏥', color: '#4CAF50' },
    { id: 'cardio', name: 'Tim mạch', icon: '❤️', color: '#E91E63' },
    { id: 'diabetes', name: 'Tiểu đường', icon: '🩺', color: '#FF9800' },
    { id: 'nutrition', name: 'Dinh dưỡng', icon: '🥗', color: '#8BC34A' },
    { id: 'mental', name: 'Sức khỏe tinh thần', icon: '🧠', color: '#9C27B0' },
    { id: 'fitness', name: 'Thể dục', icon: '💪', color: '#2196F3' }
  ];
  const popularTags = ['Tập luyện', 'Dinh dưỡng', 'Thuốc men', 'Bệnh lý', 'Tư vấn', 'Kinh nghiệm', 'Phòng ngừa', 'Điều trị'];

  // ── FETCH Q&A (giữ nguyên logic cũ) ─────────────────────
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoading(true);
        setError('');
        const result = await forumService.getPublicQuestions({ page: 1, limit: 20, search: searchTerm });
        setQuestions(result?.data?.questions || []);
      } catch { setError('Không tải được danh sách câu hỏi'); }
      finally { setLoading(false); }
    };
    const fetchTopics = async () => {
      try {
        const { default: api } = await import('../services/api');
        const res = await api.get('/forum/topics');
        setTopics(res.data.data || res.data || []);
      } catch (e) { console.error('Lỗi tải topics:', e); }
    };
    if (activeTab === 'forum') { fetchQuestions(); fetchTopics(); }
  }, [searchTerm, activeTab]);

  useEffect(() => {
    const computeFallback = () => {
      if (!Array.isArray(questions) || questions.length === 0) {
        setFallbackStats({ members: 0, posts: 0, comments: 0 });
        setFallbackContributors([]);
        return;
      }
      const memberMap = new Map();
      let totalComments = 0;
      questions.forEach(q => {
        const authorId = q.author?.id ?? `anon-${q.id}`;
        const displayName = q.author?.fullName || q.author?.email || (typeof authorId === 'number' ? `Người dùng #${authorId}` : 'Ẩn danh');
        const existing = memberMap.get(authorId) || { id: authorId, name: displayName, email: q.author?.email || null, avatarUrl: q.author?.avatar || null, role: q.author?.role || 'patient', answers: 0, likes: 0, posts: 0, views: 0 };
        existing.posts += 1;
        existing.answers += Number(q.answerCount || 0);
        existing.likes += Number(q.likesCount || 0);
        existing.views += Number(q.viewsCount || 0);
        memberMap.set(authorId, existing);
        totalComments += Number(q.answerCount || 0);
      });
      const contributors = Array.from(memberMap.values())
        .map(e => ({ ...e, points: e.answers * 10 + e.likes * 2 + e.posts * 4 + Math.round(e.views || 0) }))
        .sort((a, b) => b.points - a.points).slice(0, 5);
      const statsPayload = { members: memberMap.size, posts: questions.length, comments: totalComments };
      setFallbackStats(statsPayload);
      setFallbackContributors(contributors);
      setForumStats(prev => {
        const hasPrev = prev && (Number(prev.members || 0) > 0 || Number(prev.posts || 0) > 0 || Number(prev.comments || 0) > 0);
        return hasPrev ? prev : statsPayload;
      });
      setTopContributors(prev => (Array.isArray(prev) && prev.length > 0) ? prev : contributors);
    };
    computeFallback();
  }, [questions]);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const overview = await forumService.getForumOverview();
        const contributors = overview?.data?.contributors || [];
        const stats = overview?.data?.stats || {};
        const hasStats = Number(stats.totalMembers || 0) > 0 || Number(stats.approvedQuestions || 0) > 0 || Number(stats.totalAnswers || 0) > 0;
        if (hasStats) setForumStats({ members: Number(stats.totalMembers || 0), posts: Number(stats.approvedQuestions || 0), comments: Number(stats.totalAnswers || 0) });
        else setForumStats(fallbackStats);
        if (Array.isArray(contributors) && contributors.length > 0) setTopContributors(contributors);
        else setTopContributors(fallbackContributors);
      } catch {
        setForumStats(fallbackStats);
        setTopContributors(fallbackContributors);
      }
    };
    fetchOverview();
  }, [fallbackStats, fallbackContributors]);

  // ── FETCH COMMUNITY GROUPS ───────────────────────────────
  useEffect(() => {
    if (activeTab !== 'community' && activeTab !== 'my_groups') return;
    const fetchGroups = async () => {
      setGroupLoading(true);
      try {
        const params = { limit: 20, page: 1 };
        if (groupSearch) params.search = groupSearch;
        if (groupFilter !== 'all') params.type = groupFilter;
        const res = await communityService.getGroups(params);
        const list = res?.data?.data?.groups || [];
        setGroups(list);

        // Xác định nhóm nào user đã join
        if (user) {
          const map = {};
          list.forEach(g => {
            if (g.members?.some(m => m.user_id === user.id)) map[g.id] = true;
          });
          setMembershipMap(map);
        }
      } catch (e) {
        console.error('Lỗi tải nhóm:', e);
      } finally {
        setGroupLoading(false);
      }
    };
    fetchGroups();
  }, [activeTab, groupSearch, groupFilter, user]);


  // Fetch nhóm của tôi
  useEffect(() => {
    if (activeTab !== 'my_groups' || !user) return;
    const fetchMyGroups = async () => {
      setGroupLoading(true);
      try {
        // Lọc từ danh sách groups + membership status
        let mine = [];
        
        if (groups.length > 0) {
          // Nếu đã load groups, lọc từ đó
          mine = groups.filter(g => membershipMap[g.id] === true);
        } else {
          // Nếu chưa load, fetch tất cả rồi lọc
          const res = await communityService.getGroups({ limit: 100, page: 1 });
          const allGroups = res?.data?.groups || res?.data?.data?.groups || [];
          mine = allGroups.filter(g => membershipMap[g.id] === true);
        }
        
        setMyGroups(mine);
        console.log('Nhóm của tôi:', mine); // DEBUG
      } catch (e) {
        console.error('❌ Lỗi tải nhóm của tôi:', e);
        setMyGroups([]);
      }
      finally { setGroupLoading(false); }
    };
    fetchMyGroups();
  }, [activeTab, user, membershipMap, groups]);

  // Fetch doctors khi mở modal tạo nhóm
  useEffect(() => {
    if (!showCreateModal) return;
    const fetchDoctors = async () => {
      try {
        const { default: api } = await import('../services/api');
        const res = await api.get('/users/doctors', { params: { limit: 100, work_status: 'active' } });
        
        // Quét tất cả các format mảng có thể trả về từ API của bạn
        let docs = [];
        if (Array.isArray(res.data)) docs = res.data;
        else if (Array.isArray(res.data?.data)) docs = res.data.data;
        else if (Array.isArray(res.data?.data?.doctors)) docs = res.data.data.doctors;
        else if (Array.isArray(res.data?.doctors)) docs = res.data.doctors;

        setAvailableDoctors(docs);
      } catch (err) { 
        console.error('Lỗi tải DS bác sĩ:', err);
        setAvailableDoctors([]); 
      }
    };
    fetchDoctors();
  }, [showCreateModal]);

  // ── HANDLERS ─────────────────────────────────────────────
  const showMessage = (msg, type = 'info') => {
    if (window.showNotification) window.showNotification(msg, type);
    else alert(msg);
  };

  const handleSubmitPost = async () => {
    if (!user) { showMessage('Vui lòng đăng nhập để đăng câu hỏi.', 'warning'); navigate('/login'); return; }
    if (!newPost.title || !newPost.content) { showMessage('Vui lòng nhập đầy đủ tiêu đề và nội dung.', 'warning'); return; }
    
    // Lấy topicId đầu tiên available làm mặc định
    const defaultTopicId = topics.length > 0 ? topics[0].id : null;
    if (!defaultTopicId) { showMessage('Không tìm thấy chủ đề. Vui lòng thử lại.', 'warning'); return; }
    
    try {
      setLoading(true);
      await forumService.createQuestion({ title: newPost.title, content: newPost.content, topicId: defaultTopicId, specialtyId: null, tags: newPost.tags, isAnonymous: false, images: [] });
      setNewPost({ title: '', content: '', tags: [], group: '' });
      showMessage('Đăng câu hỏi thành công! Vui lòng chờ duyệt.', 'success');
      const result = await forumService.getPublicQuestions({ page: 1, limit: 20, search: '' });
      setQuestions(result?.data?.questions || []);
    } catch { showMessage('Gửi câu hỏi thất bại, vui lòng thử lại.', 'error'); }
    finally { setLoading(false); }
  };

  const handleToggleLike = async (questionId) => {
    if (!user) { showMessage('Vui lòng đăng nhập để thả tim.', 'warning'); navigate('/login'); return; }
    try {
      const response = await forumService.toggleQuestionLike(questionId);
      if (response?.success) {
        setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, likesCount: response.data.likesCount, liked: response.data.liked } : q));
      }
    } catch { showMessage('Không thể cập nhật lượt thích.', 'error'); }
  };

  const handleJoinGroup = async (group) => {
    if (!user) { showMessage('Vui lòng đăng nhập để tham gia nhóm.', 'warning'); navigate('/login'); return; }
    try {
      const res = await communityService.joinGroup(group.id);
      showMessage(res?.data?.message || 'Thao tác thành công', 'success');
      setMembershipMap(prev => ({ ...prev, [group.id]: true }));
      // Cập nhật members_count hiển thị
      setGroups(prev => prev.map(g => g.id === group.id ? { ...g, members_count: (g.members_count || 0) + 1 } : g));
    } catch (e) {
      showMessage(e?.response?.data?.message || 'Lỗi khi tham gia nhóm', 'error');
    }
  };

  const handleViewGroup = (group) => {
    navigate(`/cong-dong/nhom/${group.slug}`);
  };

  const handleGroupCreated = () => {
    setShowCreateModal(false);
    showMessage('Tạo nhóm thành công! Đang chờ Admin duyệt.', 'success');
    // Refresh danh sách
    setGroups([]);
    setGroupSearch(s => s); // trigger re-fetch
  };

  const toggleTag = (tag) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const filteredPosts = useMemo(() => {
    const mapped = questions.map(q => ({
      id: q.id, title: q.title, content: q.content,
      author: q.author?.fullName || 'Ẩn danh',
      authorAvatar: q.author?.avatar ? '🧑‍⚕️' : '👤',
      date: q.createdAt ? new Date(q.createdAt).toLocaleDateString() : '',
      comments: q.answerCount || 0, likes: q.likesCount || 0, views: q.viewsCount || 0,
      group: q.specialty?.slug || 'all',
      tags: Array.isArray(q.tags) ? q.tags : [],
      trending: !!q.isPinned, liked: !!q.liked
    }));
    let filtered = [...mapped];
    if (searchTerm) filtered = filtered.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()) || p.content.toLowerCase().includes(searchTerm.toLowerCase()) || p.author.toLowerCase().includes(searchTerm.toLowerCase()));
    if (selectedGroup !== 'all') filtered = filtered.filter(p => p.group === selectedGroup);
    if (selectedTags.length > 0) filtered = filtered.filter(p => selectedTags.some(t => p.tags.includes(t)));
    switch (sortBy) {
      case 'newest': filtered.sort((a, b) => new Date(b.date) - new Date(a.date)); break;
      case 'oldest': filtered.sort((a, b) => new Date(a.date) - new Date(b.date)); break;
      case 'popular': filtered.sort((a, b) => b.likes - a.likes); break;
      case 'commented': filtered.sort((a, b) => b.comments - a.comments); break;
      default: break;
    }
    return filtered;
  }, [questions, searchTerm, selectedGroup, selectedTags, sortBy]);

  const formatNumber = v => { const n = Number(v || 0); return Number.isNaN(n) ? '0' : n.toLocaleString('vi-VN'); };

  const getBadgeIcon = b => {
    if (b === 'gold') return <FaTrophy style={{ color: '#FFD700' }} />;
    if (b === 'silver') return <FaMedal style={{ color: '#C0C0C0' }} />;
    if (b === 'bronze') return <FaMedal style={{ color: '#CD7F32' }} />;
    return null;
  };

  // ── RENDER ─────────────────────────────────────────────
  return (
    <div className="health-forum-container">
      {/* HEADER */}
      <div className="health-forum-header">
        <div className="health-forum-header-content">
          <h1 className="health-forum-title">🏥 Diễn đàn & Cộng đồng Sức khỏe</h1>
          <p className="health-forum-subtitle">Hỏi đáp, chia sẻ kinh nghiệm và tham gia nhóm cộng đồng</p>
        </div>
      </div>

      {/* TABS ĐIỀU HƯỚNG CHÍNH */}
      <div className="hf-tabs">
        <button
          className={`hf-tab ${activeTab === 'forum' ? 'active' : ''}`}
          onClick={() => setActiveTab('forum')}
        >
          💬 Diễn đàn Q&A
        </button>
        <button
          className={`hf-tab ${activeTab === 'community' ? 'active' : ''}`}
          onClick={() => setActiveTab('community')}
        >
          <FaUsers /> Nhóm cộng đồng
        </button>
        {user && (
          <button
            className={`hf-tab ${activeTab === 'my_groups' ? 'active' : ''}`}
            onClick={() => setActiveTab('my_groups')}
          >
            👤 Nhóm của tôi
          </button>
        )}
        {/* Nút tạo nhóm — chỉ Doctor/Staff/Admin */}
        {canCreateGroup && (
          <button
            className="hf-tab hf-tab-create"
            onClick={(e) => {
              e.preventDefault();
              setShowCreateModal(true);
            }}
          >
            <FaPlus /> Tạo nhóm mới
          </button>
        )}
      </div>

      {/* ════════════════════════════════════════════ */}
      {/* TAB 1: DIỄN ĐÀN Q&A (giữ nguyên UI cũ)    */}
      {/* ════════════════════════════════════════════ */}
      {activeTab === 'forum' && (
        <>
          <div className="health-forum-search-section">
            <div className="health-forum-search-bar">
              <FaSearch className="health-forum-search-icon" />
              <input type="text" className="health-forum-search-input" placeholder="Tìm kiếm bài viết, tác giả, chủ đề..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <button className="health-forum-filter-toggle" onClick={() => setShowFilters(!showFilters)}>
              <FaFilter /> Bộ lọc {showFilters ? '▲' : '▼'}
            </button>
          </div>

          {showFilters && (
            <div className="health-forum-filters">
              <div className="health-forum-filter-section">
                <h3 className="health-forum-filter-title">Sắp xếp theo</h3>
                <div className="health-forum-sort-buttons">
                  {[['newest','Mới nhất',<FaSortAmountDown/>],['oldest','Cũ nhất',<FaSortAmountUp/>],['popular','Phổ biến',<FaFire/>],['commented','Nhiều bình luận',<FaComment/>]].map(([v,l,ic])=>(
                    <button key={v} className={`health-forum-sort-btn ${sortBy===v?'active':''}`} onClick={()=>setSortBy(v)}>{ic} {l}</button>
                  ))}
                </div>
              </div>
              <div className="health-forum-filter-section">
                <h3 className="health-forum-filter-title">Tags phổ biến</h3>
                <div className="health-forum-tags-filter">
                  {popularTags.map(tag=>(
                    <button key={tag} className={`health-forum-tag-btn ${selectedTags.includes(tag)?'active':''}`} onClick={()=>toggleTag(tag)}><FaTag/> {tag}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="health-forum-main-layout">
            <aside className="health-forum-sidebar health-forum-sidebar-left">
              <div className="health-forum-widget">
                <h3 className="health-forum-widget-title"><FaUsers /> Nhóm chủ đề</h3>
                <div className="health-forum-groups">
                  {topicGroups.map(g=>(
                    <button key={g.id} className={`health-forum-group-btn ${selectedGroup===g.id?'active':''}`} onClick={()=>setSelectedGroup(g.id)} style={{'--group-color':g.color}}>
                      <span className="health-forum-group-icon">{g.icon}</span>
                      <span className="health-forum-group-name">{g.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="health-forum-widget health-forum-new-post-widget">
                <h3 className="health-forum-widget-title">✍️ Tạo bài mới</h3>
                <div className="health-forum-post-form">
                  <input type="text" className="health-forum-form-input" placeholder="Tiêu đề bài viết..." value={newPost.title} onChange={e=>setNewPost({...newPost,title:e.target.value})}/>
                  <textarea className="health-forum-form-textarea" placeholder="Nội dung bài viết..." value={newPost.content} onChange={e=>setNewPost({...newPost,content:e.target.value})}/>
                  <button onClick={handleSubmitPost} className="health-forum-submit-btn">Đăng bài</button>
                </div>
              </div>
            </aside>

            <main className="health-forum-main-content">
              <div className="health-forum-posts-header">
                <h2 className="health-forum-posts-title">{selectedGroup==='all'?'📝 Tất cả bài viết':`📝 ${topicGroups.find(g=>g.id===selectedGroup)?.name}`}</h2>
                <span className="health-forum-posts-count">{filteredPosts.length} bài viết</span>
              </div>
              <div className="health-forum-posts">
                {loading && <div className="health-forum-empty-state"><p>Đang tải...</p></div>}
                {error && !loading && <div className="health-forum-empty-state"><p>{error}</p></div>}
                {filteredPosts.map(post=>(
                  <article key={post.id} className="health-forum-post-card">
                    {post.trending && <div className="health-forum-trending-badge"><FaFire /> Trending</div>}
                    <div className="health-forum-post-header">
                      <div className="health-forum-post-author">
                        <span className="health-forum-author-avatar">{post.authorAvatar}</span>
                        <div className="health-forum-author-info">
                          <span className="health-forum-author-name">{post.author}</span>
                          <span className="health-forum-post-date"><FaClock /> {post.date}</span>
                        </div>
                      </div>
                      <span className="health-forum-post-group-badge" style={{backgroundColor:topicGroups.find(g=>g.id===post.group)?.color}}>
                        {topicGroups.find(g=>g.id===post.group)?.icon} {topicGroups.find(g=>g.id===post.group)?.name}
                      </span>
                    </div>
                    <h3 className="health-forum-post-title">{post.title}</h3>
                    <p className="health-forum-post-content">{post.content}</p>
                    <div className="health-forum-post-tags">
                      {post.tags.map(tag=><span key={tag} className="health-forum-post-tag"><FaTag/> {tag}</span>)}
                    </div>
                    <div className="health-forum-post-footer">
                      <div className="health-forum-post-stats">
                        <button className={`health-forum-stat-btn ${post.liked?'liked':''}`} onClick={()=>handleToggleLike(post.id)}>
                          {post.liked?<FaHeart/>:<FaRegHeart/>} {post.likes}
                        </button>
                        <button className="health-forum-stat-btn" onClick={()=>navigate(`${FORUM_QUESTION_ROUTE}/${post.id}#answers`)}>
                          <FaComment/> {post.comments}
                        </button>
                        <span className="health-forum-stat-views">👁️ {post.views} lượt xem</span>
                      </div>
                      <button className="health-forum-view-btn" onClick={()=>navigate(`${FORUM_QUESTION_ROUTE}/${post.id}`)}>Xem chi tiết →</button>
                    </div>
                  </article>
                ))}
                {filteredPosts.length===0 && !loading && <div className="health-forum-empty-state"><p>🔍 Không tìm thấy bài viết nào</p></div>}
              </div>
            </main>

            <aside className="health-forum-sidebar health-forum-sidebar-right">
              <div className="health-forum-widget">
                <h3 className="health-forum-widget-title"><FaTrophy /> Bảng xếp hạng</h3>
                <div className="health-forum-leaderboard">
                  {topContributors.length > 0 ? topContributors.map((c,i)=>{
                    const badge = i===0?'gold':i===1?'silver':i===2?'bronze':null;
                    const init = c.avatarUrl ? null : (c.name||c.email||'U').toString().trim().charAt(0).toUpperCase();
                    return (
                      <div key={c.id||i} className="health-forum-contributor-card">
                        <div className="health-forum-contributor-rank">
                          {i===0&&<span className="health-forum-rank-badge gold">🥇</span>}
                          {i===1&&<span className="health-forum-rank-badge silver">🥈</span>}
                          {i===2&&<span className="health-forum-rank-badge bronze">🥉</span>}
                          {i>2&&<span className="health-forum-rank-number">#{i+1}</span>}
                        </div>
                        <div className="health-forum-contributor-avatar">{c.avatarUrl?<img src={c.avatarUrl} alt={c.name}/>:init||'U'}</div>
                        <div className="health-forum-contributor-info">
                          <div className="health-forum-contributor-name">{c.name}{getBadgeIcon(badge)}</div>
                          <div className="health-forum-contributor-stats">
                            <span><FaStar/> {formatNumber(c.points)} điểm</span>
                            <span>📝 {formatNumber(c.answers)} trả lời</span>
                          </div>
                        </div>
                      </div>
                    );
                  }) : <div className="health-forum-empty-state"><p>📊 Chưa có dữ liệu xếp hạng.</p></div>}
                </div>
              </div>
              <div className="health-forum-widget">
                <h3 className="health-forum-widget-title">🔥 Thống kê</h3>
                <div className="health-forum-stats">
                  <div className="health-forum-stat-item"><span className="health-forum-stat-number">{formatNumber(forumStats.members)}</span><span className="health-forum-stat-label">Thành viên</span></div>
                  <div className="health-forum-stat-item"><span className="health-forum-stat-number">{formatNumber(forumStats.posts)}</span><span className="health-forum-stat-label">Câu hỏi đã duyệt</span></div>
                  <div className="health-forum-stat-item"><span className="health-forum-stat-number">{formatNumber(forumStats.comments)}</span><span className="health-forum-stat-label">Bình luận</span></div>
                </div>
              </div>
              {/* Gợi ý tham gia nhóm */}
              <div className="health-forum-widget">
                <h3 className="health-forum-widget-title"><FaUsers /> Nhóm nổi bật</h3>
                <div className="hf-suggested-groups">
                  {groups.slice(0,3).map(g=>(
                    <div key={g.id} className="hf-suggested-group-item" onClick={()=>{ setActiveTab('community'); }}>
                      <span className="hf-sg-icon">{g.icon||'👥'}</span>
                      <div>
                        <div className="hf-sg-name">{g.name}</div>
                        <div className="hf-sg-meta">{g.members_count||0} thành viên</div>
                      </div>
                      <FaChevronRight className="hf-sg-arrow"/>
                    </div>
                  ))}
                  <button className="hf-see-all-btn" onClick={()=>setActiveTab('community')}>Xem tất cả nhóm →</button>
                </div>
              </div>
            </aside>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════ */}
      {/* TAB 2: NHÓM CỘNG ĐỒNG                       */}
      {/* ════════════════════════════════════════════ */}
      {activeTab === 'community' && (
        <div className="hf-community-tab">
          {/* Toolbar tìm kiếm + lọc */}
          <div className="hf-community-toolbar">
            <div className="health-forum-search-bar" style={{flex:1}}>
              <FaSearch className="health-forum-search-icon"/>
              <input type="text" className="health-forum-search-input" placeholder="Tìm nhóm theo tên, chủ đề..." value={groupSearch} onChange={e=>setGroupSearch(e.target.value)}/>
            </div>
            <div className="hf-filter-btns">
              {[['all','Tất cả'],['official','Chính thống ✓'],['community','Cộng đồng']].map(([v,l])=>(
                <button key={v} className={`hf-filter-btn ${groupFilter===v?'active':''}`} onClick={()=>setGroupFilter(v)}>{l}</button>
              ))}
            </div>
            {canCreateGroup && (
              <button className="hf-btn-primary" onClick={()=>setShowCreateModal(true)}>
                <FaPlus /> Tạo nhóm
              </button>
            )}
          </div>

          {groupLoading && <div className="health-forum-empty-state"><p>Đang tải nhóm...</p></div>}

          {!groupLoading && groups.length === 0 && (
            <div className="health-forum-empty-state">
              <p>Chưa có nhóm cộng đồng nào phù hợp.</p>
              {canCreateGroup && (
                <button className="hf-btn-primary" style={{marginTop: 12}} onClick={() => setShowCreateModal(true)}>
                  + Tạo nhóm đầu tiên
                </button>
              )}
            </div>
          )}

          {!groupLoading && groups.length > 0 && (
            <div className="hf-groups-grid">
              {groups.map(g=>(
                <GroupCard
                  key={g.id}
                  group={g}
                  isMember={!!membershipMap[g.id]}
                  onJoin={handleJoinGroup}
                  onView={handleViewGroup}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════ */}
      {/* TAB 3: NHÓM CỦA TÔI                         */}
      {/* ════════════════════════════════════════════ */}
      {activeTab === 'my_groups' && user && (
        <div className="hf-community-tab">
          {groupLoading && <div className="health-forum-empty-state"><p>Đang tải nhóm của bạn...</p></div>}
          
          {!groupLoading && myGroups.length === 0 && (
            <div className="health-forum-empty-state">
              <p>👤 Bạn chưa tham gia nhóm nào.</p>
              <button className="hf-btn-primary" style={{marginTop: 12}} onClick={() => setActiveTab('community')}>
                → Khám phá nhóm ngay
              </button>
            </div>
          )}

          {!groupLoading && myGroups.length > 0 && (
            <div className="hf-groups-grid">
              {myGroups.map(group => (
                <GroupCard
                  key={group.id}
                  group={group}
                  onJoin={handleJoinGroup}
                  onView={handleViewGroup}
                  isMember={true}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: Tạo nhóm */}
      {showCreateModal && canCreateGroup && (
        <CreateGroupModal 
          onClose={() => setShowCreateModal(false)} 
          onCreated={handleGroupCreated} 
          doctors={availableDoctors} 
        />
      )}
    </div>
  );
};

export default HealthForumPage;