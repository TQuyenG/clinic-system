// client/src/pages/ArticleDetailPage.js - HOÀN CHỈNH
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Breadcrumb from '../components/Breadcrumb';
import { ArticleReportPopup, ArticleReportsList } from '../components/article/ArticleReportComponents';
import { 
  FaCalendar, FaUser, FaEye, FaThumbsUp, FaShareAlt, 
  FaBookmark, FaArrowLeft, FaTag, FaLink, FaFlag, FaRedo
} from 'react-icons/fa';
import './ArticleDetailPage.css';

const ArticleDetailPage = ({ article: propArticle, categoryType: propCategoryType }) => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(propArticle || null);
  const [loading, setLoading] = useState(!propArticle);
  const [user, setUser] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [stats, setStats] = useState({ likes: 0, shares: 0, saves: 0, views: 0 });
  const [showReportPopup, setShowReportPopup] = useState(false);

  const API_BASE_URL = 'http://localhost:3001';

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || 'null');
    setUser(userData);

    if (!propArticle && slug) {
      fetchArticle();
    } else if (propArticle) {
      trackView();
      fetchInteractions();
    }
  }, [slug, propArticle]);

  useEffect(() => {
    if (article?.id) {
      trackView();
      fetchInteractions();
    }
  }, [article?.id]);

  const trackView = async () => {
    if (!article?.id) return;
    
    try {
      await axios.post(`${API_BASE_URL}/api/articles/${article.id}/view`);
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  const fetchArticle = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/articles/slug/${slug}`);
      
      if (response.data.success) {
        setArticle(response.data.article);
      }
    } catch (error) {
      console.error('Error fetching article:', error);
      if (error.response?.status === 404) {
        navigate('/404');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchInteractions = async () => {
    if (!article?.id) return;

    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const response = await axios.get(
        `${API_BASE_URL}/api/articles/${article.id}/interactions`,
        { headers }
      );

      if (response.data.success) {
        setStats(response.data.stats);
        const userInt = response.data.userInteractions || {};
        setIsLiked(userInt.like || false);
        setIsSaved(userInt.save || false);
      }
    } catch (error) {
      console.error('Error fetching interactions:', error);
    }
  };

  const handleInteraction = async (type) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Vui lòng đăng nhập để thực hiện hành động này');
      navigate('/login');
      return;
    }

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/articles/${article.id}/interact`,
        { type },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        if (type === 'like') {
          setIsLiked(!isLiked);
          setStats(prev => ({ 
            ...prev, 
            likes: isLiked ? prev.likes - 1 : prev.likes + 1 
          }));
        } else if (type === 'save') {
          setIsSaved(!isSaved);
          alert(isSaved ? 'Đã hủy lưu bài viết' : 'Đã lưu bài viết');
        }
      }
    } catch (error) {
      console.error('Error interacting:', error);
      alert('Lỗi: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleShare = async (platform) => {
    const url = window.location.href;
    const title = article.title;

    let shareUrl = '';
    switch(platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
        break;
      case 'zalo':
        shareUrl = `https://sp.zalo.me/share?url=${encodeURIComponent(url)}`;
        break;
      case 'copy':
        navigator.clipboard.writeText(url);
        alert('Đã sao chép link bài viết!');
        
        const token = localStorage.getItem('token');
        if (token) {
          await axios.post(
            `${API_BASE_URL}/api/articles/${article.id}/interact`,
            { type: 'share', metadata: { platform: 'copy' } },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setStats(prev => ({ ...prev, shares: prev.shares + 1 }));
        }
        return;
      default:
        return;
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
      
      const token = localStorage.getItem('token');
      if (token) {
        try {
          await axios.post(
            `${API_BASE_URL}/api/articles/${article.id}/interact`,
            { type: 'share', metadata: { platform } },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setStats(prev => ({ ...prev, shares: prev.shares + 1 }));
        } catch (error) {
          console.error('Error tracking share:', error);
        }
      }
    }
  };

  const handleRequestEdit = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Vui lòng đăng nhập');
      navigate('/login');
      return;
    }

    const reason = prompt('Nhập lý do yêu cầu chỉnh sửa (max 500 ký tự):');
    if (!reason) return;

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/articles/${article.id}/request-edit`,
        { reason: reason.substring(0, 500) },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert('Đã gửi yêu cầu chỉnh sửa đến admin');
        navigate('/quan-ly-bai-viet');
      }
    } catch (error) {
      console.error('Error requesting edit:', error);
      alert('Lỗi: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleGoBack = () => {
    if (article?.category?.category_type) {
      const typeMap = {
        'tin_tuc': '/tin-tuc',
        'thuoc': '/thuoc',
        'benh_ly': '/benh-ly'
      };
      navigate(typeMap[article.category.category_type] || '/bai-viet');
    } else {
      navigate(-1);
    }
  };

  const getBreadcrumbItems = () => {
    if (!article) return [];

    const typeLabels = {
      'tin_tuc': 'Tin tức',
      'thuoc': 'Thuốc',
      'benh_ly': 'Bệnh lý'
    };

    const typeUrls = {
      'tin_tuc': '/tin-tuc',
      'thuoc': '/thuoc',
      'benh_ly': '/benh-ly'
    };

    const items = [
      { label: 'Trang chủ', url: '/' },
      { label: 'Bài viết', url: '/bai-viet' }
    ];

    if (article.category) {
      items.push({
        label: typeLabels[article.category.category_type] || article.category.category_type,
        url: typeUrls[article.category.category_type]
      });

      items.push({
        label: article.category.name,
        url: `${typeUrls[article.category.category_type]}/${article.category.slug}`
      });
    }

    items.push({ label: article.title, url: null });

    return items;
  };

  if (loading) {
    return (
      <div className="article-loading">
        <div className="spinner"></div>
        <p>Đang tải bài viết...</p>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="article-not-found">
        <h2>Không tìm thấy bài viết</h2>
        <button onClick={handleGoBack} className="btn-back">
          <FaArrowLeft /> Quay lại
        </button>
      </div>
    );
  }

  // Kiểm tra xem user có phải tác giả không
  const isAuthor = user && article.author_id === user.id;
  const isApproved = article.status === 'approved';

  return (
    <div className="article-detail-page">
      <Breadcrumb items={getBreadcrumbItems()} />

      <div className="article-container">
        <button onClick={handleGoBack} className="btn-back">
          <FaArrowLeft /> Quay lại
        </button>

        <div className="article-main-content">
          {/* Bên trái: Nội dung bài viết */}
          <div className="article-content-area">
            <div className="article-header">
              <h1 className="article-title">{article.title}</h1>

              <div className="article-meta">
                <div className="meta-item">
                  <FaUser className="meta-icon" />
                  <span>{article.author?.full_name || 'Ẩn danh'}</span>
                </div>
                <div className="meta-item">
                  <FaCalendar className="meta-icon" />
                  <span>{new Date(article.created_at).toLocaleDateString('vi-VN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</span>
                </div>
                <div className="meta-item">
                  <FaEye className="meta-icon" />
                  <span>{stats.views} lượt xem</span>
                </div>
              </div>

              {article.tags_json && article.tags_json.length > 0 && (
                <div className="article-tags">
                  <FaTag className="tags-icon" />
                  <div className="tags-list">
                    {article.tags_json.map((tag, index) => (
                      <span key={index} className="tag-item">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="article-content">
              <div 
                className="content-body"
                dangerouslySetInnerHTML={{ __html: article.content }}
              />
            </div>

            {article.source && (
              <div className="article-source">
                <FaLink />
                <span>Nguồn: </span>
                <a href={article.source} target="_blank" rel="noopener noreferrer">
                  {article.source}
                </a>
              </div>
            )}

            <div className="article-actions">
              <button 
                className={`action-btn ${isLiked ? 'active' : ''}`}
                onClick={() => handleInteraction('like')}
              >
                <FaThumbsUp />
                <span>{stats.likes} Thích</span>
              </button>

              <div className="share-dropdown">
                <button className="action-btn">
                  <FaShareAlt />
                  <span>{stats.shares} Chia sẻ</span>
                </button>
                <div className="share-menu">
                  <button onClick={() => handleShare('facebook')}>
                    Facebook
                  </button>
                  <button onClick={() => handleShare('zalo')}>
                    Zalo
                  </button>
                  <button onClick={() => handleShare('twitter')}>
                    Twitter
                  </button>
                  <button onClick={() => handleShare('copy')}>
                    Sao chép link
                  </button>
                </div>
              </div>

              <button 
                className={`action-btn ${isSaved ? 'active' : ''}`}
                onClick={() => handleInteraction('save')}
              >
                <FaBookmark />
                <span>{isSaved ? 'Đã lưu' : 'Lưu'}</span>
              </button>

              <button 
                className="action-btn"
                onClick={() => {
                  const token = localStorage.getItem('token');
                  if (!token) {
                    alert('Vui lòng đăng nhập để báo cáo');
                    navigate('/login');
                    return;
                  }
                  setShowReportPopup(true);
                }}
              >
                <FaFlag />
                <span>Báo cáo</span>
              </button>

              {/* Nút yêu cầu chỉnh sửa (chỉ tác giả thấy khi bài đã duyệt) */}
              {isAuthor && isApproved && user.role !== 'admin' && (
                <button 
                  className="action-btn action-btn-request"
                  onClick={handleRequestEdit}
                >
                  <FaRedo />
                  <span>Yêu cầu chỉnh sửa</span>
                </button>
              )}
            </div>
          </div>

          {/* Bên phải: Sidebar thông tin bổ sung */}
          {(article.medicine || article.disease) && (
            <div className="article-sidebar">
              {article.medicine && (
                <div className="medical-info medicine-info">
                  <h3>Thông tin thuốc</h3>
                  
                  {article.medicine.composition && (
                    <div className="info-section">
                      <h4>Thành phần</h4>
                      <p>{article.medicine.composition}</p>
                    </div>
                  )}

                  {article.medicine.uses && (
                    <div className="info-section">
                      <h4>Công dụng</h4>
                      <p>{article.medicine.uses}</p>
                    </div>
                  )}

                  {article.medicine.side_effects && (
                    <div className="info-section">
                      <h4>Tác dụng phụ</h4>
                      <p>{article.medicine.side_effects}</p>
                    </div>
                  )}

                  {article.medicine.manufacturer && (
                    <div className="info-section">
                      <h4>Nhà sản xuất</h4>
                      <p>{article.medicine.manufacturer}</p>
                    </div>
                  )}
                </div>
              )}

              {article.disease && (
                <div className="medical-info disease-info">
                  <h3>Thông tin bệnh lý</h3>
                  
                  {article.disease.symptoms && (
                    <div className="info-section">
                      <h4>Triệu chứng</h4>
                      <p>{article.disease.symptoms}</p>
                    </div>
                  )}

                  {article.disease.treatments && (
                    <div className="info-section">
                      <h4>Điều trị</h4>
                      <p>{article.disease.treatments}</p>
                    </div>
                  )}

                  {article.disease.description && (
                    <div className="info-section">
                      <h4>Mô tả</h4>
                      <p>{article.disease.description}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Danh sách báo cáo - Chỉ admin thấy */}
        <ArticleReportsList 
          articleId={article.id} 
          onHideArticle={() => navigate('/quan-ly-bai-viet')} 
        />

        {/* Popup báo cáo */}
        {showReportPopup && (
          <ArticleReportPopup
            articleId={article.id}
            onClose={() => setShowReportPopup(false)}
            onSuccess={() => {
              setShowReportPopup(false);
              alert('Đã gửi báo cáo thành công');
            }}
          />
        )}
      </div>
    </div>
  );
};

export default ArticleDetailPage;