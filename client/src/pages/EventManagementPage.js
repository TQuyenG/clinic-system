// EventManagementPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  FaPlus, FaEdit, FaTrash, FaEye, FaCopy,
  FaToggleOn, FaToggleOff, FaFileExport, FaImage,
  FaTimes, FaList, FaTh
} from 'react-icons/fa';
import './EventManagementPage.css';

const EventManagementPage = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [filters, setFilters] = useState({
    search: '',
    event_type: 'all',
    sortBy: 'createdAt',
    startDate: '',
    endDate: ''
  });

  const [formData, setFormData] = useState({
    title: '', description: '', content: '', event_type: 'event',
    start_date: '', end_date: '', location: '',
    thumbnail: '', banner_url: '', gallery: [],
    is_popup: false, is_active: true,
    popup_config: { delay: 0, frequency: 'once_per_day', display_pages: ['home'] },
    cta_config: { text: 'Xem chi tiết', type: 'internal', link: '' }
  });

  useEffect(() => { fetchEvents(); }, [filters, pagination.page]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const response = await api.get('/marketing/events', {
        params: { page: pagination.page, limit: pagination.limit, ...filters }
      });
      if (response.data.success) {
        setEvents(response.data.events);
        setPagination(prev => ({ ...prev, total: response.data.totalCount || 0 }));
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e, type) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadingImages(true);
    const uploadedUrls = [];
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append('image', file);
        const res = await api.post('/upload/image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        if (res.data.success) uploadedUrls.push(res.data.url);
      }
      if (type === 'thumbnail') setFormData(prev => ({ ...prev, thumbnail: uploadedUrls[0] }));
      else if (type === 'banner') setFormData(prev => ({ ...prev, banner_url: uploadedUrls[0] }));
      else if (type === 'gallery') setFormData(prev => ({ ...prev, gallery: [...prev.gallery, ...uploadedUrls] }));
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploadingImages(false);
    }
  };

  const removeGalleryImage = (index) => {
    setFormData(prev => ({ ...prev, gallery: prev.gallery.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingEvent) {
        await api.put(`/marketing/events/${editingEvent.id}`, formData);
      } else {
        await api.post('/marketing/events', formData);
      }
      setShowModal(false);
      resetForm();
      fetchEvents();
    } catch (error) {
      console.error('Error saving event:', error);
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
      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await api.put(`/marketing/events/${id}/toggle`);
      fetchEvents();
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  const handleDuplicate = async (id) => {
    try {
      await api.post(`/marketing/events/${id}/duplicate`);
      fetchEvents();
    } catch (error) {
      console.error('Error duplicating event:', error);
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get('/marketing/events/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `events-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const resetForm = () => {
    setEditingEvent(null);
    setFormData({
      title: '', description: '', content: '', event_type: 'event',
      start_date: '', end_date: '', location: '',
      thumbnail: '', banner_url: '', gallery: [],
      is_popup: false, is_active: true,
      popup_config: { delay: 0, frequency: 'once_per_day', display_pages: ['home'] },
      cta_config: { text: 'Xem chi tiết', type: 'internal', link: '' }
    });
  };

  const typeLabels = { event: 'Sự kiện', promotion: 'Khuyến mãi', news: 'Tin tức', notification: 'Thông báo' };
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div className="emp-page">
      {/* Header */}
      <div className="emp-header">
        <h1 className="emp-header__title">Quản lý Sự kiện & Tiếp thị</h1>
        <div className="emp-header__actions">
          <div className="emp-view-switcher">
            <button
              className={`emp-view-switcher__btn ${viewMode === 'list' ? 'emp-view-switcher__btn--active' : ''}`}
              onClick={() => setViewMode('list')}
              title="Dạng bảng"
            >
              <FaList />
            </button>
            <button
              className={`emp-view-switcher__btn ${viewMode === 'grid' ? 'emp-view-switcher__btn--active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Dạng lưới"
            >
              <FaTh />
            </button>
          </div>
          <button onClick={handleExport} className="emp-btn emp-btn--secondary">
            <FaFileExport /> Xuất
          </button>
          <button onClick={() => { resetForm(); setShowModal(true); }} className="emp-btn emp-btn--primary">
            <FaPlus /> Thêm mới
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="emp-filter-bar">
        <input
          className="emp-filter-bar__input"
          type="text"
          placeholder="Tìm tiêu đề..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        <select
          className="emp-filter-bar__select"
          value={filters.event_type}
          onChange={(e) => setFilters({ ...filters, event_type: e.target.value })}
        >
          <option value="all">Tất cả loại</option>
          <option value="event">Sự kiện</option>
          <option value="promotion">Khuyến mãi</option>
          <option value="news">Tin tức</option>
          <option value="notification">Thông báo</option>
        </select>
        <select
          className="emp-filter-bar__select"
          value={filters.sortBy}
          onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
        >
          <option value="createdAt">Mới nhất</option>
          <option value="views">Nhiều lượt xem</option>
          <option value="clicks">Nhiều lượt click</option>
        </select>
        <div className="emp-filter-bar__date-group">
          <input
            type="date"
            className="emp-filter-bar__select"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
          />
          <span className="emp-filter-bar__date-sep">→</span>
          <input
            type="date"
            className="emp-filter-bar__select"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="emp-loading">Đang tải...</div>
      ) : (
        <div className="emp-table-wrap">
          <table className="emp-table">
            <thead>
              <tr>
                <th>Ảnh</th>
                <th>Tiêu đề</th>
                <th>Loại</th>
                <th>Thời gian</th>
                <th>Xem</th>
                <th>Click</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event, i) => (
                <tr key={event.id} className={i > 0 ? 'emp-table__divider' : ''}>
                  <td>
                    <img
                      src={event.thumbnail || '/images/placeholder.jpg'}
                      alt={event.title}
                      className="emp-table__thumb"
                      onError={(e) => (e.target.src = '/images/placeholder.jpg')}
                    />
                  </td>
                  <td>
                    <span className="emp-table__title">{event.title}</span>
                    {event.location && <span className="emp-table__sub">{event.location}</span>}
                  </td>
                  <td>
                    <span className={`emp-badge emp-badge--${event.event_type}`}>
                      {typeLabels[event.event_type] || event.event_type}
                    </span>
                  </td>
                  <td>
                    <span className="emp-table__title" style={{ fontWeight: 400, fontSize: 12 }}>
                      {new Date(event.start_date).toLocaleDateString('vi-VN')}
                    </span>
                    <span className="emp-table__sub">
                      → {new Date(event.end_date).toLocaleDateString('vi-VN')}
                    </span>
                  </td>
                  <td>{event.views || 0}</td>
                  <td>{event.clicks || 0}</td>
                  <td>
                    <button
                      onClick={() => handleToggleStatus(event.id)}
                      className={`emp-toggle ${event.is_active ? 'emp-toggle--on' : 'emp-toggle--off'}`}
                    >
                      {event.is_active ? <FaToggleOn /> : <FaToggleOff />}
                      {event.is_active ? 'Bật' : 'Tắt'}
                    </button>
                  </td>
                  <td>
                    <div className="emp-actions">
                      <button
                        className="emp-action-btn"
                        title="Xem"
                        onClick={() => navigate(`/su-kien/${event.slug}`)}
                      >
                        <FaEye />
                      </button>
                      <button
                        className="emp-action-btn"
                        title="Sửa"
                        onClick={() => handleEdit(event)}
                      >
                        <FaEdit />
                      </button>
                      <button
                        className="emp-action-btn"
                        title="Nhân bản"
                        onClick={() => handleDuplicate(event.id)}
                      >
                        <FaCopy />
                      </button>
                      <button
                        className="emp-action-btn emp-action-btn--delete"
                        title="Xóa"
                        onClick={() => handleDelete(event.id)}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="emp-pagination">
              <button
                className="emp-pagination__btn"
                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                disabled={pagination.page === 1}
              >← Trước</button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPagination(p => ({ ...p, page: i + 1 }))}
                  className={`emp-pagination__btn ${pagination.page === i + 1 ? 'emp-pagination__btn--active' : ''}`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                className="emp-pagination__btn"
                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                disabled={pagination.page === totalPages}
              >Sau →</button>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="emp-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="emp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="emp-modal__header">
              <h2 className="emp-modal__title">
                {editingEvent ? 'Chỉnh sửa sự kiện' : 'Tạo sự kiện mới'}
              </h2>
              <button className="emp-modal__close" onClick={() => setShowModal(false)}>
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="emp-modal__body">
                {/* Basic Info */}
                <div className="emp-form-section">
                  <div className="emp-form-section__title">Thông tin cơ bản</div>

                  <div className="emp-form-group">
                    <label className="emp-form-label emp-form-label--required">Tiêu đề</label>
                    <input
                      className="emp-form-input"
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                      placeholder="Nhập tiêu đề sự kiện..."
                    />
                  </div>

                  <div className="emp-form-row">
                    <div className="emp-form-group">
                      <label className="emp-form-label emp-form-label--required">Loại sự kiện</label>
                      <select
                        className="emp-form-select"
                        value={formData.event_type}
                        onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                      >
                        <option value="event">Sự kiện</option>
                        <option value="promotion">Khuyến mãi</option>
                        <option value="news">Tin tức</option>
                        <option value="notification">Thông báo</option>
                      </select>
                    </div>
                    <div className="emp-form-group">
                      <label className="emp-form-label">Địa điểm</label>
                      <input
                        className="emp-form-input"
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="VD: Clinic System - Chi nhánh 1"
                      />
                    </div>
                  </div>

                  <div className="emp-form-row">
                    <div className="emp-form-group">
                      <label className="emp-form-label emp-form-label--required">Ngày bắt đầu</label>
                      <input
                        className="emp-form-input"
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        required
                      />
                    </div>
                    <div className="emp-form-group">
                      <label className="emp-form-label emp-form-label--required">Ngày kết thúc</label>
                      <input
                        className="emp-form-input"
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="emp-form-group">
                    <label className="emp-form-label">Mô tả ngắn</label>
                    <textarea
                      className="emp-form-textarea"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows="2"
                      placeholder="Tóm tắt nội dung sự kiện..."
                    />
                  </div>

                  <div className="emp-form-group">
                    <label className="emp-form-label">Nội dung chi tiết</label>
                    <textarea
                      className="emp-form-textarea"
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      rows="5"
                      placeholder="Nội dung chi tiết (có thể dùng HTML)..."
                    />
                  </div>
                </div>

                {/* Images */}
                <div className="emp-form-section">
                  <div className="emp-form-section__title"><FaImage /> Hình ảnh</div>

                  <div className="emp-form-group">
                    <label className="emp-form-label">Ảnh Thumbnail</label>
                    <div className="emp-upload-area">
                      <label className="emp-upload-label" htmlFor="emp-thumb-input">
                        Chọn ảnh thumbnail
                      </label>
                      <input
                        id="emp-thumb-input"
                        className="emp-upload-input"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'thumbnail')}
                        disabled={uploadingImages}
                      />
                    </div>
                    {formData.thumbnail && (
                      <div className="emp-image-preview">
                        <img className="emp-image-preview__img" src={formData.thumbnail} alt="Thumbnail" />
                        <button
                          className="emp-image-preview__remove"
                          type="button"
                          onClick={() => setFormData({ ...formData, thumbnail: '' })}
                        >Xóa</button>
                      </div>
                    )}
                  </div>

                  <div className="emp-form-group">
                    <label className="emp-form-label">Ảnh Banner (trang chi tiết)</label>
                    <div className="emp-upload-area">
                      <label className="emp-upload-label" htmlFor="emp-banner-input">
                        Chọn ảnh banner
                      </label>
                      <input
                        id="emp-banner-input"
                        className="emp-upload-input"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'banner')}
                        disabled={uploadingImages}
                      />
                    </div>
                    {formData.banner_url && (
                      <div className="emp-image-preview">
                        <img className="emp-image-preview__img" src={formData.banner_url} alt="Banner" />
                        <button
                          className="emp-image-preview__remove"
                          type="button"
                          onClick={() => setFormData({ ...formData, banner_url: '' })}
                        >Xóa</button>
                      </div>
                    )}
                  </div>

                  <div className="emp-form-group">
                    <label className="emp-form-label">Album ảnh</label>
                    <div className="emp-upload-area">
                      <label className="emp-upload-label" htmlFor="emp-gallery-input">
                        Chọn nhiều ảnh
                      </label>
                      <input
                        id="emp-gallery-input"
                        className="emp-upload-input"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleImageUpload(e, 'gallery')}
                        disabled={uploadingImages}
                      />
                    </div>
                    {formData.gallery.length > 0 && (
                      <div className="emp-gallery-preview">
                        {formData.gallery.map((img, index) => (
                          <div key={index} className="emp-gallery-item">
                            <img className="emp-gallery-item__img" src={img} alt={`Gallery ${index + 1}`} />
                            <button
                              className="emp-gallery-item__remove"
                              type="button"
                              onClick={() => removeGalleryImage(index)}
                            ><FaTimes /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {uploadingImages && <p className="emp-uploading-text">Đang tải ảnh lên...</p>}
                </div>

                {/* CTA Config */}
                <div className="emp-form-section">
                  <div className="emp-form-section__title">Nút hành động (CTA)</div>
                  <div className="emp-form-row">
                    <div className="emp-form-group">
                      <label className="emp-form-label">Nội dung nút</label>
                      <input
                        className="emp-form-input"
                        type="text"
                        value={formData.cta_config.text}
                        onChange={(e) => setFormData({ ...formData, cta_config: { ...formData.cta_config, text: e.target.value } })}
                        placeholder="VD: Đăng ký ngay"
                      />
                    </div>
                    <div className="emp-form-group">
                      <label className="emp-form-label">Loại liên kết</label>
                      <select
                        className="emp-form-select"
                        value={formData.cta_config.type}
                        onChange={(e) => setFormData({ ...formData, cta_config: { ...formData.cta_config, type: e.target.value } })}
                      >
                        <option value="internal">Nội bộ</option>
                        <option value="external">Bên ngoài</option>
                        <option value="booking">Đặt lịch</option>
                      </select>
                    </div>
                  </div>
                  <div className="emp-form-group">
                    <label className="emp-form-label">Đường dẫn</label>
                    <input
                      className="emp-form-input"
                      type="text"
                      value={formData.cta_config.link}
                      onChange={(e) => setFormData({ ...formData, cta_config: { ...formData.cta_config, link: e.target.value } })}
                      placeholder="VD: /dat-lich-hen hoặc https://..."
                    />
                  </div>
                </div>

                {/* Popup & Status */}
                <div className="emp-form-section">
                  <div className="emp-form-section__title">Cấu hình Popup & Trạng thái</div>
                  <div className="emp-form-group">
                    <label className="emp-checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.is_popup}
                        onChange={(e) => setFormData({ ...formData, is_popup: e.target.checked })}
                      />
                      Hiển thị dạng popup trang chủ
                    </label>
                  </div>

                  {formData.is_popup && (
                    <div className="emp-form-row">
                      <div className="emp-form-group">
                        <label className="emp-form-label">Độ trễ hiển thị (giây)</label>
                        <input
                          className="emp-form-input"
                          type="number"
                          min="0"
                          value={formData.popup_config.delay}
                          onChange={(e) => setFormData({ ...formData, popup_config: { ...formData.popup_config, delay: parseInt(e.target.value) } })}
                        />
                      </div>
                      <div className="emp-form-group">
                        <label className="emp-form-label">Tần suất hiển thị</label>
                        <select
                          className="emp-form-select"
                          value={formData.popup_config.frequency}
                          onChange={(e) => setFormData({ ...formData, popup_config: { ...formData.popup_config, frequency: e.target.value } })}
                        >
                          <option value="once_per_session">Mỗi phiên một lần</option>
                          <option value="once_per_day">Mỗi ngày một lần</option>
                          <option value="always">Luôn hiển thị</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="emp-form-group">
                    <label className="emp-checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      />
                      Kích hoạt sự kiện
                    </label>
                  </div>
                </div>
              </div>

              <div className="emp-modal__footer">
                <button type="button" className="emp-btn emp-btn--secondary" onClick={() => setShowModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="emp-btn emp-btn--primary">
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