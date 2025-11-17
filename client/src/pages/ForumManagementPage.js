import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  FaCheckCircle, 
  FaTimesCircle, 
  FaEye, 
  FaSearch, 
  FaFilter, 
  FaChartBar, 
  FaTrashAlt,
  FaArrowUp,
  FaArrowDown
} from 'react-icons/fa';
import api from '../services/api';
// Cập nhật tên file CSS import
import './ForumManagementPage.css'; 
import { FORUM_QUESTION_ROUTE } from '../utils/constants';

// --- (Toàn bộ logic React, state, hooks, hằng số, API... được giữ nguyên 100%) ---
// ...

const ForumManagementPage = () => {
  const [questions, setQuestions] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('open');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [actionType, setActionType] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [stats, setStats] = useState({ total: 0, open: 0, closed: 0, hidden: 0 });
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportStatusFilter, setReportStatusFilter] = useState('pending');
  const [reportEntityFilter, setReportEntityFilter] = useState('');
  const [reportPagination, setReportPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });

  // --- (Tất cả các hàm: filterQuestions, reportStatusLabels, ... fetchQuestions, fetchReports, ...) ---
  // --- (đều được giữ nguyên 100% logic) ---

  const filterQuestions = useCallback(() => {
    let filtered = questions;
    if (searchTerm.trim()) {
      const keyword = searchTerm.trim().toLowerCase();
      filtered = filtered.filter((q) => {
        const title = (q.title || '').toLowerCase();
        const content = (q.content || '').toLowerCase();
        const authorName = (q.author?.fullName || '').toLowerCase();
        const specialtyName = (q.specialty?.name || '').toLowerCase();
        return (
          title.includes(keyword) ||
          content.includes(keyword) ||
          authorName.includes(keyword) ||
          specialtyName.includes(keyword)
        );
      });
    }
    setFilteredQuestions(filtered);
  }, [questions, searchTerm]);

  const reportStatusLabels = {
    pending: 'Chờ xử lý',
    reviewed: 'Đã xem',
    resolved: 'Đã xử lý',
    dismissed: 'Đã bỏ qua'
  };

  const reportReasonLabels = {
    spam: 'Spam / Quảng cáo',
    misleading: 'Thông tin sai lệch',
    offensive: 'Ngôn từ/Thái độ gây xúc phạm',
    inappropriate: 'Nội dung không phù hợp',
    other: 'Khác'
  };

  const isReportTab = activeTab === 'reports';
  const reportCount = reportPagination.total || reports.length;

  const getReportStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#f39c12';
      case 'reviewed': return '#2980b9';
      case 'resolved': return '#27ae60';
      case 'dismissed': return '#7f8c8d';
      default: return '#95a5a6';
    }
  };

  const formatDateTime = (value) => {
    if (!value) return '—';
    try {
      return new Date(value).toLocaleString('vi-VN');
    } catch (error) {
      return value;
    }
  };

  const normalizeTags = (tags, fallback) => {
    if (Array.isArray(tags)) return tags;
    if (Array.isArray(fallback)) return fallback;
    if (typeof tags === 'string') {
      try {
        const parsed = JSON.parse(tags);
        if (Array.isArray(parsed)) return parsed;
      } catch (err) {
        return tags.split(',').map((tag) => tag.trim()).filter(Boolean);
      }
      return tags ? [tags].filter(Boolean) : [];
    }
    return [];
  };

  const normalizeQuestion = useCallback(
    (question) => {
      if (!question) return question;
      const author = question.author || question.User || {};
      const specialty = question.specialty || question.Specialty || null;
      const createdAt = question.createdAt || question.created_at;
      const updatedAt = question.updatedAt || question.updated_at;
      return {
        ...question,
        author,
        specialty,
        tags: normalizeTags(question.tags, question.tags_json),
        createdAt,
        updatedAt,
        answersCount: question.answersCount ?? question.answers_count ?? 0,
        viewsCount: question.viewsCount ?? question.views ?? 0,
        likesCount: question.likesCount ?? question.likes_count ?? 0,
      };
    },
    []
  );

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/forum/questions', {
        params: { status: activeTab, page: 1, limit: 50 }
      });
      const responseData = response.data.data || {};
      const questionsData = (responseData.questions || []).map(normalizeQuestion);
      setQuestions(questionsData);
      
      const statsData = responseData.stats || {};
      const totalFromStats = (statsData.open || 0) + (statsData.closed || 0) + (statsData.hidden || 0);
      setStats({
        total: totalFromStats > 0 ? totalFromStats : questionsData.length,
        open: statsData.open ?? questionsData.filter(q => q.status === 'open').length,
        closed: statsData.closed ?? questionsData.filter(q => q.status === 'closed').length,
        hidden: statsData.hidden ?? questionsData.filter(q => q.status === 'hidden').length
      });
    } catch (error) {
      console.error('Error fetching questions:', error);
      alert('Không thể tải danh sách câu hỏi');
    } finally {
      setLoading(false);
    }
  }, [activeTab, normalizeQuestion]);

  const fetchReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const response = await api.get('/forum/reports', {
        params: {
          status: reportStatusFilter || undefined,
          entityType: reportEntityFilter || undefined,
          page: 1,
          limit: 50
        }
      });
      const data = response.data?.data || {};
      setReports(data.reports || []);
      setReportPagination({
        total: data.pagination?.total || data.reports?.length || 0,
        page: data.pagination?.page || 1,
        totalPages: data.pagination?.totalPages || 1
      });
    } catch (error)
    {
      console.error('Error fetching reports:', error);
      alert('Không thể tải danh sách báo cáo');
    } finally {
      setReportsLoading(false);
    }
  }, [reportStatusFilter, reportEntityFilter]);

  useEffect(() => {
    if (isReportTab) {
      fetchReports();
    } else {
      fetchQuestions();
    }
  }, [isReportTab, fetchQuestions, fetchReports]);

  useEffect(() => {
    if (isReportTab) return;
    filterQuestions();
  }, [isReportTab, filterQuestions, activeTab]);

  const handleUpdateReportStatus = useCallback(
    async (reportId, status, options = {}) => {
      const { note, skipPrompt, silent } = options;
      try {
        let adminNote = note;
        if (status !== 'pending' && !skipPrompt) {
          const noteInput = window.prompt('Ghi chú xử lý (tuỳ chọn)', '');
          if (noteInput === null) {
            return;
          }
          adminNote = noteInput.trim() ? noteInput.trim() : undefined;
        }
        await api.put(`/forum/reports/${reportId}`, {
          status,
          adminNote,
        });
        if (!silent) {
          alert('Đã cập nhật trạng thái báo cáo');
        }
        await fetchReports();
      } catch (error) {
        console.error('Error updating report status:', error);
        alert(error.response?.data?.message || 'Không thể cập nhật trạng thái báo cáo');
      }
    },
    [fetchReports]
  );

  const handleRemoveReportedContent = useCallback(
    async (report) => {
      if (!report) return;
      const isAnswer = report.entityType === 'answer';
      const confirmMessage = isAnswer
        ? 'Xóa bình luận này? Nội dung sẽ bị ẩn khỏi diễn đàn và không thể khôi phục.'
        : 'Xóa câu hỏi vi phạm này khỏi diễn đàn?';
      if (!window.confirm(confirmMessage)) {
        return;
      }
      try {
        if (isAnswer) {
          await api.delete(`/forum/answers/${report.entityId}`);
        } else {
          await api.delete(`/forum/questions/${report.entityId}`);
        }
        await handleUpdateReportStatus(report.id, 'resolved', {
          note: isAnswer
            ? 'Đã xóa bình luận vi phạm khỏi diễn đàn.'
            : 'Đã xóa câu hỏi vi phạm khỏi diễn đàn.',
          skipPrompt: true,
          silent: true,
        });
        alert(isAnswer ? 'Đã xóa bình luận vi phạm.' : 'Đã xóa câu hỏi vi phạm.');
      } catch (error) {
        console.error('Error removing reported content:', error);
        alert(error.response?.data?.message || 'Không thể xóa nội dung được báo cáo');
      }
    },
    [handleUpdateReportStatus]
  );

  const handleViewReportEntity = useCallback((report) => {
    if (!report) return;
    if (report.entityType === 'question') {
      window.open(`${FORUM_QUESTION_ROUTE}/${report.entityId}`, '_blank', 'noopener');
      return;
    }
    const relatedQuestionId =
      report.relatedQuestion?.id || report.entity?.questionId || report.entity?.question_id;
    if (relatedQuestionId) {
      window.open(`${FORUM_QUESTION_ROUTE}/${relatedQuestionId}?answer=${report.entityId}`, '_blank', 'noopener');
    } else {
      alert('Không tìm thấy câu hỏi liên quan đến câu trả lời này');
    }
  }, []);

  const handleResetReportFilters = useCallback(() => {
    setReportStatusFilter('pending');
    setReportEntityFilter('');
  }, []);

  const renderReportCard = useCallback(
    (rawReport) => {
      if (!rawReport) {
        return null;
      }
      const report = rawReport;
      const createdAt = report.created_at || report.createdAt;
      const reviewedAt = report.reviewed_at || report.reviewedAt;
      const adminNote = report.admin_note || report.adminNote;
      const reporterName =
        report.reporter?.fullName || report.reporter?.email || 'Ẩn danh';
      const reasonLabel = reportReasonLabels[report.reason] || report.reason;
      const isQuestionEntity = report.entityType === 'question';
      const entityContent = report.entity?.content || '';
      const entityDeleted = Boolean(report.entity?.isDeleted);
      return (
        <div key={report.id} className="forum-management-page-report-card">
          <div className="forum-management-page-report-header">
            <span
              className="forum-management-page-report-status-chip"
              style={{ backgroundColor: getReportStatusColor(report.status) }}
            >
              {reportStatusLabels[report.status] || report.status}
            </span>
            <span className="forum-management-page-report-meta">{formatDateTime(createdAt)}</span>
          </div>
          <div className="forum-management-page-report-body">
            <p><strong>Người báo cáo:</strong> {reporterName}</p>
            <p><strong>Loại nội dung:</strong> {isQuestionEntity ? 'Câu hỏi' : 'Câu trả lời'}</p>
            <p><strong>Lý do:</strong> {reasonLabel}</p>
            {report.description && (<p><strong>Mô tả:</strong> {report.description}</p>)}
            {isQuestionEntity ? (
              <p className="forum-management-page-report-snippet">
                <strong>Tiêu đề:</strong>{' '}
                {report.entity?.title || 'Không tìm thấy câu hỏi'}
              </p>
            ) : (
              <p className="forum-management-page-report-snippet">
                <strong>Trích nội dung trả lời:</strong>{' '}
                {entityDeleted
                  ? 'Bình luận đã bị xoá do vi phạm tiêu chuẩn cộng đồng.'
                  : entityContent
                  ? `${entityContent.substring(0, 160)}${
                      entityContent.length > 160 ? '...' : ''
                    }`
                  : 'Không tìm thấy nội dung'}
              </p>
            )}
            {!isQuestionEntity && report.relatedQuestion && (
              <p>
                <strong>Thuộc câu hỏi:</strong>{' '}
                {report.relatedQuestion.title || `ID ${report.relatedQuestion.id}`}
              </p>
            )}
            {entityDeleted && (
              <p className="forum-management-page-report-warning">
                Nội dung này đã bị xoá do vi phạm tiêu chuẩn cộng đồng.
              </p>
            )}
          </div>
          {(report.relatedQuestion || isQuestionEntity) && (
            <div className="forum-management-page-report-related">
              <span>Liên kết:</span>
              <button
                type="button"
                className="forum-management-page-btn-view"
                onClick={() => handleViewReportEntity(report)}
              >
                <FaEye /> Xem nội dung
              </button>
            </div>
          )}
          <div className="forum-management-page-report-actions">
            {!isQuestionEntity && !entityDeleted && (
              <button
                type="button"
                className="forum-management-page-btn-remove-entity"
                onClick={() => handleRemoveReportedContent(report)}
              >
                <FaTrashAlt /> Xóa bình luận vi phạm
              </button>
            )}
            <div className="forum-management-page-report-status-actions">
              {['pending', 'reviewed', 'resolved', 'dismissed'].map((status) => (
                <button
                  key={status}
                  type="button"
                  className={`forum-management-page-btn-report-status ${report.status === status ? 'active' : ''}`}
                  onClick={() => handleUpdateReportStatus(report.id, status)}
                  disabled={report.status === status}
                >
                  {reportStatusLabels[status]}
                </button>
              ))}
            </div>
            {(reviewedAt || adminNote) && (
              <div className="forum-management-page-report-notes">
                {reviewedAt && (
                  <span>Xử lý: {formatDateTime(reviewedAt)}</span>
                )}
                {adminNote && <span>Ghi chú: {adminNote}</span>}
              </div>
            )}
          </div>
        </div>
      );
    },
    [
      handleRemoveReportedContent,
      handleUpdateReportStatus,
      handleViewReportEntity,
      reportReasonLabels,
      reportStatusLabels,
    ]
  );

  const handleApprove = async (questionId) => {
    try {
      await api.put(`/forum/questions/${questionId}/status`, 
        { status: 'closed' },
      );
      alert('Đã duyệt câu hỏi thành công!');
      await fetchQuestions();
      setShowModal(false);
    } catch (error) {
      console.error('Error approving question:', error);
      alert(error.response?.data?.message || 'Không thể duyệt câu hỏi');
    }
  };

  const handleReject = async (questionId) => {
    if (!rejectReason.trim()) {
      alert('Vui lòng nhập lý do từ chối');
      return;
    }
    try {
      await api.put(`/forum/questions/${questionId}/status`, 
        { status: 'hidden', reason: rejectReason },
      );
      alert('Đã từ chối câu hỏi');
      await fetchQuestions();
      setShowModal(false);
      setRejectReason('');
    } catch (error) {
      console.error('Error rejecting question:', error);
      alert(error.response?.data?.message || 'Không thể từ chối câu hỏi');
    }
  };

  const openModal = (question, action) => {
    setSelectedQuestion(question);
    setActionType(action);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedQuestion(null);
    setActionType('');
    setRejectReason('');
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'open': return 'Chờ duyệt';
      case 'closed': return 'Đã duyệt';
      case 'hidden': return 'Không duyệt';
      default: return status;
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'open': return '#E67E22'; // Warning (Cam)
      case 'closed': return '#27AE60'; // Success (Xanh lá)
      case 'hidden': return '#E74C3C'; // Error (Đỏ)
      default: return '#7F8C8D'; // Gray
    }
  };

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const sortedQuestions = useMemo(() => {
    let sortableItems = [...filteredQuestions];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        let valA, valB;
        if (sortConfig.key === 'author') {
          valA = a.isAnonymous ? 'Ẩn danh' : (a.author?.fullName || '').toLowerCase();
          valB = b.isAnonymous ? 'Ẩn danh' : (b.author?.fullName || '').toLowerCase();
        } else if (sortConfig.key === 'specialty') {
          valA = (a.specialty?.name || '').toLowerCase();
          valB = (b.specialty?.name || '').toLowerCase();
        } else if (sortConfig.key === 'title') {
          valA = (a.title || '').toLowerCase();
          valB = (b.title || '').toLowerCase();
        } else if (sortConfig.key === 'viewsCount' || sortConfig.key === 'answersCount') {
          valA = a[sortConfig.key] || 0;
          valB = b[sortConfig.key] || 0;
        } else {
          valA = a[sortConfig.key];
          valB = b[sortConfig.key];
        }
        if (valA < valB) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (valA > valB) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredQuestions, sortConfig]);

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return null;
    }
    if (sortConfig.direction === 'asc') {
      return <FaArrowUp className="forum-management-page-sort-icon" />;
    }
    return <FaArrowDown className="forum-management-page-sort-icon" />;
  };

  // --- JSX VỚI CÁC CLASSNAME ĐÃ ĐƯỢC ĐỔI TÊN ---

  return (
    <div className="forum-management-page-container">
      <header className="forum-management-page-header">
        <div className="forum-management-page-title-group">
          <span className="forum-management-page-kicker">Diễn đàn y khoa</span>
          <h1>Quản lý diễn đàn</h1>
          <p>Kiểm duyệt nội dung, xử lý báo cáo và giữ chất lượng thảo luận cho cộng đồng.</p>
        </div>
        <div className="forum-management-page-metrics">
          <div className="forum-management-page-metric-pill">
            <span className="forum-management-page-metric-label">Câu hỏi đang chờ</span>
            <span className="forum-management-page-metric-value">{stats.open}</span>
          </div>
          <div className="forum-management-page-metric-pill">
            <span className="forum-management-page-metric-label">Báo cáo mới</span>
            <span className="forum-management-page-metric-value">{reportCount}</span>
          </div>
        </div>
      </header>

      <section className="forum-management-page-stats-cards" aria-label="Tổng quan câu hỏi">
        <div className="forum-management-page-stat-card forum-management-page-stat-total">
          <FaChartBar className="forum-management-page-stat-icon" />
          <div className="forum-management-page-stat-info">
            <h3>{stats.total}</h3>
            <p>Tổng câu hỏi</p>
          </div>
        </div>
        <div className="forum-management-page-stat-card forum-management-page-stat-pending">
          <FaFilter className="forum-management-page-stat-icon" />
          <div className="forum-management-page-stat-info">
            <h3>{stats.open}</h3>
            <p>Chờ duyệt</p>
          </div>
        </div>
        <div className="forum-management-page-stat-card forum-management-page-stat-approved">
          <FaCheckCircle className="forum-management-page-stat-icon" />
          <div className="forum-management-page-stat-info">
            <h3>{stats.closed}</h3>
            <p>Đã duyệt</p>
          </div>
        </div>
        <div className="forum-management-page-stat-card forum-management-page-stat-rejected">
          <FaTimesCircle className="forum-management-page-stat-icon" />
          <div className="forum-management-page-stat-info">
            <h3>{stats.hidden}</h3>
            <p>Không duyệt</p>
          </div>
        </div>
      </section>

      <nav className="forum-management-page-tab-navigation" aria-label="Danh mục quản lý">
        <button
          type="button"
          className={activeTab === 'open' ? 'active' : ''}
          onClick={() => setActiveTab('open')}
        >
          Chờ duyệt <span className="forum-management-page-count-badge">{stats.open}</span>
        </button>
        <button
          type="button"
          className={activeTab === 'closed' ? 'active' : ''}
          onClick={() => setActiveTab('closed')}
        >
          Đã duyệt <span className="forum-management-page-count-badge">{stats.closed}</span>
        </button>
        <button
          type="button"
          className={activeTab === 'hidden' ? 'active' : ''}
          onClick={() => setActiveTab('hidden')}
        >
          Không duyệt <span className="forum-management-page-count-badge">{stats.hidden}</span>
        </button>
        <button
          type="button"
          className={activeTab === 'reports' ? 'active' : ''}
          onClick={() => setActiveTab('reports')}
        >
          Báo cáo <span className="forum-management-page-count-badge">{reportCount}</span>
        </button>
      </nav>

      <div className="forum-management-page-tab-panels">
        {isReportTab ? (
          <section className="forum-management-page-content-section forum-management-page-reports-panel" aria-label="Danh sách báo cáo">
            <div className="forum-management-page-section-header">
              <div>
                <h2>Báo cáo cần xử lý</h2>
                <p>Theo dõi các báo cáo từ cộng đồng và cập nhật trạng thái kịp thời.</p>
              </div>
              <div className="forum-management-page-section-meta">
                <span>{reportCount} báo cáo</span>
              </div>
            </div>

            <div className="forum-management-page-reports-filters">
              <div className="forum-management-page-filter-group">
                <label>Trạng thái</label>
                <select
                  value={reportStatusFilter}
                  onChange={(e) => setReportStatusFilter(e.target.value)}
                >
                  <option value="">Tất cả</option>
                  <option value="pending">Chờ xử lý</option>
                  <option value="reviewed">Đã xem</option>
                  <option value="resolved">Đã xử lý</option>
                  <option value="dismissed">Đã bỏ qua</option>
                </select>
              </div>

              <div className="forum-management-page-filter-group">
                <label>Loại nội dung</label>
                <select
                  value={reportEntityFilter}
                  onChange={(e) => setReportEntityFilter(e.target.value)}
                >
                  <option value="">Tất cả</option>
                  <option value="question">Câu hỏi</option>
                  <option value="answer">Câu trả lời</option>
                </select>
              </div>

              <button className="forum-management-page-btn-reset-filter" type="button" onClick={handleResetReportFilters}>
                Xóa bộ lọc
              </button>
            </div>

            <div className="forum-management-page-reports-list">
              {reportsLoading ? (
                <div className="forum-management-page-loading">Đang tải báo cáo...</div>
              ) : reports.length === 0 ? (
                <div className="forum-management-page-no-data">
                  Chưa có báo cáo nào phù hợp với bộ lọc hiện tại.
                </div>
              ) : (
                reports.map((report) => renderReportCard(report))
              )}
            </div>
          </section>
        ) : (
          <section className="forum-management-page-content-section forum-management-page-questions-panel" aria-label="Danh sách câu hỏi">
            <div className="forum-management-page-section-header">
              <div>
                <h2>Danh sách câu hỏi</h2>
                <p>Theo dõi nội dung theo trạng thái và duyệt nhanh chóng.</p>
              </div>
              <div className="forum-management-page-section-actions">
                <div className="forum-management-page-search-bar">
                  <FaSearch className="forum-management-page-search-icon" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm theo tiêu đề, nội dung hoặc người đặt câu hỏi"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="forum-management-page-table-wrapper">
              {loading ? (
                <div className="forum-management-page-loading">Đang tải câu hỏi...</div>
              ) : sortedQuestions.length === 0 ? (
                <div className="forum-management-page-no-data">
                  Không có câu hỏi nào phù hợp.
                </div>
              ) : (
                <table className="forum-management-page-table">
                  <thead>
                    <tr>
                      <th>STT</th>
                      <th
                        className="forum-management-page-sortable-header"
                        onClick={() => requestSort('title')}
                      >
                        Câu hỏi
                        {getSortIcon('title')}
                      </th>
                      <th
                        className="forum-management-page-sortable-header"
                        onClick={() => requestSort('specialty')}
                      >
                        Chuyên khoa
                        {getSortIcon('specialty')}
                      </th>
                      <th
                        className="forum-management-page-sortable-header"
                        onClick={() => requestSort('createdAt')}
                      >
                        Ngày gửi
                        {getSortIcon('createdAt')}
                      </th>
                      <th
                        className="forum-management-page-sortable-header"
                        onClick={() => requestSort('viewsCount')}
                      >
                        Lượt xem
                        {getSortIcon('viewsCount')}
                      </th>
                      <th>Trạng thái</th>
                      <th>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedQuestions.map((question, index) => (
                      <tr key={question.id}>
                        <td>{index + 1}</td>
                        <td className="forum-management-page-question-cell">
                          <div className="forum-management-page-question-cell-title">{question.title}</div>
                          <div className="forum-management-page-question-cell-author">
                            Hỏi bởi: {question.isAnonymous
                              ? 'Ẩn danh'
                              : (question.author?.fullName || question.author?.email || 'Không rõ')}
                          </div>
                        </td>
                        <td>{question.specialty?.name || 'Chung'}</td>
                        <td className="forum-management-page-date-cell">
                          {new Date(question.createdAt).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="forum-management-page-counts-cell">
                          <div>{question.viewsCount || 0} (Xem)</div>
                          <div>{question.answersCount || 0} (Trả lời)</div>
                        </td>
                        <td>
                          <span
                            className="forum-management-page-status-badge-table"
                            style={{ 
                              backgroundColor: getStatusColor(question.status) + '20',
                              color: getStatusColor(question.status)
                            }}
                          >
                            {getStatusText(question.status)}
                          </span>
                        </td>
                        <td className="forum-management-page-actions-cell">
                          {activeTab === 'open' && (
                            <>
                              <button
                                className="forum-management-page-btn-table-action forum-management-page-btn-table-approve"
                                onClick={() => openModal(question, 'approve')}
                                title="Duyệt"
                              >
                                <FaCheckCircle />
                              </button>
                              <button
                                className="forum-management-page-btn-table-action forum-management-page-btn-table-reject"
                                onClick={() => openModal(question, 'reject')}
                                title="Từ chối"
                              >
                                <FaTimesCircle />
                              </button>
                            </>
                          )}
                          {activeTab === 'closed' && (
                            <button
                              className="forum-management-page-btn-table-action forum-management-page-btn-table-view"
                              onClick={() => window.open(`${FORUM_QUESTION_ROUTE}/${question.id}`, '_blank')}
                              title="Xem chi tiết"
                            >
                              <FaEye />
                            </button>
                          )}
                          {activeTab === 'hidden' && question.rejectionReason && (
                            <div className="forum-management-page-rejection-reason-table">
                              <strong>Lý do:</strong> {question.rejectionReason}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        )}
      </div>

      {/* Modal */}
      {showModal && selectedQuestion && (
        <div className="forum-management-page-modal-overlay" onClick={closeModal}>
          <div className="forum-management-page-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="forum-management-page-modal-header">
              <h2>
                {actionType === 'approve' ? 'Duyệt câu hỏi' : 'Từ chối câu hỏi'}
              </h2>
              <button className="forum-management-page-close-btn" onClick={closeModal}>&times;</button>
            </div>
            
            <div className="forum-management-page-modal-body">
              <div className="forum-management-page-question-detail">
                <h3>{selectedQuestion.title}</h3>
                <p><strong>Người hỏi:</strong> {selectedQuestion.isAnonymous ? 'Ẩn danh' : (selectedQuestion.author?.fullName || selectedQuestion.author?.email || 'Ẩn danh')}</p>
                {selectedQuestion.specialty && (
                  <p><strong>Chuyên khoa:</strong> {selectedQuestion.specialty?.name}</p>
                )}
                <p><strong>Nội dung:</strong></p>
                <div className="forum-management-page-content-box">{selectedQuestion.content}</div>
              </div>

              {actionType === 'reject' && (
                <div className="forum-management-page-form-group">
                  <label>Lý do từ chối *</label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Nhập lý do từ chối câu hỏi này..."
                    rows="4"
                  />
                </div>
              )}
            </div>

            <div className="forum-management-page-modal-footer">
              <button className="forum-management-page-btn-cancel" onClick={closeModal}>
                Hủy
              </button>
              {actionType === 'approve' ? (
                <button 
                  className="forum-management-page-btn-confirm-approve" 
                  onClick={() => handleApprove(selectedQuestion.id)}
                >
                  Xác nhận duyệt
                </button>
              ) : (
                <button 
                  className="forum-management-page-btn-confirm-reject" 
                  onClick={() => handleReject(selectedQuestion.id)}
                >
                  Xác nhận từ chối
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForumManagementPage;