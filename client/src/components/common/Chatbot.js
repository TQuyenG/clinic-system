import React, { useState, useRef, useEffect } from 'react';
import { 
  FaComments, 
  FaTimes, 
  FaPaperPlane, 
  FaRobot,
  FaUser
} from 'react-icons/fa';
import './Chatbot.css';

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: 'Xin chào! Tôi là trợ lý ảo của Clinic System. Tôi có thể giúp gì cho bạn?',
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

  // Xử lý gửi tin nhắn
  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (inputMessage.trim() === '') return;

    // Thêm tin nhắn của user
    const userMessage = {
      id: messages.length + 1,
      text: inputMessage,
      sender: 'user',
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Giả lập phản hồi từ bot
    setTimeout(() => {
      const botResponse = getBotResponse(inputMessage);
      const botMessage = {
        id: messages.length + 2,
        text: botResponse,
        sender: 'bot',
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      };
      
      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 1000);
  };

  // Logic phản hồi đơn giản của bot
  const getBotResponse = (message) => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('đặt lịch') || lowerMessage.includes('khám')) {
      return 'Bạn có thể đặt lịch khám tại trang "Đặt lịch" hoặc gọi hotline 1900 1234. Bạn cần đặt lịch cho chuyên khoa nào?';
    } else if (lowerMessage.includes('giờ') || lowerMessage.includes('mở cửa')) {
      return 'Chúng tôi làm việc từ Thứ 2 - Thứ 7: 7:00 - 20:00 và Chủ nhật: 8:00 - 17:00. Bạn cần thêm thông tin gì không?';
    } else if (lowerMessage.includes('địa chỉ') || lowerMessage.includes('ở đâu')) {
      return 'Clinic System tọa lạc tại 123 Đường Sức Khỏe, Q.1, TP.HCM. Bạn cần chỉ đường không?';
    } else if (lowerMessage.includes('bác sĩ')) {
      return 'Chúng tôi có đội ngũ bác sĩ giàu kinh nghiệm ở nhiều chuyên khoa. Bạn muốn tìm hiểu về bác sĩ nào?';
    } else if (lowerMessage.includes('cảm ơn') || lowerMessage.includes('thanks')) {
      return 'Rất vui được hỗ trợ bạn! Nếu cần giúp đỡ gì thêm, đừng ngại liên hệ nhé. 😊';
    } else {
      return 'Tôi hiểu bạn đang cần hỗ trợ. Bạn có thể hỏi tôi về: đặt lịch khám, giờ làm việc, địa chỉ, hoặc thông tin bác sĩ. Tôi sẵn sàng giúp đỡ!';
    }
  };

  // Quick reply buttons
  const quickReplies = [
    'Đặt lịch khám',
    'Giờ làm việc',
    'Địa chỉ phòng khám',
    'Thông tin bác sĩ'
  ];

  const handleQuickReply = (reply) => {
    setInputMessage(reply);
  };

  return (
    <div className="chatbot">
      {/* Chat Button */}
      <button
        className={`chatbot-button ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Chat với chúng tôi"
      >
        {isOpen ? <FaTimes /> : <FaComments />}
        {!isOpen && <span className="chatbot-badge">Cần hỗ trợ?</span>}
      </button>

      {/* Chat Modal */}
      {isOpen && (
        <div className="chatbot-modal">
          {/* Header */}
          <div className="chatbot-header">
            <div className="header-info">
              <FaRobot className="header-icon" />
              <div>
                <h3>Trợ lý ảo</h3>
                <span className="status">Trực tuyến</span>
              </div>
            </div>
            <button 
              className="close-btn" 
              onClick={() => setIsOpen(false)}
              aria-label="Đóng chat"
            >
              <FaTimes />
            </button>
          </div>

          {/* Messages */}
          <div className="chatbot-messages">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message ${message.sender}`}
              >
                <div className="message-avatar">
                  {message.sender === 'bot' ? <FaRobot /> : <FaUser />}
                </div>
                <div className="message-content">
                  <p>{message.text}</p>
                  <span className="message-time">{message.time}</span>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="message bot">
                <div className="message-avatar">
                  <FaRobot />
                </div>
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Replies */}
          {messages.length <= 2 && (
            <div className="quick-replies">
              {quickReplies.map((reply, index) => (
                <button
                  key={index}
                  className="quick-reply-btn"
                  onClick={() => handleQuickReply(reply)}
                >
                  {reply}
                </button>
              ))}
            </div>
          )}

          {/* Input Form */}
          <form className="chatbot-input" onSubmit={handleSendMessage}>
            <input
              type="text"
              placeholder="Nhập tin nhắn..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
            />
            <button type="submit" aria-label="Gửi tin nhắn">
              <FaPaperPlane />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Chatbot;