// client/src/components/service/ServiceModal.js
import React, { useState, useEffect } from 'react';
import serviceService from '../../services/serviceService';
import serviceCategoryService from '../../services/serviceCategoryService';
import userService from '../../services/userService';
import { toast } from 'react-toastify';
import Select from 'react-select';
import { FaSave, FaTimes, FaInfoCircle } from 'react-icons/fa';
import './ServiceModal.css';

const ServiceModal = ({ isOpen, onClose, serviceId, onSuccess }) => {
  const isEditMode = Boolean(serviceId);

  // === TRẠNG THÁI FORM ===
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    price: '',
    duration: '',
    short_description: '',
    detailed_content: '',
    image_url: '',
    allow_doctor_choice: true,
    status: 'active',
    user_ids: [] // <-- GỬI user_id (từ bảng users)
  });

  const [categories, setCategories] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctors, setSelectedDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // === MẪU RESET FORM ===
  const initialFormState = {
    name: '',
    category_id: '',
    price: '',
    duration: '',
    short_description: '',
    detailed_content: '',
    image_url: '',
    allow_doctor_choice: true,
    status: 'active',
    user_ids: []
  };

  // === TẢI DỮ LIỆU KHI MỞ MODAL ===
  useEffect(() => {
    if (!isOpen) return;

    // Reset form
    setFormData(initialFormState);
    setSelectedDoctors([]);
    setErrors({});
    setLoading(true);

    const loadDependencies = async () => {
      try {
        // 1. Load danh mục + bác sĩ
        const [catRes, docRes] = await Promise.all([
          serviceCategoryService.getAdminServiceCategories(),
          userService.getUsersByRole('doctor')
        ]);

        // --- Danh mục ---
        if (catRes.data.success) {
          setCategories(catRes.data.data || catRes.data.categories || []);
        }

        // --- Bác sĩ (dùng User.id làm value) ---
        let doctorOptions = [];
        if (docRes.data.success) {
          const rawDoctors = docRes.data.data || docRes.data.users || [];
          doctorOptions = rawDoctors.map(doc => ({
            value: doc.id, // <-- user_id
            label: `BS. ${doc.full_name}${doc.specialty?.name ? ` - ${doc.specialty.name}` : ''}`
          }));
          setDoctors(doctorOptions);
        }

        // 2. Nếu CHỈNH SỬA → load dữ liệu cũ
        if (isEditMode && serviceId) {
          try {
            const serviceRes = await serviceService.getServiceById(serviceId);
            if (serviceRes.data.success) {
              const service = serviceRes.data.data;

              // Load bác sĩ đã chọn từ service.doctors (nếu có)
              let selectedDoctorOptions = [];
              if (service.doctors && Array.isArray(service.doctors) && service.doctors.length > 0) {
                selectedDoctorOptions = service.doctors.map(d => ({
                  value: d.user.id, // user_id
                  label: `BS. ${d.user.full_name}${d.specialty?.name ? ` - ${d.specialty.name}` : ''}`
                }));
              }

              setFormData({
                name: service.name || '',
                category_id: service.category_id || '',
                price: service.price || '',
                duration: service.duration || '',
                short_description: service.short_description || '',
                detailed_content: service.detailed_content || '',
                image_url: service.image_url || '',
                allow_doctor_choice: service.allow_doctor_choice ?? true,
                status: service.status || 'active',
                user_ids: service.doctors?.map(d => d.user.id) || []
              });

              setSelectedDoctors(selectedDoctorOptions);

              console.log('[ServiceModal] DỮ LIỆU CŨ ĐÃ LOAD:', {
                serviceId,
                user_ids: service.doctors?.map(d => d.user.id)
              });
            }
          } catch (err) {
            console.error('Lỗi load service:', err);
            toast.error('Không thể tải thông tin dịch vụ');
          }
        }

        setLoading(false);
      } catch (err) {
        console.error('Lỗi tải dữ liệu:', err);
        toast.error('Không thể tải dữ liệu. Vui lòng thử lại.');
        setLoading(false);
      }
    };

    loadDependencies();
  }, [isOpen, serviceId, isEditMode]);

  // === VALIDATE FIELD ===
  const validateField = (name, value) => {
    let error = '';
    switch (name) {
      case 'name':
        if (!value.trim()) error = 'Tên dịch vụ là bắt buộc';
        else if (value.trim().length < 3) error = 'Tên phải có ít nhất 3 ký tự';
        else if (value.trim().length > 255) error = 'Tên không quá 255 ký tự';
        break;
      case 'category_id':
        if (!value) error = 'Vui lòng chọn danh mục';
        break;
      case 'price':
        if (!value) error = 'Giá là bắt buộc';
        else if (isNaN(value) || parseInt(value) < 0) error = 'Giá phải >= 0';
        break;
      case 'duration':
        if (!value) error = 'Thời lượng là bắt buộc';
        else if (isNaN(value) || parseInt(value) < 1) error = 'Thời lượng >= 1 phút';
        break;
      default:
        break;
    }
    return error;
  };

  // === XỬ LÝ INPUT ===
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleSelectChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleToggleChange = (e) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  // === CHỌN BÁC SĨ (gửi user_id) ===
  const handleDoctorSelectChange = (selectedOptions) => {
    setSelectedDoctors(selectedOptions || []);

    const userIds = selectedOptions ? selectedOptions.map(opt => opt.value) : [];

    setFormData(prev => ({
      ...prev,
      user_ids: userIds
    }));
  };

  // === VALIDATE TOÀN BỘ ===
  const validateForm = () => {
    const newErrors = {};
    newErrors.name = validateField('name', formData.name);
    newErrors.category_id = validateField('category_id', formData.category_id);
    newErrors.price = validateField('price', formData.price);
    newErrors.duration = validateField('duration', formData.duration);

    const filtered = Object.fromEntries(Object.entries(newErrors).filter(([_, v]) => v));
    setErrors(filtered);
    return Object.keys(filtered).length === 0;
  };

  // === SUBMIT FORM ===
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Vui lòng kiểm tra các trường bắt buộc');
      return;
    }

    try {
      const submitData = {
        ...formData,
        user_ids: formData.user_ids.length > 0 ? formData.user_ids : null
      };

      console.log('[ServiceModal] GỬI DỮ LIỆU:', submitData);

      if (isEditMode) {
        await serviceService.updateService(serviceId, submitData);
        toast.success('Cập nhật dịch vụ thành công!');
      } else {
        await serviceService.createService(submitData);
        toast.success('Tạo dịch vụ mới thành công!');
      }

      // Reset
      setFormData(initialFormState);
      setSelectedDoctors([]);
      setErrors({});
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Lỗi submit:', err);
      toast.error(err.response?.data?.message || 'Lỗi hệ thống');
    }
  };

  // === ĐÓNG MODAL ===
  const handleClose = () => {
    setFormData(initialFormState);
    setSelectedDoctors([]);
    setErrors({});
    setLoading(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="service-modal-overlay" onClick={handleClose}>
      <div className="service-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="service-modal-header">
          <h2>{isEditMode ? 'Chỉnh sửa dịch vụ' : 'Tạo dịch vụ mới'}</h2>
          <button className="service-modal-close-btn" onClick={handleClose}>
            <FaTimes />
          </button>
        </div>

        {/* Body */}
        <div className="service-modal-body">
          {loading ? (
            <div className="service-modal-loading">
              <div className="service-modal-spinner"></div>
              <p>Đang tải dữ liệu...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="service-modal-form">

              {/* THÔNG TIN CƠ BẢN */}
              <div className="service-modal-section">
                <h3 className="service-modal-section-title">Thông tin cơ bản</h3>

                <div className="service-modal-row">
                  <div className="service-modal-field">
                    <label>Tên dịch vụ <span className="service-modal-required">*</span></label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="VD: Siêu âm tim Doppler màu"
                      className={errors.name ? 'service-modal-error' : ''}
                    />
                    {errors.name && <span className="service-modal-error-text">{errors.name}</span>}
                  </div>

                  <div className="service-modal-field">
                    <label>Danh mục <span className="service-modal-required">*</span></label>
                    <select
                      name="category_id"
                      value={formData.category_id}
                      onChange={handleSelectChange}
                      className={errors.category_id ? 'service-modal-error' : ''}
                    >
                      <option value="">-- Chọn danh mục --</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                    {errors.category_id && <span className="service-modal-error-text">{errors.category_id}</span>}
                  </div>
                </div>

                <div className="service-modal-row">
                  <div className="service-modal-field">
                    <label>Giá (VNĐ) <span className="service-modal-required">*</span></label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      placeholder="500000"
                      className={errors.price ? 'service-modal-error' : ''}
                    />
                    {errors.price && <span className="service-modal-error-text">{errors.price}</span>}
                  </div>

                  <div className="service-modal-field">
                    <label>Thời lượng (phút) <span className="service-modal-required">*</span></label>
                    <input
                      type="number"
                      name="duration"
                      value={formData.duration}
                      onChange={handleChange}
                      placeholder="30"
                      className={errors.duration ? 'service-modal-error' : ''}
                    />
                    {errors.duration && <span className="service-modal-error-text">{errors.duration}</span>}
                  </div>
                </div>

                <div className="service-modal-field">
                  <label>Mô tả ngắn</label>
                  <textarea
                    name="short_description"
                    value={formData.short_description}
                    onChange={handleChange}
                    rows="2"
                  />
                </div>

                <div className="service-modal-field">
                  <label>Mô tả chi tiết</label>
                  <textarea
                    name="detailed_content"
                    value={formData.detailed_content}
                    onChange={handleChange}
                    rows="4"
                  />
                </div>

                <div className="service-modal-field">
                  <label>URL hình ảnh</label>
                  <input
                    type="url"
                    name="image_url"
                    value={formData.image_url}
                    onChange={handleChange}
                    placeholder="https://..."
                  />
                </div>
              </div>

              {/* CẤU HÌNH */}
              <div className="service-modal-section">
                <h3 className="service-modal-section-title">Cấu hình</h3>

                <div className="service-modal-field">
                  <label>Bác sĩ phụ trách</label>
                  <Select
                    isMulti
                    options={doctors}
                    value={selectedDoctors}
                    onChange={handleDoctorSelectChange}
                    placeholder="Chọn bác sĩ..."
                    className="service-modal-select"
                    classNamePrefix="select"
                  />
                  <small className="service-modal-helper">
                    <FaInfoCircle /> Để trống nếu tất cả bác sĩ đều thực hiện được.
                  </small>
                  {formData.user_ids.length > 0 && (
                    <small style={{ color: '#22c55e', marginTop: '0.5rem', display: 'block' }}>
                      Đã chọn {formData.user_ids.length} bác sĩ
                    </small>
                  )}
                </div>

                <div className="service-modal-toggle">
                  <div className="service-modal-toggle-wrapper">
                    <label className="service-modal-toggle-label">Cho phép khách chọn bác sĩ</label>
                    <label className="service-modal-switch">
                      <input
                        type="checkbox"
                        name="allow_doctor_choice"
                        checked={formData.allow_doctor_choice}
                        onChange={handleToggleChange}
                      />
                      <span className="service-modal-slider"></span>
                    </label>
                  </div>
                  <small className="service-modal-helper">Bật để khách tự chọn</small>
                </div>

                <div className="service-modal-field">
                  <label>Trạng thái</label>
                  <div className="service-modal-radio-group">
                    <label className="service-modal-radio">
                      <input type="radio" name="status" value="active" checked={formData.status === 'active'} onChange={handleChange} />
                      <span><span className="service-modal-status-dot service-modal-status-active"></span> Hoạt động</span>
                    </label>
                    <label className="service-modal-radio">
                      <input type="radio" name="status" value="inactive" checked={formData.status === 'inactive'} onChange={handleChange} />
                      <span><span className="service-modal-status-dot service-modal-status-inactive"></span> Tạm ngưng</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="service-modal-footer">
                <button type="button" className="service-modal-btn service-modal-btn-cancel" onClick={handleClose}>
                  <FaTimes /> Hủy
                </button>
                <button type="submit" className="service-modal-btn service-modal-btn-primary">
                  <FaSave /> {isEditMode ? 'Cập nhật' : 'Tạo mới'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServiceModal;