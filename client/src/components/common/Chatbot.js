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
  FaPhone,
  FaStethoscope,
  FaPills,
  FaHospital,
  FaAmbulance,
  FaCreditCard,
  FaQuestionCircle
} from 'react-icons/fa';
import './Chatbot.css';

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Expose function để mở chatbot từ bên ngoài
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

  // Logic phản hồi của bot với nhiều từ khóa y tế
  const getBotResponse = (message) => {
    const lowerMessage = message.toLowerCase();
    
    // === ĐẶT LỊCH KHÁM ===
    if (lowerMessage.includes('đặt lịch') || lowerMessage.includes('đăng ký khám') || 
        lowerMessage.includes('hẹn khám') || lowerMessage.includes('book') ||
        lowerMessage.includes('lịch hẹn') || lowerMessage.includes('đặt hẹn')) {
      return 'Để đặt lịch khám, bạn có thể:\n\n1. Truy cập trang "Đặt lịch" trên website\n2. Gọi hotline 1900 1234\n3. Đến trực tiếp quầy lễ tân\n\nBạn cần đặt lịch cho chuyên khoa nào?';
    }
    
    // === GIỜ LÀM VIỆC ===
    if (lowerMessage.includes('giờ') || lowerMessage.includes('mở cửa') || 
        lowerMessage.includes('làm việc') || lowerMessage.includes('hoạt động') ||
        lowerMessage.includes('mấy giờ') || lowerMessage.includes('thời gian')) {
      return 'Thời gian làm việc của Clinic System:\n\n- Thứ 2 đến Thứ 7: 7:00 - 20:00\n- Chủ nhật: 8:00 - 17:00\n- Cấp cứu: 24/7\n\nBạn cần hỗ trợ thêm gì không?';
    }
    
    // === ĐỊA CHỈ ===
    if (lowerMessage.includes('địa chỉ') || lowerMessage.includes('ở đâu') || 
        lowerMessage.includes('chỉ đường') || lowerMessage.includes('vị trí') ||
        lowerMessage.includes('đường đi') || lowerMessage.includes('location')) {
      return 'Clinic System tọa lạc tại:\n\n123 Đường Sức Khỏe, Quận 1, TP.HCM\n\nCác mốc gần đây:\n- Cách chợ Bến Thành 500m\n- Gần trạm xe buýt số 01\n\nBạn cần hỗ trợ chỉ đường không?';
    }
    
    // === BÁC SĨ ===
    if (lowerMessage.includes('bác sĩ') || lowerMessage.includes('bác sỹ') || 
        lowerMessage.includes('doctor') || lowerMessage.includes('bs.') ||
        lowerMessage.includes('chuyên gia') || lowerMessage.includes('giáo sư') ||
        lowerMessage.includes('tiến sĩ')) {
      return 'Clinic System có đội ngũ bác sĩ giàu kinh nghiệm:\n\n- Hơn 50 bác sĩ chuyên khoa\n- Nhiều GS, PGS, TS đầu ngành\n- Kinh nghiệm từ 10-30 năm\n\nBạn muốn tìm bác sĩ chuyên khoa nào? (Nội khoa, Nhi, Sản, Da liễu, Tim mạch...)';
    }
    
    // === CHUYÊN KHOA ===
    if (lowerMessage.includes('chuyên khoa') || lowerMessage.includes('khoa') ||
        lowerMessage.includes('nội khoa') || lowerMessage.includes('ngoại khoa') ||
        lowerMessage.includes('nhi khoa') || lowerMessage.includes('sản khoa') ||
        lowerMessage.includes('da liễu') || lowerMessage.includes('tim mạch') ||
        lowerMessage.includes('thần kinh') || lowerMessage.includes('xương khớp') ||
        lowerMessage.includes('tai mũi họng') || lowerMessage.includes('mắt') ||
        lowerMessage.includes('răng') || lowerMessage.includes('tiêu hóa')) {
      return 'Clinic System có các chuyên khoa:\n\n- Nội khoa tổng quát\n- Nhi khoa\n- Sản phụ khoa\n- Tim mạch\n- Thần kinh\n- Da liễu\n- Xương khớp\n- Tai mũi họng\n- Nhãn khoa\n- Răng hàm mặt\n- Tiêu hóa\n\nBạn quan tâm chuyên khoa nào?';
    }
    
    // === GIÁ KHÁM / CHI PHÍ ===
    if (lowerMessage.includes('giá') || lowerMessage.includes('phí') || 
        lowerMessage.includes('chi phí') || lowerMessage.includes('bao nhiêu tiền') ||
        lowerMessage.includes('thanh toán') || lowerMessage.includes('bảo hiểm') ||
        lowerMessage.includes('bhyt') || lowerMessage.includes('tiền khám')) {
      return 'Thông tin chi phí tại Clinic System:\n\n- Khám tổng quát: 200.000 - 500.000 VNĐ\n- Khám chuyên khoa: 300.000 - 800.000 VNĐ\n- Hỗ trợ BHYT theo quy định\n- Thanh toán: Tiền mặt, thẻ, chuyển khoản\n\nBạn cần báo giá chi tiết cho dịch vụ nào?';
    }
    
    // === XÉT NGHIỆM ===
    if (lowerMessage.includes('xét nghiệm') || lowerMessage.includes('xn') ||
        lowerMessage.includes('máu') || lowerMessage.includes('nước tiểu') ||
        lowerMessage.includes('siêu âm') || lowerMessage.includes('chụp') ||
        lowerMessage.includes('x-quang') || lowerMessage.includes('ct') ||
        lowerMessage.includes('mri') || lowerMessage.includes('nội soi')) {
      return 'Dịch vụ xét nghiệm, chẩn đoán hình ảnh:\n\n- Xét nghiệm máu, nước tiểu\n- Siêu âm các loại\n- X-quang kỹ thuật số\n- CT Scanner 128 lát cắt\n- MRI 1.5 Tesla\n- Nội soi tiêu hóa\n\nKết quả nhanh trong ngày. Bạn cần đặt lịch xét nghiệm không?';
    }
    
    // === CẤP CỨU ===
    if (lowerMessage.includes('cấp cứu') || lowerMessage.includes('khẩn cấp') ||
        lowerMessage.includes('emergency') || lowerMessage.includes('gấp') ||
        lowerMessage.includes('nguy hiểm') || lowerMessage.includes('tai nạn')) {
      return 'ĐƯỜNG DÂY NÓNG CẤP CỨU 24/7:\n\n1900 1234 (nhấn phím 1)\n\nHoặc đến trực tiếp khoa Cấp cứu - tầng trệt.\n\nXe cấp cứu sẵn sàng trong 15 phút.\n\nBạn có cần hỗ trợ cấp cứu ngay không?';
    }
    
    // === THUỐC ===
    if (lowerMessage.includes('thuốc') || lowerMessage.includes('đơn thuốc') ||
        lowerMessage.includes('toa thuốc') || lowerMessage.includes('nhà thuốc') ||
        lowerMessage.includes('mua thuốc') || lowerMessage.includes('dược')) {
      return 'Nhà thuốc Clinic System:\n\n- Thuốc đầy đủ theo đơn bác sĩ\n- Thuốc không kê đơn\n- Thực phẩm chức năng\n- Mở cửa: 7:00 - 21:00\n\nLưu ý: Một số thuốc cần đơn của bác sĩ. Bạn cần tư vấn thuốc gì?';
    }
    
    // === BỆNH LÝ PHỔ BIẾN ===
    if (lowerMessage.includes('đau đầu') || lowerMessage.includes('sốt') ||
        lowerMessage.includes('ho') || lowerMessage.includes('cảm') ||
        lowerMessage.includes('đau bụng') || lowerMessage.includes('tiêu chảy') ||
        lowerMessage.includes('táo bón') || lowerMessage.includes('dị ứng') ||
        lowerMessage.includes('mệt mỏi') || lowerMessage.includes('chóng mặt')) {
      return 'Với các triệu chứng bạn mô tả, tôi khuyên bạn nên đến khám để được chẩn đoán chính xác.\n\nBạn có thể:\n1. Đặt lịch khám online\n2. Gọi hotline 1900 1234\n3. Đến khoa Khám bệnh\n\nBạn có muốn tôi hỗ trợ đặt lịch khám không?';
    }
    
    // === TIÊM CHỦNG / VẮC XIN ===
    if (lowerMessage.includes('tiêm') || lowerMessage.includes('vaccine') ||
        lowerMessage.includes('vắc xin') || lowerMessage.includes('chủng ngừa') ||
        lowerMessage.includes('tiêm phòng')) {
      return 'Dịch vụ tiêm chủng tại Clinic System:\n\n- Vắc xin cho trẻ em theo chương trình\n- Vắc xin cho người lớn\n- Vắc xin cúm, viêm gan, HPV...\n- Tư vấn lịch tiêm miễn phí\n\nBạn cần tư vấn vắc xin nào?';
    }
    
    // === KHÁM SỨC KHỎE TỔNG QUÁT ===
    if (lowerMessage.includes('tổng quát') || lowerMessage.includes('kiểm tra sức khỏe') ||
        lowerMessage.includes('khám định kỳ') || lowerMessage.includes('check up') ||
        lowerMessage.includes('sức khỏe định kỳ')) {
      return 'Gói khám sức khỏe tổng quát:\n\n- Gói cơ bản: 1.500.000 VNĐ\n- Gói nâng cao: 3.000.000 VNĐ\n- Gói VIP: 5.000.000 VNĐ\n\nBao gồm: Khám lâm sàng, xét nghiệm, siêu âm, X-quang...\n\nBạn muốn tư vấn gói nào?';
    }
    
    // === LIÊN HỆ / HOTLINE ===
    if (lowerMessage.includes('hotline') || lowerMessage.includes('số điện thoại') ||
        lowerMessage.includes('liên hệ') || lowerMessage.includes('gọi') ||
        lowerMessage.includes('sđt') || lowerMessage.includes('contact')) {
      return 'Thông tin liên hệ Clinic System:\n\n- Hotline: 1900 1234\n- Cấp cứu: 1900 1234 (nhấn 1)\n- Email: contact@clinicsystem.vn\n- Zalo OA: Clinic System\n\nBạn cần hỗ trợ gì thêm?';
    }
    
    // === HỎI VỀ PHÒNG KHÁM ===
    if (lowerMessage.includes('phòng khám') || lowerMessage.includes('bệnh viện') ||
        lowerMessage.includes('clinic') || lowerMessage.includes('cơ sở') ||
        lowerMessage.includes('trung tâm')) {
      return 'Clinic System là hệ thống y tế chất lượng cao:\n\n- Thành lập: 2010\n- Quy mô: 5 cơ sở tại TP.HCM\n- Đội ngũ: 200+ y bác sĩ\n- Trang thiết bị hiện đại\n- Đạt chuẩn JCI quốc tế\n\nBạn muốn biết thêm thông tin gì?';
    }
    
    // === TRẺ EM / NHI KHOA ===
    if (lowerMessage.includes('trẻ em') || lowerMessage.includes('bé') ||
        lowerMessage.includes('con') || lowerMessage.includes('nhi') ||
        lowerMessage.includes('sơ sinh') || lowerMessage.includes('em bé')) {
      return 'Dịch vụ Nhi khoa tại Clinic System:\n\n- Khám bệnh trẻ em\n- Tiêm chủng đầy đủ\n- Tư vấn dinh dưỡng\n- Theo dõi phát triển\n- Khám tai mũi họng nhi\n\nĐội ngũ bác sĩ nhi giàu kinh nghiệm, tận tâm. Bạn cần đặt lịch khám cho bé không?';
    }
    
    // === THAI SẢN ===
    if (lowerMessage.includes('thai') || lowerMessage.includes('mang bầu') ||
        lowerMessage.includes('bầu') || lowerMessage.includes('sản') ||
        lowerMessage.includes('sinh') || lowerMessage.includes('mẹ bầu')) {
      return 'Dịch vụ Sản khoa tại Clinic System:\n\n- Khám thai định kỳ\n- Siêu âm 4D, 5D\n- Xét nghiệm sàng lọc\n- Sinh thường, sinh mổ\n- Chăm sóc sau sinh\n\nBạn đang ở tuần thai thứ mấy? Tôi có thể tư vấn lịch khám phù hợp.';
    }
    
    // === CẢM ƠN ===
    if (lowerMessage.includes('cảm ơn') || lowerMessage.includes('thanks') ||
        lowerMessage.includes('thank') || lowerMessage.includes('tks') ||
        lowerMessage.includes('cam on')) {
      return 'Rất vui được hỗ trợ bạn! Nếu cần giúp đỡ gì thêm, đừng ngại liên hệ nhé. Chúc bạn sức khỏe!';
    }
    
    // === CHÀO HỎI ===
    if (lowerMessage.includes('xin chào') || lowerMessage.includes('hello') ||
        lowerMessage.includes('hi') || lowerMessage.includes('chào') ||
        lowerMessage.includes('hey')) {
      return 'Xin chào! Tôi là trợ lý ảo của Clinic System. Tôi có thể giúp bạn:\n\n- Đặt lịch khám\n- Tra cứu thông tin bác sĩ\n- Tư vấn dịch vụ\n- Hướng dẫn đường đi\n\nBạn cần hỗ trợ gì?';
    }
    
    // === TẠM BIỆT ===
    if (lowerMessage.includes('tạm biệt') || lowerMessage.includes('bye') ||
        lowerMessage.includes('goodbye') || lowerMessage.includes('bai')) {
      return 'Tạm biệt bạn! Cảm ơn đã sử dụng dịch vụ của Clinic System. Hẹn gặp lại và chúc bạn sức khỏe!';
    }
    
    // === MẶC ĐỊNH ===
    return 'Tôi hiểu bạn đang cần hỗ trợ. Bạn có thể hỏi tôi về:\n\n- Đặt lịch khám bệnh\n- Giờ làm việc\n- Địa chỉ phòng khám\n- Thông tin bác sĩ\n- Chi phí khám chữa bệnh\n- Các chuyên khoa\n- Dịch vụ xét nghiệm\n- Cấp cứu 24/7\n\nTôi sẵn sàng giúp đỡ bạn!';
  };

  // Quick reply buttons với icon
  const quickReplies = [
    { text: 'Đặt lịch khám', icon: FaCalendarAlt },
    { text: 'Giờ làm việc', icon: FaClock },
    { text: 'Địa chỉ', icon: FaMapMarkerAlt },
    { text: 'Tìm bác sĩ', icon: FaUserMd },
    { text: 'Chi phí khám', icon: FaCreditCard },
    { text: 'Cấp cứu', icon: FaAmbulance }
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
            <div className="chatbot-header-info">
              <div className="chatbot-header-icon">
                <FaRobot />
              </div>
              <div className="chatbot-header-text">
                <h3>Trợ lý Clinic System</h3>
                <span className="chatbot-status">
                  <span className="chatbot-status-dot"></span>
                  Trực tuyến
                </span>
              </div>
            </div>
            <button 
              className="chatbot-close-btn" 
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
                className={`chatbot-message ${message.sender}`}
              >
                <div className="chatbot-message-avatar">
                  {message.sender === 'bot' ? <FaRobot /> : <FaUser />}
                </div>
                <div className="chatbot-message-content">
                  <p>{message.text}</p>
                  <span className="chatbot-message-time">{message.time}</span>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="chatbot-message bot">
                <div className="chatbot-message-avatar">
                  <FaRobot />
                </div>
                <div className="chatbot-message-content">
                  <div className="chatbot-typing-indicator">
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
            <div className="chatbot-quick-replies">
              {quickReplies.map((reply, index) => {
                const IconComponent = reply.icon;
                return (
                  <button
                    key={index}
                    className="chatbot-quick-reply-btn"
                    onClick={() => handleQuickReply(reply.text)}
                  >
                    <IconComponent className="chatbot-quick-reply-icon" />
                    {reply.text}
                  </button>
                );
              })}
            </div>
          )}

          {/* Input Form */}
          <form className="chatbot-input-form" onSubmit={handleSendMessage}>
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