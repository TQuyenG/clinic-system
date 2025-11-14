// client/src/pages/ChatRoomPage.js


import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import chatService from '../services/chatService';
import consultationService from '../services/consultationService';
import MessageItem from '../components/MessageItem';
import ChatInput from '../components/ChatInput';
import './ChatRoomPage.css';

const ChatRoomPage = ({ isAIChatbot = false }) => {
  const { id: consultationId } = useParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'));
  
  // State management
  const [consultation, setConsultation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
   useEffect(() => {
    if (isAIChatbot) {
      // Tin nhắn chào mừng của AI bot
      setMessages([{
        id: 1,
        text: 'Xin chào! Tôi là trợ lý ảo của Clinic System. Tôi có thể giúp gì cho bạn?',
        sender: 'bot',
        created_at: new Date().toISOString()
      }]);
    }
  }, [isAIChatbot]);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showInfoPanel, setShowInfoPanel] = useState(true);
  const [showEndConsultationModal, setShowEndConsultationModal] = useState(false);

  // Load consultation data và chat history
  useEffect(() => {
    loadConsultationData();
    loadChatHistory();
  }, [consultationId]);

  // Setup WebSocket connection
  useEffect(() => {
    if (!user.id || !consultationId) return;

    // Connect WebSocket
    chatService.connect(user.id);

    // Join consultation room
    chatService.joinConsultation(consultationId);

    // Register event listeners
    chatService.on('message', handleNewMessage);
    chatService.on('typing', handleTypingEvent);
    chatService.on('message_read', handleMessageRead);
    chatService.on('user_joined', handleUserJoined);
    chatService.on('user_left', handleUserLeft);

    // Cleanup on unmount
    return () => {
      chatService.leaveConsultation(consultationId);
      chatService.off('message', handleNewMessage);
      chatService.off('typing', handleTypingEvent);
      chatService.off('message_read', handleMessageRead);
      chatService.off('user_joined', handleUserJoined);
      chatService.off('user_left', handleUserLeft);
    };
  }, [user.id, consultationId]);

  // Auto scroll to bottom when new message
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load consultation data
  // Load consultation data
const loadConsultationData = async () => {
  try {
    // ✅ THÊM KIỂM TRA ID HỢP LỆ
    if (!consultationId || isNaN(consultationId) || consultationId === 'chon-bac-si' || consultationId === 'chatbot') {
      setError('ID tư vấn không hợp lệ');
      setLoading(false);
      return;
    }

    const data = await consultationService.getConsultationById(consultationId);
    setConsultation(data);
    setLoading(false);
  } catch (err) {
    console.error('Error fetching consultation:', err); // ✅ THÊM LOG
    setError('Không thể tải thông tin buổi tư vấn');
    setLoading(false);
  }
};

  // Load chat history
  const loadChatHistory = async () => {
    try {
      const history = await chatService.getChatHistory(consultationId);
      setMessages(history);
    } catch (err) {
      console.error('Không thể tải lịch sử chat:', err);
    }
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Handle new message from WebSocket
  const handleNewMessage = (message) => {
    setMessages(prev => [...prev, message]);
    
    // Mark as read if not my message
    if (message.sender_id !== user.id) {
      chatService.markMessageAsRead(message.id);
    }
  };

  // Handle typing indicator from WebSocket
  const handleTypingEvent = (data) => {
    if (data.userId !== user.id) {
      setOtherUserTyping(true);
      setTimeout(() => setOtherUserTyping(false), 3000);
    }
  };

  // Handle message read
  const handleMessageRead = (data) => {
    setMessages(prev => prev.map(msg => 
      msg.id === data.messageId ? { ...msg, is_read: true, read_at: new Date() } : msg
    ));
  };

  // Handle user joined
  const handleUserJoined = (data) => {
    console.log('User joined:', data);
  };

  // Handle user left
  const handleUserLeft = (data) => {
    console.log('User left:', data);
  };

  // Send message
  const handleSendMessage = async (content, files = []) => {
    if (!content.trim() && files.length === 0) return;

    //HÊM LOGIC AI BOT
    if (isAIChatbot) {
      const userMsg = {
        id: messages.length + 1,
        text: inputValue.trim(),
        sender: 'user',
        created_at: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, userMsg]);
      setInputValue('');
      setIsTyping(true);

      // Giả lập AI response
      setTimeout(() => {
        const botResponse = getBotResponse(userMsg.text);
        const botMsg = {
          id: messages.length + 2,
          text: botResponse,
          sender: 'bot',
          created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, botMsg]);
        setIsTyping(false);
      }, 1500);
      
      return; // KHÔNG gọi API
    }

    try {
      // Send text message
      if (content.trim()) {
        const messageData = {
          consultation_id: consultationId,
          receiver_id: getOtherUserId(),
          message_type: 'text',
          content: content.trim()
        };

        await chatService.sendTextMessage(messageData);
        setInputValue('');
      }

      // Upload files
      if (files.length > 0) {
        setUploading(true);
        for (const file of files) {
          await handleFileUpload(file);
        }
        setUploading(false);
      }
    } catch (err) {
      console.error('Lỗi khi gửi tin nhắn:', err);
      alert('Không thể gửi tin nhắn. Vui lòng thử lại!');
      setUploading(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('consultation_id', consultationId);
      formData.append('receiver_id', getOtherUserId());

      // Determine message type
      let messageType = 'file';
      if (file.type.startsWith('image/')) {
        messageType = 'image';
      } else if (file.type.startsWith('audio/')) {
        messageType = 'voice';
      }

      formData.append('message_type', messageType);

      await chatService.uploadFile(formData);
    } catch (err) {
      console.error('Lỗi khi upload file:', err);
      throw err;
    }
  };

  // Send typing indicator
  const handleUserTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      chatService.sendTypingStatus(consultationId, getOtherUserId());
      setTimeout(() => setIsTyping(false), 3000);
    }
  };

  // Get other user ID
  const getOtherUserId = () => {
    if (!consultation) return null;
    return user.id === consultation.patient_id ? consultation.doctor_id : consultation.patient_id;
  };

  // Get other user info
  const getOtherUser = () => {
    if (!consultation) return null;
    return user.id === consultation.patient_id ? consultation.Doctor : consultation.Patient;
  };

  // Simple AI bot response helper (used only when isAIChatbot === true)
  const getBotResponse = (text) => {
    if (!text) return "Xin lỗi, tôi không nghe rõ. Bạn có thể nói lại không?";
    const t = text.toLowerCase();
    if (t.includes('xin chào') || t.includes('chào')) return 'Chào bạn! Tôi có thể giúp gì cho bạn hôm nay?';
    if (t.includes('đau') || t.includes('đau ngực')) return 'Nếu bạn bị đau ngực khi vận động, hãy dừng hoạt động và liên hệ cấp cứu nếu cơn đau dữ dội.';
    if (t.includes('cảm ơn') || t.includes('thanks')) return 'Rất vui được giúp đỡ bạn!';
    return 'Cảm ơn. Tôi đã nhận được tin nhắn của bạn và sẽ trả lời sớm.';
  };

  // Handle reply message
  const handleReply = (messageId) => {
    // TODO: Implement reply functionality
    console.log('Reply to message:', messageId);
  };

  // Handle delete message
  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Bạn có chắc muốn xóa tin nhắn này?')) return;

    try {
      await chatService.deleteMessage(messageId);
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
    } catch (err) {
      console.error('Lỗi khi xóa tin nhắn:', err);
      alert('Không thể xóa tin nhắn!');
    }
  };

  // End consultation (Doctor only)
  const handleEndConsultation = async (resultData) => {
    try {
      await consultationService.completeConsultation(consultationId, resultData);
      alert('Kết thúc buổi tư vấn thành công!');
      navigate('/bac-si/tu-van');
    } catch (err) {
      console.error('Lỗi khi kết thúc tư vấn:', err);
      alert('Không thể kết thúc buổi tư vấn!');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="chat-room-loading">
        <div className="spinner"></div>
        <p>Đang tải phòng chat...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="chat-room-error">
        <i className="fas fa-exclamation-circle"></i>
        <h2>{error}</h2>
        <button onClick={() => navigate(-1)}>Quay lại</button>
      </div>
    );
  }

  const otherUser = getOtherUser();

  return (
    <div className="chat-room-page">
      {/* Header */}
      <div className="chat-room-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <i className="fas fa-arrow-left"></i>
        </button>
        
        <div className="header-user-info">
          <img 
            src={otherUser?.avatar_url || '/images/default-avatar.png'} 
            alt={otherUser?.full_name}
            className="user-avatar"
          />
          <div className="user-details">
            <h3>{otherUser?.full_name}</h3>
            <span className="user-status">
              {otherUserTyping ? (
                <>
                  <span className="typing-indicator"></span>
                  Đang gõ...
                </>
              ) : (
                <>
                  <span className={`status-dot ${consultation?.status === 'in_progress' ? 'online' : 'offline'}`}></span>
                  {consultation?.status === 'in_progress' ? 'Đang hoạt động' : 'Không hoạt động'}
                </>
              )}
            </span>
          </div>
        </div>

        <div className="header-actions">
          <button 
            className="info-toggle-btn"
            onClick={() => setShowInfoPanel(!showInfoPanel)}
            title="Thông tin"
          >
            <i className="fas fa-info-circle"></i>
          </button>
          
          {user.role === 'doctor' && consultation?.status === 'in_progress' && (
            <button 
              className="end-consultation-btn"
              onClick={() => setShowEndConsultationModal(true)}
            >
              <i className="fas fa-check-circle"></i>
              Kết thúc tư vấn
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="chat-room-content">
        {/* Messages Area */}
        <div className={`messages-area ${showInfoPanel ? 'with-panel' : 'full-width'}`}>
          <div className="messages-container">
            {messages.length === 0 ? (
              <div className="no-messages">
                <i className="fas fa-comments"></i>
                <p>Chưa có tin nhắn nào</p>
                <p className="hint">Bắt đầu cuộc trò chuyện ngay bây giờ!</p>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <MessageItem
                    key={message.id}
                    message={message}
                    isMyMessage={message.sender_id === user.id}
                    onReply={handleReply}
                    onDelete={handleDeleteMessage}
                  />
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Typing Indicator */}
          {otherUserTyping && (
            <div className="typing-indicator-container">
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
            </div>
          )}

          {/* Chat Input */}
          <ChatInput
            value={inputValue}
            onChange={setInputValue}
            onSend={handleSendMessage}
            onTyping={handleUserTyping}
            disabled={consultation?.status !== 'in_progress' || uploading}
            uploading={uploading}
          />
        </div>

        {/* Info Panel */}
        {showInfoPanel && (
          <div className="info-panel">
            <div className="panel-header">
              <h3>Thông tin buổi tư vấn</h3>
              <button onClick={() => setShowInfoPanel(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="panel-content">
              {/* Consultation Info */}
              <div className="info-section">
                <h4>Chi tiết tư vấn</h4>
                <div className="info-item">
                  <label>Mã buổi tư vấn:</label>
                  <span>{consultation?.consultation_code}</span>
                </div>
                <div className="info-item">
                  <label>Loại tư vấn:</label>
                  <span className="badge badge-type">
                    {consultation?.consultation_type === 'chat' && 'Chat'}
                    {consultation?.consultation_type === 'video' && 'Video Call'}
                    {consultation?.consultation_type === 'offline' && 'Tại bệnh viện'}
                  </span>
                </div>
                <div className="info-item">
                  <label>Trạng thái:</label>
                  <span className={`badge badge-status badge-${consultation?.status}`}>
                    {consultation?.status === 'pending' && 'Chờ xác nhận'}
                    {consultation?.status === 'confirmed' && 'Đã xác nhận'}
                    {consultation?.status === 'in_progress' && 'Đang diễn ra'}
                    {consultation?.status === 'completed' && 'Hoàn thành'}
                    {consultation?.status === 'cancelled' && 'Đã hủy'}
                  </span>
                </div>
                <div className="info-item">
                  <label>Thời gian:</label>
                  <span>{new Date(consultation?.appointment_time).toLocaleString('vi-VN')}</span>
                </div>
                {consultation?.started_at && (
                  <div className="info-item">
                    <label>Bắt đầu:</label>
                    <span>{new Date(consultation?.started_at).toLocaleTimeString('vi-VN')}</span>
                  </div>
                )}
              </div>

              {/* Medical Info */}
              {consultation?.chief_complaint && (
                <div className="info-section">
                  <h4>Triệu chứng</h4>
                  <p className="medical-text">{consultation.chief_complaint}</p>
                </div>
              )}

              {consultation?.medical_history && (
                <div className="info-section">
                  <h4>Tiền sử bệnh</h4>
                  <p className="medical-text">{consultation.medical_history}</p>
                </div>
              )}

              {/* Payment Info */}
              <div className="info-section">
                <h4>Thông tin thanh toán</h4>
                <div className="info-item">
                  <label>Phí tư vấn:</label>
                  <span className="price">{consultation?.base_fee?.toLocaleString('vi-VN')}đ</span>
                </div>
                <div className="info-item">
                  <label>Phí nền tảng:</label>
                  <span className="price">{consultation?.platform_fee?.toLocaleString('vi-VN')}đ</span>
                </div>
                <div className="info-item total">
                  <label>Tổng cộng:</label>
                  <span className="price">{consultation?.total_fee?.toLocaleString('vi-VN')}đ</span>
                </div>
                <div className="info-item">
                  <label>Trạng thái:</label>
                  <span className={`badge badge-payment badge-${consultation?.payment_status}`}>
                    {consultation?.payment_status === 'paid' && 'Đã thanh toán'}
                    {consultation?.payment_status === 'pending' && 'Chờ thanh toán'}
                    {consultation?.payment_status === 'refunded' && 'Đã hoàn tiền'}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="panel-actions">
                <button className="btn-secondary" onClick={() => navigate(`/tu-van/${consultationId}`)}>
                  <i className="fas fa-eye"></i>
                  Xem chi tiết
                </button>
                {user.role === 'patient' && consultation?.status === 'pending' && (
                  <button className="btn-danger" onClick={() => {
                    if (window.confirm('Bạn có chắc muốn hủy buổi tư vấn này?')) {
                      consultationService.cancelConsultation(consultationId, { reason: 'Hủy bởi bệnh nhân' });
                    }
                  }}>
                    <i className="fas fa-times-circle"></i>
                    Hủy tư vấn
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* End Consultation Modal (Doctor only) */}
      {showEndConsultationModal && (
        <EndConsultationModal
          consultation={consultation}
          onClose={() => setShowEndConsultationModal(false)}
          onSubmit={handleEndConsultation}
        />
      )}
    </div>
  );
};

// End Consultation Modal Component
const EndConsultationModal = ({ consultation, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    diagnosis: '',
    treatment_plan: '',
    prescription_data: '',
    severity_level: 'normal',
    need_followup: false,
    followup_date: '',
    doctor_notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.diagnosis.trim()) {
      alert('Vui lòng nhập chẩn đoán!');
      return;
    }
    onSubmit(formData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-end-consultation">
        <div className="modal-header">
          <h2>Kết thúc buổi tư vấn</h2>
          <button className="close-btn" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>Chẩn đoán <span className="required">*</span></label>
            <textarea
              value={formData.diagnosis}
              onChange={(e) => setFormData({...formData, diagnosis: e.target.value})}
              placeholder="Nhập chẩn đoán sơ bộ..."
              rows="3"
              required
            />
          </div>

          <div className="form-group">
            <label>Kế hoạch điều trị</label>
            <textarea
              value={formData.treatment_plan}
              onChange={(e) => setFormData({...formData, treatment_plan: e.target.value})}
              placeholder="Nhập kế hoạch điều trị..."
              rows="3"
            />
          </div>

          <div className="form-group">
            <label>Đơn thuốc (nếu có)</label>
            <textarea
              value={formData.prescription_data}
              onChange={(e) => setFormData({...formData, prescription_data: e.target.value})}
              placeholder="Tên thuốc, liều dùng..."
              rows="3"
            />
          </div>

          <div className="form-group">
            <label>Mức độ nghiêm trọng</label>
            <select
              value={formData.severity_level}
              onChange={(e) => setFormData({...formData, severity_level: e.target.value})}
            >
              <option value="normal">Bình thường</option>
              <option value="moderate">Cần theo dõi</option>
              <option value="urgent">Khẩn cấp</option>
            </select>
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={formData.need_followup}
                onChange={(e) => setFormData({...formData, need_followup: e.target.checked})}
              />
              Cần tái khám
            </label>
          </div>

          {formData.need_followup && (
            <div className="form-group">
              <label>Ngày tái khám</label>
              <input
                type="date"
                value={formData.followup_date}
                onChange={(e) => setFormData({...formData, followup_date: e.target.value})}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          )}

          <div className="form-group">
            <label>Ghi chú của bác sĩ</label>
            <textarea
              value={formData.doctor_notes}
              onChange={(e) => setFormData({...formData, doctor_notes: e.target.value})}
              placeholder="Ghi chú thêm..."
              rows="2"
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className="btn-primary">
              <i className="fas fa-check"></i>
              Hoàn thành tư vấn
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatRoomPage;