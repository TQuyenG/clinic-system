// client/src/pages/ArticleDetailPage.js

import React, { useState, useEffect } from 'react'; // Import thư viện React và các hook cần thiết
import { useParams, useNavigate } from 'react-router-dom'; // Import hook để lấy tham số URL và điều hướng
import axios from 'axios'; // Import thư viện để thực hiện yêu cầu HTTP
import Breadcrumb from '../components/Breadcrumb'; // Import component Breadcrumb để hiển thị đường dẫn
import { 
  FaCalendar, FaUser, FaEye, FaThumbsUp, FaShareAlt, 
  FaBookmark, FaArrowLeft, FaTag, FaLink, FaFlag, FaRedo,
  FaTimes, FaExclamationTriangle, FaPaperPlane, FaSpinner
} from 'react-icons/fa'; // Import các icon từ thư viện react-icons
import './ArticleDetailPage.css'; // Import file CSS cho trang này

// Component chính cho trang chi tiết bài viết
const ArticleDetailPage = ({ article: propArticle, categoryType: propCategoryType }) => {
  const { slug } = useParams(); // Lấy slug từ URL để xác định bài viết
  const navigate = useNavigate(); // Hàm để điều hướng đến trang khác
  const API_BASE_URL = 'http://localhost:3001'; // URL cơ sở cho API

  // Các state để quản lý dữ liệu bài viết và trạng thái
  const [article, setArticle] = useState(propArticle || null); // Dữ liệu bài viết, ưu tiên từ props nếu có
  const [loading, setLoading] = useState(!propArticle); // Trạng thái đang tải dữ liệu
  const [user, setUser] = useState(null); // Thông tin người dùng hiện tại
  const [isLiked, setIsLiked] = useState(false); // Trạng thái đã like bài viết
  const [isSaved, setIsSaved] = useState(false); // Trạng thái đã lưu bài viết
  const [stats, setStats] = useState({ likes: 0, shares: 0, saves: 0, views: 0 }); // Thống kê tương tác
  const [showReportPopup, setShowReportPopup] = useState(false); // Hiển thị popup báo cáo
  const [reportReason, setReportReason] = useState(''); // Lý do báo cáo
  const [submittingReport, setSubmittingReport] = useState(false); // Trạng thái đang gửi báo cáo

  // Danh sách lý do báo cáo mặc định
  const reportReasons = [
    'Nội dung không chính xác',
    'Thông tin gây hiểu lầm',
    'Thiếu nguồn tham khảo',
    'Ngôn từ không phù hợp',
    'Spam hoặc quảng cáo',
    'Vi phạm bản quyền',
    'Lý do khác'
  ];

  // Effect để lấy dữ liệu người dùng và tải bài viết nếu cần
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || 'null'); // Lấy thông tin người dùng từ localStorage
    setUser(userData);

    if (!propArticle && slug) {
      fetchArticle(); // Tải bài viết nếu không có từ props
    } else if (propArticle) {
      trackView(); // Theo dõi lượt xem
      fetchInteractions(); // Tải tương tác
    }
  }, [slug, propArticle]); // Phụ thuộc vào slug và propArticle

  // Effect để theo dõi lượt xem và tải tương tác khi có ID bài viết
  useEffect(() => {
    if (article?.id) {
      trackView(); // Theo dõi lượt xem
      fetchInteractions(); // Tải tương tác
    }
  }, [article?.id]); // Phụ thuộc vào ID bài viết

  // Hàm theo dõi lượt xem bài viết
  const trackView = async () => {
    if (!article?.id) return; // Không làm gì nếu không có ID
    
    try {
      await axios.post(`${API_BASE_URL}/api/articles/${article.id}/view`); // Gửi yêu cầu POST đến API
    } catch (error) {
      console.error('Lỗi khi theo dõi lượt xem:', error); // Log lỗi
    }
  };

  // Hàm tải dữ liệu bài viết từ API
  const fetchArticle = async () => {
    try {
      setLoading(true); // Bắt đầu tải
      const response = await axios.get(`${API_BASE_URL}/api/articles/slug/${slug}`); // Gửi yêu cầu GET
      
      if (response.data.success) {
        setArticle(response.data.article); // Cập nhật bài viết
      }
    } catch (error) {
      console.error('Lỗi khi tải bài viết:', error); // Log lỗi
      if (error.response?.status === 404) {
        navigate('/404'); // Điều hướng đến trang 404 nếu không tìm thấy
      }
    } finally {
      setLoading(false); // Kết thúc tải
    }
  };

  // Hàm tải tương tác của bài viết
  const fetchInteractions = async () => {
    if (!article?.id) return; // Không làm gì nếu không có ID

    try {
      const token = localStorage.getItem('token'); // Lấy token từ localStorage
      const headers = token ? { Authorization: `Bearer ${token}` } : {}; // Thêm header nếu có token
      
      const response = await axios.get(
        `${API_BASE_URL}/api/articles/${article.id}/interactions`,
        { headers }
      );

      if (response.data.success) {
        setStats(response.data.stats); // Cập nhật thống kê
        const userInt = response.data.userInteractions || {}; // Tương tác của người dùng
        setIsLiked(userInt.like || false); // Cập nhật trạng thái like
        setIsSaved(userInt.save || false); // Cập nhật trạng thái save
      }
    } catch (error) {
      console.error('Lỗi khi tải tương tác:', error); // Log lỗi
    }
  };

  // Hàm xử lý tương tác (like, save)
  const handleInteraction = async (type) => {
    const token = localStorage.getItem('token'); // Lấy token
    if (!token) {
      alert('Vui lòng đăng nhập để thực hiện hành động này'); // Thông báo nếu chưa đăng nhập
      navigate('/login'); // Điều hướng đến trang đăng nhập
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
          setIsLiked(!isLiked); // Đảo trạng thái like
          setStats(prev => ({ 
            ...prev, 
            likes: isLiked ? prev.likes - 1 : prev.likes + 1 // Cập nhật số like
          }));
        } else if (type === 'save') {
          setIsSaved(!isSaved); // Đảo trạng thái save
          alert(isSaved ? 'Đã hủy lưu bài viết' : 'Đã lưu bài viết'); // Thông báo
        }
      }
    } catch (error) {
      console.error('Lỗi khi tương tác:', error); // Log lỗi
      alert('Lỗi: ' + (error.response?.data?.message || error.message)); // Thông báo lỗi
    }
  };

  // Hàm xử lý chia sẻ bài viết
  const handleShare = async (platform) => {
    const url = window.location.href; // URL hiện tại
    const title = article.title; // Tiêu đề bài viết

    let shareUrl = ''; // URL chia sẻ
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
        navigator.clipboard.writeText(url); // Sao chép URL
        alert('Đã sao chép link bài viết!'); // Thông báo
        
        const token = localStorage.getItem('token'); // Lấy token
        if (token) {
          await axios.post(
            `${API_BASE_URL}/api/articles/${article.id}/interact`,
            { type: 'share', metadata: { platform: 'copy' } },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setStats(prev => ({ ...prev, shares: prev.shares + 1 })); // Cập nhật số share
        }
        return;
      default:
        return;
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400'); // Mở cửa sổ mới
      
      const token = localStorage.getItem('token'); // Lấy token
      if (token) {
        try {
          await axios.post(
            `${API_BASE_URL}/api/articles/${article.id}/interact`,
            { type: 'share', metadata: { platform } },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setStats(prev => ({ ...prev, shares: prev.shares + 1 })); // Cập nhật số share
        } catch (error) {
          console.error('Lỗi khi theo dõi share:', error); // Log lỗi
        }
      }
    }
  };

  // Hàm yêu cầu chỉnh sửa bài viết
  const handleRequestEdit = async () => {
    const token = localStorage.getItem('token'); // Lấy token
    if (!token) {
      alert('Vui lòng đăng nhập'); // Thông báo nếu chưa đăng nhập
      navigate('/login'); // Điều hướng đến trang đăng nhập
      return;
    }

    const reason = prompt('Nhập lý do yêu cầu chỉnh sửa (max 500 ký tự):'); // Hỏi lý do
    if (!reason) return; // Không làm gì nếu không nhập

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/articles/${article.id}/request-edit`,
        { reason: reason.substring(0, 500) },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert('Đã gửi yêu cầu chỉnh sửa đến admin'); // Thông báo thành công
        navigate('/quan-ly-bai-viet'); // Điều hướng đến trang quản lý bài viết
      }
    } catch (error) {
      console.error('Lỗi khi yêu cầu chỉnh sửa:', error); // Log lỗi
      alert('Lỗi: ' + (error.response?.data?.message || error.message)); // Thông báo lỗi
    }
  };

  // Hàm gửi báo cáo bài viết
  const handleSubmitReport = async (e) => {
    e.preventDefault(); // Ngăn form submit mặc định
    
    if (!reportReason.trim()) {
      alert('Vui lòng nhập lý do báo cáo'); // Thông báo nếu lý do rỗng
      return;
    }

    try {
      setSubmittingReport(true); // Bắt đầu gửi
      const token = localStorage.getItem('token'); // Lấy token
      
      const response = await axios.post(
        `${API_BASE_URL}/api/articles/${article.id}/report`,
        { reason: reportReason.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert('Đã gửi báo cáo. Admin sẽ xem xét.'); // Thông báo thành công
        setShowReportPopup(false); // Đóng popup
        setReportReason(''); // Reset lý do
      }
    } catch (error) {
      console.error('Lỗi khi báo cáo bài viết:', error); // Log lỗi
      alert('Lỗi: ' + (error.response?.data?.message || error.message)); // Thông báo lỗi
    } finally {
      setSubmittingReport(false); // Kết thúc gửi
    }
  };

  // Hàm quay lại trang trước
  const handleGoBack = () => {
    if (article?.category?.category_type) {
      const typeMap = { // Ánh xạ loại category đến URL
        'tin_tuc': '/tin-tuc',
        'thuoc': '/thuoc',
        'benh_ly': '/benh-ly'
      };
      navigate(typeMap[article.category.category_type] || '/bai-viet'); // Điều hướng
    } else {
      navigate(-1); // Quay lại trang trước
    }
  };

  // Hàm lấy items cho Breadcrumb
  const getBreadcrumbItems = () => {
    if (!article) return []; // Trả về mảng rỗng nếu không có bài viết

    const typeLabels = { // Nhãn cho loại category
      'tin_tuc': 'Tin tức',
      'thuoc': 'Thuốc',
      'benh_ly': 'Bệnh lý'
    };

    const typeUrls = { // URL cho loại category
      'tin_tuc': '/tin-tuc',
      'thuoc': '/thuoc',
      'benh_ly': '/benh-ly'
    };

    const items = [ // Items cơ bản
      { label: 'Trang chủ', url: '/' },
      { label: 'Bài viết', url: '/bai-viet' }
    ];

    if (article.category) { // Thêm items nếu có category
      items.push({
        label: typeLabels[article.category.category_type] || article.category.category_type,
        url: typeUrls[article.category.category_type]
      });

      items.push({
        label: article.category.name,
        url: `${typeUrls[article.category.category_type]}/${article.category.slug}`
      });
    }

    items.push({ label: article.title, url: null }); // Thêm tiêu đề bài viết

    return items; // Trả về mảng items
  };

  // Hiển thị trạng thái tải
  if (loading) {
    return (
      <div className="article-loading">
        <div className="spinner"></div>
        <p>Đang tải bài viết...</p>
      </div>
    );
  }

  // Hiển thị nếu không tìm thấy bài viết
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

  // Kiểm tra quyền tác giả và trạng thái bài viết
  const isAuthor = user && article.author_id === user.id;
  const isApproved = article.status === 'approved';
  const categoryType = article.category?.category_type;

  // Render nội dung chính
  return (
    <div className="article-detail-page">
      <Breadcrumb items={getBreadcrumbItems()} /> {/* Hiển thị breadcrumb */}

      <div className="article-container">
        <button onClick={handleGoBack} className="btn-back"> {/* Nút quay lại */}
          <FaArrowLeft /> Quay lại
        </button>

        <div className="article-main-content"> {/* Nội dung chính với 2 cột */}
          {/* Bên trái: Nội dung bài viết */}
          <div className="article-content-area">
            <div className="article-header"> {/* Phần header bài viết */}
              <h1 className="article-title">{article.title}</h1> {/* Tiêu đề */}

              <div className="article-meta"> {/* Thông tin meta */}
                <div className="meta-item">
                  <FaUser className="meta-icon" />
                  <span>{article.author?.full_name || 'Ẩn danh'}</span> {/* Tên tác giả */}
                </div>
                <div className="meta-item">
                  <FaCalendar className="meta-icon" />
                  <span>{new Date(article.created_at).toLocaleDateString('vi-VN', { // Thời gian đăng
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</span>
                </div>
                <div className="meta-item">
                  <FaEye className="meta-icon" />
                  <span>{stats.views} lượt xem</span> {/* Lượt xem */}
                </div>
              </div>

              {article.tags_json && article.tags_json.length > 0 && ( /* Tags nếu có */
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

            <div className="article-content"> {/* Nội dung bài viết */}
              <div 
                className="content-body"
                dangerouslySetInnerHTML={{ __html: article.content }} // Hiển thị nội dung HTML
              />
            </div>

            {article.source && ( /* Nguồn nếu có */
              <div className="article-source">
                <FaLink />
                <span>Nguồn: </span>
                <a href={article.source} target="_blank" rel="noopener noreferrer">
                  {article.source}
                </a>
              </div>
            )}

            <div className="article-actions"> {/* Các nút tương tác */}
              <button 
                className={`action-btn ${isLiked ? 'active' : ''}`}
                onClick={() => handleInteraction('like')}
              >
                <FaThumbsUp />
                <span>{stats.likes} Thích</span>
              </button>

              <div className="share-dropdown"> {/* Dropdown chia sẻ */}
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
                  setShowReportPopup(true); // Mở popup báo cáo
                }}
              >
                <FaFlag />
                <span>Báo cáo</span>
              </button>

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
          {((categoryType === 'thuoc' && article.medicine) || (categoryType === 'benh_ly' && article.disease)) && (
            <div className="article-sidebar"> {/* Sidebar chỉ hiển thị nếu phù hợp loại */}
              {categoryType === 'thuoc' && article.medicine && (
                <div className="medical-info medicine-info"> {/* Thông tin thuốc */}
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

              {categoryType === 'benh_ly' && article.disease && (
                <div className="medical-info disease-info"> {/* Thông tin bệnh lý */}
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

        {/* Popup báo cáo */}
        {showReportPopup && (
          <div className="report-popup-overlay" onClick={() => setShowReportPopup(false)}> {/* Lớp overlay */}
            <div className="report-popup" onClick={(e) => e.stopPropagation()}> {/* Popup chính */}
              <div className="report-popup-header"> {/* Header popup */}
                <div className="report-header-content">
                  <FaExclamationTriangle className="report-icon" />
                  <h3>Báo cáo bài viết</h3>
                </div>
                <button onClick={() => setShowReportPopup(false)} className="btn-close-popup">
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleSubmitReport} className="report-popup-body"> {/* Form báo cáo */}
                <div className="report-info">
                  <p>Vui lòng cho chúng tôi biết lý do báo cáo bài viết này. Admin sẽ xem xét và xử lý.</p>
                </div>

                <div className="report-quick-reasons"> {/* Lý do nhanh */}
                  <label className="report-label">Lý do thường gặp:</label>
                  <div className="quick-reason-buttons">
                    {reportReasons.map((r, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setReportReason(r)}
                        className={`btn-quick-reason ${reportReason === r ? 'active' : ''}`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="report-form-group"> {/* Nhập chi tiết lý do */}
                  <label className="report-label">
                    Chi tiết lý do <span className="required">*</span>
                  </label>
                  <textarea
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    placeholder="Nhập chi tiết lý do báo cáo (tối đa 500 ký tự)..."
                    maxLength={500}
                    rows={5}
                    className="report-textarea"
                    required
                  />
                  <small className="char-count">{reportReason.length}/500 ký tự</small>
                </div>

                <div className="report-popup-footer"> {/* Footer popup */}
                  <button
                    type="button"
                    onClick={() => setShowReportPopup(false)}
                    className="btn-cancel"
                    disabled={submittingReport}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="btn-submit-report"
                    disabled={submittingReport || !reportReason.trim()}
                  >
                    {submittingReport ? (
                      <>
                        <FaSpinner className="spinner-icon" /> Đang gửi...
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
      </div>
    </div>
  );
};

export default ArticleDetailPage; // Export component