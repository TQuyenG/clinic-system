// client/src/pages/CommunityGroupPage.js
import React, { useState, useEffect, useRef, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import communityService from '../services/communityService';
import './CommunityGroupPage.css';
// 1. IMPORT ẢNH AVATAR MẶC ĐỊNH TỪ THƯ MỤC ASSETS CỦA BẠN
import defaultAvatar from '../assets/images/avatar-default.jpg';

// 2. HÀM XỬ LÝ ẢNH SIÊU CẤP (CHẶN MỌI LỖI RÁC)
const getImageUrl = (url, isAvatar = false) => {
  const fallback = isAvatar ? defaultAvatar : 'https://via.placeholder.com/400x300?text=Anh+Bi+Loi';
  
  if (!url) return fallback;

  // CHẶN ĐỨNG: Nếu database trả về link rác chứa chữ "blob", cho hiện ảnh fallback luôn để khỏi lỗi đỏ màn hình
  if (url.includes('blob:')) return fallback;

  // Nếu là link web bình thường hoặc chuỗi Base64
  if (url.startsWith('http') || url.startsWith('data:')) return url;

  // Nếu là link file tải lên backend (/uploads/...)
  return `http://localhost:3001${url.startsWith('/') ? '' : '/'}${url}`;
};


// ── ICONS (dùng text/emoji để không cần thêm lib) ──────────────────────────

const CommunityGroupPage = () => {
  const navigate = useNavigate();
  const { slug } = useParams();
  const { user, isAuthenticated } = useContext(AuthContext);

  const [group, setGroup] = useState(null);
  const [posts, setPosts] = useState([]);
  const [membershipStatus, setMembershipStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts');
  const [pendingPosts, setPendingPosts] = useState([]);
  const [reportedPosts, setReportedPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showEmergencyPopup, setShowEmergencyPopup] = useState(false);
  const [emergencyMessage, setEmergencyMessage] = useState('');
  const [page, setPage] = useState(1);
  const [totalPosts, setTotalPosts] = useState(0);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [members, setMembers] = useState([]);
  const [coverImageMenu, setCoverImageMenu] = useState(false);
  const [avatarImageMenu, setAvatarImageMenu] = useState(false);
  const [coverPreview, setCoverPreview] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [toast, setToast] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const POSTS_LIMIT = 10;

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // FETCH group
  useEffect(() => {
    const fetchGroup = async () => {
      try {
        setLoading(true);
        const response = await communityService.getGroupBySlug(slug);
        const groupData = response.data.data ? response.data.data : response.data;
        setGroup(groupData);
        setMembershipStatus(groupData.membershipStatus);
        if (groupData.cover_image) setCoverPreview(groupData.cover_image);
        if (groupData.avatar_image) setAvatarPreview(groupData.avatar_image);
      } catch (error) {
        if (error.response?.status === 404) navigate('/cong-dong');
      } finally {
        setLoading(false);
      }
    };
    fetchGroup();
  }, [slug, navigate]);

  // FETCH posts
  // FETCH posts
  useEffect(() => {
    if (!group) return;
    const fetchPosts = async () => {
      try {
        setPostsLoading(true);
        const response = await communityService.getGroupPosts(group.id, { page, limit: POSTS_LIMIT });
        const postData = response.data.data ? response.data.data : response.data;
        setPosts(postData.posts || []);
        setTotalPosts(postData.total || 0);
      } catch (error) {
        console.error('Lỗi tải bài đăng:', error);
      } finally {
        setPostsLoading(false);
      }
    };
    fetchPosts();
  }, [group, page, refreshKey]);

  const canManageGroup = user && group && (
    user.role === 'admin' ||
    (user.role === 'doctor' && group.doctor_id === user.id) ||
    (user.role === 'staff' && group.created_by === user.id)
  );

  const isOwnerOrMod = user && group && (
    membershipStatus?.role === 'owner' ||
    membershipStatus?.role === 'moderator' ||
    canManageGroup
  );

  // FETCH manage data
  useEffect(() => {
    if (activeTab === 'manage' && group && canManageGroup) {
      const fetchManageData = async () => {
        try {
          const [pendingRes, reportedRes] = await Promise.all([
            communityService.getPendingGroupPosts(group.id),
            communityService.getReportedGroupPosts(group.id),
          ]);
          const pendingData = pendingRes.data?.data || pendingRes.data;
          const reportedData = reportedRes.data?.data || reportedRes.data;
          setPendingPosts(Array.isArray(pendingData) ? pendingData : []);
          setReportedPosts(Array.isArray(reportedData) ? reportedData : []);
        } catch (error) {
          console.error('Lỗi tải dữ liệu quản lý:', error);
        }
      };
      fetchManageData();
    }
  }, [activeTab, group, canManageGroup]);

  const handleJoinGroup = async () => {
    if (!isAuthenticated) { navigate('/dang-nhap'); return; }
    try {
      const response = await communityService.joinGroup(group.id, '');
      setMembershipStatus(response.data.status);
      showToast(response.data.message || 'Đã tham gia nhóm!');
    } catch (error) {
      showToast(error.response?.data?.message || 'Lỗi tham gia nhóm', 'error');
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm('Bạn chắc chắn muốn rời nhóm này?')) return;
    try {
      await communityService.leaveGroup(group.id);
      setMembershipStatus(null);
      showToast('Đã rời nhóm');
    } catch (error) {
      showToast(error.response?.data?.message || 'Lỗi rời nhóm', 'error');
    }
  };

  const handleOpenMembers = () => {
    // Dùng members_count + mock data từ group, hoặc gọi API nếu có
    setShowMembersModal(true);
  };

  const canPost = membershipStatus?.role &&
    ['owner', 'moderator', 'member'].includes(membershipStatus.role) &&
    membershipStatus?.status === 'active';

  const handleApprovePost = async (postId) => {
    try {
      await communityService.approvePost(postId);
      setPendingPosts(prev => prev.filter(p => p.id !== postId));
      showToast('✅ Đã duyệt bài viết!');
    } catch (err) {
      showToast('Lỗi duyệt bài: ' + (err.response?.data?.message || err.message), 'error');
    }
  };

  const handleRejectPost = async (postId) => {
    const reason = window.prompt('Nhập lý do từ chối (bỏ trống cũng được):');
    if (reason === null) return;
    try {
      await communityService.rejectPost(postId, reason);
      setPendingPosts(prev => prev.filter(p => p.id !== postId));
      showToast('Đã từ chối bài viết');
    } catch (err) {
      showToast('Lỗi từ chối: ' + (err.response?.data?.message || err.message), 'error');
    }
  };

  const totalPages = Math.ceil(totalPosts / POSTS_LIMIT);

  if (loading) return (
    <div className="cgp-loading">
      <div className="cgp-spinner"></div>
      <p>Đang tải nhóm...</p>
    </div>
  );

  if (!group) return (
    <div className="cgp-empty">
      <div className="cgp-empty-icon">😔</div>
      <p>Không tìm thấy nhóm</p>
      <button className="cgp-btn-primary" onClick={() => navigate('/cong-dong')}>Quay lại</button>
    </div>
  );

  return (
    <div className="cgp-root">
      {/* TOAST */}
      {toast && (
        <div className={`cgp-toast cgp-toast-${toast.type}`}>{toast.msg}</div>
      )}

      {/* ── COVER IMAGE ─────────────────────────────────── */}
      <div className="cgp-cover-wrap">
        <div
          className="cgp-cover"
          style={{
            backgroundImage: coverPreview
              ? `url(${coverPreview})`
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          }}
        >
          <div className="cgp-cover-overlay" />

          {/* Nút tương tác ảnh bìa */}
          {isOwnerOrMod && (
            <div className="cgp-cover-edit">
              <button
                className="cgp-img-menu-btn"
                onClick={() => { setCoverImageMenu(v => !v); setAvatarImageMenu(false); }}
              >
                📷 Ảnh bìa
              </button>
              {coverImageMenu && (
                <div className="cgp-img-dropdown">
                  <button onClick={() => { setCoverImageMenu(false); }}>🔍 Xem ảnh bìa</button>
                  <label>
                    🖼️ Đổi ảnh bìa
                    <input type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={e => {
                        const f = e.target.files[0];
                        if (f) { setCoverPreview(URL.createObjectURL(f)); showToast('Đã cập nhật ảnh bìa (preview)'); }
                        setCoverImageMenu(false);
                      }}
                    />
                  </label>
                </div>
              )}
            </div>
          )}
        </div>

        {/* AVATAR + INFO ROW */}
        <div className="cgp-cover-bottom">
          <div className="cgp-avatar-wrap">
            <div
              className="cgp-group-avatar"
              style={{ backgroundImage: avatarPreview ? `url(${avatarPreview})` : undefined }}
            >
              {!avatarPreview && <span className="cgp-group-avatar-icon">{group.icon || '👥'}</span>}
            </div>
            {isOwnerOrMod && (
              <div className="cgp-avatar-edit-wrap">
                <button
                  className="cgp-avatar-edit-btn"
                  onClick={() => { setAvatarImageMenu(v => !v); setCoverImageMenu(false); }}
                >
                  ✏️
                </button>
                {avatarImageMenu && (
                  <div className="cgp-img-dropdown cgp-img-dropdown-avatar">
                    <button onClick={() => { setAvatarImageMenu(false); }}>🔍 Xem ảnh đại diện</button>
                    <label>
                      🖼️ Đổi ảnh đại diện
                      <input type="file" accept="image/*" style={{ display: 'none' }}
                        onChange={e => {
                          const f = e.target.files[0];
                          if (f) { setAvatarPreview(URL.createObjectURL(f)); showToast('Đã cập nhật ảnh đại diện (preview)'); }
                          setAvatarImageMenu(false);
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="cgp-cover-info">
            <h1 className="cgp-group-name">{group.name}</h1>
            <div className="cgp-cover-meta">
              <span className={`cgp-badge cgp-badge-${group.type}`}>
                {group.type === 'official' ? '✅ Chính Thức' : '👥 Cộng Đồng'}
              </span>
              <span className="cgp-badge cgp-badge-privacy">
                {group.privacy === 'public' && '🔓 Công khai'}
                {group.privacy === 'private' && '🔒 Riêng tư'}
                {group.privacy === 'invite_only' && '📨 Chỉ qua lời mời'}
              </span>
              <button className="cgp-stat-link" onClick={handleOpenMembers}>
                👥 {group.members_count} thành viên
              </button>
              <span>📝 {group.posts_count} bài đăng</span>
            </div>
          </div>

          <div className="cgp-cover-actions">
            {!membershipStatus ? (
              <button className="cgp-btn-primary cgp-btn-join" onClick={handleJoinGroup}>
                ➕ Tham Gia
              </button>
            ) : membershipStatus?.status === 'banned' ? (
              <button className="cgp-btn-banned" disabled>❌ Đã bị cấm</button>
            ) : membershipStatus?.status === 'muted' ? (
              <button className="cgp-btn-muted" disabled>🔇 Bị hạn chế</button>
            ) : (
              <>
                {canPost && (
                  <button className="cgp-btn-primary" onClick={() => setShowPostModal(true)}>
                    ✍️ Đăng bài
                  </button>
                )}
                <button className="cgp-btn-outline" onClick={handleLeaveGroup}>Rời nhóm</button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── MAIN LAYOUT ─────────────────────────────────── */}
      <div className="cgp-layout">
        {/* LEFT: Posts */}
        <div className="cgp-main">

          {/* TABS */}
          <div className="cgp-tabs">
            {[
              { key: 'posts', label: '📝 Bài Đăng' },
              ...(canManageGroup ? [{ key: 'manage', label: `⚙️ Quản Lý${pendingPosts.length > 0 ? ` (${pendingPosts.length})` : ''}` }] : []),
              ...(isOwnerOrMod ? [{ key: 'settings', label: '🛠️ Cài Đặt' }] : []),
            ].map(tab => (
              <button
                key={tab.key}
                className={`cgp-tab${activeTab === tab.key ? ' cgp-tab-active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB: POSTS */}
          {activeTab === 'posts' && (
            <>
              {canPost && (
                <div className="cgp-post-composer" onClick={() => setShowPostModal(true)}>
                  <div className="cgp-composer-avatar">
                    {user?.avatar_url ? (
                      <img src={user.avatar_url} alt="" />
                    ) : (
                      <div className="cgp-composer-avatar-placeholder">{(user?.full_name || 'U')[0]}</div>
                    )}
                  </div>
                  <div className="cgp-composer-input">Bạn đang nghĩ gì? Chia sẻ với cộng đồng...</div>
                  <button className="cgp-btn-primary">Đăng</button>
                </div>
              )}

              {postsLoading ? (
                <div className="cgp-loading"><div className="cgp-spinner" /><p>Đang tải...</p></div>
              ) : posts.length === 0 ? (
                <div className="cgp-empty-posts">
                  <div className="cgp-empty-icon">📭</div>
                  <p>Chưa có bài đăng nào</p>
                  {canPost && (
                    <button className="cgp-btn-primary" onClick={() => setShowPostModal(true)}>
                      Hãy là người đầu tiên đăng bài
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {posts.map(post => (
                    <div key={post.id}>
                      {/* Dùng post.author thay vì post.User */}
                      <span>{post.author?.full_name || 'Người dùng hệ thống'}</span>
                    </div>
                  ))}
                  {totalPages > 1 && (
                    <div className="cgp-pagination">
                      <button className="cgp-btn-outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Trước</button>
                      <span>{page} / {totalPages}</span>
                      <button className="cgp-btn-outline" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Sau →</button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* TAB: MANAGE */}
          {activeTab === 'manage' && canManageGroup && (
            <div className="cgp-manage">
              <div className="cgp-manage-section">
                <div className="cgp-manage-header">
                  <span className="cgp-manage-dot cgp-dot-yellow" />
                  <h3>Chờ duyệt <span className="cgp-count-badge">{pendingPosts.length}</span></h3>
                </div>
                {pendingPosts.length === 0 ? (
                  <div className="cgp-manage-empty">✅ Không có bài viết nào đang chờ duyệt</div>
                ) : (
                  pendingPosts.map(post => (
                    <PostCard
                      key={post.id}
                      post={post}
                      group={group}
                      currentUser={user}
                      onEmergency={(msg) => { setEmergencyMessage(msg); setShowEmergencyPopup(true); }}
                      onApprove={handleApprovePost}
                      onReject={handleRejectPost}
                    />
                  ))
                )}
              </div>

              <div className="cgp-manage-section">
                <div className="cgp-manage-header">
                  <span className="cgp-manage-dot cgp-dot-red" />
                  <h3>Bị báo cáo <span className="cgp-count-badge cgp-count-red">{reportedPosts.length}</span></h3>
                </div>
                {reportedPosts.length === 0 ? (
                  <div className="cgp-manage-empty">✅ Không có bài viết bị báo cáo</div>
                ) : (
                  reportedPosts.map(post => (
                    <PostCard
                      key={post.id}
                      post={post}
                      group={group}
                      currentUser={user}
                      onEmergency={(msg) => { setEmergencyMessage(msg); setShowEmergencyPopup(true); }}
                      onApprove={handleApprovePost}
                      onReject={handleRejectPost}
                    />
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB: SETTINGS */}
          {activeTab === 'settings' && isOwnerOrMod && (
            <GroupSettings group={group} onUpdate={(updated) => { setGroup(prev => ({ ...prev, ...updated })); showToast('Đã cập nhật nhóm!'); }} />
          )}
        </div>

        {/* RIGHT: Sidebar */}
        <aside className="cgp-sidebar">
          {/* Doctor Card */}
          {group.doctor && (
            <div className="cgp-sidebar-card cgp-doctor-card">
              <div className="cgp-sidebar-card-title">👨‍⚕️ Bác sĩ Phụ Trách</div>
              <div className="cgp-doctor-row">
                <img
                  src={group.doctor.user?.avatar_url || '/default-avatar.png'}
                  alt={group.doctor.user?.full_name}
                  className="cgp-doctor-avatar"
                />
                <div>
                  <div className="cgp-doctor-name">{group.doctor.user?.full_name}</div>
                  <div className="cgp-doctor-specialty">{group.doctor.speciality}</div>
                </div>
              </div>
              {group.doctor.bio && <p className="cgp-doctor-bio">{group.doctor.bio}</p>}
              <button className="cgp-btn-primary cgp-btn-full">📞 Đặt Lịch Tư Vấn</button>
            </div>
          )}

          {/* Members */}
          <div className="cgp-sidebar-card">
            <div className="cgp-sidebar-card-title">👥 Thành Viên</div>
            <div className="cgp-members-count">{group.members_count} thành viên</div>
            <button className="cgp-btn-outline cgp-btn-full" onClick={handleOpenMembers}>
              Xem danh sách thành viên
            </button>
          </div>

          {/* Rules */}
          <div className="cgp-sidebar-card">
            <div className="cgp-sidebar-card-title">📋 Quy Tắc Nhóm</div>
            <ul className="cgp-rules-list">
              <li>✅ Tôn trọng mọi thành viên</li>
              <li>✅ Không spam hoặc quảng cáo</li>
              <li>✅ Không chia sẻ thông tin cá nhân</li>
              <li>✅ Tuân theo hướng dẫn bác sĩ</li>
            </ul>
          </div>

          {/* Disclaimer */}
          <div className="cgp-sidebar-card cgp-disclaimer-card">
            <div className="cgp-sidebar-card-title">⚠️ Lưu Ý Quan Trọng</div>
            <p>Nội dung trong nhóm mang tính <strong>tham khảo</strong>, không thay thế lời khuyên của bác sĩ.</p>
          </div>
        </aside>
      </div>

      {/* MODAL: Đăng bài */}
      {showPostModal && canPost && (
        <CreatePostModal
          groupId={group.id}
          requiresApproval={group.requires_post_approval}
          currentUser={user}
          onClose={() => setShowPostModal(false)}
          onSuccess={(newPost) => {
            setShowPostModal(false);
            if (newPost) {
              if (newPost.status === 'pending') {
                setPendingPosts(prev => [newPost, ...(Array.isArray(prev) ? prev : [])]);
              } else {
                setPosts(prev => [newPost, ...(Array.isArray(prev) ? prev : [])]);
              }
            }
            showToast(group.requires_post_approval ? 'Bài đăng đang chờ duyệt!' : 'Đăng bài thành công!');
            setRefreshKey(prev => prev + 1); // Force reload danh sách bài
          }}
          onEmergency={(msg) => {
            setEmergencyMessage(msg);
            setShowEmergencyPopup(true);
            setShowPostModal(false);
          }}
        />
      )}

      {/* MODAL: Members */}
      {showMembersModal && (
        <MembersModal
          group={group}
          onClose={() => setShowMembersModal(false)}
        />
      )}

      {/* POPUP: Emergency */}
      {showEmergencyPopup && (
        <EmergencyPopup
          message={emergencyMessage}
          onClose={() => setShowEmergencyPopup(false)}
          onVideoCall={() => navigate('/tu-van-video')}
        />
      )}
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// COMPONENT: PostCard — hiện đại, có 3 chấm dọc, reactions, comments
// ──────────────────────────────────────────────────────────────────────────────
const REACTIONS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

const PostCard = ({ post, group, currentUser, onEmergency, onApprove, onReject }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [selectedReaction, setSelectedReaction] = useState(null);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState(post.comments || []);
  const [savedPost, setSavedPost] = useState(false);
  const menuRef = useRef(null);
  const reactionRef = useRef(null);
  const reactionTimer = useRef(null);

  const SENSITIVE_KEYWORDS = ['đơn thuốc', 'liều lượng', 'mg/kg', 'xét nghiệm', 'chẩn đoán', 'phác đồ điều trị'];
  const EMERGENCY_KEYWORDS = ['đau thắt ngực', 'khó thở', 'mất ý thức', 'ngất xỉu', 'sốt cao co giật', 'xuất huyết', 'đột quỵ'];

  const lower = (post.content || '').toLowerCase();
  const hasEmergency = post.has_emergency_content || EMERGENCY_KEYWORDS.some(kw => lower.includes(kw));
  const hasSensitive = post.has_sensitive_content || SENSITIVE_KEYWORDS.some(kw => lower.includes(kw));

  useEffect(() => {
    if (hasEmergency) onEmergency('⚠️ CẢNH BÁO: Bài đăng chứa từ khóa khẩn cấp. Liên hệ bác sĩ ngay!');
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
      if (reactionRef.current && !reactionRef.current.contains(e.target)) setShowReactions(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleReaction = (emoji) => {
    setSelectedReaction(emoji);
    setLikesCount(prev => emoji ? prev + 1 : prev - 1);
    setShowReactions(false);
    communityService.toggleLikePost(post.id).catch(() => {});
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    try {
      await communityService.commentOnPost(post.id, commentText.trim());
      setComments(prev => [...prev, {
        id: Date.now(),
        content: commentText.trim(),
        author: { full_name: currentUser?.full_name || 'Bạn', avatar_url: currentUser?.avatar_url },
        created_at: new Date().toISOString(),
      }]);
      setCommentText('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleReport = async () => {
    const reason = window.prompt('Lý do báo cáo bài viết này:');
    if (!reason) return;
    try {
      await communityService.reportPost(post.id, reason);
      setShowMenu(false);
      alert('Đã gửi báo cáo. Cảm ơn bạn!');
    } catch (err) {
      alert('Lỗi gửi báo cáo');
    }
  };

  const formatTime = (dt) => {
    const diff = Date.now() - new Date(dt);
    if (diff < 60000) return 'Vừa xong';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} phút trước`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ trước`;
    return new Date(dt).toLocaleDateString('vi-VN');
  };

  return (
    <div className={`cgp-post${hasEmergency ? ' cgp-post-emergency' : ''}`}>
      {/* Header */}
      <div className="cgp-post-header">
        <img
          src={getImageUrl(post.author?.avatar_url, true)}
          alt={post.author?.full_name || 'Avatar'}
          className="cgp-post-avatar"
        />
        <div className="cgp-post-meta">
          <div className="cgp-post-author">
            {post.is_anonymous ? '🕵️ Ẩn danh' : post.author?.full_name}
            {post.author?.role === 'doctor' && <span className="cgp-badge-doctor">👨‍⚕️ Bác sĩ</span>}
          </div>
          <div className="cgp-post-time">{formatTime(post.created_at)}</div>
        </div>

        {/* 3 Chấm Dọc */}
        <div className="cgp-post-menu-wrap" ref={menuRef}>
          <button className="cgp-post-menu-btn" onClick={() => setShowMenu(v => !v)}>⋮</button>
          {showMenu && (
            <div className="cgp-post-dropdown">
              <button onClick={() => { setSavedPost(v => !v); setShowMenu(false); }}>
                {savedPost ? '🔖 Bỏ lưu bài' : '🔖 Lưu bài'}
              </button>
              <button onClick={() => { navigator.clipboard?.writeText(window.location.href); setShowMenu(false); }}>
                🔗 Sao chép liên kết
              </button>
              <button onClick={() => {
                if (navigator.share) navigator.share({ title: 'Bài viết', url: window.location.href });
                setShowMenu(false);
              }}>
                📤 Chia sẻ bài viết
              </button>
              <div className="cgp-post-dropdown-divider" />
              {post.is_anonymous === false && (
                <button onClick={() => setShowMenu(false)}>👁️ Ẩn bài viết</button>
              )}
              <button className="cgp-menu-danger" onClick={handleReport}>🚩 Tố cáo bài viết</button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="cgp-post-body">
        <p className="cgp-post-text">{post.content}</p>
        {post.images && post.images.length > 0 && (
          <div className={`cgp-post-images cgp-images-${Math.min(post.images.length, 4)}`}>
            {post.images.slice(0, 4).map((img, idx) => {
              // Gọi hàm helper để lấy link chuẩn
              const imgUrl = getImageUrl(img, false);
              
              return (
                <div key={idx} className="cgp-post-img-wrap">
                  <img 
                    src={imgUrl} 
                    alt="Post attachment" 
                    onClick={() => {
                      // Không mở tab mới nếu đó là ảnh bị lỗi
                      if (!imgUrl.includes('via.placeholder.com')) {
                        window.open(imgUrl, '_blank');
                      }
                    }} 
                  />
                  {idx === 3 && post.images.length > 4 && (
                    <div className="cgp-img-more">+{post.images.length - 4}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="cgp-post-disclaimer">ⓘ Nội dung mang tính tham khảo, không thay thế bác sĩ</div>

      {/* Sensitive CTA */}
      {hasSensitive && (
        <div className="cgp-post-sensitive-cta">
          <span>Bài viết có nội dung y tế nhạy cảm</span>
          <button className="cgp-btn-primary">📞 Đặt Lịch Tư Vấn</button>
        </div>
      )}

      {/* Stats row */}
      <div className="cgp-post-stats-row">
        <span>{selectedReaction || '❤️'} {likesCount}</span>
        <span onClick={() => setShowComments(v => !v)} style={{ cursor: 'pointer' }}>
          💬 {comments.length} bình luận
        </span>
        {savedPost && <span>🔖 Đã lưu</span>}
      </div>

      {/* Actions */}
      <div className="cgp-post-actions">
        {/* Reaction */}
        <div className="cgp-reaction-wrap" ref={reactionRef}>
          <button
            className={`cgp-action-btn${selectedReaction ? ' cgp-action-active' : ''}`}
            onMouseEnter={() => { reactionTimer.current = setTimeout(() => setShowReactions(true), 500); }}
            onMouseLeave={() => { clearTimeout(reactionTimer.current); }}
            onClick={() => {
              if (selectedReaction) { setSelectedReaction(null); setLikesCount(p => p - 1); }
              else handleReaction('❤️');
            }}
          >
            {selectedReaction || '🤍'} Thích
          </button>
          {showReactions && (
            <div className="cgp-reactions-picker"
              onMouseEnter={() => clearTimeout(reactionTimer.current)}
              onMouseLeave={() => setShowReactions(false)}
            >
              {REACTIONS.map(emoji => (
                <button key={emoji} className="cgp-reaction-emoji" onClick={() => handleReaction(emoji)}>
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        <button className="cgp-action-btn" onClick={() => setShowComments(v => !v)}>
          💬 Bình luận
        </button>
        <button className="cgp-action-btn" onClick={() => {
          if (navigator.share) navigator.share({ title: 'Bài viết', url: window.location.href });
        }}>
          📤 Chia sẻ
        </button>
      </div>

      {/* Approve/Reject buttons (manage tab) */}
      {post.status === 'pending' && (onApprove || onReject) && (
        <div className="cgp-post-moderation">
          {onApprove && (
            <button className="cgp-btn-approve" onClick={() => onApprove(post.id)}>
              ✅ Phê duyệt
            </button>
          )}
          {onReject && (
            <button className="cgp-btn-reject" onClick={() => onReject(post.id)}>
              ❌ Từ chối
            </button>
          )}
        </div>
      )}

      {/* Comments section */}
      {showComments && (
        <div className="cgp-comments">
          {comments.length === 0 ? (
            <p className="cgp-comments-empty">Chưa có bình luận nào</p>
          ) : (
            comments.map(c => (
              <div key={c.id} className="cgp-comment">
                <img src={getImageUrl(c.author?.avatar_url, true)} alt="Avatar" className="cgp-comment-avatar" />
                <div className="cgp-comment-bubble">
                  <div className="cgp-comment-author">{c.author?.full_name || 'Ẩn danh'}</div>
                  <div className="cgp-comment-text">{c.content}</div>
                  <div className="cgp-comment-time">{formatTime(c.created_at)}</div>
                </div>
              </div>
            ))
          )}
          {currentUser && (
            <div className="cgp-comment-input-row">
              <img src={getImageUrl(currentUser?.avatar_url, true)} alt="Avatar" className="cgp-comment-avatar" />
              <input
                className="cgp-comment-input"
                placeholder="Viết bình luận..."
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleComment()}
              />
              <button className="cgp-comment-send" onClick={handleComment}>➤</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// COMPONENT: CreatePostModal — đăng ẩn danh, ảnh, disclaimer
// ──────────────────────────────────────────────────────────────────────────────
const CreatePostModal = ({ groupId, requiresApproval, currentUser, onClose, onSuccess, onEmergency }) => {
  const [content, setContent] = useState('');
  const [images, setImages] = useState([]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [agreedDisclaimer, setAgreedDisclaimer] = useState(false);

  const EMERGENCY_KEYWORDS = ['đau thắt ngực', 'khó thở', 'mất ý thức', 'ngất xỉu', 'sốt cao co giật', 'xuất huyết', 'đột quỵ'];
  const checkEmergency = (text) => EMERGENCY_KEYWORDS.some(kw => text.toLowerCase().includes(kw));

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    if (images.length + files.length > 5) { setError('Tối đa 5 ảnh'); return; }
    setImages([...images, ...files.map(f => ({ file: f, preview: URL.createObjectURL(f) }))]);
  };

  // THÊM MỚI HÀM NÀY BÊN TRÊN HÀM handleSubmit
  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });

  const handleSubmit = async () => {
    setError('');
    if (!content.trim()) { setError('Nội dung không được trống'); return; }
    if (!agreedDisclaimer) { setError('Bạn cần đồng ý với tuyên bố miễn trách'); return; }
    if (checkEmergency(content)) {
      onEmergency('⚠️ CẢNH BÁO: Bài đăng chứa từ khóa khẩn cấp. Liên hệ bác sĩ ngay!');
      return;
    }
    setLoading(true);
    try {
      // SỬA Ở ĐÂY: Chuyển đổi các file ảnh sang chuỗi Base64
      const base64Images = await Promise.all(images.map(i => fileToBase64(i.file)));

      const res = await communityService.createPost(groupId, {
        content: content.trim(),
        images: base64Images, 
        is_anonymous: isAnonymous,
      });
      onSuccess(res.data?.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi đăng bài');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cgp-modal-overlay" onClick={onClose}>
      <div className="cgp-modal" onClick={e => e.stopPropagation()}>
        <div className="cgp-modal-head">
          <div className="cgp-modal-title">✍️ Đăng Bài Mới</div>
          <button className="cgp-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="cgp-modal-body">
          {/* Author row */}
          <div className="cgp-modal-author-row">
            <img src={currentUser?.avatar_url || '/default-avatar.png'} alt="" className="cgp-modal-avatar" />
            <div>
              <div className="cgp-modal-author-name">
                {isAnonymous ? '🕵️ Đăng ẩn danh' : currentUser?.full_name || 'Bạn'}
              </div>
              <label className="cgp-anonymous-toggle">
                <input type="checkbox" checked={isAnonymous} onChange={e => setIsAnonymous(e.target.checked)} />
                <span className="cgp-toggle-slider"></span>
                Đăng ẩn danh
              </label>
            </div>
          </div>

          {error && <div className="cgp-modal-error">{error}</div>}

          <textarea
            className="cgp-modal-textarea"
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Chia sẻ câu hỏi, kinh nghiệm của bạn..."
            rows={5}
            maxLength={2000}
          />
          <div className="cgp-modal-char">{content.length}/2000</div>

          {/* Images */}
          <div className="cgp-modal-images">
            {images.map((img, idx) => (
              <div key={idx} className="cgp-modal-img-preview">
                <img src={img.preview} alt="" />
                <button className="cgp-modal-img-remove" onClick={() => setImages(images.filter((_, i) => i !== idx))}>✕</button>
              </div>
            ))}
            {images.length < 5 && (
              <label className="cgp-modal-img-add">
                + Ảnh
                <input type="file" multiple accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
              </label>
            )}
          </div>

          {/* Disclaimer */}
          <label className="cgp-modal-disclaimer">
            <input type="checkbox" checked={agreedDisclaimer} onChange={e => setAgreedDisclaimer(e.target.checked)} />
            ✓ Tôi đồng ý rằng nội dung này mang tính tham khảo và không thay thế bác sĩ
          </label>

          {requiresApproval && (
            <div className="cgp-modal-note">⏳ Bài viết sẽ cần được quản trị viên duyệt trước khi hiển thị</div>
          )}
        </div>

        <div className="cgp-modal-foot">
          <button className="cgp-btn-outline" onClick={onClose} disabled={loading}>Hủy</button>
          <button className="cgp-btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? '⏳ Đang đăng...' : '✓ Đăng Bài'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// COMPONENT: MembersModal
// ──────────────────────────────────────────────────────────────────────────────
const MembersModal = ({ group, onClose }) => {
  const mockMembers = Array.from({ length: Math.min(group.members_count, 10) }, (_, i) => ({
    id: i + 1,
    full_name: `Thành viên ${i + 1}`,
    role: i === 0 ? 'owner' : i === 1 ? 'moderator' : 'member',
    avatar_url: null,
    joined_at: new Date(Date.now() - i * 86400000 * 5).toISOString(),
  }));

  const roleLabel = { owner: '👑 Trưởng nhóm', moderator: '🛡️ Quản lý', member: '👤 Thành viên' };

  return (
    <div className="cgp-modal-overlay" onClick={onClose}>
      <div className="cgp-modal cgp-modal-members" onClick={e => e.stopPropagation()}>
        <div className="cgp-modal-head">
          <div className="cgp-modal-title">👥 Thành Viên ({group.members_count})</div>
          <button className="cgp-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="cgp-modal-body">
          {mockMembers.map(m => (
            <div key={m.id} className="cgp-member-row">
              <div className="cgp-member-avatar">
                {m.avatar_url ? <img src={m.avatar_url} alt="" /> : <span>{m.full_name[0]}</span>}
              </div>
              <div className="cgp-member-info">
                <div className="cgp-member-name">{m.full_name}</div>
                <div className="cgp-member-role">{roleLabel[m.role]}</div>
              </div>
              <div className="cgp-member-joined">
                Tham gia {new Date(m.joined_at).toLocaleDateString('vi-VN')}
              </div>
            </div>
          ))}
          {group.members_count > 10 && (
            <div className="cgp-members-more">...và {group.members_count - 10} thành viên khác</div>
          )}
        </div>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// COMPONENT: GroupSettings
// ──────────────────────────────────────────────────────────────────────────────
const GroupSettings = ({ group, onUpdate }) => {
  const [form, setForm] = useState({
    name: group.name || '',
    description: group.description || '',
    privacy: group.privacy || 'public',
    requires_post_approval: group.requires_post_approval || false,
    rules: group.rules || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await communityService.updateGroup(group.id, form);
      onUpdate(form);
    } catch (err) {
      alert('Lỗi cập nhật: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cgp-settings">
      <h3 className="cgp-settings-title">🛠️ Cài Đặt Nhóm</h3>

      <div className="cgp-settings-field">
        <label>Tên nhóm</label>
        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      </div>

      <div className="cgp-settings-field">
        <label>Mô tả</label>
        <textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      </div>

      <div className="cgp-settings-field">
        <label>Quyền riêng tư</label>
        <select value={form.privacy} onChange={e => setForm(f => ({ ...f, privacy: e.target.value }))}>
          <option value="public">🔓 Công khai</option>
          <option value="private">🔒 Riêng tư</option>
          <option value="invite_only">📨 Chỉ qua lời mời</option>
        </select>
      </div>

      <div className="cgp-settings-field">
        <label>Quy tắc nhóm</label>
        <textarea rows={4} value={form.rules} onChange={e => setForm(f => ({ ...f, rules: e.target.value }))} placeholder="Nhập quy tắc nhóm..." />
      </div>

      <label className="cgp-settings-toggle">
        <input type="checkbox" checked={form.requires_post_approval}
          onChange={e => setForm(f => ({ ...f, requires_post_approval: e.target.checked }))} />
        <span className="cgp-toggle-slider"></span>
        Yêu cầu duyệt bài trước khi đăng
      </label>

      <button className="cgp-btn-primary cgp-btn-save" onClick={handleSave} disabled={loading}>
        {loading ? '⏳ Đang lưu...' : '💾 Lưu Thay Đổi'}
      </button>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// COMPONENT: EmergencyPopup
// ──────────────────────────────────────────────────────────────────────────────
const EmergencyPopup = ({ message, onClose, onVideoCall }) => (
  <div className="cgp-modal-overlay cgp-emergency-overlay" onClick={onClose}>
    <div className="cgp-emergency-box" onClick={e => e.stopPropagation()}>
      <div className="cgp-emergency-icon">🚨</div>
      <h2 className="cgp-emergency-title">CẢNH BÁO KHẨN CẤP</h2>
      <p className="cgp-emergency-msg">{message}</p>
      <button className="cgp-btn-danger cgp-btn-full" onClick={onVideoCall}>📞 Gọi Video Call Ngay</button>
      <button className="cgp-btn-outline cgp-btn-full" onClick={onClose}>Đóng</button>
      <p className="cgp-emergency-footer">Nguy hiểm tính mạng → gọi <strong>115</strong> ngay!</p>
    </div>
  </div>
);

export default CommunityGroupPage;