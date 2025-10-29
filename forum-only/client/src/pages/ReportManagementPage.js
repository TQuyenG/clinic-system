// client/src/pages/ReportManagementPage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './ReportManagementPage.css';
import { FaFlag, FaEye, FaCheck, FaTimes, FaFilter } from 'react-icons/fa';
import { FORUM_QUESTION_ROUTE } from '../utils/constants';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3002/api';

const ReportManagementPage = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    status: '',
    entityType: '',
  });
  const [selectedReport, setSelectedReport] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [adminNote, setAdminNote] = useState('');

  useEffect(() => {
    fetchReports();
  }, [filter]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filter.status) params.append('status', filter.status);
      if (filter.entityType) params.append('entityType', filter.entityType);

      const response = await axios.get(`${API_URL}/forum/reports?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setReports(response.data.data.reports);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      alert('Không thể tải danh sách báo cáo');
    } finally {
      setLoading(false);
    }
  };

  const handleViewReport = (report) => {
    setSelectedReport(report);
    setAdminNote(report.adminNote || '');
    setShowModal(true);
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedReport) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${API_URL}/forum/reports/${selectedReport.id}`,
        {
          status: newStatus,
          adminNote: adminNote,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert('Đã cập nhật trạng thái báo cáo');
        setShowModal(false);
        fetchReports();
      }
    } catch (error) {
      console.error('Error updating report:', error);
      alert('Có lỗi xảy ra khi cập nhật báo cáo');
    }
  };

  const getReasonText = (reason) => {
    const reasons = {
      spam: 'Spam',
      inappropriate: 'Nội dung không phù hợp',
      misleading: 'Thông tin sai lệch',
      offensive: 'Xúc phạm, lăng mạ',
      other: 'Khác',
    };
    return reasons[reason] || reason;
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { text: 'Chờ xử lý', class: 'status-pending' },
      reviewed: { text: 'Đã xem', class: 'status-reviewed' },
      resolved: { text: 'Đã giải quyết', class: 'status-resolved' },
      dismissed: { text: 'Đã bỏ qua', class: 'status-dismissed' },
    };
    const badge = badges[status] || { text: status, class: '' };
    return <span className={`status-badge ${badge.class}`}>{badge.text}</span>;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return <div className="loading-container">Đang tải...</div>;
  }

  return (
    <div className="report-management-page">
      <div className="container">
        <div className="page-header">
          <h1>
            <FaFlag /> Quản lý báo cáo
          </h1>
        </div>

        {/* Filters */}
        <div className="filters-section">
          <div className="filter-group">
            <FaFilter />
            <select
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="pending">Chờ xử lý</option>
              <option value="reviewed">Đã xem</option>
              <option value="resolved">Đã giải quyết</option>
              <option value="dismissed">Đã bỏ qua</option>
            </select>
          </div>

          <div className="filter-group">
            <select
              value={filter.entityType}
              onChange={(e) => setFilter({ ...filter, entityType: e.target.value })}
            >
              <option value="">Tất cả loại</option>
              <option value="question">Câu hỏi</option>
              <option value="answer">Câu trả lời</option>
            </select>
          </div>
        </div>

        {/* Reports List */}
        {reports.length === 0 ? (
          <div className="no-reports">
            <FaFlag />
            <p>Không có báo cáo nào</p>
          </div>
        ) : (
          <div className="reports-list">
            {reports.map((report) => (
              <div key={report.id} className="report-card">
                <div className="report-header">
                  <div className="report-type">
                    <span className="type-badge">{report.entityType === 'question' ? 'Câu hỏi' : 'Câu trả lời'}</span>
                    {getStatusBadge(report.status)}
                  </div>
                  <span className="report-date">{formatDate(report.createdAt)}</span>
                </div>

                <div className="report-body">
                  <div className="report-info">
                    <strong>Lý do:</strong> {getReasonText(report.reason)}
                  </div>
                  {report.description && (
                    <div className="report-description">{report.description}</div>
                  )}
                  <div className="report-reporter">
                    <strong>Người báo cáo:</strong> {report.reporter?.fullName} ({report.reporter?.email})
                  </div>
                  {report.entity && (
                    <div className="report-entity">
                      <strong>Nội dung:</strong>{' '}
                      {report.entityType === 'question'
                        ? report.entity.title
                        : report.entity.content?.substring(0, 100) + '...'}
                    </div>
                  )}
                </div>

                <div className="report-footer">
                  <button className="btn-view" onClick={() => handleViewReport(report)}>
                    <FaEye /> Xem chi tiết
                  </button>
                  {report.entityType === 'question' && report.entity && (
                    <button
                      className="btn-goto"
                      onClick={() => navigate(`${FORUM_QUESTION_ROUTE}/${report.entityId}`)}
                    >
                      Đi tới câu hỏi
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Report Detail Modal */}
      {showModal && selectedReport && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Chi tiết báo cáo #{selectedReport.id}</h3>

            <div className="modal-section">
              <label>Loại nội dung:</label>
              <p>{selectedReport.entityType === 'question' ? 'Câu hỏi' : 'Câu trả lời'}</p>
            </div>

            <div className="modal-section">
              <label>Lý do:</label>
              <p>{getReasonText(selectedReport.reason)}</p>
            </div>

            {selectedReport.description && (
              <div className="modal-section">
                <label>Mô tả:</label>
                <p>{selectedReport.description}</p>
              </div>
            )}

            <div className="modal-section">
              <label>Người báo cáo:</label>
              <p>
                {selectedReport.reporter?.fullName} - {selectedReport.reporter?.email}
              </p>
            </div>

            <div className="modal-section">
              <label>Trạng thái hiện tại:</label>
              <p>{getStatusBadge(selectedReport.status)}</p>
            </div>

            <div className="modal-section">
              <label>Ghi chú của admin:</label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows="4"
                placeholder="Nhập ghi chú..."
              />
            </div>

            <div className="modal-actions">
              <button className="btn-dismiss" onClick={() => handleUpdateStatus('dismissed')}>
                <FaTimes /> Bỏ qua
              </button>
              <button className="btn-reviewed" onClick={() => handleUpdateStatus('reviewed')}>
                <FaEye /> Đã xem
              </button>
              <button className="btn-resolve" onClick={() => handleUpdateStatus('resolved')}>
                <FaCheck /> Đã giải quyết
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportManagementPage;
