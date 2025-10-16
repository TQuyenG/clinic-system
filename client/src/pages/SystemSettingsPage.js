/* 
 * Tệp: SystemSettingsPage.js - PHIÊN BẢN MỚI
 * Mô tả: Quản lý cài đặt hệ thống cho các trang Home, About, Facilities, Equipment
 * Cải tiến: Đầy đủ các section theo yêu cầu, đổi tên tiếng Việt, sửa lỗi icon picker
 */

import React, { useState, useEffect, useRef } from 'react';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import axios from 'axios';
import { FaSave, FaTrash, FaPlus, FaSpinner, FaChevronDown, FaChevronUp, FaTimes } from 'react-icons/fa';
import * as FaIcons from 'react-icons/fa';
import * as MdIcons from 'react-icons/md';
import * as FiIcons from 'react-icons/fi';
import 'react-tabs/style/react-tabs.css';
import './SystemSettingsPage.css';

const API_BASE_URL = 'http://localhost:3001/api';

// Danh sách icon
const iconList = [
  ...Object.keys(FaIcons).filter(icon => icon.startsWith('Fa')).map(icon => ({ name: icon, library: 'fa' })),
  ...Object.keys(MdIcons).filter(icon => icon.startsWith('Md')).map(icon => ({ name: icon, library: 'md' })),
  ...Object.keys(FiIcons).filter(icon => icon.startsWith('Fi')).map(icon => ({ name: icon, library: 'fi' })),
].slice(0, 200); // Giới hạn 200 icon

const iconMap = { ...FaIcons, ...MdIcons, ...FiIcons };

// Component Icon Picker - SỬA LỖI: Click vào modal không đóng picker
const CustomIconPicker = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const pickerRef = useRef(null);

  // Đóng picker khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filteredIcons = iconList.filter(icon =>
    icon.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectIcon = (iconName) => {
    onChange(iconName);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className="sys-settings-icon-picker" ref={pickerRef}>
      <button
        type="button"
        className="sys-settings-btn sys-settings-btn-secondary-sm"
        onClick={() => setIsOpen(!isOpen)}
      >
        {value && iconMap[value] ? (
          <>
            {React.createElement(iconMap[value], { size: 16 })} {value}
          </>
        ) : (
          'Chọn Icon'
        )}
      </button>
      {isOpen && (
        <div className="sys-settings-icon-picker-modal" onClick={(e) => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <input
              type="text"
              placeholder="Tìm icon..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sys-settings-input"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              type="button"
              className="sys-settings-btn sys-settings-btn-danger-sm"
              onClick={() => setIsOpen(false)}
              style={{ marginLeft: '8px' }}
            >
              <FaTimes />
            </button>
          </div>
          <div className="sys-settings-icon-picker-grid">
            {filteredIcons.slice(0, 50).map((icon, index) => (
              <div
                key={index}
                className="sys-settings-icon-picker-item"
                onClick={() => handleSelectIcon(icon.name)}
                title={icon.name}
              >
                {React.createElement(iconMap[icon.name], { size: 18 })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const SystemSettingsPage = () => {
  // Default data structures
  const defaultHomeData = {
    bannerSlides: [],
    features: [],
    aboutSection: { 
      image: '', 
      alt: '', 
      title: '', 
      yearsExperience: '', 
      highlights: [],
      buttonText: 'Xem thêm',
      buttonLink: '/about'
    },
    testimonials: [],
    bookingSection: {
      title: 'Đặt lịch khám bệnh',
      description: '',
      features: [],
      hotline: '1900 xxxx',
      email: 'contact@clinic.com',
      address: '123 Đường ABC, TP.HCM'
    }
  };

  const defaultAboutData = {
    banner: { image: '', alt: '', title: '', subtitle: '', description: '' },
    mission: { image: '', alt: '', icon: 'FaLeaf', title: '', description: '' },
    vision: { image: '', alt: '', icon: 'FaHeartbeat', title: '', description: '' },
    milestones: [],
    stats: [],
    values: [],
    leadership: [],
    achievements: [],
    facilities: []
  };

  const defaultFacilitiesData = {
    banner: { image: '', alt: '', title: '', subtitle: '', description: '' },
    amenities: [],
    facilities: [],
    gallery: [],
    stats: []
  };

  const defaultEquipmentData = {
    banner: { image: '', alt: '', title: '', subtitle: '', description: '' },
    stats: [],
    categories: [],
    equipment: [],
    quality: []
  };

  // State
  const [homeData, setHomeData] = useState(defaultHomeData);
  const [aboutData, setAboutData] = useState(defaultAboutData);
  const [facilitiesData, setFacilitiesData] = useState(defaultFacilitiesData);
  const [equipmentData, setEquipmentData] = useState(defaultEquipmentData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessages, setSuccessMessages] = useState([]);
  const [openSections, setOpenSections] = useState({
    home: { bannerSlides: true, features: true, aboutSection: true, testimonials: true, bookingSection: true },
    about: { banner: true, mission: true, milestones: true, stats: true, values: true, leadership: true, achievements: true, facilities: true },
    facilities: { banner: true, amenities: true, facilities: true, gallery: true, stats: true },
    equipment: { banner: true, stats: true, categories: true, equipment: true, quality: true }
  });
  const [imageOptions, setImageOptions] = useState({});

  // Toggle section
  const toggleSection = (tab, section) => {
    setOpenSections(prev => ({
      ...prev,
      [tab]: { ...prev[tab], [section]: !prev[tab][section] }
    }));
  };

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Vui lòng đăng nhập lại.');
        
        const headers = { Authorization: `Bearer ${token}` };
        const [homeRes, aboutRes, facilitiesRes, equipmentRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/settings/home`, { headers }),
          axios.get(`${API_BASE_URL}/settings/about`, { headers }),
          axios.get(`${API_BASE_URL}/settings/facilities`, { headers }),
          axios.get(`${API_BASE_URL}/settings/equipment`, { headers })
        ]);

        setHomeData({ ...defaultHomeData, ...(homeRes.data || {}) });
        setAboutData({ ...defaultAboutData, ...(aboutRes.data || {}) });
        setFacilitiesData({ ...defaultFacilitiesData, ...(facilitiesRes.data || {}) });
        setEquipmentData({ ...defaultEquipmentData, ...(equipmentRes.data || {}) });
      } catch (err) {
        setError('Lỗi khi tải dữ liệu: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Array handlers
  const handleArrayChange = (setter, arrayKey, index, field, value) => {
    setter(prev => {
      const newArray = [...(prev[arrayKey] || [])];
      newArray[index] = { ...newArray[index], [field]: value };
      return { ...prev, [arrayKey]: newArray };
    });
  };

  const addArrayItem = (setter, arrayKey, defaultItem) => {
    setter(prev => ({
      ...prev,
      [arrayKey]: [...(prev[arrayKey] || []), { ...defaultItem }]
    }));
  };

  const removeArrayItem = (setter, arrayKey, index) => {
    setter(prev => ({
      ...prev,
      [arrayKey]: (prev[arrayKey] || []).filter((_, i) => i !== index)
    }));
  };

  // Image upload
  const handleArrayImageUpload = async (setter, arrayKey, index, field, file) => {
    if (!file) return;
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Vui lòng đăng nhập lại để upload ảnh.');
      return;
    }
    
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await axios.post(`${API_BASE_URL}/upload/image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });
      handleArrayChange(setter, arrayKey, index, field, response.data.url);
    } catch (err) {
      setError('Lỗi upload ảnh: ' + (err.response?.data?.message || err.message));
    }
  };

  // Single image upload
  const handleSingleImageUpload = async (setter, path, file) => {
    if (!file) return;
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Vui lòng đăng nhập lại để upload ảnh.');
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await axios.post(`${API_BASE_URL}/upload/image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });
      
      // Update nested object
      setter(prev => {
        const keys = path.split('.');
        const newData = { ...prev };
        let current = newData;
        
        for (let i = 0; i < keys.length - 1; i++) {
          current[keys[i]] = { ...current[keys[i]] };
          current = current[keys[i]];
        }
        
        current[keys[keys.length - 1]] = response.data.url;
        return newData;
      });
    } catch (err) {
      setError('Lỗi upload ảnh: ' + (err.response?.data?.message || err.message));
    }
  };

  // Image option handler
  const handleImageOptionChange = (key, option) => {
    setImageOptions(prev => ({ ...prev, [key]: option }));
  };

  // Save data
  const saveData = async (endpoint, data, successMessage) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Vui lòng đăng nhập lại.');
      
      await axios.put(`${API_BASE_URL}/settings/${endpoint}`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccessMessages(prev => [...prev, successMessage]);
      setTimeout(() => {
        setSuccessMessages(prev => prev.filter(msg => msg !== successMessage));
      }, 3000);
    } catch (err) {
      setError('Lỗi khi lưu dữ liệu: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  if (loading && !homeData.bannerSlides) {
    return <div className="sys-settings-loading"><FaSpinner className="sys-settings-spinner" /> Đang tải dữ liệu...</div>;
  }

  return (
    <div className="sys-settings-container">
      {error && <div className="sys-settings-alert sys-settings-alert-error">{error}</div>}
      {successMessages.map((msg, index) => (
        <div key={index} className="sys-settings-alert sys-settings-alert-success">{msg}</div>
      ))}

      <h2 className="sys-settings-title">Quản lý Cài đặt Hệ thống</h2>

      <div className="sys-settings-top-save">
        <button
          onClick={async () => {
            setSuccessMessages([]);
            await Promise.all([
              saveData('home', homeData, 'Lưu trang Home thành công!'),
              saveData('about', aboutData, 'Lưu trang About thành công!'),
              saveData('facilities', facilitiesData, 'Lưu trang Facilities thành công!'),
              saveData('equipment', equipmentData, 'Lưu trang Equipment thành công!')
            ]);
          }}
          className="sys-settings-btn sys-settings-btn-primary"
          disabled={loading}
        >
          <FaSave /> Lưu Tất cả
        </button>
      </div>

      <Tabs>
        <TabList className="sys-settings-tab-list">
          <Tab className="sys-settings-tab">Home</Tab>
          <Tab className="sys-settings-tab">About</Tab>
          <Tab className="sys-settings-tab">Facilities</Tab>
          <Tab className="sys-settings-tab">Equipment</Tab>
        </TabList>

        {/* ==================== TAB HOME ==================== */}
        <TabPanel className="sys-settings-tab-panel">
          {/* 1. Banner Slides */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('home', 'bannerSlides')}>
              <h3 className="sys-settings-section-title">1. Banner Slides (Tối đa 4)</h3>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if ((homeData.bannerSlides || []).length < 4) {
                      addArrayItem(setHomeData, 'bannerSlides', { 
                        image: '', alt: '', title: '', subtitle: '', description: '', 
                        buttonText: 'Đặt lịch ngay', buttonLink: '/book-appointment',
                        buttonIcon: 'FaCalendarAlt', buttonColor: '#10b981'
                      });
                    }
                  }}
                  className="sys-settings-btn sys-settings-btn-primary"
                  disabled={(homeData.bannerSlides || []).length >= 4}
                  style={{ fontSize: '0.8rem', padding: '5px 10px' }}
                >
                  <FaPlus /> Thêm
                </button>
                {openSections.home.bannerSlides ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.home.bannerSlides && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  {(homeData.bannerSlides || []).slice(0, 4).map((slide, index) => {
                    const key = `home-bannerSlides-${index}`;
                    const option = imageOptions[key] || 'upload';
                    return (
                      <div key={index} className="sys-settings-card">
                        <h4 style={{ marginBottom: '12px', color: '#10b981' }}>Slide {index + 1}</h4>
                        
                        {/* Image */}
                        <label className="sys-settings-label">Chọn cách thêm ảnh</label>
                        <div className="sys-settings-image-options">
                          <label>
                            <input type="radio" checked={option === 'upload'} 
                              onChange={() => handleImageOptionChange(key, 'upload')} />
                            Upload file
                          </label>
                          <label>
                            <input type="radio" checked={option === 'url'} 
                              onChange={() => handleImageOptionChange(key, 'url')} />
                            Nhập URL
                          </label>
                        </div>
                        {option === 'upload' ? (
                          <input type="file" accept="image/*"
                            onChange={(e) => handleArrayImageUpload(setHomeData, 'bannerSlides', index, 'image', e.target.files[0])}
                            className="sys-settings-file-input" />
                        ) : (
                          <input type="text" value={slide.image || ''} placeholder="https://example.com/image.jpg"
                            onChange={(e) => handleArrayChange(setHomeData, 'bannerSlides', index, 'image', e.target.value)}
                            className="sys-settings-input" />
                        )}
                        {slide.image && <img src={slide.image} alt={slide.alt || ''} className="sys-settings-preview-img" />}
                        
                        <label className="sys-settings-label">Alt Text</label>
                        <input type="text" value={slide.alt || ''} placeholder="Mô tả ảnh"
                          onChange={(e) => handleArrayChange(setHomeData, 'bannerSlides', index, 'alt', e.target.value)}
                          className="sys-settings-input" />
                        
                        <label className="sys-settings-label">Tiêu đề</label>
                        <input type="text" value={slide.title || ''} placeholder="Tiêu đề chính"
                          onChange={(e) => handleArrayChange(setHomeData, 'bannerSlides', index, 'title', e.target.value)}
                          className="sys-settings-input" />
                        
                        <label className="sys-settings-label">Phụ đề</label>
                        <input type="text" value={slide.subtitle || ''} placeholder="Phụ đề"
                          onChange={(e) => handleArrayChange(setHomeData, 'bannerSlides', index, 'subtitle', e.target.value)}
                          className="sys-settings-input" />
                        
                        <label className="sys-settings-label">Mô tả</label>
                        <textarea value={slide.description || ''} placeholder="Mô tả chi tiết"
                          onChange={(e) => handleArrayChange(setHomeData, 'bannerSlides', index, 'description', e.target.value)}
                          className="sys-settings-textarea" />
                        
                        <label className="sys-settings-label">Text nút CTA</label>
                        <input type="text" value={slide.buttonText || ''} placeholder="Đặt lịch ngay"
                          onChange={(e) => handleArrayChange(setHomeData, 'bannerSlides', index, 'buttonText', e.target.value)}
                          className="sys-settings-input" />
                        
                        <label className="sys-settings-label">Link nút CTA</label>
                        <input type="text" value={slide.buttonLink || ''} placeholder="/book-appointment"
                          onChange={(e) => handleArrayChange(setHomeData, 'bannerSlides', index, 'buttonLink', e.target.value)}
                          className="sys-settings-input" />
                        
                        <label className="sys-settings-label">Icon nút CTA</label>
                        <CustomIconPicker value={slide.buttonIcon || ''} 
                          onChange={(icon) => handleArrayChange(setHomeData, 'bannerSlides', index, 'buttonIcon', icon)} />
                        
                        <label className="sys-settings-label">Màu nút CTA</label>
                        <input type="color" value={slide.buttonColor || '#10b981'}
                          onChange={(e) => handleArrayChange(setHomeData, 'bannerSlides', index, 'buttonColor', e.target.value)}
                          style={{ width: '100%', height: '40px', border: '1px solid #d1d5db', borderRadius: '4px' }} />
                        
                        <button type="button" onClick={() => removeArrayItem(setHomeData, 'bannerSlides', index)}
                          className="sys-settings-btn sys-settings-btn-danger" style={{ marginTop: '12px' }}>
                          <FaTrash /> Xóa Slide
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <button onClick={() => saveData('home', homeData, 'Lưu Banner Slides thành công!')}
              className="sys-settings-btn sys-settings-btn-primary sys-settings-section-save">
              <FaSave /> Lưu Banner Slides
            </button>
          </section>

          {/* 2. Tính năng nổi bật */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('home', 'features')}>
              <h3 className="sys-settings-section-title">2. Tính năng nổi bật</h3>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button type="button" onClick={(e) => { e.stopPropagation(); 
                  addArrayItem(setHomeData, 'features', { icon: 'FaStethoscope', title: '', description: '', iconBgColor: '#10b981' }); }}
                  className="sys-settings-btn sys-settings-btn-primary" style={{ fontSize: '0.8rem', padding: '5px 10px' }}>
                  <FaPlus /> Thêm
                </button>
                {openSections.home.features ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.home.features && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  {(homeData.features || []).map((feature, index) => (
                    <div key={index} className="sys-settings-card">
                      <label className="sys-settings-label">Icon</label>
                      <CustomIconPicker value={feature.icon || ''} 
                        onChange={(icon) => handleArrayChange(setHomeData, 'features', index, 'icon', icon)} />
                      
                      <label className="sys-settings-label">Màu nền icon</label>
                      <input type="color" value={feature.iconBgColor || '#10b981'}
                        onChange={(e) => handleArrayChange(setHomeData, 'features', index, 'iconBgColor', e.target.value)}
                        style={{ width: '100%', height: '40px', border: '1px solid #d1d5db', borderRadius: '4px' }} />
                      
                      <label className="sys-settings-label">Tiêu đề</label>
                      <input type="text" value={feature.title || ''} placeholder="Tiêu đề tính năng"
                        onChange={(e) => handleArrayChange(setHomeData, 'features', index, 'title', e.target.value)}
                        className="sys-settings-input" />
                      
                      <label className="sys-settings-label">Mô tả</label>
                      <textarea value={feature.description || ''} placeholder="Mô tả tính năng"
                        onChange={(e) => handleArrayChange(setHomeData, 'features', index, 'description', e.target.value)}
                        className="sys-settings-textarea" />
                      
                      <button type="button" onClick={() => removeArrayItem(setHomeData, 'features', index)}
                        className="sys-settings-btn sys-settings-btn-danger" style={{ marginTop: '12px' }}>
                        <FaTrash /> Xóa
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button onClick={() => saveData('home', homeData, 'Lưu Tính năng thành công!')}
              className="sys-settings-btn sys-settings-btn-primary sys-settings-section-save">
              <FaSave /> Lưu Tính năng
            </button>
          </section>

          {/* 3. Về chúng tôi */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('home', 'aboutSection')}>
              <h3 className="sys-settings-section-title">3. Về chúng tôi</h3>
              {openSections.home.aboutSection ? <FaChevronUp /> : <FaChevronDown />}
            </div>
            {openSections.home.aboutSection && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  <div className="sys-settings-card">
                    {/* Image */}
                    <label className="sys-settings-label">Hình ảnh</label>
                    <div className="sys-settings-image-options">
                      <label>
                        <input type="radio" checked={(imageOptions['aboutSection'] || 'upload') === 'upload'} 
                          onChange={() => handleImageOptionChange('aboutSection', 'upload')} />
                        Upload file
                      </label>
                      <label>
                        <input type="radio" checked={(imageOptions['aboutSection'] || 'upload') === 'url'} 
                          onChange={() => handleImageOptionChange('aboutSection', 'url')} />
                        Nhập URL
                      </label>
                    </div>
                    {(imageOptions['aboutSection'] || 'upload') === 'upload' ? (
                      <input type="file" accept="image/*"
                        onChange={(e) => handleSingleImageUpload(setHomeData, 'aboutSection.image', e.target.files[0])}
                        className="sys-settings-file-input" />
                    ) : (
                      <input type="text" value={homeData.aboutSection?.image || ''} placeholder="https://example.com/image.jpg"
                        onChange={(e) => setHomeData(prev => ({ ...prev, aboutSection: { ...prev.aboutSection, image: e.target.value }}))}
                        className="sys-settings-input" />
                    )}
                    {homeData.aboutSection?.image && (
                      <img src={homeData.aboutSection.image} alt={homeData.aboutSection.alt || ''} className="sys-settings-preview-img" />
                    )}
                    
                    <label className="sys-settings-label">Alt Text</label>
                    <input type="text" value={homeData.aboutSection?.alt || ''} placeholder="Mô tả ảnh"
                      onChange={(e) => setHomeData(prev => ({ ...prev, aboutSection: { ...prev.aboutSection, alt: e.target.value }}))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Tiêu đề section</label>
                    <input type="text" value={homeData.aboutSection?.title || ''} placeholder="Về chúng tôi"
                      onChange={(e) => setHomeData(prev => ({ ...prev, aboutSection: { ...prev.aboutSection, title: e.target.value }}))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Số năm kinh nghiệm</label>
                    <input type="text" value={homeData.aboutSection?.yearsExperience || ''} placeholder="15+"
                      onChange={(e) => setHomeData(prev => ({ ...prev, aboutSection: { ...prev.aboutSection, yearsExperience: e.target.value }}))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Điểm nổi bật (mỗi dòng: Icon|Tiêu đề|Mô tả)</label>
                    <textarea value={(homeData.aboutSection?.highlights || []).map(h => `${h.icon}|${h.title}|${h.description}`).join('\n')}
                      onChange={(e) => {
                        const lines = e.target.value.split('\n').filter(line => line.trim());
                        const highlights = lines.map(line => {
                          const [icon, title, description] = line.split('|');
                          return { icon: icon?.trim() || 'FaCheckCircle', title: title?.trim() || '', description: description?.trim() || '' };
                        });
                        setHomeData(prev => ({ ...prev, aboutSection: { ...prev.aboutSection, highlights }}));
                      }}
                      placeholder="FaCheckCircle|Đội ngũ bác sĩ giàu kinh nghiệm|Các chuyên gia y tế được đào tạo bài bản"
                      className="sys-settings-textarea" />
                    
                    <label className="sys-settings-label">Text nút "Xem thêm"</label>
                    <input type="text" value={homeData.aboutSection?.buttonText || ''} placeholder="Xem thêm"
                      onChange={(e) => setHomeData(prev => ({ ...prev, aboutSection: { ...prev.aboutSection, buttonText: e.target.value }}))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Link nút</label>
                    <input type="text" value={homeData.aboutSection?.buttonLink || ''} placeholder="/about"
                      onChange={(e) => setHomeData(prev => ({ ...prev, aboutSection: { ...prev.aboutSection, buttonLink: e.target.value }}))}
                      className="sys-settings-input" />
                  </div>
                </div>
              </div>
            )}
            <button onClick={() => saveData('home', homeData, 'Lưu Về chúng tôi thành công!')}
              className="sys-settings-btn sys-settings-btn-primary sys-settings-section-save">
              <FaSave /> Lưu Về chúng tôi
            </button>
          </section>

          {/* 4. Đánh giá từ bệnh nhân */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('home', 'testimonials')}>
              <h3 className="sys-settings-section-title">4. Đánh giá từ bệnh nhân</h3>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button type="button" onClick={(e) => { e.stopPropagation(); 
                  addArrayItem(setHomeData, 'testimonials', { name: '', role: '', comment: '', avatar: '', alt: '', rating: 5 }); }}
                  className="sys-settings-btn sys-settings-btn-primary" style={{ fontSize: '0.8rem', padding: '5px 10px' }}>
                  <FaPlus /> Thêm
                </button>
                {openSections.home.testimonials ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.home.testimonials && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  {(homeData.testimonials || []).map((testimonial, index) => {
                    const key = `home-testimonials-${index}`;
                    const option = imageOptions[key] || 'upload';
                    return (
                      <div key={index} className="sys-settings-card">
                        <label className="sys-settings-label">Ảnh</label>
                        <div className="sys-settings-image-options">
                          <label>
                            <input type="radio" checked={option === 'upload'} 
                              onChange={() => handleImageOptionChange(key, 'upload')} />
                            Upload
                          </label>
                          <label>
                            <input type="radio" checked={option === 'url'} 
                              onChange={() => handleImageOptionChange(key, 'url')} />
                            URL
                          </label>
                        </div>
                        {option === 'upload' ? (
                          <input type="file" accept="image/*"
                            onChange={(e) => handleArrayImageUpload(setHomeData, 'testimonials', index, 'avatar', e.target.files[0])}
                            className="sys-settings-file-input" />
                        ) : (
                          <input type="text" value={testimonial.avatar || ''} placeholder="https://example.com/avatar.jpg"
                            onChange={(e) => handleArrayChange(setHomeData, 'testimonials', index, 'avatar', e.target.value)}
                            className="sys-settings-input" />
                        )}
                        {testimonial.avatar && <img src={testimonial.avatar} alt={testimonial.alt || ''} className="sys-settings-preview-img" />}
                        
                        <label className="sys-settings-label">Alt Text</label>
                        <input type="text" value={testimonial.alt || ''} placeholder="Ảnh bệnh nhân"
                          onChange={(e) => handleArrayChange(setHomeData, 'testimonials', index, 'alt', e.target.value)}
                          className="sys-settings-input" />
                        
                        <label className="sys-settings-label">Tên</label>
                        <input type="text" value={testimonial.name || ''} placeholder="Nguyễn Văn A"
                          onChange={(e) => handleArrayChange(setHomeData, 'testimonials', index, 'name', e.target.value)}
                          className="sys-settings-input" />
                        
                        <label className="sys-settings-label">Vai trò</label>
                        <input type="text" value={testimonial.role || ''} placeholder="Bệnh nhân"
                          onChange={(e) => handleArrayChange(setHomeData, 'testimonials', index, 'role', e.target.value)}
                          className="sys-settings-input" />
                        
                        <label className="sys-settings-label">Nội dung đánh giá</label>
                        <textarea value={testimonial.comment || ''} placeholder="Dịch vụ tuyệt vời..."
                          onChange={(e) => handleArrayChange(setHomeData, 'testimonials', index, 'comment', e.target.value)}
                          className="sys-settings-textarea" />
                        
                        <label className="sys-settings-label">Đánh giá (1-5 sao)</label>
                        <input type="number" min="1" max="5" value={testimonial.rating || 5}
                          onChange={(e) => handleArrayChange(setHomeData, 'testimonials', index, 'rating', parseInt(e.target.value))}
                          className="sys-settings-input" />
                        
                        <button type="button" onClick={() => removeArrayItem(setHomeData, 'testimonials', index)}
                          className="sys-settings-btn sys-settings-btn-danger" style={{ marginTop: '12px' }}>
                          <FaTrash /> Xóa
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <button onClick={() => saveData('home', homeData, 'Lưu Đánh giá thành công!')}
              className="sys-settings-btn sys-settings-btn-primary sys-settings-section-save">
              <FaSave /> Lưu Đánh giá
            </button>
          </section>

          {/* 5. Đặt lịch khám bệnh */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('home', 'bookingSection')}>
              <h3 className="sys-settings-section-title">5. Đặt lịch khám bệnh</h3>
              {openSections.home.bookingSection ? <FaChevronUp /> : <FaChevronDown />}
            </div>
            {openSections.home.bookingSection && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  <div className="sys-settings-card">
                    <label className="sys-settings-label">Tiêu đề section</label>
                    <input type="text" value={homeData.bookingSection?.title || ''} placeholder="Đặt lịch khám bệnh"
                      onChange={(e) => setHomeData(prev => ({ ...prev, bookingSection: { ...prev.bookingSection, title: e.target.value }}))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Mô tả</label>
                    <textarea value={homeData.bookingSection?.description || ''} placeholder="Đặt lịch nhanh chóng..."
                      onChange={(e) => setHomeData(prev => ({ ...prev, bookingSection: { ...prev.bookingSection, description: e.target.value }}))}
                      className="sys-settings-textarea" />
                    
                    <label className="sys-settings-label">Tính năng (mỗi dòng: Icon|Text)</label>
                    <textarea value={(homeData.bookingSection?.features || []).map(f => `${f.icon}|${f.text}`).join('\n')}
                      onChange={(e) => {
                        const lines = e.target.value.split('\n').filter(line => line.trim());
                        const features = lines.map(line => {
                          const [icon, text] = line.split('|');
                          return { icon: icon?.trim() || 'FaCheckCircle', text: text?.trim() || '' };
                        });
                        setHomeData(prev => ({ ...prev, bookingSection: { ...prev.bookingSection, features }}));
                      }}
                      placeholder="FaCheckCircle|Xác nhận nhanh qua email"
                      className="sys-settings-textarea" />
                    
                    <label className="sys-settings-label">Hotline</label>
                    <input type="text" value={homeData.bookingSection?.hotline || ''} placeholder="1900 xxxx"
                      onChange={(e) => setHomeData(prev => ({ ...prev, bookingSection: { ...prev.bookingSection, hotline: e.target.value }}))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Email</label>
                    <input type="email" value={homeData.bookingSection?.email || ''} placeholder="contact@clinic.com"
                      onChange={(e) => setHomeData(prev => ({ ...prev, bookingSection: { ...prev.bookingSection, email: e.target.value }}))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Địa chỉ</label>
                    <input type="text" value={homeData.bookingSection?.address || ''} placeholder="123 Đường ABC, TP.HCM"
                      onChange={(e) => setHomeData(prev => ({ ...prev, bookingSection: { ...prev.bookingSection, address: e.target.value }}))}
                      className="sys-settings-input" />
                  </div>
                </div>
              </div>
            )}
            <button onClick={() => saveData('home', homeData, 'Lưu Đặt lịch khám thành công!')}
              className="sys-settings-btn sys-settings-btn-primary sys-settings-section-save">
              <FaSave /> Lưu Đặt lịch khám
            </button>
          </section>
        </TabPanel>

        {/* ==================== TAB ABOUT ==================== */}
        <TabPanel className="sys-settings-tab-panel">
          {/* 1. Banner */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('about', 'banner')}>
              <h3 className="sys-settings-section-title">1. Banner</h3>
              {openSections.about.banner ? <FaChevronUp /> : <FaChevronDown />}
            </div>
            {openSections.about.banner && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  <div className="sys-settings-card">
                    <label className="sys-settings-label">Hình ảnh</label>
                    <div className="sys-settings-image-options">
                      <label>
                        <input type="radio" checked={(imageOptions['about-banner'] || 'upload') === 'upload'} 
                          onChange={() => handleImageOptionChange('about-banner', 'upload')} />
                        Upload
                      </label>
                      <label>
                        <input type="radio" checked={(imageOptions['about-banner'] || 'upload') === 'url'} 
                          onChange={() => handleImageOptionChange('about-banner', 'url')} />
                        URL
                      </label>
                    </div>
                    {(imageOptions['about-banner'] || 'upload') === 'upload' ? (
                      <input type="file" accept="image/*"
                        onChange={(e) => handleSingleImageUpload(setAboutData, 'banner.image', e.target.files[0])}
                        className="sys-settings-file-input" />
                    ) : (
                      <input type="text" value={aboutData.banner?.image || ''} placeholder="https://example.com/banner.jpg"
                        onChange={(e) => setAboutData(prev => ({ ...prev, banner: { ...prev.banner, image: e.target.value }}))}
                        className="sys-settings-input" />
                    )}
                    {aboutData.banner?.image && <img src={aboutData.banner.image} alt="" className="sys-settings-preview-img" />}
                    
                    <label className="sys-settings-label">Alt Text</label>
                    <input type="text" value={aboutData.banner?.alt || ''} placeholder="Banner về chúng tôi"
                      onChange={(e) => setAboutData(prev => ({ ...prev, banner: { ...prev.banner, alt: e.target.value }}))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Tiêu đề</label>
                    <input type="text" value={aboutData.banner?.title || ''} placeholder="Clinic System"
                      onChange={(e) => setAboutData(prev => ({ ...prev, banner: { ...prev.banner, title: e.target.value }}))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Phụ đề</label>
                    <input type="text" value={aboutData.banner?.subtitle || ''} placeholder="Đồng hành cùng sức khỏe..."
                      onChange={(e) => setAboutData(prev => ({ ...prev, banner: { ...prev.banner, subtitle: e.target.value }}))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Mô tả</label>
                    <textarea value={aboutData.banner?.description || ''} placeholder="Với hơn 15 năm kinh nghiệm..."
                      onChange={(e) => setAboutData(prev => ({ ...prev, banner: { ...prev.banner, description: e.target.value }}))}
                      className="sys-settings-textarea" />
                  </div>
                </div>
              </div>
            )}
            <button onClick={() => saveData('about', aboutData, 'Lưu Banner thành công!')}
              className="sys-settings-btn sys-settings-btn-primary sys-settings-section-save">
              <FaSave /> Lưu Banner
            </button>
          </section>

          {/* 2. Sứ mệnh & Tầm nhìn */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('about', 'mission')}>
              <h3 className="sys-settings-section-title">2. Sứ mệnh & Tầm nhìn</h3>
              {openSections.about.mission ? <FaChevronUp /> : <FaChevronDown />}
            </div>
            {openSections.about.mission && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  {/* Sứ mệnh */}
                  <div className="sys-settings-card">
                    <h4 style={{ marginBottom: '12px', color: '#10b981' }}>Sứ mệnh</h4>
                    
                    <label className="sys-settings-label">Hình ảnh</label>
                    <div className="sys-settings-image-options">
                      <label>
                        <input type="radio" checked={(imageOptions['mission-image'] || 'upload') === 'upload'} 
                          onChange={() => handleImageOptionChange('mission-image', 'upload')} />
                        Upload
                      </label>
                      <label>
                        <input type="radio" checked={(imageOptions['mission-image'] || 'upload') === 'url'} 
                          onChange={() => handleImageOptionChange('mission-image', 'url')} />
                        URL
                      </label>
                    </div>
                    {(imageOptions['mission-image'] || 'upload') === 'upload' ? (
                      <input type="file" accept="image/*"
                        onChange={(e) => handleSingleImageUpload(setAboutData, 'mission.image', e.target.files[0])}
                        className="sys-settings-file-input" />
                    ) : (
                      <input type="text" value={aboutData.mission?.image || ''} placeholder="https://example.com/mission.jpg"
                        onChange={(e) => setAboutData(prev => ({ ...prev, mission: { ...prev.mission, image: e.target.value }}))}
                        className="sys-settings-input" />
                    )}
                    {aboutData.mission?.image && <img src={aboutData.mission.image} alt="" className="sys-settings-preview-img" />}
                    
                    <label className="sys-settings-label">Alt Text</label>
                    <input type="text" value={aboutData.mission?.alt || ''} placeholder="Sứ mệnh của chúng tôi"
                      onChange={(e) => setAboutData(prev => ({ ...prev, mission: { ...prev.mission, alt: e.target.value }}))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Icon</label>
                    <CustomIconPicker value={aboutData.mission?.icon || 'FaLeaf'} 
                      onChange={(icon) => setAboutData(prev => ({ ...prev, mission: { ...prev.mission, icon }}))} />
                    
                    <label className="sys-settings-label">Tiêu đề</label>
                    <input type="text" value={aboutData.mission?.title || ''} placeholder="Sứ mệnh"
                      onChange={(e) => setAboutData(prev => ({ ...prev, mission: { ...prev.mission, title: e.target.value }}))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Mô tả</label>
                    <textarea value={aboutData.mission?.description || ''} placeholder="Nâng cao chất lượng cuộc sống..."
                      onChange={(e) => setAboutData(prev => ({ ...prev, mission: { ...prev.mission, description: e.target.value }}))}
                      className="sys-settings-textarea" />
                  </div>

                  {/* Tầm nhìn */}
                  <div className="sys-settings-card">
                    <h4 style={{ marginBottom: '12px', color: '#10b981' }}>Tầm nhìn</h4>
                    
                    <label className="sys-settings-label">Hình ảnh</label>
                    <div className="sys-settings-image-options">
                      <label>
                        <input type="radio" checked={(imageOptions['vision-image'] || 'upload') === 'upload'} 
                          onChange={() => handleImageOptionChange('vision-image', 'upload')} />
                        Upload
                      </label>
                      <label>
                        <input type="radio" checked={(imageOptions['vision-image'] || 'upload') === 'url'} 
                          onChange={() => handleImageOptionChange('vision-image', 'url')} />
                        URL
                      </label>
                    </div>
                    {(imageOptions['vision-image'] || 'upload') === 'upload' ? (
                      <input type="file" accept="image/*"
                        onChange={(e) => handleSingleImageUpload(setAboutData, 'vision.image', e.target.files[0])}
                        className="sys-settings-file-input" />
                    ) : (
                      <input type="text" value={aboutData.vision?.image || ''} placeholder="https://example.com/vision.jpg"
                        onChange={(e) => setAboutData(prev => ({ ...prev, vision: { ...prev.vision, image: e.target.value }}))}
                        className="sys-settings-input" />
                    )}
                    {aboutData.vision?.image && <img src={aboutData.vision.image} alt="" className="sys-settings-preview-img" />}
                    
                    <label className="sys-settings-label">Alt Text</label>
                    <input type="text" value={aboutData.vision?.alt || ''} placeholder="Tầm nhìn của chúng tôi"
                      onChange={(e) => setAboutData(prev => ({ ...prev, vision: { ...prev.vision, alt: e.target.value }}))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Icon</label>
                    <CustomIconPicker value={aboutData.vision?.icon || 'FaHeartbeat'} 
                      onChange={(icon) => setAboutData(prev => ({ ...prev, vision: { ...prev.vision, icon }}))} />
                    
                    <label className="sys-settings-label">Tiêu đề</label>
                    <input type="text" value={aboutData.vision?.title || ''} placeholder="Tầm nhìn"
                      onChange={(e) => setAboutData(prev => ({ ...prev, vision: { ...prev.vision, title: e.target.value }}))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Mô tả</label>
                    <textarea value={aboutData.vision?.description || ''} placeholder="Trở thành hệ thống y tế hàng đầu..."
                      onChange={(e) => setAboutData(prev => ({ ...prev, vision: { ...prev.vision, description: e.target.value }}))}
                      className="sys-settings-textarea" />
                  </div>
                </div>
              </div>
            )}
            <button onClick={() => saveData('about', aboutData, 'Lưu Sứ mệnh & Tầm nhìn thành công!')}
              className="sys-settings-btn sys-settings-btn-primary sys-settings-section-save">
              <FaSave /> Lưu Sứ mệnh & Tầm nhìn
            </button>
          </section>

          {/* 3. Lịch sử phát triển */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('about', 'milestones')}>
              <h3 className="sys-settings-section-title">3. Lịch sử phát triển</h3>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button type="button" onClick={(e) => { e.stopPropagation(); 
                  addArrayItem(setAboutData, 'milestones', { year: '', title: '', description: '', image: '', alt: '' }); }}
                  className="sys-settings-btn sys-settings-btn-primary" style={{ fontSize: '0.8rem', padding: '5px 10px' }}>
                  <FaPlus /> Thêm
                </button>
                {openSections.about.milestones ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.about.milestones && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  {(aboutData.milestones || []).map((milestone, index) => {
                    const key = `about-milestones-${index}`;
                    const option = imageOptions[key] || 'upload';
                    return (
                      <div key={index} className="sys-settings-card">
                        <label className="sys-settings-label">Năm (không trùng)</label>
                        <input type="text" value={milestone.year || ''} placeholder="2009"
                          onChange={(e) => handleArrayChange(setAboutData, 'milestones', index, 'year', e.target.value)}
                          className="sys-settings-input" />
                        
                        <label className="sys-settings-label">Tiêu đề</label>
                        <input type="text" value={milestone.title || ''} placeholder="Thành lập công ty"
                          onChange={(e) => handleArrayChange(setAboutData, 'milestones', index, 'title', e.target.value)}
                          className="sys-settings-input" />
                        
                        <label className="sys-settings-label">Mô tả</label>
                        <textarea value={milestone.description || ''} placeholder="Bắt đầu hành trình..."
                          onChange={(e) => handleArrayChange(setAboutData, 'milestones', index, 'description', e.target.value)}
                          className="sys-settings-textarea" />
                        
                        <label className="sys-settings-label">Hình ảnh</label>
                        <div className="sys-settings-image-options">
                          <label>
                            <input type="radio" checked={option === 'upload'} 
                              onChange={() => handleImageOptionChange(key, 'upload')} />
                            Upload
                          </label>
                          <label>
                            <input type="radio" checked={option === 'url'} 
                              onChange={() => handleImageOptionChange(key, 'url')} />
                            URL
                          </label>
                        </div>
                        {option === 'upload' ? (
                          <input type="file" accept="image/*"
                            onChange={(e) => handleArrayImageUpload(setAboutData, 'milestones', index, 'image', e.target.files[0])}
                            className="sys-settings-file-input" />
                        ) : (
                          <input type="text" value={milestone.image || ''} placeholder="https://example.com/image.jpg"
                            onChange={(e) => handleArrayChange(setAboutData, 'milestones', index, 'image', e.target.value)}
                            className="sys-settings-input" />
                        )}
                        {milestone.image && <img src={milestone.image} alt={milestone.alt || ''} className="sys-settings-preview-img" />}
                        
                        <label className="sys-settings-label">Alt Text</label>
                        <input type="text" value={milestone.alt || ''} placeholder="Mô tả ảnh"
                          onChange={(e) => handleArrayChange(setAboutData, 'milestones', index, 'alt', e.target.value)}
                          className="sys-settings-input" />
                        
                        <button type="button" onClick={() => removeArrayItem(setAboutData, 'milestones', index)}
                          className="sys-settings-btn sys-settings-btn-danger" style={{ marginTop: '12px' }}>
                          <FaTrash /> Xóa
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <button onClick={() => saveData('about', aboutData, 'Lưu Lịch sử phát triển thành công!')}
              className="sys-settings-btn sys-settings-btn-primary sys-settings-section-save">
              <FaSave /> Lưu Lịch sử phát triển
            </button>
          </section>

          {/* 4. Thống kê */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('about', 'stats')}>
              <h3 className="sys-settings-section-title">4. Thống kê</h3>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button type="button" onClick={(e) => { e.stopPropagation(); 
                  addArrayItem(setAboutData, 'stats', { number: '', label: '' }); }}
                  className="sys-settings-btn sys-settings-btn-primary" style={{ fontSize: '0.8rem', padding: '5px 10px' }}>
                  <FaPlus /> Thêm
                </button>
                {openSections.about.stats ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.about.stats && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  {(aboutData.stats || []).map((stat, index) => (
                    <div key={index} className="sys-settings-card">
                      <label className="sys-settings-label">Số liệu</label>
                      <input type="text" value={stat.number || ''} placeholder="15+"
                        onChange={(e) => handleArrayChange(setAboutData, 'stats', index, 'number', e.target.value)}
                        className="sys-settings-input" />
                      
                      <label className="sys-settings-label">Nhãn</label>
                      <input type="text" value={stat.label || ''} placeholder="Năm phát triển"
                        onChange={(e) => handleArrayChange(setAboutData, 'stats', index, 'label', e.target.value)}
                        className="sys-settings-input" />
                      
                      <button type="button" onClick={() => removeArrayItem(setAboutData, 'stats', index)}
                        className="sys-settings-btn sys-settings-btn-danger" style={{ marginTop: '12px' }}>
                        <FaTrash /> Xóa
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button onClick={() => saveData('about', aboutData, 'Lưu Thống kê thành công!')}
              className="sys-settings-btn sys-settings-btn-primary sys-settings-section-save">
              <FaSave /> Lưu Thống kê
            </button>
          </section>

          {/* 5. Nguyên tắc hoạt động */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('about', 'values')}>
              <h3 className="sys-settings-section-title">5. Nguyên tắc hoạt động</h3>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button type="button" onClick={(e) => { e.stopPropagation(); 
                  addArrayItem(setAboutData, 'values', { icon: 'FaHeart', title: '', description: '' }); }}
                  className="sys-settings-btn sys-settings-btn-primary" style={{ fontSize: '0.8rem', padding: '5px 10px' }}>
                  <FaPlus /> Thêm
                </button>
                {openSections.about.values ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.about.values && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  {(aboutData.values || []).map((value, index) => (
                    <div key={index} className="sys-settings-card">
                      <label className="sys-settings-label">Icon</label>
                      <CustomIconPicker value={value.icon || ''} 
                        onChange={(icon) => handleArrayChange(setAboutData, 'values', index, 'icon', icon)} />
                      
                      <label className="sys-settings-label">Tiêu đề</label>
                      <input type="text" value={value.title || ''} placeholder="Chuyên nghiệp"
                        onChange={(e) => handleArrayChange(setAboutData, 'values', index, 'title', e.target.value)}
                        className="sys-settings-input" />
                      
                      <label className="sys-settings-label">Mô tả</label>
                      <textarea value={value.description || ''} placeholder="Luôn đặt bệnh nhân lên hàng đầu..."
                        onChange={(e) => handleArrayChange(setAboutData, 'values', index, 'description', e.target.value)}
                        className="sys-settings-textarea" />
                      
                      <button type="button" onClick={() => removeArrayItem(setAboutData, 'values', index)}
                        className="sys-settings-btn sys-settings-btn-danger" style={{ marginTop: '12px' }}>
                        <FaTrash /> Xóa
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button onClick={() => saveData('about', aboutData, 'Lưu Nguyên tắc thành công!')}
              className="sys-settings-btn sys-settings-btn-primary sys-settings-section-save">
              <FaSave /> Lưu Nguyên tắc
            </button>
          </section>

          {/* 6. Đội ngũ điều hành */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('about', 'leadership')}>
              <h3 className="sys-settings-section-title">6. Đội ngũ điều hành</h3>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button type="button" onClick={(e) => { e.stopPropagation(); 
                  addArrayItem(setAboutData, 'leadership', { name: '', position: '', description: '', image: '', alt: '' }); }}
                  className="sys-settings-btn sys-settings-btn-primary" style={{ fontSize: '0.8rem', padding: '5px 10px' }}>
                  <FaPlus /> Thêm
                </button>
                {openSections.about.leadership ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.about.leadership && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  {(aboutData.leadership || []).map((leader, index) => {
                    const key = `about-leadership-${index}`;
                    const option = imageOptions[key] || 'upload';
                    return (
                      <div key={index} className="sys-settings-card">
                        <label className="sys-settings-label">Tên</label>
                        <input type="text" value={leader.name || ''} placeholder="TS. Nguyễn Văn A"
                          onChange={(e) => handleArrayChange(setAboutData, 'leadership', index, 'name', e.target.value)}
                          className="sys-settings-input" />
                        
                        <label className="sys-settings-label">Chức vụ</label>
                        <input type="text" value={leader.position || ''} placeholder="Giám đốc điều hành"
                          onChange={(e) => handleArrayChange(setAboutData, 'leadership', index, 'position', e.target.value)}
                          className="sys-settings-input" />
                        
                        <label className="sys-settings-label">Mô tả</label>
                        <textarea value={leader.description || ''} placeholder="Hơn 20 năm kinh nghiệm..."
                          onChange={(e) => handleArrayChange(setAboutData, 'leadership', index, 'description', e.target.value)}
                          className="sys-settings-textarea" />
                        
                        <label className="sys-settings-label">Hình ảnh</label>
                        <div className="sys-settings-image-options">
                          <label>
                            <input type="radio" checked={option === 'upload'} 
                              onChange={() => handleImageOptionChange(key, 'upload')} />
                            Upload
                          </label>
                          <label>
                            <input type="radio" checked={option === 'url'} 
                              onChange={() => handleImageOptionChange(key, 'url')} />
                            URL
                          </label>
                        </div>
                        {option === 'upload' ? (
                          <input type="file" accept="image/*"
                            onChange={(e) => handleArrayImageUpload(setAboutData, 'leadership', index, 'image', e.target.files[0])}
                            className="sys-settings-file-input" />
                        ) : (
                          <input type="text" value={leader.image || ''} placeholder="https://example.com/leader.jpg"
                            onChange={(e) => handleArrayChange(setAboutData, 'leadership', index, 'image', e.target.value)}
                            className="sys-settings-input" />
                        )}
                        {leader.image && <img src={leader.image} alt={leader.alt || ''} className="sys-settings-preview-img" />}
                        
                        <label className="sys-settings-label">Alt Text</label>
                        <input type="text" value={leader.alt || ''} placeholder="Ảnh lãnh đạo"
                          onChange={(e) => handleArrayChange(setAboutData, 'leadership', index, 'alt', e.target.value)}
                          className="sys-settings-input" />
                        
                        <button type="button" onClick={() => removeArrayItem(setAboutData, 'leadership', index)}
                          className="sys-settings-btn sys-settings-btn-danger" style={{ marginTop: '12px' }}>
                          <FaTrash /> Xóa
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <button onClick={() => saveData('about', aboutData, 'Lưu Đội ngũ điều hành thành công!')}
              className="sys-settings-btn sys-settings-btn-primary sys-settings-section-save">
              <FaSave /> Lưu Đội ngũ điều hành
            </button>
          </section>

          {/* 7. Giải thưởng & Chứng nhận */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('about', 'achievements')}>
              <h3 className="sys-settings-section-title">7. Giải thưởng & Chứng nhận</h3>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button type="button" onClick={(e) => { e.stopPropagation(); 
                  addArrayItem(setAboutData, 'achievements', { icon: 'FaTrophy', title: '', year: '' }); }}
                  className="sys-settings-btn sys-settings-btn-primary" style={{ fontSize: '0.8rem', padding: '5px 10px' }}>
                  <FaPlus /> Thêm
                </button>
                {openSections.about.achievements ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.about.achievements && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  {(aboutData.achievements || []).map((achievement, index) => (
                    <div key={index} className="sys-settings-card">
                      <label className="sys-settings-label">Icon</label>
                      <CustomIconPicker value={achievement.icon || ''} 
                        onChange={(icon) => handleArrayChange(setAboutData, 'achievements', index, 'icon', icon)} />
                      
                      <label className="sys-settings-label">Tiêu đề</label>
                      <input type="text" value={achievement.title || ''} placeholder="Top 10 Phòng khám xuất sắc"
                        onChange={(e) => handleArrayChange(setAboutData, 'achievements', index, 'title', e.target.value)}
                        className="sys-settings-input" />
                      
                      <label className="sys-settings-label">Năm</label>
                      <input type="text" value={achievement.year || ''} placeholder="2023"
                        onChange={(e) => handleArrayChange(setAboutData, 'achievements', index, 'year', e.target.value)}
                        className="sys-settings-input" />
                      
                      <button type="button" onClick={() => removeArrayItem(setAboutData, 'achievements', index)}
                        className="sys-settings-btn sys-settings-btn-danger" style={{ marginTop: '12px' }}>
                        <FaTrash /> Xóa
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button onClick={() => saveData('about', aboutData, 'Lưu Giải thưởng thành công!')}
              className="sys-settings-btn sys-settings-btn-primary sys-settings-section-save">
              <FaSave /> Lưu Giải thưởng
            </button>
          </section>

          {/* 8. Trang thiết bị hiện đại */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('about', 'facilities')}>
              <h3 className="sys-settings-section-title">8. Trang thiết bị hiện đại</h3>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button type="button" onClick={(e) => { e.stopPropagation(); 
                  addArrayItem(setAboutData, 'facilities', { icon: 'FaBuilding', title: '', description: '' }); }}
                  className="sys-settings-btn sys-settings-btn-primary" style={{ fontSize: '0.8rem', padding: '5px 10px' }}>
                  <FaPlus /> Thêm
                </button>
                {openSections.about.facilities ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.about.facilities && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  {(aboutData.facilities || []).map((facility, index) => (
                    <div key={index} className="sys-settings-card">
                      <label className="sys-settings-label">Icon</label>
                      <CustomIconPicker value={facility.icon || ''} 
                        onChange={(icon) => handleArrayChange(setAboutData, 'facilities', index, 'icon', icon)} />
                      
                      <label className="sys-settings-label">Tiêu đề</label>
                      <input type="text" value={facility.title || ''} placeholder="Phòng khám hiện đại"
                        onChange={(e) => handleArrayChange(setAboutData, 'facilities', index, 'title', e.target.value)}
                        className="sys-settings-input" />
                      
                      <label className="sys-settings-label">Mô tả</label>
                      <textarea value={facility.description || ''} placeholder="Trang bị đầy đủ..."
                        onChange={(e) => handleArrayChange(setAboutData, 'facilities', index, 'description', e.target.value)}
                        className="sys-settings-textarea" />
                      
                      <button type="button" onClick={() => removeArrayItem(setAboutData, 'facilities', index)}
                        className="sys-settings-btn sys-settings-btn-danger" style={{ marginTop: '12px' }}>
                        <FaTrash /> Xóa
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button onClick={() => saveData('about', aboutData, 'Lưu Trang thiết bị thành công!')}
              className="sys-settings-btn sys-settings-btn-primary sys-settings-section-save">
              <FaSave /> Lưu Trang thiết bị
            </button>
          </section>
        </TabPanel>

        {/* ==================== TAB FACILITIES ==================== */}
        <TabPanel className="sys-settings-tab-panel">
          {/* 1. Banner */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('facilities', 'banner')}>
              <h3 className="sys-settings-section-title">1. Banner</h3>
              {openSections.facilities.banner ? <FaChevronUp /> : <FaChevronDown />}
            </div>
            {openSections.facilities.banner && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  <div className="sys-settings-card">
                    <label className="sys-settings-label">Hình ảnh</label>
                    <div className="sys-settings-image-options">
                      <label>
                        <input type="radio" checked={(imageOptions['facilities-banner'] || 'upload') === 'upload'} 
                          onChange={() => handleImageOptionChange('facilities-banner', 'upload')} />
                        Upload
                      </label>
                      <label>
                        <input type="radio" checked={(imageOptions['facilities-banner'] || 'upload') === 'url'} 
                          onChange={() => handleImageOptionChange('facilities-banner', 'url')} />
                        URL
                      </label>
                    </div>
                    {(imageOptions['facilities-banner'] || 'upload') === 'upload' ? (
                      <input type="file" accept="image/*"
                        onChange={(e) => handleSingleImageUpload(setFacilitiesData, 'banner.image', e.target.files[0])}
                        className="sys-settings-file-input" />
                    ) : (
                      <input type="text" value={facilitiesData.banner?.image || ''} placeholder="https://example.com/banner.jpg"
                        onChange={(e) => setFacilitiesData(prev => ({ ...prev, banner: { ...prev.banner, image: e.target.value }}))}
                        className="sys-settings-input" />
                    )}
                    {facilitiesData.banner?.image && <img src={facilitiesData.banner.image} alt="" className="sys-settings-preview-img" />}
                    
                    <label className="sys-settings-label">Alt Text</label>
                    <input type="text" value={facilitiesData.banner?.alt || ''} placeholder="Banner cơ sở vật chất"
                      onChange={(e) => setFacilitiesData(prev => ({ ...prev, banner: { ...prev.banner, alt: e.target.value }}))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Tiêu đề</label>
                    <input type="text" value={facilitiesData.banner?.title || ''} placeholder="Cơ sở vật chất"
                      onChange={(e) => setFacilitiesData(prev => ({ ...prev, banner: { ...prev.banner, title: e.target.value }}))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Phụ đề</label>
                    <input type="text" value={facilitiesData.banner?.subtitle || ''} placeholder="Không gian hiện đại..."
                      onChange={(e) => setFacilitiesData(prev => ({ ...prev, banner: { ...prev.banner, subtitle: e.target.value }}))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Mô tả</label>
                    <textarea value={facilitiesData.banner?.description || ''} placeholder="Được thiết kế để mang lại..."
                      onChange={(e) => setFacilitiesData(prev => ({ ...prev, banner: { ...prev.banner, description: e.target.value }}))}
                      className="sys-settings-textarea" />
                  </div>
                </div>
              </div>
            )}
            <button onClick={() => saveData('facilities', facilitiesData, 'Lưu Banner thành công!')}
              className="sys-settings-btn sys-settings-btn-primary sys-settings-section-save">
              <FaSave /> Lưu Banner
            </button>
          </section>

          {/* 2. Tiện ích */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('facilities', 'amenities')}>
              <h3 className="sys-settings-section-title">2. Tiện ích</h3>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button type="button" onClick={(e) => { e.stopPropagation(); 
                  addArrayItem(setFacilitiesData, 'amenities', { icon: 'FaWifi', name: '' }); }}
                  className="sys-settings-btn sys-settings-btn-primary" style={{ fontSize: '0.8rem', padding: '5px 10px' }}>
                  <FaPlus /> Thêm
                </button>
                {openSections.facilities.amenities ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.facilities.amenities && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  {(facilitiesData.amenities || []).map((amenity, index) => (
                    <div key={index} className="sys-settings-card">
                      <label className="sys-settings-label">Icon</label>
                      <CustomIconPicker value={amenity.icon || ''} 
                        onChange={(icon) => handleArrayChange(setFacilitiesData, 'amenities', index, 'icon', icon)} />
                      
                      <label className="sys-settings-label">Tên tiện ích</label>
                      <input type="text" value={amenity.name || ''} placeholder="Wifi miễn phí"
                        onChange={(e) => handleArrayChange(setFacilitiesData, 'amenities', index, 'name', e.target.value)}
                        className="sys-settings-input" />
                      
                      <button type="button" onClick={() => removeArrayItem(setFacilitiesData, 'amenities', index)}
                        className="sys-settings-btn sys-settings-btn-danger" style={{ marginTop: '12px' }}>
                        <FaTrash /> Xóa
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button onClick={() => saveData('facilities', facilitiesData, 'Lưu Tiện ích thành công!')}
              className="sys-settings-btn sys-settings-btn-primary sys-settings-section-save">
              <FaSave /> Lưu Tiện ích
            </button>
          </section>

          {/* 3. Các khu vực chính */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('facilities', 'facilities')}>
              <h3 className="sys-settings-section-title">3. Các khu vực chính</h3>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button type="button" onClick={(e) => { e.stopPropagation(); 
                  addArrayItem(setFacilitiesData, 'facilities', { icon: 'FaBuilding', title: '', description: '', image: '', alt: '', features: [] }); }}
                  className="sys-settings-btn sys-settings-btn-primary" style={{ fontSize: '0.8rem', padding: '5px 10px' }}>
                  <FaPlus /> Thêm
                </button>
                {openSections.facilities.facilities ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.facilities.facilities && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  {(facilitiesData.facilities || []).map((facility, index) => {
                    const key = `facilities-facilities-${index}`;
                    const option = imageOptions[key] || 'upload';
                    return (
                      <div key={index} className="sys-settings-card">
                        <label className="sys-settings-label">Icon</label>
                        <CustomIconPicker value={facility.icon || ''} 
                          onChange={(icon) => handleArrayChange(setFacilitiesData, 'facilities', index, 'icon', icon)} />
                        
                        <label className="sys-settings-label">Tiêu đề</label>
                        <input type="text" value={facility.title || ''} placeholder="Phòng khám"
                          onChange={(e) => handleArrayChange(setFacilitiesData, 'facilities', index, 'title', e.target.value)}
                          className="sys-settings-input" />
                        
                        <label className="sys-settings-label">Mô tả</label>
                        <textarea value={facility.description || ''} placeholder="Phòng khám được thiết kế..."
                          onChange={(e) => handleArrayChange(setFacilitiesData, 'facilities', index, 'description', e.target.value)}
                          className="sys-settings-textarea" />
                        
                        <label className="sys-settings-label">Hình ảnh</label>
                        <div className="sys-settings-image-options">
                          <label>
                            <input type="radio" checked={option === 'upload'} 
                              onChange={() => handleImageOptionChange(key, 'upload')} />
                            Upload
                          </label>
                          <label>
                            <input type="radio" checked={option === 'url'} 
                              onChange={() => handleImageOptionChange(key, 'url')} />
                            URL
                          </label>
                        </div>
                        {option === 'upload' ? (
                          <input type="file" accept="image/*"
                            onChange={(e) => handleArrayImageUpload(setFacilitiesData, 'facilities', index, 'image', e.target.files[0])}
                            className="sys-settings-file-input" />
                        ) : (
                          <input type="text" value={facility.image || ''} placeholder="https://example.com/facility.jpg"
                            onChange={(e) => handleArrayChange(setFacilitiesData, 'facilities', index, 'image', e.target.value)}
                            className="sys-settings-input" />
                        )}
                        {facility.image && <img src={facility.image} alt={facility.alt || ''} className="sys-settings-preview-img" />}
                        
                        <label className="sys-settings-label">Alt Text</label>
                        <input type="text" value={facility.alt || ''} placeholder="Ảnh phòng khám"
                          onChange={(e) => handleArrayChange(setFacilitiesData, 'facilities', index, 'alt', e.target.value)}
                          className="sys-settings-input" />
                        
                        <label className="sys-settings-label">Tính năng (mỗi dòng 1 tính năng)</label>
                        <textarea value={(facility.features || []).join('\n')} placeholder="Trang bị đầy đủ..."
                          onChange={(e) => handleArrayChange(setFacilitiesData, 'facilities', index, 'features', e.target.value.split('\n').filter(f => f.trim()))}
                          className="sys-settings-textarea" />
                        
                        <button type="button" onClick={() => removeArrayItem(setFacilitiesData, 'facilities', index)}
                          className="sys-settings-btn sys-settings-btn-danger" style={{ marginTop: '12px' }}>
                          <FaTrash /> Xóa
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <button onClick={() => saveData('facilities', facilitiesData, 'Lưu Khu vực thành công!')}
              className="sys-settings-btn sys-settings-btn-primary sys-settings-section-save">
              <FaSave /> Lưu Khu vực
            </button>
          </section>

          {/* 4. Thư viện hình ảnh */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('facilities', 'gallery')}>
              <h3 className="sys-settings-section-title">4. Thư viện hình ảnh</h3>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button type="button" onClick={(e) => { e.stopPropagation(); 
                  addArrayItem(setFacilitiesData, 'gallery', { url: '', title: '', alt: '' }); }}
                  className="sys-settings-btn sys-settings-btn-primary" style={{ fontSize: '0.8rem', padding: '5px 10px' }}>
                  <FaPlus /> Thêm
                </button>
                {openSections.facilities.gallery ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.facilities.gallery && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  {(facilitiesData.gallery || []).map((item, index) => {
                    const key = `facilities-gallery-${index}`;
                    const option = imageOptions[key] || 'upload';
                    return (
                      <div key={index} className="sys-settings-card">
                        <label className="sys-settings-label">Hình ảnh</label>
                        <div className="sys-settings-image-options">
                          <label>
                            <input type="radio" checked={option === 'upload'} 
                              onChange={() => handleImageOptionChange(key, 'upload')} />
                            Upload
                          </label>
                          <label>
                            <input type="radio" checked={option === 'url'} 
                              onChange={() => handleImageOptionChange(key, 'url')} />
                            URL
                          </label>
                        </div>
                        {option === 'upload' ? (
                          <input type="file" accept="image/*"
                            onChange={(e) => handleArrayImageUpload(setFacilitiesData, 'gallery', index, 'url', e.target.files[0])}
                            className="sys-settings-file-input" />
                        ) : (
                          <input type="text" value={item.url || ''} placeholder="https://example.com/gallery.jpg"
                            onChange={(e) => handleArrayChange(setFacilitiesData, 'gallery', index, 'url', e.target.value)}
                            className="sys-settings-input" />
                        )}
                        {item.url && <img src={item.url} alt={item.alt || ''} className="sys-settings-preview-img" />}
                        
                        <label className="sys-settings-label">Tiêu đề ảnh</label>
                        <input type="text" value={item.title || ''} placeholder="Phòng chờ"
                          onChange={(e) => handleArrayChange(setFacilitiesData, 'gallery', index, 'title', e.target.value)}
                          className="sys-settings-input" />
                        
                        <label className="sys-settings-label">Alt Text</label>
                        <input type="text" value={item.alt || ''} placeholder="Hình ảnh phòng chờ"
                          onChange={(e) => handleArrayChange(setFacilitiesData, 'gallery', index, 'alt', e.target.value)}
                          className="sys-settings-input" />
                        
                        <button type="button" onClick={() => removeArrayItem(setFacilitiesData, 'gallery', index)}
                          className="sys-settings-btn sys-settings-btn-danger" style={{ marginTop: '12px' }}>
                          <FaTrash /> Xóa
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <button onClick={() => saveData('facilities', facilitiesData, 'Lưu Thư viện thành công!')}
              className="sys-settings-btn sys-settings-btn-primary sys-settings-section-save">
              <FaSave /> Lưu Thư viện
            </button>
          </section>

          {/* 5. Thống kê */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('facilities', 'stats')}>
              <h3 className="sys-settings-section-title">5. Thống kê</h3>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button type="button" onClick={(e) => { e.stopPropagation(); 
                  addArrayItem(setFacilitiesData, 'stats', { number: '', label: '' }); }}
                  className="sys-settings-btn sys-settings-btn-primary" style={{ fontSize: '0.8rem', padding: '5px 10px' }}>
                  <FaPlus /> Thêm
                </button>
                {openSections.facilities.stats ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.facilities.stats && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  {(facilitiesData.stats || []).map((stat, index) => (
                    <div key={index} className="sys-settings-card">
                      <label className="sys-settings-label">Số liệu</label>
                      <input type="text" value={stat.number || ''} placeholder="2000m²"
                        onChange={(e) => handleArrayChange(setFacilitiesData, 'stats', index, 'number', e.target.value)}
                        className="sys-settings-input" />
                      
                      <label className="sys-settings-label">Nhãn</label>
                      <input type="text" value={stat.label || ''} placeholder="Diện tích"
                        onChange={(e) => handleArrayChange(setFacilitiesData, 'stats', index, 'label', e.target.value)}
                        className="sys-settings-input" />
                      
                      <button type="button" onClick={() => removeArrayItem(setFacilitiesData, 'stats', index)}
                        className="sys-settings-btn sys-settings-btn-danger" style={{ marginTop: '12px' }}>
                        <FaTrash /> Xóa
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button onClick={() => saveData('facilities', facilitiesData, 'Lưu Thống kê thành công!')}
              className="sys-settings-btn sys-settings-btn-primary sys-settings-section-save">
              <FaSave /> Lưu Thống kê
            </button>
          </section>
        </TabPanel>

        {/* ==================== TAB EQUIPMENT ==================== */}
        <TabPanel className="sys-settings-tab-panel">
          {/* 1. Banner */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('equipment', 'banner')}>
              <h3 className="sys-settings-section-title">1. Banner</h3>
              {openSections.equipment.banner ? <FaChevronUp /> : <FaChevronDown />}
            </div>
            {openSections.equipment.banner && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  <div className="sys-settings-card">
                    <label className="sys-settings-label">Hình ảnh</label>
                    <div className="sys-settings-image-options">
                      <label>
                        <input type="radio" checked={(imageOptions['equipment-banner'] || 'upload') === 'upload'} 
                          onChange={() => handleImageOptionChange('equipment-banner', 'upload')} />
                        Upload
                      </label>
                      <label>
                        <input type="radio" checked={(imageOptions['equipment-banner'] || 'upload') === 'url'} 
                          onChange={() => handleImageOptionChange('equipment-banner', 'url')} />
                        URL
                      </label>
                    </div>
                    {(imageOptions['equipment-banner'] || 'upload') === 'upload' ? (
                      <input type="file" accept="image/*"
                        onChange={(e) => handleSingleImageUpload(setEquipmentData, 'banner.image', e.target.files[0])}
                        className="sys-settings-file-input" />
                    ) : (
                      <input type="text" value={equipmentData.banner?.image || ''} placeholder="https://example.com/banner.jpg"
                        onChange={(e) => setEquipmentData(prev => ({ ...prev, banner: { ...prev.banner, image: e.target.value }}))}
                        className="sys-settings-input" />
                    )}
                    {equipmentData.banner?.image && <img src={equipmentData.banner.image} alt="" className="sys-settings-preview-img" />}
                    
                    <label className="sys-settings-label">Alt Text</label>
                    <input type="text" value={equipmentData.banner?.alt || ''} placeholder="Banner trang thiết bị"
                      onChange={(e) => setEquipmentData(prev => ({ ...prev, banner: { ...prev.banner, alt: e.target.value }}))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Tiêu đề</label>
                    <input type="text" value={equipmentData.banner?.title || ''} placeholder="Trang thiết bị y tế"
                      onChange={(e) => setEquipmentData(prev => ({ ...prev, banner: { ...prev.banner, title: e.target.value }}))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Phụ đề</label>
                    <input type="text" value={equipmentData.banner?.subtitle || ''} placeholder="Đầu tư trang thiết bị hiện đại..."
                      onChange={(e) => setEquipmentData(prev => ({ ...prev, banner: { ...prev.banner, subtitle: e.target.value }}))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Mô tả</label>
                    <textarea value={equipmentData.banner?.description || ''} placeholder="Từ các thương hiệu hàng đầu..."
                      onChange={(e) => setEquipmentData(prev => ({ ...prev, banner: { ...prev.banner, description: e.target.value }}))}
                      className="sys-settings-textarea" />
                  </div>
                </div>
              </div>
            )}
            <button onClick={() => saveData('equipment', equipmentData, 'Lưu Banner thành công!')}
              className="sys-settings-btn sys-settings-btn-primary sys-settings-section-save">
              <FaSave /> Lưu Banner
            </button>
          </section>

          {/* 2. Thống kê */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('equipment', 'stats')}>
              <h3 className="sys-settings-section-title">2. Thống kê</h3>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button type="button" onClick={(e) => { e.stopPropagation(); 
                  addArrayItem(setEquipmentData, 'stats', { number: '', label: '' }); }}
                  className="sys-settings-btn sys-settings-btn-primary" style={{ fontSize: '0.8rem', padding: '5px 10px' }}>
                  <FaPlus /> Thêm
                </button>
                {openSections.equipment.stats ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.equipment.stats && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  {(equipmentData.stats || []).map((stat, index) => (
                    <div key={index} className="sys-settings-card">
                      <label className="sys-settings-label">Số liệu</label>
                      <input type="text" value={stat.number || ''} placeholder="50+"
                        onChange={(e) => handleArrayChange(setEquipmentData, 'stats', index, 'number', e.target.value)}
                        className="sys-settings-input" />
                      
                      <label className="sys-settings-label">Nhãn</label>
                      <input type="text" value={stat.label || ''} placeholder="Thiết bị hiện đại"
                        onChange={(e) => handleArrayChange(setEquipmentData, 'stats', index, 'label', e.target.value)}
                        className="sys-settings-input" />
                      
                      <button type="button" onClick={() => removeArrayItem(setEquipmentData, 'stats', index)}
                        className="sys-settings-btn sys-settings-btn-danger" style={{ marginTop: '12px' }}>
                        <FaTrash /> Xóa
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button onClick={() => saveData('equipment', equipmentData, 'Lưu Thống kê thành công!')}
              className="sys-settings-btn sys-settings-btn-primary sys-settings-section-save">
              <FaSave /> Lưu Thống kê
            </button>
          </section>

          {/* 3. Danh mục thiết bị */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('equipment', 'categories')}>
              <h3 className="sys-settings-section-title">3. Danh mục thiết bị</h3>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button type="button" onClick={(e) => { e.stopPropagation(); 
                  addArrayItem(setEquipmentData, 'categories', { id: '', name: '', icon: 'FaStethoscope' }); }}
                  className="sys-settings-btn sys-settings-btn-primary" style={{ fontSize: '0.8rem', padding: '5px 10px' }}>
                  <FaPlus /> Thêm
                </button>
                {openSections.equipment.categories ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.equipment.categories && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  {(equipmentData.categories || []).map((category, index) => (
                    <div key={index} className="sys-settings-card">
                      <label className="sys-settings-label">ID danh mục</label>
                      <input type="text" value={category.id || ''} placeholder="diagnostic"
                        onChange={(e) => handleArrayChange(setEquipmentData, 'categories', index, 'id', e.target.value)}
                        className="sys-settings-input" />
                      
                      <label className="sys-settings-label">Tên danh mục</label>
                      <input type="text" value={category.name || ''} placeholder="Thiết bị chẩn đoán"
                        onChange={(e) => handleArrayChange(setEquipmentData, 'categories', index, 'name', e.target.value)}
                        className="sys-settings-input" />
                      
                      <label className="sys-settings-label">Icon</label>
                      <CustomIconPicker value={category.icon || ''} 
                        onChange={(icon) => handleArrayChange(setEquipmentData, 'categories', index, 'icon', icon)} />
                      
                      <button type="button" onClick={() => removeArrayItem(setEquipmentData, 'categories', index)}
                        className="sys-settings-btn sys-settings-btn-danger" style={{ marginTop: '12px' }}>
                        <FaTrash /> Xóa
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button onClick={() => saveData('equipment', equipmentData, 'Lưu Danh mục thành công!')}
              className="sys-settings-btn sys-settings-btn-primary sys-settings-section-save">
              <FaSave /> Lưu Danh mục
            </button>
          </section>

          {/* 4. Danh sách thiết bị */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('equipment', 'equipment')}>
              <h3 className="sys-settings-section-title">4. Danh sách thiết bị</h3>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button type="button" onClick={(e) => { e.stopPropagation(); 
                  addArrayItem(setEquipmentData, 'equipment', { 
                    name: '', category: '', brand: '', origin: '', year: '', 
                    image: '', alt: '', features: [], applications: [] 
                  }); }}
                  className="sys-settings-btn sys-settings-btn-primary" style={{ fontSize: '0.8rem', padding: '5px 10px' }}>
                  <FaPlus /> Thêm
                </button>
                {openSections.equipment.equipment ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.equipment.equipment && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  {(equipmentData.equipment || []).map((item, index) => {
                    const key = `equipment-equipment-${index}`;
                    const option = imageOptions[key] || 'upload';
                    return (
                      <div key={index} className="sys-settings-card">
                        <label className="sys-settings-label">Tên thiết bị</label>
                        <input type="text" value={item.name || ''} placeholder="Máy MRI 3.0 Tesla"
                          onChange={(e) => handleArrayChange(setEquipmentData, 'equipment', index, 'name', e.target.value)}
                          className="sys-settings-input" />
                        
                        <label className="sys-settings-label">Danh mục</label>
                        <select value={item.category || ''} 
                          onChange={(e) => handleArrayChange(setEquipmentData, 'equipment', index, 'category', e.target.value)}
                          className="sys-settings-input">
                          <option value="">-- Chọn danh mục --</option>
                          {(equipmentData.categories || []).map((cat, catIndex) => (
                            <option key={catIndex} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                        
                        <label className="sys-settings-label">Hãng</label>
                        <input type="text" value={item.brand || ''} placeholder="Siemens"
                          onChange={(e) => handleArrayChange(setEquipmentData, 'equipment', index, 'brand', e.target.value)}
                          className="sys-settings-input" />
                        
                        <label className="sys-settings-label">Xuất xứ</label>
                        <input type="text" value={item.origin || ''} placeholder="Đức"
                          onChange={(e) => handleArrayChange(setEquipmentData, 'equipment', index, 'origin', e.target.value)}
                          className="sys-settings-input" />
                        
                        <label className="sys-settings-label">Năm</label>
                        <input type="text" value={item.year || ''} placeholder="2023"
                          onChange={(e) => handleArrayChange(setEquipmentData, 'equipment', index, 'year', e.target.value)}
                          className="sys-settings-input" />
                        
                        <label className="sys-settings-label">Hình ảnh</label>
                        <div className="sys-settings-image-options">
                          <label>
                            <input type="radio" checked={option === 'upload'} 
                              onChange={() => handleImageOptionChange(key, 'upload')} />
                            Upload
                          </label>
                          <label>
                            <input type="radio" checked={option === 'url'} 
                              onChange={() => handleImageOptionChange(key, 'url')} />
                            URL
                          </label>
                        </div>
                        {option === 'upload' ? (
                          <input type="file" accept="image/*"
                            onChange={(e) => handleArrayImageUpload(setEquipmentData, 'equipment', index, 'image', e.target.files[0])}
                            className="sys-settings-file-input" />
                        ) : (
                          <input type="text" value={item.image || ''} placeholder="https://example.com/equipment.jpg"
                            onChange={(e) => handleArrayChange(setEquipmentData, 'equipment', index, 'image', e.target.value)}
                            className="sys-settings-input" />
                        )}
                        {item.image && <img src={item.image} alt={item.alt || ''} className="sys-settings-preview-img" />}
                        
                        <label className="sys-settings-label">Alt Text</label>
                        <input type="text" value={item.alt || ''} placeholder="Ảnh thiết bị"
                          onChange={(e) => handleArrayChange(setEquipmentData, 'equipment', index, 'alt', e.target.value)}
                          className="sys-settings-input" />
                        
                        <label className="sys-settings-label">Tính năng (mỗi dòng 1 tính năng)</label>
                        <textarea value={(item.features || []).join('\n')} placeholder="Độ phân giải cao..."
                          onChange={(e) => handleArrayChange(setEquipmentData, 'equipment', index, 'features', e.target.value.split('\n').filter(f => f.trim()))}
                          className="sys-settings-textarea" />
                        
                        <label className="sys-settings-label">Ứng dụng (mỗi dòng 1 ứng dụng)</label>
                        <textarea value={(item.applications || []).join('\n')} placeholder="Chẩn đoán ung thư..."
                          onChange={(e) => handleArrayChange(setEquipmentData, 'equipment', index, 'applications', e.target.value.split('\n').filter(a => a.trim()))}
                          className="sys-settings-textarea" />
                        
                        <button type="button" onClick={() => removeArrayItem(setEquipmentData, 'equipment', index)}
                          className="sys-settings-btn sys-settings-btn-danger" style={{ marginTop: '12px' }}>
                          <FaTrash /> Xóa
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <button onClick={() => saveData('equipment', equipmentData, 'Lưu Danh sách thiết bị thành công!')}
              className="sys-settings-btn sys-settings-btn-primary sys-settings-section-save">
              <FaSave /> Lưu Danh sách thiết bị
            </button>
          </section>

          {/* 5. Cam kết chất lượng */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('equipment', 'quality')}>
              <h3 className="sys-settings-section-title">5. Cam kết chất lượng</h3>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button type="button" onClick={(e) => { e.stopPropagation(); 
                  addArrayItem(setEquipmentData, 'quality', { title: '', description: '' }); }}
                  className="sys-settings-btn sys-settings-btn-primary" style={{ fontSize: '0.8rem', padding: '5px 10px' }}>
                  <FaPlus /> Thêm
                </button>
                {openSections.equipment.quality ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.equipment.quality && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  {(equipmentData.quality || []).map((item, index) => (
                    <div key={index} className="sys-settings-card">
                      <label className="sys-settings-label">Tiêu đề</label>
                      <input type="text" value={item.title || ''} placeholder="Nhập khẩu chính hãng"
                        onChange={(e) => handleArrayChange(setEquipmentData, 'quality', index, 'title', e.target.value)}
                        className="sys-settings-input" />
                      
                      <label className="sys-settings-label">Mô tả</label>
                      <textarea value={item.description || ''} placeholder="100% thiết bị nhập khẩu..."
                        onChange={(e) => handleArrayChange(setEquipmentData, 'quality', index, 'description', e.target.value)}
                        className="sys-settings-textarea" />
                      
                      <button type="button" onClick={() => removeArrayItem(setEquipmentData, 'quality', index)}
                        className="sys-settings-btn sys-settings-btn-danger" style={{ marginTop: '12px' }}>
                        <FaTrash /> Xóa
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button onClick={() => saveData('equipment', equipmentData, 'Lưu Cam kết thành công!')}
              className="sys-settings-btn sys-settings-btn-primary sys-settings-section-save">
              <FaSave /> Lưu Cam kết chất lượng
            </button>
          </section>
        </TabPanel>
      </Tabs>
    </div>
  );
};

export default SystemSettingsPage;