// client/src/pages/ChatRoomPage.js

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import chatService from '../services/chatService';
import consultationService from '../services/consultationService';
import MessageItem from '../components/MessageItem';
import ChatInput from '../components/ChatInput';
import './ChatRoomPage.css'; // Sẽ import file CSS mới ở dưới

const ChatRoomPage = ({ isAIChatbot = false }) => {
  const { id: consultationId } = useParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const [user] = useState(JSON.parse(localStorage.getItem('user') || '{}')); // <-- XÓA setUser
  
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
  const [needsOtp, setNeedsOtp] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [showEndConsultationModal, setShowEndConsultationModal] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState({ // <-- DÒNG 52
    report_type: '',
    description: ''
  });

  const [warning10MinShown, setWarning10MinShown] = useState(false);
  const [timeUpModalShown, setTimeUpModalShown] = useState(false);

  // ========== BẮT ĐẦU ĐOẠN SỬA LỖI no-use-before-define ==========

  // DI CHUYỂN CÁC HÀM XỬ LÝ LÊN TRÊN (TRƯỚC KHI useEffect GỌI)

  // Load consultation data
  const loadConsultationData = useCallback(async () => {
    try {
      if (!consultationId || isNaN(consultationId) || consultationId === 'chon-bac-si' || consultationId === 'chatbot') {
        setError('ID tư vấn không hợp lệ');
        setLoading(false);
        return;
      }

      const response = await consultationService.getConsultationById(consultationId);
      
      let data;
      if (response.data?.data) {
        data = response.data.data;
      } else if (response.data) {
        data = response.data;
      } else {
        data = response;
      }
      
      console.log('🔍 Full response:', response);
      console.log('🔍 Consultation data:', data);
      console.log('🔍 Data keys:', Object.keys(data));
      setConsultation(data);

      // KIỂM TRA OTP
      if ((user.role === 'patient' || user.role === 'doctor') && data.chat_otp) {
        // const now = new Date(); // <-- XÓA
        // const expiryTime = new Date(data.otp_expires_at); // <-- XÓA
        
        // Bỏ qua kiểm tra thời gian, chỉ cần có OTP và đúng trạng thái là bắt nhập
        if (data.status === 'confirmed' || data.status === 'in_progress') { // <-- SỬA DÒNG NÀY
          console.log(`✅ Cần nhập OTP (Role: ${user.role}, Không giới hạn thời gian)`);
          setNeedsOtp(true);
        } else {
          console.log('⚠️ Trạng thái không hợp lệ');
        }
      } else {
        console.log('ℹ️ Không cần OTP (không phải Paitent/Doctor hoặc lịch hẹn không có OTP)');
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching consultation:', err);
      setError('Không thể tải thông tin buổi tư vấn');
      setLoading(false);
    }
  }, [consultationId, user.role]);

  // Load chat history
  const loadChatHistory = useCallback(async () => {
    try {
      const history = await chatService.getChatHistory(consultationId);
      setMessages(history);
    } catch (err) {
      console.error('Không thể tải lịch sử chat:', err);
    }
  }, [consultationId]);

  // Handle new message from WebSocket
  const handleNewMessage = useCallback((message) => {
    setMessages(prev => [...prev, message]);
    
    if (message.sender_id !== user.id) {
      chatService.markMessageAsRead(message.id);
    }
  }, [user.id]);

  // Handle typing indicator from WebSocket
  const handleTypingEvent = useCallback((data) => {
    if (data.userId !== user.id) {
      setOtherUserTyping(true);
      setTimeout(() => setOtherUserTyping(false), 3000);
    }
  }, [user.id]);


  // CÁC HÀM useEffect GIỜ ĐÃ NẰM SAU KHI HÀM ĐƯỢC ĐỊNH NGHĨA
  // Load consultation data và chat history
  useEffect(() => {
    loadConsultationData();
    loadChatHistory();
  }, [consultationId, loadConsultationData, loadChatHistory]); // <-- Đã sửa

  // Setup WebSocket connection
  useEffect(() => {
    if (!user.id || !consultationId) return;

    // Connect WebSocket
    chatService.connect(user.id);

    // Join consultation room
    chatService.joinConsultation(consultationId);

    // Register event listeners
    chatService.on('message', handleNewMessage);
    chatService.on('new_message', handleNewMessage); 
    chatService.on('typing', handleTypingEvent);
    chatService.on('message_read', handleMessageRead);
    chatService.on('user_joined', handleUserJoined);
    chatService.on('user_left', handleUserLeft);

    // Cleanup on unmount
    return () => {
      chatService.leaveConsultation(consultationId);
      chatService.off('message', handleNewMessage);
      chatService.off('new_message', handleNewMessage); 
      chatService.off('typing', handleTypingEvent);
      chatService.off('message_read', handleMessageRead);
      chatService.off('user_joined', handleUserJoined);
      chatService.off('user_left', handleUserLeft);
    };
  }, [user.id, consultationId, handleNewMessage, handleTypingEvent]); // <-- Đã sửa

  // Auto scroll to bottom when new message
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Đếm ngược thời gian tư vấn
  useEffect(() => {
    if (!consultation || consultation.status !== 'in_progress') return;

    const timer = setInterval(() => {
      if (consultation.started_at && consultation.package?.duration_minutes) {
        const startTime = new Date(consultation.started_at).getTime();
        const duration = consultation.package.duration_minutes * 60 * 1000;
        const endTime = startTime + duration;
        const now = Date.now();
        const remaining = endTime - now;

        if (remaining <= 0) {
          setTimeRemaining(0);
          clearInterval(timer);

          // YÊU CẦU 2: Cảnh báo hết giờ (chỉ cho bác sĩ)
          if (user.role === 'doctor' && !timeUpModalShown) {
            alert('Thời gian tư vấn đã hết. Vui lòng hoàn thành buổi tư vấn và gửi ghi chú cho bệnh nhân.');
            setTimeUpModalShown(true); // Đánh dấu đã hiện
          }
        } else {
          setTimeRemaining(remaining);

          // YÊU CẦU 1: Cảnh báo 10 phút (cho cả hai)
          if (remaining <= 600000 && !warning10MinShown) { // 600000ms = 10 phút
            const minutesLeft = Math.floor(remaining / 60000);
            alert(`Thời gian tư vấn của bạn sắp hết. Còn khoảng ${minutesLeft} phút.`);
            setWarning10MinShown(true); // Đánh dấu đã hiện
          }
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [consultation]);

  // ========== KẾT THÚC ĐOẠN SỬA ==========

  // Format thời gian còn lại
  const formatTimeRemaining = (ms) => {
    if (!ms || ms <= 0) return '00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // XỬ LÝ OTP
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setOtpError('');
    if (!otp) {
      setOtpError('Vui lòng nhập OTP');
      return;
    }

    try {
      await consultationService.verifyChatOTP(consultationId, { otp }); 
      setNeedsOtp(false);
    } catch (err) {
      console.error('Lỗi xác thực OTP:', err);
      setOtpError(err.response?.data?.message || 'Lỗi xác thực OTP');
    }
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
      
      return;
    }

    try {
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

  // Simple AI bot response helper
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
      <div className="chatroompage-loading-container">
        <div className="chatroompage-loading-spinner"></div>
        <p className="chatroompage-loading-text">Đang tải phòng chat...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="chatroompage-error-container">
        <i className="fas fa-exclamation-circle chatroompage-error-icon"></i>
        <h2 className="chatroompage-error-title">{error}</h2>
        <button className="chatroompage-error-button" onClick={() => navigate(-1)}>
          Quay lại
        </button>
      </div>
    );
  }

  const otherUser = getOtherUser();

  if (needsOtp) {
    return (
      <div className="chatroompage-otp-container">
        <div className="chatroompage-otp-modal">
          <button className="chatroompage-otp-back-button" onClick={() => navigate(-1)}>
            <i className="fas fa-arrow-left"></i>
          </button>
          <div className="chatroompage-otp-icon">
            <i className="fas fa-shield-alt"></i>
          </div>
          <h2 className="chatroompage-otp-title">Xác thực phòng tư vấn</h2>
          <p className="chatroompage-otp-description">
            Mã OTP đã được gửi đến email của bạn. Vui lòng nhập mã để tiếp tục.
          </p>
          <form onSubmit={handleOtpSubmit} className="chatroompage-otp-form">
            <div className="chatroompage-otp-input-group">
              <label className="chatroompage-otp-label">Mã OTP</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="chatroompage-otp-input"
                maxLength="6"
                placeholder="Nhập 6 số"
              />
            </div>
            {otpError && <p className="chatroompage-otp-error">{otpError}</p>}
            <button type="submit" className="chatroompage-otp-submit-button">
              <i className="fas fa-check-circle"></i>
              Xác nhận
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="chatroompage-container">
      {/* Header */}
      <div className="chatroompage-header">
        <button className="chatroompage-header-back-button" onClick={() => navigate(-1)}>
          <i className="fas fa-arrow-left"></i>
        </button>
        
        <div className="chatroompage-header-user-info">
          <img 
            src={otherUser?.avatar_url || '/images/default-avatar.png'} 
            alt={otherUser?.full_name}
            className="chatroompage-header-avatar"
          />
          <div className="chatroompage-header-details">
            <h3 className="chatroompage-header-name">{otherUser?.full_name}</h3>
            <span className="chatroompage-header-status">
              {otherUserTyping ? (
                <>
                  <span className="chatroompage-header-typing-dot"></span>
                  Đang gõ...
                </>
              ) : (
                <>
                  <span className={`chatroompage-header-status-dot ${consultation?.status === 'in_progress' ? 'chatroompage-header-status-online' : ''}`}></span>
                  {consultation?.status === 'in_progress' ? 'Đang hoạt động' : 'Không hoạt động'}
                </>
              )}
            </span>
          </div>
        </div>

        <div className="chatroompage-header-actions">
          {consultation?.status === 'in_progress' && timeRemaining !== null && (
            <div className={`chatroompage-header-timer ${timeRemaining < 300000 ? 'chatroompage-header-timer-warning' : ''}`}>
              <i className="fas fa-clock"></i>
              <span>{formatTimeRemaining(timeRemaining)}</span>
            </div>
          )}

          <button 
            className="chatroompage-header-info-button"
            onClick={() => setShowInfoPanel(!showInfoPanel)}
            title="Thông tin"
          >
            <i className="fas fa-info-circle"></i>
          </button>
          
          {consultation?.status === 'in_progress' && (
            <button 
              className="chatroompage-header-report-button"
              onClick={() => setShowReportModal(true)}
              title="Báo cáo vấn đề"
            >
              <i className="fas fa-flag"></i>
            </button>
          )}

          {user.role === 'doctor' && consultation?.status === 'in_progress' && (
            <button 
              className="chatroompage-header-end-button"
              onClick={() => setShowEndConsultationModal(true)}
            >
              <i className="fas fa-check-circle"></i>
              <span>Kết thúc</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="chatroompage-content">
        {/* Messages Area */}
        <div className={`chatroompage-messages-area ${showInfoPanel ? 'chatroompage-messages-area-with-panel' : ''}`}>
          <div className="chatroompage-messages-list">
            {messages.length === 0 ? (
              <div className="chatroompage-messages-empty">
                <i className="fas fa-comments chatroompage-messages-empty-icon"></i>
                <p className="chatroompage-messages-empty-title">Chưa có tin nhắn</p>
                <p className="chatroompage-messages-empty-subtitle">Bắt đầu cuộc trò chuyện ngay!</p>
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

          {otherUserTyping && (
            <div className="chatroompage-typing-indicator">
              <span className="chatroompage-typing-dot"></span>
              <span className="chatroompage-typing-dot"></span>
              <span className="chatroompage-typing-dot"></span>
            </div>
          )}

          <ChatInput
            value={inputValue}
            onChange={setInputValue}
            onSend={handleSendMessage}
            onTyping={handleUserTyping}
            // SỬA: Thêm điều kiện chặn khi đã 'completed'
            disabled={uploading || consultation?.status === 'completed'}
            uploading={uploading}
          />
        </div>

        {/* Info Panel */}
        {showInfoPanel && (
          <div className="chatroompage-info-panel">
            <div className="chatroompage-info-panel-header">
              <h3 className="chatroompage-info-panel-title">Thông tin buổi tư vấn</h3>
              <button className="chatroompage-info-panel-close" onClick={() => setShowInfoPanel(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="chatroompage-info-panel-content">
              {/* Consultation Info */}
              <div className="chatroompage-info-section">
                <h4 className="chatroompage-info-section-title">Chi tiết tư vấn</h4>
                <div className="chatroompage-info-item">
                  <label className="chatroompage-info-label">Mã:</label>
                  <span className="chatroompage-info-value">{consultation?.consultation_code}</span>
                </div>
                <div className="chatroompage-info-item">
                  <label className="chatroompage-info-label">Loại:</label>
                  <span className="chatroompage-info-badge chatroompage-info-badge-type">
                    {consultation?.consultation_type === 'chat' && 'Chat'}
                    {consultation?.consultation_type === 'video' && 'Video'}
                    {consultation?.consultation_type === 'offline' && 'Tại viện'}
                  </span>
                </div>
                <div className="chatroompage-info-item">
                  <label className="chatroompage-info-label">Trạng thái:</label>
                  <span className={`chatroompage-info-badge chatroompage-info-badge-${consultation?.status}`}>
                    {consultation?.status === 'pending' && 'Chờ xác nhận'}
                    {consultation?.status === 'confirmed' && 'Đã xác nhận'}
                    {consultation?.status === 'in_progress' && 'Đang diễn ra'}
                    {consultation?.status === 'completed' && 'Hoàn thành'}
                    {consultation?.status === 'cancelled' && 'Đã hủy'}
                  </span>
                </div>
                <div className="chatroompage-info-item">
                  <label className="chatroompage-info-label">Thời gian:</label>
                  <span className="chatroompage-info-value">
                    {new Date(consultation?.appointment_time).toLocaleString('vi-VN')}
                  </span>
                </div>
                {consultation?.started_at && (
                  <div className="chatroompage-info-item">
                    <label className="chatroompage-info-label">Bắt đầu:</label>
                    <span className="chatroompage-info-value">
                      {new Date(consultation?.started_at).toLocaleTimeString('vi-VN')}
                    </span>
                  </div>
                )}
              </div>

              {/* Medical Info */}
              {consultation?.chief_complaint && (
                <div className="chatroompage-info-section">
                  <h4 className="chatroompage-info-section-title">Triệu chứng</h4>
                  <p className="chatroompage-info-medical-text">{consultation.chief_complaint}</p>
                </div>
              )}

              {consultation?.medical_history && (
                <div className="chatroompage-info-section">
                  <h4 className="chatroompage-info-section-title">Tiền sử bệnh</h4>
                  <p className="chatroompage-info-medical-text">{consultation.medical_history}</p>
                </div>
              )}

              {/* Payment Info */}
              <div className="chatroompage-info-section">
                <h4 className="chatroompage-info-section-title">Thanh toán</h4>
                <div className="chatroompage-info-item">
                  <label className="chatroompage-info-label">Phí tư vấn:</label>
                  <span className="chatroompage-info-price">
                    {consultation?.base_fee?.toLocaleString('vi-VN')}đ
                  </span>
                </div>
                <div className="chatroompage-info-item">
                  <label className="chatroompage-info-label">Phí nền tảng:</label>
                  <span className="chatroompage-info-price">
                    {consultation?.platform_fee?.toLocaleString('vi-VN')}đ
                  </span>
                </div>
                <div className="chatroompage-info-item chatroompage-info-item-total">
                  <label className="chatroompage-info-label">Tổng cộng:</label>
                  <span className="chatroompage-info-price chatroompage-info-price-total">
                    {consultation?.total_fee?.toLocaleString('vi-VN')}đ
                  </span>
                </div>
                <div className="chatroompage-info-item">
                  <label className="chatroompage-info-label">Trạng thái:</label>
                  <span className={`chatroompage-info-badge chatroompage-info-badge-payment-${consultation?.payment_status}`}>
                    {consultation?.payment_status === 'paid' && 'Đã thanh toán'}
                    {consultation?.payment_status === 'pending' && 'Chờ thanh toán'}
                    {consultation?.payment_status === 'refunded' && 'Đã hoàn tiền'}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="chatroompage-info-actions">
                <button 
                  className="chatroompage-info-action-button chatroompage-info-action-view" 
                  onClick={() => navigate(`/tu-van/${consultationId}`)}
                >
                  <i className="fas fa-eye"></i>
                  Xem chi tiết
                </button>
                {user.role === 'patient' && consultation?.status === 'pending' && (
                  <button 
                    className="chatroompage-info-action-button chatroompage-info-action-cancel" 
                    onClick={() => {
                      if (window.confirm('Bạn có chắc muốn hủy buổi tư vấn này?')) {
                        consultationService.cancelConsultation(consultationId, { reason: 'Hủy bởi bệnh nhân' });
                      }
                    }}
                  >
                    <i className="fas fa-times-circle"></i>
                    Hủy tư vấn
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="chatroompage-modal-overlay">
          <div className="chatroompage-modal-content">
            <div className="chatroompage-modal-header">
              <h2 className="chatroompage-modal-title">Báo cáo vấn đề</h2>
              <button className="chatroompage-modal-close" onClick={() => setShowReportModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!reportData.report_type) { // <-- KIỂM TRA VALIDATION
                alert('Vui lòng chọn loại sự cố');
                return;
              }
              try {
                // Gửi đối tượng đầy đủ
                await consultationService.reportIssue(consultationId, reportData); 
                alert('Đã gửi báo cáo thành công! Quản trị viên sẽ sớm xem xét sự cố.');
                setShowReportModal(false);
                setReportData({ report_type: '', description: '' }); // <-- RESET STATE
              } catch (err) {
                // Sửa lỗi 404: Hiển thị lỗi từ server
                alert(err.response?.data?.message || 'Lỗi khi gửi báo cáo');
              }
            }} className="chatroompage-modal-form">

              {/* ========== BẮT ĐẦU THÊM MỚI: LOẠI SỰ CỐ ========== */}
              <div className="chatroompage-modal-form-group">
                <label className="chatroompage-modal-label">Loại sự cố <span style={{color: 'red'}}>*</span></label>
                <select
                  value={reportData.report_type}
                  onChange={(e) => setReportData(prev => ({...prev, report_type: e.target.value}))}
                  required
                  className="chatroompage-modal-select" // Giả sử bạn có style cho select
                >
                  <option value="">-- Vui lòng chọn --</option>
                  <option value="technical">Lỗi kỹ thuật (Không gửi được file, mất kết nối...)</option>
                  <option value="behavior">Thái độ/Hành vi của người tham gia</option>
                  <option value="emergency">Tình huống khẩn cấp (Y tế, An toàn)</option>
                  <option value="security">Vi phạm bảo mật (Lộ thông tin)</option>
                </select>
              </div>
              {/* ========== KẾT THÚC THÊM MỚI ========== */}

              <div className="chatroompage-modal-form-group">
                <label className="chatroompage-modal-label">Mô tả vấn đề <span style={{color: 'red'}}>*</span></label>
                <textarea
                  value={reportData.description} // <-- SỬA
                  onChange={(e) => setReportData(prev => ({...prev, description: e.target.value}))} // <-- SỬA
                  placeholder="Vui lòng mô tả vấn đề bạn gặp phải..."
                  rows="5"
                  required
                  className="chatroompage-modal-textarea"
                />
              </div>
              <div className="chatroompage-modal-actions">
                <button 
                  type="button" 
                  className="chatroompage-modal-button chatroompage-modal-button-cancel" 
                  onClick={() => setShowReportModal(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="chatroompage-modal-button chatroompage-modal-button-submit">
                  <i className="fas fa-flag"></i>
                  Gửi báo cáo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* End Consultation Modal */}
      {showEndConsultationModal && (
        <EndConsultationModal
          consultation={consultation}
          // SỬA: Chặn việc đóng modal
          onClose={() => alert('Vui lòng hoàn thành ghi chú tư vấn để kết thúc.')}
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
    <div className="chatroompage-modal-overlay">
      <div className="chatroompage-modal-content chatroompage-modal-end">
        <div className="chatroompage-modal-header">
          <h2 className="chatroompage-modal-title">Kết thúc buổi tư vấn</h2>
          <button className="chatroompage-modal-close" onClick={onClose}>
            {/* SỬA: Nút X (close) giờ cũng sẽ gọi onClose đã bị sửa ở trên */}
            <i className="fas fa-times"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="chatroompage-modal-form">
          <div className="chatroompage-modal-form-group">
            <label className="chatroompage-modal-label">
              Chẩn đoán <span className="chatroompage-modal-required">*</span>
            </label>
            <textarea
              value={formData.diagnosis}
              onChange={(e) => setFormData({...formData, diagnosis: e.target.value})}
              placeholder="Nhập chẩn đoán sơ bộ..."
              rows="3"
              required
              className="chatroompage-modal-textarea"
            />
          </div>

          <div className="chatroompage-modal-form-group">
            <label className="chatroompage-modal-label">Kế hoạch điều trị</label>
            <textarea
              value={formData.treatment_plan}
              onChange={(e) => setFormData({...formData, treatment_plan: e.target.value})}
              placeholder="Nhập kế hoạch điều trị..."
              rows="3"
              className="chatroompage-modal-textarea"
            />
          </div>

          <div className="chatroompage-modal-form-group">
            <label className="chatroompage-modal-label">Đơn thuốc (nếu có)</label>
            <textarea
              value={formData.prescription_data}
              onChange={(e) => setFormData({...formData, prescription_data: e.target.value})}
              placeholder="Tên thuốc, liều dùng..."
              rows="3"
              className="chatroompage-modal-textarea"
            />
          </div>

          <div className="chatroompage-modal-form-group">
            <label className="chatroompage-modal-label">Mức độ nghiêm trọng</label>
            <select
              value={formData.severity_level}
              onChange={(e) => setFormData({...formData, severity_level: e.target.value})}
              className="chatroompage-modal-select"
            >
              <option value="normal">Bình thường</option>
              <option value="moderate">Cần theo dõi</option>
              <option value="urgent">Khẩn cấp</option>
            </select>
          </div>

          <div className="chatroompage-modal-form-group chatroompage-modal-checkbox-group">
            <label className="chatroompage-modal-checkbox-label">
              <input
                type="checkbox"
                checked={formData.need_followup}
                onChange={(e) => setFormData({...formData, need_followup: e.target.checked})}
                className="chatroompage-modal-checkbox"
              />
              Cần tái khám
            </label>
          </div>

          {formData.need_followup && (
            <div className="chatroompage-modal-form-group">
              <label className="chatroompage-modal-label">Ngày tái khám</label>
              <input
                type="date"
                value={formData.followup_date}
                onChange={(e) => setFormData({...formData, followup_date: e.target.value})}
                min={new Date().toISOString().split('T')[0]}
                className="chatroompage-modal-input"
              />
            </div>
          )}

          <div className="chatroompage-modal-form-group">
            <label className="chatroompage-modal-label">Ghi chú của bác sĩ</label>
            <textarea
              value={formData.doctor_notes}
              onChange={(e) => setFormData({...formData, doctor_notes: e.target.value})}
              placeholder="Ghi chú thêm..."
              rows="2"
              className="chatroompage-modal-textarea"
            />
          </div>

          <div className="chatroompage-modal-actions">
            <button type="submit" className="chatroompage-modal-button chatroompage-modal-button-submit">
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