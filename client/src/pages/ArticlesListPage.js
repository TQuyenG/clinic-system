// client/src/pages/ArticlesListPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Breadcrumb from '../components/Breadcrumb';
import { FaSearch, FaEye, FaCalendar, FaTimes, FaTags, FaChevronRight } from 'react-icons/fa';
import './ArticlesListPage.css';

const ArticlesListPage = ({ type, categoryData }) => { 
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const API_BASE_URL = 'http://localhost:3001';
  
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [popularArticles, setPopularArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});

  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    tag: searchParams.get('tag') || '',
    letter: searchParams.get('letter') || '', 
    page: parseInt(searchParams.get('page')) || 1,
    limit: 14 // Lấy 14 bài: 1 Hero (Trái) + 2 Side (Phải) + 3 Bottom (Dưới) + 8 List dọc
  });

  const [searchInput, setSearchInput] = useState(filters.search);
  const activeCategoryId = categoryData ? categoryData.id : null; 

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  useEffect(() => {
    fetchInitialData();
  }, [type, activeCategoryId]);

  useEffect(() => {
    fetchArticles();
    updateUrlParams();
  }, [filters, type, activeCategoryId]);

  useEffect(() => {
    if (categoryData) {
      setFilters(prev => ({ ...prev, page: 1, search: '', tag: '', letter: '' }));
      setSearchInput('');
    }
  }, [categoryData]);

  const fetchInitialData = async () => {
    try {
      const [catsRes, tagsRes, popRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/articles/categories`),
        axios.get(`${API_BASE_URL}/api/articles/tags/all`),
        axios.get(`${API_BASE_URL}/api/articles/public?limit=5&sort_by=views&sort_order=DESC${type ? `&category_type=${type}` : ''}${activeCategoryId ? `&category_id=${activeCategoryId}` : ''}`)
      ]);
      if (catsRes.data.success) setCategories(catsRes.data.categories || []);
      if (tagsRes.data.success) setAvailableTags((tagsRes.data.tags || []).slice(0, 15));
      if (popRes.data.success) setPopularArticles(popRes.data.articles || []);
    } catch (error) {
      console.error('Lỗi tải dữ liệu ban đầu:', error);
    }
  };

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (type) params.append('category_type', type);
      if (activeCategoryId) params.append('category_id', activeCategoryId);
      if (filters.search) params.append('search', filters.search);
      if (filters.tag) params.append('tag', filters.tag);
      if (filters.letter) params.append('letter', filters.letter);
      params.append('page', filters.page);
      params.append('limit', filters.limit);

      const response = await axios.get(`${API_BASE_URL}/api/articles/public?${params.toString()}`);
      if (response.data.success) {
        setArticles(response.data.articles || []);
        setPagination(response.data.pagination || {});
      }
    } catch (error) {
      console.error('Lỗi tải bài viết:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUrlParams = () => {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.tag) params.set('tag', filters.tag);
    if (filters.letter) params.set('letter', filters.letter);
    if (filters.page > 1) params.set('page', filters.page);
    setSearchParams(params);
  };

  const handleCategoryClick = (cat) => {
    if (!cat) {
      const route = type ? `/${type.replace('_', '-')}` : '/bai-viet';
      navigate(route);
    } else {
      const routeType = cat.category_type === 'tin_tuc' ? 'tin-tuc' :
                        cat.category_type === 'thuoc' ? 'thuoc' :
                        cat.category_type === 'benh_ly' ? 'benh-ly' : 'danh-muc';
      navigate(`/${routeType}/${cat.slug}`);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setFilters(prev => ({ ...prev, search: searchInput, page: 1 }));
  };

  const clearAllFilters = () => {
    setFilters(prev => ({ ...prev, search: '', tag: '', letter: '', page: 1 }));
    setSearchInput('');
  };

  const getCategoryTypeUrl = (article) => {
    const typeMap = { 'tin_tuc': 'tin-tuc', 'thuoc': 'thuoc', 'benh_ly': 'benh-ly' };
    return `/${typeMap[article.category?.category_type] || 'tin-tuc'}/${article.slug}`;
  };

  const getFirstImage = (html) => {
    if (!html) return '/placeholder.jpg';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const img = doc.querySelector('img');
    return img ? img.src : '/placeholder.jpg';
  };

  const truncateContent = (html, maxLength = 160) => {
    if (!html) return '';
    const text = html.replace(/<[^>]*>/g, '');
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const currentCategories = type ? categories.filter(c => c.category_type === type) : categories;
  const getBreadcrumbItems = () => {
    const items = [
      { label: 'Trang chủ', url: '/' },
      { label: 'Bài viết', url: '/bai-viet' }
    ];
    const typeLabels = { 'tin_tuc': 'Tin tức', 'thuoc': 'Thuốc', 'benh_ly': 'Bệnh lý' };
    const typeUrls = { 'tin_tuc': '/tin-tuc', 'thuoc': '/thuoc', 'benh_ly': '/benh-ly' };

    if (type) {
      if (categoryData) {
        items.push({ label: typeLabels[type], url: typeUrls[type] });
        items.push({ label: categoryData.name, url: null });
      } else {
        items.push({ label: typeLabels[type], url: null });
      }
    } else if (categoryData) {
      items.push({ label: categoryData.name, url: null });
    }

    if (filters.tag) items.push({ label: `Tag: ${filters.tag}`, url: null });
    if (filters.search) items.push({ label: `Tìm kiếm: ${filters.search}`, url: null });

    return items;
  };

  // --- TÁCH LAYOUT BÁO CHÍ THEO ĐÚNG HÌNH ẢNH MẪU (1 + 2 + 3 + List) ---
  const heroMain = articles.length > 0 ? articles[0] : null;       // Bài to bên trái
  const heroRight = articles.slice(1, 3);                          // 2 Bài nhỏ bên phải
  const heroBottom = articles.slice(3, 6);                         // 3 Bài xếp ngang ở dưới
  const listArticles = articles.slice(6);                          // Các bài còn lại dạng list

  return (
    <div className="article-list-page-wrapper">
      
      <div className="article-list-container">
        <Breadcrumb items={getBreadcrumbItems()} />
      </div>

      <div className="article-list-green-navbar">
        <div className="article-list-container">
          <div className="article-list-nav-scroll">
            <button 
              className={`article-list-nav-btn ${!activeCategoryId ? 'active' : ''}`}
              onClick={() => handleCategoryClick(null)}
            >
              TẤT CẢ
            </button>
            {currentCategories.map(cat => (
              <button 
                key={cat.id} 
                className={`article-list-nav-btn ${activeCategoryId === cat.id ? 'active' : ''}`}
                onClick={() => handleCategoryClick(cat)}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="article-list-container">
        
        <div className="article-list-header-section">
          <h1 className="article-list-main-title">
            {categoryData ? categoryData.name : (type === 'tin_tuc' ? 'TIN TỨC Y TẾ' : type === 'thuoc' ? 'DANH MỤC THUỐC' : type === 'benh_ly' ? 'TỪ ĐIỂN BỆNH LÝ' : 'TẤT CẢ BÀI VIẾT')} 
            <FaChevronRight />
          </h1>
          
          <div className="article-list-sub-tabs">
            {currentCategories.filter(c => c.id !== activeCategoryId).slice(0, 5).map(cat => (
              <button 
                key={cat.id} 
                className="article-list-tab-item"
                onClick={() => handleCategoryClick(cat)}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <form className="article-list-search-mini" onSubmit={handleSearchSubmit}>
            <input 
              type="text" 
              placeholder="Tìm bài viết..." 
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <button type="submit"><FaSearch /></button>
          </form>
        </div>

        {(type === 'thuoc' || type === 'benh_ly') && (
          <div className="article-list-alphabet-filter">
            <button
              className={`article-list-alphabet-btn ${!filters.letter ? 'article-list-active' : ''}`}
              onClick={() => setFilters(prev => ({ ...prev, letter: '', page: 1 }))}
            >
              Tất cả A-Z
            </button>
            {alphabet.map(letter => (
              <button
                key={letter}
                className={`article-list-alphabet-btn ${filters.letter === letter ? 'article-list-active' : ''}`}
                onClick={() => setFilters(prev => ({ ...prev, letter: letter, page: 1 }))}
              >
                {letter}
              </button>
            ))}
          </div>
        )}

        {(filters.tag || filters.search || filters.letter) && (
          <div className="article-list-filter-alert">
            <p>Đang hiển thị kết quả cho: <strong>{filters.tag ? `#${filters.tag}` : filters.letter ? `Chữ cái ${filters.letter}` : `"${filters.search}"`}</strong></p>
            <button onClick={clearAllFilters}><FaTimes /> Bỏ lọc</button>
          </div>
        )}

        {loading ? (
          <div className="article-list-loading">Đang tải bài viết...</div>
        ) : articles.length === 0 ? (
          <div className="article-list-empty">Không tìm thấy bài viết nào phù hợp.</div>
        ) : (
          <div className="article-list-layout-grid">
            
            {/* --- CỘT TRÁI --- */}
            <div className="article-list-main-content">
              
              {heroMain && (
                <div className="article-list-magazine-top">
                  
                  {/* --- KHỐI TRÊN: 1 LỚN BÊN TRÁI + 2 NHỎ BÊN PHẢI --- */}
                  <div className="article-list-hero-split">
                    
                    {/* Nửa Trái: Bài Đinh Siêu To */}
                    <div className="article-list-hero-main" onClick={() => navigate(getCategoryTypeUrl(heroMain))}>
                      <div className="article-list-hero-main-img">
                        <img src={getFirstImage(heroMain.content)} alt={heroMain.title} />
                      </div>
                      <h2 className="article-list-hero-main-title">{heroMain.title}</h2>
                      <div className="article-list-meta">
                        <span>{heroMain.category?.name}</span>
                        <span>• <FaCalendar /> {new Date(heroMain.created_at).toLocaleDateString('vi-VN')}</span>
                      </div>
                      <p className="article-list-hero-main-excerpt">{truncateContent(heroMain.content, 220)}</p>
                    </div>

                    {/* Nửa Phải: 2 Bài Nhỏ Xếp Dọc */}
                    <div className="article-list-hero-side">
                      {heroRight.map(article => (
                        <div key={article.id} className="article-list-side-item" onClick={() => navigate(getCategoryTypeUrl(article))}>
                          <div className="article-list-side-img">
                            <img src={getFirstImage(article.content)} alt={article.title} />
                          </div>
                          <div className="article-list-side-info">
                            <h4 className="article-list-side-title">{article.title}</h4>
                            <div className="article-list-meta">
                              <span>{article.category?.name}</span>
                              <span>• {new Date(article.created_at).toLocaleDateString('vi-VN')}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                  </div>

                  {/* --- KHỐI DƯỚI: 3 BÀI NHỎ XẾP NGANG --- */}
                  {heroBottom.length > 0 && (
                    <div className="article-list-hero-bottom">
                      {heroBottom.map(article => (
                        <div key={article.id} className="article-list-bottom-item" onClick={() => navigate(getCategoryTypeUrl(article))}>
                          <div className="article-list-bottom-img">
                            <img src={getFirstImage(article.content)} alt={article.title} />
                          </div>
                          <h4 className="article-list-bottom-title">{article.title}</h4>
                          <div className="article-list-meta">
                            <span>{article.category?.name}</span>
                            <span>• {new Date(article.created_at).toLocaleDateString('vi-VN')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              )}

              {/* Danh sách List dọc */}
              {listArticles.length > 0 && (
                <div className="article-list-vertical-list">
                  {listArticles.map(article => (
                    <div key={article.id} className="article-list-item-card" onClick={() => navigate(getCategoryTypeUrl(article))}>
                      <div className="article-list-item-img">
                        <img src={getFirstImage(article.content)} alt={article.title} />
                      </div>
                      <div className="article-list-item-info">
                        <h3 className="article-list-item-title">{article.title}</h3>
                        <div className="article-list-meta">
                          <span>{article.category?.name}</span>
                          <span>• {new Date(article.created_at).toLocaleDateString('vi-VN')}</span>
                        </div>
                        <p className="article-list-item-excerpt">{truncateContent(article.content, 180)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Phân trang */}
              {pagination.totalPages > 1 && (
                <div className="article-list-pagination">
                  <button
                    onClick={() => { setFilters(prev => ({...prev, page: prev.page - 1})); window.scrollTo(0,0); }}
                    disabled={filters.page === 1}
                  >
                    Trước
                  </button>
                  <div className="article-list-page-numbers">
                    {[...Array(pagination.totalPages)].map((_, i) => (
                      <button
                        key={i + 1}
                        className={filters.page === i + 1 ? 'article-list-active' : ''}
                        onClick={() => { setFilters(prev => ({...prev, page: i + 1})); window.scrollTo(0,0); }}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => { setFilters(prev => ({...prev, page: prev.page + 1})); window.scrollTo(0,0); }}
                    disabled={filters.page === pagination.totalPages}
                  >
                    Sau
                  </button>
                </div>
              )}
            </div>

            {/* --- CỘT PHẢI (SIDEBAR) --- */}
            <div className="article-list-sidebar">
              <div className="article-list-ad-box">
                <img src="https://suckhoedoisong.qltns.mediacdn.vn/324455921873985536/2024/4/25/an-oc-17140228307611084227367.jpg" alt="Quảng cáo" />
              </div>

              <div className="article-list-widget">
                <h3 className="article-list-widget-title">ĐỌC NHIỀU NHẤT</h3>
                <div className="article-list-popular-container">
                  {popularArticles.map((article, index) => (
                    <div key={article.id} className="article-list-popular-item" onClick={() => navigate(getCategoryTypeUrl(article))}>
                      <span className="article-list-popular-rank">{index + 1}</span>
                      <div className="article-list-popular-content">
                        <h4>{article.title}</h4>
                        <span><FaEye /> {article.views} lượt xem</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="article-list-widget">
                <h3 className="article-list-widget-title"><FaTags /> TỪ KHÓA BÀI VIẾT</h3>
                <div className="article-list-tags-cloud">
                  {availableTags.map((tag, idx) => (
                    <button 
                      key={idx} 
                      className={`article-list-tag-btn ${filters.tag === tag ? 'active' : ''}`}
                      onClick={() => setFilters(prev => ({...prev, tag: tag, page: 1, search: '', letter: ''}))}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArticlesListPage;