// Path: client/src/components/consultation/ConsultationRealtimeList.js
// ============================================================================

import React, { useState, useEffect } from 'react';
import consultationService from '../../services/consultationService';
import { 
  FaSearch, 
  FaFilter, 
  FaEye, 
  FaCheckCircle, 
  FaTimesCircle,
  FaMoneyBillWave,
  FaEdit,
  FaFileExport
} from 'react-icons/fa';

export const ConsultationRealtimeList = () => {
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    doctor_id: '',
    specialty_id: '',
    date_from: '',
    date_to: '',
    search: '',
    page: 1,
    limit: 20
  });
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    fetchConsultations();
  }, [filters]);

  const fetchConsultations = async () => {
    try {
      setLoading(true);
      const response = await consultationService.getAllConsultationsRealtime(filters);
      
      if (response.data.success) {
        setConsultations(response.data.data.consultations);
        setPagination(response.data.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching consultations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
      page: 1 // Reset về trang 1
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const getStatusBadge = (status) => {
    const config = {
      'pending': { class: 'warning', icon: '⏳', text: 'Chờ duyệt' },
      'confirmed': { class: 'info', icon: '✅', text: 'Đã duyệt' },
      'in_progress': { class: 'success', icon: '💬', text: 'Đang diễn ra' },
      'completed': { class: 'success', icon: '✔️', text: 'Hoàn thành' },
      'cancelled': { class: 'danger', icon: '❌', text: 'Đã hủy' }
    };
    const item = config[status] || config['pending'];
    return (
      <span className={`status-badge status-${item.class}`}>
        {item.icon} {item.text}
      </span>
    );
  };

  return (
    <div className="consultation-realtime-list">
      {/* Filters */}
      <div className="filters-section-realtime">
        <div className="filters-row">
          <div className="filter-item">
            <label>Trạng thái</label>
            <select 
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="all">Tất cả</option>
              <option value="pending">Chờ duyệt</option>
              <option value="confirmed">Đã duyệt</option>
              <option value="in_progress">Đang diễn ra</option>
              <option value="completed">Hoàn thành</option>
              <option value="cancelled">Đã hủy</option>
            </select>
          </div>

          <div className="filter-item">
            <label>Loại tư vấn</label>
            <select 
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
            >
              <option value="all">Tất cả</option>
              <option value="chat">Chat</option>
              <option value="video">Video</option>
              <option value="offline">Trực tiếp</option>
            </select>
          </div>

          <div className="filter-item">
            <label>Từ ngày</label>
            <input 
              type="date"
              value={filters.date_from}
              onChange={(e) => handleFilterChange('date_from', e.target.value)}
            />
          </div>

          <div className="filter-item">
            <label>Đến ngày</label>
            <input 
              type="date"
              value={filters.date_to}
              onChange={(e) => handleFilterChange('date_to', e.target.value)}
            />
          </div>
        </div>

        <div className="search-row">
          <div className="search-box-realtime">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Tìm theo mã tư vấn, tên bệnh nhân..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>
          
          <button className="btn-export">
            <FaFileExport /> Export Excel
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="loading-state">Đang tải...</div>
      ) : (
        <>
          <div className="table-container-realtime">
            <table className="realtime-table">
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Bệnh nhân</th>
                  <th>Bác sĩ</th>
                  <th>Gói</th>
                  <th>Thời gian</th>
                  <th>Trạng thái</th>
                  <th>Phí</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {consultations.map((consultation) => (
                  <tr key={consultation.id}>
                    <td className="code-cell">{consultation.consultation_code}</td>
                    <td>
                      <div className="patient-info">
                        <strong>{consultation.patient?.full_name}</strong>
                        <span>{consultation.patient?.phone}</span>
                      </div>
                    </td>
                    <td>
                      <div className="doctor-info">
                        <strong>{consultation.doctor?.full_name}</strong>
                        <span>{consultation.doctor?.Doctor?.Specialty?.name}</span>
                      </div>
                    </td>
                    <td>
                      <span className="type-badge">
                        {consultation.consultation_type === 'chat' ? '💬 Chat' : ''}
                        {consultation.consultation_type === 'video' ? '📹 Video' : ''}
                        {consultation.consultation_type === 'offline' ? '🏥 Offline' : ''}
                      </span>
                    </td>
                    <td>{new Date(consultation.appointment_time).toLocaleString('vi-VN')}</td>
                    <td>{getStatusBadge(consultation.status)}</td>
                    <td className="fee-cell">{consultation.fee?.toLocaleString()}đ</td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-icon" title="Xem chi tiết">
                          <FaEye />
                        </button>
                        <button className="btn-icon btn-success" title="Phê duyệt">
                          <FaCheckCircle />
                        </button>
                        <button className="btn-icon btn-danger" title="Từ chối">
                          <FaTimesCircle />
                        </button>
                        <button className="btn-icon btn-warning" title="Hoàn tiền">
                          <FaMoneyBillWave />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="pagination-realtime">
              <button 
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                Trước
              </button>
              <span>Trang {pagination.page} / {pagination.totalPages}</span>
              <button 
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
              >
                Sau
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
