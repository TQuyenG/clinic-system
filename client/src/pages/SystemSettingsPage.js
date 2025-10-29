/* 
 * Tệp: SystemSettingsPage.js - PHẦN 1: SETUP & TAB HOME
 * Mô tả: Import, setup, Toast, IconPicker, và toàn bộ TAB HOME đầy đủ
 * 
 * Cập nhật: 
 * - Loại bỏ header dính cứng (không còn top: 60px, sidebar bắt đầu từ top: 0).
 * - Di chuyển sidebar sang bên phải màn hình (right: 0 thay vì left: 0).
 * - Sidebar thu gọn khi không hover (width: var(--sidebar-width-closed)), mở rộng khi hover (width: var(--sidebar-width-open)).
 * - Sidebar chỉ chứa: Header (title và icon), Actions (Lưu tất cả và Export), và TabList (các tab xếp dọc).
 * - Các TabPanel (nội dung chính của từng tab) được di chuyển ra ngoài sidebar, vào phần main-content để tránh bị ẩn khi sidebar thu gọn.
 * - Container điều chỉnh padding-right để chừa chỗ cho sidebar thu gọn (padding: 20px 80px 40px 20px;).
 * - Sửa lỗi "bị nhầm sidebar cho hết content tab nên không hiện gì cả" bằng cách tách TabPanel ra ngoài.
 * - Sidebar hoạt động như floating panel (fixed, luôn giữ vị trí, mở rộng khi hover giống popup hoặc bong bóng chat).
 * - Không còn header dính trên cùng; tất cả nội dung nằm trong body bình thường.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import axios from 'axios';
import { 
  FaSave, FaTrash, FaPlus, FaSpinner, FaChevronDown, FaChevronUp, FaTimes,
  FaDownload, FaFileExcel, FaFileWord, FaFileCsv, FaCheckCircle, FaExclamationCircle,
  FaHome, FaInfoCircle, FaBuilding, FaTools, FaCog
} from 'react-icons/fa';
import * as FaIcons from 'react-icons/fa';
import * as MdIcons from 'react-icons/md';
import * as FiIcons from 'react-icons/fi';
import * as XLSX from 'xlsx';
import 'react-tabs/style/react-tabs.css';
import './SystemSettingsPage.css';

const API_BASE_URL = 'http://localhost:3002/api';

// ==================== DANH SÁCH ICON ====================
const iconList = [
  ...Object.keys(FaIcons).filter(icon => icon.startsWith('Fa')).map(icon => ({ name: icon, library: 'fa' })),
  ...Object.keys(MdIcons).filter(icon => icon.startsWith('Md')).map(icon => ({ name: icon, library: 'md' })),
  ...Object.keys(FiIcons).filter(icon => icon.startsWith('Fi')).map(icon => ({ name: icon, library: 'fi' })),
].slice(0, 200);

const iconMap = { ...FaIcons, ...MdIcons, ...FiIcons };

// ==================== COMPONENT TOAST NOTIFICATION ====================
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`sys-settings-toast sys-settings-toast-${type}`}>
      {type === 'success' ? <FaCheckCircle /> : <FaExclamationCircle />}
      <span>{message}</span>
      <button onClick={onClose} className="sys-settings-toast-close">
        <FaTimes />
      </button>
    </div>
  );
};

// ==================== COMPONENT ICON PICKER ====================
const CustomIconPicker = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const pickerRef = useRef(null);

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

// ==================== MAIN COMPONENT ====================
const SystemSettingsPage = () => {
  // Default data structures (giữ nguyên như cũ)
  const defaultHomeData = {
    bannerSlides: [],
    features: [],
    aboutSection: { 
      image: '', alt: '', title: '', yearsExperience: '', highlights: [],
      buttonText: 'Xem thêm', buttonLink: '/about'
    },
    testimonials: [],
    bookingSection: {
      title: 'Đặt lịch khám bệnh', description: '', features: [],
      hotline: '1900 xxxx', email: 'contact@clinic.com', address: '123 Đường ABC, TP.HCM'
    }
  };

  const defaultAboutData = {
    banner: { image: '', alt: '', title: '', subtitle: '', description: '' },
    mission: { image: '', alt: '', icon: 'FaLeaf', title: '', description: '' },
    vision: { image: '', alt: '', icon: 'FaHeartbeat', title: '', description: '' },
    milestones: [], stats: [], values: [], leadership: [], achievements: [], facilities: []
  };

  const defaultFacilitiesData = {
    banner: { image: '', alt: '', title: '', subtitle: '', description: '' },
    amenities: [], facilities: [], gallery: [], stats: []
  };

  const defaultEquipmentData = {
    banner: { image: '', alt: '', title: '', subtitle: '', description: '' },
    stats: [], categories: [], equipment: [], quality: []
  };

  // State (giữ nguyên như cũ)
  const [homeData, setHomeData] = useState(defaultHomeData);
  const [aboutData, setAboutData] = useState(defaultAboutData);
  const [facilitiesData, setFacilitiesData] = useState(defaultFacilitiesData);
  const [equipmentData, setEquipmentData] = useState(defaultEquipmentData);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [openSections, setOpenSections] = useState({
    home: { bannerSlides: true, features: true, aboutSection: true, testimonials: true, bookingSection: true },
    about: { banner: true, mission: true, milestones: true, stats: true, values: true, leadership: true, achievements: true, facilities: true },
    facilities: { banner: true, amenities: true, facilities: true, gallery: true, stats: true },
    equipment: { banner: true, stats: true, categories: true, equipment: true, quality: true }
  });
  const [imageOptions, setImageOptions] = useState({});

  // ==================== TOAST MANAGEMENT ==================== (giữ nguyên)
  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // ==================== TOGGLE SECTION ==================== (giữ nguyên)
  const toggleSection = (tab, section) => {
    setOpenSections(prev => ({
      ...prev,
      [tab]: { ...prev[tab], [section]: !prev[tab][section] }
    }));
  };

  // ==================== FETCH DATA ==================== (giữ nguyên)
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
        addToast('Tải dữ liệu thành công!', 'success');
      } catch (err) {
        addToast('Lỗi khi tải dữ liệu: ' + err.message, 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ==================== ARRAY HANDLERS ==================== (giữ nguyên)
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

  // ==================== IMAGE UPLOAD ==================== (giữ nguyên)
  const handleArrayImageUpload = async (setter, arrayKey, index, field, file) => {
    if (!file) return;
    const token = localStorage.getItem('token');
    if (!token) {
      addToast('Vui lòng đăng nhập lại để upload ảnh.', 'error');
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
      
      const imageUrl = response.data.url;
      handleArrayChange(setter, arrayKey, index, field, imageUrl);
      addToast('Upload ảnh thành công!', 'success');
    } catch (err) {
      addToast('Lỗi upload ảnh: ' + (err.response?.data?.message || err.message), 'error');
    }
  };

  const handleSingleImageUpload = async (setter, path, file) => {
    if (!file) return;
    const token = localStorage.getItem('token');
    if (!token) {
      addToast('Vui lòng đăng nhập lại để upload ảnh.', 'error');
      return;
    }

    const keys = path.split('.');
    let oldImageUrl = null;
    if (keys.length === 2) {
      const parentKey = keys[0];
      const childKey = keys[1];
      if (setter === setHomeData) {
        oldImageUrl = homeData[parentKey]?.[childKey];
      } else if (setter === setAboutData) {
        oldImageUrl = aboutData[parentKey]?.[childKey];
      } else if (setter === setFacilitiesData) {
        oldImageUrl = facilitiesData[parentKey]?.[childKey];
      } else if (setter === setEquipmentData) {
        oldImageUrl = equipmentData[parentKey]?.[childKey];
      }
    }

    const formData = new FormData();
    formData.append('image', file);
    
    if (oldImageUrl && oldImageUrl.startsWith('/uploads/')) {
      formData.append('oldImage', oldImageUrl);
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/upload/image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });
      
      const imageUrl = response.data.url;
      
      setter(prev => {
        const newData = { ...prev };
        let current = newData;
        
        for (let i = 0; i < keys.length - 1; i++) {
          current[keys[i]] = { ...current[keys[i]] };
          current = current[keys[i]];
        }
        
        current[keys[keys.length - 1]] = imageUrl;
        return newData;
      });
      
      addToast('Upload ảnh thành công!', 'success');
    } catch (err) {
      addToast('Lỗi upload ảnh: ' + (err.response?.data?.message || err.message), 'error');
    }
  };

  const handleImageOptionChange = (key, option) => {
    setImageOptions(prev => ({ ...prev, [key]: option }));
  };

  // ==================== SAVE DATA ==================== (giữ nguyên)
  const saveData = async (endpoint, data, successMessage) => {
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Vui lòng đăng nhập lại.');
      
      await axios.put(`${API_BASE_URL}/settings/${endpoint}`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      addToast(successMessage, 'success');
    } catch (err) {
      addToast('Lỗi khi lưu dữ liệu: ' + (err.response?.data?.message || err.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  // ==================== EXPORT FUNCTIONS ==================== (giữ nguyên)
  const exportToJSON = (data, filename) => {
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.json`;
    link.click();
    URL.revokeObjectURL(url);
    addToast(`Xuất ${filename}.json thành công!`, 'success');
  };

  const exportToExcel = (data, filename) => {
    try {
      const wb = XLSX.utils.book_new();
      
      const flattenData = (obj, prefix = '') => {
        let result = {};
        for (let key in obj) {
          if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            Object.assign(result, flattenData(obj[key], `${prefix}${key}.`));
          } else if (Array.isArray(obj[key])) {
            result[`${prefix}${key}`] = JSON.stringify(obj[key]);
          } else {
            result[`${prefix}${key}`] = obj[key];
          }
        }
        return result;
      };

      const flatData = [flattenData(data)];
      const ws = XLSX.utils.json_to_sheet(flatData);
      XLSX.utils.book_append_sheet(wb, ws, 'Data');
      XLSX.writeFile(wb, `${filename}.xlsx`);
      addToast(`Xuất ${filename}.xlsx thành công!`, 'success');
    } catch (err) {
      addToast('Lỗi khi xuất Excel: ' + err.message, 'error');
    }
  };

  const exportToCSV = (data, filename) => {
    try {
      const flattenData = (obj, prefix = '') => {
        let result = {};
        for (let key in obj) {
          if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            Object.assign(result, flattenData(obj[key], `${prefix}${key}.`));
          } else if (Array.isArray(obj[key])) {
            result[`${prefix}${key}`] = JSON.stringify(obj[key]);
          } else {
            result[`${prefix}${key}`] = obj[key];
          }
        }
        return result;
      };

      const flatData = flattenData(data);
      const headers = Object.keys(flatData).join(',');
      const values = Object.values(flatData).map(v => `"${v}"`).join(',');
      const csv = `${headers}\n${values}`;
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      addToast(`Xuất ${filename}.csv thành công!`, 'success');
    } catch (err) {
      addToast('Lỗi khi xuất CSV: ' + err.message, 'error');
    }
  };

  const exportAllData = (format) => {
    const allData = {
      home: homeData,
      about: aboutData,
      facilities: facilitiesData,
      equipment: equipmentData,
      exportedAt: new Date().toISOString()
    };

    const filename = `system_settings_${new Date().toISOString().split('T')[0]}`;

    switch (format) {
      case 'json':
        exportToJSON(allData, filename);
        break;
      case 'excel':
        exportToExcel(allData, filename);
        break;
      case 'csv':
        exportToCSV(allData, filename);
        break;
      default:
        addToast('Định dạng không hợp lệ!', 'error');
    }
  };

  // ==================== LOADING STATE ==================== (giữ nguyên)
  if (loading && !homeData.bannerSlides) {
    return (
      <div className="sys-settings-loading">
        <FaSpinner className="sys-settings-spinner" /> Đang tải dữ liệu...
      </div>
    );
  }

  // ==================== RENDER ====================
  // Cấu trúc mới: Tabs wrap toàn bộ, sidebar chỉ chứa TabList, Actions, Header; TabPanels ở main-content.
  return (
    <div className="sys-settings-container">
      {/* TOAST CONTAINER - fixed ở top right */}
      <div className="sys-settings-toast-container">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>

      {/* MAIN CONTENT - chứa Tabs và TabPanels */}
      <div className="sys-settings-main-content">
        <Tabs>
          {/* SIDEBAR - fixed bên phải, thu gọn/mở rộng khi hover */}
          <div className="sys-settings-sidebar">
            {/* SIDEBAR HEADER */}
            <div className="sys-settings-sidebar-header">
              <div className="sys-settings-sidebar-icon">
                <FaCog />
              </div>
              <h2 className="sys-settings-sidebar-title">Cài đặt Hệ thống</h2>
            </div>

            {/* SIDEBAR ACTIONS */}
            <div className="sys-settings-sidebar-actions">
              <button
                onClick={async () => {
                  await Promise.all([
                    saveData('home', homeData, 'Lưu trang Home thành công!'),
                    saveData('about', aboutData, 'Lưu trang About thành công!'),
                    saveData('facilities', facilitiesData, 'Lưu trang Facilities thành công!'),
                    saveData('equipment', equipmentData, 'Lưu trang Equipment thành công!')
                  ]);
                }}
                className="sys-settings-sidebar-btn sys-settings-sidebar-btn-primary"
                disabled={loading}
              >
                <FaSave />
                <span>Lưu Tất cả</span>
              </button>

              <div className="sys-settings-sidebar-export-dropdown">
                <button className="sys-settings-sidebar-btn sys-settings-sidebar-btn-secondary">
                  <FaDownload />
                  <span>Xuất dữ liệu</span>
                </button>
                <div className="sys-settings-sidebar-export-menu">
                  <button onClick={() => exportAllData('json')}>
                    <FaFileCsv /> Xuất JSON
                  </button>
                  <button onClick={() => exportAllData('excel')}>
                    <FaFileExcel /> Xuất Excel
                  </button>
                  <button onClick={() => exportAllData('csv')}>
                    <FaFileCsv /> Xuất CSV
                  </button>
                </div>
              </div>
            </div>

            {/* SIDEBAR TABS - chỉ TabList */}
            <div className="sys-settings-sidebar-tabs">
              <TabList className="sys-settings-tab-list">
                <Tab className="sys-settings-tab">
                  <span className="sys-settings-tab-icon"><FaHome /></span>
                  <span className="sys-settings-tab-text">Home</span>
                </Tab>
                <Tab className="sys-settings-tab">
                  <span className="sys-settings-tab-icon"><FaInfoCircle /></span>
                  <span className="sys-settings-tab-text">About</span>
                </Tab>
                <Tab className="sys-settings-tab">
                  <span className="sys-settings-tab-icon"><FaBuilding /></span>
                  <span className="sys-settings-tab-text">Facilities</span>
                </Tab>
                <Tab className="sys-settings-tab">
                  <span className="sys-settings-tab-icon"><FaTools /></span>
                  <span className="sys-settings-tab-text">Equipment</span>
                </Tab>
              </TabList>
            </div>
          </div>

        {/* ==================== TAB HOME - ĐẦY ĐỦ ==================== */}
        <TabPanel className="sys-settings-tab-panel">
          
          {/* SECTION 1: BANNER SLIDES */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('home', 'bannerSlides')}>
              <h3 className="sys-settings-section-title">1. Banner Slides (Tối đa 4)</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('home', homeData, 'Lưu Banner Slides thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
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
                        <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                          Slide {index + 1}
                        </h4>
                        
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
                        {slide.image && (
                          <img src={slide.image} alt={slide.alt || ''} className="sys-settings-preview-img" />
                        )}
                        
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
                          style={{ width: '100%', height: '40px', border: '2px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer' }} />
                        
                        <button type="button" onClick={() => removeArrayItem(setHomeData, 'bannerSlides', index)}
                          className="sys-settings-btn sys-settings-btn-danger" 
                          style={{ marginTop: '16px', width: '100%' }}>
                          <FaTrash /> Xóa Slide
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

           {/* SECTION 2: TÍNH NĂNG NỔI BẬT */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('home', 'features')}>
              <h3 className="sys-settings-section-title">2. Tính năng nổi bật</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('home', homeData, 'Lưu Tính năng thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                <button type="button" onClick={(e) => { 
                  e.stopPropagation(); 
                  addArrayItem(setHomeData, 'features', { 
                    icon: 'FaStethoscope', 
                    title: '', 
                    description: '', 
                    iconBgColor: '#10b981' 
                  }); 
                }}
                  className="sys-settings-btn sys-settings-btn-primary">
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
                      <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                        Tính năng {index + 1}
                      </h4>

                      <label className="sys-settings-label">Icon</label>
                      <CustomIconPicker value={feature.icon || ''} 
                        onChange={(icon) => handleArrayChange(setHomeData, 'features', index, 'icon', icon)} />
                      
                      <label className="sys-settings-label">Màu nền icon</label>
                      <input type="color" value={feature.iconBgColor || '#10b981'}
                        onChange={(e) => handleArrayChange(setHomeData, 'features', index, 'iconBgColor', e.target.value)}
                        style={{ width: '100%', height: '40px', border: '2px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer' }} />
                      
                      <label className="sys-settings-label">Tiêu đề</label>
                      <input type="text" value={feature.title || ''} placeholder="Tiêu đề tính năng"
                        onChange={(e) => handleArrayChange(setHomeData, 'features', index, 'title', e.target.value)}
                        className="sys-settings-input" />
                      
                      <label className="sys-settings-label">Mô tả</label>
                      <textarea value={feature.description || ''} placeholder="Mô tả tính năng"
                        onChange={(e) => handleArrayChange(setHomeData, 'features', index, 'description', e.target.value)}
                        className="sys-settings-textarea" />
                      
                      <button type="button" onClick={() => removeArrayItem(setHomeData, 'features', index)}
                        className="sys-settings-btn sys-settings-btn-danger" 
                        style={{ marginTop: '16px', width: '100%' }}>
                        <FaTrash /> Xóa
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* SECTION 3: VỀ CHÚNG TÔI */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('home', 'aboutSection')}>
              <h3 className="sys-settings-section-title">3. Về chúng tôi</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('home', homeData, 'Lưu Về chúng tôi thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                {openSections.home.aboutSection ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.home.aboutSection && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  <div className="sys-settings-card">
                    <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                      Thông tin chung
                    </h4>

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
                    <textarea 
                      value={(homeData.aboutSection?.highlights || []).map(h => `${h.icon}|${h.title}|${h.description}`).join('\n')}
                      onChange={(e) => {
                        const lines = e.target.value.split('\n').filter(line => line.trim());
                        const highlights = lines.map(line => {
                          const [icon, title, description] = line.split('|');
                          return { 
                            icon: icon?.trim() || 'FaCheckCircle', 
                            title: title?.trim() || '', 
                            description: description?.trim() || '' 
                          };
                        });
                        setHomeData(prev => ({ ...prev, aboutSection: { ...prev.aboutSection, highlights }}));
                      }}
                      placeholder="FaCheckCircle|Đội ngũ bác sĩ giàu kinh nghiệm|Các chuyên gia y tế được đào tạo bài bản"
                      className="sys-settings-textarea"
                      style={{ minHeight: '120px' }}
                    />
                    
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
          </section>

          {/* SECTION 4: ĐÁNH GIÁ TỪ BỆNH NHÂN */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('home', 'testimonials')}>
              <h3 className="sys-settings-section-title">4. Đánh giá từ bệnh nhân</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('home', homeData, 'Lưu Đánh giá thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                <button type="button" onClick={(e) => { 
                  e.stopPropagation(); 
                  addArrayItem(setHomeData, 'testimonials', { 
                    name: '', 
                    role: '', 
                    comment: '', 
                    avatar: '', 
                    alt: '', 
                    rating: 5 
                  }); 
                }}
                  className="sys-settings-btn sys-settings-btn-primary">
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
                        <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                          Đánh giá {index + 1}
                        </h4>

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
                        {testimonial.avatar && (
                          <img src={testimonial.avatar} alt={testimonial.alt || ''} className="sys-settings-preview-img" />
                        )}
                        
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
                          className="sys-settings-btn sys-settings-btn-danger" 
                          style={{ marginTop: '16px', width: '100%' }}>
                          <FaTrash /> Xóa
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* SECTION 5: ĐẶT LỊCH KHÁM BỆNH */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('home', 'bookingSection')}>
              <h3 className="sys-settings-section-title">5. Đặt lịch khám bệnh</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('home', homeData, 'Lưu Đặt lịch khám thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                {openSections.home.bookingSection ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.home.bookingSection && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  <div className="sys-settings-card">
                    <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                      Thông tin đặt lịch
                    </h4>

                    <label className="sys-settings-label">Tiêu đề section</label>
                    <input type="text" value={homeData.bookingSection?.title || ''} placeholder="Đặt lịch khám bệnh"
                      onChange={(e) => setHomeData(prev => ({ ...prev, bookingSection: { ...prev.bookingSection, title: e.target.value }}))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Mô tả</label>
                    <textarea value={homeData.bookingSection?.description || ''} placeholder="Đặt lịch nhanh chóng..."
                      onChange={(e) => setHomeData(prev => ({ ...prev, bookingSection: { ...prev.bookingSection, description: e.target.value }}))}
                      className="sys-settings-textarea" />
                    
                    <label className="sys-settings-label">Tính năng (mỗi dòng: Icon|Text)</label>
                    <textarea 
                      value={(homeData.bookingSection?.features || []).map(f => `${f.icon}|${f.text}`).join('\n')}
                      onChange={(e) => {
                        const lines = e.target.value.split('\n').filter(line => line.trim());
                        const features = lines.map(line => {
                          const [icon, text] = line.split('|');
                          return { 
                            icon: icon?.trim() || 'FaCheckCircle', 
                            text: text?.trim() || '' 
                          };
                        });
                        setHomeData(prev => ({ ...prev, bookingSection: { ...prev.bookingSection, features }}));
                      }}
                      placeholder="FaCheckCircle|Xác nhận nhanh qua email"
                      className="sys-settings-textarea"
                      style={{ minHeight: '100px' }}
                    />
                    
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
          </section>
        </TabPanel>

        {/* ==================== TAB ABOUT - ĐẦY ĐỦ ==================== */}
        <TabPanel className="sys-settings-tab-panel">
          
          {/* SECTION 1: BANNER */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('about', 'banner')}>
              <h3 className="sys-settings-section-title">1. Banner</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('about', aboutData, 'Lưu Banner thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                {openSections.about.banner ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.about.banner && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  <div className="sys-settings-card">
                    <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                      Banner About
                    </h4>

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
                    {aboutData.banner?.image && (
                      <img src={aboutData.banner.image} alt="" className="sys-settings-preview-img" />
                    )}
                    
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
          </section>

          {/* SECTION 2: SỨ MỆNH & TẦM NHÌN */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('about', 'mission')}>
              <h3 className="sys-settings-section-title">2. Sứ mệnh & Tầm nhìn</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('about', aboutData, 'Lưu Sứ mệnh & Tầm nhìn thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                {openSections.about.mission ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.about.mission && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  {/* SỨ MỆNH */}
                  <div className="sys-settings-card">
                    <h4 style={{ marginBottom: '12px', color: '#10b981', fontWeight: 'bold' }}>
                      Sứ mệnh
                    </h4>

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
                    {aboutData.mission?.image && (
                      <img src={aboutData.mission.image} alt="" className="sys-settings-preview-img" />
                    )}
                    
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

                  {/* TẦM NHÌN */}
                  <div className="sys-settings-card">
                    <h4 style={{ marginBottom: '12px', color: '#10b981', fontWeight: 'bold' }}>
                      Tầm nhìn
                    </h4>

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
                    {aboutData.vision?.image && (
                      <img src={aboutData.vision.image} alt="" className="sys-settings-preview-img" />
                    )}
                    
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
          </section>

          {/* SECTION 3: LỊCH SỬ PHÁT TRIỂN */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('about', 'milestones')}>
              <h3 className="sys-settings-section-title">3. Lịch sử phát triển</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('about', aboutData, 'Lưu Lịch sử phát triển thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                <button type="button" onClick={(e) => { 
                  e.stopPropagation(); 
                  addArrayItem(setAboutData, 'milestones', { 
                    year: '', 
                    title: '', 
                    description: '', 
                    image: '', 
                    alt: '' 
                  }); 
                }}
                  className="sys-settings-btn sys-settings-btn-primary">
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
                        <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                          Mốc {index + 1}
                        </h4>

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
                        {milestone.image && (
                          <img src={milestone.image} alt={milestone.alt || ''} className="sys-settings-preview-img" />
                        )}
                        
                        <label className="sys-settings-label">Alt Text</label>
                        <input type="text" value={milestone.alt || ''} placeholder="Mô tả ảnh"
                          onChange={(e) => handleArrayChange(setAboutData, 'milestones', index, 'alt', e.target.value)}
                          className="sys-settings-input" />
                        
                        <button type="button" onClick={() => removeArrayItem(setAboutData, 'milestones', index)}
                          className="sys-settings-btn sys-settings-btn-danger" 
                          style={{ marginTop: '16px', width: '100%' }}>
                          <FaTrash /> Xóa
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* SECTION 4: THỐNG KÊ */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('about', 'stats')}>
              <h3 className="sys-settings-section-title">4. Thống kê</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('about', aboutData, 'Lưu Thống kê thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                <button type="button" onClick={(e) => { 
                  e.stopPropagation(); 
                  addArrayItem(setAboutData, 'stats', { 
                    number: '', 
                    label: '' 
                  }); 
                }}
                  className="sys-settings-btn sys-settings-btn-primary">
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
                      <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                        Thống kê {index + 1}
                      </h4>

                      <label className="sys-settings-label">Số liệu</label>
                      <input type="text" value={stat.number || ''} placeholder="15+"
                        onChange={(e) => handleArrayChange(setAboutData, 'stats', index, 'number', e.target.value)}
                        className="sys-settings-input" />
                      
                      <label className="sys-settings-label">Nhãn</label>
                      <input type="text" value={stat.label || ''} placeholder="Năm phát triển"
                        onChange={(e) => handleArrayChange(setAboutData, 'stats', index, 'label', e.target.value)}
                        className="sys-settings-input" />
                      
                      <button type="button" onClick={() => removeArrayItem(setAboutData, 'stats', index)}
                        className="sys-settings-btn sys-settings-btn-danger" 
                        style={{ marginTop: '16px', width: '100%' }}>
                        <FaTrash /> Xóa
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* SECTION 5: NGUYÊN TẮC HOẠT ĐỘNG */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('about', 'values')}>
              <h3 className="sys-settings-section-title">5. Nguyên tắc hoạt động</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('about', aboutData, 'Lưu Nguyên tắc thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                <button type="button" onClick={(e) => { 
                  e.stopPropagation(); 
                  addArrayItem(setAboutData, 'values', { 
                    icon: 'FaHeart', 
                    title: '', 
                    description: '' 
                  }); 
                }}
                  className="sys-settings-btn sys-settings-btn-primary">
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
                      <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                        Giá trị {index + 1}
                      </h4>

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
                        className="sys-settings-btn sys-settings-btn-danger" 
                        style={{ marginTop: '16px', width: '100%' }}>
                        <FaTrash /> Xóa
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* SECTION 6: ĐỘI NGŨ ĐIỀU HÀNH */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('about', 'leadership')}>
              <h3 className="sys-settings-section-title">6. Đội ngũ điều hành</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('about', aboutData, 'Lưu Đội ngũ điều hành thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                <button type="button" onClick={(e) => { 
                  e.stopPropagation(); 
                  addArrayItem(setAboutData, 'leadership', { 
                    name: '', 
                    position: '', 
                    description: '', 
                    image: '', 
                    alt: '' 
                  }); 
                }}
                  className="sys-settings-btn sys-settings-btn-primary">
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
                        <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                          Lãnh đạo {index + 1}
                        </h4>

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
                        {leader.image && (
                          <img src={leader.image} alt={leader.alt || ''} className="sys-settings-preview-img" />
                        )}
                        
                        <label className="sys-settings-label">Alt Text</label>
                        <input type="text" value={leader.alt || ''} placeholder="Ảnh lãnh đạo"
                          onChange={(e) => handleArrayChange(setAboutData, 'leadership', index, 'alt', e.target.value)}
                          className="sys-settings-input" />
                        
                        <button type="button" onClick={() => removeArrayItem(setAboutData, 'leadership', index)}
                          className="sys-settings-btn sys-settings-btn-danger" 
                          style={{ marginTop: '16px', width: '100%' }}>
                          <FaTrash /> Xóa
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* SECTION 7: GIẢI THƯỞNG & CHỨNG NHẬN */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('about', 'achievements')}>
              <h3 className="sys-settings-section-title">7. Giải thưởng & Chứng nhận</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('about', aboutData, 'Lưu Giải thưởng thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                <button type="button" onClick={(e) => { 
                  e.stopPropagation(); 
                  addArrayItem(setAboutData, 'achievements', { 
                    icon: 'FaTrophy', 
                    title: '', 
                    year: '' 
                  }); 
                }}
                  className="sys-settings-btn sys-settings-btn-primary">
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
                      <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                        Thành tựu {index + 1}
                      </h4>

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
                        className="sys-settings-btn sys-settings-btn-danger" 
                        style={{ marginTop: '16px', width: '100%' }}>
                        <FaTrash /> Xóa
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* SECTION 8: TRANG THIẾT BỊ HIỆN ĐẠI */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('about', 'facilities')}>
              <h3 className="sys-settings-section-title">8. Trang thiết bị hiện đại</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('about', aboutData, 'Lưu Trang thiết bị thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                <button type="button" onClick={(e) => { 
                  e.stopPropagation(); 
                  addArrayItem(setAboutData, 'facilities', { 
                    icon: 'FaBuilding', 
                    title: '', 
                    description: '' 
                  }); 
                }}
                  className="sys-settings-btn sys-settings-btn-primary">
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
                      <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                        Cơ sở {index + 1}
                      </h4>

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
                        className="sys-settings-btn sys-settings-btn-danger" 
                        style={{ marginTop: '16px', width: '100%' }}>
                        <FaTrash /> Xóa
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

        </TabPanel>

        {/* ==================== TAB FACILITIES - ĐẦY ĐỦ ==================== */}
        <TabPanel className="sys-settings-tab-panel">
          
          {/* SECTION 1: BANNER */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('facilities', 'banner')}>
              <h3 className="sys-settings-section-title">1. Banner</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('facilities', facilitiesData, 'Lưu Banner thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                {openSections.facilities.banner ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.facilities.banner && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  <div className="sys-settings-card">
                    <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                      Banner Facilities
                    </h4>

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
                    {facilitiesData.banner?.image && (
                      <img src={facilitiesData.banner.image} alt="" className="sys-settings-preview-img" />
                    )}
                    
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
          </section>

          {/* SECTION 2: TIỆN ÍCH */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('facilities', 'amenities')}>
              <h3 className="sys-settings-section-title">2. Tiện ích</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('facilities', facilitiesData, 'Lưu Tiện ích thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                <button type="button" onClick={(e) => { 
                  e.stopPropagation(); 
                  addArrayItem(setFacilitiesData, 'amenities', { 
                    icon: 'FaWifi', 
                    name: '' 
                  }); 
                }}
                  className="sys-settings-btn sys-settings-btn-primary">
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
                      <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                        Tiện ích {index + 1}
                      </h4>

                      <label className="sys-settings-label">Icon</label>
                      <CustomIconPicker value={amenity.icon || ''} 
                        onChange={(icon) => handleArrayChange(setFacilitiesData, 'amenities', index, 'icon', icon)} />
                      
                      <label className="sys-settings-label">Tên tiện ích</label>
                      <input type="text" value={amenity.name || ''} placeholder="Wifi miễn phí"
                        onChange={(e) => handleArrayChange(setFacilitiesData, 'amenities', index, 'name', e.target.value)}
                        className="sys-settings-input" />
                      
                      <button type="button" onClick={() => removeArrayItem(setFacilitiesData, 'amenities', index)}
                        className="sys-settings-btn sys-settings-btn-danger" 
                        style={{ marginTop: '16px', width: '100%' }}>
                        <FaTrash /> Xóa
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* SECTION 3: CÁC KHU VỰC CHÍNH */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('facilities', 'facilities')}>
              <h3 className="sys-settings-section-title">3. Các khu vực chính</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('facilities', facilitiesData, 'Lưu Khu vực thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                <button type="button" onClick={(e) => { 
                  e.stopPropagation(); 
                  addArrayItem(setFacilitiesData, 'facilities', { 
                    icon: 'FaBuilding', 
                    title: '', 
                    description: '', 
                    image: '', 
                    alt: '', 
                    features: [] 
                  }); 
                }}
                  className="sys-settings-btn sys-settings-btn-primary">
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
                        <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                          Khu vực {index + 1}
                        </h4>

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
                        {facility.image && (
                          <img src={facility.image} alt={facility.alt || ''} className="sys-settings-preview-img" />
                        )}
                        
                        <label className="sys-settings-label">Alt Text</label>
                        <input type="text" value={facility.alt || ''} placeholder="Ảnh phòng khám"
                          onChange={(e) => handleArrayChange(setFacilitiesData, 'facilities', index, 'alt', e.target.value)}
                          className="sys-settings-input" />
                        
                        <label className="sys-settings-label">Tính năng (mỗi dòng 1 tính năng)</label>
                        <textarea 
                          value={(facility.features || []).join('\n')} 
                          placeholder="Trang bị đầy đủ..."
                          onChange={(e) => handleArrayChange(setFacilitiesData, 'facilities', index, 'features', e.target.value.split('\n').filter(f => f.trim()))}
                          className="sys-settings-textarea" 
                        />
                        
                        <button type="button" onClick={() => removeArrayItem(setFacilitiesData, 'facilities', index)}
                          className="sys-settings-btn sys-settings-btn-danger" 
                          style={{ marginTop: '16px', width: '100%' }}>
                          <FaTrash /> Xóa
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* SECTION 4: THƯ VIỆN HÌNH ẢNH */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('facilities', 'gallery')}>
              <h3 className="sys-settings-section-title">4. Thư viện hình ảnh</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('facilities', facilitiesData, 'Lưu Thư viện thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                <button type="button" onClick={(e) => { 
                  e.stopPropagation(); 
                  addArrayItem(setFacilitiesData, 'gallery', { 
                    url: '', 
                    title: '', 
                    alt: '' 
                  }); 
                }}
                  className="sys-settings-btn sys-settings-btn-primary">
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
                        <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                          Ảnh {index + 1}
                        </h4>

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
                        {item.url && (
                          <img src={item.url} alt={item.alt || ''} className="sys-settings-preview-img" />
                        )}
                        
                        <label className="sys-settings-label">Tiêu đề ảnh</label>
                        <input type="text" value={item.title || ''} placeholder="Phòng chờ"
                          onChange={(e) => handleArrayChange(setFacilitiesData, 'gallery', index, 'title', e.target.value)}
                          className="sys-settings-input" />
                        
                        <label className="sys-settings-label">Alt Text</label>
                        <input type="text" value={item.alt || ''} placeholder="Hình ảnh phòng chờ"
                          onChange={(e) => handleArrayChange(setFacilitiesData, 'gallery', index, 'alt', e.target.value)}
                          className="sys-settings-input" />
                        
                        <button type="button" onClick={() => removeArrayItem(setFacilitiesData, 'gallery', index)}
                          className="sys-settings-btn sys-settings-btn-danger" 
                          style={{ marginTop: '16px', width: '100%' }}>
                          <FaTrash /> Xóa
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* SECTION 5: THỐNG KÊ */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('facilities', 'stats')}>
              <h3 className="sys-settings-section-title">5. Thống kê</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('facilities', facilitiesData, 'Lưu Thống kê thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                <button type="button" onClick={(e) => { 
                  e.stopPropagation(); 
                  addArrayItem(setFacilitiesData, 'stats', { 
                    number: '', 
                    label: '' 
                  }); 
                }}
                  className="sys-settings-btn sys-settings-btn-primary">
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
                      <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                        Thống kê {index + 1}
                      </h4>

                      <label className="sys-settings-label">Số liệu</label>
                      <input type="text" value={stat.number || ''} placeholder="2000m²"
                        onChange={(e) => handleArrayChange(setFacilitiesData, 'stats', index, 'number', e.target.value)}
                        className="sys-settings-input" />
                      
                      <label className="sys-settings-label">Nhãn</label>
                      <input type="text" value={stat.label || ''} placeholder="Diện tích"
                        onChange={(e) => handleArrayChange(setFacilitiesData, 'stats', index, 'label', e.target.value)}
                        className="sys-settings-input" />
                      
                      <button type="button" onClick={() => removeArrayItem(setFacilitiesData, 'stats', index)}
                        className="sys-settings-btn sys-settings-btn-danger" 
                        style={{ marginTop: '16px', width: '100%' }}>
                        <FaTrash /> Xóa
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

        </TabPanel>

        {/* ==================== TAB EQUIPMENT - ĐẦY ĐỦ ==================== */}
        <TabPanel className="sys-settings-tab-panel">
          
          {/* SECTION 1: BANNER */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('equipment', 'banner')}>
              <h3 className="sys-settings-section-title">1. Banner</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('equipment', equipmentData, 'Lưu Banner thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                {openSections.equipment.banner ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.equipment.banner && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  <div className="sys-settings-card">
                    <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                      Banner Equipment
                    </h4>

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
                    {equipmentData.banner?.image && (
                      <img src={equipmentData.banner.image} alt="" className="sys-settings-preview-img" />
                    )}
                    
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
          </section>

          {/* SECTION 2: THỐNG KÊ */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('equipment', 'stats')}>
              <h3 className="sys-settings-section-title">2. Thống kê</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('equipment', equipmentData, 'Lưu Thống kê thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                <button type="button" onClick={(e) => { 
                  e.stopPropagation(); 
                  addArrayItem(setEquipmentData, 'stats', { 
                    number: '', 
                    label: '' 
                  }); 
                }}
                  className="sys-settings-btn sys-settings-btn-primary">
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
                      <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                        Thống kê {index + 1}
                      </h4>

                      <label className="sys-settings-label">Số liệu</label>
                      <input type="text" value={stat.number || ''} placeholder="50+"
                        onChange={(e) => handleArrayChange(setEquipmentData, 'stats', index, 'number', e.target.value)}
                        className="sys-settings-input" />
                      
                      <label className="sys-settings-label">Nhãn</label>
                      <input type="text" value={stat.label || ''} placeholder="Thiết bị hiện đại"
                        onChange={(e) => handleArrayChange(setEquipmentData, 'stats', index, 'label', e.target.value)}
                        className="sys-settings-input" />
                      
                      <button type="button" onClick={() => removeArrayItem(setEquipmentData, 'stats', index)}
                        className="sys-settings-btn sys-settings-btn-danger" 
                        style={{ marginTop: '16px', width: '100%' }}>
                        <FaTrash /> Xóa
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* SECTION 3: DANH MỤC THIẾT BỊ */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('equipment', 'categories')}>
              <h3 className="sys-settings-section-title">3. Danh mục thiết bị</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('equipment', equipmentData, 'Lưu Danh mục thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                <button type="button" onClick={(e) => { 
                  e.stopPropagation(); 
                  addArrayItem(setEquipmentData, 'categories', { 
                    id: '', 
                    name: '', 
                    icon: 'FaStethoscope' 
                  }); 
                }}
                  className="sys-settings-btn sys-settings-btn-primary">
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
                      <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                        Danh mục {index + 1}
                      </h4>

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
                        className="sys-settings-btn sys-settings-btn-danger" 
                        style={{ marginTop: '16px', width: '100%' }}>
                        <FaTrash /> Xóa
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* SECTION 4: DANH SÁCH THIẾT BỊ */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('equipment', 'equipment')}>
              <h3 className="sys-settings-section-title">4. Danh sách thiết bị</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('equipment', equipmentData, 'Lưu Danh sách thiết bị thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                <button type="button" onClick={(e) => { 
                  e.stopPropagation(); 
                  addArrayItem(setEquipmentData, 'equipment', { 
                    name: '', 
                    category: '', 
                    brand: '', 
                    origin: '', 
                    year: '', 
                    image: '', 
                    alt: '', 
                    features: [], 
                    applications: [] 
                  }); 
                }}
                  className="sys-settings-btn sys-settings-btn-primary">
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
                        <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                          Thiết bị {index + 1}
                        </h4>

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
                        {item.image && (
                          <img src={item.image} alt={item.alt || ''} className="sys-settings-preview-img" />
                        )}
                        
                        <label className="sys-settings-label">Alt Text</label>
                        <input type="text" value={item.alt || ''} placeholder="Ảnh thiết bị"
                          onChange={(e) => handleArrayChange(setEquipmentData, 'equipment', index, 'alt', e.target.value)}
                          className="sys-settings-input" />
                        
                        <label className="sys-settings-label">Tính năng (mỗi dòng 1 tính năng)</label>
                        <textarea 
                          value={(item.features || []).join('\n')} 
                          placeholder="Độ phân giải cao..."
                          onChange={(e) => handleArrayChange(setEquipmentData, 'equipment', index, 'features', e.target.value.split('\n').filter(f => f.trim()))}
                          className="sys-settings-textarea" 
                        />
                        
                        <label className="sys-settings-label">Ứng dụng (mỗi dòng 1 ứng dụng)</label>
                        <textarea 
                          value={(item.applications || []).join('\n')} 
                          placeholder="Chẩn đoán ung thư..."
                          onChange={(e) => handleArrayChange(setEquipmentData, 'equipment', index, 'applications', e.target.value.split('\n').filter(a => a.trim()))}
                          className="sys-settings-textarea" 
                        />
                        
                        <button type="button" onClick={() => removeArrayItem(setEquipmentData, 'equipment', index)}
                          className="sys-settings-btn sys-settings-btn-danger" 
                          style={{ marginTop: '16px', width: '100%' }}>
                          <FaTrash /> Xóa
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* SECTION 5: CAM KẾT CHẤT LƯỢNG */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('equipment', 'quality')}>
              <h3 className="sys-settings-section-title">5. Cam kết chất lượng</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('equipment', equipmentData, 'Lưu Cam kết thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                <button type="button" onClick={(e) => { 
                  e.stopPropagation(); 
                  addArrayItem(setEquipmentData, 'quality', { 
                    title: '', 
                    description: '' 
                  }); 
                }}
                  className="sys-settings-btn sys-settings-btn-primary">
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
                      <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                        Cam kết {index + 1}
                      </h4>

                      <label className="sys-settings-label">Tiêu đề</label>
                      <input type="text" value={item.title || ''} placeholder="Nhập khẩu chính hãng"
                        onChange={(e) => handleArrayChange(setEquipmentData, 'quality', index, 'title', e.target.value)}
                        className="sys-settings-input" />
                      
                      <label className="sys-settings-label">Mô tả</label>
                      <textarea value={item.description || ''} placeholder="100% thiết bị nhập khẩu..."
                        onChange={(e) => handleArrayChange(setEquipmentData, 'quality', index, 'description', e.target.value)}
                        className="sys-settings-textarea" />
                      
                      <button type="button" onClick={() => removeArrayItem(setEquipmentData, 'quality', index)}
                        className="sys-settings-btn sys-settings-btn-danger" 
                        style={{ marginTop: '16px', width: '100%' }}>
                        <FaTrash /> Xóa
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

        </TabPanel>
      </Tabs>
      </div>
    </div>
  );
};

export default SystemSettingsPage;
