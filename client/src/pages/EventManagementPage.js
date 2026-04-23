// ✅ TẠO FILE MỚI
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { FaPlus, FaEdit, FaTrash, FaEye, FaCopy, FaToggleOn, FaToggleOff, FaFileExport, FaImage } from 'react-icons/fa';
import './EventManagementPage.css';

const EventManagementPage = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [uploadingImages, setUploadingImages] = useState(false);

  // --- THÊM MỚI: State cho Lọc, Phân trang, Sắp xếp ---
  const [viewMode, setViewMode] = useState('list'); // 'list' hoặc 'grid'
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [filters, setFilters] = useState({
    search: '',
    event_type: 'all',
    status: 'all',
    startDate: '',
    endDate: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    event_type: 'event',
    start_date: '',
    end_date: '',
    location: '',
    thumbnail: '',
    banner_url: '',
    gallery: [],
    is_popup: false,
    is_active: true,
    popup_config: {
      delay: 0,
      frequency: 'once_per_day',
      display_pages: ['home']
    },
    cta_config: {
      text: 'Xem chi tiết',
      type: 'internal',
      link: ''
    }
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const response = await api.get('/marketing/events', {
        params: { 
          page: pagination.page,
          limit: pagination.limit,
          ...filters 
        }
      });
      if (response.data.success) {
        setEvents(response.data.events);
        setPagination(prev => ({ ...prev, total: response.data.totalCount || 0 }));
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      alert('Lỗi tải danh sách sự kiện');
    } finally {
      setLoading(false);
    }
  };

  // Gọi lại API khi filter hoặc page thay đổi
  useEffect(() => {
    fetchEvents();
  }, [filters, pagination.page]);

  const handleImageUpload = async (e, type) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingImages(true);
    const uploadedUrls = [];

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('image', file);

        const response = await api.post('/upload/image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (response.data.success) {
          uploadedUrls.push(response.data.url);
        }
      }

      if (type === 'thumbnail') {
        setFormData(prev => ({ ...prev, thumbnail: uploadedUrls[0] }));
      } else if (type === 'banner') {
        setFormData(prev => ({ ...prev, banner_url: uploadedUrls[0] }));
      } else if (type === 'gallery') {
        setFormData(prev => ({ 
          ...prev, 
          gallery: [...prev.gallery, ...uploadedUrls] 
        }));
      }

      alert(`Đã upload ${uploadedUrls.length} ảnh thành công!`);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Lỗi upload ảnh. Vui lòng thử lại.');
    } finally {
      setUploadingImages(false);
    }
  };

  const removeGalleryImage = (index) => {
    setFormData(prev => ({
      ...prev,
      gallery: prev.gallery.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingEvent) {
        await api.put(`/marketing/events/${editingEvent.id}`, formData);
        alert('Cập nhật sự kiện thành công!');
      } else {
        await api.post('/marketing/events', formData);
        alert('Tạo sự kiện thành công!');
      }

      setShowModal(false);
      resetForm();
      fetchEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      alert('Lỗi lưu sự kiện: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleEdit = (event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description || '',
      content: event.content || '',
      event_type: event.event_type,
      start_date: event.start_date?.split('T')[0] || '',
      end_date: event.end_date?.split('T')[0] || '',
      location: event.location || '',
      thumbnail: event.thumbnail || '',
      banner_url: event.banner_url || '',
      gallery: event.gallery || [],
      is_popup: event.is_popup,
      is_active: event.is_active,
      popup_config: event.popup_config || formData.popup_config,
      cta_config: event.cta_config || formData.cta_config
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa sự kiện này?')) return;

    try {
      await api.delete(`/marketing/events/${id}`);
      alert('Đã xóa sự kiện!');
      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Lỗi xóa sự kiện');
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await api.put(`/marketing/events/${id}/toggle`);
      fetchEvents();
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('Lỗi thay đổi trạng thái');
    }
  };

  const handleDuplicate = async (id) => {
    try {
      await api.post(`/marketing/events/${id}/duplicate`);
      alert('Đã nhân bản sự kiện!');
      fetchEvents();
    } catch (error) {
      console.error('Error duplicating event:', error);
      alert('Lỗi nhân bản sự kiện');
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get('/marketing/events/export', {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `events-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export error:', error);
      alert('Lỗi xuất dữ liệu');
    }
  };

  const resetForm = () => {
    setEditingEvent(null);
    setFormData({
      title: '',
      description: '',
      content: '',
      event_type: 'event',
      start_date: '',
      end_date: '',
      location: '',
      thumbnail: '',
      banner_url: '',
      gallery: [],
      is_popup: false,
      is_active: true,
      popup_config: {
        delay: 0,
        frequency: 'once_per_day',
        display_pages: ['home']
      },
      cta_config: {
        text: 'Xem chi tiết',
        type: 'internal',
        link: ''
      }
    });
  };

  return (
    <div className="event-management-page">
      <div className="page-header">
        <h1>Quản lý Sự kiện & Tiếp thị</h1>
        <div className="header-actions">
          {/* Nút chuyển đổi Grid/List */}
          <div className="view-switcher">
             <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>Bảng</button>
             <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}>Lưới</button>
          </div>
          <button onClick={handleExport} className="btn-export"><FaFileExport /> Xuất</button>
          <button onClick={() => setShowModal(true)} className="btn-add"><FaPlus /> Thêm mới</button>
        </div>
      </div>

      {/* THANH LỌC NÂNG CAO */}
      <div className="filter-bar">
        <input 
          type="text" placeholder="Tìm tiêu đề..." 
          onChange={(e) => setFilters({...filters, search: e.target.value})} 
        />
        <select onChange={(e) => setFilters({...filters, event_type: e.target.value})}>
          <option value="all">Tất cả loại</option>
          <option value="event">Sự kiện</option>
          <option value="promotion">Khuyến mãi</option>
        </select>
        <select onChange={(e) => setFilters({...filters, sortBy: e.target.value})}>
          <option value="createdAt">Mới nhất</option>
          <option value="views">Nhiều lượt xem</option>
          <option value="clicks">Nhiều lượt click</option>
        </select>
        <div className="date-filters">
           <input type="date" onChange={(e) => setFilters({...filters, startDate: e.target.value})} />
           <span>đến</span>
           <input type="date" onChange={(e) => setFilters({...filters, endDate: e.target.value})} />
        </div>
      </div>

      {loading ? (
        <div className="loading">Đang tải...</div>
      ) : (
        <div className="events-table-container">
          <table className="events-table">
            <thead>
              <tr>
                <th>Ảnh</th>
                <th>Tiêu đề</th>
                <th>Loại</th>
                <th>Thời gian</th>
                <th>Lượt xem</th>
                <th>Lượt click</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {events.map(event => (
                <tr key={event.id}>
                  <td>
                    <img 
                      src={event.thumbnail || '/images/placeholder.jpg'} 
                      alt={event.title}
                      className="event-thumb"
                    />
                  </td>
                  <td>
                    <strong>{event.title}</strong>
                    <br />
                    <small>{event.location}</small>
                  </td>
                  <td>
                    <span className={`badge ${event.event_type}`}>
                      {event.event_type}
                    </span>
                  </td>
                  <td>
                    {new Date(event.start_date).toLocaleDateString('vi-VN')}
                    <br />→ {new Date(event.end_date).toLocaleDateString('vi-VN')}
                  </td>
                  <td>{event.views || 0}</td>
                  <td>{event.clicks || 0}</td>
                  <td>
                    <button 
                      onClick={() => handleToggleStatus(event.id)}
                      className={`btn-toggle ${event.is_active ? 'active' : 'inactive'}`}
                    >
                      {event.is_active ? <FaToggleOn /> : <FaToggleOff />}
                      {event.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button onClick={() => navigate(`/su-kien/${event.slug}`)} title="Xem">
                        <FaEye />
                      </button>
                      <button onClick={() => handleEdit(event)} title="Sửa">
                        <FaEdit />
                      </button>
                      <button onClick={() => handleDuplicate(event.id)} title="Nhân bản">
                        <FaCopy />
                      </button>
                      <button onClick={() => handleDelete(event.id)} title="Xóa" className="btn-delete">
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL FORM */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingEvent ? 'Chỉnh sửa sự kiện' : 'Tạo sự kiện mới'}</h2>
              <button onClick={() => setShowModal(false)} className="btn-close">×</button>
            </div>

            <form onSubmit={handleSubmit} className="event-form">
              {/* Basic Info */}
              <div className="form-section">
                <h3>Thông tin cơ bản</h3>
                
                <div className="form-group">
                  <label>Tiêu đề *</label>
                  <input 
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Loại sự kiện *</label>
                    <select 
                      value={formData.event_type}
                      onChange={(e) => setFormData({...formData, event_type: e.target.value})}
                    >
                      <option value="event">Sự kiện</option>
                      <option value="promotion">Khuyến mãi</option>
                      <option value="news">Tin tức</option>
                      <option value="notification">Thông báo</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Địa điểm</label>
                    <input 
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      placeholder="VD: Clinic System - Chi nhánh 1"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Ngày bắt đầu *</label>
                    <input 
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Ngày kết thúc *</label>
                    <input 
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Mô tả ngắn</label>
                  <textarea 
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows="3"
                    placeholder="Mô tả ngắn gọn về sự kiện..."
                  />
                </div>

                <div className="form-group">
                  <label>Nội dung chi tiết</label>
                  <textarea 
                    value={formData.content}
                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                    rows="6"
                    placeholder="Nội dung chi tiết (có thể dùng HTML)..."
                  />
                </div>
              </div>

              {/* Images Section */}
              <div className="form-section">
                <h3><FaImage /> Hình ảnh</h3>

                <div className="form-group">
                  <label>Ảnh Thumbnail (hiển thị danh sách/popup)</label>
                  <input 
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'thumbnail')}
                    disabled={uploadingImages}
                  />
                  {formData.thumbnail && (
                    <div className="image-preview">
                      <img src={formData.thumbnail} alt="Thumbnail" />
                      <button type="button" onClick={() => setFormData({...formData, thumbnail: ''})}>
                        Xóa
                      </button>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Ảnh Banner (hiển thị trang chi tiết)</label>
                  <input 
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'banner')}
                    disabled={uploadingImages}
                  />
                  {formData.banner_url && (
                    <div className="image-preview">
                      <img src={formData.banner_url} alt="Banner" />
                      <button type="button" onClick={() => setFormData({...formData, banner_url: ''})}>
                        Xóa
                      </button>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Album ảnh (có thể chọn nhiều)</label>
                  <input 
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleImageUpload(e, 'gallery')}
                    disabled={uploadingImages}
                  />
                  {formData.gallery.length > 0 && (
                    <div className="gallery-preview">
                      {formData.gallery.map((img, index) => (
                        <div key={index} className="gallery-item">
                          <img src={img} alt={`Gallery ${index + 1}`} />
                          <button type="button" onClick={() => removeGalleryImage(index)}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {uploadingImages && <p className="uploading-text">Đang upload...</p>}
              </div>

              {/* CTA Config */}
              <div className="form-section">
                <h3>Cấu hình nút hành động (CTA)</h3>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Nội dung nút</label>
                    <input 
                      type="text"
                      value={formData.cta_config.text}
                      onChange={(e) => setFormData({
                        ...formData, 
                        cta_config: {...formData.cta_config, text: e.target.value}
                      })}
                      placeholder="VD: Đăng ký ngay"
                    />
                  </div>

                  <div className="form-group">
                    <label>Loại liên kết</label>
                    <select 
                      value={formData.cta_config.type}
                      onChange={(e) => setFormData({
                        ...formData, 
                        cta_config: {...formData.cta_config, type: e.target.value}
                      })}
                    >
                      <option value="internal">Nội bộ</option>
                      <option value="external">Bên ngoài</option>
                      <option value="booking">Đặt lịch</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Đường dẫn</label>
                  <input 
                    type="text"
                    value={formData.cta_config.link}
                    onChange={(e) => setFormData({
                      ...formData, 
                      cta_config: {...formData.cta_config, link: e.target.value}
                    })}
                    placeholder="VD: /dat-lich-hen hoặc https://..."
                  />
                </div>
              </div>

              {/* Popup Config */}
              <div className="form-section">
                <h3>Cấu hình Popup</h3>
                
                <div className="form-group">
                  <label className="checkbox-label">
                    <input 
                      type="checkbox"
                      checked={formData.is_popup}
                      onChange={(e) => setFormData({...formData, is_popup: e.target.checked})}
                    />
                    Hiển thị dạng popup
                  </label>
                </div>

                {formData.is_popup && (
                  <>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Độ trễ hiển thị (giây)</label>
                        <input 
                          type="number"
                          min="0"
                          value={formData.popup_config.delay}
                          onChange={(e) => setFormData({
                            ...formData,
                            popup_config: {...formData.popup_config, delay: parseInt(e.target.value)}
                          })}
                        />
                      </div>

                      <div className="form-group">
                        <label>Tần suất hiển thị</label>
                        <select 
                          value={formData.popup_config.frequency}
                          onChange={(e) => setFormData({
                            ...formData,
                            popup_config: {...formData.popup_config, frequency: e.target.value}
                          })}
                        >
                          <option value="once_per_session">Một lần mỗi phiên</option>
                          <option value="once_per_day">Một lần mỗi ngày</option>
                          <option value="always">Luôn hiển thị</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Status */}
              <div className="form-section">
                <div className="form-group">
                  <label className="checkbox-label">
                    <input 
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                    />
                    Kích hoạt sự kiện
                  </label>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => setShowModal(false)} className="btn-cancel">
                  Hủy
                </button>
                <button type="submit" className="btn-submit">
                  {editingEvent ? 'Cập nhật' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventManagementPage;