// client/src/pages/CommunityGroupManagePage.js
// Trang quản lý nhóm dành cho Admin/Staff/Doctor
// mode='manage': xem tất cả nhóm, duyệt pending
// mode='detail': xem chi tiết 1 nhóm theo slug (dùng chung)
import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import communityService from '../services/communityService';
import {
  FaUsers, FaCheck, FaTimes, FaClock, FaSearch,
  FaArrowLeft, FaUserMd, FaGlobe, FaLock, FaPlus
} from 'react-icons/fa';

const STATUS_COLORS = {
  pending: { bg: '#fff8e1', text: '#f57c00', label: 'Chờ duyệt' },
  active: { bg: '#e8f5e9', text: '#2e7d32', label: 'Hoạt động' },
  suspended: { bg: '#fce4ec', text: '#c62828', label: 'Đình chỉ' }
};

const CommunityGroupManagePage = ({ mode = 'manage' }) => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  // Manage mode state
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all'|'pending'|'active'|'suspended'
  const [search, setSearch] = useState('');
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // Detail mode state
  const [groupDetail, setGroupDetail] = useState(null);
  const [posts, setPosts] = useState([]);
  const [postLoading, setPostLoading] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState('posts'); // 'posts'|'members'|'requests'

  const userRole = typeof user?.role === 'object' ? user?.role?.name?.toLowerCase() : user?.role?.toLowerCase();
  
  const isAdmin = userRole === 'admin';
  const isStaff = userRole === 'staff';
  const isDoctor = userRole === 'doctor';
  
  // Tuỳ thuộc logic của bạn, nếu Staff vận hành lâm sàng được duyệt nhóm thì giữ nguyên
  const canApproveGroup = isAdmin || isStaff;

  // ── FETCH LIST (manage mode) ─────────────────────────
  useEffect(() => {
    if (mode !== 'manage') return;
    const fetchAll = async () => {
      setLoading(true);
      try {
        const params = {};
        if (activeFilter !== 'all') params.status = activeFilter;
        if (search) params.search = search;
        const res = await communityService.adminGetAllGroups(params);
        setGroups(res?.data?.data?.groups || []);
      } catch { setGroups([]); }
      finally { setLoading(false); }
    };
    fetchAll();
  }, [mode, activeFilter, search]);

  // ── FETCH DETAIL (detail mode) ───────────────────────
  useEffect(() => {
    if (mode !== 'detail' || !slug) return;
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const res = await communityService.getGroupBySlug(slug);
        setGroupDetail(res?.data?.data || null);
      } catch { setGroupDetail(null); }
      finally { setLoading(false); }
    };
    fetchDetail();
  }, [mode, slug]);

  useEffect(() => {
    if (mode !== 'detail' || !groupDetail) return;
    if (activeDetailTab !== 'posts') return;
    const fetchPosts = async () => {
      setPostLoading(true);
      try {
        const res = await communityService.getGroupPosts(groupDetail.id);
        setPosts(res?.data?.data?.posts || []);
      } catch { setPosts([]); }
      finally { setPostLoading(false); }
    };
    fetchPosts();
  }, [mode, groupDetail, activeDetailTab]);

  // ── HANDLERS ─────────────────────────────────────────
  const handleApprove = async (id) => {
    try {
      await communityService.adminApproveGroup(id);
      setGroups(prev => prev.map(g => g.id === id ? { ...g, status: 'active' } : g));
    } catch (e) {
      alert(e?.response?.data?.message || 'Lỗi duyệt nhóm');
    }
  };

  const handleReject = async (id) => {
    if (!rejectReason.trim()) return alert('Vui lòng nhập lý do từ chối');
    try {
      await communityService.adminRejectGroup(id, rejectReason);
      setGroups(prev => prev.map(g => g.id === id ? { ...g, status: 'suspended' } : g));
      setRejectingId(null);
      setRejectReason('');
    } catch (e) {
      alert(e?.response?.data?.message || 'Lỗi từ chối nhóm');
    }
  };

  const handleApprovePost = async (postId) => {
    try {
      await communityService.approvePost(postId);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: 'approved' } : p));
    } catch (e) {
      alert(e?.response?.data?.message || 'Lỗi duyệt bài');
    }
  };

  // ── RENDER: MANAGE MODE ───────────────────────────────
  if (mode === 'manage') {
    const pendingCount = groups.filter(g => g.status === 'pending').length;

    return (
      <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, color: '#1a3c2a' }}>Quản lý nhóm cộng đồng</h2>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {pendingCount > 0 && (
              <span style={{ background: '#FF9800', color: '#fff', padding: '4px 12px', borderRadius: 20, fontSize: 13 }}>
                {pendingCount} chờ duyệt
              </span>
            )}
            
            {/* Nút Tạo Nhóm */}
            {(isAdmin || isStaff || isDoctor) && (
              <button 
                onClick={() => navigate('/cong-dong')} 
                style={{ background: '#2fbf71', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <FaPlus /> Tạo nhóm mới
              </button>
            )}
          </div>
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1.5px solid #ddd', borderRadius: 8, padding: '8px 12px', flex: 1, minWidth: 200 }}>
            <FaSearch color="#aaa" />
            <input style={{ border: 'none', outline: 'none', fontSize: 14, width: '100%' }} placeholder="Tìm nhóm..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {['all', 'pending', 'active', 'suspended'].map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              style={{ padding: '8px 16px', borderRadius: 20, border: '1.5px solid', borderColor: activeFilter === f ? '#2fbf71' : '#ddd', background: activeFilter === f ? '#f0fff4' : '#fff', color: activeFilter === f ? '#2fbf71' : '#666', cursor: 'pointer', fontSize: 13 }}
            >
              {f === 'all' ? 'Tất cả' : f === 'pending' ? 'Chờ duyệt' : f === 'active' ? 'Hoạt động' : 'Đình chỉ'}
            </button>
          ))}
        </div>

        {loading && <p>Đang tải...</p>}

        {/* Table */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8f5e9', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f0fff4' }}>
                {['Nhóm', 'Loại', 'Bác sĩ', 'Thành viên', 'Trạng thái', 'Thao tác'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: '#1a3c2a', fontWeight: 600, borderBottom: '1px solid #e8f5e9' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map(g => {
                const s = STATUS_COLORS[g.status] || STATUS_COLORS.active;
                return (
                  <tr key={g.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{g.icon} {g.name}</div>
                      <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{g.description?.slice(0, 60)}...</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13 }}>
                      {g.type === 'official'
                        ? <span style={{ background: '#e8f5e9', color: '#2e7d32', padding: '2px 8px', borderRadius: 10 }}>Chính thống</span>
                        : <span style={{ background: '#e3f2fd', color: '#1565c0', padding: '2px 8px', borderRadius: 10 }}>Cộng đồng</span>
                      }
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13 }}>
                      {g.doctor?.user?.full_name || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13 }}>
                      <FaUsers style={{ marginRight: 4 }} />{g.members_count || 0}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: s.bg, color: s.text, padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{s.label}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button onClick={() => navigate(`/cong-dong/nhom/${g.slug}`)} style={{ padding: '5px 12px', background: '#e3f2fd', color: '#1565c0', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                          Xem chi tiết
                        </button>
                        {canApproveGroup && g.status === 'pending' && (
                          <>
                            <button onClick={() => handleApprove(g.id)} style={{ padding: '5px 10px', background: '#e8f5e9', color: '#2e7d32', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <FaCheck /> Duyệt
                            </button>
                            {rejectingId === g.id ? (
                              <div style={{ display: 'flex', gap: 4 }}>
                                <input placeholder="Lý do..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #ddd', fontSize: 12 }} />
                                <button onClick={() => handleReject(g.id)} style={{ padding: '4px 8px', background: '#fce4ec', color: '#c62828', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Xác nhận</button>
                                <button onClick={() => setRejectingId(null)} style={{ padding: '4px 8px', background: '#f5f5f5', color: '#666', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Huỷ</button>
                              </div>
                            ) : (
                              <button onClick={() => setRejectingId(g.id)} style={{ padding: '5px 10px', background: '#fce4ec', color: '#c62828', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <FaTimes /> Từ chối
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && groups.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: '#888' }}>Không có nhóm nào</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ── RENDER: DETAIL MODE ───────────────────────────────
  if (mode === 'detail') {
    if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div>;
    if (!groupDetail) return <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Nhóm không tồn tại hoặc chưa được duyệt.</div>;

    const g = groupDetail;
    const canManage = user && (user.id === g.owner_id || user.role === 'admin' || user.role === 'staff');

    return (
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 0 40px' }}>
        {/* Header */}
        <div style={{ background: g.cover_image ? `url(${g.cover_image}) center/cover` : 'linear-gradient(135deg,#2fbf71,#1a8f52)', height: 160, position: 'relative', borderRadius: '0 0 16px 16px', display: 'flex', alignItems: 'flex-end', padding: '16px 24px' }}>
          <button onClick={() => navigate(-1)} style={{ position: 'absolute', top: 16, left: 16, background: 'rgba(255,255,255,.8)', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <FaArrowLeft /> Quay lại
          </button>
          <span style={{ fontSize: 48, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.3))' }}>{g.icon || '👥'}</span>
          {g.type === 'official' && (
            <span style={{ background: '#2fbf71', color: '#fff', fontSize: 11, padding: '3px 8px', borderRadius: 12, marginLeft: 12, fontWeight: 600 }}>✓ Chính thống</span>
          )}
        </div>

        <div style={{ padding: '0 24px' }}>
          {/* Group info */}
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginTop: -24, position: 'relative', zIndex: 1, boxShadow: '0 4px 20px rgba(0,0,0,.08)', marginBottom: 20 }}>
            <h2 style={{ margin: '0 0 8px', color: '#1a3c2a' }}>{g.name}</h2>
            <p style={{ margin: '0 0 12px', color: '#666', fontSize: 14 }}>{g.description}</p>

            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13, color: '#666', marginBottom: 12 }}>
              <span><FaUsers style={{ marginRight: 4 }} />{g.members_count || 0} thành viên</span>
              <span>📝 {g.posts_count || 0} bài viết</span>
              <span>{g.privacy === 'public' ? <FaGlobe style={{ color: '#4CAF50', marginRight: 4 }} /> : <FaLock style={{ color: '#FF9800', marginRight: 4 }} />}{g.privacy === 'public' ? 'Công khai' : 'Riêng tư'}</span>
              {g.doctor?.user && <span><FaUserMd style={{ color: '#2fbf71', marginRight: 4 }} />BS. {g.doctor.user.full_name}</span>}
            </div>

            <div style={{ background: '#fff8e1', padding: '8px 12px', borderRadius: 8, fontSize: 12, color: '#795548', borderLeft: '3px solid #FFD700' }}>
              Nội dung trong nhóm mang tính chất tham khảo — không thay thế chỉ định của bác sĩ
            </div>
          </div>

          {/* Detail tabs */}
          <div style={{ display: 'flex', borderBottom: '2px solid #e8f5e9', marginBottom: 16, gap: 4 }}>
            {[['posts', '📝 Bài viết'], ['members', '👥 Thành viên']].map(([v, l]) => (
              <button key={v} onClick={() => setActiveDetailTab(v)} style={{ padding: '10px 20px', border: 'none', borderBottom: activeDetailTab === v ? '3px solid #2fbf71' : '3px solid transparent', background: 'transparent', cursor: 'pointer', fontSize: 14, color: activeDetailTab === v ? '#2fbf71' : '#666', fontWeight: activeDetailTab === v ? 600 : 400 }}>{l}</button>
            ))}
          </div>

          {/* Posts tab */}
          {activeDetailTab === 'posts' && (
            <div style={{ display: 'grid', gap: 16 }}>
              {groupDetail.posts?.length === 0 ? (
                 <p style={{ textAlign: 'center', color: '#888', marginTop: 20 }}>Chưa có bài đăng nào.</p>
              ) : (
                 groupDetail.posts?.map(p => (
                   <PostCard 
                     key={p.id} 
                     post={p} 
                     currentUser={user} 
                     onApprove={handleApprovePost} 
                   />
                 ))
              )}
            </div>
          )}

          {/* Members tab */}
          {activeDetailTab === 'members' && (
            <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e8f5e9' }}>
              <p style={{ color: '#888', textAlign: 'center' }}>Danh sách thành viên sẽ hiển thị ở đây</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};

// ───────────────────────────────────────────────────────
// COMPONENT: PostCard (Giao diện Fanpage Mới tích hợp API)
// ───────────────────────────────────────────────────────
const PostCard = ({ post, currentUser, onApprove }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentsList, setCommentsList] = useState([]);

  // Parse dữ liệu JSON từ Backend
  useEffect(() => {
    let likedBy = post.liked_by || [];
    if (typeof likedBy === 'string') likedBy = JSON.parse(likedBy);
    setIsLiked(likedBy.includes(currentUser?.id));
    setLikesCount(post.likes_count || 0);

    let parsedComments = post.comments_data || [];
    if (typeof parsedComments === 'string') parsedComments = JSON.parse(parsedComments);
    setCommentsList(parsedComments);
  }, [post, currentUser]);

  const authorName = post.is_anonymous ? '👤 Thành viên ẩn danh' : post.author?.full_name || 'Người dùng';
  const authorAvatar = post.is_anonymous ? 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png' : (post.author?.avatar_url || '/default-avatar.png');

  // Gọi API Thả tim
  const handleLike = async () => {
    try {
      // Cập nhật UI ngay lập tức cho mượt
      setIsLiked(!isLiked);
      setLikesCount(prev => isLiked ? Math.max(0, prev - 1) : prev + 1);
      await communityService.toggleLikePost(post.id);
    } catch (e) {
      console.error('Lỗi thả tim:', e);
      // Nếu lỗi thì revert lại
      setIsLiked(!isLiked);
      setLikesCount(prev => isLiked ? prev + 1 : Math.max(0, prev - 1));
    }
  };

  // Gọi API Bình luận
  const handleComment = async () => {
    if (!commentText.trim()) return;
    try {
      const res = await communityService.commentOnPost(post.id, commentText);
      setCommentsList([...commentsList, res.data.data]);
      setCommentText(''); // Xóa trắng ô input
    } catch (e) {
      alert('Lỗi gửi bình luận!');
    }
  };

  // Gọi API Báo cáo
  const handleReport = async () => {
    const reason = window.prompt("Nhập lý do báo cáo bài viết này:");
    if (!reason) return;
    try {
      await communityService.reportPost(post.id, reason);
      alert("Cảm ơn bạn! Đã gửi báo cáo thành công.");
    } catch (e) {
      alert(e.response?.data?.message || "Lỗi gửi báo cáo");
    }
  };

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e8f5e9', marginBottom: 16 }}>
      {/* HEADER BÀI VIẾT */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <img src={authorAvatar} alt="avatar" style={{ width: 45, height: 45, borderRadius: '50%', objectFit: 'cover' }} />
          <div>
            <h4 style={{ margin: 0, fontSize: 15, color: '#050505' }}>{authorName}</h4>
            <span style={{ fontSize: 12, color: '#65676b' }}>{new Date(post.created_at).toLocaleString('vi-VN')}</span>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          {/* Nút duyệt bài dành cho Admin (Nếu có) */}
          {post.status === 'pending' && onApprove && (
            <button onClick={() => onApprove(post.id)} style={{ background: '#2fbf71', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>✓ Duyệt bài</button>
          )}
          <button onClick={handleReport} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 18, color: '#65676b' }} title="Báo cáo">⋮</button>
        </div>
      </div>

      {/* NỘI DUNG */}
      <div style={{ fontSize: 15, color: '#050505', lineHeight: 1.5 }}>
        <p style={{ whiteSpace: 'pre-wrap', margin: '0 0 10px 0' }}>{post.content}</p>
        
        {/* Render mảng Ảnh */}
        {post.images && post.images.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8, marginTop: 10 }}>
            {post.images.map((img, idx) => (
              <img key={idx} src={img} alt="post-img" style={{ width: '100%', borderRadius: 8, maxHeight: 300, objectFit: 'cover' }} />
            ))}
          </div>
        )}
      </div>

      {/* CẢNH BÁO Y TẾ NẾU CÓ */}
      {post.has_sensitive_content && (
         <div style={{ background: '#fff3e0', padding: '8px 12px', borderRadius: 8, fontSize: 12, color: '#e65100', marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            ⚠️ Nội dung liên quan đến y khoa — Hãy liên hệ bác sĩ để được tư vấn chính xác.
         </div>
      )}

      {/* THỐNG KÊ LƯỢT THÍCH */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#65676b', marginTop: 15, paddingBottom: 10, borderBottom: '1px solid #ced0d4' }}>
        <span>👍❤️ {likesCount} người khác</span>
        <span>{commentsList.length} bình luận</span>
      </div>

      {/* NÚT TƯƠNG TÁC (LIKE / COMMENT) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
        <button onClick={handleLike} style={{ flex: 1, padding: '8px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 'bold', color: isLiked ? '#1877f2' : '#65676b', transition: '0.2s' }}>
          {isLiked ? '👍 Đã Thích' : '👍 Thích'}
        </button>
        <button onClick={() => setShowComments(!showComments)} style={{ flex: 1, padding: '8px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 'bold', color: '#65676b', transition: '0.2s' }}>
          💬 Bình luận
        </button>
      </div>

      {/* KHU VỰC BÌNH LUẬN */}
      {showComments && (
        <div style={{ marginTop: 15, paddingTop: 15, borderTop: '1px solid #ced0d4' }}>
          {/* List các bình luận cũ */}
          {commentsList.map((cmt) => (
             <div key={cmt.id} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <img src={cmt.avatar_url} alt="avt" style={{ width: 32, height: 32, borderRadius: '50%' }} />
                <div style={{ background: '#f0f2f5', padding: '8px 12px', borderRadius: 18 }}>
                   <strong style={{ display: 'block', fontSize: 13, color: '#050505' }}>{cmt.user_name}</strong>
                   <span style={{ fontSize: 14, color: '#050505' }}>{cmt.content}</span>
                </div>
             </div>
          ))}

          {/* Ô nhập bình luận mới */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <img src={currentUser?.avatar_url || '/default-avatar.png'} alt="my-avatar" style={{ width: 32, height: 32, borderRadius: '50%' }} />
            <div style={{ flex: 1, background: '#f0f2f5', borderRadius: 18, padding: '8px 12px', display: 'flex' }}>
              <input 
                type="text" 
                placeholder="Viết bình luận công khai..." 
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleComment()}
                style={{ border: 'none', background: 'transparent', outline: 'none', flex: 1 }}
              />
              <button onClick={handleComment} style={{ border: 'none', background: 'none', color: '#1877f2', fontWeight: 'bold', cursor: 'pointer' }}>Gửi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default CommunityGroupManagePage;