// client/src/pages/CommunityGroupPage.js
import React, { useState, useEffect, useRef, useContext, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import communityService from '../services/communityService';
import defaultAvatar from '../assets/images/avatar-default.jpg';
import {
  FaUsers, FaCamera, FaEdit, FaSearch, FaEye, FaImage,
  FaUserMd, FaNewspaper, FaCog, FaSignOutAlt, FaBan, FaVolumeMute,
  FaPlus, FaCheck, FaTimes, FaChevronLeft, FaChevronRight,
  FaHeart, FaRegHeart, FaComment, FaShare, FaBookmark, FaRegBookmark,
  FaEllipsisV, FaFlag, FaLink, FaShareAlt, FaEyeSlash,
  FaShieldAlt, FaLock, FaLockOpen, FaEnvelope, FaExclamationTriangle,
  FaCheckCircle, FaTimesCircle, FaInfoCircle, FaClock, FaPhoneAlt,
  FaSpinner, FaPen, FaSave, FaList, FaImages, FaUserShield, FaCrown,
  FaUser, FaPaperPlane, FaReply, FaThumbsUp, FaAngleDown, FaAngleUp,
  FaEllipsisH, FaUserSlash, FaUserCheck
} from 'react-icons/fa';
import './CommunityGroupPage.css';

// ── helpers ──────────────────────────────────────────────────────────────────
const getImageUrl = (url, isAvatar = false) => {
  const fallback = isAvatar ? defaultAvatar : 'https://via.placeholder.com/400x300?text=No+Image';
  if (!url) return fallback;
  if (url.startsWith('data:') || url.startsWith('http') || url.startsWith('blob:')) return url;
  return `http://localhost:3001${url.startsWith('/') ? '' : '/'}${url}`;
};

const formatTime = (dt) => {
  if (!dt) return '–';
  const d = new Date(dt), now = Date.now(), diff = now - d.getTime();
  if (isNaN(d)) return '–';
  if (diff < 60000) return 'vừa xong';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} phút trước`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ trước`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} ngày trước`;
  return d.toLocaleDateString('vi-VN');
};

const fileToBase64 = (file) => new Promise((res, rej) => {
  const r = new FileReader();
  r.readAsDataURL(file);
  r.onload  = () => res(r.result);
  r.onerror = rej;
});

// ── MAIN ─────────────────────────────────────────────────────────────────────
const CommunityGroupPage = () => {
  const navigate   = useNavigate();
  const { slug }   = useParams();
  const { user, isAuthenticated } = useContext(AuthContext);

  const [group, setGroup]               = useState(null);
  const [posts, setPosts]               = useState([]);
  const [membership, setMembership]     = useState(null);
  const [loading, setLoading]           = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [activeTab, setActiveTab]       = useState('posts');
  const [pendingPosts, setPendingPosts] = useState([]);
  const [reportedPosts, setReportedPosts] = useState([]);
  const [myPosts, setMyPosts]           = useState([]);
  const [page, setPage]                 = useState(1);
  const [totalPosts, setTotalPosts]     = useState(0);
  const [refreshKey, setRefreshKey]     = useState(0);
  const [toast, setToast]               = useState(null);

  // Modals
  const [showPostModal, setShowPostModal]       = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showEmergency, setShowEmergency]       = useState(false);
  const [emergencyMsg, setEmergencyMsg]         = useState('');
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(null); // { type, data }
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  // Cover/avatar
  const [coverPreview, setCoverPreview]   = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [coverMenu, setCoverMenu]         = useState(false);
  const [avatarMenu, setAvatarMenu]       = useState(false);

  const POSTS_LIMIT = 10;

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('.cgp-settings-wrap')) setShowSettingsMenu(false);
      if (!e.target.closest('.cgp-cover-edit'))    setCoverMenu(false);
      if (!e.target.closest('.cgp-avatar-edit-wrap')) setAvatarMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Fetch group ──────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchGroup = async () => {
      try {
        setLoading(true);
        const res  = await communityService.getGroupBySlug(slug);
        const data = res.data.data ?? res.data;
        setGroup(data);
        setMembership(data.membershipStatus || null);
        if (data.cover_image)  setCoverPreview(data.cover_image);
        if (data.avatar_image) setAvatarPreview(data.avatar_image);
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          navigate(`/dang-nhap?redirect=/cong-dong/nhom/${slug}`);
        } else {
          navigate('/cong-dong');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchGroup();
  }, [slug, navigate]);

  // ── Fetch posts ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!group) return;
    const fetch = async () => {
      try {
        setPostsLoading(true);
        const res  = await communityService.getGroupPosts(group.id, { page, limit: POSTS_LIMIT });
        const data = res.data.data ?? res.data;
        setPosts(Array.isArray(data.posts) ? data.posts : []);
        setTotalPosts(data.total || 0);
      } catch { /* silent */ }
      finally { setPostsLoading(false); }
    };
    fetch();
  }, [group, page, refreshKey]);

  // ── Fetch manage data ────────────────────────────────────────────────────
  useEffect(() => {
    if (!group || !canManage) return;
    if (activeTab === 'manage') {
      Promise.all([
        communityService.getPendingGroupPosts(group.id),
        communityService.getReportedGroupPosts(group.id),
      ]).then(([pRes, rRes]) => {
        setPendingPosts(Array.isArray(pRes.data?.data) ? pRes.data.data : []);
        setReportedPosts(Array.isArray(rRes.data?.data) ? rRes.data.data : []);
      }).catch(() => {});
    }
    if (activeTab === 'my-posts' && isAuthenticated) {
      communityService.getMyGroupPosts(group.id).then(res => {
        const d = res.data?.data ?? res.data;
        setMyPosts(Array.isArray(d?.posts) ? d.posts : []);
      }).catch(() => {});
    }
  }, [group, activeTab]);

  // ── Permissions ──────────────────────────────────────────────────────────
  const userRole  = user?.role?.name?.toLowerCase() || user?.role?.toLowerCase() || '';
  const canManage = !!user && (
    userRole === 'admin' ||
    (group && (
      (userRole === 'doctor' && group.doctor_id === user.id) ||
      membership?.role === 'owner' ||
      membership?.role === 'moderator'
    ))
  );
  const isOwner   = membership?.role === 'owner';
  const canPost   = !!membership && membership.status === 'active' &&
    ['owner', 'moderator', 'member'].includes(membership.role);

  const totalPages = Math.ceil(totalPosts / POSTS_LIMIT);

  // ── Join / Leave ─────────────────────────────────────────────────────────
  const handleJoin = async () => {
    if (!isAuthenticated) { navigate(`/dang-nhap?redirect=/cong-dong/nhom/${slug}`); return; }
    try {
      const res = await communityService.joinGroup(group.id, '');
      setMembership(res.data.status || { role: 'member', status: 'active' });
      showToast(res.data.message || 'Đã tham gia nhóm!');
    } catch (e) { showToast(e.response?.data?.message || 'Lỗi tham gia nhóm', 'error'); }
  };

  const handleLeave = async () => {
    if (!window.confirm('Bạn chắc chắn muốn rời nhóm này?')) return;
    try {
      await communityService.leaveGroup(group.id);
      setMembership(null);
      showToast('Đã rời nhóm');
    } catch (e) { showToast(e.response?.data?.message || 'Lỗi', 'error'); }
  };

  // ── Approve / Reject post ────────────────────────────────────────────────
  const handleApprove = async (postId) => {
    try {
      await communityService.approvePost(postId);
      setPendingPosts(prev => prev.filter(p => p.id !== postId));
      showToast('Đã duyệt bài viết!');
      setRefreshKey(k => k + 1);
    } catch (e) { showToast(e.response?.data?.message || 'Lỗi duyệt bài', 'error'); }
  };

  const handleReject = async (postId, reason) => {
    try {
      await communityService.rejectPost(postId, reason);
      setPendingPosts(prev => prev.filter(p => p.id !== postId));
      showToast('Đã từ chối bài viết');
    } catch (e) { showToast(e.response?.data?.message || 'Lỗi', 'error'); }
  };

  // ── Upload avatar ────────────────────────────────────────────────────────
  const handleAvatarUpload = async (file) => {
    if (!file) return;
    try {
      const b64 = await fileToBase64(file);
      setAvatarPreview(URL.createObjectURL(file));
      await communityService.updateGroup(group.id, { avatar_image: b64 });
      showToast('Đã cập nhật ảnh đại diện!');
    } catch { showToast('Lỗi lưu ảnh đại diện', 'error'); }
    setAvatarMenu(false);
  };

  // ── Upload cover ─────────────────────────────────────────────────────────
  const handleCoverUpload = async (file) => {
    if (!file) return;
    try {
      const b64 = await fileToBase64(file);
      setCoverPreview(URL.createObjectURL(file));
      await communityService.updateGroup(group.id, { cover_image: b64 });
      showToast('Đã cập nhật ảnh bìa!');
    } catch { showToast('Lỗi lưu ảnh bìa', 'error'); }
    setCoverMenu(false);
  };

  // ── Request hide ─────────────────────────────────────────────────────────
  const handleRequestHide = async (reason) => {
    try {
      await communityService.requestHideGroup(group.id, reason);
      showToast('Đã gửi yêu cầu ẩn nhóm đến Admin.');
    } catch (e) { showToast(e.response?.data?.message || 'Lỗi', 'error'); }
    setShowConfirmModal(null);
  };

  // ── Tabs config ──────────────────────────────────────────────────────────
  const tabs = useMemo(() => [
    { key: 'posts',    label: 'Bài Đăng',  icon: <FaNewspaper /> },
    ...(isAuthenticated ? [{ key: 'my-posts', label: 'Của Tôi', icon: <FaUser /> }] : []),
    ...(canManage ? [{
      key: 'manage',
      label: `Quản Lý${pendingPosts.length > 0 ? ` (${pendingPosts.length})` : ''}`,
      icon: <FaCog />,
      badge: pendingPosts.length,
    }] : []),
    ...(canManage ? [{ key: 'settings', label: 'Cài Đặt', icon: <FaEdit /> }] : []),
  ], [isAuthenticated, canManage, pendingPosts.length]);

  if (loading) return <div className="cgp-loading"><div className="cgp-spinner"/><p>Đang tải nhóm...</p></div>;
  if (!group)  return (
    <div className="cgp-empty">
      <div className="cgp-empty-icon"><FaExclamationTriangle /></div>
      <p>Không tìm thấy nhóm</p>
      <button className="cgp-btn-primary" onClick={() => navigate('/cong-dong')}><FaChevronLeft /> Quay lại</button>
    </div>
  );

  const privacyLabel = { public: 'Công khai', private: 'Riêng tư', invite_only: 'Lời mời' };
  const privacyIcon  = { public: <FaLockOpen />, private: <FaLock />, invite_only: <FaEnvelope /> };

  return (
    <div className="cgp-root">
      {/* TOAST */}
      {toast && <div className={`cgp-toast cgp-toast-${toast.type}`}>{toast.msg}</div>}

      {/* ── COVER ── */}
      <div className="cgp-cover-wrap">
        <div className="cgp-cover" style={{ backgroundImage: coverPreview ? `url(${coverPreview})` : undefined }}>
          <div className="cgp-cover-overlay" />
          {canManage && (
            <div className="cgp-cover-edit">
              <button className="cgp-img-menu-btn" onClick={() => setCoverMenu(v => !v)}>
                <FaCamera /> Ảnh bìa
              </button>
              {coverMenu && (
                <div className="cgp-img-dropdown">
                  <label>
                    <FaImage /> Đổi ảnh bìa
                    <input type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={e => handleCoverUpload(e.target.files[0])} />
                  </label>
                  {coverPreview && <button onClick={() => { setCoverPreview(null); communityService.updateGroup(group.id, { cover_image: null }); setCoverMenu(false); }}><FaTimes /> Xóa ảnh bìa</button>}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Avatar + info */}
        <div className="cgp-cover-bottom">
          <div className="cgp-avatar-wrap">
            <div className="cgp-avatar-edit-wrap">
              <div className="cgp-group-avatar" style={{ backgroundImage: avatarPreview ? `url(${avatarPreview})` : undefined }}>
                {!avatarPreview && <FaUsers />}
              </div>
              {canManage && (
                <>
                  <button className="cgp-avatar-edit-btn" onClick={() => setAvatarMenu(v => !v)}><FaEdit /></button>
                  {avatarMenu && (
                    <div className="cgp-img-dropdown cgp-img-dropdown-left">
                      <label>
                        <FaImage /> Đổi ảnh đại diện
                        <input type="file" accept="image/*" style={{ display: 'none' }}
                          onChange={e => handleAvatarUpload(e.target.files[0])} />
                      </label>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="cgp-cover-info">
            <h1 className="cgp-group-name">{group.name}</h1>
            <div className="cgp-cover-meta">
              <span className={`cgp-badge cgp-badge-${group.type}`}>
                {group.type === 'official' ? <><FaShieldAlt /> Chính Thức</> : <><FaUsers /> Cộng Đồng</>}
              </span>
              <span className="cgp-badge cgp-badge-privacy">
                {privacyIcon[group.privacy]} {privacyLabel[group.privacy]}
              </span>
              {canManage && (
                <button className="cgp-stat-link" onClick={() => setShowMembersModal(true)}>
                  <FaUsers /> {group.members_count} thành viên
                </button>
              )}
              {!canManage && <span><FaUsers /> {group.members_count} thành viên</span>}
              <span><FaNewspaper /> {group.posts_count} bài đăng</span>
            </div>
          </div>

          <div className="cgp-cover-actions">
            {!membership ? (
              <button className="cgp-btn-primary" onClick={handleJoin}><FaPlus /> Tham Gia</button>
            ) : membership.status === 'banned' ? (
              <button className="cgp-btn-banned" disabled><FaBan /> Đã bị cấm</button>
            ) : membership.status === 'muted' ? (
              <button className="cgp-btn-muted" disabled><FaVolumeMute /> Bị hạn chế</button>
            ) : (
              <>
                {canPost && (
                  <button className="cgp-btn-primary" onClick={() => setShowPostModal(true)}>
                    <FaPen /> Đăng bài
                  </button>
                )}
                {canManage && (
                  <button className="cgp-btn-outline" onClick={() => setShowEditGroupModal(true)}>
                    <FaEdit /> Sửa thông tin
                  </button>
                )}
              </>
            )}

            {/* Settings icon */}
            {membership && (
              <div className="cgp-settings-wrap">
                <button className="cgp-settings-btn" onClick={() => setShowSettingsMenu(v => !v)}><FaCog /></button>
                {showSettingsMenu && (
                  <div className="cgp-settings-dropdown">
                    {canManage && <button onClick={() => { setShowEditGroupModal(true); setShowSettingsMenu(false); }}><FaEdit /> Sửa thông tin nhóm</button>}
                    {canManage && <button onClick={() => { setShowSettingsMenu(false); setShowMembersModal(true); }}><FaUsers /> Quản lý thành viên</button>}
                    <div className="cgp-settings-divider" />
                    {(isOwner || userRole === 'admin') && (
                      <button onClick={() => { setShowSettingsMenu(false); setShowConfirmModal({ type: 'hide' }); }}>
                        <FaEyeSlash /> Ẩn nhóm (gửi yêu cầu Admin)
                      </button>
                    )}
                    {membership && !isOwner && (
                      <button className="cgp-menu-danger" onClick={() => { setShowSettingsMenu(false); handleLeave(); }}>
                        <FaSignOutAlt /> Rời nhóm
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MAIN LAYOUT ── */}
      <div className="cgp-layout">
        {/* LEFT: main content */}
        <div className="cgp-main">
          {/* Tabs horizontal (inline at top) */}
          <div className="cgp-tabs">
            {tabs.map(t => (
              <button key={t.key} className={`cgp-tab${activeTab === t.key ? ' cgp-tab-active' : ''}`}
                onClick={() => setActiveTab(t.key)}>
                {t.icon} {t.label}
                {t.badge > 0 && <span className="cgp-nav-badge">{t.badge}</span>}
              </button>
            ))}
          </div>

          {/* TAB: POSTS */}
          {activeTab === 'posts' && (
            <>
              {canPost && (
                <div className="cgp-post-composer" onClick={() => setShowPostModal(true)}>
                  <div className="cgp-composer-avatar">
                    {user?.avatar_url
                      ? <img src={user.avatar_url} alt="" />
                      : <div className="cgp-composer-avatar-ph">{(user?.full_name || 'U')[0]}</div>
                    }
                  </div>
                  <div className="cgp-composer-input">Bạn đang nghĩ gì? Chia sẻ với cộng đồng...</div>
                  <button className="cgp-btn-primary"><FaPen /> Đăng</button>
                </div>
              )}
              {postsLoading ? (
                <div className="cgp-loading"><div className="cgp-spinner" /><p>Đang tải...</p></div>
              ) : posts.length === 0 ? (
                <div className="cgp-empty-posts">
                  <div className="cgp-empty-icon"><FaNewspaper /></div>
                  <p>Chưa có bài đăng nào</p>
                  {canPost && <button className="cgp-btn-primary" onClick={() => setShowPostModal(true)}><FaPlus /> Đăng bài đầu tiên</button>}
                </div>
              ) : (
                <>
                  {posts.map(post => (
                    <PostCard key={post.id} post={post} group={group} currentUser={user}
                      onEmergency={(m) => { setEmergencyMsg(m); setShowEmergency(true); }}
                      onApprove={handleApprove} onReject={handleReject}
                      onDeleted={(id) => { setPosts(p => p.filter(x => x.id !== id)); showToast('Đã xóa bài viết'); }}
                      showToast={showToast} canManage={canManage}
                    />
                  ))}
                  {totalPages > 1 && (
                    <div className="cgp-pagination">
                      <button className="cgp-btn-outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}><FaChevronLeft /> Trước</button>
                      <span>{page} / {totalPages}</span>
                      <button className="cgp-btn-outline" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Sau <FaChevronRight /></button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* TAB: MY POSTS */}
          {activeTab === 'my-posts' && (
            <MyPostsTab groupId={group.id} posts={myPosts} setPosts={setMyPosts}
              group={group} currentUser={user} showToast={showToast}
              onRefresh={() => setRefreshKey(k => k + 1)} />
          )}

          {/* TAB: MANAGE */}
          {activeTab === 'manage' && canManage && (
            <div>
              <div className="cgp-manage-section">
                <div className="cgp-manage-hd">
                  <span className="cgp-manage-dot cgp-dot-yellow" />
                  <h3>Chờ duyệt <span className="cgp-count-badge">{pendingPosts.length}</span></h3>
                </div>
                {pendingPosts.length === 0 ? (
                  <div className="cgp-manage-empty"><FaCheckCircle /> Không có bài viết nào đang chờ duyệt</div>
                ) : pendingPosts.map(p => (
                  <PostCard key={p.id} post={p} group={group} currentUser={user}
                    onEmergency={(m) => { setEmergencyMsg(m); setShowEmergency(true); }}
                    onApprove={handleApprove} onReject={handleReject}
                    onDeleted={(id) => setPendingPosts(prev => prev.filter(x => x.id !== id))}
                    showToast={showToast} canManage={canManage} />
                ))}
              </div>

              <div className="cgp-manage-section">
                <div className="cgp-manage-hd">
                  <span className="cgp-manage-dot cgp-dot-red" />
                  <h3>Bị báo cáo <span className={`cgp-count-badge cgp-count-red`}>{reportedPosts.length}</span></h3>
                </div>
                {reportedPosts.length === 0 ? (
                  <div className="cgp-manage-empty"><FaCheckCircle /> Không có bài viết bị báo cáo</div>
                ) : reportedPosts.map(p => (
                  <PostCard key={p.id} post={p} group={group} currentUser={user}
                    onEmergency={(m) => { setEmergencyMsg(m); setShowEmergency(true); }}
                    onApprove={handleApprove} onReject={handleReject}
                    onDeleted={(id) => setReportedPosts(prev => prev.filter(x => x.id !== id))}
                    showToast={showToast} canManage={canManage} />
                ))}
              </div>
            </div>
          )}

          {/* TAB: SETTINGS */}
          {activeTab === 'settings' && canManage && (
            <GroupSettingsTab group={group} onUpdate={(upd) => { setGroup(g => ({ ...g, ...upd })); showToast('Đã cập nhật!'); }} />
          )}
        </div>

        {/* RIGHT: sidebar */}
        <aside className="cgp-sidebar">
          {/* Nav card */}
          <div className="cgp-nav-card">
            {tabs.map(t => (
              <button key={t.key}
                className={`cgp-nav-item${activeTab === t.key ? ' cgp-nav-item-active' : ''}`}
                onClick={() => setActiveTab(t.key)}>
                <span className="cgp-nav-icon">{t.icon}</span>
                <span>{t.label}</span>
                {t.badge > 0 && <span className="cgp-nav-badge">{t.badge}</span>}
              </button>
            ))}
          </div>

          {/* Rules first */}
          <div className="cgp-sidebar-card">
            <div className="cgp-sidebar-card-title"><FaList /> Quy Tắc Nhóm</div>
            <ul className="cgp-rules-list">
              {['Tôn trọng mọi thành viên', 'Không spam hoặc quảng cáo', 'Không chia sẻ thông tin cá nhân', 'Nội dung y tế chỉ mang tính tham khảo'].map((rule, i) => (
                <li key={i}><FaCheckCircle className="cgp-rules-icon" />{rule}</li>
              ))}
            </ul>
          </div>

          {/* Doctor */}
          {group.doctor && (
            <div className="cgp-sidebar-card cgp-doctor-card">
              <div className="cgp-sidebar-card-title"><FaUserMd /> Bác sĩ Phụ Trách</div>
              <div className="cgp-doctor-row">
                <img src={group.doctor.user?.avatar_url || defaultAvatar} alt="" className="cgp-doctor-avatar" />
                <div>
                  <div className="cgp-doctor-name">{group.doctor.user?.full_name}</div>
                  <div className="cgp-doctor-spec">{group.doctor.speciality}</div>
                </div>
              </div>
              {group.doctor.bio && <p className="cgp-doctor-bio">{group.doctor.bio}</p>}
              <button className="cgp-btn-primary cgp-btn-full" onClick={() => navigate('/dat-lich-hen')}>
                <FaPhoneAlt /> Đặt Lịch Tư Vấn
              </button>
            </div>
          )}

          {/* Disclaimer */}
          <div className="cgp-sidebar-card cgp-disclaimer-card">
            <div className="cgp-sidebar-card-title"><FaInfoCircle /> Lưu Ý</div>
            <p>Nội dung trong nhóm mang tính <strong>tham khảo</strong>, không thay thế lời khuyên của bác sĩ. Liên hệ bác sĩ khi cần tư vấn chuyên môn.</p>
          </div>
        </aside>
      </div>

      {/* ── MODALS ── */}
      {showPostModal && canPost && (
        <CreatePostModal group={group} currentUser={user}
          onClose={() => setShowPostModal(false)}
          onSuccess={(newPost) => {
            setShowPostModal(false);
            if (newPost) {
              if (newPost.status === 'pending') {
                showToast('Bài viết đang chờ quản trị viên duyệt!', 'info');
              } else {
                setPosts(prev => [newPost, ...prev]);
                showToast('Đăng bài thành công!');
              }
            }
            setRefreshKey(k => k + 1);
          }}
          onEmergency={(m) => { setShowPostModal(false); setEmergencyMsg(m); setShowEmergency(true); }}
        />
      )}

      {showMembersModal && canManage && (
        <MembersModal group={group} currentUser={user} canManage={canManage}
          onClose={() => setShowMembersModal(false)} showToast={showToast} />
      )}

      {showEditGroupModal && canManage && (
        <EditGroupModal group={group}
          onClose={() => setShowEditGroupModal(false)}
          onSuccess={(upd) => { setGroup(g => ({ ...g, ...upd })); setShowEditGroupModal(false); showToast('Đã cập nhật thông tin nhóm!'); }}
        />
      )}

      {showEmergency && (
        <EmergencyPopup message={emergencyMsg}
          onClose={() => setShowEmergency(false)}
          onCall={() => navigate('/tu-van-video')} />
      )}

      {showConfirmModal?.type === 'hide' && (
        <ConfirmModal
          icon={<FaEyeSlash />}
          title="Ẩn nhóm"
          message="Nhóm sẽ bị ẩn với tất cả người dùng. Đây là hành động không thể hoàn tác và cần Admin phê duyệt."
          detail="Sau khi ẩn, tất cả thành viên sẽ không thể tìm thấy nhóm này."
          confirmLabel="Gửi yêu cầu ẩn nhóm"
          confirmClass="cgp-btn-danger"
          onCancel={() => setShowConfirmModal(null)}
          onConfirm={(reason) => handleRequestHide(reason)}
          askReason={true}
        />
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// PostCard — Reddit-style với full comment thread
// ══════════════════════════════════════════════════════════════════════════════
const REACTIONS = ['❤️','😂','😮','😢','😡','👍'];
const EMERGENCY_KW = ['đau thắt ngực','khó thở','mất ý thức','ngất xỉu','sốt cao co giật','xuất huyết','đột quỵ'];
const SENSITIVE_KW = ['đơn thuốc','liều lượng','mg/kg','xét nghiệm','chẩn đoán','phác đồ'];

const PostCard = ({ post, group, currentUser, onEmergency, onApprove, onReject, onDeleted, showToast, canManage }) => {
  const navigate = useNavigate();
  const [showMenu, setShowMenu]             = useState(false);
  const [showReactions, setShowReactions]   = useState(false);
  const [reaction, setReaction]             = useState(null);
  const [likesCount, setLikesCount]         = useState(post.likes_count || 0);
  const [showComments, setShowComments]     = useState(false);
  const [comments, setComments]             = useState(Array.isArray(post.comments_data) ? post.comments_data : []);
  const [commentText, setCommentText]       = useState('');
  const [saved, setSaved]                   = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason]     = useState('');
  const menuRef     = useRef(null);
  const reactionRef = useRef(null);
  const reactionTimer = useRef(null);

  const lower         = (post.content || '').toLowerCase();
  const hasEmergency  = post.has_emergency_content || EMERGENCY_KW.some(k => lower.includes(k));
  const hasSensitive  = post.has_sensitive_content  || SENSITIVE_KW.some(k => lower.includes(k));
  const isAuthor      = currentUser && post.author_id === currentUser.id;
  const isPending     = post.status === 'pending';

  useEffect(() => {
    const h = (e) => {
      if (menuRef.current     && !menuRef.current.contains(e.target))     setShowMenu(false);
      if (reactionRef.current && !reactionRef.current.contains(e.target)) setShowReactions(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleLike = async () => {
    const newReaction = reaction ? null : '❤️';
    setReaction(newReaction);
    setLikesCount(c => newReaction ? c + 1 : c - 1);
    try { await communityService.toggleLikePost(post.id); } catch {}
  };

  const handleReactionPick = async (emoji) => {
    setReaction(emoji);
    setLikesCount(c => reaction ? c : c + 1);
    setShowReactions(false);
    try { await communityService.toggleLikePost(post.id); } catch {}
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    try {
      await communityService.commentOnPost(post.id, commentText.trim());
      setComments(prev => [...prev, {
        id: Date.now(), content: commentText.trim(),
        author: { full_name: currentUser?.full_name || 'Bạn', avatar_url: currentUser?.avatar_url, role: currentUser?.role },
        created_at: new Date().toISOString(),
        replies: [],
      }]);
      setCommentText('');
    } catch {}
  };

  const handleReport = async () => {
    const reason = window.prompt('Lý do báo cáo bài viết này:');
    if (reason === null) return;
    try { await communityService.reportPost(post.id, reason); setShowMenu(false); showToast('Đã gửi báo cáo. Cảm ơn!'); }
    catch { showToast('Lỗi gửi báo cáo', 'error'); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Xóa bài viết này? Hành động không thể hoàn tác.')) return;
    try {
      await communityService.deletePost(group.id, post.id);
      onDeleted(post.id);
    } catch (e) { showToast(e.response?.data?.message || 'Lỗi xóa bài', 'error'); }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/cong-dong/nhom/${group.slug}`;
    if (navigator.share) navigator.share({ title: group.name, url });
    else navigator.clipboard?.writeText(url).then(() => showToast('Đã sao chép liên kết!'));
    setShowMenu(false);
  };

  return (
    <div className={`cgp-post${post.is_pinned ? ' cgp-post-pinned' : ''}${hasEmergency ? ' cgp-post-emergency' : ''}`}>
      {isPending && <div className="cgp-post-pending-badge"><FaClock style={{ marginRight: 4 }} /> Đang chờ duyệt</div>}

      {/* Header */}
      <div className="cgp-post-header">
        <img src={getImageUrl(post.is_anonymous ? null : post.author?.avatar_url, true)} alt="" className="cgp-post-avatar" />
        <div className="cgp-post-meta-wrap">
          <div className="cgp-post-author">
            {post.is_anonymous ? 'Ẩn danh' : (post.author?.full_name || 'Người dùng')}
            {!post.is_anonymous && post.author?.role === 'doctor' && (
              <span className="cgp-badge-doctor"><FaUserMd /> Bác sĩ</span>
            )}
          </div>
          <div className="cgp-post-time"><FaClock style={{ marginRight: 3 }} />{formatTime(post.created_at)}</div>
        </div>
        {currentUser && (
          <div className="cgp-post-menu-wrap" ref={menuRef}>
            <button className="cgp-post-menu-btn" onClick={() => setShowMenu(v => !v)}><FaEllipsisV /></button>
            {showMenu && (
              <div className="cgp-post-dropdown">
                <button onClick={() => { setSaved(v => !v); setShowMenu(false); }}>
                  {saved ? <><FaBookmark /> Bỏ lưu</> : <><FaRegBookmark /> Lưu bài</>}
                </button>
                <button onClick={handleShare}><FaShareAlt /> Chia sẻ</button>
                <button onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/cong-dong/nhom/${group.slug}`); setShowMenu(false); showToast('Đã sao chép!'); }}>
                  <FaLink /> Sao chép liên kết
                </button>
                <div className="cgp-dropdown-divider" />
                {(isAuthor || canManage) && (
                  <button className="cgp-menu-danger" onClick={handleDelete}><FaTimesCircle /> Xóa bài viết</button>
                )}
                {!isAuthor && <button className="cgp-menu-danger" onClick={handleReport}><FaFlag /> Báo cáo</button>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="cgp-post-body">
        <p className="cgp-post-text">{post.content}</p>
        {post.images && post.images.length > 0 && (
          <div className={`cgp-post-images cgp-images-${Math.min(post.images.length, 4)}`}>
            {post.images.slice(0, 4).map((img, idx) => (
              <div key={idx} className="cgp-post-img-wrap">
                <img src={getImageUrl(img)} alt="" onClick={() => window.open(getImageUrl(img), '_blank')} />
                {idx === 3 && post.images.length > 4 && (
                  <div className="cgp-img-more">+{post.images.length - 4}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="cgp-post-disclaimer"><FaInfoCircle /> Nội dung chỉ mang tính tham khảo</div>

      {/* Sensitive CTA */}
      {hasSensitive && (
        <div className="cgp-post-sensitive-cta">
          <span><FaExclamationTriangle /> Bài viết có nội dung y tế nhạy cảm</span>
          <button className="cgp-btn-primary" onClick={() => navigate('/dat-lich-hen')}><FaPhoneAlt /> Đặt Lịch Tư Vấn</button>
        </div>
      )}

      {/* Stats */}
      <div className="cgp-post-stats">
        <span>{reaction || <FaRegHeart />} {likesCount}</span>
        <span onClick={() => setShowComments(v => !v)}><FaComment /> {comments.length} bình luận</span>
        {saved && <span><FaBookmark /> Đã lưu</span>}
      </div>

      {/* Actions */}
      <div className="cgp-post-actions">
        <div className="cgp-reaction-wrap" ref={reactionRef}>
          <button
            className={`cgp-action-btn${reaction ? ' cgp-action-liked' : ''}`}
            onMouseEnter={() => { reactionTimer.current = setTimeout(() => setShowReactions(true), 450); }}
            onMouseLeave={() => clearTimeout(reactionTimer.current)}
            onClick={handleLike}
          >
            {reaction || <FaRegHeart />} Thích
          </button>
          {showReactions && (
            <div className="cgp-reactions-picker"
              onMouseEnter={() => clearTimeout(reactionTimer.current)}
              onMouseLeave={() => setShowReactions(false)}>
              {REACTIONS.map(r => (
                <button key={r} className="cgp-reaction-btn" onClick={() => handleReactionPick(r)}>{r}</button>
              ))}
            </div>
          )}
        </div>
        <button className="cgp-action-btn" onClick={() => setShowComments(v => !v)}><FaComment /> Bình luận</button>
        <button className="cgp-action-btn" onClick={handleShare}><FaShare /> Chia sẻ</button>
        <button className="cgp-action-btn" onClick={() => { setSaved(v => !v); showToast(saved ? 'Đã bỏ lưu' : 'Đã lưu bài!'); }}>
          {saved ? <FaBookmark /> : <FaRegBookmark />}
        </button>
      </div>

      {/* Approve / Reject (pending posts) */}
      {isPending && (onApprove || onReject) && (
        <div className="cgp-post-moderation">
          {!showRejectInput ? (
            <>
              {onApprove && <button className="cgp-btn-approve" onClick={() => onApprove(post.id)}><FaCheckCircle /> Phê duyệt</button>}
              {onReject  && <button className="cgp-btn-reject"  onClick={() => setShowRejectInput(true)}><FaTimesCircle /> Từ chối</button>}
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <textarea className="cgp-modal-textarea" rows={2} placeholder="Lý do từ chối (có thể để trống)..."
                value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
              <div style={{ display: 'flex', gap: 7, justifyContent: 'flex-end' }}>
                <button className="cgp-btn-outline" onClick={() => { setShowRejectInput(false); setRejectReason(''); }}>Hủy</button>
                <button className="cgp-btn-reject" onClick={() => { onReject(post.id, rejectReason); setShowRejectInput(false); }}>Xác nhận từ chối</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Comments section — Reddit style */}
      {showComments && (
        <div className="cgp-comments-section">
          {currentUser && (
            <div className="cgp-comment-compose">
              <div className="cgp-comment-compose-avatar">
                {currentUser.avatar_url ? <img src={currentUser.avatar_url} alt="" /> : <div className="cgp-comment-compose-avatar-ph">{(currentUser.full_name || 'U')[0]}</div>}
              </div>
              <div className="cgp-comment-compose-right">
                <textarea className="cgp-comment-textarea" placeholder="Viết bình luận..." rows={2}
                  value={commentText} onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleComment(); }} />
                <div className="cgp-comment-compose-actions">
                  <button className="cgp-btn-outline" onClick={() => setCommentText('')}>Hủy</button>
                  <button className="cgp-btn-primary" onClick={handleComment}><FaPaperPlane /> Gửi</button>
                </div>
              </div>
            </div>
          )}
          {comments.length === 0
            ? <p className="cgp-comments-empty">Chưa có bình luận nào. Hãy là người đầu tiên!</p>
            : (
              <div className="cgp-comment-list">
                {comments.map(c => (
                  <CommentThread key={c.id} comment={c} depth={0}
                    currentUser={currentUser} postId={post.id}
                    onNewReply={(parentId, reply) => {
                      setComments(prev => prev.map(cm =>
                        cm.id === parentId ? { ...cm, replies: [...(cm.replies || []), reply] } : cm
                      ));
                    }}
                  />
                ))}
              </div>
            )
          }
        </div>
      )}
    </div>
  );
};

// ── CommentThread (Reddit-style recursive) ───────────────────────────────────
const CommentThread = ({ comment, depth, currentUser, postId, onNewReply }) => {
  const [collapsed, setCollapsed]   = useState(false);
  const [showReply, setShowReply]   = useState(false);
  const [replyText, setReplyText]   = useState('');
  const [liked, setLiked]           = useState(false);
  const [likeCount, setLikeCount]   = useState(comment.likes || 0);

  const isDeleted = comment.isDeleted;
  const MAX_DEPTH = 5;

  const handleReply = async () => {
    if (!replyText.trim()) return;
    try {
      await communityService.commentOnPost(postId, replyText.trim());
      const newReply = {
        id: Date.now(), content: replyText.trim(),
        author: { full_name: currentUser?.full_name, avatar_url: currentUser?.avatar_url, role: currentUser?.role },
        created_at: new Date().toISOString(), replies: [],
      };
      onNewReply(comment.id, newReply);
      setReplyText(''); setShowReply(false);
    } catch {}
  };

  const isDoctor = comment.author?.role === 'doctor';

  return (
    <div className="cgp-comment-thread">
      {depth > 0 && <div className="cgp-comment-indent-line" onClick={() => setCollapsed(v => !v)} title={collapsed ? 'Mở rộng' : 'Thu gọn'} />}
      <div className="cgp-comment-body-wrap">
        <div className="cgp-comment-item">
          <div className="cgp-comment-header">
            <img src={getImageUrl(comment.is_anonymous ? null : comment.author?.avatar_url, true)} alt="" className="cgp-comment-avatar" />
            <span className="cgp-comment-author">{comment.is_anonymous ? 'Ẩn danh' : (comment.author?.full_name || 'Người dùng')}</span>
            {isDoctor && !comment.is_anonymous && <span className="cgp-comment-role-badge"><FaUserMd /> BS</span>}
            <span className="cgp-comment-time">{formatTime(comment.created_at)}</span>
            <button className="cgp-comment-action-btn" onClick={() => setCollapsed(v => !v)} title={collapsed ? 'Mở rộng' : 'Thu gọn'}>
              {collapsed ? <FaAngleDown /> : <FaAngleUp />}
            </button>
          </div>

          {!collapsed && (
            <>
              {isDeleted
                ? <p className="cgp-comment-deleted">Bình luận đã bị xóa.</p>
                : <p className="cgp-comment-text">{comment.content}</p>
              }
              {!isDeleted && (
                <div className="cgp-comment-actions">
                  <button className={`cgp-comment-action-btn${liked ? ' cgp-comment-liked' : ''}`}
                    onClick={() => { setLiked(v => !v); setLikeCount(c => liked ? c - 1 : c + 1); }}>
                    <FaHeart /> {likeCount > 0 && likeCount}
                  </button>
                  {currentUser && depth < MAX_DEPTH && (
                    <button className="cgp-comment-action-btn" onClick={() => setShowReply(v => !v)}>
                      <FaReply /> Trả lời
                    </button>
                  )}
                </div>
              )}

              {showReply && currentUser && (
                <div className="cgp-reply-composer">
                  <textarea rows={2} placeholder={`Trả lời ${comment.author?.full_name || 'người dùng'}...`}
                    value={replyText} onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleReply(); }} />
                  <div className="cgp-reply-composer-actions">
                    <button className="cgp-btn-outline" onClick={() => { setShowReply(false); setReplyText(''); }}>Hủy</button>
                    <button className="cgp-btn-primary" onClick={handleReply}><FaPaperPlane /> Gửi</button>
                  </div>
                </div>
              )}

              {/* Nested replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="cgp-comment-children">
                  {comment.replies.map(r => (
                    <CommentThread key={r.id} comment={r} depth={depth + 1}
                      currentUser={currentUser} postId={postId}
                      onNewReply={(pid, reply) => {
                        onNewReply(comment.id, reply);
                      }} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// MyPostsTab — bài viết của chính mình
// ══════════════════════════════════════════════════════════════════════════════
const MyPostsTab = ({ groupId, posts, setPosts, group, currentUser, showToast, onRefresh }) => {
  const [editPost, setEditPost] = useState(null);

  const handleDelete = async (postId) => {
    if (!window.confirm('Xóa bài viết này?')) return;
    try {
      await communityService.deletePost(groupId, postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
      showToast('Đã xóa bài viết');
      onRefresh();
    } catch (e) { showToast(e.response?.data?.message || 'Lỗi', 'error'); }
  };

  const statusLabel = { approved: 'Đã duyệt', pending: 'Chờ duyệt', rejected: 'Bị từ chối' };
  const statusClass = { approved: 'cgp-chip-approved', pending: 'cgp-chip-pending', rejected: 'cgp-chip-rejected' };
  const statusIcon  = { approved: <FaCheckCircle />, pending: <FaClock />, rejected: <FaTimesCircle /> };

  if (posts.length === 0) return (
    <div className="cgp-empty-posts">
      <div className="cgp-empty-icon"><FaNewspaper /></div>
      <p>Bạn chưa có bài viết nào trong nhóm này</p>
    </div>
  );

  return (
    <div>
      {posts.map(post => (
        <div key={post.id} className="cgp-my-post-item">
          <div className="cgp-my-post-header">
            <div className="cgp-my-post-title">{post.content?.slice(0, 120)}{post.content?.length > 120 ? '...' : ''}</div>
            <span className={`cgp-status-chip ${statusClass[post.status] || 'cgp-chip-pending'}`}>
              {statusIcon[post.status]} {statusLabel[post.status] || post.status}
            </span>
          </div>
          <div className="cgp-my-post-meta">
            <span style={{ fontSize: 'var(--cgp-xs)', color: 'var(--cgp-text-2)' }}><FaClock style={{ marginRight: 3 }} />{formatTime(post.created_at)}</span>
            <span style={{ fontSize: 'var(--cgp-xs)', color: 'var(--cgp-text-2)' }}><FaHeart style={{ marginRight: 3 }} />{post.likes_count || 0}</span>
            <span style={{ fontSize: 'var(--cgp-xs)', color: 'var(--cgp-text-2)' }}><FaComment style={{ marginRight: 3 }} />{post.comments_count || 0}</span>
            {post.status === 'rejected' && post.rejection_reason && (
              <span style={{ fontSize: 'var(--cgp-xs)', color: 'var(--cgp-danger)' }}>Lý do: {post.rejection_reason}</span>
            )}
          </div>
          <div className="cgp-my-post-actions">
            {post.status !== 'rejected' && (
              <button className="cgp-btn-outline" style={{ padding: '5px 10px', fontSize: 'var(--cgp-xs)' }}
                onClick={() => setEditPost(post)}><FaEdit /> Sửa</button>
            )}
            <button className="cgp-btn-danger" style={{ padding: '5px 10px', fontSize: 'var(--cgp-xs)' }}
              onClick={() => handleDelete(post.id)}><FaTimesCircle /> Xóa</button>
          </div>
        </div>
      ))}
      {editPost && (
        <EditPostModal post={editPost} groupId={groupId} group={group}
          onClose={() => setEditPost(null)}
          onSuccess={(updated) => {
            setPosts(prev => prev.map(p => p.id === updated.id ? updated : p));
            setEditPost(null);
            showToast('Đã cập nhật bài viết!');
            onRefresh();
          }}
        />
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// CreatePostModal
// ══════════════════════════════════════════════════════════════════════════════
const CreatePostModal = ({ group, currentUser, onClose, onSuccess, onEmergency }) => {
  const [content, setContent]             = useState('');
  const [images, setImages]               = useState([]);
  const [isAnonymous, setIsAnonymous]     = useState(false);
  const [agreedDisclaimer, setAgreed]     = useState(false);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    if (images.length + files.length > 5) { setError('Tối đa 5 ảnh'); return; }
    setImages(prev => [...prev, ...files.map(f => ({ file: f, preview: URL.createObjectURL(f) }))]);
  };

  const handleSubmit = async () => {
    setError('');
    if (!content.trim()) { setError('Nội dung không được trống'); return; }
    if (!agreedDisclaimer) { setError('Bạn cần đồng ý với tuyên bố miễn trách'); return; }
    if (EMERGENCY_KW.some(k => content.toLowerCase().includes(k))) {
      onEmergency('Bài viết chứa từ khóa khẩn cấp. Vui lòng liên hệ bác sĩ ngay!');
      return;
    }
    setLoading(true);
    try {
      const b64Images = await Promise.all(images.map(i => fileToBase64(i.file)));
      const res = await communityService.createPost(group.id, { content: content.trim(), images: b64Images, is_anonymous: isAnonymous });
      onSuccess(res.data?.data);
    } catch (e) { setError(e.response?.data?.message || 'Lỗi đăng bài'); }
    finally { setLoading(false); }
  };

  return (
    <div className="cgp-modal-overlay" onClick={onClose}>
      <div className="cgp-modal" onClick={e => e.stopPropagation()}>
        <div className="cgp-modal-head">
          <div className="cgp-modal-title"><FaPen /> Đăng Bài Mới</div>
          <button className="cgp-modal-close" onClick={onClose}><FaTimes /></button>
        </div>
        <div className="cgp-modal-body">
          <div className="cgp-modal-author-row">
            <img src={getImageUrl(currentUser?.avatar_url, true)} alt="" className="cgp-modal-avatar" />
            <div>
              <div className="cgp-modal-author-name">{isAnonymous ? 'Đăng ẩn danh' : currentUser?.full_name}</div>
              <label className="cgp-anon-toggle">
                <input type="checkbox" checked={isAnonymous} onChange={e => setIsAnonymous(e.target.checked)} />
                <span className="cgp-toggle-slider" />
                Đăng ẩn danh
              </label>
            </div>
          </div>
          {error && <div className="cgp-modal-error">{error}</div>}
          <textarea className="cgp-modal-textarea" rows={5} maxLength={2000}
            placeholder="Chia sẻ câu hỏi, kinh nghiệm của bạn với cộng đồng..."
            value={content} onChange={e => setContent(e.target.value)} />
          <div className="cgp-modal-char">{content.length}/2000</div>
          <div className="cgp-modal-images">
            {images.map((img, idx) => (
              <div key={idx} className="cgp-modal-img-preview">
                <img src={img.preview} alt="" />
                <button className="cgp-modal-img-remove" onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}><FaTimes /></button>
              </div>
            ))}
            {images.length < 5 && (
              <label className="cgp-modal-img-add">
                <FaImages /> Thêm ảnh
                <input type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={handleImageSelect} />
              </label>
            )}
          </div>
          <label className="cgp-modal-disclaimer">
            <input type="checkbox" checked={agreedDisclaimer} onChange={e => setAgreed(e.target.checked)} />
            <FaCheckCircle style={{ color: 'var(--cgp-green)', marginRight: 4 }} />
            Tôi đồng ý nội dung chỉ mang tính tham khảo, không thay thế bác sĩ
          </label>
          {group.requires_post_approval && (
            <div className="cgp-modal-note"><FaClock /> Bài viết cần quản trị viên duyệt trước khi hiển thị</div>
          )}
        </div>
        <div className="cgp-modal-foot">
          <button className="cgp-btn-outline" onClick={onClose} disabled={loading}><FaTimes /> Hủy</button>
          <button className="cgp-btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? <><FaSpinner /> Đang đăng...</> : <><FaCheck /> Đăng Bài</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// EditPostModal
// ══════════════════════════════════════════════════════════════════════════════
const EditPostModal = ({ post, groupId, group, onClose, onSuccess }) => {
  const [content, setContent] = useState(post.content || '');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleSave = async () => {
    if (!content.trim()) { setError('Nội dung không được trống'); return; }
    setLoading(true);
    try {
      const res = await communityService.updatePost(groupId, post.id, { content: content.trim() });
      onSuccess(res.data?.data || { ...post, content: content.trim() });
    } catch (e) { setError(e.response?.data?.message || 'Lỗi'); }
    finally { setLoading(false); }
  };

  return (
    <div className="cgp-modal-overlay" onClick={onClose}>
      <div className="cgp-modal cgp-modal-sm" onClick={e => e.stopPropagation()}>
        <div className="cgp-modal-head">
          <div className="cgp-modal-title"><FaEdit /> Sửa Bài Viết</div>
          <button className="cgp-modal-close" onClick={onClose}><FaTimes /></button>
        </div>
        <div className="cgp-modal-body">
          {error && <div className="cgp-modal-error">{error}</div>}
          <textarea className="cgp-modal-textarea" rows={6} value={content}
            onChange={e => setContent(e.target.value)} maxLength={2000} />
          <div className="cgp-modal-char">{content.length}/2000</div>
          {group.requires_post_approval && (
            <div className="cgp-modal-note"><FaClock /> Bài viết sẽ cần duyệt lại sau khi sửa</div>
          )}
        </div>
        <div className="cgp-modal-foot">
          <button className="cgp-btn-outline" onClick={onClose}><FaTimes /> Hủy</button>
          <button className="cgp-btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? <FaSpinner /> : <FaSave />} Lưu
          </button>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// MembersModal — với kick, mute, promote + stats
// ══════════════════════════════════════════════════════════════════════════════
const MembersModal = ({ group, currentUser, canManage, onClose, showToast }) => {
  const navigate = useNavigate();
  const [members, setMembers]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [page, setPage]             = useState(1);
  const [total, setTotal]           = useState(0);
  const [confirmAction, setConfirm] = useState(null); // { type, member }
  const [actionLoading, setActL]    = useState(false);
  const [muteForm, setMuteForm]     = useState({ duration_days: 7, reason: '' });
  const [memberPosts, setMemberPosts] = useState(null); // { member, posts }

  const LIMIT = 15;

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await communityService.getGroupMembers(group.id, { page, limit: LIMIT, search });
      const d   = res.data?.data;
      setMembers(Array.isArray(d?.members) ? d.members : []);
      setTotal(d?.total || 0);
    } catch {}
    finally { setLoading(false); }
  }, [group.id, page, search]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const roleConfig = {
    owner:     { icon: <FaCrown />,      label: 'Trưởng nhóm', cls: 'cgp-role-owner' },
    moderator: { icon: <FaUserShield />, label: 'Quản lý',     cls: 'cgp-role-moderator' },
    member:    { icon: <FaUser />,       label: 'Thành viên',  cls: 'cgp-role-member' },
  };

  const handleAction = async () => {
    if (!confirmAction) return;
    const { type, member, data } = confirmAction;
    setActL(true);
    try {
      if (type === 'kick') {
        await communityService.kickMember(group.id, member.user_id, { reason: data?.reason });
        showToast(`Đã kick ${member.user?.full_name} khỏi nhóm`);
      } else if (type === 'mute') {
        await communityService.muteMember(group.id, member.user_id, { reason: data.reason, duration_days: data.duration_days || null });
        showToast(`Đã hạn chế đăng bài ${member.user?.full_name}`);
      } else if (type === 'unmute') {
        await communityService.unmuteMember(group.id, member.user_id);
        showToast('Đã gỡ hạn chế');
      } else if (type === 'promote_mod') {
        await communityService.promoteMember(group.id, member.user_id, { role: 'moderator' });
        showToast('Đã thăng chức Quản lý');
      } else if (type === 'demote') {
        await communityService.promoteMember(group.id, member.user_id, { role: 'member' });
        showToast('Đã hạ xuống Thành viên');
      }
      setConfirm(null);
      fetchMembers();
    } catch (e) { showToast(e.response?.data?.message || 'Lỗi', 'error'); }
    finally { setActL(false); }
  };

  const loadMemberPosts = async (member) => {
    try {
      const res = await communityService.getMemberPosts(group.id, member.user_id);
      const d   = res.data?.data;
      setMemberPosts({ member, posts: Array.isArray(d?.posts) ? d.posts : [] });
    } catch {}
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="cgp-modal-overlay" onClick={onClose}>
      <div className="cgp-modal cgp-modal-lg" onClick={e => e.stopPropagation()}>
        <div className="cgp-modal-head">
          <div className="cgp-modal-title"><FaUsers /> Thành Viên ({total})</div>
          <button className="cgp-modal-close" onClick={onClose}><FaTimes /></button>
        </div>
        <div className="cgp-modal-body">
          {/* Search */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <FaSearch style={{ color: 'var(--cgp-text-2)', flexShrink: 0 }} />
            <input style={{ flex: 1, padding: '8px 12px', border: '1.5px solid var(--cgp-border)', borderRadius: 'var(--cgp-radius-sm)', fontSize: 'var(--cgp-sm)', outline: 'none' }}
              placeholder="Tìm tên thành viên..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>

          {loading ? (
            <div className="cgp-loading"><div className="cgp-spinner" /></div>
          ) : members.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--cgp-text-2)', padding: 20 }}>Không tìm thấy thành viên nào</p>
          ) : (
            members.map(m => {
              const rc = roleConfig[m.role] || roleConfig.member;
              const isSelf = m.user_id === currentUser?.id;
              return (
                <div key={m.id} className="cgp-member-row">
                  <div className="cgp-member-avatar-wrap">
                    {m.user?.avatar_url ? <img src={m.user.avatar_url} alt="" /> : <span>{(m.user?.full_name || 'U')[0]}</span>}
                  </div>
                  <div className="cgp-member-info">
                    <div className="cgp-member-name">{m.user?.full_name || `User #${m.user_id}`}</div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center', marginTop: 2 }}>
                      <span className={`cgp-member-role-badge ${rc.cls}`}>{rc.icon} {rc.label}</span>
                      {m.status === 'muted'  && <span className="cgp-member-status-badge cgp-status-muted"><FaVolumeMute /> Bị hạn chế</span>}
                      {m.status === 'banned' && <span className="cgp-member-status-badge cgp-status-banned"><FaBan /> Đã bị kick</span>}
                    </div>
                    <div className="cgp-member-stats">
                      Tham gia: {m.joined_at ? new Date(m.joined_at).toLocaleDateString('vi-VN') : '–'} &nbsp;·&nbsp;
                      Bài đăng: {m.posts_count || 0} &nbsp;·&nbsp;
                      {m.last_post_at ? (
                        <span className="cgp-member-last-post" onClick={() => loadMemberPosts(m)}>
                          Gần nhất: {formatTime(m.last_post_at)}
                        </span>
                      ) : 'Chưa đăng bài'}
                    </div>
                  </div>
                  {canManage && !isSelf && m.role !== 'owner' && (
                    <div className="cgp-member-actions-wrap">
                      {m.status !== 'banned' && (
                        <button className="cgp-btn-outline" style={{ padding: '4px 8px', fontSize: 'var(--cgp-xs)' }}
                          title="Hạn chế đăng bài"
                          onClick={() => { setMuteForm({ duration_days: 7, reason: '' }); setConfirm({ type: m.status === 'muted' ? 'unmute' : 'mute', member: m }); }}>
                          <FaVolumeMute />
                        </button>
                      )}
                      {m.role === 'member' && (
                        <button className="cgp-btn-outline" style={{ padding: '4px 8px', fontSize: 'var(--cgp-xs)' }}
                          title="Thăng chức Quản lý"
                          onClick={() => setConfirm({ type: 'promote_mod', member: m })}>
                          <FaUserShield />
                        </button>
                      )}
                      {m.role === 'moderator' && (
                        <button className="cgp-btn-outline" style={{ padding: '4px 8px', fontSize: 'var(--cgp-xs)' }}
                          title="Hạ xuống Thành viên"
                          onClick={() => setConfirm({ type: 'demote', member: m })}>
                          <FaUserCheck />
                        </button>
                      )}
                      <button className="cgp-btn-danger" style={{ padding: '4px 8px', fontSize: 'var(--cgp-xs)' }}
                        title="Kick khỏi nhóm"
                        onClick={() => setConfirm({ type: 'kick', member: m })}>
                        <FaUserSlash />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {totalPages > 1 && (
            <div className="cgp-pagination">
              <button className="cgp-btn-outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}><FaChevronLeft /></button>
              <span>{page} / {totalPages}</span>
              <button className="cgp-btn-outline" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><FaChevronRight /></button>
            </div>
          )}
        </div>
      </div>

      {/* Confirm action popup */}
      {confirmAction && (
        <div className="cgp-modal-overlay" style={{ zIndex: 1200 }} onClick={() => setConfirm(null)}>
          <div className="cgp-confirm-popup" onClick={e => e.stopPropagation()}>
            <div className="cgp-confirm-icon">
              {confirmAction.type === 'kick'        && <FaUserSlash  style={{ color: 'var(--cgp-danger)' }} />}
              {confirmAction.type === 'mute'        && <FaVolumeMute style={{ color: 'var(--cgp-warning)' }} />}
              {confirmAction.type === 'unmute'      && <FaUserCheck  style={{ color: 'var(--cgp-green)' }} />}
              {confirmAction.type === 'promote_mod' && <FaUserShield style={{ color: 'var(--cgp-info)' }} />}
              {confirmAction.type === 'demote'      && <FaUser       style={{ color: 'var(--cgp-text-2)' }} />}
            </div>
            <p className="cgp-confirm-title">
              {confirmAction.type === 'kick'        && 'Kick thành viên'}
              {confirmAction.type === 'mute'        && 'Hạn chế đăng bài'}
              {confirmAction.type === 'unmute'      && 'Gỡ hạn chế'}
              {confirmAction.type === 'promote_mod' && 'Thăng chức Quản lý'}
              {confirmAction.type === 'demote'      && 'Hạ xuống Thành viên'}
            </p>
            <p className="cgp-confirm-msg">
              {confirmAction.type === 'kick'        && `Kick ${confirmAction.member.user?.full_name} ra khỏi nhóm? Họ sẽ không thể xem hay đăng bài.`}
              {confirmAction.type === 'mute'        && `Hạn chế ${confirmAction.member.user?.full_name} đăng bài. Chọn thời gian:`}
              {confirmAction.type === 'unmute'      && `Gỡ hạn chế cho ${confirmAction.member.user?.full_name}? Họ có thể đăng bài lại.`}
              {confirmAction.type === 'promote_mod' && `Thăng ${confirmAction.member.user?.full_name} lên Quản lý? Họ có thể duyệt bài và quản lý thành viên.`}
              {confirmAction.type === 'demote'      && `Hạ ${confirmAction.member.user?.full_name} xuống Thành viên thường?`}
            </p>

            {confirmAction.type === 'mute' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <select value={muteForm.duration_days}
                  onChange={e => setMuteForm(f => ({ ...f, duration_days: e.target.value === 'null' ? null : parseInt(e.target.value) }))}
                  style={{ padding: '7px 10px', border: '1.5px solid var(--cgp-border)', borderRadius: 'var(--cgp-radius-sm)', fontSize: 'var(--cgp-sm)' }}>
                  <option value="1">1 ngày</option>
                  <option value="3">3 ngày</option>
                  <option value="7">7 ngày</option>
                  <option value="30">30 ngày</option>
                  <option value="null">Vĩnh viễn</option>
                </select>
                <input placeholder="Lý do (tùy chọn)" value={muteForm.reason}
                  onChange={e => setMuteForm(f => ({ ...f, reason: e.target.value }))}
                  style={{ padding: '7px 10px', border: '1.5px solid var(--cgp-border)', borderRadius: 'var(--cgp-radius-sm)', fontSize: 'var(--cgp-sm)' }} />
              </div>
            )}

            {confirmAction.type === 'kick' && (
              <input placeholder="Lý do (tùy chọn)"
                onChange={e => setConfirm(c => ({ ...c, data: { reason: e.target.value } }))}
                style={{ padding: '7px 10px', border: '1.5px solid var(--cgp-border)', borderRadius: 'var(--cgp-radius-sm)', fontSize: 'var(--cgp-sm)' }} />
            )}

            <div className="cgp-confirm-actions">
              <button className="cgp-btn-outline" onClick={() => setConfirm(null)} disabled={actionLoading}>Hủy</button>
              <button
                className={confirmAction.type === 'kick' || confirmAction.type === 'mute' ? 'cgp-btn-danger' : 'cgp-btn-primary'}
                onClick={() => {
                  if (confirmAction.type === 'mute') {
                    setConfirm(c => ({ ...c, data: muteForm }));
                  }
                  handleAction();
                }}
                disabled={actionLoading}
              >
                {actionLoading ? <FaSpinner /> : <FaCheck />} Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Member posts popup */}
      {memberPosts && (
        <div className="cgp-modal-overlay" style={{ zIndex: 1200 }} onClick={() => setMemberPosts(null)}>
          <div className="cgp-modal" onClick={e => e.stopPropagation()}>
            <div className="cgp-modal-head">
              <div className="cgp-modal-title"><FaNewspaper /> Bài viết của {memberPosts.member.user?.full_name}</div>
              <button className="cgp-modal-close" onClick={() => setMemberPosts(null)}><FaTimes /></button>
            </div>
            <div className="cgp-modal-body">
              {memberPosts.posts.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--cgp-text-2)' }}>Chưa có bài viết nào</p>
              ) : memberPosts.posts.map(p => (
                <div key={p.id} className="cgp-my-post-item" style={{ cursor: 'pointer' }}
                  onClick={() => { setMemberPosts(null); onClose(); }}>
                  <div className="cgp-my-post-title">{p.content?.slice(0, 100)}{p.content?.length > 100 ? '...' : ''}</div>
                  <div className="cgp-my-post-meta">
                    <span style={{ fontSize: 'var(--cgp-xs)', color: 'var(--cgp-text-2)' }}><FaClock style={{ marginRight: 3 }} />{formatTime(p.created_at)}</span>
                    <span style={{ fontSize: 'var(--cgp-xs)', color: 'var(--cgp-text-2)' }}><FaHeart style={{ marginRight: 3 }} />{p.likes_count || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// EditGroupModal
// ══════════════════════════════════════════════════════════════════════════════
const EditGroupModal = ({ group, onClose, onSuccess }) => {
  const [form, setForm]     = useState({
    name:                   group.name || '',
    description:            group.description || '',
    privacy:                group.privacy || 'public',
    requires_post_approval: group.requires_post_approval ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Tên nhóm không được trống'); return; }
    setLoading(true);
    try {
      await communityService.updateGroup(group.id, form);
      onSuccess(form);
    } catch (e) { setError(e.response?.data?.message || 'Lỗi cập nhật'); }
    finally { setLoading(false); }
  };

  return (
    <div className="cgp-modal-overlay" onClick={onClose}>
      <div className="cgp-modal" onClick={e => e.stopPropagation()}>
        <div className="cgp-modal-head">
          <div className="cgp-modal-title"><FaEdit /> Sửa Thông Tin Nhóm</div>
          <button className="cgp-modal-close" onClick={onClose}><FaTimes /></button>
        </div>
        <div className="cgp-modal-body">
          {error && <div className="cgp-modal-error">{error}</div>}
          <div className="cgp-form-grid">
            <div className="cgp-form-field cgp-form-full">
              <label>Tên nhóm *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} maxLength={255} />
            </div>
            <div className="cgp-form-field cgp-form-full">
              <label>Mô tả nhóm</label>
              <textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="cgp-form-field">
              <label>Quyền riêng tư</label>
              <select value={form.privacy} onChange={e => setForm(f => ({ ...f, privacy: e.target.value }))}>
                <option value="public">Công khai</option>
                <option value="private">Riêng tư</option>
                <option value="invite_only">Chỉ qua lời mời</option>
              </select>
            </div>
            <div className="cgp-form-field" style={{ justifyContent: 'center' }}>
              <label>Kiểm duyệt bài đăng</label>
              <label className="cgp-settings-toggle">
                <input type="checkbox" checked={form.requires_post_approval}
                  onChange={e => setForm(f => ({ ...f, requires_post_approval: e.target.checked }))} />
                <span className="cgp-toggle-slider" />
                {form.requires_post_approval ? 'Bật — Cần duyệt trước' : 'Tắt — Đăng ngay'}
              </label>
            </div>
          </div>
        </div>
        <div className="cgp-modal-foot">
          <button className="cgp-btn-outline" onClick={onClose} disabled={loading}><FaTimes /> Hủy</button>
          <button className="cgp-btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? <FaSpinner /> : <FaSave />} Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// GroupSettingsTab
// ══════════════════════════════════════════════════════════════════════════════
const GroupSettingsTab = ({ group, onUpdate }) => {
  const [form, setForm]     = useState({
    name:                   group.name || '',
    description:            group.description || '',
    privacy:                group.privacy || 'public',
    requires_post_approval: group.requires_post_approval ?? true,
  });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await communityService.updateGroup(group.id, form);
      onUpdate(form);
    } catch (e) { alert(e.response?.data?.message || 'Lỗi cập nhật'); }
    finally { setLoading(false); }
  };

  return (
    <div className="cgp-settings">
      <h3 className="cgp-settings-title"><FaCog /> Cài Đặt Nhóm</h3>
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
          <option value="public">Công khai</option>
          <option value="private">Riêng tư</option>
          <option value="invite_only">Chỉ qua lời mời</option>
        </select>
      </div>
      <label className="cgp-settings-toggle">
        <input type="checkbox" checked={form.requires_post_approval}
          onChange={e => setForm(f => ({ ...f, requires_post_approval: e.target.checked }))} />
        <span className="cgp-toggle-slider" />
        Yêu cầu duyệt bài trước khi đăng
      </label>
      <button className="cgp-btn-primary" style={{ padding: '10px' }} onClick={handleSave} disabled={loading}>
        {loading ? <><FaSpinner /> Đang lưu...</> : <><FaSave /> Lưu Thay Đổi</>}
      </button>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// ConfirmModal — Generic
// ══════════════════════════════════════════════════════════════════════════════
const ConfirmModal = ({ icon, title, message, detail, confirmLabel, confirmClass, onCancel, onConfirm, askReason }) => {
  const [reason, setReason] = useState('');
  return (
    <div className="cgp-modal-overlay" onClick={onCancel}>
      <div className="cgp-confirm-popup" onClick={e => e.stopPropagation()}>
        <div className="cgp-confirm-icon">{icon}</div>
        <p className="cgp-confirm-title">{title}</p>
        <p className="cgp-confirm-msg">{message}</p>
        {detail && <div className="cgp-confirm-detail">{detail}</div>}
        {askReason && (
          <textarea className="cgp-modal-textarea" rows={3} placeholder="Lý do (tùy chọn)..."
            value={reason} onChange={e => setReason(e.target.value)} />
        )}
        <div className="cgp-confirm-actions">
          <button className="cgp-btn-outline" onClick={onCancel}><FaTimes /> Hủy</button>
          <button className={confirmClass || 'cgp-btn-primary'} onClick={() => onConfirm(reason)}>
            <FaCheck /> {confirmLabel || 'Xác nhận'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// EmergencyPopup
// ══════════════════════════════════════════════════════════════════════════════
const EmergencyPopup = ({ message, onClose, onCall }) => (
  <div className="cgp-modal-overlay cgp-emergency-overlay" onClick={onClose}>
    <div className="cgp-emergency-box" onClick={e => e.stopPropagation()}>
      <div className="cgp-emergency-icon"><FaExclamationTriangle /></div>
      <h2 className="cgp-emergency-title">CẢNH BÁO KHẨN CẤP</h2>
      <p className="cgp-emergency-msg">{message}</p>
      <button className="cgp-btn-danger cgp-btn-full" onClick={onCall}><FaPhoneAlt /> Gọi Video Call Ngay</button>
      <button className="cgp-btn-outline cgp-btn-full" onClick={onClose}><FaTimes /> Đóng</button>
      <p className="cgp-emergency-footer">Nguy hiểm tính mạng — gọi <strong>115</strong> ngay!</p>
    </div>
  </div>
);

export default CommunityGroupPage;