// client/src/pages/ArticleDetailPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Breadcrumb from '../components/Breadcrumb';
import { 
  FaCalendar, FaUser, FaEye, FaThumbsUp, FaShareAlt, 
  FaBookmark, FaArrowLeft, FaTag, FaLink, FaFlag, FaRedo,
  FaTimes, FaExclamationTriangle, FaPaperPlane, FaSpinner
} from 'react-icons/fa';
import './ArticleDetailPage.css';

const ArticleDetailPage = ({ article: propArticle, categoryType: propCategoryType }) => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const API_BASE_URL = 'http://localhost:3001';

  const [article, setArticle] = useState(propArticle || null);
  const [loading, setLoading] = useState(!propArticle);
  const [user, setUser] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [stats, setStats] = useState({ likes: 0, shares: 0, saves: 0, views: 0 });
  const [showReportPopup, setShowReportPopup] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  const reportReasons = [
    'Nội dung không chính xác',
    'Thông tin gây hiểu lầm',
    'Thiếu nguồn tham khảo',
    'Ngôn từ không phù hợp',
    'Spam hoặc quảng cáo',
    'Vi phạm bản quyền',
    'Lý do khác'
  ];

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || 'null');
    setUser(userData);

    if (!propArticle && slug) {
      fetchArticle();
    } else if (propArticle) {
      trackView();
      fetchInteractions();
      fetchRelatedArticles();
    }
  }, [slug, propArticle]);

  useEffect(() => {
    if (article?.id) {
      trackView();
      fetchInteractions();
      fetchRelatedArticles();
    }
  }, [article?.id]);

  const trackView = async () => {
    if (!article?.id) return;
    
    try {
      await axios.post(`${API_BASE_URL}/api/articles/${article.id}/view`);
    } catch (error) {
      console.error('Lỗi khi theo dõi lượt xem:', error);
    }
  };

  const getFirstImageFromContent = (html) => {
    if (!html) return null;
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const img = doc.querySelector('img');
    return img ? img.src : null;
  };

  const fetchArticle = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/articles/slug/${slug}`);
      
      if (response.data.success) {
        setArticle(response.data.article);
      }
    } catch (error) {
      console.error('Lỗi khi tải bài viết:', error);
      if (error.response?.status === 404) {
        navigate('/404');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedArticles = async () => {
    if (!article?.id) return;
    
    try {
      setLoadingRelated(true);
      console.log('Fetching related articles for:', {
        articleId: article.id,
        categoryId: article.category_id,
        tags: article.tags_json
      });

      const params = {
        category_id: article.category_id
      };

      if (article.tags_json && Array.isArray(article.tags_json) && article.tags_json.length > 0) {
        params.tags = JSON.stringify(article.tags_json);
      }

      const response = await axios.get(
        `${API_BASE_URL}/api/articles/related/${article.id}`,
        { params }
      );
      
      console.log('Related articles response:', response.data);
      
      if (response.data.success) {
        setRelatedArticles(response.data.articles || []);
      }
    } catch (error) {
      console.error('Lỗi khi tải bài viết liên quan:', error);
      console.error('Error details:', error.response?.data);
    } finally {
      setLoadingRelated(false);
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
      console.error('Lỗi khi tải tương tác:', error);
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
          setStats(prev => ({
            ...prev,
            saves: isSaved ? prev.saves - 1 : prev.saves + 1
          }));
        }
      }
    } catch (error) {
      console.error('Lỗi khi tương tác:', error);
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
          console.error('Lỗi khi theo dõi share:', error);
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
      console.error('Lỗi khi yêu cầu chỉnh sửa:', error);
      alert('Lỗi: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Vui lòng đăng nhập để báo cáo');
      navigate('/login');
      return;
    }

    if (!reportReason.trim()) {
      alert('Vui lòng nhập lý do báo cáo');
      return;
    }

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
      console.error('Lỗi khi gửi báo cáo:', error);
      alert('Lỗi: ' + (error.response?.data?.message || error.message));
    } finally {
      setSubmittingReport(false);
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
      <div className="detail-article-page">
        <div className="detail-article-container">
          <div className="detail-article-loading">
            <div className="detail-article-spinner"></div>
            <p>Đang tải bài viết...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="detail-article-page">
        <div className="detail-article-container">
          <div className="detail-article-not-found">
            <h2>Không tìm thấy bài viết</h2>
            <button onClick={handleGoBack} className="detail-article-button-back">
              <FaArrowLeft /> Quay lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isAuthor = user && article.author_id === user.id;
  const isApproved = article.status === 'approved';
  const categoryType = propCategoryType || article.category?.category_type;

  return (
    <div className="detail-article-page">
      <div className="detail-article-container">
        <Breadcrumb items={getBreadcrumbItems()} />
        
        <button onClick={handleGoBack} className="detail-article-button-back">
          <FaArrowLeft /> Quay lại
        </button>

        <div className="detail-article-main-content">
          <div className="detail-article-content-area">
            <div className="detail-article-header">
              <h1 className="detail-article-title">{article.title}</h1>
              
              <div className="detail-article-meta">
                <span className="detail-article-meta-item">
                  <FaUser className="detail-article-meta-icon" />
                  {article.author?.full_name || 'Ẩn danh'}
                </span>
                <span className="detail-article-meta-item">
                  <FaCalendar className="detail-article-meta-icon" />
                  {new Date(article.created_at).toLocaleDateString('vi-VN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
                <span className="detail-article-meta-item">
                  <FaEye className="detail-article-meta-icon" />
                  {stats.views || article.views || 0} lượt xem
                </span>
              </div>

              {article.tags_json && article.tags_json.length > 0 && (
                <div className="detail-article-tags">
                  <FaTag className="detail-article-tags-icon" />
                  <div className="detail-article-tags-list">
                    {article.tags_json.map((tag, index) => (
                      <span key={index} className="detail-article-tag-item">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="detail-article-content">
              <div 
                className="detail-article-content-body" 
                dangerouslySetInnerHTML={{ __html: article.content }}
              />
            </div>

            {article.source && (
              <div className="detail-article-source">
                <FaLink />
                <span>Nguồn:</span>
                <a href={article.source} target="_blank" rel="noopener noreferrer">
                  {article.source}
                </a>
              </div>
            )}

            <div className="detail-article-actions">
              <button 
                onClick={() => handleInteraction('like')}
                className={`detail-article-action-button ${isLiked ? 'active' : ''}`}
              >
                <FaThumbsUp /> {stats.likes || 0} Thích
              </button>

              <button 
                onClick={() => handleInteraction('save')}
                className={`detail-article-action-button ${isSaved ? 'active' : ''}`}
              >
                <FaBookmark /> {isSaved ? 'Đã lưu' : 'Lưu'}
              </button>

              <div className="detail-article-share-dropdown">
                <button className="detail-article-action-button">
                  <FaShareAlt /> Chia sẻ
                </button>
                <div className="detail-article-share-menu">
                  <button onClick={() => handleShare('facebook')}>Facebook</button>
                  <button onClick={() => handleShare('twitter')}>Twitter</button>
                  <button onClick={() => handleShare('zalo')}>Zalo</button>
                  <button onClick={() => handleShare('copy')}>Sao chép link</button>
                </div>
              </div>

              <button 
                onClick={() => setShowReportPopup(true)}
                className="detail-article-action-button"
              >
                <FaFlag /> Báo cáo
              </button>

              {isAuthor && isApproved && (
                <button 
                  onClick={handleRequestEdit}
                  className="detail-article-action-button detail-article-action-button-request"
                >
                  <FaRedo /> Yêu cầu sửa
                </button>
              )}
            </div>
          </div>

          {((categoryType === 'thuoc' && article.medicine) || (categoryType === 'benh_ly' && article.disease)) && (
            <div className="detail-article-sidebar">
              {categoryType === 'thuoc' && article.medicine && (
                <div className="detail-article-medical-info detail-article-medicine-info">
                  <h3>Thông tin thuốc</h3>
                  
                  {article.medicine.composition && (
                    <div className="detail-article-info-section">
                      <h4>Thành phần</h4>
                      <p>{article.medicine.composition}</p>
                    </div>
                  )}

                  {article.medicine.uses && (
                    <div className="detail-article-info-section">
                      <h4>Công dụng</h4>
                      <p>{article.medicine.uses}</p>
                    </div>
                  )}

                  {article.medicine.side_effects && (
                    <div className="detail-article-info-section">
                      <h4>Tác dụng phụ</h4>
                      <p>{article.medicine.side_effects}</p>
                    </div>
                  )}

                  {article.medicine.manufacturer && (
                    <div className="detail-article-info-section">
                      <h4>Nhà sản xuất</h4>
                      <p>{article.medicine.manufacturer}</p>
                    </div>
                  )}
                </div>
              )}

              {categoryType === 'benh_ly' && article.disease && (
                <div className="detail-article-medical-info detail-article-disease-info">
                  <h3>Thông tin bệnh lý</h3>
                  
                  {article.disease.symptoms && (
                    <div className="detail-article-info-section">
                      <h4>Triệu chứng</h4>
                      <p>{article.disease.symptoms}</p>
                    </div>
                  )}

                  {article.disease.treatments && (
                    <div className="detail-article-info-section">
                      <h4>Điều trị</h4>
                      <p>{article.disease.treatments}</p>
                    </div>
                  )}

                  {article.disease.description && (
                    <div className="detail-article-info-section">
                      <h4>Mô tả</h4>
                      <p>{article.disease.description}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {showReportPopup && (
          <div className="detail-article-report-popup-overlay" onClick={() => setShowReportPopup(false)}>
            <div className="detail-article-report-popup" onClick={(e) => e.stopPropagation()}>
              <div className="detail-article-report-popup-header">
                <div className="detail-article-report-header-content">
                  <FaExclamationTriangle className="detail-article-report-icon" />
                  <h3>Báo cáo bài viết</h3>
                </div>
                <button onClick={() => setShowReportPopup(false)} className="detail-article-button-close-popup">
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleSubmitReport} className="detail-article-report-popup-body">
                <div className="detail-article-report-info">
                  <p>Vui lòng cho chúng tôi biết lý do báo cáo bài viết này. Admin sẽ xem xét và xử lý.</p>
                </div>

                <div className="detail-article-report-quick-reasons">
                  <label className="detail-article-report-label">Lý do thường gặp:</label>
                  <div className="detail-article-quick-reason-buttons">
                    {reportReasons.map((r, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setReportReason(r)}
                        className={`detail-article-button-quick-reason ${reportReason === r ? 'active' : ''}`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="detail-article-report-form-group">
                  <label className="detail-article-report-label">
                    Chi tiết lý do <span className="detail-article-required">*</span>
                  </label>
                  <textarea
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    placeholder="Nhập chi tiết lý do báo cáo (tối đa 500 ký tự)..."
                    maxLength={500}
                    rows={5}
                    className="detail-article-report-textarea"
                    required
                  />
                  <small className="detail-article-char-count">{reportReason.length}/500 ký tự</small>
                </div>

                <div className="detail-article-report-popup-footer">
                  <button
                    type="button"
                    onClick={() => setShowReportPopup(false)}
                    className="detail-article-button-cancel"
                    disabled={submittingReport}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="detail-article-button-submit-report"
                    disabled={submittingReport || !reportReason.trim()}
                  >
                    {submittingReport ? (
                      <>
                        <FaSpinner className="detail-article-spinner-icon" /> Đang gửi...
                      </>
                    ) : (
                      <>
                        <FaPaperPlane /> Gửi báo cáo
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}


        {/* PHAN BAI VIET LIEN QUAN - LUON HIEN THI */}
        <div className="detail-article-related-section">
          <div className="detail-article-related-container">
            <h2 className="detail-article-related-title">
              Bài viết liên quan
            </h2>
            
            {loadingRelated ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <div className="detail-article-spinner"></div>
                <p style={{ marginTop: '1rem', color: '#6b7280' }}>
                  Đang tải bài viết liên quan...
                </p>
              </div>
            ) : relatedArticles.length > 0 ? (
              <div className="detail-article-related-grid">
                {relatedArticles.map(related => (
                  <div 
                    key={related.id}
                    className="detail-article-related-card"
                    onClick={() => {
                      const typeMap = {
                        'tin_tuc': 'tin-tuc',
                        'thuoc': 'thuoc',
                        'benh_ly': 'benh-ly'
                      };
                      const relatedCategoryType = typeMap[related.category?.category_type] || 'tin-tuc';
                      navigate(`/${relatedCategoryType}/${related.slug}`);
                      window.scrollTo(0, 0);
                    }}
                  >
                    <div className="detail-article-related-card-image">
                      <img 
                        src={getFirstImageFromContent(related.content) || '/placeholder.jpg'}
                        alt={related.title}
                        onError={(e) => {
                          e.target.src = '/placeholder.jpg';
                        }}
                      />
                    </div>
                    <div className="detail-article-related-card-content">
                      <span className="detail-article-related-card-category">
                        {related.category?.name}
                      </span>
                      <h3 className="detail-article-related-card-title">
                        {related.title}
                      </h3>
                      <div className="detail-article-related-card-meta">
                        <span>
                          <FaEye /> {related.views || 0}
                        </span>
                        <span>
                          <FaCalendar /> {new Date(related.created_at).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                <p>Không tìm thấy bài viết liên quan</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArticleDetailPage;