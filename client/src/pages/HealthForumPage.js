import React, { useState, useMemo } from 'react';
import { FaUser, FaClock, FaComment, FaSearch, FaFilter, FaTrophy, FaTag, FaUsers, FaFire, FaStar, FaHeart, FaMedal, FaThumbsUp, FaSortAmountDown, FaSortAmountUp } from 'react-icons/fa';
import './HealthForumPage.css';

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

  const samplePosts = [
    {
      id: 1,
      title: 'Cách duy trì sức khỏe tim mạch hiệu quả',
      author: 'Nguyễn Văn A',
      authorAvatar: '👨‍⚕️',
      date: '2025-10-10',
      content: 'Tôi muốn hỏi về các cách tập luyện để giữ sức khỏe tim mạch. Có bài tập nào phù hợp cho người mới bắt đầu không? Mọi người có thể chia sẻ kinh nghiệm của mình.',
      comments: 15,
      likes: 42,
      views: 234,
      group: 'cardio',
      tags: ['Tập luyện', 'Tư vấn', 'Phòng ngừa'],
      trending: true
    },
    {
      id: 2,
      title: 'Chế độ ăn uống cho người bị tiểu đường type 2',
      author: 'Trần Thị B',
      authorAvatar: '👩‍⚕️',
      date: '2025-10-09',
      content: 'Mọi người có thể chia sẻ thực đơn ăn uống hàng ngày cho người bị tiểu đường type 2 không? Tôi đang gặp khó khăn trong việc lập kế hoạch bữa ăn.',
      comments: 23,
      likes: 67,
      views: 456,
      group: 'diabetes',
      tags: ['Dinh dưỡng', 'Bệnh lý', 'Tư vấn']
    },
    {
      id: 3,
      title: 'Các bài tập yoga cho người mới bắt đầu',
      author: 'Lê Văn C',
      authorAvatar: '🧘',
      date: '2025-10-08',
      content: 'Tôi muốn bắt đầu tập yoga để cải thiện sức khỏe. Ai có thể gợi ý các bài tập đơn giản cho người mới không?',
      comments: 8,
      likes: 34,
      views: 189,
      group: 'fitness',
      tags: ['Tập luyện', 'Kinh nghiệm']
    },
    {
      id: 4,
      title: 'Làm thế nào để giảm căng thẳng trong công việc?',
      author: 'Phạm Thị D',
      authorAvatar: '👩‍💼',
      date: '2025-10-07',
      content: 'Công việc gần đây rất căng thẳng, mọi người có phương pháp nào để giảm stress hiệu quả không?',
      comments: 31,
      likes: 89,
      views: 678,
      group: 'mental',
      tags: ['Tư vấn', 'Kinh nghiệm'],
      trending: true
    },
    {
      id: 5,
      title: 'Thực đơn Eat Clean cho người bận rộn',
      author: 'Hoàng Văn E',
      authorAvatar: '👨‍🍳',
      date: '2025-10-06',
      content: 'Chia sẻ thực đơn ăn sạch đơn giản, dễ làm cho người đi làm. Có thể chuẩn bị trước được không?',
      comments: 19,
      likes: 56,
      views: 345,
      group: 'nutrition',
      tags: ['Dinh dưỡng', 'Kinh nghiệm']
    }
  ];

  const topContributors = [
    { name: 'Dr. Minh', avatar: '👨‍⚕️', points: 2450, posts: 89, badge: 'gold' },
    { name: 'Hoa Nguyễn', avatar: '👩‍⚕️', points: 2103, posts: 76, badge: 'gold' },
    { name: 'PT. An', avatar: '💪', points: 1876, posts: 64, badge: 'silver' },
    { name: 'Dinh dưỡng viên Thu', avatar: '🥗', points: 1654, posts: 58, badge: 'silver' },
    { name: 'Tâm lý viên Lan', avatar: '🧠', points: 1432, posts: 52, badge: 'bronze' }
  ];

  const filteredPosts = useMemo(() => {
    let filtered = [...samplePosts];

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
  }, [searchTerm, selectedGroup, selectedTags, sortBy, samplePosts]);

  const handleSubmitPost = () => {
    if (newPost.title && newPost.content) {
      alert('Chức năng gửi bài đang được phát triển!');
      setNewPost({ title: '', content: '', tags: [], group: '' });
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
                    <button className="health-forum-stat-btn">
                      <FaHeart /> {post.likes}
                    </button>
                    <button className="health-forum-stat-btn">
                      <FaComment /> {post.comments}
                    </button>
                    <span className="health-forum-stat-views">
                      👁️ {post.views} lượt xem
                    </span>
                  </div>
                  <button className="health-forum-view-btn">
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
              {topContributors.map((contributor, index) => (
                <div key={index} className="health-forum-contributor-card">
                  <div className="health-forum-contributor-rank">
                    {index === 0 && <span className="health-forum-rank-badge gold">🥇</span>}
                    {index === 1 && <span className="health-forum-rank-badge silver">🥈</span>}
                    {index === 2 && <span className="health-forum-rank-badge bronze">🥉</span>}
                    {index > 2 && <span className="health-forum-rank-number">#{index + 1}</span>}
                  </div>
                  <span className="health-forum-contributor-avatar">{contributor.avatar}</span>
                  <div className="health-forum-contributor-info">
                    <div className="health-forum-contributor-name">
                      {contributor.name}
                      {getBadgeIcon(contributor.badge)}
                    </div>
                    <div className="health-forum-contributor-stats">
                      <span><FaStar /> {contributor.points} điểm</span>
                      <span>📝 {contributor.posts} bài</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="health-forum-widget">
            <h3 className="health-forum-widget-title">
              🔥 Thống kê
            </h3>
            <div className="health-forum-stats">
              <div className="health-forum-stat-item">
                <span className="health-forum-stat-number">1,234</span>
                <span className="health-forum-stat-label">Thành viên</span>
              </div>
              <div className="health-forum-stat-item">
                <span className="health-forum-stat-number">567</span>
                <span className="health-forum-stat-label">Bài viết</span>
              </div>
              <div className="health-forum-stat-item">
                <span className="health-forum-stat-number">3,456</span>
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