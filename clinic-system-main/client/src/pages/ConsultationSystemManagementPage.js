// client/src/pages/ConsultationSystemManagementPage.js
// ✅ Trang quản lý hệ thống tư vấn cho Admin

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import systemService from '../services/systemService';
import { 
  FaSave, 
  FaUndo, 
  FaImage,
  FaPalette,
  FaToggleOn,
  FaToggleOff,
  FaEdit,
  FaCheck,
  FaTimes,
  FaBolt,
  FaComments,
  FaVideo,
  FaShieldAlt,
  FaWallet,
  FaUserMd,
  FaClock,
  FaCheckCircle,
  FaExclamationTriangle
} from 'react-icons/fa';
import './ConsultationSystemManagementPage.css';

const ConsultationSystemManagementPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('banner');
  const [showToast, setShowToast] = useState({ show: false, message: '', type: '' });
  const [hasChanges, setHasChanges] = useState(false);

  // State cho Banner Settings
  const [bannerSettings, setBannerSettings] = useState({
    background_image: '',
    title: 'Kết Nối Với Bác Sĩ Mọi Lúc, Mọi Nơi',
    subtitle: 'Tư vấn sức khỏe chuyên nghiệp với hơn 100+ bác sĩ chuyên khoa hàng đầu',
    badge_text: 'Tư Vấn Y Tế Trực Tuyến #1 Việt Nam',
    primary_color: '#667eea',
    secondary_color: '#764ba2'
  });

  // State cho Methods Settings
  const [methodsSettings, setMethodsSettings] = useState([
    {
      id: 'quick-chat',
      name: 'Chat Nhanh',
      subtitle: 'Phản hồi trong 2 phút',
      description: 'Tư vấn nhanh với bác sĩ đang online, phù hợp cho các vấn đề đơn giản',
      icon: 'bolt',
      color: '#667eea',
      price: 50000,
      duration: 15,
      enabled: true,
      badge: 'Phổ biến nhất',
      features: [
        'Kết nối tức thì với bác sĩ',
        'Không cần đặt lịch trước',
        'Phản hồi trong vài phút',
        'Phí từ 50,000đ/15 phút'
      ]
    },
    {
      id: 'chat',
      name: 'Tư Vấn Real-time',
      subtitle: 'Chat với bác sĩ theo lịch',
      description: 'Đặt lịch và tư vấn chi tiết với bác sĩ chuyên khoa qua chat',
      icon: 'comments',
      color: '#4facfe',
      price: 100000,
      duration: 30,
      enabled: true,
      badge: null,
      features: [
        'Đặt lịch với bác sĩ mong muốn',
        'Gửi ảnh, file đính kèm',
        'Lưu lịch sử tư vấn',
        'Phí từ 100,000đ/30 phút'
      ]
    },
    {
      id: 'video',
      name: 'Video Call',
      subtitle: 'Gặp mặt trực tiếp',
      description: 'Tư vấn trực tiếp qua video HD với bác sĩ chuyên khoa',
      icon: 'video',
      color: '#f093fb',
      price: 300000,
      duration: 30,
      enabled: true,
      badge: 'Chất lượng cao',
      features: [
        'Tư vấn qua video HD',
        'Chia sẻ màn hình, hình ảnh',
        'Ghi lại buổi tư vấn',
        'Phí từ 300,000đ/30 phút'
      ]
    }
  ]);

  // State cho Why Choose Settings
  const [whyChooseSettings, setWhyChooseSettings] = useState([
    {
      id: 'professional',
      icon: 'usermd',
      title: 'Đội Ngũ Chuyên Nghiệp',
      description: 'Hơn 100+ bác sĩ có chứng chỉ hành nghề, kinh nghiệm lâu năm trong điều trị',
      color: '#667eea'
    },
    {
      id: 'fast',
      icon: 'bolt',
      title: 'Phản Hồi Nhanh Chóng',
      description: 'Kết nối với bác sĩ trong vài phút, tư vấn mọi lúc mọi nơi 24/7',
      color: '#4facfe'
    },
    {
      id: 'secure',
      icon: 'shield',
      title: 'Bảo Mật Tuyệt Đối',
      description: 'Thông tin y tế được mã hóa và bảo vệ theo tiêu chuẩn quốc tế',
      color: '#4caf50'
    },
    {
      id: 'affordable',
      icon: 'wallet',
      title: 'Chi Phí Hợp Lý',
      description: 'Giá cả minh bạch, đa dạng gói tư vấn phù hợp với mọi túi tiền',
      color: '#f093fb'
    }
  ]);

  const [editingMethod, setEditingMethod] = useState(null);
  const [editingWhyChoose, setEditingWhyChoose] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await systemService.getConsultationSettings();
      
      if (response.banner) setBannerSettings(response.banner);
      if (response.methods) setMethodsSettings(response.methods);
      if (response.whyChoose) setWhyChooseSettings(response.whyChoose);
      
      setHasChanges(false);
    } catch (error) {
      console.error('Error fetching settings:', error);
      showNotification('Không thể tải cấu hình', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      
      const data = {
        banner: bannerSettings,
        methods: methodsSettings,
        whyChoose: whyChooseSettings
      };

      await systemService.updateConsultationSettings(data);
      
      showNotification('Lưu cấu hình thành công!', 'success');
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving settings:', error);
      showNotification('Lưu cấu hình thất bại', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetSettings = () => {
    if (window.confirm('Bạn có chắc muốn hủy tất cả thay đổi?')) {
      fetchSettings();
    }
  };

  const handleBannerChange = (field, value) => {
    setBannerSettings(prev => ({
      ...prev,
      [field]: value
    }));
    setHasChanges(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Preview image locally
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
      handleBannerChange('background_image', reader.result);
    };
    reader.readAsDataURL(file);

    // Upload to server (optional - if you want to store on server)
    try {
      const response = await systemService.uploadBannerImage(file);
      if (response.success && response.data.url) {
        handleBannerChange('background_image', response.data.url);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
    }
  };

  const handleMethodToggle = (methodId) => {
    setMethodsSettings(prev =>
      prev.map(method =>
        method.id === methodId
          ? { ...method, enabled: !method.enabled }
          : method
      )
    );
    setHasChanges(true);
  };

  const handleMethodUpdate = (methodId, field, value) => {
    setMethodsSettings(prev =>
      prev.map(method =>
        method.id === methodId
          ? { ...method, [field]: value }
          : method
      )
    );
    setHasChanges(true);
  };

  const handleMethodFeatureUpdate = (methodId, featureIndex, value) => {
    setMethodsSettings(prev =>
      prev.map(method => {
        if (method.id === methodId) {
          const newFeatures = [...method.features];
          newFeatures[featureIndex] = value;
          return { ...method, features: newFeatures };
        }
        return method;
      })
    );
    setHasChanges(true);
  };

  const handleWhyChooseUpdate = (id, field, value) => {
    setWhyChooseSettings(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, [field]: value }
          : item
      )
    );
    setHasChanges(true);
  };

  const showNotification = (message, type) => {
    setShowToast({ show: true, message, type });
    setTimeout(() => {
      setShowToast({ show: false, message: '', type: '' });
    }, 3000);
  };

  const getIcon = (iconName) => {
    const icons = {
      'bolt': <FaBolt />,
      'comments': <FaComments />,
      'video': <FaVideo />,
      'usermd': <FaUserMd />,
      'shield': <FaShieldAlt />,
      'wallet': <FaWallet />,
      'clock': <FaClock />
    };
    return icons[iconName] || <FaCheckCircle />;
  };

  if (loading) {
    return (
      <div className="consultation-system-loading">
        <div className="spinner"></div>
        <p>Đang tải cấu hình...</p>
      </div>
    );
  }

  return (
    <div className="consultation-system-management">
      {/* Toast Notification */}
      {showToast.show && (
        <div className={`toast-notification ${showToast.type}`}>
          {showToast.type === 'success' ? <FaCheckCircle /> : <FaExclamationTriangle />}
          <span>{showToast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="system-header">
        <div className="header-content">
          <h1>
            <FaEdit /> Quản Lý Hệ Thống Tư Vấn
          </h1>
          <p>Tùy chỉnh giao diện và nội dung trang tư vấn</p>
        </div>
        
        <div className="header-actions">
          {hasChanges && (
            <button 
              className="btn-reset"
              onClick={handleResetSettings}
              disabled={saving}
            >
              <FaUndo /> Hủy thay đổi
            </button>
          )}
          <button 
            className="btn-save"
            onClick={handleSaveSettings}
            disabled={saving || !hasChanges}
          >
            {saving ? (
              <>
                <div className="spinner-small"></div>
                Đang lưu...
              </>
            ) : (
              <>
                <FaSave /> Lưu cấu hình
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <button 
          className={`tab-btn ${activeTab === 'banner' ? 'active' : ''}`}
          onClick={() => setActiveTab('banner')}
        >
          <FaImage /> Banner
        </button>
        <button 
          className={`tab-btn ${activeTab === 'methods' ? 'active' : ''}`}
          onClick={() => setActiveTab('methods')}
        >
          <FaComments /> Phương Thức Tư Vấn
        </button>
        <button 
          className={`tab-btn ${activeTab === 'whyChoose' ? 'active' : ''}`}
          onClick={() => setActiveTab('whyChoose')}
        >
          <FaCheckCircle /> Tại Sao Chọn Chúng Tôi
        </button>
      </div>

      {/* Content */}
      <div className="system-content">
        
        {/* BANNER SETTINGS */}
        {activeTab === 'banner' && (
          <div className="settings-section">
            <div className="section-title">
              <FaImage /> Cấu Hình Banner
            </div>

            <div className="settings-grid">
              {/* Banner Image */}
              <div className="setting-card full-width">
                <label className="setting-label">
                  <FaImage /> Ảnh Nền Banner
                </label>
                <div className="image-upload-area">
                  {(imagePreview || bannerSettings.background_image) && (
                    <div className="image-preview">
                      <img 
                        src={imagePreview || bannerSettings.background_image} 
                        alt="Banner preview" 
                      />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    id="banner-image-upload"
                    style={{ display: 'none' }}
                  />
                  <button
                    className="btn-upload-image"
                    onClick={() => document.getElementById('banner-image-upload').click()}
                  >
                    <FaImage /> {bannerSettings.background_image ? 'Thay đổi ảnh' : 'Tải ảnh lên'}
                  </button>
                  <small className="setting-hint">
                    Kích thước đề nghị: 1920x600px. Định dạng: JPG, PNG
                  </small>
                </div>
              </div>

              {/* Colors */}
              <div className="setting-card">
                <label className="setting-label">
                  <FaPalette /> Màu Chính (Primary)
                </label>
                <div className="color-picker-group">
                  <input
                    type="color"
                    value={bannerSettings.primary_color}
                    onChange={(e) => handleBannerChange('primary_color', e.target.value)}
                    className="color-input"
                  />
                  <input
                    type="text"
                    value={bannerSettings.primary_color}
                    onChange={(e) => handleBannerChange('primary_color', e.target.value)}
                    className="color-text-input"
                    placeholder="#667eea"
                  />
                </div>
              </div>

              <div className="setting-card">
                <label className="setting-label">
                  <FaPalette /> Màu Phụ (Secondary)
                </label>
                <div className="color-picker-group">
                  <input
                    type="color"
                    value={bannerSettings.secondary_color}
                    onChange={(e) => handleBannerChange('secondary_color', e.target.value)}
                    className="color-input"
                  />
                  <input
                    type="text"
                    value={bannerSettings.secondary_color}
                    onChange={(e) => handleBannerChange('secondary_color', e.target.value)}
                    className="color-text-input"
                    placeholder="#764ba2"
                  />
                </div>
              </div>

              {/* Text Content */}
              <div className="setting-card full-width">
                <label className="setting-label">
                  Badge Text
                </label>
                <input
                  type="text"
                  value={bannerSettings.badge_text}
                  onChange={(e) => handleBannerChange('badge_text', e.target.value)}
                  className="setting-input"
                  placeholder="Tư Vấn Y Tế Trực Tuyến #1 Việt Nam"
                />
              </div>

              <div className="setting-card full-width">
                <label className="setting-label">
                  Tiêu Đề Chính
                </label>
                <input
                  type="text"
                  value={bannerSettings.title}
                  onChange={(e) => handleBannerChange('title', e.target.value)}
                  className="setting-input"
                  placeholder="Kết Nối Với Bác Sĩ Mọi Lúc, Mọi Nơi"
                />
              </div>

              <div className="setting-card full-width">
                <label className="setting-label">
                  Mô Tả
                </label>
                <textarea
                  value={bannerSettings.subtitle}
                  onChange={(e) => handleBannerChange('subtitle', e.target.value)}
                  className="setting-textarea"
                  rows="3"
                  placeholder="Tư vấn sức khỏe chuyên nghiệp..."
                />
              </div>
            </div>

            {/* Preview */}
            <div className="preview-section">
              <h3>Xem Trước</h3>
              <div 
                className="banner-preview"
                style={{
                  background: bannerSettings.background_image
                    ? `linear-gradient(135deg, ${bannerSettings.primary_color}cc, ${bannerSettings.secondary_color}cc), url(${bannerSettings.background_image})`
                    : `linear-gradient(135deg, ${bannerSettings.primary_color}, ${bannerSettings.secondary_color})`
                }}
              >
                <div className="preview-badge">{bannerSettings.badge_text}</div>
                <h1 className="preview-title">{bannerSettings.title}</h1>
                <p className="preview-subtitle">{bannerSettings.subtitle}</p>
              </div>
            </div>
          </div>
        )}

        {/* METHODS SETTINGS */}
        {activeTab === 'methods' && (
          <div className="settings-section">
            <div className="section-title">
              <FaComments /> Phương Thức Tư Vấn
            </div>

            <div className="methods-list">
              {methodsSettings.map((method) => (
                <div key={method.id} className="method-edit-card">
                  <div className="method-header">
                    <div className="method-info">
                      <div className="method-icon" style={{ background: method.color }}>
                        {getIcon(method.icon)}
                      </div>
                      <div>
                        <h3>{method.name}</h3>
                        <span className="method-id">{method.id}</span>
                      </div>
                    </div>
                    
                    <button
                      className={`toggle-btn ${method.enabled ? 'enabled' : 'disabled'}`}
                      onClick={() => handleMethodToggle(method.id)}
                    >
                      {method.enabled ? <FaToggleOn /> : <FaToggleOff />}
                      {method.enabled ? 'Bật' : 'Tắt'}
                    </button>
                  </div>

                  <div className={`method-body ${!method.enabled ? 'disabled' : ''}`}>
                    <div className="method-edit-grid">
                      <div className="edit-field">
                        <label>Tên phương thức</label>
                        <input
                          type="text"
                          value={method.name}
                          onChange={(e) => handleMethodUpdate(method.id, 'name', e.target.value)}
                          disabled={!method.enabled}
                        />
                      </div>

                      <div className="edit-field">
                        <label>Phụ đề</label>
                        <input
                          type="text"
                          value={method.subtitle}
                          onChange={(e) => handleMethodUpdate(method.id, 'subtitle', e.target.value)}
                          disabled={!method.enabled}
                        />
                      </div>

                      <div className="edit-field full">
                        <label>Mô tả</label>
                        <textarea
                          value={method.description}
                          onChange={(e) => handleMethodUpdate(method.id, 'description', e.target.value)}
                          rows="2"
                          disabled={!method.enabled}
                        />
                      </div>

                      <div className="edit-field">
                        <label>Màu sắc</label>
                        <div className="color-picker-group">
                          <input
                            type="color"
                            value={method.color}
                            onChange={(e) => handleMethodUpdate(method.id, 'color', e.target.value)}
                            disabled={!method.enabled}
                          />
                          <input
                            type="text"
                            value={method.color}
                            onChange={(e) => handleMethodUpdate(method.id, 'color', e.target.value)}
                            disabled={!method.enabled}
                          />
                        </div>
                      </div>

                      <div className="edit-field">
                        <label>Giá (VNĐ)</label>
                        <input
                          type="number"
                          value={method.price}
                          onChange={(e) => handleMethodUpdate(method.id, 'price', parseInt(e.target.value))}
                          disabled={!method.enabled}
                        />
                      </div>

                      <div className="edit-field">
                        <label>Thời gian (phút)</label>
                        <input
                          type="number"
                          value={method.duration}
                          onChange={(e) => handleMethodUpdate(method.id, 'duration', parseInt(e.target.value))}
                          disabled={!method.enabled}
                        />
                      </div>

                      <div className="edit-field">
                        <label>Badge (để trống nếu không cần)</label>
                        <input
                          type="text"
                          value={method.badge || ''}
                          onChange={(e) => handleMethodUpdate(method.id, 'badge', e.target.value || null)}
                          disabled={!method.enabled}
                          placeholder="VD: Phổ biến nhất"
                        />
                      </div>
                    </div>

                    <div className="features-section">
                      <label>Tính năng</label>
                      {method.features.map((feature, index) => (
                        <div key={index} className="feature-input-group">
                          <input
                            type="text"
                            value={feature}
                            onChange={(e) => handleMethodFeatureUpdate(method.id, index, e.target.value)}
                            disabled={!method.enabled}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* WHY CHOOSE US SETTINGS */}
        {activeTab === 'whyChoose' && (
          <div className="settings-section">
            <div className="section-title">
              <FaCheckCircle /> Tại Sao Chọn Chúng Tôi
            </div>

            <div className="why-choose-list">
              {whyChooseSettings.map((item) => (
                <div key={item.id} className="why-choose-edit-card">
                  <div className="why-choose-header">
                    <div 
                      className="why-choose-icon"
                      style={{ background: item.color }}
                    >
                      {getIcon(item.icon)}
                    </div>
                    <h3>{item.title}</h3>
                  </div>

                  <div className="why-choose-body">
                    <div className="edit-field">
                      <label>Tiêu đề</label>
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => handleWhyChooseUpdate(item.id, 'title', e.target.value)}
                      />
                    </div>

                    <div className="edit-field">
                      <label>Mô tả</label>
                      <textarea
                        value={item.description}
                        onChange={(e) => handleWhyChooseUpdate(item.id, 'description', e.target.value)}
                        rows="3"
                      />
                    </div>

                    <div className="edit-field">
                      <label>Màu sắc</label>
                      <div className="color-picker-group">
                        <input
                          type="color"
                          value={item.color}
                          onChange={(e) => handleWhyChooseUpdate(item.id, 'color', e.target.value)}
                        />
                        <input
                          type="text"
                          value={item.color}
                          onChange={(e) => handleWhyChooseUpdate(item.id, 'color', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ConsultationSystemManagementPage;