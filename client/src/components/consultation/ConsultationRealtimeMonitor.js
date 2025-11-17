// Path: client/src/components/consultation/ConsultationRealtimeMonitor.js
// ============================================================================
// ✅ ĐÃ VIẾT LẠI GIAO DIỆN VÀ CLASS NAME THEO CHỦ ĐỀ Y TẾ

import React, { useState, useEffect, useRef, useCallback } from 'react';
import consultationService from '../../services/consultationService';
import chatService from '../../services/chatService'; 
import { 
  FaExclamationTriangle, 
  FaCheck, 
  FaPaperPlane, 
  FaTimes, 
  FaUserShield, 
  FaNotesMedical, 
  FaHeadset,
  FaSpinner // Thêm icon spinner
} from 'react-icons/fa';

// Import file CSS mới
import './ConsultationRealtimeMonitor.css';

// Component Card Sự cố (Đã đổi class name)
const IncidentCard = ({ report, onResolve, onAction }) => {
  
  const getIncidentIcon = (type) => {
    switch (type) {
      case 'technical': return <FaHeadset title="Lỗi Kỹ thuật" />;
      case 'behavior': return <FaUserShield title="Vấn đề Thái độ/Hành vi" />;
      case 'emergency': return <FaNotesMedical title="Khẩn cấp Y tế/An toàn" />;
      case 'security': return <FaExclamationTriangle title="Vi phạm Bảo mật" />;
      default: return <FaExclamationTriangle />;
    }
  };

  const getIncidentTitle = (type) => {
    switch (type) {
      case 'technical': return "Lỗi Kỹ thuật";
      case 'behavior': return "Vấn đề Thái độ/Hành vi";
      case 'emergency': return "KHẨN CẤP Y TẾ / AN TOÀN";
      case 'security': return "VI PHẠM BẢO MẬT";
      default: return "Sự cố không xác định";
    }
  };

  const consultation = report.consultation;
  const patientId = consultation?.patient?.id;
  const doctorId = consultation?.doctor?.id;

  return (
    <div className={`consultation-realtime-monitor-card consultation-realtime-monitor-card-${report.report_type}`}>
      {/* Header của Card */}
      <div className="consultation-realtime-monitor-card-header">
        <span className="consultation-realtime-monitor-card-icon">
          {getIncidentIcon(report.report_type)}
        </span>
        <h4 className="consultation-realtime-monitor-card-title">
          {getIncidentTitle(report.report_type)}
        </h4>
        <span className="consultation-realtime-monitor-card-time">
          {new Date(report.created_at).toLocaleTimeString('vi-VN')}
        </span>
      </div>
      
      {/* Thân Card */}
      <div className="consultation-realtime-monitor-card-body">
        <p className="consultation-realtime-monitor-card-description">
          <strong>Ghi chú:</strong> {report.description}
        </p>
        <div className="consultation-realtime-monitor-card-meta">
          <span><strong>Mã phiên:</strong> {consultation?.consultation_code}</span>
          <span><strong>Người báo cáo:</strong> {report.reporter?.full_name} (ID: {report.reporter_id})</span>
        </div>
      </div>
      
      {/* Nút hành động */}
      <div className="consultation-realtime-monitor-card-actions">
        <button 
          className="consultation-realtime-monitor-action-button"
          onClick={() => onAction('message_user', consultation.id, patientId)}
          title="Gửi tin nhắn riêng cho Bệnh nhân"
        >
          <FaPaperPlane /> Gửi BN
        </button>
        <button 
          className="consultation-realtime-monitor-action-button"
          onClick={() => onAction('message_doctor', consultation.id, doctorId)}
          title="Gửi tin nhắn riêng cho Bác sĩ"
        >
          <FaPaperPlane /> Gửi BS
        </button>
        <button 
          className="consultation-realtime-monitor-action-button consultation-realtime-monitor-action-terminate"
          onClick={() => onAction('terminate', consultation.id)}
          title="Buộc kết thúc phiên"
        >
          <FaTimes /> Kết thúc
        </button>
        <button 
          className="consultation-realtime-monitor-action-button consultation-realtime-monitor-action-resolve"
          onClick={() => onResolve(report.id)}
          title="Đánh dấu là đã xử lý"
        >
          <FaCheck /> Xử lý
        </button>
      </div>
    </div>
  );
};

