// client/src/components/consultation/ConsultationRoom.js
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import consultationService from '../../services/consultationService';
import chatService from '../../services/chatService';
import { 
  FaPaperPlane, 
  FaPaperclip, 
  FaImage,
  FaVideo,
  FaMicrophone,
  FaPhone,
  FaEllipsisV,
  FaTimesCircle,
  FaCheckCircle,
  FaExclamationTriangle
} from 'react-icons/fa';
import './ConsultationRoom.css';

const ConsultationRoom = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [consultation, setConsultation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [ws, setWs] = useState(null);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (id) {
      fetchConsultationData();
      initWebSocket();
    }

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchConsultationData = async () => {
    try {
      setLoading(true);
      
      const [consultationRes, messagesRes] = await Promise.all([
        consultationService.getConsultationById(id),
        chatService.getMessages(id)
      ]);

      setConsultation(consultationRes.data.data);
      setMessages(messagesRes.data.data || []);
    } catch (error) {
      console.error('Error fetching consultation data:', error);
      alert('Không thể tải thông tin tư vấn');
      navigate('/tu-van');
    } finally {
      setLoading(false);
    }
  };

  const initWebSocket = () => {
    const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:8080';
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log('WebSocket connected');
      socket.send(JSON.stringify({
        type: 'register',
        payload: { user_id: user.id }
      }));
      
      socket.send(JSON.stringify({
        type: 'join_consultation',
        payload: { consultation_id: id }
      }));
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    socket.onclose = () => {
      console.log('WebSocket disconnected');
    };

    setWs(socket);
  };

  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'new_message':
        setMessages(prev => [...prev, data.payload]);
        break;
      case 'typing':
        setTyping(data.payload.is_typing);
        break;
      case 'message_read':
        setMessages(prev => 
          prev.map(msg => 
            msg.id === data.payload.message_id 
              ? { ...msg, is_read: true } 
              : msg
          )
        );
        break;
      default:
        break;
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      
      const messageData = {
        consultation_id: id,
        message: newMessage.trim(),
        message_type: 'text'
      };

      const response = await chatService.sendMessage(messageData);
      
      if (response.data.success) {
        const sentMessage = response.data.data;
        setMessages(prev => [...prev, sentMessage]);
        setNewMessage('');

        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'new_message',
            payload: sentMessage
          }));
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Không thể gửi tin nhắn. Vui lòng thử lại.');
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('consultation_id', id);

      const response = await chatService.uploadFile(formData);
      
      if (response.data.success) {
        const message = response.data.data;
        setMessages(prev => [...prev, message]);

        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'new_message',
            payload: message
          }));
        }
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Không thể tải file lên. Vui lòng thử lại.');
    }
  };

  const handleEndConsultation = async () => {
    if (!window.confirm('Bạn có chắc muốn kết thúc buổi tư vấn này?')) return;

    try {
      if (user.role === 'doctor') {
        navigate(`/tu-van/${id}/ket-qua`);
      } else {
        await consultationService.completeConsultation(id, {});
        alert('Đã kết thúc buổi tư vấn');
        navigate('/tu-van/lich-su');
      }
    } catch (error) {
      console.error('Error ending consultation:', error);
      alert('Không thể kết thúc tư vấn');
    }
  };

  if (loading) {
    return (
      <div className="consultation-room-loading">
        <div className="spinner"></div>
        <p>Đang tải phòng tư vấn...</p>
      </div>
    );
  }

  if (!consultation) {
    return (
      <div className="consultation-room-error">
        <FaExclamationTriangle />
        <h3>Không tìm thấy buổi tư vấn</h3>
        <button onClick={() => navigate('/tu-van')}>Quay lại</button>
      </div>
    );
  }

  const otherUser = user.role === 'patient' 
    ? consultation.Doctor?.User 
    : consultation.Patient?.User;

  return (
    <div className="consultation-room-container">
      <div className="consultation-room-header">
        <div className="header-left">
          <div className="user-avatar">
            <img 
              src={otherUser?.avatar_url || '/default-avatar.png'} 
              alt={otherUser?.full_name}
            />
            <span className="online-indicator"></span>
          </div>
          <div className="user-info">
            <h3>{otherUser?.full_name}</h3>
            <p className="user-role">
              {user.role === 'patient' ? 'Bác sĩ' : 'Bệnh nhân'}
            </p>
          </div>
        </div>

        <div className="header-right">
          <button className="icon-btn" title="Gọi thoại">
            <FaPhone />
          </button>
          <button className="icon-btn" title="Gọi video">
            <FaVideo />
          </button>
          <button 
            className="btn-end-consultation"
            onClick={handleEndConsultation}
          >
            <FaTimesCircle /> Kết thúc
          </button>
          <button className="icon-btn" title="Tùy chọn">
            <FaEllipsisV />
          </button>
        </div>
      </div>

      <div className="consultation-room-body">
        <div className="messages-container">
          {messages.map((message) => (
            <div 
              key={message.id} 
              className={`message-bubble ${message.sender_id === user.id ? 'sent' : 'received'}`}
            >
              {message.message_type === 'text' && (
                <div className="message-text">{message.message}</div>
              )}
              
              {message.message_type === 'image' && (
                <div className="message-image">
                  <img src={message.file_url} alt="Image" />
                </div>
              )}
              
              {message.message_type === 'file' && (
                <div className="message-file">
                  <FaPaperclip />
                  <a href={message.file_url} target="_blank" rel="noopener noreferrer">
                    {message.file_name || 'File đính kèm'}
                  </a>
                </div>
              )}

              <div className="message-time">
                {new Date(message.created_at).toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
                {message.sender_id === user.id && (
                  <span className={`message-status ${message.is_read ? 'read' : 'sent'}`}>
                    {message.is_read ? <FaCheckCircle /> : '✓'}
                  </span>
                )}
              </div>
            </div>
          ))}
          
          {typing && (
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="consultation-room-footer">
        <form onSubmit={handleSendMessage} className="message-input-form">
          <button 
            type="button" 
            className="icon-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            <FaPaperclip />
          </button>
          
          <input 
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />

          <input
            type="text"
            className="message-input"
            placeholder="Nhập tin nhắn..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={sending}
          />

          <button 
            type="submit" 
            className="btn-send"
            disabled={!newMessage.trim() || sending}
          >
            <FaPaperPlane />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ConsultationRoom;