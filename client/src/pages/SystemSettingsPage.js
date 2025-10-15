import React, { useState, useEffect } from 'react';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import axios from 'axios';
import { FaSave, FaUpload, FaTrash, FaPlus } from 'react-icons/fa';
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

  // Base URL for API requests (matching HomePage.js)
  const API_BASE_URL = 'http://localhost:3001/api';

  // Common headers with authentication
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
        const endpoints = [
          { url: `${API_BASE_URL}/settings/home`, setter: setHomeData, default: { bannerSlides: [], features: [], stats: [], testimonials: [] } },
          { url: `${API_BASE_URL}/system/about`, setter: setAboutData, default: { milestones: [], values: [], achievements: [], leadership: [], facilities: [] } },
          { url: `${API_BASE_URL}/system/facilities`, setter: setFacilitiesData, default: { facilities: [], amenities: [], gallery: [] } },
          { url: `${API_BASE_URL}/system/equipment`, setter: setEquipmentData, default: { categories: [], equipment: [], stats: [] } }
        ];

        const promises = endpoints.map(async ({ url, setter, default: defaultData }) => {
          try {
            const response = await axios.get(url, { headers: getHeaders() });
            setter(response.data || defaultData);
          } catch (err) {
            console.error(`Error fetching ${url}:`, err);
            setter(defaultData); // Fallback to default if API fails
            throw new Error(`Failed to fetch ${url}: ${err.message}`);
          }
        });

        await Promise.all(promises);
      } catch (err) {
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
    } catch (err) {
      setError(`Lưu ${page} thất bại: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Generic handler for array items
  const handleArrayChange = (setter, arrayName, index, field, value) => {
    setter(prev => {
      const newArray = [...prev[arrayName]];
      newArray[index][field] = value;
      return { ...prev, [arrayName]: newArray };
    });
  };

  // Handle image upload for arrays
  const handleArrayImageUpload = async (setter, arrayName, index, field, file) => {
    const url = await uploadImage(file);
    if (url) {
      handleArrayChange(setter, arrayName, index, field, url);
    }
  };

  // Add new item to array
  const addArrayItem = (setter, arrayName, defaultItem) => {
    setter(prev => ({
      ...prev,
      [arrayName]: [...prev[arrayName], { ...defaultItem }]
    }));
  };

  // Remove item from array
  const removeArrayItem = (setter, arrayName, index) => {
    setter(prev => ({
      ...prev,
      [arrayName]: prev[arrayName].filter((_, i) => i !== index)
    }));
  };

  // Handle sub-array changes (e.g., features, applications)
  const handleSubArrayChange = (setter, arrayName, index, subArrayName, subIndex, value) => {
    setter(prev => {
      const newArray = [...prev[arrayName]];
      const newSubArray = [...newArray[index][subArrayName]];
      newSubArray[subIndex] = value;
      newArray[index][subArrayName] = newSubArray;
      return { ...prev, [arrayName]: newArray };
    });
  };

  // Add sub-array item
  const addSubArrayItem = (setter, arrayName, index, subArrayName) => {
    setter(prev => {
      const newArray = [...prev[arrayName]];
      newArray[index][subArrayName] = [...newArray[index][subArrayName], ''];
      return { ...prev, [arrayName]: newArray };
    });
  };

  // Remove sub-array item
  const removeSubArrayItem = (setter, arrayName, index, subArrayName, subIndex) => {
    setter(prev => {
      const newArray = [...prev[arrayName]];
      newArray[index][subArrayName] = newArray[index][subArrayName].filter((_, i) => i !== subIndex);
      return { ...prev, [arrayName]: newArray };
    });
  };

  // Handle multiple image uploads for gallery
  const handleMultipleUpload = async (setter, arrayName, files) => {
    const newItems = [];
    for (let file of Array.from(files)) {
      const url = await uploadImage(file);
      if (url) {
        newItems.push({ url, title: file.name });
      }
    }
    setter(prev => ({
      ...prev,
      [arrayName]: [...prev[arrayName], ...newItems]
    }));
  };

  // Default data structures
  const defaultBanner = { title: '', subtitle: '', description: '', image: '' };
  const defaultFeature = { icon: '', title: '', description: '', color: '#4ade80' };
  const defaultStat = { number: '', label: '', icon: '', color: '#4ade80' };
  const defaultTestimonial = { name: '', comment: '', rating: 5, avatar: '' };
  const defaultMilestone = { year: '', title: '', description: '', image: '' };
  const defaultValue = { icon: '', title: '', description: '' };
  const defaultAchievement = { icon: '', title: '', year: '' };
  const defaultLeader = { name: '', position: '', image: '', description: '' };
  const defaultAboutFacility = { icon: '', title: '', description: '' };
  const defaultFacility = { icon: '', title: '', description: '', image: '', features: [] };
  const defaultAmenity = { icon: '', name: '' };
  const defaultGalleryItem = { url: '', title: '' };
  const defaultCategory = { id: '', name: '', icon: '' };
  const defaultEquipmentItem = { category: '', name: '', brand: '', origin: '', year: '', image: '', features: [], applications: [] };
  const defaultEquipmentStat = { number: '', label: '' };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Quản lý Hệ thống - Chỉnh sửa Trang Tĩnh</h1>
      {error && <div className="bg-red-100 text-red-700 p-2 mb-4 rounded">{error}</div>}
      {success && <div className="bg-green-100 text-green-700 p-2 mb-4 rounded">{success}</div>}
      {loading && <div className="text-center">Đang xử lý...</div>}

      <Tabs className="mt-4">
        <TabList className="flex border-b">
          <Tab className="px-4 py-2 cursor-pointer hover:bg-gray-100">Home Page</Tab>
          <Tab className="px-4 py-2 cursor-pointer hover:bg-gray-100">About Page</Tab>
          <Tab className="px-4 py-2 cursor-pointer hover:bg-gray-100">Facilities Page</Tab>
          <Tab className="px-4 py-2 cursor-pointer hover:bg-gray-100">Equipment Page</Tab>
        </TabList>

        <TabPanel className="mt-4">
          <h2 className="text-xl font-semibold mb-2">Home Page Settings</h2>

          {/* Banner Slides */}
          <section className="mb-4">
            <h3 className="text-lg font-medium">Banner Slides</h3>
            {homeData.bannerSlides.map((item, index) => (
              <div key={index} className="border p-4 mb-2 rounded">
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => handleArrayChange(setHomeData, 'bannerSlides', index, 'title', e.target.value)}
                  placeholder="Tiêu đề"
                  className="w-full p-2 mb-2 border rounded"
                  required
                />
                <input
                  type="text"
                  value={item.subtitle}
                  onChange={(e) => handleArrayChange(setHomeData, 'bannerSlides', index, 'subtitle', e.target.value)}
                  placeholder="Phụ đề"
                  className="w-full p-2 mb-2 border rounded"
                />
                <textarea
                  value={item.description}
                  onChange={(e) => handleArrayChange(setHomeData, 'bannerSlides', index, 'description', e.target.value)}
                  placeholder="Mô tả"
                  className="w-full p-2 mb-2 border rounded"
                />
                <input
                  type="text"
                  value={item.image}
                  onChange={(e) => handleArrayChange(setHomeData, 'bannerSlides', index, 'image', e.target.value)}
                  placeholder="URL hình ảnh"
                  className="w-full p-2 mb-2 border rounded"
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleArrayImageUpload(setHomeData, 'bannerSlides', index, 'image', e.target.files[0])}
                  className="mb-2"
                />
                {item.image && <img src={item.image} alt="Banner" className="w-32 h-32 object-cover mb-2" />}
                <button
                  onClick={() => removeArrayItem(setHomeData, 'bannerSlides', index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <FaTrash /> Xóa
                </button>
              </div>
            ))}
            <button
              onClick={() => addArrayItem(setHomeData, 'bannerSlides', defaultBanner)}
              className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
            >
              <FaPlus /> Thêm Slide
            </button>
          </section>

          {/* Features */}
          <section className="mb-4">
            <h3 className="text-lg font-medium">Features</h3>
            {homeData.features.map((item, index) => (
              <div key={index} className="border p-4 mb-2 rounded">
                <input
                  type="text"
                  value={item.icon}
                  onChange={(e) => handleArrayChange(setHomeData, 'features', index, 'icon', e.target.value)}
                  placeholder="Icon (e.g. <FaUserMd />)"
                  className="w-full p-2 mb-2 border rounded"
                />
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => handleArrayChange(setHomeData, 'features', index, 'title', e.target.value)}
                  placeholder="Tiêu đề"
                  className="w-full p-2 mb-2 border rounded"
                  required
                />
                <textarea
                  value={item.description}
                  onChange={(e) => handleArrayChange(setHomeData, 'features', index, 'description', e.target.value)}
                  placeholder="Mô tả"
                  className="w-full p-2 mb-2 border rounded"
                />
                <input
                  type="text"
                  value={item.color}
                  onChange={(e) => handleArrayChange(setHomeData, 'features', index, 'color', e.target.value)}
                  placeholder="Màu (e.g. #4ade80)"
                  className="w-full p-2 mb-2 border rounded"
                />
                <button
                  onClick={() => removeArrayItem(setHomeData, 'features', index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <FaTrash /> Xóa
                </button>
              </div>
            ))}
            <button
              onClick={() => addArrayItem(setHomeData, 'features', defaultFeature)}
              className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
            >
              <FaPlus /> Thêm Feature
            </button>
          </section>

          {/* Stats */}
          <section className="mb-4">
            <h3 className="text-lg font-medium">Stats</h3>
            {homeData.stats.map((item, index) => (
              <div key={index} className="border p-4 mb-2 rounded">
                <input
                  type="text"
                  value={item.number}
                  onChange={(e) => handleArrayChange(setHomeData, 'stats', index, 'number', e.target.value)}
                  placeholder="Số liệu"
                  className="w-full p-2 mb-2 border rounded"
                  required
                />
                <input
                  type="text"
                  value={item.label}
                  onChange={(e) => handleArrayChange(setHomeData, 'stats', index, 'label', e.target.value)}
                  placeholder="Nhãn"
                  className="w-full p-2 mb-2 border rounded"
                  required
                />
                <input
                  type="text"
                  value={item.icon}
                  onChange={(e) => handleArrayChange(setHomeData, 'stats', index, 'icon', e.target.value)}
                  placeholder="Icon"
                  className="w-full p-2 mb-2 border rounded"
                />
                <input
                  type="text"
                  value={item.color}
                  onChange={(e) => handleArrayChange(setHomeData, 'stats', index, 'color', e.target.value)}
                  placeholder="Màu"
                  className="w-full p-2 mb-2 border rounded"
                />
                <button
                  onClick={() => removeArrayItem(setHomeData, 'stats', index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <FaTrash /> Xóa
                </button>
              </div>
            ))}
            <button
              onClick={() => addArrayItem(setHomeData, 'stats', defaultStat)}
              className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
            >
              <FaPlus /> Thêm Stat
            </button>
          </section>

          {/* Testimonials */}
          <section className="mb-4">
            <h3 className="text-lg font-medium">Testimonials</h3>
            {homeData.testimonials.map((item, index) => (
              <div key={index} className="border p-4 mb-2 rounded">
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => handleArrayChange(setHomeData, 'testimonials', index, 'name', e.target.value)}
                  placeholder="Tên"
                  className="w-full p-2 mb-2 border rounded"
                  required
                />
                <textarea
                  value={item.comment}
                  onChange={(e) => handleArrayChange(setHomeData, 'testimonials', index, 'comment', e.target.value)}
                  placeholder="Bình luận"
                  className="w-full p-2 mb-2 border rounded"
                  required
                />
                <input
                  type="number"
                  value={item.rating}
                  onChange={(e) => handleArrayChange(setHomeData, 'testimonials', index, 'rating', Number(e.target.value))}
                  placeholder="Đánh giá (1-5)"
                  min="1"
                  max="5"
                  className="w-full p-2 mb-2 border rounded"
                  required
                />
                <input
                  type="text"
                  value={item.avatar}
                  onChange={(e) => handleArrayChange(setHomeData, 'testimonials', index, 'avatar', e.target.value)}
                  placeholder="URL ảnh đại diện"
                  className="w-full p-2 mb-2 border rounded"
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleArrayImageUpload(setHomeData, 'testimonials', index, 'avatar', e.target.files[0])}
                  className="mb-2"
                />
                {item.avatar && <img src={item.avatar} alt="Avatar" className="w-32 h-32 object-cover mb-2" />}
                <button
                  onClick={() => removeArrayItem(setHomeData, 'testimonials', index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <FaTrash /> Xóa
                </button>
              </div>
            ))}
            <button
              onClick={() => addArrayItem(setHomeData, 'testimonials', defaultTestimonial)}
              className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
            >
              <FaPlus /> Thêm Testimonial
            </button>
          </section>

          <button
            onClick={() => saveSettings('home', homeData)}
            className="bg-green-500 text-white p-2 rounded hover:bg-green-600"
            disabled={loading}
          >
            <FaSave /> Lưu Home Settings
          </button>
        </TabPanel>

        <TabPanel className="mt-4">
          <h2 className="text-xl font-semibold mb-2">About Page Settings</h2>

          {/* Milestones */}
          <section className="mb-4">
            <h3 className="text-lg font-medium">Milestones</h3>
            {aboutData.milestones.map((item, index) => (
              <div key={index} className="border p-4 mb-2 rounded">
                <input
                  type="text"
                  value={item.year}
                  onChange={(e) => handleArrayChange(setAboutData, 'milestones', index, 'year', e.target.value)}
                  placeholder="Năm"
                  className="w-full p-2 mb-2 border rounded"
                  required
                />
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => handleArrayChange(setAboutData, 'milestones', index, 'title', e.target.value)}
                  placeholder="Tiêu đề"
                  className="w-full p-2 mb-2 border rounded"
                  required
                />
                <textarea
                  value={item.description}
                  onChange={(e) => handleArrayChange(setAboutData, 'milestones', index, 'description', e.target.value)}
                  placeholder="Mô tả"
                  className="w-full p-2 mb-2 border rounded"
                />
                <input
                  type="text"
                  value={item.image}
                  onChange={(e) => handleArrayChange(setAboutData, 'milestones', index, 'image', e.target.value)}
                  placeholder="URL hình ảnh"
                  className="w-full p-2 mb-2 border rounded"
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleArrayImageUpload(setAboutData, 'milestones', index, 'image', e.target.files[0])}
                  className="mb-2"
                />
                {item.image && <img src={item.image} alt="Milestone" className="w-32 h-32 object-cover mb-2" />}
                <button
                  onClick={() => removeArrayItem(setAboutData, 'milestones', index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <FaTrash /> Xóa
                </button>
              </div>
            ))}
            <button
              onClick={() => addArrayItem(setAboutData, 'milestones', defaultMilestone)}
              className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
            >
              <FaPlus /> Thêm Milestone
            </button>
          </section>

          {/* Values */}
          <section className="mb-4">
            <h3 className="text-lg font-medium">Values</h3>
            {aboutData.values.map((item, index) => (
              <div key={index} className="border p-4 mb-2 rounded">
                <input
                  type="text"
                  value={item.icon}
                  onChange={(e) => handleArrayChange(setAboutData, 'values', index, 'icon', e.target.value)}
                  placeholder="Icon"
                  className="w-full p-2 mb-2 border rounded"
                />
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => handleArrayChange(setAboutData, 'values', index, 'title', e.target.value)}
                  placeholder="Tiêu đề"
                  className="w-full p-2 mb-2 border rounded"
                  required
                />
                <textarea
                  value={item.description}
                  onChange={(e) => handleArrayChange(setAboutData, 'values', index, 'description', e.target.value)}
                  placeholder="Mô tả"
                  className="w-full p-2 mb-2 border rounded"
                />
                <button
                  onClick={() => removeArrayItem(setAboutData, 'values', index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <FaTrash /> Xóa
                </button>
              </div>
            ))}
            <button
              onClick={() => addArrayItem(setAboutData, 'values', defaultValue)}
              className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
            >
              <FaPlus /> Thêm Value
            </button>
          </section>

          {/* Achievements */}
          <section className="mb-4">
            <h3 className="text-lg font-medium">Achievements</h3>
            {aboutData.achievements.map((item, index) => (
              <div key={index} className="border p-4 mb-2 rounded">
                <input
                  type="text"
                  value={item.icon}
                  onChange={(e) => handleArrayChange(setAboutData, 'achievements', index, 'icon', e.target.value)}
                  placeholder="Icon"
                  className="w-full p-2 mb-2 border rounded"
                />
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => handleArrayChange(setAboutData, 'achievements', index, 'title', e.target.value)}
                  placeholder="Tiêu đề"
                  className="w-full p-2 mb-2 border rounded"
                  required
                />
                <input
                  type="text"
                  value={item.year}
                  onChange={(e) => handleArrayChange(setAboutData, 'achievements', index, 'year', e.target.value)}
                  placeholder="Năm"
                  className="w-full p-2 mb-2 border rounded"
                />
                <button
                  onClick={() => removeArrayItem(setAboutData, 'achievements', index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <FaTrash /> Xóa
                </button>
              </div>
            ))}
            <button
              onClick={() => addArrayItem(setAboutData, 'achievements', defaultAchievement)}
              className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
            >
              <FaPlus /> Thêm Achievement
            </button>
          </section>

          {/* Leadership */}
          <section className="mb-4">
            <h3 className="text-lg font-medium">Leadership</h3>
            {aboutData.leadership.map((item, index) => (
              <div key={index} className="border p-4 mb-2 rounded">
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => handleArrayChange(setAboutData, 'leadership', index, 'name', e.target.value)}
                  placeholder="Tên"
                  className="w-full p-2 mb-2 border rounded"
                  required
                />
                <input
                  type="text"
                  value={item.position}
                  onChange={(e) => handleArrayChange(setAboutData, 'leadership', index, 'position', e.target.value)}
                  placeholder="Chức vụ"
                  className="w-full p-2 mb-2 border rounded"
                  required
                />
                <textarea
                  value={item.description}
                  onChange={(e) => handleArrayChange(setAboutData, 'leadership', index, 'description', e.target.value)}
                  placeholder="Mô tả"
                  className="w-full p-2 mb-2 border rounded"
                />
                <input
                  type="text"
                  value={item.image}
                  onChange={(e) => handleArrayChange(setAboutData, 'leadership', index, 'image', e.target.value)}
                  placeholder="URL hình ảnh"
                  className="w-full p-2 mb-2 border rounded"
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleArrayImageUpload(setAboutData, 'leadership', index, 'image', e.target.files[0])}
                  className="mb-2"
                />
                {item.image && <img src={item.image} alt="Leader" className="w-32 h-32 object-cover mb-2" />}
                <button
                  onClick={() => removeArrayItem(setAboutData, 'leadership', index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <FaTrash /> Xóa
                </button>
              </div>
            ))}
            <button
              onClick={() => addArrayItem(setAboutData, 'leadership', defaultLeader)}
              className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
            >
              <FaPlus /> Thêm Leader
            </button>
          </section>

          {/* Facilities (About) */}
          <section className="mb-4">
            <h3 className="text-lg font-medium">Facilities</h3>
            {aboutData.facilities.map((item, index) => (
              <div key={index} className="border p-4 mb-2 rounded">
                <input
                  type="text"
                  value={item.icon}
                  onChange={(e) => handleArrayChange(setAboutData, 'facilities', index, 'icon', e.target.value)}
                  placeholder="Icon"
                  className="w-full p-2 mb-2 border rounded"
                />
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => handleArrayChange(setAboutData, 'facilities', index, 'title', e.target.value)}
                  placeholder="Tiêu đề"
                  className="w-full p-2 mb-2 border rounded"
                  required
                />
                <textarea
                  value={item.description}
                  onChange={(e) => handleArrayChange(setAboutData, 'facilities', index, 'description', e.target.value)}
                  placeholder="Mô tả"
                  className="w-full p-2 mb-2 border rounded"
                />
                <button
                  onClick={() => removeArrayItem(setAboutData, 'facilities', index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <FaTrash /> Xóa
                </button>
              </div>
            ))}
            <button
              onClick={() => addArrayItem(setAboutData, 'facilities', defaultAboutFacility)}
              className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
            >
              <FaPlus /> Thêm Facility
            </button>
          </section>

          <button
            onClick={() => saveSettings('about', aboutData)}
            className="bg-green-500 text-white p-2 rounded hover:bg-green-600"
            disabled={loading}
          >
            <FaSave /> Lưu About Settings
          </button>
        </TabPanel>

        <TabPanel className="mt-4">
          <h2 className="text-xl font-semibold mb-2">Facilities Page Settings</h2>

          {/* Facilities */}
          <section className="mb-4">
            <h3 className="text-lg font-medium">Facilities</h3>
            {facilitiesData.facilities.map((item, index) => (
              <div key={index} className="border p-4 mb-2 rounded">
                <input
                  type="text"
                  value={item.icon}
                  onChange={(e) => handleArrayChange(setFacilitiesData, 'facilities', index, 'icon', e.target.value)}
                  placeholder="Icon"
                  className="w-full p-2 mb-2 border rounded"
                />
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => handleArrayChange(setFacilitiesData, 'facilities', index, 'title', e.target.value)}
                  placeholder="Tiêu đề"
                  className="w-full p-2 mb-2 border rounded"
                  required
                />
                <textarea
                  value={item.description}
                  onChange={(e) => handleArrayChange(setFacilitiesData, 'facilities', index, 'description', e.target.value)}
                  placeholder="Mô tả"
                  className="w-full p-2 mb-2 border rounded"
                />
                <input
                  type="text"
                  value={item.image}
                  onChange={(e) => handleArrayChange(setFacilitiesData, 'facilities', index, 'image', e.target.value)}
                  placeholder="URL hình ảnh"
                  className="w-full p-2 mb-2 border rounded"
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleArrayImageUpload(setFacilitiesData, 'facilities', index, 'image', e.target.files[0])}
                  className="mb-2"
                />
                {item.image && <img src={item.image} alt="Facility" className="w-32 h-32 object-cover mb-2" />}
                <h4 className="font-medium">Features:</h4>
                {item.features.map((feature, subIndex) => (
                  <div key={subIndex} className="flex mb-2">
                    <input
                      type="text"
                      value={feature}
                      onChange={(e) => handleSubArrayChange(setFacilitiesData, 'facilities', index, 'features', subIndex, e.target.value)}
                      placeholder="Feature"
                      className="w-full p-2 border rounded"
                    />
                    <button
                      onClick={() => removeSubArrayItem(setFacilitiesData, 'facilities', index, 'features', subIndex)}
                      className="ml-2 text-red-500 hover:text-red-700"
                    >
                      <FaTrash />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addSubArrayItem(setFacilitiesData, 'facilities', index, 'features')}
                  className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
                >
                  <FaPlus /> Thêm Feature
                </button>
                <button
                  onClick={() => removeArrayItem(setFacilitiesData, 'facilities', index)}
                  className="text-red-500 hover:text-red-700 mt-2"
                >
                  <FaTrash /> Xóa Facility
                </button>
              </div>
            ))}
            <button
              onClick={() => addArrayItem(setFacilitiesData, 'facilities', { ...defaultFacility, features: [] })}
              className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
            >
              <FaPlus /> Thêm Facility
            </button>
          </section>

          {/* Amenities */}
          <section className="mb-4">
            <h3 className="text-lg font-medium">Amenities</h3>
            {facilitiesData.amenities.map((item, index) => (
              <div key={index} className="border p-4 mb-2 rounded">
                <input
                  type="text"
                  value={item.icon}
                  onChange={(e) => handleArrayChange(setFacilitiesData, 'amenities', index, 'icon', e.target.value)}
                  placeholder="Icon"
                  className="w-full p-2 mb-2 border rounded"
                />
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => handleArrayChange(setFacilitiesData, 'amenities', index, 'name', e.target.value)}
                  placeholder="Tên"
                  className="w-full p-2 mb-2 border rounded"
                  required
                />
                <button
                  onClick={() => removeArrayItem(setFacilitiesData, 'amenities', index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <FaTrash /> Xóa
                </button>
              </div>
            ))}
            <button
              onClick={() => addArrayItem(setFacilitiesData, 'amenities', defaultAmenity)}
              className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
            >
              <FaPlus /> Thêm Amenity
            </button>
          </section>

          {/* Gallery */}
          <section className="mb-4">
            <h3 className="text-lg font-medium">Gallery</h3>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => handleMultipleUpload(setFacilitiesData, 'gallery', e.target.files)}
              className="mb-2"
            />
            <div className="grid grid-cols-3 gap-4">
              {facilitiesData.gallery.map((item, index) => (
                <div key={index} className="border p-2 rounded">
                  <img src={item.url} alt={item.title} className="w-full h-32 object-cover mb-2" />
                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) => handleArrayChange(setFacilitiesData, 'gallery', index, 'title', e.target.value)}
                    placeholder="Tiêu đề"
                    className="w-full p-2 mb-2 border rounded"
                  />
                  <button
                    onClick={() => removeArrayItem(setFacilitiesData, 'gallery', index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <FaTrash /> Xóa
                  </button>
                </div>
              ))}
            </div>
          </section>

          <button
            onClick={() => saveSettings('facilities', facilitiesData)}
            className="bg-green-500 text-white p-2 rounded hover:bg-green-600"
            disabled={loading}
          >
            <FaSave /> Lưu Facilities Settings
          </button>
        </TabPanel>

        <TabPanel className="mt-4">
          <h2 className="text-xl font-semibold mb-2">Equipment Page Settings</h2>

          {/* Categories */}
          <section className="mb-4">
            <h3 className="text-lg font-medium">Categories</h3>
            {equipmentData.categories.map((item, index) => (
              <div key={index} className="border p-4 mb-2 rounded">
                <input
                  type="text"
                  value={item.id}
                  onChange={(e) => handleArrayChange(setEquipmentData, 'categories', index, 'id', e.target.value)}
                  placeholder="ID"
                  className="w-full p-2 mb-2 border rounded"
                  required
                />
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => handleArrayChange(setEquipmentData, 'categories', index, 'name', e.target.value)}
                  placeholder="Tên"
                  className="w-full p-2 mb-2 border rounded"
                  required
                />
                <input
                  type="text"
                  value={item.icon}
                  onChange={(e) => handleArrayChange(setEquipmentData, 'categories', index, 'icon', e.target.value)}
                  placeholder="Icon"
                  className="w-full p-2 mb-2 border rounded"
                />
                <button
                  onClick={() => removeArrayItem(setEquipmentData, 'categories', index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <FaTrash /> Xóa
                </button>
              </div>
            ))}
            <button
              onClick={() => addArrayItem(setEquipmentData, 'categories', defaultCategory)}
              className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
            >
              <FaPlus /> Thêm Category
            </button>
          </section>

          {/* Equipment */}
          <section className="mb-4">
            <h3 className="text-lg font-medium">Equipment</h3>
            {equipmentData.equipment.map((item, index) => (
              <div key={index} className="border p-4 mb-2 rounded">
                <input
                  type="text"
                  value={item.category}
                  onChange={(e) => handleArrayChange(setEquipmentData, 'equipment', index, 'category', e.target.value)}
                  placeholder="Danh mục"
                  className="w-full p-2 mb-2 border rounded"
                  required
                />
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => handleArrayChange(setEquipmentData, 'equipment', index, 'name', e.target.value)}
                  placeholder="Tên"
                  className="w-full p-2 mb-2 border rounded"
                  required
                />
                <input
                  type="text"
                  value={item.brand}
                  onChange={(e) => handleArrayChange(setEquipmentData, 'equipment', index, 'brand', e.target.value)}
                  placeholder="Thương hiệu"
                  className="w-full p-2 mb-2 border rounded"
                />
                <input
                  type="text"
                  value={item.origin}
                  onChange={(e) => handleArrayChange(setEquipmentData, 'equipment', index, 'origin', e.target.value)}
                  placeholder="Xuất xứ"
                  className="w-full p-2 mb-2 border rounded"
                />
                <input
                  type="text"
                  value={item.year}
                  onChange={(e) => handleArrayChange(setEquipmentData, 'equipment', index, 'year', e.target.value)}
                  placeholder="Năm"
                  className="w-full p-2 mb-2 border rounded"
                />
                <input
                  type="text"
                  value={item.image}
                  onChange={(e) => handleArrayChange(setEquipmentData, 'equipment', index, 'image', e.target.value)}
                  placeholder="URL hình ảnh"
                  className="w-full p-2 mb-2 border rounded"
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleArrayImageUpload(setEquipmentData, 'equipment', index, 'image', e.target.files[0])}
                  className="mb-2"
                />
                {item.image && <img src={item.image} alt="Equipment" className="w-32 h-32 object-cover mb-2" />}
                <h4 className="font-medium">Features:</h4>
                {item.features.map((feature, subIndex) => (
                  <div key={subIndex} className="flex mb-2">
                    <input
                      type="text"
                      value={feature}
                      onChange={(e) => handleSubArrayChange(setEquipmentData, 'equipment', index, 'features', subIndex, e.target.value)}
                      placeholder="Feature"
                      className="w-full p-2 border rounded"
                    />
                    <button
                      onClick={() => removeSubArrayItem(setEquipmentData, 'equipment', index, 'features', subIndex)}
                      className="ml-2 text-red-500 hover:text-red-700"
                    >
                      <FaTrash />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addSubArrayItem(setEquipmentData, 'equipment', index, 'features')}
                  className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
                >
                  <FaPlus /> Thêm Feature
                </button>
                <h4 className="font-medium mt-2">Applications:</h4>
                {item.applications.map((app, subIndex) => (
                  <div key={subIndex} className="flex mb-2">
                    <input
                      type="text"
                      value={app}
                      onChange={(e) => handleSubArrayChange(setEquipmentData, 'equipment', index, 'applications', subIndex, e.target.value)}
                      placeholder="Application"
                      className="w-full p-2 border rounded"
                    />
                    <button
                      onClick={() => removeSubArrayItem(setEquipmentData, 'equipment', index, 'applications', subIndex)}
                      className="ml-2 text-red-500 hover:text-red-700"
                    >
                      <FaTrash />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addSubArrayItem(setEquipmentData, 'equipment', index, 'applications')}
                  className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
                >
                  <FaPlus /> Thêm Application
                </button>
                <button
                  onClick={() => removeArrayItem(setEquipmentData, 'equipment', index)}
                  className="text-red-500 hover:text-red-700 mt-2"
                >
                  <FaTrash /> Xóa Equipment
                </button>
              </div>
            ))}
            <button
              onClick={() => addArrayItem(setEquipmentData, 'equipment', { ...defaultEquipmentItem, features: [], applications: [] })}
              className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
            >
              <FaPlus /> Thêm Equipment
            </button>
          </section>

          {/* Stats */}
          <section className="mb-4">
            <h3 className="text-lg font-medium">Stats</h3>
            {equipmentData.stats.map((item, index) => (
              <div key={index} className="border p-4 mb-2 rounded">
                <input
                  type="text"
                  value={item.number}
                  onChange={(e) => handleArrayChange(setEquipmentData, 'stats', index, 'number', e.target.value)}
                  placeholder="Số liệu"
                  className="w-full p-2 mb-2 border rounded"
                  required
                />
                <input
                  type="text"
                  value={item.label}
                  onChange={(e) => handleArrayChange(setEquipmentData, 'stats', index, 'label', e.target.value)}
                  placeholder="Nhãn"
                  className="w-full p-2 mb-2 border rounded"
                  required
                />
                <button
                  onClick={() => removeArrayItem(setEquipmentData, 'stats', index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <FaTrash /> Xóa
                </button>
              </div>
            ))}
            <button
              onClick={() => addArrayItem(setEquipmentData, 'stats', defaultEquipmentStat)}
              className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
            >
              <FaPlus /> Thêm Stat
            </button>
          </section>

          <button
            onClick={() => saveSettings('equipment', equipmentData)}
            className="bg-green-500 text-white p-2 rounded hover:bg-green-600"
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