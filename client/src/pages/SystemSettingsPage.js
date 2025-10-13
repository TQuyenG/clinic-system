// src/pages/SystemSettingsPage.js
import React, { useState, useEffect } from 'react';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import axios from 'axios';
import { FaSave, FaUpload, FaTrash, FaPlus } from 'react-icons/fa';
import './SystemSettingsPage.css';

const SystemSettingsPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // State cho Home Page
  const [homeData, setHomeData] = useState({
    bannerSlides: [],
    features: [],
    stats: [],
    testimonials: []
  });

  // State cho About Page
  const [aboutData, setAboutData] = useState({
    milestones: [],
    values: [],
    achievements: [],
    leadership: [],
    facilities: []
  });

  // State cho Facilities Page
  const [facilitiesData, setFacilitiesData] = useState({
    facilities: [],
    amenities: [],
    gallery: []
  });

  // State cho Equipment Page
  const [equipmentData, setEquipmentData] = useState({
    categories: [],
    equipment: [],
    stats: []
  });

  // Hàm upload hình ảnh chung
  const uploadImage = async (file) => {
    if (!file) return null;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('upload', file);
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/upload/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });
      if (response.data.uploaded) {
        return response.data.url;
      }
      throw new Error('Upload thất bại');
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Fetch dữ liệu ban đầu
  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const homeRes = await axios.get('/api/system/settings/home', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setHomeData(homeRes.data);

        const aboutRes = await axios.get('/api/system/settings/about', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setAboutData(aboutRes.data);

        const facilitiesRes = await axios.get('/api/system/settings/facilities', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setFacilitiesData(facilitiesRes.data);

        const equipmentRes = await axios.get('/api/system/settings/equipment', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setEquipmentData(equipmentRes.data);
      } catch (err) {
        setError('Lỗi khi tải dữ liệu: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // Save hàm chung
  const saveSettings = async (page, data) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/system/settings/${page}`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Lưu thành công!');
    } catch (err) {
      setError('Lưu thất bại: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Generic handlers (giữ nguyên từ trước)
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
      const newSubArray = [...newArray[index][subArrayName]];
      newSubArray[subIndex] = value;
      newArray[index][subArrayName] = newSubArray;
      return { ...prev, [arrayName]: newArray };
    });
  };

  const addSubArrayItem = (setter, arrayName, index, subArrayName) => {
    setter(prev => {
      const newArray = [...prev[arrayName]];
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
        newItems.push({ url, title: file.name || '' });
      }
    }
    setter(prev => ({
      ...prev,
      [arrayName]: [...prev[arrayName], ...newItems]
    }));
  };

  // Default items (dựa trên cấu trúc)
  const defaultBanner = { title: '', subtitle: '', description: '', image: '' };
  const defaultFeature = { icon: '', title: '', description: '', color: '' };
  const defaultStat = { number: '', label: '', icon: '', color: '' };
  const defaultTestimonial = { name: '', comment: '', rating: 5, avatar: '' };

  const defaultMilestone = { year: '', title: '', description: '', image: '' };
  const defaultValue = { icon: '', title: '', description: '' };
  const defaultAchievement = { icon: '', title: '', year: '' };
  const defaultLeader = { name: '', position: '', description: '', image: '' };
  const defaultAboutFacility = { icon: '', title: '', description: '' };

  const defaultFacility = { icon: '', title: '', description: '', image: '', features: [] };
  const defaultAmenity = { icon: '', name: '' };
  const defaultGalleryItem = { url: '', title: '' };

  const defaultCategory = { id: '', name: '', icon: '' };
  const defaultEquipmentItem = { category: '', name: '', brand: '', origin: '', year: '', image: '', features: [], applications: [] };
  const defaultEquipmentStat = { number: '', label: '' };

  return (
    <div className="system-settings-page">
      <h1>Quản lý Hệ thống - Chỉnh sửa Trang Tĩnh</h1>
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      {loading && <div className="loading">Đang xử lý...</div>}

      <Tabs>
        <TabList>
          <Tab>Home Page</Tab>
          <Tab>About Page</Tab>
          <Tab>Facilities Page</Tab>
          <Tab>Equipment Page</Tab>
        </TabList>

        <TabPanel>
          <h2>Home Page Settings</h2>
          <section className="settings-section">
            <h3>Banner Slides</h3>
            {homeData.bannerSlides.map((item, index) => (
              <div key={index} className="edit-item">
                <input type="text" value={item.title} onChange={(e) => handleArrayChange(setHomeData, 'bannerSlides', index, 'title', e.target.value)} placeholder="Title" />
                <input type="text" value={item.subtitle} onChange={(e) => handleArrayChange(setHomeData, 'bannerSlides', index, 'subtitle', e.target.value)} placeholder="Subtitle" />
                <textarea value={item.description} onChange={(e) => handleArrayChange(setHomeData, 'bannerSlides', index, 'description', e.target.value)} placeholder="Description" />
                <input type="text" value={item.image} onChange={(e) => handleArrayChange(setHomeData, 'bannerSlides', index, 'image', e.target.value)} placeholder="Image URL" />
                <input type="file" onChange={(e) => handleArrayImageUpload(setHomeData, 'bannerSlides', index, 'image', e.target.files[0])} />
                {item.image && <img src={item.image} alt="Banner" className="preview-image" />}
                <button onClick={() => removeArrayItem(setHomeData, 'bannerSlides', index)} className="btn-remove"><FaTrash /> Xóa</button>
              </div>
            ))}
            <button onClick={() => addArrayItem(setHomeData, 'bannerSlides', defaultBanner)} className="btn-add"><FaPlus /> Thêm Slide</button>
          </section>

          <section className="settings-section">
            <h3>Features</h3>
            {homeData.features.map((item, index) => (
              <div key={index} className="edit-item">
                <input type="text" value={item.icon} onChange={(e) => handleArrayChange(setHomeData, 'features', index, 'icon', e.target.value)} placeholder="Icon (e.g. FaUserMd)" />
                <input type="text" value={item.title} onChange={(e) => handleArrayChange(setHomeData, 'features', index, 'title', e.target.value)} placeholder="Title" />
                <textarea value={item.description} onChange={(e) => handleArrayChange(setHomeData, 'features', index, 'description', e.target.value)} placeholder="Description" />
                <input type="text" value={item.color} onChange={(e) => handleArrayChange(setHomeData, 'features', index, 'color', e.target.value)} placeholder="Color (e.g. #4ade80)" />
                <button onClick={() => removeArrayItem(setHomeData, 'features', index)} className="btn-remove"><FaTrash /> Xóa</button>
              </div>
            ))}
            <button onClick={() => addArrayItem(setHomeData, 'features', defaultFeature)} className="btn-add"><FaPlus /> Thêm Feature</button>
          </section>

          <section className="settings-section">
            <h3>Stats</h3>
            {homeData.stats.map((item, index) => (
              <div key={index} className="edit-item">
                <input type="text" value={item.number} onChange={(e) => handleArrayChange(setHomeData, 'stats', index, 'number', e.target.value)} placeholder="Number" />
                <input type="text" value={item.label} onChange={(e) => handleArrayChange(setHomeData, 'stats', index, 'label', e.target.value)} placeholder="Label" />
                <input type="text" value={item.icon} onChange={(e) => handleArrayChange(setHomeData, 'stats', index, 'icon', e.target.value)} placeholder="Icon" />
                <input type="text" value={item.color} onChange={(e) => handleArrayChange(setHomeData, 'stats', index, 'color', e.target.value)} placeholder="Color" />
                <button onClick={() => removeArrayItem(setHomeData, 'stats', index)} className="btn-remove"><FaTrash /> Xóa</button>
              </div>
            ))}
            <button onClick={() => addArrayItem(setHomeData, 'stats', defaultStat)} className="btn-add"><FaPlus /> Thêm Stat</button>
          </section>

          <section className="settings-section">
            <h3>Testimonials</h3>
            {homeData.testimonials.map((item, index) => (
              <div key={index} className="edit-item">
                <input type="text" value={item.name} onChange={(e) => handleArrayChange(setHomeData, 'testimonials', index, 'name', e.target.value)} placeholder="Name" />
                <textarea value={item.comment} onChange={(e) => handleArrayChange(setHomeData, 'testimonials', index, 'comment', e.target.value)} placeholder="Comment" />
                <input type="number" value={item.rating} onChange={(e) => handleArrayChange(setHomeData, 'testimonials', index, 'rating', e.target.value)} placeholder="Rating" />
                <input type="text" value={item.avatar} onChange={(e) => handleArrayChange(setHomeData, 'testimonials', index, 'avatar', e.target.value)} placeholder="Avatar URL" />
                <input type="file" onChange={(e) => handleArrayImageUpload(setHomeData, 'testimonials', index, 'avatar', e.target.files[0])} />
                {item.avatar && <img src={item.avatar} alt="Avatar" className="preview-image" />}
                <button onClick={() => removeArrayItem(setHomeData, 'testimonials', index)} className="btn-remove"><FaTrash /> Xóa</button>
              </div>
            ))}
            <button onClick={() => addArrayItem(setHomeData, 'testimonials', defaultTestimonial)} className="btn-add"><FaPlus /> Thêm Testimonial</button>
          </section>

          <button onClick={() => saveSettings('home', homeData)} className="btn-save"><FaSave /> Lưu Home Settings</button>
        </TabPanel>

        <TabPanel>
          <h2>About Page Settings</h2>

          <section className="settings-section">
            <h3>Milestones</h3>
            {aboutData.milestones.map((item, index) => (
              <div key={index} className="edit-item">
                <input type="text" value={item.year} onChange={(e) => handleArrayChange(setAboutData, 'milestones', index, 'year', e.target.value)} placeholder="Year" />
                <input type="text" value={item.title} onChange={(e) => handleArrayChange(setAboutData, 'milestones', index, 'title', e.target.value)} placeholder="Title" />
                <textarea value={item.description} onChange={(e) => handleArrayChange(setAboutData, 'milestones', index, 'description', e.target.value)} placeholder="Description" />
                <input type="text" value={item.image} onChange={(e) => handleArrayChange(setAboutData, 'milestones', index, 'image', e.target.value)} placeholder="Image URL" />
                <input type="file" onChange={(e) => handleArrayImageUpload(setAboutData, 'milestones', index, 'image', e.target.files[0])} />
                {item.image && <img src={item.image} alt="Milestone" className="preview-image" />}
                <button onClick={() => removeArrayItem(setAboutData, 'milestones', index)} className="btn-remove"><FaTrash /> Xóa</button>
              </div>
            ))}
            <button onClick={() => addArrayItem(setAboutData, 'milestones', defaultMilestone)} className="btn-add"><FaPlus /> Thêm Milestone</button>
          </section>

          <section className="settings-section">
            <h3>Values</h3>
            {aboutData.values.map((item, index) => (
              <div key={index} className="edit-item">
                <input type="text" value={item.icon} onChange={(e) => handleArrayChange(setAboutData, 'values', index, 'icon', e.target.value)} placeholder="Icon" />
                <input type="text" value={item.title} onChange={(e) => handleArrayChange(setAboutData, 'values', index, 'title', e.target.value)} placeholder="Title" />
                <textarea value={item.description} onChange={(e) => handleArrayChange(setAboutData, 'values', index, 'description', e.target.value)} placeholder="Description" />
                <button onClick={() => removeArrayItem(setAboutData, 'values', index)} className="btn-remove"><FaTrash /> Xóa</button>
              </div>
            ))}
            <button onClick={() => addArrayItem(setAboutData, 'values', defaultValue)} className="btn-add"><FaPlus /> Thêm Value</button>
          </section>

          <section className="settings-section">
            <h3>Achievements</h3>
            {aboutData.achievements.map((item, index) => (
              <div key={index} className="edit-item">
                <input type="text" value={item.icon} onChange={(e) => handleArrayChange(setAboutData, 'achievements', index, 'icon', e.target.value)} placeholder="Icon" />
                <input type="text" value={item.title} onChange={(e) => handleArrayChange(setAboutData, 'achievements', index, 'title', e.target.value)} placeholder="Title" />
                <input type="text" value={item.year} onChange={(e) => handleArrayChange(setAboutData, 'achievements', index, 'year', e.target.value)} placeholder="Year" />
                <button onClick={() => removeArrayItem(setAboutData, 'achievements', index)} className="btn-remove"><FaTrash /> Xóa</button>
              </div>
            ))}
            <button onClick={() => addArrayItem(setAboutData, 'achievements', defaultAchievement)} className="btn-add"><FaPlus /> Thêm Achievement</button>
          </section>

          <section className="settings-section">
            <h3>Leadership</h3>
            {aboutData.leadership.map((item, index) => (
              <div key={index} className="edit-item">
                <input type="text" value={item.name} onChange={(e) => handleArrayChange(setAboutData, 'leadership', index, 'name', e.target.value)} placeholder="Name" />
                <input type="text" value={item.position} onChange={(e) => handleArrayChange(setAboutData, 'leadership', index, 'position', e.target.value)} placeholder="Position" />
                <textarea value={item.description} onChange={(e) => handleArrayChange(setAboutData, 'leadership', index, 'description', e.target.value)} placeholder="Description" />
                <input type="text" value={item.image} onChange={(e) => handleArrayChange(setAboutData, 'leadership', index, 'image', e.target.value)} placeholder="Image URL" />
                <input type="file" onChange={(e) => handleArrayImageUpload(setAboutData, 'leadership', index, 'image', e.target.files[0])} />
                {item.image && <img src={item.image} alt="Leader" className="preview-image" />}
                <button onClick={() => removeArrayItem(setAboutData, 'leadership', index)} className="btn-remove"><FaTrash /> Xóa</button>
              </div>
            ))}
            <button onClick={() => addArrayItem(setAboutData, 'leadership', defaultLeader)} className="btn-add"><FaPlus /> Thêm Leader</button>
          </section>

          <section className="settings-section">
            <h3>Facilities</h3>
            {aboutData.facilities.map((item, index) => (
              <div key={index} className="edit-item">
                <input type="text" value={item.icon} onChange={(e) => handleArrayChange(setAboutData, 'facilities', index, 'icon', e.target.value)} placeholder="Icon" />
                <input type="text" value={item.title} onChange={(e) => handleArrayChange(setAboutData, 'facilities', index, 'title', e.target.value)} placeholder="Title" />
                <textarea value={item.description} onChange={(e) => handleArrayChange(setAboutData, 'facilities', index, 'description', e.target.value)} placeholder="Description" />
                <button onClick={() => removeArrayItem(setAboutData, 'facilities', index)} className="btn-remove"><FaTrash /> Xóa</button>
              </div>
            ))}
            <button onClick={() => addArrayItem(setAboutData, 'facilities', defaultAboutFacility)} className="btn-add"><FaPlus /> Thêm Facility</button>
          </section>

          <button onClick={() => saveSettings('about', aboutData)} className="btn-save"><FaSave /> Lưu About Settings</button>
        </TabPanel>

        <TabPanel>
          <h2>Facilities Page Settings</h2>

          <section className="settings-section">
            <h3>Facilities</h3>
            {facilitiesData.facilities.map((item, index) => (
              <div key={index} className="edit-item">
                <input type="text" value={item.icon} onChange={(e) => handleArrayChange(setFacilitiesData, 'facilities', index, 'icon', e.target.value)} placeholder="Icon" />
                <input type="text" value={item.title} onChange={(e) => handleArrayChange(setFacilitiesData, 'facilities', index, 'title', e.target.value)} placeholder="Title" />
                <textarea value={item.description} onChange={(e) => handleArrayChange(setFacilitiesData, 'facilities', index, 'description', e.target.value)} placeholder="Description" />
                <input type="text" value={item.image} onChange={(e) => handleArrayChange(setFacilitiesData, 'facilities', index, 'image', e.target.value)} placeholder="Image URL" />
                <input type="file" onChange={(e) => handleArrayImageUpload(setFacilitiesData, 'facilities', index, 'image', e.target.files[0])} />
                {item.image && <img src={item.image} alt="Facility" className="preview-image" />}
                <h4>Features:</h4>
                {item.features.map((feature, subIndex) => (
                  <div key={subIndex} className="sub-item">
                    <input type="text" value={feature} onChange={(e) => handleSubArrayChange(setFacilitiesData, 'facilities', index, 'features', subIndex, e.target.value)} />
                    <button onClick={() => removeSubArrayItem(setFacilitiesData, 'facilities', index, 'features', subIndex)} className="btn-remove-sub"><FaTrash /></button>
                  </div>
                ))}
                <button onClick={() => addSubArrayItem(setFacilitiesData, 'facilities', index, 'features')} className="btn-add-sub"><FaPlus /> Thêm Feature</button>
                <button onClick={() => removeArrayItem(setFacilitiesData, 'facilities', index)} className="btn-remove"><FaTrash /> Xóa Facility</button>
              </div>
            ))}
            <button onClick={() => addArrayItem(setFacilitiesData, 'facilities', { ...defaultFacility, features: [] })} className="btn-add"><FaPlus /> Thêm Facility</button>
          </section>

          <section className="settings-section">
            <h3>Amenities</h3>
            {facilitiesData.amenities.map((item, index) => (
              <div key={index} className="edit-item">
                <input type="text" value={item.icon} onChange={(e) => handleArrayChange(setFacilitiesData, 'amenities', index, 'icon', e.target.value)} placeholder="Icon" />
                <input type="text" value={item.name} onChange={(e) => handleArrayChange(setFacilitiesData, 'amenities', index, 'name', e.target.value)} placeholder="Name" />
                <button onClick={() => removeArrayItem(setFacilitiesData, 'amenities', index)} className="btn-remove"><FaTrash /> Xóa</button>
              </div>
            ))}
            <button onClick={() => addArrayItem(setFacilitiesData, 'amenities', defaultAmenity)} className="btn-add"><FaPlus /> Thêm Amenity</button>
          </section>

          <section className="settings-section">
            <h3>Gallery</h3>
            <input type="file" multiple onChange={(e) => handleMultipleUpload(setFacilitiesData, 'gallery', e.target.files)} />
            <div className="gallery-preview">
              {facilitiesData.gallery.map((item, index) => (
                <div key={index} className="gallery-item">
                  <img src={item.url} alt={item.title} className="preview-image" />
                  <input type="text" value={item.title} onChange={(e) => handleArrayChange(setFacilitiesData, 'gallery', index, 'title', e.target.value)} placeholder="Title" />
                  <button onClick={() => removeArrayItem(setFacilitiesData, 'gallery', index)} className="btn-remove"><FaTrash /> Xóa</button>
                </div>
              ))}
            </div>
          </section>

          <button onClick={() => saveSettings('facilities', facilitiesData)} className="btn-save"><FaSave /> Lưu Facilities Settings</button>
        </TabPanel>

        <TabPanel>
          <h2>Equipment Page Settings</h2>

          <section className="settings-section">
            <h3>Categories</h3>
            {equipmentData.categories.map((item, index) => (
              <div key={index} className="edit-item">
                <input type="text" value={item.id} onChange={(e) => handleArrayChange(setEquipmentData, 'categories', index, 'id', e.target.value)} placeholder="ID" />
                <input type="text" value={item.name} onChange={(e) => handleArrayChange(setEquipmentData, 'categories', index, 'name', e.target.value)} placeholder="Name" />
                <input type="text" value={item.icon} onChange={(e) => handleArrayChange(setEquipmentData, 'categories', index, 'icon', e.target.value)} placeholder="Icon" />
                <button onClick={() => removeArrayItem(setEquipmentData, 'categories', index)} className="btn-remove"><FaTrash /> Xóa</button>
              </div>
            ))}
            <button onClick={() => addArrayItem(setEquipmentData, 'categories', defaultCategory)} className="btn-add"><FaPlus /> Thêm Category</button>
          </section>

          <section className="settings-section">
            <h3>Equipment</h3>
            {equipmentData.equipment.map((item, index) => (
              <div key={index} className="edit-item">
                <input type="text" value={item.category} onChange={(e) => handleArrayChange(setEquipmentData, 'equipment', index, 'category', e.target.value)} placeholder="Category" />
                <input type="text" value={item.name} onChange={(e) => handleArrayChange(setEquipmentData, 'equipment', index, 'name', e.target.value)} placeholder="Name" />
                <input type="text" value={item.brand} onChange={(e) => handleArrayChange(setEquipmentData, 'equipment', index, 'brand', e.target.value)} placeholder="Brand" />
                <input type="text" value={item.origin} onChange={(e) => handleArrayChange(setEquipmentData, 'equipment', index, 'origin', e.target.value)} placeholder="Origin" />
                <input type="text" value={item.year} onChange={(e) => handleArrayChange(setEquipmentData, 'equipment', index, 'year', e.target.value)} placeholder="Year" />
                <input type="text" value={item.image} onChange={(e) => handleArrayChange(setEquipmentData, 'equipment', index, 'image', e.target.value)} placeholder="Image URL" />
                <input type="file" onChange={(e) => handleArrayImageUpload(setEquipmentData, 'equipment', index, 'image', e.target.files[0])} />
                {item.image && <img src={item.image} alt="Equipment" className="preview-image" />}
                <h4>Features:</h4>
                {item.features.map((feature, subIndex) => (
                  <div key={subIndex} className="sub-item">
                    <input type="text" value={feature} onChange={(e) => handleSubArrayChange(setEquipmentData, 'equipment', index, 'features', subIndex, e.target.value)} />
                    <button onClick={() => removeSubArrayItem(setEquipmentData, 'equipment', index, 'features', subIndex)} className="btn-remove-sub"><FaTrash /></button>
                  </div>
                ))}
                <button onClick={() => addSubArrayItem(setEquipmentData, 'equipment', index, 'features')} className="btn-add-sub"><FaPlus /> Thêm Feature</button>
                <h4>Applications:</h4>
                {item.applications.map((app, subIndex) => (
                  <div key={subIndex} className="sub-item">
                    <input type="text" value={app} onChange={(e) => handleSubArrayChange(setEquipmentData, 'equipment', index, 'applications', subIndex, e.target.value)} />
                    <button onClick={() => removeSubArrayItem(setEquipmentData, 'equipment', index, 'applications', subIndex)} className="btn-remove-sub"><FaTrash /></button>
                  </div>
                ))}
                <button onClick={() => addSubArrayItem(setEquipmentData, 'equipment', index, 'applications')} className="btn-add-sub"><FaPlus /> Thêm Application</button>
                <button onClick={() => removeArrayItem(setEquipmentData, 'equipment', index)} className="btn-remove"><FaTrash /> Xóa Equipment</button>
              </div>
            ))}
            <button onClick={() => addArrayItem(setEquipmentData, 'equipment', { ...defaultEquipmentItem, features: [], applications: [] })} className="btn-add"><FaPlus /> Thêm Equipment</button>
          </section>

          <section className="settings-section">
            <h3>Stats</h3>
            {equipmentData.stats.map((item, index) => (
              <div key={index} className="edit-item">
                <input type="text" value={item.number} onChange={(e) => handleArrayChange(setEquipmentData, 'stats', index, 'number', e.target.value)} placeholder="Number" />
                <input type="text" value={item.label} onChange={(e) => handleArrayChange(setEquipmentData, 'stats', index, 'label', e.target.value)} placeholder="Label" />
                <button onClick={() => removeArrayItem(setEquipmentData, 'stats', index)} className="btn-remove"><FaTrash /> Xóa</button>
              </div>
            ))}
            <button onClick={() => addArrayItem(setEquipmentData, 'stats', defaultEquipmentStat)} className="btn-add"><FaPlus /> Thêm Stat</button>
          </section>

          <button onClick={() => saveSettings('equipment', equipmentData)} className="btn-save"><FaSave /> Lưu Equipment Settings</button>
        </TabPanel>
      </Tabs>
    </div>
  );
};

export default SystemSettingsPage;