import React, { useState, useMemo, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { FaUser, FaClock, FaComment, FaSearch, FaFilter, FaTrophy, FaTag, FaUsers, FaFire, FaStar, FaHeart, FaRegHeart, FaMedal, FaThumbsUp, FaSortAmountDown, FaSortAmountUp } from 'react-icons/fa';
import './HealthForumPage.css';
import forumService from '../services/forumService';
import { FORUM_QUESTION_ROUTE } from '../utils/constants';

const HealthForumPage = () => {
  const [newPost, setNewPost] = useState({ title: '', content: '', tags: [], group: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedTags, setSelectedTags] = useState([]);
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);

  const groups = [
    { id: 'all', name: 'Tất cả', icon: '🏥', color: '#4CAF50' },
    { id: 'cardio', name: 'Tim mạch', icon: '❤️', color: '#E91E63' },
    { id: 'diabetes', name: 'Tiểu đường', icon: '🩺', color: '#FF9800' },
    { id: 'nutrition', name: 'Dinh dưỡng', icon: '🥗', color: '#8BC34A' },
    { id: 'mental', name: 'Sức khỏe tinh thần', icon: '🧠', color: '#9C27B0' },
    { id: 'fitness', name: 'Thể dục', icon: '💪', color: '#2196F3' }
  ];

  const popularTags = [
    'Tập luyện', 'Dinh dưỡng', 'Thuốc men', 'Bệnh lý', 
    'Tư vấn', 'Kinh nghiệm', 'Phòng ngừa', 'Điều trị'
  ];

  const navigate = useNavigate();
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

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [topContributors, setTopContributors] = useState([]);
  const [forumStats, setForumStats] = useState({
    members: 0,
    posts: 0,
    comments: 0,
  });
  const [fallbackStats, setFallbackStats] = useState({
    members: 0,
    posts: 0,
    comments: 0,
  });
  const [fallbackContributors, setFallbackContributors] = useState([]);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoading(true);
        setError('');
        const result = await forumService.getPublicQuestions({ page: 1, limit: 20, search: searchTerm });
        const apiQuestions = result?.data?.questions || [];
        setQuestions(apiQuestions);
      } catch (e) {
        setError('Không tải được danh sách câu hỏi');
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  useEffect(() => {
    const computeFallback = () => {
      if (!Array.isArray(questions) || questions.length === 0) {
        setFallbackStats({ members: 0, posts: 0, comments: 0 });
        setFallbackContributors([]);
        return;
      }

      const memberMap = new Map();
      let totalComments = 0;

      questions.forEach((q) => {
        const authorId = q.author?.id ?? `anon-${q.id}`;
        const displayName =
          q.author?.fullName ||
          q.author?.email ||
          (typeof authorId === 'number' ? `Người dùng #${authorId}` : 'Ẩn danh');

        const existing = memberMap.get(authorId) || {
          id: authorId,
          name: displayName,
          email: q.author?.email || null,
          avatarUrl: q.author?.avatar || null,
          role: q.author?.role || 'patient',
          answers: 0,
          likes: 0,
          posts: 0,
          views: 0,
        };

        existing.posts += 1;
        existing.answers += Number(q.answerCount || 0);
        existing.likes += Number(q.likesCount || 0);
        existing.views += Number(q.viewsCount || 0);

        memberMap.set(authorId, existing);
        totalComments += Number(q.answerCount || 0);
      });

      const contributors = Array.from(memberMap.values())
        .map((entry) => ({
          ...entry,
          points:
            entry.answers * 10 +
            entry.likes * 2 +
            entry.posts * 4 +
            Math.round(entry.views || 0),
        }))
        .sort((a, b) => b.points - a.points)
        .slice(0, 5);

      const statsPayload = {
        members: memberMap.size,
        posts: questions.length,
        comments: totalComments,
      };

      setFallbackStats(statsPayload);
      setFallbackContributors(contributors);

      setForumStats((prev) => {
        const hasPrevData =
          prev &&
          (Number(prev.members || 0) > 0 ||
            Number(prev.posts || 0) > 0 ||
            Number(prev.comments || 0) > 0);
        return hasPrevData ? prev : statsPayload;
      });

      setTopContributors((prev) => {
        if (Array.isArray(prev) && prev.length > 0) {
          return prev;
        }
        return contributors;
      });
    };

    computeFallback();
  }, [questions]);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const overview = await forumService.getForumOverview();
        const contributors = overview?.data?.contributors || [];
        const stats = overview?.data?.stats || {};

        const hasStats =
          Number(stats.totalMembers || 0) > 0 ||
          Number(stats.approvedQuestions || 0) > 0 ||
          Number(stats.totalAnswers || 0) > 0;
        const hasContributors = Array.isArray(contributors) && contributors.length > 0;

        if (hasStats) {
          setForumStats({
            members: Number(stats.totalMembers || 0),
            posts: Number(stats.approvedQuestions || 0),
            comments: Number(stats.totalAnswers || 0),
          });
        } else {
          setForumStats(fallbackStats);
        }

        if (hasContributors) {
          setTopContributors(contributors);
        } else {
          setTopContributors(fallbackContributors);
        }
      } catch (e) {
        console.error('Không thể tải dữ liệu bảng xếp hạng:', e);
        setForumStats(fallbackStats);
        setTopContributors(fallbackContributors);
      }
    };

    fetchOverview();
  }, [fallbackStats, fallbackContributors]);

  const showMessage = (message, type = 'info') => {
    if (window.showNotification) {
      window.showNotification(message, type);
    } else {
      alert(message);
    }
  };

  const filteredPosts = useMemo(() => {
    const mapped = questions.map((q) => ({
      id: q.id,
      title: q.title,
      content: q.content,
      author: q.author?.fullName || 'Ẩn danh',
      authorAvatar: q.author?.avatar ? '🧑‍⚕️' : '👤',
      date: q.createdAt ? new Date(q.createdAt).toLocaleDateString() : '',
      comments: q.answerCount || 0,
      likes: q.likesCount || 0,
      views: q.viewsCount || 0,
      group: q.specialty?.slug || 'all',
      tags: Array.isArray(q.tags) ? q.tags : [],
      trending: !!q.isPinned,
      liked: !!q.liked,
    }));

    let filtered = [...mapped];

    if (searchTerm) {
      filtered = filtered.filter(post =>
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.author.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedGroup !== 'all') {
      filtered = filtered.filter(post => post.group === selectedGroup);
    }

    if (selectedTags.length > 0) {
      filtered = filtered.filter(post =>
        selectedTags.some(tag => post.tags.includes(tag))
      );
    }

    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
        break;
      case 'popular':
        filtered.sort((a, b) => b.likes - a.likes);
        break;
      case 'commented':
        filtered.sort((a, b) => b.comments - a.comments);
        break;
      default:
        break;
    }

    return filtered;
  }, [searchTerm, selectedGroup, selectedTags, sortBy, questions]);

  const handleSubmitPost = async () => {
    if (!user) {
      showMessage('Vui lòng đăng nhập để đăng câu hỏi.', 'warning');
      navigate('/login');
      return;
    }

    if (!newPost.title || !newPost.content) {
      showMessage('Vui lòng nhập đầy đủ tiêu đề và nội dung câu hỏi.', 'warning');
      return;
    }
    try {
      setLoading(true);
      // Map optional group to specialty if needed (basic mapping by id -> slug)
      const specialtyId = null; // could map from selectedGroup to backend specialty if required
      const tags = newPost.tags;
      await forumService.createQuestion({
        title: newPost.title,
        content: newPost.content,
        specialtyId,
        tags,
        isAnonymous: false,
        images: []
      });
      setNewPost({ title: '', content: '', tags: [], group: '' });
      showMessage('Đăng câu hỏi thành công! Vui lòng chờ duyệt.', 'success');
      // Refresh list
      const result = await forumService.getPublicQuestions({ page: 1, limit: 20, search: '' });
      setQuestions(result?.data?.questions || []);
    } catch (e) {
      console.error('Gửi câu hỏi thất bại:', e);
      showMessage('Gửi câu hỏi thất bại, vui lòng thử lại.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLike = async (questionId) => {
    if (!user) {
      showMessage('Vui lòng đăng nhập để thả tim câu hỏi.', 'warning');
      navigate('/login');
      return;
    }

    try {
      const response = await forumService.toggleQuestionLike(questionId);
      if (response?.success) {
        setQuestions((prev) =>
          prev.map((q) =>
            q.id === questionId
              ? { ...q, likesCount: response.data.likesCount, liked: response.data.liked }
              : q
          )
        );
      }
    } catch (err) {
      console.error('Không thể cập nhật lượt thích:', err);
      showMessage('Không thể cập nhật lượt thích. Vui lòng thử lại.', 'error');
    }
  };

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const getBadgeIcon = (badge) => {
    switch (badge) {
      case 'gold': return <FaTrophy className="health-forum-badge-icon health-forum-gold" />;
      case 'silver': return <FaMedal className="health-forum-badge-icon health-forum-silver" />;
      case 'bronze': return <FaMedal className="health-forum-badge-icon health-forum-bronze" />;
      default: return null;
    }
  };

  const formatNumber = (value) => {
    const numeric = Number(value || 0);
    return Number.isNaN(numeric) ? '0' : numeric.toLocaleString('vi-VN');
  };

  return (
    <div className="health-forum-container">
      <div className="health-forum-header">
        <div className="health-forum-header-content">
          <h1 className="health-forum-title">🏥 Diễn đàn Sức khỏe</h1>
          <p className="health-forum-subtitle">Cộng đồng chia sẻ kiến thức và kinh nghiệm về sức khỏe</p>
        </div>
      </div>

      <div className="health-forum-search-section">
        <div className="health-forum-search-bar">
          <FaSearch className="health-forum-search-icon" />
          <input
            type="text"
            className="health-forum-search-input"
            placeholder="Tìm kiếm bài viết, tác giả, chủ đề..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          className="health-forum-filter-toggle"
          onClick={() => setShowFilters(!showFilters)}
        >
          <FaFilter /> Bộ lọc {showFilters ? '▲' : '▼'}
        </button>
      </div>

      {showFilters && (
        <div className="health-forum-filters">
          <div className="health-forum-filter-section">
            <h3 className="health-forum-filter-title">Sắp xếp theo</h3>
            <div className="health-forum-sort-buttons">
              <button
                className={`health-forum-sort-btn ${sortBy === 'newest' ? 'active' : ''}`}
                onClick={() => setSortBy('newest')}
              >
                <FaSortAmountDown /> Mới nhất
              </button>
              <button
                className={`health-forum-sort-btn ${sortBy === 'oldest' ? 'active' : ''}`}
                onClick={() => setSortBy('oldest')}
              >
                <FaSortAmountUp /> Cũ nhất
              </button>
              <button
                className={`health-forum-sort-btn ${sortBy === 'popular' ? 'active' : ''}`}
                onClick={() => setSortBy('popular')}
              >
                <FaFire /> Phổ biến
              </button>
              <button
                className={`health-forum-sort-btn ${sortBy === 'commented' ? 'active' : ''}`}
                onClick={() => setSortBy('commented')}
              >
                <FaComment /> Nhiều bình luận
              </button>
            </div>
          </div>

          <div className="health-forum-filter-section">
            <h3 className="health-forum-filter-title">Tags phổ biến</h3>
            <div className="health-forum-tags-filter">
              {popularTags.map(tag => (
                <button
                  key={tag}
                  className={`health-forum-tag-btn ${selectedTags.includes(tag) ? 'active' : ''}`}
                  onClick={() => toggleTag(tag)}
                >
                  <FaTag /> {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="health-forum-main-layout">
        <aside className="health-forum-sidebar health-forum-sidebar-left">
          <div className="health-forum-widget">
            <h3 className="health-forum-widget-title">
              <FaUsers /> Nhóm chủ đề
            </h3>
            <div className="health-forum-groups">
              {groups.map(group => (
                <button
                  key={group.id}
                  className={`health-forum-group-btn ${selectedGroup === group.id ? 'active' : ''}`}
                  onClick={() => setSelectedGroup(group.id)}
                  style={{ '--group-color': group.color }}
                >
                  <span className="health-forum-group-icon">{group.icon}</span>
                  <span className="health-forum-group-name">{group.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="health-forum-widget health-forum-new-post-widget">
            <h3 className="health-forum-widget-title">✍️ Tạo bài mới</h3>
            <div className="health-forum-post-form">
              <input
                type="text"
                className="health-forum-form-input"
                placeholder="Tiêu đề bài viết..."
                value={newPost.title}
                onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
              />
              <textarea
                className="health-forum-form-textarea"
                placeholder="Nội dung bài viết..."
                value={newPost.content}
                onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
              />
              <button onClick={handleSubmitPost} className="health-forum-submit-btn">
                Đăng bài
              </button>
            </div>
          </div>
        </aside>

        <main className="health-forum-main-content">
          <div className="health-forum-posts-header">
            <h2 className="health-forum-posts-title">
              {selectedGroup === 'all' ? '📝 Tất cả bài viết' : `📝 ${groups.find(g => g.id === selectedGroup)?.name}`}
            </h2>
            <span className="health-forum-posts-count">{filteredPosts.length} bài viết</span>
          </div>

          <div className="health-forum-posts">
            {loading && (
              <div className="health-forum-empty-state">
                <p>Đang tải...</p>
              </div>
            )}
            {error && !loading && (
              <div className="health-forum-empty-state">
                <p>{error}</p>
              </div>
            )}
            {filteredPosts.map((post) => (
              <article key={post.id} className="health-forum-post-card">
                {post.trending && (
                  <div className="health-forum-trending-badge">
                    <FaFire /> Trending
                  </div>
                )}
                
                <div className="health-forum-post-header">
                  <div className="health-forum-post-author">
                    <span className="health-forum-author-avatar">{post.authorAvatar}</span>
                    <div className="health-forum-author-info">
                      <span className="health-forum-author-name">{post.author}</span>
                      <span className="health-forum-post-date">
                        <FaClock /> {post.date}
                      </span>
                    </div>
                  </div>
                  <span 
                    className="health-forum-post-group-badge"
                    style={{ backgroundColor: groups.find(g => g.id === post.group)?.color }}
                  >
                    {groups.find(g => g.id === post.group)?.icon} {groups.find(g => g.id === post.group)?.name}
                  </span>
                </div>

                <h3 className="health-forum-post-title">{post.title}</h3>
                <p className="health-forum-post-content">{post.content}</p>

                <div className="health-forum-post-tags">
                  {post.tags.map(tag => (
                    <span key={tag} className="health-forum-post-tag">
                      <FaTag /> {tag}
                    </span>
                  ))}
                </div>

                <div className="health-forum-post-footer">
                  <div className="health-forum-post-stats">
                    <button
                      className={`health-forum-stat-btn ${post.liked ? 'liked' : ''}`}
                      onClick={() => handleToggleLike(post.id)}
                    >
                      {post.liked ? <FaHeart /> : <FaRegHeart />} {post.likes}
                    </button>
                    <button
                      className="health-forum-stat-btn"
                      onClick={() => navigate(`${FORUM_QUESTION_ROUTE}/${post.id}#answers`)}
                    >
                      <FaComment /> {post.comments}
                    </button>
                    <span className="health-forum-stat-views">
                      👁️ {post.views} lượt xem
                    </span>
                  </div>
                  <button
                    className="health-forum-view-btn"
                    onClick={() => navigate(`${FORUM_QUESTION_ROUTE}/${post.id}`)}
                  >
                    Xem chi tiết →
                  </button>
                </div>
              </article>
            ))}

            {filteredPosts.length === 0 && (
              <div className="health-forum-empty-state">
                <p>🔍 Không tìm thấy bài viết nào phù hợp</p>
              </div>
            )}
          </div>
        </main>

        <aside className="health-forum-sidebar health-forum-sidebar-right">
          <div className="health-forum-widget">
            <h3 className="health-forum-widget-title">
              <FaTrophy /> Bảng xếp hạng
            </h3>
            <div className="health-forum-leaderboard">
              {topContributors.length > 0 ? (
                topContributors.map((contributor, index) => {
                  const badge = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : null;
                  const avatarInitial =
                    contributor.avatarUrl
                      ? null
                      : (contributor.name || contributor.email || 'U')
                          .toString()
                          .trim()
                          .charAt(0)
                          .toUpperCase();

                  return (
                    <div key={contributor.id || index} className="health-forum-contributor-card">
                      <div className="health-forum-contributor-rank">
                        {index === 0 && <span className="health-forum-rank-badge gold">🥇</span>}
                        {index === 1 && <span className="health-forum-rank-badge silver">🥈</span>}
                        {index === 2 && <span className="health-forum-rank-badge bronze">🥉</span>}
                        {index > 2 && <span className="health-forum-rank-number">#{index + 1}</span>}
                      </div>
                      <div className="health-forum-contributor-avatar">
                        {contributor.avatarUrl ? (
                          <img src={contributor.avatarUrl} alt={contributor.name} />
                        ) : (
                          avatarInitial || 'U'
                        )}
                      </div>
                      <div className="health-forum-contributor-info">
                        <div className="health-forum-contributor-name">
                          {contributor.name}
                          {getBadgeIcon(badge)}
                        </div>
                        <div className="health-forum-contributor-stats">
                          <span><FaStar /> {formatNumber(contributor.points)} điểm</span>
                          <span>📝 {formatNumber(contributor.answers)} câu trả lời</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="health-forum-empty-state">
                  <p>📊 Chưa có dữ liệu xếp hạng.</p>
                </div>
              )}
            </div>
          </div>

          <div className="health-forum-widget">
            <h3 className="health-forum-widget-title">
              🔥 Thống kê
            </h3>
            <div className="health-forum-stats">
              <div className="health-forum-stat-item">
                <span className="health-forum-stat-number">{formatNumber(forumStats.members)}</span>
                <span className="health-forum-stat-label">Thành viên</span>
              </div>
              <div className="health-forum-stat-item">
                <span className="health-forum-stat-number">{formatNumber(forumStats.posts)}</span>
                <span className="health-forum-stat-label">Câu hỏi đã duyệt</span>
              </div>
              <div className="health-forum-stat-item">
                <span className="health-forum-stat-number">{formatNumber(forumStats.comments)}</span>
                <span className="health-forum-stat-label">Bình luận</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default HealthForumPage;
