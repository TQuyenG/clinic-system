// client/src/pages/MedicalRecordFormPage.js
// FILE MỚI - Trang Nhập/Cập nhật Hồ sơ Y tế (BS/Admin)

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import appointmentService from '../services/appointmentService';
import medicalRecordService from '../services/medicalRecordService';
import api from '../services/api'; // [MỚI] Import API instance

// Import CSS
import './MedicalRecordFormPage.css';

// Import Icons (Theo yêu cầu, dùng thư viện)
import {
  FaUserInjured, FaUserMd, FaCalendarAlt, FaNotesMedical,
  FaFileMedical, FaFilePrescription, FaUpload, FaTrash,
  FaPlus, FaSpinner, FaSave, FaExclamationTriangle,
  FaFileImage, FaFilePdf, FaFileWord, FaTimes
} from 'react-icons/fa';

const MedicalRecordFormPage = () => {
  const { code } = useParams(); // Mã lịch hẹn (AP-1234)
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const recordId = searchParams.get('record_id');
  const isUpdateMode = useMemo(() => !!recordId, [recordId]);

  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // === Form State ===
  // 1. Dữ liệu text
  const [formData, setFormData] = useState({
    diagnosis: '',
    symptoms: '',
    treatment_plan: '',
    advice: '',
    follow_up_date: '',
    clinical_note: '', // Thêm ghi chú lâm sàng
    vitals: {          // Thêm các chỉ số sinh tồn
      blood_pressure: '',
      pulse: '',
      temperature: '',
      weight: '',
      height: '',
      respiratory_rate: ''
    }
  });

  // 2. Đơn thuốc
  const [prescriptionList, setPrescriptionList] = useState([
    { name: '', dosage: '', quantity: '', instructions: '' }
  ]);

  // 3. Files (Logic upload phức tạp)
  // 3a. File MỚI (chưa upload)
  const [newTestImages, setNewTestImages] = useState([]); // Mảng các đối tượng File
  const [newReportFiles, setNewReportFiles] = useState([]); // Mảng các đối tượng File
  
  // 3b. File CŨ (đã upload, dùng cho chế độ Update)
  const [keptTestImages, setKeptTestImages] = useState([]); // Mảng các object { filename, url }
  const [keptReportFiles, setKeptReportFiles] = useState([]); // Mảng các object { filename, url }
  // [MỚI] State quản lý gợi ý thuốc
  const [medicineSuggestions, setMedicineSuggestions] = useState([]); 
  const [showSuggestionsIndex, setShowSuggestionsIndex] = useState(null);

  // === Tải dữ liệu ===
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // 1. Luôn tải thông tin lịch hẹn
        const apptResponse = await appointmentService.getAppointmentByCode(code);
        if (!apptResponse.data.success) {
          toast.error('Không tìm thấy lịch hẹn.');
          navigate('/quan-ly-lich-hen');
          return;
        }
        const appt = apptResponse.data.data;
        setAppointment(appt);

        // Nếu là chế độ TẠO nhưng lịch hẹn này đã có hồ sơ y tế, chuyển sang trang Cập nhật
        if (!isUpdateMode && appt?.MedicalRecord) {
          toast.info('Lịch hẹn này đã có hồ sơ y tế. Chuyển sang trang cập nhật.');
          navigate(`/lich-hen/${code}?record_id=${appt.MedicalRecord.id}`);
          return;
        }

        // 2. Nếu là chế độ Cập nhật, tải hồ sơ cũ
        if (isUpdateMode) {
          const recordResponse = await medicalRecordService.getMedicalRecordById(recordId);
          if (!recordResponse.data.success) {
            toast.error('Không tìm thấy hồ sơ y tế.');
            navigate(`/lich-hen/${code}`);
            return;
          }
          const record = recordResponse.data.data;
          // Điền dữ liệu cũ vào form
          setFormData({
            diagnosis: record.diagnosis || '',
            symptoms: record.symptoms || '',
            treatment_plan: record.treatment_plan || '',
            advice: record.advice || '',
            follow_up_date: record.follow_up_date || '',
            clinical_note: record.clinical_note || '',
            vitals: record.vitals_json || {
              blood_pressure: '', pulse: '', temperature: '', 
              weight: '', height: '', respiratory_rate: ''
            }
          });
          setPrescriptionList(record.prescription_json || [{ name: '', dosage: '', quantity: '', instructions: '' }]);
          setKeptTestImages(record.test_images_json || []);
          setKeptReportFiles(record.report_files_json || []);
        }

      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Lỗi khi tải dữ liệu. Vui lòng thử lại.');
        navigate('/quan-ly-lich-hen');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [code, recordId, isUpdateMode, navigate]);

  // === Xử lý Form (Text) ===
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    
    // Xử lý riêng cho object vitals
    if (name.startsWith('vitals.')) {
      const vitalKey = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        vitals: { ...prev.vitals, [vitalKey]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // === Xử lý Đơn thuốc ===
  const handlePrescriptionChange = (index, e) => {
    const { name, value } = e.target;
    const newList = [...prescriptionList];
    newList[index][name] = value;
    setPrescriptionList(newList);
  };

  const addPrescriptionRow = () => {
    setPrescriptionList([...prescriptionList, { name: '', dosage: '', quantity: '', instructions: '' }]);
  };

  const removePrescriptionRow = (index) => {
    if (prescriptionList.length > 1) {
      setPrescriptionList(prescriptionList.filter((_, i) => i !== index));
    }
  };

  // [MỚI] Hàm tìm kiếm thuốc khi gõ
  const handleSearchMedicine = async (index, value) => {
    // 1. Cập nhật text hiển thị ngay lập tức
    const newList = [...prescriptionList];
    newList[index].name = value;
    setPrescriptionList(newList);

    // 2. Gọi API tìm kiếm (Debounce đơn giản: chỉ tìm khi > 1 ký tự)
    if (value.trim().length > 1) {
      try {
        const res = await api.get(`/articles/medicines?search=${encodeURIComponent(value)}&limit=5`);
        if (res.data.success) {
          setMedicineSuggestions(res.data.medicines || []);
          setShowSuggestionsIndex(index);
        }
      } catch (error) {
        console.error(error);
      }
    } else {
      setMedicineSuggestions([]);
      setShowSuggestionsIndex(null);
    }
  };

  // [MỚI] Hàm chọn thuốc từ danh sách gợi ý
  const selectMedicine = (index, medicine) => {
    const newList = [...prescriptionList];
    newList[index].name = medicine.name;
    newList[index].unit = medicine.unit || 'Hộp'; // Tự động điền đơn vị
    setPrescriptionList(newList);
    setShowSuggestionsIndex(null); // Ẩn gợi ý
  };

  // [MỚI] Ẩn gợi ý khi click ra ngoài (dùng setTimeout để sự kiện click kịp chạy)
  const handleBlurSearch = () => {
    setTimeout(() => setShowSuggestionsIndex(null), 200);
  };

  // === Xử lý Files ===
  const handleFileChange = (e, fileType) => {
    const files = Array.from(e.target.files);
    if (fileType === 'test_images') {
      setNewTestImages(prev => [...prev, ...files]);
    } else {
      setNewReportFiles(prev => [...prev, ...files]);
    }
    // Reset input để có thể chọn lại file giống
    e.target.value = null; 
  };

  const removeNewFile = (index, fileType) => {
    if (fileType === 'test_images') {
      setNewTestImages(prev => prev.filter((_, i) => i !== index));
    } else {
      setNewReportFiles(prev => prev.filter((_, i) => i !== index));
    }
  };

  const removeKeptFile = (index, fileType) => {
    // Khi xóa file "cũ", ta chỉ cần xóa nó khỏi mảng "kept"
    // Backend sẽ tự động phát hiện file nào không có trong "kept" và xóa đi
    if (fileType === 'test_images') {
      setKeptTestImages(prev => prev.filter((_, i) => i !== index));
    } else {
      setKeptReportFiles(prev => prev.filter((_, i) => i !== index));
    }
  };

  // === Xử lý Submit ===
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check quyền nhân viên lâm sàng (Chỉ lưu sinh hiệu, không cần chẩn đoán)
    const isClinicalStaff = user?.role === 'staff' && (user?.department === 'clinical' || user?.staff?.department === 'clinical');

    // Validation: Nếu là bác sĩ thì bắt buộc có chẩn đoán. Staff thì không cần.
    if (!isClinicalStaff && !formData.diagnosis.trim()) {
      toast.error('Chẩn đoán là trường bắt buộc đối với Bác sĩ.');
      return;
    }

    try {
      setSubmitting(true);
      const submissionData = new FormData();
      
      // Định tuyến cờ để Backend biết lưu dạng "nháp" hay "hoàn thành"
      submissionData.append('is_draft', isClinicalStaff ? 'true' : 'false');

      // 1. Thêm appointment_id (BẮT BUỘC)
      submissionData.append('appointment_id', appointment.id);

      // 2. Thêm dữ liệu text
      submissionData.append('diagnosis', formData.diagnosis);
      submissionData.append('symptoms', formData.symptoms);
      submissionData.append('treatment_plan', formData.treatment_plan);
      submissionData.append('advice', formData.advice);
      submissionData.append('follow_up_date', formData.follow_up_date);

      // 3. Thêm đơn thuốc (JSON string)
      // Lọc bỏ các hàng trống
      const validPrescriptions = prescriptionList.filter(p => p.name && p.quantity);
      if (validPrescriptions.length > 0) {
        submissionData.append('prescription_json', JSON.stringify(validPrescriptions));
      }

      // 4. Thêm file
      // 4a. File MỚI (để backend xử lý)
      newTestImages.forEach(file => {
        submissionData.append('test_images', file);
      });
      newReportFiles.forEach(file => {
        submissionData.append('report_files', file);
      });
      
      // 4b. File CŨ (để backend biết giữ lại)
      // Đây là logic quan trọng khớp với backend của bạn
      if (isUpdateMode) {
        submissionData.append('keep_test_images', JSON.stringify(keptTestImages));
        submissionData.append('keep_report_files', JSON.stringify(keptReportFiles));
      }

      // 5. Gọi API
      if (isUpdateMode) {
        await medicalRecordService.updateMedicalRecord(recordId, submissionData);
        toast.success('Cập nhật hồ sơ y tế thành công!');
      } else {
        await medicalRecordService.createMedicalRecord(submissionData);
        toast.success('Tạo hồ sơ y tế thành công!');
      }

      // 6. Điều hướng
      navigate(`/lich-hen/${code}`);

    } catch (error) {
      console.error('Submit error:', error);
      toast.error(error.response?.data?.message || 'Đã xảy ra lỗi, vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper render file
  const renderFileIcon = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return <FaFileImage />;
    if (ext === 'pdf') return <FaFilePdf />;
    if (['doc', 'docx'].includes(ext)) return <FaFileWord />;
    return <FaFileMedical />;
  };

  if (loading) {
    return (
      <div className="medical-record-form-page-container medical-record-form-page-loading">
        <FaSpinner className="medical-record-form-page-spin-icon" />
        <span>Đang tải dữ liệu hồ sơ...</span>
      </div>
    );
  }

  return (
    <div className="medical-record-form-page-container">
      <form className="medical-record-form-page-form" onSubmit={handleSubmit}>
        
        {/* Header */}
        <div className="medical-record-form-page-header">
          <div className="medical-record-form-page-header-content">
            <h1>{isUpdateMode ? 'Cập nhật' : 'Tạo'} Hồ Sơ Y Tế</h1>
            <p>Nhập kết quả khám cho lịch hẹn <strong>{appointment?.code}</strong></p>
          </div>
          <button 
            type="submit" 
            className="medical-record-form-page-btn-submit" 
            disabled={submitting}
          >
            {submitting ? <FaSpinner className="medical-record-form-page-spin-icon-small" /> : <FaSave />}
            {isUpdateMode ? 'Lưu Cập Nhật' : 'Lưu Hồ Sơ'}
          </button>
        </div>

        {/* Thông tin lịch hẹn */}
        <div className="medical-record-form-page-card medical-record-form-page-info-card">
          <div className="medical-record-form-page-info-item">
            <FaUserInjured className="medical-record-form-page-info-icon" />
            <div className="medical-record-form-page-info-text">
              <label>Bệnh nhân</label>
              <span>{appointment?.Patient?.user?.full_name || appointment?.guest_name}</span>
            </div>
          </div>
          <div className="medical-record-form-page-info-item">
            <FaUserMd className="medical-record-form-page-info-icon" />
            <div className="medical-record-form-page-info-text">
              <label>Bác sĩ</label>
              <span>{appointment?.Doctor?.user?.full_name}</span>
            </div>
          </div>
          <div className="medical-record-form-page-info-item">
            <FaCalendarAlt className="medical-record-form-page-info-icon" />
            <div className="medical-record-form-page-info-text">
              <label>Ngày khám</label>
              <span>{new Date(appointment?.appointment_date).toLocaleDateString('vi-VN')}</span>
            </div>
          </div>
        </div>

        {/* Cột chính */}
        <div className="medical-record-form-page-main-grid">
          
          {/* Cột trái (Form chính) */}
          <div className="medical-record-form-page-left-col">

            {/* 0. Chỉ số sinh tồn (Dành cho Điều dưỡng / Vận hành lâm sàng) */}
            <div className="medical-record-form-page-card" style={{ backgroundColor: '#fff5f8', borderColor: '#ffb6c1' }}>
              <h2 className="medical-record-form-page-card-title" style={{ color: '#d81b60' }}>
                <FaNotesMedical /> Chỉ số sinh tồn (Sinh hiệu)
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                <div className="medical-record-form-page-form-group">
                  <label>Huyết áp (mmHg)</label>
                  <input type="text" name="vitals.blood_pressure" className="medical-record-form-page-input" value={formData.vitals.blood_pressure} onChange={handleFormChange} placeholder="Ví dụ: 120/80" />
                </div>
                <div className="medical-record-form-page-form-group">
                  <label>Mạch (l/p)</label>
                  <input type="number" name="vitals.pulse" className="medical-record-form-page-input" value={formData.vitals.pulse} onChange={handleFormChange} />
                </div>
                <div className="medical-record-form-page-form-group">
                  <label>Nhiệt độ (°C)</label>
                  <input type="number" step="0.1" name="vitals.temperature" className="medical-record-form-page-input" value={formData.vitals.temperature} onChange={handleFormChange} />
                </div>
                <div className="medical-record-form-page-form-group">
                  <label>Cân nặng (kg)</label>
                  <input type="number" step="0.1" name="vitals.weight" className="medical-record-form-page-input" value={formData.vitals.weight} onChange={handleFormChange} />
                </div>
                <div className="medical-record-form-page-form-group">
                  <label>Chiều cao (cm)</label>
                  <input type="number" name="vitals.height" className="medical-record-form-page-input" value={formData.vitals.height} onChange={handleFormChange} />
                </div>
                <div className="medical-record-form-page-form-group">
                  <label>Nhịp thở (l/p)</label>
                  <input type="number" name="vitals.respiratory_rate" className="medical-record-form-page-input" value={formData.vitals.respiratory_rate} onChange={handleFormChange} />
                </div>
                <div className="medical-record-form-page-form-group full-span">
                  <label>Ghi chú lâm sàng ban đầu</label>
                  <textarea name="clinical_note" className="medical-record-form-page-textarea" rows="2" value={formData.clinical_note} onChange={handleFormChange} placeholder="Triệu chứng hiện tại, lý do khám..." />
                </div>
              </div>
            </div>
            
            {/* 1. Kết quả khám */}
            <div className="medical-record-form-page-card">
              <h2 className="medical-record-form-page-card-title">
                <FaNotesMedical />
                Kết quả khám
              </h2>
              <div className="medical-record-form-page-form-group-grid-2">
                {/* Chẩn đoán (Bắt buộc) */}
                <div className="medical-record-form-page-form-group full-span">
                  <label htmlFor="diagnosis">Chẩn đoán *</label>
                  <textarea
                    id="diagnosis"
                    name="diagnosis"
                    className="medical-record-form-page-textarea medical-record-form-page-highlight"
                    rows="3"
                    placeholder="Nhập chẩn đoán của bác sĩ..."
                    value={formData.diagnosis}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                {/* Triệu chứng */}
                <div className="medical-record-form-page-form-group">
                  <label htmlFor="symptoms">Triệu chứng (nếu có)</label>
                  <textarea
                    id="symptoms"
                    name="symptoms"
                    className="medical-record-form-page-textarea"
                    rows="2"
                    placeholder="Mô tả triệu chứng..."
                    value={formData.symptoms}
                    onChange={handleFormChange}
                  />
                </div>
                {/* Kế hoạch điều trị */}
                <div className="medical-record-form-page-form-group">
                  <label htmlFor="treatment_plan">Kế hoạch điều trị</label>
                  <textarea
                    id="treatment_plan"
                    name="treatment_plan"
                    className="medical-record-form-page-textarea"
                    rows="2"
                    placeholder="Kế hoạch điều trị..."
                    value={formData.treatment_plan}
                    onChange={handleFormChange}
                  />
                </div>
                {/* Lời khuyên */}
                <div className="medical-record-form-page-form-group full-span">
                  <label htmlFor="advice">Lời khuyên</label>
                  <textarea
                    id="advice"
                    name="advice"
                    className="medical-record-form-page-textarea"
                    rows="2"
                    placeholder="Lời khuyên, dặn dò..."
                    value={formData.advice}
                    onChange={handleFormChange}
                  />
                </div>
              </div>
            </div>

            {/* 2. Đơn thuốc */}
            <div className="medical-record-form-page-card">
              <h2 className="medical-record-form-page-card-title">
                <FaFilePrescription />
                Đơn thuốc (Nếu có)
              </h2>
              <div className="medical-record-form-page-prescription-list">
                {prescriptionList.map((item, index) => (
                  <div key={index} className="medical-record-form-page-prescription-row" style={{position: 'relative', overflow: 'visible'}}>
                    
                    {/* [MỚI] Ô NHẬP TÊN THUỐC CÓ GỢI Ý & SEARCH */}
                    <div style={{flex: 2, position: 'relative'}}>
                      <input
                        type="text"
                        name="name"
                        className="medical-record-form-page-input"
                        placeholder="Nhập tên thuốc..."
                        value={item.name}
                        onChange={(e) => handleSearchMedicine(index, e.target.value)}
                        onBlur={handleBlurSearch}
                        autoComplete="off"
                      />
                      {/* Dropdown Gợi ý */}
                      {showSuggestionsIndex === index && medicineSuggestions.length > 0 && (
                        <ul style={{
                          position: 'absolute', top: '100%', left: 0, right: 0,
                          backgroundColor: 'white', border: '1px solid #ddd',
                          borderRadius: '4px', zIndex: 1000, padding: 0, margin: 0,
                          listStyle: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                          maxHeight: '200px', overflowY: 'auto'
                        }}>
                          {medicineSuggestions.map((med) => (
                            <li 
                              key={med.id}
                              onClick={() => selectMedicine(index, med)}
                              style={{
                                padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #eee',
                                fontSize: '14px', color: '#333'
                              }}
                              onMouseEnter={(e) => e.target.style.backgroundColor = '#f0fdf4'}
                              onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                            >
                              <strong>{med.name}</strong> <small style={{color:'#666'}}>({med.unit}) - {parseInt(med.price).toLocaleString()}đ</small>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* [MỚI] Ô ĐƠN VỊ TÍNH (Đã update width nhỏ gọn hơn) */}
                    <input
                      type="text"
                      name="unit"
                      className="medical-record-form-page-input"
                      placeholder="Đơn vị"
                      value={item.unit}
                      onChange={(e) => handlePrescriptionChange(index, e)}
                      style={{width: '80px'}} 
                    />
                  <input
                    type="text"
                    name="quantity"
                    className="medical-record-form-page-input input-small"
                    placeholder="SL"
                    value={item.quantity}
                    onChange={(e) => handlePrescriptionChange(index, e)}
                  />
                    <input
                      type="text"
                      name="dosage"
                      className="medical-record-form-page-input input-small"
                      placeholder="Liều dùng"
                      value={item.dosage}
                      onChange={(e) => handlePrescriptionChange(index, e)}
                    />
                    <input
                      type="text"
                      name="instructions"
                      className="medical-record-form-page-input input-large"
                      placeholder="Hướng dẫn (VD: Sáng 1, Tối 1 sau ăn)"
                      value={item.instructions}
                      onChange={(e) => handlePrescriptionChange(index, e)}
                    />
                    <button 
                      type="button" 
                      className="medical-record-form-page-btn-icon medical-record-form-page-btn-remove"
                      onClick={() => removePrescriptionRow(index)}
                      disabled={prescriptionList.length === 1}
                    >
                      <FaTrash />
                    </button>
                  </div>
                ))}
              </div>
              <button 
                type="button" 
                className="medical-record-form-page-btn-add"
                onClick={addPrescriptionRow}
              >
                <FaPlus /> Thêm thuốc
              </button>
            </div>
          </div>
          
          {/* Cột phải (Tái khám & Upload) */}
          <div className="medical-record-form-page-right-col">

            {/* 3. Tái khám */}
            <div className="medical-record-form-page-card">
              <h2 className="medical-record-form-page-card-title">
                <FaCalendarAlt />
                Tái khám
              </h2>
              <div className="medical-record-form-page-form-group">
                <label htmlFor="follow_up_date">Ngày tái khám (Nếu có)</label>
                <input
                  type="date"
                  id="follow_up_date"
                  name="follow_up_date"
                  className="medical-record-form-page-input"
                  min={new Date().toISOString().split('T')[0]}
                  value={formData.follow_up_date}
                  onChange={handleFormChange}
                />
              </div>
            </div>

            {/* 4. Upload Files */}
            <div className="medical-record-form-page-card">
              <h2 className="medical-record-form-page-card-title">
                <FaUpload />
                Tài liệu đính kèm
              </h2>
              {/* Cảnh báo an toàn */}
              <div className="medical-record-form-page-alert-box">
                <FaExclamationTriangle />
                <span>Không upload thông tin nhạy cảm (CCCD, Ngân hàng). Chỉ upload tệp liên quan đến khám bệnh.</span>
              </div>

              {/* Upload Ảnh XN */}
              <div className="medical-record-form-page-file-group">
                <label>Ảnh xét nghiệm (jpg, png, webp)</label>
                <label htmlFor="test_images_input" className="medical-record-form-page-file-uploader">
                  <FaUpload /> Nhấn để chọn ảnh
                </label>
                <input
                  id="test_images_input"
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => handleFileChange(e, 'test_images')}
                  style={{ display: 'none' }}
                />
                <div className="medical-record-form-page-file-list">
                  {keptTestImages.map((file, index) => (
                    <div key={`kept-img-${index}`} className="medical-record-form-page-file-item">
                      <FaFileImage />
                      <span className="medical-record-form-page-file-name" title={file.originalname}>{file.originalname}</span>
                      <button type="button" onClick={() => removeKeptFile(index, 'test_images')}><FaTimes /></button>
                    </div>
                  ))}
                  {newTestImages.map((file, index) => (
                    <div key={`new-img-${index}`} className="medical-record-form-page-file-item new">
                      <FaFileImage />
                      <span className="medical-record-form-page-file-name" title={file.name}>{file.name}</span>
                      <button type="button" onClick={() => removeNewFile(index, 'test_images')}><FaTimes /></button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upload File Báo cáo */}
              <div className="medical-record-form-page-file-group">
                <label>File báo cáo (pdf, doc, docx)</label>
                <label htmlFor="report_files_input" className="medical-record-form-page-file-uploader">
                  <FaUpload /> Nhấn để chọn file
                </label>
                <input
                  id="report_files_input"
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => handleFileChange(e, 'report_files')}
                  style={{ display: 'none' }}
                />
                <div className="medical-record-form-page-file-list">
                  {keptReportFiles.map((file, index) => (
                    <div key={`kept-rep-${index}`} className="medical-record-form-page-file-item">
                      {renderFileIcon(file.originalname)}
                      <span className="medical-record-form-page-file-name" title={file.originalname}>{file.originalname}</span>
                      <button type="button" onClick={() => removeKeptFile(index, 'report_files')}><FaTimes /></button>
                    </div>
                  ))}
                  {newReportFiles.map((file, index) => (
                    <div key={`new-rep-${index}`} className="medical-record-form-page-file-item new">
                      {renderFileIcon(file.name)}
                      <span className="medical-record-form-page-file-name" title={file.name}>{file.name}</span>
                      <button type="button" onClick={() => removeNewFile(index, 'report_files')}><FaTimes /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>

      </form>
    </div>
  );
};

export default MedicalRecordFormPage;