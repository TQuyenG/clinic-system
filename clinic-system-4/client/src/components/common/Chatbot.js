// client/src/components/common/Chatbot.js

import React, { useState, useRef, useEffect } from 'react';
import { 
  FaComments, 
  FaTimes, 
  FaPaperPlane, 
  FaRobot,
  FaUser,
  FaCalendarAlt,
  FaClock,
  FaMapMarkerAlt,
  FaUserMd,
  FaCreditCard,
  FaAmbulance,
  FaStethoscope,
  FaQuestionCircle,
  FaVideo,
  FaHospital
} from 'react-icons/fa';
import './Chatbot.css';
import chatService from '../../services/chatService'; 

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);

  // Expose function để mở chatbot từ các nút khác trên trang web (VD: nút "Hỏi bác sĩ" ở trang chủ)
  useEffect(() => {
    window.openChatbot = () => {
      setIsOpen(true);
    };
    
    return () => {
      delete window.openChatbot;
    };
  }, []);

  const [messages, setMessages] = useState([
    {
      id: 1,
      text: 'Xin chào! Tôi là trợ lý AI thông minh của Clinic System. Bạn đang gặp vấn đề gì về sức khỏe, hoặc cần tôi hỗ trợ thông tin gì về phòng khám?',
      sender: 'bot',
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto scroll to bottom khi có tin nhắn mới
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Xử lý gửi tin nhắn tới Backend (Gemini AI)
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (inputMessage.trim() === '') return;

    // Thêm tin nhắn của user vào UI
    const userMessage = {
      id: Date.now(), 
      text: inputMessage,
      sender: 'user',
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true); // Hiển thị hiệu ứng AI đang xử lý

    try {
      // Gọi API Gemini
      const response = await chatService.sendAIMessage(userMessage.text);
      const aiData = response.data?.data;

      // Xây dựng tin nhắn phản hồi của bot
      const botMessage = {
        id: Date.now() + 1,
        text: aiData?.text || 'Xin lỗi, tôi chưa thể xử lý yêu cầu lúc này.',
        sender: 'bot',
        action: aiData?.suggested_action, // BOOK_OFFLINE hoặc BOOK_ONLINE
        specialtyData: {
          id: aiData?.suggested_specialty_id,
          name: aiData?.suggested_specialty_name
        },
        packageId: aiData?.suggested_package_id, // Lấy ID gói online
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      };
      
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: 'Đã có lỗi kết nối với máy chủ AI. Xin vui lòng thử lại sau ít phút.',
        sender: 'bot',
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsTyping(false); // Tắt hiệu ứng xử lý
    }
  };

  // Hàm chuyển hướng đi đặt lịch trực tiếp tại phòng khám
  const handleBookOffline = (specialtyId) => {
    setIsOpen(false);
    // Dẫn link tới trang đặt lịch khám offline của bạn
    window.location.href = `/dat-lich?specialty_id=${specialtyId || ''}`; 
  };

  // Hàm chuyển hướng đi đặt lịch tư vấn Online (Video/Chat)
  const handleBookOnline = (packageId) => {
    setIsOpen(false);
    // Dẫn link tới trang đặt lịch tư vấn từ xa
    window.location.href = `/tu-van-truc-tuyen?package_id=${packageId || ''}`; 
  };

  // Quick reply buttons gợi ý cho tin nhắn đầu tiên
  const quickReplies = [
    { text: 'Tư vấn triệu chứng bệnh', icon: FaStethoscope },
    { text: 'Đặt lịch khám', icon: FaCalendarAlt },
    { text: 'Giờ làm việc & Địa chỉ', icon: FaMapMarkerAlt },
    { text: 'Chi phí dịch vụ', icon: FaCreditCard },
    { text: 'Cấp cứu 24/7', icon: FaAmbulance }
  ];

  const handleQuickReply = (reply) => {
    setInputMessage(reply);
  };

  return (
    <div className="chatbot">
      {/* Chat Button (Nút nổi góc màn hình) */}
      <button
        className={`chatbot-toggle-btn ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Mở chat hỗ trợ"
      >
        {isOpen ? <FaTimes /> : <FaComments />}
        {!isOpen && (
          <div className="chatbot-tooltip">
            <FaQuestionCircle /> Cần AI hỗ trợ?
          </div>
        )}
      </button>

      {/* Chat Window (Khung chat chính) */}
      {isOpen && (
        <div className="chatbot-window">
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-profile">
              <div className="chatbot-avatar bot-header-avatar">
                <FaRobot />
              </div>
              <div className="chatbot-header-text">
                <h3>Bác sĩ Trí tuệ nhân tạo (AI)</h3>
                <div className="chatbot-status">
                  <span className="chatbot-status-dot"></span>
                  Hỗ trợ trực tuyến 24/7
                </div>
              </div>
            </div>
            <button 
              className="chatbot-close-icon-btn" 
              onClick={() => setIsOpen(false)}
              aria-label="Đóng cửa sổ chat"
            >
              <FaTimes />
            </button>
          </div>

          {/* Messages Body */}
          <div className="chatbot-messages">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`chatbot-message-row ${message.sender}`}
              >
                {message.sender === 'bot' && (
                  <div className="chatbot-avatar bot-msg-avatar">
                    <FaRobot />
                  </div>
                )}
                
                <div className="chatbot-message-content">
                  <div className="chatbot-bubble">
                    <p>{message.text}</p>
                    
                    {/* Render UI Động từ AI: Thẻ Gợi ý Khám TRỰC TIẾP (OFFLINE) */}
                    {message.sender === 'bot' && message.action === 'BOOK_OFFLINE' && (
                      <div className="chatbot-action-card" style={{ borderColor: '#86efac' }}>
                        <div className="action-card-info" style={{ color: '#166534' }}>
                          <FaHospital className="action-card-icon" /> 
                          <div className="action-card-text" style={{ color: '#166534' }}>
                            {message.specialtyData?.name ? (
                              <>Chuyên khoa gợi ý: <strong>{message.specialtyData.name}</strong></>
                            ) : (
                              <strong>Khám bệnh tại phòng khám</strong>
                            )}
                          </div>
                        </div>
                        <button 
                          className="action-card-btn"
                          style={{ background: '#22c55e' }}
                          onClick={() => handleBookOffline(message.specialtyData?.id)}
                        >
                          <FaCalendarAlt /> Đặt lịch khám trực tiếp
                        </button>
                      </div>
                    )}

                    {/* Render UI Động từ AI: Thẻ Gợi ý Tư vấn ONLINE (VIDEO/CHAT) */}
                    {message.sender === 'bot' && message.action === 'BOOK_ONLINE' && (
                      <div className="chatbot-action-card" style={{ borderColor: '#bae6fd' }}>
                        <div className="action-card-info" style={{ color: '#0369a1' }}>
                          <FaVideo className="action-card-icon" /> 
                          <div className="action-card-text" style={{ color: '#0369a1' }}>
                            <strong>Tư vấn sức khỏe từ xa (Online)</strong>
                            <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#0ea5e9' }}>Video Call / Chat với Bác sĩ</p>
                          </div>
                        </div>
                        <button 
                          className="action-card-btn"
                          style={{ background: '#0284c7' }}
                          onClick={() => handleBookOnline(message.packageId)}
                        >
                          <FaComments /> Đặt lịch tư vấn ngay
                        </button>
                      </div>
                    )}

                  </div>
                  <span className="chatbot-time">{message.time}</span>
                </div>

                {message.sender === 'user' && (
                  <div className="chatbot-avatar user-msg-avatar">
                    <FaUser />
                  </div>
                )}
              </div>
            ))}
            
            {/* Hiệu ứng AI đang suy nghĩ */}
            {isTyping && (
              <div className="chatbot-message-row bot typing">
                <div className="chatbot-avatar bot-msg-avatar">
                  <FaRobot />
                </div>
                <div className="chatbot-message-content">
                  <div className="chatbot-bubble typing-bubble">
                    <div className="typing-indicator">
                      <span></span><span></span><span></span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Replies - Gợi ý khi mới mở chat */}
          {messages.length <= 1 && (
            <div className="chatbot-quick-replies">
              <p className="quick-reply-title">Chọn câu hỏi nhanh hoặc nhập triệu chứng:</p>
              <div className="quick-reply-list">
                {quickReplies.map((reply, index) => {
                  const IconComponent = reply.icon;
                  return (
                    <button
                      key={index}
                      className="quick-reply-btn"
                      onClick={() => handleQuickReply(reply.text)}
                    >
                      <IconComponent className="quick-reply-icon" />
                      {reply.text}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Input Form Footer */}
          <form id="chatbot-form" className="chatbot-input-area" onSubmit={handleSendMessage}>
            <input
              type="text"
              className="chatbot-input-field"
              placeholder="Nhập triệu chứng của bạn (VD: Đau đầu, chóng mặt)..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              aria-label="Tin nhắn"
            />
            <button type="submit" className="chatbot-send-btn" aria-label="Gửi">
              <FaPaperPlane />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Chatbot;