// Component Monitor chính (Đã đổi class name)
export const ConsultationRealtimeMonitor = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const wsListenerAttached = useRef(false);

  // --- LOGIC GIỮ NGUYÊN ---
  const fetchIncidents = useCallback(async () => {
    try {
      setLoading(true);
      const response = await consultationService.getPendingIncidents();
      if (response.data.success) {
        setIncidents(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching incidents:', err);
      setError('Không thể tải danh sách sự cố');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleNewIncident = (incident) => {
    console.log('Sự cố mới từ WebSocket:', incident);
    setIncidents(prev => [incident, ...prev]);
  };

  useEffect(() => {
    fetchIncidents();
    if (!wsListenerAttached.current) {
      chatService.on('new_incident', handleNewIncident);
      wsListenerAttached.current = true;
      console.log('WebSocket: Đã lắng nghe sự kiện "new_incident"');
    }
    return () => {
      chatService.off('new_incident', handleNewIncident);
      wsListenerAttached.current = false;
    };
  }, [fetchIncidents]);

  const handleResolve = async (reportId) => {
    const adminNote = prompt('Nhập ghi chú xử lý (nội bộ):');
    if (adminNote === null) return; 

    try {
      await consultationService.resolveIncident(reportId, { admin_note: adminNote, status: 'resolved' });
      setIncidents(prev => prev.filter(inc => inc.id !== reportId));
    } catch (err) {
      alert('Lỗi khi đóng sự cố: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleAdminAction = async (actionType, consultationId, targetUserId) => {
    let reason = '';
    
    switch (actionType) {
      case 'message_user':
      case 'message_doctor':
        const message = prompt('Nhập tin nhắn riêng (ADMIN):');
        if (!message) return;
        try {
          await consultationService.sendSystemMessage(consultationId, { 
            message: `[ADMIN] ${message}`,
            type: 'private_admin', 
            target_user_id: targetUserId
          });
          alert('Đã gửi tin nhắn (Lưu ý: Cần cập nhật backend để gửi riêng tư)');
        } catch (err) {
           alert('Lỗi khi gửi tin nhắn: ' + (err.response?.data?.message || err.message));
        }
        break;

      case 'terminate':
        reason = prompt('Bạn có chắc muốn BUỘC KẾT THÚC phiên này? Nhập lý do:');
        if (!reason) return;
        try {
          await consultationService.forceEndConsultation(consultationId, { reason });
          alert('Đã buộc kết thúc phiên');
        } catch (err) {
          alert('Lỗi khi kết thúc phiên: ' + (err.response?.data?.message || err.message));
        }
        break;
      
      default:
        break;
    }
  };
  // --- KẾT THÚC LOGIC ---

  return (
    <div className="consultation-realtime-monitor-container">
      {/* Header của trang */}
      <div className="consultation-realtime-monitor-header">
        <h3 className="consultation-realtime-monitor-title">
          <FaExclamationTriangle /> Bảng điều khiển Sự cố ({incidents.length})
        </h3>
        <span className="consultation-realtime-monitor-live-indicator">
          <span className="consultation-realtime-monitor-pulse-dot"></span> LIVE
        </span>
      </div>

      {/* Trạng thái Loading */}
      {loading && (
        <div className="consultation-realtime-monitor-empty-state">
          <FaSpinner className="consultation-realtime-monitor-spinner" />
          <p>Đang tải danh sách sự cố...</p>
        </div>
      )}

      {/* Trạng thái Lỗi */}
      {error && (
        <div className="consultation-realtime-monitor-empty-state consultation-realtime-monitor-error-state">
          <FaExclamationTriangle />
          <p>{error}</p>
        </div>
      )}

      {/* Trạng thái Rỗng */}
      {!loading && !error && incidents.length === 0 && (
        <div className="consultation-realtime-monitor-empty-state">
          <FaCheck />
          <p>Không có sự cố nào đang chờ xử lý.</p>
        </div>
      )}

      {/* Danh sách Card sự cố */}
      <div className="consultation-realtime-monitor-list">
        {incidents.map((report) => (
          <IncidentCard 
            key={report.id} 
            report={report}
            onResolve={handleResolve}
            onAction={handleAdminAction}
          />
        ))}
      </div>
    </div>
  );
};