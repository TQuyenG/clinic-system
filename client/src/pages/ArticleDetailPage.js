// client/src/pages/ArticleDetailPage.js
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Breadcrumb from '../components/Breadcrumb';
import { 
  FaCalendar, FaUser, FaEye, FaThumbsUp, FaBookmark, FaShareAlt, 
  FaFlag, FaTag, FaChevronRight, FaChevronLeft, FaSearch, FaBars, FaTimes, 
  FaCommentDots, FaEllipsisV, FaNewspaper, FaHeartbeat, FaPills, FaExclamationTriangle
} from 'react-icons/fa';
import './ArticleDetailPage.css';

const formatAdLink = (url) => {
  if (!url) return "#";
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return url.startsWith('/') ? url : `/${url}`;
};

const ArticleDetailPage = ({ article: propArticle, categoryType: propCategoryType }) => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const API_BASE_URL = 'http://localhost:3001';

  // Core States
  const [article, setArticle] = useState(propArticle || null);
  const [loading, setLoading] = useState(!propArticle);
  const [user, setUser] = useState(null);
  
  // UI States
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  
  // Auto-scroll States
  const navScrollRef = useRef(null);
  const [isNavHovered, setIsNavHovered] = useState(false);
  
  // Interaction & Meta States
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [stats, setStats] = useState({ likes: 0, shares: 0, saves: 0, views: 0 });
  
  // Global Data (Sidebar & Menu)
  const [categories, setCategories] = useState([]);
  const [popularArticles, setPopularArticles] = useState([]);
  const [relatedArticles, setRelatedArticles] = useState([]);
  
  // Comment States
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');

  // Report States
  const [showReportPopup, setShowReportPopup] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const reportReasonsList = [
    'Nội dung không chính xác', 'Thông tin gây hiểu lầm', 
    'Thiếu nguồn tham khảo', 'Ngôn từ không phù hợp', 
    'Spam hoặc quảng cáo', 'Vi phạm bản quyền', 'Lý do khác'
  ];

  const actionMenuRef = useRef(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || 'null');
    setUser(userData);
    fetchGlobalData();

    if (!propArticle && slug) {
      fetchArticle();
    } else if (propArticle) {
      trackView();
      fetchInteractions();
      fetchRelatedArticles();
      fetchComments();
    }
    window.scrollTo(0, 0);
  }, [slug, propArticle]);

  useEffect(() => {
    if (article?.id) {
      trackView();
      fetchInteractions();
      fetchRelatedArticles();
      fetchComments();
    }
  }, [article?.id]);

  // Handle click outside Kebab Menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
        setIsActionMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Xử lý cuộn mượt cho Thanh Menu xanh
  useEffect(() => {
    let animationFrameId;
    const scrollElement = navScrollRef.current;

    const scrollStep = () => {
      if (scrollElement && !isNavHovered) {
        scrollElement.scrollLeft += 1.5;
        if (Math.ceil(scrollElement.scrollLeft) >= scrollElement.scrollWidth - scrollElement.clientWidth) {
          scrollElement.scrollLeft = 0;
        }
      }
      animationFrameId = requestAnimationFrame(scrollStep);
    };

    animationFrameId = requestAnimationFrame(scrollStep);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isNavHovered]);

  const scrollNavBy = (amount) => {
    if (navScrollRef.current) {
      navScrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  const fetchGlobalData = async () => {
    try {
      const [catsRes, popRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/articles/categories`),
        axios.get(`${API_BASE_URL}/api/articles/public?limit=5&sort_by=views&sort_order=DESC`)
      ]);
      if (catsRes.data.success) setCategories(catsRes.data.categories || []);
      if (popRes.data.success) setPopularArticles(popRes.data.articles || []);
    } catch (error) { console.error('Lỗi tải dữ liệu:', error); }
  };

  const fetchArticle = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/articles/slug/${slug}`);
      if (response.data.success) setArticle(response.data.article);
    } catch (error) {
      if (error.response?.status === 404) navigate('/404');
    } finally {
      setLoading(false);
    }
  };

  const trackView = async () => {
    if (!article?.id) return;
    try { await axios.post(`${API_BASE_URL}/api/articles/${article.id}/view`); } catch (e) {}
  };

  const fetchInteractions = async () => {
    if (!article?.id) return;
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(`${API_BASE_URL}/api/articles/${article.id}/interactions`, { headers });
      if (response.data.success) {
        setStats(response.data.stats);
        setIsLiked(response.data.userInteractions?.like || false);
        setIsSaved(response.data.userInteractions?.save || false);
      }
    } catch (e) {}
  };

  const fetchRelatedArticles = async () => {
    if (!article?.id) return;
    try {
      const params = { category_id: article.category_id };
      if (article.tags_json?.length > 0) params.tags = JSON.stringify(article.tags_json);
      const response = await axios.get(`${API_BASE_URL}/api/articles/related/${article.id}`, { params });
      if (response.data.success) setRelatedArticles(response.data.articles || []);
    } catch (e) {}
  };

  // Fetch Public Comments (API mới dự kiến)
  const fetchComments = async () => {
    if (!article?.id) return;
    try {
      const response = await axios.get(`${API_BASE_URL}/api/articles/${article.id}/public-comments`);
      if (response.data.success) setComments(response.data.comments || []);
    } catch (e) {
      // Fallback tạm về luồng cũ nếu backend chưa update
      console.warn('Vui lòng tạo API /public-comments trong backend để phân biệt comment nội bộ/công khai');
    }
  };

  const handleInteraction = async (type) => {
    setIsActionMenuOpen(false); 
    const token = localStorage.getItem('token');
    if (!token) { alert('Vui lòng đăng nhập!'); navigate('/login'); return; }
    try {
      const response = await axios.post(`${API_BASE_URL}/api/articles/${article.id}/interact`, { type }, { headers: { Authorization: `Bearer ${token}` } });
      if (response.data.success) {
        if (type === 'like') {
          setIsLiked(!isLiked);
          setStats(p => ({ ...p, likes: isLiked ? p.likes - 1 : p.likes + 1 }));
        } else if (type === 'save') {
          setIsSaved(!isSaved);
          setStats(p => ({ ...p, saves: isSaved ? p.saves - 1 : p.saves + 1 }));
          alert(isSaved ? 'Đã hủy lưu bài viết' : 'Đã lưu bài viết');
        }
      }
    } catch (e) { alert('Lỗi tương tác'); }
  };

  const handleShare = () => {
    setIsActionMenuOpen(false);
    navigator.clipboard.writeText(window.location.href);
    alert('Đã sao chép link bài viết!');
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) { alert('Vui lòng đăng nhập để báo cáo'); navigate('/login'); return; }
    if (!reportReason.trim()) { alert('Vui lòng nhập lý do báo cáo'); return; }

    try {
      setSubmittingReport(true);
      const response = await axios.post(
        `${API_BASE_URL}/api/articles/${article.id}/report`,
        { reason: reportReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        alert('Đã gửi báo cáo thành công! Admin sẽ xem xét.');
        setShowReportPopup(false);
        setReportReason('');
      }
    } catch (error) {
      alert('Lỗi: ' + (error.response?.data?.message || error.message));
    } finally {
      setSubmittingReport(false);
    }
  };

  // Nộp Comment Công khai (Dùng API mới dự kiến)
  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    const token = localStorage.getItem('token');
    if (!token) { alert('Vui lòng đăng nhập để bình luận!'); navigate('/login'); return; }
    
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/articles/${article.id}/public-comments`, 
        { comment_text: newComment }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        setNewComment('');
        fetchComments(); 
      }
    } catch (e) {
      alert('Vui lòng đảm bảo bạn đã tạo API /public-comments bên phía Backend.');
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if(searchInput) navigate(`/bai-viet?search=${searchInput}`);
  };

  const handleCategoryClick = (cat) => {
    setIsMenuOpen(false);
    const routeType = cat.category_type === 'tin_tuc' ? 'tin-tuc' : cat.category_type === 'thuoc' ? 'thuoc' : 'benh-ly';
    navigate(`/${routeType}/${cat.slug}`);
  };

  const getFirstImage = (html) => {
    if (!html) return '/placeholder.jpg';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const img = doc.querySelector('img');
    return img ? img.src : '/placeholder.jpg';
  };

  // --- FIX BREADCRUMB: TÌM ĐÚNG SLUG TỪ GLOBAL CATEGORIES ---
  const getBreadcrumbItems = () => {
    if (!article) return [];
    const typeMap = { 'tin_tuc': 'tin-tuc', 'thuoc': 'thuoc', 'benh_ly': 'benh-ly' };
    const typeLabels = { 'tin_tuc': 'Tin tức', 'thuoc': 'Thuốc', 'benh_ly': 'Bệnh lý' };
    
    const catType = article.category?.category_type;
    const mappedUrlPrefix = typeMap[catType] || 'tin-tuc';

    const items = [
      { label: 'Trang chủ', url: '/' },
      { label: 'Bài viết', url: '/bai-viet' }
    ];

    if (article.category) {
      items.push({ label: typeLabels[catType] || 'Danh mục', url: `/${mappedUrlPrefix}` });
      
      // Lấy category đầy đủ (có chứa slug) từ state categories thay vì từ article.category (thường thiếu slug do JOIN từ db)
      const fullCategory = categories.find(c => c.id === article.category_id) || article.category;
      
      // Tránh việc slug bị undefined, fallback về id nếu thật sự mất slug
      const catSlug = fullCategory?.slug || article.category_id;
      
      items.push({ label: article.category.name, url: `/${mappedUrlPrefix}/${catSlug}` });
    }
    items.push({ label: article.title, url: null });
    return items;
  };

  if (loading) return <div style={{textAlign: 'center', padding: '3rem'}}>Đang tải bài viết...</div>;
  if (!article) return <div style={{textAlign: 'center', padding: '3rem'}}>Không tìm thấy bài viết</div>;

  // Xử lý link cho nút "Xem thêm"
  const catTypeMap = { 'tin_tuc': 'tin-tuc', 'thuoc': 'thuoc', 'benh_ly': 'benh-ly' };
  const parentRoute = catTypeMap[article.category?.category_type] || 'tin-tuc';
  const fullCat = categories.find(c => c.id === article.category_id) || article.category;
  const subCategoryUrl = `/${parentRoute}/${fullCat?.slug || article.category_id}`;

  const currentSidebarAd = article.category?.sidebar_ad_image_url ? article.category : categories.find(c => c.sidebar_ad_image_url);

  return (
    <div className="detail-page-wrapper">
      
      {/* 1. BREADCRUMB Ở TRÊN CÙNG */}
      <div className="detail-container detail-breadcrumb-wrapper">
        <Breadcrumb items={getBreadcrumbItems()} />
      </div>

      {/* 2. THANH MENU XANH LÁ (CÓ AUTO-SCROLL NHƯ TRANG DANH SÁCH) */}
      <div 
        className="detail-green-navbar"
        onMouseEnter={() => setIsNavHovered(true)}
        onMouseLeave={() => setIsNavHovered(false)}
      >
        <div className="detail-container detail-marquee-wrapper">
          {isNavHovered && (
            <button className="detail-nav-arrow left" onClick={() => scrollNavBy(-300)}>
              <FaChevronLeft />
            </button>
          )}

          <div className="detail-nav-scroll" ref={navScrollRef}>
            <button className="detail-nav-btn" onClick={() => navigate('/bai-viet')}>TẤT CẢ</button>
            {categories.map(cat => (
              <button 
                key={cat.id} 
                className={`detail-nav-btn ${article.category_id === cat.id ? 'active' : ''}`}
                onClick={() => handleCategoryClick(cat)}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {isNavHovered && (
            <button className="detail-nav-arrow right" onClick={() => scrollNavBy(300)}>
              <FaChevronRight />
            </button>
          )}
        </div>
      </div>

      <div className="detail-container">
        
        {/* 3. HEADER: DANH MỤC LỚN, SEARCH & MEGA MENU */}
        <div className="detail-header-section">
          <h1 className="detail-main-title">
            {article.category?.name || 'CHI TIẾT BÀI VIẾT'} <FaChevronRight size={14} color="#cbd5e1"/>
          </h1>
          
          <div className="detail-header-actions">
            <form className="detail-search-mini" onSubmit={handleSearchSubmit}>
              <input 
                type="text" placeholder="Tìm bài viết..." 
                value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
              />
              <button type="submit"><FaSearch /></button>
            </form>

            <div className="detail-mega-wrapper">
              <button className="detail-menu-toggle-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                {isMenuOpen ? <FaTimes /> : <FaBars />} DANH MỤC
              </button>

              {isMenuOpen && (
                <div className="detail-mega-menu">
                  <div className="detail-mega-col">
                    <h3><FaNewspaper /> Tin tức Y tế</h3>
                    <ul>
                      {categories.filter(c => c.category_type === 'tin_tuc').map(cat => (
                        <li key={cat.id} onClick={() => handleCategoryClick(cat)}>{cat.name}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="detail-mega-col">
                    <h3><FaHeartbeat /> Tra cứu Bệnh lý</h3>
                    <ul>
                      {categories.filter(c => c.category_type === 'benh_ly').map(cat => (
                        <li key={cat.id} onClick={() => handleCategoryClick(cat)}>{cat.name}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="detail-mega-col">
                    <h3><FaPills /> Từ điển Thuốc</h3>
                    <ul>
                      {categories.filter(c => c.category_type === 'thuoc').map(cat => (
                        <li key={cat.id} onClick={() => handleCategoryClick(cat)}>{cat.name}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="detail-layout-grid">
          
          {/* --- CỘT TRÁI (NỘI DUNG CHÍNH) --- */}
          <div className="detail-main-content">
            
            <div className="detail-title-wrapper">
              <h1 className="detail-article-title">{article.title}</h1>
              
              {/* Nút 3 chấm gọn gàng */}
              <div className="detail-action-dropdown-wrapper" ref={actionMenuRef}>
                <button className="detail-kebab-btn" onClick={() => setIsActionMenuOpen(!isActionMenuOpen)}>
                  <FaEllipsisV />
                </button>
                
                {isActionMenuOpen && (
                  <div className="detail-action-menu">
                    <button className={`detail-action-item ${isLiked ? 'active' : ''}`} onClick={() => handleInteraction('like')}>
                      <FaThumbsUp /> {isLiked ? 'Đã thích' : 'Thích'} ({stats.likes || 0})
                    </button>
                    <button className={`detail-action-item ${isSaved ? 'active' : ''}`} onClick={() => handleInteraction('save')}>
                      <FaBookmark /> {isSaved ? 'Đã lưu' : 'Lưu bài viết'}
                    </button>
                    <button className="detail-action-item" onClick={handleShare}>
                      <FaShareAlt /> Chia sẻ
                    </button>
                    <button className="detail-action-item report-item" onClick={() => { setIsActionMenuOpen(false); setShowReportPopup(true); }}>
                      <FaFlag /> Báo cáo vi phạm
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="detail-article-meta">
              <span><FaUser color="#059669"/> {article.author?.full_name || 'Ẩn danh'}</span>
              <span><FaCalendar color="#059669"/> {new Date(article.created_at).toLocaleDateString('vi-VN')}</span>
              <span><FaEye color="#059669"/> {stats.views || article.views || 0} lượt xem</span>
            </div>

            <div className="detail-article-body" dangerouslySetInnerHTML={{ __html: article.content }} />

            {article.tags_json?.length > 0 && (
              <div className="detail-tags">
                <FaTag color="#6b7280" style={{marginTop: '4px'}}/>
                {article.tags_json.map((tag, idx) => (
                  <span key={idx} className="detail-tag-item">{tag}</span>
                ))}
              </div>
            )}

            {/* BÌNH LUẬN CÔNG KHAI */}
            <div className="detail-comments-section">
              <h3><FaCommentDots /> Bình luận ({comments.length})</h3>
              <form className="detail-comment-form" onSubmit={handleSubmitComment}>
                <textarea 
                  rows="3" placeholder="Chia sẻ suy nghĩ của bạn về bài viết..." 
                  value={newComment} onChange={(e) => setNewComment(e.target.value)}
                />
                <button type="submit" className="detail-comment-btn">Gửi bình luận</button>
              </form>
              
              <div className="detail-comment-list">
                {comments.map(c => (
                  <div key={c.id} className="detail-comment-item">
                    <div className="detail-comment-meta">{c.user?.full_name} • {new Date(c.created_at).toLocaleDateString('vi-VN')}</div>
                    <p className="detail-comment-text">{c.comment_text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* BÀI VIẾT LIÊN QUAN */}
            {relatedArticles.length > 0 && (
              <div className="detail-related-section">
                <div className="detail-related-header">
                  <h2>CÁC BÀI VIẾT LIÊN QUAN</h2>
                  <button className="detail-view-more-btn" onClick={() => navigate(subCategoryUrl)}>
                    Xem thêm <FaChevronRight />
                  </button>
                </div>
                
                <div className="detail-related-list">
                  {relatedArticles.slice(0, 6).map(related => (
                    <div key={related.id} className="detail-related-item" onClick={() => {
                        const rType = catTypeMap[related.category?.category_type] || 'tin-tuc';
                        navigate(`/${rType}/${related.slug}`);
                        window.scrollTo(0,0);
                    }}>
                      <div className="detail-related-img">
                        <img src={getFirstImage(related.content)} alt={related.title} />
                      </div>
                      <div className="detail-related-info">
                        <h4>{related.title}</h4>
                        <span><FaCalendar /> {new Date(related.created_at).toLocaleDateString('vi-VN')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* --- CỘT PHẢI (SIDEBAR) --- */}
          <div className="detail-sidebar">
            
            {currentSidebarAd && (
              <div className="detail-ad-box">
                <a href={formatAdLink(currentSidebarAd.sidebar_ad_target_link)} target="_blank" rel="noreferrer">
                  <img src={currentSidebarAd.sidebar_ad_image_url} alt="Quảng cáo" />
                </a>
              </div>
            )}

            <div>
              <h3 className="detail-widget-title">ĐỌC NHIỀU NHẤT</h3>
              <div className="detail-popular-list">
                {popularArticles.map((pop, index) => (
                  <div key={pop.id} className="detail-popular-item" onClick={() => {
                    const pType = catTypeMap[pop.category?.category_type] || 'tin-tuc';
                    navigate(`/${pType}/${pop.slug}`);
                    window.scrollTo(0,0);
                  }}>
                    <span className="detail-popular-rank">{index + 1}</span>
                    <div className="detail-popular-content">
                      <h4>{pop.title}</h4>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* THÔNG TIN THAM CHIẾU (THUỐC / BỆNH LÝ) */}
            {((article.entity_type === 'medicine' && article.medicine) || 
              (article.entity_type === 'disease' && article.disease)) && (
              
              <div className="detail-reference-box">
                <div className="detail-ref-header">
                  Thông tin chuyên sâu
                </div>
                
                {article.entity_type === 'medicine' && article.medicine && (
                  <>
                    <div className="detail-ref-section">
                      <strong>Thành phần:</strong> <p>{article.medicine.composition}</p>
                    </div>
                    <div className="detail-ref-section">
                      <strong>Công dụng:</strong> <p>{article.medicine.uses}</p>
                    </div>
                    <button className="detail-ref-btn" onClick={() => navigate(`/tra-cuu-thuoc/${article.medicine.slug || article.medicine.id}`)}>
                      Xem chi tiết thuốc
                    </button>
                  </>
                )}

                {article.entity_type === 'disease' && article.disease && (
                  <>
                    <div className="detail-ref-section">
                      <strong>Triệu chứng:</strong> <p>{article.disease.symptoms}</p>
                    </div>
                    <div className="detail-ref-section">
                      <strong>Điều trị:</strong> <p>{article.disease.treatments}</p>
                    </div>
                    <button className="detail-ref-btn" onClick={() => navigate(`/tra-cuu-benh-ly/${article.disease.slug || article.disease.id}`)}>
                      Xem chi tiết bệnh lý
                    </button>
                  </>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* POPUP BÁO CÁO */}
      {showReportPopup && (
        <div className="detail-report-overlay" onClick={() => setShowReportPopup(false)}>
          <div className="detail-report-modal" onClick={e => e.stopPropagation()}>
            <div className="detail-report-header">
              <h3><FaExclamationTriangle color="#ef4444"/> Báo cáo vi phạm</h3>
              <button className="detail-report-close" onClick={() => setShowReportPopup(false)}><FaTimes/></button>
            </div>
            <form onSubmit={handleSubmitReport} className="detail-report-body">
              <p>Vui lòng chọn hoặc nhập lý do bạn muốn báo cáo bài viết này:</p>
              
              <div className="detail-report-reasons">
                {reportReasonsList.map((r, idx) => (
                  <button 
                    key={idx} type="button"
                    className={`detail-report-reason-btn ${reportReason === r ? 'active' : ''}`}
                    onClick={() => setReportReason(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <textarea 
                rows="4" placeholder="Nhập chi tiết lý do..." required
                value={reportReason} onChange={(e) => setReportReason(e.target.value)}
              />

              <div className="detail-report-footer">
                <button type="button" className="detail-report-cancel" onClick={() => setShowReportPopup(false)} disabled={submittingReport}>Hủy</button>
                <button type="submit" className="detail-report-submit" disabled={submittingReport || !reportReason.trim()}>
                  {submittingReport ? 'Đang gửi...' : 'Gửi báo cáo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ArticleDetailPage;