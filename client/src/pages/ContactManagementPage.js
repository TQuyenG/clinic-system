// client/src/pages/ContactManagementPage.js
import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import {
  FaEnvelope, FaSearch, FaFilter, FaTrash, FaEye, FaCheck,
  FaReply, FaTimes, FaChevronLeft, FaChevronRight, FaInbox,
  FaCheckCircle, FaExclamationCircle, FaSpinner, FaSort,
  FaSortUp, FaSortDown, FaCalendarAlt
} from 'react-icons/fa';
import './ContactManagementPage.css';

const STATUS_CONFIG = {
  new:     { label: 'Mới', color: '#3b82f6', bg: '#dbeafe' },
  read:    { label: 'Đã đọc', color: '#f59e0b', bg: '#fef3c7' },
  replied: { label: 'Đã trả lời', color: '#10b981', bg: '#d1fae5' },
  closed:  { label: 'Đã đóng', color: '#6b7280', bg: '#f3f4f6' }
};

export default function ContactManagementPage() {
  const [messages, setMessages] = useState([]);
  const [stats, setStats]       = useState({ new: 0, read: 0, replied: 0, closed: 0, total: 0 });
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [toast, setToast]       = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    page: 1, limit: 15, status: 'all', search: '',
    startDate: '', endDate: '', sortBy: 'created_at', sortOrder: 'DESC'
  });
  const [totalPages, setTotalPages] = useState(1);
  const [adminNote, setAdminNote]   = useState('');
  const [detailLoading, setDetailLoading] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...filters };
      if (!params.search) delete params.search;
      if (!params.startDate) delete params.startDate;
      if (!params.endDate) delete params.endDate;

      const res = await api.get('/contact/messages', { params });
      setMessages(res.data.data || []);
      setStats(res.data.stats || {});
      setTotalPages(res.data.totalPages || 1);
    } catch {
      showToast('Không thể tải tin nhắn', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  const openDetail = async (msg) => {
    setDetailLoading(true);
    setSelected(msg);
    setAdminNote(msg.admin_note || '');
    try {
      const res = await api.get(`/contact/messages/${msg.id}`);
      setSelected(res.data.data);
      setAdminNote(res.data.data.admin_note || '');
      fetchMessages();
    } catch {}
    setDetailLoading(false);
  };

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/contact/messages/${id}/status`, { status, admin_note: adminNote });
      showToast('Cập nhật thành công');
      setSelected(null);
      fetchMessages();
    } catch {
      showToast('Lỗi cập nhật', 'error');
    }
  };

  const deleteOne = async (id) => {
    if (!window.confirm('Xóa tin nhắn này?')) return;
    try {
      await api.delete(`/contact/messages/${id}`);
      showToast('Đã xóa tin nhắn');
      setSelected(null);
      fetchMessages();
    } catch {
      showToast('Lỗi xóa', 'error');
    }
  };

  const bulkDelete = async () => {
    if (!selectedIds.length) return;
    if (!window.confirm(`Xóa ${selectedIds.length} tin nhắn đã chọn?`)) return;
    try {
      await api.delete('/contact/messages/bulk', { data: { ids: selectedIds } });
      showToast(`Đã xóa ${selectedIds.length} tin nhắn`);
      setSelectedIds([]);
      fetchMessages();
    } catch {
      showToast('Lỗi xóa hàng loạt', 'error');
    }
  };

  const toggleSort = (field) => {
    setFilters(prev => ({
      ...prev, sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === 'DESC' ? 'ASC' : 'DESC',
      page: 1
    }));
  };

  const SortIcon = ({ field }) => {
    if (filters.sortBy !== field) return <FaSort className="cm-sort-icon" />;
    return filters.sortOrder === 'ASC' ? <FaSortUp className="cm-sort-icon active" /> : <FaSortDown className="cm-sort-icon active" />;
  };

  const StatusBadge = ({ status }) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.new;
    return (
      <span className="cm-status-badge" style={{ color: cfg.color, background: cfg.bg }}>
        {cfg.label}
      </span>
    );
  };

  return (
    <div className="cm-page">
      {/* Toast */}
      {toast && (
        <div className={`cm-toast cm-toast-${toast.type}`}>
          {toast.type === 'success' ? <FaCheckCircle /> : <FaExclamationCircle />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="cm-header">
        <div className="cm-header-left">
          <FaEnvelope className="cm-header-icon" />
          <div>
            <h1>Quản lý liên hệ</h1>
            <p>Tin nhắn từ khách hàng gửi qua trang liên hệ</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="cm-stats-grid">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <div
            key={key}
            className={`cm-stat-card ${filters.status === key ? 'active' : ''}`}
            style={{ '--stat-color': cfg.color }}
            onClick={() => setFilters(prev => ({ ...prev, status: key, page: 1 }))}
          >
            <span className="cm-stat-num" style={{ color: cfg.color }}>{stats[key] || 0}</span>
            <span className="cm-stat-label">{cfg.label}</span>
          </div>
        ))}
        <div
          className={`cm-stat-card ${filters.status === 'all' ? 'active' : ''}`}
          style={{ '--stat-color': '#4caf50' }}
          onClick={() => setFilters(prev => ({ ...prev, status: 'all', page: 1 }))}
        >
          <span className="cm-stat-num" style={{ color: '#4caf50' }}>{stats.total || 0}</span>
          <span className="cm-stat-label">Tất cả</span>
        </div>
      </div>

      {/* Filters */}
      <div className="cm-filters">
        <div className="cm-search-wrap">
          <FaSearch />
          <input
            placeholder="Tìm theo tên, email, chủ đề..."
            value={filters.search}
            onChange={e => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
          />
        </div>
        <div className="cm-filter-wrap">
          <FaCalendarAlt />
          <input
            type="date"
            value={filters.startDate}
            onChange={e => setFilters(prev => ({ ...prev, startDate: e.target.value, page: 1 }))}
          />
          <span>—</span>
          <input
            type="date"
            value={filters.endDate}
            onChange={e => setFilters(prev => ({ ...prev, endDate: e.target.value, page: 1 }))}
          />
        </div>
        {selectedIds.length > 0 && (
          <button className="cm-btn cm-btn-danger" onClick={bulkDelete}>
            <FaTrash /> Xóa {selectedIds.length} mục
          </button>
        )}
      </div>

      {/* Table */}
      <div className="cm-table-wrap">
        {loading ? (
          <div className="cm-loading"><FaSpinner className="spin" /> Đang tải...</div>
        ) : messages.length === 0 ? (
          <div className="cm-empty"><FaInbox /> Không có tin nhắn nào</div>
        ) : (
          <table className="cm-table">
            <thead>
              <tr>
                <th><input type="checkbox" onChange={e => setSelectedIds(e.target.checked ? messages.map(m => m.id) : [])} /></th>
                <th onClick={() => toggleSort('name')} className="cm-th-sort">Người gửi <SortIcon field="name" /></th>
                <th onClick={() => toggleSort('email')} className="cm-th-sort">Email <SortIcon field="email" /></th>
                <th>Chủ đề</th>
                <th onClick={() => toggleSort('status')} className="cm-th-sort">Trạng thái <SortIcon field="status" /></th>
                <th onClick={() => toggleSort('created_at')} className="cm-th-sort">Ngày gửi <SortIcon field="created_at" /></th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {messages.map(msg => (
                <tr key={msg.id} className={msg.status === 'new' ? 'cm-row-new' : ''}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(msg.id)}
                      onChange={e => setSelectedIds(prev => e.target.checked ? [...prev, msg.id] : prev.filter(id => id !== msg.id))}
                    />
                  </td>
                  <td className="cm-name-cell">
                    {msg.status === 'new' && <span className="cm-new-dot" />}
                    <span className="cm-name">{msg.name}</span>
                    {msg.phone && <span className="cm-phone">{msg.phone}</span>}
                  </td>
                  <td><span className="cm-email">{msg.email}</span></td>
                  <td><span className="cm-subject">{msg.subject}</span></td>
                  <td><StatusBadge status={msg.status} /></td>
                  <td className="cm-date">
                    {new Date(msg.created_at).toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                  </td>
                  <td className="cm-actions">
                    <button className="cm-action-btn cm-view" onClick={() => openDetail(msg)} title="Xem chi tiết"><FaEye /></button>
                    <button className="cm-action-btn cm-delete" onClick={() => deleteOne(msg.id)} title="Xóa"><FaTrash /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="cm-pagination">
          <button disabled={filters.page <= 1} onClick={() => setFilters(p => ({ ...p, page: p.page - 1 }))}><FaChevronLeft /></button>
          <span>Trang {filters.page} / {totalPages}</span>
          <button disabled={filters.page >= totalPages} onClick={() => setFilters(p => ({ ...p, page: p.page + 1 }))}><FaChevronRight /></button>
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="cm-modal-overlay" onClick={() => setSelected(null)}>
          <div className="cm-modal" onClick={e => e.stopPropagation()}>
            <div className="cm-modal-header">
              <h3><FaEnvelope /> Chi tiết tin nhắn</h3>
              <button className="cm-modal-close" onClick={() => setSelected(null)}><FaTimes /></button>
            </div>

            {detailLoading ? (
              <div className="cm-loading"><FaSpinner className="spin" /> Đang tải...</div>
            ) : (
              <div className="cm-modal-body">
                <div className="cm-detail-grid">
                  <div className="cm-detail-item">
                    <label>Người gửi</label>
                    <span>{selected.name}</span>
                  </div>
                  <div className="cm-detail-item">
                    <label>Email</label>
                    <a href={`mailto:${selected.email}`}>{selected.email}</a>
                  </div>
                  {selected.phone && (
                    <div className="cm-detail-item">
                      <label>Điện thoại</label>
                      <a href={`tel:${selected.phone}`}>{selected.phone}</a>
                    </div>
                  )}
                  <div className="cm-detail-item">
                    <label>Trạng thái</label>
                    <StatusBadge status={selected.status} />
                  </div>
                  <div className="cm-detail-item cm-detail-full">
                    <label>Chủ đề</label>
                    <span className="cm-subject-big">{selected.subject}</span>
                  </div>
                  <div className="cm-detail-item cm-detail-full">
                    <label>Nội dung</label>
                    <div className="cm-message-box">{selected.message}</div>
                  </div>
                  <div className="cm-detail-item cm-detail-full">
                    <label>Ghi chú nội bộ</label>
                    <textarea
                      className="cm-note-input"
                      value={adminNote}
                      onChange={e => setAdminNote(e.target.value)}
                      placeholder="Ghi chú cho nhân viên nội bộ..."
                      rows={3}
                    />
                  </div>
                  <div className="cm-detail-item">
                    <label>Ngày gửi</label>
                    <span>{new Date(selected.created_at).toLocaleString('vi-VN')}</span>
                  </div>
                  {selected.replier && (
                    <div className="cm-detail-item">
                      <label>Người xử lý</label>
                      <span>{selected.replier.full_name}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="cm-modal-footer">
              <button className="cm-btn cm-btn-success" onClick={() => updateStatus(selected.id, 'replied')}>
                <FaReply /> Đánh dấu đã trả lời
              </button>
              <button className="cm-btn cm-btn-secondary" onClick={() => updateStatus(selected.id, 'closed')}>
                <FaCheck /> Đóng yêu cầu
              </button>
              <button className="cm-btn cm-btn-danger" onClick={() => deleteOne(selected.id)}>
                <FaTrash /> Xóa
              </button>
              <a href={`mailto:${selected?.email}?subject=Re: ${selected?.subject}`} className="cm-btn cm-btn-primary">
                <FaEnvelope /> Gửi email
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}