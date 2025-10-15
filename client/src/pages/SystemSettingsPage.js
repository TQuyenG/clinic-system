import React, { useState, useEffect } from 'react';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import axios from 'axios';
import { FaSave, FaUpload, FaTrash, FaPlus, FaSpinner } from 'react-icons/fa';
import 'react-tabs/style/react-tabs.css';
import './SystemSettingsPage.css';

const SystemSettingsPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // State for Home Page
  const [homeData, setHomeData] = useState({
    bannerSlides: [],
    features: [],
    stats: [],
    testimonials: []
  });

  // State for About Page
  const [aboutData, setAboutData] = useState({
    milestones: [],
    values: [],
    achievements: [],
    leadership: [],
    facilities: []
  });

  // State for Facilities Page
  const [facilitiesData, setFacilitiesData] = useState({
    facilities: [],
    amenities: [],
    gallery: []
  });

  // State for Equipment Page
  const [equipmentData, setEquipmentData] = useState({
    categories: [],
    equipment: [],
    stats: []
  });

  const API_BASE_URL = 'http://localhost:3001/api';

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  });

  // Upload image function
  const uploadImage = async (file) => {
    if (!file) return null;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('upload', file);
      const response = await axios.post(`${API_BASE_URL}/upload/image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.data.url) {
        return response.data.url;
      }
      throw new Error('Upload thất bại');
    } catch (err) {
      setError(`Lỗi upload hình ảnh: ${err.message}`);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Fetch initial settings
  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      setError(null);
      try {
        const [homeRes, aboutRes, facilitiesRes, equipmentRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/settings/home`),
          axios.get(`${API_BASE_URL}/settings/about`),
          axios.get(`${API_BASE_URL}/settings/facilities`),
          axios.get(`${API_BASE_URL}/settings/equipment`)
        ]);

        setHomeData(homeRes.data || { bannerSlides: [], features: [], stats: [], testimonials: [] });
        setAboutData(aboutRes.data || { milestones: [], values: [], achievements: [], leadership: [], facilities: [] });
        setFacilitiesData(facilitiesRes.data || { facilities: [], amenities: [], gallery: [] });
        setEquipmentData(equipmentRes.data || { categories: [], equipment: [], stats: [] });
      } catch (err) {
        console.error('Error fetching settings:', err);
        setError(`Lỗi khi tải dữ liệu: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // Save settings
  const saveSettings = async (page, data) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await axios.put(`${API_BASE_URL}/settings/${page}`, data, { headers: getHeaders() });
      setSuccess(`Lưu ${page} settings thành công!`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(`Lưu ${page} thất bại: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Generic handlers
  const handleArrayChange = (setter, arrayName, index, field, value) => {
    setter(prev => {
      const newArray = [...prev[arrayName]];
      newArray[index][field] = value;
      return { ...prev, [arrayName]: newArray };
    });
  };

  const handleArrayImageUpload = async (setter, arrayName, index, field, file) => {
    const url = await uploadImage(file);
    if (url) {
      handleArrayChange(setter, arrayName, index, field, url);
    }
  };

  const addArrayItem = (setter, arrayName, defaultItem) => {
    setter(prev => ({
      ...prev,
      [arrayName]: [...prev[arrayName], { ...defaultItem }]
    }));
  };

  const removeArrayItem = (setter, arrayName, index) => {
    setter(prev => ({
      ...prev,
      [arrayName]: prev[arrayName].filter((_, i) => i !== index)
    }));
  };

  const handleSubArrayChange = (setter, arrayName, index, subArrayName, subIndex, value) => {
    setter(prev => {
      const newArray = [...prev[arrayName]];
      const newSubArray = [...(newArray[index][subArrayName] || [])];
      newSubArray[subIndex] = value;
      newArray[index][subArrayName] = newSubArray;
      return { ...prev, [arrayName]: newArray };
    });
  };

  const addSubArrayItem = (setter, arrayName, index, subArrayName) => {
    setter(prev => {
      const newArray = [...prev[arrayName]];
      if (!newArray[index][subArrayName]) {
        newArray[index][subArrayName] = [];
      }
      newArray[index][subArrayName] = [...newArray[index][subArrayName], ''];
      return { ...prev, [arrayName]: newArray };
    });
  };

  const removeSubArrayItem = (setter, arrayName, index, subArrayName, subIndex) => {
    setter(prev => {
      const newArray = [...prev[arrayName]];
      newArray[index][subArrayName] = newArray[index][subArrayName].filter((_, i) => i !== subIndex);
      return { ...prev, [arrayName]: newArray };
    });
  };

  const handleMultipleUpload = async (setter, arrayName, files) => {
    const newItems = [];
    for (let file of Array.from(files)) {
      const url = await uploadImage(file);
      if (url) {
        newItems.push({ url, title: file.name.replace(/\.[^/.]+$/, '') });
      }
    }
    setter(prev => ({
      ...prev,
      [arrayName]: [...prev[arrayName], ...newItems]
    }));
  };

  // Default data structures
  const defaults = {
    banner: { title: '', subtitle: '', description: '', image: '' },
    feature: { icon: '', title: '', description: '', color: '#4ade80' },
    stat: { number: '', label: '', icon: '', color: '#4ade80' },
    testimonial: { name: '', comment: '', rating: 5, avatar: '' },
    milestone: { year: '', title: '', description: '', image: '' },
    value: { icon: '', title: '', description: '' },
    achievement: { icon: '', title: '', year: '' },
    leader: { name: '', position: '', image: '', description: '' },
    aboutFacility: { icon: '', title: '', description: '' },
    facility: { icon: '', title: '', description: '', image: '', features: [] },
    amenity: { icon: '', name: '' },
    galleryItem: { url: '', title: '' },
    category: { id: '', name: '', icon: '' },
    equipmentItem: { category: '', name: '', brand: '', origin: '', year: '', image: '', features: [], applications: [] },
    equipmentStat: { number: '', label: '' }
  };

  return (
    <div className="sys-settings-container">
      <h1 className="sys-settings-title">Quản lý Hệ thống - Chỉnh sửa Trang Tĩnh</h1>
      
      {error && (
        <div className="sys-settings-alert sys-settings-alert-error">
          {error}
        </div>
      )}
      
      {success && (
        <div className="sys-settings-alert sys-settings-alert-success">
          {success}
        </div>
      )}
      
      {loading && (
        <div className="sys-settings-loading">
          <FaSpinner className="sys-settings-spinner" /> Đang xử lý...
        </div>
      )}

      <Tabs className="sys-settings-tabs">
        <TabList className="sys-settings-tab-list">
          <Tab className="sys-settings-tab">Home Page</Tab>
          <Tab className="sys-settings-tab">About Page</Tab>
          <Tab className="sys-settings-tab">Facilities Page</Tab>
          <Tab className="sys-settings-tab">Equipment Page</Tab>
        </TabList>

        {/* HOME PAGE TAB */}
        <TabPanel className="sys-settings-tab-panel">
          <h2 className="sys-settings-section-title">Home Page Settings</h2>

          {/* Banner Slides */}
          <section className="sys-settings-section">
            <h3 className="sys-settings-subsection-title">Banner Slides</h3>
            {homeData.bannerSlides.map((item, index) => (
              <div key={index} className="sys-settings-card">
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => handleArrayChange(setHomeData, 'bannerSlides', index, 'title', e.target.value)}
                  placeholder="Tiêu đề"
                  className="sys-settings-input"
                />
                <input
                  type="text"
                  value={item.subtitle}
                  onChange={(e) => handleArrayChange(setHomeData, 'bannerSlides', index, 'subtitle', e.target.value)}
                  placeholder="Phụ đề"
                  className="sys-settings-input"
                />
                <textarea
                  value={item.description}
                  onChange={(e) => handleArrayChange(setHomeData, 'bannerSlides', index, 'description', e.target.value)}
                  placeholder="Mô tả"
                  className="sys-settings-textarea"
                />
                <input
                  type="text"
                  value={item.image}
                  onChange={(e) => handleArrayChange(setHomeData, 'bannerSlides', index, 'image', e.target.value)}
                  placeholder="URL hình ảnh"
                  className="sys-settings-input"
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleArrayImageUpload(setHomeData, 'bannerSlides', index, 'image', e.target.files[0])}
                  className="sys-settings-file-input"
                />
                {item.image && <img src={item.image} alt="Banner" className="sys-settings-preview-img" />}
                <button
                  onClick={() => removeArrayItem(setHomeData, 'bannerSlides', index)}
                  className="sys-settings-btn sys-settings-btn-danger"
                >
                  <FaTrash /> Xóa
                </button>
              </div>
            ))}
            <button
              onClick={() => addArrayItem(setHomeData, 'bannerSlides', defaults.banner)}
              className="sys-settings-btn sys-settings-btn-primary"
            >
              <FaPlus /> Thêm Slide
            </button>
          </section>

          {/* Features */}
          <section className="sys-settings-section">
            <h3 className="sys-settings-subsection-title">Features</h3>
            {homeData.features.map((item, index) => (
              <div key={index} className="sys-settings-card">
                <input
                  type="text"
                  value={item.icon}
                  onChange={(e) => handleArrayChange(setHomeData, 'features', index, 'icon', e.target.value)}
                  placeholder="Icon"
                  className="sys-settings-input"
                />
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => handleArrayChange(setHomeData, 'features', index, 'title', e.target.value)}
                  placeholder="Tiêu đề"
                  className="sys-settings-input"
                />
                <textarea
                  value={item.description}
                  onChange={(e) => handleArrayChange(setHomeData, 'features', index, 'description', e.target.value)}
                  placeholder="Mô tả"
                  className="sys-settings-textarea"
                />
                <input
                  type="text"
                  value={item.color}
                  onChange={(e) => handleArrayChange(setHomeData, 'features', index, 'color', e.target.value)}
                  placeholder="Màu (e.g. #4ade80)"
                  className="sys-settings-input"
                />
                <button
                  onClick={() => removeArrayItem(setHomeData, 'features', index)}
                  className="sys-settings-btn sys-settings-btn-danger"
                >
                  <FaTrash /> Xóa
                </button>
              </div>
            ))}
            <button
              onClick={() => addArrayItem(setHomeData, 'features', defaults.feature)}
              className="sys-settings-btn sys-settings-btn-primary"
            >
              <FaPlus /> Thêm Feature
            </button>
          </section>

          {/* Stats */}
          <section className="sys-settings-section">
            <h3 className="sys-settings-subsection-title">Stats</h3>
            {homeData.stats.map((item, index) => (
              <div key={index} className="sys-settings-card">
                <input
                  type="text"
                  value={item.number}
                  onChange={(e) => handleArrayChange(setHomeData, 'stats', index, 'number', e.target.value)}
                  placeholder="Số liệu"
                  className="sys-settings-input"
                />
                <input
                  type="text"
                  value={item.label}
                  onChange={(e) => handleArrayChange(setHomeData, 'stats', index, 'label', e.target.value)}
                  placeholder="Nhãn"
                  className="sys-settings-input"
                />
                <input
                  type="text"
                  value={item.icon}
                  onChange={(e) => handleArrayChange(setHomeData, 'stats', index, 'icon', e.target.value)}
                  placeholder="Icon"
                  className="sys-settings-input"
                />
                <input
                  type="text"
                  value={item.color}
                  onChange={(e) => handleArrayChange(setHomeData, 'stats', index, 'color', e.target.value)}
                  placeholder="Màu"
                  className="sys-settings-input"
                />
                <button
                  onClick={() => removeArrayItem(setHomeData, 'stats', index)}
                  className="sys-settings-btn sys-settings-btn-danger"
                >
                  <FaTrash /> Xóa
                </button>
              </div>
            ))}
            <button
              onClick={() => addArrayItem(setHomeData, 'stats', defaults.stat)}
              className="sys-settings-btn sys-settings-btn-primary"
            >
              <FaPlus /> Thêm Stat
            </button>
          </section>

          {/* Testimonials */}
          <section className="sys-settings-section">
            <h3 className="sys-settings-subsection-title">Testimonials</h3>
            {homeData.testimonials.map((item, index) => (
              <div key={index} className="sys-settings-card">
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => handleArrayChange(setHomeData, 'testimonials', index, 'name', e.target.value)}
                  placeholder="Tên"
                  className="sys-settings-input"
                />
                <textarea
                  value={item.comment}
                  onChange={(e) => handleArrayChange(setHomeData, 'testimonials', index, 'comment', e.target.value)}
                  placeholder="Bình luận"
                  className="sys-settings-textarea"
                />
                <input
                  type="number"
                  value={item.rating}
                  onChange={(e) => handleArrayChange(setHomeData, 'testimonials', index, 'rating', Number(e.target.value))}
                  placeholder="Đánh giá (1-5)"
                  min="1"
                  max="5"
                  className="sys-settings-input"
                />
                <input
                  type="text"
                  value={item.avatar}
                  onChange={(e) => handleArrayChange(setHomeData, 'testimonials', index, 'avatar', e.target.value)}
                  placeholder="URL ảnh đại diện"
                  className="sys-settings-input"
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleArrayImageUpload(setHomeData, 'testimonials', index, 'avatar', e.target.files[0])}
                  className="sys-settings-file-input"
                />
                {item.avatar && <img src={item.avatar} alt="Avatar" className="sys-settings-preview-img" />}
                <button
                  onClick={() => removeArrayItem(setHomeData, 'testimonials', index)}
                  className="sys-settings-btn sys-settings-btn-danger"
                >
                  <FaTrash /> Xóa
                </button>
              </div>
            ))}
            <button
              onClick={() => addArrayItem(setHomeData, 'testimonials', defaults.testimonial)}
              className="sys-settings-btn sys-settings-btn-primary"
            >
              <FaPlus /> Thêm Testimonial
            </button>
          </section>

          <button
            onClick={() => saveSettings('home', homeData)}
            className="sys-settings-btn sys-settings-btn-success sys-settings-btn-save"
            disabled={loading}
          >
            <FaSave /> Lưu Home Settings
          </button>
        </TabPanel>

        {/* ABOUT PAGE TAB */}
        <TabPanel className="sys-settings-tab-panel">
          <h2 className="sys-settings-section-title">About Page Settings</h2>

          {/* Milestones */}
          <section className="sys-settings-section">
            <h3 className="sys-settings-subsection-title">Milestones</h3>
            {aboutData.milestones.map((item, index) => (
              <div key={index} className="sys-settings-card">
                <input
                  type="text"
                  value={item.year}
                  onChange={(e) => handleArrayChange(setAboutData, 'milestones', index, 'year', e.target.value)}
                  placeholder="Năm"
                  className="sys-settings-input"
                />
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => handleArrayChange(setAboutData, 'milestones', index, 'title', e.target.value)}
                  placeholder="Tiêu đề"
                  className="sys-settings-input"
                />
                <textarea
                  value={item.description}
                  onChange={(e) => handleArrayChange(setAboutData, 'milestones', index, 'description', e.target.value)}
                  placeholder="Mô tả"
                  className="sys-settings-textarea"
                />
                <input
                  type="text"
                  value={item.image}
                  onChange={(e) => handleArrayChange(setAboutData, 'milestones', index, 'image', e.target.value)}
                  placeholder="URL hình ảnh"
                  className="sys-settings-input"
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleArrayImageUpload(setAboutData, 'milestones', index, 'image', e.target.files[0])}
                  className="sys-settings-file-input"
                />
                {item.image && <img src={item.image} alt="Milestone" className="sys-settings-preview-img" />}
                <button
                  onClick={() => removeArrayItem(setAboutData, 'milestones', index)}
                  className="sys-settings-btn sys-settings-btn-danger"
                >
                  <FaTrash /> Xóa
                </button>
              </div>
            ))}
            <button
              onClick={() => addArrayItem(setAboutData, 'milestones', defaults.milestone)}
              className="sys-settings-btn sys-settings-btn-primary"
            >
              <FaPlus /> Thêm Milestone
            </button>
          </section>

          {/* Values */}
          <section className="sys-settings-section">
            <h3 className="sys-settings-subsection-title">Values</h3>
            {aboutData.values.map((item, index) => (
              <div key={index} className="sys-settings-card">
                <input
                  type="text"
                  value={item.icon}
                  onChange={(e) => handleArrayChange(setAboutData, 'values', index, 'icon', e.target.value)}
                  placeholder="Icon"
                  className="sys-settings-input"
                />
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => handleArrayChange(setAboutData, 'values', index, 'title', e.target.value)}
                  placeholder="Tiêu đề"
                  className="sys-settings-input"
                />
                <textarea
                  value={item.description}
                  onChange={(e) => handleArrayChange(setAboutData, 'values', index, 'description', e.target.value)}
                  placeholder="Mô tả"
                  className="sys-settings-textarea"
                />
                <button
                  onClick={() => removeArrayItem(setAboutData, 'values', index)}
                  className="sys-settings-btn sys-settings-btn-danger"
                >
                  <FaTrash /> Xóa
                </button>
              </div>
            ))}
            <button
              onClick={() => addArrayItem(setAboutData, 'values', defaults.value)}
              className="sys-settings-btn sys-settings-btn-primary"
            >
              <FaPlus /> Thêm Value
            </button>
          </section>

          {/* Achievements */}
          <section className="sys-settings-section">
            <h3 className="sys-settings-subsection-title">Achievements</h3>
            {aboutData.achievements.map((item, index) => (
              <div key={index} className="sys-settings-card">
                <input
                  type="text"
                  value={item.icon}
                  onChange={(e) => handleArrayChange(setAboutData, 'achievements', index, 'icon', e.target.value)}
                  placeholder="Icon"
                  className="sys-settings-input"
                />
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => handleArrayChange(setAboutData, 'achievements', index, 'title', e.target.value)}
                  placeholder="Tiêu đề"
                  className="sys-settings-input"
                />
                <input
                  type="text"
                  value={item.year}
                  onChange={(e) => handleArrayChange(setAboutData, 'achievements', index, 'year', e.target.value)}
                  placeholder="Năm"
                  className="sys-settings-input"
                />
                <button
                  onClick={() => removeArrayItem(setAboutData, 'achievements', index)}
                  className="sys-settings-btn sys-settings-btn-danger"
                >
                  <FaTrash /> Xóa
                </button>
              </div>
            ))}
            <button
              onClick={() => addArrayItem(setAboutData, 'achievements', defaults.achievement)}
              className="sys-settings-btn sys-settings-btn-primary"
            >
              <FaPlus /> Thêm Achievement
            </button>
          </section>

          {/* Leadership */}
          <section className="sys-settings-section">
            <h3 className="sys-settings-subsection-title">Leadership</h3>
            {aboutData.leadership.map((item, index) => (
              <div key={index} className="sys-settings-card">
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => handleArrayChange(setAboutData, 'leadership', index, 'name', e.target.value)}
                  placeholder="Tên"
                  className="sys-settings-input"
                />
                <input
                  type="text"
                  value={item.position}
                  onChange={(e) => handleArrayChange(setAboutData, 'leadership', index, 'position', e.target.value)}
                  placeholder="Chức vụ"
                  className="sys-settings-input"
                />
                <textarea
                  value={item.description}
                  onChange={(e) => handleArrayChange(setAboutData, 'leadership', index, 'description', e.target.value)}
                  placeholder="Mô tả"
                  className="sys-settings-textarea"
                />
                <input
                  type="text"
                  value={item.image}
                  onChange={(e) => handleArrayChange(setAboutData, 'leadership', index, 'image', e.target.value)}
                  placeholder="URL hình ảnh"
                  className="sys-settings-input"
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleArrayImageUpload(setAboutData, 'leadership', index, 'image', e.target.files[0])}
                  className="sys-settings-file-input"
                />
                {item.image && <img src={item.image} alt="Leader" className="sys-settings-preview-img" />}
                <button
                  onClick={() => removeArrayItem(setAboutData, 'leadership', index)}
                  className="sys-settings-btn sys-settings-btn-danger"
                >
                  <FaTrash /> Xóa
                </button>
              </div>
            ))}
            <button
              onClick={() => addArrayItem(setAboutData, 'leadership', defaults.leader)}
              className="sys-settings-btn sys-settings-btn-primary"
            >
              <FaPlus /> Thêm Leader
            </button>
          </section>

          {/* Facilities */}
          <section className="sys-settings-section">
            <h3 className="sys-settings-subsection-title">Facilities</h3>
            {aboutData.facilities.map((item, index) => (
              <div key={index} className="sys-settings-card">
                <input
                  type="text"
                  value={item.icon}
                  onChange={(e) => handleArrayChange(setAboutData, 'facilities', index, 'icon', e.target.value)}
                  placeholder="Icon"
                  className="sys-settings-input"
                />
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => handleArrayChange(setAboutData, 'facilities', index, 'title', e.target.value)}
                  placeholder="Tiêu đề"
                  className="sys-settings-input"
                />
                <textarea
                  value={item.description}
                  onChange={(e) => handleArrayChange(setAboutData, 'facilities', index, 'description', e.target.value)}
                  placeholder="Mô tả"
                  className="sys-settings-textarea"
                />
                <button
                  onClick={() => removeArrayItem(setAboutData, 'facilities', index)}
                  className="sys-settings-btn sys-settings-btn-danger"
                >
                  <FaTrash /> Xóa
                </button>
              </div>
            ))}
            <button
              onClick={() => addArrayItem(setAboutData, 'facilities', defaults.aboutFacility)}
              className="sys-settings-btn sys-settings-btn-primary"
            >
              <FaPlus /> Thêm Facility
            </button>
          </section>

          <button
            onClick={() => saveSettings('about', aboutData)}
            className="sys-settings-btn sys-settings-btn-success sys-settings-btn-save"
            disabled={loading}
          >
            <FaSave /> Lưu About Settings
          </button>
        </TabPanel>

        {/* FACILITIES PAGE TAB */}
        <TabPanel className="sys-settings-tab-panel">
          <h2 className="sys-settings-section-title">Facilities Page Settings</h2>

          {/* Facilities */}
          <section className="sys-settings-section">
            <h3 className="sys-settings-subsection-title">Facilities</h3>
            {facilitiesData.facilities.map((item, index) => (
              <div key={index} className="sys-settings-card">
                <input
                  type="text"
                  value={item.icon}
                  onChange={(e) => handleArrayChange(setFacilitiesData, 'facilities', index, 'icon', e.target.value)}
                  placeholder="Icon"
                  className="sys-settings-input"
                />
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => handleArrayChange(setFacilitiesData, 'facilities', index, 'title', e.target.value)}
                  placeholder="Tiêu đề"
                  className="sys-settings-input"
                />
                <textarea
                  value={item.description}
                  onChange={(e) => handleArrayChange(setFacilitiesData, 'facilities', index, 'description', e.target.value)}
                  placeholder="Mô tả"
                  className="sys-settings-textarea"
                />
                <input
                  type="text"
                  value={item.image}
                  onChange={(e) => handleArrayChange(setFacilitiesData, 'facilities', index, 'image', e.target.value)}
                  placeholder="URL hình ảnh"
                  className="sys-settings-input"
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleArrayImageUpload(setFacilitiesData, 'facilities', index, 'image', e.target.files[0])}
                  className="sys-settings-file-input"
                />
                {item.image && <img src={item.image} alt="Facility" className="sys-settings-preview-img" />}
                
                <h4 className="sys-settings-subitem-title">Features:</h4>
                {(item.features || []).map((feature, subIndex) => (
                  <div key={subIndex} className="sys-settings-subitem">
                    <input
                      type="text"
                      value={feature}
                      onChange={(e) => handleSubArrayChange(setFacilitiesData, 'facilities', index, 'features', subIndex, e.target.value)}
                      placeholder="Feature"
                      className="sys-settings-input-inline"
                    />
                    <button
                      onClick={() => removeSubArrayItem(setFacilitiesData, 'facilities', index, 'features', subIndex)}
                      className="sys-settings-btn sys-settings-btn-danger-sm"
                    >
                      <FaTrash />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addSubArrayItem(setFacilitiesData, 'facilities', index, 'features')}
                  className="sys-settings-btn sys-settings-btn-secondary-sm"
                >
                  <FaPlus /> Thêm Feature
                </button>
                
                <button
                  onClick={() => removeArrayItem(setFacilitiesData, 'facilities', index)}
                  className="sys-settings-btn sys-settings-btn-danger"
                >
                  <FaTrash /> Xóa Facility
                </button>
              </div>
            ))}
            <button
              onClick={() => addArrayItem(setFacilitiesData, 'facilities', { ...defaults.facility, features: [] })}
              className="sys-settings-btn sys-settings-btn-primary"
            >
              <FaPlus /> Thêm Facility
            </button>
          </section>

          {/* Amenities */}
          <section className="sys-settings-section">
            <h3 className="sys-settings-subsection-title">Amenities</h3>
            {facilitiesData.amenities.map((item, index) => (
              <div key={index} className="sys-settings-card">
                <input
                  type="text"
                  value={item.icon}
                  onChange={(e) => handleArrayChange(setFacilitiesData, 'amenities', index, 'icon', e.target.value)}
                  placeholder="Icon"
                  className="sys-settings-input"
                />
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => handleArrayChange(setFacilitiesData, 'amenities', index, 'name', e.target.value)}
                  placeholder="Tên"
                  className="sys-settings-input"
                />
                <button
                  onClick={() => removeArrayItem(setFacilitiesData, 'amenities', index)}
                  className="sys-settings-btn sys-settings-btn-danger"
                >
                  <FaTrash /> Xóa
                </button>
              </div>
            ))}
            <button
              onClick={() => addArrayItem(setFacilitiesData, 'amenities', defaults.amenity)}
              className="sys-settings-btn sys-settings-btn-primary"
            >
              <FaPlus /> Thêm Amenity
            </button>
          </section>

          {/* Gallery */}
          <section className="sys-settings-section">
            <h3 className="sys-settings-subsection-title">Gallery</h3>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => handleMultipleUpload(setFacilitiesData, 'gallery', e.target.files)}
              className="sys-settings-file-input sys-settings-file-input-multiple"
            />
            <div className="sys-settings-gallery-grid">
              {facilitiesData.gallery.map((item, index) => (
                <div key={index} className="sys-settings-gallery-item">
                  <img src={item.url} alt={item.title} className="sys-settings-gallery-img" />
                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) => handleArrayChange(setFacilitiesData, 'gallery', index, 'title', e.target.value)}
                    placeholder="Tiêu đề"
                    className="sys-settings-input"
                  />
                  <button
                    onClick={() => removeArrayItem(setFacilitiesData, 'gallery', index)}
                    className="sys-settings-btn sys-settings-btn-danger-sm"
                  >
                    <FaTrash /> Xóa
                  </button>
                </div>
              ))}
            </div>
          </section>

          <button
            onClick={() => saveSettings('facilities', facilitiesData)}
            className="sys-settings-btn sys-settings-btn-success sys-settings-btn-save"
            disabled={loading}
          >
            <FaSave /> Lưu Facilities Settings
          </button>
        </TabPanel>

        {/* EQUIPMENT PAGE TAB */}
        <TabPanel className="sys-settings-tab-panel">
          <h2 className="sys-settings-section-title">Equipment Page Settings</h2>

          {/* Categories */}
          <section className="sys-settings-section">
            <h3 className="sys-settings-subsection-title">Categories</h3>
            {equipmentData.categories.map((item, index) => (
              <div key={index} className="sys-settings-card">
                <input
                  type="text"
                  value={item.id}
                  onChange={(e) => handleArrayChange(setEquipmentData, 'categories', index, 'id', e.target.value)}
                  placeholder="ID"
                  className="sys-settings-input"
                />
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => handleArrayChange(setEquipmentData, 'categories', index, 'name', e.target.value)}
                  placeholder="Tên"
                  className="sys-settings-input"
                />
                <input
                  type="text"
                  value={item.icon}
                  onChange={(e) => handleArrayChange(setEquipmentData, 'categories', index, 'icon', e.target.value)}
                  placeholder="Icon"
                  className="sys-settings-input"
                />
                <button
                  onClick={() => removeArrayItem(setEquipmentData, 'categories', index)}
                  className="sys-settings-btn sys-settings-btn-danger"
                >
                  <FaTrash /> Xóa
                </button>
              </div>
            ))}
            <button
              onClick={() => addArrayItem(setEquipmentData, 'categories', defaults.category)}
              className="sys-settings-btn sys-settings-btn-primary"
            >
              <FaPlus /> Thêm Category
            </button>
          </section>

          {/* Equipment */}
          <section className="sys-settings-section">
            <h3 className="sys-settings-subsection-title">Equipment</h3>
            {equipmentData.equipment.map((item, index) => (
              <div key={index} className="sys-settings-card">
                <input
                  type="text"
                  value={item.category}
                  onChange={(e) => handleArrayChange(setEquipmentData, 'equipment', index, 'category', e.target.value)}
                  placeholder="Danh mục"
                  className="sys-settings-input"
                />
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => handleArrayChange(setEquipmentData, 'equipment', index, 'name', e.target.value)}
                  placeholder="Tên"
                  className="sys-settings-input"
                />
                <input
                  type="text"
                  value={item.brand}
                  onChange={(e) => handleArrayChange(setEquipmentData, 'equipment', index, 'brand', e.target.value)}
                  placeholder="Thương hiệu"
                  className="sys-settings-input"
                />
                <input
                  type="text"
                  value={item.origin}
                  onChange={(e) => handleArrayChange(setEquipmentData, 'equipment', index, 'origin', e.target.value)}
                  placeholder="Xuất xứ"
                  className="sys-settings-input"
                />
                <input
                  type="text"
                  value={item.year}
                  onChange={(e) => handleArrayChange(setEquipmentData, 'equipment', index, 'year', e.target.value)}
                  placeholder="Năm"
                  className="sys-settings-input"
                />
                <input
                  type="text"
                  value={item.image}
                  onChange={(e) => handleArrayChange(setEquipmentData, 'equipment', index, 'image', e.target.value)}
                  placeholder="URL hình ảnh"
                  className="sys-settings-input"
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleArrayImageUpload(setEquipmentData, 'equipment', index, 'image', e.target.files[0])}
                  className="sys-settings-file-input"
                />
                {item.image && <img src={item.image} alt="Equipment" className="sys-settings-preview-img" />}
                
                <h4 className="sys-settings-subitem-title">Features:</h4>
                {(item.features || []).map((feature, subIndex) => (
                  <div key={subIndex} className="sys-settings-subitem">
                    <input
                      type="text"
                      value={feature}
                      onChange={(e) => handleSubArrayChange(setEquipmentData, 'equipment', index, 'features', subIndex, e.target.value)}
                      placeholder="Feature"
                      className="sys-settings-input-inline"
                    />
                    <button
                      onClick={() => removeSubArrayItem(setEquipmentData, 'equipment', index, 'features', subIndex)}
                      className="sys-settings-btn sys-settings-btn-danger-sm"
                    >
                      <FaTrash />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addSubArrayItem(setEquipmentData, 'equipment', index, 'features')}
                  className="sys-settings-btn sys-settings-btn-secondary-sm"
                >
                  <FaPlus /> Thêm Feature
                </button>
                
                <h4 className="sys-settings-subitem-title">Applications:</h4>
                {(item.applications || []).map((app, subIndex) => (
                  <div key={subIndex} className="sys-settings-subitem">
                    <input
                      type="text"
                      value={app}
                      onChange={(e) => handleSubArrayChange(setEquipmentData, 'equipment', index, 'applications', subIndex, e.target.value)}
                      placeholder="Application"
                      className="sys-settings-input-inline"
                    />
                    <button
                      onClick={() => removeSubArrayItem(setEquipmentData, 'equipment', index, 'applications', subIndex)}
                      className="sys-settings-btn sys-settings-btn-danger-sm"
                    >
                      <FaTrash />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addSubArrayItem(setEquipmentData, 'equipment', index, 'applications')}
                  className="sys-settings-btn sys-settings-btn-secondary-sm"
                >
                  <FaPlus /> Thêm Application
                </button>
                
                <button
                  onClick={() => removeArrayItem(setEquipmentData, 'equipment', index)}
                  className="sys-settings-btn sys-settings-btn-danger"
                >
                  <FaTrash /> Xóa Equipment
                </button>
              </div>
            ))}
            <button
              onClick={() => addArrayItem(setEquipmentData, 'equipment', { ...defaults.equipmentItem, features: [], applications: [] })}
              className="sys-settings-btn sys-settings-btn-primary"
            >
              <FaPlus /> Thêm Equipment
            </button>
          </section>

          {/* Stats */}
          <section className="sys-settings-section">
            <h3 className="sys-settings-subsection-title">Stats</h3>
            {equipmentData.stats.map((item, index) => (
              <div key={index} className="sys-settings-card">
                <input
                  type="text"
                  value={item.number}
                  onChange={(e) => handleArrayChange(setEquipmentData, 'stats', index, 'number', e.target.value)}
                  placeholder="Số liệu"
                  className="sys-settings-input"
                />
                <input
                  type="text"
                  value={item.label}
                  onChange={(e) => handleArrayChange(setEquipmentData, 'stats', index, 'label', e.target.value)}
                  placeholder="Nhãn"
                  className="sys-settings-input"
                />
                <button
                  onClick={() => removeArrayItem(setEquipmentData, 'stats', index)}
                  className="sys-settings-btn sys-settings-btn-danger"
                >
                  <FaTrash /> Xóa
                </button>
              </div>
            ))}
            <button
              onClick={() => addArrayItem(setEquipmentData, 'stats', defaults.equipmentStat)}
              className="sys-settings-btn sys-settings-btn-primary"
            >
              <FaPlus /> Thêm Stat
            </button>
          </section>

          <button
            onClick={() => saveSettings('equipment', equipmentData)}
            className="sys-settings-btn sys-settings-btn-success sys-settings-btn-save"
            disabled={loading}
          >
            <FaSave /> Lưu Equipment Settings
          </button>
        </TabPanel>
      </Tabs>
    </div>
  );
};

export default SystemSettingsPage;