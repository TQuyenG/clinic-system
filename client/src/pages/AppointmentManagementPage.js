// client/src/pages/AppointmentManagementPage.js
// PHIÊN BẢN CẬP NHẬT HOÀN CHỈNH (ĐÃ FIX LỖI UNDEFINED PHONE)
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import appointmentService from '../services/appointmentService';
import medicalRecordService from '../services/medicalRecordService'; 
import ConfirmModal from '../components/medical/ConfirmModal';
import { toast } from 'react-toastify';

import { 
  FaCalendarAlt, FaClock, FaUserMd, FaCheckCircle, FaTimesCircle, 
  FaHourglassHalf, FaEye, FaBan, FaFilter, FaSearch, FaDownload, 
  FaPhone, FaEnvelope, FaSpinner, FaTimes,
  FaChevronDown, FaChevronUp, FaChevronRight, FaLock, FaSyncAlt, FaCheck,
  FaHospital, FaPlay, FaNotesMedical, FaMoneyBillWave, FaClipboardCheck,
  FaStethoscope, FaFileAlt
} from 'react-icons/fa';
import './AppointmentManagementPage.css'; 

const AppointmentManagementPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth(); 
  const [assignedDoctors, setAssignedDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');

  // --- 1. Lấy danh sách bác sĩ nếu là Staff ---
  useEffect(() => {
    const fetchAssignedDoctors = async () => {
      if (user && user.role === 'staff') {
        try {
          const token = localStorage.getItem('token');
          const profileRes = await axios.get('http://localhost:3001/api/staff/my-profile', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (profileRes.data.success) {
            const staffId = profileRes.data.data.id;
            const doctorsRes = await axios.get(`http://localhost:3001/api/staff/${staffId}/doctors`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (doctorsRes.data.success) {
              console.log('DEBUG assignedDoctors:', doctorsRes.data.data);
              setAssignedDoctors(doctorsRes.data.data || []);
            }
          }
        } catch (error) {
          console.error("Lỗi lấy danh sách bác sĩ:", error);
        }
      }
    };
    fetchAssignedDoctors();
  }, [user]);

  // Helper function để nhóm bác sĩ theo specialty
  const groupDoctorsBySpecialty = (doctors) => {
    const groups = {};
    doctors.forEach(doctor => {
      const specialty = doctor.specialty?.name || doctor.Specialty?.name || 'Chưa phân loại';
      if (!groups[specialty]) {
        groups[specialty] = [];
      }
      groups[specialty].push(doctor);
    });
    return groups;
  };

  const doctorGroups = groupDoctorsBySpecialty(assignedDoctors);

  // Khi chọn bác sĩ -> Gọi lại hàm lấy dữ liệu
  useEffect(() => {
    fetchAllAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDoctorId]); 
  
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [filters, setFilters] = useState({
    status: 'all',
    date: '',
    doctor: '',
    search: '',
    sortBy: 'newest', // newest, oldest, code
    service: '', // Lọc theo dịch vụ
    appointmentType: 'all', // online, offline, all
    paymentStatus: 'all' // unpaid, paid_online, paid_at_clinic, all
  });
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState('');
  const [actionReason, setActionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State cho hàng mở rộng
  const [expandedRow, setExpandedRow] = useState(null); 
  
  // State cho nút reset code
  const [isResettingCode, setIsResettingCode] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState(null);

  // State cho modal payment
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState({
    payment_method: 'cash',
    paid_at: new Date().toISOString().slice(0, 16)
  });

  useEffect(() => {
    const allowedStatuses = new Set(['all', 'pending', 'confirmed', 'upcoming', 'waiting_pay', 'waiting_exam', 'in_progress', 'completed', 'passed', 'cancelled']);
    const searchParams = new URLSearchParams(location.search);
    const status = searchParams.get('status');
    const date = searchParams.get('date');

    const nextFilters = {};

    if (status && allowedStatuses.has(status)) {
      nextFilters.status = status;
    }

    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      nextFilters.date = date;
    }

    if (Object.keys(nextFilters).length > 0) {
      setFilters((previousFilters) => ({
        ...previousFilters,
        ...nextFilters
      }));
    }
  }, [location.search]);

  useEffect(() => {
    fetchAllAppointments();
  }, []);

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, appointments]);

  // --- 2. Lấy dữ liệu & Sắp xếp Mới nhất trước ---
  const fetchAllAppointments = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedDoctorId) params.doctor_id = selectedDoctorId;
      
      let response;
      // NẾU LÀ STAFF LÂM SÀNG -> Gọi API lấy lịch của bác sĩ mình quản lý
      if (user?.role === 'staff' && user?.department === 'clinical') {
         response = await appointmentService.getStaffManagedAppointments(params);
      } 
      // NẾU LÀ ADMIN HOẶC CÁC PHÒNG BAN KHÁC -> Gọi API lấy TẤT CẢ
      else {
         response = await appointmentService.getAllAppointments(params); 
      }
      
      if (response.data.success) {
        // SẮP XẾP: Ngày giờ giảm dần (Mới nhất lên đầu)
        const sortedAppointments = (response.data.data || []).sort((a, b) => {
          const dateTimeA = new Date(`${a.appointment_date}T${a.appointment_start_time}`);
          const dateTimeB = new Date(`${b.appointment_date}T${b.appointment_start_time}`);
          
          if (isNaN(dateTimeA.getTime()) && isNaN(dateTimeB.getTime())) return 0;
          if (isNaN(dateTimeA.getTime())) return 1;
          if (isNaN(dateTimeB.getTime())) return -1;

          return dateTimeB.getTime() - dateTimeA.getTime();
        });
        setAppointments(sortedAppointments);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Lỗi khi tải danh sách lịch hẹn');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...appointments];
    if (filters.status !== 'all') {
      filtered = filtered.filter(apt => apt.status === filters.status);
    }
    if (filters.date) {
      filtered = filtered.filter(apt => apt.appointment_date === filters.date);
    }
    if (filters.doctor) {
      filtered = filtered.filter(apt => 
        apt.Doctor?.user?.full_name?.toLowerCase().includes(filters.doctor.toLowerCase())
      );
    }
    if (filters.service) {
      filtered = filtered.filter(apt => 
        apt.Service?.name?.toLowerCase().includes(filters.service.toLowerCase())
      );
    }
    if (filters.appointmentType !== 'all') {
      filtered = filtered.filter(apt => apt.appointment_type === filters.appointmentType);
    }
    if (filters.paymentStatus !== 'all') {
      filtered = filtered.filter(apt => apt.payment_status === filters.paymentStatus);
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(apt => 
        apt.code?.toLowerCase().includes(searchLower) ||
        (apt.Patient?.user?.full_name || apt.guest_name)?.toLowerCase().includes(searchLower) ||
        (apt.Patient?.user?.email || apt.guest_email)?.toLowerCase().includes(searchLower) ||
        (apt.Patient?.user?.phone || apt.guest_phone)?.includes(filters.search)
      );
    }

    // Sắp xếp
    if (filters.sortBy === 'newest') {
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (filters.sortBy === 'oldest') {
      filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (filters.sortBy === 'code') {
      filtered.sort((a, b) => (a.code || '').localeCompare(b.code || ''));
    }

    setFilteredAppointments(filtered);
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
  };

  const resetFilters = () => {
    setFilters({ 
      status: 'all', 
      date: '', 
      doctor: '', 
      search: '', 
      sortBy: 'newest',
      service: '',
      appointmentType: 'all',
      paymentStatus: 'all'
    });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return 'N/A';
    return timeStr.slice(0, 5);
  };

  // --- Logic Modal Action ---
  const openActionModal = (appointment, type) => {
    setSelectedAppointment(appointment);
    setActionType(type);
    setShowActionModal(true);
  };
  const closeActionModal = () => {
    setShowActionModal(false);
    setSelectedAppointment(null);
    setActionType('');
    setActionReason('');
  };
  const handleConfirmAction = async () => {
    if (!selectedAppointment) return;
    const appointmentCode = selectedAppointment.code;
    try {
      setIsSubmitting(true);
      switch (actionType) {
        case 'confirm':
          await appointmentService.confirmAppointment(appointmentCode);
          toast.success('Xác nhận lịch hẹn thành công');
          break;
        case 'cancel':
          if (!actionReason.trim()) {
            toast.warn('Vui lòng nhập lý do hủy lịch');
            setIsSubmitting(false);
            return;
          }
          await appointmentService.cancelAppointment(appointmentCode, actionReason);
          toast.success('Hủy lịch hẹn thành công');
          break;
        default:
          break;
      }
      fetchAllAppointments();
      closeActionModal();
    } catch (error) {
      console.error('Error performing action:', error);
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Logic Expand & Reset Code ---
  const toggleResultRow = (recordId) => {
    if (expandedRow === recordId) {
      setExpandedRow(null); 
    } else {
      setExpandedRow(recordId); 
    }
  };

  const handleResetCodeClick = (recordId) => {
    if (isResettingCode) return;
    setSelectedRecordId(recordId);
    setShowConfirmModal(true); 
  };

  // --- Logic Payment Modal ---
  const openPaymentModal = (appointment) => {
    setSelectedAppointment(appointment);
    setPaymentData({
      payment_method: 'cash',
      paid_at: new Date().toISOString().slice(0, 16)
    });
    setShowPaymentModal(true);
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedAppointment(null);
    setPaymentData({
      payment_method: 'cash',
      paid_at: new Date().toISOString().slice(0, 16)
    });
  };

  const handleConfirmPayment = async () => {
    if (!selectedAppointment) return;
    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('token');
      await axios.put(
        `http://localhost:3001/api/appointments/${selectedAppointment.id}/payment`,
        paymentData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Cập nhật trạng thái thanh toán thành công');
      fetchAllAppointments();
      closePaymentModal();
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error(error.response?.data?.message || 'Có lỗi khi cập nhật thanh toán');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleConfirmReset = async () => {
    if (!selectedRecordId) return;
    try {
      setIsResettingCode(true); 
      const response = await medicalRecordService.resetLookupCodeByAdmin(selectedRecordId);
      if (response.data.success) {
        toast.success(
          <div>
            <strong>{response.data.message}</strong><br /> 
            Mã mới: <strong style={{ color: '#D9534F' }}>{response.data.newLookupCode}</strong>
          </div>,
          { autoClose: 10000 }
        );
        fetchAllAppointments();
      }
    } catch (error) {
      console.error('Reset code error:', error);
      toast.error(error.response?.data?.message || 'Lỗi khi reset mã');
    } finally {
      setIsResettingCode(false);
      setShowConfirmModal(false); 
      setSelectedRecordId(null);
    }
  };

  // --- Helper Helpers ---
  const getStatusBadge = (status) => {
    let text, icon, className;
    switch (status) {
      case 'pending':
        text = 'Chờ xác nhận'; icon = <FaHourglassHalf />; className = 'amp-status-pending'; break;
      case 'confirmed':
        text = 'Đã xác nhận'; icon = <FaCheckCircle />; className = 'amp-status-confirmed'; break;
      case 'upcoming':
        text = 'Sắp tới'; icon = <FaClock />; className = 'amp-status-upcoming'; break;
      case 'waiting_pay':
        text = 'Chờ thanh toán'; icon = <FaMoneyBillWave />; className = 'amp-status-waiting-pay'; break;
      case 'waiting_exam':
        text = 'Chờ khám'; icon = <FaHospital />; className = 'amp-status-waiting-exam'; break;
      case 'in_progress':
        text = 'Đang khám'; icon = <FaClock />; className = 'amp-status-in-progress'; break;
      case 'completed':
        text = 'Hoàn thành'; icon = <FaCheckCircle />; className = 'amp-status-completed'; break;
      case 'passed':
        text = 'Đã qua'; icon = <FaTimesCircle />; className = 'amp-status-passed'; break;
      case 'cancelled':
        text = 'Đã hủy'; icon = <FaTimesCircle />; className = 'amp-status-cancelled'; break;
      default:
        text = 'Không rõ'; icon = <FaTimes />; className = 'amp-status-cancelled'; break;
    }
    return <span className={`admin-appt-page-status-badge ${className}`}>{icon} {text}</span>;
  };

  const getPaymentStatusBadge = (paymentStatus) => {
    let text, className, icon;
    switch (paymentStatus) {
      case 'unpaid':
        text = 'Chưa thanh toán'; className = 'amp-payment-unpaid'; icon = <FaClock className="amp-me-1"/>; break;
      case 'paid_online':
        text = 'Đã thanh toán'; className = 'amp-payment-paid-online'; icon = <FaCheckCircle className="amp-me-1"/>; break;
      case 'paid_at_clinic':
        text = 'Thanh toán tại quầy'; className = 'amp-payment-paid-clinic'; icon = <FaHospital className="amp-me-1"/>; break;
      case 'refunded':
        text = 'Đã hoàn tiền'; className = 'amp-payment-refunded'; icon = <FaTimesCircle className="amp-me-1"/>; break;
      case 'not_required':
        text = 'Miễn phí'; className = 'amp-payment-not-required'; icon = <FaCheckCircle className="amp-me-1"/>; break;
      default:
        text = 'Không rõ'; className = 'amp-payment-unpaid'; icon = <FaClock className="amp-me-1"/>; break;
    }
    return <span className={`amp-payment-status-badge ${className}`}>{icon}{text}</span>;
  };

  const getMedicalRecordBadge = (status) => {
    if (status === 'has_record') {
      return <span className="amp-medical-record-badge amp-has-record"><FaCheckCircle className="amp-me-1"/>Có HSKB</span>;
    }
    return <span className="amp-medical-record-badge amp-no-record"><FaTimes className="amp-me-1"/>Chưa có</span>;
  };
  
  const getStats = () => {
    const total = appointments.length;
    // Tính toán dựa trên danh sách filteredAppointments để số liệu khớp với bộ lọc
    const filteredTotal = filteredAppointments.length;
    
    // Trạng thái lịch hẹn (giống như trong bộ lọc)
    const filteredPending = filteredAppointments.filter(a => a.status === 'pending').length;
    const filteredConfirmed = filteredAppointments.filter(a => a.status === 'confirmed').length;
    const filteredUpcoming = filteredAppointments.filter(a => a.status === 'upcoming').length;
    const filteredWaitingPay = filteredAppointments.filter(a => a.status === 'waiting_pay').length;
    const filteredWaitingExam = filteredAppointments.filter(a => a.status === 'waiting_exam').length;
    const filteredInProgress = filteredAppointments.filter(a => a.status === 'in_progress').length;
    const filteredCompleted = filteredAppointments.filter(a => a.status === 'completed').length;
    const filteredPassed = filteredAppointments.filter(a => a.status === 'passed').length;
    const filteredCancelled = filteredAppointments.filter(a => a.status === 'cancelled').length;
    
    return { 
      total, 
      filteredTotal, 
      filteredPending, 
      filteredConfirmed,
      filteredUpcoming,
      filteredWaitingPay,
      filteredWaitingExam,
      filteredInProgress,
      filteredCompleted,
      filteredPassed,
      filteredCancelled
    };
  };

  const exportToCSV = () => {
    const headers = ["Mã Lịch Hẹn", "Bệnh nhân", "Liên hệ", "Email", "Dịch vụ", "Bác sĩ", "Ngày Khám", "Giờ Khám", "Trạng thái"];
    const rows = filteredAppointments.map(apt => [
      `"${apt.code}"`,
      `"${apt.Patient?.user?.full_name || apt.guest_name || 'Khách'}"`,
      `"${apt.Patient?.user?.phone || apt.guest_phone || 'N/A'}"`,
      `"${apt.Patient?.user?.email || apt.guest_email || 'N/A'}"`,
      `"${apt.Service?.name || 'N/A'}"`,
      `"${apt.Doctor?.user?.full_name || 'N/A'}"`,
      apt.appointment_date,
      formatTime(apt.appointment_start_time),
      apt.status 
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `appointments_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const stats = getStats();

  if (loading) {
    return (
      <div className="admin-appt-page-container">
        <div className="admin-appt-page-loading">
          <FaSpinner className="amp-fa-spin" />
          <span>Đang tải danh sách lịch hẹn...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="admin-appt-page-container">
        <div className="admin-appt-page-wrapper">
          
          {/* Header */}
          <div className="appointment-management-header">
            <div className="appointment-management-header-content">
              <h1>Quản lý lịch hẹn</h1>
              <p>Quản lý và theo dõi tất cả lịch hẹn của bệnh nhân</p>
            </div>
            <div className="appointment-management-header-actions">
              {user && user.role === 'staff' && (
                <select 
                  className="appointment-management-doctor-selector"
                  value={selectedDoctorId} 
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  style={{ zIndex: 1000, position: 'relative' }}
                >
                  <option value="">-- Tất cả Bác sĩ --</option>
                  {Object.entries(doctorGroups).map(([specialty, doctors]) => (
                    <optgroup key={specialty} label={specialty}>
                      {doctors.map(doctor => (
                        <option key={doctor.id} value={doctor.id}>
                          {doctor.user?.full_name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              )}
              <button className="appointment-management-btn appointment-management-btn-export" onClick={exportToCSV}>
                <FaDownload /> Xuất CSV
              </button>
            </div>
          </div>
          
          {/* Stats Grid - Trạng thái lịch hẹn */}
          <div className="appointment-management-stats-grid">
            <div className="appointment-management-stat-card">
              <div className="appointment-management-stat-icon appointment-management-icon-total"><FaCalendarAlt /></div>
              <div className="appointment-management-stat-info">
                <span className="appointment-management-stat-label">Tổng Lịch Hẹn</span>
                <span className="appointment-management-stat-value">{stats.filteredTotal}</span>
              </div>
            </div>
            <div className="appointment-management-stat-card">
              <div className="appointment-management-stat-icon appointment-management-icon-pending"><FaHourglassHalf /></div>
              <div className="appointment-management-stat-info">
                <span className="appointment-management-stat-label">Chờ Xác Nhận</span>
                <span className="appointment-management-stat-value">{stats.filteredPending}</span>
              </div>
            </div>
            <div className="appointment-management-stat-card">
              <div className="appointment-management-stat-icon appointment-management-icon-confirmed"><FaCheckCircle /></div>
              <div className="appointment-management-stat-info">
                <span className="appointment-management-stat-label">Đã Xác Nhận</span>
                <span className="appointment-management-stat-value">{stats.filteredConfirmed}</span>
              </div>
            </div>
            <div className="appointment-management-stat-card">
              <div className="appointment-management-stat-icon appointment-management-icon-upcoming"><FaClock /></div>
              <div className="appointment-management-stat-info">
                <span className="appointment-management-stat-label">Sắp Tới</span>
                <span className="appointment-management-stat-value">{stats.filteredUpcoming}</span>
              </div>
            </div>
            <div className="appointment-management-stat-card">
              <div className="appointment-management-stat-icon appointment-management-icon-pending"><FaMoneyBillWave /></div>
              <div className="appointment-management-stat-info">
                <span className="appointment-management-stat-label">Chờ Thanh Toán</span>
                <span className="appointment-management-stat-value">{stats.filteredWaitingPay}</span>
              </div>
            </div>
            <div className="appointment-management-stat-card">
              <div className="appointment-management-stat-icon appointment-management-icon-confirmed"><FaHospital /></div>
              <div className="appointment-management-stat-info">
                <span className="appointment-management-stat-label">Chờ Khám</span>
                <span className="appointment-management-stat-value">{stats.filteredWaitingExam}</span>
              </div>
            </div>
            <div className="appointment-management-stat-card">
              <div className="appointment-management-stat-icon appointment-management-icon-in-progress"><FaPlay /></div>
              <div className="appointment-management-stat-info">
                <span className="appointment-management-stat-label">Đang Khám</span>
                <span className="appointment-management-stat-value">{stats.filteredInProgress}</span>
              </div>
            </div>
          </div>

          {/* Stats Grid 2 - Trạng thái lịch hẹn (tiếp) */}
          <div className="appointment-management-stats-grid">
            <div className="appointment-management-stat-card">
              <div className="appointment-management-stat-icon appointment-management-icon-completed"><FaCheck /></div>
              <div className="appointment-management-stat-info">
                <span className="appointment-management-stat-label">Đã Hoàn Thành</span>
                <span className="appointment-management-stat-value">{stats.filteredCompleted}</span>
              </div>
            </div>
            <div className="appointment-management-stat-card">
              <div className="appointment-management-stat-icon appointment-management-icon-passed"><FaTimesCircle /></div>
              <div className="appointment-management-stat-info">
                <span className="appointment-management-stat-label">Đã Qua</span>
                <span className="appointment-management-stat-value">{stats.filteredPassed}</span>
              </div>
            </div>
            <div className="appointment-management-stat-card">
              <div className="appointment-management-stat-icon appointment-management-icon-cancelled"><FaBan /></div>
              <div className="appointment-management-stat-info">
                <span className="appointment-management-stat-label">Đã Hủy</span>
                <span className="appointment-management-stat-value">{stats.filteredCancelled}</span>
              </div>
            </div>
            <div className="appointment-management-stat-card appointment-management-stat-card-empty">
              <div className="appointment-management-stat-info">
                <span className="appointment-management-stat-label">&nbsp;</span>
                <span className="appointment-management-stat-value">&nbsp;</span>
              </div>
            </div>
            <div className="appointment-management-stat-card appointment-management-stat-card-empty">
              <div className="appointment-management-stat-info">
                <span className="appointment-management-stat-label">&nbsp;</span>
                <span className="appointment-management-stat-value">&nbsp;</span>
              </div>
            </div>
          </div>

          {/* Filter Panel - Always Visible */}
          <div className="appointment-management-filter-panel"> 
            <div className="appointment-management-filter-grid">
              <div className="appointment-management-filter-group">
                <label><FaFilter /> Trạng thái lịch</label>
                <select value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)}>
                  <option value="all">Tất cả trạng thái</option>
                  <option value="pending">Chờ xác nhận</option>
                  <option value="confirmed">Đã xác nhận</option>
                  <option value="upcoming">Sắp tới</option>
                  <option value="waiting_pay">Chờ thanh toán</option>
                  <option value="waiting_exam">Chờ khám</option>
                  <option value="in_progress">Đang khám</option>
                  <option value="completed">Đã hoàn thành</option>
                  <option value="passed">Đã qua</option>
                  <option value="cancelled">Đã hủy</option>
                </select>
              </div>
              <div className="appointment-management-filter-group">
                <label><FaCheckCircle /> Thanh toán</label>
                <select value={filters.paymentStatus} onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}>
                  <option value="all">Tất cả</option>
                  <option value="unpaid">Chưa thanh toán</option>
                  <option value="paid_online">Đã thanh toán online</option>
                  <option value="paid_at_clinic">Thanh toán tại quầy</option>
                  <option value="refunded">Đã hoàn tiền</option>
                  <option value="not_required">Miễn phí</option>
                </select>
              </div>
              <div className="appointment-management-filter-group">
                <label><FaHospital /> Loại hình</label>
                <select value={filters.appointmentType} onChange={(e) => handleFilterChange('appointmentType', e.target.value)}>
                  <option value="all">Tất cả</option>
                  <option value="online">Online</option>
                  <option value="offline">Tại viện</option>
                </select>
              </div>
              <div className="appointment-management-filter-group">
                <label><FaCalendarAlt /> Ngày khám</label>
                <input type="date" value={filters.date} onChange={(e) => handleFilterChange('date', e.target.value)} />
              </div>
              <div className="appointment-management-filter-group">
                <label><FaUserMd /> Bác sĩ</label>
                <input type="text" placeholder="Tên bác sĩ..." value={filters.doctor} onChange={(e) => handleFilterChange('doctor', e.target.value)} />
              </div>
              <div className="appointment-management-filter-group">
                <label><FaUserMd /> Dịch vụ</label>
                <input type="text" placeholder="Tên dịch vụ..." value={filters.service} onChange={(e) => handleFilterChange('service', e.target.value)} />
              </div>
              <div className="appointment-management-filter-group">
                <label><FaSearch /> Tìm kiếm</label>
                <input 
                  type="text" 
                  placeholder="Mã/Tên/Email/SĐT..." 
                  value={filters.search} 
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </div>
              <div className="appointment-management-filter-group">
                <label><FaClock /> Sắp xếp</label>
                <select value={filters.sortBy} onChange={(e) => handleFilterChange('sortBy', e.target.value)}>
                  <option value="newest">Mới nhất</option>
                  <option value="oldest">Cũ nhất</option>
                  <option value="code">Theo mã</option>
                </select>
              </div>
            </div>
            <div className="appointment-management-filter-actions">
              <button className="appointment-management-btn appointment-management-btn-reset" onClick={resetFilters}>
                <FaSyncAlt /> Đặt lại
              </button>
              <span className="appointment-management-filter-result">
                Hiển thị <strong>{filteredAppointments.length}</strong> / {appointments.length} lịch hẹn
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="admin-appt-page-table-container">
            <table className="admin-appt-page-table">
              <thead>
                <tr>
                  <th>Mã Lịch Hẹn</th>
                  <th>Bệnh nhân</th>
                  <th>Dịch vụ</th>
                  <th>Bác sĩ</th>
                  <th>Ngày & Giờ</th>
                  <th>Trạng thái</th>
                  <th>Thanh toán</th>
                  <th>HSKB</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.length > 0 ? (
                  filteredAppointments.map(apt => {
                    const medicalRecord = apt.MedicalRecord;
                    const isExpanded = expandedRow === medicalRecord?.id;
                    return (
                      <React.Fragment key={apt.id}>
                        <tr className={isExpanded ? 'amp-row-expanded' : ''}>
                          <td data-label="Mã Lịch Hẹn">{apt.code}</td>
                          
                          {/* SỬA LỖI: KIỂM TRA KỸ DỮ LIỆU BỆNH NHÂN */}
                          <td data-label="Bệnh nhân">
                            <div className="admin-appt-page-patient-info">
                              <span className="amp-fw-bold text-wrap">{apt.Patient?.user?.full_name || apt.guest_name || 'Khách vãng lai'}</span>
                              <div className="amp-text-muted amp-small">
                                {apt.Patient?.user ? (
                                  <>
                                    <div className="amp-d-flex amp-align-items-center">
                                      <FaPhone className="amp-me-1" size={10}/> {apt.Patient.user.phone || 'N/A'}
                                    </div>
                                    <div className="amp-d-flex amp-align-items-center amp-mt-1">
                                      <FaEnvelope className="amp-me-1" size={10}/> {apt.Patient.user.email || 'N/A'}
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="amp-d-flex amp-align-items-center">
                                      <FaPhone className="amp-me-1" size={10}/> {apt.guest_phone || 'N/A'}
                                    </div>
                                    <div className="amp-d-flex amp-align-items-center amp-mt-1">
                                      <FaEnvelope className="amp-me-1" size={10}/> {apt.guest_email || 'N/A'}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </td>
                          
                          <td data-label="Dịch vụ" className="text-wrap">{apt.Service?.name || 'N/A'}</td>
                          
                          <td data-label="Bác sĩ">
                            <div className="admin-appt-page-doctor-info">
                              <FaUserMd className="amp-me-1"/>
                              <span>{apt.Doctor?.user?.full_name || 'Đang cập nhật'}</span>
                            </div>
                          </td>
                          
                          <td data-label="Ngày & Giờ">
                            <div className="admin-appt-page-datetime-info">
                              <FaCalendarAlt /> <span className="amp-fw-bold">{new Date(apt.appointment_date).toLocaleDateString('vi-VN')}</span>
                            </div>
                            <div className="admin-appt-page-datetime-info">
                              <FaClock /> <span className="amp-text-primary">{formatTime(apt.appointment_start_time)}</span>
                            </div>
                          </td>
                          
                          <td data-label="Trạng thái">
                            {getStatusBadge(apt.status)}
                          </td>
                          
                          <td data-label="Thanh toán">
                            {getPaymentStatusBadge(apt.payment_status)}
                            {apt.payment_method && (
                              <div className="payment-method-info">
                                <small className="amp-text-muted">
                                  {apt.payment_method === 'cash' ? '💵 Tiền mặt' :
                                   apt.payment_method === 'card' ? '💳 Thẻ' :
                                   apt.payment_method === 'bank_transfer' ? '🏦 Chuyển khoản' :
                                   apt.payment_method === 'online' ? '🌐 Online' :
                                   apt.payment_method}
                                </small>
                              </div>
                            )}
                            {apt.paid_at && (
                              <div className="paid-date-info">
                                <small className="amp-text-success">
                                  {new Date(apt.paid_at).toLocaleDateString('vi-VN')}
                                </small>
                              </div>
                            )}
                          </td>
                          
                          <td data-label="HSKB">
                            {getMedicalRecordBadge(apt.medical_record_status || 'no_record')}
                          </td>

                          <td data-label="Thao tác">
                            <div className="admin-appt-page-action-buttons">
                              <Link 
                                to={`/lich-hen/${apt.code}`}
                                className="admin-appt-page-btn-action amp-btn-view"
                                title="Xem chi tiết"
                              >
                                <FaEye />
                                <span className="amp-btn-label">Chi tiết</span>
                              </Link>
                              
                              {(() => {
                                const isPaid = apt.payment_status === 'paid_online' || 
                                               apt.payment_status === 'paid_at_clinic' || 
                                               apt.Payment?.status === 'paid';

                                // KIỂM TRA QUYỀN LÂM SÀNG
                                const isClinicalStaff = user?.role === 'staff' && 
                                  (user?.department === 'clinical' || user?.staff?.department === 'clinical' || user?.role_info?.department === 'clinical');

                                return (
                                  <>
                                    {/* --- BẮT ĐẦU: NÚT LẬP HỒ SƠ Y TẾ DÀNH CHO LÂM SÀNG --- */}
                                    {isClinicalStaff && apt.appointment_type === 'offline' && 
                                     (apt.status === 'confirmed' || apt.status === 'in_progress' || isPaid) && 
                                     (!apt.medical_record_status || apt.medical_record_status === 'no_record') && (
                                      <button 
                                        className="admin-appt-page-btn-action appointment-management-action-medical" 
                                        onClick={() => navigate(`/ho-so-y-te/nhap-moi?appointment_code=${apt.code}`)} 
                                        title="Lập hồ sơ & Đo sinh hiệu"
                                      > 
                                        <FaNotesMedical />
                                        <span className="amp-btn-label">Lập HS</span>
                                      </button>
                                    )}
                                    {/* --- KẾT THÚC: NÚT LẬP HỒ SƠ Y TẾ --- */}

                                    {apt.status === 'pending' && (
                                      <button className="admin-appt-page-btn-action appointment-management-action-confirm" onClick={() => openActionModal(apt, 'confirm')} title="Xác nhận lịch hẹn" > 
                                        <FaClipboardCheck />
                                        <span className="amp-btn-label">Duyệt</span>
                                      </button>
                                    )}
                                    {apt.payment_status === 'unpaid' && (apt.status === 'pending' || apt.status === 'confirmed') && (
                                      <button 
                                        className="admin-appt-page-btn-action appointment-management-action-payment" 
                                        onClick={() => openPaymentModal(apt)} 
                                        title="Xác nhận thanh toán tại quầy"
                                      >
                                        <FaMoneyBillWave />
                                        <span className="amp-btn-label">Thanh toán</span>
                                      </button>
                                    )}
                                    {(apt.status === 'confirmed' || apt.status === 'upcoming' || apt.status === 'in_progress' || (apt.status === 'pending' && isPaid)) && (
                                      <button className="admin-appt-page-btn-action appointment-management-action-complete" onClick={() => navigate(`/nhap-ket-qua/${apt.code}`)} title="Hoàn thành & Nhập kết quả" > 
                                        <FaStethoscope />
                                        <span className="amp-btn-label">Nhập KQ</span>
                                      </button>
                                    )}
                                    {(apt.status !== 'completed' && apt.status !== 'passed' && apt.status !== 'cancelled') && (
                                      <button className="admin-appt-page-btn-action appointment-management-action-cancel" onClick={() => openActionModal(apt, 'cancel')} title="Hủy lịch hẹn" > 
                                        <FaBan />
                                        <span className="amp-btn-label">Hủy</span>
                                      </button>
                                    )}
                                  </>
                                );
                              })()}
                              
                              {medicalRecord && (
                                <button
                                  className="admin-appt-page-btn-action amp-btn-reset"
                                  onClick={() => handleResetCodeClick(medicalRecord.id)}
                                  title="Reset Mã Tra Cứu"
                                  disabled={isResettingCode}
                                >
                                  {isResettingCode ? <FaSpinner className="amp-fa-spin" /> : <FaSyncAlt />}
                                  <span className="amp-btn-label">Reset</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        
                        {isExpanded && medicalRecord && (
                          <tr className="admin-appt-page-expanded-row">
                            <td colSpan="8">
                              <div className="admin-appt-page-result-content">
                                <p className="mb-2"><strong>Mã Hồ Sơ:</strong> {medicalRecord.record_code}</p>
                                <p className="mb-2"><strong>Mã Tra Cứu:</strong> <span className="amp-text-danger amp-fw-bold">{medicalRecord.lookup_code}</span> <FaLock size={12} className="amp-text-danger"/></p>
                                <p className="mb-2"><strong>Kết Luận:</strong> {medicalRecord.diagnosis || 'Chưa có kết luận'}</p>
                                <Link to={`/ho-so-kham-benh/${medicalRecord.record_code}`} className="amp-small amp-text-decoration-none amp-fw-bold">
                                  Xem chi tiết hồ sơ <FaChevronRight size={10} className="ms-1"/>
                                </Link>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="8" className="text-center py-4 amp-text-muted">Không tìm thấy lịch hẹn nào theo bộ lọc.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Modal Action */}
        {showActionModal && selectedAppointment && (
          <div className="admin-appt-page-modal-overlay">
            <div className="admin-appt-page-modal-content">
              <div className="admin-appt-page-modal-header">
                <h5>{actionType === 'confirm' ? 'Xác nhận Lịch Hẹn' : 'Hủy Lịch Hẹn'}</h5>
                <button className="amp-close-btn" onClick={closeActionModal}><FaTimes /></button>
              </div>
              <div className="admin-appt-page-modal-body">
                <div className="admin-appt-page-appointment-summary">
                  <p><strong>Mã:</strong> {selectedAppointment.code}</p>
                  <p><strong>Bệnh nhân:</strong> {selectedAppointment.Patient?.user?.full_name || selectedAppointment.guest_name}</p>
                  <p><strong>Thời gian:</strong> {new Date(selectedAppointment.appointment_date).toLocaleDateString('vi-VN')} lúc {formatTime(selectedAppointment.appointment_start_time)}</p>
                </div>
                {actionType === 'confirm' ? (
                  <p className="admin-appt-page-confirmation-text amp-text-success amp-fw-bold">Bạn có chắc chắn muốn xác nhận lịch hẹn này?</p>
                ) : (
                  <p className="admin-appt-page-confirmation-text amp-text-danger">Lịch hẹn sẽ bị hủy bỏ. Bệnh nhân sẽ nhận được thông báo.</p>
                )}
                {actionType === 'cancel' && (
                  <div className="admin-appt-page-form-group">
                    <label htmlFor="cancelReason">Lý do hủy lịch *</label>
                    <textarea 
                      id="cancelReason" value={actionReason} onChange={(e) => setActionReason(e.target.value)}
                      placeholder="Nhập lý do hủy lịch..." rows="4" required
                    />
                  </div>
                )}
              </div>
              <div className="admin-appt-page-modal-footer">
                <button className="admin-appt-page-btn amp-btn-secondary" onClick={closeActionModal} disabled={isSubmitting}>Đóng</button>
                <button 
                  className={`admin-appt-page-btn ${actionType === 'cancel' ? 'amp-btn-danger' : 'amp-btn-primary'}`}
                  onClick={handleConfirmAction} disabled={isSubmitting}
                >
                  {isSubmitting ? <FaSpinner className="amp-fa-spin" /> : (actionType === 'confirm' ? 'Xác nhận' : 'Hủy lịch')}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Modal Reset Code */}
        <ConfirmModal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={handleConfirmReset}
          title="Xác nhận Reset Mã Tra Cứu"
          message={'Bạn có chắc chắn muốn reset mã tra cứu cho hồ sơ này?\nMã cũ sẽ bị vô hiệu hóa và một mã MỚI sẽ được tạo, đồng thời gửi đến email của bệnh nhân.'}
          isLoading={isResettingCode}
        />

        {/* Modal Payment */}
        {showPaymentModal && selectedAppointment && (
          <div className="admin-appt-page-modal-overlay">
            <div className="admin-appt-page-modal-content">
              <div className="admin-appt-page-modal-header">
                <h5>Xác nhận thanh toán tại quầy</h5>
                <button className="amp-close-btn" onClick={closePaymentModal}><FaTimes /></button>
              </div>
              <div className="admin-appt-page-modal-body">
                <div className="admin-appt-page-appointment-summary">
                  <p><strong>Mã:</strong> {selectedAppointment.code}</p>
                  <p><strong>Bệnh nhân:</strong> {selectedAppointment.Patient?.user?.full_name || selectedAppointment.guest_name}</p>
                  <p><strong>Dịch vụ:</strong> {selectedAppointment.Service?.name}</p>
                  <p><strong>Số tiền:</strong> {selectedAppointment.Service?.price?.toLocaleString('vi-VN')} đ</p>
                </div>
                <div className="admin-appt-page-form-group">
                  <label htmlFor="paymentMethod">Phương thức thanh toán</label>
                  <select 
                    id="paymentMethod" 
                    value={paymentData.payment_method}
                    onChange={(e) => setPaymentData({...paymentData, payment_method: e.target.value})}
                    className="form-control"
                  >
                    <option value="cash">Tiền mặt</option>
                    <option value="card">Thẻ</option>
                    <option value="transfer">Chuyển khoản</option>
                  </select>
                </div>
                <div className="admin-appt-page-form-group">
                  <label htmlFor="paidAt">Thời gian thanh toán</label>
                  <input 
                    type="datetime-local" 
                    id="paidAt"
                    value={paymentData.paid_at}
                    onChange={(e) => setPaymentData({...paymentData, paid_at: e.target.value})}
                    className="form-control"
                  />
                </div>
              </div>
              <div className="admin-appt-page-modal-footer">
                <button className="admin-appt-page-btn amp-btn-secondary" onClick={closePaymentModal} disabled={isSubmitting}>
                  Đóng
                </button>
                <button 
                  className="admin-appt-page-btn amp-btn-primary"
                  onClick={handleConfirmPayment} 
                  disabled={isSubmitting}
                  style={{ backgroundColor: '#28a745' }}
                >
                  {isSubmitting ? <FaSpinner className="amp-fa-spin" /> : 'Xác nhận thanh toán'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AppointmentManagementPage;