// client/src/pages/ArticleDetailPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  FaCalendar, FaUser, FaEye, FaThumbsUp, FaShareAlt, 
  FaBookmark, FaArrowLeft, FaTag, FaFolder
} from 'react-icons/fa';
import './ArticleDetailPage.css';

const ArticleDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const API_BASE_URL = 'http://localhost:3001';

  useEffect(() => {
    fetchArticle();
  }, [slug]);

  const fetchArticle = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/articles/slug/${slug}`);
      
      if (response.data.success) {
        setArticle(response.data.article);
        
        // Tạo interaction view (không cần auth)
        await axios.post(`${API_BASE_URL}/api/articles/${response.data.article.id}/interact`, {
          type: 'view'
        }).catch(err => console.log('View tracking failed:', err));
      }
    } catch (error) {
      console.error('Error fetching article:', error);
      if (error.response?.status === 404) {
        alert('Bài viết không tồn tại hoặc đã bị ẩn');
        navigate('/articles/all');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Vui lòng đăng nhập để thích bài viết');
      navigate('/login');
      return;
    }

    try {
      await axios.post(
        `${API_BASE_URL}/api/articles/${article.id}/interact`,
        { type: 'like' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setIsLiked(!isLiked);
      setArticle(prev => ({
        ...prev,
        likes: isLiked ? prev.likes - 1 : prev.likes + 1
      }));
    } catch (error) {
      console.error('Error liking article:', error);
    }
  };

  const handleSave = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Vui lòng đăng nhập để lưu bài viết');
      navigate('/login');
      return;
    }

    try {
      await axios.post(
        `${API_BASE_URL}/api/articles/${article.id}/interact`,
        { type: 'save' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setIsSaved(!isSaved);
      alert(isSaved ? 'Đã hủy lưu bài viết' : 'Đã lưu bài viết');
    } catch (error) {
      console.error('Error saving article:', error);
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
        return;
      default:
        return;
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
      
      // Track share interaction
      const token = localStorage.getItem('token');
      try {
        await axios.post(
          `${API_BASE_URL}/api/articles/${article.id}/interact`,
          { 
            type: 'share',
            metadata: { platform }
          },
          token ? { headers: { Authorization: `Bearer ${token}` } } : {}
        );
        
        setArticle(prev => ({
          ...prev,
          shares: prev.shares + 1
        }));
      } catch (error) {
        console.error('Error tracking share:', error);
      }
    }
  };

  const getCategoryTypeBadge = (type) => {
    const types = {
      tin_tuc: { text: 'Tin tức', color: '#3b82f6' },
      thuoc: { text: 'Thuốc', color: '#10b981' },
      benh_ly: { text: 'Bệnh lý', color: '#ef4444' }
    };
    const typeInfo = types[type] || { text: type, color: '#6b7280' };
    return (
      <span className="category-type-badge" style={{ backgroundColor: typeInfo.color }}>
        {typeInfo.text}
      </span>
    );
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
        <button onClick={() => navigate('/articles/all')} className="btn-back">
          <FaArrowLeft /> Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="article-detail-page">
      <div className="article-container">
        {/* Back Button */}
        <button onClick={() => navigate(-1)} className="btn-back">
          <FaArrowLeft /> Quay lại
        </button>

        {/* Article Header */}
        <div className="article-header">
          <div className="article-meta-top">
            {article.Category && getCategoryTypeBadge(article.Category.category_type)}
            <span className="article-category">
              <FaFolder /> {article.Category?.name || 'Chưa phân loại'}
            </span>
          </div>

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
              <span>{article.views} lượt xem</span>
            </div>
          </div>
        </div>

        {/* Article Content */}
        <div className="article-content">
          <div 
            className="content-body"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </div>

        {/* Tags */}
        {article.tags_json && article.tags_json.length > 0 && (
          <div className="article-tags">
            <FaTag className="tags-icon" />
            <div className="tags-list">
              {article.tags_json.map((tag, index) => (
                <span key={index} className="tag-item">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Interaction Buttons */}
        <div className="article-actions">
          <button 
            className={`action-btn ${isLiked ? 'active' : ''}`}
            onClick={handleLike}
          >
            <FaThumbsUp />
            <span>{article.likes || 0} Thích</span>
          </button>

          <div className="share-dropdown">
            <button className="action-btn">
              <FaShareAlt />
              <span>{article.shares || 0} Chia sẻ</span>
            </button>
            <div className="share-menu">
              <button onClick={() => handleShare('facebook')}>
                <img src="https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg" alt="Facebook" />
                Facebook
              </button>
              <button onClick={() => handleShare('zalo')}>
                <img src="https://upload.wikimedia.org/wikipedia/commons/9/91/Icon_of_Zalo.svg" alt="Zalo" />
                Zalo
              </button>
              <button onClick={() => handleShare('twitter')}>
                <img src="https://upload.wikimedia.org/wikipedia/commons/6/6f/Logo_of_Twitter.svg" alt="Twitter" />
                Twitter
              </button>
              <button onClick={() => handleShare('copy')}>
                📋 Sao chép link
              </button>
            </div>
          </div>

          <button 
            className={`action-btn ${isSaved ? 'active' : ''}`}
            onClick={handleSave}
          >
            <FaBookmark />
            <span>Lưu</span>
          </button>
        </div>

        {/* Related Articles - TODO */}
        <div className="related-articles">
          <h3>Bài viết liên quan</h3>
          <p className="text-muted">Đang cập nhật...</p>
        </div>
      </div>
    </div>
  );
};

export default ArticleDetailPage;